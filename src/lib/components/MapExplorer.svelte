<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { ArchiveDataset, DatasetAsset } from '$lib/catalog';

	let { datasets }: { datasets: ArchiveDataset[] } = $props();

	let container: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let map: any = $state.raw(null);
	// Find the first available geojson asset (e.g. Ancient Woodland)
	const woodlandAsset = $derived(
		datasets
			.flatMap((d) => d.assets)
			.find((a) => a.kind === 'geojson' && a.status === 'available' && a.localPath) as
			| DatasetAsset
			| undefined
	);

	// Datasets that have at least one pmtiles asset (cogs are download-only companions)
	const visualDatasets = $derived(
		datasets.filter((d) => d.assets.some((a) => a.kind === 'pmtiles'))
	);

	// Initialise selection from props so SSR emits populated selects
	let selectedDatasetId = $state(
		datasets.find((d) => d.assets.some((a) => a.kind === 'pmtiles'))?.id ?? ''
	);
	let selectedAssetId = $state(
		(() => {
			const ds = datasets.find((d) => d.assets.some((a) => a.kind === 'pmtiles'));
			const assets = ds ? ds.assets.filter((a) => a.kind === 'pmtiles') : [];
			return assets.find((a) => a.status === 'available')?.id ?? '';
		})()
	);
	let opacity = $state(0.75);
	let layerError = $state<string | null>(null);
	let layerLoading = $state(false);
	let showWoodland = $state(false);

	const selectedDataset = $derived(visualDatasets.find((d) => d.id === selectedDatasetId));

	// Only pmtiles assets appear in the map sheet dropdown
	const currentDatasetAssets = $derived(
		selectedDataset ? selectedDataset.assets.filter((a) => a.kind === 'pmtiles') : []
	);

	const selectedAsset = $derived(
		currentDatasetAssets.find((a) => a.id === selectedAssetId) as DatasetAsset | undefined
	);

	// Find matching COG asset (same base id + '-cog')
	const selectedCogAsset = $derived(
		selectedDataset?.assets.find((a) => a.id === selectedAssetId + '-cog' && a.kind === 'cog')
	);

	// Auto-select first available pmtiles asset when dataset changes
	$effect(() => {
		const assets = currentDatasetAssets;
		if (selectedDatasetId && assets.length) {
			const firstAvailable = assets.find((a) => a.status === 'available');
			selectedAssetId = firstAvailable?.id ?? '';
		} else {
			selectedAssetId = '';
		}
	});

	// Opacity control — read opacity first so Svelte always tracks it as a dependency,
	// even when the early-return guard fires before the setPaintProperty call
	$effect(() => {
		const o = opacity;
		if (!map || !map.getLayer('raster-layer')) return;
		map.setPaintProperty('raster-layer', 'raster-opacity', o);
	});

	// Ancient Woodland vector overlay toggle
	$effect(() => {
		if (!map) return;
		const show = showWoodland;

		async function addWoodland() {
			if (!woodlandAsset?.localPath) return;
			try {
				const url = woodlandAsset.localPath.startsWith('http')
					? woodlandAsset.localPath
					: `${window.location.origin}${woodlandAsset.localPath}`;

				if (!map.getSource('woodland')) {
					const res = await fetch(url);
					const data = await res.json();
					map.addSource('woodland', { type: 'geojson', data });
				}

				if (!map.getLayer('woodland-fill')) {
					map.addLayer({
						id: 'woodland-fill',
						type: 'fill',
						source: 'woodland',
						paint: {
							'fill-color': '#2d5a27',
							'fill-opacity': 0.15,
							'fill-outline-color': '#1a3d17'
						}
					});
				}
			} catch (err: unknown) {
				console.error('[MapExplorer] Failed to load woodland layer:', err);
			}
		}

		function removeWoodland() {
			if (map.getLayer('woodland-fill')) map.removeLayer('woodland-fill');
		}

		if (map.isStyleLoaded()) {
			if (show) addWoodland();
			else removeWoodland();
		} else {
			map.once('style.load', () => {
				if (show) addWoodland();
				else removeWoodland();
			});
		}
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
		<label for="dataset">Data source</label>
		<select id="dataset" bind:value={selectedDatasetId}>
			{#each visualDatasets as ds (ds.id)}
				<option value={ds.id}>{ds.title}</option>
			{/each}
		</select>

		<label for="asset">Map sheet / parish</label>
		<select id="asset" bind:value={selectedAssetId}>
			{#each currentDatasetAssets as asset (asset.id)}
				<option value={asset.id} disabled={asset.status !== 'available'}>
					{asset.status === 'available'
						? asset.title
						: `${asset.title} — ${asset.status.replace(/-/g, ' ')}`}
				</option>
			{/each}
		</select>

		<label for="opacity">Overlay opacity: {Math.round(opacity * 100)}%</label>
		<input id="opacity" type="range" min="0" max="1" step="0.05" bind:value={opacity} />

		{#if woodlandAsset}
			<label class="toggle-label">
				<input type="checkbox" bind:checked={showWoodland} />
				Show Ancient Woodland boundaries
			</label>
		{/if}

		{#if selectedAsset?.bounds}
			<button class="zoom-btn" onclick={() => zoomToBounds(selectedAsset.bounds!)}>
				Zoom to layer
			</button>
		{/if}

		{#if selectedCogAsset?.remoteUrl}
			<a
				class="download-btn"
				href={selectedCogAsset.remoteUrl}
				target="_blank"
				rel="noopener external"
				download
			>
				Download GeoTIFF (COG)
			</a>
		{/if}

		{#if selectedDataset}
			<div class="map-notes">
				<span class="status">{selectedDataset.status.replace(/-/g, ' ')}</span>
				<h2>{selectedDataset.title}</h2>
				<p class="period">{selectedDataset.period}</p>
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

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
		font-weight: 400;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.toggle-label input[type='checkbox'] {
		width: auto;
		margin-bottom: 0;
	}

	select {
		padding: 0.55rem;
		border: 1px solid #c8c0b0;
		border-radius: 6px;
		background: #fffdf7;
		color: #20231f;
	}

	select option:disabled {
		color: #999;
		font-style: italic;
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

	.download-btn {
		display: block;
		width: 100%;
		margin-bottom: 1rem;
		padding: 0.55rem;
		border: 1px solid #6b5b3e;
		border-radius: 6px;
		background: #fffdf7;
		color: #6b5b3e;
		font-weight: 600;
		cursor: pointer;
		text-align: center;
		text-decoration: none;
		font-size: 0.9rem;
	}

	.download-btn:hover {
		background: #f5efe4;
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
		margin: 0.65rem 0 0.2rem;
		font-size: 1.2rem;
	}

	.period {
		color: #7a735f;
		font-weight: 700;
		font-size: 0.9rem;
		margin: 0 0 0.6rem;
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
