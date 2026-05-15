#!/usr/bin/env python3
"""
Sample photos from the David Lovelace Archive, resize them for web use,
and create per-collection zip files with a manifest.

Usage:
    python sample-photos.py --archive-root /media/robin/foss4lh1/david-lovelace-archive \
        --output-dir ./photo-bundles \
        --max-zip-size-mb 10 \
        --collections hfd-royal-commission

The script:
1. Scans the archive for image files (jpg, jpeg, tif, tiff)
2. Assigns each file to a collection using prefix matching from datasets.json
3. Samples evenly across folders within each collection for good coverage
4. Generates web-optimised versions and thumbnails
5. Creates a zip per collection and a JSON manifest
"""

import argparse
import json
import os
import random
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

from PIL import Image


def load_datasets(config_path: str):
    with open(config_path, "r") as f:
        return json.load(f)


def assign_collection(path: str, datasets: list, excluded_ids: set = None) -> str:
    """Assign a file path to a collection using longest-prefix matching."""
    if excluded_ids is None:
        excluded_ids = {"archive-inventory"}

    # Normalize path separators
    normalised = path.replace("\\", "/")

    matches = []
    for ds in datasets:
        if ds["id"] in excluded_ids:
            continue
        for prefix in ds.get("sourceArchivePaths", []):
            prefix_norm = prefix.replace("\\", "/")
            if normalised.startswith(prefix_norm) or normalised.endswith("/" + prefix_norm):
                matches.append((len(prefix_norm), ds["id"]))
            # Also check if prefix appears anywhere in path (for relative paths)
            if prefix_norm in normalised:
                matches.append((len(prefix_norm), ds["id"]))

    if not matches:
        return "uncategorized"

    # Longest prefix wins; tie-break by stable ID sort
    matches.sort(key=lambda x: (-x[0], x[1]))
    return matches[0][1]


ZOOM_TILE_PATTERNS = ["/TileGroup", "/_group_", "/html5/"]

MIN_IMAGE_SIZE_BYTES = 200 * 1024


def is_likely_zoom_tile(relative_path: str) -> bool:
    """Check if a file path looks like a deep-zoom or Zoomify tile fragment."""
    normalised = relative_path.replace("\\", "/")
    for pattern in ZOOM_TILE_PATTERNS:
        if pattern in normalised:
            return True
    return False


def find_image_files(archive_root: str, source_paths: list = None, min_size_bytes: int = MIN_IMAGE_SIZE_BYTES):
    """Recursively find all image files in the archive, sorted for determinism.
    If source_paths is provided, only scan those paths (relative to archive_root).
    Skips zoom tile fragments and files smaller than min_size_bytes."""
    root = Path(archive_root)
    extensions = {".jpg", ".jpeg", ".tif", ".tiff"}
    files = []

    # Determine which directories to scan
    if source_paths is None:
        # Scan the entire archive_root
        scan_roots = [root]
    else:
        # Scan only the specified source paths (relative to archive_root)
        scan_roots = [root / p for p in source_paths]

    for scan_root in scan_roots:
        if not scan_root.exists():
            print(f"Warning: scan path {scan_root} does not exist. Skipping.")
            continue
        for ext in extensions:
            for path in scan_root.rglob(f"*{ext}"):
                if path.is_file():
                    try:
                        size = path.stat().st_size
                        relative = str(path.relative_to(root))

                        # Skip zoom tile fragments
                        if is_likely_zoom_tile(relative):
                            continue

                        # Skip browser-saved webpage assets (_files/ dirs)
                        if '_files/' in relative:
                            continue

                        # Skip files below minimum size
                        if size < min_size_bytes:
                            continue

                        files.append({
                            "path": str(path),
                            "relative": relative,
                            "size": size,
                            "ext": ext.lower(),
                        })
                    except (OSError, ValueError):
                        continue

    # Sort by relative path for deterministic ordering
    files.sort(key=lambda x: x["relative"])
    return files


def group_by_folder(files: list) -> dict:
    """Group files by their parent folder."""
    folders = defaultdict(list)
    for f in files:
        parent = str(Path(f["relative"]).parent)
        folders[parent].append(f)
    return dict(folders)


def sample_evenly(files: list, target_count: int, seed: int = 42) -> list:
    """
    Sample files evenly across folders without exceeding target_count.

    Algorithm:
    1. Group files by parent folder
    2. If folders <= target: give 1 to each, then distribute remainder proportionally
    3. If folders > target: sample target folders, take 1 from each
    """
    if not files or target_count <= 0:
        return []

    if len(files) <= target_count:
        return files

    folders = group_by_folder(files)
    folder_names = list(folders.keys())
    rng = random.Random(seed)
    selected = []

    if len(folder_names) <= target_count:
        # Give 1 to each folder, then distribute remainder proportionally
        remaining = target_count
        for folder in folder_names:
            folder_files = folders[folder]
            take = min(1, len(folder_files), remaining)
            chosen = rng.sample(folder_files, take)
            selected.extend(chosen)
            remaining -= take

        if remaining > 0:
            unselected = [f for f in files if f not in selected]
            if unselected:
                # Weight by folder size for proportional distribution
                unselected_folders = group_by_folder(unselected)
                weights = []
                candidates = []
                for folder, ffiles in unselected_folders.items():
                    weights.extend([len(ffiles)] * len(ffiles))
                    candidates.extend(ffiles)
                if candidates:
                    # Simple weighted sampling without replacement
                    # Use reservoir sampling weighted by folder size
                    total_weight = sum(weights)
                    picked = set()
                    attempts = 0
                    while len(picked) < remaining and attempts < remaining * 10:
                        idx = rng.choices(range(len(candidates)), weights=weights, k=1)[0]
                        picked.add(idx)
                        attempts += 1
                    # Fallback: if weighted sampling didn't fill, pick randomly
                    if len(picked) < remaining:
                        remaining_indices = set(range(len(candidates))) - picked
                        needed = remaining - len(picked)
                        picked.update(rng.sample(list(remaining_indices), min(needed, len(remaining_indices))))
                    for idx in picked:
                        selected.append(candidates[idx])
    else:
        # More folders than target: sample target folders, take 1 from each
        chosen_folders = rng.sample(folder_names, target_count)
        for folder in chosen_folders:
            folder_files = folders[folder]
            take = min(1, len(folder_files))
            chosen = rng.sample(folder_files, take)
            selected.extend(chosen)

    return selected


