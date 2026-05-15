# David Lovelace Archive

Static-first website and data portal for the David Lovelace Archive, a large Herefordshire landscape history collection containing maps, aerial photography, habitat data, and research notes.

**In Memory:** This archive is dedicated to the memory of David Lovelace (1948–2026), who passed away on Tuesday 5th May 2026. His life's work documenting the Herefordshire landscape continues through this project. We intend to donate these datasets to relevant heritage and environmental organisations.

🌐 **Live site:** https://david-lovelace-archive.netlify.app

---

## Quick Start

```bash
npm install
npm run data:download -- --required-only    # Fetch release assets once
npm run dev                                 # Start dev server
npm run check                               # Type checks before pushing
```

Auto-deploys on push to `main` via Netlify.

---

## Architecture

- **Data separation:** Raw 2TB archive stays mounted locally; only derived assets are published
- **Manifest-driven:** Datasets and releases defined in `catalog/` JSON files, not hardcoded
- **GitHub releases:** Assets hosted at `data-v0.1.0` tag, downloaded at build time
- **DuckDB index:** 277K-row filtered inventory with `files` and `photo_urls` tables, queryable in-browser
- **Static-first:** Pre-rendered HTML + JS, deployed to Netlify

**Key assets:** DuckDB inventory (~15 MB), PMTiles maps (~1.6 GB), photo bundles (~15 MB each)

---

## Commands

| Command                    | Purpose                     |
| -------------------------- | --------------------------- |
| `npm run dev`              | Dev server                  |
| `npm run build`            | Production build            |
| `npm run check`            | Type checks                 |
| `npm run lint`             | Format + lint               |
| `npm run data:download`    | Fetch GitHub release assets |
| `npm run inventory:duckdb` | Rebuild DuckDB index        |
| `npm run release:data`     | Full release pipeline       |
| `npm run release:check`    | Validate release manifest   |

---

## Releasing Data

Single command to rebuild the DuckDB index, resample photos from the archive, upload assets to GitHub Releases, and run validation:

```bash
npm run release:data              # Full release
npm run release:data -- --dry-run # Preview without uploading
```

### Prerequisites

- Archive mounted at `/media/robin/foss4lh1/david-lovelace-archive/`
- `npm install` completed
- `gh` CLI authenticated

### Checklist Before Pushing

- [ ] `npm run release:data` — completes without errors
- [ ] `npm run format && npm run lint && npm run check` — passes
- [ ] `npm run build` — production build succeeds
- [ ] `gh release view data-v0.1.0` — both DuckDB + photo zips uploaded

---

## Directory Layout

```
src/              SvelteKit routes, components, styles
catalog/          Manifests: datasets.json, releases.json
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

Want to contribute or ask a question? Get in touch online (requires signing up for a GitHub account):

- **Report bugs or suggest improvements:** [Open an issue](https://github.com/foss4lh/david-lovelace-archive/issues)
- **Start a discussion:** [GitHub Discussions](https://github.com/foss4lh/david-lovelace-archive/discussions)

Contributions welcome — especially data processing, mapping, and historical metadata.

## License & Data Policy

See [docs/data-policy.md](docs/data-policy.md) for licensing and collection terms.
