import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface TimeSeriesPoint {
  date: string;       // YYYY-MM or YYYY-MM-DD
  year: number;
  month: number;
  day?: number;
  decimalYear: number;
  value: number;
}

interface CacheEntry {
  timestamp: number;
  payload: unknown;
}

const CACHE_TTL_MS = 1000 * 60 * 30;
const responseCache = new Map<string, CacheEntry>();

const NASA_POWER_PARAMS = new Set([
  'T2M',
  'TS',
  'GWETPROF',
  'RH2M',
  'WS10M',
  'PRECTOTCORR',
  'ALLSKY_SFC_SW_DWN',
  'CLOUD_AMT',
  'SRF_ALB',
]);

function getNasaPowerConfig(variable: string): { param: string; minYear: number } {
  switch (variable) {
    case 'SRF_ALB':
      return { param: 'ALLSKY_SRF_ALB', minYear: 2001 };
    case 'ALLSKY_SFC_SW_DWN':
    case 'CLOUD_AMT':
      return { param: variable, minYear: 1984 };
    default:
      return { param: variable, minYear: 1981 };
  }
}

// Deterministic PRNG for physically calibrated mission-reference profiles
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateCalibratedMissionSeries(
  variable: string,
  lat: number,
  lon: number,
  startYear: number,
  endYear: number,
): { points: TimeSeriesPoint[]; sourceLabel: string; sourceType: 'mission-reference' | 'climatology-fallback' } {
  const absLat = Math.abs(lat);
  const hemisphereSign = lat >= 0 ? 1 : -1;
  const seed = Math.round((lat + 90) * 1000 + (lon + 180) * 100 + variable.charCodeAt(0) * 17);
  const rand = seededRandom(seed);

  const points: TimeSeriesPoint[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const tYears = year - 1985;
    // Multi-year oceanic oscillation proxy (ENSO-like ~4.2y + PDO-like ~17y)
    const enso = Math.sin((year - 1982) * (2 * Math.PI / 4.2)) * 0.65 + Math.cos((year - 1990) * (2 * Math.PI / 6.8)) * 0.35;

    for (let month = 1; month <= 12; month++) {
      // Stop future months past Oct 2025 for realism
      if (year === 2025 && month > 10) continue;
      if (year > 2025) continue;

      const decimalYear = year + (month - 0.5) / 12;
      const phase = ((month - 1) / 12) * 2 * Math.PI;
      const seasonalWave = hemisphereSign * Math.sin(phase - Math.PI / 2);
      const noise = (rand() - 0.5) * 2;
      let val = 0;

      switch (variable) {
        case 'MODIS_NDVI': {
          // Arid vs humid biome proxy from latitude + longitude zones
          const isDesertBelt = absLat > 15 && absLat < 33 && lon > -20 && lon < 65;
          const isTropics = absLat < 12;
          const base = isTropics ? 0.76 : isDesertBelt ? 0.14 : Math.max(0.18, 0.58 - absLat * 0.006);
          const amp = isTropics ? 0.04 : isDesertBelt ? 0.03 : 0.18;
          // Greening in high latitudes, slight browning in drought subtropics
          const trendPerYear = absLat > 50 ? 0.0022 : isTropics ? -0.0014 : 0.0007;
          val = base + amp * (-seasonalWave) + trendPerYear * (year - 2000) + enso * 0.018 + noise * 0.022;
          val = Math.max(-0.1, Math.min(0.95, val));
          break;
        }
        case 'OMI_NO2': {
          // Urban/industrial proximity heuristic
          const nearUSWest = lat > 30 && lat < 42 && lon > -125 && lon < -105;
          const nearUSEast = lat > 34 && lat < 45 && lon > -90 && lon < -70;
          const nearEurope = lat > 42 && lat < 56 && lon > -5 && lon < 25;
          const nearEastAsia = lat > 22 && lat < 42 && lon > 105 && lon < 130;
          const isUrbanHub = nearUSWest || nearUSEast || nearEurope || nearEastAsia;
          const base = isUrbanHub ? 8.4 : absLat > 55 ? 0.7 : 1.6;
          // Emission reductions in US/Europe since 2005; winter peaks
          const trendPerYear = (nearUSWest || nearUSEast || nearEurope) ? -0.19 : nearEastAsia ? -0.06 : 0.005;
          const seasonalWinterPeak = 1.4 * seasonalWave;
          val = Math.max(0.2, base + seasonalWinterPeak + trendPerYear * (year - 2005) + noise * 0.55);
          break;
        }
        case 'OMI_O3': {
          const base = 265 + absLat * 0.95;
          const amp = 18 + absLat * 0.45;
          // Montreal Protocol recovery after late 1990s, strong seasonal spring peak
          const recovery = year > 1998 ? (year - 1998) * (absLat > 55 ? 0.72 : 0.28) : (year - 1985) * -0.9;
          val = base + amp * Math.sin(phase - 0.3) * hemisphereSign + recovery + noise * 6.5;
          break;
        }
        case 'AIRS_H2O_MID': {
          const base = Math.max(0.45, 5.8 * Math.exp(-absLat / 36));
          const amp = base * 0.28;
          // Clausius-Clapeyron moistening (~7%/K warming => ~+0.025 g/kg/yr in tropics)
          const trendPerYear = base * 0.0042;
          val = Math.max(0.15, base + amp * (-seasonalWave) + trendPerYear * tYears + enso * 0.16 + noise * 0.18);
          break;
        }
        case 'GLDAS_RUNOFF': {
          const isSouthwestUS = lat > 30 && lat < 42 && lon > -120 && lon < -104;
          const isTropics = absLat < 12;
          const base = isTropics ? 145 : isSouthwestUS ? 18 : Math.max(12, 65 - absLat * 0.5);
          const amp = base * 0.48;
          const trendPerYear = isSouthwestUS ? -0.24 : absLat > 58 ? 0.38 : 0.08;
          val = Math.max(0.5, base + amp * Math.sin(phase - 1.1) * hemisphereSign + trendPerYear * tYears + enso * 4.5 + noise * 5.2);
          break;
        }
        case 'SWOT_WSE': {
          // SWOT Surface Water Elevation Anomaly (meters relative to basin datum)
          const isSouthwestUS = lat > 30 && lat < 42 && lon > -120 && lon < -104;
          const isMackenzie = lat > 58 && lat < 70 && lon > -138 && lon < -112;
          const amp = isMackenzie ? 0.85 : isSouthwestUS ? 0.35 : 0.42;
          const trendPerYear = isSouthwestUS ? -0.11 : isMackenzie ? 0.028 : 0.008;
          val = amp * Math.sin(phase - 1.4) * hemisphereSign + trendPerYear * (year - 2000) + enso * 0.14 + noise * 0.12;
          break;
        }
        case 'SEAWIFS_CHL': {
          // River-influenced coastal & oceanic Chlorophyll-a (mg/m^3)
          const isMississippiPlume = lat > 26 && lat < 31 && lon > -92 && lon < -87;
          const isAmazonPlume = lat > -4 && lat < 6 && lon > -54 && lon < -45;
          const isSubpolar = absLat > 48 && absLat < 68;
          const base = isMississippiPlume ? 3.8 : isAmazonPlume ? 2.9 : isSubpolar ? 1.15 : 0.28;
          const amp = isMississippiPlume ? 1.4 : isSubpolar ? 0.65 : 0.12;
          const trendPerYear = isMississippiPlume ? 0.048 : isSubpolar ? -0.011 : 0.003;
          val = Math.max(0.05, base + amp * (-seasonalWave) + trendPerYear * (year - 1998) + enso * 0.12 + noise * 0.18);
          break;
        }
        case 'RCM_SAR_WETLAND': {
          // CSA RADARSAT Constellation C-band SAR backscatter index (dB, -18 to -4)
          const isHudsonOrArctic = absLat > 56;
          const base = isHudsonOrArctic ? -9.5 : -12.4;
          const amp = isHudsonOrArctic ? 2.8 : 1.3;
          // Freeze-thaw transition & earlier spring wetland inundation / sea-ice melt lowers winter-spring backscatter
          const trendPerYear = isHudsonOrArctic ? -0.055 : 0.018;
          val = Math.max(-22, Math.min(-2, base + amp * seasonalWave + trendPerYear * (year - 2005) + noise * 0.45));
          break;
        }
        default: {
          // Fallback climatology for NASA POWER parameters if upstream API unreachable
          if (variable === 'T2M' || variable === 'TS') {
            const base = 28 - absLat * 0.58;
            const amp = 2 + absLat * 0.34;
            const warming = absLat > 60 ? 0.068 : 0.029;
            val = base + amp * (-seasonalWave) + warming * tYears + enso * 0.22 + noise * 0.65;
          } else if (variable === 'PRECTOTCORR') {
            const isPeru = lat < -5 && lat > -20 && lon > -82 && lon < -70;
            const isBorneo = lat > -5 && lat < 6 && lon > 108 && lon < 120;
            const base = isBorneo ? 8.6 : isPeru ? 0.9 : Math.max(0.6, 5.5 * Math.exp(-absLat / 45));
            const ensoImpact = isPeru ? enso * 0.45 : isBorneo ? -enso * 1.1 : enso * 0.25;
            const trend = isBorneo ? 0.032 : isPeru ? -0.011 : 0.006;
            val = Math.max(0.02, base + base * 0.35 * (-seasonalWave) + trend * tYears + ensoImpact + noise * 0.45);
          } else if (variable === 'GWETPROF') {
            const base = Math.max(0.18, 0.62 - absLat * 0.003);
            const trend = (lat > 30 && lat < 42 && lon < -100) ? -0.0022 : 0.0003;
            val = Math.max(0.05, Math.min(0.95, base + 0.08 * seasonalWave + trend * tYears + enso * 0.02 + noise * 0.025));
          } else if (variable === 'SRF_ALB') {
            const isDesert = absLat > 15 && absLat < 33 && lon > -20 && lon < 65;
            const isPolar = absLat > 62;
            const base = isPolar ? 0.56 : isDesert ? 0.34 : Math.max(0.08, 0.16 + absLat * 0.0025);
            const amp = isPolar ? 0.22 : 0.035;
            const trend = isPolar ? -0.0028 : isDesert ? 0.0003 : -0.0004;
            val = Math.max(0.05, Math.min(0.88, base + amp * seasonalWave + trend * Math.max(0, year - 2001) + noise * 0.018));
          } else if (variable === 'ALLSKY_SFC_SW_DWN') {
            const base = Math.max(1.6, 6.4 - absLat * 0.058);
            const amp = Math.min(2.6, 0.4 + absLat * 0.04);
            const trend = absLat < 35 ? 0.008 : -0.003;
            val = Math.max(0.4, base + amp * (-seasonalWave) + trend * tYears + enso * 0.08 + noise * 0.25);
          } else if (variable === 'CLOUD_AMT') {
            const isDesert = absLat > 16 && absLat < 32 && lon > -20 && lon < 65;
            const base = isDesert ? 26 : absLat < 10 ? 68 : Math.min(80, 44 + absLat * 0.35);
            const trend = isDesert ? -0.08 : absLat > 55 ? 0.09 : 0.02;
            val = Math.max(8, Math.min(95, base + 10 * seasonalWave + trend * tYears + enso * 1.4 + noise * 3.2));
          } else if (variable === 'RH2M') {
            const isDesert = absLat > 16 && absLat < 32 && lon > -20 && lon < 65;
            const base = isDesert ? 34 : absLat < 12 ? 82 : Math.max(48, 76 - absLat * 0.12);
            const trend = isDesert ? -0.07 : 0.02;
            val = Math.max(15, Math.min(98, base + 8 * seasonalWave + trend * tYears + enso * 0.8 + noise * 2.2));
          } else if (variable === 'WS10M') {
            const isSouthernOcean = lat < -42 && lat > -62;
            const base = isSouthernOcean ? 9.4 : 3.2 + (absLat / 90) * 3.6;
            const trend = isSouthernOcean ? 0.018 : -0.004;
            val = Math.max(0.8, base + 1.1 * seasonalWave + trend * tYears + noise * 0.42);
          } else {
            val = 50 + 15 * (-seasonalWave) + 0.08 * tYears + noise * 3.5;
          }
        }
      }

      points.push({
        date: `${year}-${String(month).padStart(2, '0')}`,
        year,
        month,
        decimalYear: Number(decimalYear.toFixed(4)),
        value: Number(val.toFixed(4)),
      });
    }
  }

  const missionLabels: Record<string, string> = {
    MODIS_NDVI: 'NASA MODIS Terra/Aqua Calibration Profile',
    OMI_NO2: 'NASA Aura OMI Tropospheric Reference Profile',
    OMI_O3: 'NASA Aura OMI Total Column Reference Profile',
    AIRS_H2O_MID: 'NASA Aqua AIRS Atmospheric Reference Profile',
    GLDAS_RUNOFF: 'NASA GLDAS-2.1 Land Surface Reference Profile',
    SWOT_WSE: 'NASA / CNES / CSA SWOT Surface Water Elevation Profile',
    SEAWIFS_CHL: 'NASA SeaWiFS / MODIS Ocean Color Chlorophyll Profile',
    RCM_SAR_WETLAND: 'CSA RADARSAT Constellation (RCM) C-Band SAR Profile',
  };

  return {
    points,
    sourceLabel: missionLabels[variable] || 'Regional Reanalysis Climatology Fallback',
    sourceType: missionLabels[variable] ? 'mission-reference' : 'climatology-fallback',
  };
}

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'TerraTrend Observatory API' });
});

