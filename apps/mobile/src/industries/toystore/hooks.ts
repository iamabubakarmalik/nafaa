/** Shared data hooks for the toy store screens. */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toyProductsApi, type ToyFact } from './api';
import { KEYS } from './meta';

/** Toy details per product, loaded once and shared by the products pages and the counter. */
export function useToyFacts() {
  const { data } = useQuery({ queryKey: [KEYS.facts], queryFn: () => toyProductsApi.facts().catch(() => [] as ToyFact[]), staleTime: 5 * 60_000 });
  return useMemo(() => new Map((data ?? []).map((f) => [f.productId, f])), [data]);
}
