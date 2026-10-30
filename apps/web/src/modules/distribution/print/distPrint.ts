/**
 * Distribution prints, drawn by the receipt engine so they carry the shop's
 * A4 design, header and the Nafaa footer:
 *   invoice-a4      one A4 invoice per order (GET /distribution/orders/print);
 *                   with ?tax=1 the sales tax invoice (value excluding tax,
 *                   sales tax per line, both parties' NTN / STRN, FBR number)
 *   load-sheet      pick list, free goods and the trip's invoices, optionally
 *                   followed by every invoice (GET /load-sheets/:id/print)
 *   recovery-sheet  a route's customers with balances and blank columns for
 *                   the collector (GET /collections/recovery-sheet)
 * Copies come from Settings → Printing (docPrefs kinds of the same ids).
 */

import { DOC_KINDS, readDocPref } from '@core/print/docPrefs';
import { esc, renderA4Pack } from '@core/receipt/html';
import { printHtml } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptSetup } from '@core/receipt/types';
import type { InvoicePrint, LoadSheetPrint, PrintBusiness, PrintInvoice, RecoverySheet } from '../api/distribution.api';
import type { TaxInvoicePrint } from '../api/phase2.api';
import { METHOD_LABEL, rs, SHEET_STATUS, trim } from '../lib/meta';

type Kind = 'invoice-a4' | 'load-sheet' | 'recovery-sheet';

function copiesOf(kind: Kind) {
  const k = DOC_KINDS.find((d) => d.id === kind);
  return k ? readDocPref(k, 'A4').copies : 1;
}

/** Shop design for A4 distribution prints: the bill design with business details from the server filled in. */
function setupFor(biz?: Partial<PrintBusiness> | null): ReceiptSetup {
  const base = getReceiptSetup(biz?.name ?? undefined);
  const address = [biz?.address, biz?.city].filter(Boolean).join(', ');
  return {
    shop: {
      ...base.shop,
      name: base.shop.name || biz?.name || 'Dukaan',
      legalName: base.shop.legalName || biz?.legalName || null,
      address: base.shop.address || address || null,
      phone: base.shop.phone || biz?.phone || null,
      email: base.shop.email || biz?.email || null,
      logoUrl: base.shop.logoUrl || biz?.logoUrl || null,
      taxNumber: base.shop.taxNumber || biz?.ntn || null,
      taxLabel: base.shop.taxNumber ? base.shop.taxLabel : biz?.ntn ? 'NTN' : base.shop.taxLabel,
    },
    design: {
      ...base.design,
      a4Title: 'INVOICE', showReviewQr: false, backPrint: 'none', showSavings: false,
      // A wholesale invoice always names the buyer, whatever the counter bill hides.
      showCustomer: true, showCustomerDetails: true,
      footer: base.design.footer || biz?.footer || '',
    },
  };
}

const repeat = <T,>(list: T[], n: number) => Array.from({ length: Math.max(1, n) }, () => list).flat();

/* ───────────────────────── invoice ───────────────────────── */

