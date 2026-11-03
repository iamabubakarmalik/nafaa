/** Hardware facts per product (size, grade, shade, pack) and the quantity-rate tiers, loaded once and shared by the item screens and the counter. */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { qty } from '@nafaa/core/industries/hardware';
import { t } from '@/core/i18n';
import { bulkPricingApi, hardwareProductsApi, type HardwareFacts, type Tier } from '../api';
import { KEYS, categoryLabel } from '../meta';

export function useHardwareFacts() {
  const { data } = useQuery({ queryKey: [KEYS.facts], queryFn: () => hardwareProductsApi.facts().catch(() => [] as HardwareFacts[]), staleTime: 5 * 60_000 });
  return useMemo(() => new Map((data ?? []).map((f) => [f.productId, f])), [data]);
}

export function useTiers() {
  const { data } = useQuery({ queryKey: [KEYS.tiers], queryFn: () => bulkPricingApi.all().catch(() => [] as Tier[]), staleTime: 5 * 60_000 });
  return useMemo(() => {
    const m = new Map<string, Tier[]>();
    for (const x of data ?? []) m.set(x.productId ?? '', [...(m.get(x.productId ?? '') ?? []), x]);
    for (const list of m.values()) list.sort((a, b) => a.minQuantity - b.minQuantity);
    return m;
  }, [data]);
}

/** "3/4 inch · Grade 60", "Sky blue 1234 · Matt · 3.64 L", "60x60 · 4 pcs/box". */
export function factLine(f?: HardwareFacts): string | undefined {
  if (!f) return undefined;
  const parts = [
    f.diameter, f.tileSize, f.grade ? t('Grade {{grade}}', { grade: f.grade }) : undefined, f.gradeStrength, [f.colorName, f.colorCode].filter(Boolean).join(' ') || undefined, f.finishSheen ?? f.finishType,
    f.litersPerCan ? `${f.litersPerCan} L` : undefined, f.bagWeight ? t('{{bagWeight}} kg bag', { bagWeight: f.bagWeight }) : undefined,
    f.piecesPerBox ? t('{{piecesPerBox}} pcs/box', { piecesPerBox: f.piecesPerBox }) : undefined, f.sqftPerBox ? t('{{sqftPerBox}} sq ft/box', { sqftPerBox: f.sqftPerBox }) : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : categoryLabel(f.categoryType) || undefined;
}

export const tierText = (x: Tier) => `${qty(x.minQuantity)}+`;
