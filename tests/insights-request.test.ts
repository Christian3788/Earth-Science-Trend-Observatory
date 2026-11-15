// Tests for the summary -> POST /api/insights request mapper. Run with:
//   npm test -- tests/insights-request.test.ts
//   node --test tests/insights-request.test.ts
// (No test runner dependency: uses the Node built-in test module.)

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { TrendAnalysisSummary } from '../src/utils/statistics.ts';
import { buildInsightRequest, type InsightRequestContext } from '../src/insights/buildInsightRequest.ts';
import { validateInsightInput } from '../src/insights/trendInsights.ts';

function makeSummary(overrides = {}): TrendAnalysisSummary {
  return {
    ols: {
      n: 40,
      slopePerYear: 0.042,
      slopePerDecade: 0.42,
      intercept: -12.4,
      rSquared: 0.61,
      standardErrorSlope: 0.011,
      tStatistic: 3.1,
      df: 38,
      pValue: 0.003,
      ci95LowerPerYear: 0.018,
      ci95UpperPerYear: 0.066,
      ci95LowerPerDecade: 0.18,
      ci95UpperPerDecade: 0.66,
      totalChange: 1.68,
      spanYears: 40,
      meanValue: -12.4,
    },
    mannKendall: {
      n: 40,
      sStatistic: 410,
      varianceS: 17440,
      zScore: 3.1,
      tau: 0.52,
      pValue: 0.002,
      sensSlopePerYear: 0.04,
      sensSlopePerDecade: 0.4,
    },
    points: [],
    verdictTitle: 'Statistically Significant Increasing Trend',
    verdictDirection: 'up',
    isSignificant: true,
    confidenceLabel: 'High confidence',
    scientificSummary: 'In Arctic Alaska, 2-Meter Air Temperature shows a statistically significant rise.',
    ...overrides,
  };
}

const CONTEXT: InsightRequestContext = {
  variableId: 'T2M',
  variableName: '2-Meter Air Temperature',
  unit: 'C',
  regionName: 'Arctic Alaska (Utqiagvik)',
  startYear: 1985,
  endYear: 2024,
  deseasonalized: true,
  sourceType: 'nasa-power-live',
};

describe('buildInsightRequest', () => {
  test('maps a valid summary to the exact endpoint payload shape', () => {
    const req = buildInsightRequest(makeSummary(), CONTEXT);
    assert.ok(req);
    assert.equal(req.variableId, 'T2M');
    assert.equal(req.n, 40);
    assert.equal(req.ols.slopePerDecade, 0.42);
    assert.equal(req.ols.pValue, 0.003);
    assert.equal(req.mannKendall.tau, 0.52);
    assert.equal(req.sourceType, 'nasa-power-live');
  });

  test('mapped payload passes endpoint validation', () => {
    const req = buildInsightRequest(makeSummary(), CONTEXT);
    assert.ok(req);
    const validation = validateInsightInput(req);
    assert.equal(validation.ok, true);
  });

  test('returns null when fewer than 4 observations', () => {
    const summary = makeSummary();
    summary.ols.n = 3;
    assert.equal(buildInsightRequest(summary, CONTEXT), null);
  });

  test('returns null when endYear is not after startYear', () => {
    assert.equal(buildInsightRequest(makeSummary(), { ...CONTEXT, endYear: 1985 }), null);
  });

  test('returns null on non-finite statistics', () => {
    const summary = makeSummary();
    summary.ols.slopePerDecade = NaN;
    assert.equal(buildInsightRequest(summary, CONTEXT), null);
    const summary2 = makeSummary();
    summary2.mannKendall.tau = Infinity;
    assert.equal(buildInsightRequest(summary2, CONTEXT), null);
  });

  test('returns null on out-of-range p-value, R-squared, or tau', () => {
    const badP = makeSummary();
    badP.ols.pValue = 1.5;
    assert.equal(buildInsightRequest(badP, CONTEXT), null);
    const badR2 = makeSummary();
    badR2.ols.rSquared = -0.1;
    assert.equal(buildInsightRequest(badR2, CONTEXT), null);
    const badTau = makeSummary();
    badTau.mannKendall.tau = 2;
    assert.equal(buildInsightRequest(badTau, CONTEXT), null);
  });

  test('returns null on inverted confidence interval', () => {
    const summary = makeSummary();
    summary.ols.ci95LowerPerDecade = 0.66;
    summary.ols.ci95UpperPerDecade = 0.18;
    assert.equal(buildInsightRequest(summary, CONTEXT), null);
  });

  test('returns null on blank labels', () => {
    assert.equal(buildInsightRequest(makeSummary(), { ...CONTEXT, regionName: '   ' }), null);
  });
});
