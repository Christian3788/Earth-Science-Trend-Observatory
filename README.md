# TerraTrend Observatory

**Is this place actually warming — or does it just feel that way?** TerraTrend is an interactive Earth-science workbench that lets anyone point at a spot on Earth, pull decades of NASA observations for it, and test whether the trend is statistically real.

> **Data note:** This application combines live NASA POWER data for supported variables with modeled mission-reference or climatology fallback series for other variables and when the upstream data service is unavailable. The interface identifies the source for each series. A fallback series is not a substitute for a direct satellite observation or peer-reviewed analysis.

## The problem

Climate arguments usually die in anecdotes: one hot summer, one cold snap, one cherry-picked chart. Meanwhile NASA's open archives (POWER, GIBS, MERRA-2, MODIS, OMI, GPM…) hold 40+ years of observations — but they live behind scientific APIs no student, journalist, or policymaker will ever touch. TerraTrend closes that gap: pick a place, pick a variable, and get an honest time series with real significance testing, in seconds.

## What it does

- **Explore a location:** preset regions, place search, latitude/longitude input, or click the 2D map / 3D orbital globe (NASA Blue Marble + ASTER GDEM textures).
- **Compare regions:** overlay a second location — connected by a great-circle arc on the globe — to see teleconnections like the ENSO precipitation dipole.
- **Choose variables and time ranges:** 17 variables across atmosphere, hydrosphere, land/biosphere, and energy/radiation, from missions including MERRA-2, CERES, GPM, MODIS, OMI, AIRS, GLDAS, SWOT, SeaWiFS, and CSA RCM.
- **Inspect spatial patterns:** computed global anomaly heatmap, or live NASA GIBS satellite layers over a Blue Marble basemap (2D and 3D) with adjustable opacity.
- **See real change imagery:** regional MODIS True Color, land-surface temperature, NDVI vegetation, and AMSR2 sea-ice captures with a Split Wipe / Side-by-Side comparator across years or regions.
- **Test significance for real:** monthly/annual/daily series, deseasonalization, OLS regression with 95% CI bands, Mann–Kendall + Sen's slope, p-values — plus CSV export.
- **Learn as you explore:** 6 guided demonstration cases, a Data Detective inquiry mode, methodology notes, and resource links built into the app.

## Run it in 60 seconds

Prerequisites: Node.js 22.6+ (or 24+) and internet access for live NASA services. No API key needed.

```bash
npm install --legacy-peer-deps   # one-time setup (see note below)
npm run dev                      # start the app
```

Open **http://localhost:3000**. That's it — the Express server mounts Vite in development, so `npm run dev` is the only command you need.

> `bun install` also works (the repo ships `bun.lock`). Plain `npm install` currently hits an upstream peer-dependency conflict, hence `--legacy-peer-deps`. Production deploy is `npm run build` + `npm start` — details in [docs/DEPLOY.md](./docs/DEPLOY.md).

## Demo walkthrough (3 acts, ~5 minutes)

Full click-by-click script with timings and judge Q&A: [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md).

1. **Act 1 — The hook (Arctic warming).** Guided case *"Arctic Amplification"*: raw Utqiaġvik skin temperature looks like noise (±30 °C seasons). Toggle **Remove Seasonal Cycle** — the warming slope jumps out, p-value significant. Cross-check with Surface Albedo: ice loss explains it.
2. **Act 2 — The wow (two regions, one planet).** Guided case *"Opposite Trends, Same Earth Process"*: Borneo vs. Coastal Peru precipitation. Deseasonalize, overlay both — the lines surge in opposite directions. Same Pacific engine, opposite local stories. Spin the 3D globe with the live satellite layer on.
3. **Act 3 — The proof (imagery + rigor).** Open **Real NASA Satellite Change Imagery**, wipe 2001 → 2024 NDVI or sea ice. Then point at the statistical panel: OLS slope, 95% CI, Mann–Kendall p-value — every claim on screen carries its own uncertainty.

## 90-second pitch script

