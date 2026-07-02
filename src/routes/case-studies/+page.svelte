<script lang="ts">
	import { Map, FileImage, BookOpen } from '@lucide/svelte';

	const caseStudies = [
		{
			title: "King's Caple",
			slug: 'kings-caple',
			icon: Map,
			summary:
				"Royal Commission survey photographs of King's Caple parish, Herefordshire, shared with a researcher studying medieval field patterns and settlement history.",
			photoCount: 25,
			origin: 'NMRC_RC / KingsCaple',
			year: 2025
		},
		{
			title: 'Middlewood',
			slug: 'middlewood',
			icon: FileImage,
			summary:
				'Historical documents and survey photographs referencing Middlewood, Clifford parish — provided to a landscape archaeologist investigating woodland continuity in the Wye Valley.',
			photoCount: 4,
			origin: 'NMRC_RC / Clifford & Dewi / Manor of Clifford',
			year: 2025
		}
	];
</script>

<main>
	<section class="page-heading">
		<h1>Case studies</h1>
		<p>
			Examples of data requests fulfilled from the David Lovelace Archive. Each case study documents
			what material was supplied, who it was for, and how it relates to the wider landscape history
			of Herefordshire.
		</p>
	</section>

	<section class="case-study-grid">
		{#each caseStudies as study (study.slug)}
			{@const Icon = study.icon}
			<article class="case-card">
				<div class="case-card-header">
					<div class="case-icon"><Icon size={22} /></div>
					<div>
						<h2>{study.title}</h2>
						<span class="case-meta">{study.origin} &middot; {study.photoCount} photos</span>
					</div>
				</div>
				<p class="case-summary">{study.summary}</p>
				<a class="case-link" href="/case-studies/{study.slug}">
					View case study <BookOpen size={14} />
				</a>
			</article>
		{/each}
	</section>

	<section class="doc-panel" style="margin-top: 2rem; padding: 1rem;">
		<h2 style="margin-bottom: 0.5rem; font-size: 1rem;">About case studies</h2>
		<p style="color: #55594f; font-size: 0.9rem; line-height: 1.5; margin: 0;">
			If you have a research request or would like to request material from the archive,
			<a href="https://github.com/foss4lh/david-lovelace-archive/issues" target="_blank" rel="noopener"
				>open an issue</a
			>
			or
			<a href="https://github.com/foss4lh/david-lovelace-archive/discussions" target="_blank" rel="noopener"
				>start a discussion</a
			>
			on GitHub.
		</p>
	</section>
</main>

<style>
	.case-study-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.case-card {
		padding: 1.25rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.case-card-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.case-icon {
		color: #5f6f37;
		flex-shrink: 0;
		margin-top: 0.15rem;
	}

	.case-card-header h2 {
		margin: 0;
		font-size: 1.15rem;
	}

	.case-meta {
		font-size: 0.78rem;
		color: #6b675f;
	}

	.case-summary {
		margin: 0;
		color: #55594f;
		font-size: 0.9rem;
		line-height: 1.55;
		flex: 1;
	}

	.case-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 0.85rem;
		border: 1px solid #304832;
		border-radius: 6px;
		background: #304832;
		color: #fffdf7;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		align-self: flex-start;
	}

	.case-link:hover {
		background: #3f5e41;
	}

	.doc-panel a {
		color: #315e80;
		font-weight: 600;
	}

	@media (max-width: 760px) {
		.case-study-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
