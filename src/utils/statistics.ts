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