def estimate_photo_count_for_size(max_size_mb: int, avg_web_size_kb: int = 100) -> int:
    """Estimate how many web-optimised photos fit in a zip of given size."""
    # Zip compression on JPEGs is minimal (~5-10%), so estimate conservatively
    max_size_kb = max_size_mb * 1000
    return max(1, int(max_size_kb / avg_web_size_kb))


def resize_image(src: Path, dst: Path, max_dim: int, quality: int, fmt: str = "JPEG"):
    """Resize an image to fit within max_dim while preserving aspect ratio."""
    with Image.open(src) as img:
        # Convert to RGB if necessary
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        elif img.mode == "I;16":
            img = img.point(lambda i: i * (1 / 256)).convert("L").convert("RGB")
        elif img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Resize if larger than max_dim
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
    archive_root: Path,
):
    """Process a single collection: sample, resize, zip."""
    target_count = estimate_photo_count_for_size(max_zip_size_mb)
    sampled = sample_evenly(files, target_count)

    print(f"  Collection {collection_id}: found {len(files)} photos, sampled {len(sampled)}")

    if not sampled:
        return None

    coll_dir = output_dir / collection_id
    web_dir = coll_dir / "web"
    thumb_dir = coll_dir / "thumbs"

    # Ensure directories exist
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
        # Use the relative path (with slashes) as the identifier
        safe_name = rel_path.replace("/", "__").replace("\\\\", "__")
        base_name = Path(safe_name).stem + ".jpg"

        web_path = web_dir / base_name
        thumb_path = thumb_dir / base_name
        src_path = archive_root / rel_path

        try:
            resize_image(src_path, web_path, web_max_dim, quality)
            resize_image(src_path, thumb_path, thumb_max_dim, quality)
        except Exception as e:
            print(f"    Warning: failed to resize {rel_path}: {e}")
            continue

        manifest["photos"].append({
            "path": rel_path,
            "web": f"web/{base_name}",
            "thumb": f"thumbs/{base_name}",
        })

    # Write manifest
    manifest_path = coll_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    # Create zip
    zip_path = output_dir / f"photos-{collection_id}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in manifest["photos"]:
            web_file = web_dir / Path(item["web"]).name
            thumb_file = thumb_dir / Path(item["thumb"]).name
            if web_file.exists():
                zf.write(web_file, arcname=item["web"])
            if thumb_file.exists():
                zf.write(thumb_file, arcname=item["thumb"])
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
    parser.add_argument("--datasets-json", default="catalog/datasets.json", help="Path to datasets.json")
    parser.add_argument("--max-zip-size-mb", type=int, default=10, help="Target max zip size in MB")
    parser.add_argument("--web-max-dim", type=int, default=1200, help="Max dimension for web images")
    parser.add_argument("--thumb-max-dim", type=int, default=300, help="Max dimension for thumbnails")
    parser.add_argument("--quality", type=int, default=80, help="JPEG quality (1-100)")
    parser.add_argument("--collections", help="Comma-separated collection IDs (default: all)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducible sampling")
    parser.add_argument("--dry-run", action="store_true", help="Print stats without generating files")
    parser.add_argument("--source-paths", help="Comma-separated source paths to scan (relative to archive-root)")
    parser.add_argument("--min-size-kb", type=int, default=200, help="Minimum file size in KB for images (smaller files skipped, default 200)")

    args = parser.parse_args()

    # Parse source paths if provided
    source_paths = None
    if args.source_paths:
        source_paths = [p.strip() for p in args.source_paths.split(",")]

    archive_root = Path(args.archive_root)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    datasets = load_datasets(args.datasets_json)

    # Determine which collections to process
    all_ids = [ds["id"] for ds in datasets if ds["id"] != "archive-inventory"]
    if args.collections:
        target_ids = [s.strip() for s in args.collections.split(",")]
        invalid = set(target_ids) - set(all_ids + ["uncategorized"])
        if invalid:
            print(f"Error: unknown collection IDs: {invalid}")
            sys.exit(1)
    else:
        target_ids = all_ids + ["uncategorized"]

    print(f"Scanning {archive_root} for image files...")
    all_images = find_image_files(str(archive_root), source_paths, min_size_bytes=args.min_size_kb * 1024)
    print(f"Found {len(all_images)} image files")

    if not all_images:
        print("No image files found.")
        return

    # Assign to collections
    by_collection = defaultdict(list)
    for img in all_images:
        coll = assign_collection(img["relative"], datasets)
        by_collection[coll].append(img)

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
            sampled = sample_evenly(files, target_count, args.seed)
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
            archive_root,
        )
        if result:
            results.append(result)

    # Write summary
    summary_path = output_dir / "summary.json"
    with open(summary_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nDone. Output in {output_dir}")


if __name__ == "__main__":
    main()
