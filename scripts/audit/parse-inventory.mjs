import { createReadStream, createWriteStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import readline from 'node:readline';

const inventoryDir =
	process.env.INVENTORY_ROOT ?? '/media/robin/foss4lh1/david-lovelace-archive/file-info-names';
const outputFile = 'catalog/archive-inventory.csv';

/**
 * High-value historical and research formats to keep in the public index.
 *
 * ZIP files are ignored because they should be unzipped and processed first.
 * Video files (mp4, avi, mov, mkv, wmv, flv) are omitted for now — the index
 * focuses on maps, photos, and documents rather than tutorials or footage.
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
 * personal, software, training, or noise directories that duplicate content
 * elsewhere or are not Herefordshire landscape-history research material.
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
	/zPrevious/i, // old project copies
	/^D:\/Home(?:\/|$)/i, // personal home folder
	/^D:\/Account(?:\/|$)/i, // personal financial/admin
	/^D:\/Science(?:\/|$)/i, // generic science (not landscape history)
	/ruth/i, // family/personal name
	/robin/i, // family/personal name
	/clare/i, // family/personal name
	/Academic/i, // tutorials, textbooks, conference papers
	/WebDev/i, // web development training & examples
	/Training/i, // training courses & manuals
	/Software/i, // software installers & binaries
	/EPSON/i, // printer drivers
	/Geoserver|Geoserver2020/i, // GIS server software & training
	/tomcat/i // Java servlet container
];

/**
 * Source taxonomy — each file is classified by path pattern into one of these
 * categories to help visitors filter and understand what they are seeing.
 */
const SOURCE_RULES = [
	{ pattern: /\/(?:tithe|tithemaps|tithe_maps?|tithe\s?map)/i, source: 'Historic Map' },
	{ pattern: /\/(?:epoch|epoch_\d|historical|1_2500|6inch|25inch|os\s?map)/i, source: 'Historic Map' },
	{ pattern: /\/(?:epoch_1|epoch_2|epoch_3|epoch_4)/i, source: 'Historic Map' },
	{ pattern: /airphoto/i, source: 'Aerial Photograph' },
	{ pattern: /lidar/i, source: 'LIDAR Survey' },
	{ pattern: /woodland|forest|fc1953|ancient wood/i, source: 'Woodland Survey' },
	{ pattern: /habitat|meadow|park\s?wood|orchard/i, source: 'Habitat Survey' },
	{ pattern: /vet\s?tree|ancient\s?tree|veteran/i, source: 'Veteran Tree Survey' },
	{ pattern: /\/(?:pro|hro|nmrc|freeman|domesday|ir\d+)/i, source: 'Historic Record' },
	{ pattern: /\/(?:census|schedule|returns|assessment)/i, source: 'Historic Record' }
];

function inferSource(path) {
	for (const { pattern, source } of SOURCE_RULES) {
		if (pattern.test(path)) return source;
	}
	// Default classification by format
	if (/\b(?:ecw|shp|tab|asc)\b/.test(path)) return 'GIS Vector';
	if (/\b(?:tif|tiff)\b/.test(path)) return 'Georeferenced Raster';
	return 'Unknown';
}

function normalizePath(winPath) {
	// Convert backslashes to forward slashes, collapse multiple slashes
	return winPath.replace(/\\+/g, '/').replace(/\/+/g, '/');
}

/**
 * Flag files that are already comprehensively published online by third parties
 * (e.g. National Library of Scotland OS map collections).
 * These are kept in the CSV for completeness but excluded from the DuckDB
 * so the public archive index focuses on unique material.
 */
function isAlreadyPublishedOnline(normalizedPath) {
	return /\/(EN_Historical|1880_6inch|OS_opendata_2010|OS1931_6inch_NA|OS_SurveyorsDrawings|Herefordshire25000)\//i.test(
		normalizedPath
	);
}

function isExcludedFolder(dirPath) {
	const normalized = normalizePath(dirPath);
	return EXCLUDED_FOLDER_PATTERNS.some((re) => re.test(normalized));
}

/**
 * Parse an inventory text file and return candidate rows + folder basenames per drive.
 * Each returned row: { fullPath, size, ext, dateTime, source }.
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
				trackFolder(currentDir + '\\' + name);
				continue;
			}

			const lowerName = name.toLowerCase();
			if (EXCLUDED_NAMES.has(lowerName) || lowerName.startsWith('.')) continue;

			const ext = name.split('.').pop().toLowerCase();
			if (!INCLUDED_EXTENSIONS.has(ext)) continue;

			const size = parseInt(sizeOrDir.replace(/,/g, ''), 10);
			if (size === 0) continue; // Skip zero-byte files
			if (MIN_SIZES[ext] && size < MIN_SIZES[ext]) continue;

			// Use simple concatenation for full path, then normalize
			const fullPath = normalizePath(currentDir + '\\' + name);
			const source = inferSource(fullPath);
			const alreadyPublishedOnline = isAlreadyPublishedOnline(fullPath) ? 'TRUE' : 'FALSE';
			rows.push({ fullPath, size, ext, dateTime: `${date} ${time}`, source, alreadyPublishedOnline });
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
		const { rows, driveFolders } = await scanFile(`${inventoryDir}/${file}`);
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

	// Phase 3: write CSV with source and already_published_online columns
	const csvStream = createWriteStream(outputFile);
	csvStream.write('path,size,format,timestamp,source,already_published_online\n');

	for (const row of filteredRows) {
		csvStream.write(
			`"${row.fullPath.replace(/"/g, '""')}","${row.size}","${row.ext}","${row.dateTime}","${row.source}","${row.alreadyPublishedOnline}"\n`
		);
	}

	csvStream.end();
	console.log(`Wrote ${outputFile} with ${filteredRows.length.toLocaleString()} rows`);

	// Summary
	const sources = {};
	for (const row of filteredRows) {
		sources[row.source] = (sources[row.source] || 0) + 1;
	}
	console.log('Source breakdown:');
	Object.entries(sources)
		.sort((a, b) => b[1] - a[1])
		.forEach(([s, c]) => console.log(`  ${s}: ${c.toLocaleString()}`));
}

main().catch(console.error);
