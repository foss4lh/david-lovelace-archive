<script lang="ts">
	import MapExplorer from '$lib/components/MapExplorer.svelte';
	import { visualDatasets } from '$lib/catalog';
</script>

<main>
	<section class="page-heading">
		<p class="eyebrow">Map explorer</p>
		<h1>Visualise maps as web-ready layers become available.</h1>
		<p>
			The first implementation uses OpenLayers and PMTiles-compatible catalog entries. It remains
			useful before data download because it shows exactly which assets are expected and where they
			will live in the static build.
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
