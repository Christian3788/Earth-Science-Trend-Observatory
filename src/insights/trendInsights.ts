// Plain-language insight generator for TerraTrend Observatory trend results.
//
// Builder C (AI insights + API). Rule-based core: turns the OLS + Mann-Kendall
// statistics the app already computes into judge-friendly sentences.
// Optional LLM polish lives in geminiPolish.ts; the HTTP adapter lives in
// insightsRouter.ts. This file has zero runtime dependencies.

export type InsightSourceType = 'nasa-power-live' | 'mission-reference' | 'climatology-fallback';

export interface InsightOlsInput {
  slopePerYear: number;
  slopePerDecade: number;
  pValue: number;
  rSquared: number;
  ci95LowerPerDecade: number;
  ci95UpperPerDecade: number;
  totalChange: number;
  spanYears: number;
  meanValue: number;
}

export interface InsightMannKendallInput {
  pValue: number;
  sensSlopePerDecade: number;
  tau: number;
  zScore: number;
}

export interface InsightRequestInput {
  variableId: string;
  variableName: string;
  unit: string;
  regionName: string;
  startYear: number;
  endYear: number;
  n: number;
  deseasonalized: boolean;
  sourceType: InsightSourceType;
  ols: InsightOlsInput;
  mannKendall: InsightMannKendallInput;
}

export type InsightVerdict = 'strong-evidence' | 'suggestive' | 'no-evidence' | 'conflicting';

export interface TrendInsights {
  verdict: InsightVerdict;
  headline: string;
  bullets: string[];
  caveats: string[];
}

export type ValidationResult =
  | { ok: true; value: InsightRequestInput }
  | { ok: false; errors: string[] };

export const ALPHA = 0.05;
const MAX_LABEL_LEN = 200;
const MAX_ABS_SLOPE = 1e6;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function checkLabel(errors: string[], body: Record<string, unknown>, key: string): string | null {
  const v = body[key];
  if (typeof v !== 'string' || v.trim().length === 0) {
    errors.push(`"${key}" must be a non-empty string.`);
    return null;
  }
  if (v.length > MAX_LABEL_LEN) {
    errors.push(`"${key}" must be at most ${MAX_LABEL_LEN} characters.`);
    return null;
  }
  return v.trim();
}

function checkNumber(
  errors: string[],
  body: Record<string, unknown>,
  key: string,
  opts: { min?: number; max?: number; integer?: boolean } = {},
): number | null {
  const v = body[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    errors.push(`"${key}" must be a finite number.`);
    return null;
  }
  if (opts.integer && !Number.isInteger(v)) {
    errors.push(`"${key}" must be an integer.`);
    return null;
  }
  if (opts.min !== undefined && v < opts.min) {
    errors.push(`"${key}" must be >= ${opts.min}.`);
    return null;
  }
  if (opts.max !== undefined && v > opts.max) {
    errors.push(`"${key}" must be <= ${opts.max}.`);
    return null;
  }
  return v;
}

function checkP(errors: string[], body: Record<string, unknown>, key: string): number | null {
  return checkNumber(errors, body, key, { min: 0, max: 1 });
}

