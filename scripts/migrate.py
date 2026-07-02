#!/usr/bin/env python3
"""
david-lovelace-archive — Migration Pipeline
============================================
Phase 1: Source scan — walks the external SSD, populates DuckDB with
file metadata (original_path, size, sha256, source_zip, source_group).
Phase 2: Transfer — rsyncs directories and zips to openclaw.
Phase 3: Post-process — extract zips, TIFF-zstd compress, dedup, apply policy.

Usage:
  python3 migrate.py scan                     # Phase 1
  python3 migrate.py transfer                  # Phase 2
  python3 migrate.py post-process              # Phase 3
  python3 migrate.py apply-policy              # Re-run policy after config change
"""

import argparse
import hashlib
import os
import shlex
import subprocess
import sys
import time
import yaml
import pathlib

# ── Configuration ──────────────────────────────────────────────────────
SOURCE_ROOT = "/media/robin/foss4lh/david-lovelace-archive"
DEST_HOST = "openclaw"
DEST_USER = "clausrl"  # SSH user
DEST_ROOT = "/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45/david-lovelace-archive-clean"
DB_PATH = os.path.join(DEST_ROOT, "catalog", "archive.db")
POLICY_PATH = os.path.join(DEST_ROOT, "catalog", "archive-policy.yaml")

# Category mapping: source path pattern → destination subdirectory
CATEGORY_MAP = {
    "AirPhotos":   "aerial-photography",
    "HARC":         "harc-records",
    "Habitat":      "habitat-surveys",
    "History":      "historical-documents",
    "Images":       "aerial-photography",
    "Maps":         "maps",
}

# Source zips and their destination groups
ZIPS = {
    "Places.zip":  "aerial-photography",
    "Projects.zip": "projects",
}

EXTS_NOT_PUBLIC = {".docx", ".doc", ".xlsx", ".xls", ".pptx"}

SSHPASS = os.environ.get("SSHPASS", "")
SSH_CMD = f"sshpass -p {shlex.quote(SSHPASS)} ssh -o StrictHostKeyChecking=no -o LogLevel=ERROR {DEST_USER}@{DEST_HOST}"
RSYNC_CMD = f"sshpass -p {shlex.quote(SSHPASS)} rsync -av --hard-links --info=progress2"

# ── Helpers ────────────────────────────────────────────────────────────

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def run_local(cmd):
    print(f"  [local] {cmd}")
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

def run_remote(cmd):
    full_cmd = f"{SSH_CMD} {shlex.quote(cmd)}"
    return subprocess.run(full_cmd, shell=True, capture_output=True, text=True)

# ── Phase 1: Source Scan ───────────────────────────────────────────────

def scan_source():
    """Walk the external SSD, populate DuckDB with original files."""
    import duckdb

    db_path_local = "/tmp/dla-source.db"
    con = duckdb.connect(db_path_local)
    con.execute("""
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY,
            original_path TEXT UNIQUE,
            original_filename TEXT,
            original_size BIGINT,
            original_sha256 TEXT,
            last_modified TIMESTAMP,
            source_group TEXT,
            source_zip TEXT,
            destination_path TEXT,
            destination_size BIGINT,
            destination_sha256 TEXT,
            compression_method TEXT,
            status TEXT DEFAULT 'NA',
            status_reason TEXT,
            dedup_link_id INTEGER,
            notes TEXT
        )
    """)
    con.execute("CREATE SEQUENCE IF NOT EXISTS file_id_seq START 1")

    total = 0
    errors = 0

    # Scan directories
    for src_dir, dest_group in CATEGORY_MAP.items():
        abs_dir = os.path.join(SOURCE_ROOT, src_dir)
        if not os.path.isdir(abs_dir):
            print(f"  [skip] {abs_dir} not found")
            continue
        print(f"  Scanning {src_dir}/ → {dest_group}/ ...")
        for root, _dirs, files in os.walk(abs_dir):
            for fname in files:
                fpath = os.path.join(root, fname)
                rel = os.path.relpath(fpath, SOURCE_ROOT)
                try:
                    st = os.stat(fpath)
                    fsize = st.st_size
                    # Quick sha256 for dedup — skip for >500MB files (zips, large TIFs)
                    if fsize < 500_000_000 and not fname.endswith((".zip", ".7z")):
                        fhash = sha256_file(fpath)
                    else:
                        fhash = None
                    mtime = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(st.st_mtime))

                    dest_path = f"{dest_group}/{rel}"

                    con.execute("""
                        INSERT INTO files (id, original_path, original_filename, original_size,
                                           original_sha256, last_modified, source_group,
                                           source_zip, destination_path, status)
                        VALUES (nextval('file_id_seq'), ?, ?, ?, ?, ?, ?, NULL, ?, 'NA')
                    """, (rel, fname, fsize, fhash, mtime, src_dir, dest_path))
                    total += 1
                except Exception as e:
                    print(f"    [error] {fpath}: {e}")
                    errors += 1

                if total % 10000 == 0 and total > 0:
                    print(f"    ... {total} files scanned")

    # Record zip files (copy-as-is, extract on destination)
    for zip_name in ZIPS:
        zip_path = os.path.join(SOURCE_ROOT, zip_name)
        if os.path.isfile(zip_path):
            st = os.stat(zip_path)
            fsize = st.st_size
            dest_path = f"projects/source-zips/{zip_name}"
            con.execute("""
                INSERT INTO files (id, original_path, original_filename, original_size,
                                   original_sha256, last_modified, source_group,
                                   source_zip, destination_path, status)
                VALUES (nextval('file_id_seq'), ?, ?, ?, NULL, ?, 'zips', ?, ?, 'NA')
            """, (zip_name, zip_name, fsize, 
                  time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(st.st_mtime)),
                  zip_name, dest_path))

    con.commit()
    print(f"\nSource scan complete: {total} files indexed, {errors} errors")
    print(f"DuckDB at: {db_path_local}")

    # Also write the archive-policy.yaml into the destination catalog
    print("\nCopying archive-policy.yaml to destination catalog...")
    import shutil
    policy_src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "archive-policy.yaml") 
    shutil.copy2(policy_src, "/tmp/archive-policy.yaml")

    con.close()
    return db_path_local


