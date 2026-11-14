# Contributor Commit Plan (71 feature-focused commits)

This document provides a **72-commit** (≥71) per-feature plan for the TerraTrend / Earth-Science-Trend-Observatory codebase, distributed across the project’s contributors. It is intended to help each contributor create **their own commits from their own Git identity/account**.

> **Important**
> - Each person must run their commits themselves with their own `user.name`/`user.email` configured. See [`docs/ATTRIBUTION.md`](./ATTRIBUTION.md).
> - Do **not** impersonate other contributors or set commit author/committer fields to someone else.
> - This plan suggests ownership/areas; teams may reassign commits by agreement. Add `Co-authored-by` trailers when work is shared (with consent).

## Current repository state

- History currently includes an initial commit and a consolidated application commit (`feat: initialize TerraTrend Observatory application`).
- Because the application is already committed as a snapshot, reproducing this granular history requires a **history-rewrite workflow** (recommended on a new branch). Coordinate with your team before rewriting shared history.

## How to use this plan

### Option A — Rebuild granular history on a branch (recommended for planning/replay)

1. Create a working branch:
   ```bash
   git checkout -b chore/granular-history
   ```
2. Find the base commit (initial commit):
   ```bash
   git log --oneline --reverse | head -n 5
   ```
3. Soft/mixed reset to the initial commit to uncommit the consolidated snapshot while keeping files in the working tree (choose the approach your team prefers):
   ```bash
   # Example (keeps changes unstaged):
   git reset <initial-commit-sha>
   ```
4. Follow the commits below **in order**. For each commit:
   - Stage only the files/sections relevant to that feature (`git add -p` is useful for splitting within a file).
   - Commit as the **assigned contributor** from their own environment.
   - Use the suggested message (adapt if needed), and add `Co-authored-by` trailers for shared work.
5. Verify after each phase:
   ```bash
   git status
   npm run lint
   # or: bun run lint / project lint command as applicable
   ```

### Option B — Use as a forward-looking contribution plan

If you are not rewriting history, use these items as a backlog of small, reviewable PR-sized commits/features to implement or refactor going forward (each contributor commits their own work).

## Suggested timing (for contributors running their own commits)

If you are coordinating a work session, contributors may choose to space commits irregularly (for example, beginning around **12:00 local time** and finishing around **23:53 local time**) to reflect incremental progress. Timing is a personal/team workflow choice—do not falsify timestamps or identities.

---

## 72-commit plan by feature

| # | Contributor | Type | Suggested commit message | Primary scope / files |
|---:|---|---|---|---|
| 1 | mchere | chore | `chore: initialize repository metadata and ignore rules` | `.gitignore`, repository hygiene |
| 2 | mchere | chore | `chore: add environment variable example for local setup` | `.env.example` |
| 3 | mchere | chore | `chore: scaffold package manifest and npm scripts` | `package.json` (base scripts/deps layout) |
| 4 | mchere | chore | `chore: add lockfile for reproducible installs` | `bun.lock` |
| 5 | mchere | chore | `chore: configure TypeScript compiler options` | `tsconfig.json` |
| 6 | mchere | chore | `chore: configure Vite build and dev tooling` | `vite.config.ts` |
| 7 | mchere | chore | `chore: add application metadata manifest` | `metadata.json` |
| 8 | mchere | feat | `feat: add HTML entry document and root mount` | `index.html` |
| 9 | mchere | feat | `feat: add global styles and Tailwind base layer` | `src/index.css` |
| 10 | mchere | feat | `feat: bootstrap React application entry point` | `src/main.tsx` |
| 11 | mchere | chore | `chore: wire dev/start script integration points` | `package.json`, `server.ts` script alignment (config-level) |
| 12 | mchere | docs | `docs: document local development prerequisites` | `README`/docs notes (if added) or inline config comments scope |