// Validates an untrusted POST body into a typed InsightRequestInput.
// Never throws: all problems are collected into `errors`.
export function validateInsightInput(body: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(body)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }

  const variableId = checkLabel(errors, body, 'variableId');
  const variableName = checkLabel(errors, body, 'variableName');
  const unit = checkLabel(errors, body, 'unit');
  const regionName = checkLabel(errors, body, 'regionName');
  const startYear = checkNumber(errors, body, 'startYear', { min: 1900, max: 2100, integer: true });
  const endYear = checkNumber(errors, body, 'endYear', { min: 1900, max: 2100, integer: true });
  const n = checkNumber(errors, body, 'n', { min: 4, integer: true });

  if (startYear !== null && endYear !== null && endYear <= startYear) {
    errors.push('"endYear" must be greater than "startYear".');
  }

  if (typeof body.deseasonalized !== 'boolean') {
    errors.push('"deseasonalized" must be a boolean.');
  }
  const sourceType = body.sourceType;
  if (sourceType !== 'nasa-power-live' && sourceType !== 'mission-reference' && sourceType !== 'climatology-fallback') {
    errors.push('"sourceType" must be one of: nasa-power-live, mission-reference, climatology-fallback.');
  }

  let ols: InsightOlsInput | null = null;
  if (!isRecord(body.ols)) {
    errors.push('"ols" must be an object with slope, p-value, R-squared, CI, and span fields.');
  } else {
    const o = body.ols;
    const slopePerYear = checkNumber(errors, o, 'slopePerYear', { min: -MAX_ABS_SLOPE, max: MAX_ABS_SLOPE });
    const slopePerDecade = checkNumber(errors, o, 'slopePerDecade', { min: -MAX_ABS_SLOPE, max: MAX_ABS_SLOPE });
    const pValue = checkP(errors, o, 'pValue');
    const rSquared = checkNumber(errors, o, 'rSquared', { min: 0, max: 1 });
    const ci95LowerPerDecade = checkNumber(errors, o, 'ci95LowerPerDecade', {
      min: -MAX_ABS_SLOPE,
      max: MAX_ABS_SLOPE,
    });
    const ci95UpperPerDecade = checkNumber(errors, o, 'ci95UpperPerDecade', {
      min: -MAX_ABS_SLOPE,
      max: MAX_ABS_SLOPE,
    });
    const totalChange = checkNumber(errors, o, 'totalChange', { min: -1e9, max: 1e9 });
    const spanYears = checkNumber(errors, o, 'spanYears', { min: 0.01, max: 500 });
    const meanValue = checkNumber(errors, o, 'meanValue', { min: -1e9, max: 1e9 });
    if (
      ci95LowerPerDecade !== null &&
      ci95UpperPerDecade !== null &&
      ci95UpperPerDecade < ci95LowerPerDecade
    ) {
      errors.push('"ols.ci95UpperPerDecade" must be >= "ols.ci95LowerPerDecade".');
    }
    if (
      slopePerYear !== null &&
      slopePerDecade !== null &&
      pValue !== null &&
      rSquared !== null &&
      ci95LowerPerDecade !== null &&
      ci95UpperPerDecade !== null &&
      totalChange !== null &&
      spanYears !== null &&
      meanValue !== null
    ) {
      ols = {
        slopePerYear,
        slopePerDecade,
        pValue,
        rSquared,
        ci95LowerPerDecade,
        ci95UpperPerDecade,
        totalChange,
        spanYears,
        meanValue,
      };
    }
  }

  let mannKendall: InsightMannKendallInput | null = null;
  if (!isRecord(body.mannKendall)) {
    errors.push('"mannKendall" must be an object with pValue, sensSlopePerDecade, tau, and zScore.');
  } else {
    const m = body.mannKendall;
    const pValue = checkP(errors, m, 'pValue');
    const sensSlopePerDecade = checkNumber(errors, m, 'sensSlopePerDecade', {
      min: -MAX_ABS_SLOPE,
      max: MAX_ABS_SLOPE,
    });
    const tau = checkNumber(errors, m, 'tau', { min: -1, max: 1 });
    const zScore = checkNumber(errors, m, 'zScore', { min: -1e6, max: 1e6 });
    if (pValue !== null && sensSlopePerDecade !== null && tau !== null && zScore !== null) {
      mannKendall = { pValue, sensSlopePerDecade, tau, zScore };
    }
  }

  if (
    errors.length > 0 ||
    variableId === null ||
    variableName === null ||
    unit === null ||
    regionName === null ||
    startYear === null ||
    endYear === null ||
    n === null ||
    typeof body.deseasonalized !== 'boolean' ||
    (sourceType !== 'nasa-power-live' &&
      sourceType !== 'mission-reference' &&
      sourceType !== 'climatology-fallback') ||
    ols === null ||
    mannKendall === null
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      variableId,
      variableName,
      unit,
      regionName,
      startYear,
      endYear,
      n,
      deseasonalized: body.deseasonalized,
      sourceType,
      ols,
      mannKendall,
    },
  };
}

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return 'n/a';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return n.toExponential(2);
  return n.toFixed(digits);
}

function fmtSigned(n: number, digits = 2): string {
  const s = fmt(Math.abs(n), digits);
  return n < 0 ? `\u2212${s}` : `+${s}`;
}

function fmtP(p: number): string {
  if (p < 0.001) return 'p < 0.001';
  return `p = ${p.toFixed(3)}`;
}