function invoiceDoc(inv: PrintInvoice, strn: string | null): ReceiptDoc {
  const c = inv.customer;
  const lines = inv.lines.map((l) => ({
    name: l.name,
    qty: l.qty,
    unit: l.unitName ?? 'pcs',
    price: l.rate,
    discount: l.schemeDiscount + l.discount || undefined,
    total: l.net,
    sku: l.sku ?? undefined,
    details: [
      l.conversionRate > 1 && l.unitName ? `1 ${l.unitName} = ${trim(l.conversionRate)} pcs` : '',
      l.schemeNote ? `Scheme: ${l.schemeNote}` : '',
    ].filter(Boolean),
  }));
  const free = inv.free.map((f) => ({
    name: `${f.name} — FREE`, qty: f.baseQty, unit: 'pcs', price: 0, total: 0,
    details: [f.text !== `${trim(f.baseQty)} pcs` ? f.text : '', f.schemeNote ? `Scheme: ${f.schemeNote}` : ''].filter(Boolean),
  }));
  const t = inv.totals;
  const tax = [c?.ntn ? `NTN ${c.ntn}` : '', c?.strn ? `STRN ${c.strn}` : ''].filter(Boolean).join(' · ');
  return {
    saleNumber: inv.invoiceNumber ?? inv.orderNumber,
    date: new Date(inv.date),
    customerName: c ? (c.businessName ? `${c.businessName} — ${c.name}` : c.name) : undefined,
    customerPhone: c?.phone ?? undefined,
    customerAddress: c ? [c.address, c.area && !c.address?.includes(c.area) ? c.area : ''].filter(Boolean).join(', ') || undefined : undefined,
    customerTaxId: tax || undefined,
    infoRows: [
      { label: 'Order', value: inv.orderNumber },
      ...(inv.routeName ? [{ label: 'Route', value: inv.routeName }] : []),
      ...(inv.bookedByName ? [{ label: 'Booker', value: inv.bookedByName }] : []),
      ...(inv.deliveryDate ? [{ label: 'Delivery', value: new Date(inv.deliveryDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) }] : []),
      ...(c?.licenseNo ? [{ label: 'License', value: `${c.licenseNo}${c.licenseExpiry ? ` (${new Date(c.licenseExpiry).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })} tak)` : ''}` }] : []),
      ...(strn ? [{ label: 'Hamara STRN', value: strn }] : []),
    ],
    lines: [...lines, ...free],
    subtotal: t.gross,
    discount: t.schemeDiscount + t.discount,
    extraRows: [
      ...(t.schemeDiscount > 0 && t.discount > 0 ? [{ label: 'Is me scheme discount', value: `−${rs(t.schemeDiscount)}` }] : []),
      ...(t.taxIncluded > 0 ? [{ label: 'Tax (shamil)', value: rs(t.taxIncluded) }] : []),
      ...(t.returned > 0 ? [{ label: 'Wapas aaya maal', value: `−${rs(t.returned)}` }] : []),
    ],
    total: t.total,
    paid: t.paid,
    paymentLabel: 'Khata / udhaar',
    payments: [{ label: 'Abhi mila', amount: t.paid }],
    previousDue: t.previousBalance ?? undefined,
    partyLabel: 'Bill to',
    signLabels: ['Customer ke dastkhat / mohar', 'Delivery wale ke dastkhat'],
    footerNote: inv.note ?? undefined,
    stamp: inv.status === 'VOIDED' || inv.status === 'CANCELLED' ? 'CANCEL' : t.returned >= t.total && t.total > 0 ? 'WAPAS' : undefined,
  };
}

export function printInvoices(data: InvoicePrint) {
  const setup = setupFor(data.business);
  const docs = repeat(data.invoices.map((i) => invoiceDoc(i, data.business.strn)), copiesOf('invoice-a4'));
  printHtml(renderA4Pack({ title: data.invoices.length === 1 ? data.invoices[0].invoiceNumber ?? 'Invoice' : `${data.invoices.length} Invoices`, setup, docs }));
}

/** Sales tax invoices: the same invoice with tax split out and the tax ids of both parties. */
export function printTaxInvoices(data: TaxInvoicePrint) {
  const setup = setupFor(data.business);
  setup.design = { ...setup.design, a4Title: 'SALES TAX INVOICE' };
  const label = data.business.taxLabel || 'Sales Tax';
  const docs = data.invoices.map((inv) => {
    const doc = invoiceDoc(inv, data.business.strn);
    const t = inv.tax;
    doc.lines = doc.lines.map((l, i) => {
      const x = t.lines[i];
      return x && x.rate > 0 ? { ...l, details: [...(l.details ?? []), `Excl. ${rs(x.valueExclTax)} + ${label} ${trim(x.rate)}% ${rs(x.salesTax)}`] } : l;
    });
    doc.infoRows = [
      ...(doc.infoRows ?? []),
      ...(data.business.ntn ? [{ label: 'Hamara NTN', value: data.business.ntn }] : []),
      { label: 'Buyer', value: t.buyerRegistered ? 'Registered' : 'Unregistered' },
      ...(t.fbr?.invoiceNumber ? [{ label: 'FBR Invoice', value: t.fbr.invoiceNumber }] : []),
    ];
    doc.extraRows = [
      ...(doc.extraRows ?? []).filter((r) => !r.label.startsWith('Tax (shamil)')),
      { label: `Value (excl. ${label})`, value: rs(t.valueExclTax) },
      { label, value: rs(t.salesTax) },
    ];
    return doc;
  });
  printHtml(renderA4Pack({ title: data.invoices.length === 1 ? `Tax ${data.invoices[0].invoiceNumber ?? 'Invoice'}` : `${data.invoices.length} Tax Invoices`, setup, docs: repeat(docs, copiesOf('invoice-a4')) }));
}

/* ───────────────────────── load sheet ───────────────────────── */

