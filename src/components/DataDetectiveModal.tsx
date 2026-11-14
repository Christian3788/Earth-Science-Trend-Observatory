import React, { useState } from 'react';
import { X, Compass, ArrowRight } from 'lucide-react';
import {
  type DetectiveAnswers,
  type EarthSphere,
  type EarthVariable,
  type PresetRegion,
  recommendFromDetective,
} from '../data/earthCatalog';

interface DataDetectiveModalProps {
  open: boolean;
  onClose: () => void;
  onApplyRecommendation: (variableId: string, region: PresetRegion) => void;
}

export const DataDetectiveModal: React.FC<DataDetectiveModalProps> = ({
  open,
  onClose,
  onApplyRecommendation,
}) => {
  const [answers, setAnswers] = useState<DetectiveAnswers>({
    sphere: 'Any',
    biome: 'any',
    goal: 'warming',
  });

  if (!open) return null;

  const result = recommendFromDetective(answers);

  const spheres: (EarthSphere | 'Any')[] = [
    'Any',
    'Atmosphere',
    'Hydrosphere',
    'Land & Biosphere',
    'Energy & Radiation',
  ];

  const biomes: { id: PresetRegion['biome'] | 'any'; label: string }[] = [
    { id: 'any', label: 'Any Global Region' },
    { id: 'arctic', label: 'Arctic & Polar Ice' },
    { id: 'desert', label: 'Desert & Arid Basin' },
    { id: 'rainforest', label: 'Tropical Rainforest' },
    { id: 'coast', label: 'Coastal & Estuary' },
    { id: 'urban', label: 'Megacity Atmosphere' },
    { id: 'ocean', label: 'Open Ocean' },
    { id: 'savanna', label: 'Semi-Arid Savanna' },
  ];

  const goals: { id: DetectiveAnswers['goal']; label: string; hint: string }[] = [
    { id: 'warming', label: 'Heat & Surface Warming', hint: 'Temperature, albedo, water vapor' },
    { id: 'water', label: 'Rainfall, Drought & Runoff', hint: 'Precipitation, soil moisture, river runoff' },
    { id: 'air-energy', label: 'Air Quality, Ozone & Sunlight', hint: 'NO₂ emissions, ozone shield, cloud solar energy' },
    { id: 'vegetation', label: 'Ecosystem Greening / Stress', hint: 'MODIS NDVI greenness + moisture drivers' },
  ];

  const handleLaunch = (variable: EarthVariable, region: PresetRegion) => {
    onApplyRecommendation(variable.id, region);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detective-title"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-blue-700" />
            <h2 id="detective-title" className="text-lg font-bold text-slate-950">
              Data Detective Inquiry
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-600 hover:text-slate-950 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Close inquiry"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm font-medium text-slate-700 leading-relaxed">
            Answer three quick scientific questions to narrow down NASA satellite and model variables most likely to show meaningful regional change.
          </p>

          {/* Q1: Phenomenon */}
          <div>
            <div className="text-sm font-bold text-slate-950 mb-2.5">
              1. What kind of Earth change are you investigating?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, goal: g.id }))}
                  className={`text-left px-3.5 py-2.5 rounded-md border transition-colors cursor-pointer ${
                    answers.goal === g.id
                      ? 'border-blue-600 bg-blue-50/70 text-slate-950'
                      : 'border-slate-300 hover:border-slate-400 text-slate-800'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-950">{g.label}</div>
                  <div className="text-xs font-medium text-slate-700 mt-0.5">{g.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Q2: Biome / Environment */}
          <div>
            <div className="text-sm font-bold text-slate-950 mb-2.5">
              2. Which type of region or biome interests you?
            </div>
            <div className="flex flex-wrap gap-2">
              {biomes.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, biome: b.id }))}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    answers.biome === b.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Q3: Earth Sphere */}
          <div>
            <div className="text-sm font-bold text-slate-950 mb-2.5">
              3. Filter by Earth system sphere (optional)
            </div>
            <div className="flex flex-wrap gap-2">
              {spheres.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, sphere: s }))}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    answers.sphere === s
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="border-t border-slate-200 pt-5">
            <div className="text-sm font-bold text-slate-950 mb-1">Recommended Investigations</div>
            <p className="text-xs sm:text-sm font-medium text-slate-700 mb-3">{result.rationale}</p>

            <div className="space-y-2.5">
              {result.variables.slice(0, 4).map((v) => {
                const targetRegion = result.regions[0];
                return (
                  <div
                    key={v.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-md border border-slate-200 bg-slate-50/80"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-700">
                        <span>{v.mission}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{v.sphere}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{targetRegion.name}</span>
                      </div>
                      <div className="text-base font-bold text-slate-950">{v.name}</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{v.simpleDefinition}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLaunch(v, targetRegion)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
                    >
                      <span>Load Series</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
