/**
 * Printed and shared purchasing documents (purchase bill or order, supplier
 * khata statement, purchase and supplier lists), built as one simple A4
 * HTML page and sent to the system print sheet or shared as a PDF.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { getReceiptSetup } from '@/core/receipt';
import { toast } from '@/design';
import type { Purchase, PurchaseList } from '../api/purchases';
import { entryDelta, ledgerMeta, type Supplier, type SupplierStatement } from '../api/suppliers';
import { day, STATUS } from './meta';

export interface DocTable { columns: Array<{ label: string; end?: boolean }>; rows: string[][]; footer?: string[] }
export interface PrintDoc {
  title: string;
  subtitle?: string;
  meta?: Array<[string, string]>;
  tables: DocTable[];
  totals?: Array<[string, string, boolean?]>;
  note?: string;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function docHtml(doc: PrintDoc, rtl = false): string {
  const shop = getReceiptSetup().shop;
  const table = (tb: DocTable) => `
    <table><thead><tr>${tb.columns.map((c) => `<th class="${c.end ? 'e' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${tb.rows.map((r) => `<tr>${r.map((v, i) => `<td class="${tb.columns[i]?.end ? 'e n' : ''}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>
    ${tb.footer ? `<tfoot><tr>${tb.footer.map((v, i) => `<td class="${tb.columns[i]?.end ? 'e n' : ''}">${esc(v)}</td>`).join('')}</tr></tfoot>` : ''}</table>`;
  return `<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    @page { margin: 12mm; }
    body { font-family: -apple-system, Roboto, 'Noto Naskh Arabic', sans-serif; color: #0f172a; font-size: 12px; margin: 0; }
    header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 10px; }
    .shop { font-size: 16px; font-weight: 700; } .m { color: #475569; font-size: 11px; }
    h1 { font-size: 18px; margin: 0; } .meta { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 8px 0 12px; }
    .meta span b { color: #0f172a; } table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { text-align: start; background: #f1f5f9; font-size: 11px; padding: 6px; } td { padding: 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tfoot td { font-weight: 700; border-top: 2px solid #0f172a; } .e { text-align: end; } .n { direction: ltr; unicode-bidi: isolate; white-space: nowrap; }
    .tot { margin-inline-start: auto; width: 60%; } .tot div { display: flex; justify-content: space-between; padding: 3px 0; } .tot .g { font-weight: 700; font-size: 14px; border-top: 2px solid #0f172a; padding-top: 6px; }
    .note { margin-top: 10px; color: #334155; } footer { margin-top: 18px; text-align: center; color: #94a3b8; font-size: 10px; }
  </style></head><body>
  <header><div><div class="shop">${esc(shop.name)}</div>${shop.address ? `<div class="m">${esc(shop.address)}</div>` : ''}${shop.phone ? `<div class="m n">${esc(shop.phone)}</div>` : ''}</div>
  <div class="e"><h1>${esc(doc.title)}</h1>${doc.subtitle ? `<div class="m">${esc(doc.subtitle)}</div>` : ''}</div></header>
  ${doc.meta?.length ? `<div class="meta">${doc.meta.map(([k, v]) => `<span>${esc(k)}: <b class="n">${esc(v)}</b></span>`).join('')}</div>` : ''}
  ${doc.tables.map(table).join('')}
  ${doc.totals?.length ? `<div class="tot">${doc.totals.map(([k, v, g]) => `<div class="${g ? 'g' : ''}"><span>${esc(k)}</span><span class="n">${esc(v)}</span></div>`).join('')}</div>` : ''}
  ${doc.note ? `<div class="note">${esc(doc.note)}</div>` : ''}
  <footer>Nafaa POS</footer></body></html>`;
}

export async function printDoc(doc: PrintDoc, rtl?: boolean) {
  try { await Print.printAsync({ html: docHtml(doc, rtl) }); } catch { toast.error(t('Print nahi hua')); }
}

export async function shareDoc(doc: PrintDoc, rtl?: boolean) {
  try {
    const { uri } = await Print.printToFileAsync({ html: docHtml(doc, rtl) });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.title });
  } catch { toast.error(t('PDF nahi bani')); }
}

const nameOf = (i: Purchase['items'][number]) => i.itemName || i.product?.name || i.ingredient?.name || t('Cheez');
const q3 = (n: number) => String(Number((n ?? 0).toFixed(3)));

/** Purchase bill, or the order to send to the supplier (rates can be hidden). */
export function purchaseDoc(p: Purchase, opts: { kind: 'bill' | 'order'; hideRates?: boolean }): PrintDoc {
  const order = opts.kind === 'order';
  const cols = order && opts.hideRates
    ? [{ label: t('Cheez') }, { label: t('Quantity'), end: true }]
    : [{ label: t('Cheez') }, { label: t('Quantity'), end: true }, { label: t('Rate'), end: true }, { label: t('Amount'), end: true }];
  const rows = p.items.map((i) => {
    const name = `${nameOf(i)}${i.variant?.name ? ` (${i.variant.name})` : ''}${i.batchNo ? ` · ${t('Batch {{batchNo}} · ', { batchNo: i.batchNo }).replace(/ · $/, '')}` : ''}`;
    const q = `${q3(i.quantity)} ${i.unitName ?? ''}`.trim();
    return order && opts.hideRates ? [name, q] : [name, q, formatPKR(i.costPrice), formatPKR(i.total)];
  });
  const credit = Math.max((p.receivedValue ?? p.total) - p.paidAmount, 0);
  const totals: Array<[string, string, boolean?]> = order && opts.hideRates ? [] : [
    [t('Cheezein'), formatPKR(p.subtotal)],
    ...(p.discount > 0 ? [[t('Discount'), `−${formatPKR(p.discount)}`] as [string, string]] : []),
    ...((p.otherCharges ?? 0) > 0 ? [[t('Kiraya / loading'), formatPKR(p.otherCharges)] as [string, string]] : []),
    ...((p.taxAmount ?? 0) > 0 ? [[t('Tax'), formatPKR(p.taxAmount)] as [string, string]] : []),
    [order ? t('Order') : t('Kul bill'), formatPKR(p.total), true],
    ...(!order ? [[t('Diye'), formatPKR(p.paidAmount)] as [string, string]] : []),
    ...(!order && credit > 0 ? [[t('Udhaar par'), formatPKR(credit)] as [string, string]] : []),
  ];
  return {
    title: order ? t('Order') : t('Purchase'),
    subtitle: p.purchaseNumber,
    meta: [
      [t('Supplier'), p.supplier.name],
      ...(p.supplier.phone ? [[t('Phone'), p.supplier.phone] as [string, string]] : []),
      [t('Date'), day(p.purchasedAt)],
      ...(p.supplierInvoiceNo ? [[t('Supplier ka bill #'), p.supplierInvoiceNo] as [string, string]] : []),
      ...(order && p.expectedAt ? [[t('Maal kab tak aayega'), day(p.expectedAt)] as [string, string]] : []),
      ...(p.shop?.name ? [[t('Branch'), p.shop.name] as [string, string]] : []),
    ],
    tables: [{ columns: cols, rows }],
    totals,
    note: p.notes ?? undefined,
  };
}

