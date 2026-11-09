/**
 * Connected couriers that can book right now (courier cards, board filters).
 */

import { useQuery } from '@tanstack/react-query';
import { couriersApi } from '../api/online';
import { KEYS } from '../lib/online';

export function useConnectedCouriers() {
  const q = useQuery({ queryKey: KEYS.couriers, queryFn: couriersApi.list, staleTime: 5 * 60_000 });
  return { ...q, connected: (q.data ?? []).filter((a) => a.connected && a.active) };
}
