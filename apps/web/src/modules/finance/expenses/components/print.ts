/**
 * Printable expense list for the current filter: every expense with its
 * category, method and status, a category summary and totals. A PrintDoc, so
 * the shared print button prints it on A4, as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { ExpensePage, ExpenseStatus } from '../api/expenses.api';
import { STATUS, catOf, day, methodOf } from './meta';
import { t as tr } from '@core/i18n';

/** Only paid expenses add up to "Kharch hua"; with a status filter the footer sums that status. */
export function expensesDoc(list: ExpensePage, period: string, filter: string, status?: ExpenseStatus): PrintDoc {
  const t = list.totals;
  const foot = status === 'PENDING' ? t.pending : status === 'CANCELLED' ? t.cancelled : t.paid;
  const byCat = new Map<string, number>();
  for (const e of list.items) if (e.status === 'PAID') byCat.set(catOf(e).name, (byCat.get(catOf(e).name) ?? 0) + e.amount);
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  return {
    title: tr('Expenses (Expenses)'),
    subtitle: period,
    meta: [[tr('Expenses'), String(list.total)], ...(filter ? [[tr('Filter'), filter] as [string, string]] : []), [tr('Kharch hua'), formatPKR(t.paid)], ...(t.pending > 0 ? [[tr('Baqi bill'), formatPKR(t.pending)] as [string, string]] : [])],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: tr('Date') }, { label: tr('No.'), wideOnly: true }, { label: tr('Expense') }, { label: tr('Category'), wideOnly: true },
          { label: tr('Kaise'), wideOnly: true }, { label: tr('Haal'), wideOnly: true }, { label: tr('Amount'), align: 'right' },
        ],
        rows: list.items.map((e) => [
          day(e.expenseDate), e.expenseNumber, e.title, catOf(e).name, methodOf(e.paymentMethod).label, STATUS[e.status].label,
          e.status === 'CANCELLED' ? `(${formatPKR(e.amount)})` : formatPKR(e.amount),
        ]),
        footer: ['', '', status ? tr('Kul ({{label}})', { label: STATUS[status].label }) : tr('Kul (ada)'), '', '', '', formatPKR(foot)],
      },
      ...(cats.length > 1 ? [{
        kind: 'rows' as const,
        title: tr('Category ke hisaab se (ada)'),
        rows: cats.map(([name, amount]) => ({ label: name, value: formatPKR(amount) })),
      }] : []),
      {
        kind: 'rows',
        title: tr('Khulasa'),
        rows: [
          { label: tr('Ada ho gaya ({{paidCount}})', { paidCount: t.paidCount }), value: formatPKR(t.paid) },
          ...(t.pendingCount ? [{ label: tr('Baqi bill ({{pendingCount}})', { pendingCount: t.pendingCount }), value: formatPKR(t.pending) }] : []),
          ...(t.cancelledCount ? [{ label: tr('Cancel ({{cancelledCount}}) — kul me nahi', { cancelledCount: t.cancelledCount }), value: formatPKR(t.cancelled) }] : []),
          { label: tr('Kharch hua (sirf ada)'), value: formatPKR(t.paid), strong: true },
        ],
      },
    ],
    footer: list.total > list.items.length ? tr('Pehle {{count}} expenses dikhaye gaye hain (kul {{total}})', { count: list.items.length, total: list.total }) : undefined,
  };
}
