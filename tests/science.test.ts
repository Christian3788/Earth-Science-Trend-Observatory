/**
 * Science-engine verification suite (Builder A: data + science).
 *
 * Zero-dependency: runs on Node >= 22 type-stripping via the repo `test` script:
 *   node --test tests/science.test.ts
 *
 * Every numeric expectation below is hand-computed (see comments), NOT copied
 * from the implementation's output, so the suite can actually catch regressions.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateAnnual,
  analyzeTimeSeries,
  buildCSVExport,
  deseasonalizeMonthly,
  studentTTwoTailedPValue,
} from '../src/utils/statistics.ts';
import {
  clampYearRange,
  cleanTimeSeries,
  fetchWithRetry,
  parseNasaPowerDaily,
  parseNasaPowerMonthly,
  summarizeCoverage,
  validateCoordinates,
} from '../src/utils/dataPipeline.ts';

type Pt = { date: string; year: number; month: number; decimalYear: number; value: number };

const monthly = (year: number, month: number, value: number): Pt => ({
  date: `${year}-${String(month).padStart(2, '0')}`,
  year,
  month,
  decimalYear: year + (month - 0.5) / 12,
  value,
});

const annual = (year: number, value: number): Pt => ({
  date: `${year}`,
  year,
  month: 6,
  decimalYear: year + 0.5,
  value,
});

const approx = (actual: number, expected: number, tol: number, label: string) => {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${label}: expected ${expected} ± ${tol}, got ${actual}`,
  );
};

// ---------------------------------------------------------------------------
// OLS regression — classic textbook dataset
// x = 1..5, y = 2,4,5,4,5  =>  meanX=3, meanY=4, sxx=10, sxy=6,
// slope=0.6, sse=2.4, syy=6, R^2=0.6; with decimalYear x (mean 2002.5),
// intercept = 4 - 0.6*2002.5 = -1197.5 (translation of the textbook 2.2),
// se_slope=sqrt(0.8/10)=0.28284, t=2.12132, df=3, two-tailed p ~= 0.124
// ---------------------------------------------------------------------------
describe('OLS regression (classic x=1..5, y=2,4,5,4,5)', () => {
  const ys = [2, 4, 5, 4, 5];
  const pts = ys.map((v, i) => annual(2000 + i, v));
  const summary = analyzeTimeSeries(pts, {
    resolution: 'monthly',
    deseasonalize: false,
    variableName: 'Test Var',
    unit: 'u',
    regionName: 'Test Region',
  });
  assert.ok(summary, 'analysis must not return null');

  it('recovers slope, intercept and R^2 exactly', () => {
    approx(summary.ols.slopePerYear, 0.6, 1e-9, 'slope');
    approx(summary.ols.intercept, -1197.5, 1e-6, 'intercept');
    approx(summary.ols.rSquared, 0.6, 1e-9, 'R^2');
    approx(summary.ols.slopePerDecade, 6.0, 1e-9, 'slope/decade');
  });

  it('computes standard error, t-statistic and p-value', () => {
    approx(summary.ols.standardErrorSlope, Math.sqrt(0.08), 1e-9, 'se(slope)');
    approx(summary.ols.tStatistic, 2.1213203436, 1e-6, 't-stat');
    assert.equal(summary.ols.df, 3);
    // t-table: df=3, t=2.121 lies between p=0.20 (t=1.638) and p=0.10 (t=2.353)
    approx(summary.ols.pValue, 0.124, 0.01, 'OLS p-value');
  });

  it('covers the slope with the 95% CI (df=3 => t_crit=3.182)', () => {
    // CI = 0.6 ± 3.182 * 0.28284 = (-0.300, 1.500)
    approx(summary.ols.ci95LowerPerYear, -0.3, 0.01, 'CI lower');
    approx(summary.ols.ci95UpperPerYear, 1.5, 0.01, 'CI upper');
  });

  it('flags an emerging (not yet significant) drift', () => {
    assert.equal(summary.isSignificant, false); // p ~ 0.124 > 0.05
    assert.ok(summary.verdictTitle.includes('Emerging'), summary.verdictTitle);
  });
});

// ---------------------------------------------------------------------------
// Student-t p-value against published t-table entries
// ---------------------------------------------------------------------------
describe('Student-t two-tailed p-value', () => {
  it('matches t-table: t=2.306, df=8 => p=0.05', () => {
    approx(studentTTwoTailedPValue(2.306, 8), 0.05, 0.002, 't(2.306, df=8)');
  });

  it('matches t-table: t=3.355, df=8 => p=0.01', () => {
    approx(studentTTwoTailedPValue(3.355, 8), 0.01, 0.002, 't(3.355, df=8)');
  });

  it('returns 1 for t=0 and clamps degenerate inputs', () => {
    assert.equal(studentTTwoTailedPValue(0, 10), 1);
    assert.equal(studentTTwoTailedPValue(5, 0), 1);
    assert.equal(studentTTwoTailedPValue(Number.NaN, 10), 1);
  });
});

// ---------------------------------------------------------------------------
// Mann-Kendall + Sen's slope
// Strictly increasing 1..10, yearly: S = C(10,2) = 45, var = 10*9*25/18 = 125,
// z = 44/sqrt(125) = 3.9355, two-tailed normal p ~= 8.3e-5, tau = 1,
// every pairwise slope = 1/year => Sen's slope = 1.
// ---------------------------------------------------------------------------
describe('Mann-Kendall + Sen slope (strictly increasing 1..10)', () => {
  const pts = Array.from({ length: 10 }, (_, i) => annual(2000 + i, i + 1));
  const summary = analyzeTimeSeries(pts, {
    resolution: 'monthly',
    deseasonalize: false,
    variableName: 'Test Var',
    unit: 'u',
    regionName: 'Test Region',
  });
  assert.ok(summary, 'analysis must not return null');

  it('computes S, variance, z, tau and Sen slope', () => {
    assert.equal(summary.mannKendall.sStatistic, 45);
    approx(summary.mannKendall.varianceS, 125, 1e-9, 'var(S)');
    approx(summary.mannKendall.zScore, 3.9355, 1e-3, 'z');
    approx(summary.mannKendall.tau, 1, 1e-12, 'tau');
    approx(summary.mannKendall.sensSlopePerYear, 1, 1e-12, "Sen's slope");
  });

  it('is highly significant (p < 0.001)', () => {
    assert.ok(summary.mannKendall.pValue < 0.001, `p=${summary.mannKendall.pValue}`);
    assert.equal(summary.isSignificant, true);
    assert.equal(summary.verdictDirection, 'up');
  });
});

// Tie correction: [1,2,2,3] => S=5, tie term=2*1*9=18,
// var=(4*3*13-18)/18=138/18=7.6667, z=(5-1)/sqrt(7.6667)=1.4447, p~=0.149
describe('Mann-Kendall tie correction ([1,2,2,3])', () => {
  const pts = [1, 2, 2, 3].map((v, i) => annual(2000 + i, v));
  const summary = analyzeTimeSeries(pts, {
    resolution: 'monthly',
    deseasonalize: false,
    variableName: 'Test Var',
    unit: 'u',
    regionName: 'Test Region',
  });
  assert.ok(summary, 'analysis must not return null');

  it('applies the tie term to var(S)', () => {
    assert.equal(summary.mannKendall.sStatistic, 5);
    approx(summary.mannKendall.varianceS, 138 / 18, 1e-9, 'var(S) with ties');
    approx(summary.mannKendall.zScore, 1.4447, 1e-3, 'z');
    approx(summary.mannKendall.pValue, 0.149, 0.01, 'MK p-value');
  });
});

describe('No-trend series (constant values)', () => {
  const pts = Array.from({ length: 12 }, (_, i) => annual(2000 + i, 7.5));
  const summary = analyzeTimeSeries(pts, {
    resolution: 'monthly',
    deseasonalize: false,
    variableName: 'Test Var',
    unit: 'u',
    regionName: 'Test Region',
  });
  assert.ok(summary, 'analysis must not return null');

  it('reports zero slope, S=0, p=1, no significance', () => {
    approx(summary.ols.slopePerYear, 0, 1e-12, 'slope');
    assert.equal(summary.mannKendall.sStatistic, 0);
    approx(summary.mannKendall.pValue, 1, 1e-6, 'MK p-value');
    assert.equal(summary.isSignificant, false);
    assert.equal(summary.verdictTitle, 'No Statistically Significant Trend');
  });
});

// ---------------------------------------------------------------------------
// Preprocessing: deseasonalize + annual aggregation
// ---------------------------------------------------------------------------
describe('deseasonalizeMonthly', () => {
  it('removes a pure repeating seasonal cycle exactly', () => {
    const pts: Pt[] = [];
    for (const year of [2020, 2021]) {
      for (let m = 1; m <= 12; m++) pts.push(monthly(year, m, m)); // value == month
    }
    const out = deseasonalizeMonthly(pts);
    assert.equal(out.length, 24);
    for (const pt of out) approx(pt.value, 0, 1e-9, `deseasonalized ${pt.date}`);
  });
});

describe('aggregateAnnual', () => {
  it('averages full years and skips sparse years (<6 obs)', () => {
    const pts: Pt[] = [];
    for (let m = 1; m <= 12; m++) pts.push(monthly(2000, m, m)); // mean 6.5
    for (let m = 1; m <= 4; m++) pts.push(monthly(2001, m, 100)); // sparse
    const out = aggregateAnnual(pts);
    assert.equal(out.length, 1);
    assert.equal(out[0].year, 2000);
    approx(out[0].value, 6.5, 1e-9, 'annual mean');
  });
});

// ---------------------------------------------------------------------------
// End-to-end: synthetic warming series +0.03/yr with seasonal cycle and
// deterministic noise, 1985-2024 monthly, deseasonalized => significant up.
// ---------------------------------------------------------------------------
describe('warming-trend end-to-end (synthetic +0.03/yr, 1985-2024)', () => {
  const pts: Pt[] = [];
  let i = 0;
  for (let year = 1985; year <= 2024; year++) {
    for (let m = 1; m <= 12; m++) {
      const phase = ((m - 1) / 12) * 2 * Math.PI;
      const noise = 0.3 * Math.sin(i * 1.7) + 0.15 * Math.cos(i * 0.61);
      pts.push(monthly(year, m, 15 + 0.03 * (year - 1985) + 8 * Math.sin(phase) + noise));
      i += 1;
    }
  }
  const summary = analyzeTimeSeries(pts, {
    resolution: 'monthly',
    deseasonalize: true,
    variableName: 'Air Temp',
    unit: '°C',
    regionName: 'Test Region',
  });
  assert.ok(summary, 'analysis must not return null');

  it('detects a significant increasing trend near +0.03/yr', () => {
    assert.equal(summary.isSignificant, true);
    assert.equal(summary.verdictDirection, 'up');
    approx(summary.ols.slopePerYear, 0.03, 0.006, 'recovered warming rate');
    approx(summary.mannKendall.sensSlopePerYear, 0.03, 0.006, "Sen's warming rate");
    assert.ok(summary.ols.pValue < 0.001, `OLS p=${summary.ols.pValue}`);
  });

  it('exports a CSV with provenance header + one row per point', () => {
    const csv = buildCSVExport('Air Temp', '°C', 'Test Region', 10, 20, summary);
    const lines = csv.split('\n');
    assert.ok(lines[0].startsWith('# TerraTrend Observatory Export'));
    assert.ok(csv.includes('Air Temp'));
    assert.equal(lines.length, 7 + summary.points.length);
  });
});

// ---------------------------------------------------------------------------
// Data pipeline: validation
// ---------------------------------------------------------------------------
describe('validateCoordinates / clampYearRange', () => {
  it('accepts in-bounds finite coordinates', () => {
    assert.equal(validateCoordinates(0, 0), null);
    assert.equal(validateCoordinates(-90, 180), null);
  });

  it('rejects out-of-bounds and non-finite coordinates', () => {
    assert.ok(validateCoordinates(91, 0));
    assert.ok(validateCoordinates(0, -181));
    assert.ok(validateCoordinates(Number.NaN, 0));
    assert.ok(validateCoordinates(0, Number.POSITIVE_INFINITY));
  });

  it('clamps year ranges and enforces endYear > startYear', () => {
    assert.deepEqual(clampYearRange(1985, 2024, 1981, 2025), { startYear: 1985, endYear: 2024 });
    assert.deepEqual(clampYearRange(1900, 2030, 1981, 2025), { startYear: 1981, endYear: 2025 });
    assert.deepEqual(clampYearRange(2020, 2020, 1981, 2025), { startYear: 2020, endYear: 2021 });
    assert.deepEqual(clampYearRange(Number.NaN, Number.NaN, 1981, 2025), {
      startYear: 1981,
      endYear: 2025,
    });
  });
});

// ---------------------------------------------------------------------------
// Data pipeline: NASA POWER parsers
// ---------------------------------------------------------------------------
describe('parseNasaPowerMonthly', () => {
  it('keeps valid months; drops sentinel, month-13 annual row, malformed keys', () => {
    const raw: Record<string, unknown> = {
      202001: 5, // keep
      202002: -999, // sentinel
      202003: null, // sentinel-ish
      202004: Number.NaN, // invalid value
      202013: 99, // annual-mean row -> invalid month
      '2020AB': 3, // malformed
      20201: 4, // wrong length
    };
    const { points, stats } = parseNasaPowerMonthly(raw);
    assert.equal(points.length, 1);
    assert.equal(points[0].date, '2020-01');
    assert.equal(points[0].value, 5);
    assert.deepEqual(stats, { kept: 1, droppedSentinel: 2, droppedInvalid: 4 });
  });
});

describe('parseNasaPowerDaily', () => {
  it('keeps valid days; drops sentinel and impossible calendar dates', () => {
    const raw: Record<string, unknown> = {
      20200115: 1.5, // keep
      20200132: 2, // day 32 invalid
      20201301: 2, // month 13 invalid
      2020010: 1, // wrong length
      20200201: -999, // sentinel
    };
    const { points, stats } = parseNasaPowerDaily(raw);
    assert.equal(points.length, 1);
    assert.equal(points[0].date, '2020-01-15');
    assert.equal(points[0].day, 15);
    assert.deepEqual(stats, { kept: 1, droppedSentinel: 1, droppedInvalid: 3 });
  });
});

describe('cleanTimeSeries + summarizeCoverage', () => {
  it('dedupes by date (last wins), drops non-finite, sorts by time', () => {
    const pts = [
      monthly(2001, 3, 3),
      monthly(2000, 1, 1),
      monthly(2001, 3, 30), // duplicate date, must win
      { ...monthly(2002, 5, 5), value: Number.NaN }, // dropped
    ];
    const { points, duplicatesRemoved, droppedInvalid } = cleanTimeSeries(pts);
    assert.equal(points.length, 2);
    assert.equal(points[0].date, '2000-01');
    assert.equal(points[1].date, '2001-03');
    assert.equal(points[1].value, 30);
    assert.equal(duplicatesRemoved, 1);
    assert.equal(droppedInvalid, 1);
  });

  it('summarizes coverage with span and max gap', () => {
    const pts = [monthly(2000, 1, 1), monthly(2000, 2, 2), monthly(2005, 1, 3)];
    const cov = summarizeCoverage(pts, { droppedSentinel: 2 });
    assert.equal(cov.n, 3);
    assert.equal(cov.firstDate, '2000-01');
    assert.equal(cov.lastDate, '2005-01');
    approx(cov.spanYears, 5, 0.01, 'span');
    assert.ok(cov.maxGapYears > 4.5, `maxGap=${cov.maxGapYears}`);
    assert.equal(cov.droppedSentinel, 2);
  });

  it('handles empty input', () => {
    const cov = summarizeCoverage([]);
    assert.equal(cov.n, 0);
    assert.equal(cov.firstDate, null);
    assert.equal(cov.maxGapYears, 0);
  });
});

// ---------------------------------------------------------------------------
// Data pipeline: fetchWithRetry with injected mock fetch (no network)
// ---------------------------------------------------------------------------
describe('fetchWithRetry', () => {
  const okResp = (status = 200) => ({ ok: status >= 200 && status < 300, status }) as Response;

  it('retries HTTP 500 then returns the OK response', async () => {
    let calls = 0;
    const mock = async () => {
      calls += 1;
      return calls < 3 ? okResp(500) : okResp(200);
    };
    const resp = await fetchWithRetry('https://example.test', {
      retries: 3,
      backoffMs: 1,
      fetchImpl: mock as typeof fetch,
    });
    assert.equal(resp.status, 200);
    assert.equal(calls, 3);
  });

  it('fails fast on HTTP 404 without retrying', async () => {
    let calls = 0;
    const mock = async () => {
      calls += 1;
      return okResp(404);
    };
    await assert.rejects(
      fetchWithRetry('https://example.test', { retries: 3, backoffMs: 1, fetchImpl: mock as typeof fetch }),
      /HTTP 404/,
    );
    assert.equal(calls, 1);
  });

  it('retries network errors then throws the last error', async () => {
    let calls = 0;
    const mock = async () => {
      calls += 1;
      throw new Error('boom');
    };
    await assert.rejects(
      fetchWithRetry('https://example.test', { retries: 1, backoffMs: 1, fetchImpl: mock as typeof fetch }),
      /boom/,
    );
    assert.equal(calls, 2);
  });

  it('aborts a hanging upstream after timeoutMs', async () => {
    const hanging = (_url: string, init?: { signal?: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    await assert.rejects(
      fetchWithRetry('https://example.test', {
        timeoutMs: 20,
        retries: 0,
        fetchImpl: hanging as typeof fetch,
      }),
      /aborted/,
    );
  });
});

// ---------------------------------------------------------------------------
// Full pipeline: fabricated NASA POWER monthly payload -> parse -> clean ->
// analyze must recover the embedded warming trend despite sentinel + month-13.
// ---------------------------------------------------------------------------
describe('parse -> clean -> analyze pipeline', () => {
  it('recovers +0.04/yr from noisy monthly data with sentinel gaps', () => {
    const raw: Record<string, unknown> = {};
    for (let year = 1990; year <= 2023; year++) {
      for (let m = 1; m <= 12; m++) {
        const key = `${year}${String(m).padStart(2, '0')}`;
        // Deterministic seasonal + noise; every 37th month is a sentinel gap.
        const idx = (year - 1990) * 12 + m;
        if (idx % 37 === 0) {
          raw[key] = -999;
          continue;
        }
        const phase = ((m - 1) / 12) * 2 * Math.PI;
        raw[key] = 20 + 0.04 * (year - 1990) + 6 * Math.sin(phase) + 0.4 * Math.sin(idx * 2.3);
      }
      raw[`${year}13`] = 21.5; // annual-mean row must be ignored
    }

    const parsed = parseNasaPowerMonthly(raw);
    assert.ok(parsed.stats.droppedSentinel > 0, 'expected sentinel gaps');
    const cleaned = cleanTimeSeries(parsed.points);
    assert.ok(cleaned.points.length > 300, `n=${cleaned.points.length}`);

    const summary = analyzeTimeSeries(cleaned.points, {
      resolution: 'monthly',
      deseasonalize: true,
      variableName: 'Air Temp',
      unit: '°C',
      regionName: 'Pipeline Region',
    });
    assert.ok(summary);
    assert.equal(summary.isSignificant, true);
    assert.equal(summary.verdictDirection, 'up');
    approx(summary.ols.slopePerYear, 0.04, 0.008, 'pipeline warming rate');
  });
});
