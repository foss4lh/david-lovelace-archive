#!/bin/bash
# Phase 3: Post-processing on the destination
# Run after all rsync transfers complete.
# Usage: bash phase3-post-process.sh
set -e
DEST=/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45/david-lovelace-archive-clean
LOG=$DEST/catalog/migration-log.txt
echo "=== Post-Processing ===" | tee "$LOG"
echo "Started: $(date)" | tee -a "$LOG"

# Step 1: Extract zips
for zip_name in Places.zip Projects.zip; do
  zpath="$DEST/projects/source-zips/$zip_name"
  [ -f "$zpath" ] || continue
  outdir="$DEST/aerial-photography"
  [ "$zip_name" = "Projects.zip" ] && outdir="$DEST/projects"
  unzip -qo "$zpath" -d "$outdir" 2>&1 | tail -1
  echo "Extracted $zip_name" | tee -a "$LOG"
done

# Step 2: Scan destination into DuckDB
CSV=/tmp/dest-files.csv; rm -f "$CSV"
for dest_group in aerial-photography historical-documents maps habitat-surveys harc-records projects; do
  abs="$DEST/$dest_group"
  [ -d "$abs" ] || continue
  find "$abs" -type f -exec stat -c'%s|%Y' {} \; 2>/dev/null > /tmp/sz.$$
  find "$abs" -type f -printf '%P\n' > /tmp/nm.$$
  paste -d'|' /tmp/nm.$$ /tmp/sz.$$ | awk -v g="$dest_group" '{print $0 "|" g}' >> "$CSV"
  rm -f /tmp/sz.$$ /tmp/nm.$$
done
duckdb "$DEST/catalog/archive.db" "DELETE FROM files; COPY files (destination_path, destination_size, last_modified, source_group) FROM '$CSV' (DELIMITER '|', HEADER false); UPDATE files SET status = 'copied';"
echo "DuckDB: $(duckdb "$DEST/catalog/archive.db" 'SELECT count(*) FROM files' 2>/dev/null) files" | tee -a "$LOG"

# Step 3: TIFF-zstd compression
find "$DEST/maps" -type f \( -iname '*.tif' -o -iname '*.tiff' \) -size +1M | while read tif; do
  zstd -6 --rm "$tif" 2>/dev/null && echo "Compressed: $(basename $tif)" >> "$LOG"
done

# Step 4: rdfind dedup
rdfind -makehardlinks true -makeresultsfile false "$DEST/aerial-photography" "$DEST/historical-documents" "$DEST/projects" 2>&1 | tail -3 | tee -a "$LOG"

# Step 5: Apply archive-policy
duckdb "$DEST/catalog/archive.db" "UPDATE files SET status = 'not_public', status_reason = 'HARC source' WHERE source_group = 'HARC' AND status = 'copied'; UPDATE files SET status = 'not_public', status_reason = 'MS Office doc' WHERE (original_filename LIKE '%.docx' OR original_filename LIKE '%.doc' OR original_filename LIKE '%.xlsx' OR original_filename LIKE '%.xls' OR original_filename LIKE '%.pptx') AND status = 'copied';"
duckdb "$DEST/catalog/archive.db" "SELECT status, status_reason, count(*) FROM files GROUP BY status, status_reason ORDER BY status;" | tee -a "$LOG"
echo "Finished: $(date)" | tee -a "$LOG"
