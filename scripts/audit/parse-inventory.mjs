import { createReadStream, createWriteStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import readline from 'node:readline';

const inventoryDir =
	process.env.INVENTORY_ROOT ?? '/media/robin/foss4lh1/david-lovelace-archive/file-info-names';
const outputFile = 'catalog/archive-inventory.csv';

/**
 * High-value historical and research formats to keep in the public index.
 * Note: Camera RAW files (arw, srw, crw, dng) are excluded as high-res JPGs exist.
 * GIS sidecars (shx, prj, qpj, xml, cpg) are excluded to reduce noise,
 * keeping only core spatial data (shp, dbf, ecw, asc, tab).
 */
const INCLUDED_EXTENSIONS = new Set([
	'ecw',
	'tif',
	'tiff',
	'jpg',
	'jpeg',
	'pdf',
	'doc',
	'docx',
	'txt',
	'xls',
	'xlsx',
	'shp',
	'dbf',
	'csv',
	'mp4',
	'zip',
	'tab',
	'asc'
]);

// Minimum sizes for common noisy formats to filter out thumbnails/placeholders
const MIN_SIZES = {
	jpg: 100 * 1024, // 100 KB
	jpeg: 100 * 1024
};

// Filenames or patterns to exclude
const EXCLUDED_NAMES = new Set(['thumbs.db', 'desktop.ini', 'zbthumbnail.info']);

/**
 * Entire folders to skip. These are known backup, mirror, generated-derivative,
 * or noise directories that duplicate content elsewhere or are not research
 * material.
 */
const EXCLUDED_FOLDER_PATTERNS = [
	/node_modules/i, // npm dependency trees
	/TileGroup0/i, // DeepZoom / Zoomify generated tiles
	/zoomify/i,
	/zoomable/i,
	/CrucialFoldersBU/i, // backup snapshot (Oct 2024)
	/CrucialMapfilesBU/i, // backup snapshot (Oct 2024)
	/RuthBackup/i, // personal backup folder
	/IonosServer/i, // web server mirror
	/zPrevious/i // old project copies
];

function isExcludedFolder(dirPath) {
	const normalized = dirPath.replace(/\\/g, '/');
	return EXCLUDED_FOLDER_PATTERNS.some((re) => re.test(normalized));
}

async function parseFile(filePath, csvStream) {
	const fileStream = createReadStream(filePath);
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity
	});

	let currentDir = '';
	let skipDir = false;
	const dirRegex = /^ Directory of (.*)$/;
	const fileRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+([\d,]+|<DIR>)\s+(.*)$/;

	for await (const line of rl) {
		const trimmedLine = line.trim();
		if (!trimmedLine) continue;

		const dirMatch = line.match(dirRegex);
		if (dirMatch) {
			currentDir = dirMatch[1].trim();
			skipDir = isExcludedFolder(currentDir);
			continue;
		}

		if (skipDir) continue;

		const fileMatch = line.match(fileRegex);
		if (fileMatch) {
			const [, date, time, sizeOrDir, name] = fileMatch;
			if (sizeOrDir === '<DIR>') continue;
			if (name === '.' || name === '..') continue;

			// Filtering
			const lowerName = name.toLowerCase();
			if (EXCLUDED_NAMES.has(lowerName) || lowerName.startsWith('.')) continue;

			const ext = name.split('.').pop().toLowerCase();
			if (!INCLUDED_EXTENSIONS.has(ext)) continue;

			const size = parseInt(sizeOrDir.replace(/,/g, ''), 10);

			// Size filtering for common formats
			if (MIN_SIZES[ext] && size < MIN_SIZES[ext]) continue;

			const fullPath = join(currentDir, name);

			csvStream.write(`"${fullPath.replace(/"/g, '""')}","${size}","${ext}","${date} ${time}"\n`);
		}
	}
}

async function main() {
	const files = (await readdir(inventoryDir)).filter((f) => f.endsWith('.txt'));
	console.log(`Found ${files.length} inventory files in ${inventoryDir}`);

	const csvStream = createWriteStream(outputFile);
	csvStream.write('path,size,format,timestamp\n');

	for (const file of files) {
		console.log(`Parsing ${file}...`);
		await parseFile(join(inventoryDir, file), csvStream);
	}

	csvStream.end();
	console.log(`Wrote ${outputFile}`);
}

main().catch(console.error);
