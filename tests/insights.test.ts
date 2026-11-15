// Tests for Builder C AI-insights module. Run with:
//   npm test -- tests/insights.test.ts
//   node --test tests/insights.test.ts
// (No test runner dependency: uses the Node built-in test module.)

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { handleInsightsRequest } from '../src/insights/insightsRouter.ts';
import { polishInsightsWithGemini } from '../src/insights/geminiPolish.ts';
import type { InsightRequestInput } from '../src/insights/trendInsights.ts';
import { generateTrendInsights, INSIGHT_EXAMPLE_PAYLOAD, validateInsightInput } from '../src/insights/trendInsights.ts';

function warmingPayload(): InsightRequestInput {
  return JSON.parse(JSON.stringify(INSIGHT_EXAMPLE_PAYLOAD)) as InsightRequestInput;
}

describe('validateInsightInput', () => {
  test('accepts the documented example payload', () => {
    const result = validateInsightInput(warmingPayload());
    assert.equal(result.ok, true);
  });

  test('rejects non-objects, bad enums, and out-of-range stats with field errors', () => {
    assert.equal(validateInsightInput(null).ok, false);
    assert.equal(validateInsightInput([]).ok, false);

    const missing = warmingPayload() as unknown as Record<string, unknown>;
    delete missing.ols;
    const r1 = validateInsightInput(missing);
    assert.equal(r1.ok, false);
    assert.ok(r1.ok === false && r1.errors.some((e) => e.includes('"ols"')));

    const badP = warmingPayload();
    badP.ols.pValue = 1.5;
    badP.mannKendall.tau = -2;
    const r2 = validateInsightInput(badP);
    assert.equal(r2.ok, false);
    assert.ok(r2.ok === false && r2.errors.some((e) => e.includes('pValue')));
    assert.ok(r2.ok === false && r2.errors.some((e) => e.includes('tau')));

    const badYears = warmingPayload();
    badYears.n = 3;
    badYears.endYear = badYears.startYear;
    const r3 = validateInsightInput(badYears);
    assert.equal(r3.ok, false);

    const badSource = warmingPayload() as unknown as Record<string, unknown>;
    badSource.sourceType = 'satellite-live';
    const r4 = validateInsightInput(badSource);
    assert.equal(r4.ok, false);
    assert.ok(r4.ok === false && r4.errors.some((e) => e.includes('sourceType')));

    const badCi = warmingPayload();
    badCi.ols.ci95LowerPerDecade = 1;
    badCi.ols.ci95UpperPerDecade = -1;
    assert.equal(validateInsightInput(badCi).ok, false);
  });
});

describe('generateTrendInsights', () => {
  test('warming payload yields strong-evidence headline with numbers', () => {
    const insights = generateTrendInsights(warmingPayload());
    assert.equal(insights.verdict, 'strong-evidence');
    assert.ok(insights.headline.includes('2-Meter Air Temperature'));
    assert.ok(insights.headline.includes('Arctic Alaska'));
    assert.ok(insights.headline.includes('0.42'));
    assert.ok(insights.bullets.length >= 4);
    assert.ok(insights.bullets.some((b) => b.includes('Mann-Kendall')));
    assert.ok(insights.caveats.length >= 1);
  });

  test('non-significant input yields no-evidence and names variability', () => {
    const p = warmingPayload();
    p.ols.pValue = 0.42;
    p.ols.slopePerDecade = 0.03;
    p.ols.totalChange = 0.1;
    p.mannKendall.pValue = 0.51;
    p.mannKendall.sensSlopePerDecade = 0.02;
    const insights = generateTrendInsights(p);
    assert.equal(insights.verdict, 'no-evidence');
    assert.ok(insights.headline.includes('No detectable trend'));
    assert.ok(insights.bullets.some((b) => b.includes('not statistically significant')));
  });

  test('one significant test yields suggestive verdict', () => {
    const p = warmingPayload();
    p.mannKendall.pValue = 0.3;
    const insights = generateTrendInsights(p);
    assert.equal(insights.verdict, 'suggestive');
    assert.ok(insights.headline.includes('Possible'));
  });

  test('opposite-sign significant tests yield conflicting verdict', () => {
    const p = warmingPayload();
    p.mannKendall.sensSlopePerDecade = -0.35;
    const insights = generateTrendInsights(p);
    assert.equal(insights.verdict, 'conflicting');
    assert.ok(insights.headline.includes('Mixed signals'));
  });

  test('modeled sources add honesty caveats', () => {
    const ref = warmingPayload();
    ref.sourceType = 'mission-reference';
    assert.ok(generateTrendInsights(ref).caveats.some((c) => c.includes('mission-reference')));

    const clim = warmingPayload();
    clim.sourceType = 'climatology-fallback';
    assert.ok(generateTrendInsights(clim).caveats.some((c) => c.includes('climatology fallback')));
  });
});

describe('handleInsightsRequest (Express handler, mocked req/res)', () => {
  function mockRes() {
    return {
      statusCode: 200,
      payload: null as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(obj: unknown) {
        this.payload = obj;
        return this;
      },
    };
  }

  test('returns 400 with details + example for invalid bodies', async () => {
    const req = { body: { variableId: 'T2M' }, query: {} };
    const res = mockRes();
    await handleInsightsRequest(req as never, res as never);
    assert.equal(res.statusCode, 400);
    const payload = res.payload as { error: string; details: string[]; example: object };
    assert.ok(payload.error.includes('Invalid trend payload'));
    assert.ok(payload.details.length > 0);
    assert.ok(payload.example && typeof payload.example === 'object');
  });

  test('returns 200 with insights + meta for valid bodies', async () => {
    const req = { body: warmingPayload(), query: {} };
    const res = mockRes();
    await handleInsightsRequest(req as never, res as never);
    assert.equal(res.statusCode, 200);
    const payload = res.payload as {
      insights: { verdict: string; headline: string; bullets: string[]; caveats: string[] };
      meta: { verdict: string; generatedBy: string; polishedBy: null };
    };
    assert.equal(payload.meta.verdict, 'strong-evidence');
    assert.equal(payload.meta.generatedBy, 'rule-based-v1');
    assert.ok(payload.insights.headline.length > 0);
    assert.ok(payload.insights.bullets.length >= 4);
  });
});

describe('polishInsightsWithGemini', () => {
  test('falls back to null without an API key (never throws)', async () => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const insights = generateTrendInsights(warmingPayload());
      const polished = await polishInsightsWithGemini(insights, {
        variableName: '2-Meter Air Temperature',
        regionName: 'Arctic Alaska',
        unit: '°C',
      });
      assert.equal(polished, null);
    } finally {
      if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
    }
  });
});
