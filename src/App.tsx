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
      });

    return () => controller.abort();
  }, [compareMode, compareLat, compareLon, variableId, startYear, endYear, resolution, fetchSeries]);

  // Fetch Global Spatial Anomaly Heatmap when variable or observation span changes
  useEffect(() => {
    const controller = new AbortController();
    setHeatmapLoading(true);
    const params = new URLSearchParams({
      variable: variableId,
      startYear: String(startYear),
      endYear: String(endYear),
    });

    fetch(`/api/spatial-heatmap?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: SpatialHeatmapData) => {
        if (data && Array.isArray(data.deviations)) {
          setHeatmapData(data);
        }
        setHeatmapLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setHeatmapLoading(false);
      });

    return () => controller.abort();
  }, [variableId, startYear, endYear]);

  // Run Statistical Engine on Primary & Compare Series
  const primarySummary = useMemo(() => {
    if (!primaryData?.points?.length) return null;
    return analyzeTimeSeries(primaryData.points, {
      resolution,
      deseasonalize,
      variableName: selectedVariable.name,
      unit: selectedVariable.unit,
      regionName: primaryLabel,
    });
  }, [primaryData, resolution, deseasonalize, selectedVariable, primaryLabel]);

  const compareSummary = useMemo(() => {
    if (!compareMode || !compareData?.points?.length) return null;
    return analyzeTimeSeries(compareData.points, {
      resolution,
      deseasonalize,
      variableName: selectedVariable.name,
      unit: selectedVariable.unit,
      regionName: compareLabel,
    });
  }, [compareMode, compareData, resolution, deseasonalize, selectedVariable, compareLabel]);

  // Apply a Demo Step to Workspace Controls
  const applyDemoStep = useCallback((demo: DemonstrationCase, stepIdx: number) => {
    const step = demo.steps[stepIdx];
    if (!step) return;
    const pReg = PRESET_REGIONS.find((r) => r.id === step.primaryRegionId);
    if (pReg) {
      setPrimaryLat(pReg.lat);
      setPrimaryLon(pReg.lon);
      setPrimaryLabel(pReg.shortName);
      setActivePresetId(pReg.id);
    }
    if (step.compareRegionId) {
      const cReg = PRESET_REGIONS.find((r) => r.id === step.compareRegionId);
      if (cReg) {
        setCompareMode(true);
        setCompareLat(cReg.lat);
        setCompareLon(cReg.lon);
        setCompareLabel(cReg.shortName);
        setComparePresetId(cReg.id);
      }
    } else {
      setCompareMode(false);
    }
    setMissionFilter('All');
    setVariableId(step.variableId);
    setStartYear(step.startYear);
    setEndYear(step.endYear);
    setResolution(step.resolution);
    setDeseasonalize(step.deseasonalize);
  }, []);

  const startDemo = (demo: DemonstrationCase) => {
    setActiveDemo(demo);
    setDemoStepIndex(0);
    setDemoPlaying(false);
    applyDemoStep(demo, 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-advance timer when Play is active
  useEffect(() => {
    if (!activeDemo || !demoPlaying) return;
    const timer = setInterval(() => {
      setDemoStepIndex((prev) => {
        const next = prev + 1;
        if (next >= activeDemo.steps.length) {
          setDemoPlaying(false);
          return prev;
        }
        applyDemoStep(activeDemo, next);
        return next;
      });
    }, 5500);
    return () => clearInterval(timer);
  }, [activeDemo, demoPlaying, applyDemoStep]);

  const handleMapSelect = (lat: number, lon: number, preset?: PresetRegion) => {
    const label = preset
      ? preset.shortName
      : `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;

    if (compareMode && activeSelectionTarget === 'compare') {
      setCompareLat(lat);
      setCompareLon(lon);
      setCompareLabel(label);
      setComparePresetId(preset ? preset.id : null);
    } else {
      setPrimaryLat(lat);
      setPrimaryLon(lon);
      setPrimaryLabel(label);
      setActivePresetId(preset ? preset.id : null);
    }
  };

  const handleDownloadCSV = () => {
    if (!primarySummary) return;
    const csv = buildCSVExport(
      selectedVariable.name,
      selectedVariable.unit,
      primaryLabel,
      primaryLat,
      primaryLon,
      primarySummary,
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terratrend_${selectedVariable.id.toLowerCase()}_${primaryLat.toFixed(1)}_${primaryLon.toFixed(1)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const missions: (MissionSource | 'All')[] = [
    'All',
    'MERRA-2',
    'CERES',
    'GPM / MERRA-2',
    'MODIS',
    'OMI',
    'AIRS',
    'GLDAS',
    'SWOT',
    'SeaWiFS',
    'CSA RCM',
  ];

  const visibleVariables =
    missionFilter === 'All'
      ? EARTH_VARIABLES
      : EARTH_VARIABLES.filter((v) => v.mission === missionFilter);

  const currentDemoStep = activeDemo ? activeDemo.steps[demoStepIndex] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between gap-8">
