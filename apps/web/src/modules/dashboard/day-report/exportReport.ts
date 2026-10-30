/**
 * Day report as plain text (WhatsApp, clipboard) and as a PrintDoc for the
 * shared print module (A4 or thermal).
 * Amounts the viewer may not see are passed in already masked.
 */

import type { PrintDoc, PrintRow, PrintSection } from '@core/print';
import type { DayReport } from '../data/queries';
import { PAYMENT_LABELS } from '../engine/useChartTheme';
import { t as tr } from '@core/i18n';

export interface ReportMoney {
  sales: (n: number) => string;
  cost: (n: number) => string;
}

const qty = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(2));

/**
 * The day's profit lines (shared rules, as on the dashboard): headline gross
 * profit, the khata split, expenses, stock loss and gain, other income, net.
 * Empty when the viewer may not see profit (the API leaves the fields out).
 */
export function dayProfitRows(r: DayReport, money: ReportMoney): PrintRow[] {
  const p = r.profit;
  if (!p?.split || p.netProfit == null) return [];
  const s = p.split;
  const rows: PrintRow[] = [
    { label: s.basis === 'PAID' ? tr('Haath mein aaya profit') : tr('Bill ka profit'), value: money.cost(s.headline) },
  ];
  if (Math.abs(s.pending) > 0.5 || Math.abs(s.fromOlderBills) > 0.5) {
    rows.push({ label: tr('Bill ka profit'), value: money.cost(s.billProfit), sub: true });
    rows.push({ label: tr('Haath mein aaya'), value: money.cost(s.realised), sub: true });
    rows.push({ label: tr('Udhaar mein (abhi aana hai)'), value: money.cost(s.pending), sub: true });
    if (Math.abs(s.fromOlderBills) > 0.5) rows.push({ label: tr('Pehle ke udhaar se aaya'), value: money.cost(s.fromOlderBills), sub: true });
  }
  rows.push({ label: tr('- Expense'), value: money.cost(p.expenses) });
  if (p.stockLoss) rows.push({ label: tr('- Stock nuksan'), value: money.cost(p.stockLoss) });
  if (p.stockGain) rows.push({ label: tr('+ Stock faida'), value: money.cost(p.stockGain) });
  if (p.otherIncome) rows.push({ label: tr('+ Doosri aamdani'), value: money.cost(p.otherIncome) });
  rows.push({ label: tr('= Net profit'), value: money.cost(p.netProfit), strong: true });
  return rows;
}

