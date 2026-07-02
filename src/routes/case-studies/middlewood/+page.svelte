<script lang="ts">
	import { Map, Archive } from '@lucide/svelte';

	const photos = [
		{
			file: 'aIMG_6972LrMiddlewood.jpg',
			caption: 'Middlewood, Clifford parish — landscape view',
			source: 'NMRC_RC / Clifford',
			year: 2007
		},
		{
			file: 'aIMG_6972LrMiddlewoodclose.jpg',
			caption: 'Middlewood, Clifford parish — close detail',
			source: 'NMRC_RC / Clifford',
			year: 2007
		},
		{
			file: 'Manorial_Records_078_Bach_Middlewood_Fowmynd.jpg',
			caption: 'Manorial records: Bach, Middlewood, Fowmynd',
			source: 'Dewi / Manor of Clifford',
			year: 2017
		},
		{
			file: 'Manorial_Records_072_Windhill_Park_to_Middlewood.jpg',
			caption: 'Manorial records: Windhill Park to Middlewood',
			source: 'Dewi / Manor of Clifford',
			year: 2017
		}
	];
</script>

<main>
	<section class="page-heading">
		<p class="breadcrumb"><a href="/case-studies">&larr; Case studies</a></p>
		<h1>Middlewood</h1>
		<p>
			Historical documents and survey photographs referencing Middlewood, in Clifford parish,
			Herefordshire &mdash; provided to a landscape archaeologist investigating woodland continuity
			in the Wye Valley area.
		</p>
	</section>

	<section class="details">
		<article class="detail-card">
			<h2><Archive size={18} /> Sources</h2>
			<p>
				Material drawn from two collections:
			</p>
			<ul>
				<li><code>NMRC_RC/Clifford</code> — Royal Commission photographs (2 images)</li>
				<li><code>Dewi/Manor of Clifford</code> — Manorial records (2 documents)</li>
			</ul>
		</article>
		<article class="detail-card">
			<h2><Map size={18} /> Location</h2>
			<p>
				Middlewood is a wooded area in Clifford parish, west Herefordshire, near the border
				with Wales. It is referenced in manorial records from the Manor of Clifford and in
				Royal Commission survey photographs.
			</p>
		</article>
	</section>

	<section class="gallery">
		<h2>Documents and photographs</h2>
		<div class="photo-grid">
			{#each photos as photo (photo.file)}
				<figure class="photo-item">
					<a
						href="/images/case-studies/middlewood/{photo.file}"
						target="_blank"
						rel="noopener"
						class="photo-link"
					>
						<img
							src="/images/case-studies/middlewood/{photo.file}"
							alt={photo.caption}
							loading="lazy"
						/>
					</a>
					<figcaption>
						<strong>{photo.caption}</strong>
						<span class="photo-meta">{photo.source} &middot; {photo.year}</span>
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
		margin: 0 0 0.5rem;
		color: #55594f;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.detail-card ul {
		margin: 0;
		padding-left: 1.2rem;
		color: #55594f;
		font-size: 0.9rem;
		line-height: 1.6;
	}

	.detail-card code {
		padding: 0.08rem 0.25rem;
		border-radius: 4px;
		background: #eee8da;
		font-size: 0.85rem;
	}

	.gallery h2 {
		margin-bottom: 1rem;
		font-size: 1.25rem;
	}

	.photo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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
		height: 260px;
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
