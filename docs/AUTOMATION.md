# Future Automation Roadmap

This document outlines proposals to reduce manual coordination and make the photo release workflow more robust as we scale to multiple collections and more frequent uploads.

## Current Manual Steps

The photo release workflow currently requires manual coordination across these steps:

1. **Sample photos** (Python script, ~5 mins)
2. **Generate manifest** (manual JSON export, ~2 mins)
3. **Update 5 configuration files** (error-prone copy-paste, ~10 mins)
   - package.json
   - src/lib/duckdb.ts
   - catalog/datasets.json
   - catalog/releases.json
   - scripts/release/validate-photo-release-assets.mjs
4. **Validate locally** (npm commands, ~3 mins)
5. **Commit + push + monitor** (git commands, variable)

**Total: ~20 minutes per release + potential for human error**

## Pre-Automation (Low-Effort, High-Impact)

These improvements require no new scripts but significantly reduce risk:

### 1. Pre-Upload Validation Script

**Purpose:** Catch configuration mismatches before pushing

**Add to npm scripts:**

```json
"release:check": "node scripts/release/validate-manifest.mjs"
```

**What it does:**

- Reads all 5 configuration files
- Verifies version identifiers match across files
- Checks that PHOTO_ASSET_ID exists in releases.json
- Validates photo-urls.json is well-formed JSON
- Reports discrepancies

**Prevents:** Pushing with typos or partial syncs

### 2. Automated Manifest Extraction

**Purpose:** Skip manual JSON export from Python sampler

**Improvement to sample-photos.py:**

```bash
python3 scripts/release/sample-photos.py \
  --archive-root /path/to/archive \
  --output-dir /tmp/bundles \
  --manifest-out catalog/photo-urls-new.json  # NEW: auto-export
```

Then verify before committing:

```bash
diff catalog/photo-urls.json catalog/photo-urls-new.json
mv catalog/photo-urls-new.json catalog/photo-urls.json
```

**Prevents:** Manual transcription errors

### 3. Enhanced Validation Script

**Purpose:** Test the full pipeline before pushing

**Add to npm scripts:**

```json
"release:validate": "npm run inventory:duckdb && npm run data:validate:photos && npm run release:check"
```

**What it does:** Runs the 3 core validation steps in sequence, fails fast if any step fails

**Prevents:** Pushing invalid state

---

## Phase 1: Manifest Synchronizer (Weeks 1–2)

**Goal:** Automate the 5-file sync, eliminate manual version tracking

**Implementation:** `scripts/release/sync-manifest.mjs`

```bash
# Usage:
node scripts/release/sync-manifest.mjs \
  --version v4 \
  --duckdb-filename archive-v4.duckdb \
  --photo-asset-id photos-5-demo \
  --title "5 MB demo photo bundle"
```

**What it does:**

1. Reads all 5 configuration files as JSON/text
2. Replaces version identifiers consistently:
   - package.json: `archive-v` → `archive-v4`
   - src/lib/duckdb.ts: `/data/archive-v` → `/data/archive-v4`
   - catalog/datasets.json: all references updated
   - catalog/releases.json: all references updated
   - validate-photo-release-assets.mjs: PHOTO_ASSET_ID updated
3. Validates cross-file consistency before writing
4. Shows a diff of changes for manual review
5. Backs up old files (safety margin)

**Benefits:**

- Eliminates copy-paste errors
- One authoritative place to specify version
- Atomic update (all-or-nothing, no partial syncs)
- Easily scriptable into release CI/CD

**Implementation effort:** ~3–4 hours (Node.js file I/O + JSON manipulation)

**Risk:** Low (file updates are deterministic, easy to rollback)

---

## Phase 2: Release Orchestration Script (Weeks 3–4)

**Goal:** Single command to orchestrate entire local release workflow

**Implementation:** `scripts/release/prepare-release.sh`

```bash
# Usage:
./scripts/release/prepare-release.sh \
  --version v4 \
  --archive-root /media/robin/foss4lh1/david-lovelace-archive \
  --collections hfd-royal-commission,aerial-england-1947 \
  --size-mb 5 \
  --quality 70 \
  --upload  # Optional: skip manual GitHub upload
```

