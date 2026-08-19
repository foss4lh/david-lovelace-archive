# Case Study and OpenClaw Workflow Patterns

## Adding a new case study page

1. Create route: `src/routes/case-studies/{slug}/+page.svelte`
2. Add `/* eslint-disable svelte/no-navigation-without-resolve */` inside
   `<script>` block (new routes aren't in the TypeScript types yet)
3. Add nav entry in `+layout.svelte` with a Lucide icon
4. Add case study to the landing page at `src/routes/case-studies/+page.svelte`
5. Build: `npm run build`

## Adding photos to a case study

```bash
# Extract from USB Projects.zip
unzip -j "/media/robin/foss4lh/david-lovelace-archive/Projects.zip" \
  "Projects/Vet trees Project/Photos LOWVP Veteran Tree Survey 2006-2007/Kings Caple/*.JPG" \
  -d /tmp/output/

# Compress
mogrify -resize "1200x>" -quality 80 -strip /tmp/output/*.JPG

# Copy to static
cp /tmp/output/* static/images/case-studies/{slug}/{subfolder}/
```

## Veteran tree survey photos

Path in Projects.zip:
`Projects/Vet trees Project/Photos LOWVP Veteran Tree Survey 2006-2007/{parish}/...`

Kings Caple has 16 photos across 3 survey areas:

- SO5528 — 1 photo
- SO5529-Aramstone-KO — 11 photos
- SO5628-KO — 4 photos

## OpenClaw background tasks

### Check extraction progress

```bash
ssh openclaw 'ps aux | grep unzip | grep -v grep'
ssh openclaw 'find /mnt/fe20e9cd-*/david-lovelace-archive-clean/projects/*/Projects -type f | wc -l'
```

### Source zip extraction (if not already done)

```bash
ssh openclaw
cd /mnt/fe20e9cd-*/david-lovelace-archive-clean
unzip -n projects/source-zips/Images.zip -d projects/images/
unzip -n projects/source-zips/Places.zip -d projects/places/
unzip -n projects/source-zips/Projects.zip -d projects/vet-trees/
```

### Rsync delta from USB

```bash
# Update Projects.zip
rsync -av --progress /media/robin/foss4lh/david-lovelace-archive/Projects.zip \
  openclaw:/mnt/fe20e9cd-*/david-lovelace-archive-clean/projects/source-zips/Projects.zip

# Copy file lists
rsync -av /media/robin/foss4lh/david-lovelace-archive/file-info-names/ \
  openclaw:/mnt/fe20e9cd-*/david-lovelace-archive-clean/catalog/file-info-names/
```

## Archive comparison commands

```bash
# USB counts
find /media/robin/foss4lh/david-lovelace-archive/AirPhotos/ -type f | wc -l
find /media/robin/foss4lh/david-lovelace-archive/Habitat/ -type f | wc -l

# OpenClaw counts
ssh openclaw 'find /mnt/fe20e9cd-*/david-lovelace-archive-clean/aerial-photography/ -type f | wc -l'
ssh openclaw 'find /mnt/fe20e9cd-*/david-lovelace-archive-clean/habitat-surveys/ -type f | wc -l'

# USB total size (slow on exfat — use --exclude for zips)
du -sh /media/robin/foss4lh/david-lovelace-archive/ --exclude='*.zip'
```

## Release asset workflow

```bash
zip -j kings-caple-photos.zip /path/to/images/*.jpg /path/to/images/*.JPG
gh release upload data-v0.1.0 kings-caple-photos.zip --clobber --repo foss4lh/david-lovelace-archive
```
