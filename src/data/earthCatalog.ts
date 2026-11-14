export type EarthSphere = 'Atmosphere' | 'Hydrosphere' | 'Land & Biosphere' | 'Energy & Radiation';

export type MissionSource =
  | 'MERRA-2'
  | 'CERES'
  | 'GPM / MERRA-2'
  | 'MODIS'
  | 'OMI'
  | 'AIRS'
  | 'GLDAS'
  | 'SWOT'
  | 'SeaWiFS'
  | 'CSA RCM';

export interface EarthVariable {
  id: string;
  name: string;
  shortName: string;
  unit: string;
  sphere: EarthSphere;
  mission: MissionSource;
  supportsDaily: boolean;
  liveNasaPower: boolean;
  simpleDefinition: string;
  whyItMatters: string;
  risingMeans: string;
  fallingMeans: string;
  recommendedBiomes: string[];
  decimals: number;
}

export interface PresetRegion {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  biome: 'arctic' | 'desert' | 'rainforest' | 'urban' | 'coast' | 'ocean' | 'savanna';
  biomeLabel: string;
  description: string;
}

export interface DemoStep {
  title: string;
  narrative: string;
  variableId: string;
  primaryRegionId: string;
  compareRegionId: string | null;
  startYear: number;
  endYear: number;
  resolution: 'monthly' | 'annual';
  deseasonalize: boolean;
  highlightMetric?: 'slope' | 'ttest' | 'mannkendall' | 'ci';
}

export interface DemonstrationCase {
  id: string;
  title: string;
  subtitle: string;
  driverSummary: string;
  steps: DemoStep[];
}

export const EARTH_VARIABLES: EarthVariable[] = [
  {
    id: 'T2M',
    name: '2-Meter Air Temperature',
    shortName: 'Air Temp (2m)',
    unit: '°C',
    sphere: 'Atmosphere',
    mission: 'MERRA-2',
    supportsDaily: true,
    liveNasaPower: true,
    simpleDefinition:
      'Air temperature measured 2 meters above Earth’s surface—the standard height used by weather stations worldwide.',
    whyItMatters:
      'Tracks atmospheric warming or cooling over decades and reveals regional heat anomalies across land and oceans.',
    risingMeans: 'Longer heatwaves, earlier snowmelt, and higher atmospheric moisture demand.',
    fallingMeans: 'Regional cooling, increased cloud shading, or shifting cold-air circulation.',
    recommendedBiomes: ['arctic', 'urban', 'desert', 'rainforest'],
    decimals: 2,
  },
  {
    id: 'TS',
    name: 'Earth Skin Temperature',
    shortName: 'Skin Temp',
    unit: '°C',
    sphere: 'Energy & Radiation',
    mission: 'MERRA-2',
    supportsDaily: true,
    liveNasaPower: true,
    simpleDefinition:
      'The radiative temperature of the physical ground, sea surface, vegetation canopy, or ice sheet itself as observed from space.',
    whyItMatters:
      'Skin temperature responds rapidly to surface changes such as melting sea ice, urbanization, or forest loss.',
    risingMeans: 'Surface heating, sea-ice retreat (lower reflectivity), or urban heat-island intensification.',
    fallingMeans: 'Increased snow/cloud cover, denser canopy shading, or ocean upwelling.',
    recommendedBiomes: ['arctic', 'desert', 'ocean', 'urban'],
    decimals: 2,
  },
  {
    id: 'PRECTOTCORR',
    name: 'Surface Precipitation Rate',
    shortName: 'Precipitation',
    unit: 'mm/day',
    sphere: 'Hydrosphere',
    mission: 'GPM / MERRA-2',
    supportsDaily: true,
    liveNasaPower: true,
    simpleDefinition:
      'Average daily rainfall and melted snowfall reaching the ground, bias-corrected with satellite precipitation measurements.',
    whyItMatters:
      'Shifts in large-scale circulation (such as El Niño or monsoon belts) often make one region wetter while simultaneously drying another.',
    risingMeans: 'Intensifying wet seasons, flood risk, or shifting storm tracks toward the region.',
    fallingMeans: 'Emerging meteorological drought, shifting rain belts, or declining watershed inflow.',
    recommendedBiomes: ['coast', 'rainforest', 'savanna', 'desert'],
    decimals: 2,
  },
  {
    id: 'GWETPROF',
    name: 'Root-Zone Soil Wetness',
    shortName: 'Soil Moisture',
    unit: 'fraction (0–1)',
    sphere: 'Hydrosphere',
    mission: 'MERRA-2',
    supportsDaily: true,
    liveNasaPower: true,
    simpleDefinition:
      'Fraction of underground soil pore space filled with water from the surface down through the plant root zone (0 = completely dry, 1 = saturated).',
    whyItMatters:
      'Integrates both rainfall and evaporation over time—making it a sensitive early indicator of agricultural and hydrological drought.',
    risingMeans: 'Wetter soils, stronger water storage, or reduced evaporative stress.',
