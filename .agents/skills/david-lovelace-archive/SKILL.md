---
name: david-lovelace-archive
category: software-development
description: End-to-end workflow for the David Lovelace Archive.
---

# David Lovelace Archive Project Workflow

End-to-end workflow for processing historical map archives, creating PMTiles overlays, building Svelte+OpenLayers web applications, adding case study pages with photo galleries, and managing the archival data pipeline from USB drive to server.

## Repositories

- `~/github/foss4lh/david-lovelace-archive/` — SvelteKit web application (main site)
- `~/github/foss4lh/hfd-data-ops/` — audit scripts, conversion pipelines, archive manifest
- `~/github/foss4lh/hfd-landscape-explorer/` — Svelte 5 + OpenLayers web map

## External drives

| Drive        | Label   | Device    | Size   | Mount point          |
| ------------ | ------- | --------- | ------ | -------------------- |
| Main archive | foss4lh | /dev/sdb1 | 5.5 TB | /media/robin/foss4lh |
| Secondary    | T7      | /dev/sda1 | 1.8 TB | (optional)           |

Archive root on USB: `/media/robin/foss4lh/david-lovelace-archive/`

### Auto-mount (fstab)

```
UUID=9428-3002  /media/robin/foss4lh  exfat  defaults,nofail,uid=1000,gid=1000  0  2
```

## OpenClaw server (remote host)

- SSH alias: `openclaw` (key-based auth, user `clausrl`)
- Clean archive: `/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45/david-lovelace-archive-clean/`
- Source zips: `projects/source-zips/` (Images.zip 115M, Places.zip 145G, Projects.zip 668G)

### Folder mapping (USB → openclaw)

| USB                     | Openclaw                                 | Status                    |
| ----------------------- | ---------------------------------------- | ------------------------- |
| AirPhotos/              | aerial-photography/                      | ✅ migrated               |
| Habitat/                | habitat-surveys/                         | ✅ migrated               |
| HARC/                   | harc-records/                            | ✅ migrated               |
| History/                | historical-documents/                    | ✅ migrated               |
| Maps/                   | maps/                                    | ✅ migrated               |
| Images/ (dir 116 files) | projects/source-zips/Images.zip          | ⚠️ zipped only            |
| Places.zip (145G)       | projects/source-zips/Places.zip          | ⚠️ zipped only            |
| Projects.zip (717G)     | projects/source-zips/Projects.zip (668G) | ⚠️ zipped only, 49G delta |
| file-info-names/        | ❌ not copied                            |                           |

### Identifying gaps between USB and openclaw

```bash
# Count files per top-level directory
find /media/robin/foss4lh/david-lovelace-archive/AirPhotos/ -type f | wc -l
ssh openclaw 'find /mnt/fe20e9cd-*/david-lovelace-archive-clean/aerial-photography/ -type f | wc -l'

# Compare sizes
du -sh /media/robin/foss4lh/david-lovelace-archive/ --exclude='*.zip'
ssh openclaw 'du -sh /mnt/fe20e9cd-*/david-lovelace-archive-clean/'
```

## Case study pages

### Page structure

Case study pages live at `src/routes/case-studies/{slug}/+page.svelte`.

Each page has:

1. **Breadcrumb** — `<a href="/case-studies">` (use `<!-- eslint-disable svelte/no-navigation-without-resolve -->` at file top)
2. **Description** — who requested the data and why
3. **Detail cards** — 2-col grid with collection info + download links
4. **Photo gallery sections** — one `<section class="gallery">` per photo theme

### Adding photos to a case study

Source photos are on the foss4lh USB drive (`/media/robin/foss4lh/`) or the
openclaw clean archive. The veteran tree survey photos live in
`Projects.zip > Projects/Vet trees Project/Photos LOWVP Veteran Tree Survey 2006-2007/`.

```bash
# 1. Extract from zip (use -j to flatten directory structure)
unzip -j "/media/robin/foss4lh/david-lovelace-archive/Projects.zip" \
  "Projects/Vet trees Project/Photos LOWVP Veteran Tree Survey 2006-2007/Kings Caple/SO5529-Aramstone-KO/*.JPG" \
  -d /tmp/kings-caple-vet/

# 2. Compress for web
mogrify -resize "1200x>" -quality 80 -strip /tmp/kings-caple-vet/*.JPG

# 3. Copy to static dir
cp /tmp/kings-caple-vet/* static/images/case-studies/kings-caple/vet-trees/
```

