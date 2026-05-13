import { createReadStream, createWriteStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import readline from 'node:readline';

const inventoryDir =
	process.env.INVENTORY_ROOT ?? '/media/robin/foss4lh1/david-lovelace-archive/file-info-names';
const outputFile = 'catalog/archive-inventory.csv';

/**
 * High-value historical and research formats to keep in the public index.
 *
 * ZIP files are ignored because they should be unzipped and processed first.
 * Camera RAW files (arw, srw, crw, dng) are skipped because high-res JPGs exist.
 * Parts of multi-file GIS layers (shx, prj, qpj, xml, cpg, dbf) are skipped
 * to keep only the main spatial files (shp, ecw, asc, tab).
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
	'csv',
	'mp4',
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

/**
 * Parse an inventory text file and return candidate rows + folder basenames per drive.
 * Each returned row: { fullPath, size, ext, dateTime }.
 * driveFolders: Map<drive_letter, Set<folder_basename>>
 */
async function scanFile(filePath) {
	const fileStream = createReadStream(filePath);
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity
	});

	let currentDir = '';
	let skipDir = false;
	const dirRegex = /^ Directory of (.*)$/;
	const fileRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+([\d,]+|<DIR>)\s+(.*)$/;

	const rows = [];
	const driveFolders = new Map(); // drive -> Set(folderBasename)

	function trackFolder(dirPath) {
		const match = dirPath.match(/^([A-Z]:\\)/);
		if (!match) return;
		const drive = match[1];
		const parts = dirPath.split('\\');
		for (let i = 1; i < parts.length; i++) {
			const basename = parts[i];
			if (!basename) continue;
			if (!driveFolders.has(drive)) driveFolders.set(drive, new Set());
			driveFolders.get(drive).add(basename.toLowerCase());
		}
	}

	for await (const line of rl) {
		const trimmedLine = line.trim();
		if (!trimmedLine) continue;

		const dirMatch = line.match(dirRegex);
		if (dirMatch) {
			currentDir = dirMatch[1].trim();
			skipDir = isExcludedFolder(currentDir);
			if (!skipDir) trackFolder(currentDir);
			continue;
		}

		if (skipDir) continue;

		const fileMatch = line.match(fileRegex);
		if (fileMatch) {
			const [, date, time, sizeOrDir, name] = fileMatch;
			if (name === '.' || name === '..') continue;

			// Track subdirectories as potential folder-basenames for zip filtering
			if (sizeOrDir === '<DIR>') {
				trackFolder(join(currentDir, name));
				continue;
			}

			const lowerName = name.toLowerCase();
			if (EXCLUDED_NAMES.has(lowerName) || lowerName.startsWith('.')) continue;

			const ext = name.split('.').pop().toLowerCase();
			if (!INCLUDED_EXTENSIONS.has(ext)) continue;

			const size = parseInt(sizeOrDir.replace(/,/g, ''), 10);
			if (MIN_SIZES[ext] && size < MIN_SIZES[ext]) continue;

			const fullPath = join(currentDir, name);
			rows.push({ fullPath, size, ext, dateTime: `${date} ${time}` });
		}
	}

	return { rows, driveFolders };
}

/**
 * Determine if a zip is just an archive of an existing folder on the same drive.
 * Heuristic: zip basename (without .zip) matches a folder basename on the same drive
 * AND the zip is > 100 MB (avoids tiny dependency zips).
 */
function isFolderArchiveZip(row, allDriveFolders) {
	if (row.ext !== 'zip') return false;
	if (row.size < 100 * 1024 * 1024) return false; // < 100 MB: keep (likely a download, not a folder archive)

	const driveMatch = row.fullPath.match(/^([A-Z]:\\)/);
	if (!driveMatch) return false;
	const drive = driveMatch[1];
	const zipBasename = row.fullPath
		.split(/[\\/]/)
		.pop()
		.replace(/\.zip$/i, '')
		.toLowerCase();

	const folders = allDriveFolders.get(drive);
	if (!folders) return false;
	return folders.has(zipBasename);
}

async function main() {
	const files = (await readdir(inventoryDir)).filter((f) => f.endsWith('.txt'));
	console.log(`Found ${files.length} inventory files in ${inventoryDir}`);

	// Phase 1: scan all files, collect rows + folder basenames per drive
	const allRows = [];
	const allDriveFolders = new Map();

	for (const file of files) {
		console.log(`Scanning ${file}...`);
		const { rows, driveFolders } = await scanFile(join(inventoryDir, file));
		for (const r of rows) allRows.push(r);
		for (const [drive, folders] of driveFolders) {
			if (!allDriveFolders.has(drive)) allDriveFolders.set(drive, new Set());
			for (const f of folders) allDriveFolders.get(drive).add(f);
		}
	}

	console.log(`Scanned ${allRows.length.toLocaleString()} candidate rows`);

	// Phase 2: filter out zip archives of existing folders
	let archiveZipsSkipped = 0;
	let archiveZipBytes = 0;
	const filteredRows = [];

	for (const row of allRows) {
		if (isFolderArchiveZip(row, allDriveFolders)) {
			archiveZipsSkipped++;
			archiveZipBytes += row.size;
			continue;
		}
		filteredRows.push(row);
	}

	if (archiveZipsSkipped > 0) {
		console.log(
			`Skipped ${archiveZipsSkipped.toLocaleString()} folder-archive zip(s) (${(archiveZipBytes / 1024 / 1024 / 1024).toFixed(1)} GB)`
		);
	}

	// Phase 3: write CSV
	const csvStream = createWriteStream(outputFile);
	csvStream.write('path,size,format,timestamp\n');

	for (const row of filteredRows) {
		csvStream.write(`"${row.fullPath.replace(/"/g, '""')}","${row.size}","${row.ext}","${row.dateTime}"\n`);
	}

	csvStream.end();
	console.log(`Wrote ${outputFile} with ${filteredRows.length.toLocaleString()} rows`);
}

main().catch(console.error);