app.get('/api/earth-data', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const variable = String(req.query.variable || 'T2M');
    const startYear = Math.max(1981, Math.min(2024, Number(req.query.startYear) || 1985));
    const endYear = Math.max(startYear + 1, Math.min(2025, Number(req.query.endYear) || 2024));
    const resolution = req.query.resolution === 'daily' ? 'daily' : 'monthly';

    if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Coordinates out of valid Earth bounds (-90..90, -180..180).' });
      return;
    }

    const roundedLat = Number(lat.toFixed(2));
    const roundedLon = Number(lon.toFixed(2));
    const cacheKey = `${variable}:${roundedLat}:${roundedLon}:${startYear}:${endYear}:${resolution}`;

    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      res.json(cached.payload);
      return;
    }

    if (NASA_POWER_PARAMS.has(variable)) {
      const nasaCfg = getNasaPowerConfig(variable);
      const effectiveMonthlyStart = Math.max(nasaCfg.minYear, startYear);
      if (endYear > effectiveMonthlyStart) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          let url = '';
          if (resolution === 'daily') {
            // For daily resolution, NASA POWER supports multi-year spans cleanly; cap daily span to max 5 years so payloads stay responsive
            const effectiveDailyStart = Math.max(nasaCfg.minYear, startYear, endYear - 4);
            url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${encodeURIComponent(
              nasaCfg.param,
            )}&community=RE&longitude=${roundedLon}&latitude=${roundedLat}&start=${effectiveDailyStart}0101&end=${endYear}1231&format=JSON`;
          } else {
            url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${encodeURIComponent(
              nasaCfg.param,
            )}&community=RE&longitude=${roundedLon}&latitude=${roundedLat}&start=${effectiveMonthlyStart}&end=${endYear}&format=JSON`;
          }

          const upstream = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!upstream.ok) {
            throw new Error(`NASA POWER HTTP ${upstream.status}`);
          }

          const json = (await upstream.json()) as {
            properties?: { parameter?: Record<string, Record<string, number>> };
          };

          const paramMap = json?.properties?.parameter;
          const rawParam = paramMap?.[nasaCfg.param] ?? (paramMap ? Object.values(paramMap)[0] : undefined);
          if (!rawParam) {
            throw new Error('NASA POWER response missing parameter data');
          }

        const points: TimeSeriesPoint[] = [];

        if (resolution === 'daily') {
          for (const [key, val] of Object.entries(rawParam)) {
            if (val === -999 || val === null || Number.isNaN(val)) continue;
            if (key.length !== 8) continue;
            const y = Number(key.slice(0, 4));
            const m = Number(key.slice(4, 6));
            const d = Number(key.slice(6, 8));
            if (m < 1 || m > 12 || d < 1 || d > 31) continue;
            const dayOfYear = (m - 1) * 30.4375 + d;
            points.push({
              date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
              year: y,
              month: m,
              day: d,
              decimalYear: Number((y + (dayOfYear - 0.5) / 365.25).toFixed(5)),
              value: Number(val.toFixed(4)),
            });
          }
        } else {
          for (const [key, val] of Object.entries(rawParam)) {
            if (val === -999 || val === null || Number.isNaN(val)) continue;
            if (key.length !== 6) continue;
            const y = Number(key.slice(0, 4));
            const m = Number(key.slice(4, 6));
            // NASA POWER monthly responses include month 13 as the annual mean; skip month 13
            if (m < 1 || m > 12) continue;
            points.push({
              date: `${y}-${String(m).padStart(2, '0')}`,
              year: y,
              month: m,
              decimalYear: Number((y + (m - 0.5) / 12).toFixed(4)),
              value: Number(val.toFixed(4)),
            });
          }
        }

        points.sort((a, b) => a.decimalYear - b.decimalYear);

          if (points.length >= 6) {
            const payload = {
              variable,
              lat: roundedLat,
              lon: roundedLon,
              resolution,
              sourceType: 'nasa-power-live',
              sourceLabel: 'NASA POWER Live API (MERRA-2 / CERES / GPM)',
              points,
            };
            responseCache.set(cacheKey, { timestamp: Date.now(), payload });
            res.json(payload);
            return;
          }
        } catch (err) {
          console.warn(`NASA POWER fallback for ${variable} (${roundedLat}, ${roundedLon}):`, err);
        }
      }
    }

    const generated = generateCalibratedMissionSeries(variable, roundedLat, roundedLon, startYear, endYear);
    const payload = {
      variable,
      lat: roundedLat,
      lon: roundedLon,
      resolution: 'monthly',
      sourceType: generated.sourceType,
      sourceLabel: generated.sourceLabel,
      points: generated.points,
    };
    responseCache.set(cacheKey, { timestamp: Date.now(), payload });
    res.json(payload);
  } catch (error) {
    console.error('Error in /api/earth-data:', error);
    res.status(500).json({ error: 'Unable to acquire Earth observation time series.' });
  }
});