| # | Contributor | Type | Suggested commit message | Primary scope / files |
|---:|---|---|---|---|
| 13 | hellenonyango | feat | `feat: create Express server skeleton and app bootstrap` | `server.ts` (app setup, middleware basics) |
| 14 | hellenonyango | feat | `feat: add static asset and Vite/dev middleware integration` | `server.ts` (dev/prod serving) |
| 15 | hellenonyango | feat | `feat: implement NASA POWER proxy request handling` | `server.ts` (proxy endpoint structure) |
| 16 | hellenonyango | feat | `feat: normalize NASA POWER responses for client consumption` | `server.ts` (response shaping, units/fields) |
| 17 | hellenonyango | feat | `feat: add monthly and daily resolution support in API layer` | `server.ts` (resolution handling) |
| 18 | hellenonyango | feat | `feat: implement climatology/fallback data source handling` | `server.ts` (fallback/source labeling) |
| 19 | hellenonyango | feat | `feat: add spatial anomaly grid computation endpoint` | `server.ts` (heatmap/grid logic) |
| 20 | hellenonyango | feat | `feat: add geocoding/search endpoint for locations` | `server.ts` (geocoding API) |
| 21 | hellenonyango | fix | `fix: harden API error handling and validation` | `server.ts` (input checks, error responses) |
| 22 | hellenonyango | perf | `perf: optimize server-side grid sampling and response size` | `server.ts` (sampling/perf tweaks) |
| 23 | hellenonyango | chore | `chore: add server configuration and environment wiring` | `server.ts`, `.env.example` alignment |
| 24 | hellenonyango | docs | `docs: annotate API endpoints and data source behavior` | `server.ts` comments/docs notes |

| # | Contributor | Type | Suggested commit message | Primary scope / files |
|---:|---|---|---|---|
| 25 | asoyovick | feat | `feat: define Earth variable type system and metadata model` | `src/data/earthCatalog.ts` (types/interfaces) |
| 26 | asoyovick | feat | `feat: add core Earth variable catalog entries` | `src/data/earthCatalog.ts` (variables list) |
| 27 | asoyovick | feat | `feat: add preset regions and demonstration case definitions` | `src/data/earthCatalog.ts` (regions/cases) |
| 28 | asoyovick | feat | `feat: implement time-series data structures and helpers` | `src/utils/statistics.ts` (types/helpers) |
| 29 | asoyovick | feat | `feat: implement OLS trend fitting and summary statistics` | `src/utils/statistics.ts` (OLS/slope/intercept) |
| 30 | asoyovick | feat | `feat: add t-test significance estimation for trends` | `src/utils/statistics.ts` (significance logic) |
| 31 | asoyovick | feat | `feat: implement Mann-Kendall trend test` | `src/utils/statistics.ts` |
| 32 | asoyovick | feat | `feat: implement Sen’s slope estimator` | `src/utils/statistics.ts` |
| 33 | asoyovick | feat | `feat: add deseasonalization and aggregation utilities` | `src/utils/statistics.ts` (monthly/annual transforms) |
| 34 | asoyovick | feat | `feat: add CSV export builder for analysis outputs` | `src/utils/statistics.ts` (`buildCSVExport`) |
| 35 | asoyovick | fix | `fix: handle edge cases in sparse or invalid time series` | `src/utils/statistics.ts` (guards) |
| 36 | asoyovick | test | `test: add validation scenarios for statistical routines` | test files or validation scripts (if introduced) / stats verification notes |

| # | Contributor | Type | Suggested commit message | Primary scope / files |
|---:|---|---|---|---|
| 37 | altradits | feat | `feat: add procedural Earth texture generation utilities` | `src/utils/earthTextures.ts` (base textures) |
| 38 | altradits | feat | `feat: add atmosphere/cloud/lighting texture helpers` | `src/utils/earthTextures.ts` (overlays/material inputs) |
| 39 | altradits | feat | `feat: create 3D globe scene, camera, and renderer setup` | `src/components/EarthGlobe3D.tsx` (Three.js bootstrap) |
| 40 | altradits | feat | `feat: implement Earth mesh, materials, and texture mapping` | `src/components/EarthGlobe3D.tsx` |
| 41 | altradits | feat | `feat: add orbit controls and interaction handling` | `src/components/EarthGlobe3D.tsx` (controls, picking hooks) |
| 42 | altradits | feat | `feat: add marker/selection rendering for chosen coordinates` | `src/components/EarthGlobe3D.tsx` |
| 43 | altradits | feat | `feat: support compare-location visualization on globe` | `src/components/EarthGlobe3D.tsx` |
| 44 | altradits | feat | `feat: integrate spatial heatmap overlay into 3D view` | `src/components/EarthGlobe3D.tsx`, heatmap props |
| 45 | altradits | perf | `perf: optimize 3D render loop and resource cleanup` | `src/components/EarthGlobe3D.tsx` (dispose, resize, RAF) |
| 46 | altradits | fix | `fix: improve globe responsiveness and viewport sizing` | `src/components/EarthGlobe3D.tsx` |
| 47 | altradits | style | `style: refine 3D scene lighting and visual presentation` | `src/components/EarthGlobe3D.tsx`, `src/utils/earthTextures.ts` |
| 48 | altradits | docs | `docs: document 3D globe props and interaction behavior` | component-level docs/comments |

