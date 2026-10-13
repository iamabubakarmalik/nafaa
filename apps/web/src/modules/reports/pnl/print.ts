/**
 * Printable P&L documents (A4, PDF or thermal through the shared print
 * button) and CSV files: the statement with its comparison, the monthly
 * columns, the branch columns and cash flow. Cost lines are left out while
 * cost is hidden.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc, PrintSection } from '@core/print';
import type { MoneyAnalytics } from '@modules/finance/money/api/money.api';
import { SOURCES } from '@modules/finance/money/components/meta';
import type { PnlBranches, PnlMonthly, PnlReport, PnlStatement } from './api';
import { CHANNELS, change, monthLabel, pctText, type PnlLine } from './meta';

/** Accountant style: deductions in brackets, ratios as percent. */
export function lineText(l: PnlLine, v: number | null): string {
  if (v == null) return '—';
  if (l.kind === 'ratio') return pctText(v);
  if (l.minus && Math.abs(v) >= 0.005) return `(${formatPKR(v)})`;
  return formatPKR(v);
}

const visible = (lines: PnlLine[], costHidden: boolean) => lines.filter((l) => !(l.cost && costHidden));
const changeText = (v: number | null) => (v == null ? '' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);

/** Lines as table rows with section headings marked for bold. */
function statementTable(lines: PnlLine[], columns: PnlStatement[], extra?: (l: PnlLine) => string[]) {
  const rows: string[][] = [];
  const groupRows: number[] = [];
  for (const l of lines) {
    if (l.kind === 'head') groupRows.push(rows.length);
    if (l.kind === 'grand') groupRows.push(rows.length);
    const label = l.kind === 'sub' ? `   ${l.label}` : l.label;
    rows.push(l.kind === 'head' ? [l.label, ...columns.map(() => ''), ...(extra ? extra(l).map(() => '') : [])] : [label, ...columns.map((s) => lineText(l, l.value(s))), ...(extra ? extra(l) : [])]);
  }
  return { rows, groupRows };
}

export function statementDoc(r: PnlReport, lines: PnlLine[], o: { costHidden: boolean; period: string; prevPeriod: string; branch: string; label: string }): PrintDoc {
  const ls = visible(lines, o.costHidden);
  const net = r.current.revenue.net;
  const t = statementTable(ls, [r.current, r.previous], (l) => {
    const v = l.value(r.current);
    const share = l.kind === 'ratio' || v == null || Math.abs(net) < 0.005 ? '' : `${((v / net) * 100).toFixed(1)}%`;
    return [share, changeText(change(v, l.value(r.previous)))];
  });
  // Column order: line, now, before, share, change → reorder to line, now, share, before, change.
  const rows = t.rows.map((x) => [x[0], x[1], x[3], x[2], x[4]]);
  const sections: PrintSection[] = [{
    kind: 'table', title: 'Profit-loss ka bayan',
    columns: [{ label: 'Details' }, { label: 'Is period', align: 'right' }, { label: '% sale', align: 'right', wideOnly: true }, { label: 'Muqabla', align: 'right', wideOnly: true }, { label: 'Farq', align: 'right', wideOnly: true }],
    rows, groupRows: t.groupRows,
  }];
  if (r.channels.length > 1) {
    sections.push({
      kind: 'table', title: 'Sale ke raaste',
      columns: [{ label: 'Raasta' }, { label: 'Bill', align: 'right', wideOnly: true }, { label: 'Net sale', align: 'right' }, ...(o.costHidden ? [] : [{ label: 'Profit', align: 'right' as const }, { label: 'Margin', align: 'right' as const, wideOnly: true }])],
      rows: r.channels.map((c) => [CHANNELS[c.source]?.label ?? c.source, String(c.bills), formatPKR(c.net), ...(o.costHidden ? [] : [c.profit == null ? '—' : formatPKR(c.profit), pctText(c.margin)])]),
    });
  }
  if (r.categories.length) {
    sections.push({
      kind: 'table', title: 'Category war (bill discount se pehle)',
      columns: [{ label: 'Category' }, { label: 'Net sale', align: 'right' }, ...(o.costHidden ? [] : [{ label: 'Cost', align: 'right' as const, wideOnly: true }, { label: 'Profit', align: 'right' as const }, { label: 'Margin', align: 'right' as const, wideOnly: true }])],
      rows: r.categories.slice(0, 25).map((c) => [c.name, formatPKR(c.net), ...(o.costHidden ? [] : [c.cost == null ? '—' : formatPKR(c.cost), c.profit == null ? '—' : formatPKR(c.profit), pctText(c.margin)])]),
    });
  }
  const notes = statementNotes(r);
  if (notes.length) sections.push({ kind: 'text', title: 'Note', text: notes.join('\n') });
  return {
    title: 'Profit-loss (P&L)',
    subtitle: o.period,
    meta: [['Branch', o.branch], ['Muqabla', o.prevPeriod], ['Kaarobar', o.label], ['Tankhwah', r.staffIncluded ? 'Kharchay me shamil' : 'Shamil nahi']],
    sections,
    footer: 'Bikri void bills ke baghair; wapsi us din gini gayi jis din hui. Lagat bikri par save hui cost se.',
  };
}

