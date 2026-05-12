# Data Policy

The archive is large and mixed-format. The repository must stay small, reproducible, and safe to clone.

## Do Commit

- Source code.
- Dataset and release manifests.
- Documentation.
- Small thumbnails or examples when useful.
- Scripts that reproduce derived outputs.

## Do Not Commit

- Raw archive folders.
- Camera raw files.
- Large TIFF/ECW/PSD/MAP files.
- Generated tile pyramids.
- Downloaded PMTiles, COGs, or large data bundles.

## Derived Asset Targets

Use these formats unless there is a good reason not to:

- Raster maps: PMTiles or COG.
- Web previews: JPEG or WebP.
- Vector GIS: GeoPackage for full data, simplified GeoJSON for browser use.
- Tables: CSV for accessibility, Parquet where size and types matter.
- Bundles: zip or tar.gz release assets.

Every public asset should have a catalog record with source path, status, known limitations, and next steps.
