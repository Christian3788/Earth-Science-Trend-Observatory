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
          <a
            href="#observatory"
            className="text-lg font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            TerraTrend
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#observatory"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Observatory
            </a>
            <button
              type="button"
              onClick={() => setDetectiveOpen(true)}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Data Detective
            </button>
            <a
              href="#demonstrations"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Demonstrations
            </a>
            <a
              href="#methodology"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Methodology
            </a>
            <a
              href="#resources"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Resources
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => startDemo(DEMONSTRATION_CASES[0])}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Run Guided Demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Observatory Workspace */}
      <main id="observatory" className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
        {/* Compact Workspace Title & Action Strip */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-balance">
              Earth Science Trend Observatory
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Select a NASA satellite or global model variable, pick any region on Earth, remove seasonal cycles, and test whether the long-term trend is statistically significant.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDetectiveOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Data Detective Inquiry</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={!primarySummary}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Active Guided Demonstration Walkthrough Banner */}
        {activeDemo && currentDemoStep && (
          <div className="mb-5 bg-white border border-blue-200 rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="text-xs text-blue-700 font-medium">
                  Guided Case Study · Step {demoStepIndex + 1} of {activeDemo.steps.length}
                </div>
                <h2 className="text-sm font-semibold text-slate-900 mt-0.5">
                  {activeDemo.title}: {currentDemoStep.title}
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const prev = Math.max(0, demoStepIndex - 1);
                    setDemoStepIndex(prev);
                    applyDemoStep(activeDemo, prev);
                  }}
                  disabled={demoStepIndex === 0}
                  className="p-1.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDemoPlaying((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-slate-200 text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {demoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{demoPlaying ? 'Pause' : 'Auto-Play'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(activeDemo.steps.length - 1, demoStepIndex + 1);
                    setDemoStepIndex(next);
                    applyDemoStep(activeDemo, next);
                  }}
                  disabled={demoStepIndex === activeDemo.steps.length - 1}
                  className="p-1.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  aria-label="Next step"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDemo(null);
                    setDemoPlaying(false);
                  }}
                  className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 ml-1 cursor-pointer"
                  aria-label="Exit demonstration"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-700 mt-3 leading-relaxed">{currentDemoStep.narrative}</p>
          </div>
        )}

        {/* Asymmetric Split Console */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Left Control & Parameter Column */}
          <aside className="w-full lg:w-[340px] shrink-0 space-y-4">
            {/* 1. Region & Comparison Controls */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-900">1. Region of Interest</h2>
                <button
                  type="button"
                  onClick={() => {
                    const next = !compareMode;
                    setCompareMode(next);
                    if (!next) setActiveSelectionTarget('primary');
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    compareMode
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
