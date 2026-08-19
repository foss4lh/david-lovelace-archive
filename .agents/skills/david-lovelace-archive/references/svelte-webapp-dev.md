# Svelte+Vite Web Application Development

## Overview

This section covers the procedures for building, configuring, and deploying Svelte 5 web apps with Vite as used in the David Lovelace Archive project (hfd-landscape-explorer).

## Quick Start — New Project

```bash
# Create from scratch (if no existing project)
bun create vite my-app --template svelte-ts
cd my-app && bun install

# Or clone existing repo
gh repo clone owner/repo && cd repo && bun install
```

**Key files in any Vite+Svelte project:**

| File             | Purpose                        |
| ---------------- | ------------------------------ |
| `index.html`     | Main HTML entry point          |
| `vite.config.ts` | Build config, plugins, aliases |
| `src/main.ts`    | JS entry point                 |
| `src/App.svelte` | Root Svelte component          |
| `package.json`   | Scripts + deps                 |

## Multi-Page / Multi-Entry Builds (Option A Pattern)

When you need a **separate documentation or settings page** that coexists with your main SPA but isn't part of its router:

### Architecture

```
project/
├── index.html              ← Main app entry (map, explorer, etc.)
├── docs.html               ← Secondary entry (docs, about, etc.)
├── src/
│   ├── main.ts             → index.html
│   ├── App.svelte          → Root of main app
│   └── lib/
│       └── SharedComponent.svelte  ← Shared between entries
├── docs/
│   ├── src/
│   │   ├── main.ts         → docs.html
│   │   └── DocsApp.svelte  → Root of docs page
│   └── (no node_modules)
├── public/
│   └── shared-data.json    ← Static data both entries can read
├── dist/                   ← Build output (both entries)
└── vite.config.ts          ← Multi-entry config
```

### Step-by-Step Setup

#### 1. Create secondary HTML entry

`docs.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Documentation</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src=\"/docs/src/main.ts\"></script>
  </body>
</html>
```

#### 2. Create docs entry point

`docs/src/main.ts`:

```typescript
import DocsApp from './DocsApp.svelte';
import { mount } from 'svelte';

const app = mount(DocsApp, { target: document.getElementById('app')! });
export default app;
```

#### 3. Create docs root component

`docs/src/DocsApp.svelte` — imports shared components via `@` alias (see below):

```svelte
<script lang="ts">
	import SharedComponent from '@/src/lib/SharedComponent.svelte';
</script>

<div class="shell">
	<nav><a href="/">← Back to App</a></nav>
	<SharedComponent />
</div>
```

#### 4. Configure Vite with path alias + multi-entry input

`vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	// CRITICAL: path alias so docs/src can import from src/lib
	resolve: {
		alias: {
			'@': path.resolve(__dirname)
		}
	},
	plugins: [svelte()],
	build: {
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, 'index.html'),
				docs: path.resolve(__dirname, 'docs.html')
			}
		}
	}
});
```

#### 5. Build and serve

```bash
# Build produces: dist/index.html + dist/docs.html + dist/assets/*
bun run build

# Preview (or use any static file server)
bun run preview --host 0.0.0.0 --port 5000
```

### ⚠️ CRITICAL PITFALL: Cross-Entry Import Resolution

**Problem:** `docs/src/DocsApp.svelte` cannot use relative paths like `../src/lib/Component.svelte` — Vite's multi-page build resolves each entry independently, so `../src/` from `docs/src/` doesn't resolve correctly.

**Error you'll see:** `[UNRESOLVED_IMPORT] Could not resolve '../src/lib/Component.svelte'`

**Fix:** Use a `resolve.alias` (`@`) pointing to the project root, then import with absolute alias paths:

```typescript
// WRONG — fails at build time
import Component from '../src/lib/Component.svelte';

// CORRECT — uses alias configured in vite.config.ts
import Component from '@/src/lib/Component.svelte';
```

See `references/multi-page-build-gotchas.md` for full error transcript and debugging notes.

## Dev Server LAN Access

### Making Vite Preview Accessible on Local Network

By default, `vite preview` binds to localhost only. For other devices to reach it:

```bash
# Bind to all interfaces explicitly
bun run preview --host 0.0.0.0 --port 5000
```

**BUT** — this is often NOT enough! The host firewall may still block the port.

