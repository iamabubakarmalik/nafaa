/**
 * Day report as plain text (WhatsApp, clipboard) and as a PrintDoc for the
 * shared print module (A4 or thermal).
 * Amounts the viewer may not see are passed in already masked.
 */

import type { PrintDoc, PrintRow, PrintSection } from '@core/print';
import type { DayReport } from '../data/queries';
import { PAYMENT_LABELS } from '../engine/useChartTheme';

export interface ReportMoney {
  sales: (n: number) => string;
  cost: (n: number) => string;
}

const qty = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(2));

export const prettyDate = (key: string) =>
  new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${key}T12:00:00`));

/** "24 Cookies · 15 Tins" — quantity per category. */
export const categoryTotals = (r: DayReport) =>
  r.categories.filter((c) => c.qty > 0).map((c) => `${qty(c.qty)} ${c.name}`);

export function reportText(r: DayReport, money: ReportMoney, shopName?: string) {
  const lines: string[] = [];
  lines.push(`*Din ka hisaab — ${prettyDate(r.date)}*`);
  if (shopName) lines.push(shopName);
  lines.push('');
  lines.push(`Opening balance: ${money.sales(r.cash.opening)}`);
  lines.push(`Sales: ${money.sales(r.sales.total)} (${r.sales.bills} bill)`);
  r.priceTiers?.forEach((t) => lines.push(`  ${t.label}: ${money.sales(t.total)} (${t.bills} bill)`));
  lines.push('');
  lines.push('*Kya bika*');
  for (const c of r.categories) {
    lines.push(`_${c.name}_`);
    r.items.filter((i) => (i.categoryId ?? null) === c.id && i.qty > 0)
      .forEach((i) => lines.push(`${qty(i.qty)} ${i.name}`));
  }
  const totals = categoryTotals(r);
  if (totals.length) lines.push('', `*Kul:* ${totals.join(', ')}`);
  lines.push('');
  lines.push(`Cash: ${money.sales(r.cashCollected)}`);
  r.payments.filter((p) => p.method !== 'CASH' && p.collected > 0)
    .forEach((p) => lines.push(`${PAYMENT_LABELS[p.method] ?? p.method}: ${money.sales(p.collected)}`));
  if (r.onlineCollected > 0) lines.push(`Online kul: ${money.sales(r.onlineCollected)}`);
  if (r.sales.credit > 0) lines.push(`Udhaar: ${money.sales(r.sales.credit)}`);
  if (r.sales.refunds > 0) lines.push(`Return: ${money.sales(r.sales.refunds)}`);
  lines.push(`Expense: ${money.cost(r.expenses.total)}`);
  r.expenses.list.forEach((e) => lines.push(`  - ${e.title}: ${money.cost(e.amount)}`));
  lines.push('');
  lines.push(`Closing balance: ${money.sales(r.cash.countedClosing ?? r.cash.expectedClosing)}${r.cash.countedClosing == null ? ' (andaza)' : ''}`);
  if (r.cash.difference) lines.push(`Farq: ${money.sales(r.cash.difference)}`);
  return lines.join('\n');
}

/** The day report as a printable document (A4 or thermal). */
export function dayReportDoc(r: DayReport, money: ReportMoney, branch?: string): PrintDoc {
  const c = r.cash;
  const cashRows: PrintRow[] = [
    { label: 'Opening balance', value: money.sales(c.opening) },
    { label: '+ Cash sale', value: money.sales(c.cashSales) },
  ];
  if (c.cashIn) cashRows.push({ label: '+ Cash in', value: money.sales(c.cashIn) });
  if (c.expenses) cashRows.push({ label: '- Cash expense', value: money.cost(c.expenses) });
  if (c.refunds) cashRows.push({ label: '- Return', value: money.sales(c.refunds) });
  if (c.purchases) cashRows.push({ label: '- Maal ki payment', value: money.cost(c.purchases) });
  if (c.supplierPaid) cashRows.push({ label: '- Supplier ko diya', value: money.cost(c.supplierPaid) });
  if (c.cashOut) cashRows.push({ label: '- Cash out', value: money.sales(c.cashOut) });
  cashRows.push({ label: c.countedClosing == null ? 'Closing (andaza)' : 'Closing (gina hua)', value: money.sales(c.countedClosing ?? c.expectedClosing), strong: true });
  if (c.difference) cashRows.push({ label: 'Ginti me farq', value: money.sales(c.difference) });

  const salesRows: PrintRow[] = [
    ...r.payments.map((p) => ({ label: PAYMENT_LABELS[p.method] ?? p.method, value: money.sales(p.collected) })),
    { label: 'Cash', value: money.sales(r.cashCollected), sub: true },
    { label: 'Online', value: money.sales(r.onlineCollected), sub: true },
  ];
  if (r.sales.credit) salesRows.push({ label: 'Udhaar', value: money.sales(r.sales.credit) });
  if (r.sales.discount) salesRows.push({ label: 'Discount', value: money.sales(r.sales.discount) });
  if (r.sales.refunds) salesRows.push({ label: 'Return', value: money.sales(r.sales.refunds) });
  salesRows.push({ label: `Total sale (${r.sales.bills} bill)`, value: money.sales(r.sales.total), strong: true });
  r.priceTiers?.forEach((t) => salesRows.push({ label: `${t.label} (${t.bills} bill)`, value: money.sales(t.total), sub: true }));

  const itemRows: string[][] = [];
  const groupRows: number[] = [];
  for (const cat of r.categories) {
    groupRows.push(itemRows.length);
    itemRows.push([cat.name, qty(cat.qty), money.sales(cat.revenue)]);
    r.items.filter((i) => (i.categoryId ?? null) === cat.id && i.qty !== 0)
      .forEach((i) => itemRows.push([`  ${i.name}`, qty(i.qty), money.sales(i.revenue)]));
  }

  const sections: PrintSection[] = [
    { kind: 'rows', title: 'Galla (cash)', rows: cashRows },
    { kind: 'rows', title: 'Sale', rows: salesRows },
    {
      kind: 'table', title: 'Kya bika',
      columns: [{ label: 'Item' }, { label: 'Qty', align: 'right' }, { label: 'Amount', align: 'right' }],
      rows: itemRows, groupRows,
      footer: ['Kul', qty(r.sales.itemsSold), money.sales(r.items.reduce((x, i) => x + i.revenue, 0))],
    },
    {
      kind: 'rows', title: 'Expense',
      rows: [...r.expenses.list.map((e) => ({ label: e.title, value: money.cost(e.amount) })), { label: 'Kul expense', value: money.cost(r.expenses.total), strong: true }],
    },
  ];
  if (r.staff.length) {
    sections.push({ kind: 'rows', title: 'Staff', rows: r.staff.map((p) => ({ label: `${p.name} (${p.bills} bill)`, value: money.sales(p.total) })) });
  }
  const totals = categoryTotals(r);
  return {
    title: 'Din ka hisaab',
    subtitle: prettyDate(r.date),
    meta: [
      ...(branch ? [['Branch', branch] as [string, string]] : []),
      ['Bill', String(r.sales.bills)],
      ['Items', qty(r.sales.itemsSold)],
    ],
    sections: totals.length ? [{ kind: 'text', text: `Kul: ${totals.join(', ')}` }, ...sections] : sections,
    footer: r.isToday ? 'Din abhi jaari hai — aakhri hisaab register band hone par' : undefined,
  };
}
