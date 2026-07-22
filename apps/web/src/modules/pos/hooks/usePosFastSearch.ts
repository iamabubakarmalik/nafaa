import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { carpetRollsApi } from '@industries/carpet/api/carpet-rolls.api';
import { carpetCutPiecesApi } from '@industries/carpet/api/carpet-cut-pieces.api';
import type { Product } from '@modules/inventory/products/api/products.api';

/**
 * Fast POS search — debounced 120ms, loads only when 2+ chars typed.
 * Rolls & cut pieces load once and stay cached for 60s.
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
    queryFn: () => carpetRollsApi.list({ inStockOnly: true, limit: 500 }),
    enabled: shouldLoad,
    staleTime: 60_000,
  });

  const { data: piecesData } = useQuery({
    queryKey: ['pos-fast-cut-pieces'],
    queryFn: () => carpetCutPiecesApi.list({ status: 'AVAILABLE', limit: 500 }),
    enabled: shouldLoad,
    staleTime: 60_000,
  });

  return useMemo(() => ({
    query: debounced,
    rolls: rollsData?.items ?? [],
    cutPieces: piecesData?.items ?? [],
    isActive: debounced.trim().length >= 2,
  }), [debounced, rollsData, piecesData]);
}