**Workflow:**

1. Run sampler with given parameters
2. Verify folder structure (manifest exists, photos present)
3. Generate photo-urls.json
4. Copy photos to static/photos/demo/
5. Run sync-manifest.mjs with new version
6. Run full validation pipeline (format, lint, check, build)
7. Optionally upload release assets via `gh release upload`
8. Display commit command ready to copy-paste

**Output example:**

```
✓ Sampled 42 photos (4.3 MB)
✓ Generated photo-urls.json (42 entries)
✓ Synced manifest (v4)
✓ All validations passed

Ready to commit:
  git add catalog/{photo-urls,releases,datasets}.json \
          package.json src/lib/duckdb.ts \
          scripts/release/validate-photo-release-assets.mjs \
          static/photos/demo/

  git commit -m "chore: publish v4 archive and photo bundle (42 photos, 4.3 MB, quality 70)"
  git push origin main
```

**Benefits:**

- Single command instead of 10+ manual steps
- Consistent error handling (fail-fast)
- Repeatable, documentation-as-code
- Easy to extend (add validation hooks, logging, notifications)

**Implementation effort:** ~6–8 hours (orchestrating existing tools + error handling)

**Risk:** Medium (complex shell script, needs thorough testing)

---

## Phase 3: GitHub Actions Integration (Weeks 5–6)

**Goal:** Optional CI-based release creation (future, when more confident)

**Future workflow:**

1. Create a GitHub Actions workflow triggered by a new branch + label
2. Workflow checks out the branch
3. Runs prepare-release.sh (with --upload flag)
4. Creates a pull request with changes
5. Waits for manual approval (review manifest, photos, etc.)
6. Merges PR + deploys

**Benefit:** Hands-off releases for trusted contributors

**Risk:** High (automated releases need perfect validation)

**Defer until:** Phase 1 + 2 tested with 3+ successful releases

---

## Phase 4: Cache & Parallelization (Q3 2026+)

**Goal:** Faster sampling for large archives

**Opportunities:**

1. **Index cache:** Pre-compute file lists per collection at startup
2. **Parallel sampling:** Sample multiple collections simultaneously
3. **Incremental sampling:** Add new photos without full re-scan
4. **DuckDB caching:** Store index in git-LFS or S3 for faster builds

**Deferred until:** Archive grows beyond current sampling time (~5 mins)

---

## Recommended Order

**Immediate (this sprint):**

1. ✅ Create docs (WORKFLOW.md, RELEASING.md checklist) — **DONE**
2. ✅ Update README to be more concise — **DONE**
3. ⏳ Add pre-upload validation script (`release:check`)

**Next release (after 2–3 manual cycles):** 4. ⏳ Implement manifest synchronizer (`sync-manifest.mjs`) 5. ⏳ Add enhanced validation (`release:validate`)

**Following release:** 6. ⏳ Build release orchestration script (`prepare-release.sh`) 7. ⏳ Test with new collection upload

**After 3+ successful releases:** 8. ⏳ Consider GitHub Actions integration (Phase 3)

---

## Success Metrics

- **Time per release:** 30 mins → 10 mins (after Phase 2)
- **Error rate:** Minimize manual coordination mistakes
- **Scaling:** Support 5+ collections without workflow changes
- **Onboarding:** New contributor can perform release with just docs + script

---

## Open Questions

1. Should manifest sync be interactive (confirm changes) or silent (auto-apply)?
   - **Recommendation:** Interactive with diff-before-apply
2. How to handle multiple collections in one release?
   - **Recommendation:** Merge photo-urls.json files, separate release entries per collection
3. Should we version DuckDB separately from photo bundles?
   - **Recommendation:** Yes—DuckDB increments when photos added/removed/URLs change; photo bundles are content-specific versions

4. Future: Move to S3/Cloudflare R2 instead of GitHub Releases?
   - **Recommendation:** Keep GitHub as primary for now; migration to CDN when storage needs exceed free tier
