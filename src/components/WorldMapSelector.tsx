import React, { useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import countries110m from 'world-atlas/countries-110m.json';
import { Layers, Loader2 } from 'lucide-react';
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
  variableName: string;
  unit: string;
  decimals: number;
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
