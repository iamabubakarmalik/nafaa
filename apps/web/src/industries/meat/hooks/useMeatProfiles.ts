/** Meat details (animal, cut) of every item, by product id, for the counter and the products page. */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { meatProductsApi, type MeatProductProfile } from '../api/products.api';
import { KEYS } from '../lib/meta';

export function useMeatProfiles() {
  const { data } = useQuery({
    queryKey: [KEYS.profiles],
    queryFn: () => meatProductsApi.list().catch(() => [] as MeatProductProfile[]),
    staleTime: 60_000,
  });
  return useMemo(() => new Map((data ?? []).map((p) => [p.productId, p])), [data]);
}
