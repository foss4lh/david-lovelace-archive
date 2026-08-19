# Raw Archive Migration Workflow

Transferring a raw file archive from an external USB SSD to a remote server (or local target) with dedup, compression, and a DuckDB-driven audit trail.

## Overview

This workflow covers:

1. **External drive discovery** — lsblk scan, mount, enumerate
2. **Zip content analysis** — determine if zips are duplicates or unique
3. **DuckDB inventory** — catalog every file with status tracking
4. **Policy-driven access control** — YAML config → resolved DuckDB status
5. **TIFF compression pipeline** — lossless compression with mapping table
6. **Remote server verification** — SSH user, groups, paths
7. **rsync transfer** — hardlink preservation, exclusions
8. **Dedup post-process** — rdfind/jdupes on target

## 1. External Drive Discovery

When the user says "the archive" or asks you to work with raw data, do NOT assume it's the processed git repo. Check for newly plugged external drives first:

```bash
# Scan all drives (filter out loop)
lsblk -o NAME,SIZE,TYPE,MODEL,FSTYPE,LABEL,MOUNTPOINT | grep -v loop

# If a new drive appeared since session start (e.g. user just plugged it in),
# the previous scan may be stale — always re-scan when user says "just plugged in"
```

**Pitfall**: The first `lsblk` scan might catch a different drive than what the user means. When they say "I just plugged in the other drive", re-scan immediately — don't assume the first one found was correct.

### Mounting

exfat drives need sudo:

```bash
sudo mkdir -p /media/robin/foss4lh
sudo mount -t exfat /dev/sdX1 /media/robin/foss4lh
```

Verify: `ls -la /media/robin/foss4lh/`

## 2. Zip Content Analysis (definitive duplicate check)

When the archive contains large zips alongside directories, determine if they're duplicates or unique content:

```bash
cd /path/to/source/

# Count files in each source
echo "Places.zip files:"; unzip -l Places.zip 2>/dev/null | grep -v '/$' | awk 'NR>3{if(NF>=4) print $NF}' | wc -l
echo "Project files in dirs:"; find Places -type f 2>/dev/null | wc -l

# Compare filenames between zips and directories
unzip -l Places.zip 2>/dev/null | grep -v '/$' | awk 'NR>3{if(NF>=4) print $NF}' | awk -F/ '{print $NF}' | sort > /tmp/zip_files.txt
find AirPhotos HARC Habitat History Images Maps -type f -printf '%f\n' | sort > /tmp/dir_files.txt
echo "Overlapping filenames:"; comm -12 /tmp/zip_files.txt /tmp/dir_files.txt | wc -l

# File types inside zips
unzip -l Places.zip 2>/dev/null | grep -v '/$' | awk 'NR>3{if(NF>=4) print $NF}' | awk -F. '{if(NF>1) print tolower($NF)}' | sort | uniq -c | sort -rn | head -15
```

**Known patterns**:

- Places.zip often contains date-organized site visit photos (e.g. `2005_10_15PeterchurchMill/IMG_5355.JPG`) — unique content
- Projects.zip contains project-scoped documents, maps, shapefiles — unique content
- The loose directories (AirPhotos/, History/, Maps/) contain curated collections — overlapping filenames is rare

## 3. DuckDB-driven Migration Inventory

Build before any copy. See `templates/archive-policy.yaml` for the config file.
The database lives on the destination server under `catalog/archive.db`. Two tables:

### Schema — `files` table

```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    original_path TEXT UNIQUE,               -- path on external SSD, relative to source root
    original_filename TEXT,
    original_size BIGINT,
    original_sha256 TEXT,
    last_modified TEXT,
    source_group TEXT,                       -- AirPhotos / HARC / Habitat / History / Maps / zips
    source_zip TEXT,                         -- 'Places.zip' / 'Projects.zip' / NULL
    destination_path TEXT,                   -- path on target server
    destination_size BIGINT,
    destination_sha256 TEXT,
    compression_method TEXT,                 -- NULL / 'zstd' / 'lzw'
    compression_ratio REAL,                  -- original_size / destination_size
    status TEXT DEFAULT 'NA',                -- NA / copied / not_public / error
    status_reason TEXT,                      -- 'HARC source: licensing restrictions' / 'MS Office doc'
    dedup_link_id INTEGER,                   -- points to another row if hardlinked duplicate
    dedup_copies INTEGER,
    notes TEXT
);
```

### Schema — `collections` table

```sql
CREATE TABLE collections (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE,                        -- 'aerial-photography', 'maps', 'historical-documents', ...
    source_globs TEXT,                       -- 'AirPhotos,Images,Places.zip'
    description TEXT,
    default_public BOOLEAN DEFAULT TRUE
);
```

