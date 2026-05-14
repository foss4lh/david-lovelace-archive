# Data Processing Scripts

This directory contains utilities for managing the David Lovelace Archive.

## Release & Photo Management

| Script                                      | Purpose                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| `release/sample-photos.py`                  | Sample N photos from archive within size constraint; generates thumbnails & manifest |
| `release/validate-photo-release-assets.mjs` | Verify photo release zip matches tracking manifest (runs in CI)                      |
| `release/validate-manifest.mjs`             | Check version IDs consistent across 5 config files before push                       |
| `release/create-data-release.sh`            | Helper to create GitHub release (rarely used)                                        |

## Inventory & Audit

| Script                      | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `audit/parse-inventory.mjs` | Convert .txt archive listings to CSV (one-time use) |
| `audit/archive-summary.mjs` | Scan live 2TB archive and generate statistics       |

## Data Conversion

| Script                      | Purpose                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `convert-ecw-to-pmtiles.py` | Convert ECW/GeoTIFF to PMTiles format for web                       |
| `batch-convert-*.sh`        | Batch process specific collection types (aerial, maps, tithe, etc.) |
| `backfill-cogs.sh`          | Generate Cloud-Optimized GeoTIFFs (optional derivative format)      |

## Data Download

| Script                | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `download-data.mjs`   | Fetch release assets from GitHub to `static/data/` for builds |
| `update-catalog.mjs`  | Regenerate catalog stats from inventory (rarely used)         |
| `update-releases.mjs` | Update release manifest from latest GitHub tags (rarely used) |

## Build Helpers

| Script            | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `build-duckdb.sh` | Build DuckDB index from CSV + photo URL mappings |

**Note:** Most scripts are called via `npm run *` from `package.json`. Direct invocation is rarely needed.
