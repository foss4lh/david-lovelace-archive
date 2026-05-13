#!/usr/bin/env node
/**
 * Update catalog/datasets.json with:
 * - COG assets for all existing PMTiles
 * - 3 new datasets for the 7 newly converted historic maps
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const datasetsPath = resolve('catalog/datasets.json');
const datasets = JSON.parse(readFileSync(datasetsPath, 'utf-8'));

const BASE_URL = 'https://github.com/foss4lh/david-lovelace-archive/releases/download/data-v0.1.0';

function cogAsset(pmtilesAsset) {
  const id = pmtilesAsset.id + '-cog';
  const filename = pmtilesAsset.releaseAsset
    ? pmtilesAsset.releaseAsset.replace('.pmtiles', '-cog.tif')
    : id + '.tif';
  return {
    id,
    kind: 'cog',
    title: pmtilesAsset.title + ' — COG GeoTIFF',
    releaseAsset: filename,
    localPath: '/data/' + filename,
    remoteUrl: `${BASE_URL}/${filename}`,
    status: 'available'
  };
}

// 1. Add COGs to tithe maps dataset
const titheDataset = datasets.find((d) => d.id === 'hfd-tithe-maps');
if (titheDataset) {
  for (const asset of titheDataset.assets) {
    if (asset.kind === 'pmtiles' && asset.status === 'available' && asset.releaseAsset) {
      const existingCog = titheDataset.assets.find((a) => a.id === asset.id + '-cog');
      if (!existingCog) {
        titheDataset.assets.push(cogAsset(asset));
      }
    }
  }
}

// 2. Add COGs to FC1953 woodland dataset
const woodlandDataset = datasets.find((d) => d.id === 'hfd-woodland-1948');
if (woodlandDataset) {
  for (const asset of woodlandDataset.assets) {
    if (asset.kind === 'pmtiles' && asset.status === 'available' && asset.releaseAsset) {
      const existingCog = woodlandDataset.assets.find((a) => a.id === asset.id + '-cog');
      if (!existingCog) {
        woodlandDataset.assets.push(cogAsset(asset));
      }
    }
  }
}

// 3. Add 3 new datasets
const newDatasets = [
  {
    id: 'hfd-historic-hereford',
    title: 'Historic Hereford Maps',
    period: '1606–1885',
    coverage: 'Hereford city',
    theme: 'historic maps',
    status: 'available',
    summary:
      'Georeferenced historic maps of Hereford city spanning from John Speed\'s 1606 plan through the Victorian 1885 map. Each map is available as a browsable PMTiles overlay and a downloadable COG GeoTIFF for QGIS import.',
    sourceArchivePaths: ['HARC/Raster/Hereford'],
    assets: [
      {
        id: 'speed1606',
        kind: 'pmtiles',
        title: 'John Speed — Hereford (1606)',
        releaseAsset: 'speed1606.pmtiles',
        localPath: '/data/speed1606.pmtiles',
        remoteUrl: `${BASE_URL}/speed1606.pmtiles`,
        status: 'available',
        bounds: [-2.728706, 52.049171, -2.7030219, 52.066373],
        minZoom: 10,
        maxZoom: 16
      },
      {
        id: 'speed1606-cog',
        kind: 'cog',
        title: 'John Speed — Hereford (1606) — COG GeoTIFF',
        releaseAsset: 'speed1606-cog.tif',
        localPath: '/data/speed1606-cog.tif',
        remoteUrl: `${BASE_URL}/speed1606-cog.tif`,
        status: 'available'
      },
      {
        id: 'taylor1754',
        kind: 'pmtiles',
        title: 'Taylor — Hereford (1754)',
        releaseAsset: 'taylor1754.pmtiles',
        localPath: '/data/taylor1754.pmtiles',
        remoteUrl: `${BASE_URL}/taylor1754.pmtiles`,
        status: 'available',
        bounds: [-2.732276, 52.047358, -2.702845, 52.061431],
        minZoom: 10,
        maxZoom: 16
      },
      {
        id: 'taylor1754-cog',
        kind: 'cog',
        title: 'Taylor — Hereford (1754) — COG GeoTIFF',
        releaseAsset: 'taylor1754-cog.tif',
        localPath: '/data/taylor1754-cog.tif',
        remoteUrl: `${BASE_URL}/taylor1754-cog.tif`,
        status: 'available'
      },
      {
        id: 'brayley1806',
        kind: 'pmtiles',
        title: 'Brayley — Hereford (1806)',
        releaseAsset: 'brayley1806.pmtiles',
        localPath: '/data/brayley1806.pmtiles',
        remoteUrl: `${BASE_URL}/brayley1806.pmtiles`,
        status: 'available',
        bounds: [-2.732277, 52.047359, -2.702846, 52.061434],
        minZoom: 10,
        maxZoom: 16
      },
      {
        id: 'brayley1806-cog',
        kind: 'cog',
        title: 'Brayley — Hereford (1806) — COG GeoTIFF',
        releaseAsset: 'brayley1806-cog.tif',
        localPath: '/data/brayley1806-cog.tif',
        remoteUrl: `${BASE_URL}/brayley1806-cog.tif`,
        status: 'available'
      },
      {
        id: 'hereford1885',
        kind: 'pmtiles',
        title: 'Hereford (1885)',
        releaseAsset: 'hereford1885.pmtiles',
        localPath: '/data/hereford1885.pmtiles',
        remoteUrl: `${BASE_URL}/hereford1885.pmtiles`,
        status: 'available',
        bounds: [-2.775009, 52.019878, -2.671763, 52.0924229],
        minZoom: 10,
        maxZoom: 16
      },
      {
        id: 'hereford1885-cog',
        kind: 'cog',
        title: 'Hereford (1885) — COG GeoTIFF',
        releaseAsset: 'hereford1885-cog.tif',
        localPath: '/data/hereford1885-cog.tif',
        remoteUrl: `${BASE_URL}/hereford1885-cog.tif`,
        status: 'available'
      }
    ],
    nextSteps: [
      'Add contextual text about each map cartographer and survey method.',
      'Cross-reference with modern Hereford city boundaries.',
      'Link to related archive material (tithe, OS, aerial).'
    ],
    limitations: 'Maps cover Hereford city only; surrounding parishes are on separate sheets.'
  },
  {
    id: 'hfd-os-historic',
    title: 'Historic Ordnance Survey Maps',
    period: '1884–1886',
    coverage: 'Herefordshire',
    theme: 'historic maps',
    status: 'available',
    summary:
      'Victorian Ordnance Survey maps at 6-inch and 1:2500 scales, georeferenced from original ECW sources. Available as PMTiles for web browsing and COG GeoTIFFs for GIS download.',
    sourceArchivePaths: ['HARC/Raster/Marden', 'Maps/EN_Historical', 'Maps/1880_6inch'],
    assets: [
      {
        id: 'os6inch1886',
        kind: 'pmtiles',
        title: 'OS 6-inch — Marden (1886)',
        releaseAsset: 'os6inch1886.pmtiles',
        localPath: '/data/os6inch1886.pmtiles',
        remoteUrl: `${BASE_URL}/os6inch1886.pmtiles`,
        status: 'available',
        bounds: [-2.762396, 52.074734, -2.621953, 52.161475],
        minZoom: 10,
        maxZoom: 16
      },
      {
        id: 'os6inch1886-cog',
        kind: 'cog',
        title: 'OS 6-inch — Marden (1886) — COG GeoTIFF',
        releaseAsset: 'os6inch1886-cog.tif',
        localPath: '/data/os6inch1886-cog.tif',
        remoteUrl: `${BASE_URL}/os6inch1886-cog.tif`,
        status: 'available'
      },
      {
        id: 'gv1886',
        kind: 'pmtiles',
        title: 'OS 1:2500 — Golden Valley (1886)',
        releaseAsset: 'gv1886.pmtiles',
        localPath: '/data/gv1886.pmtiles',
        remoteUrl: `${BASE_URL}/gv1886.pmtiles`,
        status: 'available',
        bounds: [-3.101528, 51.913879, -2.900107, 52.061287],
        minZoom: 10,
        maxZoom: 16
      },
      {
        id: 'gv1886-cog',
        kind: 'cog',
        title: 'OS 1:2500 — Golden Valley (1886) — COG GeoTIFF',
        releaseAsset: 'gv1886-cog.tif',
        localPath: '/data/gv1886-cog.tif',
        remoteUrl: `${BASE_URL}/gv1886-cog.tif`,
        status: 'available'
      }
    ],
    nextSteps: [
      'Add more OS historic sheets from the 1880_6inch AffineECW collection.',
      'Link field boundaries to tithe and modern land-use data.',
      'Document georeferencing confidence and known sheet distortions.'
    ],
    limitations: 'Current coverage is limited to Marden parish and Golden Valley; additional 1880s OS sheets exist in Maps/1880_6inch/AffineECW.'
  },
  {
    id: 'hfd-aerial-historic',
    title: 'Historic Aerial Photography',
    period: '1946–1947',
    coverage: 'Herefordshire',
    theme: 'aerial photography',
    status: 'available',
    summary:
      'Post-WWII RAF vertical aerial photography from 1946–1947, georeferenced from ECW sources. Available as PMTiles overlay and COG GeoTIFF download.',
    sourceArchivePaths: ['HARC/Raster/Hereford', 'HARC/Raster/Marden'],
    assets: [
      {
        id: 'raf1947',
        kind: 'pmtiles',
        title: 'RAF Aerial — Marden (1947)',
        releaseAsset: 'raf1947.pmtiles',
        localPath: '/data/raf1947.pmtiles',
        remoteUrl: `${BASE_URL}/raf1947.pmtiles`,
        status: 'available',
        bounds: [-2.728485, 52.0870279, -2.6290269, 52.146599],
        minZoom: 10,
        maxZoom: 16
      },
      {
        id: 'raf1947-cog',
        kind: 'cog',
        title: 'RAF Aerial — Marden (1947) — COG GeoTIFF',
        releaseAsset: 'raf1947-cog.tif',
        localPath: '/data/raf1947-cog.tif',
        remoteUrl: `${BASE_URL}/raf1947-cog.tif`,
        status: 'available'
      }
    ],
    nextSteps: [
      'Add RAF 1946 Hereford coverage.',
      'Curate additional aerial photo sets from AirPhotos folders.',
      'Create sample thumbnail gallery for non-georeferenced photos.'
    ],
    limitations: 'Current coverage is limited to Marden parish; additional RAF and commercial aerial photos exist in the archive but are not yet georeferenced.'
  }
];

datasets.push(...newDatasets);

writeFileSync(datasetsPath, JSON.stringify(datasets, null, '\t') + '\n');
console.log(`Updated ${datasetsPath}`);
console.log(`  Added COGs to tithe + woodland datasets`);
console.log(`  Added ${newDatasets.length} new datasets`);
