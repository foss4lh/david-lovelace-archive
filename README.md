# David Lovelace Archive

Static-first website and future web application for the David Lovelace Archive, a large Herefordshire landscape history collection containing maps, aerial photography, habitat data, public records, research notes, and working GIS material.

## Status

This repo is the canonical place to bring together the earlier `hfd-*` and `foss4lh` work. It is designed to keep code and data separate:

- Code, manifests, documentation, and scripts live in git.
- Raw archive data remains outside git.
- Derived web-ready assets are published as release assets first, with the option to move to object storage later.

## Development

```bash
npm install
npm run dev
```

Build the static site:

```bash
npm run build
```

Download available derived data assets:

```bash
npm run data:download
```

Audit the local archive, if mounted:

```bash
ARCHIVE_ROOT=/media/robin/foss4lh/david-lovelace-archive npm run archive:audit
```

## Repository Layout

```text
src/             SvelteKit app
catalog/         Dataset and release manifests
scripts/         Data download, audit, and release helpers
static/data/     Downloaded derived assets, ignored by git
docs/            Architecture, data policy, and takeover notes
```

## Deployment

The repo includes `netlify.toml`. Netlify should run:

```bash
npm run data:download -- --required-only && npm run build
```

and publish:

```text
build
```

## Tracking Issue

High-level implementation checklist:

https://github.com/foss4lh/david-lovelace-archive/issues/1
