<script lang="ts">
	import { resolve } from '$app/paths';
	import { FileText, Image, Map as MapIcon, Search } from '@lucide/svelte';
	import explorerData from '../../../catalog/explorer.json';

	let searchQuery = $state('');
	let selectedFormat = $state('all');

	const formats = ['all', ...new Set(explorerData.map((f) => f.format))];

	const filteredFiles = $derived(
		explorerData.filter((file) => {
			const matchesSearch = file.path.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesFormat = selectedFormat === 'all' || file.format === selectedFormat;
			return matchesSearch && matchesFormat;
		})
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
			Browse high-value files within the local archive. This view helps identify candidates for
			georeferencing and web publication.
		</p>
	</section>

	<div class="explorer-controls">
		<div class="search-box">
			<Search size={18} />
			<input type="text" placeholder="Search paths..." bind:value={searchQuery} />
		</div>
		<div class="format-filters">
			{#each formats as format}
				<button
					class:active={selectedFormat === format}
					onclick={() => (selectedFormat = format)}
				>
					{format.toUpperCase()}
				</button>
			{/each}
		</div>
	</div>

	<div class="file-grid">
		{#each filteredFiles as file}
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
			<p class="empty">No files match your filters.</p>
		{/each}
	</div>
</main>

<style>
	.explorer-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.search-box {
		position: relative;
		flex: 1;
		min-width: 280px;
	}

	.search-box svg {
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
</style>
