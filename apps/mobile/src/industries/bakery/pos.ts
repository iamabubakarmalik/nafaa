/**
 * Bakery counter (web bakery/pos/config.ts) on the shared POS: an item whose
 * batch has expired asks before selling, an out-of-stock item (fresh from the
 * oven, not yet in stock) asks "sell anyway", and an item about to expire
 * says how many hours are left. Batch times come from the shelf batches,
 * refreshed in the background, so the counter never waits for the network.
 */

import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { liveBatches } from '@nafaa/core/bakery';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { offline } from '@/core/offline';
import { confirm, toast } from '@/design';
import { freshnessApi } from './api';

/** Under this many hours left, an item is "sell first". */
const URGENT_HOURS = 12;

let hoursLeft = new Map<string, number>();
let loadedAt = 0;
const allowOnce = new Set<string>();
const warned = new Set<string>();

function refreshBatches() {
  if (!isOnline() || Date.now() - loadedAt < 60_000) return;
  loadedAt = Date.now();
  freshnessApi.list({ active: 'true' }).then((logs) => {
    const m = new Map<string, number>();
    for (const f of liveBatches(logs)) if (f.left < URGENT_HOURS) m.set(f.productId, Math.min(m.get(f.productId) ?? Infinity, f.left));
    hoursLeft = m;
  }).catch(() => { loadedAt = 0; });
}

export const bakeryPos: PosIndustryConfig = {
  ...generalPos,
  id: 'bakery',
  searchHint: msg('Cake, patties, bread… ya barcode scan karein'),
  beforeAdd: (productId, opts, api) => {
    if (allowOnce.delete(productId)) return 'continue';
    refreshBatches();
    void (async () => {
      const product = await offline.products.get(productId, api.shopId).catch(() => null);
      if (!product) { allowOnce.add(productId); await api.addProduct(productId, opts); return; }
      const left = hoursLeft.get(productId);
      if (left !== undefined && left <= 0) {
        const ok = await confirm({ title: t('{{name}} — freshness ka waqt guzar chuka', { name: product.name }), message: t('Batch check kar lein, kharab maal na bike.'), confirmLabel: t('Phir bhi bechein'), tone: 'danger' });
        if (!ok) return;
      }
      let next = opts;
      if (!opts.oversell && !api.counter.rules.negativeStock && !product.hasVariants && product.stock != null && product.stock <= 0) {
        const ok = await confirm({ title: t('{{name}} — stock 0 hai', { name: product.name }), message: t('Abhi bana hai aur stock mein nahi chadha?'), confirmLabel: t('Phir bhi bechein') });
        if (!ok) return;
        next = { ...opts, oversell: true };
      }
      if (left !== undefined && left > 0 && !warned.has(productId)) {
        warned.add(productId);
        toast.info(t('{{name}} {{value}} ghante mein kharab hoga', { name: product.name, value: Math.max(1, Math.round(left)) }), { message: t('Bill mein rate par click kar ke discount de sakte hain') });
      }
      allowOnce.add(productId);
      await api.addProduct(productId, next);
    })();
    return 'handled';
  },
};

registerPosIndustry(bakeryPos);
