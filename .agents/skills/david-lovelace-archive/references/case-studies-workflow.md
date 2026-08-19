# Case Studies Workflow

## Route structure

- Landing: `src/routes/case-studies/+page.svelte`
- Per-case: `src/routes/case-studies/{slug}/+page.svelte`
- Nav: add `{ href: '/case-studies', label: 'Case studies', icon: Users }` to `navItems` in `+layout.svelte`

## eslint for new routes

Add both to new Svelte routes that use internal href links:

```
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
```

## Image pipeline

```bash
# Download from openclaw
scp openclaw:"path/to/files/*.jpg" static/images/case-studies/{slug}/

# Or extract from Projects.zip on USB
unzip -j "/media/robin/foss4lh/david-lovelace-archive/Projects.zip" \
  "Projects/Vet trees Project/Photos LOWVP Veteran Tree Survey 2006-2007/Kings Caple/..." \
  -d /tmp/extract-dir/

# Compress for web
cd ~/github/foss4lh/david-lovelace-archive
mogrify -resize "1200x>" -quality 80 -strip static/images/case-studies/{slug}/*.{jpg,JPG}
```

## Gallery sections

Each section is a `{#each}` loop over a typed array. Multiple galleries per page:

```
const photos = [...]  // RCHME photos
const vetTrees = [...] // Veteran tree survey
const archiveMaps = [...] // LOWV tithe maps etc.
```

## Veteran tree photo sources

All in `Projects.zip -> Projects/Vet trees Project/Photos LOWVP Veteran Tree Survey 2006-2007/`

## Archive materials (additional LOWV, CPRE, Scudamore)

Additional Kings Caple materials from Projects.zip:

- `Projects/LOWV/Archives&Maps/TitheMaps/KingsCaple/Bronica/` — 11 film scans
- `Projects/LOWV/Archives&Maps/TitheMaps/KingsCaple/G6/` — 22 digital survey photos
- `Projects/LOWV/Archives&Maps/Scudamore/` — historic map details
- `Projects/LOWV/TerrPhotos/` — landscape photos
- `Projects/Presentations/CPRE/` — presentation landscape views
