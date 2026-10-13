/**
 * Day book output: the short Z report (thermal or A4), the full day book
 * (A4/PDF), the WhatsApp text and the CSV of items. Amounts the viewer may
 * not see arrive already masked through `money`.
 */

import type { PrintDoc, PrintRow, PrintSection } from '@core/print';
import { PAYMENT_LABELS } from '@modules/dashboard/engine/useChartTheme';
import type { DayBook } from './api';

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
export const diffLabel = (d: number) => (d === 0 ? 'Barabar' : d > 0 ? 'Zyada' : 'Kam');

function cashRows(dr: NonNullable<DayBook['drawer']>, m: Money): PrintRow[] {
  const f = dr.flow;
  const rows: PrintRow[] = [{ label: 'Opening (shuru ka cash)', value: m.sales(dr.opening) }];
  const add = (label: string, v: number, sign: '+' | '-') => { if (v) rows.push({ label: `${sign} ${label}`, value: m.sales(v), sub: true }); };
  add('Cash bikri', f.cashSales, '+');
  add('Booking advance', f.bookingReceived, '+');
  add('Khata wasooli', f.khataReceived, '+');
  add('Cash in', f.cashIn, '+');
  add('Cash out', f.cashOut, '-');
  add('Wapsi', f.returns, '-');
  add('Booking wapsi', f.bookingRefunds, '-');
  add('Kharcha', f.expenses, '-');
  add('Kharidari', f.purchases, '-');
  add('Supplier ko diya', f.supplierPaid, '-');
  rows.push({ label: 'Hona chahiye', value: m.sales(dr.expected), strong: true });
  if (dr.counted != null) rows.push({ label: 'Gina hua', value: m.sales(dr.counted) });
  if (dr.difference != null) rows.push({ label: `Farq (${diffLabel(dr.difference)})`, value: m.sales(dr.difference) });
  if (!dr.allClosed) rows.push({ label: 'Register abhi khula hai', value: `${dr.openNow}` });
  return rows;
}

function salesRows(d: DayBook, m: Money): PrintRow[] {
  const s = d.summary;
  const rows: PrintRow[] = [
    { label: 'Cheezon ki qeemat', value: m.sales(s.subtotal) },
    { label: '- Discount', value: m.sales(s.discount), sub: true },
  ];
  if (s.charges) rows.push({ label: '+ Service charges', value: m.sales(s.charges), sub: true });
  rows.push({ label: `Bill ki raqam (${s.bills} bill)`, value: m.sales(s.billed) });
  if (s.returns) rows.push({ label: `- Wapsi (${s.returnCount})`, value: m.sales(s.returns), sub: true });
  rows.push({ label: 'Net bikri', value: m.sales(s.net), strong: true });
  rows.push({ label: 'Ausat bill', value: m.sales(s.avgBill) });
  rows.push({ label: 'Cheezein biki', value: qty(s.itemsSold) });
  if (s.voidedBills) rows.push({ label: 'Void bill', value: String(s.voidedBills) });
  if (s.credit) rows.push({ label: 'Udhaar par diya', value: m.sales(s.credit) });
  if (!m.costHidden) rows.push({ label: `Munafa${s.margin != null ? ` (${s.margin.toFixed(1)}%)` : ''}`, value: m.cost(s.grossProfit) });
  return rows;
}

function paymentRows(d: DayBook, m: Money): PrintRow[] {
  const rows: PrintRow[] = d.payments.map((p) => ({ label: `${method(p.method)} (${p.bills})`, value: m.sales(p.total) }));
  if (d.khata.collected) rows.push({ label: 'Khata wasooli (cash)', value: m.sales(d.khata.collected) });
  rows.push({ label: 'Kul paisa aaya', value: m.sales(d.payments.reduce((a, p) => a + p.total, 0) + d.khata.collected), strong: true });
  return rows;
}

