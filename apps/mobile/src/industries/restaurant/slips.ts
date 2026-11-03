/**
 * Restaurant slips through the shared receipt engine (web lib/slips.ts): the
 * pre-bill a table asks for before paying, and the kitchen ticket (KOT) for
 * a station. The KOT never shows money and always goes on thermal paper.
 * Orders taken without internet print their ticket from the phone's copy.
 */

import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { getReceiptSetup, printPaper, printReceipt, type ReceiptDoc, type ReceiptLineDoc, type ReceiptRowDoc } from '@/core/receipt';
import { toast } from '@/design';
import type { Kot, RestaurantOrder } from './api';
import { MODE_META, itemName, lineExtras } from './meta';

const row = (label: string, value?: string | number | null): ReceiptRowDoc[] => (value || value === 0 ? [{ label, value: String(value) }] : []);

function orderRows(o: RestaurantOrder): ReceiptRowDoc[] {
  return [
    { label: 'Order', value: `${t(MODE_META[o.mode]?.label ?? o.mode)} · ${o.orderNumber}`, bold: true },
    ...row('Table', o.table ? `${o.table.tableNumber}${o.table.tableName ? ` (${o.table.tableName})` : ''}` : null),
    ...row('Token', o.token),
    ...row('Mehman', o.numberOfGuests),
    ...row('Waiter', o.waiter?.fullName ?? o.waiterName),
  ];
}

const fail = (e: unknown) => toast.error(t('Print nahi hua'), { message: String((e as Error)?.message ?? '') });

/** Bill for the table before payment; reprinting is fine, nothing is saved here. */
export function printPreBill(o: RestaurantOrder, shopName: string) {
  const setup = getReceiptSetup(shopName);
  const lines: ReceiptLineDoc[] = o.items.filter((it) => !it.isReturned).map((it) => {
    const unit = (it.basePrice ?? 0) + (it.modifierTotal ?? 0);
    return {
      name: itemName(it), qty: it.quantity, unit: '', price: unit, total: it.total ?? unit * it.quantity, discount: it.itemDiscount || undefined,
      details: [lineExtras(it), it.specialInstructions].filter((x): x is string => !!x),
    };
  });
  const extraRows: ReceiptRowDoc[] = [
    ...(o.serviceCharge > 0 ? [{ label: `Service charge${o.serviceChargePct ? ` (${o.serviceChargePct}%)` : ''}`, value: formatMoney(o.serviceCharge) }] : []),
    ...(o.taxAmount > 0 ? [{ label: `Tax${o.taxPct ? ` (${o.taxPct}%)` : ''}`, value: formatMoney(o.taxAmount) }] : []),
    ...(o.packagingFee > 0 ? [{ label: 'Packing', value: formatMoney(o.packagingFee) }] : []),
    ...(o.tip > 0 ? [{ label: 'Tip', value: formatMoney(o.tip) }] : []),
  ];
  const due = Math.max(o.total - o.paidAmount, 0);
  const doc: ReceiptDoc = {
    saleNumber: o.orderNumber, date: new Date(), stamp: 'BILL — PAYMENT BAQI',
    customerName: o.customerName ?? undefined, customerPhone: o.customerPhone ?? undefined,
    deliveryAddress: o.mode === 'DELIVERY' ? o.deliveryAddress ?? undefined : undefined,
    infoRows: orderRows(o), lines, subtotal: o.subtotal, discount: o.discount, deliveryCharge: o.deliveryFee || undefined, extraRows,
    total: o.total, paid: o.paidAmount, paymentLabel: o.paidAmount > 0 ? 'Pehle mila' : 'Abhi paid nahi',
    footerNote: due > 0 ? `Payment: ${formatMoney(due)}. Shukriya!` : undefined,
  } as ReceiptDoc;
  printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 }).catch(fail);
}

export interface TicketLine { id?: string; name: string; quantity: number; modifiers?: string[]; specialInstructions?: string | null; spiceLevel?: string | null; cookingNote?: string | null }
export interface TicketSnapshot {
  orderNumber?: string; token?: number | null; mode?: string; guests?: number | null; customerName?: string | null; specialRequests?: string | null;
  table?: { tableNumber: string; tableName?: string | null; section?: string | null } | null;
  items?: TicketLine[];
}

export const snapshotOf = (k: Pick<Kot, 'itemsSnapshot'>) => (k.itemsSnapshot ?? {}) as TicketSnapshot;

/** Kitchen ticket for one station; a cancel ticket says so in large letters. */
export function printKot(k: Pick<Kot, 'kotNumber' | 'station' | 'status' | 'createdAt' | 'notes' | 'itemsSnapshot' | 'order'>, shopName: string) {
  const setup = getReceiptSetup(shopName);
  const snap = snapshotOf(k);
  const cancel = k.status === 'CANCELLED';
  const lines: ReceiptLineDoc[] = (snap.items ?? []).map((it) => ({
    name: it.name, qty: it.quantity, unit: '', price: 0, total: 0,
    details: [...(it.modifiers ?? []), it.spiceLevel && it.spiceLevel !== 'NONE' ? `Mirch: ${it.spiceLevel}` : '', it.cookingNote ?? '', it.specialInstructions ? `Note: ${it.specialInstructions}` : ''].filter(Boolean),
  }));
  const modeKey = (snap.mode ?? k.order?.mode) as keyof typeof MODE_META;
  const mode = MODE_META[modeKey] ? t(MODE_META[modeKey].label) : snap.mode ?? '';
  const table = snap.table ?? k.order?.table;
  const doc = {
    saleNumber: k.kotNumber, date: new Date(k.createdAt), stamp: cancel ? 'CANCEL — MAT BANAYEIN' : `KOT${k.station ? ` · ${k.station}` : ''}`,
    infoRows: [
      ...(table ? [{ label: 'Table', value: `${table.tableNumber}${table.section ? ` · ${table.section}` : ''}`, bold: true }] : []),
      ...row('Token', snap.token ?? k.order?.token),
      { label: 'Order', value: `${mode} · ${snap.orderNumber ?? k.order?.orderNumber ?? ''}` },
      ...row('Mehman', snap.guests),
      ...row('Customer', snap.customerName),
    ],
    lines, subtotal: 0, discount: 0, total: 0, paid: 0, paymentLabel: '', hidePrices: true,
    boxes: [
      ...(snap.specialRequests ? [{ title: 'Order note', lines: [snap.specialRequests] }] : []),
      ...(k.notes ? [{ title: cancel ? 'Wajah' : 'Note', lines: [k.notes] }] : []),
    ],
  } as ReceiptDoc;
  const paper = printPaper(setup);
  printReceipt(doc, { paper: paper === 'A4' ? '80' : paper, setup, copies: 1 }).catch(fail);
}
