/**
 * Printable expense list for the current filter: every expense with its
 * category, method and status, a category summary and totals. A PrintDoc, so
 * the shared print button prints it on A4, as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { ExpensePage, ExpenseStatus } from '../api/expenses.api';
import { STATUS, catOf, day, methodOf } from './meta';

/** Only paid expenses add up to "Kharch hua"; with a status filter the footer sums that status. */
export function expensesDoc(list: ExpensePage, period: string, filter: string, status?: ExpenseStatus): PrintDoc {
  const t = list.totals;
  const foot = status === 'PENDING' ? t.pending : status === 'CANCELLED' ? t.cancelled : t.paid;
  const byCat = new Map<string, number>();
  for (const e of list.items) if (e.status === 'PAID') byCat.set(catOf(e).name, (byCat.get(catOf(e).name) ?? 0) + e.amount);
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  return {
    title: 'Kharche (Expenses)',
    subtitle: period,
    meta: [['Kharche', String(list.total)], ...(filter ? [['Filter', filter] as [string, string]] : []), ['Kharch hua', formatPKR(t.paid)], ...(t.pending > 0 ? [['Baqi bill', formatPKR(t.pending)] as [string, string]] : [])],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: 'Tareekh' }, { label: 'No.', wideOnly: true }, { label: 'Kharcha' }, { label: 'Category', wideOnly: true },
          { label: 'Kaise', wideOnly: true }, { label: 'Haal', wideOnly: true }, { label: 'Raqam', align: 'right' },
        ],
        rows: list.items.map((e) => [
          day(e.expenseDate), e.expenseNumber, e.title, catOf(e).name, methodOf(e.paymentMethod).label, STATUS[e.status].label,
          e.status === 'CANCELLED' ? `(${formatPKR(e.amount)})` : formatPKR(e.amount),
        ]),
        footer: ['', '', status ? `Kul (${STATUS[status].label})` : 'Kul (ada)', '', '', '', formatPKR(foot)],
      },
      ...(cats.length > 1 ? [{
        kind: 'rows' as const,
        title: 'Category ke hisaab se (ada)',
        rows: cats.map(([name, amount]) => ({ label: name, value: formatPKR(amount) })),
      }] : []),
      {
        kind: 'rows',
        title: 'Khulasa',
        rows: [
          { label: `Ada ho gaya (${t.paidCount})`, value: formatPKR(t.paid) },
          ...(t.pendingCount ? [{ label: `Baqi bill (${t.pendingCount})`, value: formatPKR(t.pending) }] : []),
          ...(t.cancelledCount ? [{ label: `Cancel (${t.cancelledCount}) — kul me nahi`, value: formatPKR(t.cancelled) }] : []),
          { label: 'Kharch hua (sirf ada)', value: formatPKR(t.paid), strong: true },
        ],
      },
    ],
    footer: list.total > list.items.length ? `Pehle ${list.items.length} kharche dikhaye gaye hain (kul ${list.total})` : undefined,
  };
}
