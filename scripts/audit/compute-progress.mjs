import { readFile, writeFile } from 'node:fs/promises';

/**
 * Compute archive liberation progress by matching archive-inventory.csv
 * against published datasets in datasets.json.
 *
 * Outputs catalog/progress.json with file-count and size-based metrics.
 */

const INVENTORY_PATH = 'catalog/archive-inventory.csv';
const DATASETS_PATH = 'catalog/datasets.json';
const OUTPUT_PATH = 'catalog/progress.json';

function normalisePath(p) {
	// D:/AirPhotos/EN_County_APs/so2242.ecw -> AirPhotos/EN_County_APs/so2242.ecw
	return p.replace(/^[A-Za-z]:[/\\]/, '').replace(/\\/g, '/');
}

function formatBytes(b) {
	if (b >= 1e12) return `${(b / 1e12).toFixed(2)} TB`;
	if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
	if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
	return `${b} B`;
}

async function readInventory() {
	const text = await readFile(INVENTORY_PATH, 'utf-8');
	const lines = text.trim().split('\n');
	const header = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
	const rows = [];
	for (let i = 1; i < lines.length; i++) {
		const cells = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
		const row = Object.fromEntries(header.map((h, idx) => [h, cells[idx] || '']));
		rows.push({
			path: normalisePath(row.path),
			size: parseInt(row.size, 10) || 0,
			format: row.format?.toLowerCase() || '',
			published: row.already_published_online === 'TRUE',
		});
	}
	return rows;
}

async function readDatasets() {
	const raw = await readFile(DATASETS_PATH, 'utf-8');
	return JSON.parse(raw);
}

function buildMatchers(datasets) {
	// For each available dataset with web-ready assets, build path matchers
	const matchers = [];
	for (const ds of datasets) {
		const hasWebAsset = ds.assets?.some(
			(a) => a.status === 'available' && ['pmtiles', 'cog', 'duckdb', 'geojson'].includes(a.kind)
		);
		if (ds.status !== 'available' && !hasWebAsset) continue;

		const prefixes = (ds.sourceArchivePaths || []).map((p) =>
			p.replace(/^[/\\]+/, '').replace(/\\/g, '/')
		);
		if (!prefixes.length) continue;

		matchers.push({
			datasetId: ds.id,
			datasetTitle: ds.title,
			prefixes,
			theme: ds.theme,
		});
	}
	return matchers;
}

function classifyFile(file) {
	const p = file.path.toLowerCase();
	const fmt = file.format;

	// Aerial photography (ECW or photo formats in AirPhotos dirs)
	if (p.includes('airphotos') || p.includes('air photos')) {
		if (fmt === 'ecw') return 'aerial_ecw';
		if (['jpg', 'jpeg', 'tif', 'tiff'].includes(fmt)) return 'aerial_photo';
		return 'aerial_other';
	}

	// Maps (georeferenced raster)
	if (p.includes('maps/') || p.includes('harc/raster')) {
		if (fmt === 'ecw') return 'map_ecw';
		if (['tif', 'tiff'].includes(fmt)) return 'map_tif';
		if (fmt === 'asc') return 'map_elevation';
		return 'map_other';
	}

	// Photos from projects / habitat / places
	if (['jpg', 'jpeg', 'tif', 'tiff'].includes(fmt)) {
		if (p.includes('history')) return 'history_photo';
		if (p.includes('habitat') || p.includes('hedges') || p.includes('orchards')) return 'habitat_photo';
		if (p.includes('projects')) return 'project_photo';
		return 'photo_other';
	}

	// Documents
	if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'csv'].includes(fmt)) {
		if (p.includes('history')) return 'history_doc';
		if (p.includes('habitat') || p.includes('hedges') || p.includes('orchards')) return 'habitat_doc';
		if (p.includes('projects')) return 'project_doc';
		return 'doc_other';
	}

	// Vector / GIS
	if (['shp', 'tab'].includes(fmt)) return 'vector';

	return 'other';
}

