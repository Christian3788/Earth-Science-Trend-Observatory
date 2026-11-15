// Maps a client-side trend summary to a POST /api/insights request body.
//
// Pure and dependency-free apart from shared types, so both the React card and
// the node:test suite can use it. Returns null when the summary cannot produce
// a payload the endpoint would accept (too few points, bad years, non-finite
// numbers) — callers fall back to the local scientific summary instead.

import type { TrendAnalysisSummary } from '../utils/statistics.ts';
import type { InsightRequestInput, InsightSourceType } from './trendInsights.ts';

export interface InsightRequestContext {
  variableId: string;
  variableName: string;
  unit: string;
  regionName: string;
  startYear: number;
  endYear: number;
  deseasonalized: boolean;
  sourceType: InsightSourceType;
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

export function buildInsightRequest(
  summary: TrendAnalysisSummary,
  ctx: InsightRequestContext,
): InsightRequestInput | null {
  if (
    ctx.variableId.trim() === '' ||
    ctx.variableName.trim() === '' ||
    ctx.unit.trim() === '' ||
    ctx.regionName.trim() === '' ||
    !Number.isInteger(ctx.startYear) ||
    !Number.isInteger(ctx.endYear) ||
    ctx.endYear <= ctx.startYear
  ) {
    return null;
  }

  const { ols, mannKendall } = summary;
  const numbers: unknown[] = [
    ols.n,
    ols.slopePerYear,
    ols.slopePerDecade,
    ols.pValue,
    ols.rSquared,
    ols.ci95LowerPerDecade,
    ols.ci95UpperPerDecade,
    ols.totalChange,
    ols.spanYears,
    ols.meanValue,
    mannKendall.pValue,
    mannKendall.sensSlopePerDecade,
    mannKendall.tau,
    mannKendall.zScore,
  ];
  if (!numbers.every(isFiniteNumber)) return null;
  if (!Number.isInteger(ols.n) || ols.n < 4) return null;
  if (ols.ci95UpperPerDecade < ols.ci95LowerPerDecade) return null;
  if (ols.pValue < 0 || ols.pValue > 1) return null;
  if (mannKendall.pValue < 0 || mannKendall.pValue > 1) return null;
  if (ols.rSquared < 0 || ols.rSquared > 1) return null;
  if (mannKendall.tau < -1 || mannKendall.tau > 1) return null;

  return {
    variableId: ctx.variableId,
    variableName: ctx.variableName,
    unit: ctx.unit,
    regionName: ctx.regionName,
    startYear: ctx.startYear,
    endYear: ctx.endYear,
    n: ols.n,
    deseasonalized: ctx.deseasonalized,
    sourceType: ctx.sourceType,
    ols: {
      slopePerYear: ols.slopePerYear,
      slopePerDecade: ols.slopePerDecade,
      pValue: ols.pValue,
      rSquared: ols.rSquared,
      ci95LowerPerDecade: ols.ci95LowerPerDecade,
      ci95UpperPerDecade: ols.ci95UpperPerDecade,
      totalChange: ols.totalChange,
      spanYears: ols.spanYears,
      meanValue: ols.meanValue,
    },
    mannKendall: {
      pValue: mannKendall.pValue,
      sensSlopePerDecade: mannKendall.sensSlopePerDecade,
      tau: mannKendall.tau,
      zScore: mannKendall.zScore,
    },
  };
}
