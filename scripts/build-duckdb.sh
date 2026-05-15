#!/bin/bash
# Build DuckDB index from archive inventory CSV + photo URL mappings
# Filters out zoom tile fragments and small images (< 200 KB).
#
# Usage:
#   ./build-duckdb.sh [output-filename]
#
# Default output: static/data/archive-v5.duckdb

set -euo pipefail

OUTPUT="${1:-static/data/archive-v5.duckdb}"

duckdb "$OUTPUT" << 'SQL'
-- Load inventory CSV with aggressive filtering
CREATE OR REPLACE TABLE files AS
  SELECT * FROM read_csv_auto('catalog/archive-inventory.csv')
  WHERE NOT (
    -- Zoom/panorama tile fragments (derivative files, not primary data)
    CONTAINS(path, 'TileGroup')
    OR CONTAINS(path, '/_group_')
    OR CONTAINS(path, '/html5/')
  )
  AND NOT (
    -- Small image files (thumbnails, web-sized copies — not primary data)
    LOWER(format) IN ('jpg', 'jpeg', 'tif', 'tiff')
    AND CAST(size AS BIGINT) < 200000
  );

-- Add photo URL columns
ALTER TABLE files ADD COLUMN image_url VARCHAR;
ALTER TABLE files ADD COLUMN thumb_url VARCHAR;

-- Join with photo URLs mapping
UPDATE files 
SET image_url = p.url, 
    thumb_url = p.thumb_url 
FROM read_json_auto('catalog/photo-urls.json') p 
WHERE regexp_replace(files.path, '^[A-Z]:/', '') = p.path;
SQL

echo "✓ DuckDB built: $OUTPUT"