function makeGroups() {
	return {
		overall: { label: 'Overall archive', categories: [], icon: 'archive' },
		maps: {
			label: 'Georeferenced maps & aerials',
			categories: ['map_ecw', 'map_tif', 'map_elevation', 'aerial_ecw'],
			icon: 'map',
		},
		aerials: {
			label: 'Aerial photography',
			categories: ['aerial_ecw', 'aerial_photo'],
			icon: 'camera',
		},
		photos: {
			label: 'Field & survey photographs',
			categories: ['aerial_photo', 'history_photo', 'habitat_photo', 'project_photo', 'photo_other'],
			icon: 'image',
		},
		docs: {
			label: 'Documents & research notes',
			categories: ['history_doc', 'habitat_doc', 'project_doc', 'doc_other'],
			icon: 'file-text',
		},
		vectors: {
			label: 'Vector & GIS layers',
			categories: ['vector'],
			icon: 'layers',
		},
	};
}

async function main() {
	const [inventory, datasets] = await Promise.all([readInventory(), readDatasets()]);
	const matchers = buildMatchers(datasets);

	// Classify each file and mark status
	const files = inventory.map((f) => {
		const category = classifyFile(f);
		const alreadyPublic = f.published;
		const liberated =
			!alreadyPublic &&
			matchers.some((m) => m.prefixes.some((prefix) => f.path.toLowerCase().startsWith(prefix.toLowerCase())));
		return { ...f, category, alreadyPublic, liberated };
	});

	const uniqueFiles = files.filter((f) => !f.alreadyPublic);
	const liberatedFiles = files.filter((f) => f.liberated);
	const alreadyPublicFiles = files.filter((f) => f.alreadyPublic);

	const groups = makeGroups();
	groups.overall.categories = [...new Set(files.map((f) => f.category))];

	const groupStats = {};
	for (const [key, def] of Object.entries(groups)) {
		const cats = def.categories;
		const scope = files.filter((f) => cats.includes(f.category));
		const unique = scope.filter((f) => !f.alreadyPublic);
		const liberated = unique.filter((f) => f.liberated);
		const alreadyPublic = scope.filter((f) => f.alreadyPublic);
		const offline = unique.filter((f) => !f.liberated);

		const uniqueSize = unique.reduce((s, f) => s + f.size, 0);
		const liberatedSize = liberated.reduce((s, f) => s + f.size, 0);
		const alreadyPublicSize = alreadyPublic.reduce((s, f) => s + f.size, 0);
		const offlineSize = offline.reduce((s, f) => s + f.size, 0);

		groupStats[key] = {
			label: def.label,
			icon: def.icon,
			totalFiles: scope.length,
			alreadyPublicFiles: alreadyPublic.length,
			uniqueFiles: unique.length,
			liberatedFiles: liberated.length,
			offlineFiles: offline.length,
			totalSize: scope.reduce((s, f) => s + f.size, 0),
			alreadyPublicSize,
			uniqueSize,
			liberatedSize,
			offlineSize,
			pctLiberatedFiles: unique.length ? Math.round((liberated.length / unique.length) * 1000) / 10 : 0,
			pctLiberatedSize: uniqueSize ? Math.round((liberatedSize / uniqueSize) * 1000) / 10 : 0,
			pctAlreadyPublicFiles: scope.length ? Math.round((alreadyPublic.length / scope.length) * 1000) / 10 : 0,
			pctAlreadyPublicSize: scope.reduce((s, f) => s + f.size, 0) ? Math.round((alreadyPublicSize / scope.reduce((s, f) => s + f.size, 0)) * 1000) / 10 : 0,
			totalSizeFormatted: formatBytes(scope.reduce((s, f) => s + f.size, 0)),
			uniqueSizeFormatted: formatBytes(uniqueSize),
			liberatedSizeFormatted: formatBytes(liberatedSize),
			offlineSizeFormatted: formatBytes(offlineSize),
			alreadyPublicSizeFormatted: formatBytes(alreadyPublicSize),
		};
	}

	// Per-dataset stats
	const datasetStats = [];
	for (const ds of datasets) {
		const hasWebAsset = ds.assets?.some(
			(a) => a.status === 'available' && ['pmtiles', 'cog', 'duckdb', 'geojson'].includes(a.kind)
		);
		const prefixes = (ds.sourceArchivePaths || []).map((p) =>
			p.replace(/^[/\\]+/, '').replace(/\\/g, '/')
		);
		const dsFiles = files.filter((f) => prefixes.some((prefix) => f.path.toLowerCase().startsWith(prefix.toLowerCase())));
		const dsUnique = dsFiles.filter((f) => !f.alreadyPublic);
		const dsLiberated = dsUnique.filter((f) => f.liberated);
		const dsAlreadyPublic = dsFiles.filter((f) => f.alreadyPublic);
		const dsSize = dsFiles.reduce((s, f) => s + f.size, 0);
		const dsUniqueSize = dsUnique.reduce((s, f) => s + f.size, 0);
		const dsLiberatedSize = dsLiberated.reduce((s, f) => s + f.size, 0);

		datasetStats.push({
			id: ds.id,
			title: ds.title,
			status: ds.status,
			totalFiles: dsFiles.length,
			uniqueFiles: dsUnique.length,
			liberatedFiles: dsLiberated.length,
			alreadyPublicFiles: dsAlreadyPublic.length,
			totalSize: dsSize,
			uniqueSize: dsUniqueSize,
			liberatedSize: dsLiberatedSize,
			pctFiles: dsFiles.length ? Math.round((dsLiberated.length / dsFiles.length) * 1000) / 10 : 0,
			pctUniqueFiles: dsUnique.length ? Math.round((dsLiberated.length / dsUnique.length) * 1000) / 10 : 0,
			pctSize: dsSize ? Math.round((dsLiberatedSize / dsSize) * 1000) / 10 : 0,
			pctUniqueSize: dsUniqueSize ? Math.round((dsLiberatedSize / dsUniqueSize) * 1000) / 10 : 0,
			totalSizeFormatted: formatBytes(dsSize),
			uniqueSizeFormatted: formatBytes(dsUniqueSize),
			liberatedSizeFormatted: formatBytes(dsLiberatedSize),
			hasWebAssets: hasWebAsset,
		});
	}

	const output = {
		generatedAt: new Date().toISOString(),
		overall: {
			totalFiles: files.length,
			uniqueFiles: uniqueFiles.length,
			liberatedFiles: liberatedFiles.length,
			alreadyPublicFiles: alreadyPublicFiles.length,
			totalSize: files.reduce((s, f) => s + f.size, 0),
			uniqueSize: uniqueFiles.reduce((s, f) => s + f.size, 0),
			liberatedSize: liberatedFiles.reduce((s, f) => s + f.size, 0),
			alreadyPublicSize: alreadyPublicFiles.reduce((s, f) => s + f.size, 0),
		},
		groups: groupStats,
		datasets: datasetStats.sort((a, b) => b.pctSize - a.pctSize),
	};

	await writeFile(OUTPUT_PATH, JSON.stringify(output, null, '\t'));
	console.log(`Wrote ${OUTPUT_PATH}`);
	console.log(`  Total files: ${output.overall.totalFiles.toLocaleString()}`);
	console.log(`  Unique files: ${output.overall.uniqueFiles.toLocaleString()}`);
	console.log(`  Liberated by us: ${output.overall.liberatedFiles.toLocaleString()}`);
	console.log(`  Already public: ${output.overall.alreadyPublicFiles.toLocaleString()}`);
	for (const [k, v] of Object.entries(groupStats)) {
		console.log(`  ${v.label}: ${v.pctLiberatedFiles}% liberated (${v.liberatedFiles.toLocaleString()} / ${v.uniqueFiles.toLocaleString()} unique), ${v.pctAlreadyPublicFiles}% already public`);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
