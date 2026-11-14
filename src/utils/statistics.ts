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
