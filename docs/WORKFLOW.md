# Release Workflow: Photo Bundles & Assets

This guide covers the complete process for sampling, packaging, and releasing photo collections to the web portal.

## Overview

Each photo release involves:

1. **Sample** images from the archive using size/quality constraints
2. **Generate** manifest with sampled photo metadata
3. **Update** tracking files to coordinate DuckDB index and validator
4. **Validate** release asset integrity before pushing
5. **Commit & Push** with GitHub Actions running full CI/CD

**Key principle:** Never push without running all validations locally first. Update only what changes; use version numbers to avoid stale cache references.

---

## Step-by-Step: Releasing a New Photo Bundle

### Prerequisites

- Archive mounted at `/media/robin/foss4lh1/david-lovelace-archive/`
- `npm install` completed
- Write access to this repository
- `gh` CLI authenticated

### 1. Sample Photos from Archive

```bash
python3 scripts/release/sample-photos.py \
  --archive-root /media/robin/foss4lh1/david-lovelace-archive \
  --output-dir /tmp/photo-bundles \
  --max-zip-size-mb 5 \
  --quality 70 \
  --collections hfd-royal-commission
```

**What this does:**

- Scans `hfd-royal-commission/` for images (JPG, TIF)
- Downsample images to fit 5 MB limit
- Generate thumbnails + web-optimized JPEG copies
- Create manifest.json alongside zipped assets
- Output: `/tmp/photo-bundles/hfd-royal-commission/` with:
  - `photos-{N}-{collection}.zip` (web/ + thumbs/ + manifest.json)
  - `manifest.json` (standalone, shows total_sampled, quality, photo list)

**Tuning parameters:**

- `--max-zip-size-mb`: Target zip size (quality auto-adjusts downward to meet target)
- `--quality`: JPEG quality (1–100; lower = smaller file but lower fidelity)
- Adjust one or both parameters if size doesn't fit target

### 2. Review Sampled Photos

```bash
# Inspect manifest to see how many photos were selected and quality settings
cat /tmp/photo-bundles/hfd-royal-commission/manifest.json | jq '.total_sampled, .quality, .photos | length'
```

**Expected output for ~5 MB constraint:**

- 30–50 photos depending on original image dimensions/quality
- Quality down to 60–80 to fit size target

**If not satisfied:**

```bash
# Re-run with different parameters
rm -rf /tmp/photo-bundles
python3 scripts/release/sample-photos.py \
  --archive-root /media/robin/foss4lh1/david-lovelace-archive \
  --output-dir /tmp/photo-bundles \
  --max-zip-size-mb 4 \
  --quality 60 \
  --collections hfd-royal-commission
```

### 3. Install Photos Locally + Generate Manifest

Copy sampled photos to the static directory and extract the standalone manifest:

```bash
# Clear old samples
rm -rf static/photos/demo

# Copy new samples
cp -r /tmp/photo-bundles/hfd-royal-commission/web \
      /tmp/photo-bundles/hfd-royal-commission/thumbs \
      static/photos/demo/

# Extract the standalone manifest
cp /tmp/photo-bundles/hfd-royal-commission/manifest.json \
   static/photos/demo/manifest.json
```

### 4. Generate Photo URL Mapping

Create a JSON file that maps archive file paths to web-accessible URLs. This file is used by the DuckDB build to join image metadata.

```bash
# From the manifest, generate catalog/photo-urls.json
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('static/photos/demo/manifest.json', 'utf-8'));

const urls = manifest.photos.map(photo => ({
  path: photo.path,
  url: '/photos/demo/web/' + photo.filename.replace(/\.[^.]+$/, '.jpg'),
  thumb_url: '/photos/demo/thumbs/' + photo.filename.replace(/\.[^.]+$/, '.jpg')
}));

fs.writeFileSync('catalog/photo-urls.json', JSON.stringify(urls, null, 2));
console.log('Generated ' + urls.length + ' photo URL mappings');
"
```

### 5. Update Version & Asset References

Coordinate changes across 5 files. **Use a unique version identifier** (e.g., incrementing number or date) to avoid browser cache issues.

**Example:** Moving from v2 (10 photos, archive-v2.duckdb) → v3 (40 photos, archive-v3.duckdb)

#### File 1: `package.json` (line ~13)

Update the DuckDB build command to use new version:

