<!-- eslint-disable svelte/no-navigation-without-resolve -->
<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { Map, Download, TreePine } from '@lucide/svelte';

	const photos = [
		{
			file: 'IMG_0795.jpg',
			caption: 'General view, Kings Caple',
			camera: 'Canon PowerShot A640',
			year: 2007
		},
		{
			file: 'IMG_4787.JPG',
			caption: 'Kings Caple parish landscape',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4788.JPG',
			caption: 'Field patterns near Kings Caple',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4789.JPG',
			caption: 'Hedgerows and boundaries',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4790.JPG',
			caption: 'View across Kings Caple',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4791.JPG',
			caption: 'Pasture and woodland edge',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4792.JPG',
			caption: 'Traditional farm buildings',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4793.JPG',
			caption: 'Kings Caple church and surrounds',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4794.JPG',
			caption: 'Village lane and cottages',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{ file: 'IMG_4795.JPG', caption: 'Landscape detail', camera: 'Canon PowerShot G6', year: 2005 },
		{
			file: 'IMG_4796.JPG',
			caption: 'Church architecture',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4797.JPG',
			caption: 'View from churchyard',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4798.JPG',
			caption: 'Fields and farmsteads',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{ file: 'IMG_4799.JPG', caption: 'Village scene', camera: 'Canon PowerShot G6', year: 2005 },
		{
			file: 'IMG_4800.JPG',
			caption: 'Boundary features',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4801.JPG',
			caption: 'Wider landscape view',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4802.JPG',
			caption: 'Farm track and hedges',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_4803.JPG',
			caption: 'Kings Caple countryside',
			camera: 'Canon PowerShot G6',
			year: 2005
		},
		{
			file: 'IMG_9744.jpg',
			caption: 'Kings Caple - detail',
			camera: 'Canon PowerShot A640',
			year: 2005
		},
		{
			file: 'IMG_9745.jpg',
			caption: 'Kings Caple - landscape study',
			camera: 'Canon PowerShot A640',
			year: 2005
		},
		{
			file: 'IMG_9746.jpg',
			caption: 'Kings Caple - settlement view',
			camera: 'Canon PowerShot A640',
			year: 2005
		},
		{
			file: 'IMG_9747.jpg',
			caption: 'Kings Caple - field boundary',
			camera: 'Canon PowerShot A640',
			year: 2005
		},
		{
			file: 'IMG_9748.jpg',
			caption: 'Kings Caple - countryside',
			camera: 'Canon PowerShot A640',
			year: 2005
		},
		{
			file: 'IMG_9749.jpg',
			caption: 'Kings Caple - farm building',
			camera: 'Canon PowerShot A640',
			year: 2005
		},
		{
			file: 'IMG_9750.jpg',
			caption: 'Kings Caple - landscape',
			camera: 'Canon PowerShot A640',
			year: 2005
		}
	];

	const vetTrees = [
		{
			file: 'SO5532028840-VT01.JPG',
			caption: 'Veteran tree VT01 — SO5528',
			grid: 'SO5532028840',
			year: 2007
		},
		{
			file: 'So55453 29503- VT01.JPG',
			caption: 'Veteran tree VT01 — Aramstone',
			grid: 'SO55453 29503',
			year: 2007
		},
		{
			file: 'SO55485 29544- VT02.JPG',
			caption: 'Veteran tree VT02 — Aramstone',
			grid: 'SO55485 29544',
			year: 2007
		},
		{
			file: 'SO55491 29536-VT10.JPG',
			caption: 'Veteran tree VT10 — Aramstone',
			grid: 'SO55491 29536',
			year: 2007
		},
		{
			file: 'SO55505 29577- VT09.JPG',
			caption: 'Veteran tree VT09 — Aramstone',
			grid: 'SO55505 29577',
			year: 2007
		},
		{
			file: 'SO55509 29674- VT03.JPG',
			caption: 'Veteran tree VT03 — Aramstone',
			grid: 'SO55509 29674',
			year: 2007
		},
		{
			file: 'SO55518 29700- VT04.JPG',
			caption: 'Veteran tree VT04 — Aramstone',
			grid: 'SO55518 29700',
			year: 2007
		},
		{
			file: 'SO55541 29709- VT05.JPG',
			caption: 'Veteran tree VT05 — Aramstone',
			grid: 'SO55541 29709',
			year: 2007
		},
		{
			file: 'SO55573 29491-VT08.JPG',
			caption: 'Veteran tree VT08 — Aramstone',
			grid: 'SO55573 29491',
			year: 2007
		},
		{
			file: 'SO55628 29651- VT06.JPG',
			caption: 'Veteran tree VT06 — Aramstone',
			grid: 'SO55628 29651',
			year: 2007
		},
		{
			file: 'SO55670 29632- VT07.JPG',
			caption: 'Veteran tree VT07 — Aramstone',
			grid: 'SO55670 29632',
			year: 2007
		},
		{
			file: 'Vt07- Aramstone.JPG',
			caption: 'Veteran tree VT07 — Aramstone (alt)',
			grid: 'Aramstone',
			year: 2007
		},
		{
			file: 'SO5616928736-VT02.JPG',
			caption: 'Veteran tree VT02 — Kings Caple SO5628',
			grid: 'SO5616928736',
			year: 2007
		},
		{
			file: 'SO5617528670-VT01.JPG',
			caption: 'Veteran tree VT01 — Kings Caple SO5628',
			grid: 'SO5617528670',
			year: 2007
		},
		{
			file: 'SO56952819-VT03.JPG',
			caption: 'Veteran tree VT03 — Kings Caple SO5628',
			grid: 'SO56952819',
			year: 2007
		},
		{ file: 'VT01.JPG', caption: 'Veteran tree — Kings Caple SO5628', grid: '', year: 2007 }
	];
</script>

<main>
	<section class="page-heading">
		<p class="breadcrumb"><a href="/case-studies">&larr; Case studies</a></p>
		<h1>King's Caple</h1>
		<p>
			Royal Commission survey photographs of King's Caple parish, Herefordshire &mdash; supplied to
			a researcher studying medieval field patterns and settlement history in the Wye Valley area.
		</p>
	</section>

	<section class="details">
		<article class="detail-card">
			<h2><Map size={18} /> Collection</h2>
			<p>
				<code>History/NMRC_RC/KingsCaple</code> — part of the Royal Commission on Historical Monuments
				(RCHME) survey photographs. 25 images captured by Canon PowerShot cameras between 2005 and 2007.
			</p>
		</article>
		<article class="detail-card">
			<h2><Download size={18} /> Download</h2>
			<p>The full set is available as a release asset:</p>
			<a
				class="button"
				href="https://github.com/foss4lh/david-lovelace-archive/releases/download/data-v0.1.0/kings-caple-photos.zip"
				target="_blank"
				rel="noopener"
			>
				<Download size={16} /> Download kings-caple-photos.zip
			</a>
		</article>
	</section>

	<section class="gallery">
		<h2>Photographs</h2>
		<div class="photo-grid">
			{#each photos as photo (photo.file)}
				<figure class="photo-item">
					<a
						href="/images/case-studies/kings-caple/{photo.file}"
						target="_blank"
						rel="noopener"
						class="photo-link"
					>
						<img
							src="/images/case-studies/kings-caple/{photo.file}"
							alt={photo.caption}
							loading="lazy"
						/>
					</a>
					<figcaption>
						<strong>{photo.caption}</strong>
						<span class="photo-meta">{photo.camera} &middot; {photo.year}</span>
					</figcaption>
				</figure>
			{/each}
		</div>
	</section>

	<section class="gallery">
		<h2><TreePine size={20} /> Veteran Tree Survey (LOWVP) 2006–2007</h2>
		<p class="gallery-lede">
			16 veteran tree photographs from the LOWVP survey in Kings Caple parish, supplied alongside
			the Royal Commission photos to support research into ancient tree populations and woodland
			history. Grid references refer to the OS British National Grid (1 km square).
		</p>
		<div class="photo-grid">
			{#each vetTrees as tree (tree.file)}
				<figure class="photo-item">
					<a
						href="/images/case-studies/kings-caple/vet-trees/{tree.file}"
						target="_blank"
						rel="noopener"
						class="photo-link"
					>
						<img
							src="/images/case-studies/kings-caple/vet-trees/{tree.file}"
							alt={tree.caption}
							loading="lazy"
						/>
					</a>
					<figcaption>
						<strong>{tree.caption}</strong>
						<span class="photo-meta">{tree.grid} &middot; {tree.year}</span>
					</figcaption>
				</figure>
			{/each}
		</div>
	</section>
</main>

<style>
	.breadcrumb {
		margin: 0 0 0.5rem;
	}

	.breadcrumb a {
		color: #5f6f37;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
	}

	.breadcrumb a:hover {
		text-decoration: underline;
	}

	.details {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.detail-card {
		padding: 1rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
	}

	.detail-card h2 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}

	.detail-card p {
		margin: 0 0 0.75rem;
		color: #55594f;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.detail-card code {
		padding: 0.08rem 0.25rem;
		border-radius: 4px;
		background: #eee8da;
		font-size: 0.85rem;
	}

	.detail-card .button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.85rem;
		border: 1px solid #304832;
		border-radius: 6px;
		background: #304832;
		color: #fffdf7;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
	}

	.detail-card .button:hover {
		background: #3f5e41;
	}

	.gallery h2 {
		margin-bottom: 0.5rem;
		font-size: 1.25rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.gallery-lede {
		margin: 0 0 1rem;
		color: #55594f;
		font-size: 0.9rem;
		line-height: 1.5;
		max-width: 700px;
	}

	.photo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
	}

	.photo-item {
		margin: 0;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		overflow: hidden;
		background: #fffdf7;
	}

	.photo-link {
		display: block;
		line-height: 0;
	}

	.photo-item img {
		width: 100%;
		height: 200px;
		object-fit: cover;
		transition: opacity 0.15s;
	}

	.photo-item img:hover {
		opacity: 0.85;
	}

	.photo-item figcaption {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.55rem 0.75rem;
		font-size: 0.82rem;
	}

	.photo-meta {
		color: #6b675f;
		font-size: 0.75rem;
	}

	@media (max-width: 760px) {
		.details {
			grid-template-columns: 1fr;
		}

		.photo-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 480px) {
		.photo-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
