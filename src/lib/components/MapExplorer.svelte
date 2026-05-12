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
	let layerError = $state<string | null>(null);
	let layerLoading = $state(false);

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
		layerError = null;
		layerLoading = false;

		if (!selectedAsset?.localPath) return;

		async function addLayer() {
			if (!map || !selectedAsset?.localPath) return;
			layerLoading = true;

			try {
				const [{ default: TileLayer }, { PMTilesRasterSource }] = await Promise.all([
					import('ol/layer/Tile.js'),
					import('ol-pmtiles')
				]);

				// Ensure the URL is absolute so range requests work in both dev and production
				const url = selectedAsset.localPath.startsWith('http')
					? selectedAsset.localPath
					: `${window.location.origin}${selectedAsset.localPath}`;

				console.log('[MapExplorer] Loading PMTiles from:', url);

				const source = new PMTilesRasterSource({
					url,
					attributions: 'David Lovelace Archive',
					tileSize: 256
				});

				// Listen for source errors
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				source.on('error', (e: any) => {
					console.error('[MapExplorer] PMTiles source error:', e);
					layerError = `Tile source error: ${e.message || 'unknown'}`;
				});

				overlayLayer = new TileLayer({
					source,
					opacity
				});

				map.addLayer(overlayLayer);
				attemptedLayer = true;

				// Auto-zoom to layer bounds when available
				if (selectedAsset.bounds) {
					zoomToBounds(selectedAsset.bounds);
				}
			} catch (err: unknown) {
				console.error('[MapExplorer] Failed to load PMTiles:', err);
				layerError = err instanceof Error ? err.message : 'Failed to load layer';
			} finally {
				layerLoading = false;
			}
		}

		addLayer();
	});

	function zoomToBounds(bounds: [number, number, number, number]) {
		if (!map) return;
		const [minX, minY, maxX, maxY] = bounds;
		import('ol/proj.js').then((proj) => {
			const extent = proj.transformExtent([minX, minY, maxX, maxY], 'EPSG:4326', 'EPSG:3857');
			map!.getView().fit(extent, { padding: [40, 40, 40, 40], duration: 600 });
		});
	}
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

		{#if selectedAsset?.bounds}
			<button class="zoom-btn" onclick={() => zoomToBounds(selectedAsset.bounds!)}>
				Zoom to layer
			</button>
		{/if}

		{#if selectedDataset}
			<div class="map-notes">
				<span class="status">{selectedDataset.status.replace(/-/g, ' ')}</span>
				<h2>{selectedDataset.title}</h2>
				<p>{selectedDataset.summary}</p>

				{#if selectedAsset}
					<p>
						Asset: <code>{selectedAsset.title}</code>
						{#if selectedAsset.minZoom !== undefined && selectedAsset.maxZoom !== undefined}
							(zoom {selectedAsset.minZoom}–{selectedAsset.maxZoom})
						{/if}
					</p>
					{#if selectedAsset.bounds}
						<p class="muted">
							Bounds: {selectedAsset.bounds[0].toFixed(3)}, {selectedAsset.bounds[1].toFixed(3)} →
							{selectedAsset.bounds[2].toFixed(3)}, {selectedAsset.bounds[3].toFixed(3)}
						</p>
					{/if}

					{#if layerLoading}
						<p class="muted">Loading layer…</p>
					{:else if layerError}
						<p class="error">{layerError}</p>
					{:else if attemptedLayer}
						<p class="muted">
							Layer loaded. Use “Zoom to layer” above if tiles are not in the current view.
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

	.zoom-btn {
		width: 100%;
		margin-bottom: 1rem;
		padding: 0.55rem;
		border: 1px solid #304832;
		border-radius: 6px;
		background: #304832;
		color: #fffdf7;
		font-weight: 600;
		cursor: pointer;
	}

	.zoom-btn:hover {
		background: #3d5a3f;
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

	.error {
		color: #962116;
		background: #fdecea;
		padding: 0.5rem;
		border-radius: 4px;
		font-size: 0.85rem;
	}

	@media (max-width: 860px) {
		.map-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
