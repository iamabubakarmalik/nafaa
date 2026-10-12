/**
 * Print and CSV for every report centre section. Each section becomes a
 * PrintDoc (A4, PDF or thermal through the shared print button); the CSV is
 * built from the same document, so both always match.
 */

import type { PrintDoc, PrintSection } from '@core/print';
import { PAYMENT_LABELS } from '@modules/dashboard/engine/useChartTheme';
import type { SectionData, SectionId } from './api';
import { WEEKDAYS, keyLabel, type Formatter } from './components/parts';
import { SOURCE_LABEL } from './components/SalesSection';

interface DocCtx { f: Formatter; title: string; period: string; shop: string }

const R = 'right' as const;
const pct = (n: number) => `${n.toFixed(1)}%`;

function table(title: string, head: Array<string | [string, 'r' | 'w' | 'rw']>, rows: string[][], footer?: string[]): PrintSection {
  return {
    kind: 'table', title,
    columns: head.map((h) => (typeof h === 'string' ? { label: h } : { label: h[0], ...(h[1].includes('r') && { align: R }), ...(h[1].includes('w') && { wideOnly: true }) })),
    rows, footer,
  };
}

/** A one-item list when shown, empty otherwise; used for cost columns and rows. */
function maybe<T>(show: boolean, v: T): T[] { return show ? [v] : []; }