/** Plain-language notes on how far the figures can be trusted. */
export function statementNotes(r: PnlReport): string[] {
  const c = r.current.cogs;
  const out: string[] = [];
  if (c && c.estimated > 0) out.push(`${c.estimatedLines} lines par cost nahi likhi thi — ${formatPKR(c.estimated)} product ki aaj ki cost se andaza lagaya.`);
  if (c && c.unknownLines > 0) out.push(`${c.unknownLines} lines (${formatPKR(c.unknownRevenue)} sale) ki koi cost nahi mili — in ka poora paisa profit gina gaya.`);
  if (r.pendingExpenses.count > 0) out.push(`${r.pendingExpenses.count} kharchay (${formatPKR(r.pendingExpenses.amount)}) abhi "baqi" hain — payment tak shamil nahi.`);
  return out;
}

export function monthlyDoc(m: PnlMonthly, o: { costHidden: boolean; branch: string }): PrintDoc {
  const cost = (v: number | null) => (o.costHidden || v == null ? '—' : formatPKR(v));
  const rows = m.months.map(({ key, partial, statement: s }) => [
    `${monthLabel(key, true)}${partial ? ' *' : ''}`, formatPKR(s.revenue.net), cost(s.cogs?.total ?? null), cost(s.grossProfit),
    formatPKR(s.expenses.total), cost(s.writeOffs?.net ?? null), cost(s.netProfit), o.costHidden ? '—' : pctText(s.netMargin),
  ]);
  const sum = (f: (s: PnlStatement) => number | null) => m.months.reduce((a, x) => a + (f(x.statement) ?? 0), 0);
  return {
    title: 'Profit-loss — mahine war',
    subtitle: `${monthLabel(m.months[0].key, true)} — ${monthLabel(m.months[m.months.length - 1].key, true)}`,
    meta: [['Branch', o.branch], ['Tankhwah', m.staffIncluded ? 'Kharchay me shamil' : 'Shamil nahi']],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Mahina' }, { label: 'Net sale', align: 'right' }, { label: 'Cost', align: 'right', wideOnly: true }, { label: 'Gross', align: 'right', wideOnly: true },
        { label: 'Kharchay', align: 'right', wideOnly: true }, { label: 'Stock nuqsan', align: 'right', wideOnly: true }, { label: 'Net profit', align: 'right' }, { label: 'Margin', align: 'right', wideOnly: true }],
      rows,
      footer: ['Kul', formatPKR(sum((s) => s.revenue.net)), cost(sum((s) => s.cogs?.total ?? null)), cost(sum((s) => s.grossProfit)), formatPKR(sum((s) => s.expenses.total)),
        cost(sum((s) => s.writeOffs?.net ?? null)), cost(sum((s) => s.netProfit)), ''],
    }],
    footer: '* Ye mahina abhi chal raha hai.',
  };
}

export function branchesDoc(b: PnlBranches, o: { costHidden: boolean; period: string }): PrintDoc {
  const cost = (v: number | null) => (o.costHidden || v == null ? '—' : formatPKR(v));
  const row = (name: string, s: PnlStatement) => [name, formatPKR(s.revenue.net), cost(s.grossProfit), formatPKR(s.expenses.total), cost(s.netProfit), o.costHidden ? '—' : pctText(s.netMargin)];
  return {
    title: 'Profit-loss — branch war',
    subtitle: o.period,
    sections: [{
      kind: 'table',
      columns: [{ label: 'Branch' }, { label: 'Net sale', align: 'right' }, { label: 'Gross profit', align: 'right', wideOnly: true }, { label: 'Kharchay', align: 'right', wideOnly: true }, { label: 'Net profit', align: 'right' }, { label: 'Margin', align: 'right', wideOnly: true }],
      rows: b.branches.map((x) => row(x.name, x.statement)),
      footer: row('Kul', b.total),
    }],
  };
}

export function cashDoc(c: MoneyAnalytics, o: { period: string; netProfit: string }): PrintDoc {
  return {
    title: 'Paisa aaya / gaya',
    subtitle: o.period,
    meta: [['Aaya', formatPKR(c.totals.in)], ['Gaya', formatPKR(c.totals.out)], ['Bacha', formatPKR(c.totals.net)], ['Net profit (P&L)', o.netProfit]],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Kahan se / kahan' }, { label: 'Entries', align: 'right', wideOnly: true }, { label: 'Aaya', align: 'right' }, { label: 'Gaya', align: 'right' }],
      rows: c.bySource.map((s) => [SOURCES[s.source]?.label ?? s.source, String(s.count), s.direction === 'in' ? formatPKR(s.amount) : '', s.direction === 'out' ? formatPKR(s.amount) : '']),
      footer: ['Kul', '', formatPKR(c.totals.in), formatPKR(c.totals.out)],
    }],
  };
}

/* ═════════════════════════ CSV ═════════════════════════ */

export function downloadCsv(name: string, header: string[], rows: Array<Array<string | number>>) {
  const csv = [...header.map((h) => [h]), [''], ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const raw = (v: number | null) => (v == null ? '' : v.toFixed(2));

/** Lines down, the given columns across; numbers without formatting so a spreadsheet can add them. */
export function linesCsv(name: string, header: string[], lines: PnlLine[], costHidden: boolean, columns: Array<{ label: string; s: PnlStatement }>) {
  const rows: Array<Array<string | number>> = [['Details', ...columns.map((c) => c.label)]];
  for (const l of visible(lines, costHidden)) {
    rows.push(l.kind === 'head' ? [l.label.toUpperCase()] : [`${l.kind === 'sub' ? '  ' : ''}${l.minus ? '(-) ' : ''}${l.label}${l.kind === 'ratio' ? ' %' : ''}`, ...columns.map((c) => raw(l.value(c.s)))]);
  }
  downloadCsv(name, header, rows);
}