### Category mapping (source → destination)

| Source         | Destination                     | Collection           |
| -------------- | ------------------------------- | -------------------- |
| `AirPhotos/`   | `aerial-photography/`           | aerial-photography   |
| `Images/`      | `aerial-photography/`           | aerial-photography   |
| `Places.zip`   | `aerial-photography/` (extract) | aerial-photography   |
| `History/`     | `historical-documents/`         | historical-documents |
| `Maps/`        | `maps/`                         | maps                 |
| `Habitat/`     | `habitat-surveys/`              | habitat-surveys      |
| `HARC/`        | `harc-records/`                 | harc-records         |
| `Projects.zip` | `projects/` (extract)           | projects             |

### Status conventions

- `NA` — not yet migrated (default)
- `copied` — successfully copied to destination
- `not_public` — file excluded from public domain per policy (with `status_reason`)
- `error` — transfer or compression failed

### Creating the database on the destination

```bash
duckdb /path/to/catalog/archive.db << 'ENDSQL'
CREATE TABLE IF NOT EXISTS files ( ... );
CREATE SEQUENCE IF NOT EXISTS file_id_seq START 1;
CREATE TABLE IF NOT EXISTS collections ( ... );
INSERT INTO collections VALUES (1, 'aerial-photography', 'AirPhotos,Images,Places.zip', ...)
ON CONFLICT DO NOTHING;
ENDSQL
```

**Pitfall**: DuckDB uses single quotes for string defaults (`DEFAULT 'NA'`), NOT double quotes. `DEFAULT "NA"` is parsed as a column reference and raises `Binder Error: DEFAULT value cannot contain column names`.

## 4. Config-driven Not_Public Policy

Use a YAML configuration file (`archive-policy.yaml`) to define access rules. The config is read during migration to resolve each file's status in DuckDB. The web app queries DuckDB directly — no runtime config parsing needed.

### How it works

1. **Config defines rules** (see `templates/archive-policy.yaml`)
2. **Migration script resolves status** per file against the rules:
   ```
   For each file:
     - If source_path matches not_public.source_glob → status = NOT_PUBLIC
     - If extension matches not_public.raw_camera_formats → status = SKIP
     - If parent directory in not_public.directory → status = SKIP
     - Otherwise → status = NA (ready for copy)
   ```
3. **Policy changes later**: update `archive-policy.yaml`, re-run the resolver, it flips DuckDB statuses where rules changed

### Example resolver SQL

```sql
-- Mark all HARC files as NOT_PUBLIC
UPDATE files
SET status = 'not_public',
    status_reason = 'HARC source: licensing restrictions'
WHERE source_group = 'HARC' AND status = 'NA';

-- Skip raw camera files (JPEG renders exist alongside)
UPDATE files
SET status = 'error',
    status_reason = 'raw camera file, no JPEG companion'
WHERE original_filename ~ '\.(arw|dng|srw)$' AND status = 'NA';
```

## 5. TIFF Compression Pipeline

For large TIFF collections (e.g. 25K files, 538G in Maps/), compress losslessly with a mapping table for reproducibility.

### Recommended: TIFF-zstd (GDAL)

```bash
# Convert single TIFF to zstd-compressed TIFF
gdal_translate -co COMPRESS=ZSTD -co ZSTD_LEVEL=6 \
  input.tif output_compressed.tif

# Verify checksums
sha256sum input.tif output_compressed.tif

# Record mapping
echo "input.tif|$(sha256sum input.tif|cut -d' ' -f1)|$(stat -c%s input.tif)|output_compressed.tif|$(sha256sum output_compressed.tif|cut -d' ' -f1)|$(stat -c%s output_compressed.tif)" >> tiff-compression-map.csv
```

### Mapping table (insert into DuckDB)

```sql
CREATE TABLE tiff_compression_map (
    original_path VARCHAR NOT NULL,
    original_sha256 VARCHAR NOT NULL,
    original_size BIGINT NOT NULL,
    compressed_path VARCHAR NOT NULL,
    compressed_sha256 VARCHAR NOT NULL,
    compressed_size BIGINT NOT NULL,
    compression_method VARCHAR DEFAULT 'zstd',
    compression_params VARCHAR DEFAULT '{"level":6}',
    compression_ratio REAL,
    conversion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Alternatives

| Method            | Compression | Typical ratio | GDAL support             |
| ----------------- | ----------- | ------------- | ------------------------ |
| TIFF-LZW          | Lossless    | ~60-70%       | `-co COMPRESS=LZW`       |
| TIFF-Deflate      | Lossless    | ~50-60%       | `-co COMPRESS=DEFLATE`   |
| TIFF-zstd         | Lossless    | ~40-55%       | `-co COMPRESS=ZSTD`      |
| JPEG2000 lossless | Lossless    | ~40-50%       | Requires ECW/GDAL plugin |

## 6. Remote Server Verification

Before any transfer to a multi-user host like OpenClaw, verify:

```bash
# WHO is the SSH user? Don't assume.
ssh host 'whoami && id'

