# TerraTrend Observatory — Demo Script & Pitch Guide

For the presenter. Assumes the app is running at http://localhost:3000 with internet access.
Pre-demo: run `bash scripts/smoke.sh` once — all 7 checks green means every endpoint and upstream is reachable.

## 90-second pitch (verbatim)

> "Every climate debate you've ever seen dies the same way — anecdotes. One hot summer versus one cold snap, and nobody checks the data. *(0:00–0:15)*
>
> TerraTrend fixes that. I click anywhere on Earth — say, Utqiaġvik, Alaska — pick a NASA variable, and instantly get forty years of observations. Watch: raw temperatures look like pure noise. But one click removes the seasonal cycle… and there's the trend, with a p-value attached. *(0:15–0:50)*
>
> Now compare Borneo and Peru — same ocean, opposite rainfall trends. And everything is backed by real NASA satellite imagery and published statistical tests, not vibes. *(0:50–1:15)*
>
> Forty years of NASA data. Anywhere on Earth. Significance included." *(1:15–1:30)*

**What to click while saying it:** guided case *"Arctic Amplification"* → toggle **Remove Seasonal Cycle** at "one click" → switch to *"Opposite Trends"* case at "Borneo and Peru" → wipe the satellite comparator at "satellite imagery".

## 5-minute deep dive (click-by-click)

### Act 1 — The hook: Arctic warming (0:00–1:40)

1. Open the guided case **"Arctic Amplification Through Seasonal Noise"** (Utqiaġvik, Alaska, Earth Skin Temperature 1985–2024).
2. Point at the raw chart: ±30 °C seasonal swings burying any trend. Say: *"This is what raw data looks like — the answer is in there, but you can't see it."*
3. Toggle **Remove Seasonal Cycle**. The deseasonalized anomalies slope upward. Read the panel: OLS slope, **p < 0.05**, Mann–Kendall agrees.
4. Step 3 of the case switches to **Surface Albedo**: falling reflectivity — melting snow/ice — is the physical mechanism. *"Claim, significance, mechanism. That's the whole loop."*

### Act 2 — The wow: two regions, one planet (1:40–3:20)

1. Open **"Opposite Trends, Same Earth Process"** (Borneo vs. Coastal Peru precipitation).
2. Steps 1–2: deseasonalize Borneo. Step 3: add Peru — the two lines surge in opposite directions. *"Same Pacific engine, opposite local stories. Global averages would erase this."*
3. Switch to the **3D globe**, enable the **Satellite Data Layer**, spin it. The great-circle arc connects your two regions. Let it rotate for 5 seconds — this is the screenshot moment.

### Act 3 — The proof: imagery + rigor (3:20–5:00)

1. Open **Real NASA Satellite Change Imagery** → **Split Wipe** → NDVI or sea ice, 2001 vs. 2024. Drag the wipe slowly. *"These are real NASA captures, not illustrations."*
2. End on the **statistical panel**: OLS slope + 95% CI band, Mann–Kendall/Sen's slope, p-values, CSV export. *"Every claim on this screen carries its own uncertainty — and you can download the numbers."*
3. Close with the pitch's last line: *"Forty years of NASA data. Anywhere on Earth. Significance included."*

## If judges go off-script (likely detours)

- **"Let me pick my hometown."** Use the search box (live Open-Meteo geocoding) or click the map, keep Air Temperature, 1985–2024, deseasonalized. Works anywhere on Earth.
- **"Show me daily data."** Switch resolution to daily on a `supportsDaily` variable (recent 5-year window only — NASA POWER limit, say so).
- **"What's the 3D surface?"** Toggle the **Year × Month seasonal surface**: ridges = seasons, tilt along the year axis = the trend, in 3D.
- **"How do I know the stats are right?"** OLS + Mann–Kendall/Sen's slope are textbook methods implemented in `src/utils/statistics.ts`; CI bands and p-values are shown, not hidden; CSV export lets anyone re-run the numbers.

## Judge Q&A — data authenticity (expect this, lead with honesty)

**"Is this real NASA data?"**
"Yes for 9 variables — live NASA POWER point observations, labeled `NASA POWER Live` in the UI, verifiable at `power.larc.nasa.gov` with the same coordinates. The remaining 8 catalog variables use calibrated reference profiles, also labeled. Ask me to show you both labels."

**"So some of it is modeled?"**
"Yes — and that's disclosed per series, not in fine print. Mission-specific products without a public point API (SeaWiFS chlorophyll, SWOT water elevation, RCM radar…) use reference profiles so the app can still teach the analysis workflow. The heatmap blends live POWER anchors into a model grid and says so. We'd rather show the label than fake certainty."

**"What if NASA is down during the demo?"**
"Supported variables degrade to a labeled climatology fallback instead of failing, JSON responses are cached for 30 minutes, and imagery for 12 hours — so a brief outage mid-demo is invisible. If the venue wifi dies completely, that's our cue to talk methodology" (see below).

## Failure fallbacks (in order)

1. **Upstream slow:** wait — the 30-min/12-h caches mean only the first request pays the cost. Run the smoke test during setup to warm them.
2. **One endpoint down:** pivot cases — 6 guided cases span live POWER variables (T2M, TS, PRECTOTCORR, GWETPROF) and reference ones; at least one path always works.
3. **No internet at all:** stick to the recorded path — Utqiaġvik or Nairobi with any of the 6 tracking buttons, search for Nairobi/Tokyo. The server serves recorded live data badged "Offline demo (recorded live data)". Anything else falls back to labeled reference series; be honest about the badge if asked.
4. **App crash:** refresh — state is simple to rebuild in ~20 seconds via a guided case (pick a case, toggle deseasonalize).

## Setup checklist (day before)

- [ ] `npm install --legacy-peer-deps` on the demo machine; `npm run build` succeeds.
- [ ] `npm run dev`, then `bash scripts/smoke.sh` → 7/7 green (warms caches too).
- [ ] Screen resolution ≥ 1280px; browser zoom 100%; hide bookmarks bar.
- [ ] Guided cases load: Arctic, ENSO dipole, one imagery wipe.
- [ ] Phone hotspot as backup network, fully charged.
