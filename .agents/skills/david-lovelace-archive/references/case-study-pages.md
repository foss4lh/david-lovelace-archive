# Case Study Pages — Creation Pattern

## Route structure

New case studies live under `src/routes/case-studies/<slug>/+page.svelte`.
The landing page is `src/routes/case-studies/+page.svelte`.

```
src/routes/case-studies/
  +page.svelte          # Landing page listing all case studies
  kings-caple/
    +page.svelte        # Kings Caple case study
  middlewood/
    +page.svelte        # Middlewood case study
```

## Navigation

Add to `src/routes/+layout.svelte`:

```typescript
import { Users } from '@lucide/svelte';

const navItems = [
	// ...existing items...
	{ href: '/case-studies', label: 'Case studies', icon: Users }
];
```

The `resolve()` type helper rejects unknown routes. Cast through `as unknown as '/'`
or add `<!-- eslint-disable svelte/no-navigation-without-resolve -->` at the top of
new `<script>` blocks.

## Image handling

1. Copy originals from openclaw or USB drive
2. Compress with ImageMagick before committing:
   ```bash
   mogrify -resize "1200x>" -quality 80 -strip static/images/case-studies/<slug>/*.jpg
   ```
3. Store in `static/images/case-studies/<slug>/` (subdirectory per case study)
4. Reference in templates as `/images/case-studies/<slug>/<file>`

## Lint pitfalls

New routes fail `svelte/no-navigation-without-resolve` because `resolve()` types
don't know about them yet. Add file-level eslint suppression:

```html
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve */
```

Run `npx prettier --write` before committing — the pre-commit hook enforces it
and will reject unformatted files even if eslint passes.

## Gallery structure

Each gallery section uses the same pattern:

```svelte
<section class="gallery">
	<h2>Section title</h2>
	<p class="gallery-lede">Description</p>
	<div class="photo-grid">
		{#each photos as photo (photo.file)}
			<figure class="photo-item">
				<a
					href="/images/case-studies/<slug>/{photo.file}"
					target="_blank"
					rel="noopener"
					class="photo-link"
				>
					<img src="/images/case-studies/<slug>/{photo.file}" alt={photo.caption} loading="lazy" />
				</a>
				<figcaption>
					<strong>{photo.caption}</strong>
					<span class="photo-meta">{photo.meta}</span>
				</figcaption>
			</figure>
		{/each}
	</div>
</section>
```

Multiple galleries sit one after another before `</main>`.
