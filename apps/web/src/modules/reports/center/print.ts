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
import { t as tr } from '@core/i18n';

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
        meta: [[tr('Asal sale'), m(t.net)], [tr('Bill'), String(t.bills)], ...maybe<[string, string]>(sc, [tr('Profit'), c(t.profit)])],
        sections: [
          { kind: 'rows', title: tr('Khulasa'), rows: [
            { label: tr('Total sale'), value: m(t.gross) }, { label: tr('Maal wapas'), value: m(t.refunds), sub: true },
            { label: tr('Asal sale'), value: m(t.net), strong: true },
            ...maybe(sc, { label: tr('Maal ki cost'), value: c(t.cost) }), ...maybe(sc, { label: tr('Profit'), value: c(t.profit), strong: true }),
            { label: tr('Haath me aaya'), value: m(t.cashIn) }, { label: tr('Udhaar'), value: m(t.credit) }, { label: tr('Discount'), value: m(t.discount) },
            { label: tr('Ausat bill'), value: m(t.average) }, { label: tr('Void bill'), value: `${t.voidedBills} · ${m(t.voidedValue)}` },
          ] },
          table(d.grouping === 'month' ? tr('Mahine war') : tr('Din war'), [tr('Date'), [tr('Bill'), 'r'], [tr('Sale'), 'r'], ...maybe<[string, 'r']>(sc, [tr('Profit'), 'r'])],
            d.trend.filter((x) => x.bills).map((x) => [keyLabel(x.key), String(x.bills), m(x.net), ...maybe(sc, c(x.profit))])),
          table(tr('Payment'), [tr('Tareeqa'), [tr('Bill'), 'r'], [tr('Sale'), 'r'], [tr('Haath me'), 'rw']], d.payments.map((p) => [PAYMENT_LABELS[p.method] ?? p.method, String(p.bills), m(p.net), m(p.cashIn)])),
          table(tr('Staff'), [tr('Naam'), [tr('Bill'), 'r'], [tr('Sale'), 'r'], ...maybe<[string, 'rw']>(sc, [tr('Profit'), 'rw'])], d.staff.map((s) => [s.name, String(s.bills), m(s.net), ...maybe(sc, c(s.profit))])),
          table(tr('Kahan se'), [tr('Channel'), [tr('Bill'), 'r'], [tr('Sale'), 'r']], d.channels.map((s) => [SOURCE_LABEL[s.source] ?? s.source, String(s.bills), m(s.net)])),
          ...(d.shops.length > 1 ? [table(tr('Branch'), [tr('Branch'), [tr('Bill'), 'r'], [tr('Sale'), 'r']], d.shops.map((s) => [s.name, String(s.bills), m(s.net)]))] : []),
          table(tr('Hafte ke din'), [tr('Din'), [tr('Bill'), 'r'], [tr('Sale'), 'r']], [1, 2, 3, 4, 5, 6, 0].map((i) => [WEEKDAYS[i], String(d.weekdays[i]?.bills ?? 0), m(d.weekdays[i]?.net ?? 0)])),
          table(tr('Ghante'), [tr('Ghanta'), [tr('Bill'), 'r'], [tr('Sale'), 'r']], d.hours.filter((h) => h.bills).map((h) => [`${h.hour}:00`, String(h.bills), m(h.net)])),
        ],
      };
    }
    case 'items': {
      const d = raw as SectionData['items'];
      const sc = showCost && d.totals.profit != null;
      return {
        meta: [[tr('Cheezein biki'), String(d.totals.products)], [tr('Sale'), m(d.totals.revenue)], ...maybe<[string, string]>(sc, [tr('Profit'), c(d.totals.profit)])],
        sections: [
          table(tr('Sab se zyada sale'), ['#', tr('Cheez'), [tr('Quantity'), 'r'], [tr('Sale'), 'r'], ...maybe<[string, 'rw']>(sc, [tr('Profit'), 'rw'])],
            d.topRevenue.map((r, i) => [String(i + 1), r.name, `${f.qty(r.qty)} ${r.unit}`, m(r.revenue), ...maybe(sc, c(r.profit))])),
          ...(sc ? [table(tr('Sab se zyada profit'), ['#', tr('Cheez'), [tr('Sale'), 'r'], [tr('Profit'), 'r'], [tr('Margin'), 'rw']],
            d.topProfit.map((r, i) => [String(i + 1), r.name, m(r.revenue), c(r.profit), pct(r.margin ?? 0)]))] : []),
          table(tr('Kam bikne wala maal'), [tr('Cheez'), [tr('Quantity'), 'r'], [tr('Sale'), 'r']], d.lowest.map((r) => [r.name, `${f.qty(r.qty)} ${r.unit}`, m(r.revenue)])),
          table(tr('Category'), [tr('Category'), [tr('Cheezein'), 'rw'], [tr('Sale'), 'r'], ...maybe<[string, 'rw']>(sc, [tr('Profit'), 'rw'])],
            d.categories.map((x) => [x.name, String(x.products), m(x.revenue), ...maybe(sc, c(x.profit))])),
          table(tr('Brand'), [tr('Brand'), [tr('Cheezein'), 'rw'], [tr('Sale'), 'r'], ...maybe<[string, 'rw']>(sc, [tr('Profit'), 'rw'])],
            d.brands.map((x) => [x.name, String(x.products), m(x.revenue), ...maybe(sc, c(x.profit))])),
          table(tr('Ruka hua maal'), [tr('Cheez'), [tr('Stock'), 'r'], ...maybe<[string, 'r']>(sc, [tr('Cost'), 'r']), [tr('Aakhri bar bika'), 'rw']],
            d.slow.map((r) => [r.name, `${f.qty(r.stock)} ${r.unit}`, ...maybe(sc, c(r.stockValue)), r.lastSold ? f.date(r.lastSold) : tr('Kabhi nahi')])),
        ],
      };
    }
    case 'customers': {
      const d = raw as SectionData['customers'];
      const t = d.totals;
      return {
        meta: [[tr('Customers'), String(t.customers)], [tr('Naye'), String(t.newCount)], [tr('Baqi udhaar'), m(t.outstanding)]],
        sections: [
          { kind: 'rows', title: tr('Khulasa'), rows: [
            { label: tr('Naye customer'), value: `${t.newCount} · ${m(t.newValue)}` }, { label: tr('Purane customer'), value: `${t.returning} · ${m(t.returningValue)}` },
            { label: tr('Walk-in'), value: `${t.walkInBills} bill · ${m(t.walkInValue)}` }, { label: tr('Naye khate bane'), value: String(t.signups) },
            { label: tr('Udhaar diya'), value: m(t.creditGiven) }, { label: tr('Udhaar wapas mila'), value: m(t.recovered) },
            { label: tr('Kul baqi udhaar'), value: `${m(t.outstanding)} · ${t.debtors} customer`, strong: true },
          ] },
          table(tr('Udhaar kitna purana'), [tr('Period'), [tr('Customer'), 'r'], [tr('Amount'), 'r']], d.aging.map((a) => [a.label, String(a.count), m(a.amount)])),
          table(tr('Sab se bare customer'), [tr('Customer'), [tr('Phone'), 'w'], [tr('Bill'), 'r'], [tr('Sale'), 'r'], [tr('Baqi'), 'rw']], d.top.map((x) => [x.name, x.phone ?? '', String(x.bills), m(x.net), m(x.balance)])),
          table(tr('Sab se zyada udhaar'), [tr('Customer'), [tr('Phone'), 'w'], [tr('Aakhri payment'), 'w'], [tr('Baqi'), 'r']], d.debtors.map((x) => [x.name, x.phone ?? '', x.lastPayment ? f.date(x.lastPayment) : tr('Kabhi nahi'), m(x.balance)])),
        ],
      };
    }
    case 'purchases': {
      const d = raw as SectionData['purchases'];
      const t = d.totals;
      return {
        meta: [[tr('Maal aaya'), m(t.value)], [tr('Diye'), m(t.paid)], [tr('Dena hai (kul)'), m(t.dueTotal)]],
        sections: [
          table(tr('Suppliers'), [tr('Supplier'), [tr('Bill'), 'r'], [tr('Maal'), 'r'], [tr('Diye'), 'rw']], d.suppliers.map((s) => [s.name, String(s.bills), m(s.value), m(s.paid)]), [tr('Kul'), String(t.bills), m(t.value), m(t.paid)]),
          table(tr('Khareeda maal'), [tr('Cheez'), [tr('Quantity'), 'r'], [tr('Bill'), 'rw'], [tr('Amount'), 'r']], d.items.map((i) => [i.name, f.qty(i.qty), String(i.bills), m(i.value)])),
          table(tr('Suppliers ko dena hai'), [tr('Supplier'), [tr('Phone'), 'w'], [tr('Dena hai'), 'r']], d.dues.map((s) => [s.name, s.phone ?? '', m(s.due)])),
          table(d.grouping === 'month' ? tr('Mahine war') : tr('Din war'), [tr('Date'), [tr('Bill'), 'r'], [tr('Maal'), 'r'], [tr('Diye'), 'r']], d.trend.filter((x) => x.bills).map((x) => [keyLabel(x.key), String(x.bills), m(x.value), m(x.paid)])),
        ],
      };
    }
    case 'expenses': {
      const d = raw as SectionData['expenses'];
      const t = d.totals;
      return {
        meta: [[tr('Total expenses'), m(t.amount)], [tr('Ginti'), String(t.count)], [tr('Sale ka'), pct(t.ofSales)]],
        sections: [
          table(tr('Category'), [tr('Category'), [tr('Ginti'), 'r'], [tr('Amount'), 'r'], [tr('Hissa'), 'rw']], d.categories.map((x) => [x.name, String(x.count), m(x.amount), pct(x.share)]), [tr('Kul'), String(t.count), m(t.amount), '']),
          table(tr('Kaise diye'), [tr('Tareeqa'), [tr('Ginti'), 'r'], [tr('Amount'), 'r']], d.methods.map((x) => [PAYMENT_LABELS[x.method] ?? x.method, String(x.count), m(x.amount)])),
          table(tr('Sab se bare expenses'), [tr('Date'), tr('Expense'), [tr('Category'), 'w'], [tr('Amount'), 'r']], d.biggest.map((e) => [f.date(e.date), e.title, e.category ?? '', m(e.amount)])),
          table(d.grouping === 'month' ? tr('Mahine war') : tr('Din war'), [tr('Date'), [tr('Ginti'), 'r'], [tr('Amount'), 'r']], d.trend.filter((x) => x.count).map((x) => [keyLabel(x.key), String(x.count), m(x.amount)])),
        ],
      };
    }
    case 'profit': {
      const d = raw as SectionData['profit'];
      const t = d.totals;
      const sc = showCost && t.netProfit != null;
      return {
        meta: [[tr('Asal sale'), m(t.sales)], [tr('Expenses'), m(t.expenses)], ...maybe<[string, string]>(sc, [tr('Net profit'), c(t.netProfit)])],
        sections: [
          { kind: 'rows', title: tr('Profit-loss'), rows: [
            { label: tr('Total sale'), value: m(t.gross) }, ...maybe(!!t.service, { label: tr('Is me service charges'), value: m(t.service), sub: true }), { label: tr('− Maal wapas'), value: m(t.refunds), sub: true }, { label: tr('Asal sale'), value: m(t.sales), strong: true },
            ...maybe(sc, { label: tr('− Maal ki cost'), value: c(t.cost), sub: true }), ...maybe(sc, { label: tr('Bill ka profit'), value: c(t.billProfit ?? t.grossProfit), strong: true }),
            ...maybe(sc && !!t.split, { label: tr('Haath mein aaya profit'), value: c(t.split?.realised), sub: true }),
            ...maybe(sc && !!t.split, { label: tr('Udhaar mein profit (abhi aana hai)'), value: c(t.split?.pending), sub: true }),
            ...maybe(sc && !!t.split?.fromOlderBills, { label: tr('Is me pehle ke udhaar se aaya'), value: c(t.split?.fromOlderBills), sub: true }),
            ...maybe(sc && t.split?.basis === 'PAID', { label: tr('Headline profit (paisa milne par)'), value: c(t.grossProfit), strong: true }),
            { label: tr('− Expenses'), value: m(t.expenses), sub: true },
            ...maybe(sc, { label: tr('− Stock nuksan'), value: c(t.stockLoss ?? t.damage), sub: true }),
            ...maybe(sc && !!t.stockGain, { label: tr('+ Stock faida'), value: c(t.stockGain), sub: true }),
            ...maybe(!!t.otherIncome, { label: tr('+ Doosri aamdani'), value: m(t.otherIncome ?? 0), sub: true }),
            ...maybe(sc, { label: tr('Net profit'), value: c(t.netProfit), strong: true }),
          ] },
          table(d.grouping === 'month' ? tr('Mahine war') : tr('Din war'),
            [d.grouping === 'month' ? tr('Mahina') : tr('Din'), [tr('Sale'), 'r'], ...maybe<[string, 'rw']>(sc, [tr('Cost'), 'rw']), [tr('Expenses'), 'r'], ...maybe<[string, 'r']>(sc, [tr('Profit'), 'r'])],
            d.rows.filter((r) => r.sales || r.expenses).map((r) => [keyLabel(r.key), m(r.sales), ...maybe(sc, c(r.cost)), m(r.expenses), ...maybe(sc, c(r.netProfit))])),
        ],
      };
    }
    case 'tax': {
      const d = raw as SectionData['tax'];
      const t = d.totals;
      return {
        meta: [[tr('Tax'), m(t.tax)], [tr('Tax wali sale'), m(t.taxedValue)], [tr('Bill'), String(t.bills)]],
        sections: [
          table(tr('Authority war'), [tr('Authority'), [tr('Bill'), 'r'], [tr('Sale'), 'r'], [tr('Tax'), 'r'], [tr('Atke'), 'rw']], d.authorities.map((a) => [a.authority, String(a.bills), m(a.value), m(a.tax), String(a.failed + a.pending)])),
          table(tr('Rate war'), [tr('Rate'), [tr('Bill'), 'r'], [tr('Sale'), 'r'], [tr('Tax'), 'r']], d.rates.map((r) => [`${r.rate}%`, String(r.bills), m(r.value), m(r.tax)])),
          { kind: 'rows', title: tr('Discount aur charges'), rows: [
            { label: tr('Discount'), value: m(t.discount) }, { label: tr('Code se'), value: m(t.codeDiscount), sub: true }, { label: tr('Points se'), value: m(t.loyaltyDiscount), sub: true },
            { label: tr('Service charges'), value: m(t.service) }, { label: tr('Total sale'), value: m(t.sales), strong: true },
          ] },
        ],
      };
    }
    case 'returns': {
      const d = raw as SectionData['returns'];
      const t = d.totals;
      return {
        meta: [[tr('Maal wapas'), m(t.amount)], [tr('Return'), String(t.count)], [tr('Void'), `${t.voidedBills} · ${m(t.voidedValue)}`]],
        sections: [
          table(tr('Wajah'), [tr('Wajah'), [tr('Dafa'), 'r'], [tr('Amount'), 'r']], d.reasons.map((r) => [r.reason ?? tr('Wajah nahi likhi'), String(r.count), m(r.amount)])),
          table(tr('Maal'), [tr('Cheez'), [tr('Quantity'), 'r'], [tr('Amount'), 'r']], d.products.map((p) => [p.name, `${f.qty(p.qty)} ${p.unit}`, m(p.amount)])),
          table(tr('Paise kaise lautaye'), [tr('Tareeqa'), [tr('Ginti'), 'r'], [tr('Amount'), 'r']], d.methods.map((x) => [PAYMENT_LABELS[x.method] ?? x.method, String(x.count), m(x.amount)])),
          table(tr('Staff'), [tr('Naam'), [tr('Ginti'), 'r'], [tr('Amount'), 'r']], d.staff.map((s) => [s.name, String(s.count), m(s.amount)])),
          table(tr('Void bill'), [tr('Bill'), [tr('Date'), 'w'], [tr('Staff'), 'w'], [tr('Amount'), 'r']], d.voided.map((v) => [v.saleNumber, f.date(v.soldAt), v.staff ?? '', m(v.total)])),
        ],
      };
    }
    default: {
      const d = raw as SectionData['industry'];
      return {
        meta: d.kpis.slice(0, 3).map((k) => [k.label, f.fmt(k.value, k.fmt)] as [string, string]),
        sections: [
          { kind: 'rows', title: tr('Khulasa'), rows: d.kpis.map((k) => ({ label: k.label, value: `${f.fmt(k.value, k.fmt)}${k.hint ? ` (${k.hint})` : ''}` })) },
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
  return { title: ctx.title, subtitle: ctx.shop, meta: [[tr('Period'), ctx.period], ...meta], sections: sections.filter((s) => s.kind !== 'table' || s.rows.length) };
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
