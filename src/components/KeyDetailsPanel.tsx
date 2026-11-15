import React from 'react';
import { Satellite } from 'lucide-react';
import type { EarthVariable } from '../data/earthCatalog';

interface KeyDetailsPanelProps {
  variables: readonly EarthVariable[];
  activeId: string;
  onSelect: (variableId: string) => void;
}

/**
 * Left-panel list of exactly what the observatory tracks: one simple button
 * per headline variable. Pressing a button loads that variable so its chart
 * and plain-words interpretation show on the right.
 */
export const KeyDetailsPanel: React.FC<KeyDetailsPanelProps> = ({ variables, activeId, onSelect }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-950">What we&apos;re tracking</h2>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
          <span aria-hidden="true" className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
          </span>
          <Satellite className="w-3.5 h-3.5" />
          <span>Live</span>
        </span>
      </div>

      <div role="group" aria-label="Tracked details" className="space-y-1.5">
        {variables.map((v) => {
          const active = v.id === activeId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v.id)}
              aria-pressed={active}
              className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors cursor-pointer ${
                active
                  ? 'border-blue-600 bg-blue-50/80'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-950 truncate">{v.shortName}</span>
                <span className="text-xs font-mono font-semibold text-slate-700 shrink-0">{v.unit}</span>
              </div>
              <div className="text-xs font-medium text-slate-700 mt-0.5">
                {v.mission} · {v.sphere}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
