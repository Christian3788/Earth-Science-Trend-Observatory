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
  variableId: string;
  variableName: string;
  endYear: number;
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
  variableId,
  variableName,
  endYear,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [hoveredPreset, setHoveredPreset] = useState<PresetRegion | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showSatellite, setShowSatellite] = useState<boolean>(true);
  const [showDataOverlay, setShowDataOverlay] = useState<boolean>(false);
  const [textureStatus, setTextureStatus] = useState<'loading' | 'nasa' | 'fallback'>('loading');
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
    updateGibsOverlay?: (enabled: boolean, varId: string, year: number) => void;
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
    const { albedoMap: fallbackAlbedo, roughnessMap } = createEarthTextures(maxAniso);
    let activeAlbedoMap: THREE.Texture = fallbackAlbedo;
    let activeBumpMap: THREE.Texture | null = null;
    let activeGibsMap: THREE.Texture | null = null;

    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 72, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: fallbackAlbedo,
      roughnessMap,
      roughness: 0.92,
      metalness: 0.05,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earthMesh);

    // Optional NASA GIBS Global Scientific Layer Sphere
    const gibsGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.006, 72, 48);
    const gibsMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      visible: false,
    });
    const gibsMesh = new THREE.Mesh(gibsGeo, gibsMat);
    gibsMesh.visible = false;
    globeGroup.add(gibsMesh);

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
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 3.2);
          gl_FragColor = vec4(glowColor, fresnel * 0.45);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    globeGroup.add(atmoMesh);

    // Subtle 3D Equatorial Orbital Grid Ring
    const eqRingGeo = new THREE.TorusGeometry(EARTH_RADIUS * 1.012, 0.0035, 8, 128);
    eqRingGeo.rotateX(Math.PI / 2);
    const eqRingMat = new THREE.MeshBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.35,
    });
    const eqRing = new THREE.Mesh(eqRingGeo, eqRingMat);
    globeGroup.add(eqRing);

    // Orbiting Earth-Observing Satellite + Track
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.z = THREE.MathUtils.degToRad(58); // Sun-synchronous inclined orbit
    orbitGroup.rotation.y = THREE.MathUtils.degToRad(25);
    scene.add(orbitGroup);

    const orbitRadius = EARTH_RADIUS + 0.56;
    const trackGeo = new THREE.TorusGeometry(orbitRadius, 0.0028, 8, 128);
    trackGeo.rotateX(Math.PI / 2);
    const trackMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
    });
    const orbitTrack = new THREE.Mesh(trackGeo, trackMat);
    orbitGroup.add(orbitTrack);

    const satellite = buildCompositeSatellite();
    orbitGroup.add(satellite);

    // Preset Hotspot Pins (clickable on 3D surface)
    const presetPinsGroup = new THREE.Group();
    globeGroup.add(presetPinsGroup);
    const presetPinMeshes: THREE.Mesh[] = [];
    const pinGeo = new THREE.SphereGeometry(0.036, 14, 14);

    for (const preset of presetsRef.current) {
      const pinMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        emissive: 0x1e293b,
        roughness: 0.35,
        metalness: 0.2,
      });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      latLonToVec3(preset.lat, preset.lon, EARTH_RADIUS + 0.022, pin.position);
      pin.userData.preset = preset;
      presetPinsGroup.add(pin);
      presetPinMeshes.push(pin);
    }

    // Primary & Compare 3D Markers
    const primaryMarker = buildRegionMarker(0x2563eb);
    const compareMarker = buildRegionMarker(0xd97706);
    globeGroup.add(primaryMarker);
    globeGroup.add(compareMarker);

    // Great-Circle Comparison Arc Mesh
    let arcMesh: THREE.Mesh | null = null;
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.78,
    });

    const orientMarker = (marker: THREE.Group, lat: number, lon: number) => {
      latLonToVec3(lat, lon, EARTH_RADIUS, marker.position);
      _vA.copy(marker.position).normalize();
      marker.quaternion.setFromUnitVectors(_up, _vA);
    };

    const updateMarkers = () => {
      const p = latestPropsRef.current;
      orientMarker(primaryMarker, p.primaryLat, p.primaryLon);
      compareMarker.visible = p.compareMode;

      if (arcMesh) {
        globeGroup.remove(arcMesh);
        arcMesh.geometry.dispose();
        arcMesh = null;
      }

      if (p.compareMode) {
        orientMarker(compareMarker, p.compareLat, p.compareLon);

        // Build elevated great-circle arc between Region A and Region B
        const startDir = latLonToVec3(p.primaryLat, p.primaryLon, 1, _vA.clone()).normalize();
        const endDir = latLonToVec3(p.compareLat, p.compareLon, 1, _vB.clone()).normalize();
        const angle = startDir.angleTo(endDir);
        const arcPoints: THREE.Vector3[] = [];
        const segments = 48;
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          // Spherical linear interpolation
          const pt = new THREE.Vector3().copy(startDir).lerp(endDir, t).normalize();
          const lift = Math.sin(t * Math.PI) * Math.min(0.65, 0.14 + angle * 0.22);
          pt.multiplyScalar(EARTH_RADIUS + 0.03 + lift);
          arcPoints.push(pt);
        }
        const curve = new THREE.CatmullRomCurve3(arcPoints);
        const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.0085, 8, false);
        arcMesh = new THREE.Mesh(tubeGeo, arcMat);
        globeGroup.add(arcMesh);
      }

      // Highlight active preset pins
      for (const pin of presetPinMeshes) {
        const preset = pin.userData.preset as PresetRegion;
        const mat = pin.material as THREE.MeshStandardMaterial;
        if (preset.id === p.activePresetId) {
          mat.color.setHex(0x3b82f6);
          mat.emissive.setHex(0x1d4ed8);
        } else if (p.compareMode && preset.id === p.comparePresetId) {
          mat.color.setHex(0xf59e0b);
          mat.emissive.setHex(0xb45309);
        } else {
          mat.color.setHex(0xe2e8f0);
          mat.emissive.setHex(0x334155);
        }
      }
    };

    updateMarkers();

    // Smooth camera focus animation state (cancels when user drags)
    let cameraFocusActive = false;
    const focusOnLatLon = (lat: number, lon: number) => {
      const dist = camera.position.length();
      latLonToVec3(lat, lon, Math.max(3.6, Math.min(6.2, dist)), _camTargetPos);
      cameraFocusActive = true;
    };

    const resetView = () => {
      const p = latestPropsRef.current;
      latLonToVec3(p.primaryLat, p.primaryLon, 5.15, _camTargetPos);
      cameraFocusActive = true;
    };

    controls.addEventListener('start', () => {
      cameraFocusActive = false;
    });

    let lastOverlayKey = '';
    const texLoader = new THREE.TextureLoader();

    const updateGibsOverlay = (enabled: boolean, varId: string, year: number) => {
      if (!enabled) {
        gibsMesh.visible = false;
        return;
      }
      const key = `${varId}:${year}`;
      if (key === lastOverlayKey && activeGibsMap) {
        gibsMesh.visible = true;
        return;
      }
      lastOverlayKey = key;
      texLoader.load(
        `/api/satellite/global-layer?variable=${encodeURIComponent(varId)}&year=${year}&month=7`,
        (tex) => {
          if (disposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = maxAniso;
          if (activeGibsMap) activeGibsMap.dispose();
          activeGibsMap = tex;
          gibsMat.map = tex;
          gibsMat.visible = true;
          gibsMat.needsUpdate = true;
          gibsMesh.visible = true;
        },
        undefined,
        () => {
          if (!disposed) gibsMesh.visible = false;
        },
      );
    };

    sceneSyncRef.current = {
      updateMarkers,
      focusOnLatLon,
      resetView,
      updateGibsOverlay,
    };

    // Raycasting for hover readout and click-to-select coordinate / preset
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let lastHoverTime = 0;

    const updatePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 40) return;
      lastHoverTime = now;

      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);

      const pinHits = raycaster.intersectObjects(presetPinMeshes, false);
      if (pinHits.length > 0) {
        const preset = pinHits[0].object.userData.preset as PresetRegion;
        setHoveredPreset(preset);
        setHoverCoords({ lat: preset.lat, lon: preset.lon });
        renderer.domElement.style.cursor = 'pointer';
        return;
      }

      setHoveredPreset(null);
      const earthHits = raycaster.intersectObject(earthMesh, false);
      if (earthHits.length > 0 && earthHits[0].uv) {
        const uv = earthHits[0].uv;
        const lon = Number((uv.x * 360 - 180).toFixed(2));
        const lat = Number((uv.y * 180 - 90).toFixed(2));
        setHoverCoords({ lat, lon });
        renderer.domElement.style.cursor = 'crosshair';
      } else {
        setHoverCoords(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const distSq = (e.clientX - downX) ** 2 + (e.clientY - downY) ** 2;
      if (distSq > 25) return; // Dragged globe, do not select coordinate

      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);

      const pinHits = raycaster.intersectObjects(presetPinMeshes, false);
      if (pinHits.length > 0) {
        const preset = pinHits[0].object.userData.preset as PresetRegion;
        callbacksRef.current.onSelectCoordinate(preset.lat, preset.lon, preset);
        return;
      }

      const earthHits = raycaster.intersectObject(earthMesh, false);
      if (earthHits.length > 0 && earthHits[0].uv) {
        const uv = earthHits[0].uv;
        const lon = Number((uv.x * 360 - 180).toFixed(2));
        const lat = Number((uv.y * 180 - 90).toFixed(2));
        callbacksRef.current.onSelectCoordinate(lat, lon);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ResizeObserver for crisp container responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(300, entry.contentRect.width);
        const h = Math.max(300, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation loop with Software-WebGL afterDraw pacing
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    let orbitAngle = 0.6;

    // Upgrade Earth surface to real NASA Blue Marble Shaded Relief & Bathymetry + ASTER GDEM relief
    texLoader.load(
      '/api/satellite/earth-texture?kind=shaded',
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        activeAlbedoMap = tex;
        earthMat.map = tex;
        earthMat.needsUpdate = true;
        fallbackAlbedo.dispose();
        setTextureStatus('nasa');
      },
      undefined,
      () => {
        if (!disposed) setTextureStatus('fallback');
      },
    );

    texLoader.load('/api/satellite/earth-texture?kind=relief', (bumpTex) => {
      if (disposed) {
        bumpTex.dispose();
        return;
      }
      bumpTex.anisotropy = maxAniso;
      activeBumpMap = bumpTex;
      earthMat.bumpMap = bumpTex;
      earthMat.bumpScale = 0.045;
      earthMat.needsUpdate = true;
    });

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(0.1, clock.getDelta());

      // Orbiting satellite kinematics
      orbitGroup.visible = showSatelliteRef.current;
      orbitTrack.visible = showSatelliteRef.current;
      if (showSatelliteRef.current) {
        orbitAngle += delta * 0.35;
        _satPos.set(Math.cos(orbitAngle) * orbitRadius, 0, Math.sin(orbitAngle) * orbitRadius);
        satellite.position.copy(_satPos);
        // Point nadir radiometer (-Y) toward Earth center (0,0,0)
        _vA.copy(_satPos).normalize();
        satellite.quaternion.setFromUnitVectors(_up, _vA);
      }

      // Smooth exponential camera glide toward newly chosen region
      if (cameraFocusActive) {
        const currentDist = camera.position.length();
        const targetDist = _camTargetPos.length();
        const nextDist = THREE.MathUtils.damp(currentDist, targetDist, 5.5, delta);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 5.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 5.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 5.5, delta);
        camera.position.normalize().multiplyScalar(nextDist);

        if (camera.position.distanceTo(_camTargetPos) < 0.04) {
          cameraFocusActive = false;
        }
      }

      controls.autoRotate = !isSoftwareGl && autoRotateRef.current && !cameraFocusActive;
      controls.autoRotateSpeed = 0.65;
      controls.update();

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });

      arcMat.dispose();
      fallbackAlbedo.dispose();
      if (activeAlbedoMap !== fallbackAlbedo) activeAlbedoMap.dispose();
      if (activeBumpMap) activeBumpMap.dispose();
      if (activeGibsMap) activeGibsMap.dispose();
      roughnessMap.dispose();
      envTex.dispose();
      renderer.forceContextLoss();
      renderer.dispose();
    };
  }, []);

  // Sync markers and smoothly orient camera when coordinates change
  useEffect(() => {
    sceneSyncRef.current.updateMarkers?.();
    const targetLat = compareMode && activeSelectionTarget === 'compare' ? compareLat : primaryLat;
    const targetLon = compareMode && activeSelectionTarget === 'compare' ? compareLon : primaryLon;
    sceneSyncRef.current.focusOnLatLon?.(targetLat, targetLon);
  }, [
    primaryLat,
    primaryLon,
    compareMode,
    compareLat,
    compareLon,
    activePresetId,
    comparePresetId,
    activeSelectionTarget,
  ]);

  useEffect(() => {
    sceneSyncRef.current.updateGibsOverlay?.(showDataOverlay, variableId, endYear);
  }, [showDataOverlay, variableId, endYear]);

  return (
    <div className="bg-slate-950 border border-slate-200 rounded-lg overflow-hidden">
      {/* Compact Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-950 tracking-tight">
            Interactive 3D Earth Observatory
          </span>
          <span className="text-xs font-medium text-slate-700 hidden sm:inline">
            Drag to orbit · Scroll to zoom · Click anywhere on Earth to sample
          </span>
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

          <div className="font-mono tabular-nums text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 rounded px-2.5 py-1 min-w-[160px] text-right">
            {hoverCoords
              ? formatCoord(hoverCoords.lat, hoverCoords.lon)
              : formatCoord(primaryLat, primaryLon)}
          </div>
        </div>
      </div>

      {/* 3D Canvas Stage */}
      <div className="relative w-full h-[380px] sm:h-[430px] bg-[#0b1220]">
        {webglError ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-100">
            {webglError}
          </div>
        ) : (
          <div ref={mountRef} className="w-full h-full" />
        )}

        {/* Active Region Readout HUD (Top-Left, solid surface, zero backdrop-blur) */}
        <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1.5">
          <div className="bg-slate-950/92 border border-slate-600 rounded px-3 py-1.5 text-xs text-white">
            <span className="text-sky-300 font-bold">
              {compareMode ? 'A · ' : ''}
              {primaryLabel}
            </span>
            <span className="font-mono tabular-nums text-slate-100 font-medium ml-2">
              {formatCoord(primaryLat, primaryLon)}
            </span>
          </div>
          {compareMode && (
            <div className="bg-slate-950/92 border border-slate-600 rounded px-3 py-1.5 text-xs text-white">
              <span className="text-amber-300 font-bold">B · {compareLabel}</span>
              <span className="font-mono tabular-nums text-slate-100 font-medium ml-2">
                {formatCoord(compareLat, compareLon)}
              </span>
            </div>
          )}
          <div className="bg-slate-950/90 border border-slate-700 rounded px-2.5 py-1 text-xs font-medium text-slate-100">
            {textureStatus === 'nasa'
              ? showDataOverlay
                ? `NASA Blue Marble + ${variableName} (${endYear})`
                : 'NASA Blue Marble Shaded Relief & Bathymetry'
              : textureStatus === 'loading'
              ? 'Loading NASA Blue Marble imagery...'
              : 'Vector Earth Basemap'}
          </div>
        </div>

        {/* Hovered Preset Info */}
        {hoveredPreset && (
          <div className="pointer-events-none absolute bottom-14 left-3 bg-slate-950/95 border border-slate-600 rounded-md px-3.5 py-2 max-w-xs text-white">
            <div className="text-sm font-bold">{hoveredPreset.name}</div>
            <div className="text-xs text-slate-200 mt-0.5">
              {hoveredPreset.biomeLabel} · {formatCoord(hoveredPreset.lat, hoveredPreset.lon)}
            </div>
          </div>
        )}

        {/* Compact Bottom Control Strip (Zero Viewport Center Occlusion) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-950/95 border border-slate-600 rounded-md px-2.5 py-1.5">
          <button
            type="button"
            onClick={() => setShowDataOverlay((v) => !v)}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showDataOverlay ? 'bg-amber-600 text-white' : 'text-slate-100 hover:text-white'
            }`}
          >
            Satellite Data Layer
          </button>

          <button
            type="button"
            onClick={() => setShowSatellite((s) => !s)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showSatellite ? 'bg-sky-500/25 text-sky-200' : 'text-slate-100 hover:text-white'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" />
            <span>Satellite Orbit</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoRotate((r) => !r)}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              autoRotate ? 'bg-blue-600 text-white' : 'text-slate-100 hover:text-white'
            }`}
          >
            Auto-Spin
          </button>

          <button
            type="button"
            onClick={() => sceneSyncRef.current.resetView?.()}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:text-white rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Focus Region</span>
          </button>
        </div>
      </div>
    </div>
  );
};
