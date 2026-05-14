#!/usr/bin/env node
/**
 * Release manifest validator
 * 
 * Checks that version identifiers are consistent across all configuration files
 * before pushing a release.
 * 
 * Usage:
 *   npm run release:check
 *   node scripts/release/validate-manifest.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dir, '../..');

const files = {
	packageJson: path.join(rootDir, 'package.json'),
	duckdbTs: path.join(rootDir, 'src/lib/duckdb.ts'),
	datasetsJson: path.join(rootDir, 'catalog/datasets.json'),
	releasesJson: path.join(rootDir, 'catalog/releases.json'),
	validatorMjs: path.join(rootDir, 'scripts/release/validate-photo-release-assets.mjs'),
	photoUrls: path.join(rootDir, 'catalog/photo-urls.json')
};

const checks = [];
let failed = false;

function check(name, fn) {
	checks.push({ name, fn });
}

function fail(message) {
	console.error(`❌ ${message}`);
	failed = true;
}

function warn(message) {
	console.warn(`⚠️  ${message}`);
}

function pass(message) {
	console.log(`✓ ${message}`);
}

// Check 1: All files exist
check('Files exist', () => {
	for (const [label, filepath] of Object.entries(files)) {
		if (!fs.existsSync(filepath)) {
			fail(`File not found: ${label} at ${filepath}`);
		}
	}
});

// Check 2: Parse JSON files
const parsed = {};
check('Parse JSON', () => {
	const jsonFiles = ['packageJson', 'datasetsJson', 'releasesJson', 'photoUrls'];
	for (const key of jsonFiles) {
		try {
			parsed[key] = JSON.parse(fs.readFileSync(files[key], 'utf-8'));
		} catch (e) {
			fail(`Invalid JSON in ${key}: ${e.message}`);
		}
	}
});

// Check 3: Extract version identifiers
const versions = {};
check('Extract versions', () => {
	// From package.json: look for duckdb filename pattern
	const packageScript = parsed.packageJson?.scripts?.['inventory:duckdb'] || '';
	const packageMatch = packageScript.match(/static\/data\/(archive-v?\d+\.duckdb)/);
	if (packageMatch) {
		versions.packageDuckdb = packageMatch[1];
	}

	// From duckdb.ts: look for data/archive-vX pattern
	const duckdbContent = fs.readFileSync(files.duckdbTs, 'utf-8');
	const duckdbMatch = duckdbContent.match(/\/data\/(archive-v?\d+\.duckdb)/);
	if (duckdbMatch) {
		versions.duckdbUrl = duckdbMatch[1];
	}

	// From datasets.json: archive-inventory entry
	const archiveEntry = parsed.datasetsJson?.find((d) => d.id === 'archive-inventory-duckdb');
	if (archiveEntry) {
		versions.datasetsDuckdb = path.basename(archiveEntry.localPath || '');
		versions.datasetsRemoteUrl = path.basename(archiveEntry.remoteUrl || '');
		versions.datasetsAssetFilename = archiveEntry.releaseAsset?.filename || '';
	}

	// From releases.json: archive entry
	const releaseArchive = parsed.releasesJson?.assets?.find(
		(a) => a.id?.includes('archive') || a.filename?.includes('archive')
	);
	if (releaseArchive) {
		versions.releaseAssetArchive = releaseArchive.filename;
		versions.releaseArchiveUrl = path.basename(releaseArchive.url || '');
	}

	// From releases.json: photo entry (first one)
	const releasePhoto = parsed.releasesJson?.assets?.find(
		(a) => a.id?.includes('photos') && !a.id?.includes('archive')
	);
	if (releasePhoto) {
		versions.releasePhotoId = releasePhoto.id;
		versions.releasePhotoFilename = releasePhoto.filename;
	}

	// From validator script
	const validatorContent = fs.readFileSync(files.validatorMjs, 'utf-8');
	const photoIdMatch = validatorContent.match(/PHOTO_ASSET_ID\s*=\s*['"]([^'"]+)['"]/);
	if (photoIdMatch) {
		versions.validatorPhotoId = photoIdMatch[1];
	}
});

// Check 4: Verify DuckDB filename consistency
check('DuckDB version consistency', () => {
	const duckdbVersions = [
		versions.packageDuckdb,
		versions.duckdbUrl,
		versions.datasetsDuckdb,
		versions.datasetsAssetFilename,
		versions.releaseAssetArchive,
		versions.releaseArchiveUrl
	].filter(Boolean);

	if (duckdbVersions.length === 0) {
		warn('No DuckDB references found. Archive updates may not be configured.');
		return;
	}

	const unique = [...new Set(duckdbVersions)];
	if (unique.length === 1) {
		pass(`DuckDB filename is consistent: ${unique[0]}`);
	} else {
		fail(`DuckDB filename mismatch:\n  ${unique.map((v) => `- ${v}`).join('\n  ')}`);
	}
});

// Check 5: Verify photo asset ID consistency
check('Photo asset ID consistency', () => {
	const photoIds = [versions.releasePhotoId, versions.validatorPhotoId].filter(Boolean);

	if (photoIds.length === 0) {
		warn('No photo asset configured. Photos may not be tracked.');
		return;
	}

	const unique = [...new Set(photoIds)];
	if (unique.length === 1) {
		pass(`Photo asset ID is consistent: ${unique[0]}`);
	} else {
		fail(`Photo asset ID mismatch:\n  ${unique.map((v) => `- ${v}`).join('\n  ')}`);
	}
});

// Check 6: Verify photo-urls.json is valid
check('Photo URLs manifest', () => {
	try {
		const photoUrls = parsed.photoUrls;
		if (!Array.isArray(photoUrls)) {
			fail('photo-urls.json must be an array');
			return;
		}

		const required = ['path', 'url', 'thumb_url'];
		const missing = [];
		for (const photo of photoUrls) {
			for (const field of required) {
				if (!photo[field]) {
					missing.push(`${photo.path || '(unknown)'}.${field}`);
				}
			}
		}

		if (missing.length > 0) {
			fail(`photo-urls.json missing fields:\n  ${missing.slice(0, 5).join('\n  ')}${missing.length > 5 ? `\n  ... and ${missing.length - 5} more` : ''}`);
		} else {
			pass(`photo-urls.json valid: ${photoUrls.length} photos mapped`);
		}
	} catch (e) {
		fail(`Failed to validate photo-urls.json: ${e.message}`);
	}
});

// Check 7: Verify manifest.json exists and matches photo count
check('Photo manifest file', () => {
	const manifestPath = path.join(rootDir, 'static/photos/demo/manifest.json');
	if (!fs.existsSync(manifestPath)) {
		warn(`static/photos/demo/manifest.json not found (will be generated on first build)`);
		return;
	}

	try {
		const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
		const photoUrlsList = parsed.photoUrls || [];

		if (!manifest.photos || !Array.isArray(manifest.photos)) {
			fail('Manifest has no photos array');
		} else if (manifest.photos.length !== photoUrlsList.length) {
			warn(
				`Photo count mismatch: manifest has ${manifest.photos.length}, photo-urls.json has ${photoUrlsList.length}. Regenerate photo-urls.json if sampler output changed.`
			);
		} else {
			pass(`Manifest in sync: ${manifest.photos.length} photos`);
		}
	} catch (e) {
		fail(`Failed to parse manifest.json: ${e.message}`);
	}
});

// Run all checks
console.log('🔍 Validating release manifest consistency...\n');
for (const { name, fn } of checks) {
	try {
		fn();
	} catch (e) {
		fail(`Error in check "${name}": ${e.message}`);
	}
}

console.log('');
if (!failed) {
	console.log('✨ All checks passed! Safe to commit and push.\n');
	process.exit(0);
} else {
	console.error('\n⚠️  Validation failed. Fix the errors above before committing.\n');
	process.exit(1);
}
