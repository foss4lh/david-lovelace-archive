# Archive Audit and Data Processing

## Overview

This section covers the data processing workflows for the David Lovelace Archive, including archive audit scripts, inventory maintenance, data download procedures, and external-drive-to-target migration with DuckDB-driven file tracking.

## External Drive Data Discovery & Migration

### 1. Identify the Source Drive

Before touching any code, locate the raw data source — it's almost always an external USB SSD, not a processed git repo.

```bash
# Find all physical drives (filter out loop devices, NVMe system drives)
lsblk -o NAME,SIZE,TYPE,MODEL,FSTYPE,LABEL,MOUNTPOINT | grep -v loop

# Look for:
# - A drive with a label like "foss4lh", "ARCHIVE", or similar
# - 5TB+ external drives (WD, Seagate, Samsung T7)
# - exfat or ntfs filesystems
# - No mountpoint means it's plugged but not mounted
```

Key fields: `LABEL` (user-friendly name), `MODEL` (physical drive model), `SIZE`, `FSTYPE` (exfat/ntfs/ext4), `MOUNTPOINT`.

### 2. Mount the Drive

exfat drives typically need sudo or udisksctl:

```bash
# Attempt udisksctl first (no sudo)
udisksctl mount -b /dev/sdX1

# If that fails, use sudo
sudo mount -t exfat /dev/sdX1 /media/robin/foss4lh

# Verify mount
ls -la /media/robin/foss4lh/
du -sh /media/robin/foss4lh/
```

**Pitfall**: Polkit agents don't work from headless CLI — fall back to `sudo mount` if udisksctl fails.

### 3. Scan Raw Data Contents

Walk the top-level directory structure to understand what you're working with:

```bash
# Tree view (depth matters — start at 2, go deeper as needed)
find /media/robin/foss4lh/ -maxdepth 2 -type d | sort

# File type breakdown for dedup/compression analysis
find /media/robin/foss4lh/ -type f -printf '%s %f\n' | \
  awk -F. '{if(NF>1) print tolower($NF)}' | sort | uniq -c | sort -rn | head -20

# Total size
du -sh /media/robin/foss4lh/
```

### 4. DuckDB Migration Inventory (Recommended)

Before any copy, build a DuckDB database that catalogs every file with its source, destination, and status. This replaces ad-hoc copy plans.

```bash
# Install DuckDB CLI if needed
# curl -fsSL https://install.duckdb.org | sh
# or via pip: pip install duckdb

# Generate the file manifest
find /media/robin/foss4lh/ -type f -printf '%s\t%p\n' > /tmp/raw-file-manifest.txt
wc -l /tmp/raw-file-manifest.txt

# Optional: add checksums for dedup detection
find /media/robin/foss4lh/ -type f -exec sha256sum {} + > /tmp/raw-file-sums.txt
```

Schema for the migration tracking database:

```sql
-- Create the inventory database
CREATE TABLE file_inventory (
    id INTEGER PRIMARY KEY,
    relative_path VARCHAR NOT NULL,       -- path relative to source root
    original_path VARCHAR NOT NULL,       -- full source path on external drive
    destination_path VARCHAR,             -- planned destination on target drive (NULL = not assigned yet)
    file_size BIGINT NOT NULL,
    sha256 VARCHAR,                       -- SHA-256 checksum (for deduplication)
    status VARCHAR NOT NULL DEFAULT 'NA', -- NA = not copied, DONE = copied, NOT_PUBLIC = excluded from public
    category VARCHAR,                     -- map / photo / survey / catalog / script
    mime_type VARCHAR,
    notes VARCHAR
);

-- Load file manifest
COPY file_inventory(relative_path, original_path, file_size)
FROM '/tmp/raw-file-manifest.txt'
(DELIMITER '\t', NAMES false);

-- Find duplicates by size + checksum for dedup planning
SELECT sha256, count(*) as copies, sum(file_size) as total_bytes
FROM file_inventory
WHERE sha256 IS NOT NULL
GROUP BY sha256
HAVING count(*) > 1
ORDER BY total_bytes DESC;

-- Status queries
SELECT status, count(*) as count, sum(file_size) / 1e9 as total_gb
FROM file_inventory
GROUP BY status;
```

**Status conventions:**

- `NA` — not yet migrated (default)
- `DONE` — successfully copied to destination
- `NOT_PUBLIC` — file that will NOT be in the public domain (copyrighted maps, personal photos, third-party scans)
- `DUPLICATE` — content-identical file, resolved via hardlink (not a separate transfer)
- `SKIP` — excluded intentionally (cache files, thumbs, temp files)

### 5. Dedup & Compression Strategy

Run dedup checks BEFORE copying to save transfer time:

```bash
# Option A: rdfind (most thorough — finds by content)
sudo apt-get install rdfind
rdfind -makehardlinks true -checksum sha256 /media/robin/foss4lh/

# Option B: jdupes (faster for large file sets)
sudo apt-get install jdupes
jdupes -L -r /media/robin/foss4lh/
```

