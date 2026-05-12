<script lang="ts">
	import { Archive, Database, FileSearch, Map, SearchCheck, Workflow } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import '../app.css';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: 'Archive', icon: Archive },
		{ href: '/explorer', label: 'Explorer', icon: FileSearch },
		{ href: '/datasets', label: 'Datasets', icon: Database },
		{ href: '/maps', label: 'Maps', icon: Map },
		{ href: '/research', label: 'Research', icon: SearchCheck },
		{ href: '/workflow', label: 'Workflow', icon: Workflow }
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
</div>
