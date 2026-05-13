<script lang="ts">
	import { progress } from '$lib/catalog';
	import { Archive, Camera, FileText, Image, Layers, Map } from '@lucide/svelte';

	const iconMap: Record<string, typeof Archive> = {
		archive: Archive,
		map: Map,
		camera: Camera,
		image: Image,
		'file-text': FileText,
		layers: Layers
	};

	const groupOrder = ['maps', 'aerials', 'photos', 'vectors', 'docs'];

	function formatNumber(n: number) {
		return n.toLocaleString();
	}
</script>

<section class="progress-section" aria-label="Archive liberation progress">
	<h2>Open access progress</h2>
	<p class="lede">
		Of the <strong>{formatNumber(progress.overall.uniqueFiles)}</strong> unique files in this
		archive not already published elsewhere, we have made
		<strong>{formatNumber(progress.overall.liberatedFiles)}</strong>
		({Math.round((progress.overall.liberatedFiles / progress.overall.uniqueFiles) * 100)}%)
		web-browsable or downloadable.
	</p>

	<div class="progress-grid">
		{#each groupOrder as key (key)}
			{@const g = progress.groups[key]}
			{@const Icon = iconMap[g.icon] ?? Archive}
			{@const liberatedPct = g.pctLiberatedFiles}
			{@const alreadyPublicPct = g.pctAlreadyPublicFiles}
			{@const offlinePct = 100 - liberatedPct - alreadyPublicPct}
			<article class="progress-card">
				<div class="progress-header">
					<Icon size={18} />
					<h3>{g.label}</h3>
					<span class="pct">{liberatedPct}%</span>
				</div>

				<div
					class="bar-track"
					title="{formatNumber(g.liberatedFiles)} of {formatNumber(g.uniqueFiles)} files liberated"
				>
					{#if alreadyPublicPct > 0}
						<div class="bar-segment already-public" style="width: {alreadyPublicPct}%"></div>
					{/if}
					{#if liberatedPct > 0}
						<div class="bar-segment liberated" style="width: {liberatedPct}%"></div>
					{/if}
					{#if offlinePct > 0}
						<div class="bar-segment offline" style="width: {offlinePct}%"></div>
					{/if}
				</div>

				<div class="progress-meta">
					<span class="stat liberated-stat">
						<strong>{formatNumber(g.liberatedFiles)}</strong> /
						{formatNumber(g.uniqueFiles)} files
					</span>
					<span class="stat size-stat">{g.liberatedSizeFormatted} / {g.uniqueSizeFormatted}</span>
				</div>
			</article>
		{/each}
	</div>

	<div class="legend">
		<span><span class="dot liberated"></span> Liberated by this project</span>
		<span><span class="dot already-public"></span> Already public elsewhere</span>
		<span><span class="dot offline"></span> Still offline</span>
	</div>
</section>

<style>
	.progress-section {
		margin: 2rem 0;
		padding: 1.5rem;
		border: 1px solid #d9d3c6;
		border-radius: 10px;
		background: #fbf8ef;
	}

	.progress-section h2 {
		margin-bottom: 0.4rem;
		font-size: clamp(1.3rem, 3vw, 1.7rem);
	}

	.lede {
		margin-bottom: 1.2rem;
		max-width: 72ch;
		color: #4b4f47;
		line-height: 1.55;
	}

	.progress-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}

	.progress-card {
		padding: 1rem;
		border: 1px solid #e4ded0;
		border-radius: 8px;
		background: #fff;
	}

	.progress-header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
	}

	.progress-header h3 {
		flex: 1;
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.pct {
		font-size: 1.1rem;
		font-weight: 700;
		color: #2d6a4f;
	}

	.bar-track {
		display: flex;
		height: 12px;
		border-radius: 6px;
		overflow: hidden;
		background: #e8e4da;
	}

	.bar-segment {
		height: 100%;
		transition: width 0.4s ease;
	}

	.bar-segment.liberated {
		background: #2d6a4f;
	}

	.bar-segment.already-public {
		background: #6b8cae;
	}

	.bar-segment.offline {
		background: #e8e4da;
	}

	.progress-meta {
		display: flex;
		justify-content: space-between;
		margin-top: 0.5rem;
		font-size: 0.82rem;
		color: #5c5a52;
	}

	.liberated-stat strong {
		color: #2d6a4f;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1.2rem;
		font-size: 0.82rem;
		color: #5c5a52;
	}

	.legend span {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.dot.liberated {
		background: #2d6a4f;
	}

	.dot.already-public {
		background: #6b8cae;
	}

	.dot.offline {
		background: #e8e4da;
		border: 1px solid #ccc8bc;
	}
</style>
