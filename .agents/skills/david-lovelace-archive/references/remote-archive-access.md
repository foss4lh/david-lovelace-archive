# Remote Archive Access via SSH

When the local external USB drive (`foss4lh`) is not available, the clean archive on **openclaw** can be accessed directly via SSH.

## Connection

```bash
ssh openclaw
# User: clausrl (added to robin,david groups for archive file access)
```

## Archive Location

```
/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45/david-lovelace-archive-clean/
```

## Structure

The clean archive reorganises the raw USB drive's directory tree:

| Raw USB (foss4lh)            | Clean Archive (openclaw)                  |
| ---------------------------- | ----------------------------------------- |
| `History/NMRC_RC/KingsCaple` | `historical-documents/NMRC_RC/KingsCaple` |
| `Maps/TitheMapsOriginals/`   | `maps/`                                   |
| `History/HCA/`               | `historical-documents/HCA/`               |
| `History/HRO/`               | `historical-documents/HRO/`               |
| `AirPhotos/`                 | `aerial-photography/`                     |

## Common Tasks

### List a collection directory

```bash
ls /mnt/fe20e9cd-*/david-lovelace-archive-clean/historical-documents/NMRC_RC/
```

### Create an ad-hoc zip of one location

```bash
cd /mnt/fe20e9cd-*/david-lovelace-archive-clean/historical-documents/NMRC_RC/KingsCaple
zip -j ~/<name>.zip *.jpg *.JPG
```

### Upload zip as GitHub Release asset directly from openclaw

`gh` CLI is installed and authenticated on openclaw:

```bash
gh release upload <tag> ~/<name>.zip --clobber --repo foss4lh/david-lovelace-archive
```

### Upload a sample photo for issue embedding

```bash
cp IMG_XXXX.jpg ~/<name>.jpg
gh release upload <tag> ~/<name>.jpg --clobber --repo foss4lh/david-lovelace-archive
```

Then reference the asset URL in the issue body:

```markdown
![alt text](https://github.com/foss4lh/david-lovelace-archive/releases/download/<tag>/<name>.jpg)
```

### Copy a file locally (when needed for local tools)

```bash
scp openclaw:/mnt/fe20e9cd-*/david-lovelace-archive-clean/historical-documents/NMRC_RC/KingsCaple/IMG_0795.jpg /tmp/
```

## Prerequisites

- `sshpass` installed locally for non-interactive SSH (password known from session)
- `gh` on the remote machine (pre-installed at `/usr/local/bin/gh` on openclaw)
