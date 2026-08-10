<script lang="ts">
	import { ArrowRight, Calendar, MapPin } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	const talks = [
		{
			title: 'FOSS for Landscape History: from georectifying ancient maps to sharing the results',
			subtitle: 'The David Lovelace Archive — Herefordshire, 2TB, one lifetime of fieldwork',
			slug: 'foss4g-leeds-2026',
			event: 'FOSS4G UK 2026',
			location: 'Leeds, UK',
			date: '2026',
			slideCount: 12,
			summary:
				'A case study on turning a ~2TB archive of un-digitised maps, aerial photographs, and ecological surveys into a searchable, web-native public resource using FOSS tools (QGIS, MapLibre, PMTiles, DuckDB-WASM) and static hosting at £0/month compute cost.',
			topics: ['QGIS', 'PMTiles', 'DuckDB-WASM', 'MapLibre GL', 'Static Archives']
		}
	];
</script>

<svelte:head>
	<title>Talks & Presentations - David Lovelace Archive</title>
	<meta
		name="description"
		content="Conference talks, presentation outlines, and technical papers on open-source landscape history and preservation of the David Lovelace Archive."
	/>
</svelte:head>

<main>
	<section class="page-heading">
		<h1>Talks & presentations</h1>
		<p>
			Conference outlines, speaker notes, and presentation materials sharing open-source
			methodology, raster data pipelines, and browser-first archive infrastructure.
		</p>
	</section>

	<section class="talks-grid">
		{#each talks as talk (talk.slug)}
			<article class="talk-card">
				<div class="talk-card-header">
					<div class="talk-badge">
						<Calendar size={13} />
						{talk.event} &middot; <MapPin size={13} />
						{talk.location}
					</div>
					<h2>{talk.title}</h2>
					<p class="talk-subtitle">{talk.subtitle}</p>
				</div>
				<p class="talk-summary">{talk.summary}</p>
				<div class="talk-topics">
					{#each talk.topics as topic (topic)}
						<span class="topic-tag">{topic}</span>
					{/each}
				</div>
				<div class="talk-actions">
					<a class="button primary" href={resolve('/talks/foss4g-leeds-2026')}>
						View talk & abstract <ArrowRight size={15} />
					</a>
				</div>
			</article>
		{/each}
	</section>

	<section class="doc-panel" style="margin-top: 2rem; padding: 1.25rem;">
		<h2 style="margin-bottom: 0.5rem; font-size: 1.1rem;">About these talks</h2>
		<p style="color: #55594f; font-size: 0.92rem; line-height: 1.55; margin: 0;">
			All presentation outlines are maintained directly in the open repository in <code
				style="background: #efebe1; padding: 0.15rem 0.4rem; border-radius: 4px;">docs/talks/</code
			>. If you would like to reuse these slides, cite the methodology, or invite a presentation on
			FOSS for landscape history,
			<a
				href="https://github.com/foss4lh/david-lovelace-archive/discussions"
				target="_blank"
				rel="noopener">get in touch via GitHub Discussions</a
			>.
		</p>
	</section>
</main>

<style>
	.talks-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 1.25rem;
	}

	.talk-card {
		padding: 1.5rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.talk-card-header h2 {
		margin: 0.4rem 0 0.25rem;
		font-size: 1.35rem;
		line-height: 1.25;
	}

	.talk-subtitle {
		color: #5f6f37;
		font-weight: 600;
		font-size: 0.95rem;
		margin: 0;
	}

	.talk-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		background: #e8f0f4;
		color: #315e80;
		font-size: 0.78rem;
		font-weight: 650;
	}

	.talk-summary {
		margin: 0;
		color: #55594f;
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.talk-topics {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.topic-tag {
		padding: 0.15rem 0.5rem;
		border: 1px solid #dcd6c9;
		border-radius: 4px;
		background: #f5f1e8;
		color: #4a4740;
		font-size: 0.78rem;
		font-weight: 550;
	}

	.talk-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.25rem;
	}

	.doc-panel a {
		color: #315e80;
		font-weight: 600;
	}
</style>
