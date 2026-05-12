<script lang="ts">
	const workflow = [
		{
			title: '1. Audit raw archive',
			text: 'Read from /media/robin/foss4lh/david-lovelace-archive or another configured archive root and generate public-safe summaries.'
		},
		{
			title: '2. Select priority material',
			text: 'Choose datasets for public explanation, cleaned downloads, or map/photo visualisation based on research value and readiness.'
		},
		{
			title: '3. Derive web assets',
			text: 'Convert rasters to PMTiles or COGs, vectors to GeoPackage/GeoJSON, tables to CSV/Parquet, and photos to thumbnails or web JPEG/WebP.'
		},
		{
			title: '4. Publish release assets',
			text: 'Upload derived assets with gh release create/upload. Keep large data outside git and record every URL in catalog/releases.json.'
		},
		{
			title: '5. Build static app',
			text: 'Run npm run data:download when assets are available, then npm run build. Netlify can run the same commands.'
		}
	];
</script>

<main>
	<section class="page-heading">
		<p class="eyebrow">Workflow</p>
		<h1>Code, catalog, and data are kept deliberately separate.</h1>
		<p>
			The repository should be small enough to clone quickly, while the website can still reference
			large derived assets from GitHub Releases now and object storage later.
		</p>
	</section>

	<section class="workflow-grid">
		{#each workflow as item (item.title)}
			<article class="workflow-card">
				<h2>{item.title}</h2>
				<p>{item.text}</p>
			</article>
		{/each}
	</section>

	<section class="doc-panel commands">
		<h2>Core commands</h2>
		<dl>
			<div>
				<dt><code>npm run dev</code></dt>
				<dd>Run the local SvelteKit development server.</dd>
			</div>
			<div>
				<dt><code>npm run data:download</code></dt>
				<dd>Download available release assets listed in <code>catalog/releases.json</code>.</dd>
			</div>
			<div>
				<dt><code>npm run archive:audit</code></dt>
				<dd>Generate a local archive summary from the mounted raw archive.</dd>
			</div>
			<div>
				<dt><code>npm run build</code></dt>
				<dd>Create the static site in <code>build/</code> for Netlify.</dd>
			</div>
		</dl>
	</section>
</main>

<style>
	.workflow-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.workflow-card,
	.doc-panel {
		padding: 1rem;
	}

	.workflow-card h2 {
		font-size: 1rem;
	}

	.workflow-card p,
	.commands dd {
		color: #55594f;
		line-height: 1.5;
	}

	.commands dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.8rem;
		margin: 0;
	}

	.commands div {
		padding-top: 0.75rem;
		border-top: 1px solid #e4ded0;
	}

	.commands dt {
		margin-bottom: 0.25rem;
		font-weight: 700;
	}

	.commands dd {
		margin: 0;
	}

	code {
		padding: 0.08rem 0.28rem;
		border-radius: 4px;
		background: #eee8da;
	}

	@media (max-width: 980px) {
		.workflow-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 560px) {
		.workflow-grid,
		.commands dl {
			grid-template-columns: 1fr;
		}
	}
</style>
