export interface TimeSeriesPoint {
  date: string;
  year: number;
  month: number;
  day?: number;
  decimalYear: number;
  value: number;
}

export interface ProcessedPoint extends TimeSeriesPoint {
  plotValue: number;
  trendValue: number;
  ciLower: number;
  ciUpper: number;
}

export interface OLSResult {
  n: number;
  slopePerYear: number;
  slopePerDecade: number;
  intercept: number;
  rSquared: number;
  standardErrorSlope: number;
  tStatistic: number;
  df: number;
  pValue: number;
  ci95LowerPerYear: number;
  ci95UpperPerYear: number;
  ci95LowerPerDecade: number;
  ci95UpperPerDecade: number;
  totalChange: number;
  spanYears: number;
  meanValue: number;
}

export interface MannKendallResult {
  n: number;
  sStatistic: number;
  varianceS: number;
  zScore: number;
  tau: number;
  pValue: number;
  sensSlopePerYear: number;
  sensSlopePerDecade: number;
}

export interface TrendAnalysisSummary {
  ols: OLSResult;
  mannKendall: MannKendallResult;
  points: ProcessedPoint[];
  verdictTitle: string;
  verdictDirection: 'up' | 'down' | 'neutral';
  isSignificant: boolean;
  confidenceLabel: string;
  scientificSummary: string;
}

// Lanczos approximation for ln(Gamma(z))
function logGamma(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const z1 = z - 1;
  let x = p[0];
  for (let i = 1; i < g + 2; i++) {
    x += p[i] / (z1 + i);
  }
  const t = z1 + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z1 + 0.5) * Math.log(t) - t + Math.log(x);
}

