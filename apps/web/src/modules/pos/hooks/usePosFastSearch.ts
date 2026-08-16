import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { carpetRollsApi } from '@industries/carpet/api/carpet-rolls.api';
import { carpetCutPiecesApi } from '@industries/carpet/api/carpet-cut-pieces.api';
import { db, setMeta, getMeta } from '@core/lib/offline/db';

/**
 * Fast POS search — offline-first.
 * Online ho to server, offline pe Dexie cache se.
 * Loads once and cache karta hai (60s stale time).
 */
export function usePosFastSearch(
  rawQuery: string,
  isCarpetBusiness: boolean,
) {
  const [debounced, setDebounced] = useState(rawQuery);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(rawQuery), 120);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const shouldLoad = isCarpetBusiness && debounced.trim().length >= 2;

  const { data: rollsData } = useQuery({
    queryKey: ['pos-fast-rolls'],
    queryFn: async () => {
      if (navigator.onLine) {
        try {
          const res = await carpetRollsApi.list({ inStockOnly: true, limit: 500 });
          // Cache for offline
          await setMeta('cached-carpet-rolls', res.items || []);
          return res;
        } catch {
          // Fall through to cache
        }
      }
      const cached = await getMeta<any[]>('cached-carpet-rolls');
      return { items: cached || [], meta: { page: 1, limit: 500, total: (cached || []).length, totalPages: 1 } };
    },
    enabled: shouldLoad,
    staleTime: 60_000,
    networkMode: 'offlineFirst',
  });

  const { data: piecesData } = useQuery({
    queryKey: ['pos-fast-cut-pieces'],
    queryFn: async () => {
      if (navigator.onLine) {
        try {
          const res = await carpetCutPiecesApi.list({ status: 'AVAILABLE', limit: 500 });
          await setMeta('cached-carpet-cut-pieces', res.items || []);
          return res;
        } catch {}
      }
      const cached = await getMeta<any[]>('cached-carpet-cut-pieces');
      return { items: cached || [], meta: { page: 1, limit: 500, total: (cached || []).length, totalPages: 1 } };
    },
    enabled: shouldLoad,
    staleTime: 60_000,
    networkMode: 'offlineFirst',
  });

  return useMemo(() => ({
    query: debounced,
    rolls: rollsData?.items ?? [],
    cutPieces: piecesData?.items ?? [],
    isActive: debounced.trim().length >= 2,
  }), [debounced, rollsData, piecesData]);
}
