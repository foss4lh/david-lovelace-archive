#!/usr/bin/env bash
set -euo pipefail

# Batch convert ECW directories/files to PMTiles + COG GeoTIFF
# Usage: bash scripts/batch-convert-all.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="/media/robin/foss4lh1/david-lovelace-archive"
OUTDIR="$SCRIPT_DIR/../static/data"

DOCKER="docker run --rm -v $ROOT:/data ginetto/gdal:2.4.4_ECW"
mkdir -p "$OUTDIR"

convert_one() {
  local id="$1"
  local src="$2"
  local zoom_min="${3:-10}"
  local zoom_max="${4:-16}"
  
  local pm="$OUTDIR/${id}.pmtiles"
  local cog="$OUTDIR/${id}-cog.tif"
  
  if [ -f "$pm" ] && [ -f "$cog" ]; then
    echo "  SKIP: $id already converted"
    return 0
  fi
  
  local work=$(mktemp -d)
  local docker_work="docker run --rm -v $ROOT:/data -v $work:/work ginetto/gdal:2.4.4_ECW"
  local input_for_warp
  
  if [[ "$src" == */ ]]; then
    # Directory — build VRT
    local dir_path="/data/${src%/}"
    local file_list="$work/files.txt"
    find "$dir_path" -maxdepth 1 -type f -iname '*.ecw' \
      ! -iname '*patch*' \
      ! -iname '*test*' \
      ! -iname '*Copy*' \
      -printf '%p\n' | sort > "$file_list"
    
    local ecw_count=$(wc -l < "$file_list")
    echo "  Found $ecw_count ECW files in directory"
    
    if [ "$ecw_count" -eq 0 ]; then
      echo "  ERROR: No ECW files found"
      rm -rf "$work"
      return 1
    fi
    
    if [ "$ecw_count" -eq 1 ]; then
      input_for_warp=$(head -1 "$file_list")
    else
      echo "  Building VRT mosaic..."
      $docker_work gdalbuildvrt -input_file_list "/work/files.txt" "/work/mosaic.vrt"
      input_for_warp="/work/mosaic.vrt"
    fi
  else
    input_for_warp="/data/$src"
  fi
  
  # PMTiles pipeline
  if [ ! -f "$pm" ]; then
    echo "  Reprojecting → WGS84 GeoTIFF..."
    $docker_work gdalwarp -t_srs EPSG:4326 -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co BIGTIFF=YES "$input_for_warp" "/work/reprojected.tif"
    
    echo "  Building MBTiles..."
    rio mbtiles "$work/reprojected.tif" -o "$work/output.mbtiles" --zoom-levels ${zoom_min}..${zoom_max} --format PNG
    
    echo "  Converting to PMTiles..."
    pmtiles convert "$work/output.mbtiles" "$pm"
    echo "  PMTiles: $pm ($(du -h "$pm" | cut -f1))"
  fi
  
  # COG pipeline
  if [ ! -f "$cog" ]; then
    echo "  Building COG GeoTIFF..."
    $docker_work gdalwarp -of GTiff -co TILED=YES -co BLOCKXSIZE=512 -co BLOCKYSIZE=512 -co COMPRESS=JPEG -co JPEG_QUALITY=85 -co BIGTIFF=YES "$input_for_warp" "/work/cog.tif"
    
    echo "  Adding overviews..."
    $docker_work gdaladdo -r average "/work/cog.tif" 2 4 8 16 32 64
    
    cp "$work/cog.tif" "$cog"
    echo "  COG: $cog ($(du -h "$cog" | cut -f1))"
  fi
  
  rm -rf "$work"
}

# === OS 1:2500 1st Edition sheets ===
echo "========================================"
echo "OS 1:2500 1st Edition sheets"
echo "========================================"
OS_SHEETS=(
  "os-12500-1sted-22to42|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/22to42.ecw"
  "os-12500-1sted-23|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/23.ecw"
  "os-12500-1sted-24|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/24.ecw"
  "os-12500-1sted-25|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/25.ecw"
  "os-12500-1sted-26|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/26.ecw"
  "os-12500-1sted-32-42-41|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/32&42&41.ecw"
  "os-12500-1sted-33|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/33.ecw"
  "os-12500-1sted-34|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/34.ecw"
  "os-12500-1sted-35|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/35.ecw"
  "os-12500-1sted-36|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/36.ecw"
  "os-12500-1sted-37|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/37.ecw"
  "os-12500-1sted-41|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/41.ecw"
  "os-12500-1sted-42|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/42.ecw"
  "os-12500-1sted-43|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/43.ecw"
  "os-12500-1sted-44|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/44.ecw"
  "os-12500-1sted-45|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/45.ecw"
  "os-12500-1sted-46|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/46.ecw"
  "os-12500-1sted-47|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/47.ecw"
  "os-12500-1sted-51|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/51.ecw"
  "os-12500-1sted-52|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/52.ecw"
  "os-12500-1sted-53|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/53.ecw"
  "os-12500-1sted-54|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/54.ecw"
  "os-12500-1sted-55|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/55.ecw"
  "os-12500-1sted-56|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/56.ecw"
  "os-12500-1sted-61|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/61.ecw"
  "os-12500-1sted-62|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/62.ecw"
  "os-12500-1sted-63e|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/63e.ecw"
  "os-12500-1sted-63w|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/63w.ecw"
  "os-12500-1sted-64|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/64.ecw"
  "os-12500-1sted-65|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/65.ecw"
  "os-12500-1sted-66|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/66.ecw"
  "os-12500-1sted-73|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/73.ecw"
  "os-12500-1sted-74|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/74.ecw"
  "os-12500-1sted-75|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/75.ecw"
  "os-12500-1sted-76|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/76.ecw"
  "os-12500-1sted-North1886|Maps/EN_Historical/1_2500_3rdEpoch/1_2500_1stEd/North1886.ecw"
)

for entry in "${OS_SHEETS[@]}"; do
  IFS='|' read -r id src <<< "$entry"
  echo "--- $id ---"
  convert_one "$id" "$src" 10 16 || true
done

# === OS 1880s 6-inch AffineECW ===
echo ""
echo "========================================"
echo "OS 1880s 6-inch AffineECW"
echo "========================================"
convert_one "os-1880-6inch-affine" "Maps/1880_6inch/AffineECW/" 10 16 || true

# === Aerial Photography — County Coverage ===
echo ""
echo "========================================"
echo "Aerial Photography — County Coverage"
echo "========================================"
convert_one "aerial-en-county" "AirPhotos/EN_County_APs/" 10 16 || true

echo ""
echo "========================================"
echo "Aerial Photography — 25 cm Resolution"
echo "========================================"
convert_one "aerial-en-25cm" "AirPhotos/EN_25cmpp_5kmx5km/" 10 17 || true

echo ""
echo "All conversions complete."
