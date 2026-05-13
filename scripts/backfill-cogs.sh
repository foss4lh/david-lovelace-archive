#!/usr/bin/env bash
set -euo pipefail

# Backfill COG GeoTIFFs for existing PMTiles datasets

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="/media/robin/foss4lh1/david-lovelace-archive"
OUTDIR="$SCRIPT_DIR/../static/data"
mkdir -p "$OUTDIR"

# Tithe maps
declare -a TITHE=(
  "wigmore-castle-village-tithe|Maps/TitheMapsOriginals/Wigmore/Wigbasecastle&VillageTM.ecw"
  "hampton-bishop-tithe|HARC/Raster/Hereford/HamptonBishopTMO.ecw"
  "holmer-tithe|HARC/Raster/Hereford/HolmerTMO.ecw"
  "marden-tithe-54|HARC/Raster/Marden/54_TMG.ecw"
  "marden-tithe-55|HARC/Raster/Marden/55_TMG.ecw"
)

# FC1953 woodland maps
declare -a FC1953=(
  "fc1953-ce|Maps/FC1953ecw/CE.ecw"
  "fc1953-c13-14-20-21|Maps/FC1953ecw/C13_14_20_21.ecw"
  "fc1953-c27|Maps/FC1953ecw/C27.ecw"
  "fc1953-c28-29-35-36|Maps/FC1953ecw/C28_29_35_36.ecw"
  "fc1953-c40|Maps/FC1953ecw/C40.ecw"
  "fc1953-c4142fc|Maps/FC1953ecw/C4142FC.ecw"
  "fc1953-c46-47|Maps/FC1953ecw/C46_47.ecw"
  "fc1953-c47|Maps/FC1953ecw/C47.ecw"
  "fc1953-c54-51s|Maps/FC1953ecw/C54&51S.ecw"
  "fc1953-c6-7-11-12private|Maps/FC1953ecw/C6_7_11_12Private.ecw"
  "fc1953-clords1953|Maps/FC1953ecw/CLords1953.ecw"
  "fc1953-cn|Maps/FC1953ecw/CN.ecw"
  "fc1953-csw|Maps/FC1953ecw/CSW.ecw"
)

convert_one() {
  local id="$1"
  local src="$2"
  local ecw="/data/$src"
  local cog="$OUTDIR/${id}-cog.tif"
  local work=$(mktemp -d)
  
  if [ -f "$cog" ]; then
    echo "  SKIP: $cog already exists"
    rm -rf "$work"
    return
  fi
  
  echo "  Building COG for $id..."
  docker run --rm -v "$ROOT:/data" -v "$work:/work" ginetto/gdal:2.4.4_ECW \
    gdalwarp -of GTiff -co TILED=YES -co BLOCKXSIZE=512 -co BLOCKYSIZE=512 \
    -co COMPRESS=JPEG -co JPEG_QUALITY=85 -co BIGTIFF=YES "$ecw" "/work/cog.tif"
  
  docker run --rm -v "$ROOT:/data" -v "$work:/work" ginetto/gdal:2.4.4_ECW \
    gdaladdo -r average "/work/cog.tif" 2 4 8 16 32 64
  
  cp "$work/cog.tif" "$cog"
  rm -rf "$work"
  echo "  Done: $cog ($(du -h "$cog" | cut -f1))"
}

echo "=== Tithe map COGs ==="
for entry in "${TITHE[@]}"; do
  IFS='|' read -r id src <<< "$entry"
  echo "--- $id ---"
  convert_one "$id" "$src"
done

echo ""
echo "=== FC1953 COGs ==="
for entry in "${FC1953[@]}"; do
  IFS='|' read -r id src <<< "$entry"
  echo "--- $id ---"
  convert_one "$id" "$src"
done

echo "All backfill COGs complete."
