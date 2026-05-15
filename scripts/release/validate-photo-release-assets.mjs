#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import releases from '../../catalog/releases.json' with { type: 'json' };

const PHOTO_ASSET_ID = 'hfd-uncategorized-photos';
const PHOTO_URLS_PATH = 'catalog/photo-urls.json';

function fail(message, details = []) {
	console.error(`\nphoto release validation failed: ${message}`);
	for (const line of details) {
		console.error(`- ${line}`);
	}
	process.exit(1);
}

function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf-8'));
}

async function downloadZip(url, outputPath) {
	const res = await fetch(url);
	if (!res.ok || !res.body) {
		throw new Error(`download failed (${res.status} ${res.statusText})`);
	}
	const chunks = [];
	for await (const chunk of res.body) chunks.push(chunk);
	const data = Buffer.concat(chunks.map((c) => Buffer.from(c)));
	writeFileSync(outputPath, data);
}

function listZipFiles(zipPath) {
	const output = execFileSync('unzip', ['-Z', '-1', zipPath], { encoding: 'utf-8' });
	return output
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

function readZipManifest(zipPath) {
	const output = execFileSync('unzip', ['-p', zipPath, 'manifest.json'], { encoding: 'utf-8' });
	return JSON.parse(output);
}

function normalizePathForUrl(path) {
	return path.replace(/\\/g, '/');
}

async function main() {
	const asset = releases.assets.find((entry) => entry.id === PHOTO_ASSET_ID);
	if (!asset) fail(`missing '${PHOTO_ASSET_ID}' in catalog/releases.json`);
	if (asset.status !== 'available') fail(`asset '${PHOTO_ASSET_ID}' is not available`);

	// Generate photo-urls.json from manifests if missing (no longer tracked in git)
	if (!existsSync(PHOTO_URLS_PATH)) {
		console.log('photo-urls.json not found — generating from manifests...');
		execSync(
			`python3 -c "
import json, glob, os
entries = []
for mf in sorted(glob.glob('static/photos/*/manifest.json')):
    with open(mf) as f:
        m = json.load(f)
    coll = m.get('collection')
    if not coll: continue
    for p in m.get('photos', []):
        entries.append({
            'path': p['path'],
            'url': f'/photos/{coll}/web/{os.path.basename(p[\"web\"])}',
            'thumb_url': f'/photos/{coll}/thumbs/{os.path.basename(p[\"thumb\"])}'
        })
with open('${PHOTO_URLS_PATH}', 'w') as f:
    json.dump(entries, f, indent=2)
print(f'Generated {len(entries)} photo URLs')
"`,
			{ stdio: 'inherit' }
		);
	}

	const photoUrls = readJson(PHOTO_URLS_PATH);
	const tmpDir = mkdtempSync(join(tmpdir(), 'photo-release-'));
	const zipPath = join(tmpDir, asset.filename);

	try {
		console.log(`download ${asset.url}`);
		await downloadZip(asset.url, zipPath);

		const zipFiles = new Set(listZipFiles(zipPath));
		const manifest = readZipManifest(zipPath);
		const manifestPhotos = Array.isArray(manifest.photos) ? manifest.photos : [];
		if (manifestPhotos.length === 0) {
			fail('manifest in release zip has no photos');
		}

		const mappingByPath = new Map(
			photoUrls.map((entry) => [normalizePathForUrl(entry.path), entry])
		);
		const manifestPaths = new Set(manifestPhotos.map((photo) => normalizePathForUrl(photo.path)));

		const missingMappings = [];
		const wrongUrls = [];
		const missingZipMembers = [];

		for (const photo of manifestPhotos) {
			const normalizedPath = normalizePathForUrl(photo.path);
			const expectedUrl = `/photos/demo/${photo.web}`;
			const expectedThumbUrl = `/photos/demo/${photo.thumb}`;
			const mapped = mappingByPath.get(normalizedPath);

			if (!zipFiles.has(photo.web)) {
				missingZipMembers.push(`missing '${photo.web}' in zip`);
			}
			if (!zipFiles.has(photo.thumb)) {
				missingZipMembers.push(`missing '${photo.thumb}' in zip`);
			}

			if (!mapped) {
				missingMappings.push(normalizedPath);
				continue;
			}

			if (mapped.url !== expectedUrl || mapped.thumb_url !== expectedThumbUrl) {
				wrongUrls.push(
					`${normalizedPath}: expected (${expectedUrl}, ${expectedThumbUrl}) got (${mapped.url}, ${mapped.thumb_url})`
				);
			}
		}

		const staleMappings = [];
		for (const entry of photoUrls) {
			const normalizedPath = normalizePathForUrl(entry.path);
			if (!manifestPaths.has(normalizedPath)) {
				staleMappings.push(normalizedPath);
			}

			const urlMember = entry.url?.replace(/^\/photos\/demo\//, '');
			const thumbMember = entry.thumb_url?.replace(/^\/photos\/demo\//, '');
			if (urlMember && !zipFiles.has(urlMember)) {
				missingZipMembers.push(`mapped url missing in zip '${entry.url}' for '${normalizedPath}'`);
			}
			if (thumbMember && !zipFiles.has(thumbMember)) {
				missingZipMembers.push(
					`mapped thumb missing in zip '${entry.thumb_url}' for '${normalizedPath}'`
				);
			}
		}

		const uniqueMissingZipMembers = [...new Set(missingZipMembers)];
		if (
			missingMappings.length ||
			wrongUrls.length ||
			staleMappings.length ||
			uniqueMissingZipMembers.length
		) {
			fail('photo URL mapping and release zip are out of sync', [
				...missingMappings.slice(0, 10).map((item) => `no mapping for manifest path '${item}'`),
				...staleMappings
					.slice(0, 10)
					.map((item) => `mapping path not present in manifest '${item}'`),
				...wrongUrls.slice(0, 10),
				...uniqueMissingZipMembers.slice(0, 10),
				`counts => missingMappings:${missingMappings.length}, staleMappings:${staleMappings.length}, wrongUrls:${wrongUrls.length}, missingZipMembers:${uniqueMissingZipMembers.length}`
			]);
		}

		console.log(`photo release validation passed (${manifestPhotos.length} photos)`);
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
}

await main();
