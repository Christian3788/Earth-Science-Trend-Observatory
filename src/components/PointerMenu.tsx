import React from 'react';
import { Crosshair } from 'lucide-react';
import { POINTER_TARGETS } from '../data/pointerTargets';

interface PointerMenuProps {
  activeId: string | null;
  onPoint: (targetId: string | null) => void;
}

/**
 * Presentation pointer menu: pressing an item scrolls to and spotlights
 * exactly that finding card on the right. Pressing again clears the spot.
 */
export const PointerMenu: React.FC<PointerMenuProps> = ({ activeId, onPoint }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Crosshair className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-bold text-slate-950">Point at</h2>
      </div>
      <div role="group" aria-label="Point at a detail" className="flex flex-wrap gap-1.5">
        {POINTER_TARGETS.map((target) => {
          const active = target.id === activeId;
          return (
            <button
              key={target.id}
              type="button"
              onClick={() => onPoint(active ? null : target.id)}
              aria-pressed={active}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950'
              }`}
            >
              {target.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