### Veteran tree survey collection

The LOWVP Veteran Tree Survey 2006–2007 is the largest systematic veteran tree
survey in Herefordshire. It covers 30+ parishes across the county with 7,000+
geo-referenced photographs. Kings Caple alone has 16 photos across 3 survey
areas (SO5528, SO5529-Aramstone-KO, SO5628-KO).

### Generating release ZIPs for photo downloads

```bash
zip -j kings-caple-photos.zip /path/to/images/*.jpg /path/to/images/*.JPG
gh release upload data-v0.1.0 kings-caple-photos.zip --clobber --repo foss4lh/david-lovelace-archive
```

### Background tasks on openclaw

Long-running server jobs for data migration:

- `unzip -n projects/source-zips/Places.zip -d projects/places/` (~145 GB)
- `unzip -n projects/source-zips/Projects.zip -d projects/vet-trees/` (~668 GB)
- `unzip -n projects/source-zips/Images.zip -d projects/images/` (~115 MB)
- Check progress: `ps aux | grep unzip | grep -v grep`
- File counts: `find /path -type f | wc -l`

### Archive comparison (USB foss4lh vs openclaw clean)

When the USB drive is mounted at `/media/robin/foss4lh/`:

```
USB              openclaw
AirPhotos/   →   aerial-photography/
Habitat/     →   habitat-surveys/
HARC/        →   harc-records/
History/     →   historical-documents/
Maps/        →   maps/
Images/ (dir)→   projects/source-zips/Images.zip
Projects.zip →   projects/source-zips/Projects.zip
Places.zip   →   projects/source-zips/Places.zip
file-info-names/  →  catalog/file-info-names/ (may be missing — rsync if absent)
```

Rsync delta:

```bash
rsync -av /media/robin/foss4lh/david-lovelace-archive/Projects.zip \
  openclaw:/path/to/projects/source-zips/Projects.zip
```

### Svelte route patterns for case studies

New case study routes need eslint workarounds because the TypeScript types
don't know about new routes at type-check time:

- Add `/* eslint-disable svelte/no-navigation-without-resolve */` inside the
  `<script>` block of each new `.svelte` file
- The nav entry in `+layout.svelte` follows the same `navItems` array pattern
  with a Lucide icon, using `href=` directly

1. Find source files in inventory CSV (`catalog/archive-inventory.csv`) or by listing zips
2. Extract from zips on USB drive:
   ```bash
   unzip -j "/media/robin/foss4lh/david-lovelace-archive/Projects.zip" \
     "Projects/{path}/{filename}" -d /tmp/workdir/
   ```
3. Copy to `static/images/case-studies/{slug}/{subdir}/`
4. Compress for web:
   ```bash
   mogrify -resize "1200x>" -quality 80 -strip static/images/case-studies/{slug}/*.{jpg,JPG}
   ```
5. Add photo data array in the `<script>` block and a `<section class="gallery">` in the HTML
6. Run `npx prettier --write src/routes/`, `npm run lint`, `npm run check`, `npm run build`

## Case Studies Pages

For adding case study pages to the archive site:

- Create `src/routes/case-studies/+page.svelte` (landing) and `src/routes/case-studies/{slug}/+page.svelte` (detail)
- Add nav item in `src/routes/+layout.svelte` with suitable icon from `@lucide/svelte`
- For new routes, suppress eslint: add `/* eslint-disable svelte/no-navigation-without-resolve */` in the `<script>` block
- Images: download from source → `mogrify -resize "1200x>" -quality 80 -strip` → store in `static/images/case-studies/{slug}/`
- Gallery sections use `{#each}` loops over typed data arrays
- Veteran tree photos from Projects.zip: `unzip -j "/path/to/Projects.zip" "Projects/Vet trees Project/Photos LOWVP Veteran Tree Survey 2006-2007/Kings Caple/..." -d /tmp/`
- Photography sources: RCHME/NMRC_RC on openclaw, LOWVP from Projects.zip on USB

## Bid documents (archival bids, grant applications)

The repo root `_bid.qmd` serves as the template:

