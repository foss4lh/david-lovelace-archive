<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { ArchiveDataset, DatasetAsset } from '$lib/catalog';

	let { datasets }: { datasets: ArchiveDataset[] } = $props();

	let container: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let map: any = $state.raw(null);
	let selectedAssetId = $state('');
	let opacity = $state(0.75);
	let layerError = $state<string | null>(null);
	let layerLoading = $state(false);

	// Flatten all available pmtiles/cog assets across all datasets into a single list
	const allAssets = $derived(
		datasets.flatMap((d) =>
			d.assets
				.filter((a) => (a.kind === 'pmtiles' || a.kind === 'cog') && a.status === 'available')
				.map((a) => ({ dataset: d, asset: a as DatasetAsset }))
		)
	);

	const selectedEntry = $derived(allAssets.find((e) => e.asset.id === selectedAssetId));
	const selectedDataset = $derived(selectedEntry?.dataset);
	const selectedAsset = $derived(selectedEntry?.asset);

	// Auto-select first available asset on load
	$effect(() => {
		if (!selectedAssetId && allAssets.length) selectedAssetId = allAssets[0].asset.id;
	});

	// Opacity control — read opacity first so Svelte always tracks it as a dependency,
	// even when the early-return guard fires before the setPaintProperty call
	$effect(() => {
		const o = opacity;
		if (!map || !map.getLayer('raster-layer')) return;
		map.setPaintProperty('raster-layer', 'raster-opacity', o);
	});

	onMount(() => {
		if (!browser) return;

		async function initMap() {
			const { default: maplibregl } = await import('maplibre-gl');
			const { Protocol } = await import('pmtiles');

			const protocol = new Protocol();
			maplibregl.addProtocol('pmtiles', protocol.tile);

			map = new maplibregl.Map({
				container,
				style: {
					version: 8,
					sources: {
						osm: {
							type: 'raster',
							tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
							tileSize: 256,
							attribution: '&copy; OpenStreetMap contributors',
							maxzoom: 19
						}
					},
					layers: [
						{
							id: 'osm',
							type: 'raster',
							source: 'osm'
						}
					]
				},
				center: [-2.72, 52.08],
				zoom: 9.5
			});

			map.on('error', (e: unknown) => {
				console.error('MapLibre error:', e);
			});
		}

		initMap();
	});

	onDestroy(() => {
		map?.remove();
	});

	// Add/remove PMTiles overlay when selectedAsset changes
	$effect(() => {
		if (!map || !selectedAsset?.localPath) return;

		async function addOverlay() {
			if (!selectedAsset) return;
			layerLoading = true;
			layerError = null;

			try {
				const { PMTiles } = await import('pmtiles');
				const localPath = selectedAsset.localPath;
				if (!localPath) throw new Error('Asset has no localPath');
				const url = localPath.startsWith('http')
					? localPath
					: `${window.location.origin}${localPath}`;

				console.log('[MapExplorer] Loading PMTiles from:', url);

				const p = new PMTiles(url);
				await p.getHeader(); // validate file is readable

				// Remove existing overlay if present
				if (map.getSource('pmtiles-raster')) {
					map.removeLayer('raster-layer');
					map.removeSource('pmtiles-raster');
				}

				map.addSource('pmtiles-raster', {
					type: 'raster',
					url: `pmtiles://${url}`,
					tileSize: 256,
					attribution: 'David Lovelace Archive'
				});

				map.addLayer({
					id: 'raster-layer',
					type: 'raster',
					source: 'pmtiles-raster',
					paint: { 'raster-opacity': opacity }
				});
			} catch (err: unknown) {
				console.error('[MapExplorer] Failed to load PMTiles:', err);
				layerError = err instanceof Error ? err.message : 'Failed to load layer';
			} finally {
				layerLoading = false;
			}
		}

		// Wait for style to load before adding overlay
		if (map.isStyleLoaded()) {
			addOverlay();
		} else {
			map.once('style.load', addOverlay);
		}
	});

	function zoomToBounds(bounds: [number, number, number, number]) {
		if (!map) return;
		const [minX, minY, maxX, maxY] = bounds;
		map.fitBounds([minX, minY, maxX, maxY], { padding: 40, duration: 600 });
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css" />
</svelte:head>

<div class="map-layout">
	<aside class="map-sidebar">
		<label for="dataset">Map layer</label>
		<select id="dataset" bind:value={selectedAssetId}>
			{#each allAssets as entry (entry.asset.id)}
				<option value={entry.asset.id}>{entry.asset.title}</option>
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
					{:else}
						<p class="muted">
							Layer loaded. Use “Zoom to layer” above if tiles are not in the current view.
						</p>
					{/if}
				{:else}
					<p class="muted">No map-ready PMTiles asset is registered yet.</p>
				{/if}
			</div>
		{/if}
	</aside>

	<section class="map-stage">
		<div bind:this={container} class="map-canvas" aria-label="MapLibre map"></div>
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
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 620px;
	}

	.map-canvas {
		width: 100%;
		flex: 1 1 auto;
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
