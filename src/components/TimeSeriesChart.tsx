import React, { useEffect, useMemo, useState } from 'react';
import type { TrendAnalysisSummary } from '../utils/statistics';

interface TimeSeriesChartProps {
  primarySummary: TrendAnalysisSummary;
  primaryLabel: string;
  compareSummary?: TrendAnalysisSummary | null;
  compareLabel?: string;
  variableName: string;
  unit: string;
  decimals: number;
  deseasonalize: boolean;
  resolution: 'monthly' | 'annual' | 'daily';
}

const W = 920;
const H = 360;
const PAD = { top: 24, right: 24, bottom: 38, left: 64 };

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  primarySummary,
  primaryLabel,
  compareSummary,
  compareLabel,
  variableName,
  unit,
  decimals,
  deseasonalize,
  resolution,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    setHoverIdx(null);
  }, [primarySummary]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const { minX, maxX, minY, maxY, yTicks, xTicks } = useMemo(() => {
    const ptsA = primarySummary.points;
    const ptsB = compareSummary?.points || [];
    const allPts = [...ptsA, ...ptsB];

    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;

    for (const p of allPts) {
      if (p.decimalYear < x0) x0 = p.decimalYear;
      if (p.decimalYear > x1) x1 = p.decimalYear;
      if (p.plotValue < y0) y0 = p.plotValue;
      if (p.plotValue > y1) y1 = p.plotValue;
      if (p.ciLower < y0) y0 = p.ciLower;
      if (p.ciUpper > y1) y1 = p.ciUpper;
    }

    if (!Number.isFinite(x0) || x0 === x1) {
      x0 = 1985;
      x1 = 2024;
    }
    if (!Number.isFinite(y0) || y0 === y1) {
      y0 = 0;
      y1 = 1;
    }

    const yRange = y1 - y0;
    const paddedY0 = y0 - yRange * 0.1;
    const paddedY1 = y1 + yRange * 0.1;

    const ticksY: number[] = [];
    for (let i = 0; i <= 4; i++) {
      ticksY.push(paddedY0 + ((paddedY1 - paddedY0) * i) / 4);
    }

    const startYr = Math.ceil(x0);
    const endYr = Math.floor(x1);
    const span = Math.max(1, endYr - startYr);
    const step = span <= 8 ? 1 : span <= 20 ? 3 : 5;
    const ticksX: number[] = [];
    for (let y = startYr; y <= endYr; y += step) {
      ticksX.push(y);
    }
    if (ticksX.length === 0) ticksX.push(Math.round(x0), Math.round(x1));

    return {
      minX: x0,
      maxX: x1,
      minY: paddedY0,
      maxY: paddedY1,
      yTicks: ticksY,
      xTicks: ticksX,
    };
  }, [primarySummary, compareSummary]);

  const toSvgX = (x: number) => PAD.left + ((x - minX) / Math.max(1e-6, maxX - minX)) * plotW;
  const toSvgY = (y: number) => PAD.top + plotH - ((y - minY) / Math.max(1e-6, maxY - minY)) * plotH;

  const buildLinePath = (pts: { decimalYear: number; val: number }[]) =>
    pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${toSvgX(p.decimalYear).toFixed(1)},${toSvgY(p.val).toFixed(1)}`)
      .join(' ');

  const primarySeriesPath = useMemo(
    () => buildLinePath(primarySummary.points.map((p) => ({ decimalYear: p.decimalYear, val: p.plotValue }))),
    [primarySummary, minX, maxX, minY, maxY],
  );

  const primaryTrendPath = useMemo(() => {
    const pts = primarySummary.points;
    if (pts.length < 2) return '';
    const first = pts[0];
    const last = pts[pts.length - 1];
    return `M${toSvgX(first.decimalYear).toFixed(1)},${toSvgY(first.trendValue).toFixed(1)} L${toSvgX(
      last.decimalYear,
    ).toFixed(1)},${toSvgY(last.trendValue).toFixed(1)}`;
  }, [primarySummary, minX, maxX, minY, maxY]);

  const primaryCiBandPath = useMemo(() => {
    const pts = primarySummary.points;
    if (pts.length < 2) return '';
    const upper = pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${toSvgX(p.decimalYear).toFixed(1)},${toSvgY(p.ciUpper).toFixed(1)}`)
      .join(' ');
    const lower = [...pts]
      .reverse()
      .map((p) => `L${toSvgX(p.decimalYear).toFixed(1)},${toSvgY(p.ciLower).toFixed(1)}`)
      .join(' ');
    return `${upper} ${lower} Z`;
  }, [primarySummary, minX, maxX, minY, maxY]);

  const compareSeriesPath = useMemo(() => {
    if (!compareSummary) return '';
    return buildLinePath(compareSummary.points.map((p) => ({ decimalYear: p.decimalYear, val: p.plotValue })));
  }, [compareSummary, minX, maxX, minY, maxY]);

  const compareTrendPath = useMemo(() => {
    if (!compareSummary || compareSummary.points.length < 2) return '';
    const pts = compareSummary.points;
    const first = pts[0];
    const last = pts[pts.length - 1];
    return `M${toSvgX(first.decimalYear).toFixed(1)},${toSvgY(first.trendValue).toFixed(1)} L${toSvgX(
      last.decimalYear,
    ).toFixed(1)},${toSvgY(last.trendValue).toFixed(1)}`;
  }, [compareSummary, minX, maxX, minY, maxY]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    if (mouseX < PAD.left || mouseX > W - PAD.right) {
      setHoverIdx(null);
      return;
    }
    const targetDecYear = minX + ((mouseX - PAD.left) / plotW) * (maxX - minX);
    let bestIdx = 0;
    let bestDist = Infinity;
    primarySummary.points.forEach((p, idx) => {
      const d = Math.abs(p.decimalYear - targetDecYear);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });
    setHoverIdx(bestIdx);
  };

  const hoveredPrimary = hoverIdx !== null ? primarySummary.points[hoverIdx] : null;
  const hoveredCompare =
    hoveredPrimary && compareSummary
      ? compareSummary.points.find((p) => p.date === hoveredPrimary.date) ||
        compareSummary.points[Math.min(hoverIdx ?? 0, compareSummary.points.length - 1)]
      : null;

  const displayUnit = deseasonalize && resolution === 'monthly' ? `Δ ${unit} (anomaly)` : unit;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {variableName} Time Series & Linear Trend
          </h3>
          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
            <span>Unit: {displayUnit}</span>
            <span aria-hidden="true">·</span>
            <span>
              {resolution === 'annual'
                ? 'Annual Mean'
                : resolution === 'daily'
                ? 'Daily Observations'
                : deseasonalize
                ? 'Monthly Deseasonalized Anomalies'
                : 'Raw Monthly Observations'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">n = {primarySummary.ols.n}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-blue-600 inline-block" />
            <span>{primaryLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0 border-t-2 border-dashed border-blue-900 inline-block" />
            <span>OLS Trend + 95% CI</span>
          </div>
          {compareSummary && compareLabel && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-amber-600 inline-block" />
              <span>{compareLabel}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          role="img"
          aria-label={`Time series chart of ${variableName}`}
        >
          {/* Horizontal gridlines + Y ticks */}
          {yTicks.map((tick, i) => {
            const y = toSvgY(tick);
            return (
              <g key={i}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#E2E8F0" strokeWidth={0.8} />
                <text
                  x={PAD.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10.5"
                  fill="#64748B"
                  className="font-mono tabular-nums"
                >
                  {tick.toFixed(decimals)}
                </text>
              </g>
            );
          })}

          {/* Zero anomaly reference line if 0 lies within range */}
          {minY < 0 && maxY > 0 && (
            <line
              x1={PAD.left}
              y1={toSvgY(0)}
              x2={W - PAD.right}
              y2={toSvgY(0)}
              stroke="#94A3B8"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* Vertical X grid ticks */}
          {xTicks.map((yr) => {
            const x = toSvgX(yr);
            return (
              <g key={yr}>
                <line x1={x} y1={PAD.top} x2={x} y2={H - PAD.bottom} stroke="#F1F5F9" strokeWidth={1} />
                <text
                  x={x}
                  y={H - PAD.bottom + 18}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="#64748B"
                  className="font-mono tabular-nums"
                >
                  {yr}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#CBD5E1" strokeWidth={1} />
          <line
            x1={PAD.left}
            y1={H - PAD.bottom}
            x2={W - PAD.right}
            y2={H - PAD.bottom}
            stroke="#CBD5E1"
            strokeWidth={1}
          />

          {/* 95% Confidence Interval band */}
          {primaryCiBandPath && <path d={primaryCiBandPath} fill="rgba(37, 99, 235, 0.11)" />}

          {/* Primary Data Line */}
          <path
            d={primarySeriesPath}
            fill="none"
            stroke="#2563EB"
            strokeWidth={compareSummary ? 1.5 : 1.75}
            strokeOpacity={0.85}
          />

          {/* Primary OLS Trend Line */}
          <path
            d={primaryTrendPath}
            fill="none"
            stroke="#1E3A8A"
            strokeWidth={2.2}
            strokeDasharray="6 4"
          />

          {/* Comparison Data + Trend Line */}
          {compareSummary && (
            <>
              <path
                d={compareSeriesPath}
                fill="none"
                stroke="#D97706"
                strokeWidth={1.5}
                strokeOpacity={0.85}
              />
              <path
                d={compareTrendPath}
                fill="none"
                stroke="#92400E"
                strokeWidth={2.2}
                strokeDasharray="6 4"
              />
            </>
          )}

          {/* Crosshair Hover */}
          {hoveredPrimary && (
            <g pointerEvents="none">
              <line
                x1={toSvgX(hoveredPrimary.decimalYear)}
                y1={PAD.top}
                x2={toSvgX(hoveredPrimary.decimalYear)}
                y2={H - PAD.bottom}
                stroke="#475569"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <circle
                cx={toSvgX(hoveredPrimary.decimalYear)}
                cy={toSvgY(hoveredPrimary.plotValue)}
                r={4.2}
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              {hoveredCompare && (
                <circle
                  cx={toSvgX(hoveredCompare.decimalYear)}
                  cy={toSvgY(hoveredCompare.plotValue)}
                  r={4.2}
                  fill="#D97706"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              )}
            </g>
          )}
        </svg>

        {/* Compact Monospace Crosshair HUD */}
        {hoveredPrimary && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono tabular-nums text-slate-700">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-slate-900">{hoveredPrimary.date}</span>
              <span className="text-blue-700">
                {primaryLabel}: {hoveredPrimary.plotValue.toFixed(decimals)} {unit}
              </span>
              <span className="text-slate-500">
                Trend: {hoveredPrimary.trendValue.toFixed(decimals)} {unit}
              </span>
              {hoveredCompare && compareLabel && (
                <span className="text-amber-700">
                  {compareLabel}: {hoveredCompare.plotValue.toFixed(decimals)} {unit}
                </span>
              )}
            </div>
            <span className="text-slate-400">
              95% CI [{hoveredPrimary.ciLower.toFixed(decimals)}, {hoveredPrimary.ciUpper.toFixed(decimals)}]
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
