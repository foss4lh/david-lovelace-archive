#!/usr/bin/env bash
# Batch convert already-georeferenced tithe map ECW files to PMTiles
# Usage: ./scripts/batch-convert-tithe-ecw.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$ROOT_DIR/static/data"

# Docker image with ECW support
DOCKER_GDAL="ginetto/gdal:2.4.4_ECW"

# List of already-georeferenced tithe map ECW files
# Format: "label|source_path|output_name"
# All paths relative to /media/robin/foss4lh1/david-lovelace-archive/
MAPS=(
  "Wigmore Castle & Village Tithe Map|Maps/TitheMapsOriginals/Wigmore/Wigbasecastle&VillageTM.ecw|wigmore-castle-village-tithe"
  "Hampton Bishop Tithe Map|HARC/Raster/Hereford/HamptonBishopTMO.ecw|hampton-bishop-tithe"
  "Holmer Tithe Map|HARC/Raster/Hereford/HolmerTMO.ecw|holmer-tithe"
  "Marden Tithe Map 54|HARC/Raster/Marden/54_TMG.ecw|marden-tithe-54"
  "Marden Tithe Map 55|HARC/Raster/Marden/55_TMG.ecw|marden-tithe-55"
)

mkdir -p "$OUT_DIR"

total=${#MAPS[@]}
success=0
fail=0

echo "=========================================="
echo "Batch tithe ECW → PMTiles conversion"
echo "Output: $OUT_DIR"
echo "Maps to process: $total"
echo "=========================================="

for entry in "${MAPS[@]}"; do
  IFS='|' read -r label src_rel out_name <<< "$entry"
  src_path="/media/robin/foss4lh1/david-lovelace-archive/$src_rel"
  work_dir=$(mktemp -d)

  echo ""
  echo "--- Processing: $label ---"

  if [[ ! -f "$src_path" ]]; then
    echo "  SKIP: source not found: $src_path"
    ((++fail))
    rm -rf "$work_dir"
    continue
  fi

  # Step 1: Reproject to WGS84 GeoTIFF using Docker gdal
  echo "  Reprojecting ECW → WGS84 GeoTIFF..."
  docker run --rm \
    -v "$src_path:/input.ecw:ro" \
    -v "$work_dir:/work" \
    "$DOCKER_GDAL" \
    gdalwarp -t_srs EPSG:4326 -of GTiff /input.ecw /work/reprojected.tif \
    || { echo "  FAIL: gdalwarp"; ((++fail)); rm -rf "$work_dir"; continue; }

  # Step 2: Build MBTiles with rio
  echo "  Building MBTiles (zoom 10-16)..."
  rio mbtiles "$work_dir/reprojected.tif" \
    -o "$work_dir/output.mbtiles" \
    --zoom-levels 10..16 \
    --format PNG \
    --progress-bar \
    || { echo "  FAIL: rio mbtiles"; ((++fail)); rm -rf "$work_dir"; continue; }

  # Step 3: Convert to PMTiles
  echo "  Converting MBTiles → PMTiles..."
  pmtiles convert "$work_dir/output.mbtiles" "$OUT_DIR/${out_name}.pmtiles" \
    || { echo "  FAIL: pmtiles convert"; ((++fail)); rm -rf "$work_dir"; continue; }

  echo "  ✓ Output: ${out_name}.pmtiles"
  ((++success))
  rm -rf "$work_dir"
done

echo ""
echo "=========================================="
echo "Done: $success succeeded, $fail failed"
echo "Output directory: $OUT_DIR"
ls -lh "$OUT_DIR"/*.pmtiles 2>/dev/null || true
echo "=========================================="
