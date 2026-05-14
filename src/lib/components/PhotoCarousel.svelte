<script lang="ts">
	import { base } from '$app/paths';
	import { resolve } from '$app/paths';

	interface PhotoEntry {
		path: string;
		web: string;
		thumb: string;
	}

	let photos = $state<PhotoEntry[]>([]);
	let loadError = $state<string | null>(null);

	$effect(() => {
		fetch(`${base}/photos/demo/manifest.json`)
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data) => {
				photos = data.photos ?? [];
			})
			.catch((e) => {
				loadError = e instanceof Error ? e.message : 'Failed to load photos';
			});
	});

	function thumbSrc(photo: PhotoEntry): string {
		return `${base}/photos/demo/${photo.thumb}`;
	}
</script>

{#if photos.length}
	<section class="carousel-section" aria-label="Photo rotator">
		<div class="carousel-header">
			<p class="eyebrow">From the archive</p>
			<a class="view-all" href={resolve('/photos')}>Browse all photos &rarr;</a>
		</div>
		<div class="carousel-wrap">
			<div class="carousel-track">
				{#each photos as photo (photo.path)}
					<a
						class="carousel-item"
						href="{resolve('/photos')}?path={encodeURIComponent(
							`D:/${photo.path}`
						)}&image_url={encodeURIComponent(
							`${base}/photos/demo/${photo.web}`
						)}&thumb_url={encodeURIComponent(`${base}/photos/demo/${photo.thumb}`)}"
						title={photo.path}
					>
						<img src={thumbSrc(photo)} alt={photo.path} loading="lazy" />
					</a>
				{/each}
				{#each photos as photo (`${photo.path}-dup`)}
					<a
						class="carousel-item"
						href="{resolve('/photos')}?path={encodeURIComponent(
							`D:/${photo.path}`
						)}&image_url={encodeURIComponent(
							`${base}/photos/demo/${photo.web}`
						)}&thumb_url={encodeURIComponent(`${base}/photos/demo/${photo.thumb}`)}"
						title={photo.path}
					>
						<img src={thumbSrc(photo)} alt={photo.path} loading="lazy" />
					</a>
				{/each}
			</div>
		</div>
	</section>
{:else if loadError}
	<section class="carousel-section">
		<p class="eyebrow">From the archive</p>
		<p class="muted">Photo preview unavailable.</p>
	</section>
{/if}

<style>
	.carousel-section {
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid #d9d3c6;
	}
	.carousel-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.view-all {
		font-size: 0.85rem;
		font-weight: 600;
		color: #315e80;
		text-decoration: none;
	}
	.view-all:hover {
		text-decoration: underline;
	}
	.carousel-wrap {
		overflow: hidden;
		border-radius: 8px;
		border: 1px solid #d9d3c6;
		background: #fffdf7;
	}
	.carousel-track {
		display: flex;
		gap: 0.5rem;
		width: max-content;
		padding: 0.75rem;
		animation: merry-go-round 60s linear infinite;
	}
	.carousel-wrap:hover .carousel-track {
		animation-play-state: paused;
	}
	.carousel-item {
		flex: 0 0 auto;
		width: 200px;
		height: 160px;
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid #d9d3c6;
	}
	.carousel-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 0.3s ease;
	}
	.carousel-item:hover img {
		transform: scale(1.05);
	}
	.muted {
		color: #706c63;
		font-size: 0.9rem;
	}
	@keyframes merry-go-round {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.carousel-track {
			animation: none;
		}
	}
</style>
