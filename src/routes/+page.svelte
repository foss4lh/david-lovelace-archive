<script lang="ts">
	import { ArrowRight, FileSearch, Map, SearchCheck } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { browseDatasets, summaryStats } from '$lib/catalog';
</script>

<main>
	<section class="hero">
		<div>
			<h1>The archive</h1>
			<p class="lede">
				In memory of David Lovelace (1948–2026). This collection brings together maps, aerial
				photography, habitat data, and research notes documenting Herefordshire's landscape history.
				The online archive prioritises material not already published elsewhere, referencing
				external resources where possible.
			</p>

			<p class="donation-note">
				Following David's passing on 5th May 2026, we intend to donate these datasets to local and
				national organisations to ensure they remain a resource for research.
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
				<span>{(summaryStats.fileCount / 1000).toFixed(0)}k</span>
				<p>indexed files</p>
			</div>
			<div>
				<span>{summaryStats.pmtilesCount}</span>
				<p>browsable map layers</p>
			</div>
			<div>
				<span>{summaryStats.datasetCount}</span>
				<p>collections</p>
			</div>
			<div>
				<span>~{(summaryStats.totalGb / 1000).toFixed(1)} TB</span>
				<p>archive size</p>
			</div>
		</aside>
	</section>

	<section class="section-grid">
		<a class="feature" href={resolve('/browse')}>
			<FileSearch size={22} />
			<h2>Browse collections & files</h2>
			<p>Explore dataset collections and search the file index.</p>
		</a>
		<a class="feature" href={resolve('/maps')}>
			<Map size={22} />
			<h2>Map explorer</h2>
			<p>View raster maps and PMTiles layers as they are published.</p>
		</a>
		<a class="feature" href={resolve('/research')}>
			<SearchCheck size={22} />
			<h2>Research agenda</h2>
			<p>Georectification, digitisation, transcription, and historical research.</p>
		</a>
	</section>

	<section class="content-band">
		<div>
			<p class="eyebrow">Initial scope</p>
			<h2>{summaryStats.datasetCount} collections</h2>
		</div>
		<div class="dataset-strip">
			{#each browseDatasets as dataset (dataset.id)}
				<a href={resolve(`/browse#${dataset.id}` as `/browse#${string}`)}>
					<strong>{dataset.title}</strong>
					<span>{dataset.period}</span>
				</a>
			{/each}
		</div>
	</section>
</main>
