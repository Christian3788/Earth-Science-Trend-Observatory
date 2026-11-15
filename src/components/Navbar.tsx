import React from 'react';
import { NAV_LINKS } from '../data/navLinks';

interface NavbarProps {
  locationLabel: string;
}

/**
 * Sticky top navbar: brand + tagline on the left, anchor links to each
 * dashboard section on the right, live location readout at the end.
 */
export const Navbar: React.FC<NavbarProps> = ({ locationLabel }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 min-h-15 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <a href="#top" className="shrink-0">
          <span className="text-xl font-display font-extrabold tracking-tight text-slate-950">
            TerraTrend
          </span>
          <span className="hidden sm:inline text-sm text-slate-600 ml-2.5">
            Key in a location, pick what we&apos;re tracking, read the finding.
          </span>
        </a>

        <nav aria-label="Dashboard sections" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-semibold text-slate-800">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="hover:text-blue-700 transition-colors whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto text-xs font-mono font-semibold text-blue-700 tabular-nums truncate max-w-55">
          {locationLabel}
        </div>
      </div>
    </header>
  );
};
