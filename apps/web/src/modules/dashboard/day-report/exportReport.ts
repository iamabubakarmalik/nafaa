/**
 * Day report as plain text (WhatsApp, clipboard) and as a printable page.
 * Amounts the viewer may not see are passed in already masked.
 */

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
  if (r.sales.refunds > 0) lines.push(`Wapsi: ${money.sales(r.sales.refunds)}`);
  lines.push(`Kharcha: ${money.cost(r.expenses.total)}`);
  r.expenses.list.forEach((e) => lines.push(`  - ${e.title}: ${money.cost(e.amount)}`));
  lines.push('');
  lines.push(`Closing balance: ${money.sales(r.cash.countedClosing ?? r.cash.expectedClosing)}${r.cash.countedClosing == null ? ' (andaza)' : ''}`);
  if (r.cash.difference) lines.push(`Farq: ${money.sales(r.cash.difference)}`);
  return lines.join('\n');
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Prints through a hidden iframe so the app page itself is untouched. */
export function printReport(r: DayReport, money: ReportMoney, shopName?: string) {
  const row = (a: string, b: string, strong = false) =>
    `<tr${strong ? ' class="b"' : ''}><td>${esc(a)}</td><td class="r">${esc(b)}</td></tr>`;
  const items = r.categories.map((c) => {
    const rows = r.items.filter((i) => (i.categoryId ?? null) === c.id && i.qty > 0)
      .map((i) => row(`${qty(i.qty)} × ${i.name}`, money.sales(i.revenue))).join('');
    return `<tr class="h"><td>${esc(c.name)}</td><td class="r">${qty(c.qty)}</td></tr>${rows}`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Din ka hisaab ${r.date}</title>
<style>
  body{font:13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;margin:24px;max-width:640px}
  h1{font-size:18px;margin:0}p{margin:2px 0 14px;color:#475569}
  h2{font-size:13px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.04em;color:#334155}
  table{width:100%;border-collapse:collapse}td{padding:4px 0;border-bottom:1px solid #e2e8f0}
  .r{text-align:right;font-variant-numeric:tabular-nums}.b td{font-weight:700;border-top:2px solid #0f172a}
  .h td{font-weight:600;background:#f1f5f9;padding:5px 6px}
</style></head><body>
<h1>Din ka hisaab</h1><p>${esc(prettyDate(r.date))}${shopName ? ` · ${esc(shopName)}` : ''}</p>
<h2>Galla</h2><table>
${row('Opening balance', money.sales(r.cash.opening))}
${row('+ Cash bikri', money.sales(r.cash.cashSales))}
${r.cash.cashIn ? row('+ Cash in', money.sales(r.cash.cashIn)) : ''}
${r.cash.expenses ? row('− Cash kharcha', money.cost(r.cash.expenses)) : ''}
${r.cash.refunds ? row('− Wapsi', money.sales(r.cash.refunds)) : ''}
${r.cash.purchases ? row('− Maal ki adaigi', money.cost(r.cash.purchases)) : ''}
${r.cash.supplierPaid ? row('− Supplier ko diya', money.cost(r.cash.supplierPaid)) : ''}
${r.cash.cashOut ? row('− Cash out', money.sales(r.cash.cashOut)) : ''}
${row(r.cash.countedClosing == null ? 'Closing (andaza)' : 'Closing (gina hua)', money.sales(r.cash.countedClosing ?? r.cash.expectedClosing), true)}
</table>
<h2>Bikri</h2><table>
${row(`Kul bikri (${r.sales.bills} bill)`, money.sales(r.sales.total), true)}
${r.payments.map((p) => row(PAYMENT_LABELS[p.method] ?? p.method, money.sales(p.collected))).join('')}
${r.sales.credit ? row('Udhaar', money.sales(r.sales.credit)) : ''}
${r.sales.discount ? row('Discount', money.sales(r.sales.discount)) : ''}
</table>
<h2>Kya bika</h2><table>${items}</table>
<h2>Kharcha</h2><table>
${r.expenses.list.map((e) => row(e.title, money.cost(e.amount))).join('')}
${row('Kul kharcha', money.cost(r.expenses.total), true)}
</table>
</body></html>`;

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) { frame.remove(); return; }
  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 1000);
}
