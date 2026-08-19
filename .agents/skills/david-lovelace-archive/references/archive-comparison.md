# USB vs Openclaw Archive Comparison (July 2026)

## Source drive

- Device: `/dev/sdb1` (5.5 TB WDC WD60NDZW, exfat, label `foss4lh`)
- UUID: `9428-3002`
- Mount: `/media/robin/foss4lh/`
- Archive root: `/media/robin/foss4lh/david-lovelace-archive/`

## Clean archive (openclaw)

- Path: `/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45/david-lovelace-archive-clean/`
- Total: 2.4 TB

## Per-collection comparison

| Collection                  | USB (source)                                 | Openclaw (clean)                     | Match? |
| --------------------------- | -------------------------------------------- | ------------------------------------ | ------ |
| `AirPhotos/` (55,014 files) | `aerial-photography/` (55,129 files)         | ✅ Close (115 diff)                  |
| `Habitat/` (7,915 files)    | `habitat-surveys/` (7,915 files)             | ✅ Exact                             |
| `HARC/`                     | `harc-records/`                              | ✅                                   |
| `Maps/`                     | `maps/`                                      | ✅                                   |
| `History/` (large)          | `historical-documents/`                      | ✅ Mostly                            |
| `Images/` (116 files, dir)  | `projects/source-zips/Images.zip` (115 MB)   | ⚠️ Unextracted                       |
| `Places.zip` (145 GB)       | `projects/source-zips/Places.zip` (145 GB)   | ⚠️ Unextracted                       |
| `Projects.zip` (717 GB)     | `projects/source-zips/Projects.zip` (668 GB) | ⚠️ Unextracted, **49 GB difference** |

## Known gaps

1. **`file-info-names/` directory** — not on openclaw at all (contains `file_list_c.txt` through `file_list_p.txt`)
2. **Projects.zip** — 49 GB smaller on openclaw (668 GB vs 717 GB). Files may have been added to USB after openclaw copy, or copy was interrupted.
3. **All three zips not extracted** — no extracted content from `Projects.zip`, `Places.zip`, or `Images.zip` on openclaw. Only the raw zips in `projects/source-zips/`.

## Content inside Projects.zip (not accessible via extracted files)

- `Projects/Vet trees Project/` — Veteran tree survey (LOWVP) with 16 Kings Caple photos
- `Projects/MHAONB/` — Malvern Hills AONB veteran tree surveys
- `Projects/LOWV/` — Lower Wye Valley project documents
- `Projects/Bringewood/` — Bringewood map time series images
- Many other project directories
