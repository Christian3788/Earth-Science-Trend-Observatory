import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ResourceItem {
  title: string;
  organization: string;
  category: 'NASA Data & Tools' | 'Statistical & Research Guides' | 'Space Agency Partners & SAR';
  description: string;
  url: string;
  actionLabel: string;
}

const OFFICIAL_RESOURCES: ResourceItem[] = [
  {
    title: 'Giovanni',
    organization: 'NASA GES DISC',
    category: 'NASA Data & Tools',
    description:
      'Versatile web environment offering menus of NASA satellite and model variables (AIRS, GPM, MERRA-2, MODIS, OMI), time-series plotting, spatial maps, and CSV downloads.',
    url: 'https://giovanni.gsfc.nasa.gov/giovanni/',
    actionLabel: 'Open Giovanni',
  },
  {
    title: 'Hydrology Time Series (CUAHSI / NASA)',
    organization: 'CUAHSI HydroClient & NASA Hydrology',
    category: 'NASA Data & Tools',
    description:
      'Generate and compare hydrological time series—streamflow, river discharge, groundwater, and precipitation—across watersheds and river basins.',
    url: 'https://hydroclient.cuahsi.org/',
    actionLabel: 'Open HydroClient',
  },
  {
    title: 'AppEEARS',
    organization: 'NASA LP DAAC',
    category: 'NASA Data & Tools',
    description:
      'Application for Extracting and Exploring Analysis Ready Samples—efficiently subsets federal geospatial archives (MODIS, VIIRS, Daymet) and generates point/area time series.',
    url: 'https://appeears.earthdatacloud.nasa.gov/',
    actionLabel: 'Open AppEEARS',
  },
  {
    title: 'Climate Data Online (CDO)',
    organization: 'NOAA NCEI / NCDC',
    category: 'NASA Data & Tools',
    description:
      'Free access to global historical weather and climate station archives, station histories, and an interactive mapping explorer.',
    url: 'https://www.ncei.noaa.gov/cdo-web/',
    actionLabel: 'Open NOAA CDO',
  },
  {
    title: 'KNMI Climate Explorer',
    organization: 'Royal Netherlands Meteorological Institute',
    category: 'Space Agency Partners & SAR',
    description:
      'Web-based scientific climate analysis workbench for students and analysts to inspect trends, correlations, and seasonal anomalies across global observations and models.',
    url: 'https://climexp.knmi.nl/',
    actionLabel: 'Open KNMI Explorer',
  },
  {
    title: 'RADARSAT Constellation Mission (RCM)',
    organization: 'Canadian Space Agency (CSA)',
    category: 'Space Agency Partners & SAR',
    description:
      'Trio of C-band Synthetic Aperture Radar satellites scanning Earth day and night in all weather for maritime surveillance (sea ice, winds, oil spills), disaster response, and wetland/coastal ecosystems.',
    url: 'https://www.asc-csa.gc.ca/eng/satellites/radarsat/',
    actionLabel: 'Explore CSA RCM',
  },
  {
    title: 'GEO.ca Open Geospatial Portal',
    organization: 'Natural Resources Canada',
    category: 'Space Agency Partners & SAR',
    description:
      'Canada’s authoritative open geospatial repository for monitoring northern permafrost, watersheds, forestry, and coastal environmental trends.',
    url: 'https://geo.ca/',
    actionLabel: 'Explore GEO.ca',
  },
  {
    title: 'SWOT Mission (Surface Water & Ocean Topography)',
    organization: 'NASA · CNES · CSA · UKSA',
    category: 'Space Agency Partners & SAR',
    description:
      'Surveys 90% of Earth’s surface water, tracking changes in water surface elevation for lakes, rivers, reservoirs, and coastal oceans over time.',
    url: 'https://swot.jpl.nasa.gov/',
    actionLabel: 'Explore SWOT',
  },
  {
    title: 'Monitoring & Protecting Ecosystems from Space',
    organization: 'Canadian Space Agency (CSA)',
    category: 'Space Agency Partners & SAR',
    description:
      'Overview of how satellite radar and optical missions track habitat change, biodiversity, wetlands, and responsible land stewardship.',
    url: 'https://www.asc-csa.gc.ca/eng/satellites/everyday-lives/monitoring-and-protecting-our-ecosystem-from-space.asp',
    actionLabel: 'Read CSA Guide',
  },
  {
    title: 'Synthetic Aperture Radar (SAR) Python & QGIS Tutorial',
    organization: 'NASA / CSA Open Science Training',
    category: 'Space Agency Partners & SAR',
    description:
      'Practical workflow demonstrating how to access, calibrate, and visualize C-band SAR imagery using Python and QGIS.',
    url: 'https://appliedsciences.nasa.gov/get-involved/training/english/arset-fundamentals-synthetic-aperture-radar-sar',
    actionLabel: 'View SAR Training',
  },
  {
    title: 'SeaWiFS Chlorophyll in River-Influenced Coastal Regions',
    organization: 'NASA Ocean Color Research',
    category: 'Statistical & Research Guides',
    description:
      'Research demonstration showing how to construct ocean-color chlorophyll time series in river plumes and evaluate statistical trend significance.',
    url: 'https://oceancolor.gsfc.nasa.gov/',
    actionLabel: 'NASA Ocean Color',
  },
  {
    title: 'Statistical Trend Detection & Significance Testing',
    organization: 'USGS / NASA Statistical Reference',
    category: 'Statistical & Research Guides',
    description:
      'Guides on applying Mann-Kendall, Sen’s slope, Student’s t-tests, and confidence intervals to distinguish real environmental trends from natural variability.',
    url: 'https://pubs.usgs.gov/tm/4a3/',
    actionLabel: 'Read Trend Methods',
  },
];

export const ResourcesSection: React.FC = () => {
  const categories: ResourceItem['category'][] = [
    'NASA Data & Tools',
    'Space Agency Partners & SAR',
    'Statistical & Research Guides',
  ];

  return (
    <section id="resources" className="border-t border-slate-200 bg-slate-50 py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            NASA & Space Agency Partner Resources
          </h2>
          <p className="text-base text-slate-700 mt-1.5 max-w-3xl leading-relaxed">
            Continue your investigation using official data archives, hydrological and climate portals, Canadian Space Agency radar missions, and statistical significance references.
          </p>
        </div>

        <div className="space-y-8">
          {categories.map((cat) => {
            const items = OFFICIAL_RESOURCES.filter((r) => r.category === cat);
            return (
              <div key={cat}>
                <h3 className="text-base font-bold text-slate-950 mb-3">{cat}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <div
                      key={item.title}
                      className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-700">{item.organization}</div>
                        <h4 className="text-base font-bold text-slate-950 mt-1">{item.title}</h4>
                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-slate-100">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-900 whitespace-nowrap"
                        >
                          <span>{item.actionLabel}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