> "Every climate debate you've ever seen dies the same way — anecdotes. One hot summer versus one cold snap, and nobody checks the data.
>
> TerraTrend fixes that. I click anywhere on Earth — say, Utqiaġvik, Alaska — pick a NASA variable, and instantly get forty years of observations. Watch: raw temperatures look like pure noise. But one click removes the seasonal cycle… and there's the trend, with a p-value attached.
>
> Now compare Borneo and Peru — same ocean, opposite rainfall trends. And everything is backed by real NASA satellite imagery and published statistical tests, not vibes.
>
> Forty years of NASA data. Anywhere on Earth. Significance included."

## Tech stack

| Layer | Technology |
| --- | --- |
| UI | React 19, Vite 8, Tailwind CSS 4, three.js globe, SVG charts |
| Statistics | Client-side OLS, Mann–Kendall/Sen's slope, t-tests, CI bands (`src/utils/statistics.ts`) |
| Server | Express + `tsx`, in-memory cache (30 min JSON / 12 h imagery) |
| Live data | NASA POWER point API, NASA GIBS WMS imagery, Open-Meteo geocoding |

## Data sources — and honest limits

- **Live NASA POWER** point data (9 parameters: air/skin temperature, soil wetness, humidity, wind, precipitation, solar radiation, cloud, albedo) is fetched per location and labeled `NASA POWER Live` in the UI.
- **Live NASA GIBS** imagery: Blue Marble/ASTER basemaps, global scientific rasters, and regional before/after snapshots. Start years clamp to each sensor's launch year.
- **Modeled/reference series:** 8 catalog variables (mission-specific vegetation, atmospheric composition, runoff, water elevation, ocean color, wetland products) use calibrated reference profiles, not a live point-data connection — the UI labels these, and judges *should* ask about them (see the Q&A in [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md)).
- **Heatmap:** a gridded anomaly view from reference profiles, blended with live POWER anchors when enough upstream samples arrive — not a complete gridded NASA product.
- **Fallbacks:** if an upstream request fails, supported variables degrade to a labeled climatology fallback rather than failing silently.

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

JSON responses are cached in memory for 30 minutes and NASA GIBS satellite images for 12 hours.

Daily resolution is only available for variables that support it. NASA POWER daily requests are limited to a recent five-year window, and Surface Albedo (`ALLSKY_SRF_ALB`) begins in 2001. The app uses monthly observations for annual analysis and aggregates them in the browser.

## Verify your setup

```bash
npm run lint                      # TypeScript check (tsc --noEmit)
bash scripts/smoke.sh             # hits every endpoint (server must be running)
```

`scripts/smoke.sh` checks health, live time series, heatmap grid shape, geocoding, both satellite image endpoints, and the app shell — exiting nonzero on any failure. Run it against a custom port with `bash scripts/smoke.sh http://localhost:4000`.

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Express with Vite middleware and hot module replacement. |
| `npm run build` | Create the production frontend build in `dist`. |
| `npm start` | Start the server; set `NODE_ENV=production` to serve the production build. Requires Node 22.6+ (native TS type-stripping). |
| `npm run preview` | Preview the Vite build as a static frontend (no API — not a substitute for the Express server). |
| `npm run lint` | Run TypeScript checking (`tsc --noEmit`). |
| `npm test` | Run the test suite (`tests/`). |
| `npm run verify:science` | Run the science/statistical-correctness tests. |

## Project structure

```text
src/
  components/       Map, 3D globe, regional satellite comparator, charts, statistics, and info panels
  data/             Earth variable, region, and demonstration catalogs
  utils/            Time-series statistics, procedural Earth fallback textures, and CSV export helpers
  App.tsx           Main observatory interface and client-side data flow
  main.tsx          React entry point
server.ts           Express API, NASA POWER/GIBS/Open-Meteo proxies, and Vite integration
scripts/smoke.sh    End-to-end smoke test for all endpoints
docs/               Demo script, deploy guide, attribution, contribution guidance
```

## Docs

- [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md) — 90-second pitch, 5-minute demo, judge Q&A, failure fallbacks.
- [docs/DEPLOY.md](./docs/DEPLOY.md) — install, dev, production build, ports, troubleshooting.

## Contributing

Please use your own Git identity and do not impersonate another contributor. See [docs/ATTRIBUTION.md](./docs/ATTRIBUTION.md) for attribution and co-authorship practices and [docs/CONTRIBUTOR_COMMIT_PLAN.md](./docs/CONTRIBUTOR_COMMIT_PLAN.md) for the contributor workflow.
