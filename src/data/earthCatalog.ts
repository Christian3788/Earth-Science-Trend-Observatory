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
    id: 'OMI_O3',
    name: 'Total Column Ozone',
    shortName: 'Column Ozone',
    unit: 'Dobson Units',
    sphere: 'Atmosphere',
    mission: 'OMI',
    supportsDaily: false,
    liveNasaPower: false,
    simpleDefinition:
      'Total thickness of ozone gas in the vertical air column from ground to space, mostly concentrated in the protective stratospheric ozone layer.',
    whyItMatters:
      'Monitors the healing of Earth’s ultraviolet shield following the Montreal Protocol ban on ozone-depleting CFCs.',
    risingMeans: 'Stratospheric ozone layer recovery and stronger UV protection.',
    fallingMeans: 'Chemical ozone depletion or poleward circulation shifts.',
    recommendedBiomes: ['arctic', 'ocean'],
    decimals: 1,
  },
  {
    id: 'AIRS_H2O_MID',
    name: 'Mid-Tropospheric Water Vapor',
    shortName: 'Mid-Trop H₂O',
    unit: 'g/kg',
    sphere: 'Atmosphere',
    mission: 'AIRS',
    supportsDaily: false,
    liveNasaPower: false,
    simpleDefinition:
      'Mass of water vapor per kilogram of air in the middle troposphere (~5 km altitude), measured with infrared sounding.',
    whyItMatters:
      'Water vapor is Earth’s strongest amplifying feedback: warmer air holds ~7% more moisture per °C, trapping additional infrared heat.',
    risingMeans: 'Atmospheric moistening consistent with a warming troposphere.',
    fallingMeans: 'Mid-level atmospheric drying or stronger subsidence zones.',
    recommendedBiomes: ['rainforest', 'ocean', 'desert'],
    decimals: 2,
  },
  {
    id: 'GLDAS_RUNOFF',
    name: 'Total Land Surface & Subsurface Runoff',
    shortName: 'Land Runoff',
    unit: 'mm/month',
    sphere: 'Hydrosphere',
    mission: 'GLDAS',
    supportsDaily: false,
    liveNasaPower: false,
    simpleDefinition:
      'Water from rain and snowmelt that exceeds soil storage and flows into streams, rivers, and groundwater recharge.',
    whyItMatters:
      'Directly governs river discharge, reservoir water supply, and freshwater delivery to coastal estuaries.',
    risingMeans: 'Higher river streamflow, snowmelt pulses, or flood potential.',
    fallingMeans: 'Shrinking watershed water supply and declining reservoir inflows.',
    recommendedBiomes: ['desert', 'coast', 'arctic'],
    decimals: 1,
  },
  {
    id: 'SWOT_WSE',
    name: 'Surface Water Elevation Anomaly (SWOT)',
    shortName: 'Water Elevation',
    unit: 'm',
    sphere: 'Hydrosphere',
    mission: 'SWOT',
    supportsDaily: false,
    liveNasaPower: false,
    simpleDefinition:
      'Change in water surface height of lakes, reservoirs, rivers, and coastal oceans relative to a baseline datum, measured via Ka-band radar interferometry (NASA / CNES / CSA / UKSA).',
    whyItMatters:
      'Surveys 90% of Earth’s surface water to quantify reservoir drawdown, flood-wave propagation, and freshwater storage shifts.',
    risingMeans: 'Rising reservoir storage, increased snowmelt inflow, or regional flood stages.',
    fallingMeans: 'Reservoir depletion, prolonged watershed drought, or increased water extraction.',
    recommendedBiomes: ['desert', 'arctic', 'coast'],
    decimals: 2,
  },
  {
    id: 'SEAWIFS_CHL',
    name: 'Coastal & Ocean Chlorophyll-a (SeaWiFS)',
    shortName: 'Chlorophyll-a',
    unit: 'mg/m³',
    sphere: 'Land & Biosphere',
    mission: 'SeaWiFS',
    supportsDaily: false,
    liveNasaPower: false,
    simpleDefinition:
      'Concentration of photosynthetic phytoplankton pigment in surface ocean and river-influenced coastal waters, derived from ocean-color reflectance.',
    whyItMatters:
      'Tracks marine primary productivity and reveals how river nutrient runoff alters algal blooms in coastal estuaries.',
    risingMeans: 'Stronger coastal phytoplankton blooms, nutrient-rich river plumes, or upwelling.',
    fallingMeans: 'Ocean stratification, reduced nutrient mixing, or declining coastal productivity.',
    recommendedBiomes: ['coast', 'ocean'],
    decimals: 2,
  },
  {
    id: 'RCM_SAR_WETLAND',
    name: 'All-Weather C-Band SAR Backscatter (CSA RCM)',
    shortName: 'SAR Backscatter',
    unit: 'dB',
    sphere: 'Land & Biosphere',
    mission: 'CSA RCM',
    supportsDaily: false,
    liveNasaPower: false,
    simpleDefinition:
      'Day-and-night, cloud-penetrating radar backscatter from the Canadian Space Agency’s RADARSAT Constellation Mission (RCM), sensitive to surface water inundation, wetland vegetation, and sea ice.',
    whyItMatters:
      'Monitors Arctic sea-ice breakup, northern wetland thaw, and coastal flooding even through polar darkness or thick storm clouds.',
    risingMeans: 'Rougher wind-driven water, dense wetland canopy, or multi-year sea-ice deformation.',
    fallingMeans: 'Smooth open-water flooding, sea-ice melt retreat, or wetland surface inundation.',
    recommendedBiomes: ['arctic', 'coast', 'ocean'],
    decimals: 2,
  },
];

export const PRESET_REGIONS: PresetRegion[] = [
  {
    id: 'utqiagvik',
    name: 'Utqiaġvik (Barrow), Alaska',
    shortName: 'Utqiaġvik, AK',
    lat: 71.29,
    lon: -156.79,
    biome: 'arctic',
    biomeLabel: 'Arctic Tundra & Sea-Ice Coast',
    description: 'High-latitude coastal tundra experiencing rapid Arctic amplification and earlier spring snowmelt.',
  },
  {
    id: 'lake-mead',
    name: 'Colorado Basin / Lake Mead',
    shortName: 'Colorado Basin',
    lat: 36.01,
    lon: -114.74,
    biome: 'desert',
    biomeLabel: 'Arid Watershed',
    description: 'Semi-arid southwestern US river basin sensitive to multi-decadal warming and soil moisture loss.',
  },
  {