export function purchasesListDoc(list: PurchaseList, period: string): PrintDoc {
  return {
    title: t('Purchase report'),
    subtitle: period,
    meta: [[t('Bill'), String(list.total)], [t('Maal aaya'), formatPKR(list.totals.value)], [t('Diye'), formatPKR(list.totals.paid)]],
    tables: [{
      columns: [{ label: t('Date') }, { label: t('Bill #') }, { label: t('Supplier') }, { label: t('Halat') }, { label: t('Amount'), end: true }, { label: t('Diye'), end: true }],
      rows: list.items.map((p) => [day(p.purchasedAt), p.purchaseNumber, p.supplier.name, t(STATUS[p.status]?.label ?? p.status),
        formatPKR(p.status === 'PENDING' ? p.total : p.receivedValue), formatPKR(p.paidAmount)]),
      footer: ['', '', t('Kul'), '', formatPKR(list.totals.value), formatPKR(list.totals.paid)],
    }],
    totals: list.totals.returned > 0 ? [[t('Maal wapas'), formatPKR(list.totals.returned)]] : undefined,
  };
}

export function statementDoc(st: SupplierStatement, period: string): PrintDoc {
  const rows = [...st.entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.createdAt.localeCompare(b.createdAt));
  return {
    title: t('Supplier khata'),
    subtitle: st.supplier.name,
    meta: [[t('Period'), period], ...(st.supplier.phone ? [[t('Phone'), st.supplier.phone] as [string, string]] : []), [t('Abhi dena hai'), formatPKR(st.supplier.outstandingDue)]],
    tables: [{
      columns: [{ label: t('Date') }, { label: t('Details') }, { label: t('Dena barha'), end: true }, { label: t('Diye / kam'), end: true }, { label: t('Baqi'), end: true }],
      rows: rows.map((e) => {
        const d = entryDelta(e);
        return [day(e.entryDate), `${t(ledgerMeta(e.type).label)}${e.reference ? ` · ${e.reference}` : ''}${e.note ? ` — ${t(e.note)}` : ''}`,
          d > 0 ? formatPKR(d) : '', d < 0 ? formatPKR(-d) : '', formatPKR(e.balanceAfter)];
      }),
      footer: ['', t('Is period me'), formatPKR(st.totals.added), formatPKR(st.totals.paid), ''],
    }],
    totals: [[t('Abhi dena hai'), formatPKR(st.supplier.outstandingDue), true]],
  };
}

export function suppliersDoc(items: Supplier[]): PrintDoc {
  const due = items.reduce((s, x) => s + (x.outstandingDue || 0), 0);
  return {
    title: t('Suppliers'),
    meta: [[t('Suppliers'), String(items.length)], [t('Kul dena hai'), formatPKR(due)]],
    tables: [{
      columns: [{ label: t('Naam') }, { label: t('Phone') }, { label: t('Shehar') }, { label: t('Kul purchase'), end: true }, { label: t('Dena hai'), end: true }],
      rows: items.map((x) => [x.name, x.phone ?? '', x.city ?? '', formatPKR(x.totalPurchased), formatPKR(x.outstandingDue)]),
      footer: [t('Kul'), '', '', '', formatPKR(due)],
    }],
  };
}
