/**
 * Florist counter on the shared POS engine. Stems and bunches carry their
 * freshness (fresh until, wilted) on the card; bouquets and arrangements
 * are combos made of stems, so selling one takes every stem off stock.
 * A bill can carry a delivery or event order (recipient, card, day, slot);
 * after the server saves the bill the order is written from it.
 */

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Flower, Flower2, Gift, Leaf, Sprout } from 'lucide-react';
import { queryClient } from '@core/lib/queryClient';
import { useComboBundles, useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { floristOrdersApi } from '../api/orders.api';
import { floristProductsApi, type FloristProductProfile } from '../api/products.api';
import { FLORIST_KEYS, categoryGroup, daysFromToday, errorText } from '../lib/meta';
import { DeliveryCard } from './DeliveryCard';
import { deliveryStore, draftProblems, toOrder } from './deliveryDraft';

function useFloristCatalog() {
  const profilesQ = useQuery({ queryKey: [FLORIST_KEYS.profiles], queryFn: () => floristProductsApi.list(), staleTime: 60_000, retry: 1 });
  const byProduct = new Map<string, FloristProductProfile>((profilesQ.data ?? []).map((p) => [p.productId, p]));
  const catalog = useProductCatalog((it): PosItem => {
    const p = byProduct.get(it.id);
    if (!p) return it;
    const left = daysFromToday(p.freshUntil);
    const wilted = left !== null && left < 0;
    return {
      ...it,
      badges: [
        ...(wilted ? [{ label: 'Murjha gaya', tone: 'danger' as const, icon: Leaf }] : left !== null && left <= 1 ? [{ label: left === 0 ? 'Aaj tak' : 'Kal tak', tone: 'warning' as const, icon: Leaf }] : []),
        ...(p.isPreArranged ? [{ label: 'Tayyar', tone: 'info' as const, icon: Gift }] : []),
      ],
      subline: [p.flowerType, p.color, p.stemCount ? `${p.stemCount} phool` : null, p.bouquetSize].filter(Boolean).join(' · ') || it.subline,
      searchText: [it.searchText, p.flowerType, p.color, ...(p.occasions ?? [])].filter(Boolean).join(' '),
      dim: wilted || it.dim,
      rank: wilted ? 9 : it.rank,
      meta: { ...it.meta, group: categoryGroup(p.categoryType), wilted },
    };
  }, [profilesQ.data]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, FLORIST_KEYS.profiles] };
}

const inGroup = (...ids: string[]) => (i: PosItem) => ids.includes(String(i.meta?.group ?? ''));
const filters: PosFilter[] = [
  { id: 'stems', label: 'Khule phool', icon: Flower, match: inGroup('stem') },
  { id: 'made', label: 'Bouquet / sajawat', icon: Flower2, match: inGroup('made', 'decor') },
  { id: 'plants', label: 'Paude', icon: Sprout, match: inGroup('plant') },
  { id: 'wilted', label: 'Murjhaye', icon: Leaf, match: (i) => !!i.meta?.wilted },
];

export const floristPos: PosIndustryConfig = {
  id: 'florist',
  label: 'Florist',
  useCatalog: useFloristCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  filters,
  searchHint: 'Phool, bouquet, rang ya mauqa (birthday, shaadi)…',
  receiptFooter: 'Phoolon ko thande paani me rakhein aur roz paani badlein.',
  CartExtra: DeliveryCard,
  beforeAdd: (item, opts) => {
    if (item.meta?.wilted && !(opts.confirmed ?? []).includes('wilted')) toast.warning(`${item.name} murjha chuka hai — check kar ke dein`, { duration: 2500 });
    return 'continue';
  },
  beforeCheckout: () => {
    const { draft } = deliveryStore.get();
    if (!draft) return null;
    const problems = draftProblems(draft);
    if (problems.length) return `Delivery: ${problems[0]}`;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'Delivery order ke liye internet chahiye — delivery hata kar bill banayein';
    return null;
  },
  onSale: (sale) => {
    const { draft } = deliveryStore.get();
    if (!draft) return;
    deliveryStore.set({ draft: null });
    floristOrdersApi.fromSale(toOrder(sale.id, draft))
      .then((o) => {
        queryClient.invalidateQueries({ queryKey: [FLORIST_KEYS.orders] });
        queryClient.invalidateQueries({ queryKey: ['florist-dashboard-overview'] });
        toast.success(`Delivery order ${o.orderNumber} ban gaya`);
      })
      .catch((e) => {
        deliveryStore.set({ failed: { saleId: sale.id, saleNumber: sale.saleNumber, draft } });
        toast.error(errorText(e, 'Bill ban gaya magar delivery order nahi bana — cart me "Dobara" dabayein'));
      });
  },
  voiceAliases: { gulab: 'rose', motia: 'jasmine', genda: 'marigold', haar: 'garland', guldasta: 'bouquet', sehra: 'sehra' },
};
