# OpenClaw server notes

## Hardware

- Host: `dlovelace-Poseidon-ED04R9`
- CPU: Intel Core i9-12900 (16C/24T, 5.1 GHz max)
- RAM: 125 GiB
- Boot: 2 TB Samsung 980 PRO NVMe (`nvme0n1`) — `/` root
- Extra: 2 TB Crucial P2 NVMe (`nvme1n1`) — present, not mounted in this session
- Bulk data: 4 TB Samsung 870 QVO SATA (`sda`) — mounted at `/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45`, UUID `fe20e9cd-93ce-46c5-86be-cf2287573f45`
- GPU: Intel AlderLake-S GT1 (integrated)
- Uptime: 73+ days (observed 2026-06-01)

## Observed mounts

- `/` — `/dev/nvme0n1p2` ext4, 1.8 TB
- `/boot/efi` — vfat
- `/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45` — `/dev/sda1` ext4, 3.6 TB

## Users and path symlinks

- `clausrl` (uid=1003) — SSH connects as this user via `openclaw` alias
  - groups: clausrl, sudo, docker
  - needs to be added to `robin` and `david` groups for archive file access
- `robin` (uid=1001) — home → `/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45/robin/`
  - group: robin (gid=1002), also sudo, staff
- `david` (uid=unknown) — home → `/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45/david/`
- `dlovelace` (uid=1000) — home at `/home/dlovelace/` (not on the bulk data mount)

## Granting archive access to clausrl

```bash
# Add clausrl to the data-owner groups (takes effect on next login or newgrp)
sudo usermod -aG robin,david clausrl

# Verify
id clausrl  # should show 1002(robin), 1003(david)
```

## Tooling setup

```bash
# Required tools for archive migration
pip3 install duckdb
sudo apt-get install -y rdfind

# Standalone DuckDB CLI (for shell scripting)
wget -q https://github.com/duckdb/duckdb/releases/download/v1.1.3/duckdb_cli-linux-amd64.zip
unzip -qo duckdb_cli-linux-amd64.zip
sudo mv duckdb /usr/local/bin/duckdb

# zstd is usually pre-installed
zstd --version
```

## Archive destination

- Clean archive: `/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45/david-lovelace-archive-clean/`
- DuckDB catalog: `catalog/archive.db`
- Archive policy: `catalog/archive-policy.yaml`
- Migration log: `catalog/migration-log.txt`

## Remote access from local machine

- SSH alias: `openclaw` (hostname resolves via mDNS or /etc/hosts)
- Password auth: known password in session (do not store in skill)
- sshpass install: `sudo apt-get install sshpass`
- Then: `sshpass -p '<password>' ssh -o StrictHostKeyChecking=no openclaw <command>`
