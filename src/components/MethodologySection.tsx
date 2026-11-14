import React, { useState } from 'react';
import { EARTH_VARIABLES, type EarthSphere } from '../data/earthCatalog';

interface MethodologySectionProps {
  onSelectVariable: (variableId: string) => void;
}

export const MethodologySection: React.FC<MethodologySectionProps> = ({ onSelectVariable }) => {
  const [sphereFilter, setSphereFilter] = useState<EarthSphere | 'All'>('All');

  const spheres: (EarthSphere | 'All')[] = [
    'All',
    'Atmosphere',
    'Hydrosphere',
    'Land & Biosphere',
    'Energy & Radiation',
  ];

  const filteredVars =
    sphereFilter === 'All'
      ? EARTH_VARIABLES
      : EARTH_VARIABLES.filter((v) => v.sphere === sphereFilter);

  return (
    <section id="methodology" className="border-t border-slate-200 bg-white py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Statistical Methodology & Variable Glossary
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 max-w-3xl">
            How scientists separate steady long-term trends from seasonal swings and random weather noise—plus plain-language definitions for every satellite and model variable in TerraTrend.
          </p>
        </div>

        {/* 3-Column Statistical Methods Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-900">
              01. Removing the Seasonal Cycle
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Winter-to-summer swings often dwarf multi-decade climate trends. By computing the long-term average for each calendar month (January through December) and subtracting it from every observation, we produce deseasonalized anomalies that reveal subtle long-term shifts.
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-900">
              02. Linear Regression & Student’s t-Test
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Ordinary Least Squares (OLS) fits the best straight line across time, reporting the rate of change per decade and its 95% confidence interval. Student’s t-test calculates the probability (p-value) of observing such a steep slope purely by chance; p &lt; 0.05 indicates statistical significance.
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-900">
              03. Mann-Kendall & Sen’s Slope
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Earth science records often contain extreme flood or heatwave outliers. The non-parametric Mann-Kendall test evaluates every pair of points in order (τ from −1 to +1) without assuming a normal distribution, while Sen’s slope takes the median pairwise rate of change.
            </p>
          </div>
        </div>

        {/* Filterable Variable Glossary */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-base font-semibold text-slate-900">
              NASA Mission & Global Model Variable Glossary
            </h3>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
              {spheres.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSphereFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    sphereFilter === s
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVars.map((v) => (
              <div
                key={v.id}
                className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between bg-white hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="text-[11px] text-slate-500">
                    <span>{v.mission}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{v.sphere}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-mono">{v.unit}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 mt-1">{v.name}</h4>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{v.simpleDefinition}</p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500">
                    {v.liveNasaPower ? 'Live NASA POWER API' : 'Mission Reference Profile'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVariable(v.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap shrink-0"
                  >
                    Plot Variable →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
