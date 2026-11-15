import React, { useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import countries110m from 'world-atlas/countries-110m.json';
import { Layers, Loader2, Pause, Play } from 'lucide-react';
import type { PresetRegion } from '../data/earthCatalog';

export interface SpatialHeatmapData {
  variable: string;
  startYear: number;
  endYear: number;
  rows: number;
  cols: number;
  globalModelMean: number;
  minDeviation: number;
  maxDeviation: number;
  sourceType: string;
  sourceLabel: string;
  deviations: number[][];
}

interface WorldMapSelectorProps {
  primaryLat: number;
  primaryLon: number;
  primaryLabel: string;
  compareMode: boolean;
  compareLat: number;
  compareLon: number;
  compareLabel: string;
  activeSelectionTarget: 'primary' | 'compare';
  onSelectTargetChange: (target: 'primary' | 'compare') => void;
  onSelectCoordinate: (lat: number, lon: number, preset?: PresetRegion) => void;
  presets: PresetRegion[];
  activePresetId: string | null;
  comparePresetId: string | null;
  heatmapData: SpatialHeatmapData | null;
  heatmapLoading: boolean;
  heatmapEnabled: boolean;
  onToggleHeatmap: () => void;
  heatmapOpacity: number;
  onChangeHeatmapOpacity: (val: number) => void;
  variableId: string;
  variableName: string;
  endYear: number;
  unit: string;
  decimals: number;
  onChangeEndYear?: (yr: number) => void;
  hideOverlays?: boolean;
}

const SVG_W = 960;
const SVG_H = 480;
const HEATMAP_W = 360;
const HEATMAP_H = 180;

function lonToX(lon: number): number {
  return ((lon + 180) / 360) * SVG_W;
}

function latToY(lat: number): number {
  return ((90 - lat) / 180) * SVG_H;
}

function ringToSvgPath(ring: number[][]): string {
  if (ring.length === 0) return '';
  let d = '';
  let prevLon = ring[0][0];
  d += `M${lonToX(ring[0][0]).toFixed(1)},${latToY(ring[0][1]).toFixed(1)}`;
  for (let i = 1; i < ring.length; i++) {
    const [lon, lat] = ring[i];
    if (Math.abs(lon - prevLon) > 180) {
      d += ` M${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`;
    } else {
      d += ` L${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`;
    }
    prevLon = lon;
  }
  return d + ' Z';
}

// Bilinearly sample the coarse 36x18 deviation grid at any continuous (lat, lon)
function sampleDeviationAt(data: SpatialHeatmapData, lat: number, lon: number): number {
  const { rows, cols, deviations } = data;
  // Grid cell centers: lat = 85 - r * 10, lon = -175 + c * 10
  const rf = Math.max(0, Math.min(rows - 1, (85 - lat) / 10));
  const cfRaw = (lon + 175) / 10;
  const c0 = ((Math.floor(cfRaw) % cols) + cols) % cols;
  const c1 = (c0 + 1) % cols;
  const fc = cfRaw - Math.floor(cfRaw);

  const r0 = Math.floor(rf);
  const r1 = Math.min(rows - 1, r0 + 1);
  const fr = rf - r0;

  const v00 = deviations[r0]?.[c0] ?? 0;
  const v01 = deviations[r0]?.[c1] ?? 0;
  const v10 = deviations[r1]?.[c0] ?? 0;
  const v11 = deviations[r1]?.[c1] ?? 0;

  const top = v00 * (1 - fc) + v01 * fc;
  const bot = v10 * (1 - fc) + v11 * fc;
  return top * (1 - fr) + bot * fr;
}

// Diverging Coolwarm RGB color ramp centered strictly at 0.0 (global model mean)
function deviationToRGB(norm: number): [number, number, number] {
  // norm in [-1, 1]
  const t = Math.max(-1, Math.min(1, norm));
  if (t < 0) {
    const k = -t; // 0 (neutral) -> 1 (deep negative blue)
    if (k < 0.5) {
      const s = k * 2; // #F8FAFC -> #38BDF8
      return [
        Math.round(248 + (56 - 248) * s),
        Math.round(250 + (189 - 250) * s),
        Math.round(252 + (248 - 252) * s),
      ];
    }
    const s = (k - 0.5) * 2; // #38BDF8 -> #1D4ED8
    return [
      Math.round(56 + (29 - 56) * s),
      Math.round(189 + (78 - 189) * s),
      Math.round(248 + (216 - 248) * s),
    ];
  } else {
    const k = t; // 0 (neutral) -> 1 (deep positive crimson)
    if (k < 0.5) {
      const s = k * 2; // #F8FAFC -> #F59E0B
      return [
        Math.round(248 + (245 - 248) * s),
        Math.round(250 + (158 - 250) * s),
        Math.round(252 + (11 - 252) * s),
      ];
    }
    const s = (k - 0.5) * 2; // #F59E0B -> #B91C1C
    return [
      Math.round(245 + (185 - 245) * s),
      Math.round(158 + (28 - 158) * s),
      Math.round(11 + (28 - 11) * s),
    ];
  }
}

export const WorldMapSelector: React.FC<WorldMapSelectorProps> = ({
  primaryLat,
  primaryLon,
  primaryLabel,
  compareMode,
  compareLat,
  compareLon,
  compareLabel,
  activeSelectionTarget,
  onSelectTargetChange,
  onSelectCoordinate,
  presets,
  activePresetId,
  comparePresetId,
  heatmapData,
  heatmapLoading,
  heatmapEnabled,
  onToggleHeatmap,
  heatmapOpacity,
  onChangeHeatmapOpacity,
  variableId,
  variableName,
  endYear,
  unit,
  decimals,
  onChangeEndYear,
  hideOverlays = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [hoveredPreset, setHoveredPreset] = useState<PresetRegion | null>(null);
  const [satelliteBasemap, setSatelliteBasemap] = useState<boolean>(true);
  const [basemapError, setBasemapError] = useState<boolean>(false);
  const [overlayMode, setOverlayMode] = useState<'anomaly' | 'gibs'>('anomaly');
  const [gibsFailed, setGibsFailed] = useState<boolean>(false);
  const [decadeSweeping, setDecadeSweeping] = useState<boolean>(false);

  useEffect(() => {
    setGibsFailed(false);
  }, [variableId, endYear]);

  useEffect(() => {
    if (!decadeSweeping || !onChangeEndYear) return;
    const minSweep = overlayMode === 'gibs' ? 2001 : 1995;
    const timer = window.setInterval(() => {
      onChangeEndYear(endYear >= 2024 ? minSweep : endYear + 3 > 2024 ? 2024 : endYear + 3);
    }, 1150);
    return () => window.clearInterval(timer);
  }, [decadeSweeping, endYear, overlayMode, onChangeEndYear]);

  const countryPaths = useMemo(() => {
    const topo = countries110m as unknown as Topology<{
      countries: GeometryCollection;
    }>;
    const geo = feature(topo, topo.objects.countries);
    const paths: string[] = [];

    for (const feat of geo.features) {
      const geom = feat.geometry;
      if (!geom) continue;
      if (geom.type === 'Polygon') {
        for (const ring of geom.coordinates) {
          paths.push(ringToSvgPath(ring));
        }
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          for (const ring of poly) {
            paths.push(ringToSvgPath(ring));
          }
        }
      }
    }
    return paths;
  }, []);

  const maxAbsDeviation = useMemo(() => {
    if (!heatmapData) return 1;
    return Math.max(Math.abs(heatmapData.minDeviation), Math.abs(heatmapData.maxDeviation), 1e-4);
  }, [heatmapData]);

  // Paint bilinearly interpolated heatmap onto canvas whenever data updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heatmapData || !heatmapEnabled) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = ctx.createImageData(HEATMAP_W, HEATMAP_H);
    const buf = img.data;

    for (let py = 0; py < HEATMAP_H; py++) {
      const lat = 90 - ((py + 0.5) / HEATMAP_H) * 180;
      for (let px = 0; px < HEATMAP_W; px++) {
        const lon = ((px + 0.5) / HEATMAP_W) * 360 - 180;
        const dev = sampleDeviationAt(heatmapData, lat, lon);
        const norm = dev / maxAbsDeviation;
        const [r, g, b] = deviationToRGB(norm);
        const idx = (py * HEATMAP_W + px) * 4;
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        // Fade opacity near neutral zero deviation slightly less so extreme anomalies pop clearly
        buf[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }, [heatmapData, heatmapEnabled, maxAbsDeviation]);

  const getCoordsFromEvent = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const lon = Number((relX * 360 - 180).toFixed(2));
    const lat = Number((90 - relY * 180).toFixed(2));
    return { lat, lon };
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getCoordsFromEvent(e);
    if (!coords) return;
    onSelectCoordinate(coords.lat, coords.lon);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getCoordsFromEvent(e);
    if (coords) setHoverCoords(coords);
  };

  const formatCoord = (lat: number, lon: number) => {
    const ns = lat >= 0 ? 'N' : 'S';
    const ew = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
  };

  const hoveredDeviation = useMemo(() => {
    if (!heatmapEnabled || !heatmapData) return null;
    const target = hoverCoords || { lat: primaryLat, lon: primaryLon };
    return sampleDeviationAt(heatmapData, target.lat, target.lon);
  }, [heatmapEnabled, heatmapData, hoverCoords, primaryLat, primaryLon]);

  const lonGrid = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
  const latGrid = [-60, -30, 0, 30, 60];

  const sign = (v: number) => (v >= 0 ? '+' : '');

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Top Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-bold text-slate-950 tracking-tight">
            2D Global Spatial Map
          </span>

          <button
            type="button"
            onClick={() => setSatelliteBasemap((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              satelliteBasemap && !basemapError
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <span>Blue Marble Basemap</span>
          </button>

          {!hideOverlays && (
          <>
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-200/80 rounded-md">
            <button
              type="button"
              onClick={() => {
                setOverlayMode('anomaly');
                if (!heatmapEnabled) onToggleHeatmap();
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                heatmapEnabled && overlayMode === 'anomaly'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              Anomaly Grid
            </button>
            <button
              type="button"
              onClick={() => {
                setOverlayMode('gibs');
                if (!heatmapEnabled) onToggleHeatmap();
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                heatmapEnabled && overlayMode === 'gibs'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              NASA Satellite Layer
            </button>
            <button
              type="button"
              onClick={() => {
                if (heatmapEnabled) onToggleHeatmap();
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !heatmapEnabled
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              Off
            </button>
          </div>

          {heatmapEnabled && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <Layers className="w-3.5 h-3.5 text-slate-700" />
              <input
                type="range"
                min={0.25}
                max={0.95}
                step={0.05}
                value={heatmapOpacity}
                onChange={(e) => onChangeHeatmapOpacity(Number(e.target.value))}
                aria-label="Overlay layer opacity"
                className="w-16 accent-blue-600 cursor-pointer"
              />
            </div>
          )}
          </>
          )}

          {onChangeEndYear && (
            <button
              type="button"
              onClick={() => setDecadeSweeping((s) => !s)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                decadeSweeping
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
              title="Animate observation year across decades"
            >
              {decadeSweeping ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{decadeSweeping ? `Sweeping (${endYear})` : 'Decade Sweep'}</span>
            </button>
          )}

          {heatmapLoading && heatmapEnabled && overlayMode === 'anomaly' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Computing global grid...</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {compareMode && (
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/80 rounded-md">
              <button
                type="button"
                onClick={() => onSelectTargetChange('primary')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeSelectionTarget === 'primary'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                Set Region A
              </button>
              <button
                type="button"
                onClick={() => onSelectTargetChange('compare')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeSelectionTarget === 'compare'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                Set Region B
              </button>
            </div>
          )}

          <div className="font-mono tabular-nums text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2.5 py-1 text-right">
            {hoverCoords
              ? formatCoord(hoverCoords.lat, hoverCoords.lon)
              : formatCoord(primaryLat, primaryLon)}
            {hoveredDeviation !== null && (
              <span
                className={`ml-2 font-bold ${
                  hoveredDeviation > 0 ? 'text-amber-800' : hoveredDeviation < 0 ? 'text-blue-700' : 'text-slate-700'
                }`}
              >
                ({sign(hoveredDeviation)}
                {hoveredDeviation.toFixed(decimals)} {unit})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Layered Spatial Viewport: Real Blue Marble Basemap + Anomaly/GIBS Overlay + Vector Coastlines */}
      <div className="relative bg-slate-900 select-none">
        {satelliteBasemap && !basemapError && (
          <img
            src="/api/satellite/earth-texture?kind=shaded"
            alt="NASA Blue Marble Shaded Relief and Bathymetry Basemap"
            onError={() => setBasemapError(true)}
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          />
        )}

        {heatmapEnabled && overlayMode === 'anomaly' && heatmapData && (
          <canvas
            ref={canvasRef}
            width={HEATMAP_W}
            height={HEATMAP_H}
            style={{ opacity: satelliteBasemap && !basemapError ? Math.min(0.76, heatmapOpacity) : heatmapOpacity }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        )}

        {heatmapEnabled && overlayMode === 'gibs' && !gibsFailed && (
          <img
            src={`/api/satellite/global-layer?variable=${encodeURIComponent(variableId)}&year=${endYear}&month=7`}
            alt={`NASA GIBS Satellite Layer for ${variableName}`}
            onError={() => setGibsFailed(true)}
            style={{ opacity: heatmapOpacity }}
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          />
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="relative z-10 w-full h-auto block cursor-crosshair"
          onClick={handleMapClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setHoverCoords(null);
            setHoveredPreset(null);
          }}
          role="img"
          aria-label="Interactive Equirectangular World Map with NASA Satellite Basemap and Spatial Anomaly Heatmap"
        >
          {/* Graticules */}
          {lonGrid.map((lon) => (
            <line
              key={`lon-${lon}`}
              x1={lonToX(lon)}
              y1={0}
              x2={lonToX(lon)}
              y2={SVG_H}
              stroke={satelliteBasemap && !basemapError ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.14)'}
              strokeWidth={lon === 0 ? 1 : 0.75}
            />
          ))}
          {latGrid.map((lat) => (
            <line
              key={`lat-${lat}`}
              x1={0}
              y1={latToY(lat)}
              x2={SVG_W}
              y2={latToY(lat)}
              stroke={
                satelliteBasemap && !basemapError
                  ? lat === 0
                    ? 'rgba(255, 255, 255, 0.34)'
                    : 'rgba(255, 255, 255, 0.16)'
                  : lat === 0
                  ? '#CBD5E1'
                  : '#E2E8F0'
              }
              strokeWidth={lat === 0 ? 1.1 : 0.75}
              strokeDasharray={lat === 0 ? '4 3' : undefined}
            />
          ))}

          {/* Arctic & Antarctic Circles */}
          <line
            x1={0}
            y1={latToY(66.5)}
            x2={SVG_W}
            y2={latToY(66.5)}
            stroke={satelliteBasemap && !basemapError ? 'rgba(255, 255, 255, 0.24)' : '#CBD5E1'}
            strokeWidth={0.7}
            strokeDasharray="2 4"
          />
          <line
            x1={0}
            y1={latToY(-66.5)}
            x2={SVG_W}
            y2={latToY(-66.5)}
            stroke={satelliteBasemap && !basemapError ? 'rgba(255, 255, 255, 0.24)' : '#CBD5E1'}
            strokeWidth={0.7}
            strokeDasharray="2 4"
          />

          {/* Landmasses (Crisp coastlines over NASA Blue Marble & anomaly overlay) */}
          <g
            fill={satelliteBasemap && !basemapError ? 'transparent' : heatmapEnabled ? 'rgba(255, 255, 255, 0.08)' : '#F8FAFC'}
            stroke={satelliteBasemap && !basemapError ? 'rgba(255, 255, 255, 0.42)' : '#334155'}
            strokeWidth={satelliteBasemap && !basemapError ? 0.65 : 0.7}
          >
            {countryPaths.map((d, idx) => (
              <path key={idx} d={d} />
            ))}
          </g>

          {/* Latitude axis markers */}
          <g className="font-mono" fontSize="11" fontWeight="600" fill={satelliteBasemap && !basemapError ? '#FFFFFF' : '#1E293B'}>
            <text x={8} y={latToY(60) - 5}>60°N</text>
            <text x={8} y={latToY(0) - 5}>0° EQ</text>
            <text x={8} y={latToY(-60) - 5}>60°S</text>
          </g>

          {/* Preset Hotspot Markers */}
          {presets.map((preset) => {
            const cx = lonToX(preset.lon);
            const cy = latToY(preset.lat);
            const isPrimary = activePresetId === preset.id;
            const isCompare = compareMode && comparePresetId === preset.id;

            return (
              <g
                key={preset.id}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCoordinate(preset.lat, preset.lon, preset);
                }}
                onMouseEnter={() => setHoveredPreset(preset)}
                onMouseLeave={() => setHoveredPreset(null)}
              >
                <circle cx={cx} cy={cy} r={10} fill="transparent" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={isPrimary || isCompare ? 4.4 : 3.4}
                  fill={isPrimary ? '#2563EB' : isCompare ? '#D97706' : '#334155'}
                  stroke="#FFFFFF"
                  strokeWidth={1.6}
                />
              </g>
            );
          })}

          {/* Compare Region B Target Crosshair */}
          {compareMode && (
            <g pointerEvents="none">
              <circle
                key={`ping-b-${compareLat}-${compareLon}`}
                cx={lonToX(compareLon)}
                cy={latToY(compareLat)}
                r={12}
                fill="none"
                stroke="#F59E0B"
                strokeWidth={2}
                className="animate-target-ping"
              />
              <circle
                cx={lonToX(compareLon)}
                cy={latToY(compareLat)}
                r={10}
                fill="rgba(217, 119, 6, 0.18)"
                stroke="#D97706"
                strokeWidth={1.8}
              />
              <circle cx={lonToX(compareLon)} cy={latToY(compareLat)} r={3.8} fill="#D97706" />
              <text
                x={Math.min(SVG_W - 130, lonToX(compareLon) + 13)}
                y={Math.max(18, latToY(compareLat) + 4)}
                fontSize="12"
                fontWeight="700"
                fill="#78350F"
                stroke="#FFFFFF"
                strokeWidth={3.2}
                paintOrder="stroke"
                className="font-sans"
              >
                B: {compareLabel}
              </text>
            </g>
          )}

          {/* Primary Region A Target Crosshair */}
          <g pointerEvents="none">
            <circle
              key={`ping-a-${primaryLat}-${primaryLon}`}
              cx={lonToX(primaryLon)}
              cy={latToY(primaryLat)}
              r={12}
              fill="none"
              stroke="#38BDF8"
              strokeWidth={2.2}
              className="animate-target-ping"
            />
            <circle
              cx={lonToX(primaryLon)}
              cy={latToY(primaryLat)}
              r={11}
              fill="rgba(37, 99, 235, 0.18)"
              stroke="#1D4ED8"
              strokeWidth={1.8}
            />
            <circle cx={lonToX(primaryLon)} cy={latToY(primaryLat)} r={4.2} fill="#1D4ED8" />
            <text
              x={Math.min(SVG_W - 140, lonToX(primaryLon) + 14)}
              y={Math.max(18, latToY(primaryLat) - 6)}
              fontSize="12.5"
              fontWeight="700"
              fill="#1E3A8A"
              stroke="#FFFFFF"
              strokeWidth={3.2}
              paintOrder="stroke"
              className="font-sans"
            >
              {compareMode ? `A: ${primaryLabel}` : primaryLabel}
            </text>
          </g>
        </svg>

        {hoveredPreset && (
          <div className="pointer-events-none z-20 absolute bottom-3 left-3 bg-white border border-slate-300 rounded-md px-3.5 py-2.5 shadow-sm max-w-xs">
            <div className="text-sm font-bold text-slate-950">{hoveredPreset.name}</div>
            <div className="text-xs font-medium text-slate-700 mt-0.5">
              {hoveredPreset.biomeLabel} · {formatCoord(hoveredPreset.lat, hoveredPreset.lon)}
            </div>
          </div>
        )}
      </div>

      {/* Diverging Spatial Heatmap Legend Footer */}
      {heatmapEnabled && overlayMode === 'anomaly' && heatmapData && (
        <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-2 text-slate-800">
            <span className="font-bold text-slate-950">
              {variableName} Anomaly Deviation ({heatmapData.startYear}–{heatmapData.endYear})
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-700 font-medium">
              Global Model Mean Change:{' '}
              <span className="font-mono tabular-nums font-bold text-slate-950">
                {sign(heatmapData.globalModelMean)}
                {heatmapData.globalModelMean.toFixed(decimals)} {unit}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 font-mono tabular-nums text-xs">
            <span className="text-blue-700 font-bold">
              −{maxAbsDeviation.toFixed(decimals)} {unit}
            </span>
            <div
              className="w-40 h-2.5 rounded-xs border border-slate-300"
              style={{
                background:
                  'linear-gradient(to right, #1D4ED8 0%, #38BDF8 25%, #F8FAFC 50%, #F59E0B 75%, #B91C1C 100%)',
              }}
              aria-label="Diverging color scale from negative anomaly through global model mean to positive anomaly"
            />
            <span className="text-rose-700 font-bold">
              +{maxAbsDeviation.toFixed(decimals)} {unit}
            </span>
          </div>
        </div>
      )}

      {heatmapEnabled && overlayMode === 'gibs' && (
        <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-700">
          <div>
            <span className="font-bold text-slate-950">NASA GIBS Global Satellite Observation:</span>{' '}
            {variableName} ({endYear}) composited over NASA Blue Marble Shaded Relief & Bathymetry.
          </div>
          <span className="font-mono text-xs font-semibold text-slate-700">Source: NASA EOSDIS GIBS</span>
        </div>
      )}
    </div>
  );
};
