import { useQuery } from '@tanstack/react-query';
import { carpetRollsApi } from '@/features/industries/carpet/api/carpet-rolls.api';
import { useOnlineStatus } from '@/lib/offline/useOnlineStatus';
import { db } from '@/lib/offline/db';
import { useEffect, useState } from 'react';

interface CarpetSummaryEntry {
  productId: string;
  totalSqft: number;
  rollCount: number;
  cutPiecesCount: number;
  minSalePrice: number;
  maxSalePrice: number;
  avgSalePrice: number;
}

/**
 * Carpet stock summary — offline aware.
 * Online: fetches from server + caches locally
 * Offline: returns last cached data (or empty if never synced)
 */
export function useOfflineCarpetSummary(productIds: string[], enabled: boolean) {
  const isOnline = useOnlineStatus();
  const [cachedSummary, setCachedSummary] = useState<CarpetSummaryEntry[]>([]);

  // Load cached carpet summary from IndexedDB meta
  useEffect(() => {
    if (!enabled) return;
    db.meta.get('carpet-summary-cache').then((entry) => {
      if (entry?.value) {
        setCachedSummary(entry.value as CarpetSummaryEntry[]);
      }
    });
  }, [enabled]);

  // Live query (only when online + enabled)
  const { data: liveSummary = [] } = useQuery({
    queryKey: ['carpet-product-summary-pos', productIds],
    queryFn: async () => {
      const result = await carpetRollsApi.productSummary(productIds);
      // Cache for offline use
      await db.meta.put({
        key: 'carpet-summary-cache',
        value: result,
        updatedAt: Date.now(),
      });
      return result;
    },
    enabled: enabled && isOnline && productIds.length > 0,
    staleTime: 60_000,
  });

  // Return live data when online, cached when offline
  if (!enabled) return { data: [], isOffline: false };
  
  return {
    data: isOnline ? liveSummary : cachedSummary,
    isOffline: !isOnline,
  };
}
