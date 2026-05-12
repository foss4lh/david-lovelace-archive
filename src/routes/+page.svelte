<script lang="ts">
	import { ArrowRight, Database, Download, Map, SearchCheck } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { datasets, summaryStats } from '$lib/catalog';
</script>

<main>
	<section class="hero">
		<div>
			<p class="eyebrow">Static-first archive portal</p>
			<h1>Making a 2 TB landscape history archive discoverable, useful, and ready for research.</h1>
			<p class="lede">
				The David Lovelace Archive brings together maps, aerial photography, habitat data, public
				records, surveys, and working notes documenting Herefordshire's changing landscape.
			</p>
			<div class="actions">
				<a class="button primary" href={resolve('/datasets')}
					>Browse datasets <ArrowRight size={17} /></a
				>
				<a class="button" href={resolve('/research')}>See work to be done</a>
			</div>
		</div>
		<aside class="hero-panel" aria-label="Archive summary">
			<div>
				<span>{summaryStats.datasetCount}</span>
				<p>initial dataset groups</p>
			</div>
			<div>
				<span>{summaryStats.webReadyCount}</span>
				<p>web-ready or prototype visualisations</p>
			</div>
			<div>
				<span>2.0 TB</span>
				<p>sampled local archive size</p>
			</div>
		</aside>
	</section>

	<section class="section-grid">
		<a class="feature" href={resolve('/datasets')}>
			<Database size={22} />
			<h2>Dataset catalog</h2>
			<p>Track source archive paths, derived assets, release downloads, status, and limitations.</p>
		</a>
		<a class="feature" href={resolve('/maps')}>
			<Map size={22} />
			<h2>Map explorer</h2>
			<p>View web-ready raster maps and prepare PMTiles layers as they are published.</p>
		</a>
		<a class="feature" href={resolve('/workflow')}>
			<Download size={22} />
			<h2>Clean data workflow</h2>
			<p>Keep raw data out of git while downloading curated assets during build or local setup.</p>
		</a>
		<a class="feature" href={resolve('/research')}>
			<SearchCheck size={22} />
			<h2>Research agenda</h2>
			<p>
				Prioritise georectification, digitisation, transcription, and PhD-scale historical research.
			</p>
		</a>
	</section>

	<section class="content-band">
		<div>
			<p class="eyebrow">Initial scope</p>
			<h2>Seven starting collections, one coherent public entry point.</h2>
		</div>
		<div class="dataset-strip">
			{#each datasets as dataset (dataset.id)}
				<a href={resolve(`/datasets#${dataset.id}` as `/datasets#${string}`)}>
					<strong>{dataset.title}</strong>
					<span>{dataset.period}</span>
				</a>
			{/each}
		</div>
	</section>
</main>
