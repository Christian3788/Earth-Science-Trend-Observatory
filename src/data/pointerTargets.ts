// Targets the left-panel pointer menu can spotlight. Each id must match the
// wrapper div of exactly one finding card in App.

export interface PointerTarget {
  id: string;
  label: string;
}

export const POINTER_TARGETS: readonly PointerTarget[] = [
  { id: 'detail-verdict', label: 'Verdict' },
  { id: 'detail-chart', label: 'Chart' },
  { id: 'detail-words', label: 'Words' },
];