### Firewall Checklist (see systematic-debugging skill)

1. Verify server is listening on `0.0.0.0:PORT`: `ss -tlnp | grep :PORT`
2. Check firewall rules: `sudo ufw status verbose`
3. If port is not allowed: `sudo ufw allow PORT/tcp`
4. Test from another device: `curl -v http://LOCAL_IP:PORT/`

**Common ports already open on many setups:** 80, 443, 22, 3001, 8080, 8787

## Svelte 5 Runes Patterns

The user's projects use Svelte 5 with runes ($state, $derived, $effect):

### State Management

```svelte
<script>
	let count = $state(0); // reactive state
	let doubled = $derived(count * 2); // derived value
	$effect(() => {
		console.log(count);
	}); // side effects
</script>

<button onclick={() => count++}>{count}</button> <!-- auto-tracked -->
```

### Props Destructuring

```svelte
<script>
  let { name = \"default\", onClick = () => {} } = $props();
</script>
```

### Component Mounting (Svelte 5 API)

For non-root components (like multi-entry apps), use `mount()`:

```typescript
// src/main.ts (root) — auto-mounted by Vite
// No mount() needed; Vite handles it

// docs/src/main.ts (secondary entry)
import DocsApp from './DocsApp.svelte';
import { mount } from 'svelte';
mount(DocsApp, { target: document.getElementById('app')! });
```

## Build Output Structure

After `vite build`, expect:

```
dist/
├── index.html              ← Main app (~0.5 KB)
├── docs.html               ← Docs page (~0.5 KB)
├── assets/
│   ├── main-[hash].css     ← Main app styles
│   ├── main-[hash].js      ← Main app bundle
│   ├── docs-[hash].css     ← Docs page styles (if scoped)
│   ├── docs-[hash].js      ← Docs page bundle
│   └── disclose-version-*.js  ← Svelte runtime (shared)
├── archive-manifest.json   ← Any public/ static data
└── tiles/                  ← Copied from public/ if present
```

Each entry gets its own CSS+JS bundle. The Svelte runtime is shared via `disclose-version`.

## Common Errors & Fixes

| Error                                                      | Cause                                                                   | Fix                                                                                                             |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `[UNRESOLVED_IMPORT] Could not resolve '../src/lib/X'`     | Multi-page build can't resolve relative cross-entry paths               | Add `resolve.alias: { '@': __dirname }` and use `@/src/lib/X`                                                   |
| `ENOENT: no such file or directory, stat 'public/tiles/X'` | Build copies all of `public/`, including missing external tile dirs     | Create placeholder dir OR conditionally disable tile plugin when tiles don't exist                              |
| `Connection timed out` from LAN device                     | **UFW firewall blocking port** (most common cause)                      | `sudo ufw allow PORT/tcp` — check with `sudo ufw status verbose` first                                          |
| `vite: command not found` after cloning                    | Dependencies not installed                                              | `bun install` first (or `npm install`)                                                                          |
| TypeScript lint errors during writes                       | tsconfig.json conflicts with file-level operations                      | Usually harmless; focus on build output not linter warnings                                                     |
| GH Pages returns **404** after `gh-pages` push             | Pages not yet enabled, or still building (large file sets take minutes) | Enable via `gh api` or repo Settings > Pages; check builds with `gh api .../pages/builds/latest --jq '.status'` |
| Browser shows raw import statement as text                 | **write_file overwrote component with partial content**                 | Re-read file, write COMPLETE content; use `edit_file` for targeted changes                                      |
| Internal links broken on GH Pages subpath                  | Links use `/` but site lives at `/repo-name/`                           | Set `base: '/repo-name/'` in vite.config.ts; update all `<a href=\"/\">` to `<a href=\"/repo-name/\">`          |

## Deployment

Built output in `dist/` is pure static files. Deploy anywhere that serves static content:

