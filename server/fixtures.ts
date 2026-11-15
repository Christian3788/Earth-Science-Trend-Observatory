// Recorded-live-data fixtures: let the demo survive an upstream outage.
//
// When NASA POWER or Open-Meteo is unreachable, server.ts serves these
// pre-recorded *real* responses (flagged `offlineDemo: true`) instead of
// generated reference series or empty results. Record with:
//   BASE_URL=http://localhost:3000 node scripts/record-fixtures.mjs

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export interface FixtureQuery {
  fixturesDir?: string;
}

function dirOf(query?: FixtureQuery): string {
  return query?.fixturesDir ?? path.join(HERE, 'fixtures');
}

function readJson(file: string): unknown | null {
  try {
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export interface EarthDataFixtureKey {
  variable: string;
  lat: number;
  lon: number;
  startYear: number;
  endYear: number;
  resolution: 'monthly' | 'daily';
}

export function earthDataFixtureFile(key: EarthDataFixtureKey, query?: FixtureQuery): string {
  const name =
    `earth-data__${key.variable}__${key.lat.toFixed(2)}_${key.lon.toFixed(2)}` +
    `__${key.startYear}-${key.endYear}__${key.resolution}.json`;
  return path.join(dirOf(query), name);
}

export interface EarthDataFixturePayload {
  variable: string;
  lat: number;
  lon: number;
  resolution: string;
  sourceType: string;
  sourceLabel: string;
  points: Array<{ date: string; year: number; month: number; decimalYear: number; value: number }>;
  coverage?: unknown;
  recordedAt?: string;
}

/** Returns the recorded payload when it exists and has the expected shape, else null. */
export function findEarthDataFixture(
  key: EarthDataFixtureKey,
  query?: FixtureQuery,
): EarthDataFixturePayload | null {
  const raw = readJson(earthDataFixtureFile(key, query));
  if (!isRecord(raw)) return null;
  if (typeof raw.variable !== 'string' || !Array.isArray(raw.points)) return null;
  if (raw.variable !== key.variable) return null;
  if (raw.points.length < 6) return null;
  for (const p of raw.points) {
    if (!isRecord(p)) return null;
    if (
      typeof p.date !== 'string' ||
      typeof p.year !== 'number' ||
      typeof p.decimalYear !== 'number' ||
      typeof p.value !== 'number' ||
      !Number.isFinite(p.year) ||
      !Number.isFinite(p.decimalYear) ||
      !Number.isFinite(p.value)
    ) {
      return null;
    }
  }
  if (typeof raw.sourceType !== 'string' || typeof raw.sourceLabel !== 'string') return null;
  return {
    variable: raw.variable,
    lat: typeof raw.lat === 'number' ? raw.lat : key.lat,
    lon: typeof raw.lon === 'number' ? raw.lon : key.lon,
    resolution: typeof raw.resolution === 'string' ? raw.resolution : key.resolution,
    sourceType: raw.sourceType,
    sourceLabel: raw.sourceLabel,
    points: raw.points as EarthDataFixturePayload['points'],
    coverage: raw.coverage,
    recordedAt: typeof raw.recordedAt === 'string' ? raw.recordedAt : undefined,
  };
}

export function geocodeFixtureFile(q: string, query?: FixtureQuery): string {
  const slug = q
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return path.join(dirOf(query), `geocode__${slug}.json`);
}

export type GeocodeFixtureKind = 'feature' | 'city' | 'coordinate';

export interface GeocodeFixturePayload {
  results: Array<{
    id: string;
    name: string;
    subtitle: string;
    lat: number;
    lon: number;
    kind: GeocodeFixtureKind;
  }>;
  recordedAt?: string;
}

function coerceKind(v: unknown): GeocodeFixtureKind {
  return v === 'feature' || v === 'city' || v === 'coordinate' ? v : 'city';
}

/** Returns recorded geocode results for an exact normalized query, else null. */
export function findGeocodeFixture(q: string, query?: FixtureQuery): GeocodeFixturePayload | null {
  const raw = readJson(geocodeFixtureFile(q, query));
  if (!isRecord(raw) || !Array.isArray(raw.results) || raw.results.length === 0) return null;
  for (const r of raw.results) {
    if (!isRecord(r)) return null;
    if (
      typeof r.id !== 'string' ||
      typeof r.name !== 'string' ||
      typeof r.lat !== 'number' ||
      typeof r.lon !== 'number' ||
      !Number.isFinite(r.lat) ||
      !Number.isFinite(r.lon)
    ) {
      return null;
    }
  }
  return {
    results: raw.results.map((r) => {
      const rec = r as Record<string, unknown>;
      return {
        id: rec.id as string,
        name: rec.name as string,
        subtitle: typeof rec.subtitle === 'string' ? rec.subtitle : '',
        lat: rec.lat as number,
        lon: rec.lon as number,
        kind: coerceKind(rec.kind),
      };
    }),
    recordedAt: typeof raw.recordedAt === 'string' ? raw.recordedAt : undefined,
  };
}
