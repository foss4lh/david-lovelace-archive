<script lang="ts">
	import MapExplorer from '$lib/components/MapExplorer.svelte';
	import { visualDatasets } from '$lib/catalog';
</script>

<main>
	<section class="page-heading">
		<h1>Map explorer</h1>
		<p>
			Browse georeferenced layers as they are published to the web-ready catalog.
		</p>
	</section>

	{#if visualDatasets.length}
		<MapExplorer datasets={visualDatasets} />
	{:else}
		<section class="doc-panel empty-state">
			<h2>No visual datasets yet</h2>
			<p>Add PMTiles or COG assets to <code>catalog/datasets.json</code> to enable map browsing.</p>
		</section>
	{/if}
</main>

<style>
	.empty-state {
		padding: 1.25rem;
	}

	code {
		padding: 0.08rem 0.28rem;
		border-radius: 4px;
		background: #eee8da;
	}
</style>
