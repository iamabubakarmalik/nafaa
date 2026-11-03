/**
 * Hardware counter (web hardware/pos/config.ts) on the shared POS. Loose and
 * pack sale come from product units (feet and full length, piece and box).
 * Items with quantity rates or a paint shade ask for the quantity first, so 50
 * bags get the bulk rate and a tinted can carries its shade on the bill. The
 * bill panel switches between retail and contractor (wholesale) rate, and
 * after a bill the counter offers a delivery challan for site delivery.
 */

import { router } from 'expo-router';
import { bulkBreak, type Tier } from '@nafaa/core/industries/hardware';
import { tierPrice } from '@nafaa/core/pos';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { offline } from '@/core/offline';
import { toast } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { bulkPricingApi, hardwareProductsApi, type HardwareFacts } from './api';
import { CounterRate, HardwareOverlay, askQtyRate } from './components/PosSheets';
import { isPaint } from './meta';

let tiers = new Map<string, Tier[]>();
let facts = new Map<string, HardwareFacts>();
let loadedAt = 0;
const allowOnce = new Set<string>();

/** Quantity rates and item facts kept for the counter (refreshed every few minutes while online). */
function refresh() {
  if (!isOnline() || Date.now() - loadedAt < 5 * 60_000) return;
  loadedAt = Date.now();
  void Promise.all([bulkPricingApi.all(), hardwareProductsApi.facts()]).then(([tierRows, factRows]) => {
    const m = new Map<string, Tier[]>();
    for (const x of tierRows) m.set(x.productId ?? '', [...(m.get(x.productId ?? '') ?? []), x]);
    for (const list of m.values()) list.sort((a, b) => a.minQuantity - b.minQuantity);
    tiers = m;
    facts = new Map(factRows.map((f) => [f.productId, f]));
  }).catch(() => { loadedAt = 0; });
}

export const hardwarePos: PosIndustryConfig = {
  ...generalPos,
  id: 'hardware',
  searchHint: msg('Naam, size (3/4), shade code ya barcode…'),
  Overlay: HardwareOverlay,
  CartExtra: CounterRate,
  beforeAdd: (productId, opts, api) => {
    if (allowOnce.delete(productId)) return 'continue';
    refresh();
    // Size variants and packs keep their own rates; scans with a quantity go straight on.
    if (opts.variant || (opts.unit && opts.unit.conversionRate !== 1)) return 'continue';
    const list = tiers.get(productId) ?? [];
    const paint = isPaint(facts.get(productId)?.categoryType);
    // Plain items take the bill's tier price in the engine (Thekedar rate = wholesale tier).
    if (!list.length && !paint) return 'continue';
    void (async () => {
      const product = await offline.products.get(productId, api.shopId).catch(() => null);
      if (!product || product.hasVariants) { allowOnce.add(productId); await api.addProduct(productId, opts); return; }
      const tier = useBill.getState().tier;
      const baseRate = tierPrice({ price: product.price, wholesalePrice: product.wholesalePrice, creditPrice: product.creditPrice }, tier);
      const wholesale = tier === 'WHOLESALE' && baseRate < product.price;
      askQtyRate({
        id: productId, name: product.name, unit: product.unit, stock: product.stock, tiers: list, baseRate, rateLabel: wholesale ? t('Thekedar rate') : t('Retail rate'), paint, startQty: opts.qty ?? 1,
        onConfirm: (r) => {
          const note = [opts.note, r.tier ? `Bulk rate ${r.tier.minQuantity}+` : '', r.shade ? `Shade: ${r.shade}` : ''].filter(Boolean).join(' · ') || undefined;
          allowOnce.add(productId);
          // A bulk rate is fixed for the line; otherwise the engine prices it at the bill's tier.
          void api.addProduct(productId, { ...opts, qty: r.qty, price: r.tier ? r.price : undefined, note }).then((ok) => { if (!ok) allowOnce.delete(productId); });
        },
      });
    })();
    return 'handled';
  },
  // A bulk rate only holds while the line still has the bulk quantity.
  beforeCheckout: () => {
    const hit = bulkBreak(useBill.getState().lines.map((l) => ({ name: l.name, note: l.note, quantity: l.quantity })));
    return hit ? t('{{name}}: bulk rate {{value}}+ par hai, bill me {{qty}} hai — line hata kar dobara dalein', { name: hit.name, value: hit.min, qty: hit.quantity }) : null;
  },
  afterSale: (sale) => {
    toast.success(t('Bill {{saleNumber}} ban gaya', { saleNumber: sale.saleNumber }), {
      message: t('Site par bhejna hai? Challan banayein — baqi maal baad me alag challan par bhi ja sakta hai.'), duration: 8000,
      action: { label: t('Challan banayein'), onPress: () => router.push(`/hardware/deliveries/new?sale=${sale.id}` as never) },
    });
  },
};

registerPosIndustry(hardwarePos);
