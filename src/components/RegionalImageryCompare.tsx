import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Columns2, Loader2, MoveHorizontal, Satellite } from 'lucide-react';

type SatelliteLayerKind = 'truecolor' | 'lst' | 'ndvi' | 'seaice';

interface RegionalImageryCompareProps {
  primaryLat: number;
  primaryLon: number;
  primaryLabel: string;
  compareMode: boolean;
  compareLat: number;
  compareLon: number;
  compareLabel: string;
  variableId: string;
  startYear: number;
  endYear: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function defaultLayerForVariable(variableId: string): SatelliteLayerKind {
  if (variableId === 'MODIS_NDVI' || variableId === 'GWETPROF') return 'ndvi';
  if (variableId === 'SRF_ALB' || variableId === 'RCM_SAR_WETLAND') return 'seaice';
  if (variableId === 'TS' || variableId === 'T2M') return 'truecolor';
  return 'truecolor';
}

function defaultMonthForContext(lat: number, layer: SatelliteLayerKind): number {
  if (layer === 'seaice' && lat > 55) return 9; // September Arctic sea-ice minimum
  return lat >= 0 ? 7 : 1; // Summer clear-sky window per hemisphere
}

function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

export const RegionalImageryCompare: React.FC<RegionalImageryCompareProps> = ({
  primaryLat,
  primaryLon,
  primaryLabel,
  compareMode,
  compareLat,
  compareLon,
  compareLabel,
  variableId,
  startYear,
  endYear,
}) => {
  const [layer, setLayer] = useState<SatelliteLayerKind>(() => defaultLayerForVariable(variableId));
  const [month, setMonth] = useState<number>(() => defaultMonthForContext(primaryLat, 'truecolor'));
  const [span, setSpan] = useState<number>(2.4);
  const [viewLayout, setViewLayout] = useState<'swipe' | 'sidebyside'>('swipe');
  const [compareAxis, setCompareAxis] = useState<'temporal' | 'regions'>('temporal');
  const [sliderPct, setSliderPct] = useState<number>(50);
  const [dragging, setDragging] = useState<boolean>(false);
  const [loadedKeys, setLoadedKeys] = useState<Record<string, boolean>>({});
  const [errorKeys, setErrorKeys] = useState<Record<string, boolean>>({});

  const swipeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const suggested = defaultLayerForVariable(variableId);
    setLayer(suggested);
  }, [variableId]);

  useEffect(() => {
    setMonth(defaultMonthForContext(primaryLat, layer));
  }, [primaryLat, layer]);

  useEffect(() => {
    if (!compareMode && compareAxis === 'regions') {
      setCompareAxis('temporal');
    }
  }, [compareMode, compareAxis]);

  const minLayerYear =
    layer === 'truecolor' ? 2000 : layer === 'seaice' ? 2000 : 2001;

  const beforeYear = Math.max(minLayerYear, Math.min(endYear - 1, startYear));
  const afterYear = Math.max(beforeYear, endYear);

  const leftSpec = useMemo(() => {
    if (compareMode && compareAxis === 'regions') {
      return {
        title: `Region A · ${primaryLabel}`,
        coord: formatCoord(primaryLat, primaryLon),
        year: afterYear,
        url: `/api/satellite/regional-snapshot?lat=${primaryLat}&lon=${primaryLon}&year=${afterYear}&month=${month}&span=${span}&layer=${layer}`,
      };
    }
    return {
      title: `${primaryLabel} (${beforeYear})`,
      coord: formatCoord(primaryLat, primaryLon),
      year: beforeYear,
      url: `/api/satellite/regional-snapshot?lat=${primaryLat}&lon=${primaryLon}&year=${beforeYear}&month=${month}&span=${span}&layer=${layer}`,
    };
  }, [compareMode, compareAxis, primaryLabel, primaryLat, primaryLon, beforeYear, afterYear, month, span, layer]);

  const rightSpec = useMemo(() => {
    if (compareMode && compareAxis === 'regions') {
      return {
        title: `Region B · ${compareLabel}`,
        coord: formatCoord(compareLat, compareLon),
        year: afterYear,
        url: `/api/satellite/regional-snapshot?lat=${compareLat}&lon=${compareLon}&year=${afterYear}&month=${month}&span=${span}&layer=${layer}`,
      };
    }
    return {
      title: `${primaryLabel} (${afterYear})`,
      coord: formatCoord(primaryLat, primaryLon),
      year: afterYear,
      url: `/api/satellite/regional-snapshot?lat=${primaryLat}&lon=${primaryLon}&year=${afterYear}&month=${month}&span=${span}&layer=${layer}`,
    };
  }, [
    compareMode,
    compareAxis,
    primaryLabel,
    primaryLat,
    primaryLon,
    compareLabel,
    compareLat,
    compareLon,
    afterYear,
    month,
    span,
    layer,
  ]);

  const updateSliderFromClientX = (clientX: number) => {
    const el = swipeRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
    setSliderPct(Math.max(4, Math.min(96, pct)));
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => updateSliderFromClientX(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  const layerDescriptions: Record<SatelliteLayerKind, string> = {
    truecolor: 'MODIS Terra True-Color Satellite Photography',
    lst: 'MODIS Terra Daytime Land Surface Temperature',
    ndvi: 'MODIS Terra Vegetation Greenness (NDVI)',
    seaice: 'AMSR2 / MODIS Cryosphere & Sea Ice Extent',
  };

  const leftLoaded = Boolean(loadedKeys[leftSpec.url]);
  const rightLoaded = Boolean(loadedKeys[rightSpec.url]);
  const isLoadingImages = (!leftLoaded && !errorKeys[leftSpec.url]) || (!rightLoaded && !errorKeys[rightSpec.url]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Satellite className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-slate-900">
              Real NASA Satellite Change Imagery
            </span>
          </div>

          {compareMode && (
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-200/70 rounded-md">
              <button
                type="button"
                onClick={() => setCompareAxis('temporal')}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  compareAxis === 'temporal' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Time Change ({beforeYear} vs {afterYear})
              </button>
              <button
                type="button"
                onClick={() => setCompareAxis('regions')}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  compareAxis === 'regions' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Region A vs Region B
              </button>
            </div>
          )}

          {isLoadingImages && (
            <span className="inline-flex items-center gap-1 text-[11px] text-blue-700">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Acquiring NASA GIBS imagery...</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Layer Picker */}
          <select
            aria-label="Satellite imagery layer"
            value={layer}
            onChange={(e) => setLayer(e.target.value as SatelliteLayerKind)}
            className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="truecolor">True Color (MODIS)</option>
            <option value="lst">Land Surface Temp (MODIS)</option>
            <option value="ndvi">Vegetation Index (NDVI)</option>
            <option value="seaice">Sea Ice & Snow Cover</option>
          </select>

          {/* Month Selector */}
          <select
            aria-label="Capture month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          {/* Spatial Zoom Span */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-200/70 rounded-md">
            {[
              { label: 'Local', val: 1.2 },
              { label: 'Basin', val: 2.4 },
              { label: 'Regional', val: 5.5 },
            ].map((z) => (
              <button
                key={z.label}
                type="button"
                onClick={() => setSpan(z.val)}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  span === z.val ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          {/* Wipe vs Side-by-Side Layout */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-200/70 rounded-md">
            <button
              type="button"
              onClick={() => setViewLayout('swipe')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewLayout === 'swipe' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MoveHorizontal className="w-3 h-3" />
              <span>Split Wipe</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('sidebyside')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewLayout === 'sidebyside' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns2 className="w-3 h-3" />
              <span>Side-by-Side</span>
            </button>
          </div>
        </div>
      </div>

      {/* Imagery Viewport */}
      {viewLayout === 'swipe' ? (
        <div
          ref={swipeRef}
          onPointerDown={(e) => {
            setDragging(true);
            updateSliderFromClientX(e.clientX);
          }}
          className="relative w-full h-[300px] sm:h-[360px] bg-slate-950 select-none overflow-hidden cursor-ew-resize"
        >
          {/* Base Right Image (After / Region B) */}
          <img
            src={rightSpec.url}
            alt={rightSpec.title}
            onLoad={() => setLoadedKeys((prev) => ({ ...prev, [rightSpec.url]: true }))}
            onError={() => setErrorKeys((prev) => ({ ...prev, [rightSpec.url]: true }))}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Clipped Left Image (Before / Region A) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPct}% 0 0)` }}
          >
            <img
              src={leftSpec.url}
              alt={leftSpec.title}
              onLoad={() => setLoadedKeys((prev) => ({ ...prev, [leftSpec.url]: true }))}
              onError={() => setErrorKeys((prev) => ({ ...prev, [leftSpec.url]: true }))}
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Center Target Crosshair */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-7 h-7 border border-white/75 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>

          {/* Split Handle Line & Knob */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow-sm"
            style={{ left: `${sliderPct}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-white text-white flex items-center justify-center shadow-md">
              <MoveHorizontal className="w-4 h-4" />
            </div>
          </div>

          {/* Corner Capture Labels (Solid surface, tabular-nums) */}
          <div className="pointer-events-none absolute top-3 left-3 bg-slate-950/88 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white">
            <div className="font-semibold">{leftSpec.title}</div>
            <div className="font-mono tabular-nums text-[11px] text-slate-300">
              {MONTH_NAMES[month - 1]} {leftSpec.year} · {leftSpec.coord}
            </div>
          </div>

          <div className="pointer-events-none absolute top-3 right-3 bg-slate-950/88 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white text-right">
            <div className="font-semibold">{rightSpec.title}</div>
            <div className="font-mono tabular-nums text-[11px] text-slate-300">
              {MONTH_NAMES[month - 1]} {rightSpec.year} · {rightSpec.coord}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/85 border border-slate-700 rounded px-3 py-1 text-[11px] text-slate-200 whitespace-nowrap">
            Drag slider horizontally to compare {leftSpec.year} vs {rightSpec.year} satellite capture
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-slate-950">
          {[leftSpec, rightSpec].map((spec, idx) => (
            <div key={idx} className="relative h-[260px] sm:h-[300px] overflow-hidden">
              <img
                src={spec.url}
                alt={spec.title}
                onLoad={() => setLoadedKeys((prev) => ({ ...prev, [spec.url]: true }))}
                onError={() => setErrorKeys((prev) => ({ ...prev, [spec.url]: true }))}
                className="w-full h-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border border-white/75 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
              <div className="pointer-events-none absolute top-3 left-3 bg-slate-950/88 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white">
                <div className="font-semibold">{spec.title}</div>
                <div className="font-mono tabular-nums text-[11px] text-slate-300">
                  {MONTH_NAMES[month - 1]} {spec.year} · {spec.coord}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Note */}
      <div className="px-4 py-2 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>
          {layerDescriptions[layer]} · Field of view: ±{span.toFixed(1)}° latitude centered on selected coordinate
        </span>
        {startYear < minLayerYear && compareAxis === 'temporal' && (
          <span className="text-slate-600">
            Note: MODIS/AMSR satellite photography begins in {minLayerYear}; earlier baseline clamped to {minLayerYear}.
          </span>
        )}
      </div>
    </div>
  );
};
