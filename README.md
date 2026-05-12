# David Lovelace Archive

Static-first website and data portal for the David Lovelace Archive, a large Herefordshire landscape history collection containing maps, aerial photography, habitat data, and research notes.

**In Memory:** This archive is dedicated to the memory of David Lovelace (1948–2026), who passed away on Tuesday 5th May 2026. His life's work documenting the Herefordshire landscape continues through this project. We intend to donate these datasets to relevant heritage and environmental organisations.

Live site: https://david-lovelace-archive.netlify.app

## Project Goals

1.  **Preservation:** Secure the 2TB archive as a permanent resource for landscape history research.
2.  **Accessibility:** Make the vast collection of over 1.2 million files searchable and discoverable via a web-ready portal.
3.  **Research:** Provide structured datasets (DuckDB, PMTiles, GeoJSON) ready for PhD-scale historical and ecological research.

---

## Technical Maintenance Workflow

This project separates raw archival data from web-ready catalog manifests and static code.

### 1. Audit Raw Archive

Read from the local archive root (if mounted) and generate public-safe summaries.

```bash
ARCHIVE_ROOT=/path/to/archive npm run archive:audit
```

### 2. Update Inventory (DuckDB)

The web explorer is powered by a DuckDB database generated from directory listings.

```bash
# Parse .txt listings into a structured CSV
npm run inventory:parse

# Ingest CSV into the DuckDB database file
npm run inventory:duckdb
```

### 3. Derive Web Assets

Convert raw formats to web-optimised standards:

- **Rasters:** Convert ECW/TIF to **PMTiles** or Cloud-Optimised GeoTIFFs (COGs).
- **Vectors:** Export QGIS layers to **GeoPackage** or **GeoJSON**.
- **Tables:** Normalise spreadsheets to **Parquet** or **CSV**.
- **Photos:** Generate thumbnails and web-friendly **JPEG/WebP** copies.

### 4. Publish Release Assets

Upload derived assets as GitHub Release assets. Record the URLs in `catalog/releases.json`.

```bash
# Example: Upload a new PMTiles file
gh release upload data-v0.1.0 static/data/new-map.pmtiles
```

### 5. Build and Deploy

The site is hosted on Netlify and builds automatically on every commit to `main`.

```bash
# Local development
npm install
npm run dev

# Manual production deploy
netlify deploy --prod
```

## Repository Layout

```text
src/             SvelteKit application (Frontend)
catalog/         Dataset manifests and release tracking
scripts/         Audit, inventory parsing, and data download tools
static/data/     Downloaded derived assets (ignored by git)
docs/            Architecture and data policy documentation
```

## Core Commands Reference

| Command                    | Description                                        |
| :------------------------- | :------------------------------------------------- |
| `npm run dev`              | Start local development server                     |
| `npm run data:download`    | Fetch release assets from GitHub to `static/data/` |
| `npm run inventory:parse`  | Parse inventory .txt files to CSV                  |
| `npm run inventory:duckdb` | Update the DuckDB index from CSV                   |
| `npm run archive:audit`    | Generate archive summaries from local disk         |
| `npm run build`            | Create static build for production                 |
| `npm run lint`             | Check formatting and linting                       |
| `npm run check`            | Run Svelte-check (Types/Routes)                    |

## CI/CD and Quality

- **Pre-commit Hooks:** `husky` and `lint-staged` run formatting and type checks on every commit.
- **GitHub Actions:** Automated builds and checks on every push to `main`.
- **Netlify:** Continuous deployment triggered from the GitHub repository.