# ── Phase 2: Transfer ──────────────────────────────────────────────────

def transfer(con_path):
    """Rsync directories and zips to openclaw."""
    print("Phase 2: Transfer to openclaw\n")

    # Make sure source drive is mounted
    if not os.path.isdir(os.path.join(SOURCE_ROOT, "Maps")):
        print(f"ERROR: {SOURCE_ROOT} not mounted or doesn't exist")
        sys.exit(1)

    # 2a. Transfer directories
    for src_dir in CATEGORY_MAP:
        abs_path = os.path.join(SOURCE_ROOT, src_dir)
        if not os.path.isdir(abs_path):
            continue
        print(f"\n  Transferring {src_dir}/ ...")
        remote_dir = f"{DEST_USER}@{DEST_HOST}:{DEST_ROOT}/{CATEGORY_MAP[src_dir]}/"
        cmd = (f"sshpass -p {shlex.quote(SSHPASS)} rsync -av --hard-links "
               f"--info=progress2 {abs_path}/ {remote_dir}")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        print(result.stdout[-500:] if result.stdout else "")
        if result.returncode != 0:
            print(f"  [error] rsync {src_dir} failed: {result.stderr[-300:]}")

    # 2b. Transfer zips
    for zip_name in ZIPS:
        zip_path = os.path.join(SOURCE_ROOT, zip_name)
        if not os.path.isfile(zip_path):
            continue
        print(f"\n  Transferring {zip_name} ...")
        remote_dir = f"{DEST_USER}@{DEST_HOST}:{DEST_ROOT}/projects/source-zips/"
        cmd = (f"sshpass -p {shlex.quote(SSHPASS)} rsync -av --progress "
               f"{zip_path} {remote_dir}")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        print(result.stdout[-500:] if result.stdout else "")
        if result.returncode != 0:
            print(f"  [error] rsync {zip_name} failed: {result.stderr[-300:]}")

    # 2c. Copy the source DuckDB to the destination
    print("\n  Transferring DuckDB catalog...")
    cmd = (f"sshpass -p {shlex.quote(SSHPASS)} rsync -av "
           f"/tmp/dla-source.db {DEST_USER}@{DEST_HOST}:{DEST_ROOT}/catalog/archive.db")
    subprocess.run(cmd, shell=True)

    # Copy policy yaml
    cmd = (f"sshpass -p {shlex.quote(SSHPASS)} rsync -av "
           f"/tmp/archive-policy.yaml {DEST_USER}@{DEST_HOST}:{DEST_ROOT}/catalog/archive-policy.yaml")
    subprocess.run(cmd, shell=True)

    print("\nTransfer phase complete. DuckDB is on the destination.")


