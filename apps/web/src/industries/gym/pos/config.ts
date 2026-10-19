/**
 * Gym counter on the shared POS engine: supplements, shakes and drinks
 * from stock, and gym services sold as products without stock (day pass,
 * locker rent, towel, class fee). Membership fees are sold from Members /
 * Memberships, not here. With a member picked as the customer, the cart
 * shows the member's plan, days left and fee due.
 */

import { Package, Sparkles } from 'lucide-react';
import { useComboBundles, useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { GymCartMember } from './GymCartMember';

/** Units the gym product form offers for services (GymPack.productForm). */
const SERVICE_UNITS = new Set(['month', 'quarter', 'half-year', 'year', 'session', 'class', 'visit', 'day-pass', 'hour']);
/** Services carry no stock; the counter must never stop them for it. */
const SERVICE_STOCK = 9999;

function useGymCatalog() {
  return useProductCatalog((it): PosItem => {
    const type = String((it.product as { productType?: string | null }).productType ?? '').toUpperCase();
    const service = type === 'SERVICE' || SERVICE_UNITS.has(it.unit.toLowerCase());
    return {
      ...it,
      stock: service ? SERVICE_STOCK : it.stock,
      badges: service ? [{ label: 'Service', tone: 'info' as const, icon: Sparkles }] : it.badges,
      rank: service ? 1 : 0,
      meta: { ...it.meta, service },
    };
  });
}

const filters: PosFilter[] = [
  { id: 'goods', label: 'Supplements / shakes', icon: Package, match: (i) => !i.meta?.service },
  { id: 'services', label: 'Day pass / locker', icon: Sparkles, match: (i) => !!i.meta?.service },
];

export const gymPos: PosIndustryConfig = {
  id: 'gym',
  label: 'Gym',
  useCatalog: useGymCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  filters,
  searchHint: 'Supplement, shake, day pass ya locker — naam / barcode',
  receiptFooter: 'Shukriya! Training jaari rakhein.',
  voiceAliases: { protein: 'whey', shake: 'shake', locker: 'locker', pass: 'day pass' },
  CartExtra: GymCartMember,
};
