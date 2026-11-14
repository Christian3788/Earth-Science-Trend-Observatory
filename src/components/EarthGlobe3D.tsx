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
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(0, -0.095, 0.02);
  sat.add(lens);

  // 4. Twin Solar Array Wings + Mounting Booms
  const panelGeo = new THREE.BoxGeometry(0.24, 0.008, 0.09);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    metalness: 0.65,
    roughness: 0.18,
  });
  const boomGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.56, 8);
  boomGeo.rotateZ(Math.PI / 2);
  const boom = new THREE.Mesh(boomGeo, barrelMat);
  sat.add(boom);

  const leftWing = new THREE.Mesh(panelGeo, panelMat);
  leftWing.position.set(-0.2, 0, 0);
  sat.add(leftWing);

  const rightWing = new THREE.Mesh(panelGeo, panelMat);
  rightWing.position.set(0.2, 0, 0);
  sat.add(rightWing);

  // 5. High-Gain Dish Antenna
  const dishGeo = new THREE.ConeGeometry(0.036, 0.022, 16, 1, true);
  dishGeo.rotateX(Math.PI);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.4,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.set(0, 0.06, -0.03);
  sat.add(dish);

  // 6. Subtle Nadir Sensor Swath Cone
  const swathGeo = new THREE.ConeGeometry(0.18, 0.45, 24, 1, true);
  swathGeo.translate(0, -0.225, 0);
  const swathMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const swath = new THREE.Mesh(swathGeo, swathMat);
  swath.position.set(0, -0.08, 0.02);
  sat.add(swath);

  return sat;
}

function buildRegionMarker(colorHex: number): THREE.Group {
  const group = new THREE.Group();

  // Base Ring flush on globe
  const ringGeo = new THREE.RingGeometry(0.032, 0.052, 28);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.004;
  group.add(ring);

  // Vertical Telemetry Stem
  const stemGeo = new THREE.CylinderGeometry(0.009, 0.012, 0.22, 12);
  stemGeo.translate(0, 0.11, 0);
  const stemMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.35,
    metalness: 0.3,
    roughness: 0.35,
  });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  group.add(stem);

  // Beacon Crown Sphere
  const crownGeo = new THREE.SphereGeometry(0.028, 16, 16);
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: colorHex,
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.1,
  });
  const crown = new THREE.Mesh(crownGeo, crownMat);
  crown.position.y = 0.23;
  group.add(crown);

  return group;
}

export const EarthGlobe3D: React.FC<EarthGlobe3DProps> = ({
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
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [hoveredPreset, setHoveredPreset] = useState<PresetRegion | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showSatellite, setShowSatellite] = useState<boolean>(true);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Mutable refs so React prop changes update Three.js without re-creating renderer
  const callbacksRef = useRef({ onSelectCoordinate });
  callbacksRef.current = { onSelectCoordinate };

  const presetsRef = useRef(presets);
  presetsRef.current = presets;

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const showSatelliteRef = useRef(showSatellite);
  showSatelliteRef.current = showSatellite;

  // Shared state object synchronized from React props to Three.js scene
  const sceneSyncRef = useRef<{
    updateMarkers?: () => void;
    focusOnLatLon?: (lat: number, lon: number) => void;
    resetView?: () => void;
  }>({});

  const latestPropsRef = useRef({
    primaryLat,
    primaryLon,
    compareMode,
    compareLat,
    compareLon,
    activePresetId,
    comparePresetId,
  });
  latestPropsRef.current = {
    primaryLat,
    primaryLon,
    compareMode,
    compareLat,
    compareLon,
    activePresetId,
    comparePresetId,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Software-WebGL probe
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
      setWebglError('WebGL 3D rendering is unavailable in this browser context. Switch to 2D Map view.');
      return;
    }

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(320, container.clientHeight);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('3D WebGL context was interrupted. Switch to 2D Map or reload.');
    };
    const handleContextRestored = () => {
      setWebglError(null);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);

    // Mandatory studio environment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    // Start looking toward initial primary coordinate
    const initTarget = latLonToVec3(primaryLat, primaryLon, 5.15);
    camera.position.copy(initTarget);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 3.1;
    controls.maxDistance = 8.5;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;

    // Warm Sunlight Key + Cool Hemisphere Fill + Subtle Rim Backlight
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.35);
    keyLight.position.set(6, 4.5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-6, -2, -5);
    scene.add(rimLight);

    // Subtle 3D Starfield (Points)
    const starCount = 650;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 18 + Math.random() * 14;
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * Math.PI * 2;
      starPositions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      starPositions[i * 3 + 1] = r * Math.cos(theta);
      starPositions[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.065,
      transparent: true,
      opacity: 0.72,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Earth Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const { albedoMap, roughnessMap } = createEarthTextures(maxAniso);

    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 72, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: albedoMap,
      roughnessMap,
      roughness: 1.0,
      metalness: 0.06,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earthMesh);

    // Atmospheric Fresnel Rim Glow Shell
    const atmoGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.028, 64, 48);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x38bdf8) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
