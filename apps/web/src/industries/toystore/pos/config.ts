/**
 * Toy shop POS on the shared engine: full catalog with variants, udhaar,
 * split payment, receipts and quick keys. Age chips filter the shelf, cards
 * warn about small parts and cells not in the box, gift wrapping is a
 * one-tap service line (no stock), and gift packs sell as bundles: each toy
 * in a pack leaves stock at checkout and the pack price is shared across them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@core/api/client';
import { AlertTriangle, BatteryCharging, Gift, Moon } from 'lucide-react';
import { useComboBundles, useProductCatalog, type PosBundle, type PosFilter, type AddOptions, type PosEngineApi, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import type { PosCartLine } from '@modules/pos/lib/posCart';
import { toyGiftPacksApi, type ToyGiftPack } from '../api/gift-packs.api';
import { agesOf, cellsNeeded, factLine, useToyFacts } from '../hooks/useToyFacts';
import { AGE_GROUPS, GIFT_WRAP_SKU, KEYS } from '../lib/meta';

/** Gift wrapping is a service: never out of stock at the counter. */
const SERVICE_STOCK = 9999;

function useToyCatalog() {
  const facts = useToyFacts();
  const catalog = useProductCatalog((it): PosItem => {
    if (it.product.sku === GIFT_WRAP_SKU) {
      return { ...it, stock: SERVICE_STOCK, rank: -1, badges: [{ label: 'Service', tone: 'info' as const, icon: Gift }], meta: { ...(it.meta ?? {}), service: true, wrap: true } };
    }
    const f = facts.get(it.id);
    if (!f) return it;
    const cells = cellsNeeded(f);
    return {
      ...it,
      subline: factLine(f) ?? it.subline,
      searchText: [it.searchText, f.brand, f.characterFranchise].filter(Boolean).join(' '),
      badges: [
        ...(it.badges ?? []),
        ...(f.chokingHazard ? [{ label: 'Chhote purze', tone: 'warning' as const, icon: AlertTriangle }] : []),
        ...(cells ? [{ label: 'Cell alag', tone: 'info' as const, icon: BatteryCharging }] : []),
        ...(f.isEidGift ? [{ label: 'Eid', tone: 'brand' as const, icon: Moon }] : []),
      ],
      meta: { ...(it.meta ?? {}), ages: agesOf(f), cells, eid: f.isEidGift },
    };
  }, [facts]);

  return { ...catalog, refreshKeys: [...catalog.refreshKeys, KEYS.facts, KEYS.posPacks] };
}

/** Gift pack ids on the counter, and the packs on the bill being sent (counted once the server saves it). */
const packIds = new Set<string>();
let packsOnBill: Array<{ id: string; qty: number }> = [];

/** Active gift packs inside their dates, sold like combos, next to the shop's own combos. */
function useToyBundles(): PosBundle[] {
  const combos = useComboBundles();
  const { data: packs = [] } = useQuery({
    queryKey: [KEYS.posPacks],
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
    packIds.clear();
    gifts.forEach((g) => packIds.add(g.id));
    return [...gifts, ...combos];
  }, [packs, combos]);
}

const filters: PosFilter[] = [
  { id: 'wrap', label: 'Gift wrap', icon: Gift, match: (i) => !!i.meta?.wrap },
  { id: 'eid', label: 'Eid', icon: Moon, match: (i) => !!i.meta?.eid },
  ...AGE_GROUPS.filter(([v]) => v !== 'ALL_AGES').map(([v, label]): PosFilter => ({
    id: `age-${v}`, label, icon: Gift, match: (i) => ((i.meta?.ages as string[] | undefined) ?? []).some((a) => a === v || a === 'ALL_AGES'),
  })),
];

/** Products already checked this session for older variant stock. */
const variantStockChecked = new Set<string>();

/**
 * Before the size/colour picker opens, older variant products get their
 * units moved from the product row to the variant rows (server checks it is
 * exact), so the POS can sell the chosen variant. A toy whose cells are not
 * in the box reminds the cashier to offer them.
 */
function beforeAdd(item: PosItem, opts: AddOptions, api: PosEngineApi): 'continue' | 'handled' {
  const cells = item.meta?.cells as string | null | undefined;
  if (cells && !api.cart.some((l) => l.productId === item.id)) toast.info(`${item.name}: cell dabbe me nahi — ${cells}`, { duration: 3000 });
  if (!item.hasVariants || opts.variant || variantStockChecked.has(item.id)) return 'continue';
  variantStockChecked.add(item.id);
  apiClient.post(`/toystore/products/${item.id}/variant-stock-split`)
    .catch(() => undefined)
    .finally(() => api.addItem(item, opts));
  return 'handled';
}

/** Runs last just before the bill is sent: remembers which gift packs it holds. */
function beforeCheckout(cart: PosCartLine[]): null {
  packsOnBill = cart.filter((l) => l.comboId && packIds.has(l.comboId)).map((l) => ({ id: l.comboId!, qty: l.quantity }));
  return null;
}

/** Counts sold gift packs (best sellers on the packs page). */
function onSale() {
  const sold = packsOnBill;
  packsOnBill = [];
  for (const p of sold) toyGiftPacksApi.recordSale(p.id, p.qty).catch(() => undefined);
}

export const toystorePos: PosIndustryConfig = {
  id: 'toystore',
  label: 'Toy shop',
  useCatalog: useToyCatalog,
  useBundles: useToyBundles,
  quickKeys: true,
  filters,
  beforeAdd,
  beforeCheckout,
  onSale,
  searchHint: 'Khilone ka naam, brand, character ya barcode',
  voiceAliases: { gaari: 'car', gurya: 'doll', khilona: 'toy', wrap: 'gift wrapping' },
};
