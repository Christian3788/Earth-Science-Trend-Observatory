// Tests for offline demo fixtures. Run with:
//   npm test -- tests/fixtures.test.ts
//   node --test tests/fixtures.test.ts
// (No test runner dependency: uses the Node built-in test module.)

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findEarthDataFixture,
  findGeocodeFixture,
} from '../server/fixtures.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(HERE, '..', 'server', 'fixtures');

describe('findEarthDataFixture', () => {
  test('hits the recorded default demo query', () => {
    const hit = findEarthDataFixture({
      variable: 'TS',
      lat: 71.29,
      lon: -156.79,
      startYear: 1985,
      endYear: 2024,
      resolution: 'monthly',
    });
    assert.ok(hit);
    assert.equal(hit.sourceType, 'nasa-power-live');
    assert.equal(hit.points.length, 480);
    assert.ok(hit.recordedAt);
  });

  test('misses unknown coordinates, variables, and spans', () => {
    const base = {
      variable: 'TS',
      lat: 71.29,
      lon: -156.79,
      startYear: 1985,
      endYear: 2024,
      resolution: 'monthly' as const,
    };
    assert.equal(findEarthDataFixture({ ...base, lat: 0, lon: 0 }), null);
    assert.equal(findEarthDataFixture({ ...base, variable: 'MODIS_NDVI' }), null);
    assert.equal(findEarthDataFixture({ ...base, startYear: 1990 }), null);
    assert.equal(findEarthDataFixture({ ...base, resolution: 'daily' }), null);
  });

  test('rejects corrupt or wrong-shaped fixture files', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'fixtures-'));
    const name = 'earth-data__TS__71.29_-156.79__1985-2024__monthly.json';
    const key = {
      variable: 'TS',
      lat: 71.29,
      lon: -156.79,
      startYear: 1985,
      endYear: 2024,
      resolution: 'monthly' as const,
    };
    writeFileSync(path.join(dir, name), 'not json{{{');
    assert.equal(findEarthDataFixture(key, { fixturesDir: dir }), null);
    writeFileSync(path.join(dir, name), JSON.stringify({ variable: 'TS', points: [{ nope: 1 }] }));
    assert.equal(findEarthDataFixture(key, { fixturesDir: dir }), null);
    writeFileSync(
      path.join(dir, name),
      JSON.stringify({ variable: 'OTHER', points: [], sourceType: 'x', sourceLabel: 'y' }),
    );
    assert.equal(findEarthDataFixture(key, { fixturesDir: dir }), null);
  });
});

describe('findGeocodeFixture', () => {
  test('matches queries case-insensitively', () => {
    for (const q of ['nairobi', 'Nairobi', '  NAIROBI  ']) {
      const hit = findGeocodeFixture(q);
      assert.ok(hit, q);
      assert.ok(hit.results.length > 0);
      assert.ok(hit.results.some((r) => r.name.toLowerCase().includes('nairobi')));
    }
  });

  test('misses unrecorded queries', () => {
    assert.equal(findGeocodeFixture('somewhere-not-recorded-xyz'), null);
  });
});

describe('committed fixture integrity', () => {
  const manifest = JSON.parse(readFileSync(path.join(FIXTURES_DIR, 'manifest.json'), 'utf8')) as {
    recordedAt: string;
    entries: Array<{ file: string; endpoint: string; variable?: string; lat?: number; lon?: number; q?: string }>;
  };

  test('manifest lists every committed fixture', () => {
    assert.ok(manifest.recordedAt);
    assert.ok(manifest.entries.length >= 15);
  });

  test('every manifest entry resolves through the loader', () => {
    for (const e of manifest.entries) {
      if (e.endpoint === '/api/earth-data') {
        const hit = findEarthDataFixture({
          variable: e.variable as string,
          lat: e.lat as number,
          lon: e.lon as number,
          startYear: 1985,
          endYear: 2024,
          resolution: 'monthly',
        });
        assert.ok(hit, e.file);
        assert.ok(hit.points.length >= 100, e.file);
      } else {
        const hit = findGeocodeFixture(e.q as string);
        assert.ok(hit, e.file);
        assert.equal(hit.results.length > 0, true, e.file);
      }
    }
  });
});
