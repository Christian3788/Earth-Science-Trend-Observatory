import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Flame } from 'lucide-react';
import type { TimeSeriesPoint } from '../utils/statistics';

interface WarmingStripesProps {
  points: TimeSeriesPoint[];
  variableName: string;
  unit: string;
  decimals: number;
  regionLabel: string;
}

interface StripeYear {
  year: number;
  mean: number;
  count: number;
}

/** Diverging blue → neutral → red palette in the spirit of Hawkins' warming stripes. */
const COOL = [29, 78, 216]; // blue-700
const NEUTRAL = [241, 245, 249]; // slate-100
const WARM = [220, 38, 38]; // red-600

function mix(a: number[], b: number[], t: number): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function stripeColor(t: number): string {
  // t in [0,1]; 0 = coldest year, 1 = warmest year
  if (t < 0.5) return mix(COOL, NEUTRAL, t / 0.5);
  return mix(NEUTRAL, WARM, (t - 0.5) / 0.5);
}

/**
 * Memorable visual hook: every year of the observation window as one color
 * stripe, coldest blue → warmest red. Hover any stripe to read that year's
 * mean. Pure SVG/div rendering, no new dependencies.
 */
export const WarmingStripes: React.FC<WarmingStripesProps> = ({
  points,
  variableName,
  unit,
  decimals,
  regionLabel,
}) => {
  const [hoverYear, setHoverYear] = useState<number | null>(null);

  const stripes: StripeYear[] = useMemo(() => {
    const byYear = new Map<number, { sum: number; count: number }>();
    for (const p of points) {
      if (!Number.isFinite(p.value)) continue;
      const entry = byYear.get(p.year) || { sum: 0, count: 0 };
      entry.sum += p.value;
      entry.count += 1;
      byYear.set(p.year, entry);
    }
    return [...byYear.entries()]
      .map(([year, { sum, count }]) => ({ year, mean: sum / count, count }))
      .sort((a, b) => a.year - b.year);
  }, [points]);

  const { min, max, hovered } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of stripes) {
      if (s.mean < lo) lo = s.mean;
      if (s.mean > hi) hi = s.mean;
    }
    return {
      min: lo,
      max: hi,
      hovered: hoverYear != null ? stripes.find((s) => s.year === hoverYear) || null : null,
    };
  }, [stripes, hoverYear]);

  if (stripes.length < 3 || !Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return null;
  }

  const range = max - min;
  const firstYear = stripes[0].year;
  const lastYear = stripes[stripes.length - 1].year;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-md bg-gradient-to-br from-blue-700 to-red-600 shrink-0">
            <Flame className="w-4 h-4 text-white" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-950 truncate">
              {lastYear - firstYear + 1} years of {variableName} in one glance
            </h3>
            <div className="text-xs font-medium text-slate-600 truncate">
              Each stripe is one year in {regionLabel} — hover to read its mean
            </div>
          </div>
        </div>
        <div
          aria-live="polite"
          className="text-xs sm:text-sm font-mono font-bold tabular-nums text-slate-900 bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 whitespace-nowrap"
        >
          {hovered
            ? `${hovered.year}: ${hovered.mean.toFixed(decimals)} ${unit}`
            : `${firstYear} – ${lastYear}`}
        </div>
      </div>

      <div
        role="img"
        aria-label={`Yearly stripes for ${variableName} in ${regionLabel}, ${firstYear} to ${lastYear}`}
        className="flex items-stretch gap-[2px] h-20 sm:h-24 mt-3"
        onMouseLeave={() => setHoverYear(null)}
      >
        {stripes.map((s, i) => {
          const t = (s.mean - min) / range;
          const active = hoverYear === s.year;
          return (
            <motion.div
              key={s.year}
              initial={{ opacity: 0, scaleY: 0.2 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.012, 0.6), ease: 'easeOut' }}
              style={{ backgroundColor: stripeColor(t), transformOrigin: 'bottom' }}
              title={`${s.year}: ${s.mean.toFixed(decimals)} ${unit}`}
              onMouseEnter={() => setHoverYear(s.year)}
              onFocus={() => setHoverYear(s.year)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  const next = stripes[i + (e.key === 'ArrowRight' ? 1 : -1)];
                  if (next) setHoverYear(next.year);
                }
              }}
              className={`flex-1 min-w-[3px] rounded-[2px] cursor-crosshair outline-none transition-[filter,transform] duration-100 ${
                active ? 'ring-2 ring-slate-900 ring-offset-1 scale-y-105 z-10' : ''
              }`}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 mt-2.5 text-[11px] sm:text-xs font-mono font-semibold tabular-nums text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgb(29, 78, 216)' }} />
          {firstYear} · low {min.toFixed(decimals)} {unit}
        </span>
        <span className="hidden sm:inline font-sans font-medium text-slate-500">
          Inspired by Ed Hawkins&apos; warming stripes — one color per year, no axes needed
        </span>
        <span className="inline-flex items-center gap-1.5">
          high {max.toFixed(decimals)} {unit} · {lastYear}
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgb(220, 38, 38)' }} />
        </span>
      </div>
    </div>
  );
};
