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
import { t } from '@core/i18n';

const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const STATUS: Record<string, string> = { PENDING: t('Order — maal nahi aaya'), PARTIAL: t('Aadha aaya'), RECEIVED: t('Aa gaya'), CANCELLED: t('Cancel') };

export function purchasesListDoc(list: PurchaseList, period: string): PrintDoc {
  return {
    title: t('Purchase report'),
    subtitle: period,
    meta: [[t('Bill'), String(list.total)], [t('Maal aaya'), formatPKR(list.totals.value)], [t('Diye'), formatPKR(list.totals.paid)]],
    sections: [
      {
        kind: 'table',
        columns: [{ label: t('Date') }, { label: t('Bill #'), wideOnly: true }, { label: t('Supplier') }, { label: t('Halat'), wideOnly: true }, { label: t('Amount'), align: 'right' }, { label: t('Diye'), align: 'right', wideOnly: true }],
        rows: list.items.map((p) => [
          day(p.purchasedAt), p.purchaseNumber, p.supplier.name, STATUS[p.status] ?? p.status,
          formatPKR(p.status === 'PENDING' ? p.total : p.receivedValue), formatPKR(p.paidAmount),
        ]),
        footer: ['', '', t('Kul'), '', formatPKR(list.totals.value), formatPKR(list.totals.paid)],
      },
      ...(list.totals.returned > 0 ? [{ kind: 'rows' as const, rows: [{ label: t('Maal wapas'), value: formatPKR(list.totals.returned) }] }] : []),
    ],
  };
}

export function statementDoc(st: SupplierStatement, period: string): PrintDoc {
  const rows = [...st.entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.createdAt.localeCompare(b.createdAt));
  return {
    title: t('Supplier khata'),
    subtitle: st.supplier.name,
    meta: [
      [t('Period'), period],
      ...(st.supplier.phone ? [[t('Phone'), st.supplier.phone] as [string, string]] : []),
      [t('Abhi dena hai'), formatPKR(st.supplier.outstandingDue)],
    ],
    sections: [
      {
        kind: 'table',
        columns: [{ label: t('Date') }, { label: t('Details') }, { label: t('Dena barha'), align: 'right' }, { label: t('Diye / kam'), align: 'right' }, { label: t('Baqi'), align: 'right' }],
        rows: rows.map((e) => {
          const d = entryDelta(e);
          return [day(e.entryDate), `${ledgerMeta(e.type).label}${e.reference ? ` · ${e.reference}` : ''}${e.note ? ` — ${t(e.note)}` : ''}`, d > 0 ? formatPKR(d) : '', d < 0 ? formatPKR(-d) : '', formatPKR(e.balanceAfter)];
        }),
        footer: ['', t('Is period me'), formatPKR(st.totals.added), formatPKR(st.totals.paid), ''],
      },
      { kind: 'rows', rows: [{ label: t('Abhi dena hai'), value: formatPKR(st.supplier.outstandingDue), strong: true }] },
    ],
  };
}

export function suppliersDoc(items: Supplier[]): PrintDoc {
  const due = items.reduce((s, x) => s + (x.outstandingDue || 0), 0);
  return {
    title: t('Suppliers'),
    meta: [[t('Suppliers'), String(items.length)], [t('Kul dena hai'), formatPKR(due)]],
    sections: [{
      kind: 'table',
      columns: [{ label: t('Naam') }, { label: t('Phone'), wideOnly: true }, { label: t('Shehar'), wideOnly: true }, { label: t('Kul purchase'), align: 'right', wideOnly: true }, { label: t('Dena hai'), align: 'right' }],
      rows: items.map((x) => [x.name, x.phone ?? '', x.city ?? '', formatPKR(x.totalPurchased), formatPKR(x.outstandingDue)]),
      footer: [t('Kul'), '', '', '', formatPKR(due)],
    }],
  };
}
