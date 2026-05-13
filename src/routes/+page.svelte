<script lang="ts">
	import { ArrowRight, FileSearch, Map, SearchCheck } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { datasets, summaryStats } from '$lib/catalog';
</script>

<main>
	<section class="hero">
		<div>
			<h1>The archive</h1>
			<p class="lede">
				In memory of David Lovelace (1948–2026). This collection brings together maps, aerial
				photography, habitat data, and research notes documenting Herefordshire's landscape history.
				The online archive prioritises material that is not already comprehensively published
				elsewhere, so where possible we reference external resources rather than duplicate them.
			</p>

			<p class="donation-note">
				Following David's passing on 5th May 2026, we intend to donate these datasets to relevant
				local and national organisations to ensure they remain a permanent resource for research.
			</p>
			<div class="actions">
				<a class="button primary" href={resolve('/browse')}
					>Browse archive <ArrowRight size={17} /></a
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

	<section class="section-grid">
		<a class="feature" href={resolve('/browse')}>
			<FileSearch size={22} />
			<h2>Browse collections & files</h2>
			<p>Explore curated dataset collections and search the underlying 2TB archive index.</p>
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
				<a href={resolve(`/browse#${dataset.id}` as `/browse#${string}`)}>
					<strong>{dataset.title}</strong>
					<span>{dataset.period}</span>
				</a>
			{/each}
		</div>
	</section>
</main>
