<!-- eslint-disable svelte/no-navigation-without-resolve -->
<script lang="ts">
	import { ArrowLeft, MapPin, Calendar, Code, ExternalLink, FileText } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import talkMarkdown from '../../../../docs/talks/foss4g-leeds-2026.md?raw';

	let showRaw = $state(false);
</script>

<svelte:head>
	<title>FOSS for Landscape History (FOSS4G Leeds 2026) - David Lovelace Archive</title>
	<meta
		name="description"
		content="Abstract for FOSS4G UK 2026 talk: FOSS for Landscape History: from georectifying ancient maps to sharing the results."
	/>
</svelte:head>

<main>
	<div class="breadcrumb">
		<a href={resolve('/talks')} class="back-link">
			<ArrowLeft size={16} /> Back to talks
		</a>
	</div>

	<article class="talk-container">
		<header class="talk-header">
			<div class="talk-meta-bar">
				<span class="event-badge">
					<Calendar size={14} /> FOSS4G UK 2026
				</span>
				<span class="location-badge">
					<MapPin size={14} /> Leeds, UK
				</span>
				<span class="source-badge">
					<Code size={14} /> docs/talks/foss4g-leeds-2026.md
				</span>
			</div>

			<h1>FOSS for Landscape History: from georectifying ancient maps to sharing the results</h1>
			<p class="subtitle">
				The David Lovelace Archive &mdash; Herefordshire, 2TB, one lifetime of fieldwork.
			</p>
		</header>

		<section class="abstract-section">
			<h2>Abstract</h2>

			<div class="abstract-content">
				<p>
					Research into physical, ecological and socio-economic changes that have occurred across
					landscapes relies on multi-disciplinary skills and information from a variety of sources
					including local knowledge. Although landscape history is an academic field backed by
					research groups and professorships in several universities, much of the action takes place
					in voluntary groups, composed of citizen scientists and local historians operating within
					more-or-less formalised communities of practice. Example local history and naturalist
					groups include the now-disbanded Plinian Society, founded in 1823 in Edinburgh and whose
					membership included Charles Darwin, and the Woolhope Naturalists' Field Club founded in
					Herefordshire in 1851, which still runs to this day.
				</p>

				<p>
					A wide variety of established methods are available to landscape historians, ranging from
					desk-based collection, translation and synthesis of information from historic archives to
					the field-based observation of biodiversity and methods requiring scientific equipment
					including dendrochronology, ground-penetrating radar, and radiocarbon dating. The use of
					geographic datasets and methods such as remote sensing, georectification and digitisation
					of historic maps, and communication of results through interactive maps are relatively new
					developments that offer great potential to empower many current and potential landscape
					historians of every stripe.
				</p>

				<p>
					However, the knowledge and skills needed to collect, work with, and gain insights from
					geographic datasets for landscape history are few and far between, with expertise
					concentrated among a few people working at the intersection between landscape history and
					the broadly defined field of geocomputation. David Lovelace (1948–2026) worked at this
					intersection and throughout his 30+-year career he collected more than 2,000 Gigabytes
					worth of data on the landscape history of Herefordshire. An advocate of empowering people
					through technology, he was a strong proponent of free and open source software for
					geographic applications (FOSS4G).
				</p>

				<p>
					This talk will discuss the geographic research methods that David developed, with a focus
					on open tools he used and with reference to the nascent David Lovelace Archive (hosted at
					<a href="https://bosci.net" target="_blank" rel="noopener"
						>bosci.net <ExternalLink size={13} /></a
					>), which provides an example of how new technologies can help get research out of dusty
					desks and into the wider world for the greater good.
				</p>
			</div>
		</section>

		<section class="raw-toggle-section">
			<button class="button" onclick={() => (showRaw = !showRaw)}>
				<FileText size={16} />
				{showRaw ? 'Hide Markdown Source' : 'View Markdown Source'}
			</button>

			{#if showRaw}
				<div class="raw-block">
					<pre><code>{talkMarkdown}</code></pre>
				</div>
			{/if}
		</section>
	</article>
</main>

<style>
	.breadcrumb {
		margin-bottom: 1.25rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: #5f6f37;
		font-weight: 600;
		font-size: 0.9rem;
		text-decoration: none;
	}

	.back-link:hover {
		color: #304832;
	}

	.talk-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.talk-header {
		padding: 1.75rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
	}

	.talk-meta-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.event-badge,
	.location-badge,
	.source-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 650;
	}

	.event-badge {
		background: #304832;
		color: #fffdf7;
	}

	.location-badge {
		background: #e8f0f4;
		color: #315e80;
	}

	.source-badge {
		background: #f0ece1;
		color: #5d5950;
	}

	.talk-header h1 {
		font-size: clamp(1.8rem, 4vw, 2.7rem);
		line-height: 1.2;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #5f6f37;
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
	}

	.abstract-section {
		padding: 1.75rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
	}

	.abstract-section h2 {
		font-size: 1.5rem;
		margin-bottom: 1.25rem;
		color: #20231f;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid #5f6f37;
		display: inline-block;
	}

	.abstract-content p {
		color: #3b4038;
		font-size: 1.05rem;
		line-height: 1.7;
		margin-bottom: 1.25rem;
	}

	.abstract-content p:last-child {
		margin-bottom: 0;
	}

	.abstract-content a {
		color: #315e80;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 2px;
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
	}

	.abstract-content a:hover {
		color: #1d3f57;
	}

	.raw-toggle-section {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
	}

	.raw-block {
		width: 100%;
		padding: 1.25rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #1e221d;
		color: #d1d8cb;
		overflow-x: auto;
	}

	.raw-block pre {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.88rem;
		line-height: 1.6;
	}
</style>
