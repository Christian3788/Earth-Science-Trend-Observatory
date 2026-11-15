// Headline variables pinned to the left panel as simple buttons.
//
// These six are the key details the observatory tracks: all stream live NASA
// POWER point data (no modeled profiles), and together they span atmosphere,
// water, and energy. The full 17-variable catalog stays available under
// Advanced controls.

import { EARTH_VARIABLES, type EarthVariable } from './earthCatalog.ts';

export const KEY_VARIABLE_IDS: readonly string[] = [
  'TS',
  'PRECTOTCORR',
  'SRF_ALB',
  'GWETPROF',
  'WS10M',
  'ALLSKY_SFC_SW_DWN',
];

/** Resolves the pinned ids against a catalog, preserving order and dropping unknown ids. */
export function resolveKeyVariables(catalog: readonly EarthVariable[] = EARTH_VARIABLES): EarthVariable[] {
  const byId = new Map(catalog.map((v) => [v.id, v]));
  const resolved: EarthVariable[] = [];
  for (const id of KEY_VARIABLE_IDS) {
    const variable = byId.get(id);
    if (variable) resolved.push(variable);
  }
  return resolved;
}
