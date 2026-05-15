#!/bin/bash
# Build DuckDB index from archive inventory CSV + photo URL mappings
# Applies format whitelist, per-format size minimums, and excludes known junk.
#
# Usage:
#   ./build-duckdb.sh [output-filename]
#
# Default output: static/data/archive-v7.duckdb

set -euo pipefail

OUTPUT="${1:-static/data/archive-v7.duckdb}"

# Generate photo-urls.json from manifests (merges all collection manifests)
python3 -c "
import json, glob, os
entries = []
for mf in sorted(glob.glob('static/photos/*/manifest.json')):
    with open(mf) as f:
        m = json.load(f)
    coll = m.get('collection')
    if not coll:
        continue
    for p in m.get('photos', []):
        entries.append({
            'path': p['path'],
            'url': f'/photos/{coll}/web/{os.path.basename(p[\"web\"])}',
            'thumb_url': f'/photos/{coll}/thumbs/{os.path.basename(p[\"thumb\"])}'
        })
with open('catalog/photo-urls.json', 'w') as f:
    json.dump(entries, f, indent=2)
print(f'Generated catalog/photo-urls.json ({len(entries)} photos)')
"

duckdb "$OUTPUT" << 'SQL'
CREATE OR REPLACE TABLE files AS
  SELECT * FROM read_csv_auto('catalog/archive-inventory.csv')
  WHERE (
    -- Format whitelist: only keep formats with primary research value
    LOWER(format) IN (
      'jpg', 'jpeg', 'tif', 'tiff', 'ecw',
      'pdf', 'shp', 'asc',
      'doc', 'xls', 'xlsx', 'csv'
    )
    -- Conditional: .txt files — not GIS software docs, not empty
    OR (LOWER(format) = 'txt'
        AND CAST(size AS BIGINT) >= 1024
        AND NOT CONTAINS(path, '/Maps/LIDAR/')
        AND NOT CONTAINS(path, '/Maps/DEM/'))
  )
  -- Zoom/panorama tile fragments (derivative files, not primary data)
  AND NOT (
    CONTAINS(path, 'TileGroup')
    OR CONTAINS(path, '/_group_')
    OR CONTAINS(path, '/html5/')
  )
  -- Modern OS MasterMap / OS OpenData (available from Ordnance Survey, not unique)
  AND NOT CONTAINS(path, '/EN_MasterMap')
  AND NOT CONTAINS(path, '/OS_opendata_2010')
  -- Derivative GIS working directories (no research value)
  AND NOT (
    CONTAINS(path, '/Maps/grassdata/')
    OR CONTAINS(path, '/Maps/Vectorcomponents/')
    OR CONTAINS(path, '/Maps/sources/')
    OR CONTAINS(path, '/Maps/ParishData_HC/')
  )
  -- Browser-saved webpage asset directories "*_files/".
  -- When saving a web page as "Web Page, Complete", browsers create a _files/
  -- folder containing the page's dependencies: logos, UI chrome (isys-header.jpg,
  -- top_header_area.gif), auto-extracted article text fragments (f.txt), JS, CSS,
  -- and Thumbs.db. None of these are primary research. The page's HTML content
  -- lives in the parent directory and was already excluded by the format whitelist.
  -- 43 files in the original CSV, 21 remain after other filters.
  AND NOT CONTAINS(path, '_files/')
  -- Per-format minimum sizes (filters thumbnails, empty files, corrupt files)
  AND NOT (
    (LOWER(format) IN ('jpg', 'jpeg')       AND CAST(size AS BIGINT) < 200000)
    OR (LOWER(format) IN ('tif', 'tiff')    AND CAST(size AS BIGINT) < 200000)
    OR (LOWER(format) IN ('doc')            AND CAST(size AS BIGINT) < 5120)
    OR (LOWER(format) IN ('xls', 'xlsx')    AND CAST(size AS BIGINT) < 5120)
    OR (LOWER(format) = 'csv'               AND CAST(size AS BIGINT) < 1024)
    OR (LOWER(format) = 'shp'               AND CAST(size AS BIGINT) < 1024)
    OR (LOWER(format) = 'pdf'               AND CAST(size AS BIGINT) < 10240)
  )
  -- pdf: remove shallow/misfiled, auto-duplicates, working copies, invoices
  AND NOT (
    LOWER(format) = 'pdf' AND (
      regexp_replace(path, '^[A-Z]:/', '') NOT LIKE '%/%/%'
      OR path LIKE '% (1).%'
      OR path LIKE '% (2).%'
      OR LOWER(path) LIKE '% copy.%'
      OR LOWER(path) LIKE '%invoice%'
    )
  );

-- Reassign Luftwaffe files to their own collection (CSV tagged them as uncategorized)
UPDATE files SET collection = 'hfd-luftwaffe'
WHERE CONTAINS(path, '/Luftwaffe/') OR CONTAINS(path, '/luftwaffe/');

-- Create standalone photo_urls table
CREATE OR REPLACE TABLE photo_urls AS
  SELECT * FROM read_json_auto('catalog/photo-urls.json');

-- Add photo URL columns to files table for backward compatibility
ALTER TABLE files ADD COLUMN image_url VARCHAR;
ALTER TABLE files ADD COLUMN thumb_url VARCHAR;

-- Join with photo URLs mapping
UPDATE files 
SET image_url = p.url, 
    thumb_url = p.thumb_url 
FROM photo_urls p 
WHERE regexp_replace(files.path, '^[A-Z]:/', '') = p.path;
SQL

echo "✓ DuckDB built: $OUTPUT"
