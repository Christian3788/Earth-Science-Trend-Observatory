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
