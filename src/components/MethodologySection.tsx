import React, { useState } from 'react';
import { motion } from 'motion/react';
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
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Statistical Methodology & Variable Glossary
          </h2>
          <p className="text-base text-slate-700 mt-1.5 max-w-3xl">
            How scientists separate steady long-term trends from seasonal swings and random weather noise—plus plain-language definitions for every satellite and model variable in TerraTrend.
          </p>
        </div>

        {/* 3-Column Statistical Methods Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              title: '01. Removing the Seasonal Cycle',
              body: 'Winter-to-summer swings often dwarf multi-decade climate trends. By computing the long-term average for each calendar month (January through December) and subtracting it from every observation, we produce deseasonalized anomalies that reveal subtle long-term shifts.',
            },
            {
              title: '02. Linear Regression & Student’s t-Test',
              body: 'Ordinary Least Squares (OLS) fits the best straight line across time, reporting the rate of change per decade and its 95% confidence interval. Student’s t-test calculates the probability (p-value) of observing such a steep slope purely by chance; p < 0.05 indicates statistical significance.',
            },
            {
              title: '03. Mann-Kendall & Sen’s Slope',
              body: 'Earth science records often contain extreme flood or heatwave outliers. The non-parametric Mann-Kendall test evaluates every pair of points in order (τ from −1 to +1) without assuming a normal distribution, while Sen’s slope takes the median pairwise rate of change.',
            },
          ].map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.18 }}
              transition={{ duration: 0.35, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="border border-slate-200 rounded-lg p-5 bg-slate-50/70"
            >
              <h3 className="text-base font-bold text-slate-950">{card.title}</h3>
              <p className="text-sm text-slate-700 mt-2 leading-relaxed">{card.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Filterable Variable Glossary */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-slate-950">
              NASA Mission & Global Model Variable Glossary
            </h3>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
              {spheres.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSphereFilter(s)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    sphereFilter === s
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVars.map((v, idx) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{ duration: 0.3, delay: (idx % 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between bg-white hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="text-xs font-medium text-slate-700">
                    <span>{v.mission}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{v.sphere}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-mono font-semibold text-slate-900">{v.unit}</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-950 mt-1">{v.name}</h4>
                  <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{v.simpleDefinition}</p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-700">
                    {v.liveNasaPower ? 'Live NASA POWER API' : 'Mission Reference Profile'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVariable(v.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Plot Variable →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
