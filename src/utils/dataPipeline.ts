/**
 * Data ingestion + cleaning pipeline for the Earth-Science-Trend-Observatory.
 *
 * Pure, server-safe helpers (no DOM, no framework imports) shared by the
 * Express ingestion endpoints in server.ts and verified by tests/science.test.ts.
 *
 * Responsibilities:
 *  - input validation (coordinates, year ranges)
 *  - hardened upstream fetch (per-attempt timeout + bounded retry w/ backoff)
 *  - NASA POWER payload parsing (monthly + daily), incl. sentinel handling
 *  - deterministic cleaning: drop non-finite, dedupe by date, sort by time
 *  - coverage / provenance summaries attached to API responses
 */

export interface TimeSeriesPoint {
  date: string; // YYYY-MM or YYYY-MM-DD
  year: number;
  month: number;
  day?: number;
  decimalYear: number;
  value: number;
}

export interface CoverageSummary {
  n: number;
  firstDate: string | null;
  lastDate: string | null;
  spanYears: number;
  droppedSentinel: number;
  droppedInvalid: number;
  duplicatesRemoved: number;
  /** Largest gap between consecutive points, in years (0 when n < 2). */
  maxGapYears: number;
}

export const NASA_POWER_SENTINEL = -999;

/** Validate geographic coordinates. Returns an error message, or null when valid. */
export function validateCoordinates(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return 'Latitude and longitude must be finite numbers.';
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return 'Coordinates out of valid Earth bounds (-90..90, -180..180).';
  }
  return null;
}

export interface YearRange {
  startYear: number;
  endYear: number;
}

/** Clamp a requested year range into [minYear, maxYear] with endYear > startYear. */
export function clampYearRange(
  startYear: number,
  endYear: number,
  minYear: number,
  maxYear: number,
): YearRange {
  const start = Number.isFinite(startYear)
    ? Math.max(minYear, Math.min(maxYear - 1, Math.floor(startYear)))
    : minYear;
  const end = Number.isFinite(endYear)
    ? Math.max(start + 1, Math.min(maxYear, Math.floor(endYear)))
    : maxYear;
  return { startYear: start, endYear: end };
}

export function decimalYearMonthly(year: number, month: number): number {
  return Number((year + (month - 0.5) / 12).toFixed(4));
}

export function decimalYearDaily(year: number, month: number, day: number): number {
  const dayOfYear = (month - 1) * 30.4375 + day;
  return Number((year + (dayOfYear - 0.5) / 365.25).toFixed(5));
}

/** A parsed value is usable only when it is a finite, non-sentinel number. */
export function isUsableValue(val: unknown): val is number {
  return (
    typeof val === 'number' &&
    Number.isFinite(val) &&
    val !== NASA_POWER_SENTINEL
  );
}

export interface ParseStats {
  kept: number;
  droppedSentinel: number;
  droppedInvalid: number;
}

/**
 * Parse a NASA POWER monthly `parameter` record: keys are `YYYYMM`, plus a
 * `YYYY13` annual-mean row that must be skipped. Invalid rows are counted,
 * never thrown.
 */
export function parseNasaPowerMonthly(
  raw: Record<string, unknown>,
): { points: TimeSeriesPoint[]; stats: ParseStats } {
  const points: TimeSeriesPoint[] = [];
  let droppedSentinel = 0;
  let droppedInvalid = 0;

  for (const [key, val] of Object.entries(raw)) {
    if (val === NASA_POWER_SENTINEL || val === null || val === undefined) {
      droppedSentinel += 1;
      continue;
    }
    if (!isUsableValue(val)) {
      droppedInvalid += 1;
      continue;
    }
    if (typeof key !== 'string' || key.length !== 6) {
      droppedInvalid += 1;
      continue;
    }
    const y = Number(key.slice(0, 4));
    const m = Number(key.slice(4, 6));
    // Month 13 is the NASA POWER annual mean row — skip it.
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      droppedInvalid += 1;
      continue;
    }
    points.push({
      date: `${y}-${String(m).padStart(2, '0')}`,
      year: y,
      month: m,
      decimalYear: decimalYearMonthly(y, m),
      value: Number(val.toFixed(4)),
    });
  }

  return { points, stats: { kept: points.length, droppedSentinel, droppedInvalid } };
}

