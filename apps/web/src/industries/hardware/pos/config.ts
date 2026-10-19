/**
 * Hardware counter on the shared POS engine. Items show their size, grade
 * or shade; loose and pack sale come from product units (feet and full
 * length, piece and box). Items with quantity rates or a paint shade ask
 * for the quantity first, so 50 bags get the bulk rate and a tinted can
 * carries its shade on the bill. The bill panel switches between retail and
 * contractor (wholesale) rate, and after a bill the counter offers a
 * delivery challan for site delivery.
 */

import { createElement } from 'react';
import { Layers, Paintbrush, Tags, Truck, Wrench } from 'lucide-react';
import { useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import type { Tier } from '../api/bulk-pricing.api';
import type { HardwareFacts } from '../api/products.api';
import { FACTS_KEY, TIERS_KEY, factLine, useHardwareFacts, useTiers } from '../hooks/useHardwareFacts';
import { categoryLabel, isPaint, qty } from '../lib/meta';
import { CounterRate } from './CounterRate';
import { QtyRateModal } from './QtyRateModal';
import { getRateMode, saleListener } from './rateMode';

const BULK_NOTE = /Bulk rate (\d+(?:\.\d+)?)\+/;
const WHOLESALE_NOTE = 'Thekedar rate';

function useHardwareCatalog() {
  const facts = useHardwareFacts();
  const tiers = useTiers();
  const catalog = useProductCatalog((it): PosItem => {
    const f: HardwareFacts | undefined = facts.get(it.id);
    const t: Tier[] | undefined = tiers.get(it.id);
    if (!f && !t) return it;
    return {
      ...it,
      subline: factLine(f) ?? (t?.length ? `${qty(t[0].minQuantity)}+ par kam rate` : undefined),
      badges: [
        ...(t?.length ? [{ label: 'Bulk', tone: 'success' as const, icon: Tags }] : []),
        ...(f?.requiresTruck ? [{ label: 'Gaari', tone: 'warning' as const, icon: Truck }] : []),
      ],
      searchText: [it.searchText, f?.diameter, f?.tileSize, f?.grade, f?.colorName, f?.colorCode, categoryLabel(f?.categoryType)].filter(Boolean).join(' '),
      meta: { ...it.meta, tiers: t, category: f?.categoryType, paint: isPaint(f?.categoryType), truck: !!f?.requiresTruck },
    };
  }, [facts, tiers]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, FACTS_KEY, TIERS_KEY] };
}

const inCategory = (...c: string[]) => (i: PosItem) => c.includes(String(i.meta?.category ?? ''));

const filters: PosFilter[] = [
  { id: 'bulk', label: 'Bulk rate', icon: Tags, match: (i) => !!(i.meta?.tiers as Tier[] | undefined)?.length },
  { id: 'paint', label: 'Paint', icon: Paintbrush, match: inCategory('PAINT', 'PRIMER', 'THINNER') },
  { id: 'pipe', label: 'Pipe / fitting', icon: Wrench, match: inCategory('PLUMBING_PIPE', 'PLUMBING_FITTING', 'SANITARY_WARE', 'STEEL_PIPE') },
  { id: 'build', label: 'Cement / sarya', icon: Layers, match: inCategory('CEMENT', 'STEEL_REBAR', 'BRICKS', 'SAND', 'GRAVEL', 'CRUSH') },
  { id: 'truck', label: 'Gaari wala', icon: Truck, match: (i) => !!i.meta?.truck },
];

export const hardwarePos: PosIndustryConfig = {
  id: 'hardware',
  label: 'Hardware',
  useCatalog: useHardwareCatalog,
  quickKeys: true,
  filters,
  searchHint: 'Naam, size (3/4), shade code ya barcode…',
  CartExtra: CounterRate,
  beforeAdd: (item, opts, api) => {
    const confirmed = opts.confirmed ?? [];
    // Size variants and packs keep their own rates; scans with a quantity go straight on.
    if (confirmed.includes('hw') || item.hasVariants || opts.variant || (opts.unit && opts.unit.conversionRate !== 1)) return 'continue';
    const tiers = (item.meta?.tiers as Tier[] | undefined) ?? [];
    const paint = !!item.meta?.paint;
    const wholesale = getRateMode() === 'wholesale' && Number(item.product.wholesalePrice) > 0 && Number(item.product.wholesalePrice) < item.price
      ? Number(item.product.wholesalePrice) : null;
    const baseRate = wholesale ?? item.price;

    if (!tiers.length && !paint) {
      if (!wholesale) return 'continue';
      api.addItem(item, { ...opts, price: wholesale, confirmed: [...confirmed, 'hw'], note: [opts.note, WHOLESALE_NOTE].filter(Boolean).join(' · ') });
      return 'handled';
    }

    api.openPicker(createElement(QtyRateModal, {
      item, tiers, baseRate, paint, startQty: opts.qty ?? 1,
      rateLabel: wholesale ? 'Thekedar rate' : 'Retail rate',
      onClose: api.closePicker,
      onConfirm: (r) => {
        api.closePicker();
        const note = [
          opts.note,
          r.tier ? `Bulk rate ${r.tier.minQuantity}+` : wholesale ? WHOLESALE_NOTE : '',
          r.shade ? `Shade: ${r.shade}` : '',
        ].filter(Boolean).join(' · ') || undefined;
        api.addItem(item, { ...opts, qty: r.qty, price: r.price !== item.price ? r.price : undefined, note, confirmed: [...confirmed, 'hw'] });
      },
    }));
    return 'handled';
  },
  // A bulk rate only holds while the line still has the bulk quantity.
  beforeCheckout: (cart) => {
    for (const l of cart) {
      const m = l.note?.match(BULK_NOTE);
      if (m && l.quantity < Number(m[1])) {
        return `${l.name}: bulk rate ${m[1]}+ par hai, bill me ${qty(l.quantity)} hai — line hata kar dobara dalein`;
      }
    }
    return null;
  },
  onSale: (sale) => saleListener.current?.(sale),
  voiceAliases: {
    cement: 'cement', sarya: 'sarya steel rebar', pipe: 'pipe', paint: 'paint', tiles: 'tiles', taar: 'wire taar', kil: 'kil nail',
  },
};
