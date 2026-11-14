import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCcw, Orbit } from 'lucide-react';
import type { PresetRegion } from '../data/earthCatalog';
import { createEarthTextures } from '../utils/earthTextures';

interface EarthGlobe3DProps {
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
  slopeDirection?: 'up' | 'down' | 'neutral';
}

const EARTH_RADIUS = 2.0;

// Exact inverse of Three.js SphereGeometry UV mapping:
// u = (lon + 180) / 360 -> phi = u * 2 * PI
// v = (lat + 90) / 180  -> theta = (1 - v) * PI
function latLonToVec3(lat: number, lon: number, radius: number, out = new THREE.Vector3()): THREE.Vector3 {
  const u = (lon + 180) / 360;
  const v = (lat + 90) / 180;
  const phi = u * Math.PI * 2;
  const theta = (1 - v) * Math.PI;
  const sinTheta = Math.sin(theta);

  out.set(
    -radius * Math.cos(phi) * sinTheta,
    radius * Math.cos(theta),
    radius * Math.sin(phi) * sinTheta,
  );
  return out;
}

function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

// Reusable scratch vectors outside animation loop (zero GC)
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _camTargetPos = new THREE.Vector3();
const _satPos = new THREE.Vector3();

function buildCompositeSatellite(): THREE.Group {
  const sat = new THREE.Group();

  // 1. Central Spacecraft Bus (Brushed Aluminum)
  const busGeo = new THREE.BoxGeometry(0.11, 0.08, 0.14);
  const busMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    metalness: 0.78,
    roughness: 0.28,
  });
  const bus = new THREE.Mesh(busGeo, busMat);
  sat.add(bus);

  // 2. Gold MLI Thermal Foil Shield
  const foilGeo = new THREE.BoxGeometry(0.115, 0.055, 0.085);
  const foilMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.9,
    roughness: 0.22,
  });
  const foil = new THREE.Mesh(foilGeo, foilMat);
  foil.position.set(0, 0.01, -0.01);
  sat.add(foil);

  // 3. Nadir Radiometer Optical Barrel + Lens
  const barrelGeo = new THREE.CylinderGeometry(0.028, 0.036, 0.06, 16);
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.55,
    roughness: 0.45,
  });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.position.set(0, -0.065, 0.02);
  sat.add(barrel);

  const lensGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.01, 16);
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.55,
    metalness: 0.2,
    roughness: 0.1,
  });
