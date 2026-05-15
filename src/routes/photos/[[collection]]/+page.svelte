<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { ChevronLeft, ChevronRight, X, ImageOff, Play, Share2 } from '@lucide/svelte';
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
		total_sampled: number;
		photos: PhotoEntry[];
	}

	const photoCollections = [
		{ id: 'uncategorized', title: 'All Uncategorized Photos', path: '/photos/uncategorized' },
		{ id: 'demo', title: 'Demo (legacy sample)', path: '/photos/demo' },
		{
			id: 'hfd-royal-commission',
			title: 'Royal Commission and Parish Survey Material',
			path: '/photos/hfd-royal-commission'
		},
		{ id: 'hfd-aerofilms', title: 'Historic Aerial Photography', path: '/photos/hfd-aerofilms' },
		{ id: 'hfd-tithe-maps', title: 'Herefordshire Tithe Maps', path: '/photos/hfd-tithe-maps' },
		{
			id: 'hfd-hedgerow-surveys',
			title: 'Habitat and Hedgerow Surveys',
			path: '/photos/hfd-hedgerow-surveys'
		},
		{
			id: 'hfd-pro-e112',
			title: 'Public Records and Exchequer Material',
			path: '/photos/hfd-pro-e112'
		},
		{
			id: 'hfd-woodland-1948',
			title: 'Woodland and 1948 Landscape Survey Material',
			path: '/photos/hfd-woodland-1948'
		},
		{ id: 'hfd-river-wye', title: 'River Wye and NRA Archive', path: '/photos/hfd-river-wye' },
		{ id: 'hfd-luftwaffe', title: 'Luftwaffe Aerial Photography', path: '/photos/hfd-luftwaffe' }
	];

	let selectedCollection = $state($page.params.collection || 'uncategorized');

	$effect(() => {
		const urlColl = $page.params.collection || 'uncategorized';
		if (urlColl !== selectedCollection) {
			selectedCollection = urlColl;
			loadManifest(urlColl);
		}
	});
	let manifest = $state<PhotoManifest | null>(null);
	let loadError = $state<string | null>(null);
	let dialogRef = $state<HTMLDialogElement | null>(null);
	let galleryRef = $state<HTMLElement | null>(null);
	let activeIndex = $state(0);
	let dialogOpen = $state(false);
	let deepLinkedPhoto = $state<PhotoEntry | null>(null);
	let deepLinkError = $state<string | null>(null);
	let slideCount = $state(0);
	let currentPage = $state(1);
	const PAGE_SIZE = 50;

	const activeCollection = $derived(
		photoCollections.find((c) => c.id === selectedCollection) ?? photoCollections[0]
	);
	const activePhoto = $derived(deepLinkedPhoto ?? manifest?.photos[activeIndex] ?? null);

	const totalPages = $derived(
		manifest ? Math.max(1, Math.ceil(manifest.photos.length / PAGE_SIZE)) : 1
	);
	const paginatedPhotos = $derived(
		manifest ? manifest.photos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : []
	);
	const pageStart = $derived(manifest ? (currentPage - 1) * PAGE_SIZE + 1 : 0);
	const pageEnd = $derived(
		manifest ? Math.min(currentPage * PAGE_SIZE, manifest.photos.length) : 0
	);

	function getCollectionPath(collectionId: string): string {
		const col = photoCollections.find((c) => c.id === collectionId);
		return col ? col.path : '/photos/demo';
	}

	async function loadManifest(collectionId: string) {
		manifest = null;
		loadError = null;
		deepLinkedPhoto = null;
		deepLinkError = null;
		currentPage = 1;
		try {
			const colPath = getCollectionPath(collectionId);
			const res = await fetch(`${base}${colPath}/manifest.json`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			manifest = data;
			slideCount = data.total_sampled;
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to load photo manifest';
		}
	}

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const targetPath = params.get('path');
		if (targetPath && manifest) {
			const cleanTarget = targetPath.replace(/^[A-Z]:\//, '');
			const idx = manifest.photos.findIndex(
				(p: PhotoEntry) => p.path === cleanTarget || p.path === targetPath
			);
			const fileName = cleanTarget.split('/').pop()?.toLowerCase() ?? '';
			const fuzzyIdx =
				idx >= 0
					? idx
					: manifest.photos.findIndex((p: PhotoEntry) =>
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
	});

	function onChangeCollection() {
		loadManifest(selectedCollection);
		const col = photoCollections.find((c) => c.id === selectedCollection);
		if (col) window.history.replaceState(null, '', col.path);
	}

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
		return `${base}${activeCollection.path}/${photo.web}`;
	}

	function getImageCandidates(imageUrl: string): string[] {
		const candidates = [imageUrl];

		if (imageUrl.startsWith(`${activeCollection.path}/`) && !imageUrl.includes('/web/')) {
			const filename = imageUrl.slice(`${activeCollection.path}/`.length);
			const webVariant = `${activeCollection.path}/web/${filename}`;
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
				thumb: `${base}${activeCollection.path}/${p.thumb}`,
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

	function sharePhoto() {
		if (!activePhoto || !manifest) return;
		const url = new URL(window.location.href);
		url.searchParams.set('path', activePhoto.path);
		url.searchParams.set('image_url', getPhotoSrc(activePhoto));
		navigator.clipboard.writeText(url.toString());
	}
</script>

<svelte:window onkeydown={onKeydown} />

<main>
	<section class="page-heading">
		<h1>Photos</h1>
		<p>
			Non-georectified photographs from the archive. Select a collection to browse its sampled
			images.
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
				<select
					class="collection-select"
					bind:value={selectedCollection}
					onchange={onChangeCollection}
				>
					{#each photoCollections as col (col.id)}
						<option value={col.id}>{col.title}</option>
					{/each}
				</select>
				<span>{slideCount} photos</span>
			</div>
			<button class="slideshow-btn" onclick={startSlideshow}>
				<Play size={16} fill="currentColor" />
				Start Slideshow
			</button>
		</section>

		<div bind:this={galleryRef} style="display:none"></div>

		<section class="photo-grid">
			{#each paginatedPhotos as photo, i (photo.path)}
				<button
					class="photo-thumb"
					onclick={() => openManifestLightbox(i + (currentPage - 1) * PAGE_SIZE)}
					aria-label="View photo"
				>
					<img src="{base}{activeCollection.path}/{photo.thumb}" alt={photo.path} loading="lazy" />
					<span class="photo-label">{formatPath(photo.path)}</span>
				</button>
			{/each}
		</section>

		{#if totalPages > 1}
			<nav class="pagination" aria-label="Photo pages">
				<button
					class="page-btn"
					onclick={() => (currentPage = Math.max(1, currentPage - 1))}
					disabled={currentPage <= 1}
				>
					<ChevronLeft size={16} />
					Previous
				</button>
				<span class="page-info"
					>Page {currentPage} of {totalPages} &mdash; {pageStart}&ndash;{pageEnd} of {manifest
						?.photos.length}</span
				>
				<button
					class="page-btn"
					onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
					disabled={currentPage >= totalPages}
				>
					Next
					<ChevronRight size={16} />
				</button>
			</nav>
		{/if}
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
				<button class="share-btn" onclick={sharePhoto} aria-label="Share photo link">
					<Share2 size={14} />
				</button>
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
		gap: 1rem;
		flex-wrap: wrap;
	}
	.meta-info {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		color: #5f6359;
		font-size: 0.9rem;
		flex-wrap: wrap;
	}
	.collection-select {
		padding: 0.45rem 0.75rem;
		border: 1px solid #d9d3c6;
		border-radius: 6px;
		background: #fff;
		font-size: 0.9rem;
		color: #333;
		max-width: 320px;
		cursor: pointer;
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
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
	}
	.page-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 0.85rem;
		border: 1px solid #d9d3c6;
		border-radius: 6px;
		background: #fffdf7;
		font-size: 0.85rem;
		cursor: pointer;
		transition: border-color 0.15s;
	}
	.page-btn:hover:not(:disabled) {
		border-color: #7c836d;
	}
	.page-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.page-info {
		font-size: 0.85rem;
		color: #5f6359;
	}
	.share-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.4rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		background: transparent;
		color: #ddd;
		cursor: pointer;
		font-size: 0.8rem;
		transition: border-color 0.15s;
		margin-left: auto;
	}
	.share-btn:hover {
		border-color: rgba(255, 255, 255, 0.7);
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
