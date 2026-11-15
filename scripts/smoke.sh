#!/usr/bin/env bash
# TerraTrend Observatory smoke test.
# Usage: bash scripts/smoke.sh [BASE_URL]
#   BASE_URL defaults to http://localhost:3000
# Exits 0 only if every check passes.
set -u

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "FAIL: $1"; }

# Fetch a URL up to 3 times; prints body to stdout, returns nonzero on failure.
fetch_retry() {
  local url="$1" tries=0 body
  while [ "$tries" -lt 3 ]; do
    if body="$(curl -s -m 60 "$url")" && [ -n "$body" ]; then
      printf '%s' "$body"
      return 0
    fi
    tries=$((tries + 1))
    sleep 2
  done
  return 1
}

echo "Smoke-testing TerraTrend Observatory at $BASE_URL"
echo "---"

# 1. Health endpoint
if body="$(fetch_retry "$BASE_URL/api/health")" && echo "$body" | grep -q '"status":"ok"'; then
  pass "/api/health returns status ok ($body)"
else
  fail "/api/health did not return status ok"
fi

# 2. Live time series (Utqiagvik air temperature; accepts live POWER or labeled fallback)
if body="$(fetch_retry "$BASE_URL/api/earth-data?lat=71.29&lon=-156.79&variable=T2M&startYear=2020&endYear=2022&resolution=monthly")"; then
  if echo "$body" | grep -q '"points":\[' && ! echo "$body" | grep -q '"points":\[\]'; then
    src="$(echo "$body" | grep -o '"sourceType":"[^"]*"' | head -n 1)"
    pass "/api/earth-data returns monthly points ($src)"
  else
    fail "/api/earth-data returned no points"
  fi
else
  fail "/api/earth-data unreachable"
fi

# 3. Global anomaly heatmap grid shape (18 rows x 36 cols)
if body="$(fetch_retry "$BASE_URL/api/spatial-heatmap?variable=T2M&startYear=2020&endYear=2022")"; then
  if echo "$body" | grep -q '"rows":18' && echo "$body" | grep -q '"cols":36'; then
    src="$(echo "$body" | grep -o '"sourceType":"[^"]*"' | head -n 1)"
    pass "/api/spatial-heatmap returns 18x36 grid ($src)"
  else
    fail "/api/spatial-heatmap grid shape wrong"
  fi
else
  fail "/api/spatial-heatmap unreachable"
fi

# 4. Place search (live Open-Meteo + local catalog)
if body="$(fetch_retry "$BASE_URL/api/geocode?q=Nairobi")"; then
  if echo "$body" | grep -q '"results":\[' && ! echo "$body" | grep -q '"results":\[\]'; then
    pass "/api/geocode returns place results for 'Nairobi'"
  else
    fail "/api/geocode returned no results"
  fi
else
  fail "/api/geocode unreachable"
fi

# 5. NASA GIBS earth texture is real image bytes
tex_type="$(curl -s -m 90 -o /tmp/terratrend-smoke-tex.png -w '%{content_type}:%{size_download}' "$BASE_URL/api/satellite/earth-texture?kind=shaded" || true)"
case "$tex_type" in
  image/*:*)
    size="${tex_type##*:}"
    if [ "${size:-0}" -gt 10000 ] 2>/dev/null; then
      pass "/api/satellite/earth-texture returns image bytes ($tex_type)"
    else
      fail "/api/satellite/earth-texture image suspiciously small ($tex_type)"
    fi
    ;;
  *) fail "/api/satellite/earth-texture not an image ($tex_type)" ;;
esac

# 6. Regional before/after snapshot is real image bytes
snap_type="$(curl -s -m 90 -o /tmp/terratrend-smoke-snap.png -w '%{content_type}:%{size_download}' "$BASE_URL/api/satellite/regional-snapshot?lat=71.29&lon=-156.79&year=2020&month=7&span=2.4&layer=truecolor" || true)"
case "$snap_type" in
  image/*:*) pass "/api/satellite/regional-snapshot returns image bytes ($snap_type)" ;;
  *) fail "/api/satellite/regional-snapshot not an image ($snap_type)" ;;
esac

# 7. App shell serves HTML mentioning TerraTrend
if curl -s -m 60 "$BASE_URL/" | grep -q 'TerraTrend'; then
  pass "/ serves app HTML"
else
  fail "/ did not serve app HTML"
fi

echo "---"
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
