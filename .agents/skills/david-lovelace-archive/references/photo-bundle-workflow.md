# Photo Bundle Creation and Validation Workflow

## Overview

This section covers the procedures for creating deterministic photo bundles from the David Lovelace Archive, validating their integrity, and publishing them as GitHub Release assets. This workflow supports the distribution of historical photograph collections in standardized, verifiable bundles.

## Creating Photo Bundles

### Using sample-photos.py

The `scripts/release/sample-photos.py` script creates deterministic, size-targeted photo bundles:

```bash
# Basic usage for a specific collection
source .venv/bin/activate
python scripts/release/sample-photos.py \\\\
    --archive-root /media/robin/foss4lh/david-lovelace-archive \\\\
    --output-dir ./photo-bundles \\\\
    --datasets-json catalog/datasets.json \\\\
    --max-zip-size-mb 10 \\\\
    --collections hfd-royal-commission \\\\
    --seed 42
```

#### Key Parameters

- `--archive-root`: Path to the archive root directory
- `--output-dir`: Directory where bundles will be created
- `--datasets-json`: Path to datasets.json for collection mapping
- `--max-zip-size-mb`: Target maximum zip size in MB
- `--collections`: Comma-separated list of collection IDs to process
- `--seed`: Random seed for reproducible sampling (critical for determinism)
- `--dry-run`: Print stats without generating files (useful for testing)
- `--source-paths`: Comma-separated list of subdirectories to scan (DRAMATICALLY reduces scan time for large archives)

#### Performance Optimization with --source-paths

For archives with 190,000+ images:

- **Without --source-paths**: Full archive scan takes 60+ seconds (hits default timeout)
- **With --source-paths**: Scan limited to specific directories reduces time to <5 seconds for targeted collections

Example usage with path filtering for single collection:

```bash
python scripts/release/sample-photos.py \\\\
    --archive-root /media/robin/foss4lh/david-lovelace-archive \\\\
    --output-dir ./photo-bundles \\\\
    --datasets-json catalog/datasets.json \\\\
    --max-zip-size-mb 10 \\\\
    --collections hfd-aerofilms \\\\
    --source-paths AirPhotos/EN_County_APs,AirPhotos/EN_County_APs_new,AirPhotos/aerialphotographs2,AirPhotos/DL_APs,History/NMRC_AeroFilms,HARC/Raster/Hereford,HARC/Raster/Marden \\\\
    --seed 42
```

This optimization was critical for meeting the 60-second timeout constraint in automated workflows.

### Multi-Collection Bundle Creation Pattern

For efficiently creating bundles across multiple collections with their specific source paths:

```bash
# Process each collection separately with its optimized source paths
python scripts/release/sample-photos.py \\\\
    --archive-root /media/robin/foss4lh/david-lovelace-archive \\\\
    --output-dir ./bundles/hfd-tithe-maps \\\\
    --datasets-json catalog/datasets.json \\\\
    --max-zip-size-mb 5 \\\\
    --collections hfd-tithe-maps \\\\
    --source-paths Maps/TitheMapsOriginals,Maps/GG_TitheMaps,History/HCA/FownhopeTitheMap[HCA],History/HCA/FownhopeTitheApportionments[HCA],History/BurringtonTithe,HARC/Raster/Hereford,HARC/Raster/Marden \\\\
    --seed 42

python scripts/release/sample-photos.py \\\\
    --archive-root /media/robin/foss4lh/david-lovelace-archive \\\\
    --output-dir ./bundles/hfd-hedgerow-surveys \\\\
    --datasets-json catalog/datasets.json \\\\
    --max-zip-size-mb 5 \\\\
    --collections hfd-hedgerow-surveys \\\\
    --source-paths Habitat/Habitat,Habitat/HEDGES,Habitat/MEADOW,Habitat/Orchards,Maps/1QGIS,Maps/GovData/Traditional_Orchards \\\\
    --seed 42

python scripts/release/sample-photos.py \\\\
    --archive-root /media/robin/foss4lh/david-lovelace-archive \\\\
    --output-dir ./bundles/hfd-pro-e112 \\\\
    --datasets-json catalog/datasets.json \\\\
    --max-zip-size-mb 5 \\\\
    --collections hfd-pro-e112 \\\\
    --source-paths History/Freeman/IMAGES\ 02\ \(John\ Quanrud\)/E178,E134,E315,History/HRO,History/Lyonshall \\\\
    --seed 42
```

