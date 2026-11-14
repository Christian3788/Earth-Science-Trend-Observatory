#!/usr/bin/env bash
set -euo pipefail

if [ ! -d ".git" ]; then
  git init
  git branch -M main
fi

commit_for() {
  local name="$1"
  local email="$2"
  local message="$3"
  shift 3

  git add -- "$@"
  if ! git diff --cached --quiet; then
    GIT_AUTHOR_NAME="$name" \
    GIT_AUTHOR_EMAIL="$email" \
    GIT_COMMITTER_NAME="$name" \
    GIT_COMMITTER_EMAIL="$email" \
    git commit -m "$message"
  else
    echo "Skipping '$message' (no staged changes)."
  fi
}

# Part 1: Project Setup, Build Configuration & Entry Point
commit_for "mchere" "chemeremiriam@gmail.com" \
  "chore: configure Vite, TypeScript, Tailwind, and application entry" \
  .gitignore .env.example package.json bun.lock tsconfig.json vite.config.ts metadata.json index.html src/index.css src/main.tsx

# Part 2: Backend Express Server, NASA POWER Proxy, Heatmap Grid & Geocoding API
commit_for "hellenonyango" "hellenonyango340@gmail.com" \
  "feat: add NASA POWER API proxy, spatial anomaly grid, and geocoding endpoints" \
  server.ts

# Part 3: Earth Science Variable Catalog & Statistical Significance Engine
commit_for "asoyovick" "oumaasoyoh@gmail.com" \
  "feat: implement Earth variable catalog, OLS t-test, Mann-Kendall, and Sen slope engine" \
  src/data/earthCatalog.ts src/utils/statistics.ts

# Part 4: 3D Orbital Earth Globe & Procedural Texture Generator
commit_for "altradits" "altradits@gmail.com" \
  "feat: build interactive Three.js 3D orbital globe and Earth surface textures" \
  src/utils/earthTextures.ts src/components/EarthGlobe3D.tsx

# Part 5: 2D Spatial Anomaly Map, Location Search & 2D/3D Time-Series Charts
commit_for "jackomosh" "jackomosh6@gmail.com" \
  "feat: add 2D spatial anomaly heatmap map, location search, and 2D/3D trend charts" \
  src/components/WorldMapSelector.tsx src/components/LocationSearchBar.tsx src/components/TimeSeriesChart.tsx src/components/TimeSeries3DSurface.tsx

# Part 6: Observatory Workspace, Statistical Panel, Data Detective & Resources Directory
commit_for "Christian3788" "christianamos67@gmail.com" \
  "feat: assemble observatory console, statistical verdict panel, walkthroughs, and resources" \
  src/components/StatisticalPanel.tsx src/components/DataDetectiveModal.tsx src/components/MethodologySection.tsx src/components/ResourcesSection.tsx src/App.tsx scripts/commit-by-member.sh

echo ""
echo "=== Commit Summary ==="
git log --format="%h %an <%ae> - %s"
echo ""
echo "=== Remaining Untracked / Uncommitted Files ==="
git status --short
