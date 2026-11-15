// Navbar destinations. Each id must match a section anchor in App.

export interface NavLink {
  id: string;
  label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { id: 'location', label: 'Location' },
  { id: 'tracking', label: 'Tracking' },
  { id: 'detail-verdict', label: 'Verdict' },
  { id: 'detail-chart', label: 'Chart' },
  { id: 'detail-words', label: 'Words' },
];
