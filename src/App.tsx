import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EARTH_VARIABLES, PRESET_REGIONS, type PresetRegion } from './data/earthCatalog';
import { resolveKeyVariables } from './data/keyVariables';
import { analyzeTimeSeries, type TimeSeriesPoint } from './utils/statistics';
import { LocationSearchBar } from './components/LocationSearchBar';
import { WorldMapSelector } from './components/WorldMapSelector';
import { Navbar } from './components/Navbar';
import { TimeSeriesChart } from './components/TimeSeriesChart';
import { TrendDashboard } from './components/TrendDashboard';
import { PlainWordsCard } from './components/PlainWordsCard';
import { KeyDetailsPanel } from './components/KeyDetailsPanel';
import { PointerMenu } from './components/PointerMenu';
import { DashboardErrorBoundary } from './components/DashboardErrorBoundary';

interface ApiEarthResponse {
  variable: string;
  lat: number;
  lon: number;
  resolution: 'monthly' | 'daily';
  sourceType: 'nasa-power-live' | 'mission-reference' | 'climatology-fallback';
  sourceLabel: string;
  points: TimeSeriesPoint[];
  offlineDemo?: boolean;
  error?: string;
}

// Fixed analysis setup for the simple dashboard: monthly observations,
// seasonal cycle removed, full 1985–2024 window.
const RESOLUTION = 'monthly' as const;
const DESEASONALIZED = true;
const START_YEAR = 1985;
const END_YEAR = 2024;

