<script lang="ts">
	import { ClipboardCheck, MapPinned, ScanText, Search } from '@lucide/svelte';
	import { datasets } from '$lib/catalog';

	const priorities = [
		{
			title: 'Georectify and publish priority historic maps',
			icon: MapPinned,
			text: 'Start with tithe, Bryant, OS, woodland, and River Wye material where spatial context unlocks comparison with current landscape data.'
		},
		{
			title: 'Digitise boundaries, field names, and apportionments',
			icon: ClipboardCheck,
			text: 'Convert selected maps into structured polygons and tables that can be linked to ownership, tenancy, land use, and ecological change.'
		},
		{
			title: 'Transcribe and interpret public records',
			icon: ScanText,
			text: 'Turn difficult scans and early modern records into cited, searchable, historically reliable research material.'
		},
		{
			title: 'Build PhD-scale research questions',
			icon: Search,
			text: 'Use the archive to study long-run landscape change, woodland persistence, river management, field systems, conservation practice, and local governance.'
		}
	];
</script>

<main>
	<section class="page-heading">
		<h1>Research agenda</h1>
		<p>
			Identified priorities for georectification, digitisation, and historical research.
		</p>
	</section>

	<section class="research-grid">
		{#each priorities as item (item.title)}
			{@const Icon = item.icon}
			<article class="research-card">
				<div class="research-icon"><Icon size={24} /></div>
				<h2>{item.title}</h2>
				<p>{item.text}</p>
			</article>
		{/each}
	</section>

	<section class="doc-panel">
		<h2>Dataset-specific next steps</h2>
		<div class="agenda-list">
			{#each datasets as dataset (dataset.id)}
				<article>
					<h3>{dataset.title}</h3>
					<ul>
						{#each dataset.nextSteps as step (step)}
							<li>{step}</li>
						{/each}
					</ul>
				</article>
			{/each}
		</div>
	</section>
</main>

<style>
	.research-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.85rem;
		margin-bottom: 1rem;
	}

	.research-card,
	.doc-panel {
		padding: 1rem;
	}

	.research-icon {
		color: #5f6f37;
	}

	.research-card h2 {
		margin: 0.8rem 0 0.5rem;
		font-size: 1rem;
	}

	.research-card p,
	.doc-panel li {
		color: #55594f;
		line-height: 1.5;
	}

	.doc-panel h2 {
		margin-bottom: 1rem;
	}

	.agenda-list {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.agenda-list article {
		padding-top: 1rem;
		border-top: 1px solid #e4ded0;
	}

	.agenda-list h3 {
		margin-bottom: 0.55rem;
	}

	.agenda-list ul {
		margin: 0;
		padding-left: 1rem;
	}

	@media (max-width: 880px) {
		.research-grid,
		.agenda-list {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 560px) {
		.research-grid,
		.agenda-list {
			grid-template-columns: 1fr;
		}
	}
</style>
