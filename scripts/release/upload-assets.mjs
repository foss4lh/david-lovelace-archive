#!/usr/bin/env node
/**
 * Synchronize local assets with GitHub Releases based on catalog/releases.json
 * Supports multiple source directories for bundles.
 */

import { readFileSync, existsSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const releasesPath = resolve('catalog/releases.json');
const manifest = JSON.parse(readFileSync(releasesPath, 'utf-8'));
const tag = manifest.releaseTag;
const repo = manifest.repository;

// Directories to check for bundles
const BUNDLE_DIRS = [
	resolve('tmp-bundles-10mb'),
	resolve('tmp-bundles-50mb'),
	resolve('tmp-bundles')
];

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
	if (asset.status !== 'available') continue;

	const targetPath = resolve(asset.target);
	const filename = asset.filename;

	// Check for generated bundles in any of the bundle dirs
	if (filename.startsWith('photos-')) {
		let sourcePath = null;
		// Handle special mappings
		const sourceNames = [filename];
		if (filename === 'photos-5-demo.zip') sourceNames.push('photos-uncategorized.zip');
		
		for (const dir of BUNDLE_DIRS) {
			for (const name of sourceNames) {
				const p = join(dir, name);
				if (existsSync(p)) {
					sourcePath = p;
					break;
				}
			}
			if (sourcePath) break;
		}

		if (sourcePath) {
			mkdirSync(dirname(targetPath), { recursive: true });
			copyFileSync(sourcePath, targetPath);
			console.log(`  Moved bundle: ${sourcePath} -> ${asset.target}`);
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
	} else if (asset.requiredForBuild) {
		console.warn(`  WARNING: Required asset missing locally: ${targetPath}`);
	}
}

console.log('\nUpload sync complete.');
