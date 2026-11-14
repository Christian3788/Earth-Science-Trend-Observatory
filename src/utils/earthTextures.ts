import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import countries110m from 'world-atlas/countries-110m.json';

const TEX_W = 2048;
const TEX_H = 1024;

function lonToPx(lon: number): number {
  return ((lon + 180) / 360) * TEX_W;
}

function latToPy(lat: number): number {
  return ((90 - lat) / 180) * TEX_H;
}

function traceRing(ctx: CanvasRenderingContext2D, ring: number[][]) {
  if (ring.length === 0) return;
  let prevLon = ring[0][0];
  ctx.moveTo(lonToPx(ring[0][0]), latToPy(ring[0][1]));
  for (let i = 1; i < ring.length; i++) {
    const [lon, lat] = ring[i];
    if (Math.abs(lon - prevLon) > 180) {
      ctx.moveTo(lonToPx(lon), latToPy(lat));
    } else {
      ctx.lineTo(lonToPx(lon), latToPy(lat));
    }
    prevLon = lon;
  }
  ctx.closePath();
}

export function createEarthTextures(maxAnisotropy: number): {
  albedoMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const topo = countries110m as unknown as Topology<{
    countries: GeometryCollection;
  }>;
  const geo = feature(topo, topo.objects.countries);

  // 1. Albedo Color Map (sRGB)
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = TEX_W;
  colorCanvas.height = TEX_H;
  const ctx = colorCanvas.getContext('2d')!;

  // Bathymetric ocean latitude gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, TEX_H);
  oceanGrad.addColorStop(0.0, '#1e3a5f'); // Arctic deep slate-blue
  oceanGrad.addColorStop(0.15, '#0f294a');
  oceanGrad.addColorStop(0.5, '#0b223d'); // Equatorial deep ocean
  oceanGrad.addColorStop(0.85, '#0f294a');
  oceanGrad.addColorStop(1.0, '#1e3a5f');
