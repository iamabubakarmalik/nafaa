/**
 * Day book output: the short Z report (thermal or A4), the full day book
 * (A4/PDF), the WhatsApp text and the CSV of items. Amounts the viewer may
 * not see arrive already masked through `money`.
 */

import type { PrintDoc, PrintRow, PrintSection } from '@core/print';
import { PAYMENT_LABELS } from '@modules/dashboard/engine/useChartTheme';
import type { DayBook } from './api';
import { t } from '@core/i18n';

export interface Money {
  sales: (n: number | null | undefined) => string;
  cost: (n: number | null | undefined) => string;
  costHidden: boolean;
}

export const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
export const prettyDay = (key: string) =>
  new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${key}T12:00:00`));
export const clock = (v: string | null | undefined) =>
  (v ? new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(v)) : '—');
export const method = (m: string) => PAYMENT_LABELS[m] ?? m;

/** Counted − expected; positive is extra cash, negative is short. */
export const diffLabel = (d: number) => (d === 0 ? t('Barabar') : d > 0 ? t('Zyada') : t('Kam'));

function cashRows(dr: NonNullable<DayBook['drawer']>, m: Money): PrintRow[] {
  const f = dr.flow;
  const rows: PrintRow[] = [{ label: t('Opening (shuru ka cash)'), value: m.sales(dr.opening) }];
  const add = (label: string, v: number, sign: '+' | '-') => { if (v) rows.push({ label: `${sign} ${label}`, value: m.sales(v), sub: true }); };
  add(t('Cash sale'), f.cashSales, '+');
  add(t('Booking advance'), f.bookingReceived, '+');
  add(t('Khata wasooli'), f.khataReceived, '+');
  add(t('Doosri aamdani'), f.otherIncome ?? 0, '+');
  add(t('Cash in'), f.cashIn, '+');
  add(t('Cash out'), f.cashOut, '-');
  add(t('Return'), f.returns, '-');
  add(t('Booking return'), f.bookingRefunds, '-');
  add(t('Expense'), f.expenses, '-');
  add(t('Purchase'), f.purchases, '-');
  add(t('Supplier ko diya'), f.supplierPaid, '-');
  rows.push({ label: t('Hona chahiye'), value: m.sales(dr.expected), strong: true });
  if (dr.counted != null) rows.push({ label: t('Gina hua'), value: m.sales(dr.counted) });
  if (dr.difference != null) rows.push({ label: t('Farq ({{difference}})', { difference: diffLabel(dr.difference) }), value: m.sales(dr.difference) });
  if (!dr.allClosed) rows.push({ label: t('Register abhi khula hai'), value: `${dr.openNow}` });
  return rows;
}

function salesRows(d: DayBook, m: Money): PrintRow[] {
  const s = d.summary;
  const rows: PrintRow[] = [
    { label: t('Cheezon ki qeemat'), value: m.sales(s.subtotal) },
    { label: t('- Discount'), value: m.sales(s.discount), sub: true },
  ];
  if (s.charges) rows.push({ label: t('+ Service charges'), value: m.sales(s.charges), sub: true });
  rows.push({ label: t('Bill ki amount ({{bills}} bill)', { bills: s.bills }), value: m.sales(s.billed) });
  if (s.returns) rows.push({ label: t('- Return ({{returnCount}})', { returnCount: s.returnCount }), value: m.sales(s.returns), sub: true });
  rows.push({ label: t('Net sale'), value: m.sales(s.net), strong: true });
  rows.push({ label: t('Ausat bill'), value: m.sales(s.avgBill) });
  rows.push({ label: t('Cheezein biki'), value: qty(s.itemsSold) });
  if (s.voidedBills) rows.push({ label: t('Void bill'), value: String(s.voidedBills) });
  if (s.credit) rows.push({ label: t('Udhaar par diya'), value: m.sales(s.credit) });
  if (!m.costHidden) rows.push({ label: t('Profit{{value}}', { value: s.margin != null ? ` (${s.margin.toFixed(1)}%)` : '' }), value: m.cost(s.grossProfit) });
  return rows;
}

function paymentRows(d: DayBook, m: Money): PrintRow[] {
  const rows: PrintRow[] = d.payments.map((p) => ({ label: `${method(p.method)} (${p.bills})`, value: m.sales(p.total) }));
  if (d.khata.collected) rows.push({ label: t('Khata wasooli (cash)'), value: m.sales(d.khata.collected) });
  rows.push({ label: t('Kul paisa aaya'), value: m.sales(d.payments.reduce((a, p) => a + p.total, 0) + d.khata.collected), strong: true });
  return rows;
}

function meta(d: DayBook, branch: string) {
  const out: Array<[string, string]> = [[t('Branch'), branch], [t('Bill'), String(d.summary.bills)]];
  if (d.summary.firstBillAt) out.push([t('Waqt'), `${clock(d.summary.firstBillAt)} – ${clock(d.summary.lastBillAt)}`]);
  return out;
}

/** Short end-of-day slip: sales, payments, drawer, spending, staff. */
export function zReportDoc(d: DayBook, m: Money, branch: string): PrintDoc {
  const sections: PrintSection[] = [
    { kind: 'rows', title: t('Sale'), rows: salesRows(d, m) },
    { kind: 'rows', title: t('Paisa kaise aaya'), rows: paymentRows(d, m) },
    ...(d.drawer ? [{ kind: 'rows' as const, title: t('Galla (cash)'), rows: cashRows(d.drawer, m) }] : []),
  ];
  const out: PrintRow[] = [];
  if (d.expenses.total) out.push({ label: t('Expense ({{count}})', { count: d.expenses.count }), value: m.cost(d.expenses.total) });
  if (d.purchases.count) out.push({ label: t('Purchase ({{count}})', { count: d.purchases.count }), value: m.cost(d.purchases.total) });
  if (d.supplierPayments.total) out.push({ label: t('Supplier ko diya'), value: m.cost(d.supplierPayments.total) });
  if (d.khata.given) out.push({ label: t('Udhaar diya'), value: m.sales(d.khata.given) });
  if (d.bookings.advances) out.push({ label: t('Booking advance'), value: m.sales(d.bookings.advances) });
  if (out.length) sections.push({ kind: 'rows', title: t('Aur hisaab'), rows: out });
  if (d.drawer?.registers.length) {
    sections.push({
      kind: 'table', title: t('Register'),
      columns: [{ label: t('Register') }, { label: t('Band kiya'), wideOnly: true }, { label: t('Hona'), align: 'right', wideOnly: true }, { label: t('Farq'), align: 'right' }],
      rows: d.drawer.registers.map((r) => [r.number, r.closedBy ?? t('Khula'), m.sales(r.expected), r.difference == null ? t('Khula') : m.sales(r.difference)]),
    });
  }
  if (d.staff.length) {
    sections.push({ kind: 'rows', title: t('Staff'), rows: d.staff.map((p) => ({ label: `${p.name} (${p.bills})`, value: m.sales(p.total) })) });
  }
  return {
    title: t('Z report — din ka hisaab'),
    subtitle: prettyDay(d.date),
    meta: meta(d, branch),
    sections,
    footer: d.isToday && d.drawer && !d.drawer.allClosed ? t('Din abhi jaari hai — aakhri hisaab register band hone par') : t('Bana: {{generatedAt}}', { generatedAt: clock(d.generatedAt) }),
  };
}

/** Full day book for A4/PDF: every section with its lists. */
export function dayBookDoc(d: DayBook, m: Money, branch: string): PrintDoc {
  const z = zReportDoc(d, m, branch);
  const sections: PrintSection[] = [...z.sections];
  const c = d.compare;
  sections.push({
    kind: 'table', title: t('Muqabla'),
    columns: [{ label: '' }, { label: t('Is din'), align: 'right' }, { label: t('Kal'), align: 'right' }, { label: t('Pichhla hafta'), align: 'right' }],
    rows: [
      [t('Net sale'), m.sales(d.summary.net), m.sales(c.yesterday.net), m.sales(c.lastWeek.net)],
      [t('Bill'), String(d.summary.bills), String(c.yesterday.bills), String(c.lastWeek.bills)],
      [t('Ausat bill'), m.sales(d.summary.avgBill), m.sales(c.yesterday.avgBill), m.sales(c.lastWeek.avgBill)],
      ...(m.costHidden ? [] : [[t('Profit'), m.cost(d.summary.grossProfit), m.cost(c.yesterday.profit), m.cost(c.lastWeek.profit)]]),
    ],
  });

  if (d.items.length) {
    const rows: string[][] = [];
    const groupRows: number[] = [];
    for (const cat of d.categories) {
      groupRows.push(rows.length);
      rows.push([cat.name, qty(cat.qty), m.sales(cat.revenue), m.costHidden ? '' : m.cost(cat.profit)]);
      d.items.filter((i) => (i.categoryId ?? null) === cat.id).forEach((i) => rows.push([
        `  ${i.name}${i.returnedQty ? ` (${qty(i.returnedQty)} wapas)` : ''}`, `${qty(i.qty)} ${i.unit}`, m.sales(i.revenue), m.costHidden ? '' : m.cost(i.profit),
      ]));
    }
    sections.push({
      kind: 'table', title: t('Kya bika'),
      columns: [{ label: t('Cheez') }, { label: t('Qty'), align: 'right' }, { label: t('Amount'), align: 'right' }, { label: t('Profit'), align: 'right', wideOnly: true }],
      rows, groupRows,
      footer: [t('Kul'), qty(d.summary.itemsSold), m.sales(d.items.reduce((a, i) => a + i.revenue, 0)), m.costHidden ? '' : m.cost(d.items.reduce((a, i) => a + (i.profit ?? 0), 0))],
    });
  }
  if (d.expenses.list.length) {
    sections.push({
      kind: 'table', title: t('Expense'),
      columns: [{ label: t('Expense') }, { label: t('Category'), wideOnly: true }, { label: t('Tareeqa'), wideOnly: true }, { label: t('Amount'), align: 'right' }],
      rows: d.expenses.list.map((e) => [e.title, e.category ?? '', method(e.method), m.cost(e.amount)]),
      footer: [t('Kul'), '', '', m.cost(d.expenses.total)],
    });
  }
  if (d.purchases.list.length || d.supplierPayments.list.length) {
    sections.push({
      kind: 'table', title: t('Purchase aur supplier'),
      columns: [{ label: t('Supplier') }, { label: t('Kya'), wideOnly: true }, { label: t('Amount'), align: 'right' }, { label: t('Diye'), align: 'right' }],
      rows: [
        ...d.purchases.list.map((p) => [p.supplier, p.number, m.cost(p.total), m.cost(p.paid)]),
        ...d.supplierPayments.list.map((p) => [p.supplier, t('Payment · {{method}}', { method: method(p.method) }), '', m.cost(p.amount)]),
      ],
    });
  }
  if (d.khata.list.length) {
    sections.push({
      kind: 'table', title: t('Khata'),
      columns: [{ label: t('Customer') }, { label: t('Kya') }, { label: t('Amount'), align: 'right' }],
      rows: d.khata.list.map((k) => [k.customer, k.kind === 'given' ? t('Udhaar diya') : t('Wasool'), m.sales(k.amount)]),
      footer: ['', t('Diya {{given}}', { given: m.sales(d.khata.given) }), t('Wasool {{collected}}', { collected: m.sales(d.khata.collected) })],
    });
  }
  if (d.bookings.list.length) {
    sections.push({
      kind: 'table', title: t('Booking'),
      columns: [{ label: t('Booking') }, { label: t('Customer'), wideOnly: true }, { label: t('Kya') }, { label: t('Amount'), align: 'right' }],
      rows: d.bookings.list.map((b) => [b.number, b.customer ?? '', b.type === 'REFUND' ? t('Return') : t('Advance'), m.sales(b.amount)]),
    });
  }
  if (d.cashMoves.length) {
    sections.push({
      kind: 'table', title: t('Cash in / out'),
      columns: [{ label: t('Waqt') }, { label: t('Wajah') }, { label: t('Kis ne'), wideOnly: true }, { label: t('Amount'), align: 'right' }],
      rows: d.cashMoves.map((c) => [clock(c.at), `${c.type === 'CASH_IN' ? t('In') : t('Out')} · ${c.reason ?? c.note ?? ''}`, c.by ?? '', m.sales(c.amount)]),
    });
  }
  if (d.voids.length || d.returns.length) {
    sections.push({
      kind: 'table', title: t('Void aur return'),
      columns: [{ label: t('Bill') }, { label: t('Kya') }, { label: t('Wajah'), wideOnly: true }, { label: t('Amount'), align: 'right' }],
      rows: [
        ...d.voids.map((v) => [v.saleNumber, t('Void'), v.reason ?? '', m.sales(v.total)]),
        ...d.returns.map((r) => [r.saleNumber, t('Return {{number}}', { number: r.number }), r.reason ?? '', m.sales(r.amount)]),
      ],
    });
  }
  if (d.discounts.list.length) {
    sections.push({
      kind: 'table', title: t('Discount ({{bills}} bill)', { bills: d.discounts.bills }),
      columns: [{ label: t('Bill') }, { label: t('Kis ne'), wideOnly: true }, { label: t('Code'), wideOnly: true }, { label: t('Discount'), align: 'right' }],
      rows: d.discounts.list.map((x) => [x.saleNumber, x.by ?? '', x.code ?? '', m.sales(x.discount)]),
      footer: [t('Kul'), '', '', m.sales(d.discounts.total)],
    });
  }
  if (d.lowStock.length) {
    sections.push({
      kind: 'table', title: t('Kam reh gaya maal'),
      columns: [{ label: t('Cheez') }, { label: t('Branch'), wideOnly: true }, { label: t('Baqi'), align: 'right' }],
      rows: d.lowStock.map((l) => [l.name, l.shop, `${qty(l.stock)} ${l.unit}`]),
    });
  }
  if (d.branches.length > 1) {
    sections.push({
      kind: 'table', title: t('Branch war'),
      columns: [{ label: t('Branch') }, { label: t('Bill'), align: 'right' }, { label: t('Net sale'), align: 'right' }, { label: t('Expense'), align: 'right', wideOnly: true }, { label: t('Farq'), align: 'right', wideOnly: true }],
      rows: d.branches.map((b) => [b.name, String(b.bills), m.sales(b.net), m.cost(b.expenses), b.difference == null ? '—' : m.sales(b.difference)]),
    });
  }
  return { ...z, title: t('Din ki kitaab'), sections };
}

/** Short text for WhatsApp or the clipboard. */
export function dayText(d: DayBook, m: Money, branch: string) {
  const s = d.summary;
  const lines = [
    t('*Din ka hisaab — {{date}}*', { date: prettyDay(d.date) }), branch, '',
    t('Net sale: {{net}} ({{bills}} bill)', { net: m.sales(s.net), bills: s.bills }),
    t('Discount: {{discount}} · Return: {{returns}}', { discount: m.sales(s.discount), returns: m.sales(s.returns) }),
    ...(m.costHidden ? [] : [t('Profit: {{grossProfit}}', { grossProfit: m.cost(s.grossProfit) })]),
    '', '*Paisa*',
    ...d.payments.map((p) => `${method(p.method)}: ${m.sales(p.total)}`),
    ...(d.khata.collected ? [t('Khata wasooli: {{collected}}', { collected: m.sales(d.khata.collected) })] : []),
    ...(s.credit ? [t('Udhaar diya: {{credit}}', { credit: m.sales(s.credit) })] : []),
    ...(d.drawer ? [
      '', '*Galla*',
      t('Opening: {{opening}}', { opening: m.sales(d.drawer.opening) }),
      t('Hona chahiye: {{expected}}', { expected: m.sales(d.drawer.expected) }),
      ...(d.drawer.counted != null ? [t('Gina hua: {{counted}} · Farq {{difference}}', { counted: m.sales(d.drawer.counted), difference: m.sales(d.drawer.difference) })] : [t('Register abhi khula hai')]),
    ] : []),
    '', t('Expense: {{total}}', { total: m.cost(d.expenses.total) }),
    ...(d.purchases.count ? [t('Purchase: {{total}}', { total: m.cost(d.purchases.total) })] : []),
  ];
  const top = d.items.filter((i) => i.qty > 0).slice(0, 10);
  if (top.length) lines.push('', t('*Sab se zyada bika*'), ...top.map((i) => `${qty(i.qty)} ${i.unit} ${i.name}`));
  return lines.join('\n');
}

/** Item-wise CSV of the day. */
export function itemsCsv(d: DayBook, branch: string, costHidden: boolean) {
  const head = [t('Cheez'), 'SKU', t('Category'), t('Unit'), t('Bika'), t('Wapas'), t('Net qty'), t('Bill'), t('Amount'), ...(costHidden ? [] : [t('Cost'), t('Profit')])];
  const rows = d.items.map((i) => [
    i.name, i.sku ?? '', i.category, i.unit, i.soldQty, i.returnedQty, i.qty, i.bills, i.revenue.toFixed(2),
    ...(costHidden ? [] : [(i.cost ?? 0).toFixed(2), (i.profit ?? 0).toFixed(2)]),
  ]);
  const csv = [[`Din ka hisaab — ${d.date}`], [branch], [''], head, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `din-ka-hisaab-${d.date}.csv`; // i18n-ignore
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
