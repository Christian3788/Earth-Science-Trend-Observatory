import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { TimeSeriesPoint } from '../utils/statistics';

interface TimeSeries3DSurfaceProps {
  points: TimeSeriesPoint[];
  variableName: string;
  unit: string;
  decimals: number;
  regionLabel: string;
  deseasonalize: boolean;
}

export const TimeSeries3DSurface: React.FC<TimeSeries3DSurfaceProps> = ({
  points,
  variableName,
  unit,
  decimals,
  regionLabel,
  deseasonalize,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Build Year x Month grid matrix (averaging multiple points per month when daily resolution is active)
  const gridData = useMemo(() => {
    const sumMap = new Map<number, number[]>();
    const countMap = new Map<number, number[]>();
    const monthTotals = new Array<number>(13).fill(0);
    const monthCounts = new Array<number>(13).fill(0);

    for (const pt of points) {
      monthTotals[pt.month] += pt.value;
      monthCounts[pt.month] += 1;
    }
    const monthMeans = monthTotals.map((s, m) => (monthCounts[m] > 0 ? s / monthCounts[m] : 0));

    for (const pt of points) {
      if (!sumMap.has(pt.year)) {
        sumMap.set(pt.year, new Array<number>(12).fill(0));
        countMap.set(pt.year, new Array<number>(12).fill(0));
      }
      const sums = sumMap.get(pt.year)!;
      const counts = countMap.get(pt.year)!;
      const val = deseasonalize ? pt.value - monthMeans[pt.month] : pt.value;
      sums[pt.month - 1] += val;
      counts[pt.month - 1] += 1;
    }

    const years = Array.from(sumMap.keys()).sort((a, b) => a - b);
    let minV = Infinity;
    let maxV = -Infinity;

    const matrix = years.map((yr) => {
      const sums = sumMap.get(yr)!;
      const counts = countMap.get(yr)!;
      return sums.map((s, idx) => {
        if (counts[idx] === 0) return NaN;
        const v = s / counts[idx];
        if (Number.isFinite(v)) {
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
        return v;
      });
    });

    if (!Number.isFinite(minV) || minV === maxV) {
      minV = 0;
      maxV = 1;
    }

    return { years, matrix, minV, maxV };
  }, [points, deseasonalize]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || gridData.years.length < 2) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('3D Surface rendering unavailable in this browser.');
      return;
    }

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(300, container.clientHeight);