function signOf(v: number): 1 | -1 | 0 {
  if (Math.abs(v) < 1e-12) return 0;
  return v > 0 ? 1 : -1;
}

// Rule-based insight generator. Pure function: same input always yields the
// same output, so results are demo-safe with or without network access.
export function generateTrendInsights(input: InsightRequestInput): TrendInsights {
  const { ols, mannKendall } = input;
  const olsSig = ols.pValue < ALPHA;
  const mkSig = mannKendall.pValue < ALPHA;
  const olsSign = signOf(ols.slopePerDecade);
  const mkSign = signOf(mannKendall.sensSlopePerDecade);

  let verdict: InsightVerdict;
  if (olsSig && mkSig && olsSign !== 0 && olsSign === mkSign) {
    verdict = 'strong-evidence';
  } else if (olsSig && mkSig && olsSign !== mkSign) {
    verdict = 'conflicting';
  } else if (olsSig || mkSig) {
    verdict = 'suggestive';
  } else {
    verdict = 'no-evidence';
  }

  const spanLabel = `${input.startYear}\u2013${input.endYear}`;
  const rateLabel = `${fmtSigned(ols.slopePerDecade)} ${input.unit}/decade`;
  const rising = olsSign >= 0;
  const directionWord = olsSign === 0 ? 'no clear change in' : rising ? 'rise in' : 'fall in';

  let headline: string;
  switch (verdict) {
    case 'strong-evidence':
      headline =
        `Significant ${rising ? 'rise' : 'fall'} in ${input.variableName} over ${input.regionName}: ` +
        `${rateLabel} (${spanLabel}, ${fmtP(ols.pValue)}).`;
      break;
    case 'suggestive':
      headline =
        `Possible ${directionWord} ${input.variableName} over ${input.regionName} ` +
        `(${rateLabel}, ${spanLabel}) — one of two statistical tests finds it significant.`;
      break;
    case 'conflicting':
      headline =
        `Mixed signals for ${input.variableName} over ${input.regionName}: ` +
        `the two trend tests disagree on direction, so treat the ${rateLabel} estimate with caution.`;
      break;
    case 'no-evidence':
      headline =
        `No detectable trend in ${input.variableName} over ${input.regionName} ` +
        `(${spanLabel}): the data are consistent with natural variability.`;
      break;
  }

  const bullets: string[] = [];
  const totalWord = ols.totalChange >= 0 ? 'rose' : 'fell';
  bullets.push(
    olsSign === 0 && verdict === 'no-evidence'
      ? `${input.variableName} in ${input.regionName} ended ${spanLabel} almost exactly where it started ` +
        `(${rateLabel}; total change ${fmt(ols.totalChange)} ${input.unit} over ${fmt(ols.spanYears, 1)} years).`
      : `${input.variableName} in ${input.regionName} ${totalWord} by about ${fmt(Math.abs(ols.totalChange))} ${input.unit} ` +
        `over ${fmt(ols.spanYears, 1)} years — a rate of ${rateLabel}.`,
  );

  if (olsSig) {
    bullets.push(
      `This trend is statistically significant (${fmtP(ols.pValue)}): ` +
        `a change this large would occur by chance less than 5% of the time. ` +
        `We are 95% confident the true rate lies between ${fmt(ols.ci95LowerPerDecade)} and ` +
        `${fmt(ols.ci95UpperPerDecade)} ${input.unit}/decade.`,
    );
  } else {
    bullets.push(
      `This trend is not statistically significant (${fmtP(ols.pValue)}): ` +
        `wobbles this large happen often by chance, so the data do not rule out "no real change".`,
    );
  }

  if (verdict === 'strong-evidence') {
    bullets.push(
      `Two independent methods agree: ordinary least-squares regression (${fmtP(ols.pValue)}) and the ` +
        `Mann-Kendall rank test (${fmtP(mannKendall.pValue)}, Sen's slope ` +
        `${fmtSigned(mannKendall.sensSlopePerDecade)} ${input.unit}/decade). Agreement makes the finding much harder to dismiss.`,
    );
  } else if (verdict === 'conflicting') {
    bullets.push(
      `The two methods disagree: regression says ${fmtSigned(ols.slopePerDecade)} ${input.unit}/decade ` +
        `(${fmtP(ols.pValue)}) while Mann-Kendall says ${fmtSigned(mannKendall.sensSlopePerDecade)} ` +
        `${input.unit}/decade (${fmtP(mannKendall.pValue)}). Outliers or a sharp step-change mid-record can cause this — ` +
        `inspect the chart before quoting a number.`,
    );
  } else {
    const which = olsSig ? 'regression' : mkSig ? 'Mann-Kendall' : null;
    bullets.push(
      which === null
        ? `Neither method finds a real trend (regression ${fmtP(ols.pValue)}; Mann-Kendall ${fmtP(mannKendall.pValue)}). ` +
          `That is itself a result: the record shows stability, not drift.`
        : `Only the ${which} test clears the significance bar (regression ${fmtP(ols.pValue)}; ` +
          `Mann-Kendall ${fmtP(mannKendall.pValue)}). Treat this as a lead worth watching, not a settled finding.`,
    );
  }

  if (ols.rSquared >= 0.5) {
    bullets.push(
      `The straight-line trend explains most of the ups and downs (R² = ${fmt(ols.rSquared)}), ` +
        `so the drift dominates over year-to-year noise.`,
    );
  } else if (ols.rSquared >= 0.2) {
    bullets.push(
      `The trend line captures a moderate share of the variation (R² = ${fmt(ols.rSquared)}): ` +
        `the drift is real but individual years still bounce around it.`,
    );
  } else {
    bullets.push(
      `Year-to-year noise dominates the record (R² = ${fmt(ols.rSquared)}), which is normal for ` +
        `climate data — a trend can still be significant when enough years point the same way.`,
    );
  }

  // Percent-of-mean only makes sense on a ratio scale with a positive mean
  // (for °C-style interval data with a negative mean it reads as nonsense).
  if (ols.meanValue > 0) {
    const pct = (ols.totalChange / ols.meanValue) * 100;
    if (Number.isFinite(pct) && Math.abs(pct) < 1e4) {
      bullets.push(
        `In practical terms, that total shift is about ${fmtSigned(pct, 1)}% relative to the period average ` +
          `(${fmt(ols.meanValue)} ${input.unit}).`,
      );
    }
  }

  const caveats: string[] = [];
  if (input.sourceType !== 'nasa-power-live') {
    caveats.push(
      input.sourceType === 'mission-reference'
        ? 'These numbers come from a calibrated mission-reference series rather than a live satellite retrieval, ' +
          'so treat the exact magnitudes as approximate.'
        : 'These numbers come from a climatology fallback (the live feed was unavailable), ' +
          'so they describe typical conditions, not a measured trend. Re-run against live data before presenting.',
    );
  }
  if (ols.spanYears < 10) {
    caveats.push(
      `The record spans only ${fmt(ols.spanYears, 1)} years — short records can mistake a natural cycle phase for a trend.`,
    );
  }
  caveats.push(
    input.deseasonalized
      ? 'The seasonal cycle was removed before analysis, so this is the long-term drift — not summer-versus-winter swings.'
      : 'Monthly data still contain the seasonal cycle; the trend describes the drift underneath those regular seasonal swings.',
  );
  caveats.push('A statistical trend flags a persistent change over time, not its physical cause.');

  return { verdict, headline, bullets, caveats };
}

// Minimal valid payload shape, returned inside 400 responses so API consumers
// (and judges with curl) can self-correct without reading source.
export const INSIGHT_EXAMPLE_PAYLOAD: InsightRequestInput = {
  variableId: 'T2M',
  variableName: '2-Meter Air Temperature',
  unit: '°C',
  regionName: 'Arctic Alaska',
  startYear: 1985,
  endYear: 2024,
  n: 468,
  deseasonalized: true,
  sourceType: 'nasa-power-live',
  ols: {
    slopePerYear: 0.042,
    slopePerDecade: 0.42,
    pValue: 0.003,
    rSquared: 0.31,
    ci95LowerPerDecade: 0.15,
    ci95UpperPerDecade: 0.69,
    totalChange: 1.64,
    spanYears: 39,
    meanValue: -8.4,
  },
  mannKendall: {
    pValue: 0.001,
    sensSlopePerDecade: 0.39,
    tau: 0.42,
    zScore: 3.3,
  },
};
