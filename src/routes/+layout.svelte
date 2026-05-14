<script lang="ts">
	import { Archive, FileSearch, Map, Image, SearchCheck, Code } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import '../app.css';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: 'Archive', icon: Archive },
		{ href: '/browse', label: 'Browse', icon: FileSearch },
		{ href: '/maps', label: 'Maps', icon: Map },
		{ href: '/photos', label: 'Photos', icon: Image },
		{ href: '/research', label: 'Research', icon: SearchCheck }
	] as const;
</script>

<svelte:head>
	<title>David Lovelace Archive</title>
	<meta
		name="description"
		content="A static-first archive website and data catalog for David Lovelace's Herefordshire landscape history collection."
	/>
</svelte:head>

<div class="app-shell">
	<header class="site-header">
		<a class="brand" href={resolve('/')} aria-label="David Lovelace Archive home">
			<span class="brand-mark">DL</span>
			<span>
				<strong>David Lovelace Archive</strong>
				<small>Herefordshire landscape history</small>
			</span>
		</a>
		<nav aria-label="Primary navigation">
			{#each navItems as item (item.href)}
				{@const Icon = item.icon}
				<a href={resolve(item.href)}>
					<Icon size={17} strokeWidth={1.9} />
					{item.label}
				</a>
			{/each}
		</nav>
	</header>

	{@render children()}

	<footer class="site-footer">
		<a href="https://github.com/foss4lh/david-lovelace-archive" target="_blank" rel="noopener">
			<Code size={16} />
			Open source code
		</a>
	</footer>
</div>

<style>
	.site-footer {
		margin-top: auto;
		padding: 2rem;
		border-top: 1px solid #e4ded0;
		text-align: center;
	}

	.site-footer a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: #706c63;
		font-size: 0.85rem;
		text-decoration: none;
	}

	.site-footer a:hover {
		color: #304832;
	}
</style>
