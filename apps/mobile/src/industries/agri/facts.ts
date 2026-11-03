/** Agri facts per product (kind, season, pack, registration, bulk rate), one request for the whole shop, shared through React Query. */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { agriProductsApi, type AgriFacts } from './api';
import { stockReportApi, type StockLine } from '@/modules/inventory/stock/api';
import { AGRI_KEYS } from './meta';

export function useAgriFacts(): Map<string, AgriFacts> {
  const { data = [] } = useQuery({ queryKey: [AGRI_KEYS.facts], queryFn: () => agriProductsApi.facts().catch(() => [] as AgriFacts[]), staleTime: 5 * 60_000 });
  return useMemo(() => new Map(data.map((f) => [f.productId, f])), [data]);
}

/** "50 kg bag · Imidacloprid" style line for cards and pickers. */
export function factLine(f?: AgriFacts): string | undefined {
  if (!f) return undefined;
  const pack = Number(f.packSize) > 0 ? `${f.packSize} ${f.packUnit || 'kg'}` : '';
  return [pack, f.npkRatio, f.activeIngredient, f.brand || f.manufacturer].filter(Boolean).join(' · ') || undefined;
}

/** Stock on hand by product id (stock report, active products), for season readiness and the dashboard. */
export function useStockLines() {
  return useQuery({
    queryKey: [AGRI_KEYS.ops, 'stock'],
    queryFn: () => stockReportApi.list({ status: 'all', limit: 1000 }).then((r) => r.items).catch(() => [] as StockLine[]),
    staleTime: 5 * 60_000,
  });
}
