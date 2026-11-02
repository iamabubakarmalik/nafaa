/**
 * Printable payroll sheets (A4, PDF or thermal through the shared print
 * button) and CSV files: the month's run sheet and the history list.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { HistoryPage, RunEdit, RunSheet } from '../api/payroll.api';
import { applyEdit } from './calc';
import { METHOD_LABEL, SALARY_TYPE, STATUS, day, downloadCsv } from './meta';
import { t as tr } from '@core/i18n';

interface SheetLine { name: string; staffNo: string; job: string; type: string; days: string; base: number; plus: number; minus: number; net: number; paid: number; due: number; state: string; number: string }

function sheetLines(sheet: RunSheet, edits: Record<string, RunEdit>): SheetLine[] {
  return sheet.rows.map((r) => {
    const rec = r.record;
    const p = applyEdit(r, edits[r.staff.id]);
    const a = r.attendance;
    const days = a.marked ? `${a.present + a.late + a.half * 0.5}/${a.absent}` : '—';
    return rec
      ? {
        name: r.staff.fullName, staffNo: r.staff.staffNumber, job: r.staff.designation, type: SALARY_TYPE[r.staff.salaryType].label, days,
        base: rec.baseSalary, plus: rec.overtimePay + rec.commissionEarned + rec.bonuses, minus: rec.totalDeductions,
        net: rec.netAmount, paid: rec.paidAmount, due: rec.balanceAmount, state: STATUS[rec.status].label, number: rec.paymentNumber,
      }
      : {
        name: r.staff.fullName, staffNo: r.staff.staffNumber, job: r.staff.designation, type: SALARY_TYPE[r.staff.salaryType].label, days,
        base: p.basePay, plus: p.overtimePay + p.commission + p.bonuses, minus: p.deductions,
        net: p.net, paid: 0, due: p.net, state: tr('Abhi nahi bani'), number: '',
      };
  });
}

export function runSheetDoc(sheet: RunSheet, edits: Record<string, RunEdit>, branch: string): PrintDoc {
  const lines = sheetLines(sheet, edits);
  const t = sheet.totals;
  return {
    title: tr('Tankhwah — {{label}}', { label: sheet.label }),
    subtitle: branch,
    meta: [[tr('Staff'), String(t.staff)], [tr('Kul kamai'), formatPKR(t.gross)], [tr('Ada'), formatPKR(t.paid)], [tr('Baqi'), formatPKR(t.due)]],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: tr('Staff') }, { label: tr('Ohda'), wideOnly: true }, { label: tr('Hazir/ghair'), wideOnly: true }, { label: tr('Tankhwah'), align: 'right', wideOnly: true },
          { label: '+', align: 'right', wideOnly: true }, { label: '−', align: 'right', wideOnly: true }, { label: tr('Net'), align: 'right' },
          { label: tr('Ada'), align: 'right', wideOnly: true }, { label: tr('Haal'), wideOnly: true },
        ],
        rows: lines.map((l) => [l.name, l.job, l.days, formatPKR(l.base), formatPKR(l.plus), formatPKR(l.minus), formatPKR(l.net), formatPKR(l.paid), l.state]),
        footer: [tr('Kul'), '', '', '', '', '', formatPKR(lines.reduce((a, l) => a + l.net, 0)), formatPKR(lines.reduce((a, l) => a + l.paid, 0)), ''],
      },
      {
        kind: 'rows',
        title: tr('Khulasa'),
        rows: [
          { label: tr('Kul kamai (gross)'), value: formatPKR(t.gross) },
          { label: tr('Commission shamil'), value: formatPKR(t.commission) },
          { label: tr('Advance kata'), value: formatPKR(t.advance) },
          { label: tr('Ada ho gaya'), value: formatPKR(t.paid) },
          { label: tr('Abhi dena hai'), value: formatPKR(t.due), strong: true },
          ...(t.salesPct != null ? [{ label: tr('Sale {{sales}} ka hissa', { sales: formatPKR(t.sales) }), value: `${t.salesPct}%` }] : []),
        ],
      },
    ],
    footer: tr('Hazir/ghair = hazir din / ghair hazir din (jahan hazri lagi)'),
  };
}

export function runSheetCsv(sheet: RunSheet, edits: Record<string, RunEdit>, branch: string) {
  const lines = sheetLines(sheet, edits);
  downloadCsv(`tankhwah-${sheet.month}.csv`, [[tr('Tankhwah {{label}}', { label: sheet.label })], [branch]],
    [tr('Staff'), tr('Number'), tr('Ohda'), tr('Type'), tr('Hazir/ghair'), tr('Tankhwah'), tr('Izafa'), tr('Katauti'), tr('Net'), tr('Ada'), tr('Baqi'), tr('Haal'), tr('Record')],
    lines.map((l) => [l.name, l.staffNo, l.job, l.type, l.days, l.base, l.plus, l.minus, l.net, l.paid, l.due, l.state, l.number]));
}

export function historyDoc(page: HistoryPage, filter: string): PrintDoc {
  const t = page.totals;
  return {
    title: tr('Tankhwah ka record'),
    subtitle: filter || tr('Sab record'),
    meta: [[tr('Record'), String(t.count)], [tr('Ada'), formatPKR(t.paid)], [tr('Baqi'), formatPKR(t.due)]],
    sections: [{
      kind: 'table',
      columns: [{ label: tr('Mahina') }, { label: tr('No.'), wideOnly: true }, { label: tr('Staff') }, { label: tr('Kaise'), wideOnly: true }, { label: tr('Haal'), wideOnly: true }, { label: tr('Net'), align: 'right' }, { label: tr('Ada'), align: 'right', wideOnly: true }],
      rows: page.items.map((r) => [
        r.monthLabel, r.paymentNumber, `${r.staff.fullName}${r.kind === 'advance' ? ' (advance)' : ''}`, METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod,
        STATUS[r.status].label, formatPKR(r.kind === 'advance' ? r.paidAmount : r.netAmount), formatPKR(r.paidAmount),
      ]),
      footer: [tr('Kul'), '', '', '', '', formatPKR(t.net), formatPKR(t.paid)],
    }],
    footer: page.total > page.items.length ? tr('Pehle {{count}} record dikhaye gaye hain (kul {{total}})', { count: page.items.length, total: page.total }) : undefined,
  };
}

export function historyCsv(page: HistoryPage, filter: string) {
  downloadCsv(`tankhwah-record-${new Date().toISOString().slice(0, 10)}.csv`, [[tr('Tankhwah ka record')], [filter || tr('Sab record')]],
    [tr('Mahina'), tr('Number'), tr('Staff'), tr('Type'), tr('Kul kamai'), tr('Katauti'), tr('Net'), tr('Ada'), tr('Baqi'), tr('Kaise'), tr('Haal'), tr('Date')],
    page.items.map((r) => [
      r.monthLabel, r.paymentNumber, r.staff.fullName, r.kind === 'advance' ? tr('Advance') : tr('Tankhwah'), r.grossAmount, r.totalDeductions,
      r.kind === 'advance' ? r.paidAmount : r.netAmount, r.paidAmount, r.balanceAmount, METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod,
      STATUS[r.status].label, day(r.paidAt ?? r.createdAt),
    ]));
}