/** Parse a NASA POWER daily `parameter` record: keys are `YYYYMMDD`. */
export function parseNasaPowerDaily(
  raw: Record<string, unknown>,
): { points: TimeSeriesPoint[]; stats: ParseStats } {
  const points: TimeSeriesPoint[] = [];
  let droppedSentinel = 0;
  let droppedInvalid = 0;

  for (const [key, val] of Object.entries(raw)) {
    if (val === NASA_POWER_SENTINEL || val === null || val === undefined) {
      droppedSentinel += 1;
      continue;
    }
    if (!isUsableValue(val)) {
      droppedInvalid += 1;
      continue;
    }
    if (typeof key !== 'string' || key.length !== 8) {
      droppedInvalid += 1;
      continue;
    }
    const y = Number(key.slice(0, 4));
    const m = Number(key.slice(4, 6));
    const d = Number(key.slice(6, 8));
    if (
      !Number.isInteger(y) ||
      !Number.isInteger(m) ||
      !Number.isInteger(d) ||
      m < 1 ||
      m > 12 ||
      d < 1 ||
      d > 31
    ) {
      droppedInvalid += 1;
      continue;
    }
    points.push({
      date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      year: y,
      month: m,
      day: d,
      decimalYear: decimalYearDaily(y, m, d),
      value: Number(val.toFixed(4)),
    });
  }

  return { points, stats: { kept: points.length, droppedSentinel, droppedInvalid } };
}

/**
 * Deterministic cleaning pass: drop non-finite values, dedupe by `date`
 * (last occurrence wins), sort ascending by decimalYear. Pure — never mutates.
 */
export function cleanTimeSeries(points: TimeSeriesPoint[]): {
  points: TimeSeriesPoint[];
  duplicatesRemoved: number;
  droppedInvalid: number;
} {
  const byDate = new Map<string, TimeSeriesPoint>();
  let droppedInvalid = 0;

  for (const pt of points) {
    if (
      !pt ||
      typeof pt.date !== 'string' ||
      !Number.isFinite(pt.decimalYear) ||
      !Number.isFinite(pt.value)
    ) {
      droppedInvalid += 1;
      continue;
    }
    byDate.set(pt.date, pt); // last wins
  }

  const duplicatesRemoved = points.length - droppedInvalid - byDate.size;
  const cleaned = [...byDate.values()].sort((a, b) => a.decimalYear - b.decimalYear);
  return { points: cleaned, duplicatesRemoved, droppedInvalid };
}

/** Coverage / provenance summary for an (already cleaned) series. */
export function summarizeCoverage(
  points: TimeSeriesPoint[],
  dropped: { droppedSentinel?: number; droppedInvalid?: number; duplicatesRemoved?: number } = {},
): CoverageSummary {
  if (points.length === 0) {
    return {
      n: 0,
      firstDate: null,
      lastDate: null,
      spanYears: 0,
      droppedSentinel: dropped.droppedSentinel ?? 0,
      droppedInvalid: dropped.droppedInvalid ?? 0,
      duplicatesRemoved: dropped.duplicatesRemoved ?? 0,
      maxGapYears: 0,
    };
  }
  let maxGap = 0;
  for (let i = 1; i < points.length; i++) {
    const gap = points[i].decimalYear - points[i - 1].decimalYear;
    if (gap > maxGap) maxGap = gap;
  }
  return {
    n: points.length,
    firstDate: points[0].date,
    lastDate: points[points.length - 1].date,
    spanYears: Number((points[points.length - 1].decimalYear - points[0].decimalYear).toFixed(4)),
    droppedSentinel: dropped.droppedSentinel ?? 0,
    droppedInvalid: dropped.droppedInvalid ?? 0,
    duplicatesRemoved: dropped.duplicatesRemoved ?? 0,
    maxGapYears: Number(maxGap.toFixed(4)),
  };
}

export interface FetchRetryOptions {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  fetchImpl?: typeof fetch;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with a per-attempt timeout and bounded exponential-backoff retries.
 * Retries network errors, timeouts, and HTTP 5xx / 429; other 4xx fail fast.
 * Returns the first OK response; throws the last error when exhausted.
 */
export async function fetchWithRetry(url: string, options: FetchRetryOptions = {}): Promise<Response> {
  const { timeoutMs = 12000, retries = 2, backoffMs = 800, fetchImpl = fetch } = options;
  let attempt = 0;
  let lastError: unknown = new Error('fetchWithRetry: no attempts made');

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetchImpl(url, { signal: controller.signal });
      clearTimeout(timer);
      if (resp.ok) return resp;
      if (resp.status === 429 || resp.status >= 500) {
        lastError = new Error(`Upstream HTTP ${resp.status}`);
      } else {
        throw new Error(`Upstream HTTP ${resp.status}`);
      }
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      // Non-retryable client errors (HTTP 4xx other than 429) fail fast.
      if (err instanceof Error && /^Upstream HTTP 4/.test(err.message) && !/^Upstream HTTP 429/.test(err.message)) {
        throw err;
      }
    }
    if (attempt < retries) {
      await sleep(backoffMs * 2 ** attempt);
    }
    attempt += 1;
  }

  throw lastError;
}
