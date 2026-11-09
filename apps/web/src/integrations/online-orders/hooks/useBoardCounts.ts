/**
 * Orders board tile counts (NEW, CONFIRMED, PACKED, RETURNING ...) for hero
 * numbers on the commerce pages. Shares the board's refresh cadence.
 */

import { useQuery } from '@tanstack/react-query';
import { onlineOrdersApi } from '../api/online-orders.api';

export function useBoardCounts() {
  const q = useQuery({
    queryKey: ['online-orders', 'counts', 'hero'],
    queryFn: () => onlineOrdersApi.list({ limit: 1 }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const counts = q.data?.boardCounts ?? {};
  return { ...q, count: (...keys: string[]) => keys.reduce((t, k) => t + (counts[k] ?? 0), 0) };
}
