<script lang="ts">
	import { ArrowRight, Database, FileSearch, Map, SearchCheck } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { datasets, summaryStats } from '$lib/catalog';
	import ArchiveProgress from '$lib/components/ArchiveProgress.svelte';
</script>

<main>
	<section class="hero">
		<div>
			<h1>The archive</h1>
			<p class="lede">
				In memory of David Lovelace (1948–2026). This collection brings together maps, aerial
				photography, habitat data, and research notes documenting Herefordshire's landscape history.
			</p>
			<p class="focus-note">
				<strong>Focus on unique material.</strong>
				The online archive prioritises datasets that are not already comprehensively published elsewhere.
				For example, the Ordnance Survey 25-inch maps for Herefordshire are already fully digitised and
				georeferenced by the
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href="https://maps.nls.uk/os/25inch-england-and-wales/herefordshire.html"
					target="_blank"
					rel="noopener noreferrer">National Library of Scotland</a
				>
				— so they are referenced externally rather than duplicated here.
			</p>
			<p class="donation-note">
				Following David's passing on 5th May 2026, we intend to donate these datasets to relevant
				local and national organisations to ensure they remain a permanent resource for research.
			</p>
			<div class="actions">
				<a class="button primary" href={resolve('/datasets')}
					>Browse datasets <ArrowRight size={17} /></a
				>
				<a class="button" href={resolve('/research')}>See research agenda</a>
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

	<ArchiveProgress />

	<section class="section-grid">
		<a class="feature" href={resolve('/datasets')}>
			<Database size={22} />
			<h2>Dataset catalog</h2>
			<p>Track source archive paths, derived assets, release downloads, status, and limitations.</p>
		</a>
		<a class="feature" href={resolve('/explorer')}>
			<FileSearch size={22} />
			<h2>File explorer</h2>
			<p>Search and browse over 1.2 million individual files within the 2TB archive index.</p>
		</a>
		<a class="feature" href={resolve('/maps')}>
			<Map size={22} />
			<h2>Map explorer</h2>
			<p>View web-ready raster maps and prepare PMTiles layers as they are published.</p>
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
