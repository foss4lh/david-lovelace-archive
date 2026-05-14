# David Lovelace Archive

Static-first website and data portal for the David Lovelace Archive, a large Herefordshire landscape history collection containing maps, aerial photography, habitat data, and research notes.

**In Memory:** This archive is dedicated to the memory of David Lovelace (1948–2026), who passed away on Tuesday 5th May 2026. His life's work documenting the Herefordshire landscape continues through this project. We intend to donate these datasets to relevant heritage and environmental organisations.

🌐 Live site: https://david-lovelace-archive.netlify.app

## Quick Start

**Local development:**

```bash
npm install
npm run data:download -- --required-only
npm run dev
```

**Build for production:**

```bash
npm run build
```

Deploy automatically triggers on push to `main` via Netlify. See [docs/WORKFLOW.md](docs/WORKFLOW.md) for photo releases and asset management.

## Project Architecture

- **Data separation:** Raw archive stays on local/external storage; only derived assets are published.
- **Manifest-driven:** Dataset and release information lives in `catalog/` JSON files, not hardcoded in templates.
- **GitHub releases:** Web assets download at build time from `data-v0.1.0` release tag.
- **Static-first:** Deploys to Netlify as pre-rendered HTML + JS bundles.

Assets: DuckDB inventory (~16 MB), PMTiles map archives (~1.6 GB), photo bundles (~5 MB per collection).

## Core Commands

| Command                        | Purpose                         |
| ------------------------------ | ------------------------------- |
| `npm run dev`                  | Local dev server                |
| `npm run build`                | Static site build               |
| `npm run data:download`        | Fetch GitHub release assets     |
| `npm run inventory:duckdb`     | Rebuild DuckDB index from CSV   |
| `npm run archive:audit`        | Scan local archive for metadata |
| `npm run lint`                 | Format & lint checks            |
| `npm run check`                | Type checks (Svelte + TS)       |
| `npm run data:validate:photos` | Verify photo release integrity  |

## Directory Layout

```
src/              SvelteKit routes & components
catalog/          Dataset & release manifests (JSON)
scripts/          Audit, inventory, and release tooling
static/data/      Downloaded assets (git-ignored)
docs/             Architecture & workflow guides
```

## Quality & Deployment

- **Pre-commit hooks** (husky + lint-staged): Format & lint on every commit
- **GitHub Actions**: Full build pipeline on every push to `main`
- **Netlify CI/CD**: Automatic deployment triggered by commits

---

## For Feature Development

1. **Git workflow:** Feature branches → PR → review → merge to `main`
2. **Type safety:** Always run `npm run check` before pushing
3. **Formatting:** Commit hooks auto-format code; manually run `npm run format` if needed
4. **Data sources:**
   - Living archive: Mount the 2TB storage as `/media/robin/foss4lh1/david-lovelace-archive`
   - Map layers: Convert source formats (ECW/TIF) using batch scripts in `scripts/batch-convert-*.sh`
   - Photo bundles: Use `scripts/release/sample-photos.py` (see [WORKFLOW.md](docs/WORKFLOW.md))

## Contributing

This is a research project under active development. Contributions are welcome—especially on data processing, mapping, and historical metadata. Open an issue to discuss changes first.

### License & Preservation

See [docs/data-policy.md](docs/data-policy.md) for data licensing and collection terms.
