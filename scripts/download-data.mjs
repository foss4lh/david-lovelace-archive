#!/usr/bin/env node
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import releases from '../catalog/releases.json' with { type: 'json' };

const force = process.argv.includes('--force');
const requiredOnly = process.argv.includes('--required-only');

async function download(asset) {
	const target = resolve(asset.target);

	if (requiredOnly && !asset.requiredForBuild) {
		console.log(`skip optional ${asset.filename}`);
		return;
	}

	if (asset.status !== 'available') {
		console.log(`skip ${asset.filename}: status is ${asset.status}`);
		return;
	}

	// If file exists locally, check remote size via HEAD to detect updates
	if (existsSync(target) && !force) {
		try {
			const headRes = await fetch(asset.url, { method: 'HEAD' });
			if (headRes.ok) {
				const remoteSize = headRes.headers.get('content-length');
				const localSize = statSync(target).size;
				if (remoteSize && parseInt(remoteSize, 10) === localSize) {
					console.log(`exists ${asset.target}`);
					return;
				}
				console.log(`update ${asset.target} (local ${localSize} != remote ${remoteSize})`);
			} else {
				console.log(`update ${asset.target} (HEAD ${headRes.status}, re-downloading)`);
			}
		} catch (err) {
			console.log(`update ${asset.target} (HEAD failed: ${err.message}, re-downloading)`);
		}
	}

	mkdirSync(dirname(target), { recursive: true });
	console.log(`download ${asset.url}`);

	const response = await fetch(asset.url);
	if (!response.ok || !response.body) {
		throw new Error(`Failed to download ${asset.url}: ${response.status} ${response.statusText}`);
	}

	await pipeline(response.body, createWriteStream(target));
	console.log(`wrote ${asset.target}`);
}

for (const asset of releases.assets) {
	await download(asset);
}
