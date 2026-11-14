# TerraTrend Observatory

TerraTrend is an interactive Earth-science workbench for exploring environmental time series and regional trends. Choose a location and variable, inspect the observations on a map or globe, compare locations, and assess trends with statistical tests.

> **Data note:** This application combines live NASA POWER data for supported variables with modeled mission-reference or climatology fallback series for other variables and when the upstream data service is unavailable. The interface identifies the source for each series. A fallback series is not a substitute for a direct satellite observation or peer-reviewed analysis.

## Features

- **Explore a location:** Select a preset region, search for a place, enter latitude/longitude, or click the map. Switch between a 2D map and a 3D globe.
- **Compare regions:** Enable a second location to examine two regional time series side by side.
- **Choose variables and time ranges:** Browse atmospheric, hydrospheric, land/biosphere, and energy/radiation variables from missions and products including MERRA-2, CERES, GPM, MODIS, OMI, AIRS, GLDAS, SWOT, SeaWiFS, and CSA RADARSAT Constellation.
- **Inspect spatial patterns:** View a global anomaly heatmap and adjust its visibility in the map workspace.
- **Analyze trends:** Display monthly, annual, or (where supported) daily series; deseasonalize monthly data; and review ordinary least-squares (OLS) regression and Mann–Kendall/Sen-slope statistics, p-values, and confidence intervals.
- **Visualize and export:** Switch between 2D charts and a 3D time-series surface, and export the analysis as CSV.
- **Learn as you explore:** Use the Data Detective inquiry, guided case studies, methodology notes, and resource links built into the app.

## Requirements

- Node.js and npm, or [Bun](https://bun.sh/).
- Internet access for live NASA POWER observations and Open-Meteo location search. The app can show fallback series when upstream data is unavailable.

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

1. Select a region with the search box, preset locations, map, or coordinate input.
2. Choose a variable, start/end years, and the available temporal resolution.
3. Optionally enable deseasonalization and/or a comparison region.
4. Explore the plotted values, trend line, statistical summary, and map heatmap. Change the chart between 2D and 3D as desired.
5. Use **Export CSV** to download the current analysis or open a guided demonstration to follow a prepared case study.

Daily resolution is only available for variables that support it. NASA POWER daily requests are limited to a recent five-year window to keep responses manageable. The app may use monthly observations for annual analysis and aggregates them in the browser.

## Data sources and interpretation

- **NASA POWER:** The server requests live point data for supported POWER parameters, including air/surface temperature, soil moisture, humidity, wind, precipitation, surface solar radiation, cloud amount, and surface albedo.
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

Responses are cached in memory for 30 minutes. Example health check:

```text
http://localhost:3000/api/health
```

## Project structure

```text
src/
  components/       Map, globe, charts, statistics, and information panels
  data/             Earth variable, region, and demonstration catalogs
  utils/            Time-series statistics and CSV export helpers
  App.tsx           Main observatory interface and client-side data flow
  main.tsx          React entry point
server.ts           Express API, upstream data requests, and Vite integration
vite.config.ts      Vite, React, Tailwind CSS, and development settings
docs/               Attribution and contribution guidance
```

## Contributing

Please use your own Git identity and do not impersonate another contributor. See [docs/ATTRIBUTION.md](./docs/ATTRIBUTION.md) for attribution and co-authorship practices and [docs/CONTRIBUTOR_COMMIT_PLAN.md](./docs/CONTRIBUTOR_COMMIT_PLAN.md) for the contributor workflow.
