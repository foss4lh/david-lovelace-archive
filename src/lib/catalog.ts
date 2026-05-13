import datasetsJson from '../../catalog/datasets.json';
import releasesJson from '../../catalog/releases.json';
import progressJson from '../../catalog/progress.json';

export type DatasetStatus =
	| 'available'
	| 'prototype-web-ready'
	| 'inventory-needed'
	| 'cataloguing'
	| 'research-needed'
	| 'source-assessment';

export type AssetKind =
	| 'pmtiles'
	| 'cog'
	| 'geojson'
	| 'csv'
	| 'parquet'
	| 'image-bundle'
	| 'duckdb'
	| 'external-link';

export interface DatasetAsset {
	id: string;
	kind: AssetKind;
	title: string;
	releaseAsset?: string;
	localPath?: string;
	remoteUrl?: string;
	status: string;
	/** Optional bounds as [minX, minY, maxX, maxY] in WGS84 */
	bounds?: [number, number, number, number];
	/** Optional min/max zoom hints */
	minZoom?: number;
	maxZoom?: number;
}

export interface ArchiveDataset {
	id: string;
	title: string;
	period: string;
	coverage: string;
	theme: string;
	status: DatasetStatus;
	summary: string;
	sourceArchivePaths: string[];
	assets: DatasetAsset[];
	nextSteps: string[];
	limitations: string;
}

export interface ReleaseAsset {
	id: string;
	title: string;
	filename: string;
	url: string;
	target: string;
	requiredForBuild: boolean;
	status: string;
}

export interface ReleaseManifest {
	schemaVersion: number;
	releaseTag: string;
	repository: string;
	assets: ReleaseAsset[];
}

export const datasets = datasetsJson as ArchiveDataset[];
export const releaseManifest = releasesJson as ReleaseManifest;
export const progress = progressJson as ProgressReport;

export const visualDatasets = datasets
	.filter((dataset) =>
		dataset.assets.some((asset) => asset.kind === 'pmtiles' && asset.status === 'available')
	)
	.sort((a, b) => {
		// Sort datasets with available assets first
		const aAvailable = a.assets.some((asset) => asset.status === 'available');
		const bAvailable = b.assets.some((asset) => asset.status === 'available');
		if (aAvailable && !bAvailable) return -1;
		if (!aAvailable && bAvailable) return 1;
		return 0;
	});

export const summaryStats = {
	datasetCount: datasets.length,
	webReadyCount: datasets.filter(
		(dataset) => dataset.status === 'available' || dataset.status === 'prototype-web-ready'
	).length,
	assetCount: datasets.flatMap((dataset) => dataset.assets).length
};

export interface ProgressGroup {
	label: string;
	icon: string;
	totalFiles: number;
	alreadyPublicFiles: number;
	uniqueFiles: number;
	liberatedFiles: number;
	offlineFiles: number;
	totalSize: number;
	alreadyPublicSize: number;
	uniqueSize: number;
	liberatedSize: number;
	offlineSize: number;
	pctLiberatedFiles: number;
	pctLiberatedSize: number;
	pctAlreadyPublicFiles: number;
	pctAlreadyPublicSize: number;
	totalSizeFormatted: string;
	uniqueSizeFormatted: string;
	liberatedSizeFormatted: string;
	offlineSizeFormatted: string;
	alreadyPublicSizeFormatted: string;
}

export interface ProgressReport {
	generatedAt: string;
	overall: {
		totalFiles: number;
		uniqueFiles: number;
		liberatedFiles: number;
		alreadyPublicFiles: number;
		totalSize: number;
		uniqueSize: number;
		liberatedSize: number;
		alreadyPublicSize: number;
	};
	groups: Record<string, ProgressGroup>;
	datasets: Array<{
		id: string;
		title: string;
		status: string;
		totalFiles: number;
		uniqueFiles: number;
		liberatedFiles: number;
		alreadyPublicFiles: number;
		totalSize: number;
		uniqueSize: number;
		liberatedSize: number;
		pctFiles: number;
		pctUniqueFiles: number;
		pctSize: number;
		pctUniqueSize: number;
		totalSizeFormatted: string;
		uniqueSizeFormatted: string;
		liberatedSizeFormatted: string;
		hasWebAssets: boolean;
	}>;
}

export function statusLabel(status: string) {
	return status.replace(/-/g, ' ');
}
