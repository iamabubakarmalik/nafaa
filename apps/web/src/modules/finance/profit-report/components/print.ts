/**
 * Profit report print-out (A4, PDF or thermal through the shared print
 * button) and CSV export. Cost and profit columns are left out while cost
 * is hidden.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc, PrintSection } from '@core/print';
import type { ProfitItem, ProfitOverview } from '../api';
import { chargeSplit, qty } from './meta';

export function profitDoc(o: ProfitOverview, items: ProfitItem[], period: string, scope: string, showCost: boolean): PrintDoc {
  const t = o.totals;
  const n = o.net;
  const c = chargeSplit(t);
  const summary: PrintSection = {
    kind: 'rows',
    title: 'Khulasa',
    rows: [
      { label: 'List rate par sale', value: formatPKR(t.gross) },
      { label: 'Discount', value: `− ${formatPKR(t.discount)}`, sub: true },
      { label: 'Return', value: `− ${formatPKR(t.refund)}`, sub: true },
      ...(c.shown ? [{ label: c.bills ? `Service charges (${c.bills} bill)` : 'Service charges', value: `+ ${formatPKR(c.revenue)}`, sub: true }] : []),
      { label: 'Asal sale', value: formatPKR(t.revenue), strong: true },
      ...(showCost ? [
        { label: 'Maal ki cost', value: `− ${formatPKR(c.lineCost)}`, sub: true },
        ...(c.cost ? [{ label: 'Bill par alag cost (rider waghera)', value: `− ${formatPKR(c.cost)}`, sub: true }] : []),
        { label: `Bill ka profit (${(t.margin ?? 0).toFixed(1)}%)`, value: formatPKR(t.profit ?? 0), strong: true },
        ...(n.split ? [
          { label: 'Haath mein aaya profit', value: formatPKR(n.split.realised), sub: true },
          { label: 'Udhaar mein profit (abhi aana hai)', value: formatPKR(n.split.pending), sub: true },
        ] : []),
        { label: 'Expenses', value: `− ${formatPKR(n.expenses)}`, sub: true },
        { label: 'Stock nuksan', value: `− ${formatPKR(n.stockLoss ?? n.writeOffCost ?? 0)}`, sub: true },
        ...(n.stockGain ? [{ label: 'Stock faida', value: `+ ${formatPKR(n.stockGain)}`, sub: true }] : []),
        ...(n.otherIncome ? [{ label: 'Doosri aamdani', value: `+ ${formatPKR(n.otherIncome)}`, sub: true }] : []),
        { label: 'Net profit', value: formatPKR(n.netProfit ?? 0), strong: true },
      ] : []),
    ],
  };
  const cats: PrintSection = {
    kind: 'table',
    title: 'Category war',
    columns: [{ label: 'Category' }, { label: 'Sale', align: 'right' }, ...(showCost ? [{ label: 'Profit', align: 'right' as const }, { label: 'Margin', align: 'right' as const, wideOnly: true }] : [])],
    rows: o.byCategory.map((c) => [c.name, formatPKR(c.revenue), ...(showCost ? [formatPKR(c.profit ?? 0), `${(c.margin ?? 0).toFixed(1)}%`] : [])]),
  };
  const table: PrintSection = {
    kind: 'table',
    title: 'Cheez war',
    columns: [
      { label: '#', wideOnly: true }, { label: 'Cheez' }, { label: 'Biki', align: 'right', wideOnly: true }, { label: 'Sale', align: 'right' },
      ...(showCost ? [{ label: 'Cost', align: 'right' as const, wideOnly: true }, { label: 'Profit', align: 'right' as const }, { label: 'Margin', align: 'right' as const, wideOnly: true }] : []),
    ],
    rows: items.map((r, i) => [
      String(i + 1), r.name, `${qty(r.qty)} ${r.unit}`, formatPKR(r.revenue),
      ...(showCost ? [formatPKR(r.cost ?? 0), formatPKR(r.profit ?? 0), `${(r.margin ?? 0).toFixed(1)}%`] : []),
    ]).concat(c.shown ? [[
      '', 'Service charges (bill par)', '', formatPKR(c.revenue),
      ...(showCost ? [formatPKR(c.cost), formatPKR(c.profit), c.revenue > 0 ? `${((c.profit / c.revenue) * 100).toFixed(1)}%` : ''] : []),
    ]] : []),
    footer: ['', 'Kul', '', formatPKR(t.revenue), ...(showCost ? [formatPKR(t.cost ?? 0), formatPKR(t.profit ?? 0), `${(t.margin ?? 0).toFixed(1)}%`] : [])],
  };
  const fallback = showCost && o.costBasis && o.costBasis.fallbackLines + o.costBasis.noCostLines > 0
    ? `${o.costBasis.fallbackLines} lines par bill ki cost nahi thi, aaj ki cost lagayi. ${o.costBasis.noCostLines} lines ki cost hi nahi bhari.`
    : undefined;
  return {
    title: 'Profit report',
    subtitle: period,
    meta: [['Dukaan', scope], ['Bill', String(t.bills)], ['Cheezein', String(t.products)]],
    sections: [summary, cats, table],
    footer: [items.length < t.products ? `Pehli ${items.length} cheezein (kul ${t.products}).` : '', fallback].filter(Boolean).join(' ') || undefined,
  };
}

export function profitCsv(items: ProfitItem[], header: string[], showCost: boolean) {
  const head = ['Cheez', 'Variant', 'SKU', 'Category', 'Brand', 'Supplier', 'Unit', 'Biki', 'Wapas', 'Bill', 'List rate sale', 'Discount', 'Return amount', 'Asal sale',
    ...(showCost ? ['Cost', 'Profit', 'Margin %', 'Pichhla profit', 'Cost kahan se'] : [])];
  const rows: Array<Array<string | number>> = [];
  for (const r of items) {
    const base = [r.sku ?? '', r.category?.name ?? '', r.brand?.name ?? '', r.supplier?.name ?? '', r.unit];
    rows.push([r.name, '', ...base, r.qty, r.returnedQty, r.bills, r.gross, r.discount, r.refund, r.revenue,
      ...(showCost ? [r.cost ?? 0, r.profit ?? 0, (r.margin ?? 0).toFixed(1), r.prevProfit ?? 0,
        (r.noCostLines ?? 0) > 0 ? 'Cost nahi bhari' : r.fallbackLines > 0 ? 'Kuch lines aaj ki cost' : 'Bill ki cost'] : [])]);
    if (r.variants.length > 1) {
      for (const v of r.variants) {
        rows.push([r.name, v.name, ...base, v.qty, v.returnedQty, v.bills, v.gross, v.discount, v.refund, v.revenue,
          ...(showCost ? [v.cost ?? 0, v.profit ?? 0, (v.margin ?? 0).toFixed(1), '', ''] : [])]);
      }
    }
  }
  const csv = [...header.map((h) => [h]), [''], head, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `profit-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
