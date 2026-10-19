import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dairyProductsApi, type DairyProduct } from '../api/products.api';
import { DAIRY_KEYS } from '../lib/meta';

/** Dairy profile of every product, by product id (rates, fat, kind). */
export function useDairyProfiles() {
  const { data } = useQuery({
    queryKey: [DAIRY_KEYS.profiles],
    queryFn: () => dairyProductsApi.list({}).catch(() => [] as DairyProduct[]),
    staleTime: 5 * 60_000,
  });
  return useMemo(() => new Map((data ?? []).map((p) => [p.productId, p])), [data]);
}
