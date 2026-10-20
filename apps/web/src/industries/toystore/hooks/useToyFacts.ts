/** Toy details per product, loaded once and shared by the products pages, sales history and the counter. */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toyProductsApi, type ToyFact } from '../api/products.api';
import { CATEGORIES, KEYS, ageText, labelOf } from '../lib/meta';

export function useToyFacts() {
  const { data } = useQuery({ queryKey: [KEYS.facts], queryFn: () => toyProductsApi.facts().catch(() => [] as ToyFact[]), staleTime: 5 * 60_000 });
  return useMemo(() => new Map((data ?? []).map((f) => [f.productId, f])), [data]);
}

/** "3-5 saal · Remote car · Hot Wheels" under a toy's name. */
export function factLine(f?: ToyFact): string | undefined {
  if (!f) return undefined;
  return [ageText(f), labelOf(CATEGORIES, f.categoryType), f.brand, f.characterFranchise].filter(Boolean).join(' · ') || undefined;
}

/** Cells the toy needs that are not in the box, e.g. "2 x AA". */
export function cellsNeeded(f?: Pick<ToyFact, 'requiresBatteries' | 'batteriesIncluded' | 'batteryType' | 'batteryQuantity'> | null): string | null {
  if (!f?.requiresBatteries || f.batteriesIncluded) return null;
  return [f.batteryQuantity ? `${f.batteryQuantity} x` : null, f.batteryType || 'cell'].filter(Boolean).join(' ');
}

/** Ages the toy fits, for filters. */
export const agesOf = (f?: ToyFact) => (f ? [...new Set([f.ageGroup, ...(f.ageGroups ?? [])].filter(Boolean))] : []);
