# TerraTrend Observatory

TerraTrend is an interactive Earth-science workbench for exploring environmental time series and regional trends. Choose a location and variable, inspect the observations on a map or globe, compare locations, and assess trends with statistical tests.

> **Data note:** This application combines live NASA POWER data for supported variables with modeled mission-reference or climatology fallback series for other variables and when the upstream data service is unavailable. The interface identifies the source for each series. A fallback series is not a substitute for a direct satellite observation or peer-reviewed analysis.

## Features

- **Explore a location:** Select a preset region, search for a place, enter latitude/longitude, or click the map. Switch between a 2D map and an interactive 3D orbital globe textured with NASA Blue Marble Shaded Relief & Bathymetry and ASTER GDEM terrain elevation.
- **Compare regions:** Enable a second location to examine two regional time series side by side, connected by a great-circle arc on the 3D globe.
- **Choose variables and time ranges:** Browse atmospheric, hydrospheric, land/biosphere, and energy/radiation variables from missions and products including MERRA-2, CERES, GPM, MODIS, OMI, AIRS, GLDAS, SWOT, SeaWiFS, and CSA RADARSAT Constellation.
- **Inspect spatial patterns:** View the computed global anomaly heatmap or toggle live NASA EOSDIS GIBS global satellite layers over a real NASA Blue Marble basemap (on both the 2D map and 3D globe) with adjustable opacity.
- **Compare real NASA satellite change imagery:** Inspect real regional NASA MODIS Terra True Color, Land Surface Temperature, Vegetation (NDVI), and AMSR2 Sea Ice captures using an interactive Split Wipe slider or Side-by-Side viewer across time (`Start Year` vs. `End Year`) or across regions (`Region A` vs. `Region B`).
- **Analyze trends:** Display monthly, annual, or (where supported) daily series; deseasonalize monthly data; and review ordinary least-squares (OLS) regression and Mann–Kendall/Sen-slope statistics, p-values, and confidence intervals.
- **Visualize and export:** Switch between 2D charts and a 3D Year × Month seasonal climate surface, and export the analysis as CSV.
- **Learn as you explore:** Use the Data Detective inquiry, guided case studies, methodology notes, and resource links built into the app.

## Requirements

