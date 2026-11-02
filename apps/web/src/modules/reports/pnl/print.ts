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
import { t as tr } from '@core/i18n';

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
    kind: 'table', title: tr('Profit-loss ka bayan'),
    columns: [{ label: tr('Details') }, { label: tr('Is period'), align: 'right' }, { label: tr('% sale'), align: 'right', wideOnly: true }, { label: tr('Muqabla'), align: 'right', wideOnly: true }, { label: tr('Farq'), align: 'right', wideOnly: true }],
    rows, groupRows: t.groupRows,
  }];
  if (r.channels.length > 1) {
    sections.push({
      kind: 'table', title: tr('Sale ke raaste'),
      columns: [{ label: tr('Raasta') }, { label: tr('Bill'), align: 'right', wideOnly: true }, { label: tr('Net sale'), align: 'right' }, ...(o.costHidden ? [] : [{ label: tr('Profit'), align: 'right' as const }, { label: tr('Margin'), align: 'right' as const, wideOnly: true }])],
      rows: r.channels.map((c) => [CHANNELS[c.source]?.label ?? c.source, String(c.bills), formatPKR(c.net), ...(o.costHidden ? [] : [c.profit == null ? '—' : formatPKR(c.profit), pctText(c.margin)])]),
    });
  }
  if (r.categories.length) {
    sections.push({
      kind: 'table', title: tr('Category war (bill discount se pehle)'),
      columns: [{ label: tr('Category') }, { label: tr('Net sale'), align: 'right' }, ...(o.costHidden ? [] : [{ label: tr('Cost'), align: 'right' as const, wideOnly: true }, { label: tr('Profit'), align: 'right' as const }, { label: tr('Margin'), align: 'right' as const, wideOnly: true }])],
      rows: r.categories.slice(0, 25).map((c) => [c.name, formatPKR(c.net), ...(o.costHidden ? [] : [c.cost == null ? '—' : formatPKR(c.cost), c.profit == null ? '—' : formatPKR(c.profit), pctText(c.margin)])]),
    });
  }
  const notes = statementNotes(r);
  if (notes.length) sections.push({ kind: 'text', title: tr('Note'), text: notes.join('\n') });
  return {
    title: tr('Profit-loss (P&L)'),
    subtitle: o.period,
    meta: [[tr('Branch'), o.branch], [tr('Muqabla'), o.prevPeriod], [tr('Kaarobar'), o.label], [tr('Tankhwah'), r.staffIncluded ? tr('Kharchay me shamil') : tr('Shamil nahi')]],
    sections,
    footer: tr('Sale void bills ke baghair; wapsi us din gini gayi jis din hui. Cost sale par save hui cost se.'),
  };
}

/** Plain-language notes on how far the figures can be trusted. */
export function statementNotes(r: PnlReport): string[] {
  const c = r.current.cogs;
  const out: string[] = [];
  if (c && c.estimated > 0) out.push(tr('{{estimatedLines}} lines par cost nahi likhi thi — {{estimated}} product ki aaj ki cost se andaza lagaya.', { estimatedLines: c.estimatedLines, estimated: formatPKR(c.estimated) }));
  if (c && c.unknownLines > 0) out.push(tr('{{unknownLines}} lines ({{unknownRevenue}} sale) ki koi cost nahi mili — in ka poora paisa profit gina gaya.', { unknownLines: c.unknownLines, unknownRevenue: formatPKR(c.unknownRevenue) }));
  if (r.pendingExpenses.count > 0) out.push(tr('{{count}} kharchay ({{amount}}) abhi "baqi" hain — payment tak shamil nahi.', { count: r.pendingExpenses.count, amount: formatPKR(r.pendingExpenses.amount) }));
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
    title: tr('Profit-loss — mahine war'),
    subtitle: `${monthLabel(m.months[0].key, true)} — ${monthLabel(m.months[m.months.length - 1].key, true)}`,
    meta: [[tr('Branch'), o.branch], [tr('Tankhwah'), m.staffIncluded ? tr('Kharchay me shamil') : tr('Shamil nahi')]],
    sections: [{
      kind: 'table',
      columns: [{ label: tr('Mahina') }, { label: tr('Net sale'), align: 'right' }, { label: tr('Cost'), align: 'right', wideOnly: true }, { label: tr('Gross'), align: 'right', wideOnly: true },
        { label: tr('Kharchay'), align: 'right', wideOnly: true }, { label: tr('Stock nuqsan'), align: 'right', wideOnly: true }, { label: tr('Net profit'), align: 'right' }, { label: tr('Margin'), align: 'right', wideOnly: true }],
      rows,
      footer: [tr('Kul'), formatPKR(sum((s) => s.revenue.net)), cost(sum((s) => s.cogs?.total ?? null)), cost(sum((s) => s.grossProfit)), formatPKR(sum((s) => s.expenses.total)),
        cost(sum((s) => s.writeOffs?.net ?? null)), cost(sum((s) => s.netProfit)), ''],
    }],
    footer: tr('* Ye mahina abhi chal raha hai.'),
  };
}

export function branchesDoc(b: PnlBranches, o: { costHidden: boolean; period: string }): PrintDoc {
  const cost = (v: number | null) => (o.costHidden || v == null ? '—' : formatPKR(v));
  const row = (name: string, s: PnlStatement) => [name, formatPKR(s.revenue.net), cost(s.grossProfit), formatPKR(s.expenses.total), cost(s.netProfit), o.costHidden ? '—' : pctText(s.netMargin)];
  return {
    title: tr('Profit-loss — branch war'),
    subtitle: o.period,
    sections: [{
      kind: 'table',
      columns: [{ label: tr('Branch') }, { label: tr('Net sale'), align: 'right' }, { label: tr('Gross profit'), align: 'right', wideOnly: true }, { label: tr('Kharchay'), align: 'right', wideOnly: true }, { label: tr('Net profit'), align: 'right' }, { label: tr('Margin'), align: 'right', wideOnly: true }],
      rows: b.branches.map((x) => row(x.name, x.statement)),
      footer: row(tr('Kul'), b.total),
    }],
  };
}

export function cashDoc(c: MoneyAnalytics, o: { period: string; netProfit: string }): PrintDoc {
  return {
    title: tr('Paisa aaya / gaya'),
    subtitle: o.period,
    meta: [[tr('Aaya'), formatPKR(c.totals.in)], [tr('Gaya'), formatPKR(c.totals.out)], [tr('Bacha'), formatPKR(c.totals.net)], [tr('Net profit (P&L)'), o.netProfit]],
    sections: [{
      kind: 'table',
      columns: [{ label: tr('Kahan se / kahan') }, { label: tr('Entries'), align: 'right', wideOnly: true }, { label: tr('Aaya'), align: 'right' }, { label: tr('Gaya'), align: 'right' }],
      rows: c.bySource.map((s) => [SOURCES[s.source]?.label ?? s.source, String(s.count), s.direction === 'in' ? formatPKR(s.amount) : '', s.direction === 'out' ? formatPKR(s.amount) : '']),
      footer: [tr('Kul'), '', formatPKR(c.totals.in), formatPKR(c.totals.out)],
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
  const rows: Array<Array<string | number>> = [[tr('Details'), ...columns.map((c) => c.label)]];
  for (const l of visible(lines, costHidden)) {
    rows.push(l.kind === 'head' ? [l.label.toUpperCase()] : [`${l.kind === 'sub' ? '  ' : ''}${l.minus ? '(-) ' : ''}${l.label}${l.kind === 'ratio' ? ' %' : ''}`, ...columns.map((c) => raw(l.value(c.s)))]);
  }
  downloadCsv(name, header, rows);
}
