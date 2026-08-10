# FOSS for Landscape History: from georectifying ancient maps to sharing the results

## Abstract

Research into physical, ecological and socio-economic changes that have occurred across landscapes relies on multi-disciplinary skills and information from a variety of sources including local knowledge.
Although landscape history is an academic field backed by research groups and professorships in several universities, much of the action takes place in voluntary groups, composed of citizen scientists and local historians operating within more-or-less formalised communities of practice.
Example local history and naturalist groups include the now-disbanded Plinian Society, founded in 1823 in Edinburgh and whose membership included Charles Darwin, and the Woolhope Naturalists' Field Club founded in Herefordshire in 1851, which still runs to this day.
A wide variety of established methods are available to landscape historians, ranging from desk-based collection, translation and synthesis of information from historic archives to the field-based observation of biodiversity and methods requiring scientific equipment including dendrochronology, ground-penetrating radar, and radiocarbon dating.
The use of geographic datasets and methods such as remote sensing, georectification and digitisation of historic maps, and communication of results through interactive maps are relatively new developments that offer great potential to empower many current and potential landscape historians of every stripe.
However, the knowledge and skills needed to collect, work with, and gain insights from geographic datasets for landscape history are few and far between, with expertise concentrated among a few people working at the intersection between landscape history and the broadly defined field of geocomputation.
David Lovelace (1948–2026) worked at this intersection and throughout his 30+-year career he collected more than 2,000 Gigabytes worth of data on the landscape history of Herefordshire.
An advocate of empowering people through technology, he was a strong proponent of free and open source software for geographic applications (FOSS4G).
This talk will discuss the geographic research methods that David developed, with a focus on open tools he used and with reference to the nascent David Lovelace Archive (hosted at [bosci.net](https://bosci.net)), which provides an example of how new technologies can help get research out of dusty desks and into the wider world for the greater good.

<!-- ## Slide-by-slide outline

**1. Title**
FOSS for Landscape History: from georectifying ancient maps to sharing the results.
Subtitle: The David Lovelace Archive — Herefordshire, 2TB, one lifetime of fieldwork.

**2. Who was David Lovelace (30s)**
David Lovelace (1948–2026) spent decades documenting Herefordshire's landscape: tithe maps, aerial photography, veteran tree surveys, hedgerow surveys, habitat records. On his death the archive — ~2TB, largely un-digitised and unindexed — needed a home. This project is that home, and a memorial.
_Visual: one strong landscape photo from `static/photos/`, e.g. Kings Caple._

**3. The scale of the problem (20s)**
~263K uncategorised files + organised collections: tithe maps (134GB), Royal Commission survey photos (107GB), aerofilms (18GB), woodland 1948 survey (43GB), hedgerow surveys, river Wye habitat records. Numbers pulled live from `catalog/collection-stats.json`.
_Visual: simple bar chart of collection sizes — good use of the `dataviz` skill if built as a slide asset._

**4. Step 1 — Georectification in QGIS (45s)**
Raw scans of tithe maps and historic aerial photography (RAF 1947, Luftwaffe wartime imagery, OS 6-inch 1886, Christopher Saxton/John Speed 1606, Isaac Taylor 1754, Forestry Commission 1953 series) georeferenced against modern OS boundaries using QGIS's Georeferencer.
_Visual: a QGIS screenshot — GCPs on a tithe map over a modern basemap. Kings Caple or a tithe map from `static/data/hampton-bishop-tithe_`, `hereford1885*` is a good concrete example.*

**5. Step 2 — From GeoTIFF to web-native formats (45s)**
Georectified rasters become Cloud-Optimized GeoTIFFs (COGs) for full-resolution download, and PMTiles for instant in-browser rendering — no tile server required. `scripts/convert-ecw-to-pmtiles.py` + batch conversion scripts handle the pipeline; everything ends up addressable as flat files.
_Visual: side-by-side — raw scan vs. georectified layer over modern map in MapLibre._

**6. Step 3 — MapLibre GL + PMTiles serving (30s)**
Fully static map serving: MapLibre GL JS reads PMTiles directly over HTTP range requests. No PostGIS, no tile server, no ongoing compute cost.
_Visual: live or screenshot of `/maps` or `/explorer` route on the site._

**7. Step 4 — DuckDB-WASM in the browser (30s)**
A 277K-row file inventory, queryable client-side via DuckDB-WASM — search and filter the whole archive without a backend.
_Visual: `/browse` or `/explorer` route screenshot, or a live query if demoing._

**8. Step 5 — Manifest-driven catalog + GitHub Releases (30s)**
Datasets and releases are declared in `catalog/datasets.json` / `catalog/releases.json`, not hardcoded in components. Derived assets (PMTiles, COGs, photo bundles) live in GitHub Releases; the raw 2TB stays on local storage. `npm run data:download` fetches only what's needed at build time.
_Visual: brief architecture diagram — raw archive → scripts → GitHub Release → static build → Netlify._

**9. Case study: Kings Caple (30s)**
Concrete example tying it together: Royal Commission survey photos + LOWVP veteran tree survey + tithe map scans, all geolocated to the same parish, downloadable as one bundle. Used by a real researcher studying medieval field patterns.
_Visual: `/case-studies/kings-caple` screenshot._

**10. Why this matters beyond one archive (30s)**
This is a reusable pattern for any custodian sitting on a large, un-digitised landscape/heritage archive: FOSS tools (QGIS, GDAL, MapLibre, PMTiles, DuckDB) plus free static hosting (Netlify/GitHub) turn a hard drive in a shed into a searchable public resource, at effectively £0/month run cost.

**11. Call to action (20s)**

- Live site: david-lovelace-archive.netlify.app
- Contribute: georectification, historical metadata, QGIS skills welcome — see `CONTRIBUTING.md`
- Partners already engaged: Herefordshire Meadows, Herefordshire Wildlife Trust, Ancient Tree Forum, Woolhope Club, HARC, CPRE Herefordshire
- QR code to repo / site

**12. (spare, if time) Live demo**
30–45s live query on `/explorer` or panning a georectified tithe map over modern OS layers in `/maps` — only if the room/wifi allows; otherwise keep as recorded GIF fallback.

---

## Notes for building slides

- Reuse real screenshots from the live site rather than mockups — `/case-studies/kings-caple`, `/maps`, `/explorer`, `/browse` all already exist as routes.
- Pull exact figures from `catalog/collection-stats.json` and `catalog/datasets.json` at build time rather than hardcoding, so numbers stay accurate if the talk is reused/updated later.
- Keep the memorial framing to slide 2 only — don't let it recur, the rest of the talk should read as a technical case study.
- If turned into an actual slide deck (Marp/reveal.js/Google Slides), a natural home is `docs/talks/foss4g-leeds-2026-slides.md` (Marp) or a linked external deck, with this file staying as the outline/speaker-notes source of truth. -->
