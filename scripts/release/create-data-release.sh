#!/usr/bin/env bash
set -euo pipefail

tag="${1:-data-v0.1.0}"
shift || true

if [ "$#" -eq 0 ]; then
	echo "Usage: $0 <tag> <asset> [asset...]"
	echo "Example: $0 data-v0.1.0 derived-data/whitby-tithe.pmtiles"
	exit 1
fi

gh release create "$tag" "$@" \
	--repo foss4lh/david-lovelace-archive \
	--title "Derived data ${tag}" \
	--notes "Derived web-ready assets for the David Lovelace Archive. Raw archive data is not included."
