#!/usr/bin/env bash
set -euo pipefail

# Batch convert ECW files to PMTiles + COG GeoTIFF
# Usage: bash scripts/batch-convert-directories.sh [dataset-id ...]
#
# Supports both individual ECW files and directories of ECW files.
# For directories, all .ecw files are merged via gdalbuildvrt into a single
# PMTiles/COG (excluding patch, test, copy, and subdirectory files).
#
# Each dataset is defined with:
#   id|title|period|source_path|zoom_min|zoom_max|theme
# source_path ending with / is treated as a directory.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="/media/robin/foss4lh1/david-lovelace-archive"
OUTDIR="$SCRIPT_DIR/../static/data"

DOCKER="docker run --rm -v $ROOT:/data ginetto/gdal:2.4.4_ECW"
mkdir -p "$OUTDIR"

# Define datasets: id|title|period|source_path|zoom_min|zoom_max|theme
# For directories, source_path ends with /
# For individual files, source_path is the relative path to the .ecw file
declare -a DATASETS=(
  "os-12500-1sted-sheet23|OS 1:2500 — Sheet 23 (1886)|1886|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/23.ecw|10|16|historic maps"
  "os-12500-1sted-sheet24|OS 1:2500 — Sheet 24 (1886)|1886|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/24.ecw|10|16|historic maps"
  "os-12500-1sted-sheet36|OS 1:2500 — Sheet 36 (1886)|1886|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/36.ecw|10|16|historic maps"
  "os-12500-1sted-sheet54|OS 1:2500 — Sheet 54 (1886)|1886|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/54.ecw|10|16|historic maps"
  "os-12500-1sted-sheet64|OS 1:2500 — Sheet 64 (1886)|1886|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/64.ecw|10|16|historic maps"
  "os-1880-6inch-affine|OS 6-inch — Affine Georeferenced (1880)|1880|Maps/1880_6inch/AffineECW/|10|16|historic maps"
  "aerial-en-county|Aerial Photography — County Coverage|1990s-2000s|AirPhotos/EN_County_APs/|10|16|aerial photography"
)

# Filter by CLI args if provided
if [ $# -gt 0 ]; then
  FILTERED=()
  for ds in "${DATASETS[@]}"; do
    id="${ds%%|*}"
    for arg in "$@"; do
      if [ "$id" = "$arg" ]; then
        FILTERED+=("$ds")
      fi
    done
  done
  DATASETS=("${FILTERED[@]}")
fi

if [ ${#DATASETS[@]} -eq 0 ]; then
  echo "No datasets matched."
  exit 1
fi

convert_one() {
  local id="$1"
  local title="$2"
  local period="$3"
  local src="$4"
  local zoom_min="$5"
  local zoom_max="$6"
  local theme="$7"
  
  echo "=== $id: $title ($period) ==="
  
  WORK=$(mktemp -d)
  PM="$OUTDIR/${id}.pmtiles"
  COG="$OUTDIR/${id}-cog.tif"
  
  DOCKER_WORK="docker run --rm -v $ROOT:/data -v $WORK:/work ginetto/gdal:2.4.4_ECW"
  
  # Determine if source is a directory or individual file
  if [[ "$src" == */ ]]; then
    # Directory — build VRT from all .ecw files
    local dir_path="/data/${src%/}"
    echo "  Building file list from $dir_path ..."
    
    # Find .ecw files, exclude patches/tests/copies/subdirs
    local file_list="$WORK/files.txt"
    find "$dir_path" -maxdepth 1 -type f -iname '*.ecw' \
      ! -iname '*patch*' \
      ! -iname '*test*' \
      ! -iname '*Copy*' \
      -printf '%p\n' | sort > "$file_list"
    
    local ecw_count=$(wc -l < "$file_list")
    echo "  Found $ecw_count ECW files"
    
    if [ "$ecw_count" -eq 0 ]; then
      echo "  ERROR: No ECW files found in $dir_path"
      rm -rf "$WORK"
      return 1
    fi
    
    if [ "$ecw_count" -eq 1 ]; then
      local single_file=$(head -1 "$file_list")
      echo "  Single file, skipping VRT..."
      cp "$single_file" "$WORK/input.ecw"
    else
      echo "  Building VRT mosaic..."
      $DOCKER_WORK gdalbuildvrt -input_file_list "/work/files.txt" "/work/mosaic.vrt"
      # gdalbuildvrt creates a VRT referencing the original files
      # For reprojection, we'll use the VRT directly
    fi
    
    local input_for_warp
    if [ "$ecw_count" -eq 1 ]; then
      input_for_warp="/work/input.ecw"
    else
      input_for_warp="/work/mosaic.vrt"
    fi
  else
    # Individual file
    local input_for_warp="/data/$src"
  fi
  
  # 1. PMTiles pipeline
  echo "  Reprojecting → WGS84 GeoTIFF..."
  $DOCKER_WORK gdalwarp -t_srs EPSG:4326 -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co BIGTIFF=YES "$input_for_warp" "/work/reprojected.tif"
  
  echo "  Building MBTiles..."
  rio mbtiles "$WORK/reprojected.tif" -o "$WORK/output.mbtiles" --zoom-levels ${zoom_min}..${zoom_max} --format PNG
  
  echo "  Converting to PMTiles..."
  pmtiles convert "$WORK/output.mbtiles" "$PM"
  
  # 2. COG pipeline (keep native CRS, tiled + overviews, JPEG for size)
  echo "  Building COG GeoTIFF..."
  $DOCKER_WORK gdalwarp -of GTiff -co TILED=YES -co BLOCKXSIZE=512 -co BLOCKYSIZE=512 -co COMPRESS=JPEG -co JPEG_QUALITY=85 -co BIGTIFF=YES "$input_for_warp" "/work/cog.tif"
  
  echo "  Adding overviews..."
  $DOCKER_WORK gdaladdo -r average "/work/cog.tif" 2 4 8 16 32 64
  
  cp "$WORK/cog.tif" "$COG"
  rm -rf "$WORK"
  
  echo "  Done: $PM ($(du -h "$PM" | cut -f1)), $COG ($(du -h "$COG" | cut -f1))"
}

for ds in "${DATASETS[@]}"; do
  IFS='|' read -r id title period src zoom_min zoom_max theme <<< "$ds"
  convert_one "$id" "$title" "$period" "$src" "$zoom_min" "$zoom_max" "$theme" || true
done

echo "All conversions complete."
