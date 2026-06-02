<script lang="ts">
	import {
		ArrowRight,
		FileSearch,
		Map,
		Image,
		SearchCheck,
		ExternalLink,
		Newspaper
	} from '@lucide/svelte';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
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
		<a class="feature" href={resolve('/photos')}>
			<Image size={22} />
			<h2>Photos</h2>
			<p>Browse non-georectified photographs from the archive.</p>
		</a>
		<a class="feature" href={resolve('/research')}>
			<SearchCheck size={22} />
			<h2>Research agenda</h2>
			<p>Georectification, digitisation, transcription, and historical research.</p>
		</a>
	</section>

	<PhotoCarousel />

	<section class="news-section">
		<div class="news-header">
			<p class="eyebrow">
				<Newspaper size={14} /> News & updates
			</p>
			<h2>Latest</h2>
		</div>
		<div class="news-list">
			<article class="news-card">
				<p class="news-meta">
					<time datetime="2026-06-01">1 June 2026</time>
					<span class="news-badge">New</span>
				</p>
				<h3>David's archive at the Herefordshire Parkland Conference</h3>
				<p>
					David's son, Robin Lovelace, will attend the
					<a href="https://www.woolhopeclub.org.uk/" target="_blank" rel="noopener"
						>Herefordshire Parkland Conference</a
					>
					with a display showcasing David's archive and discussing possible next steps to ensure its legacy.
				</p>
				<img
					src="/images/parkland-conference.jpg"
					alt="Herefordshire Parkland Conference banner — a large country house set in parkland"
					class="news-banner"
					height="424"
					width="1608"
					loading="lazy"
				/>
			</article>
			<article class="news-card">
				<p class="news-meta">
					<time datetime="2026-05-04">4 May 2026</time>
				</p>
				<h3>Luftwaffe aerial photographs added</h3>
				<p>
					A collection of Luftwaffe aerial reconnaissance photographs covering Herefordshire during
					World War II has been added to the archive.
					<a href="https://bosci.net/photos/hfd-luftwaffe">View the collection &rarr;</a>.
				</p>
			</article>
		</div>
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

	<section class="content-band get-involved">
		<div>
			<p class="eyebrow">Get involved</p>
			<h2>Contribute or ask a question</h2>
			<p class="lede">
				Found something interesting? Spot something missing? Get in touch via GitHub. A GitHub
				account is required.
			</p>
			<div class="get-involved-links">
				<a class="button" href="https://github.com/foss4lh/david-lovelace-archive/issues">
					<ExternalLink size={16} /> Report an issue
				</a>
				<a class="button" href="https://github.com/foss4lh/david-lovelace-archive/discussions">
					<ExternalLink size={16} /> Start a discussion
				</a>
				<a class="button" href="https://github.com/foss4lh/david-lovelace-archive">
					<ExternalLink size={16} /> View on GitHub
				</a>
			</div>
		</div>
	</section>
</main>

<style>
	.get-involved-links {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 1rem;
	}

	.news-section {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 1px solid #d9d3c6;
	}

	.news-header {
		margin-bottom: 1rem;
	}

	.news-header .eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.news-header h2 {
		margin-bottom: 0;
	}

	.news-list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.news-card {
		padding: 1.15rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
	}

	.news-card h3 {
		margin: 0.5rem 0 0.65rem;
		font-size: 1.05rem;
		line-height: 1.35;
	}

	.news-card p {
		margin: 0;
		color: #5f6359;
		font-size: 0.92rem;
		line-height: 1.5;
	}

	.news-card a {
		color: #315e80;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.news-card a:hover {
		color: #1d3f57;
	}

	.news-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.news-meta time {
		color: #6b675f;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.news-badge {
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		background: #304832;
		color: #fffdf7;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.news-banner {
		width: 100%;
		height: auto;
		margin-top: 0.85rem;
		border-radius: 6px;
		object-fit: cover;
	}

	@media (max-width: 880px) {
		.news-list {
			grid-template-columns: 1fr;
		}
	}
</style>
