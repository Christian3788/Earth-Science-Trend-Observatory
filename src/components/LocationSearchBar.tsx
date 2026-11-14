import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';

export interface GeocodeResultItem {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  kind: 'feature' | 'city' | 'coordinate';
}

interface LocationSearchBarProps {
  onSelectLocation: (result: GeocodeResultItem) => void;
}

export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({ onSelectLocation }) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<GeocodeResultItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced geocoding lookup
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      setStatusMessage(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setStatusMessage(null);
      try {
        const resp = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = (await resp.json()) as { results?: GeocodeResultItem[] };
        const items = data.results || [];
        setResults(items);
        setActiveIndex(items.length > 0 ? 0 : -1);
        setOpen(true);
        if (items.length === 0) {
          setStatusMessage('No matching city or geographic feature found.');
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setStatusMessage('Unable to look up location right now.');
      } finally {
        setLoading(false);
      }
    }, 240);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const chooseResult = (item: GeocodeResultItem) => {
    onSelectLocation(item);
    setQuery(item.name);
    setOpen(false);
    setStatusMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    if (activeIndex >= 0 && results[activeIndex]) {
      chooseResult(results[activeIndex]);
      return;
    }
    if (results.length > 0) {
      chooseResult(results[0]);
      return;
    }

    // Immediate lookup if user pressed Enter before debounce completed
    setLoading(true);
    try {
      const resp = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
      const data = (await resp.json()) as { results?: GeocodeResultItem[] };
      const items = data.results || [];
      if (items.length > 0) {
        chooseResult(items[0]);
      } else {
        setResults([]);
        setOpen(true);
        setStatusMessage('No matching city or geographic feature found.');
      }
    } catch {
      setStatusMessage('Unable to look up location right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const formatCoord = (lat: number, lon: number) => {
    const ns = lat >= 0 ? 'N' : 'S';
    const ew = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
  };

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0 || statusMessage) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Jump to city, geographic feature, or coordinates (e.g., Tokyo, Sahara Desert, 48.85, 2.35)..."
            aria-label="Search city or geographic feature"
            aria-autocomplete="list"
            aria-expanded={open}
            className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          ) : (
            query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setOpen(false);
                  setStatusMessage(null);
                }}
                aria-label="Clear location search"
                className="p-0.5 text-slate-400 hover:text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>

        <button
          type="submit"
          className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Jump to Location
        </button>
      </form>

      {open && (results.length > 0 || statusMessage) && (
        <div
          role="listbox"
          className="absolute z-40 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-md shadow-md overflow-hidden"
        >
          {results.length > 0 ? (
            <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {results.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => chooseResult(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isActive ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">{item.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
                        {formatCoord(item.lat, item.lon)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-3.5 py-2.5 text-xs text-slate-500">{statusMessage}</div>
          )}
        </div>
      )}
    </div>
  );
};
