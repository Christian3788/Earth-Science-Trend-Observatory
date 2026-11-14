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
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Subtle lat/lon graticule over oceans
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 1;
  for (let lon = -150; lon <= 150; lon += 30) {
    const x = lonToPx(lon);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TEX_H);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = latToPy(lat);
    ctx.beginPath();
    if (lat === 0) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.34)';
      ctx.setLineDash([8, 6]);
    } else {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.setLineDash([]);
    }
    ctx.moveTo(0, y);
    ctx.lineTo(TEX_W, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Biome-tinted landmass fill gradient
  const landGrad = ctx.createLinearGradient(0, 0, 0, TEX_H);
  landGrad.addColorStop(0.0, '#e2e8f0');  // High Arctic ice/snow
  landGrad.addColorStop(0.11, '#cbd5e1'); // Tundra transition
  landGrad.addColorStop(0.24, '#476b59'); // Boreal forest
  landGrad.addColorStop(0.36, '#7a8c66'); // Temperate/arid belt
  landGrad.addColorStop(0.45, '#9d8f68'); // Subtropical desert belt
  landGrad.addColorStop(0.50, '#2e6b4f'); // Equatorial rainforest
  landGrad.addColorStop(0.58, '#8a8662'); // Southern subtropics
  landGrad.addColorStop(0.76, '#58725a'); // Southern temperate
  landGrad.addColorStop(0.88, '#cbd5e1'); // Antarctic coast
  landGrad.addColorStop(1.0, '#f1f5f9');  // Antarctic ice sheet

  // 2. Roughness Map (linear: ocean = shiny ~0.30, land = matte ~0.82)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = TEX_W;
  roughCanvas.height = TEX_H;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#4d4d4d'; // ~0.30 roughness for ocean water
  rCtx.fillRect(0, 0, TEX_W, TEX_H);

  // Draw landmasses on both Albedo and Roughness canvases
  const drawCountries = (targetCtx: CanvasRenderingContext2D, fill: string | CanvasGradient, stroke: string) => {
    targetCtx.fillStyle = fill;
    targetCtx.strokeStyle = stroke;
