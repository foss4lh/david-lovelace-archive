# David Lovelace Archive

Static-first website and data portal for the David Lovelace Archive, a large Herefordshire landscape history collection containing maps, aerial photography, habitat data, and research notes.

**In Memory:** This archive is dedicated to the memory of David Lovelace (1948–2026), who passed away on Tuesday 5th May 2026. His life's work documenting the Herefordshire landscape continues through this project. We intend to donate these datasets to relevant heritage and environmental organisations.

🌐 **Live site:** https://david-lovelace-archive.netlify.app

---

## Quick Start

### Development

```bash
npm install
npm run data:download -- --required-only    # Fetch release assets once
npm run dev                                 # Start dev server
npm run check                               # Type checks before pushing
```

### Build & Deploy

```bash
npm run build                               # Static site (production)
```

Auto-deploys on push to `main` via Netlify.

---

## Architecture

- **Data separation:** Raw 2TB archive stays mounted locally; only derived assets are published
- **Manifest-driven:** Datasets and releases defined in `catalog/` JSON files, not hardcoded
- **GitHub releases:** Assets hosted at `data-v0.1.0` tag, downloaded at build time
- **Static-first:** Pre-rendered HTML + JS, deployed to Netlify

**Key assets:** DuckDB inventory (~16 MB), PMTiles maps (~1.6 GB), photo bundles (~5 MB each)

---

## Commands

| Command                        | Purpose                     |
| ------------------------------ | --------------------------- |
| `npm run dev`                  | Dev server                  |
| `npm run build`                | Production build            |
| `npm run check`                | Type checks                 |
| `npm run lint`                 | Format + lint               |
| `npm run data:download`        | Fetch GitHub release assets |
| `npm run inventory:duckdb`     | Rebuild DuckDB index        |
| `npm run archive:audit`        | Scan archive metadata       |
| `npm run release:check`        | Validate release manifest   |
| `npm run data:validate:photos` | Check photo asset integrity |

---

## Releasing Photo Bundles

### Quick Overview

1. **Sample** from archive: `python3 scripts/release/sample-photos.py --archive-root /media/robin/foss4lh1/david-lovelace-archive --output-dir /tmp/bundles --max-zip-size-mb 5 --quality 70 --collections hfd-royal-commission`
2. **Generate** photo URL mapping: Copy `manifest.json` to `static/photos/demo/`, generate `catalog/photo-urls.json`
3. **Update 5 files** (atomically): `package.json`, `src/lib/duckdb.ts`, `catalog/datasets.json`, `catalog/releases.json`, `scripts/release/validate-photo-release-assets.mjs`
   - **Rule:** Increment DuckDB version (v2 → v3, etc.) when photos/URLs change
4. **Validate locally:** `npm run format && npm run lint && npm run check && npm run release:check && npm run build`
5. **Upload to GitHub:** `gh release upload data-v0.1.0 archive-v3.duckdb photos-5-demo.zip`
6. **Commit & push:** Pre-commit hooks auto-format; husky validates; GitHub Actions runs full CI

### Prerequisites

- Archive mounted at `/media/robin/foss4lh1/david-lovelace-archive/`
- `npm install` completed
- `gh` CLI authenticated

### Common Issues

| Problem                                      | Solution                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| Asset not found in CI                        | Upload to GitHub first: `gh release upload data-v0.1.0 <file>`, wait ~30s             |
| Prettier lint failure                        | Run `npm run format` locally before commit                                            |
| Photo count mismatch (manifest vs. tracking) | Regenerate `catalog/photo-urls.json` from `static/photos/demo/manifest.json`          |
| DuckDB build fails                           | Verify `archive-vX.duckdb` filename matches in `package.json` and `src/lib/duckdb.ts` |

### Checklist Before Pushing

- [ ] `npm run inventory:duckdb` — rebuilds DuckDB with new photos
- [ ] `npm run data:validate:photos` — confirms release asset matches local manifest
- [ ] `npm run release:check` — verifies all 5 files reference same version IDs
- [ ] `npm run format && npm run lint && npm run check` — passes linting + types
- [ ] `npm run build` — production build succeeds locally
- [ ] `gh release view data-v0.1.0` — both DuckDB + photo zip uploaded

**Scaling:** For multiple collections, sample each separately, merge `photo-urls.json`, and create separate release entries per collection in `catalog/releases.json`.

---

## Future Automation

Current manual workflow takes ~20 mins per release and is error-prone (5-file sync coordination).

**Planned improvements:**

- **Phase 1:** Manifest synchronizer script — automate version ID updates across all 5 files (atomically)
- **Phase 2:** Release orchestration script — single command to sample → validate → build → upload
- **Phase 3+:** GitHub Actions automation, parallel sampling, asset caching

See `npm run release:check` (validates manifest consistency before push) as a first automation checkpoint.

---

## Directory Layout

```
src/              SvelteKit routes, components, styles
catalog/          Manifests: datasets.json, releases.json, photo-urls.json
scripts/          Photo sampling, audit, data download, release tooling
static/data/      Downloaded assets (git-ignored)
docs/             Architecture, data policy, contributing notes
```

---

## Development Workflow

1. **Feature branches:** Create PR, request review, merge to `main`
2. **Type safety:** Run `npm run check` before pushing
3. **Code style:** Pre-commit hooks auto-format; manually run `npm run format` if needed
4. **CI/CD:** GitHub Actions runs on every push; Netlify deploys on success

## Contributing

This is a research project under active development. Contributions welcome—especially data processing, mapping, historical metadata.

Open an issue first to discuss changes.

## License & Data Policy

See [docs/data-policy.md](docs/data-policy.md) for licensing and collection terms.
