/**
 * Bakery on the shared Sales history and receipt: bills that closed a cake or
 * bulk order get a chip and a link to the order, and the receipt shows the
 * order token (its number) and the delivery day and time. The bill's lines
 * carry the note "Order <number>"; the order is then looked up by number.
 * Needs internet; offline rows and receipts stay plain.
 */

import { CakeSlice } from 'lucide-react-native';
import { apiKey } from '@/core/offline';
import { apiClient } from '@/core/api/client';
import { t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import { registerReceiptIndustry } from '@/core/receipt';
import { registerSalesExtras, type SaleChip, type SaleLink } from '@/modules/sales/industry/registry';
import type { HistorySale } from '@/modules/sales/api/history';
import { billOf, shortDate, word } from '../retail/lib/bill';
import { createBillLookup } from '../retail/lib/lookup';
import { bulkOrdersApi, cakeOrdersApi } from './api';

interface OrderRef { kind: 'cake' | 'bulk'; id: string; number: string; day?: string | null; time?: string | null }

const orderNumberOf = (items: Array<{ note?: string | null }>) => items.map((i) => /^Order (\S+)$/.exec(i.note ?? '')?.[1]).find(Boolean);

async function findOrder(number: string): Promise<OrderRef | null> {
  const [cake] = (await cakeOrdersApi.list({ search: number }).catch(() => [])).filter((o) => o.orderNumber === number);
  if (cake) return { kind: 'cake', id: cake.id, number, day: cake.deliveryDate ?? cake.eventDate ?? cake.neededBy, time: cake.deliveryTime ?? cake.eventTime };
  const [bulk] = (await bulkOrdersApi.list({ search: number }).catch(() => [])).filter((o) => o.orderNumber === number);
  return bulk ? { kind: 'bulk', id: bulk.id, number, day: bulk.eventDate, time: bulk.eventTime } : null;
}

const orders = createBillLookup<OrderRef>(async (ids) => {
  const out = new Map<string, OrderRef>();
  await Promise.all(ids.map(async (id) => {
    const sale = await queryClient.fetchQuery({ queryKey: apiKey(`/sales/${id}`), queryFn: async () => (await apiClient.get(`/sales/${id}`)).data, staleTime: 60_000 }) as { items?: Array<{ note?: string | null }> };
    const number = orderNumberOf(sale.items ?? []);
    const found = number ? await findOrder(number) : null;
    if (found) out.set(id, found);
  }));
  return out;
});

const forSale = (s: HistorySale) => (s.pending ? undefined : orders.get(s.id));
const hrefOf = (o: OrderRef) => (o.kind === 'cake' ? `/bakery/cake-orders/${o.id}` : `/bakery/bulk-orders/${o.id}/edit`);

const chipsOf = (s: HistorySale): SaleChip[] => {
  const o = forSale(s);
  return o ? [{ label: `${o.kind === 'cake' ? t('Cake order') : t('Bulk order')} ${o.number}`, tone: 'accent', icon: CakeSlice }] : [];
};
const linksOf = (s: HistorySale): SaleLink[] => {
  const o = forSale(s);
  return o ? [{ icon: CakeSlice, label: o.kind === 'cake' ? t('Cake order') : t('Bulk order'), hint: o.number, href: hrefOf(o) }] : [];
};

registerSalesExtras('bakery', { rowChips: chipsOf, rowActions: linksOf, detailLinks: (s) => linksOf(s) });

registerReceiptIndustry('bakery', (_doc, ctx) => {
  const bill = billOf(ctx);
  const o = bill ? orders.get(bill.saleId) : undefined;
  if (!o) return null;
  const w = (en: string, ur: string, roman = en) => word(ctx.lang, en, ur, roman);
  const day = shortDate(o.day, ctx.lang);
  return {
    infoRows: [
      { label: w('Token', 'ٹوکن'), value: o.number, bold: true },
      ...(day ? [{ label: w('Delivery', 'ڈیلیوری', 'Delivery'), value: [day, o.time].filter(Boolean).join(' · '), bold: true }] : []),
    ],
  };
});
