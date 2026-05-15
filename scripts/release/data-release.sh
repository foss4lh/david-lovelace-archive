#!/bin/bash
# Orchestrate a full data release: rebuild duckdb, regenerate photo-urls,
# upload assets to GitHub Releases, and bump version references.
#
# Usage:
#   npm run release:data [-- --dry-run]
#
# Prerequisites:
#   - Archive mounted at /media/robin/foss4lh1/david-lovelace-archive/
#   - gh CLI authenticated
#   - npm install completed

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🧪 Dry-run mode — preview only"
fi

echo "📦 Data Release — $(date)"

# Step 1: Rebuild DuckDB from inventory CSV
echo ""
echo "── Step 1/5: Rebuilding DuckDB index ──"
if $DRY_RUN; then
  echo "  Would run: npm run inventory:duckdb"
else
  npm run inventory:duckdb
  echo "  ✓ duckdb rebuilt"
fi

# Step 2: Sample photos from archive (requires physical archive)
echo ""
echo "── Step 2/5: Sampling photos from archive ──"
OUTDIR="/tmp/photo-bundles-$(date +%s)"
if $DRY_RUN; then
  echo "  Would run: sample-photos.py → ${OUTDIR}"
  echo "  Then manually upload with: gh release upload data-v0.1.0 <zips> --clobber"
else
  python3 scripts/release/sample-photos.py \
    --archive-root /media/robin/foss4lh1/david-lovelace-archive \
    --output-dir "${OUTDIR}" \
    --min-size-kb 200
  echo "  ✓ photos sampled"
fi

# Step 3: Upload assets to GitHub Releases (manual — review before uploading)
echo ""
echo "── Step 3/5: Uploading assets to Releases ──"
echo "  DuckDB: static/data/archive-v*.duckdb"
echo "    gh release upload data-v0.1.0 static/data/archive-v*.duckdb --clobber"
if ls "${OUTDIR}"/photos-*.zip >/dev/null 2>&1; then
  echo "  Photo zips: $(ls "${OUTDIR}"/photos-*.zip | wc -l) files in ${OUTDIR}"
  echo "    gh release upload data-v0.1.0 ${OUTDIR}/photos-*.zip --clobber"
fi
echo "  Review bundles before uploading. This step is intentionally manual."

# Step 4: Regenerate photo-urls.json from manifests
echo ""
echo "── Step 4/5: Regenerating photo-urls.json ──"
if $DRY_RUN; then
  echo "  Would regenerate catalog/photo-urls.json from static/photos/*/manifest.json"
else
  python3 -c "
import json, glob, os
entries = []
for mf in sorted(glob.glob('static/photos/*/manifest.json')):
    with open(mf) as f:
        m = json.load(f)
    coll = m.get('collection')
    if not coll:
        continue
    for p in m.get('photos', []):
        entries.append({
            'path': p['path'],
            'url': f'/photos/{coll}/web/{os.path.basename(p[\"web\"])}',
            'thumb_url': f'/photos/{coll}/thumbs/{os.path.basename(p[\"thumb\"])}'
        })
with open('catalog/photo-urls.json', 'w') as f:
    json.dump(entries, f, indent=2)
print(f'  ✓ {len(entries)} photos written to catalog/photo-urls.json')
"
fi

# Step 5: Run validation
echo ""
echo "── Step 5/5: Validation ──"
if $DRY_RUN; then
  echo "  Would run: npm run lint && npm run check && npm run release:check"
else
  npm run lint
  npm run check
  npm run release:check
  echo ""
  echo "✨ Release ready. Commit and push to deploy."
fi
