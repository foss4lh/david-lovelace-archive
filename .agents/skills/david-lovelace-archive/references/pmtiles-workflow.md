# Raster-to-PMTiles Pipeline

Complete workflow for converting georeferenced raster files (ECW, GeoTIFF) into web-serving PMTiles archives.

## Overview

```
ECW/TIFF (georeferenced) → gdal2tiles.py (Docker) → XYZ tile pyramid → compute_bounds.py → PMTiles → GitHub Release → build.sh download → Netlify deploy
```

## Step 1 — Verify ECW driver is available

ECW support requires a special GDAL build. Stock OS GDAL cannot read ECW files.

```bash
# Check GDAL ECW support
docker run --rm ginetto/gdal:2.4.4_ECW gdalinfo --formats | grep ECW
# Expected output:
#   ECW -raster- (rw+): ERDAS Compressed Wavelets (SDK 5.4)
#   JP2ECW -raster,vector- (rw+v): ERDAS JPEG2000 (SDK 5.4)
```

**Docker image:** `ginetto/gdal:2.4.4_ECW` (do NOT use OS-installed GDAL for ECW files)

If not available, pull it first:

```bash
docker pull ginetto/gdal:2.4.4_ECW
```

## Step 2 — Find georeferenced rasters

ECW files in the archive that are georeferenced:

- `Maps/*.ecw` — ~345 files, many georeferenced
- `Maps/GG_TitheMaps/` — 126 JPGs (NOT georeferenced), 2 ECWs
- `Maps/1880_25inch_NLS/` — custom binary format, needs investigation

JPGs in `GG_resampled/` are plain scans — no georeferencing.

To inspect an ECW:

```bash
docker run --rm \
  -v /media/robin/foss4lh/david-lovelace-archive/Maps:/data:ro \
  ginetto/gdal:2.4.4_ECW \
  gdalinfo /data/WhitbTM.ecw
```

Look for `PROJCS[\"British National Grid\"]` or similar coordinate reference in output.

## Step 3 — Generate XYZ tiles with gdal2tiles.py

```bash
docker run --rm \
  -v /path/to/archive:/data:ro \
  -v /tmp/output_tiles:/out \
  ginetto/gdal:2.4.4_ECW \
  gdal2tiles.py \
    -p mercator \
    -s EPSG:27700 \
    -z 10-16 \
    --processes 4 \
    -v \
    /data/INPUTFILE.ecw \
    /out
```

Parameters:

- `-p mercator` — Web Mercator projection (standard for web mapping)
- `-s EPSG:27700` — Source SRS (British National Grid for UK historic maps; use `EPSG:4326` for lat/lon data)
- `-z 10-16` — Zoom range (adjust based on source resolution; 10-16 covers most historical maps)
- `--processes 4` — Parallel tile generation

Output: `/tmp/output_tiles/` with structure `z/x/y.png` (747 tiles for Whitby at this zoom range).

## Step 4 — Compute geographic bounds

The tile indices (z/x/y) encode geographic position. Compute bounds from them:

```bash
python3 compute_bounds.py /tmp/output_tiles --min-zoom 10 --max-zoom 16
```

Output includes:

- Tile count, zoom range
- `Bounds string: min_lon,min_lat,max_lon,max_lat` (for metadata.json)
- `Center: lon,lat,zoom` (for metadata.json)

**Important:** `compute_bounds.py` expects TMS Y coordinates (tile index from top-left origin). gdal2tiles outputs y as raw tile index (not TMS-flipped). The script handles this — but if writing a custom converter, remember the flip: `tms_y = (1 << z) - 1 - raw_y`.

### compute_bounds.py — key formulas

```python
def tile_to_lat(z, tms_y):
    n = math.pi - (2.0 * math.pi * tms_y) / (1 << z)
    return (180.0 / math.pi) * math.atan(0.5 * (math.exp(n) - math.exp(-n)))

def tile_to_lon(z, x):
    return (x / (1 << z)) * 360.0 - 180.0
```

## Step 5 — Create metadata.json

In the tile directory, create `metadata.json`:

```json
{
  \"name\": \"Dataset Name\",
  \"description\": \"Description — source file used\",
  \"version\": \"1.0\",
  \"format\": \"jpeg\",
  \"minzoom\": 10,
  \"maxzoom\": 16,
  \"bounds\": \"-2.510,52.238,-2.368,52.174\",
  \"center\": \"-2.439,52.206,14\"
}
```

`format` should match the tile images — `png` if gdal2tiles generated PNG (default), `jpeg` if you converted.

## Step 6 — Convert XYZ to PMTiles

Using Python pmtiles package:

