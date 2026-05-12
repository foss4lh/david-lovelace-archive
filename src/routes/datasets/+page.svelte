<script lang="ts">
	import { Download, ExternalLink, FolderTree } from '@lucide/svelte';
	import { datasets, releaseManifest, statusLabel } from '$lib/catalog';
</script>

<main>
	<section class="page-heading">
		<p class="eyebrow">Catalog and downloads</p>
		<h1>Datasets are described here; large data lives elsewhere.</h1>
		<p>
			This page is intentionally driven by JSON manifests. The app can grow from GitHub Release
			assets to Cloudflare R2 or S3 without changing the content model.
		</p>
	</section>

	<section class="download-panel">
		<div>
			<h2>Release asset manifest</h2>
			<p>
				Current data release target: <code>{releaseManifest.releaseTag}</code>. Use
				<code>npm run data:download</code> to download available assets into
				<code>static/data/</code>.
			</p>
		</div>
		<a
			class="button"
			href={`https://github.com/${releaseManifest.repository}/releases/tag/${releaseManifest.releaseTag}`}
			target="_blank"
			rel="noreferrer"
		>
			<ExternalLink size={17} /> Open release
		</a>
	</section>

	<section class="dataset-list" aria-label="Dataset catalog">
		{#each datasets as dataset (dataset.id)}
			<article class="dataset-card" id={dataset.id}>
				<div class="dataset-topline">
					<span class="status">{statusLabel(dataset.status)}</span>
					<span>{dataset.period}</span>
				</div>
				<h2>{dataset.title}</h2>
				<p>{dataset.summary}</p>

				<div class="dataset-meta">
					<span>{dataset.coverage}</span>
					<span>{dataset.theme}</span>
				</div>

				<div class="card-grid">
					<div>
						<h3><FolderTree size={16} /> Source archive paths</h3>
						<ul>
							{#each dataset.sourceArchivePaths as path (path)}
								<li><code>{path}</code></li>
							{/each}
						</ul>
					</div>
					<div>
						<h3><Download size={16} /> Assets and downloads</h3>
						{#if dataset.assets.length}
							<ul>
								{#each dataset.assets as asset (asset.id)}
									<li>
										<strong>{asset.title}</strong>
										<span>{asset.kind} · {statusLabel(asset.status)}</span>
										{#if asset.remoteUrl}
											<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
											<a href={asset.remoteUrl} target="_blank" rel="noreferrer">release URL</a>
										{/if}
									</li>
								{/each}
							</ul>
						{:else}
							<p class="muted">No public derived assets registered yet.</p>
						{/if}
					</div>
				</div>

				<div class="next-steps">
					<h3>Next work</h3>
					<ul>
						{#each dataset.nextSteps as step (step)}
							<li>{step}</li>
						{/each}
					</ul>
				</div>

				<p class="limitations"><strong>Known limitation:</strong> {dataset.limitations}</p>
			</article>
		{/each}
	</section>
</main>

<style>
	.download-panel {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
		padding: 1rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #e9efe2;
	}

	.download-panel h2 {
		margin-bottom: 0.3rem;
		font-size: 1.05rem;
	}

	.download-panel p {
		margin: 0;
		color: #4e5748;
		line-height: 1.5;
	}

	code {
		padding: 0.08rem 0.28rem;
		border-radius: 4px;
		background: #eee8da;
		font-size: 0.88em;
	}

	.dataset-list {
		display: grid;
		gap: 1rem;
	}

	.dataset-card {
		padding: clamp(1rem, 3vw, 1.4rem);
		scroll-margin-top: 6rem;
	}

	.dataset-topline,
	.dataset-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		color: #6b675f;
		font-size: 0.84rem;
	}

	.dataset-card h2 {
		margin: 0.75rem 0 0.5rem;
		font-size: clamp(1.4rem, 3vw, 2rem);
	}

	.dataset-card > p {
		max-width: 78ch;
		color: #50534b;
		line-height: 1.58;
	}

	.card-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 1rem;
		margin-top: 1rem;
	}

	.card-grid > div,
	.next-steps {
		padding: 0.9rem;
		border: 1px solid #e4ded0;
		border-radius: 6px;
		background: #fbf8ef;
	}

	h3 {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-bottom: 0.65rem;
		font-size: 0.9rem;
	}

	ul {
		margin: 0;
		padding-left: 1rem;
	}

	li {
		margin-bottom: 0.4rem;
		color: #4b4f47;
		line-height: 1.45;
	}

	li span {
		display: block;
		color: #716d64;
		font-size: 0.82rem;
	}

	li a {
		display: inline-block;
		margin-top: 0.15rem;
		color: #315e80;
	}

	.next-steps {
		margin-top: 1rem;
	}

	.limitations,
	.muted {
		margin-bottom: 0;
		color: #6b675f;
	}

	@media (max-width: 760px) {
		.download-panel,
		.card-grid {
			grid-template-columns: 1fr;
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
