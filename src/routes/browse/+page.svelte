<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Database,
		FileText,
		Image,
		Search,
		Folder,
		Loader2,
		AlertCircle,
		X,
		Map as MapIcon
	} from '@lucide/svelte';
	import { datasets, statusLabel } from '$lib/catalog';
	import { queryInventory } from '$lib/duckdb';

	interface FileEntry {
		path: string;
		size: string;
		format: string;
		source: string;
		description: string;
	}

	interface FolderEntry {
		path: string;
		fileCount: number;
		totalSize: string;
	}

	const PAGE_SIZE = 50;

	let searchQuery = $state('');
	let folderQuery = $state('');
	let selectedFormat = $state('all');
	let selectedSource = $state('all');
	let selectedView = $state<'files' | 'folders'>('files');
	let selectedDataset = $state<string | null>(null);
	let currentPage = $state(1);
	let isQuerying = $state(false);
	let remoteFileResults = $state<FileEntry[]>([]);
	let remoteFolderResults = $state<FolderEntry[]>([]);
	let remoteMatchCount = $state<number | null>(null);
	let hasInitialised = $state(false);
	let loadError = $state<string | null>(null);

	const primaryFormats = [
		'all',
		'ecw',
		'tif',
		'jpg',
		'pdf',
		'doc',
		'txt',
		'shp',
		'csv',
		'zip',
		'tab',
		'asc'
	];

	const sourceOptions = [
		'all',
		'Historic Record',
		'Historic Map',
		'Aerial Photograph',
		'Woodland Survey',
		'Habitat Survey',
		'Veteran Tree Survey',
		'Georeferenced Raster',
		'LIDAR Survey',
		'GIS Vector',
		'Unknown'
	];

	const activeDataset = $derived(
		selectedDataset ? (datasets.find((d) => d.id === selectedDataset) ?? null) : null
	);

	onMount(() => {
		performRemoteQuery(1);
	});

	function resetQueryState(resetPage = true) {
		remoteFileResults = [];
		remoteFolderResults = [];
		if (resetPage) currentPage = 1;
	}

	function buildWhereClause() {
		const safeSearchQuery = searchQuery.trim().replaceAll("'", "''");
		const safeFolderQuery = folderQuery.trim().replaceAll("'", "''");
		const filters: string[] = [];

		if (safeSearchQuery) filters.push(`path ILIKE '%${safeSearchQuery}%'`);
		if (safeFolderQuery) {
			filters.push(
				`(path ILIKE '${safeFolderQuery}/%' OR path ILIKE '%/${safeFolderQuery}/%' OR path ILIKE '%/${safeFolderQuery}')`
			);
		}
		if (selectedFormat !== 'all') filters.push(`format = '${selectedFormat}'`);
		if (selectedSource !== 'all') filters.push(`source = '${selectedSource}'`);

		if (activeDataset) {
			const pathFilters = activeDataset.sourceArchivePaths
				.map((p) => `path ILIKE '%${p.replaceAll("'", "''")}%'`)
				.join(' OR ');
			if (pathFilters) filters.push(`(${pathFilters})`);
		}

		return filters.length ? `WHERE ${filters.join(' AND ')}` : '';
	}

	async function performRemoteQuery(page = 1) {
		currentPage = page;
		isQuerying = true;
		loadError = null;

		try {
			const whereClause = buildWhereClause();
			const offset = (page - 1) * PAGE_SIZE;

			if (selectedView === 'folders') {
				const countResult = await queryInventory(`
					WITH scoped AS (
						SELECT path FROM archive.files ${whereClause}
					), folders AS (
						SELECT CASE
							WHEN strpos(path, '/') > 0 THEN regexp_replace(path, '/[^/]+$', '')
							ELSE ''
						END AS folder
						FROM scoped
					)
					SELECT COUNT(*) AS match_count
					FROM (SELECT DISTINCT folder FROM folders WHERE folder <> '') unique_folders
				`);
				remoteMatchCount = Number(countResult?.getChild('match_count')?.get(0) ?? 0);

				const results = await queryInventory(`
					WITH scoped AS (
						SELECT path, size FROM archive.files ${whereClause}
					), folders AS (
						SELECT
							CASE
								WHEN strpos(path, '/') > 0 THEN regexp_replace(path, '/[^/]+$', '')
								ELSE ''
							END AS folder,
							COALESCE(size, 0) AS size
						FROM scoped
					)
					SELECT folder, COUNT(*) AS file_count, SUM(size) AS total_bytes
					FROM folders
					WHERE folder <> ''
					GROUP BY folder
					ORDER BY file_count DESC, folder ASC
					LIMIT ${PAGE_SIZE} OFFSET ${offset}
				`);

				remoteFolderResults =
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					results?.toArray().map((row: any) => ({
						path: row.folder as string,
						fileCount: Number(row.file_count ?? 0),
						totalSize: `${(Number(row.total_bytes ?? 0) / (1024 * 1024)).toFixed(1)} MB`
					})) ?? [];
				remoteFileResults = [];
			} else {
				const countResult = await queryInventory(
					`SELECT COUNT(*) AS match_count FROM archive.files ${whereClause}`
				);
				remoteMatchCount = Number(countResult?.getChild('match_count')?.get(0) ?? 0);

				const results = await queryInventory(
					`SELECT path, size, format, source FROM archive.files ${whereClause} ORDER BY size DESC NULLS LAST LIMIT ${PAGE_SIZE} OFFSET ${offset}`
				);
				remoteFileResults =
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					results?.toArray().map((row: any) => ({
						path: row.path as string,
						size: (Number(row.size ?? 0) / (1024 * 1024)).toFixed(1) + ' MB',
						format: row.format as string,
						source: row.source as string,
						description: 'Found in archive index'
					})) ?? [];
				remoteFolderResults = [];
			}
			hasInitialised = true;
		} catch (e) {
			console.error('DuckDB Query failed', e);
			loadError = 'Archive index is loading or unavailable. Try refreshing the page.';
			remoteMatchCount = 0;
		} finally {
			isQuerying = false;
		}
	}

	function goToPage(page: number) {
		if (page < 1 || page > totalPages || page === currentPage || isQuerying) return;
		performRemoteQuery(page);
	}

	function selectDataset(id: string | null) {
		selectedDataset = id;
		resetQueryState();
		performRemoteQuery(1);
	}

	const totalMatches = $derived(remoteMatchCount ?? 0);
	const totalPages = $derived(Math.max(1, Math.ceil(totalMatches / PAGE_SIZE)));
	const showingFrom = $derived(totalMatches === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1);
	const showingTo = $derived(
		totalMatches === 0 ? 0 : Math.min((currentPage - 1) * PAGE_SIZE + PAGE_SIZE, totalMatches)
	);

	function getIcon(format: string) {
		if (format === 'ecw') return MapIcon;
		if (format === 'jpg') return Image;
		return FileText;
	}