export const prettyDate = (key: string) =>
  new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${key}T12:00:00`));

/** "24 Cookies · 15 Tins" — quantity per category. */
export const categoryTotals = (r: DayReport) =>
  r.categories.filter((c) => c.qty > 0).map((c) => `${qty(c.qty)} ${c.name}`);

export function reportText(r: DayReport, money: ReportMoney, shopName?: string) {
  const lines: string[] = [];
  lines.push(tr('*Din ka hisaab — {{date}}*', { date: prettyDate(r.date) }));
  if (shopName) lines.push(shopName);
  lines.push('');
  lines.push(tr('Opening balance: {{opening}}', { opening: money.sales(r.cash.opening) }));
  lines.push(tr('Sales: {{total}} ({{bills}} bill)', { total: money.sales(r.sales.total), bills: r.sales.bills }));
  r.priceTiers?.forEach((t) => lines.push(`  ${t.label}: ${money.sales(t.total)} (${t.bills} bill)`));
  lines.push('');
  lines.push(tr('*Kya bika*'));
  for (const c of r.categories) {
    lines.push(`_${c.name}_`);
    r.items.filter((i) => (i.categoryId ?? null) === c.id && i.qty > 0)
      .forEach((i) => lines.push(`${qty(i.qty)} ${i.name}`));
  }
  const totals = categoryTotals(r);
  if (totals.length) lines.push('', tr('*Kul:* {{value}}', { value: totals.join(', ') }));
  lines.push('');
  lines.push(tr('Cash: {{cashCollected}}', { cashCollected: money.sales(r.cashCollected) }));
  r.payments.filter((p) => p.method !== 'CASH' && p.collected > 0)
    .forEach((p) => lines.push(`${PAYMENT_LABELS[p.method] ?? p.method}: ${money.sales(p.collected)}`));
  if (r.onlineCollected > 0) lines.push(tr('Online kul: {{onlineCollected}}', { onlineCollected: money.sales(r.onlineCollected) }));
  if (r.sales.credit > 0) lines.push(tr('Udhaar: {{credit}}', { credit: money.sales(r.sales.credit) }));
  if (r.sales.refunds > 0) lines.push(tr('Return: {{refunds}}', { refunds: money.sales(r.sales.refunds) }));
  lines.push(tr('Expense: {{total}}', { total: money.cost(r.expenses.total) }));
  r.expenses.list.forEach((e) => lines.push(`  - ${e.title}: ${money.cost(e.amount)}`));
  const profit = dayProfitRows(r, money);
  if (profit.length) {
    lines.push('', '*Profit*');
    profit.forEach((x) => lines.push(`${x.sub ? '  ' : ''}${x.label}: ${x.value}`));
  }
  lines.push('');
  lines.push(tr('Closing balance: {{value}}{{value2}}', { value: money.sales(r.cash.countedClosing ?? r.cash.expectedClosing), value2: r.cash.countedClosing == null ? tr(' (andaza)') : '' }));
  if (r.cash.difference) lines.push(tr('Farq: {{difference}}', { difference: money.sales(r.cash.difference) }));
  return lines.join('\n');
}

/** The day report as a printable document (A4 or thermal). */
export function dayReportDoc(r: DayReport, money: ReportMoney, branch?: string): PrintDoc {
  const c = r.cash;
  const cashRows: PrintRow[] = [
    { label: tr('Opening balance'), value: money.sales(c.opening) },
    { label: tr('+ Cash sale'), value: money.sales(c.cashSales) },
  ];
  if (c.khataCollected) cashRows.push({ label: tr('+ Udhaar wapas aaya (cash)'), value: money.sales(c.khataCollected) });
  if (c.otherIncome) cashRows.push({ label: tr('+ Doosri aamdani'), value: money.sales(c.otherIncome) });
  if (c.cashIn) cashRows.push({ label: tr('+ Cash in'), value: money.sales(c.cashIn) });
  if (c.expenses) cashRows.push({ label: tr('- Cash expense'), value: money.cost(c.expenses) });
  if (c.refunds) cashRows.push({ label: tr('- Return'), value: money.sales(c.refunds) });
  if (c.purchases) cashRows.push({ label: tr('- Maal ki payment'), value: money.cost(c.purchases) });
  if (c.supplierPaid) cashRows.push({ label: tr('- Supplier ko diya'), value: money.cost(c.supplierPaid) });
  if (c.cashOut) cashRows.push({ label: tr('- Cash out'), value: money.sales(c.cashOut) });
  cashRows.push({ label: c.countedClosing == null ? tr('Closing (andaza)') : tr('Closing (gina hua)'), value: money.sales(c.countedClosing ?? c.expectedClosing), strong: true });
  if (c.difference) cashRows.push({ label: tr('Ginti me farq'), value: money.sales(c.difference) });

  const salesRows: PrintRow[] = [
    ...r.payments.map((p) => ({ label: PAYMENT_LABELS[p.method] ?? p.method, value: money.sales(p.collected) })),
    { label: tr('Cash'), value: money.sales(r.cashCollected), sub: true },
    { label: tr('Online'), value: money.sales(r.onlineCollected), sub: true },
  ];
  if (r.sales.credit) salesRows.push({ label: tr('Udhaar'), value: money.sales(r.sales.credit) });
  if (r.sales.discount) salesRows.push({ label: tr('Discount'), value: money.sales(r.sales.discount) });
  if (r.sales.refunds) salesRows.push({ label: tr('Return'), value: money.sales(r.sales.refunds) });
  salesRows.push({ label: tr('Total sale ({{bills}} bill)', { bills: r.sales.bills }), value: money.sales(r.sales.total), strong: true });
  r.priceTiers?.forEach((t) => salesRows.push({ label: tr('{{label}} ({{bills}} bill)', { label: t.label, bills: t.bills }), value: money.sales(t.total), sub: true }));

  const itemRows: string[][] = [];
  const groupRows: number[] = [];
  for (const cat of r.categories) {
    groupRows.push(itemRows.length);
    itemRows.push([cat.name, qty(cat.qty), money.sales(cat.revenue)]);
    r.items.filter((i) => (i.categoryId ?? null) === cat.id && i.qty !== 0)
      .forEach((i) => itemRows.push([`  ${i.name}`, qty(i.qty), money.sales(i.revenue)]));
  }

  const sections: PrintSection[] = [
    { kind: 'rows', title: tr('Galla (cash)'), rows: cashRows },
    { kind: 'rows', title: tr('Sale'), rows: salesRows },
    {
      kind: 'table', title: tr('Kya bika'),
      columns: [{ label: tr('Item') }, { label: tr('Qty'), align: 'right' }, { label: tr('Amount'), align: 'right' }],
      rows: itemRows, groupRows,
      footer: [tr('Kul'), qty(r.sales.itemsSold), money.sales(r.items.reduce((x, i) => x + i.revenue, 0))],
    },
    {
      kind: 'rows', title: tr('Expense'),
      rows: [...r.expenses.list.map((e) => ({ label: e.title, value: money.cost(e.amount) })), { label: tr('Kul expense'), value: money.cost(r.expenses.total), strong: true }],
    },
  ];
  const profit = dayProfitRows(r, money);
  if (profit.length) sections.push({ kind: 'rows', title: tr('Profit'), rows: profit });
  if (r.staff.length) {
    sections.push({ kind: 'rows', title: tr('Staff'), rows: r.staff.map((p) => ({ label: tr('{{name}} ({{bills}} bill)', { name: p.name, bills: p.bills }), value: money.sales(p.total) })) });
  }
  const totals = categoryTotals(r);
  return {
    title: tr('Din ka hisaab'),
    subtitle: prettyDate(r.date),
    meta: [
      ...(branch ? [[tr('Branch'), branch] as [string, string]] : []),
      [tr('Bill'), String(r.sales.bills)],
      [tr('Items'), qty(r.sales.itemsSold)],
    ],
    sections: totals.length ? [{ kind: 'text', text: tr('Kul: {{value}}', { value: totals.join(', ') }) }, ...sections] : sections,
    footer: r.isToday ? tr('Din abhi jaari hai — aakhri hisaab register band hone par') : undefined,
  };
}