function meta(d: DayBook, branch: string) {
  const out: Array<[string, string]> = [['Branch', branch], ['Bill', String(d.summary.bills)]];
  if (d.summary.firstBillAt) out.push(['Waqt', `${clock(d.summary.firstBillAt)} – ${clock(d.summary.lastBillAt)}`]);
  return out;
}

/** Short end-of-day slip: sales, payments, drawer, spending, staff. */
export function zReportDoc(d: DayBook, m: Money, branch: string): PrintDoc {
  const sections: PrintSection[] = [
    { kind: 'rows', title: 'Bikri', rows: salesRows(d, m) },
    { kind: 'rows', title: 'Paisa kaise aaya', rows: paymentRows(d, m) },
    ...(d.drawer ? [{ kind: 'rows' as const, title: 'Galla (cash)', rows: cashRows(d.drawer, m) }] : []),
  ];
  const out: PrintRow[] = [];
  if (d.expenses.total) out.push({ label: `Kharcha (${d.expenses.count})`, value: m.cost(d.expenses.total) });
  if (d.purchases.count) out.push({ label: `Kharidari (${d.purchases.count})`, value: m.cost(d.purchases.total) });
  if (d.supplierPayments.total) out.push({ label: 'Supplier ko diya', value: m.cost(d.supplierPayments.total) });
  if (d.khata.given) out.push({ label: 'Udhaar diya', value: m.sales(d.khata.given) });
  if (d.bookings.advances) out.push({ label: 'Booking advance', value: m.sales(d.bookings.advances) });
  if (out.length) sections.push({ kind: 'rows', title: 'Aur hisaab', rows: out });
  if (d.drawer?.registers.length) {
    sections.push({
      kind: 'table', title: 'Register',
      columns: [{ label: 'Register' }, { label: 'Band kiya', wideOnly: true }, { label: 'Hona', align: 'right', wideOnly: true }, { label: 'Farq', align: 'right' }],
      rows: d.drawer.registers.map((r) => [r.number, r.closedBy ?? 'Khula', m.sales(r.expected), r.difference == null ? 'Khula' : m.sales(r.difference)]),
    });
  }
  if (d.staff.length) {
    sections.push({ kind: 'rows', title: 'Staff', rows: d.staff.map((p) => ({ label: `${p.name} (${p.bills})`, value: m.sales(p.total) })) });
  }
  return {
    title: 'Z report — din ka hisaab',
    subtitle: prettyDay(d.date),
    meta: meta(d, branch),
    sections,
    footer: d.isToday && d.drawer && !d.drawer.allClosed ? 'Din abhi jaari hai — aakhri hisaab register band hone par' : `Bana: ${clock(d.generatedAt)}`,
  };
}