### Handling Zero-Image Collections

Some collections may have no image files in their defined source paths. The script handles this gracefully:

- Prints informational message: `[INFO] Processing collection: [collection-id]`
- Prints warning: `[WARNING] No image files found for collection: [collection-id]`
- Continues processing other collections
- Creates no bundle asset for that collection
- Expected behavior for map-only or document-only collections

Example output when processing collections with no images:

```
[INFO] Processing collection: hfd-historic-hereford
[WARNING] No image files found for collection: hfd-historic-hereford
[INFO] Processing collection: hfd-aerial-historic
[WARNING] No image files found for collection: hfd-aerial-historic
```

After bundle creation, update `catalog/datasets.json` to add the `image-bundle` asset for each collection with images, and add corresponding entries to `catalog/releases.json` for GitHub Release publishing.

### Deterministic Sampling

The script uses a seeded random number generator to ensure reproducible results:

1. Files are sorted by relative path for deterministic ordering
2. Files are grouped by parent folder
3. Sampling distributes selections evenly across folders
4. Same seed + same archive = identical bundle every time

## Bundle Structure

Each collection bundle contains:

```
photo-bundles/
├── photos-{collection-id}.zip
└── {collection-id}/
    ├── manifest.json
    ├── web/ (resized web-optimized images)
    └── thumbs/ (thumbnails)
```

### Manifest Format

```json
{
	"collection": "hfd-royal-commission",
	"total_sampled": 50,
	"web_max_dim": 1200,
	"thumb_max_dim": 300,
	"quality": 80,
	"photos": [
		{
			"path": "History/NMRC_RC/some/photo.jpg",
			"web": "web/photo.jpg",
			"thumb": "thumbs/photo.jpg"
		}
	]
}
```

## Validation

### Using validate-photo-release-assets.mjs

The validation script checks bundle integrity and consistency:

```bash
# Validate a specific bundle against its manifest
node scripts/release/validate-photo-release-assets.mjs \
    --bundle ./photo-bundles/photos-hfd-royal-commission.zip \
    --manifest ./photo-bundles/hfd-royal-commission/manifest.json \
    --web-dir ./photo-bundles/hfd-royal-commission/web \
    --thumb-dir ./photo-bundles/hfd-royal-commission/thumbs
```

### Validation Checks

1. Bundle exists and is readable
2. Manifest is valid JSON
3. All files listed in manifest exist in the bundle
4. File counts match between manifest and bundle
5. Optional: Spot-check image dimensions and format

## Publishing to GitHub Releases

### Creating a Release

```bash
# Create a new git tag for the release
git tag -a data-v0.2.0 -m "Release photo bundle for hfd-royal-commission"

# Push the tag
git push origin data-v0.2.0

# Create GitHub release and upload asset
gh release create data-v0.2.0 ./photo-bundles/photos-hfd-royal-commission.zip \
    --title "Photo Bundle: Royal Commission Parish Photographs" \
    --notes "Deterministic 10MB sample of HFD Royal Commission parish photographs"
```

### Updating Catalog

After creating a bundle, update `catalog/datasets.json` to reference the new asset:

```json
{
	"id": "hfd-royal-commission",
	"title": "Royal Commission and Parish Survey Material",
	"assets": [
		{
			"id": "hfd-royal-commission-photos",
			"kind": "image-bundle",
			"title": "Royal Commission parish photographs",
			"status": "available",
			"localPath": "/photos/demo",
			"release": {
				"tag": "data-v0.2.0",
				"asset": "photos-hfd-royal-commission.zip",
				"assetUrl": "https://github.com/multilevelos/david-lovelace-archive/releases/download/data-v0.2.0/photos-hfd-royal-commission.zip",
				"expectedSizeMb": 10.0,
				"expectedPhotoCount": 50
			}
		}
	]
}
```

