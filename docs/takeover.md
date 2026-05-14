# Takeover Notes

If another contributor needs to continue this work, start here.

## Current Direction

The repository is intended to replace the scattered first-pass work across `hfd-landscape-explorer`, `hfd-data-ops`, `hfd-tithe-surveys`, `hfd-aerial-photography`, `hfd-nature-surveys`, `hfd-public-records-office`, and `foss4lh`.

The current implementation is a SvelteKit static app with:

- Overview page.
- Dataset catalog and download page.
- MapLibre GL JS map explorer with PMTiles protocol support.
- Research agenda page.
- Workflow page.
- JSON manifests for datasets and release assets.
- Netlify config.

## Useful Commands

```bash
npm install
npm run dev
npm run check
npm run build
npm run data:download
```

## Raw Archive Location

The local archive was found at:

```text
/media/robin/foss4lh/david-lovelace-archive
```

It was sampled as about 2.0 TB. Do not copy it into this repository.

## GitHub Issue

The high-level tracking issue is:

```text
https://github.com/foss4lh/david-lovelace-archive/issues/1
```