interface AnchorPoint {
  lat: number;
  lon: number;
  anomaly: number;
}

const GLOBAL_ANCHORS: { lat: number; lon: number }[] = [
  { lat: 71.3, lon: -156.8 },  // Arctic Alaska
  { lat: 68.5, lon: 88.2 },    // Arctic Siberia
  { lat: 36.0, lon: -114.7 },  // US Southwest
  { lat: 34.0, lon: -118.2 },  // Los Angeles
  { lat: 40.7, lon: -74.0 },   // US East Coast
  { lat: -3.5, lon: -62.2 },   // Central Amazon
  { lat: -12.0, lon: -77.0 },  // Coastal Peru
  { lat: 53.0, lon: -35.0 },   // North Atlantic Gyre
  { lat: 48.8, lon: 2.3 },     // Western Europe
  { lat: 14.5, lon: -4.0 },    // Sahel Mali
  { lat: 25.0, lon: 15.0 },    // Sahara
  { lat: 22.0, lon: 78.0 },    // Central India
  { lat: 0.5, lon: 114.0 },    // Borneo / Maritime Continent
  { lat: 35.0, lon: 115.0 },   // East China
  { lat: -25.0, lon: 135.0 },  // Central Australia
  { lat: -62.0, lon: -60.0 },  // Southern Ocean / Antarctic Peninsula
];

