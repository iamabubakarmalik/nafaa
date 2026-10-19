/**
 * Hardware facts per product (size, grade, shade, pack) and the quantity
 * rate tiers, loaded once and shared by the product pages and the counter.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hardwareProductsApi, type HardwareFacts } from '../api/products.api';
import { bulkPricingApi, type Tier } from '../api/bulk-pricing.api';
import { categoryLabel } from '../lib/meta';

export const FACTS_KEY = 'hardware-facts';
export const TIERS_KEY = 'hardware-tiers';

export function useHardwareFacts() {
  const { data } = useQuery({ queryKey: [FACTS_KEY], queryFn: () => hardwareProductsApi.facts().catch(() => [] as HardwareFacts[]), staleTime: 5 * 60_000 });
  return useMemo(() => new Map((data ?? []).map((f) => [f.productId, f])), [data]);
}

export function useTiers() {
  const { data } = useQuery({ queryKey: [TIERS_KEY], queryFn: () => bulkPricingApi.all().catch(() => [] as Tier[]), staleTime: 5 * 60_000 });
  return useMemo(() => {
    const m = new Map<string, Tier[]>();
    for (const t of data ?? []) m.set(t.productId, [...(m.get(t.productId) ?? []), t]);
    for (const list of m.values()) list.sort((a, b) => a.minQuantity - b.minQuantity);
    return m;
  }, [data]);
}

/** Rate for `qty` from the tiers, or null when no tier applies. */
export function tierFor(tiers: Tier[] | undefined, qty: number): Tier | null {
  let hit: Tier | null = null;
  for (const t of tiers ?? []) if (qty >= t.minQuantity && (t.maxQuantity == null || qty <= t.maxQuantity)) hit = t;
  return hit;
}

/** "3/4 inch · Grade 60", "Sky blue 1234 · Matt · 3.64 L", "60x60 · 4 pcs/box". */
export function factLine(f?: HardwareFacts): string | undefined {
  if (!f) return undefined;
  const parts = [
    f.diameter, f.tileSize, f.grade ? `Grade ${f.grade}` : undefined, f.gradeStrength,
    [f.colorName, f.colorCode].filter(Boolean).join(' ') || undefined, f.finishSheen ?? f.finishType,
    f.litersPerCan ? `${f.litersPerCan} L` : undefined, f.bagWeight ? `${f.bagWeight} kg bag` : undefined,
    f.piecesPerBox ? `${f.piecesPerBox} pcs/box` : undefined, f.sqftPerBox ? `${f.sqftPerBox} sq ft/box` : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : categoryLabel(f.categoryType) || undefined;
}
