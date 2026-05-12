#!/usr/bin/env python3
"""
Convert ECW raster files to PMTiles archives.

Pipeline (per file):
  1. gdalwarp (via Docker ginetto/gdal:2.4.4_ECW) reprojects ECW -> Web Mercator GeoTIFF
  2. rio mbtiles creates an MBTiles SQLite database directly from the GeoTIFF
  3. pmtiles convert turns the MBTiles into a single PMTiles file

Requires:
  - Docker
  - rio-mbtiles (pip install rio-mbtiles)
  - pmtiles CLI (https://github.com/protomaps/go-pmtiles)

Single-file usage:
  python3 scripts/convert-ecw-to-pmtiles.py \
      /media/robin/foss4lh1/david-lovelace-archive/Maps/FC1953ecw/C13_14_20_21.ecw \
      static/data/fc1953-c13.pmtiles \
      --zoom 10-14

Batch usage (process all ECWs in a directory):
  python3 scripts/convert-ecw-to-pmtiles.py \
      /media/robin/foss4lh1/david-lovelace-archive/Maps/FC1953ecw/ \
      static/data/ \
      --zoom 10-14 \
      --batch
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def run(cmd, **kwargs):
    print(f"  $ {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, check=True, capture_output=True, text=True, **kwargs)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result


def docker_gdal(cmd, volumes=None):
    """Run a command inside the ginetto/gdal:2.4.4_ECW Docker image."""
    docker_cmd = [
        "docker", "run", "--rm",
        "-u", f"{os.getuid()}:{os.getgid()}",
    ]
    if volumes:
        for host, container in volumes.items():
            docker_cmd.extend(["-v", f"{host}:{container}"])
    docker_cmd.append("ginetto/gdal:2.4.4_ECW")
    docker_cmd.extend(cmd)
    return run(docker_cmd)


def reproject_ecw(input_ecw, output_tiff):
    """Reproject ECW to Web Mercator GeoTIFF via Docker gdalwarp."""
    print(f"[reproject] {Path(input_ecw).name} -> Web Mercator …")
    in_dir = os.path.dirname(input_ecw)
    out_dir = os.path.dirname(output_tiff)
    in_name = os.path.basename(input_ecw)
    out_name = os.path.basename(output_tiff)
    docker_gdal(
        [
            "gdalwarp",
            "-t_srs", "EPSG:3857",
            "-of", "GTiff",
            "-co", "TILED=YES",
            "-co", "COMPRESS=DEFLATE",
            f"/data_in/{in_name}",
            f"/data_out/{out_name}",
        ],
        volumes={in_dir: "/data_in", out_dir: "/data_out"},
    )


def geotiff_to_mbtiles(input_tiff, output_mbtiles, zoom_range, title=None):
    """Tile GeoTIFF directly into an MBTiles database via rio mbtiles."""
    print(f"[mbtiles]   tiling (zoom {zoom_range}) …")
    min_z, max_z = zoom_range.split("-")
    cmd = [
        "rio", "mbtiles",
        "-o", output_mbtiles,
        "--format", "PNG",
        "--zoom-levels", f"{min_z}..{max_z}",
        "--exclude-empty-tiles",
        "-j", str(min(4, os.cpu_count() or 4)),
        "--progress-bar",
        input_tiff,
    ]
    if title:
        cmd.extend(["--title", title])
    run(cmd)


def mbtiles_to_pmtiles(mbtiles_path, pmtiles_path):
    """Convert MBTiles -> PMTiles using the go-pmtiles CLI."""
    print(f"[pmtiles]   converting …")
    pmtiles_cli = os.environ.get("PMTILES_CLI", "pmtiles")
    run([pmtiles_cli, "convert", mbtiles_path, pmtiles_path])


def convert_single(input_ecw, output_pmtiles, zoom_range, work_dir=None, keep_work_dir=False):
    """Convert a single ECW file to PMTiles."""
    input_ecw = os.path.abspath(input_ecw)
    output_pmtiles = os.path.abspath(output_pmtiles)

    if not os.path.exists(input_ecw):
        raise FileNotFoundError(f"Input file not found: {input_ecw}")

    work = work_dir or tempfile.mkdtemp(prefix="ecw2pmtiles_")
    work = os.path.abspath(work)
    os.makedirs(work, exist_ok=True)

    name = os.path.splitext(os.path.basename(input_ecw))[0]
    tiff_path = os.path.join(work, f"{name}_3857.tif")
    mbtiles_path = os.path.join(work, f"{name}.mbtiles")

    try:
        reproject_ecw(input_ecw, tiff_path)
        geotiff_to_mbtiles(tiff_path, mbtiles_path, zoom_range, title=name)
        mbtiles_to_pmtiles(mbtiles_path, output_pmtiles)

        print(f"  done -> {output_pmtiles}")
        pmtiles_cli = os.environ.get("PMTILES_CLI", "pmtiles")
        run([pmtiles_cli, "show", output_pmtiles])

    finally:
        if not keep_work_dir and not work_dir:
            shutil.rmtree(work, ignore_errors=True)


def batch_convert(input_dir, output_dir, zoom_range, keep_work_dir=False):
    """Convert all .ecw files in a directory to PMTiles."""
    input_dir = os.path.abspath(input_dir)
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    ecw_files = sorted(Path(input_dir).glob("*.ecw")) + sorted(Path(input_dir).glob("*.ECW"))
    if not ecw_files:
        print(f"No ECW files found in {input_dir}")
        return

    print(f"Found {len(ecw_files)} ECW file(s) in {input_dir}")
    success = 0
    failed = 0

    for ecw_path in ecw_files:
        output_name = f"{ecw_path.stem}.pmtiles"
        output_path = os.path.join(output_dir, output_name)
        print(f"\n{'=' * 60}")
        print(f"Processing {ecw_path.name} ({success + failed + 1}/{len(ecw_files)})")
        print(f"{'=' * 60}")

        try:
            convert_single(str(ecw_path), output_path, zoom_range, keep_work_dir=keep_work_dir)
            success += 1
        except subprocess.CalledProcessError as e:
            print(f"ERROR processing {ecw_path.name}: {e}", file=sys.stderr)
            failed += 1
        except Exception as e:
            print(f"ERROR processing {ecw_path.name}: {e}", file=sys.stderr)
            failed += 1

    print(f"\n{'=' * 60}")
    print(f"Batch complete: {success} succeeded, {failed} failed out of {len(ecw_files)}")
    print(f"{'=' * 60}")
    if failed:
        sys.exit(1)


def check_dependencies():
    """Verify all required tools are available."""
    missing = []

    if not shutil.which("docker"):
        missing.append("docker")
    if not shutil.which("rio"):
        missing.append("rio (rasterio)")
    else:
        try:
            subprocess.run(["rio", "mbtiles", "--help"], check=True, capture_output=True)
        except subprocess.CalledProcessError:
            missing.append("rio-mbtiles (pip install rio-mbtiles)")

    pmtiles_cli = os.environ.get("PMTILES_CLI", shutil.which("pmtiles") or "pmtiles")
    if not shutil.which(pmtiles_cli):
        missing.append("pmtiles CLI (https://github.com/protomaps/go-pmtiles)")

    if missing:
        sys.exit(f"ERROR: Missing required tools:\n  - " + "\n  - ".join(missing))


def main():
    parser = argparse.ArgumentParser(
        description="Convert ECW raster(s) to PMTiles",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Single file:
    %(prog)s input.ecw output.pmtiles --zoom 10-14

  Batch directory:
    %(prog)s /path/to/ecws/ /path/to/output/ --zoom 10-14 --batch
        """
    )
    parser.add_argument("input", help="Input ECW file or directory")
    parser.add_argument("output", help="Output .pmtiles file or directory")
    parser.add_argument("--zoom", default="10-14", help="Zoom range for tiling, e.g. 10-14")
    parser.add_argument("--batch", action="store_true", help="Batch-process all .ecw files in input directory")
    parser.add_argument("--work-dir", default=None, help="Temp working directory (default: auto)")
    parser.add_argument("--keep-work-dir", action="store_true", help="Keep intermediate files for inspection")
    args = parser.parse_args()

    check_dependencies()

    if args.batch:
        batch_convert(args.input, args.output, args.zoom, keep_work_dir=args.keep_work_dir)
    else:
        convert_single(args.input, args.output, args.zoom, work_dir=args.work_dir, keep_work_dir=args.keep_work_dir)


if __name__ == "__main__":
    main()