/** Full day book for A4/PDF: every section with its lists. */
export function dayBookDoc(d: DayBook, m: Money, branch: string): PrintDoc {
  const z = zReportDoc(d, m, branch);
  const sections: PrintSection[] = [...z.sections];
  const c = d.compare;
  sections.push({
    kind: 'table', title: 'Muqabla',
    columns: [{ label: '' }, { label: 'Is din', align: 'right' }, { label: 'Kal', align: 'right' }, { label: 'Pichhla hafta', align: 'right' }],
    rows: [
      ['Net bikri', m.sales(d.summary.net), m.sales(c.yesterday.net), m.sales(c.lastWeek.net)],
      ['Bill', String(d.summary.bills), String(c.yesterday.bills), String(c.lastWeek.bills)],
      ['Ausat bill', m.sales(d.summary.avgBill), m.sales(c.yesterday.avgBill), m.sales(c.lastWeek.avgBill)],
      ...(m.costHidden ? [] : [['Munafa', m.cost(d.summary.grossProfit), m.cost(c.yesterday.profit), m.cost(c.lastWeek.profit)]]),
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
      kind: 'table', title: 'Kya bika',
      columns: [{ label: 'Cheez' }, { label: 'Qty', align: 'right' }, { label: 'Raqam', align: 'right' }, { label: 'Munafa', align: 'right', wideOnly: true }],
      rows, groupRows,
      footer: ['Kul', qty(d.summary.itemsSold), m.sales(d.items.reduce((a, i) => a + i.revenue, 0)), m.costHidden ? '' : m.cost(d.items.reduce((a, i) => a + (i.profit ?? 0), 0))],
    });
  }
  if (d.expenses.list.length) {
    sections.push({
      kind: 'table', title: 'Kharcha',
      columns: [{ label: 'Kharcha' }, { label: 'Category', wideOnly: true }, { label: 'Tareeqa', wideOnly: true }, { label: 'Raqam', align: 'right' }],
      rows: d.expenses.list.map((e) => [e.title, e.category ?? '', method(e.method), m.cost(e.amount)]),
      footer: ['Kul', '', '', m.cost(d.expenses.total)],
    });
  }
  if (d.purchases.list.length || d.supplierPayments.list.length) {
    sections.push({
      kind: 'table', title: 'Kharidari aur supplier',
      columns: [{ label: 'Supplier' }, { label: 'Kya', wideOnly: true }, { label: 'Raqam', align: 'right' }, { label: 'Diye', align: 'right' }],
      rows: [
        ...d.purchases.list.map((p) => [p.supplier, p.number, m.cost(p.total), m.cost(p.paid)]),
        ...d.supplierPayments.list.map((p) => [p.supplier, `Adaigi · ${method(p.method)}`, '', m.cost(p.amount)]),
      ],
    });
  }
  if (d.khata.list.length) {
    sections.push({
      kind: 'table', title: 'Khata',
      columns: [{ label: 'Customer' }, { label: 'Kya' }, { label: 'Raqam', align: 'right' }],
      rows: d.khata.list.map((k) => [k.customer, k.kind === 'given' ? 'Udhaar diya' : 'Wasool', m.sales(k.amount)]),
      footer: ['', `Diya ${m.sales(d.khata.given)}`, `Wasool ${m.sales(d.khata.collected)}`],
    });
  }
  if (d.bookings.list.length) {
    sections.push({
      kind: 'table', title: 'Booking',
      columns: [{ label: 'Booking' }, { label: 'Customer', wideOnly: true }, { label: 'Kya' }, { label: 'Raqam', align: 'right' }],
      rows: d.bookings.list.map((b) => [b.number, b.customer ?? '', b.type === 'REFUND' ? 'Wapsi' : 'Advance', m.sales(b.amount)]),
    });
  }
  if (d.cashMoves.length) {
    sections.push({
      kind: 'table', title: 'Cash in / out',
      columns: [{ label: 'Waqt' }, { label: 'Wajah' }, { label: 'Kis ne', wideOnly: true }, { label: 'Raqam', align: 'right' }],
      rows: d.cashMoves.map((c) => [clock(c.at), `${c.type === 'CASH_IN' ? 'In' : 'Out'} · ${c.reason ?? c.note ?? ''}`, c.by ?? '', m.sales(c.amount)]),
    });
  }
  if (d.voids.length || d.returns.length) {
    sections.push({
      kind: 'table', title: 'Void aur wapsi',
      columns: [{ label: 'Bill' }, { label: 'Kya' }, { label: 'Wajah', wideOnly: true }, { label: 'Raqam', align: 'right' }],
      rows: [
        ...d.voids.map((v) => [v.saleNumber, 'Void', v.reason ?? '', m.sales(v.total)]),
        ...d.returns.map((r) => [r.saleNumber, `Wapsi ${r.number}`, r.reason ?? '', m.sales(r.amount)]),
      ],
    });
  }
  if (d.discounts.list.length) {
    sections.push({
      kind: 'table', title: `Discount (${d.discounts.bills} bill)`,
      columns: [{ label: 'Bill' }, { label: 'Kis ne', wideOnly: true }, { label: 'Code', wideOnly: true }, { label: 'Discount', align: 'right' }],
      rows: d.discounts.list.map((x) => [x.saleNumber, x.by ?? '', x.code ?? '', m.sales(x.discount)]),
      footer: ['Kul', '', '', m.sales(d.discounts.total)],
    });
  }
  if (d.lowStock.length) {
    sections.push({
      kind: 'table', title: 'Kam reh gaya maal',
      columns: [{ label: 'Cheez' }, { label: 'Branch', wideOnly: true }, { label: 'Baqi', align: 'right' }],
      rows: d.lowStock.map((l) => [l.name, l.shop, `${qty(l.stock)} ${l.unit}`]),
    });
  }
  if (d.branches.length > 1) {
    sections.push({
      kind: 'table', title: 'Branch war',
      columns: [{ label: 'Branch' }, { label: 'Bill', align: 'right' }, { label: 'Net bikri', align: 'right' }, { label: 'Kharcha', align: 'right', wideOnly: true }, { label: 'Farq', align: 'right', wideOnly: true }],
      rows: d.branches.map((b) => [b.name, String(b.bills), m.sales(b.net), m.cost(b.expenses), b.difference == null ? '—' : m.sales(b.difference)]),
    });
  }
  return { ...z, title: 'Din ki kitaab', sections };
}

