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
    id: 'amazon',
    name: 'Central Amazon Basin, Brazil',
    shortName: 'Central Amazon',
    lat: -3.47,
    lon: -62.22,
    biome: 'rainforest',
    biomeLabel: 'Tropical Rainforest',
    description: 'Equatorial rainforest regulated by canopy evapotranspiration and tropical convection cycles.',
  },
  {
    id: 'peru-coast',
    name: 'Coastal Peru (Lima / Callao)',
    shortName: 'Coastal Peru',
    lat: -12.05,
    lon: -77.04,
    biome: 'coast',
    biomeLabel: 'Eastern Pacific Upwelling Coast',
    description: 'Arid Pacific coast strongly modulated by El Niño–Southern Oscillation (ENSO) shifts.',
  },
  {
    id: 'borneo',
    name: 'Borneo / Maritime Continent',
    shortName: 'Borneo',
    lat: 0.5,
    lon: 114.0,
    biome: 'rainforest',
    biomeLabel: 'Equatorial Maritime Tropics',
    description: 'Western Pacific warm-pool island ecosystem showing opposite ENSO rainfall anomalies to Coastal Peru.',
  },
  {
    id: 'sahel',
    name: 'Sahel Transition Zone, Mali',
    shortName: 'Sahel, Mali',
    lat: 14.5,
    lon: -4.0,
    biome: 'savanna',
    biomeLabel: 'Semi-Arid Savanna',
    description: 'Monsoon-driven transition belt between the Sahara Desert and tropical West African savannas.',
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles Urban Basin',
    shortName: 'Los Angeles Basin',
    lat: 34.05,
    lon: -118.24,
    biome: 'urban',
    biomeLabel: 'Megacity Atmosphere',
    description: 'Dense coastal urban basin where clean-air regulations and warming climate interact.',
  },
  {
    id: 'north-atlantic',
    name: 'North Atlantic Subpolar Gyre',
    shortName: 'North Atlantic Gyre',
    lat: 53.0,
    lon: -35.0,
    biome: 'ocean',
    biomeLabel: 'Open Ocean',
    description: 'Deep-ocean convection zone tracking Atlantic circulation and marine cloud behavior.',
  },
  {
    id: 'mississippi-delta',
    name: 'Mississippi River Plume, Gulf Coast',
    shortName: 'Mississippi Plume',
    lat: 29.0,
    lon: -89.3,
    biome: 'coast',
    biomeLabel: 'River-Influenced Coastal Estuary',
    description: 'Nutrient-rich river outflow zone ideal for SeaWiFS coastal chlorophyll and estuary trend analysis.',
  },
  {
    id: 'mackenzie-basin',
    name: 'Mackenzie River Basin, Canada',
    shortName: 'Mackenzie Basin',
    lat: 65.28,
    lon: -126.83,
    biome: 'arctic',
    biomeLabel: 'Sub-Arctic Permafrost Watershed',
    description: 'Canada’s largest northward-flowing watershed monitored via SWOT water elevation, CSA RCM radar, and GEO.ca.',
  },
  {
    id: 'hudson-bay',
    name: 'Hudson Bay Ice Margin, Canada',
    shortName: 'Hudson Bay',
    lat: 58.77,
    lon: -94.17,
    biome: 'ocean',
    biomeLabel: 'Sub-Arctic Marine Ice',
    description: 'Seasonal sea-ice basin monitored by CSA RADARSAT Constellation Mission maritime ice surveillance.',
  },
];

