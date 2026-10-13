/**
 * Toy shop POS on the shared engine: full catalog with variants, udhaar,
 * receipts and quick keys. Age chips filter the shelf, cards warn about
 * small parts and batteries, and gift packs sell as bundles: each toy in a
 * pack leaves stock at checkout and the pack price is shared across them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { AlertTriangle, BatteryCharging, Gift } from 'lucide-react';
import { useComboBundles, useProductCatalog, type PosBundle, type PosFilter, type AddOptions, type PosEngineApi, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { toyProductsApi, type ToyProductProfile } from '../api/products.api';
import { toyGiftPacksApi, type ToyGiftPack } from '../api/gift-packs.api';

const AGE_GROUPS: Array<[string, string]> = [
  ['NEWBORN_0_6M', '0-6 mahine'], ['INFANT_6_12M', '6-12 mahine'], ['TODDLER_1_2Y', '1-2 saal'],
  ['TODDLER_2_3Y', '2-3 saal'], ['PRESCHOOL_3_5Y', '3-5 saal'], ['KIDS_5_8Y', '5-8 saal'],
  ['KIDS_8_12Y', '8-12 saal'], ['TWEEN_12_14Y', '12-14 saal'], ['TEEN_14_PLUS', '14+ saal'],
];

function useToyCatalog() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['toy-profiles-pos'],
    queryFn: () => toyProductsApi.list({}).catch(() => [] as ToyProductProfile[]),
    staleTime: 5 * 60_000,
  });
  const byProduct = useMemo(
    () => new Map((profiles as ToyProductProfile[]).map((p) => [p.productId, p])),
    [profiles],
  );

  const catalog = useProductCatalog((it): PosItem => {
    const p = byProduct.get(it.id);
    if (!p) return it;
    const ages = new Set<string>([p.ageGroup, ...(p.ageGroups ?? [])].filter(Boolean) as string[]);
    return {
      ...it,
      badges: [
        ...(it.badges ?? []),
        ...(p.chokingHazard ? [{ label: 'Chhote purze', tone: 'warning' as const, icon: AlertTriangle }] : []),
        ...(p.batteryType && !p.batteriesIncluded ? [{ label: 'Cell alag', tone: 'info' as const, icon: BatteryCharging }] : []),
      ],
      meta: { ...(it.meta ?? {}), ages: [...ages] },
    };
  }, [byProduct]);

  return { ...catalog, refreshKeys: [...catalog.refreshKeys, 'toy-profiles-pos', 'toy-gift-packs-pos'] };
}

/** Active gift packs, sold like combos, next to the shop's own combos. */
function useToyBundles(): PosBundle[] {
  const combos = useComboBundles();
  const { data: packs = [] } = useQuery({
    queryKey: ['toy-gift-packs-pos'],
    queryFn: () => toyGiftPacksApi.list({ active: true }).catch(() => [] as ToyGiftPack[]),
    staleTime: 60_000,
  });
  return useMemo(() => {
    const now = Date.now();
    const gifts = (packs as ToyGiftPack[])
      .filter((g) => g.isActive && (!g.validUntil || new Date(g.validUntil).getTime() >= now)
        && (!g.validFrom || new Date(g.validFrom).getTime() <= now) && (g.items ?? []).length > 0)
      .map((g): PosBundle => ({
        id: g.id,
        name: `🎁 ${g.name}`,
        price: Number(g.giftPackPrice),
        image: g.imageUrl ?? undefined,
        featured: g.isFeatured,
        savings: Number(g.savings || 0),
        savingsPct: Number(g.savingsPct || 0),
        items: g.items.map((i) => ({ productId: i.productId, variantId: i.variantId ?? null, quantity: Number(i.quantity) || 1, originalPrice: Number(i.unitPrice) || 0 })),
      }));
    return [...gifts, ...combos];
  }, [packs, combos]);
}

const filters: PosFilter[] = AGE_GROUPS.map(([v, label]) => ({
  id: `age-${v}`, label, icon: Gift, match: (i) => ((i.meta?.ages as string[] | undefined) ?? []).includes(v),
}));


/** Products already checked this session for older variant stock. */
const variantStockChecked = new Set<string>();

/**
 * Before the size/colour picker opens, older variant products get their
 * units moved from the product row to the variant rows (server checks it is
 * exact), so the POS can sell the chosen variant.
 */
function prepareVariants(item: PosItem, opts: AddOptions, api: PosEngineApi): 'continue' | 'handled' {
  if (!item.hasVariants || opts.variant || variantStockChecked.has(item.id)) return 'continue';
  variantStockChecked.add(item.id);
  apiClient.post(`/toystore/products/${item.id}/variant-stock-split`)
    .catch(() => undefined)
    .finally(() => api.addItem(item, opts));
  return 'handled';
}

export const toystorePos: PosIndustryConfig = {
  id: 'toystore',
  label: 'Toy shop',
  useCatalog: useToyCatalog,
  useBundles: useToyBundles,
  quickKeys: true,
  filters,
  beforeAdd: prepareVariants,
  searchHint: 'Khilone ka naam, SKU ya barcode',
};