- **Local preview**: `bun run preview --host 0.0.0.0 --port PORT`
- **Apache/Nginx**: Copy `dist/` to document root
- **Netlify/Vercel/Cloudflare Pages**: Point to repo, set build command to `bun run build`
- **GitHub Pages**: See [GH Pages Subpath Deployment](#gh-pages-subpath-deployment) below
- **Docker**: Multi-stage build: `node:alpine` → copy `dist/` to nginx

### GH Pages Subpath Deployment

When hosting on GitHub Pages at a project subpath (e.g., `https://org.github.io/repo-name/`) rather than the org root, two things are needed:

#### 1. Set `base` in `vite.config.ts`

```typescript
export default defineConfig({
	base: '/hfd-landscape-explorer/' // MUST match repo name + trailing slash
	// ... rest of config
});
```

This prepends the base path to all asset references in built output (`/assets/main-X.js` → `/hfd-landscape-explorer/assets/main-X.js`).

#### 2. Update internal links in components

```svelte
<!-- WRONG for subpath hosting -->
<a href=\"/\">← Back</a>

<!-- CORRECT -->
<a href=\"/hfd-landscape-explorer/\">← Back</a>
```

#### 3. Enable GH Pages and deploy

```bash
# One-time: enable GH Pages on the repo (source = gh-pages branch)
# Via CLI:
gh api -X POST repos/OWNER/REPO/pages -f source='{\"branch\":\"gh-pages\",\"path\":\"/\"}'

# Or via UI: Settings > Pages > Source = \"Deploy from branch\", Branch = gh-pages, Root = /

# Deploy:
npx gh-pages -d dist -m \"Deploy message [skip ci]\"
```

The `[skip ci]` suffix prevents CI workflows from re-running after the deploy push.

#### 4. Expectation: Build time scales with file count

If `public/` contains many files (e.g., 2,200+ tile PNGs = ~54 MB), GH Pages builds can take **2–5 minutes** instead of the typical 30 seconds. The site shows 404 during this window. Check status:

````bash
gh api repos/OWNER/REPO/pages/builds/latest --jq '.status'
# Returns: \"building\" | \"built\" | \"errored\"\n```

#### Deploy Script Pattern (external assets + build + push)
For projects that need to pull assets from another repo before building, use the pattern in `templates/deploy.sh`. It handles:
1. Clone/sparse-checkout tiles or data from a separate repo into `public/`
2. Run `bun install && bun run build`
3. Push `dist/` to `gh-pages` branch

See also `references/gh-pages-subpath-deployment.md` for full debugging notes.

### Netlify Deployment (Root Hosting)

When deploying to Netlify (or any host that serves from the domain root), use **relative base paths** instead of absolute subpaths:
```typescript
// vite.config.ts — works for BOTH root and subpath hosting
export default defineConfig({
  base: './',  // Relative paths: assets load from ./assets/...
})
````

**Why:** `base: '/hfd-landscape-explorer/'` works for GH Pages subpaths but breaks on Netlify root hosting because assets are requested at `/hfd-landscape-explorer/assets/...` instead of `/assets/...`. Relative `base: './'` adapts to any hosting path.

**Corollary:** Update ALL absolute internal links (`href=\"/\"`, `href=\"/tiles/...\"`) to be relative too:

```svelte
<!-- WRONG for root hosting -->
<a href=\"/hfd-landscape-explorer/\">Home</a>
<img src=\"/tiles/rotherwas/...\" />

<!-- CORRECT -->
<a href=\"../\">Home</a>
<img src=\"tiles/rotherwas/...\" />
```

#### Netlify Build with GitHub Release Assets

For large data assets (raster tiles, geo datasets) that shouldn't be committed to git, store them as **GitHub Release assets** and download at build time:
**`netlify.toml`:**

````toml
[build]
  command = \"bash build.sh\"\n  publish = \"dist\"\n\n[[redirects]]\n  from = \"/docs\"\n  to = \"/docs.html\"\n  status = 200\n```
**`build.sh`:**
```bash
#!/bin/bash\nset -euo pipefail\n\n# Download large data assets from GitHub Release\nTILES_URL=\"https://github.com/OWNER/REPO/releases/download/v1.0.0/data.tar.gz\"\ncurl -fsSL \"$TILES_URL\" -o /tmp/data.tar.gz\ntar xzf /tmp/data.tar.gz -C public/\n\n# Build\nbun run build\n```
**Why this pattern:**
- Git repo stays lightweight (<1 MB source code)
- Data assets versioned via GitHub Releases
- Netlify build pulls the correct asset version every deploy
- No large blobs in git history

See `references/netlify-deployment.md` for full setup and `references/raster-tile-workflows.md` for geospatial-specific patterns.

### ⚠️ GH Pages Jekyll Pitfall — `.nojekyll`
When `public/` contains many files or deep directory trees (e.g., 2,000+ tile PNGs), GH Pages' Jekyll processor may fail with:
````

No such file or directory @ rb_check_realpath_internal - /github/workspace/public/tiles/rotherwas

````
**Fix:** Create an empty `.nojekyll` file in `public/` (copied to `dist/` during build):
```bash
touch public/.nojekyll
````

This disables Jekyll entirely. Required for:

- Sites with >1,000 static files
- Directories with symlinks or special characters
- Any site that doesn't use Jekyll features (most Vite-built sites)
  **Always include `.nojekyll` in `public/` for GH Pages deployments unless you explicitly use Jekyll.**

### Dev Server LAN Access — Extended Troubleshooting

When `curl -v http://LOCAL_IP:PORT/` hangs from another device:

| Symptom                                             | Most Likely Cause                      | Fix                       |
| --------------------------------------------------- | -------------------------------------- | ------------------------- | ----------- |
| Works on `127.0.0.1`, hangs from LAN                | **UFW firewall blocking inbound port** | `sudo ufw allow PORT/tcp` |
| Server not listening on `0.0.0.0`                   | Vite preview bound to localhost only   | Use `--host 0.0.0.0` flag |
| Connection refused                                  | Port not open / wrong port             | Check `ss -tlnp \\        | grep :PORT` |
| Works immediately after `ufw allow`, but not before | Firewall was the only issue            | No further action needed  |

**Debugging sequence (run in order):**

1. `ss -tlnp | grep :PORT` — confirm listening on `0.0.0.0`
2. `curl -v http://127.0.0.1:PORT/` — confirm local works
3. `sudo ufw status verbose` — check if port is allowed
4. If not allowed: `sudo ufw allow PORT/tcp`
5. Re-test from LAN device

### ⚠️ Tool Pitfall: write_file Overwrites Entire Content

When using `write_file` to update an `.svelte` or any source file, the tool **replaces the entire file content**. If you only provide partial content (e.g., just the import line), everything else is lost.

**What happened:** Writing `DocsApp.svelte` with only the import line caused the component to render as raw text in the browser showing just that line.

**Prevention:**

- Always use `read_file` first to see current full content
- Include the COMPLETE file body in every `write_file` call
- For small targeted changes, prefer `edit_file` (search/replace) over `write_file`

## Adding Static Content Pages (Photo Galleries, Archives, etc.)

When building content-rich sites like archives, portfolios, or documentation sites, you often need to add static content pages that showcase images, documents, or other media.

### Pattern for Photo/Archive Galleries

```bash
# 1. Create static directory for content
mkdir -p static/sample-photos

# 2. Copy/sample your content (optimize for web first in production)
cp /path/to/archive/photos/* static/sample-photos/

# 3. Create new route (SvelteKit)
mkdir -p src/routes/photos
# Create +page.svelte in that directory

# 4. Build and deploy normally
bun run build
```

### src/routes/photos/+page.svelte Example

```svelte
<script lang=\"ts\">\n\t// Import photos dynamically or define statically\n\tconst photos = [\n\t\t{ src: '/sample-photos/IMG_0346.JPG', alt: 'Historic document photo 1' },\n\t\t{ src: '/sample-photos/IMG_0350.JPG', alt: 'Historic document photo 2' },\n\t];\n</script>\n\n<section class=\"photo-gallery\">\n\t<h1>Sample Photos from the Archive</h1>\n\t<p>These are example photographs from the David Lovelace Archive, showcasing the types of historical documents and images available for research.</p>\n\t<div class=\"grid\">\n\t\t{#each photos as photo}\n\t\t\t<figure>\n\t\t\t\t<img src={photo.src} alt={photo.alt} loading=\"lazy\" />\n\t\t\t\t<figcaption>{photo.alt}</figcaption>\n\t\t\t</figure>\n\t\t{/each}\n\t</div>\n</section>\n\n<style>\n\t/* Add responsive gallery styling */\n\t.photo-gallery {\n\t\tmax-width: 1200px;\n\t\tmargin: 2rem auto;\n\t\tpadding: 0 1rem;\n\t\ttext-align: center;\n\t}\n\t.grid {\n\t\tdisplay: grid;\n\t\tgap: 1.5rem;\n\t\tgrid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n\t\tmargin-top: 2rem;\n\t}\n\tfigure {\n\t\tmargin: 0;\n\t\tbackground: #f8f9fa;\n\t\tpadding: 1rem;\n\t\tborder-radius: 8px;\n\t}\n\timg {\n\t\twidth: 100%;\n\t\theight: auto;\n\t\tdisplay: block;\n\t\tborder-radius: 4px;\n\t}\n\tfigcaption {\n\t\tmargin-top: 0.5rem;\n\t\tfont-size: 0.9rem;\n\t\tcolor: #666;\n\t}\n</style>
```

### Best Practices for Archive/Photo Content

1. **Optimize images for web**: Before copying to `static/`, create web-optimized versions (resize, compress, consider WebP)
2. **Use descriptive alt text**: Essential for accessibility and SEO
3. **Lazy loading**: Add `loading=\"lazy\"` to images for better performance
4. **Consider thumbnails**: For large galleries, generate thumbnails to improve initial load time
5. **Static vs dynamic**: For frequently changing content, consider fetching from API or CMS instead of static copies

### Common Pitfalls

- **Large raw files**: Don't copy RAW/TIFF files directly to static/ - they're too large for web
- **Missing optimization**: Forgetting to resize/compress images leads to slow page loads
- **Poor accessibility**: Missing alt text makes content inaccessible
- **Not testing on mobile**: Gallery layouts can break on small screens without responsive CSS

## News/Updates Section Pattern (Homepage)

Adding a news section to the SvelteKit homepage requires patching `src/routes/+page.svelte` with a new `<section>` and its `<style>`. Follow the existing `content-band` pattern for consistency.

### Pattern

```svelte
<section class="news-section">
	<div class="news-header">
		<p class="eyebrow">News & updates</p>
		<h2>Latest</h2>
	</div>
	<div class="news-list">
		<article class="news-card">
			<p class="news-meta">
				<time datetime="2026-06-01">1 June 2026</time>
				<span class="news-badge">New</span>
			</p>
			<h3>Title</h3>
			<p>Description with <a href="...">link</a>.</p>
			<img src="/images/banner.jpg" alt="..." class="news-banner" loading="lazy" />
		</article>
	</div>
</section>

<style>
	.news-section {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 1px solid #d9d3c6;
	}
	.news-header {
		margin-bottom: 1rem;
	}
	.news-list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	.news-card {
		padding: 1.15rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
	}
	.news-card h3 {
		margin: 0.5rem 0 0.65rem;
		font-size: 1.05rem;
		line-height: 1.35;
	}
	.news-card p {
		margin: 0;
		color: #5f6359;
		font-size: 0.92rem;
	}
	.news-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.news-badge {
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		background: #304832;
		color: #fffdf7;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
	}
	.news-banner {
		width: 100%;
		height: auto;
		margin-top: 0.85rem;
		border-radius: 6px;
	}
	@media (max-width: 880px) {
		.news-list {
			grid-template-columns: 1fr;
		}
	}
</style>
```

Key decisions:

- Use `<section class="news-section">` between the photo carousel and the collections list
- Two-column grid for desktop, single column on mobile via `@media (max-width: 880px)`
- "New" badge via `.news-badge` class for most recent item
- Icons like `Newspaper` from `@lucide/svelte` can be added to the eyebrow

### ⚠️ .gitignore: Image files require an exception

The project's `.gitignore` has blanket `*.jpg`, `*.png`, etc. rules. Adding a curated banner image to `static/images/` requires:

```gitignore
# In .gitignore:
*.jpg
*.png
# ... all other binary ignores ...

# Exception for curated UI images:
!/static/images/*
!/static/images/**/*
```

Then force-add: `git add -f static/images/banner.jpg`

The exception pattern `!/static/images/*` un-ignores the directory contents while the blanket `*.jpg` rule continues to block images elsewhere. `**/*` covers nested subdirectories.

### ⚠️ Tool pitfall: `patch` with tabs inserts literal `\n`

The Hermes `patch` tool converts tab characters in multi-line replacements to literal `\n` text when the replacement string includes tabs. **Workaround**: use `write_file` to rewrite the entire file instead, or keep `patch` replacements to single-line changes. Always `git checkout <file>` first to reset if corrupted, then use `write_file` with the complete file content.
