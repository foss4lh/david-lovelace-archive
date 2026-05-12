#!/usr/bin/env python3
"""
Convert an ECW raster file to a PMTiles archive.

Pipeline:
  1. gdalwarp (via Docker ginetto/gdal:2.4.4_ECW) reprojects ECW -> Web Mercator GeoTIFF
  2. gdal2tiles.py (via Docker) generates XYZ PNG tiles
  3. mb-util packs the XYZ directory into an MBTiles SQLite database
  4. A metadata fix-up step injects correct bounds/zoom/format into the MBTiles
  5. pmtiles convert turns the MBTiles into a single PMTiles file

Requires:
  - Docker
  - mbutil   (pip install mbutil)
  - pmtiles CLI (https://github.com/protomaps/go-pmtiles)

Usage:
  python3 scripts/convert-ecw-to-pmtiles.py \
      /media/robin/foss4lh1/david-lovelace-archive/Maps/FC1953ecw/C13_14_20_21.ecw \
      static/data/fc1953-c13.pmtiles \
      --zoom 10-14
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET


def run(cmd, **kwargs):
    print(f"  $ {' '.join(cmd)}")
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


def reproject_ecw(input_ecw, output_tiff, zoom_range):
    """Step 1: gdalwarp ECW -> Web Mercator GeoTIFF."""
    print(f"[1/5] Reprojecting {input_ecw} to Web Mercator …")
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


def generate_tiles(input_tiff, tiles_dir, zoom_range):
    """Step 2: gdal2tiles.py generates PNG tiles in a directory tree."""
    print(f"[2/5] Generating XYZ tiles (zoom {zoom_range}) …")
    in_dir = os.path.dirname(input_tiff)
    in_name = os.path.basename(input_tiff)
    docker_gdal(
        [
            "gdal2tiles.py",
            "-z", zoom_range,
            "-x",                      # exclude fully transparent tiles
            "--processes", "4",
            f"/data_in/{in_name}",
            "/data_out/",
        ],
        volumes={in_dir: "/data_in", tiles_dir: "/data_out"},
    )


def fix_mbtiles_metadata(mbtiles_path, tiles_dir, name):
    """Step 4: Inject correct bounds, center, zooms and format from tilemapresource.xml."""
    import sqlite3

    xml_path = os.path.join(tiles_dir, "tilemapresource.xml")
    if not os.path.exists(xml_path):
        raise FileNotFoundError(f"Missing {xml_path}; gdal2tiles must have failed")

    tree = ET.parse(xml_path)
    root = tree.getroot()

    bbox = root.find("BoundingBox")
    minx = float(bbox.get("minx"))
    miny = float(bbox.get("miny"))
    maxx = float(bbox.get("maxx"))
    maxy = float(bbox.get("maxy"))

    tilesets = root.find("TileSets")
    zooms = [int(ts.get("order")) for ts in tilesets.findall("TileSet")]
    minzoom = min(zooms)
    maxzoom = max(zooms)
    center_x = (minx + maxx) / 2.0
    center_y = (miny + maxy) / 2.0

    conn = sqlite3.connect(mbtiles_path)
    cur = conn.cursor()

    # mbutil creates the metadata table automatically, but we need to upsert keys
    def upsert(key, value):
        cur.execute("DELETE FROM metadata WHERE name = ?", (key,))
        cur.execute("INSERT INTO metadata (name, value) VALUES (?, ?)", (key, value))

    upsert("name", name)
    upsert("format", "png")
    upsert("bounds", f"{minx},{miny},{maxx},{maxy}")
    upsert("center", f"{center_x},{center_y},{minzoom}")
    upsert("minzoom", str(minzoom))
    upsert("maxzoom", str(maxzoom))
    upsert("attribution", "David Lovelace Archive")
    upsert("type", "overlay")
    upsert("version", "1")
    upsert("description", f"Raster tiles derived from {name}")

    conn.commit()
    conn.close()
    print(f"  Updated MBTiles metadata: bounds={minx},{miny},{maxx},{maxy}  zoom={minzoom}-{maxzoom}")


def mbtiles_to_pmtiles(mbtiles_path, pmtiles_path):
    """Step 5: Convert MBTiles -> PMTiles using the go-pmtiles CLI."""
    print(f"[5/5] Converting MBTiles -> PMTiles …")
    pmtiles_cli = os.environ.get("PMTILES_CLI", "pmtiles")
    run([pmtiles_cli, "convert", mbtiles_path, pmtiles_path])


def main():
    parser = argparse.ArgumentParser(description="Convert an ECW raster to PMTiles")
    parser.add_argument("input_ecw", help="Path to input .ecw file")
    parser.add_argument("output_pmtiles", help="Path to output .pmtiles file")
    parser.add_argument("--zoom", default="10-14", help="Zoom range for tiling, e.g. 10-14")
    parser.add_argument("--work-dir", default=None, help="Temp working directory (default: auto)")
    parser.add_argument("--keep-work-dir", action="store_true", help="Keep intermediate files for inspection")
    args = parser.parse_args()

    if not shutil.which("docker"):
        sys.exit("ERROR: Docker is required but not found in PATH")
    if not shutil.which("mb-util"):
        sys.exit("ERROR: mb-util is required. Install with: pip install mbutil")

    pmtiles_cli = os.environ.get("PMTILES_CLI", shutil.which("pmtiles") or "pmtiles")
    if not shutil.which(pmtiles_cli):
        sys.exit("ERROR: pmtiles CLI is required. See https://github.com/protomaps/go-pmtiles")

    input_ecw = os.path.abspath(args.input_ecw)
    output_pmtiles = os.path.abspath(args.output_pmtiles)
    zoom_range = args.zoom

    if not os.path.exists(input_ecw):
        sys.exit(f"ERROR: Input file not found: {input_ecw}")

    work_dir = args.work_dir or tempfile.mkdtemp(prefix="ecw2pmtiles_")
    work_dir = os.path.abspath(work_dir)
    os.makedirs(work_dir, exist_ok=True)

    name = os.path.splitext(os.path.basename(input_ecw))[0]
    tiff_path = os.path.join(work_dir, f"{name}_3857.tif")
    tiles_dir = os.path.join(work_dir, "tiles")
    os.makedirs(tiles_dir, exist_ok=True)
    mbtiles_path = os.path.join(work_dir, f"{name}.mbtiles")

    try:
        # Docker volume paths must be absolute directories
        reproject_ecw(input_ecw, tiff_path, zoom_range)
        generate_tiles(tiff_path, tiles_dir, zoom_range)

        print("[3/5] Packing tiles into MBTiles …")
        run(["mb-util", tiles_dir, mbtiles_path])

        fix_mbtiles_metadata(mbtiles_path, tiles_dir, name)
        mbtiles_to_pmtiles(mbtiles_path, output_pmtiles)

        print(f"\nDone! Output: {output_pmtiles}")
        run([pmtiles_cli, "show", output_pmtiles])

    finally:
        if not args.keep_work_dir and not args.work_dir:
            print(f"\nCleaning up temporary working directory: {work_dir}")
            shutil.rmtree(work_dir, ignore_errors=True)
        else:
            print(f"\nKept working directory: {work_dir}")


if __name__ == "__main__":
    main()
