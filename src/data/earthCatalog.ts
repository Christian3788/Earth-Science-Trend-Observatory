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
    fallingMeans: 'Soil desiccation from reduced rainfall or rising evaporation under warmer air.',
    recommendedBiomes: ['desert', 'savanna', 'rainforest'],
    decimals: 3,
  },
  {
    id: 'ALLSKY_SFC_SW_DWN',
    name: 'Downward Surface Solar Radiation',
    shortName: 'Solar Irradiance',
    unit: 'kWh/m²/day',
    sphere: 'Energy & Radiation',
    mission: 'CERES',
    supportsDaily: true,
    liveNasaPower: true,
    simpleDefinition:
      'Total solar energy reaching Earth’s surface each day after sunlight passes through clouds, dust, and air pollution.',
    whyItMatters:
      'Measures changes in "global brightening" or "dimming" caused by shifting cloud cover or cleaner/dirtier skies.',
    risingMeans: 'Clearer skies, declining aerosol haze, or reduced cloud cover allowing more sunlight through.',
    fallingMeans: 'Increasing cloudiness, smoke plumes, or industrial aerosol scattering.',
    recommendedBiomes: ['urban', 'desert', 'ocean'],
    decimals: 2,
  },
  {
    id: 'SRF_ALB',
    name: 'Surface Solar Albedo',
    shortName: 'Surface Albedo',
    unit: 'ratio (0–1)',
    sphere: 'Energy & Radiation',
    mission: 'CERES',
    supportsDaily: true,
    liveNasaPower: true,
    simpleDefinition:
      'Fraction of incoming sunlight reflected back into space. Bright snow and ice reflect ~0.7–0.85, while dark oceans and forests reflect ~0.06–0.15.',
    whyItMatters:
      'Drives one of Earth’s strongest climate feedbacks: melting ice exposes darker ocean or rock, absorbing more heat and accelerating warming.',
    risingMeans: 'Expanding snow/ice cover, desertification, or brightening land surfaces.',
    fallingMeans: 'Retreating snowpack and sea ice, or darker vegetation expanding into tundra.',
    recommendedBiomes: ['arctic', 'desert'],
    decimals: 3,
  },
  {
    id: 'CLOUD_AMT',
    name: 'Total Cloud Fraction',
    shortName: 'Cloud Cover',
    unit: '%',
    sphere: 'Atmosphere',
    mission: 'CERES',
    supportsDaily: true,
    liveNasaPower: true,
    simpleDefinition:
      'Percentage of the sky covered by clouds as observed from satellite radiometers.',
    whyItMatters:
      'Clouds both cool Earth by reflecting sunlight and warm Earth by trapping outgoing heat—changes reshape regional energy balance.',
    risingMeans: 'More frequent storm systems or marine cloud deck persistence.',
    fallingMeans: 'High-pressure drying, clearer skies, and stronger daytime surface heating.',
    recommendedBiomes: ['ocean', 'coast', 'rainforest'],
    decimals: 1,
  },
  {
    id: 'RH2M',
    name: '2-Meter Relative Humidity',
    shortName: 'Rel. Humidity',
    unit: '%',
    sphere: 'Atmosphere',
    mission: 'MERRA-2',
    supportsDaily: true,
    liveNasaPower: true,
    simpleDefinition:
      'How close the near-surface air is to being saturated with water vapor at its current temperature.',
    whyItMatters:
      'Falling relative humidity over warming land increases wildfire danger and plant water stress even if total rainfall holds steady.',
    risingMeans: 'More humid air masses or cooler temperatures near saturation.',
    fallingMeans: 'Drier air, higher evaporative demand, and elevated fire weather risk.',
    recommendedBiomes: ['desert', 'rainforest', 'savanna'],
    decimals: 1,
  },
  {
    id: 'WS10M',
    name: '10-Meter Surface Wind Speed',
    shortName: 'Wind Speed (10m)',
    unit: 'm/s',
    sphere: 'Atmosphere',
    mission: 'MERRA-2',
    supportsDaily: true,
    liveNasaPower: true,
    simpleDefinition:
      'Average horizontal wind speed 10 meters above ground or sea level.',
    whyItMatters:
      'Reveals shifts in jet streams, trade winds, ocean upwelling, and coastal storm intensity.',
    risingMeans: 'Strengthening pressure gradients, trade winds, or coastal storminess.',
    fallingMeans: 'Terrestrial stilling, weaker pressure gradients, or shifting storm tracks.',
    recommendedBiomes: ['ocean', 'coast', 'arctic'],
    decimals: 2,
  },
  {
    id: 'MODIS_NDVI',
    name: 'Vegetation Greenness Index (NDVI)',
    shortName: 'NDVI Greenness',
    unit: 'index (−0.2–1.0)',
    sphere: 'Land & Biosphere',
    mission: 'MODIS',
    supportsDaily: false,
    liveNasaPower: false,
    simpleDefinition:
      'Normalized Difference Vegetation Index calculated from red and near-infrared light reflected by leaves. Dense green forests score ~0.7–0.9; barren rock or sand scores <0.15.',
    whyItMatters:
      'Shows whether ecosystems are "greening" (e.g., warming tundra shrub expansion) or "browning" (deforestation or drought stress).',
    risingMeans: 'Denser leaf cover, longer growing seasons, or vegetation recovery.',
    fallingMeans: 'Drought stress, wildfire scarring, or tropical deforestation.',
    recommendedBiomes: ['rainforest', 'arctic', 'savanna'],
    decimals: 3,
  },
  {
    id: 'OMI_NO2',
    name: 'Tropospheric Nitrogen Dioxide (NO₂)',
    shortName: 'Tropospheric NO₂',
    unit: '10¹⁵ molec/cm²',
    sphere: 'Atmosphere',
    mission: 'OMI',
    supportsDaily: false,
    liveNasaPower: false,
    simpleDefinition:
      'Concentration of nitrogen dioxide gas in the lower atmosphere, mainly emitted by vehicle exhaust, power plants, and biomass burning.',
    whyItMatters:
      'A direct satellite fingerprint of human industrial activity, clean-air regulations, and urban air quality trends.',
    risingMeans: 'Growing traffic/industrial emissions or increased regional wildfire smoke.',
    fallingMeans: 'Effective vehicle/power-plant emission controls or industrial transition.',
    recommendedBiomes: ['urban'],
    decimals: 2,
  },
  {