const SHEET_CSS = `
  .sec { margin: 16px 0 6px; font-weight: 800; font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: #334155; display: flex; justify-content: space-between; }
  .sec span:last-child { font-weight: 600; letter-spacing: 0; text-transform: none; color: #64748b; }
  table.items tfoot td { font-weight: 800; border-top: 2px solid #cbd5e1; padding: 9px 10px; background: #f8fafc; }
  td.blank { min-width: 70px; } .sub { color: #64748b; font-size: 10.5px; }
  .signs.three .sign { flex: 1; }
  .kv { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; } .kv span:nth-child(odd) { color: #64748b; } .kv span:nth-child(even) { font-weight: 600; text-align: right; }
`;

const cell = (v: unknown, cls = '') => `<td${cls ? ` class="${cls}"` : ''}>${v === '' || v === null || v === undefined ? '' : esc(v)}</td>`;
const kv = (rows: Array<[string, string | null | undefined]>) => `<div class="kv">${rows.filter(([, v]) => v).map(([k, v]) => `<span>${esc(k)}</span><span>${esc(v)}</span>`).join('')}</div>`;

export function printLoadSheet(data: LoadSheetPrint, withInvoices: boolean) {
  const setup = setupFor(data.business);
  const s = data.sheet;
  const st = SHEET_STATUS[s.status];
  const date = new Date(s.date).toLocaleDateString('en-PK', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const page = ({ head, foot }: { head: (t: string, n: string, status?: string) => string; foot: string }) => {
    const goods = s.goods.map((g, i) => `<tr>${cell(i + 1, 'n')}<td><div class="iname">${esc(g.name)}${g.variantName ? ` · ${esc(g.variantName)}` : ''}</div>${g.packSize && g.packSize > 1 ? `<div class="sub">1 ${esc(g.packName)} = ${trim(g.packSize)} ${esc(g.baseUnit)}</div>` : ''}</td>
      ${cell(g.packs || '', 'r b')}${cell(g.loose ? trim(g.loose) : '', 'r b')}${cell(`${trim(g.baseQty)} ${g.baseUnit}`, 'r')}${cell(rs(g.value ?? 0), 'r')}<td class="blank"></td></tr>`).join('');
    const free = s.freeGoods.length ? `
      <div class="sec"><span>Free maal (scheme)</span><span>alag rakhein</span></div>
      <table class="items"><thead><tr><th class="n">#</th><th>Product</th><th class="r">Quantity</th><th class="r">Kul pcs</th><th>Check</th></tr></thead>
      <tbody>${s.freeGoods.map((g, i) => `<tr>${cell(i + 1, 'n')}<td class="iname">${esc(g.name)}</td>${cell(g.text, 'r b')}${cell(`${trim(g.baseQty)} ${g.baseUnit}`, 'r')}<td class="blank"></td></tr>`).join('')}</tbody></table>` : '';
    const invoices = s.orders.map((o, i) => `<tr>${cell(i + 1, 'n')}<td><div class="iname">${esc(o.customer?.businessName || o.customer?.name || '—')}</div><div class="sub">${esc([o.customer?.businessName ? o.customer.name : '', o.customer?.area, o.customer?.phone].filter(Boolean).join(' · '))}</div></td>
      <td><div class="b">${esc(o.saleNumber ?? '')}</div><div class="sub">${esc(o.orderNumber)}</div></td>${cell(rs(o.total), 'r b')}<td class="blank"></td><td class="blank"></td><td class="blank"></td></tr>`).join('');
    return `
    <div class="page">
      ${head('LOAD SHEET', s.number, `<div class="status" style="color:#334155;border-color:#334155">${esc(st.label.toUpperCase())}</div>`)}
      <section class="cards">
        <div class="card"><div class="card-k">Gaari</div>${kv([['Delivery', s.deliveryUserName ?? '—'], ['Driver', s.driverName], ['Gaari no.', s.vehicleNo], ['Route', s.routeName]])}</div>
        <div class="card"><div class="card-k">Load sheet</div>${kv([['Date', date], ['Godown', s.shopName], ['Invoices', String(s.invoiceCount)], ['Banayi', s.createdByName], ['Note', s.note]])}</div>
      </section>
      <div class="sec"><span>Maal (pick list)</span><span>${s.goodsTotals.packs} carton/pack · ${trim(s.goodsTotals.baseQty)} pcs kul</span></div>
      <table class="items"><thead><tr><th class="n">#</th><th>Product</th><th class="r">Carton</th><th class="r">Pcs</th><th class="r">Kul</th><th class="r">Value</th><th>Check</th></tr></thead>
        <tbody>${goods}</tbody>
        <tfoot><tr><td></td><td>${s.goodsTotals.lines} items</td><td class="r">${s.goodsTotals.packs}</td><td></td><td class="r">${trim(s.goodsTotals.baseQty)}</td><td class="r">${rs(s.goodsTotals.value)}</td><td></td></tr></tfoot>
      </table>
      ${free}
      <div class="sec"><span>Invoices — route ki tarteeb</span><span>${rs(s.totalValue)}</span></div>
      <table class="items"><thead><tr><th class="n">#</th><th>Customer</th><th>Invoice</th><th class="r">Amount</th><th>Cash mila</th><th>Wapas</th><th>Dastkhat</th></tr></thead>
        <tbody>${invoices}</tbody>
        <tfoot><tr><td></td><td>${s.orders.length} invoices</td><td></td><td class="r">${rs(s.totalValue)}</td><td></td><td></td><td></td></tr></tfoot>
      </table>
      <div class="signs three"><div class="sign">Godown (maal diya)</div><div class="sign">Driver / delivery (maal liya)</div><div class="sign">Accounts</div></div>
      ${foot}
    </div>`;
  };
  const docs = withInvoices && data.invoices?.length ? data.invoices.map((i) => invoiceDoc(i, data.business.strn)) : [];
  const copies = copiesOf('load-sheet');
  printHtml(renderA4Pack({ title: s.number, setup, css: SHEET_CSS, pages: Array.from({ length: copies }, () => page), docs }));
}

/* ───────────────────────── recovery sheet ───────────────────────── */

export function printRecoverySheet(data: RecoverySheet) {
  const setup = setupFor({ name: data.business?.shopName ?? null, phone: data.business?.shopPhone ?? null, address: data.business?.shopAddress ?? null });
  const r = data.route;
  const [y, m, d] = data.date.split('-').map(Number);
  const date = new Date(y, m - 1, d).toLocaleDateString('en-PK', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const page = ({ head, foot }: { head: (t: string, n: string, status?: string) => string; foot: string }) => {
    const rows = data.rows.map((row, i) => {
      const c = row.customer;
      const old = row.ageing.d16_30 + row.ageing.d31_60 + row.ageing.d60_plus;
      return `<tr>${cell(i + 1, 'n')}<td><div class="iname">${esc(c.businessName || c.name)}</div><div class="sub">${esc([c.businessName ? c.name : '', c.phone, c.area].filter(Boolean).join(' · '))}</div></td>
        <td class="r"><div class="b">${rs(row.balance)}</div>${row.overdue ? `<div class="sub" style="color:#b91c1c">${row.dueDays ?? ''} din purana</div>` : row.dueDays ? `<div class="sub">${row.dueDays} din</div>` : ''}</td>
        ${cell(old > 0 ? rs(old) : '—', 'r')}
        <td class="r sub">${row.lastPaymentAt ? `${esc(new Date(row.lastPaymentAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }))}<br>${rs(row.lastPaymentAmount ?? 0)}` : '—'}</td>
        <td class="blank"></td><td class="blank"></td><td class="blank"></td></tr>`;
    }).join('');
    return `
    <div class="page">
      ${head('RECOVERY SHEET', r.code || r.name)}
      <section class="cards">
        <div class="card"><div class="card-k">Route</div>${kv([['Route', r.name], ['Area', r.area], ['Booker', r.bookerName], ['Delivery', r.deliveryUserName]])}</div>
        <div class="card"><div class="card-k">Sheet</div>${kv([['Date', date], ['Customers', String(data.totals.customers)], ['Kul baqi', rs(data.totals.balance)], ['Purana (overdue)', rs(data.totals.overdue)], ['Verify baqi', data.totals.pending ? rs(data.totals.pending) : null]])}</div>
      </section>
      <table class="items"><thead><tr><th class="n">#</th><th>Customer</th><th class="r">Baqi</th><th class="r">15+ din</th><th class="r">Pichli payment</th><th>Mila</th><th>Tareeqa</th><th>Dastkhat</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" class="center muted">Is route par kisi ka udhaar nahi</td></tr>'}</tbody>
        <tfoot><tr><td></td><td>${data.rows.length} customers</td><td class="r">${rs(data.totals.balance)}</td><td></td><td></td><td></td><td></td><td></td></tr></tfoot>
      </table>
      <p class="sub" style="margin-top:8px">Tareeqa: ${Object.values(METHOD_LABEL).join(' / ')}. Har raqam office me verify ho kar khata me jaati hai.</p>
      <div class="signs three"><div class="sign">Recovery wala</div><div class="sign">Accounts (verify)</div></div>
      ${foot}
    </div>`;
  };
  printHtml(renderA4Pack({ title: `Recovery ${r.name}`, setup, css: SHEET_CSS, pages: Array.from({ length: copiesOf('recovery-sheet') }, () => page) }));
}

