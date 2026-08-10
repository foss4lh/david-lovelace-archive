<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import {
		ArrowLeft,
		Clock,
		MapPin,
		Calendar,
		Layers,
		ExternalLink,
		Code,
		CheckCircle2,
		Sparkles
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import talkMarkdown from '../../../../docs/talks/foss4g-leeds-2026.md?raw';

	let activeView: 'cards' | 'raw' = $state('cards');

	const slides = [
		{
			number: 1,
			title: 'Title',
			duration: 'Intro',
			headline:
				'FOSS for Landscape History: from georectifying ancient maps to sharing the results',
			subtitle: 'The David Lovelace Archive — Herefordshire, 2TB, one lifetime of fieldwork.',
			content:
				'Introduction to the conference session outlining how open source geospatial tools enable citizen-led preservation and publication of massive heritage archives.',
			visual: 'Title banner with Herefordshire landscape imagery.',
			link: '/'
		},
		{
			number: 2,
			title: 'Who was David Lovelace',
			duration: '30s',
			content:
				"David Lovelace (1948–2026) spent decades documenting Herefordshire's landscape: tithe maps, aerial photography, veteran tree surveys, hedgerow surveys, habitat records. On his death the archive — ~2TB, largely un-digitised and unindexed — needed a home. This project is that home, and a memorial.",
			visual: "One strong landscape photo from static/photos/, e.g. King's Caple.",
			link: '/case-studies/kings-caple'
		},
		{
			number: 3,
			title: 'The scale of the problem',
			duration: '20s',
			content:
				'~263K uncategorised files + organised collections: tithe maps (134GB), Royal Commission survey photos (107GB), aerofilms (18GB), woodland 1948 survey (43GB), hedgerow surveys, river Wye habitat records. Numbers pulled live from catalog/collection-stats.json.',
			visual: 'Simple bar chart of collection sizes.',
			link: '/browse'
		},
		{
			number: 4,
			title: 'Step 1 — Georectification in QGIS',
			duration: '45s',
			content:
				"Raw scans of tithe maps and historic aerial photography (RAF 1947, Luftwaffe wartime imagery, OS 6-inch 1886, Christopher Saxton/John Speed 1606, Isaac Taylor 1754, Forestry Commission 1953 series) georeferenced against modern OS boundaries using QGIS's Georeferencer.",
			visual:
				"QGIS screenshot — GCPs on a tithe map over a modern basemap (e.g. King's Caple or Hampton Bishop).",
			link: '/maps'
		},
		{
			number: 5,
			title: 'Step 2 — From GeoTIFF to web-native formats',
			duration: '45s',
			content:
				'Georectified rasters become Cloud-Optimized GeoTIFFs (COGs) for full-resolution download, and PMTiles for instant in-browser rendering — no tile server required. scripts/convert-ecw-to-pmtiles.py + batch conversion scripts handle the pipeline; everything ends up addressable as flat files.',
			visual: 'Side-by-side: raw scan vs. georectified layer over modern map in MapLibre.',
			link: '/maps'
		},
		{
			number: 6,
			title: 'Step 3 — MapLibre GL + PMTiles serving',
			duration: '30s',
			content:
				'Fully static map serving: MapLibre GL JS reads PMTiles directly over HTTP range requests. No PostGIS, no tile server, no ongoing compute cost.',
			visual: 'Live or screenshot of /maps or /explorer route on the site.',
			link: '/explorer'
		},
		{
			number: 7,
			title: 'Step 4 — DuckDB-WASM in the browser',
			duration: '30s',
			content:
				'A 277K-row file inventory, queryable client-side via DuckDB-WASM — search and filter the whole archive without a backend.',
			visual: '/browse or /explorer route screenshot, or a live query if demoing.',
			link: '/browse'
		},
		{
			number: 8,
			title: 'Step 5 — Manifest-driven catalog + GitHub Releases',
			duration: '30s',
			content:
				"Datasets and releases are declared in catalog/datasets.json / catalog/releases.json, not hardcoded in components. Derived assets (PMTiles, COGs, photo bundles) live in GitHub Releases; the raw 2TB stays on local storage. npm run data:download fetches only what's needed at build time.",
			visual:
				'Brief architecture diagram — raw archive → scripts → GitHub Release → static build → Netlify.',
			link: '/research'
		},
		{
			number: 9,
			title: "Case study: King's Caple",
			duration: '30s',
			content:
				'Concrete example tying it together: Royal Commission survey photos + LOWVP veteran tree survey + tithe map scans, all geolocated to the same parish, downloadable as one bundle. Used by a real researcher studying medieval field patterns.',
			visual: '/case-studies/kings-caple screenshot.',
			link: '/case-studies/kings-caple'
		},
		{
			number: 10,
			title: 'Why this matters beyond one archive',
			duration: '30s',
			content:
				'This is a reusable pattern for any custodian sitting on a large, un-digitised landscape/heritage archive: FOSS tools (QGIS, GDAL, MapLibre, PMTiles, DuckDB) plus free static hosting (Netlify/GitHub) turn a hard drive in a shed into a searchable public resource, at effectively £0/month run cost.',
			visual: 'Toolchain summary icons and architecture benefits breakdown.',
			link: '/'
		},
		{
			number: 11,
			title: 'Call to action',
			duration: '20s',
			content:
				'Live site: david-lovelace-archive.netlify.app | Contribute: georectification, historical metadata, QGIS skills welcome — see CONTRIBUTING.md. Partners already engaged: Herefordshire Meadows, Herefordshire Wildlife Trust, Ancient Tree Forum, Woolhope Club, HARC, CPRE Herefordshire.',
			visual: 'Call to action card with QR code and repository link.',
			link: 'https://github.com/foss4lh/david-lovelace-archive'
		},
		{
			number: 12,
			title: '(spare, if time) Live demo',
			duration: '45s',
			content:
				'30–45s live query on /explorer or panning a georectified tithe map over modern OS layers in /maps — only if the room/wifi allows; otherwise keep as recorded GIF fallback.',
			visual: 'Interactive map pane / recorded fallback GIF.',
			link: '/explorer'
		}
	];

	const speakerNotes = [
		'Reuse real screenshots from the live site rather than mockups — /case-studies/kings-caple, /maps, /explorer, /browse all already exist as routes.',
		'Pull exact figures from catalog/collection-stats.json and catalog/datasets.json at build time rather than hardcoding, so numbers stay accurate if the talk is reused/updated later.',
		"Keep the memorial framing to slide 2 only — don't let it recur, the rest of the talk should read as a technical case study.",
		'If turned into an actual slide deck (Marp/reveal.js/Google Slides), a natural home is docs/talks/foss4g-leeds-2026-slides.md (Marp) or a linked external deck, with this file staying as the outline/speaker-notes source of truth.'
	];
</script>

<svelte:head>
	<title>FOSS for Landscape History (FOSS4G Leeds 2026) - David Lovelace Archive</title>
	<meta
		name="description"
		content="Slide-by-slide outline and speaker notes for FOSS4G UK 2026 talk: FOSS for Landscape History: from georectifying ancient maps to sharing the results."
	/>
</svelte:head>

<main>
	<div class="breadcrumb">
		<a href={resolve('/talks')} class="back-link">
			<ArrowLeft size={16} /> Back to talks
		</a>
	</div>

	<section class="talk-header">
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

		<div class="metrics-grid">
			<div class="metric-card">
				<span class="metric-value">12</span>
				<span class="metric-label">Slides total</span>
			</div>
			<div class="metric-card">
				<span class="metric-value">~6.5 min</span>
				<span class="metric-label">Target duration</span>
			</div>
			<div class="metric-card">
				<span class="metric-value">&pound;0/mo</span>
				<span class="metric-label">Compute run cost</span>
			</div>
			<div class="metric-card">
				<span class="metric-value">100% FOSS</span>
				<span class="metric-label">QGIS &middot; PMTiles &middot; DuckDB</span>
			</div>
		</div>
	</section>

	<section class="view-toggle-bar">
		<div class="toggle-group">
			<button
				class="toggle-btn"
				class:active={activeView === 'cards'}
				onclick={() => (activeView = 'cards')}
			>
				<Layers size={16} /> Slide-by-slide outline
			</button>
			<button
				class="toggle-btn"
				class:active={activeView === 'raw'}
				onclick={() => (activeView = 'raw')}
			>
				<Code size={16} /> Raw Markdown source
			</button>
		</div>
	</section>

	{#if activeView === 'cards'}
		<section class="slides-section">
			<h2>Slide-by-slide outline</h2>
			<div class="slides-grid">
				{#each slides as slide (slide.number)}
					<article class="slide-card">
						<header class="slide-card-header">
							<div class="slide-num-badge">Slide {slide.number}</div>
							<div class="slide-duration">
								<Clock size={13} />
								{slide.duration}
							</div>
						</header>
						<h3>{slide.title}</h3>
						{#if slide.headline}
							<p class="slide-headline"><strong>{slide.headline}</strong></p>
						{/if}
						<p class="slide-content">{slide.content}</p>
						<div class="slide-visual">
							<span class="visual-label"><Sparkles size={13} /> Visual suggestion:</span>
							<p>{slide.visual}</p>
						</div>
						{#if slide.link}
							<footer class="slide-footer">
								{#if slide.link.startsWith('http')}
									<a href={slide.link} target="_blank" rel="noopener" class="slide-route-link">
										External repo <ExternalLink size={13} />
									</a>
								{:else}
									<a href={resolve(slide.link as '/')} class="slide-route-link">
										Explore route <code>{slide.link}</code> &rarr;
									</a>
								{/if}
							</footer>
						{/if}
					</article>
				{/each}
			</div>
		</section>

		<section class="notes-section">
			<h2>Notes for building slides</h2>
			<div class="notes-card">
				<ul>
					{#each speakerNotes as note (note)}
						<li>
							<CheckCircle2 size={16} class="note-icon" />
							<span>{note}</span>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{:else}
		<section class="raw-section">
			<div class="raw-header">
				<h2>docs/talks/foss4g-leeds-2026.md</h2>
				<span class="file-path">Source path: docs/talks/foss4g-leeds-2026.md</span>
			</div>
			<pre class="raw-codeblock"><code>{talkMarkdown}</code></pre>
		</section>
	{/if}
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

	.talk-header {
		padding: 1.75rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
		margin-bottom: 1.5rem;
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
		margin-bottom: 1.5rem;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
		border-top: 1px solid #e4ded0;
		padding-top: 1.25rem;
	}

	.metric-card {
		display: flex;
		flex-direction: column;
	}

	.metric-value {
		font-size: 1.35rem;
		font-weight: 750;
		color: #20231f;
	}

	.metric-label {
		font-size: 0.8rem;
		color: #6b675f;
	}

	.view-toggle-bar {
		margin-bottom: 1.5rem;
		display: flex;
		justify-content: flex-start;
	}

	.toggle-group {
		display: inline-flex;
		padding: 0.25rem;
		border: 1px solid #d9d3c6;
		border-radius: 6px;
		background: #f5f1e8;
	}

	.toggle-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 0.9rem;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: #5d5950;
		font-size: 0.86rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toggle-btn.active {
		background: #fffdf7;
		color: #304832;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	.slides-section h2,
	.notes-section h2 {
		font-size: 1.35rem;
		margin-bottom: 1rem;
	}

	.slides-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.slide-card {
		padding: 1.25rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.slide-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.slide-num-badge {
		font-size: 0.75rem;
		font-weight: 750;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #5f6f37;
		background: #f0f4e8;
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
	}

	.slide-duration {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.78rem;
		color: #6b675f;
		font-weight: 600;
	}

	.slide-card h3 {
		margin: 0;
		font-size: 1.1rem;
	}

	.slide-headline {
		margin: 0;
		color: #304832;
		font-size: 0.95rem;
	}

	.slide-content {
		margin: 0;
		color: #55594f;
		font-size: 0.9rem;
		line-height: 1.55;
		flex: 1;
	}

	.slide-visual {
		padding: 0.65rem 0.85rem;
		border-left: 3px solid #5f6f37;
		background: #f6f8f2;
		border-radius: 0 4px 4px 0;
	}

	.visual-label {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.76rem;
		font-weight: 700;
		color: #4a572c;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-bottom: 0.2rem;
	}

	.slide-visual p {
		margin: 0;
		font-size: 0.84rem;
		color: #4a5441;
		line-height: 1.45;
		font-style: italic;
	}

	.slide-footer {
		margin-top: 0.25rem;
		padding-top: 0.5rem;
		border-top: 1px dashed #e4ded0;
	}

	.slide-route-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: #315e80;
		font-size: 0.82rem;
		font-weight: 600;
		text-decoration: none;
	}

	.slide-route-link:hover {
		color: #1d3f57;
		text-decoration: underline;
	}

	.slide-route-link code {
		background: #e8f0f4;
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		font-size: 0.78rem;
	}

	.notes-card {
		padding: 1.25rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
	}

	.notes-card ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.notes-card li {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		color: #55594f;
		font-size: 0.92rem;
		line-height: 1.55;
	}

	:global(.note-icon) {
		color: #5f6f37;
		flex-shrink: 0;
		margin-top: 0.15rem;
	}

	.raw-section {
		padding: 1.25rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #1e221d;
		color: #e4e7e1;
	}

	.raw-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 0.85rem;
		border-bottom: 1px solid #323830;
		margin-bottom: 1rem;
	}

	.raw-header h2 {
		margin: 0;
		font-size: 1.05rem;
		color: #c0c7ba;
	}

	.file-path {
		font-size: 0.78rem;
		color: #8a9284;
		font-family: monospace;
	}

	.raw-codeblock {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.88rem;
		line-height: 1.6;
		color: #d1d8cb;
		max-height: 700px;
		overflow-y: auto;
	}

	@media (max-width: 880px) {
		.metrics-grid {
			grid-template-columns: 1fr 1fr;
		}

		.slides-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 560px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
