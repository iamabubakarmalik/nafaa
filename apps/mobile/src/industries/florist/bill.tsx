/**
 * Florist on the shared Sales history: a chip on bills that carry a delivery
 * or event order (type, status) and a link to the order. The order is found
 * by the bill number written on it (needs internet) and cached.
 */

import { Flower2, Truck } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { registerSalesExtras, type SaleChip, type SaleLink } from '@/modules/sales/industry/registry';
import type { HistorySale } from '@/modules/sales/api/history';
import { createBillLookup } from '../retail/lib/lookup';
import { floristOrdersApi, type FloristOrder } from './api';
import { ORDER_STATUS, orderTypeLabel } from './meta';

const keyOf = (s: { id: string; saleNumber: string }) => `${s.id}|${s.saleNumber}`;

const orders = createBillLookup<FloristOrder>(async (keys) => {
  const numbers = keys.map((k) => k.split('|')[1]);
  const found = await floristOrdersApi.byBills(numbers);
  const out = new Map<string, FloristOrder>();
  for (const k of keys) {
    const o = found.find((x) => x.notes === `Bill ${k.split('|')[1]}`);
    if (o) out.set(k, o);
  }
  return out;
}, { saleIdOf: (k) => k.split('|')[0] });

const forSale = (s: HistorySale) => (s.pending ? undefined : orders.get(keyOf(s)));

const chipsOf = (s: HistorySale): SaleChip[] => {
  const o = forSale(s);
  if (!o) return [];
  return [
    { label: `${orderTypeLabel(o.orderType)} ${o.orderNumber}`, tone: 'accent', icon: o.recipientName || o.deliveryAddress ? Truck : Flower2 },
    { label: t(ORDER_STATUS[o.status]?.label ?? o.status), tone: ORDER_STATUS[o.status]?.tone ?? 'neutral' },
  ];
};

const linksOf = (s: HistorySale): SaleLink[] => {
  const o = forSale(s);
  return o ? [{ icon: Truck, label: t('Delivery order'), hint: o.orderNumber, href: `/florist/orders?q=${encodeURIComponent(o.orderNumber)}` }] : [];
};

registerSalesExtras('florist', { rowChips: chipsOf, rowActions: linksOf, detailLinks: (s) => linksOf(s) });