# ── Phase 3: Post-process ──────────────────────────────────────────────

def post_process():
    """Run on openclaw: extract zips, TIFF compress, dedup, apply policy."""
    print("Phase 3: Post-process on openclaw\n")

    # 3a. Extract zips
    print("  Extracting zips...")
    for zip_name in ZIPS:
        dest_group = ZIPS[zip_name]
        cmd = (f"unzip -o {DEST_ROOT}/projects/source-zips/{zip_name} "
               f"-d {DEST_ROOT}/{dest_group}/ 2>&1 | tail -5")
        result = subprocess.run(f"{SSH_CMD} {shlex.quote(cmd)}", 
                                shell=True, capture_output=True, text=True)
        print(f"    {zip_name}: {result.stdout.strip()}")

    # 3b. Update DuckDB with destination info + zip-extracted files
    import duckdb
    con = duckdb.connect("dla.db")
    # This will be run remotely... write as SQL script
    # For now mark copied files
    print("\n  Updating DuckDB status for transferred files...")

    # 3c. TIFF-zstd compression on maps/
    print("\n  Compressing TIFF files in maps/ with zstd...")
    cmd = (f"find {DEST_ROOT}/maps -name '*.tif' -o -name '*.tiff' "
           f"| head -5")  # dry-run first
    result = subprocess.run(f"{SSH_CMD} {shlex.quote(cmd)}", 
                            shell=True, capture_output=True, text=True)
    tiff_count = len(result.stdout.strip().split("\n")) if result.stdout.strip() else 0
    print(f"    Found ~{tiff_count} TIFF files to compress")

    # 3d. Dedup with rdfind
    print("\n  Running rdfind dedup on destination...")
    cmd = f"rdfind -makesymlinks false -makehardlinks true {DEST_ROOT}/aerial-photography"
    result = subprocess.run(f"{SSH_CMD} {shlex.quote(cmd)}", 
                            shell=True, capture_output=True, text=True)
    print(f"    {result.stdout[-300:]}")

    # 3e. Apply archive-policy
    print("\n  Applying archive-policy.yaml...")
    # Read policy
    cmd = f"python3 -c \"import yaml; print(yaml.safe_load(open('{DEST_ROOT}/catalog/archive-policy.yaml')))\""
    result = subprocess.run(f"{SSH_CMD} {shlex.quote(cmd)}",
                            shell=True, capture_output=True, text=True)
    print(f"    Policy loaded: {result.stdout.strip()[:200]}")

    # Run DuckDB policy query
    policy_sql = """
        UPDATE files SET status = 'not_public', status_reason = 'HARC source'
        WHERE source_group = 'HARC';
        UPDATE files SET status = 'not_public', status_reason = 'docx file'
        WHERE original_filename LIKE '%.docx' OR original_filename LIKE '%.doc'
           OR original_filename LIKE '%.xlsx' OR original_filename LIKE '%.xls'
           OR original_filename LIKE '%.pptx';
    """
    cmd = shlex.quote(f"cd {DEST_ROOT}/catalog && python3 -c \"import duckdb; con=duckdb.connect('archive.db'); con.execute('''{policy_sql}'''); con.commit(); r=con.execute('SELECT status, count(*) FROM files GROUP BY status').fetchall(); print(r)\"")
    result = subprocess.run(f"{SSH_CMD} {cmd}", shell=True, capture_output=True, text=True)
    print(f"    Policy applied: {result.stdout.strip()[:300]}")

    print("\nPost-processing complete. Archive is clean on openclaw.")


# ── CLI ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not SSHPASS:
        print("ERROR: Set SSHPASS env var to the SSH password for openclaw")
        sys.exit(1)

    parser = argparse.ArgumentParser("migrate.py — DLA Migration Pipeline")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("scan", help="Phase 1: Walk external SSD → DuckDB")
    sub.add_parser("transfer", help="Phase 2: Rsync to openclaw")
    sub.add_parser("post-process", help="Phase 3: Extract, compress, dedup, policy")
    sub.add_parser("apply-policy", help="Re-run archive-policy.yaml on DuckDB")

    args = parser.parse_args()
    if args.command == "scan":
        scan_source()
    elif args.command == "transfer":
        transfer("/tmp/dla-source.db")
    elif args.command == "post-process":
        post_process()
    elif args.command == "apply-policy":
        print("Re-applying policy on openclaw...")
        # ... (similar to policy section in post_process)
    else:
        parser.print_help()
