<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let container: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let map: any = null;
	let error = $state<string | null>(null);
	let loading = $state(true);
	let log = $state<string[]>([]);

	function addLog(msg: string) {
		log = [...log, msg];
		console.log(msg);
	}

	onMount(async () => {
		if (!browser) return;
		try {
			addLog('Importing maplibre-gl...');
			const { default: maplibregl } = await import('maplibre-gl');
			addLog('Importing pmtiles...');
			const { Protocol, PMTiles } = await import('pmtiles');

			addLog('Registering pmtiles protocol...');
			const protocol = new Protocol();
			maplibregl.addProtocol('pmtiles', protocol.tile);

			const PMTILES_URL = '/data/fc1953-c13.pmtiles';
			const p = new PMTiles(PMTILES_URL);
			protocol.add(p);

			addLog('Fetching PMTiles header...');
			const h = await p.getHeader();
			addLog(`Header: zoom ${h.minZoom}-${h.maxZoom}, center ${h.centerLon},${h.centerLat}`);

			addLog('Creating map...');
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
						},
						'raster-source': {
							type: 'raster',
							url: `pmtiles://${PMTILES_URL}`,
							tileSize: 256,
							attribution: 'David Lovelace Archive'
						}
					},
					layers: [
						{
							id: 'osm',
							type: 'raster',
							source: 'osm'
						},
						{
							id: 'raster-layer',
							type: 'raster',
							source: 'raster-source',
							paint: { 'raster-opacity': 0.85 }
						}
					]
				},
				center: [h.centerLon, h.centerLat],
				zoom: h.maxZoom - 2
			});

			map.on('load', () => {
				addLog('Map loaded successfully!');
				loading = false;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			map.on('error', (e: any) => {
				addLog(`Map error: ${e.error?.message || JSON.stringify(e)}`);
				error = e.error?.message || 'Map error';
				loading = false;
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			map.on('sourcedataloading', (e: any) => {
				if (e.sourceId === 'raster-source') addLog('Raster source loading...');
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			map.on('sourcedata', (e: any) => {
				if (e.sourceId === 'raster-source') addLog('Raster source data event');
			});
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			addLog(`Fatal error: ${err.message}`);
			error = err.message;
			loading = false;
		}
	});

	onDestroy(() => {
		map?.remove();
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css" />
</svelte:head>

<div style="padding: 1rem;">
	<h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">
		MapLibre Raster PMTiles Debug
	</h1>
	{#if error}
		<div
			style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;"
		>
			<strong>Error:</strong>
			{error}
		</div>
	{/if}
	{#if loading}
		<div
			style="background: #f3f4f6; color: #4b5563; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;"
		>
			Loading map…
		</div>
	{/if}
	<div
		bind:this={container}
		style="height: 500px; width: 100%; border: 1px solid #d1d5db; border-radius: 4px;"
	></div>
	<div
		style="background: #f9fafb; padding: 1rem; margin-top: 1rem; font-family: monospace; font-size: 0.875rem; border-radius: 4px;"
	>
		<h3 style="margin-bottom: 0.5rem; font-weight: bold;">Debug log:</h3>
		{#each log as line, i (i)}
			<div style="padding: 2px 0;">{line}</div>
		{/each}
	</div>
</div>
