#!/usr/bin/env bash
set -euo pipefail

# Batch convert ECW files to PMTiles + COG GeoTIFF
# Usage: bash scripts/batch-convert-maps.sh [map-name ...]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="/media/robin/foss4lh1/david-lovelace-archive"
OUTDIR="$SCRIPT_DIR/../static/data"

DOCKER="docker run --rm -v $ROOT:/data ginetto/gdal:2.4.4_ECW"
mkdir -p "$OUTDIR"

# Define maps: id|title|period|source_ecw_path|theme
declare -a MAPS=(
  "speed1606|John Speed — Hereford|1606|HARC/Raster/Hereford/speed1606.ecw|historic maps"
  "taylor1754|Taylor — Hereford|1754|HARC/Raster/Hereford/Taylor1754.ecw|historic maps"
  "brayley1806|Brayley — Hereford|1806|HARC/Raster/Hereford/Brayley_1806.ecw|historic maps"
  "hereford1885|Hereford (1885)|1885|HARC/Raster/Hereford_1885.ecw|historic maps"
  "os6inch1886|OS 6-inch — Marden|1886|HARC/Raster/Marden/6inchOS1886geo.ecw|historic maps"
  "gv1886|OS 1:2500 — Golden Valley|1886|Maps/EN_Historical/GV_1886.ecw|historic maps"
  "raf1947|RAF Aerial — Marden|1947|HARC/Raster/Marden/RAF1947.ecw|aerial photography"
)

# Filter by CLI args if provided
if [ $# -gt 0 ]; then
  FILTERED=()
  for map in "${MAPS[@]}"; do
    id="${map%%|*}"
    for arg in "$@"; do
      if [ "$id" = "$arg" ]; then
        FILTERED+=("$map")
      fi
    done
  done
  MAPS=("${FILTERED[@]}")
fi

if [ ${#MAPS[@]} -eq 0 ]; then
  echo "No maps matched."
  exit 1
fi

for map in "${MAPS[@]}"; do
  IFS='|' read -r id title period src theme <<< "$map"
  echo "=== $id: $title ($period) ==="
  
  ECW="/data/$src"
  WORK=$(mktemp -d)
  PM="$OUTDIR/${id}.pmtiles"
  COG="$OUTDIR/${id}-cog.tif"
  
  DOCKER_WORK="docker run --rm -v $ROOT:/data -v $WORK:/work ginetto/gdal:2.4.4_ECW"
  
  # 1. PMTiles pipeline
  echo "  Reprojecting ECW → WGS84 GeoTIFF..."
  $DOCKER_WORK gdalwarp -t_srs EPSG:4326 -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co BIGTIFF=YES "$ECW" "/work/reprojected.tif"
  
  echo "  Building MBTiles..."
  rio mbtiles "$WORK/reprojected.tif" -o "$WORK/output.mbtiles" --zoom-levels 10..16 --format PNG
  
  echo "  Converting to PMTiles..."
  pmtiles convert "$WORK/output.mbtiles" "$PM"
  
  # 2. COG pipeline (keep native EPSG:27700, tiled + overviews, JPEG for size)
  echo "  Building COG GeoTIFF..."
  $DOCKER_WORK gdalwarp -of GTiff -co TILED=YES -co BLOCKXSIZE=512 -co BLOCKYSIZE=512 -co COMPRESS=JPEG -co JPEG_QUALITY=85 -co BIGTIFF=YES "$ECW" "/work/cog.tif"
  
  echo "  Adding overviews..."
  $DOCKER_WORK gdaladdo -r average "/work/cog.tif" 2 4 8 16 32 64
  
  cp "$WORK/cog.tif" "$COG"
  rm -rf "$WORK"
  
  echo "  Done: $PM ($(du -h "$PM" | cut -f1)), $COG ($(du -h "$COG" | cut -f1))"
done

echo "All conversions complete."