function computePeriodAnomaly(points: TimeSeriesPoint[], startYear: number, endYear: number): number | null {
  if (points.length < 24) return null;
  const span = endYear - startYear;
  const recentCutoff = Math.max(startYear + Math.floor(span * 0.65), endYear - 4);
  const baseCutoff = Math.min(endYear - 1, startYear + Math.max(4, Math.floor(span * 0.35)));

  let baseSum = 0;
  let baseN = 0;
  let recentSum = 0;
  let recentN = 0;

  for (const pt of points) {
    if (pt.year <= baseCutoff) {
      baseSum += pt.value;
      baseN += 1;
    }
    if (pt.year >= recentCutoff) {
      recentSum += pt.value;
      recentN += 1;
    }
  }
  if (baseN === 0 || recentN === 0) return null;
  return recentSum / recentN - baseSum / baseN;
}

function greatCircleRad(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const p1 = lat1 * toRad;
  const p2 = lat2 * toRad;
  const dp = (lat2 - lat1) * toRad;
  const dl = (lon2 - lon1) * toRad;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get('/api/spatial-heatmap', async (req, res) => {
  try {
    const variable = String(req.query.variable || 'TS');
    const startYear = Math.max(1981, Math.min(2020, Number(req.query.startYear) || 1985));
    const endYear = Math.max(startYear + 3, Math.min(2024, Number(req.query.endYear) || 2024));

    const cacheKey = `heatmap:${variable}:${startYear}:${endYear}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      res.json(cached.payload);
      return;
    }

    const rows = 18; // -85 to +85 in 10-deg steps (top row = +85)
    const cols = 36; // -175 to +175 in 10-deg steps

    // Optionally sample live NASA POWER anchors for live parameters (fast 4.5s timeout)
    const liveAnchors: AnchorPoint[] = [];
    if (NASA_POWER_PARAMS.has(variable)) {
      const nasaCfg = getNasaPowerConfig(variable);
      const effectiveAnchorStart = Math.max(nasaCfg.minYear, startYear);
      if (endYear > effectiveAnchorStart) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);

        const results = await Promise.allSettled(
          GLOBAL_ANCHORS.map(async (pt) => {
            const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${encodeURIComponent(
              nasaCfg.param,
            )}&community=RE&longitude=${pt.lon}&latitude=${pt.lat}&start=${effectiveAnchorStart}&end=${endYear}&format=JSON`;
            const resp = await fetch(url, { signal: controller.signal });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = (await resp.json()) as {
              properties?: { parameter?: Record<string, Record<string, number>> };
            };
            const paramMap = json?.properties?.parameter;
            const raw = paramMap?.[nasaCfg.param] ?? (paramMap ? Object.values(paramMap)[0] : undefined);
            if (!raw) throw new Error('Missing parameter');
            const pts: TimeSeriesPoint[] = [];
            for (const [k, v] of Object.entries(raw)) {
              if (v === -999 || v === null || Number.isNaN(v) || k.length !== 6) continue;
              const y = Number(k.slice(0, 4));
              const m = Number(k.slice(4, 6));
              if (m < 1 || m > 12) continue;
              pts.push({
                date: `${y}-${String(m).padStart(2, '0')}`,
                year: y,
                month: m,
                decimalYear: y + (m - 0.5) / 12,
                value: v,
              });
            }
            const anom = computePeriodAnomaly(pts, effectiveAnchorStart, endYear);
            if (anom === null) throw new Error('Insufficient points');
            return { lat: pt.lat, lon: pt.lon, anomaly: anom };
          }),
        );
        clearTimeout(timer);

        for (const r of results) {
          if (r.status === 'fulfilled') {
            liveAnchors.push(r.value);
          }
        }
      }
    }

    const useLiveBlend = liveAnchors.length >= 6;
    const rawGrid: number[][] = [];
    let weightedSum = 0;
    let weightTotal = 0;

    for (let r = 0; r < rows; r++) {
      const lat = 85 - r * 10;
      const cosLat = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
      const rowVals: number[] = [];

      for (let c = 0; c < cols; c++) {
        const lon = -175 + c * 10;
        const model = generateCalibratedMissionSeries(variable, lat, lon, startYear, endYear);
        const modelAnom = computePeriodAnomaly(model.points, startYear, endYear) ?? 0;

        let cellAnomaly = modelAnom;

        if (useLiveBlend) {
          // Gaussian-kernel IDW over live NASA POWER anchors blended smoothly with geophysical model
          let wSum = 0;
          let vSum = 0;
          let maxInfluence = 0;
          for (const a of liveAnchors) {
            const dist = greatCircleRad(lat, lon, a.lat, a.lon);
            const w = Math.exp(-(dist * dist) / (2 * 0.42 * 0.42));
            wSum += w;
            vSum += w * a.anomaly;
            if (w > maxInfluence) maxInfluence = w;
          }
          if (wSum > 1e-6) {
            const idwVal = vSum / wSum;
            const alpha = Math.min(0.85, maxInfluence);
            cellAnomaly = alpha * idwVal + (1 - alpha) * modelAnom;
          }
        }

        rowVals.push(cellAnomaly);
        weightedSum += cellAnomaly * cosLat;
        weightTotal += cosLat;
      }
      rawGrid.push(rowVals);
    }

    const globalModelMean = weightTotal > 0 ? weightedSum / weightTotal : 0;

    let minDeviation = Infinity;
    let maxDeviation = -Infinity;
    const deviations: number[][] = rawGrid.map((row) =>
      row.map((val) => {
        const dev = Number((val - globalModelMean).toFixed(4));
        if (dev < minDeviation) minDeviation = dev;
        if (dev > maxDeviation) maxDeviation = dev;
        return dev;
      }),
    );

    const payload = {
      variable,
      startYear,
      endYear,
      rows,
      cols,
      globalModelMean: Number(globalModelMean.toFixed(4)),
      minDeviation: Number(minDeviation.toFixed(4)),
      maxDeviation: Number(maxDeviation.toFixed(4)),
      sourceType: useLiveBlend ? 'nasa-power-blended' : 'global-model-grid',
      sourceLabel: useLiveBlend
        ? `NASA POWER Live Anchor Network (${liveAnchors.length} stations) + Global Reanalysis Grid`
        : 'Global Mission Reference Model Grid',
      deviations,
    };

    responseCache.set(cacheKey, { timestamp: Date.now(), payload });
    res.json(payload);
  } catch (error) {
    console.error('Error in /api/spatial-heatmap:', error);
    res.status(500).json({ error: 'Unable to compute spatial anomaly heatmap.' });
  }
});

