/**
 * Printable documents for purchasing: a list of purchases, a supplier's
 * khata statement and the supplier list. Each is a PrintDoc, so the shared print button prints it on A4, as a PDF or on a
 * thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { PurchaseList } from './purchases/api/purchases.api';
import type { Supplier } from './suppliers/api/suppliers.api';
import { entryDelta, ledgerMeta, type SupplierStatement } from './suppliers/api/supplier-ledger.api';

const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const STATUS: Record<string, string> = { PENDING: 'Order — maal nahi aaya', PARTIAL: 'Aadha aaya', RECEIVED: 'Aa gaya', CANCELLED: 'Cancel' };

export function purchasesListDoc(list: PurchaseList, period: string): PrintDoc {
  return {
    title: 'Purchase report',
    subtitle: period,
    meta: [['Bill', String(list.total)], ['Maal aaya', formatPKR(list.totals.value)], ['Diye', formatPKR(list.totals.paid)]],
    sections: [
      {
        kind: 'table',
        columns: [{ label: 'Date' }, { label: 'Bill #', wideOnly: true }, { label: 'Supplier' }, { label: 'Halat', wideOnly: true }, { label: 'Amount', align: 'right' }, { label: 'Diye', align: 'right', wideOnly: true }],
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
      ['Period', period],
      ...(st.supplier.phone ? [['Phone', st.supplier.phone] as [string, string]] : []),
      ['Abhi dena hai', formatPKR(st.supplier.outstandingDue)],
    ],
    sections: [
      {
        kind: 'table',
        columns: [{ label: 'Date' }, { label: 'Details' }, { label: 'Dena barha', align: 'right' }, { label: 'Diye / kam', align: 'right' }, { label: 'Baqi', align: 'right' }],
        rows: rows.map((e) => {
          const d = entryDelta(e);
          return [day(e.entryDate), `${ledgerMeta(e.type).label}${e.reference ? ` · ${e.reference}` : ''}${e.note ? ` — ${e.note}` : ''}`, d > 0 ? formatPKR(d) : '', d < 0 ? formatPKR(-d) : '', formatPKR(e.balanceAfter)];
        }),
        footer: ['', 'Is period me', formatPKR(st.totals.added), formatPKR(st.totals.paid), ''],
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
      columns: [{ label: 'Naam' }, { label: 'Phone', wideOnly: true }, { label: 'Shehar', wideOnly: true }, { label: 'Kul purchase', align: 'right', wideOnly: true }, { label: 'Dena hai', align: 'right' }],
      rows: items.map((x) => [x.name, x.phone ?? '', x.city ?? '', formatPKR(x.totalPurchased), formatPKR(x.outstandingDue)]),
      footer: ['Kul', '', '', '', formatPKR(due)],
    }],
  };
}