export default function App() {
  const [primaryLat, setPrimaryLat] = useState<number>(71.29);
  const [primaryLon, setPrimaryLon] = useState<number>(-156.79);
  const [primaryLabel, setPrimaryLabel] = useState<string>('Utqiaġvik, AK');
  const [variableId, setVariableId] = useState<string>('TS');
  const [primaryData, setPrimaryData] = useState<ApiEarthResponse | null>(null);
  const [loadingPrimary, setLoadingPrimary] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState<number>(0);
  const [spotlitId, setSpotlitId] = useState<string | null>(null);

  const selectedVariable = useMemo(
    () => EARTH_VARIABLES.find((v) => v.id === variableId) || EARTH_VARIABLES[0],
    [variableId],
  );

  const keyVariables = useMemo(() => resolveKeyVariables(), []);

  const fetchSeries = useCallback(
    async (
      lat: number,
      lon: number,
      varId: string,
      sYear: number,
      eYear: number,
      signal: AbortSignal,
    ): Promise<ApiEarthResponse> => {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        variable: varId,
        startYear: String(sYear),
        endYear: String(eYear),
        resolution: RESOLUTION,
      });
      const resp = await fetch(`/api/earth-data?${params.toString()}`, { signal });
      const data = (await resp.json()) as ApiEarthResponse;
      if (!resp.ok || data.error) {
        throw new Error(data.error || 'Failed to acquire regional time series.');
      }
      return data;
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoadingPrimary(true);
    setFetchError(null);

    fetchSeries(primaryLat, primaryLon, variableId, START_YEAR, END_YEAR, controller.signal)
      .then((res) => {
        setPrimaryData(res);
        setLoadingPrimary(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setFetchError(err instanceof Error ? err.message : 'Unable to fetch Earth observation data.');
        setLoadingPrimary(false);
      });

    return () => controller.abort();
  }, [primaryLat, primaryLon, variableId, fetchSeries, retryNonce]);

  const primarySummary = useMemo(() => {
    if (!primaryData?.points?.length) return null;
    return analyzeTimeSeries(primaryData.points, {
      resolution: RESOLUTION,
      deseasonalize: DESEASONALIZED,
      variableName: selectedVariable.name,
      unit: selectedVariable.unit,
      regionName: primaryLabel,
    });
  }, [primaryData, selectedVariable, primaryLabel]);

  const scrollToCard = useCallback((elementId: string) => {
    requestAnimationFrame(() => {
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document
        .getElementById(elementId)
        ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  }, []);

  // Left-panel shortcut: load a tracked variable, then bring its
  // chart + plain-words interpretation into view on the right.
  const handleSelectKeyVariable = useCallback(
    (id: string) => {
      setVariableId(id);
      scrollToCard('detail-words');
    },
    [scrollToCard],
  );

  // Pointer menu: spotlight exactly one finding card, or clear the spot.
  const handlePoint = useCallback(
    (targetId: string | null) => {
      setSpotlitId(targetId);
      if (targetId) scrollToCard(targetId);
    },
    [scrollToCard],
  );

  const spotRing = (elementId: string) =>
    spotlitId === elementId ? 'ring-2 ring-blue-600 rounded-lg' : '';

  // Map picker: drop a point anywhere, or tap a preset marker.
  const handleMapSelect = useCallback((lat: number, lon: number, preset?: PresetRegion) => {
    const label = preset
      ? preset.shortName
      : `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
    setPrimaryLat(lat);
    setPrimaryLon(lon);
    setPrimaryLabel(label);
  }, []);

  return (
    <div id="top" className="min-h-screen bg-slate-100 text-slate-950 flex flex-col">
      <Navbar locationLabel={primaryLabel} />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 space-y-5">
        <section id="location" aria-label="Location" className="scroll-mt-24 space-y-4">
          <div className="max-w-2xl">
            <LocationSearchBar
              onSelectLocation={(loc) => {
                setPrimaryLat(loc.lat);
                setPrimaryLon(loc.lon);
                setPrimaryLabel(loc.name);
              }}
            />
          </div>
          <DashboardErrorBoundary panelName="Location map">
            <WorldMapSelector
              primaryLat={primaryLat}
              primaryLon={primaryLon}
              primaryLabel={primaryLabel}
              compareMode={false}
              compareLat={0}
              compareLon={0}
              compareLabel=""
              activeSelectionTarget="primary"
              onSelectTargetChange={() => {}}
              onSelectCoordinate={handleMapSelect}
              presets={PRESET_REGIONS}
              activePresetId={null}
              comparePresetId={null}
              heatmapData={null}
              heatmapLoading={false}
              heatmapEnabled={false}
              onToggleHeatmap={() => {}}
              heatmapOpacity={0.78}
              onChangeHeatmapOpacity={() => {}}
              variableId={variableId}
              variableName={selectedVariable.name}
              endYear={END_YEAR}
              unit={selectedVariable.unit}
              decimals={selectedVariable.decimals}
              hideOverlays
            />
          </DashboardErrorBoundary>
        </section>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          <aside id="tracking" className="w-full lg:w-[350px] shrink-0 space-y-4 scroll-mt-24">
            <KeyDetailsPanel
              variables={keyVariables}
              activeId={variableId}
              onSelect={handleSelectKeyVariable}
            />
            <PointerMenu activeId={spotlitId} onPoint={handlePoint} />
          </aside>

          <div className="flex-1 min-w-0 space-y-4">
            <div id="detail-verdict" className={`scroll-mt-32 ${spotRing('detail-verdict')}`}>
              <DashboardErrorBoundary panelName="Trend dashboard">
                <TrendDashboard
                  primarySummary={primarySummary}
                  primaryLabel={primaryLabel}
                  primarySourceLabel={
                  (primaryData?.sourceLabel || selectedVariable.mission) +
                  (primaryData?.offlineDemo ? ' · Offline demo (recorded live data)' : '')
                }
                  variable={selectedVariable}
                  loading={loadingPrimary}
                  fetchError={fetchError}
                  onRetry={() => setRetryNonce((n) => n + 1)}
                  compact
                />
              </DashboardErrorBoundary>
            </div>

            {primarySummary && (
              <div id="detail-chart" className={`scroll-mt-32 ${spotRing('detail-chart')}`}>
                <DashboardErrorBoundary panelName="Trend chart">
                  <TimeSeriesChart
                    primarySummary={primarySummary}
                    primaryLabel={primaryLabel}
                    variableName={selectedVariable.name}
                    unit={selectedVariable.unit}
                    decimals={selectedVariable.decimals}
                    deseasonalize={DESEASONALIZED}
                    resolution={RESOLUTION}
                  />
                </DashboardErrorBoundary>
              </div>
            )}

            {primarySummary && primaryData && (
              <div id="detail-words" className={`scroll-mt-32 ${spotRing('detail-words')}`}>
              <DashboardErrorBoundary panelName="Finding in plain words">
                <PlainWordsCard
                  summary={primarySummary}
                  variableId={variableId}
                  variableName={selectedVariable.name}
                  unit={selectedVariable.unit}
                  regionName={primaryLabel}
                  startYear={START_YEAR}
                  endYear={END_YEAR}
                  deseasonalized={DESEASONALIZED}
                  sourceType={primaryData.sourceType}
                />
              </DashboardErrorBoundary>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6">
        <div className="max-w-[1440px] mx-auto text-xs text-slate-600">
          Data: NASA POWER · Methods: OLS regression + Mann–Kendall, p &lt; 0.05
        </div>
      </footer>
    </div>
  );
}
