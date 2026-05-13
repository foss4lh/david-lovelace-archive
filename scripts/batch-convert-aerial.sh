#!/usr/bin/env bash
set -euo pipefail

# Batch convert aerial ECW directories to PMTiles + COG GeoTIFF
# Fixes:
#   - gdalbuildvrt with -a_srs EPSG:27700 (tiles lack embedded projection)
#   - Cap reprojected pixel size to avoid OOM in rio mbtiles
#   - Use -ts (pixel count) not -tr (world units) for downsampling
#   - rio mbtiles for tiling (GDAL MBTiles driver is 24x worse)
#   - JPEG 85 + YCbCr for COGs (16x smaller than DEFLATE for photos)

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
  local max_pixels="${5:-50000}"  # cap width/height for PMTiles input

  local pm="$OUTDIR/${id}.pmtiles"
  local cog="$OUTDIR/${id}-cog.tif"

  if [ -f "$pm" ] && [ -f "$cog" ]; then
    echo "  SKIP: $id already converted"
    return 0
  fi

  local work=$(mktemp -d)
  local docker_work="docker run --rm -v $ROOT:/data -v $work:/work ginetto/gdal:2.4.4_ECW"

  # Build file list on host, rewrite paths for Docker
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

  # Build VRT with explicit SRS
  echo "  Building VRT with EPSG:27700 ..."
  $docker_work gdalbuildvrt -a_srs EPSG:27700 -input_file_list "/work/files.txt" "/work/mosaic.vrt"

  # PMTiles pipeline: cap pixel size to avoid OOM
  if [ ! -f "$pm" ]; then
    echo "  Reprojecting → WGS84 GeoTIFF (max ${max_pixels}px)..."
    $docker_work gdalwarp -s_srs EPSG:27700 -t_srs EPSG:4326 -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co BIGTIFF=YES -ts $max_pixels 0 "/work/mosaic.vrt" "/work/reprojected.tif"

    echo "  Building MBTiles with rio mbtiles (JPEG format)..."
    rio mbtiles "$work/reprojected.tif" -o "$work/output.mbtiles" --zoom-levels ${zoom_min}..${zoom_max} --format JPEG

    echo "  Converting to PMTiles..."
    pmtiles convert "$work/output.mbtiles" "$pm"
    echo "  PMTiles: $pm ($(du -h "$pm" | cut -f1))"
  fi

  # COG pipeline: full resolution JPEG + YCbCr
  if [ ! -f "$cog" ]; then
    echo "  Building COG GeoTIFF (JPEG + YCbCr, max ${max_pixels}px)..."
    $docker_work gdalwarp -s_srs EPSG:27700 -of GTiff -co TILED=YES -co BLOCKXSIZE=512 -co BLOCKYSIZE=512 -co COMPRESS=JPEG -co JPEG_QUALITY=85 -co PHOTOMETRIC=YCBCR -co BIGTIFF=YES -ts $max_pixels 0 "/work/mosaic.vrt" "/work/cog.tif"

    echo "  Adding overviews..."
    $docker_work gdaladdo -r average "/work/cog.tif" 2 4 8 16 32 64

    cp "$work/cog.tif" "$cog"
    echo "  COG: $cog ($(du -h "$cog" | cut -f1))"
  fi

  rm -rf "$work"
}

echo "========================================"
echo "Aerial Photography — County Coverage"
echo "========================================"
# 1m county coverage: zoom 14 overview, cap at 50k pixels
convert_directory "aerial-en-county" "AirPhotos/EN_County_APs/" 10 14 "50000" || true

echo ""
echo "========================================"
echo "Aerial Photography — 25 cm Resolution"
echo "========================================"
# 25cm tiles: zoom 16 overview, cap at 50k pixels
convert_directory "aerial-en-25cm" "AirPhotos/EN_25cmpp_5kmx5km/" 10 16 "50000" || true

echo ""
echo "All conversions complete."
