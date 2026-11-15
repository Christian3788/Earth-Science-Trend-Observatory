// Records live API responses into server/fixtures/ for offline demo fallback.
// Run against a live server:  BASE_URL=http://localhost:3000 node scripts/record-fixtures.mjs
// Only overwrites a fixture when the live response validates as real data.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { earthDataFixtureFile, geocodeFixtureFile } from '../server/fixtures.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const FIXTURES_DIR = path.join(HERE, '..', 'server', 'fixtures');
mkdirSync(FIXTURES_DIR, { recursive: true });

const PINNED_VARS = ['TS', 'PRECTOTCORR', 'SRF_ALB', 'GWETPROF', 'WS10M', 'ALLSKY_SFC_SW_DWN'];
const START_YEAR = 1985;
const END_YEAR = 2024;
const LOCATIONS = [
  { name: 'default-utqiagvik', lat: 71.29, lon: -156.79 },
];
const GEOCODE_QUERIES = ['nairobi', 'tokyo', 'utqiagvik'];

async function getJson(urlPath) {
  const resp = await fetch(`${BASE_URL}${urlPath}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${urlPath}`);
  return resp.json();
}

const manifest = { recordedAt: new Date().toISOString(), baseUrl: BASE_URL, entries: [] };

// Geocode fixtures first (Nairobi coords feed the second location).
for (const q of GEOCODE_QUERIES) {
  const payload = await getJson(`/api/geocode?q=${encodeURIComponent(q)}`);
  if (!Array.isArray(payload.results) || payload.results.length === 0) {
    throw new Error(`geocode ${q}: no live results, refusing to record`);
  }
  const file = geocodeFixtureFile(q);
  writeFileSync(file, `${JSON.stringify({ ...payload, recordedAt: manifest.recordedAt }, null, 1)}\n`);
  manifest.entries.push({ file: path.basename(file), endpoint: '/api/geocode', q, results: payload.results.length });
  console.log(`recorded ${path.basename(file)} (${payload.results.length} results)`);
  if (q === 'nairobi') {
    LOCATIONS.push({ name: 'nairobi', lat: payload.results[0].lat, lon: payload.results[0].lon });
  }
}

// Earth-data fixtures: every pinned variable at each demo location.
for (const loc of LOCATIONS) {
  for (const variable of PINNED_VARS) {
    const params = new URLSearchParams({
      lat: String(loc.lat),
      lon: String(loc.lon),
      variable,
      startYear: String(START_YEAR),
      endYear: String(END_YEAR),
      resolution: 'monthly',
    });
    const payload = await getJson(`/api/earth-data?${params.toString()}`);
    if (payload.sourceType !== 'nasa-power-live') {
      throw new Error(`${loc.name} ${variable}: not live (${payload.sourceType}), refusing to record`);
    }
    if (!Array.isArray(payload.points) || payload.points.length < 100) {
      throw new Error(`${loc.name} ${variable}: only ${payload.points?.length} points, refusing to record`);
    }
    const file = earthDataFixtureFile({
      variable,
      lat: payload.lat,
      lon: payload.lon,
      startYear: START_YEAR,
      endYear: END_YEAR,
      resolution: 'monthly',
    });
    writeFileSync(file, `${JSON.stringify({ ...payload, recordedAt: manifest.recordedAt }, null, 1)}\n`);
    manifest.entries.push({ file: path.basename(file), endpoint: '/api/earth-data', variable, ...loc });
    console.log(`recorded ${path.basename(file)} (${payload.points.length} points)`);
  }
}

writeFileSync(path.join(FIXTURES_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`done: ${manifest.entries.length} fixtures + manifest`);
