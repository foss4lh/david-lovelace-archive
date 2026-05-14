# Release Checklist

Use this before committing + pushing to catch issues early.

## Pre-Release Checks

### Sample & Manifest Generation

- [ ] Archive is mounted
- [ ] Sample command completed without errors
- [ ] Run: `npm run data:validate:photos` — must pass before any file updates
- [ ] Inspect manifest: `jq '.total_sampled, .quality' static/photos/demo/manifest.json`
- [ ] Photo count is reasonable (30–50 for ~5 MB constraint)

### File Coordination (5-File Sync)

Before editing, write down the new version identifier (e.g., v3, v4):

- [ ] **Version identifier locked in:** `_____________`

Then verify every reference below was updated consistently:

1. **package.json** (line ~13)
   - [ ] inventory:duckdb command uses new DuckDB filename

2. **src/lib/duckdb.ts** (lines ~28–29)
   - [ ] Fetch path matches DuckDB filename from package.json
   - [ ] Error message is updated

3. **catalog/datasets.json** (archive-inventory-duckdb entry)
   - [ ] releaseAsset.filename matches DuckDB filename
   - [ ] releaseAsset.url includes correct filename
   - [ ] localPath matches package.json output path
   - [ ] remoteUrl matches releaseAsset.url

4. **catalog/releases.json** (photo-bundle entry)
   - [ ] Asset id is unique + lowercase (e.g., photos-5-demo)
   - [ ] filename matches id + .zip
   - [ ] url includes correct filename
   - [ ] title describes size/content (e.g., "5 MB demo bundle")

5. **scripts/release/validate-photo-release-assets.mjs** (line ~8)
   - [ ] PHOTO_ASSET_ID equals the id from catalog/releases.json

6. **catalog/photo-urls.json** (auto-generated)
   - [ ] File exists and is valid JSON
   - [ ] Photo count matches sampled manifest
   - [ ] URL paths reference correct static directory

### Local Validation

```bash
# Run in order; all must pass
npm run inventory:duckdb  # Rebuild with new photos
npm run data:validate:photos  # Check manifest vs. GitHub release
npm run format            # Auto-format code
npm run lint              # Prettier + ESLint
npm run check             # Svelte + TypeScript
npm run build             # Production build (downloads DuckDB from GitHub)
```

Checkboxes:

- [ ] `npm run inventory:duckdb` — ✓ no errors
- [ ] `npm run data:validate:photos` — ✓ manifest in sync
- [ ] `npm run format` — ✓ code reformatted
- [ ] `npm run lint` — ✓ no warnings/errors
- [ ] `npm run check` — ✓ no type errors
- [ ] `npm run build` — ✓ static site builds

### GitHub Release Upload

```bash
gh release view data-v0.1.0  # Verify tag exists
gh release upload data-v0.1.0 <files>  # Upload new assets
```

- [ ] DuckDB file uploaded (e.g., archive-v3.duckdb)
- [ ] Photo zip file uploaded (e.g., photos-5-demo.zip)
- [ ] `gh release view data-v0.1.0` shows both files listed

### Final Commit

```bash
git status  # Verify only expected files changed
git diff --stat  # Review scope of changes
```

- [ ] Modified files match the 5-file sync list above + static/photos/demo/
- [ ] No unexpected files (e.g., node_modules, .env, build/)
- [ ] Commit message references version + photo count

### Push & Monitor CI

```bash
git push origin main
gh run list --branch main --limit 1  # Get run ID
gh run view <run-id> --log  # Watch progress
```

- [ ] GitHub Actions run triggered
- [ ] data:validate:photos step passes
- [ ] lint step passes (no Prettier/ESLint errors)
- [ ] check step passes (TypeScript clean)
- [ ] build step passes
- [ ] Entire workflow shows conclusion = success

### Deploy Verification

After CI passes, Netlify deploys automatically (~1–2 minutes):

- [ ] Open https://david-lovelace-archive.netlify.app/photos
- [ ] Thumbnails load without errors
- [ ] Lightbox opens and displays new photos
- [ ] Photo count in manifest matches expected

---

## Common Mistakes to Avoid

| Mistake                                             | Impact                              | Prevention                                           |
| --------------------------------------------------- | ----------------------------------- | ---------------------------------------------------- |
| Forget to upload release assets before pushing code | CI fails on data:validate:photos    | Check `gh release view data-v0.1.0` lists both files |
| Typo in PHOTO_ASSET_ID or release asset id          | Validator can't find asset          | Copy-paste from releases.json, don't type by hand    |
| Update duckdb.ts but not package.json version       | Old cached DuckDB loads at runtime  | Check both files reference same version              |
| Run data:validate:photos before uploading to GitHub | Fails waiting for asset             | Always upload first, then validate                   |
| Forget to format code before committing             | CI lint fails                       | Run `npm run format` before `git add`                |
| Partial file sync (update 4 of 5 files)             | Runtime errors or download failures | Use this checklist every time                        |
| Push without local validation                       | Wastes CI time, blocks deployment   | Run full `npm run` pipeline locally first            |

---

## After-Release Steps

Once live deployment confirmed ✓:

1. **Tag release in GitHub:**

   ```bash
   git tag -a release/photos-5-demo -m "Release photos-5-demo bundle"
   git push origin release/photos-5-demo
   ```

2. **Update project news/log** (if applicable)
   - Add release date to CHANGELOG.md
   - Note photo count, size, quality settings

3. **Backlog next release:**
   - Log sampling metadata (total scanned, selected, collection)
   - Note any issues encountered for future improvement
   - Propose next automation targets
