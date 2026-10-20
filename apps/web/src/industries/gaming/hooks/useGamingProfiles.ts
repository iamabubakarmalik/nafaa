import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gamingProductsApi, type GamingProductProfile } from '../api/products.api';
import { GAMING_KEYS } from '../lib/meta';

/** Gaming details of every product, by product id. */
export function useGamingProfiles() {
  const q = useQuery({ queryKey: [GAMING_KEYS.profiles], queryFn: () => gamingProductsApi.list(), staleTime: 60_000 });
  return useMemo(() => new Map<string, GamingProductProfile>((q.data ?? []).map((p) => [p.productId, p])), [q.data]);
}
