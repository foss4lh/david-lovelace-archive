#!/usr/bin/env node
/**
 * Update catalog/releases.json with new PMTiles + COG assets
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const releasesPath = resolve('catalog/releases.json');
const manifest = JSON.parse(readFileSync(releasesPath, 'utf-8'));

const BASE_URL = 'https://github.com/foss4lh/david-lovelace-archive/releases/download/data-v0.1.0';

// New PMTiles + COG pairs
const NEW_ASSETS = [
  // Historic Hereford Maps
  { id: 'speed1606-pmtiles', title: 'John Speed Hereford 1606 PMTiles', filename: 'speed1606.pmtiles', target: 'static/data/speed1606.pmtiles', required: true },
  { id: 'speed1606-cog', title: 'John Speed Hereford 1606 COG', filename: 'speed1606-cog.tif', target: 'static/data/speed1606-cog.tif', required: false },
  { id: 'taylor1754-pmtiles', title: 'Taylor Hereford 1754 PMTiles', filename: 'taylor1754.pmtiles', target: 'static/data/taylor1754.pmtiles', required: true },
  { id: 'taylor1754-cog', title: 'Taylor Hereford 1754 COG', filename: 'taylor1754-cog.tif', target: 'static/data/taylor1754-cog.tif', required: false },
  { id: 'brayley1806-pmtiles', title: 'Brayley Hereford 1806 PMTiles', filename: 'brayley1806.pmtiles', target: 'static/data/brayley1806.pmtiles', required: true },
  { id: 'brayley1806-cog', title: 'Brayley Hereford 1806 COG', filename: 'brayley1806-cog.tif', target: 'static/data/brayley1806-cog.tif', required: false },
  { id: 'hereford1885-pmtiles', title: 'Hereford 1885 PMTiles', filename: 'hereford1885.pmtiles', target: 'static/data/hereford1885.pmtiles', required: true },
  { id: 'hereford1885-cog', title: 'Hereford 1885 COG', filename: 'hereford1885-cog.tif', target: 'static/data/hereford1885-cog.tif', required: false },

  // OS Historic
  { id: 'os6inch1886-pmtiles', title: 'OS 6-inch Marden 1886 PMTiles', filename: 'os6inch1886.pmtiles', target: 'static/data/os6inch1886.pmtiles', required: true },
  { id: 'os6inch1886-cog', title: 'OS 6-inch Marden 1886 COG', filename: 'os6inch1886-cog.tif', target: 'static/data/os6inch1886-cog.tif', required: false },
  { id: 'gv1886-pmtiles', title: 'OS 1:2500 Golden Valley 1886 PMTiles', filename: 'gv1886.pmtiles', target: 'static/data/gv1886.pmtiles', required: true },
  { id: 'gv1886-cog', title: 'OS 1:2500 Golden Valley 1886 COG', filename: 'gv1886-cog.tif', target: 'static/data/gv1886-cog.tif', required: false },

  // Aerial
  { id: 'raf1947-pmtiles', title: 'RAF Aerial Marden 1947 PMTiles', filename: 'raf1947.pmtiles', target: 'static/data/raf1947.pmtiles', required: true },
  { id: 'raf1947-cog', title: 'RAF Aerial Marden 1947 COG', filename: 'raf1947-cog.tif', target: 'static/data/raf1947-cog.tif', required: false },
];

// Backfill COGs for existing PMTiles
const BACKFILL_COGS = [
  // Tithe maps
  { id: 'wigmore-castle-village-tithe-cog', title: 'Wigmore Castle Village Tithe COG', filename: 'wigmore-castle-village-tithe-cog.tif', target: 'static/data/wigmore-castle-village-tithe-cog.tif', required: false },
  { id: 'hampton-bishop-tithe-cog', title: 'Hampton Bishop Tithe COG', filename: 'hampton-bishop-tithe-cog.tif', target: 'static/data/hampton-bishop-tithe-cog.tif', required: false },
  { id: 'holmer-tithe-cog', title: 'Holmer Tithe COG', filename: 'holmer-tithe-cog.tif', target: 'static/data/holmer-tithe-cog.tif', required: false },
  { id: 'marden-tithe-54-cog', title: 'Marden Tithe 54 COG', filename: 'marden-tithe-54-cog.tif', target: 'static/data/marden-tithe-54-cog.tif', required: false },
  { id: 'marden-tithe-55-cog', title: 'Marden Tithe 55 COG', filename: 'marden-tithe-55-cog.tif', target: 'static/data/marden-tithe-55-cog.tif', required: false },

  // FC1953 woodland
  { id: 'fc1953-ce-cog', title: 'FC1953 CE COG', filename: 'fc1953-ce-cog.tif', target: 'static/data/fc1953-ce-cog.tif', required: false },
  { id: 'fc1953-c13-14-20-21-cog', title: 'FC1953 C13_14_20_21 COG', filename: 'fc1953-c13-14-20-21-cog.tif', target: 'static/data/fc1953-c13-14-20-21-cog.tif', required: false },
  { id: 'fc1953-c27-cog', title: 'FC1953 C27 COG', filename: 'fc1953-c27-cog.tif', target: 'static/data/fc1953-c27-cog.tif', required: false },
  { id: 'fc1953-c28-29-35-36-cog', title: 'FC1953 C28_29_35_36 COG', filename: 'fc1953-c28-29-35-36-cog.tif', target: 'static/data/fc1953-c28-29-35-36-cog.tif', required: false },
  { id: 'fc1953-c40-cog', title: 'FC1953 C40 COG', filename: 'fc1953-c40-cog.tif', target: 'static/data/fc1953-c40-cog.tif', required: false },
  { id: 'fc1953-c4142fc-cog', title: 'FC1953 C4142FC COG', filename: 'fc1953-c4142fc-cog.tif', target: 'static/data/fc1953-c4142fc-cog.tif', required: false },
  { id: 'fc1953-c46-47-cog', title: 'FC1953 C46_47 COG', filename: 'fc1953-c46-47-cog.tif', target: 'static/data/fc1953-c46-47-cog.tif', required: false },
  { id: 'fc1953-c47-cog', title: 'FC1953 C47 COG', filename: 'fc1953-c47-cog.tif', target: 'static/data/fc1953-c47-cog.tif', required: false },
  { id: 'fc1953-c54-51s-cog', title: 'FC1953 C54&51S COG', filename: 'fc1953-c54-51s-cog.tif', target: 'static/data/fc1953-c54-51s-cog.tif', required: false },
  { id: 'fc1953-c6-7-11-12private-cog', title: 'FC1953 C6_7_11_12Private COG', filename: 'fc1953-c6-7-11-12private-cog.tif', target: 'static/data/fc1953-c6-7-11-12private-cog.tif', required: false },
  { id: 'fc1953-clords1953-cog', title: 'FC1953 CLords1953 COG', filename: 'fc1953-clords1953-cog.tif', target: 'static/data/fc1953-clords1953-cog.tif', required: false },
  { id: 'fc1953-cn-cog', title: 'FC1953 CN COG', filename: 'fc1953-cn-cog.tif', target: 'static/data/fc1953-cn-cog.tif', required: false },
  { id: 'fc1953-csw-cog', title: 'FC1953 CSW COG', filename: 'fc1953-csw-cog.tif', target: 'static/data/fc1953-csw-cog.tif', required: false },
];

function makeAsset(entry) {
  return {
    id: entry.id,
    title: entry.title,
    filename: entry.filename,
    url: `${BASE_URL}/${entry.filename}`,
    target: entry.target,
    requiredForBuild: entry.required,
    status: 'available'
  };
}

const allNew = [...NEW_ASSETS, ...BACKFILL_COGS].map(makeAsset);

// Avoid duplicates
const existingIds = new Set(manifest.assets.map((a) => a.id));
for (const asset of allNew) {
  if (!existingIds.has(asset.id)) {
    manifest.assets.push(asset);
    existingIds.add(asset.id);
  }
}

writeFileSync(releasesPath, JSON.stringify(manifest, null, '\t') + '\n');
console.log(`Updated ${releasesPath}`);
console.log(`  Added ${allNew.length} new release assets`);
