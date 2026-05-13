#!/usr/bin/env bash
set -euo pipefail

# Batch convert unique ECW datasets (aerial photos)
# Usage: bash scripts/batch-convert-aerial.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="/media/robin/foss4lh1/david-lovelace-archive"
OUTDIR="$SCRIPT_DIR/../static/data"

DOCKER="docker run --rm -v $ROOT:/data ginetto/gdal:2.4.4_ECW"
mkdir -p "$OUTDIR"

convert_directory() {
  local id="$1"
  local src_dir="$2"
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
  
  # Build file list (use host path for find, then rewrite to /data/ for Docker)
  local file_list="$work/files.txt"
  find "$ROOT/${src_dir%/}" -maxdepth 2 -type f -iname '*.ecw' \
    ! -iname '*patch*' \
    ! -iname '*test*' \
    ! -iname '*Copy*' \
    -printf '%p\n' | sed "s|^$ROOT|/data|" | sort > "$file_list"
  
  local ecw_count=$(wc -l < "$file_list")
  echo "  Found $ecw_count ECW files"
  
  if [ "$ecw_count" -eq 0 ]; then
    echo "  ERROR: No ECW files found"
    rm -rf "$work"
    return 1
  fi
  
  # Build VRT
  echo "  Building VRT mosaic..."
  $docker_work gdalbuildvrt -input_file_list "/work/files.txt" "/work/mosaic.vrt"
  
  # PMTiles pipeline
  if [ ! -f "$pm" ]; then
    echo "  Reprojecting → WGS84 GeoTIFF..."
    $docker_work gdalwarp -t_srs EPSG:4326 -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co BIGTIFF=YES "/work/mosaic.vrt" "/work/reprojected.tif"
    
    echo "  Building MBTiles..."
    rio mbtiles "$work/reprojected.tif" -o "$work/output.mbtiles" --zoom-levels ${zoom_min}..${zoom_max} --format PNG
    
    echo "  Converting to PMTiles..."
    pmtiles convert "$work/output.mbtiles" "$pm"
    echo "  PMTiles: $pm ($(du -h "$pm" | cut -f1))"
  fi
  
  # COG pipeline
  if [ ! -f "$cog" ]; then
    echo "  Building COG GeoTIFF..."
    $docker_work gdalwarp -of GTiff -co TILED=YES -co BLOCKXSIZE=512 -co BLOCKYSIZE=512 -co COMPRESS=JPEG -co JPEG_QUALITY=85 -co BIGTIFF=YES "/work/mosaic.vrt" "/work/cog.tif"
    
    echo "  Adding overviews..."
    $docker_work gdaladdo -r average "/work/cog.tif" 2 4 8 16 32 64
    
    cp "$work/cog.tif" "$cog"
    echo "  COG: $cog ($(du -h "$cog" | cut -f1))"
  fi
  
  rm -rf "$work"
}

echo "========================================"
echo "Aerial Photography — County Coverage (EN_County_APs)"
echo "========================================"
convert_directory "aerial-en-county" "AirPhotos/EN_County_APs/" 10 16 || true

echo ""
echo "========================================"
echo "Aerial Photography — 25 cm Resolution (EN_25cmpp_5kmx5km)"
echo "========================================"
convert_directory "aerial-en-25cm" "AirPhotos/EN_25cmpp_5kmx5km/" 10 17 || true

echo ""
echo "All aerial conversions complete."
