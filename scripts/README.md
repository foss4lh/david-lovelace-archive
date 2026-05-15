# Data Processing Scripts

This directory contains utilities for managing the David Lovelace Archive.

## Release & Photo Management

| Script                                      | Purpose                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `release/data-release.sh`                   | Orchestrate full release: rebuild duckdb → sample photos → upload → validate       |
| `release/sample-photos.py`                  | Sample photos from archive within size constraint; generates thumbnails & manifest |
| `release/validate-photo-release-assets.mjs` | Verify photo release zip matches tracking manifest (runs in CI)                    |
| `release/validate-manifest.mjs`             | Check version IDs consistent across config files before push                       |
| `release/upload-assets.mjs`                 | Sync local bundles to GitHub Releases (checksum-diff only)                         |

## Data Download

| Script              | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `download-data.mjs` | Fetch release assets from GitHub to `static/data/` for builds |

## Build Helpers

| Script            | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `build-duckdb.sh` | Build DuckDB index from CSV + photo URL mappings |

**Note:** Most scripts are called via `npm run *` from `package.json`. Direct invocation is rarely needed.
