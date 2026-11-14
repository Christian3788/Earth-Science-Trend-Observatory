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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(5.4, 3.8, 5.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.2;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI * 0.48;

    const hemi = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.2);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(5, 8, 4);
    scene.add(dir);

    // Base grid platform
    const gridHelper = new THREE.GridHelper(6.4, 12, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = -0.02;
    scene.add(gridHelper);

    // Build 3D Surface Geometry (X = Year, Z = Month 1..12, Y = Value height)
    const { years, matrix, minV, maxV } = gridData;
    const rows = years.length;
    const cols = 12;
    const spanX = 5.2;
    const spanZ = 3.2;
    const maxH = 1.85;

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const cLow = new THREE.Color(0x1d4ed8);
    const cMid = new THREE.Color(0x0ea5e9);
    const cHigh = new THREE.Color(0xd97706);
    const tmpCol = new THREE.Color();

    for (let r = 0; r < rows; r++) {
      const x = -spanX / 2 + (r / Math.max(1, rows - 1)) * spanX;
      for (let c = 0; c < cols; c++) {
        const z = -spanZ / 2 + (c / (cols - 1)) * spanZ;
        const raw = matrix[r][c];
        const norm = Number.isFinite(raw) ? (raw - minV) / (maxV - minV) : 0;
        const y = 0.06 + norm * maxH;
        positions.push(x, y, z);

        if (norm < 0.5) {
          tmpCol.copy(cLow).lerp(cMid, norm * 2);
        } else {
          tmpCol.copy(cMid).lerp(cHigh, (norm - 0.5) * 2);
        }
        colors.push(tmpCol.r, tmpCol.g, tmpCol.b);
      }
    }

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c;
        const b = (r + 1) * cols + c;
        const d = (r + 1) * cols + (c + 1);
        const e = r * cols + (c + 1);
        indices.push(a, b, e);
        indices.push(b, d, e);
      }
    }

    const surfGeo = new THREE.BufferGeometry();
    surfGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    surfGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    surfGeo.setIndex(indices);
    surfGeo.computeVertexNormals();

    const surfMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.48,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const surfMesh = new THREE.Mesh(surfGeo, surfMat);
    scene.add(surfMesh);

    // Subtle wireframe overlay for scientific precision
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });
    const wireMesh = new THREE.Mesh(surfGeo, wireMat);
    wireMesh.position.y = 0.002;
    scene.add(wireMesh);

    // Coalesced on-demand rendering
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

