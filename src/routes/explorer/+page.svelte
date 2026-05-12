<script lang="ts">
	import { onMount } from 'svelte';
	import {
		FileText,
		Image,
		Folder,
		Map as MapIcon,
		Search,
		Database as DbIcon,
		Loader2,
		AlertCircle
	} from '@lucide/svelte';
	import { queryInventory } from '$lib/duckdb';

	interface FileEntry {
		path: string;
		size: string;
		format: string;
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
	let selectedView = $state<'files' | 'folders'>('files');
	let currentPage = $state(1);
	let isQuerying = $state(false);
	let remoteFileResults = $state<FileEntry[]>([]);
	let remoteFolderResults = $state<FolderEntry[]>([]);
	let remoteMatchCount = $state<number | null>(null);
	let hasQueriedRemote = $state(false);
	let loadError = $state<string | null>(null);

	// High-value formats for quick filtering
	const primaryFormats = ['all', 'ecw', 'tif', 'jpg', 'pdf', 'doc', 'txt', 'shp'];

	onMount(() => {
		// Initial load of the full index
		performRemoteQuery(1);
	});

	function resetQueryState(resetPage = true) {
		remoteMatchCount = null;
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

		return filters.length ? `WHERE ${filters.join(' AND ')}` : '';
	}

	async function performRemoteQuery(page = 1) {
		currentPage = page;
		isQuerying = true;
		hasQueriedRemote = true;
		loadError = null;

		try {
			const whereClause = buildWhereClause();
			const offset = (page - 1) * PAGE_SIZE;

			if (selectedView === 'folders') {
				const countResult = await queryInventory(`
					WITH scoped AS (
						SELECT path
						FROM files
						${whereClause}
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
						SELECT path, size
						FROM files
						${whereClause}
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
					`SELECT COUNT(*) AS match_count FROM files ${whereClause}`
				);
				remoteMatchCount = Number(countResult?.getChild('match_count')?.get(0) ?? 0);

				const results = await queryInventory(
					`SELECT path, size, format FROM files ${whereClause} ORDER BY size DESC NULLS LAST LIMIT ${PAGE_SIZE} OFFSET ${offset}`
				);
				remoteFileResults =
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					results?.toArray().map((row: any) => ({
						path: row.path as string,
						size: ((row.size as number) / (1024 * 1024)).toFixed(1) + ' MB',
						format: row.format as string,
						description: 'Found in archive index'
					})) ?? [];
				remoteFolderResults = [];
			}
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
		<h1>File explorer</h1>
		<p>
			Search and browse over 1.1 million files within the 2TB archive index. This view helps
			identify candidates for georeferencing, transcription, and research publication.
		</p>
	</section>

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
		<button class="button query-btn" onclick={() => performRemoteQuery(1)} disabled={isQuerying}>
			{#if isQuerying}
				<Loader2 size={18} class="spin" />
			{:else}
				<DbIcon size={18} />
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
		{#if isQuerying}
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
				{#if !isQuerying && hasQueriedRemote}
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
				{#if !isQuerying && hasQueriedRemote}
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
</main>

<style>
	.explorer-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 2rem;
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
		padding: 0.65rem 0.65rem 0.65rem 2.5rem;
		border: 1px solid #d9d3c6;
		border-radius: 6px;
		background: #fffdf7;
	}

	.format-filters {
		display: flex;
		gap: 0.35rem;
	}

	.format-filters button {
		padding: 0.45rem 0.85rem;
		border: 1px solid #d9d3c6;
		border-radius: 6px;
		background: #fffdf7;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.format-filters button.active {
		border-color: #304832;
		background: #304832;
		color: #fffdf7;
	}

	.query-btn {
		min-width: 140px;
	}

	.load-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		border-radius: 6px;
		background: #fdecea;
		color: #962116;
		font-size: 0.9rem;
	}

	.results-summary {
		margin: -0.5rem 0 1rem;
		color: #5f6359;
		font-size: 0.9rem;
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

	.file-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
	}

	.file-card {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
	}

	.file-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.file-format {
		color: #6b675f;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.file-path {
		display: block;
		margin-bottom: 0.5rem;
		color: #304832;
		font-size: 0.85rem;
		word-break: break-all;
	}

	.file-desc {
		margin: 0;
		color: #5f6359;
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.file-footer {
		margin-top: auto;
		padding-top: 0.75rem;
		color: #8c887d;
		font-size: 0.8rem;
	}

	.empty {
		grid-column: 1 / -1;
		padding: 3rem;
		color: #6b675f;
		text-align: center;
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.pagination span {
		color: #5f6359;
		font-size: 0.9rem;
	}
</style>