| # | Contributor | Type | Suggested commit message | Primary scope / files |
|---:|---|---|---|---|
| 49 | jackomosh | feat | `feat: implement 2D world map selector base layout` | `src/components/WorldMapSelector.tsx` (map scaffold) |
| 50 | jackomosh | feat | `feat: add coordinate selection and region interaction on 2D map` | `src/components/WorldMapSelector.tsx` |
| 51 | jackomosh | feat | `feat: render spatial anomaly heatmap layer on 2D map` | `src/components/WorldMapSelector.tsx` (canvas/overlay) |
| 52 | jackomosh | feat | `feat: add heatmap opacity and visibility controls integration` | `src/components/WorldMapSelector.tsx`, related props |
| 53 | jackomosh | feat | `feat: build location search bar with query and results UI` | `src/components/LocationSearchBar.tsx` |
| 54 | jackomosh | feat | `feat: connect location search results to map/globe selection` | `src/components/LocationSearchBar.tsx`, selection callbacks |
| 55 | jackomosh | feat | `feat: implement 2D time-series chart rendering` | `src/components/TimeSeriesChart.tsx` |
| 56 | jackomosh | feat | `feat: add trend overlays and comparative series support to 2D chart` | `src/components/TimeSeriesChart.tsx` |
| 57 | jackomosh | feat | `feat: implement 3D time-series surface visualization` | `src/components/TimeSeries3DSurface.tsx` |
| 58 | jackomosh | feat | `feat: add chart view toggles and responsive chart layout` | `src/components/TimeSeriesChart.tsx`, `src/components/TimeSeries3DSurface.tsx` |
| 59 | jackomosh | fix | `fix: improve chart/map empty states and loading behavior` | chart/map components |
| 60 | jackomosh | perf | `perf: reduce unnecessary re-renders in visualization components` | visualization components memoization/props tuning |

| # | Contributor | Type | Suggested commit message | Primary scope / files |
|---:|---|---|---|---|
| 61 | Christian3788 | feat | `feat: compose main observatory workspace layout in App` | `src/App.tsx` (layout shell, sections) |
| 62 | Christian3788 | feat | `feat: wire variable, resolution, and time-range controls` | `src/App.tsx`, catalog/control bindings |
| 63 | Christian3788 | feat | `feat: integrate primary/compare region state and data fetching` | `src/App.tsx` (fetch flows, state) |
| 64 | Christian3788 | feat | `feat: connect heatmap loading and spatial view toggles` | `src/App.tsx`, `WorldMapSelector`/`EarthGlobe3D` integration |
| 65 | Christian3788 | feat | `feat: build statistical verdict and insights panel UI` | `src/components/StatisticalPanel.tsx` |
| 66 | Christian3788 | feat | `feat: add guided Data Detective walkthrough modal` | `src/components/DataDetectiveModal.tsx`, demo state in `App.tsx` |
| 67 | Christian3788 | feat | `feat: add methodology section explaining analysis pipeline` | `src/components/MethodologySection.tsx` |
| 68 | Christian3788 | feat | `feat: add resources and references directory section` | `src/components/ResourcesSection.tsx` |
| 69 | Christian3788 | feat | `feat: add export/reporting actions and user feedback states` | `src/App.tsx`, export/stat panel integration |
| 70 | Christian3788 | fix | `fix: polish loading, error, and empty-state UX across workspace` | `src/App.tsx`, shared UI states |
| 71 | Christian3788 | docs | `docs: add attribution and contributor workflow documentation` | `docs/ATTRIBUTION.md`, `.gitmessage.txt`, `docs/CONTRIBUTOR_COMMIT_PLAN.md` |
| 72 | Christian3788 | chore | `chore: finalize project scripts and contributor tooling references` | `package.json`, `scripts/commit-by-member.sh` (reference-only/update notes as agreed) |

## Notes for maintainers

- **Commit granularity:** Some commits above may require splitting a single file into multiple staged hunks (`git add -p`). That is expected for a true per-feature history.
- **Validation:** Run lint/build/tests as available after meaningful milestones (e.g. after commits 12, 24, 36, 48, 60, 72).
- **Shared work:** When a commit includes paired work, keep the primary implementer as the committer/author (their own identity) and add `Co-authored-by` trailers for collaborators with consent.
- **No impersonation:** Do not automate commits using other people’s identities. If you need a helper script, have it prompt for the current user’s name/email or rely on local Git config.