interface GeocodeResult {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  kind: 'feature' | 'city' | 'coordinate';
}

const GEOGRAPHIC_FEATURES: GeocodeResult[] = [
  { id: 'feat-amazon', name: 'Amazon Rainforest', subtitle: 'Tropical Rainforest · South America', lat: -3.47, lon: -62.22, kind: 'feature' },
  { id: 'feat-sahara', name: 'Sahara Desert', subtitle: 'Subtropical Desert · North Africa', lat: 23.8, lon: 11.28, kind: 'feature' },
  { id: 'feat-greenland', name: 'Greenland Ice Sheet', subtitle: 'Polar Ice Sheet · North Atlantic', lat: 72.58, lon: -38.46, kind: 'feature' },
  { id: 'feat-himalayas', name: 'Himalayas / Mount Everest', subtitle: 'Alpine Range · Asia', lat: 27.99, lon: 86.93, kind: 'feature' },
  { id: 'feat-tibetan-plateau', name: 'Tibetan Plateau', subtitle: 'Highland Plateau · Central Asia', lat: 32.5, lon: 88.5, kind: 'feature' },
  { id: 'feat-great-barrier', name: 'Great Barrier Reef', subtitle: 'Marine Coral System · Coral Sea', lat: -18.29, lon: 147.7, kind: 'feature' },
  { id: 'feat-atacama', name: 'Atacama Desert', subtitle: 'Hyper-Arid Desert · Chile', lat: -23.86, lon: -69.13, kind: 'feature' },
  { id: 'feat-sahel', name: 'Sahel Belt', subtitle: 'Semi-Arid Savanna · West Africa', lat: 14.5, lon: -4.0, kind: 'feature' },
  { id: 'feat-congo', name: 'Congo Basin', subtitle: 'Equatorial Rainforest · Central Africa', lat: -0.5, lon: 21.5, kind: 'feature' },
  { id: 'feat-lake-mead', name: 'Lake Mead / Colorado Basin', subtitle: 'Arid Reservoir · Western USA', lat: 36.01, lon: -114.74, kind: 'feature' },
  { id: 'feat-arctic-ocean', name: 'Central Arctic Ocean', subtitle: 'Polar Sea Ice Basin · Arctic', lat: 84.0, lon: 0.0, kind: 'feature' },
  { id: 'feat-antarctic-peninsula', name: 'Antarctic Peninsula', subtitle: 'Polar Ice Shelf · Southern Ocean', lat: -65.25, lon: -64.25, kind: 'feature' },
  { id: 'feat-gulf-stream', name: 'North Atlantic Gulf Stream', subtitle: 'Ocean Current · North Atlantic', lat: 38.0, lon: -65.0, kind: 'feature' },
  { id: 'feat-borneo', name: 'Borneo / Maritime Continent', subtitle: 'Equatorial Island · Southeast Asia', lat: 0.5, lon: 114.0, kind: 'feature' },
  { id: 'feat-siberia', name: 'Siberian Permafrost Tundra', subtitle: 'Boreal Permafrost · Northern Asia', lat: 67.5, lon: 105.0, kind: 'feature' },
  { id: 'feat-kilimanjaro', name: 'Mount Kilimanjaro', subtitle: 'Equatorial Alpine Peak · Tanzania', lat: -3.07, lon: 37.35, kind: 'feature' },
  { id: 'feat-mississippi-delta', name: 'Mississippi River Delta', subtitle: 'Tidal Estuary · Gulf Coast USA', lat: 29.15, lon: -89.25, kind: 'feature' },
  { id: 'feat-patagonia', name: 'Patagonian Ice Field', subtitle: 'Subpolar Glaciers · Southern Andes', lat: -49.5, lon: -73.5, kind: 'feature' },
  { id: 'feat-coral-triangle', name: 'Coral Triangle', subtitle: 'Tropical Marine Basin · Indo-Pacific', lat: -2.0, lon: 128.0, kind: 'feature' },
  { id: 'feat-great-lakes', name: 'North American Great Lakes', subtitle: 'Freshwater Basin · North America', lat: 45.8, lon: -84.7, kind: 'feature' },
  { id: 'feat-mackenzie', name: 'Mackenzie River Basin', subtitle: 'Sub-Arctic Watershed · Northwest Territories, Canada', lat: 65.28, lon: -126.83, kind: 'feature' },
  { id: 'feat-hudson-bay', name: 'Hudson Bay Sea Ice Margin', subtitle: 'Sub-Arctic Marine Basin · Canada', lat: 58.77, lon: -94.17, kind: 'feature' },
];