export const DEMONSTRATION_CASES: DemonstrationCase[] = [
  {
    id: 'enso-dipole',
    title: 'Opposite Trends, Same Earth Process',
    subtitle: 'Comparing Borneo vs. Coastal Peru precipitation trends',
    driverSummary:
      'Large-scale Pacific Ocean circulation shifts (ENSO & Walker Circulation) redistribute moisture across the tropics—causing opposing regional rainfall trends.',
    steps: [
      {
        title: '1. Select Variable & Primary Region',
        narrative:
          'We begin with GPM / MERRA-2 Surface Precipitation over Borneo in the Western Pacific warm pool (1985–2024). Notice the pronounced wet/dry seasonal cycle.',
        variableId: 'PRECTOTCORR',
        primaryRegionId: 'borneo',
        compareRegionId: null,
        startYear: 1985,
        endYear: 2024,
        resolution: 'monthly',
        deseasonalize: false,
      },
      {
        title: '2. Remove the Seasonal Cycle',
        narrative:
          'By subtracting each month’s long-term average (deseasonalizing), the repeating monsoon swing disappears, exposing the underlying multi-year drift.',
        variableId: 'PRECTOTCORR',
        primaryRegionId: 'borneo',
        compareRegionId: null,
        startYear: 1985,
        endYear: 2024,
        resolution: 'monthly',
        deseasonalize: true,
      },
      {
        title: '3. Add Opposite Region Across the Pacific',
        narrative:
          'Now we overlay Coastal Peru on the eastern side of the Pacific Ocean. Observe how the two deseasonalized lines frequently surge in opposite directions.',
        variableId: 'PRECTOTCORR',
        primaryRegionId: 'borneo',
        compareRegionId: 'peru-coast',
        startYear: 1985,
        endYear: 2024,
        resolution: 'monthly',
        deseasonalize: true,
      },
      {
        title: '4. Compare Slopes & Significance',
        narrative:
          'Inspect the statistical readout: one region can gain moisture while the other stays dry or trends oppositely—demonstrating why regional analysis is essential.',
        variableId: 'PRECTOTCORR',
        primaryRegionId: 'borneo',
        compareRegionId: 'peru-coast',
        startYear: 1985,
        endYear: 2024,
        resolution: 'monthly',
        deseasonalize: true,
        highlightMetric: 'slope',
      },
    ],
  },
  {
    id: 'arctic-amplification',
    title: 'Arctic Amplification Through Seasonal Noise',
    subtitle: 'Utqiaġvik, Alaska Earth Skin Temperature (1985–2024)',
    driverSummary:
      'In the Arctic, temperatures swing by >30°C between winter and summer. Removing that huge seasonal cycle reveals rapid surface warming driven by snow and sea-ice loss.',
    steps: [
      {
        title: '1. Raw Monthly Skin Temperature',
        narrative:
          'At 71°N in Utqiaġvik, Alaska, raw monthly skin temperature oscillates wildly between −28°C in winter and +6°C in summer—visually hiding the long-term trend.',
        variableId: 'TS',
        primaryRegionId: 'utqiagvik',
        compareRegionId: null,
        startYear: 1985,
        endYear: 2024,
        resolution: 'monthly',
        deseasonalize: false,
      },
      {
        title: '2. Deseasonalize to Reveal Anomalies',
        narrative:
          'Switching on "Remove Seasonal Cycle" subtracts the normal temperature for each calendar month. Suddenly the steady upward slope jumps out clearly.',
        variableId: 'TS',
        primaryRegionId: 'utqiagvik',
        compareRegionId: null,
        startYear: 1985,
        endYear: 2024,
        resolution: 'monthly',
        deseasonalize: true,
        highlightMetric: 'ttest',
      },
      {
        title: '3. Cross-Check With Surface Albedo',
        narrative:
          'Switching to Surface Albedo shows why: as bright spring snow and sea ice melt earlier, darker tundra and water absorb more solar energy.',
        variableId: 'SRF_ALB',
        primaryRegionId: 'utqiagvik',
        compareRegionId: null,
        startYear: 1985,
        endYear: 2024,
        resolution: 'monthly',
        deseasonalize: true,
        highlightMetric: 'mannkendall',
      },
    ],
  },
  {
    id: 'time-horizon-significance',
    title: 'Why Time Span Matters for Significance',
    subtitle: 'Colorado River Basin Root-Zone Soil Moisture',
    driverSummary:
      'Short records can hide real trends beneath natural year-to-year variability. Extending the observation window increases statistical power and narrows confidence intervals.',
    steps: [
      {
        title: '1. Short 10-Year Window (2015–2024)',
        narrative:
          'Over just 10 years, year-to-year swings in soil wetness create a wide 95% confidence interval and a higher p-value—making the trend harder to confirm statistically.',
        variableId: 'GWETPROF',
        primaryRegionId: 'lake-mead',
        compareRegionId: null,
        startYear: 2015,
        endYear: 2024,
        resolution: 'monthly',
        deseasonalize: true,
        highlightMetric: 'ci',
      },
      {
        title: '2. Full 40-Year Record (1985–2024)',
        narrative:
          'Expanding the record back to 1985 triples the sample size. Notice how the confidence band tightens and both Student’s t-test and Mann-Kendall converge on the long-term signal.',
        variableId: 'GWETPROF',
        primaryRegionId: 'lake-mead',
        compareRegionId: null,
        startYear: 1985,
        endYear: 2024,
        resolution: 'monthly',
        deseasonalize: true,
        highlightMetric: 'ttest',
      },
    ],
  },
  {
    id: 'urban-clean-air',
    title: 'Tracking Human Policy From Space',
    subtitle: 'Los Angeles Basin Tropospheric NO₂ (2004–2024)',
    driverSummary:
      'NASA Aura OMI observations track declining nitrogen dioxide levels over major US cities following cleaner vehicle and power-plant emission standards.',
    steps: [
      {
        title: '1. Inspect Urban NO₂ Cycles',
        narrative:
          'In the Los Angeles Basin, winter atmospheric inversions trap vehicle exhaust near the ground, creating regular winter peaks.',
        variableId: 'OMI_NO2',
        primaryRegionId: 'los-angeles',
        compareRegionId: null,
        startYear: 2004,
        endYear: 2024,
        resolution: 'monthly',
        deseasonalize: false,
      },
      {
        title: '2. Quantify the Downward Trend',
        narrative:
          'After removing the winter-summer cycle, the linear regression and Sen’s slope quantify a steep, statistically significant decline (p < 0.001).',
        variableId: 'OMI_NO2',
        primaryRegionId: 'los-angeles',
        compareRegionId: null,
        startYear: 2004,
        endYear: 2024,
        resolution: 'monthly',
        deseasonalize: true,
