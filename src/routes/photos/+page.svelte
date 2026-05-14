<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { ChevronLeft, ChevronRight, X, ImageOff, Play } from '@lucide/svelte';
	import lightGallery from 'lightgallery';
	import lgAutoplay from 'lightgallery/plugins/autoplay';
	import 'lightgallery/css/lightgallery.css';
	import 'lightgallery/css/lg-autoplay.css';

	interface PhotoEntry {
		path: string;
		web: string;
		thumb: string;
	}

	interface PhotoManifest {
		collection: string;
		total: number;
		photos: PhotoEntry[];
	}

	let manifest = $state<PhotoManifest | null>(null);
	let loadError = $state<string | null>(null);
	let dialogRef = $state<HTMLDialogElement | null>(null);
	let galleryRef = $state<HTMLElement | null>(null);
	let activeIndex = $state(0);
	let dialogOpen = $state(false);
	let deepLinkedPhoto = $state<PhotoEntry | null>(null);
	let deepLinkError = $state<string | null>(null);

	const activePhoto = $derived(deepLinkedPhoto ?? manifest?.photos[activeIndex] ?? null);

	onMount(async () => {
		try {
			const res = await fetch(`${base}/photos/demo/manifest.json`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			manifest = data;

			// Open lightbox directly if ?path= is provided
			const params = new URLSearchParams(window.location.search);
			const targetPath = params.get('path');
			if (targetPath) {
				const cleanTarget = targetPath.replace(/^[A-Z]:\//, '');
				const idx = data.photos.findIndex(
					(p: PhotoEntry) => p.path === cleanTarget || p.path === targetPath
				);
				const fileName = cleanTarget.split('/').pop()?.toLowerCase() ?? '';
				const fuzzyIdx =
					idx >= 0
						? idx
						: data.photos.findIndex((p: PhotoEntry) =>
								fileName ? p.path.toLowerCase().endsWith(`/${fileName}`) : false
							);
				if (fuzzyIdx >= 0) {
					deepLinkedPhoto = null;
					deepLinkError = null;
					openLightbox(fuzzyIdx);
				} else {
					const imageUrl = params.get('image_url');
					if (imageUrl) {
						const loadableImageUrl = await resolveDeepLinkedImageUrl(imageUrl);
						if (loadableImageUrl) {
							deepLinkedPhoto = {
								path: cleanTarget || targetPath,
								web: loadableImageUrl,
								thumb: params.get('thumb_url') || loadableImageUrl
							};
							deepLinkError = null;
							openLightbox(0);
						} else {
							deepLinkedPhoto = null;
							deepLinkError =
								'Requested image is not available in the current photo sample. Use the gallery below to browse available images.';
						}
					} else {
						deepLinkError =
							'Requested image is not available in the current photo sample. Use the gallery below to browse available images.';
					}
				}
			}
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to load photo manifest';
		}
	});

	function openLightbox(index: number) {
		activeIndex = index;
		dialogOpen = true;
		dialogRef?.showModal();
		document.body.style.overflow = 'hidden';
	}

	function closeLightbox() {
		dialogOpen = false;
		dialogRef?.close();
		document.body.style.overflow = '';
	}

	function goPrevious(e?: Event) {
		e?.stopPropagation();
		if (!manifest) return;
		if (deepLinkedPhoto) return;
		activeIndex = activeIndex === 0 ? manifest.photos.length - 1 : activeIndex - 1;
	}

	function goNext(e?: Event) {
		e?.stopPropagation();
		if (!manifest) return;
		if (deepLinkedPhoto) return;
		activeIndex = activeIndex === manifest.photos.length - 1 ? 0 : activeIndex + 1;
	}

	function openManifestLightbox(index: number) {
		deepLinkedPhoto = null;
		openLightbox(index);
	}

	function getPhotoSrc(photo: PhotoEntry): string {
		if (photo.web.startsWith('/') || /^https?:\/\//.test(photo.web)) return photo.web;
		return `${base}/photos/demo/${photo.web}`;
	}

	function getImageCandidates(imageUrl: string): string[] {
		const candidates = [imageUrl];

		if (imageUrl.startsWith('/photos/demo/') && !imageUrl.startsWith('/photos/demo/web/')) {
			const filename = imageUrl.slice('/photos/demo/'.length);
			const webVariant = `/photos/demo/web/${filename}`;
			if (!candidates.includes(webVariant)) candidates.push(webVariant);
		}

		return candidates;
	}

	function canLoadImage(src: string): Promise<boolean> {
		return new Promise((resolve) => {
			const img = new Image();
			const timeout = window.setTimeout(() => resolve(false), 5000);
			img.onload = () => {
				window.clearTimeout(timeout);
				resolve(true);
			};
			img.onerror = () => {
				window.clearTimeout(timeout);
				resolve(false);
			};
			img.src = src;
		});
	}

	async function resolveDeepLinkedImageUrl(imageUrl: string): Promise<string | null> {
		for (const candidate of getImageCandidates(imageUrl)) {
			if (await canLoadImage(candidate)) return candidate;
		}
		return null;
	}

	function startSlideshow() {
		if (!manifest || !galleryRef) return;

		const dynamicGallery = lightGallery(galleryRef, {
			dynamic: true,
			dynamicEl: manifest.photos.map((p) => ({
				src: getPhotoSrc(p),
				thumb: `${base}/photos/demo/${p.thumb}`,
				subHtml: `<h4>${formatPath(p.path)}</h4>`
			})),
			plugins: [lgAutoplay],
			autoplay: true,
			slideShowAutoplay: true,
			slideShowInterval: 10000,
			progressBar: true,
			appendAutoplayControlsTo: '.lg-toolbar'
		});
		dynamicGallery.openGallery(0);
	}

	function onActiveImageError() {
		if (!deepLinkedPhoto) return;
		closeLightbox();
		deepLinkedPhoto = null;
		deepLinkError =
			'Requested image could not be loaded. Use the gallery below to browse available images.';
	}

	function onKeydown(e: KeyboardEvent) {
		if (!dialogOpen) return;
		if (e.key === 'Escape') closeLightbox();
		if (e.key === 'ArrowLeft') goPrevious();
		if (e.key === 'ArrowRight') goNext();
	}

	function formatPath(path: string): string {
		return path.replace(/__/g, ' / ');
	}
</script>

<svelte:window onkeydown={onKeydown} />

<main>
	<section class="page-heading">
		<h1>Photos</h1>
		<p>
			Non-georectified photographs from the archive. This demo shows 10 sample images from the Royal
			Commission collection.
		</p>
	</section>

	{#if deepLinkError}
		<section class="doc-panel empty-state deep-link-message">
			<ImageOff size={20} />
			<p>{deepLinkError}</p>
		</section>
	{/if}

	{#if loadError}
		<section class="doc-panel empty-state">
			<ImageOff size={24} />
			<p>{loadError}</p>
		</section>
	{:else if !manifest}
		<section class="doc-panel empty-state">
			<p>Loading photo manifest...</p>
		</section>
	{:else}
		<section class="photo-meta">
			<div class="meta-info">
				<span>{manifest.total} photos</span>
				<span>Collection: {manifest.collection}</span>
			</div>
			<button class="slideshow-btn" onclick={startSlideshow}>
				<Play size={16} fill="currentColor" />
				Start Slideshow
			</button>
		</section>

		<div bind:this={galleryRef} style="display:none"></div>

		<section class="photo-grid">
			{#each manifest.photos as photo, i (photo.path)}
				<button class="photo-thumb" onclick={() => openManifestLightbox(i)} aria-label="View photo">
					<img src="{base}/photos/demo/{photo.thumb}" alt={photo.path} loading="lazy" />
					<span class="photo-label">{formatPath(photo.path)}</span>
				</button>
			{/each}
		</section>
	{/if}
</main>

<dialog
	bind:this={dialogRef}
	class="lightbox"
	onclick={(e) => {
		if (e.target === dialogRef) closeLightbox();
	}}
	aria-label="Photo lightbox"
>
	{#if activePhoto}
		<div class="lightbox-inner">
			<button class="lightbox-close" onclick={closeLightbox} aria-label="Close">
				<X size={24} />
			</button>
			<button class="lightbox-nav prev" onclick={goPrevious} aria-label="Previous photo">
				<ChevronLeft size={32} />
			</button>
			<img
				src={getPhotoSrc(activePhoto)}
				alt={activePhoto.path}
				class="lightbox-img"
				onerror={onActiveImageError}
			/>
			<button class="lightbox-nav next" onclick={goNext} aria-label="Next photo">
				<ChevronRight size={32} />
			</button>
			<div class="lightbox-caption">
				{#if deepLinkedPhoto}
					<span>Direct link</span>
				{:else}
					<span>{activeIndex + 1} / {manifest?.photos.length}</span>
				{/if}
				<span>{formatPath(activePhoto.path)}</span>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.photo-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		background: #fffdf7;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		border: 1px solid #e9e4d9;
	}
	.meta-info {
		display: flex;
		gap: 1.5rem;
		color: #5f6359;
		font-size: 0.9rem;
	}
	.slideshow-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: #7c836d;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.9rem;
		cursor: pointer;
		transition: background 0.15s;
	}
	.slideshow-btn:hover {
		background: #6a715c;
	}
	.photo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
	}
	.photo-thumb {
		all: unset;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		cursor: pointer;
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid #d9d3c6;
		background: #fffdf7;
		transition: box-shadow 0.15s ease;
	}
	.photo-thumb:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}
	.photo-thumb img {
		width: 100%;
		height: 160px;
		object-fit: cover;
		display: block;
	}
	.photo-label {
		padding: 0.4rem 0.5rem;
		font-size: 0.78rem;
		color: #55594f;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2rem;
		color: #5f6359;
	}
	.deep-link-message {
		margin-bottom: 1rem;
		padding: 1rem 1.25rem;
		align-items: flex-start;
	}
	.lightbox {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		max-width: 100vw;
		max-height: 100vh;
		padding: 0;
		border: 0;
		background: rgba(10, 10, 10, 0.92);
		margin: 0;
	}
	.lightbox::backdrop {
		background: rgba(10, 10, 10, 0.92);
	}
	.lightbox-inner {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.lightbox-img {
		max-width: 90vw;
		max-height: 80vh;
		object-fit: contain;
	}
	.lightbox-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 0.5rem;
		z-index: 10;
	}
	.lightbox-nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 0.75rem;
		z-index: 10;
		opacity: 0.7;
		transition: opacity 0.15s;
	}
	.lightbox-nav:hover {
		opacity: 1;
	}
	.lightbox-nav.prev {
		left: 0.5rem;
	}
	.lightbox-nav.next {
		right: 0.5rem;
	}
	.lightbox-caption {
		position: absolute;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		color: #ddd;
		font-size: 0.85rem;
		display: flex;
		gap: 1rem;
		background: rgba(0, 0, 0, 0.5);
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		max-width: 90vw;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	@media (max-width: 560px) {
		.photo-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
