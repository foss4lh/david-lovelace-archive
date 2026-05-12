<script lang="ts">
	import 'ol/ol.css';
	import { onMount } from 'svelte';
	import type { ArchiveDataset, DatasetAsset } from '$lib/catalog';

	let { datasets }: { datasets: ArchiveDataset[] } = $props();

	let mapElement: HTMLDivElement;
	let map: import('ol/Map').default | undefined;
	let overlayLayer: import('ol/layer/Tile').default | undefined;
	let selectedId = $state('');
	let opacity = $state(0.75);
	let attemptedLayer = $state(false);

	const selectedDataset = $derived(datasets.find((dataset) => dataset.id === selectedId));
	const selectedAsset = $derived(
		selectedDataset?.assets.find((asset) => asset.kind === 'pmtiles') as DatasetAsset | undefined
	);

	$effect(() => {
		if (!selectedId && datasets.length) selectedId = datasets[0].id;
	});

	onMount(() => {
		let disposed = false;

		async function initialise() {
			const [
				{ default: OlMap },
				{ default: View },
				{ default: TileLayer },
				{ default: OSM },
				proj,
				control
			] = await Promise.all([
				import('ol/Map.js'),
				import('ol/View.js'),
				import('ol/layer/Tile.js'),
				import('ol/source/OSM.js'),
				import('ol/proj.js'),
				import('ol/control/ScaleLine.js')
			]);

			if (disposed) return;

			map = new OlMap({
				target: mapElement,
				layers: [
					new TileLayer({
						source: new OSM()
					})
				],
				view: new View({
					center: proj.fromLonLat([-2.72, 52.08]),
					zoom: 9.5
				})
			});

			map.addControl(
				new control.default({
					units: 'metric',
					bar: true,
					steps: 4,
					text: true,
					minWidth: 140
				})
			);
		}

		initialise();
		return () => {
			disposed = true;
			map?.setTarget(undefined);
		};
	});

	$effect(() => {
		if (!map) return;
		overlayLayer?.setOpacity(opacity);
	});

	$effect(() => {
		if (!map) return;

		if (overlayLayer) {
			map.removeLayer(overlayLayer);
			overlayLayer = undefined;
		}

		attemptedLayer = false;

		if (!selectedAsset?.localPath) return;

		async function addLayer() {
			if (!map || !selectedAsset?.localPath) return;
			const [{ default: TileLayer }, { PMTilesRasterSource }] = await Promise.all([
				import('ol/layer/Tile.js'),
				import('ol-pmtiles')
			]);

			overlayLayer = new TileLayer({
				source: new PMTilesRasterSource({
					url: selectedAsset.localPath,
					attributions: 'David Lovelace Archive',
					tileSize: 256
				}),
				opacity
			});
			map.addLayer(overlayLayer);
			attemptedLayer = true;
		}

		addLayer();
	});
</script>

<div class="map-layout">
	<aside class="map-sidebar">
		<label for="dataset">Visual dataset</label>
		<select id="dataset" bind:value={selectedId}>
			{#each datasets as dataset (dataset.id)}
				<option value={dataset.id}>{dataset.title}</option>
			{/each}
		</select>

		<label for="opacity">Overlay opacity: {Math.round(opacity * 100)}%</label>
		<input id="opacity" type="range" min="0" max="1" step="0.05" bind:value={opacity} />

		{#if selectedDataset}
			<div class="map-notes">
				<span class="status">{selectedDataset.status.replace(/-/g, ' ')}</span>
				<h2>{selectedDataset.title}</h2>
				<p>{selectedDataset.summary}</p>
				{#if selectedAsset}
					<p>
						Asset target: <code>{selectedAsset.localPath}</code>. Run
						<code>npm run data:download</code> once the release asset exists.
					</p>
					{#if attemptedLayer}
						<p class="muted">
							The PMTiles layer has been registered with OpenLayers. If the file has not been
							downloaded yet, browser tile requests will return 404 until the asset is present.
						</p>
					{/if}
				{:else}
					<p class="muted">No map-ready PMTiles or COG asset is registered yet.</p>
				{/if}
			</div>
		{/if}
	</aside>

	<section class="map-stage">
		<div bind:this={mapElement} class="map-canvas" aria-label="OpenLayers map"></div>
	</section>
</div>

<style>
	.map-layout {
		display: grid;
		grid-template-columns: 330px minmax(0, 1fr);
		gap: 1rem;
		min-height: 620px;
	}

	.map-sidebar {
		padding: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.35rem;
		color: #5d6158;
		font-size: 0.82rem;
		font-weight: 700;
	}

	select,
	input[type='range'] {
		width: 100%;
		margin-bottom: 1rem;
	}

	select {
		padding: 0.55rem;
		border: 1px solid #c8c0b0;
		border-radius: 6px;
		background: #fffdf7;
		color: #20231f;
	}

	.map-stage {
		overflow: hidden;
		min-height: 620px;
	}

	.map-canvas {
		width: 100%;
		height: 100%;
		min-height: 620px;
	}

	.map-notes {
		padding-top: 0.7rem;
		border-top: 1px solid #e4ded0;
	}

	.map-notes h2 {
		margin: 0.65rem 0 0.45rem;
		font-size: 1.2rem;
	}

	.map-notes p {
		color: #55594f;
		line-height: 1.5;
	}

	code {
		padding: 0.08rem 0.28rem;
		border-radius: 4px;
		background: #eee8da;
	}

	.muted {
		color: #706c63;
	}

	@media (max-width: 860px) {
		.map-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
