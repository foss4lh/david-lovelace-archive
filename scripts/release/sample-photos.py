#!/usr/bin/env python3
"""
Sample photos from the David Lovelace Archive, resize them for web use,
and create per-collection zip files with a manifest.

Sources its file list from the latest DuckDB inventory so that all filters
(format whitelist, min size, zoom tiles, _files/, etc.) are already applied.
Sampling is size-weighted: larger images are proportionally more likely
to be selected, favouring high-resolution originals over thumbnails.

Usage:
    python sample-photos.py --archive-root /media/robin/foss4lh1/david-lovelace-archive \
        --output-dir ./photo-bundles \
        --max-zip-size-mb 10 \
        --collections hfd-royal-commission
"""

import argparse
import json
import random
import subprocess
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

from PIL import Image


def load_duckdb_files(duckdb_path: str):
    """Query the DuckDB inventory for all eligible image files.

    Returns a list of dicts with keys: path (absolute), relative, size, ext, collection.
    """
    sql = (
        "SELECT path, size, LOWER(format) AS fmt, collection "
        "FROM files WHERE LOWER(format) IN ('jpg', 'jpeg', 'tif', 'tiff')"
        " AND path LIKE 'D:/%'"
        " AND path NOT LIKE '%/LIDAR/%'"
        " AND path NOT LIKE '%/DEM/%'"
        " AND path NOT LIKE '%/zoomable/%'"
        " AND path NOT LIKE '%/zoom/%'"
    )
    result = subprocess.run(
        ["duckdb", duckdb_path, "-json", "-c", sql],
        capture_output=True, text=True, check=True,
    )
    rows = json.loads(result.stdout)
    files = []
    for row in rows:
        raw = row["path"]
        size = row["size"]
        fmt = row["fmt"]
        coll = row["collection"] or "uncategorized"
        relative = raw.replace("D:/", "").replace("J:/", "").replace("K:/", "")
        ext = "." + fmt if not fmt.startswith(".") else fmt
        files.append({
            "path": raw,
            "relative": relative,
            "size": size,
            "ext": ext,
            "collection": coll,
        })
    files.sort(key=lambda x: x["relative"])
    return files


def sample_weighted_by_size(files: list, target_count: int, seed: int = 42) -> list:
    """
    Sample files with probability proportional to file size.

    Larger source images get a higher chance of selection, which means the
    resulting bundles tend to contain higher-resolution photographs rather
    than small incidental images.
    """
    if not files or target_count <= 0:
        return []
    if len(files) <= target_count:
        return files

    rng = random.Random(seed)
    weights = [f["size"] for f in files]
    selected = set()
    # Reservoir-style weighted sampling without replacement
    attempts = 0
    max_attempts = target_count * 100
    while len(selected) < target_count and attempts < max_attempts:
        idx = rng.choices(range(len(files)), weights=weights, k=1)[0]
        selected.add(idx)
        attempts += 1
    # Fallback if weighted sampling didn't fill (extremely unlikely)
    if len(selected) < target_count:
        remaining = [i for i in range(len(files)) if i not in selected]
        needed = target_count - len(selected)
        selected.update(rng.sample(remaining, min(needed, len(remaining))))
    return [files[i] for i in selected]


def estimate_photo_count_for_size(max_size_mb: int, avg_web_size_kb: int = 100) -> int:
    """Estimate how many web-optimised photos fit in a zip of given size."""
    max_size_kb = max_size_mb * 1000
    return max(1, int(max_size_kb / avg_web_size_kb))


def resize_image(src: Path, dst: Path, max_dim: int, quality: int, max_size_mb: int = 500, fmt: str = "JPEG"):
    """Resize an image to fit within max_dim while preserving aspect ratio.

    Skips files larger than max_size_mb — these are typically working
    composites (panorama stitches, merged ECW sheets) too large for PIL
    to handle and unlikely to produce useful web thumbnails."""
    size_mb = src.stat().st_size / (1024 * 1024)
    if size_mb > max_size_mb:
        raise RuntimeError(f"File too large ({size_mb:.0f} MB > {max_size_mb} MB max)")
    with Image.open(src) as img:
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        elif img.mode == "I;16":
            img = img.point(lambda i: i * (1 / 256)).convert("L").convert("RGB")
        elif img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        img.save(dst, format=fmt, quality=quality, optimize=True)


