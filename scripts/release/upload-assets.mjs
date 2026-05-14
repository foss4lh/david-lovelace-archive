#!/usr/bin/env node
/**
 * Synchronize local assets with GitHub Releases based on catalog/releases.json
 * Only uploads missing or changed files to save bandwidth.
 */

import { readFileSync, existsSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const releasesPath = resolve('catalog/releases.json');
const manifest = JSON.parse(readFileSync(releasesPath, 'utf-8'));
const tag = manifest.releaseTag;
const repo = manifest.repository;
const tmpBundlesDir = resolve('tmp-bundles');

console.log(`Fetching current assets for release ${tag} from ${repo}...`);
let existingAssets = [];
try {
	const output = execSync(`gh release view ${tag} --json assets --repo ${repo}`, { encoding: 'utf-8' });
	existingAssets = JSON.parse(output).assets;
} catch (err) {
	console.error(`  ERROR: Could not fetch release info: ${err.message}`);
	process.exit(1);
}

const remoteFiles = new Map(existingAssets.map((a) => [a.name, a.size]));

console.log(`\nSyncing assets...`);

for (const asset of manifest.assets) {
	// Only upload assets marked as available
	if (asset.status !== 'available') {
		continue;
	}

	const targetPath = resolve(asset.target);
	const filename = asset.filename;

	// Check if this is a photo bundle that was just generated in tmp-bundles
	if (filename.startsWith('photos-')) {
		// Map 'photos-5-demo.zip' to 'photos-uncategorized.zip' if it exists
		const sourceName = filename === 'photos-5-demo.zip' ? 'photos-uncategorized.zip' : filename;
		const p = join(tmpBundlesDir, sourceName);
		if (existsSync(p)) {
			mkdirSync(dirname(targetPath), { recursive: true });
			copyFileSync(p, targetPath);
			console.log(`  Moved generated bundle: ${sourceName} -> ${asset.target}`);
		}
	}

	if (existsSync(targetPath)) {
		const localSize = statSync(targetPath).size;
		const remoteSize = remoteFiles.get(filename);

		if (remoteSize !== undefined && remoteSize === localSize) {
			console.log(`  Skip ${filename}: already matches remote size.`);
			continue;
		}

		console.log(`  Uploading ${filename} (${(localSize / 1024 / 1024).toFixed(2)} MB)...`);
		try {
			execSync(`gh release upload ${tag} "${targetPath}" --clobber --repo ${repo}`, {
				stdio: 'inherit'
			});
		} catch (err) {
			console.error(`  ERROR: Failed to upload ${filename}: ${err.message}`);
		}
	} else {
		if (asset.requiredForBuild) {
			console.warn(`  WARNING: Required asset missing locally: ${targetPath}`);
		}
	}
}

console.log('\nUpload sync complete.');
