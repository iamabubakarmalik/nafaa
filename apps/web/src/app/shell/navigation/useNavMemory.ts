/**
 * Per-device navigation memory: recently visited pages and pinned pages.
 */

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { loadFavorites, loadRecent, pushRecent, saveFavorites } from './nav-config';

/** Records the current page and returns the most recent paths, newest first. */
export function useRecentPaths() {
  const location = useLocation();
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  useEffect(() => {
    if (location.pathname && location.pathname !== '/') setRecent(pushRecent(location.pathname));
  }, [location.pathname]);
  return recent;
}

/** Pinned pages and a toggle that can be used directly as a click handler. */
export function useFavorites() {
  const [favs, setFavs] = useState<string[]>(() => loadFavorites());
  const toggle = useCallback((path: string, e?: MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setFavs((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      saveFavorites(next);
      return next;
    });
  }, []);
  return { favs, toggle };
}