- Node.js and npm, or [Bun](https://bun.sh/).
- Internet access for live NASA POWER observations, NASA EOSDIS GIBS satellite imagery, and Open-Meteo location search. The app falls back to calibrated reference series and procedural Earth textures when upstream services are unavailable.

No API key or `.env` file is required for the standard local run. The `.env.example` contains placeholders for the AI Studio hosting environment; those values are not needed by the local app.

## Run locally

Open PowerShell in the repository root and install dependencies:

```powershell
npm install
```

Or, if you use Bun (the repository includes `bun.lock`):

```powershell
bun install
```

Start the development server:

```powershell
npm run dev
```

With Bun:

```powershell
bun run dev
```

Open **http://localhost:3000**. The Express server serves the API and mounts Vite in development, so use `npm run dev` rather than starting Vite alone.

To use a different port in PowerShell:

```powershell
$env:PORT = "4000"
npm run dev
```

Then open `http://localhost:4000`.

## Production build

Build the frontend and start the Express server in production mode from PowerShell:

```powershell
npm run build
$env:NODE_ENV = "production"
npm start
```

The server serves the built `dist` app and API on port `3000` by default. Set `$env:PORT` before `npm start` to change the port. `npm run preview` starts Vite's static preview server; it does not replace the Express server required for the API.

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Express with Vite middleware and hot module replacement. |
| `npm run build` | Create the production frontend build in `dist`. |
| `npm start` | Start the server; set `NODE_ENV=production` to serve the production build. |
| `npm run preview` | Preview the Vite build as a static frontend. |
| `npm run lint` | Run TypeScript checking (`tsc --noEmit`). |

## Using the observatory

1. Select a region with the search box, preset locations, 2D map, 3D globe, or coordinate input.
2. Choose a variable, start/end years, and the available temporal resolution.
3. Optionally enable deseasonalization and/or a comparison region.
4. Switch the 2D map between the **Anomaly Grid** and **NASA Satellite Layer** over the Blue Marble basemap, or toggle the **Satellite Data Layer** on the 3D globe.
5. Use the **Real NASA Satellite Change Imagery** panel (`Split Wipe` or `Side-by-Side`) to inspect regional landscape, temperature, vegetation, or sea-ice changes across years or between Region A and Region B.
6. Explore the plotted values, trend line, statistical summary, and 3D seasonal surface, or use **Export CSV** / a guided demonstration.

Daily resolution is only available for variables that support it. NASA POWER daily requests are limited to a recent five-year window to keep responses manageable, and NASA POWER Surface Albedo (`ALLSKY_SRF_ALB`) begins in 2001. The app uses monthly observations for annual analysis and aggregates them in the browser.

## Data sources and interpretation

- **NASA POWER:** The server requests live point data for supported POWER parameters, including air/surface temperature, soil moisture, humidity, wind, precipitation, surface solar radiation, cloud amount, and surface albedo (`SRF_ALB` mapped to `ALLSKY_SRF_ALB`, 2001–present).
- **NASA EOSDIS GIBS imagery:** Global globe/map basemaps use `BlueMarble_ShadedRelief_Bathymetry` and `ASTER_GDEM_Greyscale_Shaded_Relief`. Regional before/after and global satellite overlays fetch live WMS imagery from NASA GIBS (`MODIS_Terra_CorrectedReflectance_TrueColor` from 2000+, `MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day` and `MODIS_Terra_L3_NDVI_Monthly` from 2001+, `AMSRU2_Sea_Ice_Concentration_12km` from 2013+, plus MERRA-2/IMERG/SMAP/OMI global rasters). Start years earlier than a satellite sensor's launch year are clamped to its earliest available year in the imagery comparator.
- **Modeled/reference series:** Several catalog variables (for example, mission-specific vegetation, atmospheric composition, runoff, water-elevation, ocean-color, and wetland products) use calibrated reference profiles in this application rather than a live point-data connection. When an upstream POWER request fails or has insufficient data, supported POWER variables also use a labeled climatology fallback.
- **Global heatmap:** The heatmap is a gridded regional anomaly view generated from reference profiles, optionally blended with live NASA POWER anchor locations when enough upstream samples are available. It should not be interpreted as a complete gridded NASA satellite product.
- **Place search:** Place names are looked up through Open-Meteo's geocoding service and combined with a local catalog of geographic features. A `latitude, longitude` query can be used directly.

Statistical significance indicates evidence for a trend under the implemented tests and assumptions; it does not establish causality or account for every source of uncertainty, autocorrelation, or measurement bias. Consult the in-app methodology and source metadata before drawing scientific conclusions.

## API overview

The same Express server used by the app exposes:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Return service health. |
| `GET /api/earth-data?lat=…&lon=…&variable=…&startYear=…&endYear=…&resolution=monthly` | Fetch a regional time series. `resolution` may be `monthly` or `daily`. |
| `GET /api/spatial-heatmap?variable=…&startYear=…&endYear=…` | Return a global anomaly grid for the selected variable and period. |
| `GET /api/geocode?q=…` | Search for a place or accept a `latitude, longitude` string. |
| `GET /api/satellite/earth-texture?kind=shaded` | Serve cached `2048×1024` NASA Blue Marble / ASTER GDEM / MODIS Water Mask textures (`shaded`, `bluemarble`, `relief`, `watermask`). |
| `GET /api/satellite/global-layer?variable=…&year=…&month=7` | Serve a `1024×512` transparent NASA GIBS global scientific raster layer for the selected variable and year. |
| `GET /api/satellite/regional-snapshot?lat=…&lon=…&year=…&month=…&span=2.4&layer=truecolor` | Serve an aspect-corrected `800×520` regional NASA GIBS capture (`truecolor`, `viirs`, `lst`, `ndvi`, `seaice`). |

JSON responses are cached in memory for 30 minutes and NASA GIBS satellite images are cached for 12 hours. Example health check:

```text
http://localhost:3000/api/health
```

## Project structure

```text
src/
  components/       Map, 3D globe, regional satellite comparator, charts, statistics, and info panels
  data/             Earth variable, region, and demonstration catalogs
  utils/            Time-series statistics, procedural Earth fallback textures, and CSV export helpers
  App.tsx           Main observatory interface and client-side data flow
  main.tsx          React entry point
server.ts           Express API, NASA POWER/GIBS/Open-Meteo proxies, and Vite integration
vite.config.ts      Vite, React, Tailwind CSS, and development settings
docs/               Attribution and contribution guidance
```

## Contributing

Please use your own Git identity and do not impersonate another contributor. See [docs/ATTRIBUTION.md](./docs/ATTRIBUTION.md) for attribution and co-authorship practices and [docs/CONTRIBUTOR_COMMIT_PLAN.md](./docs/CONTRIBUTOR_COMMIT_PLAN.md) for the contributor workflow.
