# Architecture

This is the canonical public website and web application for the David Lovelace Archive.

## Design Principles

- **Static-first:** Renders to pre-built HTML + assets; deploys to Netlify (no server runtime)
- **Data separation:** Raw archive stays on local/external storage; only derived assets are published
- **Manifest-driven:** Datasets and releases defined in JSON, not hardcoded in components
- **Versioning:** Assets use release tags to enable cache busting and rollbacks

## Directory Structure

```
src/              SvelteKit routes and components
catalog/          Manifests: datasets.json, releases.json, photo-urls.json
scripts/          Data processing, sampling, audit, and release tools (see scripts/README.md)
static/data/      Downloaded assets (git-ignored except .gitkeep)
docs/             Data policy and contributing guidelines
```

## Data Pipeline

1. **Source:** Raw archive files on external/local storage
2. **Transform:** Scripts sample, audit, and convert to web formats (PMTiles, GeoJSON, photos)
3. **Stage:** Derived assets uploaded to GitHub Releases (`data-v0.1.0` tag)
4. **Register:** Asset manifests (`catalog/releases.json`, `catalog/datasets.json`) record URLs and metadata
5. **Download:** `npm run data:download` fetches required assets at build time
6. **Build:** SvelteKit statically generates site, embedding asset references
7. **Deploy:** Netlify auto-triggers on `main` push

## Layers & Maps

Maps use **MapLibre GL JS** with **PMTiles** protocol for static raster hosting. Vector layers use GeoJSON. Cloud-Optimized GeoTIFFs available as downloadable derivatives.

For extending: Add new PMTiles files to `catalog/datasets.json` with asset entries in `catalog/releases.json`.