function sectionsFor<K extends SectionId>(id: K, raw: SectionData[K], f: Formatter): { meta: Array<[string, string]>; sections: PrintSection[] } {
  const showCost = !f.costHidden;
  const m = f.money;
  const c = f.cost;
  switch (id) {
    case 'sales': {
      const d = raw as SectionData['sales'];
      const t = d.totals;
      const sc = showCost && t.profit != null;
      return {
        meta: [['Asal bikri', m(t.net)], ['Bill', String(t.bills)], ...maybe<[string, string]>(sc, ['Munafa', c(t.profit)])],
        sections: [
          { kind: 'rows', title: 'Khulasa', rows: [
            { label: 'Kul bikri', value: m(t.gross) }, { label: 'Maal wapas', value: m(t.refunds), sub: true },
            { label: 'Asal bikri', value: m(t.net), strong: true },
            ...maybe(sc, { label: 'Maal ki lagat', value: c(t.cost) }), ...maybe(sc, { label: 'Munafa', value: c(t.profit), strong: true }),
            { label: 'Haath me aaya', value: m(t.cashIn) }, { label: 'Udhaar', value: m(t.credit) }, { label: 'Discount', value: m(t.discount) },
            { label: 'Ausat bill', value: m(t.average) }, { label: 'Void bill', value: `${t.voidedBills} · ${m(t.voidedValue)}` },
          ] },
          table(d.grouping === 'month' ? 'Mahine war' : 'Din war', ['Tareekh', ['Bill', 'r'], ['Bikri', 'r'], ...maybe<[string, 'r']>(sc, ['Munafa', 'r'])],
            d.trend.filter((x) => x.bills).map((x) => [keyLabel(x.key), String(x.bills), m(x.net), ...maybe(sc, c(x.profit))])),
          table('Payment', ['Tareeqa', ['Bill', 'r'], ['Bikri', 'r'], ['Haath me', 'rw']], d.payments.map((p) => [PAYMENT_LABELS[p.method] ?? p.method, String(p.bills), m(p.net), m(p.cashIn)])),
          table('Staff', ['Naam', ['Bill', 'r'], ['Bikri', 'r'], ...maybe<[string, 'rw']>(sc, ['Munafa', 'rw'])], d.staff.map((s) => [s.name, String(s.bills), m(s.net), ...maybe(sc, c(s.profit))])),
          table('Kahan se', ['Channel', ['Bill', 'r'], ['Bikri', 'r']], d.channels.map((s) => [SOURCE_LABEL[s.source] ?? s.source, String(s.bills), m(s.net)])),
          ...(d.shops.length > 1 ? [table('Branch', ['Branch', ['Bill', 'r'], ['Bikri', 'r']], d.shops.map((s) => [s.name, String(s.bills), m(s.net)]))] : []),
          table('Hafte ke din', ['Din', ['Bill', 'r'], ['Bikri', 'r']], [1, 2, 3, 4, 5, 6, 0].map((i) => [WEEKDAYS[i], String(d.weekdays[i]?.bills ?? 0), m(d.weekdays[i]?.net ?? 0)])),
          table('Ghante', ['Ghanta', ['Bill', 'r'], ['Bikri', 'r']], d.hours.filter((h) => h.bills).map((h) => [`${h.hour}:00`, String(h.bills), m(h.net)])),
        ],
      };
    }
    case 'items': {
      const d = raw as SectionData['items'];
      const sc = showCost && d.totals.profit != null;
      return {
        meta: [['Cheezein biki', String(d.totals.products)], ['Bikri', m(d.totals.revenue)], ...maybe<[string, string]>(sc, ['Munafa', c(d.totals.profit)])],
        sections: [
          table('Sab se zyada bikri', ['#', 'Cheez', ['Miqdar', 'r'], ['Bikri', 'r'], ...maybe<[string, 'rw']>(sc, ['Munafa', 'rw'])],
            d.topRevenue.map((r, i) => [String(i + 1), r.name, `${f.qty(r.qty)} ${r.unit}`, m(r.revenue), ...maybe(sc, c(r.profit))])),
          ...(sc ? [table('Sab se zyada munafa', ['#', 'Cheez', ['Bikri', 'r'], ['Munafa', 'r'], ['Margin', 'rw']],
            d.topProfit.map((r, i) => [String(i + 1), r.name, m(r.revenue), c(r.profit), pct(r.margin ?? 0)]))] : []),
          table('Kam bikne wala maal', ['Cheez', ['Miqdar', 'r'], ['Bikri', 'r']], d.lowest.map((r) => [r.name, `${f.qty(r.qty)} ${r.unit}`, m(r.revenue)])),
          table('Category', ['Category', ['Cheezein', 'rw'], ['Bikri', 'r'], ...maybe<[string, 'rw']>(sc, ['Munafa', 'rw'])],
            d.categories.map((x) => [x.name, String(x.products), m(x.revenue), ...maybe(sc, c(x.profit))])),
          table('Brand', ['Brand', ['Cheezein', 'rw'], ['Bikri', 'r'], ...maybe<[string, 'rw']>(sc, ['Munafa', 'rw'])],
            d.brands.map((x) => [x.name, String(x.products), m(x.revenue), ...maybe(sc, c(x.profit))])),
          table('Ruka hua maal', ['Cheez', ['Stock', 'r'], ...maybe<[string, 'r']>(sc, ['Lagat', 'r']), ['Aakhri bar bika', 'rw']],
            d.slow.map((r) => [r.name, `${f.qty(r.stock)} ${r.unit}`, ...maybe(sc, c(r.stockValue)), r.lastSold ? f.date(r.lastSold) : 'Kabhi nahi'])),
        ],
      };
    }
    case 'customers': {
      const d = raw as SectionData['customers'];
      const t = d.totals;
      return {
        meta: [['Customers', String(t.customers)], ['Naye', String(t.newCount)], ['Baqi udhaar', m(t.outstanding)]],
        sections: [
          { kind: 'rows', title: 'Khulasa', rows: [
            { label: 'Naye customer', value: `${t.newCount} · ${m(t.newValue)}` }, { label: 'Purane customer', value: `${t.returning} · ${m(t.returningValue)}` },
            { label: 'Walk-in', value: `${t.walkInBills} bill · ${m(t.walkInValue)}` }, { label: 'Naye khate bane', value: String(t.signups) },
            { label: 'Udhaar diya', value: m(t.creditGiven) }, { label: 'Udhaar wapas mila', value: m(t.recovered) },
            { label: 'Kul baqi udhaar', value: `${m(t.outstanding)} · ${t.debtors} customer`, strong: true },
          ] },
          table('Udhaar kitna purana', ['Muddat', ['Customer', 'r'], ['Raqam', 'r']], d.aging.map((a) => [a.label, String(a.count), m(a.amount)])),
          table('Sab se bare customer', ['Customer', ['Phone', 'w'], ['Bill', 'r'], ['Bikri', 'r'], ['Baqi', 'rw']], d.top.map((x) => [x.name, x.phone ?? '', String(x.bills), m(x.net), m(x.balance)])),
          table('Sab se zyada udhaar', ['Customer', ['Phone', 'w'], ['Aakhri adaigi', 'w'], ['Baqi', 'r']], d.debtors.map((x) => [x.name, x.phone ?? '', x.lastPayment ? f.date(x.lastPayment) : 'Kabhi nahi', m(x.balance)])),
        ],
      };
    }
    case 'purchases': {
      const d = raw as SectionData['purchases'];
      const t = d.totals;
      return {
        meta: [['Maal aaya', m(t.value)], ['Diye', m(t.paid)], ['Dena hai (kul)', m(t.dueTotal)]],
        sections: [
          table('Suppliers', ['Supplier', ['Bill', 'r'], ['Maal', 'r'], ['Diye', 'rw']], d.suppliers.map((s) => [s.name, String(s.bills), m(s.value), m(s.paid)]), ['Kul', String(t.bills), m(t.value), m(t.paid)]),
          table('Khareeda maal', ['Cheez', ['Miqdar', 'r'], ['Bill', 'rw'], ['Raqam', 'r']], d.items.map((i) => [i.name, f.qty(i.qty), String(i.bills), m(i.value)])),
          table('Suppliers ko dena hai', ['Supplier', ['Phone', 'w'], ['Dena hai', 'r']], d.dues.map((s) => [s.name, s.phone ?? '', m(s.due)])),
          table(d.grouping === 'month' ? 'Mahine war' : 'Din war', ['Tareekh', ['Bill', 'r'], ['Maal', 'r'], ['Diye', 'r']], d.trend.filter((x) => x.bills).map((x) => [keyLabel(x.key), String(x.bills), m(x.value), m(x.paid)])),
        ],
      };
    }
    case 'expenses': {
      const d = raw as SectionData['expenses'];
      const t = d.totals;
      return {
        meta: [['Kul kharche', m(t.amount)], ['Ginti', String(t.count)], ['Bikri ka', pct(t.ofSales)]],
        sections: [
          table('Category', ['Category', ['Ginti', 'r'], ['Raqam', 'r'], ['Hissa', 'rw']], d.categories.map((x) => [x.name, String(x.count), m(x.amount), pct(x.share)]), ['Kul', String(t.count), m(t.amount), '']),
          table('Kaise diye', ['Tareeqa', ['Ginti', 'r'], ['Raqam', 'r']], d.methods.map((x) => [PAYMENT_LABELS[x.method] ?? x.method, String(x.count), m(x.amount)])),
          table('Sab se bare kharche', ['Tareekh', 'Kharcha', ['Category', 'w'], ['Raqam', 'r']], d.biggest.map((e) => [f.date(e.date), e.title, e.category ?? '', m(e.amount)])),
          table(d.grouping === 'month' ? 'Mahine war' : 'Din war', ['Tareekh', ['Ginti', 'r'], ['Raqam', 'r']], d.trend.filter((x) => x.count).map((x) => [keyLabel(x.key), String(x.count), m(x.amount)])),
        ],
      };
    }
    case 'profit': {
      const d = raw as SectionData['profit'];
      const t = d.totals;
      const sc = showCost && t.netProfit != null;
      return {
        meta: [['Asal bikri', m(t.sales)], ['Kharche', m(t.expenses)], ...maybe<[string, string]>(sc, ['Asal munafa', c(t.netProfit)])],
        sections: [
          { kind: 'rows', title: 'Nafa nuqsan', rows: [
            { label: 'Kul bikri', value: m(t.gross) }, { label: '− Maal wapas', value: m(t.refunds), sub: true }, { label: 'Asal bikri', value: m(t.sales), strong: true },
            ...maybe(sc, { label: '− Maal ki lagat', value: c(t.cost), sub: true }), ...maybe(sc, { label: 'Kachcha munafa', value: c(t.grossProfit), strong: true }),
            { label: '− Kharche', value: m(t.expenses), sub: true }, { label: '− Kharab maal', value: m(t.damage), sub: true },
            ...maybe(sc, { label: 'Asal munafa', value: c(t.netProfit), strong: true }),
          ] },
          table(d.grouping === 'month' ? 'Mahine war' : 'Din war',
            [d.grouping === 'month' ? 'Mahina' : 'Din', ['Bikri', 'r'], ...maybe<[string, 'rw']>(sc, ['Lagat', 'rw']), ['Kharche', 'r'], ...maybe<[string, 'r']>(sc, ['Munafa', 'r'])],
            d.rows.filter((r) => r.sales || r.expenses).map((r) => [keyLabel(r.key), m(r.sales), ...maybe(sc, c(r.cost)), m(r.expenses), ...maybe(sc, c(r.netProfit))])),
        ],
      };
    }
    case 'tax': {
      const d = raw as SectionData['tax'];
      const t = d.totals;
      return {
        meta: [['Tax', m(t.tax)], ['Tax wali bikri', m(t.taxedValue)], ['Bill', String(t.bills)]],
        sections: [
          table('Authority war', ['Authority', ['Bill', 'r'], ['Bikri', 'r'], ['Tax', 'r'], ['Atke', 'rw']], d.authorities.map((a) => [a.authority, String(a.bills), m(a.value), m(a.tax), String(a.failed + a.pending)])),
          table('Rate war', ['Rate', ['Bill', 'r'], ['Bikri', 'r'], ['Tax', 'r']], d.rates.map((r) => [`${r.rate}%`, String(r.bills), m(r.value), m(r.tax)])),
          { kind: 'rows', title: 'Discount aur charges', rows: [
            { label: 'Discount', value: m(t.discount) }, { label: 'Code se', value: m(t.codeDiscount), sub: true }, { label: 'Points se', value: m(t.loyaltyDiscount), sub: true },
            { label: 'Service charges', value: m(t.service) }, { label: 'Kul bikri', value: m(t.sales), strong: true },
          ] },
        ],
      };
    }
    case 'returns': {
      const d = raw as SectionData['returns'];
      const t = d.totals;
      return {
        meta: [['Maal wapas', m(t.amount)], ['Wapsi', String(t.count)], ['Void', `${t.voidedBills} · ${m(t.voidedValue)}`]],
        sections: [
          table('Wajah', ['Wajah', ['Dafa', 'r'], ['Raqam', 'r']], d.reasons.map((r) => [r.reason ?? 'Wajah nahi likhi', String(r.count), m(r.amount)])),
          table('Maal', ['Cheez', ['Miqdar', 'r'], ['Raqam', 'r']], d.products.map((p) => [p.name, `${f.qty(p.qty)} ${p.unit}`, m(p.amount)])),
          table('Paise kaise lautaye', ['Tareeqa', ['Ginti', 'r'], ['Raqam', 'r']], d.methods.map((x) => [PAYMENT_LABELS[x.method] ?? x.method, String(x.count), m(x.amount)])),
          table('Staff', ['Naam', ['Ginti', 'r'], ['Raqam', 'r']], d.staff.map((s) => [s.name, String(s.count), m(s.amount)])),
          table('Void bill', ['Bill', ['Tareekh', 'w'], ['Staff', 'w'], ['Raqam', 'r']], d.voided.map((v) => [v.saleNumber, f.date(v.soldAt), v.staff ?? '', m(v.total)])),
        ],
      };
    }
    default: {
      const d = raw as SectionData['industry'];
      return {
        meta: d.kpis.slice(0, 3).map((k) => [k.label, f.fmt(k.value, k.fmt)] as [string, string]),
        sections: [
          { kind: 'rows', title: 'Khulasa', rows: d.kpis.map((k) => ({ label: k.label, value: `${f.fmt(k.value, k.fmt)}${k.hint ? ` (${k.hint})` : ''}` })) },
          ...d.tables.map((tb) => table(tb.title, tb.columns.map((col, i) => (i === 0 || col.fmt === 'text' || col.fmt === 'date' ? col.label : [col.label, 'r'] as [string, 'r'])),
            tb.rows.map((row) => row.map((v, i) => f.fmt(v, tb.columns[i].fmt))))),
          ...d.notes.map((n) => ({ kind: 'text' as const, text: n })),
        ],
      };
    }
  }
}

export function sectionDoc<K extends SectionId>(id: K, data: SectionData[K], ctx: DocCtx): PrintDoc {
  const { meta, sections } = sectionsFor(id, data, ctx.f);
  return { title: ctx.title, subtitle: ctx.shop, meta: [['Muddat', ctx.period], ...meta], sections: sections.filter((s) => s.kind !== 'table' || s.rows.length) };
}

/** The same document as CSV: one block per section. */
export function downloadCsv(doc: PrintDoc, file: string) {
  const lines: string[][] = [[doc.title], ...(doc.subtitle ? [[doc.subtitle]] : []), ...(doc.meta ?? []).map(([k, v]) => [k, v])];
  for (const s of doc.sections) {
    lines.push([]);
    if (s.title) lines.push([s.title]);
    if (s.kind === 'rows') s.rows.forEach((r) => lines.push([r.label, r.value]));
    else if (s.kind === 'table') { lines.push(s.columns.map((col) => col.label)); s.rows.forEach((r) => lines.push(r)); if (s.footer) lines.push(s.footer); }
    else lines.push([s.text]);
  }
  const csv = lines.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
