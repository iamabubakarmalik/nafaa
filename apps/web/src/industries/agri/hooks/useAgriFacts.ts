/**
 * Agri facts per product (kind, season, pack, registration, bulk rate)
 * for the counter, the products page and sales history. One request for
 * the whole shop, shared through React Query.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { agriProductsApi, type AgriFacts } from '../api/products.api';

export const AGRI_FACTS_KEY = 'agri-product-facts';

export function useAgriFacts(): Map<string, AgriFacts> {
  const { data = [] } = useQuery({
    queryKey: [AGRI_FACTS_KEY],
    queryFn: () => agriProductsApi.facts().catch(() => [] as AgriFacts[]),
    staleTime: 5 * 60_000,
  });
  return useMemo(() => new Map(data.map((f) => [f.productId, f])), [data]);
}

/** "50 kg bag · Imidacloprid" style line for cards and pickers. */
export function factLine(f?: AgriFacts): string | undefined {
  if (!f) return undefined;
  const pack = Number(f.packSize) > 0 ? `${f.packSize} ${f.packUnit || 'kg'}` : '';
  return [pack, f.npkRatio, f.activeIngredient, f.brand || f.manufacturer].filter(Boolean).join(' · ') || undefined;
}
