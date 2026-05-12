#!/usr/bin/env node
import { readdir, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const archiveRoot = process.env.ARCHIVE_ROOT ?? '/media/robin/foss4lh/david-lovelace-archive';
const output = process.env.ARCHIVE_SUMMARY ?? 'catalog/archive-summary.local.json';
const maxDepth = Number(process.env.ARCHIVE_AUDIT_DEPTH ?? 3);

const formatCounts = new Map();
const topLevel = new Map();
let totalFiles = 0;
let totalBytes = 0;

function addFormat(file) {
	const ext = extname(file).toLowerCase() || '[no-extension]';
	formatCounts.set(ext, (formatCounts.get(ext) ?? 0) + 1);
}

async function walk(dir, depth = 0) {
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (depth < maxDepth) await walk(path, depth + 1);
			continue;
		}

		if (!entry.isFile()) continue;

		const info = await stat(path);
		const rel = relative(archiveRoot, path);
		const group = rel.split('/')[0] || '.';

		totalFiles += 1;
		totalBytes += info.size;
		addFormat(path);

		const current = topLevel.get(group) ?? { files: 0, bytes: 0 };
		current.files += 1;
		current.bytes += info.size;
		topLevel.set(group, current);
	}
}

function human(bytes) {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let value = bytes;
	let unit = units.shift() ?? 'B';
	while (value >= 1024 && units.length) {
		value /= 1024;
		unit = units.shift() ?? unit;
	}
	return `${value.toFixed(1)} ${unit}`;
}

await walk(archiveRoot);

const summary = {
	generatedAt: new Date().toISOString(),
	archiveRoot,
	maxDepth,
	totalFiles,
	totalBytes,
	totalSize: human(totalBytes),
	topLevel: Object.fromEntries(
		[...topLevel.entries()].map(([key, value]) => [key, { ...value, size: human(value.bytes) }])
	),
	formatCounts: Object.fromEntries([...formatCounts.entries()].sort((a, b) => b[1] - a[1]))
};

await writeFile(output, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`wrote ${output}`);
console.log(
	`${totalFiles.toLocaleString()} files, ${human(totalBytes)} scanned to depth ${maxDepth}`
);
