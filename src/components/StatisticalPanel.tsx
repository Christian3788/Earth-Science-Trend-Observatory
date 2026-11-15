import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'motion/react';
import type { EarthVariable } from '../data/earthCatalog';
import { formatPValue, type TrendAnalysisSummary } from '../utils/statistics';

function useAnimatedNumber(target: number, durationMs = 340): number {
  const [display, setDisplay] = useState<number>(target);
  const currentRef = useRef<number>(target);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !Number.isFinite(target)) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }

    const from = Number.isFinite(currentRef.current) ? currentRef.current : target;
    if (Math.abs(target - from) < 1e-6) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }

    const startTime = performance.now();
    let frameId = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = from + (target - from) * eased;
      currentRef.current = val;
      setDisplay(val);
      if (t < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        currentRef.current = target;
        setDisplay(target);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, durationMs]);

  return display;
}

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

  const animSlopeDecade = useAnimatedNumber(ols.slopePerDecade);
  const animTotalChange = useAnimatedNumber(ols.totalChange);
  const animPValue = useAnimatedNumber(ols.pValue);
  const animTau = useAnimatedNumber(mannKendall.tau);
  const animSensSlope = useAnimatedNumber(mannKendall.sensSlopePerDecade);

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
          className={`bg-white border rounded-lg p-4 transition-colors ${
            highlightMetric === 'slope'
              ? 'border-blue-600 ring-1 ring-blue-500/40 animate-spotlight-card'
              : 'border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-slate-700">Rate of Change (OLS)</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold tabular-nums text-slate-950">
              {sign(animSlopeDecade)}
              {animSlopeDecade.toFixed(variable.decimals)}
            </span>
            <span className="text-xs font-mono font-semibold text-slate-700">{variable.unit}/dec</span>
          </div>
          <div className="mt-1.5 text-xs font-mono font-medium tabular-nums text-slate-700">
            R² = {ols.rSquared.toFixed(3)} · {sign(ols.slopePerYear)}
            {ols.slopePerYear.toFixed(variable.decimals + 1)}/yr
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-700">Total Period Change</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold tabular-nums text-slate-950">
              {sign(animTotalChange)}
              {animTotalChange.toFixed(variable.decimals)}
            </span>
            <span className="text-xs font-mono font-semibold text-slate-700">{variable.unit}</span>
          </div>
          <div className="mt-1.5 text-xs font-mono font-medium tabular-nums text-slate-700">
            Span: {ols.spanYears.toFixed(1)} years ({ols.n} pts)
          </div>
        </div>

        <div
          className={`bg-white border rounded-lg p-4 transition-colors ${
            highlightMetric === 'ttest' || highlightMetric === 'ci'
              ? 'border-blue-600 ring-1 ring-blue-500/40 animate-spotlight-card'
              : 'border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-slate-700">Student’s t-Test & 95% CI</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold tabular-nums text-slate-950">
              p {animPValue < 0.0001 ? '< 0.0001' : `= ${formatPValue(animPValue)}`}
            </span>
            <span className="text-xs font-mono font-semibold text-slate-700">t = {ols.tStatistic.toFixed(2)}</span>
          </div>
          <div className="mt-1.5 text-xs font-mono font-medium tabular-nums text-slate-700">
            95% CI [{ols.ci95LowerPerDecade.toFixed(2)}, {ols.ci95UpperPerDecade.toFixed(2)}]
          </div>
        </div>

        <div
          className={`bg-white border rounded-lg p-4 transition-colors ${
            highlightMetric === 'mannkendall'
              ? 'border-blue-600 ring-1 ring-blue-500/40 animate-spotlight-card'
              : 'border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-slate-700">Mann-Kendall & Sen’s Slope</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold tabular-nums text-slate-950">
              τ = {sign(animTau)}
              {animTau.toFixed(3)}
            </span>
            <span className="text-xs font-mono font-semibold text-slate-700">
              p {mannKendall.pValue < 0.0001 ? '< 0.0001' : `= ${formatPValue(mannKendall.pValue)}`}
            </span>
          </div>
          <div className="mt-1.5 text-xs font-mono font-medium tabular-nums text-slate-700">
            Sen: {sign(animSensSlope)}
            {animSensSlope.toFixed(variable.decimals)} {variable.unit}/dec
          </div>
        </div>
      </div>

      {/* Scientific Significance Verdict */}
      <motion.div
        key={`${primarySummary.verdictTitle}-${primaryLabel}`}
        initial={{ opacity: 0.7, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className={`border rounded-lg p-4 ${verdictTone}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <DirectionIcon className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <div className="text-base font-bold">
                <span aria-hidden="true" className="mr-1.5">
                  {verdictGlyph}
                </span>
                {primarySummary.verdictTitle}
              </div>
              <p className="text-sm mt-1 leading-relaxed">{primarySummary.scientificSummary}</p>
            </div>
          </div>
          <div className="text-right text-xs font-mono shrink-0">
            <div className="font-bold">{primarySummary.confidenceLabel}</div>
            <div className="font-medium mt-0.5">{primarySourceLabel}</div>
          </div>
        </div>
      </motion.div>

      {/* Side-by-Side Comparison Summary when Region B is active */}
      {compareSummary && compareLabel && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-bold text-slate-900 mb-3">
            Regional Divergence Comparison — Same Variable, Two Locations
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-700">
                  <th className="py-2 pr-4 font-semibold">Region</th>
                  <th className="py-2 pr-4 font-semibold">OLS Rate (/decade)</th>
                  <th className="py-2 pr-4 font-semibold">Sen’s Slope (/decade)</th>
                  <th className="py-2 pr-4 font-semibold">t-Test p-Value</th>
                  <th className="py-2 pr-4 font-semibold">Mann-Kendall τ (p)</th>
                  <th className="py-2 font-semibold">Verdict (α = 0.05)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-900">
                <tr>
                  <td className="py-2.5 pr-4 font-sans font-bold text-blue-700">A · {primaryLabel}</td>
                  <td className="py-2.5 pr-4 font-medium">
                    {sign(ols.slopePerDecade)}
                    {ols.slopePerDecade.toFixed(variable.decimals)} {variable.unit}
                  </td>
                  <td className="py-2.5 pr-4 font-medium">
                    {sign(mannKendall.sensSlopePerDecade)}
                    {mannKendall.sensSlopePerDecade.toFixed(variable.decimals)}
                  </td>
                  <td className="py-2.5 pr-4 font-medium">{formatPValue(ols.pValue)}</td>
                  <td className="py-2.5 pr-4 font-medium">
                    {sign(mannKendall.tau)}
                    {mannKendall.tau.toFixed(3)} ({formatPValue(mannKendall.pValue)})
                  </td>
                  <td className="py-2.5 font-sans font-semibold text-slate-900">
                    {primarySummary.isSignificant
                      ? primarySummary.verdictDirection === 'up'
                        ? '▲ Significant Rise'
                        : '▼ Significant Fall'
                      : '● Not Significant'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-sans font-bold text-amber-800">B · {compareLabel}</td>
                  <td className="py-2.5 pr-4 font-medium">
                    {sign(compareSummary.ols.slopePerDecade)}
                    {compareSummary.ols.slopePerDecade.toFixed(variable.decimals)} {variable.unit}
                  </td>
                  <td className="py-2.5 pr-4 font-medium">
                    {sign(compareSummary.mannKendall.sensSlopePerDecade)}
                    {compareSummary.mannKendall.sensSlopePerDecade.toFixed(variable.decimals)}
                  </td>
                  <td className="py-2.5 pr-4 font-medium">{formatPValue(compareSummary.ols.pValue)}</td>
                  <td className="py-2.5 pr-4 font-medium">
                    {sign(compareSummary.mannKendall.tau)}
                    {compareSummary.mannKendall.tau.toFixed(3)} ({formatPValue(compareSummary.mannKendall.pValue)})
                  </td>
                  <td className="py-2.5 font-sans font-semibold text-slate-900">
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
          <h4 className="text-sm font-bold text-slate-900">
            Variable Guide: {variable.name}
          </h4>
          <span className="text-xs font-medium text-slate-700">
            {variable.mission} · {variable.sphere} · Unit: {variable.unit}
          </span>
        </div>
        <p className="text-sm text-slate-800 leading-relaxed">{variable.simpleDefinition}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 text-sm">
          <div>
            <span className="font-bold text-slate-900">If trending upward (▲): </span>
            <span className="text-slate-700">{variable.risingMeans}</span>
          </div>
          <div>
            <span className="font-bold text-slate-900">If trending downward (▼): </span>
            <span className="text-slate-700">{variable.fallingMeans}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
