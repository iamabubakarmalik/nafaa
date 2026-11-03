/**
 * Sports counter (web sports/pos/config.ts) on the shared POS: a line at or
 * above the product's team quantity moves to the team rate by itself (and
 * back under it, never over a rate typed by hand); an older size product
 * whose units sat on the product row is moved to its sizes once. Team rates
 * come from the sports facts, refreshed in the background, so the counter
 * never waits for the network.
 */

import { teamLineRate } from '@nafaa/core/industries/sports';
import { useAuthStore } from '@/core/auth/store';
import { msg } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { offline } from '@/core/offline';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { useBill } from '@/modules/pos/engine/bill';
import { sportsProductsApi } from './api';

const team = new Map<string, { price: number; min: number }>();
let loadedAt = 0;
const checked = new Set<string>();

function refreshTeamRates() {
  if (!isOnline() || Date.now() - loadedAt < 120_000) return;
  loadedAt = Date.now();
  sportsProductsApi.meta().then((r) => {
    team.clear();
    for (const m of r.items) if (m.teamPrice && m.teamPrice > 0 && m.minTeamOrder) team.set(m.productId, { price: m.teamPrice, min: m.minTeamOrder });
  }).catch(() => { loadedAt = 0; });
}

/** Re-prices bill lines when quantities change (only for sports shops). */
useBill.subscribe((state, prev) => {
  if (state.lines === prev.lines || useAuthStore.getState().tenant?.businessType?.toUpperCase() !== 'SPORTS') return;
  refreshTeamRates();
  let changed = false;
  const lines = state.lines.map((l) => {
    const t = l.productId ? team.get(l.productId) : undefined;
    if (!t || l.type !== 'product') return l;
    const rate = teamLineRate(l, t);
    if (rate === undefined) return l;
    changed = true;
    return { ...l, unitPrice: rate, lineTotal: l.quantity * rate, priceEdited: false };
  });
  if (changed) state.setLines(() => lines);
});

export const sportsPos: PosIndustryConfig = {
  ...generalPos,
  id: 'sports',
  searchHint: msg('Naam, SKU, barcode ya sport likhein'),
  beforeAdd: (productId, opts, api) => {
    refreshTeamRates();
    if (checked.has(productId) || opts.variant) return 'continue';
    checked.add(productId);
    void (async () => {
      const p = await offline.products.get(productId, api.shopId).catch(() => null);
      if (p?.hasVariants && isOnline()) await sportsProductsApi.splitVariantStock(productId).catch(() => undefined);
      await api.addProduct(productId, opts);
    })();
    return 'handled';
  },
};

registerPosIndustry(sportsPos);
