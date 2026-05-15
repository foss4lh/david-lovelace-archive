#!/bin/bash
# Build DuckDB index from archive inventory CSV + photo URL mappings
#
# Usage:
#   ./build-duckdb.sh [output-filename]
#
# Default output: static/data/archive-v3.duckdb

set -euo pipefail

OUTPUT="${1:-static/data/archive-v3.duckdb}"

duckdb "$OUTPUT" << 'SQL'
-- Load inventory CSV
CREATE OR REPLACE TABLE files AS 
  SELECT * FROM read_csv_auto('catalog/archive-inventory.csv');

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
