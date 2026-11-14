import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Compass,
  Download,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeftRight,
  Loader2,
  AlertCircle,
  Globe,
  Map as MapIcon,
  Box,
  TrendingUp,
} from 'lucide-react';
import {
  DEMONSTRATION_CASES,
  EARTH_VARIABLES,
  PRESET_REGIONS,
  type DemonstrationCase,
  type MissionSource,
  type PresetRegion,
} from './data/earthCatalog';
import {
  analyzeTimeSeries,
  buildCSVExport,
  type TimeSeriesPoint,
} from './utils/statistics';
import { EarthGlobe3D } from './components/EarthGlobe3D';
import { WorldMapSelector, type SpatialHeatmapData } from './components/WorldMapSelector';
import { LocationSearchBar } from './components/LocationSearchBar';
import { TimeSeriesChart } from './components/TimeSeriesChart';
import { TimeSeries3DSurface } from './components/TimeSeries3DSurface';
import { StatisticalPanel } from './components/StatisticalPanel';
import { DataDetectiveModal } from './components/DataDetectiveModal';
import { MethodologySection } from './components/MethodologySection';
import { ResourcesSection } from './components/ResourcesSection';

interface ApiEarthResponse {
  variable: string;
  lat: number;
  lon: number;
  resolution: 'monthly' | 'daily';
  sourceType: 'nasa-power-live' | 'mission-reference' | 'climatology-fallback';
  sourceLabel: string;
  points: TimeSeriesPoint[];
  error?: string;
}

export default function App() {
  // Primary Region State
  const [primaryLat, setPrimaryLat] = useState<number>(71.29);
  const [primaryLon, setPrimaryLon] = useState<number>(-156.79);
  const [primaryLabel, setPrimaryLabel] = useState<string>('Utqiaġvik, AK');
  const [activePresetId, setActivePresetId] = useState<string | null>('utqiagvik');

  // Comparison Region B State
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareLat, setCompareLat] = useState<number>(-12.05);
  const [compareLon, setCompareLon] = useState<number>(-77.04);
  const [compareLabel, setCompareLabel] = useState<string>('Coastal Peru');
  const [comparePresetId, setComparePresetId] = useState<string | null>('peru-coast');
  const [activeSelectionTarget, setActiveSelectionTarget] = useState<'primary' | 'compare'>('primary');

  // Variable & Temporal Controls
  const [variableId, setVariableId] = useState<string>('TS');
  const [missionFilter, setMissionFilter] = useState<MissionSource | 'All'>('All');
  const [resolution, setResolution] = useState<'monthly' | 'annual' | 'daily'>('monthly');
  const [deseasonalize, setDeseasonalize] = useState<boolean>(true);
  const [startYear, setStartYear] = useState<number>(1985);
  const [endYear, setEndYear] = useState<number>(2024);

  // Acquired Series State
  const [primaryData, setPrimaryData] = useState<ApiEarthResponse | null>(null);
  const [compareData, setCompareData] = useState<ApiEarthResponse | null>(null);
  const [loadingPrimary, setLoadingPrimary] = useState<boolean>(false);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Spatial Heatmap Layer State
  const [heatmapData, setHeatmapData] = useState<SpatialHeatmapData | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState<boolean>(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.78);

  // Modals, View Modes & Guided Walkthrough State
  const [spatialView, setSpatialView] = useState<'3d' | '2d'>('2d');
  const [chartView, setChartView] = useState<'2d' | '3d'>('2d');
  const [detectiveOpen, setDetectiveOpen] = useState<boolean>(false);
  const [activeDemo, setActiveDemo] = useState<DemonstrationCase | null>(null);
  const [demoStepIndex, setDemoStepIndex] = useState<number>(0);
  const [demoPlaying, setDemoPlaying] = useState<boolean>(false);

  const selectedVariable = useMemo(
    () => EARTH_VARIABLES.find((v) => v.id === variableId) || EARTH_VARIABLES[0],
    [variableId],
  );

  // Enforce monthly fallback if switching to a variable without daily support
  useEffect(() => {
    if (!selectedVariable.supportsDaily && resolution === 'daily') {
      setResolution('monthly');
    }
  }, [selectedVariable, resolution]);

  const fetchSeries = useCallback(
    async (
      lat: number,
      lon: number,
      varId: string,
      sYear: number,
      eYear: number,
      resMode: 'monthly' | 'annual' | 'daily',
      signal: AbortSignal,
    ): Promise<ApiEarthResponse> => {
      const apiRes = resMode === 'daily' ? 'daily' : 'monthly';
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        variable: varId,
        startYear: String(sYear),
        endYear: String(eYear),
        resolution: apiRes,
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

  // Fetch Primary Series
  useEffect(() => {
    const controller = new AbortController();
    setLoadingPrimary(true);
    setFetchError(null);

    fetchSeries(primaryLat, primaryLon, variableId, startYear, endYear, resolution, controller.signal)
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
  }, [primaryLat, primaryLon, variableId, startYear, endYear, resolution, fetchSeries]);

  // Fetch Comparison Region B Series when enabled
  useEffect(() => {
    if (!compareMode) {
      setCompareData(null);
      return;
    }
    const controller = new AbortController();
    setLoadingCompare(true);

    fetchSeries(compareLat, compareLon, variableId, startYear, endYear, resolution, controller.signal)
      .then((res) => {
        setCompareData(res);
        setLoadingCompare(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setLoadingCompare(false);
