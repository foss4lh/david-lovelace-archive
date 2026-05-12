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
						'raster-source': {
							type: 'raster',
							url: `pmtiles://${PMTILES_URL}`,
							tileSize: 256,
							attribution: 'David Lovelace Archive'
						}
					},
					layers: [
						{
							id: 'raster-layer',
							type: 'raster',
							source: 'raster-source'
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

<div class="space-y-4 p-4">
	<h1 class="text-2xl font-bold">MapLibre Raster PMTiles Debug</h1>
	{#if error}
		<div class="rounded bg-red-100 p-4 text-red-800">
			<strong>Error:</strong>
			{error}
		</div>
	{/if}
	{#if loading}
		<div class="rounded bg-gray-100 p-4 text-gray-600">Loading map…</div>
	{/if}
	<div bind:this={container} class="h-[500px] w-full rounded border"></div>
	<div class="rounded bg-gray-50 p-4 font-mono text-sm">
		<h3 class="mb-2 font-bold">Debug log:</h3>
		{#each log as line, i (i)}
			<div class="py-0.5">{line}</div>
		{/each}
	</div>
</div>