// Continued fraction for regularized incomplete beta I_x(a, b)
function betacf(a: number, b: number, x: number): number {
  const maxIter = 200;
  const eps = 3e-14;
  const fpmin = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

export function studentTTwoTailedPValue(tStat: number, df: number): number {
  if (df <= 0 || !Number.isFinite(tStat)) return 1;
  const x = df / (df + tStat * tStat);
  return Math.min(1, Math.max(0, regularizedIncompleteBeta(x, df / 2, 0.5)));
}

// Critical t-value for two-tailed alpha = 0.05 (p = 0.05) via bisection
function criticalT025(df: number): number {
  if (df <= 0) return 1.96;
  let lo = 1.9;
  let hi = 13.0;
  for (let i = 0; i < 45; i++) {
    const mid = 0.5 * (lo + hi);
    const p = studentTTwoTailedPValue(mid, df);
    if (p > 0.05) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return 0.5 * (lo + hi);
}

// Standard normal two-tailed p-value via Abramowitz & Stegun erfc approximation
function normalTwoTailedPValue(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erfcApprox = poly * Math.exp(-x * x);
  return Math.min(1, Math.max(0, erfcApprox));
}

export function aggregateAnnual(points: TimeSeriesPoint[]): TimeSeriesPoint[] {
  const byYear = new Map<number, number[]>();
  for (const pt of points) {
    const arr = byYear.get(pt.year);
    if (arr) arr.push(pt.value);
    else byYear.set(pt.year, [pt.value]);
  }
  const annual: TimeSeriesPoint[] = [];
  for (const [year, vals] of Array.from(byYear.entries()).sort((a, b) => a[0] - b[0])) {
    if (vals.length < 6) continue;
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    annual.push({
      date: `${year}`,
      year,
      month: 6,
      decimalYear: year + 0.5,
      value: Number(mean.toFixed(4)),
    });
  }
  return annual;
}

export function deseasonalizeMonthly(points: TimeSeriesPoint[]): TimeSeriesPoint[] {
  const monthSums = new Array<number>(13).fill(0);
  const monthCounts = new Array<number>(13).fill(0);

  for (const pt of points) {
    monthSums[pt.month] += pt.value;
    monthCounts[pt.month] += 1;
  }

  const monthMeans = monthSums.map((sum, m) => (monthCounts[m] > 0 ? sum / monthCounts[m] : 0));

  return points.map((pt) => ({
    ...pt,
    value: Number((pt.value - monthMeans[pt.month]).toFixed(4)),
  }));
}

export function analyzeTimeSeries(
  rawPoints: TimeSeriesPoint[],
  options: {
    resolution: 'monthly' | 'annual' | 'daily';
    deseasonalize: boolean;
    variableName: string;
    unit: string;
    regionName: string;
    alpha?: number;
  },
): TrendAnalysisSummary | null {
  const alpha = options.alpha ?? 0.05;
  if (rawPoints.length < 4) return null;

  let working = rawPoints;
  if (options.resolution === 'annual') {
    working = aggregateAnnual(rawPoints);
  } else if (options.deseasonalize) {
    working = deseasonalizeMonthly(rawPoints);
  }

  const n = working.length;
  if (n < 4) return null;

  const xs = working.map((p) => p.decimalYear);
  const ys = working.map((p) => p.value);

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = meanY - slope * meanX;

  let sse = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * xs[i];
    const err = ys[i] - pred;
    sse += err * err;
  }

  const df = n - 2;
  const mse = df > 0 ? sse / df : 0;
  const sErr = Math.sqrt(mse);
  const seSlope = sxx > 0 ? sErr / Math.sqrt(sxx) : 0;
  const tStat = seSlope > 0 ? slope / seSlope : 0;
  const pValOLS = studentTTwoTailedPValue(tStat, df);
  const tCrit = criticalT025(df);

  const ciLowerSlope = slope - tCrit * seSlope;
  const ciUpperSlope = slope + tCrit * seSlope;
  const rSquared = syy > 0 ? Math.max(0, Math.min(1, 1 - sse / syy)) : 0;

  const spanYears = Math.max(0.01, xs[n - 1] - xs[0]);
  const totalChange = slope * spanYears;

  const ols: OLSResult = {
    n,
    slopePerYear: slope,
    slopePerDecade: slope * 10,
    intercept,
    rSquared,
    standardErrorSlope: seSlope,
    tStatistic: tStat,
    df,
    pValue: pValOLS,
    ci95LowerPerYear: ciLowerSlope,
    ci95UpperPerYear: ciUpperSlope,
    ci95LowerPerDecade: ciLowerSlope * 10,
    ci95UpperPerDecade: ciUpperSlope * 10,
    totalChange,
    spanYears,
    meanValue: meanY,
  };

  // Mann-Kendall Test + Sen's Slope
  // For daily series > 600 points, downsample evenly to max 450 points for O(n^2) responsiveness
  const mkIndices: number[] = [];
  if (n > 500) {
    const step = n / 450;
    for (let k = 0; k < 450; k++) {
      mkIndices.push(Math.min(n - 1, Math.floor(k * step)));
    }
  } else {
    for (let i = 0; i < n; i++) mkIndices.push(i);
  }

  const m = mkIndices.length;
  let S = 0;
  const pairSlopes: number[] = [];

  for (let i = 0; i < m - 1; i++) {
    const xi = xs[mkIndices[i]];
    const yi = ys[mkIndices[i]];
    for (let j = i + 1; j < m; j++) {
      const xj = xs[mkIndices[j]];
      const yj = ys[mkIndices[j]];
      const diff = yj - yi;
      if (diff > 0) S += 1;
      else if (diff < 0) S -= 1;
      const dt = xj - xi;
      if (dt > 0) pairSlopes.push(diff / dt);
    }
  }

  // Tie correction for Mann-Kendall variance
  const counts = new Map<number, number>();
  for (const idx of mkIndices) {
    const v = ys[idx];
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let tieTerm = 0;
  for (const t of counts.values()) {
    if (t > 1) {
      tieTerm += t * (t - 1) * (2 * t + 5);
    }
  }

  const varS = Math.max(1e-9, (m * (m - 1) * (2 * m + 5) - tieTerm) / 18);
  const zMK = S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0;
  const pValMK = normalTwoTailedPValue(zMK);
  const tau = S / (0.5 * m * (m - 1));

  pairSlopes.sort((a, b) => a - b);
  const mid = Math.floor(pairSlopes.length / 2);
  const sensSlope =
    pairSlopes.length === 0
      ? 0
      : pairSlopes.length % 2 === 1
      ? pairSlopes[mid]
      : 0.5 * (pairSlopes[mid - 1] + pairSlopes[mid]);

  const mannKendall: MannKendallResult = {
    n: m,
    sStatistic: S,
    varianceS: varS,
    zScore: zMK,
    tau,
    pValue: pValMK,
    sensSlopePerYear: sensSlope,
    sensSlopePerDecade: sensSlope * 10,
  };

  // Build chart points with 95% confidence band around the linear regression line
  const processedPoints: ProcessedPoint[] = working.map((pt) => {
    const trendVal = intercept + slope * pt.decimalYear;
    const dx = pt.decimalYear - meanX;
    const seLine = sErr * Math.sqrt(1 / n + (sxx > 0 ? (dx * dx) / sxx : 0));
    const margin = tCrit * seLine;
    return {
      ...pt,
      plotValue: pt.value,
      trendValue: trendVal,
      ciLower: trendVal - margin,
      ciUpper: trendVal + margin,
    };
  });

  const olsSig = pValOLS < alpha;
  const mkSig = pValMK < alpha;
  const isSignificant = olsSig || mkSig;
  const bothSig = olsSig && mkSig;

  const direction: 'up' | 'down' | 'neutral' =
    Math.abs(slope) < 1e-6 && Math.abs(sensSlope) < 1e-6
      ? 'neutral'
      : slope > 0
      ? 'up'
      : 'down';

  let verdictTitle = 'No Statistically Significant Trend';
  if (bothSig && direction === 'up') {
    verdictTitle = 'Statistically Significant Increasing Trend';
  } else if (bothSig && direction === 'down') {
    verdictTitle = 'Statistically Significant Decreasing Trend';
  } else if (isSignificant && direction === 'up') {
    verdictTitle = 'Statistically Significant Increase (Single Test)';
  } else if (isSignificant && direction === 'down') {
    verdictTitle = 'Statistically Significant Decrease (Single Test)';
  } else if (pValOLS < 0.15 || pValMK < 0.15) {
    verdictTitle =
      direction === 'up'
        ? 'Emerging Upward Drift (Not Yet Significant at α = 0.05)'
        : 'Emerging Downward Drift (Not Yet Significant at α = 0.05)';
  }

  const confidenceLabel =
    Math.min(pValOLS, pValMK) < 0.001
      ? '>99.9% Confidence (p < 0.001)'
      : Math.min(pValOLS, pValMK) < 0.01
      ? '>99% Confidence (p < 0.01)'
      : isSignificant
      ? '>95% Confidence (p < 0.05)'
      : 'Below 95% Significance Threshold';

  const rateStr = `${slope >= 0 ? '+' : ''}${(slope * 10).toFixed(3)} ${options.unit}/decade`;
  const totalStr = `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)} ${options.unit}`;

  let scientificSummary = '';
  if (isSignificant) {
    scientificSummary = `In ${options.regionName}, ${options.variableName} shows a statistically significant ${
      direction === 'up' ? 'upward' : 'downward'
    } trend of ${rateStr} (${totalStr} total over ${spanYears.toFixed(1)} years).`;
  } else if (pValOLS < 0.2 && !options.deseasonalize && options.resolution === 'monthly') {
    scientificSummary = `A drift of ${rateStr} is visible in ${options.regionName}, but seasonal swings mask statistical certainty. Try enabling "Remove Seasonal Cycle" or extending the year range.`;
  } else {
    scientificSummary = `Over ${spanYears.toFixed(1)} years in ${options.regionName}, ${options.variableName} changes at ${rateStr}, which cannot yet be distinguished from natural variability at p < 0.05.`;
  }

  return {
    ols,
    mannKendall,
    points: processedPoints,
    verdictTitle,
    verdictDirection: isSignificant ? direction : Math.abs(slope) > 0 ? direction : 'neutral',
    isSignificant,
    confidenceLabel,
    scientificSummary,
  };
}

export function formatPValue(p: number): string {
  if (p < 0.0001) return '< 0.0001';
  if (p < 0.001) return p.toFixed(4);
  return p.toFixed(3);
}

export function buildCSVExport(
  variableName: string,
  unit: string,
  regionName: string,
  lat: number,
  lon: number,
  summary: TrendAnalysisSummary,
): string {
  const header = [
    `# TerraTrend Observatory Export`,
    `# Variable: ${variableName} (${unit})`,
    `# Region: ${regionName} (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
    `# OLS Slope: ${(summary.ols.slopePerDecade).toFixed(4)} ${unit}/decade (p = ${formatPValue(summary.ols.pValue)})`,
    `# Mann-Kendall tau: ${summary.mannKendall.tau.toFixed(4)} (p = ${formatPValue(summary.mannKendall.pValue)})`,
    `# Sen's Slope: ${summary.mannKendall.sensSlopePerDecade.toFixed(4)} ${unit}/decade`,
    `date,decimal_year,value_${unit.replace(/[^a-zA-Z0-9]/g, '_')},linear_trend,ci95_lower,ci95_upper`,
  ];

  const rows = summary.points.map(
    (pt) =>
      `${pt.date},${pt.decimalYear.toFixed(4)},${pt.plotValue.toFixed(4)},${pt.trendValue.toFixed(4)},${pt.ciLower.toFixed(4)},${pt.ciUpper.toFixed(4)}`,
  );

  return [...header, ...rows].join('\n');
}
