#!/usr/bin/env bash
#
# Batch-convert ECW rasters to PMTiles using Docker gdalwarp.
#
# Pipeline per file:
#   1. gdalwarp (Docker ginetto/gdal:2.4.4_ECW) reprojects ECW → EPSG:3857 GeoTIFF
#   2. rio mbtiles tiles the GeoTIFF into an MBTiles SQLite database
#   3. pmtiles convert turns MBTiles into a single PMTiles archive
#
# Usage:
#   ./scripts/batch-convert-ecw.sh \
#       /media/robin/foss4lh1/david-lovelace-archive/Maps/FC1953ecw \
#       static/data \
#       10-14
#
# Requires:
#   - Docker
#   - rio-mbtiles (pip install rio-mbtiles)
#   - pmtiles CLI   (https://github.com/protomaps/go-pmtiles)

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
ZOOM_RANGE="${3:-10-14}"
SRC_DIR="${1:-}"
DST_DIR="${2:-}"
DOCKER_IMAGE="ginetto/gdal:2.4.4_ECW"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() { echo "[$(date +%H:%M:%S)] $*"; }

fatal() { echo "FATAL: $*" >&2; exit 1; }

check_deps() {
	local missing=()
	command -v docker >/dev/null 2>&1 || missing+=("docker")
	command -v rio >/dev/null 2>&1 || missing+=("rio (rasterio)")
	command -v pmtiles >/dev/null 2>&1 || missing+=("pmtiles CLI")

	if [[ ${#missing[@]} -gt 0 ]]; then
		fatal "Missing required tools:\n  - ${missing[*]}"
	fi

	# Verify rio-mbtiles subcommand exists
	if ! rio mbtiles --help >/dev/null 2>&1; then
		fatal "rio-mbtiles not found. Run: pip install rio-mbtiles"
	fi

	# Pull Docker image if not present
	if ! docker image inspect "$DOCKER_IMAGE" >/dev/null 2>&1; then
		log "Pulling Docker image $DOCKER_IMAGE …"
		docker pull "$DOCKER_IMAGE"
	fi
}

# ---------------------------------------------------------------------------
# Per-file conversion
# ---------------------------------------------------------------------------
convert_one() {
	local ecw_path="$1"
	local out_dir="$2"
	local zoom="$3"

	local basename
	basename=$(basename "$ecw_path" .ecw)
	local work
	work=$(mktemp -d "/tmp/ecw2pmtiles_${basename}_XXXXXX")

	local tiff="$work/${basename}_3857.tif"
	local mbtiles="$work/${basename}.mbtiles"
	local pmtiles="$out_dir/${basename}.pmtiles"

	# Ensure work dir is cleaned up even on failure
	trap 'rm -rf "$work"' EXIT

	log "--------------------------------------------------"
	log "Processing: $basename"
	log "Work dir:   $work"
	log "Output:     $pmtiles"
	log "Zoom:       $zoom"

	# 1. gdalwarp via Docker
	log "  → Reprojecting to EPSG:3857 …"
	local ecw_dir
	ecw_dir=$(dirname "$ecw_path")
	local tiff_dir
	tiff_dir=$(dirname "$tiff")
	local ecw_name
	ecw_name=$(basename "$ecw_path")
	local tiff_name
	tiff_name=$(basename "$tiff")

	docker run --rm \
		-u "$(id -u):$(id -g)" \
		-v "$ecw_dir:/data_in:ro" \
		-v "$tiff_dir:/data_out" \
		"$DOCKER_IMAGE" \
		gdalwarp \
			-t_srs EPSG:3857 \
			-of GTiff \
			-co TILED=YES \
			-co COMPRESS=DEFLATE \
			"/data_in/$ecw_name" \
			"/data_out/$tiff_name"

	# 2. rio mbtiles
	log "  → Tiling to MBTiles (zoom $zoom) …"
	local min_z max_z
	min_z=${zoom%%-*}
	max_z=${zoom##*-}
	rio mbtiles \
		-o "$mbtiles" \
		--format PNG \
		--zoom-levels "${min_z}..${max_z}" \
		--exclude-empty-tiles \
		-j "$(nproc)" \
		--progress-bar \
		"$tiff"

	# 3. pmtiles convert
	log "  → Converting to PMTiles …"
	pmtiles convert "$mbtiles" "$pmtiles"

	# 4. Inspect result
	log "  → Verifying …"
	pmtiles show "$pmtiles"

	trap - EXIT
	log "  ✓ Done: $pmtiles"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
	if [[ -z "$SRC_DIR" || -z "$DST_DIR" ]]; then
		echo "Usage: $0 <ecw-source-dir> <pmtiles-output-dir> [zoom-range]"
		echo "Example:"
		echo "  $0 /path/to/ecws static/data 10-14"
		exit 1
	fi

	if [[ ! -d "$SRC_DIR" ]]; then
		fatal "Source directory not found: $SRC_DIR"
	fi

	mkdir -p "$DST_DIR"

	check_deps

	local ecw_files=()
	while IFS= read -r -d '' f; do
		ecw_files+=("$f")
	done < <(find "$SRC_DIR" -maxdepth 1 -type f \( -iname '*.ecw' \) -print0 | sort -z)

	if [[ ${#ecw_files[@]} -eq 0 ]]; then
		fatal "No .ecw files found in $SRC_DIR"
	fi

	log "Found ${#ecw_files[@]} ECW file(s)"
	local success=0 failed=0

	for ecw in "${ecw_files[@]}"; do
		if convert_one "$ecw" "$DST_DIR" "$ZOOM_RANGE"; then
			((++success))
		else
			echo "ERROR: Failed to process $(basename "$ecw")" >&2
			((++failed))
		fi
	done

	log "=================================================="
	log "Batch complete: $success succeeded, $failed failed"
	log "Output directory: $DST_DIR"
	log "=================================================="

	if [[ $failed -gt 0 ]]; then
		exit 1
	fi
}

main "$@"