```python
import sys, os, json
from pathlib import Path
from pmtiles.tile import TileType, zxy_to_tileid, Compression
from pmtiles.writer import write as pmtiles_write

tile_dir = Path(\"/path/to/tiles\")
output = \"/path/to/output/dataset.pmtiles\"

with open(tile_dir / \"metadata.json\") as f:
    metadata = json.load(f)

tile_ext = \".png\"  # gdal2tiles default

# Collect all tiles sorted by tileid
tileid_path_pairs = []
for z_dir in sorted(tile_dir.iterdir(), key=lambda p: int(p.name) if p.name.isdigit() else 0):
    if not z_dir.name.isdigit(): continue
    z = int(z_dir.name)
    for x_dir in sorted(z_dir.iterdir(), key=lambda p: int(p.name) if p.name.isdigit() else 0):
        if not x_dir.name.isdigit(): continue
        x = int(x_dir.name)
        for tile_file in x_dir.iterdir():
            if tile_file.suffix.lower() == tile_ext:
                y = int(tile_file.stem)
                tileid_path_pairs.append((zxy_to_tileid(z, x, y), tile_file))

tileid_path_pairs.sort(key=lambda x: x[0])

# Write PMTiles
with pmtiles_write(output) as writer:
    for tileid, tile_path in tileid_path_pairs:
        with open(tile_path, 'rb') as f:
            writer.write_tile(tileid, f.read())

    bounds_str = metadata['bounds']
    min_lon, min_lat, max_lon, max_lat = [float(x.strip()) for x in bounds_str.split(',')]
    center_str = metadata['center']
    center_lon, center_lat, center_z = [float(x.strip()) for x in center_str.split(',')]

    header = {
        'min_zoom': int(metadata['minzoom']),
        'max_zoom': int(metadata['maxzoom']),
        'min_lon_e7': int(min_lon * 1e7),
        'min_lat_e7': int(min_lat * 1e7),
        'max_lon_e7': int(max_lon * 1e7),
        'max_lat_e7': int(max_lat * 1e7),
        'tile_type': TileType.PNG,  # or TileType.JPEG
        'tile_compression': Compression.NONE,
        'internal_compression': Compression.NONE,
        'clustered': True,
        'center_zoom': 12,
        'center_lon_e7': int(center_lon * 1e7),
        'center_lat_e7': int(center_lat * 1e7),
    }
    writer.finalize(header, metadata)

print(f\"Done: {os.path.getsize(output)/1024/1024:.1f} MB\")
```

**Key pitfall:** `tile_compression` and `internal_compression` must be `Compression.NONE` enum, NOT integer `0`. Using an integer causes `AttributeError: 'int' object has no attribute 'value'` during header serialization.

## Step 7 — Verify the PMTiles

```bash
/tmp/pmtiles show dataset.pmtiles
```

Expected output:

```
npmtiles spec version: 3
tile type: png
bounds: (long: -2.510376, lat: 52.173932) (long: -2.367554, lat: 52.237892)
min zoom: 10
max zoom: 16
center: (long: -2.438965, lat: 52.205912)
addressed tiles count: 747
tile entries count: 721
tile contents count: 694
```

Bounds should show positive latitude for UK (~52°), not negative (-52).

## Step 8 — Upload to GitHub Release

```bash
cd ~/github/foss4lh/hfd-landscape-explorer
gh release create v0.2.0 /path/to/dataset.pmtiles \
  --title \"Dataset Name PMTiles v0.2.0\" \
  --notes \"Generated from SOURCE.ecw\"
```

Download URL format:

```
https://github.com/foss4lh/hfd-landscape-explorer/releases/download/v0.2.0/dataset.pmtiles
```

## Step 9 — Integrate into web app

1. Copy PMTiles to `hfd-landscape-explorer/public/dataset.pmtiles`
2. In `App.svelte`:

```svelte
import { PMTilesRasterSource } from 'ol-pmtiles';

const myDataset = new PMTilesRasterSource({
    url: 'dataset.pmtiles',
    attributions: '© David Lovelace Archive — Dataset Name',
    tileSize: 256
});

const datasets = [
    // ...
    {id:'dataset', name:'Dataset Name', year:1947, region:'Hereford', parish:'Parish',
     source: myDataset, center:[-2.439,52.206], zoom:12},
];
```

3. Per-dataset zoom centers — update `onSelectDataset` and `onZoom` to use `ds.center` and `ds.zoom` fallback:

```javascript
function onZoom(ds) {
	if (!ds.source || !zoomToDataset) return;
	c = fromLonLat(ds.center || [-2.72, 52.08]);
	z = ds.zoom || 12;
}
```

## gdal2tiles output format

gdal2tiles.py outputs **PNG tiles by default**, regardless of source format. To get JPEG tiles:

```bash
gdal_translate -of JPEG -co COMPRESS=JPEG /data/input.ecw /tmp/input.jpg
gdal2tiles.py -p mercator -s EPSG:27700 -z 10-16 /tmp/input.jpg /out
```

Or use VRT to convert on-the-fly.

## Dataset discovery

Key datasets in the archive (as of 2026-05-10):

| Dataset         | Location                                     | Georeferenced    | Format        | Notes                                                       |
| --------------- | -------------------------------------------- | ---------------- | ------------- | ----------------------------------------------------------- |
| Whitby Tithe    | `Maps/WhitbTM.ecw`                           | Yes (EPSG:27700) | ECW           | Working example — 747 tiles, 45.9 MB PMTiles                |
| Rotherwas       | `Maps/Rotherwas.tif` (via previous pipeline) | Yes              | TIFF          | XYZ tiles in `public/tiles/rotherwas/`                      |
| GG_TitheMaps    | `Maps/GG_TitheMaps/GG_resampled/*.jpg`       | No — plain scans | JPEG          | No georeferencing; need ECW versions or manual georeference |
| 1880 25inch NLS | `Maps/1880_25inch_NLS/jpg_rs/*.alv`          | Unknown          | Custom binary | `.alv` format — investigate further                         |
| ECW collection  | `Maps/*.ecw` (~345 files)                    | Many yes         | ECW           | Main georeferenced source; use Docker with ECW driver       |