def process_collection(
    collection_id: str,
    files: list,
    output_dir: Path,
    max_zip_size_mb: int,
    web_max_dim: int,
    thumb_max_dim: int,
    quality: int,
    max_size_mb: int,
    archive_root: Path,
    seed: int,
):
    """Process a single collection: sample (size-weighted), resize, zip."""
    target_count = estimate_photo_count_for_size(max_zip_size_mb)
    sampled = sample_weighted_by_size(files, target_count, seed)

    print(f"  Collection {collection_id}: found {len(files)} photos, sampled {len(sampled)}")

    if not sampled:
        return None

    coll_dir = output_dir / collection_id
    web_dir = coll_dir / "web"
    thumb_dir = coll_dir / "thumbs"
    coll_dir.mkdir(parents=True, exist_ok=True)
    web_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "collection": collection_id,
        "total_sampled": len(sampled),
        "web_max_dim": web_max_dim,
        "thumb_max_dim": thumb_max_dim,
        "quality": quality,
        "photos": [],
    }

    for item in sampled:
        rel_path = item["relative"]
        safe_name = rel_path.replace("/", "__").replace("\\\\", "__")
        base_name = Path(safe_name).stem + ".jpg"
        web_path = web_dir / base_name
        thumb_path = thumb_dir / base_name
        src_path = archive_root / rel_path

        try:
            resize_image(src_path, web_path, web_max_dim, quality, max_size_mb)
            resize_image(src_path, thumb_path, thumb_max_dim, quality, max_size_mb)
        except Exception as e:
            print(f"    Warning: failed to resize {rel_path}: {e}")
            continue

        manifest["photos"].append({
            "path": rel_path,
            "web": f"web/{base_name}",
            "thumb": f"thumbs/{base_name}",
        })

    manifest_path = coll_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    zip_path = output_dir / f"photos-{collection_id}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for entry in manifest["photos"]:
            web_file = web_dir / Path(entry["web"]).name
            thumb_file = thumb_dir / Path(entry["thumb"]).name
            if web_file.exists():
                zf.write(web_file, arcname=entry["web"])
            if thumb_file.exists():
                zf.write(thumb_file, arcname=entry["thumb"])
        zf.write(manifest_path, arcname="manifest.json")

    zip_size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"  Created {zip_path.name} ({zip_size_mb:.1f} MB, {len(manifest['photos'])} photos)")

    return {
        "collection": collection_id,
        "zip": str(zip_path),
        "size_mb": round(zip_size_mb, 2),
        "photo_count": len(manifest["photos"]),
    }


def main():
    parser = argparse.ArgumentParser(description="Sample and bundle archive photos")
    parser.add_argument("--archive-root", required=True, help="Path to archive root")
    parser.add_argument("--output-dir", default="./photo-bundles", help="Output directory")
    parser.add_argument(
        "--duckdb-path",
        default="static/data/archive-v7.duckdb",
        help="Path to DuckDB inventory (default: static/data/archive-v7.duckdb)",
    )
    parser.add_argument("--max-zip-size-mb", type=int, default=20, help="Target max zip size in MB")
    parser.add_argument("--web-max-dim", type=int, default=1200, help="Max dimension for web images")
    parser.add_argument("--thumb-max-dim", type=int, default=300, help="Max dimension for thumbnails")
    parser.add_argument("--quality", type=int, default=80, help="JPEG quality (1-100)")
    parser.add_argument("--max-size-mb", type=int, default=500, help="Skip source images larger than this (MB). Prevents PIL decompression errors on composite files.")
    parser.add_argument("--collections", help="Comma-separated collection IDs (default: all)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducible sampling")
    parser.add_argument("--dry-run", action="store_true", help="Print stats without generating files")

    args = parser.parse_args()

    archive_root = Path(args.archive_root)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Determine which collections to process
    target_ids = None
    if args.collections:
        target_ids = [s.strip() for s in args.collections.split(",")]

    # Load eligible files from DuckDB (filters already applied)
    print(f"Loading from DuckDB: {args.duckdb_path}...")
    all_images = load_duckdb_files(args.duckdb_path)
    print(f"Found {len(all_images)} image files")

    if not all_images:
        print("No image files found.")
        return

    # Group by collection (DuckDB already has collection assigned)
    # Override: assign Luftwaffe files to their own collection regardless of duckdb tag
    by_collection = defaultdict(list)
    for img in all_images:
        coll = img["collection"]
        if "/Luftwaffe/" in img["relative"] or "/luftwaffe/" in img["relative"]:
            coll = "hfd-luftwaffe"
        by_collection[coll].append(img)

    # Determine which collections to process
    if target_ids is None:
        target_ids = sorted(by_collection.keys())

    # Validate requested collections exist
    known = set(by_collection.keys()) | set(target_ids)
    invalid = set(target_ids) - set(by_collection.keys())
    if invalid:
        print(f"Warning: requested collections with no files: {invalid}")

    print(f"\nCollection breakdown:")
    for cid in sorted(by_collection.keys(), key=lambda x: -len(by_collection[x])):
        print(f"  {cid}: {len(by_collection[cid])} photos")

    # Process target collections
    results = []
    for cid in target_ids:
        files = by_collection.get(cid, [])
        if not files:
            print(f"\nSkipping {cid}: no photos found")
            continue

        print(f"\nProcessing {cid}...")

        if args.dry_run:
            target_count = estimate_photo_count_for_size(args.max_zip_size_mb)
            sampled = sample_weighted_by_size(files, target_count, args.seed)
            print(f"  Would sample {len(sampled)} of {len(files)} photos")
            continue

        result = process_collection(
            cid,
            files,
            output_dir,
            args.max_zip_size_mb,
            args.web_max_dim,
            args.thumb_max_dim,
            args.quality,
            args.max_size_mb,
            archive_root,
            args.seed,
        )
        if result:
            results.append(result)

    summary_path = output_dir / "summary.json"
    with open(summary_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nDone. Output in {output_dir}")


if __name__ == "__main__":
    main()