```json
"inventory:duckdb": "duckdb static/data/archive-v3.duckdb \"CREATE OR REPLACE TABLE files AS ...\""
```

> **Rule:** Always increment version suffix when changing DuckDB content (new photos, photos removed, URLs updated).

#### File 2: `src/lib/duckdb.ts` (lines ~28–29)

Update the runtime fetch URL:

```typescript
const url = `${base}/data/archive-v3.duckdb`;
// ... error message ...
```

#### File 3: `catalog/datasets.json` (archive-inventory-duckdb entry)

Update release asset references:

```json
{
	"id": "archive-inventory-duckdb",
	"releaseAsset": {
		"filename": "archive-v3.duckdb",
		"url": "https://github.com/foss4lh/david-lovelace-archive/releases/download/data-v0.1.0/archive-v3.duckdb",
		"status": "available"
	},
	"localPath": "static/data/archive-v3.duckdb",
	"remoteUrl": "https://github.com/foss4lh/david-lovelace-archive/releases/download/data-v0.1.0/archive-v3.duckdb"
}
```

#### File 4: `catalog/releases.json` (photo bundle entry)

Update the photo asset entry (e.g., photos-10-demo → photos-5-demo):

```json
{
	"id": "photos-5-demo",
	"filename": "photos-5-demo.zip",
	"url": "https://github.com/foss4lh/david-lovelace-archive/releases/download/data-v0.1.0/photos-5-demo.zip",
	"title": "5 MB demo photo bundle",
	"target": "static/photos/demo",
	"status": "available",
	"requiredForBuild": false
}
```

#### File 5: `scripts/release/validate-photo-release-assets.mjs` (line ~8)

Update the asset ID that the validator checks:

```javascript
const PHOTO_ASSET_ID = 'photos-5-demo';
```

> **Important:** These 5 references must match exactly. A typo in one breaks the entire pipeline.

#### File 6: `catalog/photo-urls.json` (auto-generated in step 4)

Already done above—this is regenerated each release.

### 6. Rebuild DuckDB + Validate Locally

```bash
# Rebuild DuckDB with new photos and URLs
npm run inventory:duckdb

# Validate that the release zip matches the tracking manifest
npm run data:validate:photos
```

**Expected output:**

```
download https://github.com/foss4lh/david-lovelace-archive/releases/download/data-v0.1.0/photos-5-demo.zip
✓ Validation passed (40 photos in sync)
```

**If validation fails:**

- Check that PHOTO_ASSET_ID in validate-photo-release-assets.mjs matches the `id` in catalog/releases.json
- Verify photo-urls.json has the correct number of entries
- Ensure the zip is actually uploaded to GitHub Releases

### 7. Upload Release Assets to GitHub

```bash
# The release tag should already exist (data-v0.1.0)
# Upload both the DuckDB and photo bundle
gh release upload data-v0.1.0 \
  static/data/archive-v3.duckdb \
  /tmp/photo-bundles/hfd-royal-commission/photos-5-demo.zip
```

**Check upload status:**

```bash
gh release view data-v0.1.0
```

### 8. Validate Release Asset Integrity

Once uploaded, verify the release matches our local manifest:

```bash
npm run data:validate:photos
```

This downloads the zip from GitHub and confirms:

- Number of photos in manifest matches tracking
- All photo paths exist in zip
- All photo URLs are correctly mapped

### 9. Pre-Commit Checks

Before committing, run the full quality pipeline locally:

```bash
# Format check + linting
npm run format
npm run lint

# Type checks
npm run check

# Local build (this will fetch the new DuckDB from GitHub)
npm run build
```

**Fix any issues before proceeding.** All of these checks run in CI; failing locally saves time.

### 10. Commit & Push

```bash
git add catalog/photo-urls.json \
        catalog/releases.json \
        catalog/datasets.json \
        src/lib/duckdb.ts \
        scripts/release/validate-photo-release-assets.mjs \
        static/photos/demo/ \
        package.json

git commit -m "chore: publish v3 archive and photo bundle

- Sampled 40 photos from hfd-royal-commission collection
- Photos quality=70, total zip size 4.4 MB
- Updated DuckDB to archive-v3.duckdb with photo URL mappings
- Updated 5 tracking files to latest version refs"

git push origin main
```

### 11. Monitor CI & Deployment

GitHub Actions automatically runs on push. Monitor the build:

```bash
gh run list --branch main --limit 1
```