# Are the expected data directories accessible?
ssh host 'ls -la /mnt/fe20e9cd-*/'
# If permission denied: check group membership
ssh host 'id clausrl'  # should show 1002(robin), 1003(david)

# Is the target writable?
ssh host 'touch /mnt/fe20e9cd-*/test-write && rm /mnt/fe20e9cd-*/test-write'

# What's the available space?
ssh host 'df -h /mnt/fe20e9cd-*/'
```

## 7. Dedup Post-Process (on target)

After transfer, run content-addressable dedup:

```bash
# rdfind — creates hardlinks for identical files
rdfind -makehardlinks true -checksum sha256 /mnt/fe20e9cd-*/david-lovelace-archive-clean/

# jdupes — faster but less thorough
jdupes -L -r /mnt/fe20e9cd-*/david-lovelace-archive-clean/
```

Update DuckDB: link duplicate rows via `dedup_link_id`.

## 8. rsync Transfer Pattern

### Single directory

```bash
rsync -avz --hard-links --progress \
  --exclude='$RECYCLE.BIN' \
  --exclude='System Volume Information' \
  --exclude='.Trash*' \
  /media/robin/foss4lh/david-lovelace-archive/AirPhotos/ \
  user@host:/mnt/fe20e9cd-*/david-lovelace-archive-clean/aerial-photography/
```

### Parallel transfers (background)

For multiple directories (Habitat, AirPhotos, Maps, History, and zips simultaneously), run each rsync as a **background process** with `notify_on_complete`:

```bash
# In terminal tool: background=true, notify_on_complete=true
# Each starts independently and you're notified as each finishes.
# At ~88 MB/s LAN speed:
#   Habitat (32G)  → ~6 min
#   AirPhotos (408G) → ~78 min
#   Maps (538G)    → ~102 min
#   History (912G) → ~173 min
#   Places.zip (155G) → ~4 hrs (note: slower, ~10 MB/s)
#   Projects.zip (717G) → ~20 hrs
```

### Tooling setup on remote

Before transfers, install tools on the destination:

```bash
# On the remote server
pip3 install duckdb                           # Python bindings
sudo apt-get install -y rdfind                 # content-addressable dedup
zstd --version                                 # usually pre-installed

# Standalone DuckDB CLI (if Python bindings aren't enough)
wget -q https://github.com/duckdb/duckdb/releases/download/v1.1.3/duckdb_cli-linux-amd64.zip
unzip -qo duckdb_cli-linux-amd64.zip
sudo mv duckdb /usr/local/bin/duckdb
```

### Post-transfer processing

After all transfers complete, run `phase3-post-process.sh` on the destination (see `scripts/phase3-post-process.sh`):

1. Extract Places.zip → `aerial-photography/` and Projects.zip → `projects/`
2. Scan all files into DuckDB (delete + bulk COPY from CSV)
3. Compress TIFFs in `maps/` with zstd -6
4. Run rdfind to hardlink content-identical files
5. Apply `archive-policy.yaml` (mark HARC + docx as not_public)

## 9. Planning Presentation

When the user asks about the migration plan, structure your response as a set of **explicit options** with:

- Each option's tradeoffs (space/speed/simplicity)
- A clear recommendation
- No more than 2-3 key questions the user needs to answer
- Confidence qualifiers ("I think they are duplicates but verify X...")

## Common Pitfalls

- **exfat USB is slow for metadata ops**: `find` + `stat` per file on exfat can take 30+ seconds just for directory traversal. Prefer bulk listing (`find -printf`) to piped stats. Avoid per-file sha256 on the source — defer hashing to the (much faster) NVMe destination.
- **DuckDB DEFAULT syntax**: Single quotes for string defaults, not double quotes. `DEFAULT 'NA'` works; `DEFAULT "NA"` raises Binder Error.
- **"Archive" doesn't mean git repo**: When a user says "the archive", they mean the raw data on the plugged-in external USB SSD — NOT the processed code in `~/github/foss4lh/`
- **Big zips are frequently unique**: Places.zip and Projects.zip contain different directory structures and unique filenames — always verify via `unzip -l` comparison before assuming duplicate
- **exfat needs sudo**: Polkit agents don't work from headless CLI — fall back to `sudo mount`
- **Remote server != local setup**: Verify every path assumption (SSH user, group membership, symlink resolution) before starting transfer
- **Always re-scan lsblk**: When user says "just plugged in the other drive", the initial scan is stale
