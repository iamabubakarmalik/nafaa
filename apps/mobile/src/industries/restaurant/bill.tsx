/**
 * Restaurant on the shared Sales history and receipt (web receiptRows): the
 * table (from the bill's own note, so it works offline) and the token chip
 * on a sales row, a link to the order, and on the receipt the order number,
 * token, table, order type, waiter and guests. The order itself is looked up
 * once per bill and cached.
 */

import { Hash, Utensils } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { registerReceiptIndustry } from '@/core/receipt';
import { registerSalesExtras, type SaleChip } from '@/modules/sales/industry/registry';
import type { HistorySale } from '@/modules/sales/api/history';
import { billOf, word } from '../retail/lib/bill';
import { createBillLookup } from '../retail/lib/lookup';
import { ordersApi, type RestaurantOrder } from './api';
import { MODE_META } from './meta';

const orders = createBillLookup<RestaurantOrder>(async (ids) => {
  const out = new Map<string, RestaurantOrder>();
  await Promise.all(ids.map(async (id) => {
    const [found] = await ordersApi.list({ saleId: id }).catch(() => [] as RestaurantOrder[]);
    if (!found) return;
    // The single order carries the waiter's name; the list has only the id.
    out.set(id, found.waiterId ? await ordersApi.getOne(found.id).catch(() => found) : found);
  }));
  return out;
});

/** The bill's note reads "Dine-in · ORD-12 · Table 5". */
function fromNote(note: string | null | undefined) {
  const parts = (note ?? '').split(' · ').map((p) => p.trim());
  const table = parts.find((p) => /^Table\s/i.test(p))?.replace(/^Table\s+/i, '');
  const order = parts.find((p) => /^[A-Z]{2,4}-?\d/.test(p));
  return { table, order };
}

const chipsOf = (s: HistorySale): SaleChip[] => {
  const { table } = fromNote(s.note);
  const o = s.pending ? undefined : orders.get(s.id);
  return [
    ...(table ? [{ label: t('Table {{table}}', { table }), tone: 'accent' as const, icon: Utensils }] : []),
    ...(o?.token ? [{ label: t('Token {{token}}', { token: o.token }), tone: 'info' as const, icon: Hash }] : []),
  ];
};

registerSalesExtras('restaurant', {
  rowChips: chipsOf,
  rowActions: (s) => {
    const o = orders.peek(s.id);
    return o ? [{ icon: Utensils, label: t('Order'), href: `/restaurant/orders/${o.id}` }] : [];
  },
  detailLinks: (s) => {
    const o = orders.get(s.id);
    return o ? [{ icon: Utensils, label: t('Order'), hint: o.orderNumber, href: `/restaurant/orders/${o.id}` }] : [];
  },
});

const MODE_WORDS: Record<string, [string, string, string]> = {
  DINE_IN: ['Dine-in', 'ڈائن اِن', 'Dine-in'], TAKEAWAY: ['Takeaway', 'ٹیک اوے', 'Takeaway'], DELIVERY: ['Delivery', 'ڈیلیوری', 'Delivery'],
  PICKUP: ['Counter', 'کاؤنٹر', 'Counter'], DRIVE_THRU: ['Drive-thru', 'ڈرائیو تھرو', 'Drive-thru'], ROOM_SERVICE: ['Room service', 'روم سروس', 'Room service'],
};

registerReceiptIndustry('restaurant', (_doc, ctx) => {
  const bill = billOf(ctx);
  if (!bill) return null;
  const o = orders.get(bill.saleId);
  const note = fromNote(bill.note);
  const w = (en: string, ur: string, roman = en) => word(ctx.lang, en, ur, roman);
  const rows = [];
  if (o) {
    const table = o.table?.tableNumber ? `${o.table.tableNumber}${o.table.tableName ? ` (${o.table.tableName})` : ''}` : note.table;
    const mode = MODE_WORDS[o.mode] ?? [MODE_META[o.mode]?.label ?? o.mode, MODE_META[o.mode]?.label ?? o.mode, MODE_META[o.mode]?.label ?? o.mode];
    const waiter = o.waiter?.fullName ?? o.waiterName;
    rows.push(
      { label: w('Order #', 'آرڈر #'), value: o.orderNumber },
      ...(o.token ? [{ label: w('Token', 'ٹوکن'), value: String(o.token), bold: true }] : []),
      ...(table ? [{ label: w('Table', 'میز'), value: table, bold: true }] : []),
      { label: w('Order type', 'آرڈر کی قسم', 'Order type'), value: word(ctx.lang, mode[0], mode[1], mode[2]) },
      ...(waiter ? [{ label: w('Waiter', 'ویٹر'), value: waiter }] : []),
      ...(o.numberOfGuests ? [{ label: w('Guests', 'مہمان', 'Mehman'), value: String(o.numberOfGuests) }] : []),
    );
  } else if (note.table || note.order) {
    // Offline or not loaded yet: the bill's own note still carries the table and order number.
    if (note.order) rows.push({ label: w('Order #', 'آرڈر #'), value: note.order });
    if (note.table) rows.push({ label: w('Table', 'میز'), value: note.table, bold: true });
  }
  return { infoRows: rows.filter((r) => r.value) };
});