Watch for the newly triggered run:

```bash
gh run view <run-id> --log
```

Expected workflow:

1. **data:validate:photos** — Verify release asset vs. tracking manifest ✓
2. **lint** — Prettier + ESLint formatting checks ✓
3. **check** — Type checks (Svelte + TypeScript) ✓
4. **build** — Static site generation ✓

Once all steps pass, Netlify auto-deploys. The live site updates within 1–2 minutes.

### 12. Verify Live Site

After deployment, test the live site:

```bash
# Check that the photos page renders
curl -s https://david-lovelace-archive.netlify.app/photos | grep -i manifest

# Spot-check that photo URLs resolve
# Open https://david-lovelace-archive.netlify.app/photos in a browser
# and verify thumbnails load and lightbox works
```

---

## Troubleshooting

### "Asset photos-5-demo not found" in CI

**Problem:** Pushed code that references a release asset that hasn't been uploaded yet.

**Solution:**

```bash
gh release upload data-v0.1.0 /tmp/photo-bundles/hfd-royal-commission/photos-5-demo.zip
```

Then wait ~30 seconds for GitHub to index the asset, then re-run CI.

### Prettier formatting error in lint step

**Problem:** Long lines in JavaScript/JSON files fail the Prettier check.

**Solution:**

```bash
npx prettier --write scripts/release/validate-photo-release-assets.mjs catalog/releases.json
git add .
git commit -m "style: format files for Prettier"
git push origin main
```

**Prevention:** Run `npm run format` before committing.

### "Photo manifest mismatch" in data:validate:photos

**Problem:** Invalid photo-urls.json or mismatched photo count.

**Debugging:**

```bash
# Check photo-urls.json is valid JSON
jq . catalog/photo-urls.json

# Compare counts
jq '.photos | length' static/photos/demo/manifest.json
jq 'length' catalog/photo-urls.json

# Regenerate photo-urls.json (step 4 above)
```

### DuckDB won't build ("archive-v3 not found")

**Problem:** DuckDB command in package.json references a non-existent file.

**Solution:**

```bash
# Rebuild from CSV
npm run inventory:duckdb

# Verify file was created
ls -lh static/data/archive-v*.duckdb
```

---

## Extending the Workflow

### Adding a New Collection

1. Add the collection's `sourceArchivePaths` to [catalog/datasets.json](../catalog/datasets.json)
2. Adjust the sampler call:
   ```bash
   --collections hfd-royal-commission,aerial-england-1947
   ```
3. Generate separate manifests + zips for each collection
4. Create a new asset entry in `catalog/releases.json` per collection (e.g., photos-5-aerial.zip)
5. Merge the separate photo-urls.json files into one

### Multiple Quality Variants

Future option: Release the same collection at different quality/size points:

```bash
# High-quality variant (20 MB)
python3 scripts/release/sample-photos.py ... --max-zip-size-mb 20 --quality 90 \
  && mv photos-5-{hq,demo}.zip

# Mobile-friendly variant (2 MB)
python3 scripts/release/sample-photos.py ... --max-zip-size-mb 2 --quality 50 \
  && mv photos-5-{mobile,demo}.zip
```

Then add separate entries in `catalog/releases.json` for each variant, and `catalog/photo-urls.json` would list both sets of URLs.

### Automated Manifest Coordination

**Future improvement:** A Node.js script to atomically update all 5 files given a new version number:

```javascript
// scripts/release/sync-manifest.mjs (proposed)
const newVersion = process.argv[2]; // "v4"
const photoCount = process.argv[3]; // "40"
const zipSize = process.argv[4]; // "4.4"

// Atomic multi-file update:
// 1. Read all 5 files
// 2. Replace version placeholders
// 3. Validate all references match
// 4. Write atomically or with rollback
```

This would eliminate manual coordination risk for future releases.

---

## Scaling Considerations

**Current bottleneck:** Sampling from the 2TB archive scans ~190k files.

**For future improvements:**

- Cache image metadata index (pre-compute file lists per collection)
- Parallel sampling across folders
- Incremental sampling (add new photos to existing release without full re-scan)
- Store sampling state to resume interrupted runs

**CI considerations:**

- Current photo validation downloads ~5 MB and runs in CI (~5–10 seconds)
- Scales well to 50+ MB assets
- Consider moving to GitHub Actions cache for repeated validations across multiple releases
