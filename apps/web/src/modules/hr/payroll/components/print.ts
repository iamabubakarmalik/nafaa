/**
 * Printable payroll sheets (A4, PDF or thermal through the shared print
 * button) and CSV files: the month's run sheet and the history list.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { HistoryPage, RunEdit, RunSheet } from '../api/payroll.api';
import { applyEdit } from './calc';
import { METHOD_LABEL, SALARY_TYPE, STATUS, day, downloadCsv } from './meta';

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
        net: p.net, paid: 0, due: p.net, state: 'Abhi nahi bani', number: '',
      };
  });
}

export function runSheetDoc(sheet: RunSheet, edits: Record<string, RunEdit>, branch: string): PrintDoc {
  const lines = sheetLines(sheet, edits);
  const t = sheet.totals;
  return {
    title: `Tankhwah — ${sheet.label}`,
    subtitle: branch,
    meta: [['Staff', String(t.staff)], ['Kul kamai', formatPKR(t.gross)], ['Ada', formatPKR(t.paid)], ['Baqi', formatPKR(t.due)]],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: 'Staff' }, { label: 'Ohda', wideOnly: true }, { label: 'Hazir/ghair', wideOnly: true }, { label: 'Tankhwah', align: 'right', wideOnly: true },
          { label: '+', align: 'right', wideOnly: true }, { label: '−', align: 'right', wideOnly: true }, { label: 'Net', align: 'right' },
          { label: 'Ada', align: 'right', wideOnly: true }, { label: 'Haal', wideOnly: true },
        ],
        rows: lines.map((l) => [l.name, l.job, l.days, formatPKR(l.base), formatPKR(l.plus), formatPKR(l.minus), formatPKR(l.net), formatPKR(l.paid), l.state]),
        footer: ['Kul', '', '', '', '', '', formatPKR(lines.reduce((a, l) => a + l.net, 0)), formatPKR(lines.reduce((a, l) => a + l.paid, 0)), ''],
      },
      {
        kind: 'rows',
        title: 'Khulasa',
        rows: [
          { label: 'Kul kamai (gross)', value: formatPKR(t.gross) },
          { label: 'Commission shamil', value: formatPKR(t.commission) },
          { label: 'Advance kata', value: formatPKR(t.advance) },
          { label: 'Ada ho gaya', value: formatPKR(t.paid) },
          { label: 'Abhi dena hai', value: formatPKR(t.due), strong: true },
          ...(t.salesPct != null ? [{ label: `Sale ${formatPKR(t.sales)} ka hissa`, value: `${t.salesPct}%` }] : []),
        ],
      },
    ],
    footer: 'Hazir/ghair = hazir din / ghair hazir din (jahan hazri lagi)',
  };
}

export function runSheetCsv(sheet: RunSheet, edits: Record<string, RunEdit>, branch: string) {
  const lines = sheetLines(sheet, edits);
  downloadCsv(`tankhwah-${sheet.month}.csv`, [[`Tankhwah ${sheet.label}`], [branch]],
    ['Staff', 'Number', 'Ohda', 'Type', 'Hazir/ghair', 'Tankhwah', 'Izafa', 'Katauti', 'Net', 'Ada', 'Baqi', 'Haal', 'Record'],
    lines.map((l) => [l.name, l.staffNo, l.job, l.type, l.days, l.base, l.plus, l.minus, l.net, l.paid, l.due, l.state, l.number]));
}

export function historyDoc(page: HistoryPage, filter: string): PrintDoc {
  const t = page.totals;
  return {
    title: 'Tankhwah ka record',
    subtitle: filter || 'Sab record',
    meta: [['Record', String(t.count)], ['Ada', formatPKR(t.paid)], ['Baqi', formatPKR(t.due)]],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Mahina' }, { label: 'No.', wideOnly: true }, { label: 'Staff' }, { label: 'Kaise', wideOnly: true }, { label: 'Haal', wideOnly: true }, { label: 'Net', align: 'right' }, { label: 'Ada', align: 'right', wideOnly: true }],
      rows: page.items.map((r) => [
        r.monthLabel, r.paymentNumber, `${r.staff.fullName}${r.kind === 'advance' ? ' (advance)' : ''}`, METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod,
        STATUS[r.status].label, formatPKR(r.kind === 'advance' ? r.paidAmount : r.netAmount), formatPKR(r.paidAmount),
      ]),
      footer: ['Kul', '', '', '', '', formatPKR(t.net), formatPKR(t.paid)],
    }],
    footer: page.total > page.items.length ? `Pehle ${page.items.length} record dikhaye gaye hain (kul ${page.total})` : undefined,
  };
}

export function historyCsv(page: HistoryPage, filter: string) {
  downloadCsv(`tankhwah-record-${new Date().toISOString().slice(0, 10)}.csv`, [['Tankhwah ka record'], [filter || 'Sab record']],
    ['Mahina', 'Number', 'Staff', 'Type', 'Kul kamai', 'Katauti', 'Net', 'Ada', 'Baqi', 'Kaise', 'Haal', 'Date'],
    page.items.map((r) => [
      r.monthLabel, r.paymentNumber, r.staff.fullName, r.kind === 'advance' ? 'Advance' : 'Tankhwah', r.grossAmount, r.totalDeductions,
      r.kind === 'advance' ? r.paidAmount : r.netAmount, r.paidAmount, r.balanceAmount, METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod,
      STATUS[r.status].label, day(r.paidAt ?? r.createdAt),
    ]));
}
