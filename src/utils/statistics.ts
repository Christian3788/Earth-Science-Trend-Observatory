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
