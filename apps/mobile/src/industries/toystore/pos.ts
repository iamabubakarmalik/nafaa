/**
 * Toy shop counter (web toystore/pos/config.ts) on the shared POS: a "Gift
 * packs" tab (packs sell as bundles, each toy leaves stock and the pack price
 * is shared across them) with the gift wrapping service line, a reminder when
 * a toy's cells are not in the box, older variant products get their units
 * moved onto the variants before the colour picker, and sold packs are
 * counted after the bill. Packs and wrap need internet; the rest is offline.
 */

import { useMemo } from 'react';
import { Gift } from 'lucide-react-native';
import { cellsNeeded, fitsAge } from '@nafaa/core/industries/toystore';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { offline } from '@/core/offline';
import { queryClient } from '@/core/query/client';
import { toast } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { toyGiftPacksApi, toyProductsApi, type ToyFact } from './api';
import { GiftPackPicker } from './components/GiftPackPicker';
import { useToyFacts } from './hooks';
import { AGE_GROUPS, KEYS, factLine, labelOf } from './meta';

const allowOnce = new Set<string>();
const splitChecked = new Set<string>();
let packsOnBill: Array<{ id: string; qty: number }> = [];

const timeout = <T,>(p: Promise<T>, ms: number, fallback: T) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

const facts = () => timeout(
  queryClient.fetchQuery({ queryKey: [KEYS.facts], queryFn: () => toyProductsApi.facts().catch(() => [] as ToyFact[]), staleTime: 5 * 60_000 }),
  1500, [] as ToyFact[],
);

export const toystorePos: PosIndustryConfig = {
  ...generalPos,
  id: 'toystore',
  searchHint: msg('Khilone ka naam, brand, character ya barcode'),
  receiptFooter: 'Khilone ki exchange bill ke saath 7 din me.',
  extraView: { label: msg('Gift packs'), icon: Gift, Component: GiftPackPicker },
  /** Age chips on the shelf and "3-5 saal · Lego · brand" under each toy. */
  useShelf: () => {
    const facts = useToyFacts();
    return useMemo(() => ({
      filters: [{
        key: 'age', label: t('Umar'),
        options: AGE_GROUPS.filter(([k]) => k !== 'ALL_AGES').map(([k]) => ({ value: k, label: labelOf(AGE_GROUPS, k) })),
        match: (p: { id: string }, v: string) => fitsAge(facts.get(p.id), v),
      }],
      subline: (p: { id: string }) => factLine(facts.get(p.id)) ?? null,
    }), [facts]);
  },
  beforeAdd: (productId, opts, api) => {
    if (allowOnce.delete(productId)) return 'continue';
    void (async () => {
      const f = (await facts()).find((x) => x.productId === productId);
      const cells = cellsNeeded(f, t('cell'));
      if (cells && !useBill.getState().lines.some((l) => l.productId === productId)) toast.info(t('{{name}}: cell dabbe me nahi — {{cells}}', { name: f?.brand ?? '', cells }));
      if (!opts.variant && !splitChecked.has(productId)) {
        const row = await offline.products.get(productId, api.shopId).catch(() => null);
        if (row?.hasVariants && isOnline()) {
          splitChecked.add(productId);
          await timeout(toyProductsApi.variantStockSplit(productId).catch(() => undefined), 4000, undefined);
        }
      }
      allowOnce.add(productId);
      await api.addProduct(productId, opts);
    })();
    return 'handled';
  },
  beforeCheckout: () => {
    const lines = useBill.getState().lines;
    packsOnBill = lines.filter((l) => l.comboId).map((l) => ({ id: l.comboId as string, qty: l.quantity }));
    return null;
  },
  afterSale: () => {
    const sold = packsOnBill;
    packsOnBill = [];
    for (const p of sold) void toyGiftPacksApi.recordSale(p.id, p.qty).catch(() => undefined);
  },
};

registerPosIndustry(toystorePos);