</script>

<main>
	<section class="page-heading">
		<h1>Browse the archive</h1>
		<p>
			Explore curated dataset collections and search the underlying file index. Select a dataset to
			scope your search to its source archive paths, or search across all indexed files.
		</p>
	</section>

	<section class="dataset-list" aria-label="Dataset collections">
		<h2>Collections</h2>
		<div class="dataset-grid">
			{#each datasets as dataset (dataset.id)}
				<button
					id={dataset.id}
					class="dataset-card"
					class:active={selectedDataset === dataset.id}
					onclick={() => selectDataset(selectedDataset === dataset.id ? null : dataset.id)}
				>
					<div class="dataset-topline">
						<span class="status">{statusLabel(dataset.status)}</span>
						<span>{dataset.period}</span>
					</div>
					<h3>{dataset.title}</h3>
					<p>{dataset.summary}</p>
					<div class="dataset-meta">
						<span>{dataset.coverage}</span>
						<span>{dataset.theme}</span>
					</div>
					{#if dataset.assets.length > 0}
						<div class="asset-count">
							{dataset.assets.filter((a) => a.status === 'available').length} of
							{dataset.assets.length} assets available
						</div>
					{/if}
				</button>
			{/each}
		</div>
	</section>

	<section class="explorer-section" aria-label="File explorer">
		<div class="explorer-header">
			<h2>
				{#if activeDataset}
					Files in <em>{activeDataset.title}</em>
					<button class="clear-scope" onclick={() => selectDataset(null)}>
						<X size={14} /> Clear scope
					</button>
				{:else}
					All files
				{/if}
			</h2>
			{#if activeDataset}
				<p class="scope-hint">
					Searching within: {#each activeDataset.sourceArchivePaths as path, i (path)}{path}{#if i < activeDataset.sourceArchivePaths.length - 1},
						{/if}{/each}
				</p>
			{/if}
		</div>

		<div class="explorer-controls">
			<div class="view-filters" aria-label="Result type">
				<button
					class:active={selectedView === 'files'}
					onclick={() => {
						selectedView = 'files';
						resetQueryState();
						performRemoteQuery(1);
					}}
				>
					Files
				</button>
				<button
					class:active={selectedView === 'folders'}
					onclick={() => {
						selectedView = 'folders';
						resetQueryState();
						performRemoteQuery(1);
					}}
				>
					Folders
				</button>
			</div>
			<div class="search-box">
				<Search size={18} />
				<input
					type="text"
					placeholder="Search file paths..."
					bind:value={searchQuery}
					onkeydown={(e) => e.key === 'Enter' && performRemoteQuery(1)}
				/>
			</div>
			<div class="search-box folder-box">
				<Folder size={18} />
				<input
					type="text"
					placeholder="Filter by folder..."
					bind:value={folderQuery}
					onkeydown={(e) => e.key === 'Enter' && performRemoteQuery(1)}
				/>
			</div>
			<div class="format-filters">
				{#each primaryFormats as format (format)}
					<button
						class:active={selectedFormat === format}
						onclick={() => {
							selectedFormat = format;
							resetQueryState();
							performRemoteQuery(1);
						}}
					>
						{format.toUpperCase()}
					</button>
				{/each}
			</div>
			<select
				class="source-filter"
				bind:value={selectedSource}
				onchange={() => {
					resetQueryState();
					performRemoteQuery(1);
				}}
			>
				{#each sourceOptions as source (source)}
					<option value={source}>{source === 'all' ? 'All sources' : source}</option>
				{/each}
			</select>
			<button class="button query-btn" onclick={() => performRemoteQuery(1)} disabled={isQuerying}>
				{#if isQuerying}
					<Loader2 size={18} class="spin" />
				{:else}
					<Database size={18} />
				{/if}
				Search Index
			</button>
		</div>

		{#if loadError}
			<p class="load-error">
				<AlertCircle size={18} />
				{loadError}
			</p>
		{/if}

		<p class="results-summary" aria-live="polite">
			{#if isQuerying && !hasInitialised}
				Loading archive index (approx. 20MB)...
			{:else if isQuerying}
				Querying archive entries...
			{:else if remoteMatchCount !== null}
				{#if remoteMatchCount === 0}
					No {selectedView} match the current filter criteria.
				{:else if remoteMatchCount > PAGE_SIZE}
					Showing {showingFrom.toLocaleString()}-{showingTo.toLocaleString()} of {remoteMatchCount.toLocaleString()}
					matching {selectedView}.
				{:else}
					Showing {remoteMatchCount.toLocaleString()} matching {selectedView}.
				{/if}
			{/if}
		</p>

		<div class="file-grid">
			{#if selectedView === 'folders'}
				{#each remoteFolderResults as folder (folder.path)}
					<div class="file-card folder-card">
						<div class="file-header">
							<Folder size={20} />
							<span class="file-format">Folder</span>
						</div>
						<div class="file-body">
							<code class="file-path">{folder.path}</code>
							<p class="file-desc">{folder.fileCount.toLocaleString()} files in this folder.</p>
						</div>
						<div class="file-footer">
							<span>{folder.totalSize}</span>
						</div>
					</div>
				{:else}
					{#if !isQuerying && hasInitialised}
						<p class="empty">No folders match your filters.</p>
					{/if}
				{/each}
			{:else}
				{#each remoteFileResults as file (file.path)}
					{@const Icon = getIcon(file.format)}
					<div class="file-card">
						<div class="file-header">
							<Icon size={20} />
							<span class="file-format">{file.format}</span>
							<span class="file-source">{file.source}</span>
						</div>
						<div class="file-body">
							<code class="file-path">{file.path}</code>
							<p class="file-desc">{file.description}</p>
						</div>
						<div class="file-footer">
							<span>{file.size}</span>
						</div>
					</div>
				{:else}
					{#if !isQuerying && hasInitialised}
						<p class="empty">No files match your filters.</p>
					{/if}
				{/each}
			{/if}
		</div>

		{#if totalPages > 1}
			<nav class="pagination" aria-label="Results pagination">
				<button
					class="button"
					onclick={() => goToPage(currentPage - 1)}
					disabled={currentPage === 1 || isQuerying}
				>
					Previous
				</button>
				<span>Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}</span>
				<button
					class="button"
					onclick={() => goToPage(currentPage + 1)}
					disabled={currentPage >= totalPages || isQuerying}
				>
					Next
				</button>
			</nav>
		{/if}
	</section>
</main>

<style>
	.page-heading {
		margin-bottom: 1.5rem;
	}

	.page-heading h1 {
		font-size: clamp(1.6rem, 4vw, 2.4rem);
	}

	.page-heading p {
		max-width: 72ch;
		color: #4b4f47;
		line-height: 1.55;
	}

	.dataset-list h2 {
		font-size: 1.15rem;
		margin-bottom: 0.75rem;
	}

	.dataset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.dataset-card {
		display: block;
		width: 100%;
		text-align: left;
		padding: clamp(1rem, 3vw, 1.4rem);
		border: 1px solid #e4ded0;
		border-radius: 8px;
		background: #fbf8ef;
		cursor: pointer;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.dataset-card:hover {
		border-color: #b8b0a0;
	}

	.dataset-card.active {
		border-color: #304832;
		box-shadow: 0 0 0 2px #304832;
	}

	.dataset-topline {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		color: #6b675f;
		font-size: 0.84rem;
	}

	.dataset-card h3 {
		margin: 0.6rem 0 0.4rem;
		font-size: 1.1rem;
	}

	.dataset-card > p {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		color: #50534b;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.dataset-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		color: #6b675f;
		font-size: 0.82rem;
	}

	.asset-count {
		margin-top: 0.5rem;
		font-size: 0.82rem;
		color: #2d6a4f;
		font-weight: 500;
	}

	.explorer-section {
		border-top: 1px solid #e4ded0;
		padding-top: 1.5rem;
	}

	.explorer-header {
		margin-bottom: 1rem;
	}

	.explorer-header h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.15rem;
		margin-bottom: 0.25rem;
	}

	.clear-scope {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: 0.5rem;
		padding: 0.2rem 0.5rem;
		border: 1px solid #d9d3c6;
		border-radius: 4px;
		background: #fff;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.scope-hint {
		margin: 0;
		font-size: 0.82rem;
		color: #6b675f;
	}

	.explorer-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.view-filters {
		display: flex;
		gap: 0.35rem;
	}

	.view-filters button {
		padding: 0.45rem 0.85rem;
		border: 1px solid #d9d3c6;
		border-radius: 6px;
		background: #fffdf7;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.view-filters button.active {
		border-color: #304832;
		background: #304832;
		color: #fffdf7;
	}

	.search-box {
		position: relative;
		flex: 1;
		min-width: 280px;
	}

	.folder-box {
		min-width: 200px;
	}

	.search-box :global(svg) {
		position: absolute;
		top: 50%;
		left: 0.75rem;
		transform: translateY(-50%);
		color: #6b675f;
	}

	.search-box input {
		width: 100%;
		padding: 0.55rem 0.75rem 0.55rem 2.2rem;
		border: 1px solid #d9d3c6;
		border-radius: 6px;
		background: #fff;
		font-size: 0.9rem;
	}

	.format-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.format-filters button {
		padding: 0.4rem 0.6rem;
		border: 1px solid #d9d3c6;
		border-radius: 4px;
		background: #fffdf7;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.format-filters button.active {
		border-color: #304832;
		background: #304832;
		color: #fffdf7;
	}

	.source-filter {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d9d3c6;
		border-radius: 6px;
		background: #fff;
		font-size: 0.9rem;
	}

	.query-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1rem;
		border: 1px solid #304832;
		border-radius: 6px;
		background: #304832;
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.query-btn:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	.results-summary {
		margin-bottom: 1rem;
		color: #5c5a52;
		font-size: 0.9rem;
	}

	.file-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.file-card {
		padding: 0.9rem;
		border: 1px solid #e4ded0;
		border-radius: 6px;
		background: #fbf8ef;
	}

	.file-header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.5rem;
	}

	.file-format {
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		background: #e9efe2;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.file-source {
		margin-left: auto;
		font-size: 0.78rem;
		color: #6b675f;
	}

	.file-path {
		font-size: 0.85rem;
		word-break: break-all;
	}

	.file-desc {
		margin: 0.3rem 0 0;
		font-size: 0.82rem;
		color: #6b675f;
	}

	.file-footer {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid #e4ded0;
		font-size: 0.82rem;
		color: #5c5a52;
	}

	.folder-card {
		background: #fff;
	}

	.empty {
		grid-column: 1 / -1;
		padding: 2rem;
		text-align: center;
		color: #6b675f;
	}

	.load-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		border: 1px solid #c44;
		border-radius: 6px;
		background: #fee;
		color: #822;
		margin-bottom: 1rem;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid #e4ded0;
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