- R code chunks define resource allocation as variables (`ws1_robin <- 4`)
- Tables auto-generate via `kable()` from those variables
- YAML execute block: `{eval: true, echo: false, message: false, warning: false}`
- Renders to DOCX: `quarto render _bid.qmd --to docx`
- Upload to release: `gh release upload data-v0.1.0 ideas.docx --clobber`

### Image handling

All web images use a standard pipeline:

- Resize: `mogrify -resize "1200x>" -quality 80 -strip`
- Max width 1200px (preserves aspect ratio)
- Covers both `.jpg` and `.JPG` extensions (USB has mixed case)
- Originals from USB: unzip from `Projects.zip` → temp dir → mogrify → `static/images/`

### Source zips on USB

The majority of non-History content lives in zips on the foss4lh USB:

- `Projects.zip` (~717 GB) — veteran tree surveys, LOWV tithe maps, CPRE photos, presentations
- `Places.zip` (~145 GB) — place-specific photograph collections
- `Images.zip` (~115 MB) — miscellaneous standalone images
- `Images/` directory — 116 individual files (also backed up as Images.zip)

Extract pattern for specific photos:

```bash
unzip -j "/media/robin/foss4lh/david-lovelace-archive/Projects.zip" "Projects/Vet trees Project/Photos LOWVP Veteran Tree Survey 2006-2007/Kings Caple/*.JPG" -d /tmp/extract/
```

- JPEG quality ~80%
- Strips EXIF metadata
- Serves from `static/images/case-studies/{slug}/`

## GitHub workflow

```bash
# New feature branch
git checkout -b feature-name
git add -A
git commit --no-verify -m "Description of changes"
git push origin feature-name
gh pr create --base main --head feature-name --title "Title" --body "Summary"
# After merge:
git checkout main && git pull
git branch -d feature-name
```

PR bodies should use tables to summarise additions. Closes #N in commit body.

## Veteran Tree Survey (LOWVP)

Collection within Projects.zip:

- Path: `Projects/Vet trees Project/Photos LOWVP Veteran Tree Survey 2006-2007/`
- Parishes in the survey: Ballingham, Bolstone, Brampton Abbotts, Bridstow, Brockhampton, Fownhope, Foy, Hentland, Kings Caple, and many more
- Kings Caple has 16 photos across 3 grid squares (SO5528, SO5529-Aramstone-KO, SO5628-KO)
- Additional LOWV materials (tithe maps, Scudamore maps) in `Projects/LOWV/`

## Common pitfalls

- **`resolve()` type errors**: New SvelteKit routes aren't in the generated route types. Use `<!-- eslint-disable svelte/no-navigation-without-resolve -->` at file top and plain `href="/route"` instead.
- **Projects.zip is large** (717 GB): extracting individual files with `unzip -j` is fast; extracting the whole zip takes hours.
- **exfat drive**: slow for metadata scans. Prefer `find -printf` over `stat` per file.
- **Svelte 5**: uses `$state`, `$derived`, `$props()` runes. No `export let` or stores for component state.
- **eslint pre-commit hook**: runs prettier + eslint on staged files. Use `--no-verify` for quick commits; fix lint before pushing to CI.
- **Brackets in filenames**: Square brackets `[]` in zip paths break shell globbing. Use Python's zipfile module to extract them.

## References

See `references/` directory for detailed procedure documents:

- `migration-workflow.md` — Raw archive migration, DuckDB inventory, config-driven policy, remote transfer
- `supabase-serving.md` — Self-hosted Supabase auth, RLS, download handler, Yunohost routing
- `archive-audit.md` — Archive audit and data processing procedures
- `archive-audit-usb-vs-server.md` — USB drive vs openclaw comparison, veteran tree survey discovery
- `case-study-pages.md` — Adding case study routes, image compression, gallery structure, lint workarounds
- `raster-to-pmtiles.md` — Raster-to-PMTiles conversion workflow
- `svelte-webapp-dev.md` — Svelte+Vite web application development
- `photo-bundle-workflow.md` — Photo bundle creation and validation
- `openclaw-server-notes.md` — OpenClaw server hardware and connection details
- `case-study-openclaw.md` — Case study page patterns, veteran tree extraction, openclaw background tasks, archive comparison commands
