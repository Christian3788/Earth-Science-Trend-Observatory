import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { EarthVariable } from '../data/earthCatalog';
import { formatPValue, type TrendAnalysisSummary } from '../utils/statistics';

interface StatisticalPanelProps {
  primarySummary: TrendAnalysisSummary;
  primaryLabel: string;
  primarySourceLabel: string;
  compareSummary?: TrendAnalysisSummary | null;
  compareLabel?: string;
  variable: EarthVariable;
  highlightMetric?: 'slope' | 'ttest' | 'mannkendall' | 'ci';
}

export const StatisticalPanel: React.FC<StatisticalPanelProps> = ({
  primarySummary,
  primaryLabel,
  primarySourceLabel,
  compareSummary,
  compareLabel,
  variable,
  highlightMetric,
}) => {
  const { ols, mannKendall } = primarySummary;

  const DirectionIcon =
    primarySummary.verdictDirection === 'up'
      ? TrendingUp
      : primarySummary.verdictDirection === 'down'
      ? TrendingDown
      : Minus;

  const verdictGlyph =
    primarySummary.verdictDirection === 'up'
      ? '▲'
      : primarySummary.verdictDirection === 'down'
      ? '▼'
      : '●';

  const verdictTone = !primarySummary.isSignificant
    ? 'text-slate-700 bg-slate-100 border-slate-200'
    : primarySummary.verdictDirection === 'up'
    ? 'text-blue-900 bg-blue-50/70 border-blue-200'
    : 'text-amber-900 bg-amber-50/70 border-amber-200';

  const sign = (n: number) => (n >= 0 ? '+' : '');

  return (
    <div className="space-y-4">
      {/* 4-Column Statistical KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div
          className={`bg-white border rounded-lg p-3.5 transition-colors ${
            highlightMetric === 'slope' ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-200'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500">Rate of Change (OLS)</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-mono font-semibold tabular-nums text-slate-900">
              {sign(ols.slopePerDecade)}
              {ols.slopePerDecade.toFixed(variable.decimals)}
            </span>
            <span className="text-[11px] font-mono text-slate-500">{variable.unit}/dec</span>
          </div>
          <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500">
            R² = {ols.rSquared.toFixed(3)} · {sign(ols.slopePerYear)}
            {ols.slopePerYear.toFixed(variable.decimals + 1)}/yr
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-slate-500">Total Period Change</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-mono font-semibold tabular-nums text-slate-900">
              {sign(ols.totalChange)}
              {ols.totalChange.toFixed(variable.decimals)}
            </span>
            <span className="text-[11px] font-mono text-slate-500">{variable.unit}</span>
          </div>
          <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500">
            Span: {ols.spanYears.toFixed(1)} years ({ols.n} pts)
          </div>
        </div>

        <div
          className={`bg-white border rounded-lg p-3.5 transition-colors ${
            highlightMetric === 'ttest' || highlightMetric === 'ci'
              ? 'border-blue-500 ring-1 ring-blue-500/30'
              : 'border-slate-200'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500">Student’s t-Test & 95% CI</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-mono font-semibold tabular-nums text-slate-900">
              p {ols.pValue < 0.0001 ? '< 0.0001' : `= ${formatPValue(ols.pValue)}`}
            </span>
            <span className="text-[11px] font-mono text-slate-500">t = {ols.tStatistic.toFixed(2)}</span>
          </div>
          <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500">
            95% CI [{ols.ci95LowerPerDecade.toFixed(2)}, {ols.ci95UpperPerDecade.toFixed(2)}]
          </div>
        </div>

        <div
          className={`bg-white border rounded-lg p-3.5 transition-colors ${
            highlightMetric === 'mannkendall' ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-200'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500">Mann-Kendall & Sen’s Slope</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-mono font-semibold tabular-nums text-slate-900">
              τ = {sign(mannKendall.tau)}
              {mannKendall.tau.toFixed(3)}
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              p {mannKendall.pValue < 0.0001 ? '< 0.0001' : `= ${formatPValue(mannKendall.pValue)}`}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500">
            Sen: {sign(mannKendall.sensSlopePerDecade)}
            {mannKendall.sensSlopePerDecade.toFixed(variable.decimals)} {variable.unit}/dec
          </div>
        </div>
      </div>

      {/* Scientific Significance Verdict */}
      <div className={`border rounded-lg p-4 ${verdictTone}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <DirectionIcon className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold">
                <span aria-hidden="true" className="mr-1.5">
                  {verdictGlyph}
                </span>
                {primarySummary.verdictTitle}
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">{primarySummary.scientificSummary}</p>
            </div>
          </div>
          <div className="text-right text-[11px] font-mono shrink-0">
            <div className="font-semibold">{primarySummary.confidenceLabel}</div>
            <div className="opacity-75 mt-0.5">{primarySourceLabel}</div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Summary when Region B is active */}
      {compareSummary && compareLabel && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-900 mb-3">
            Regional Divergence Comparison — Same Variable, Two Locations
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Region</th>
                  <th className="py-2 pr-4 font-medium">OLS Rate (/decade)</th>
                  <th className="py-2 pr-4 font-medium">Sen’s Slope (/decade)</th>
                  <th className="py-2 pr-4 font-medium">t-Test p-Value</th>
                  <th className="py-2 pr-4 font-medium">Mann-Kendall τ (p)</th>
                  <th className="py-2 font-medium">Verdict (α = 0.05)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                <tr>
                  <td className="py-2.5 pr-4 font-sans font-semibold text-blue-700">A · {primaryLabel}</td>
                  <td className="py-2.5 pr-4">
                    {sign(ols.slopePerDecade)}
                    {ols.slopePerDecade.toFixed(variable.decimals)} {variable.unit}
                  </td>
                  <td className="py-2.5 pr-4">
                    {sign(mannKendall.sensSlopePerDecade)}
                    {mannKendall.sensSlopePerDecade.toFixed(variable.decimals)}
                  </td>
                  <td className="py-2.5 pr-4">{formatPValue(ols.pValue)}</td>
                  <td className="py-2.5 pr-4">
                    {sign(mannKendall.tau)}
                    {mannKendall.tau.toFixed(3)} ({formatPValue(mannKendall.pValue)})
                  </td>
                  <td className="py-2.5 font-sans text-slate-800">
                    {primarySummary.isSignificant
                      ? primarySummary.verdictDirection === 'up'
                        ? '▲ Significant Rise'
                        : '▼ Significant Fall'
                      : '● Not Significant'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-sans font-semibold text-amber-700">B · {compareLabel}</td>
                  <td className="py-2.5 pr-4">
                    {sign(compareSummary.ols.slopePerDecade)}
                    {compareSummary.ols.slopePerDecade.toFixed(variable.decimals)} {variable.unit}
                  </td>
                  <td className="py-2.5 pr-4">
                    {sign(compareSummary.mannKendall.sensSlopePerDecade)}
                    {compareSummary.mannKendall.sensSlopePerDecade.toFixed(variable.decimals)}
                  </td>
                  <td className="py-2.5 pr-4">{formatPValue(compareSummary.ols.pValue)}</td>
                  <td className="py-2.5 pr-4">
                    {sign(compareSummary.mannKendall.tau)}
                    {compareSummary.mannKendall.tau.toFixed(3)} ({formatPValue(compareSummary.mannKendall.pValue)})
                  </td>
                  <td className="py-2.5 font-sans text-slate-800">
                    {compareSummary.isSignificant
                      ? compareSummary.verdictDirection === 'up'
                        ? '▲ Significant Rise'
                        : '▼ Significant Fall'
                      : '● Not Significant'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Variable Definition & Physical Interpretation Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h4 className="text-xs font-semibold text-slate-900">
            Variable Guide: {variable.name}
          </h4>
          <span className="text-xs text-slate-500">
            {variable.mission} · {variable.sphere} · Unit: {variable.unit}
          </span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">{variable.simpleDefinition}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="font-semibold text-slate-800">If trending upward (▲): </span>
            <span className="text-slate-600">{variable.risingMeans}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-800">If trending downward (▼): </span>
            <span className="text-slate-600">{variable.fallingMeans}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