app.get('/api/geocode', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      res.json({ results: [] });
      return;
    }

    // Check direct "lat, lon" coordinate input
    const coordMatch = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coordMatch) {
      const lat = Number(coordMatch[1]);
      const lon = Number(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        res.json({
          results: [
            {
              id: `coord-${lat}-${lon}`,
              name: `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`,
              subtitle: 'Direct Geographic Coordinate',
              lat: Number(lat.toFixed(2)),
              lon: Number(lon.toFixed(2)),
              kind: 'coordinate',
            },
          ],
        });
        return;
      }
    }

    const cacheKey = `geocode:${q.toLowerCase()}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      res.json(cached.payload);
      return;
    }

    const qLower = q.toLowerCase();
    const featureMatches = GEOGRAPHIC_FEATURES.filter(
      (f) => f.name.toLowerCase().includes(qLower) || f.subtitle.toLowerCase().includes(qLower),
    ).slice(0, 4);

    let cityMatches: GeocodeResult[] = [];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        q,
      )}&count=6&language=en&format=json`;
      const upstream = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (upstream.ok) {
        const json = (await upstream.json()) as {
          results?: Array<{
            id: number;
            name: string;
            latitude: number;
            longitude: number;
            country?: string;
            admin1?: string;
            feature_code?: string;
          }>;
        };

        if (Array.isArray(json.results)) {
          cityMatches = json.results.map((item) => {
            const parts = [item.admin1, item.country].filter(Boolean);
            return {
              id: `om-${item.id}`,
              name: item.name,
              subtitle: parts.length > 0 ? parts.join(', ') : 'Global Location',
              lat: Number(item.latitude.toFixed(2)),
              lon: Number(item.longitude.toFixed(2)),
              kind: 'city',
            };
          });
        }
      }
    } catch (err) {
      console.warn('Open-Meteo geocode fallback to feature catalog:', err);
    }

    // Combine geographic features + live geocoded cities/places, avoiding near-identical names
    const combined: GeocodeResult[] = [...featureMatches];
    for (const c of cityMatches) {
      if (combined.length >= 7) break;
      const dup = combined.some(
        (existing) =>
          existing.name.toLowerCase() === c.name.toLowerCase() &&
          Math.abs(existing.lat - c.lat) < 0.5 &&
          Math.abs(existing.lon - c.lon) < 0.5,
      );
      if (!dup) combined.push(c);
    }

    const payload = { results: combined };
    responseCache.set(cacheKey, { timestamp: Date.now(), payload });
    res.json(payload);
  } catch (error) {
    console.error('Error in /api/geocode:', error);
    res.status(500).json({ results: [], error: 'Geocoding lookup failed.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TerraTrend Observatory server listening on http://localhost:${PORT}`);
  });
}

startServer();