**Compression opportunities by file type:**

| Type    | Already compressed? | On-disk strategy        |
| ------- | ------------------- | ----------------------- |
| JPEG    | Yes (lossy)         | No recompression needed |
| TIFF    | No (raw)            | Consider zstd per-file  |
| PMTiles | Partial             | Already optimized       |
| CSV     | No                  | gzip or zstd (50-90%)   |
| JSON    | No                  | gzip or zstd (50-90%)   |
| ECW     | Yes (wavelet)       | No recompression needed |
| ZIP     | Yes                 | Already packaged        |

Transfer command pattern (dedup first, then copy):

```bash
# After dedup and inventory planning:
rsync -avz --hard-links --progress \
  --exclude='.Trash*' --exclude='__MACOSX' \
  /media/robin/foss4lh/ \
  /mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45/david-lovelace-archive-clean/

# Update inventory: mark copied files as DONE
# (can be done via load into DuckDB from the rsync file list)
```

## Repositories

- `~/github/foss4lh/hfd-data-ops/` — audit scripts, conversion pipelines
- `~/github/foss4lh/hfd-landscape-explorer/` — Svelte 5 + OpenLayers web app
- Archive source: `/media/robin/foss4lh/david-lovelace-archive/` (external USB drive)

## Archive Audit

```bash
python3 ~/github/foss4lh/hfd-data-ops/archive_audit.py --output archive-manifest.json
```

Outputs `archive-manifest.json` consumed by `RawDataDocumentation.svelte` at runtime.

## Inventory Maintenance

The web explorer is powered by a DuckDB database generated from directory listings:

```bash
# Parse .txt listings into a structured CSV
npm run inventory:parse

# Ingest CSV into the DuckDB database file
npm run inventory:duckdb
```

## Data Download for Build

Fetch release assets (PMTiles, DuckDB) from GitHub Releases for Netlify builds or local development:

```bash
# Fetch only assets marked requiredForBuild: true (used by Netlify)
npm run data:download -- --required-only

# Fetch all assets (for local development with full dataset)
npm run data:download
```

## Dataset Manifest

Each dataset should have a subdirectory in `hfd-data-ops/` with:

- `README.md` — source file location, processing steps, output location
- `*.sh` — conversion scripts
- `*.pmtiles` — output (not committed to git; hosted as GitHub Release asset)

## Netlify Build Integration

The `hfd-landscape-explorer/build.sh` downloads PMTiles from GitHub Release at build time. For a new dataset:

1. Generate PMTiles via the pipeline above
2. Upload to a GitHub Release: `gh release upload v0.1.0 dataset.pmtiles`
3. Update `build.sh` with the download URL
4. Add dataset entry to `App.svelte` using `PMTilesRasterSource` from `ol-pmtiles`

## Key Packages

- **GDAL plus ECW driver**: Docker image `ginetto/gdal:2.4.4_ECW` (not stock OS GDAL — no ECW support)
- **pmtiles Python**: `pip install pmtiles` (for `pmtiles.writer`, `pmtiles.tile`)
- **ol-pmtiles**: `npm install ol-pmtiles` (for `PMTilesRasterSource` in Svelte app)

## Common Pitfalls

- Stock GDAL (apt-installed) has **no ECW driver** — use `ginetto/gdal:2.4.4_ECW` Docker image
- `tile_to_lat(z, y)` in `compute_bounds.py` expects **TMS Y** (flipped), not raw y — flip with `(1<<z)-1-raw_y`
- `pmtiles.writer.finalize()` requires `Compression.NONE` **enum**, not integer `0`
- gdal2tiles outputs **PNG** by default (not JPEG), even from JPEG-source ECW
- PMTiles file must be in `public/` to be included in Vite dist
- Bounds string format: `"min_lon,min_lat,max_lon,max_lat"` (4 values, not 3)

## Open Issues

**Whitby PMTiles layer may not render visibly on live site** — the `visibleDatasetIds` derived state uses `.includes(ds.id)` which compares string IDs to dataset objects. The string-to-ID match works, but dataset objects in `datasets` may have identity issues if `PMTilesRasterSource` objects aren't stable across renders. Workaround: verify PMTiles file is in `public/` and check browser network tab for tile requests (range requests to `.pmtiles` file). If tiles load but don't display, suspect `tile_to_lat` bug or projection mismatch.

## Git Workflow

Scripts and configs in the repo should be committed:

```bash
cd ~/github/foss4lh/hfd-data-ops
git add tithe-pmtiles/
git commit -m "Add tithe-pmtiles pipeline: Whitby ECW → PMTiles"
git push origin main
```

Generated PMTiles files (`.pmtiles`) are NOT committed — they are hosted as GitHub Release assets and downloaded at build time.
