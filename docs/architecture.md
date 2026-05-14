# Architecture

This repository is the canonical public website and future web application for the David Lovelace Archive.

## Principles

- The app is static-first and deploys to Netlify without a server.
- Raw archive data is not committed to git.
- Derived data is referenced through manifests and can be hosted on GitHub Releases first, then Cloudflare R2/S3 later.
- Dataset pages and map layers are driven by `catalog/datasets.json`, not hard-coded component arrays.
- Release downloads are driven by `catalog/releases.json`.

## Main Parts

```text
src/             SvelteKit routes and components
catalog/         Dataset and release manifests
scripts/         Download, audit, and release helpers
static/data/     Local/downloaded derived assets, ignored by git except .gitkeep
docs/            Architecture and workflow notes
netlify.toml     Static deployment configuration
```

## Data Flow

1. Raw archive files remain on external/local storage.
2. Scripts audit and convert selected sources into public-safe derived assets.
3. Derived assets are uploaded to a release or object store.
4. Manifest records point to the asset URL and expected local build path.
5. `npm run data:download` fetches available assets for local preview or static builds.
6. SvelteKit builds the static site into `build/`.

## Map Strategy

The map explorer uses MapLibre GL JS with the PMTiles protocol. Raster map layers are published as PMTiles for static hosting. Cloud-Optimized GeoTIFFs are provided as downloadable derivatives.
