/**
 * Printable documents for purchasing: one purchase bill or order, a list of
 * purchases, a supplier's khata statement and the supplier list. Each is a
 * PrintDoc, so the shared print button prints it on A4, as a PDF or on a
 * thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc, PrintRow } from '@core/print';
import type { Purchase, PurchaseItem, PurchaseList } from './purchases/api/purchases.api';
import type { Supplier } from './suppliers/api/suppliers.api';
import { entryDelta, ledgerMeta, type SupplierStatement } from './suppliers/api/supplier-ledger.api';

const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const q3 = (n: number) => String(Number((n ?? 0).toFixed(3)));
const nameOf = (i: PurchaseItem) => i.itemName || i.product?.name || i.ingredient?.name || 'Cheez';
const STATUS: Record<string, string> = { PENDING: 'Order — maal nahi aaya', PARTIAL: 'Aadha aaya', RECEIVED: 'Aa gaya', CANCELLED: 'Cancel' };

export function purchaseDoc(p: Purchase): PrintDoc {
  const order = p.status === 'PENDING';
  const received = p.receivedValue ?? p.total;
  const credit = Math.max(received - p.paidAmount, 0);
  const totals: PrintRow[] = [
    { label: 'Cheezein', value: formatPKR(p.subtotal) },
    ...(p.discount > 0 ? [{ label: 'Discount', value: `−${formatPKR(p.discount)}` }] : []),
    ...((p.otherCharges ?? 0) > 0 ? [{ label: 'Kiraya / loading', value: `+${formatPKR(p.otherCharges!)}` }] : []),
    ...((p.taxAmount ?? 0) > 0 ? [{ label: 'Tax', value: `+${formatPKR(p.taxAmount!)}` }] : []),
    { label: order ? 'Order ki raqam' : 'Kul bill', value: formatPKR(p.total), strong: true },
    ...(p.status === 'PARTIAL' ? [{ label: 'Ab tak maal aaya', value: formatPKR(received) }] : []),
    ...(!order ? [{ label: 'Diye', value: formatPKR(p.paidAmount) }] : []),
    ...(!order && credit > 0 ? [{ label: 'Udhaar', value: formatPKR(credit), strong: true }] : []),
    ...((p.returnedAmount ?? 0) > 0 ? [{ label: 'Maal wapas', value: `−${formatPKR(p.returnedAmount!)}` }] : []),
  ];
  return {
    title: order ? 'Purchase order' : 'Purchase bill',
    subtitle: p.supplier.name,
    meta: [
      ['Bill #', p.purchaseNumber],
      ['Tareekh', day(p.purchasedAt)],
      ...(p.supplierInvoiceNo ? [['Supplier bill #', p.supplierInvoiceNo] as [string, string]] : []),
      ...(p.shop?.name ? [['Branch', p.shop.name] as [string, string]] : []),
      ['Halat', STATUS[p.status] ?? p.status],
      ...(order && p.expectedAt ? [['Maal aana hai', day(p.expectedAt)] as [string, string]] : []),
      ...(p.dueDate && credit > 0 ? [['Dena hai tak', day(p.dueDate)] as [string, string]] : []),
    ],
    sections: [
      {
        kind: 'table',
        columns: [{ label: 'Cheez' }, { label: 'Miqdar', align: 'right' }, { label: 'Rate', align: 'right', wideOnly: true }, { label: 'Raqam', align: 'right' }],
        rows: p.items.map((i) => [
          `${nameOf(i)}${(i.conversionRate ?? 1) !== 1 ? ` (1 ${i.unitName} = ${q3(i.conversionRate!)})` : ''}${i.batchNo ? ` · Batch ${i.batchNo}` : ''}`,
          `${q3(i.quantity)} ${i.unitName ?? ''}`.trim(),
          formatPKR(i.costPrice),
          formatPKR(i.total),
        ]),
      },
      { kind: 'rows', rows: totals },
      ...(p.notes ? [{ kind: 'text' as const, title: 'Note', text: p.notes }] : []),
      ...(p.supplier.phone ? [{ kind: 'text' as const, text: `Supplier: ${p.supplier.name} · ${p.supplier.phone}` }] : []),
    ],
    footer: order ? 'Yeh order hai — maal aane par stock me jayega.' : undefined,
  };
}

export function purchasesListDoc(list: PurchaseList, period: string): PrintDoc {
  return {
    title: 'Kharidari report',
    subtitle: period,
    meta: [['Bill', String(list.total)], ['Maal aaya', formatPKR(list.totals.value)], ['Diye', formatPKR(list.totals.paid)]],
    sections: [
      {
        kind: 'table',
        columns: [{ label: 'Tareekh' }, { label: 'Bill #', wideOnly: true }, { label: 'Supplier' }, { label: 'Halat', wideOnly: true }, { label: 'Raqam', align: 'right' }, { label: 'Diye', align: 'right', wideOnly: true }],
        rows: list.items.map((p) => [
          day(p.purchasedAt), p.purchaseNumber, p.supplier.name, STATUS[p.status] ?? p.status,
          formatPKR(p.status === 'PENDING' ? p.total : p.receivedValue), formatPKR(p.paidAmount),
        ]),
        footer: ['', '', 'Kul', '', formatPKR(list.totals.value), formatPKR(list.totals.paid)],
      },
      ...(list.totals.returned > 0 ? [{ kind: 'rows' as const, rows: [{ label: 'Maal wapas', value: formatPKR(list.totals.returned) }] }] : []),
    ],
  };
}

export function statementDoc(st: SupplierStatement, period: string): PrintDoc {
  const rows = [...st.entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.createdAt.localeCompare(b.createdAt));
  return {
    title: 'Supplier khata',
    subtitle: st.supplier.name,
    meta: [
      ['Muddat', period],
      ...(st.supplier.phone ? [['Phone', st.supplier.phone] as [string, string]] : []),
      ['Abhi dena hai', formatPKR(st.supplier.outstandingDue)],
    ],
    sections: [
      {
        kind: 'table',
        columns: [{ label: 'Tareekh' }, { label: 'Tafseel' }, { label: 'Dena barha', align: 'right' }, { label: 'Diye / kam', align: 'right' }, { label: 'Baqi', align: 'right' }],
        rows: rows.map((e) => {
          const d = entryDelta(e);
          return [day(e.entryDate), `${ledgerMeta(e.type).label}${e.reference ? ` · ${e.reference}` : ''}${e.note ? ` — ${e.note}` : ''}`, d > 0 ? formatPKR(d) : '', d < 0 ? formatPKR(-d) : '', formatPKR(e.balanceAfter)];
        }),
        footer: ['', 'Is muddat me', formatPKR(st.totals.added), formatPKR(st.totals.paid), ''],
      },
      { kind: 'rows', rows: [{ label: 'Abhi dena hai', value: formatPKR(st.supplier.outstandingDue), strong: true }] },
    ],
  };
}

export function suppliersDoc(items: Supplier[]): PrintDoc {
  const due = items.reduce((s, x) => s + (x.outstandingDue || 0), 0);
  return {
    title: 'Suppliers',
    meta: [['Suppliers', String(items.length)], ['Kul dena hai', formatPKR(due)]],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Naam' }, { label: 'Phone', wideOnly: true }, { label: 'Shehar', wideOnly: true }, { label: 'Kul kharidari', align: 'right', wideOnly: true }, { label: 'Dena hai', align: 'right' }],
      rows: items.map((x) => [x.name, x.phone ?? '', x.city ?? '', formatPKR(x.totalPurchased), formatPKR(x.outstandingDue)]),
      footer: ['Kul', '', '', '', formatPKR(due)],
    }],
  };
}
