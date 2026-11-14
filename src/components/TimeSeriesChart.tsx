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
