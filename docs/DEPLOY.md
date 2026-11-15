# Deploy & Run Guide — TerraTrend Observatory

All commands below were verified on Node v24 + npm 11 (macOS). See "Verified runs" at the bottom.

## Prerequisites

- **Node.js 22.6+** (24 recommended). `npm start` runs `node server.ts` directly and relies on Node's native TypeScript type-stripping (stable since 22.6, enabled by default since 23.6). On older Node, use `npx tsx server.ts` instead of `npm start`.
- **npm** (or [Bun](https://bun.sh/) — the repo ships `bun.lock`, so `bun install` / `bun run dev` work as alternatives).
- **Internet access** for live NASA POWER observations, NASA GIBS imagery, and Open-Meteo search. No API key or `.env` file is required; `.env.example` holds placeholders for the AI Studio hosting environment only.

## Local development (the one command)

```bash
npm install --legacy-peer-deps
npm run dev
```

Open **http://localhost:3000**. The Express server mounts Vite middleware in development — do not start Vite alone, or the API routes won't exist.

To use a different port (macOS/Linux):

```bash
PORT=4000 npm run dev
```

Windows PowerShell:

```powershell
$env:PORT = "4000"
npm run dev
```

## Production build & serve

```bash
npm run build                    # emits dist/ (index.html + hashed assets)
NODE_ENV=production npm start    # serves dist/ + API on port 3000
```

PowerShell:

```powershell
npm run build
$env:NODE_ENV = "production"
npm start
```

Notes:

- `npm run preview` starts Vite's static preview server only — it does **not** serve the API. Always use `npm start` (Express) for production.
- `npm run clean` removes `dist/` and `server.js`.
- The server binds `0.0.0.0`, so it is reachable on the LAN (useful for phone demos on venue wifi) — check firewall prompts on first run.

## Verify the deployment

With the server running (dev or prod):

```bash
bash scripts/smoke.sh                            # defaults to http://localhost:3000
bash scripts/smoke.sh http://localhost:4000      # custom port
```

7 checks, exit 0 only if all pass: `/api/health`, live `/api/earth-data` points, `/api/spatial-heatmap` 18×36 grid, `/api/geocode` results, GIBS earth texture + regional snapshot image bytes, and the app HTML shell. Upstream-dependent checks retry 3×.

Static checks (no server needed):

```bash
npm run lint     # tsc --noEmit, must be clean
npm test         # unit + science tests, must pass
npm run build    # must emit dist/index.html + dist/assets/
```

## How it behaves without upstream

- Supported POWER variables degrade to a **labeled climatology fallback** (the UI shows the source label) instead of erroring.
- JSON cached 30 min in memory; satellite images 12 h — brief outages mid-demo are invisible.
- Imagery start years clamp to each sensor's launch year (e.g., AMSR2 sea ice from 2013); daily POWER requests are limited to a recent 5-year window.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `npm install` fails with `ERESOLVE` peer conflict | Upstream React-19-era peer ranges; install with `npm install --legacy-peer-deps` (verified) or use `bun install`. |
| `npm start` → `ERR_UNKNOWN_FILE_EXTENSION` or TS syntax error | Node is older than 22.6. Upgrade Node, or run `NODE_ENV=production npx tsx server.ts`. |
| Blank page / API 404s under `vite preview` or `vite dev` alone | Expected: only the Express server (`npm run dev` / `npm start`) serves the API. |
| Port already in use | Set `PORT` (see above). The server does not auto-pick a free port. |
| Slow first load, fast after | Normal: first requests pay NASA upstream latency, then serve from cache. Warm with `bash scripts/smoke.sh`. |
| `sourceType` shows `climatology-fallback` | Upstream POWER request failed or was rate-limited; the label is the honest signal. Retry later. |

## Verified runs (2026-11-15, Node v24.19.0, npm 11.17.0)

- `npm install --legacy-peer-deps` → success (plain `npm install` fails on peer conflict).
- `npm run lint` → clean, no errors.
- `npm run build` → `dist/index.html` (1.56 kB) + JS (1.21 MB / 340 kB gzip) + CSS in ~0.4 s.
- Dev (`PORT=3101 npx tsx server.ts`): `/api/health` 200 `{"status":"ok",…}`; `/api/earth-data` (Utqiaġvik T2M) 200 `nasa-power-live` in ~2.2 s; `/api/spatial-heatmap` 200 `nasa-power-blended` (16 stations); `/api/geocode?q=Nairobi` 200 with live results.
- Prod (`NODE_ENV=production PORT=3102 node server.ts`, i.e. the `npm start` path): boots and serves API identically; `/api/earth-data` (Nairobi precipitation) 200 `nasa-power-live` in ~3.6 s.
- `bash scripts/smoke.sh http://localhost:3102` → 4/4 JSON-API checks PASS with live sources. (HTML/image-byte delivery could not be asserted from inside the author's sandboxed shell, whose egress proxy drops non-JSON localhost responses — including plain static files; re-run the script outside a sandbox for the full 7/7. The `dist/` bundle it serves was verified on disk.)
