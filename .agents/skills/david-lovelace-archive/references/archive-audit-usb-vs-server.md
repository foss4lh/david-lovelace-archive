# Archive Audit — USB vs Server Comparison

When the user asks whether all data has been migrated from the USB drive to
openclaw, compare top-level directories on both:

## Drive locations

| Source                   | Path                                            |
| ------------------------ | ----------------------------------------------- |
| USB drive (foss4lh)      | `/media/robin/foss4lh/david-lovelace-archive/`  |
| Clean archive (openclaw) | `/mnt/fe20e9cd-*/david-lovelace-archive-clean/` |

## Known mapping

| USB folder         | Openclaw folder                     | Status                   |
| ------------------ | ----------------------------------- | ------------------------ |
| `AirPhotos/`       | `aerial-photography/`               | ✅                       |
| `Habitat/`         | `habitat-surveys/`                  | ✅                       |
| `HARC/`            | `harc-records/`                     | ✅                       |
| `Maps/`            | `maps/`                             | ✅                       |
| `History/`         | `historical-documents/`             | ✅ (partial)             |
| `Images/`          | `projects/source-zips/Images.zip`   | ⚠️ zipped, not extracted |
| `Places.zip`       | `projects/source-zips/Places.zip`   | ⚠️ zipped, not extracted |
| `Projects.zip`     | `projects/source-zips/Projects.zip` | ⚠️ zipped, not extracted |
| `file-info-names/` | ❌ not on openclaw                  | copy needed              |

## Veteran tree survey (LOWVP)

7,129 JPG files inside `Projects.zip` under:
`Projects/Vet trees Project/Photos LOWVP Veteran Tree Survey 2006-2007/`

Across 30+ parishes. Kings Caple has 16 photos in 3 grid squares:
SO5528, SO5529-Aramstone-KO, SO5628-KO.

Extraction: `unzip -n ...Projects.zip -d projects/vet-trees/`

## Extraction notes

- `Projects.zip`: 668 GB on openclaw, 717 GB on USB (49 GB delta — may have
  been copied before USB was updated)
- Extractions are slow via `unzip` on spinning rust — use `nohup` and check
  progress with `ps aux | grep unzip`
- `Images.zip`: small (115 MB, 116 files)
- `Places.zip`: 145 GB, 5,400+ files

## Auto-mount USB drive

Add to `/etc/fstab`:

```
UUID=9428-3002  /media/robin/foss4lh  exfat  defaults,nofail,uid=1000,gid=1000  0  2
```