## Performance Considerations\n\n### Large Archive Challenges\nWith ~190,000+ images in the archive:\n- Full archive scan takes 60+ seconds (hits default timeout)\n- Memory usage increases with file count\n- Processing time scales linearly with total files\n- The `assign_collection` function is particularly expensive as it checks each file against every collection's sourceArchivePaths\n\n### Optimization Strategies\n1. **Path filtering**: Modify `find_image_files()` to only scan known collection paths (reduces scan from 190k to <1k files for targeted collections)\n2. **Pre-computed path mapping**: Build a reverse lookup map from archive paths to collections to avoid per-file collection assignment\n3. **Early termination**: Stop scanning once target collections are sufficiently populated\n4. **Progress reporting**: Add periodic status updates during long scans\n5. **Caching**: Cache file listings between runs (with cache invalidation strategy based on archive modification time)\n\n### Using --source-paths for Path Filtering\n\nThe `sample-photos.py` script includes a `--source-paths` parameter that implements path filtering optimization:\n\n`bash\n# Instead of scanning entire archive (60+ seconds)\npython scripts/release/sample-photos.py \\\n    --archive-root /media/robin/foss4lh1/david-lovelace-archive \\\n    --output-dir ./photo-bundles \\\n    --datasets-json catalog/datasets.json \\\n    --max-zip-size-mb 10 \\\n    --collections hfd-aerofilms \\\n    --seed 42\n\n# Scan only specific directories (<5 seconds)\npython scripts/release/sample-photos.py \\\n    --archive-root /media/robin/foss4lh1/david-lovelace-archive \\\n    --output-dir ./photo-bundles \\\n    --datasets-json catalog/datasets.json \\\n    --max-zip-size-mb 10 \\\n    --collections hfd-aerofilms \\\n    --source-paths AirPhotos/EN_County_APs,AirPhotos/EN_County_APs_new,AirPhotos/aerialphotographs2,AirPhotos/DL_APs,History/NMRC_AeroFilms,HARC/Raster/Hereford,HARC/Raster/Marden \\\n    --seed 42\n`\n\nThis optimization was critical for meeting the 60-second timeout constraint in automated workflows.\n\n### Estimated Processing Times\nBased on testing with path filtering optimization (--source-paths):\n- Dry-run (scan only): <5 seconds for targeted collection paths\n- Actual processing time breakdown:\n - Path scanning: <5 seconds (with filtering)\n - Image assignment: <1 second (with pre-computed mapping)\n - Sampling: <1 second\n - Image processing (resize): Dominant factor - ~0.1-0.3 seconds per image\n - ZIP creation: ~0.5-2 seconds depending on bundle size\n\nFor a 5MB bundle (~50 images): 10-20 seconds\nFor a 10MB bundle (~100 images): 20-40 seconds\nFor a 100MB bundle (~1000 images): 3-5 minutes\n\nWithout path filtering (full archive scan), processing times exceed 60 seconds and typically timeout.

## Quality Gates

Before publishing, run these checks:

```bash
# Code quality
npm run format
npm run lint
npm run check

# Release-specific checks
npm run release:check

# Build verification
npm run build

# Photo bundle validation (as described above)
```

## Idempotency Verification

To verify deterministic behavior:

```bash
# Run twice with same seed
python scripts/release/sample-photos.py ... --seed 42 --output-dir ./bundle1
python scripts/release/sample-photos.py ... --seed 42 --output-dir ./bundle2

# Compare results
diff -r ./bundle1 ./bundle2  # Should show no differences
```

## Troubleshooting

### Common Issues

1. **Timeout during scan**: Use `--dry-run` first to verify timing, consider path filtering
2. **Memory errors**: Process collections sequentially, not all at once
3. **Missing output directories**: Script now auto-creates them (fixed in v0.2.0)
4. **Path normalization issues**: Ensure consistent forward slashes in manifest paths
5. **Zip corruption**: Verify zip integrity with `zip -T` or `unzip -t`

### Debugging Tips

- Add `--dry-run` to test timing and sampling logic without processing
- Check `summary.json` in output directory for processing statistics
- Monitor CPU/memory usage during long runs
- Test with small subsets first (e.g., single folder) before full collection