/** Short text for WhatsApp or the clipboard. */
export function dayText(d: DayBook, m: Money, branch: string) {
  const s = d.summary;
  const lines = [
    `*Din ka hisaab — ${prettyDay(d.date)}*`, branch, '',
    `Net bikri: ${m.sales(s.net)} (${s.bills} bill)`,
    `Discount: ${m.sales(s.discount)} · Wapsi: ${m.sales(s.returns)}`,
    ...(m.costHidden ? [] : [`Munafa: ${m.cost(s.grossProfit)}`]),
    '', '*Paisa*',
    ...d.payments.map((p) => `${method(p.method)}: ${m.sales(p.total)}`),
    ...(d.khata.collected ? [`Khata wasooli: ${m.sales(d.khata.collected)}`] : []),
    ...(s.credit ? [`Udhaar diya: ${m.sales(s.credit)}`] : []),
    ...(d.drawer ? [
      '', '*Galla*',
      `Opening: ${m.sales(d.drawer.opening)}`,
      `Hona chahiye: ${m.sales(d.drawer.expected)}`,
      ...(d.drawer.counted != null ? [`Gina hua: ${m.sales(d.drawer.counted)} · Farq ${m.sales(d.drawer.difference)}`] : ['Register abhi khula hai']),
    ] : []),
    '', `Kharcha: ${m.cost(d.expenses.total)}`,
    ...(d.purchases.count ? [`Kharidari: ${m.cost(d.purchases.total)}`] : []),
  ];
  const top = d.items.filter((i) => i.qty > 0).slice(0, 10);
  if (top.length) lines.push('', '*Sab se zyada bika*', ...top.map((i) => `${qty(i.qty)} ${i.unit} ${i.name}`));
  return lines.join('\n');
}

/** Item-wise CSV of the day. */
export function itemsCsv(d: DayBook, branch: string, costHidden: boolean) {
  const head = ['Cheez', 'SKU', 'Category', 'Unit', 'Bika', 'Wapas', 'Net qty', 'Bill', 'Raqam', ...(costHidden ? [] : ['Lagat', 'Munafa'])];
  const rows = d.items.map((i) => [
    i.name, i.sku ?? '', i.category, i.unit, i.soldQty, i.returnedQty, i.qty, i.bills, i.revenue.toFixed(2),
    ...(costHidden ? [] : [(i.cost ?? 0).toFixed(2), (i.profit ?? 0).toFixed(2)]),
  ]);
  const csv = [[`Din ka hisaab — ${d.date}`], [branch], [''], head, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `din-ka-hisaab-${d.date}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
