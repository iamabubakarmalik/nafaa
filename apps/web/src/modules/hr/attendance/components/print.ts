/**
 * Printable attendance documents: the monthly sheet (payroll summary plus
 * the day grid, or one person's day-by-day record) and today's board. Both
 * are PrintDocs, so the shared print button prints them on A4, as a PDF or
 * on a thermal slip, and the same rows feed the CSV.
 */

import type { PrintDoc, PrintSection } from '@core/print';
import type { Board, Sheet } from '../api/attendance.api';
import { CODE, LEGEND, LIVE, absentDays, clockOf, dayLabel, hours, liveState, mins } from './meta';

const SUMMARY_HEAD = [
  'Staff #', 'Naam', 'Ohda', 'Branch', 'Kaam ke din (shop)', 'Kaam kiya (din)', 'Hazir', 'Late', 'Aadha din', 'Ghair hazir',
  'Hazri nahi lagi', 'Chhutti (tankhwah wali)', 'Chhutti (bina tankhwah)', 'Off / tehwar', 'Ghante', 'Overtime ghante', 'Late minutes',
];

/** One row per person: the numbers payroll needs. */
function summaryRows(s: Sheet): string[][] {
  return s.rows.map(({ staff, totals: t }) => [
    staff.staffNumber, staff.fullName, staff.designation, staff.shop?.name ?? '', String(t.workingDays),
    String(t.daysWorked - t.halfDay / 2), String(t.present), String(t.late), String(t.halfDay), String(t.absent),
    String(t.missing), String(t.leave), String(t.unpaidLeave), String(t.off + t.holiday), String(t.workedHours),
    String(t.overtimeHours), String(t.lateMinutes),
  ]);
}

/** CSV for payroll: the summary, then each day's code per person. */
export function sheetCsv(s: Sheet): Array<Array<string | number>> {
  const sums = summaryRows(s);
  return [
    [...SUMMARY_HEAD, ...s.keys],
    ...s.rows.map((r, i) => [...sums[i], ...s.keys.map((k) => CODE[r.days[k].code].short)]),
  ];
}

function gridSections(s: Sheet): PrintSection[] {
  const halves = s.keys.length > 16 ? [s.keys.slice(0, 15), s.keys.slice(15)] : [s.keys];
  return halves.map((keys, i) => ({
    kind: 'table' as const,
    title: halves.length > 1 ? `Roz ki hazri (${i === 0 ? 'pehla' : 'doosra'} hissa)` : 'Roz ki hazri',
    columns: [{ label: 'Naam' }, ...keys.map((k) => ({ label: k.slice(8), wideOnly: true }))],
    rows: s.rows.map((r) => [r.staff.fullName, ...keys.map((k) => CODE[r.days[k].code].short)]),
  }));
}

function personSections(s: Sheet): PrintSection[] {
  const r = s.rows[0];
  if (!r) return [];
  const tz = s.clock.tz;
  return [{
    kind: 'table',
    title: `${r.staff.fullName} — roz ka record`,
    columns: [{ label: 'Date' }, { label: 'Haal' }, { label: 'Aaye' }, { label: 'Gaye' }, { label: 'Ghante', align: 'right', wideOnly: true }, { label: 'OT', align: 'right', wideOnly: true }, { label: 'Late', align: 'right', wideOnly: true }],
    rows: s.keys.filter((k) => r.days[k].code !== 'FUT').map((k) => {
      const c = r.days[k];
      return [dayLabel(k, { weekday: 'short', day: 'numeric', month: 'short' }), CODE[c.code].label, clockOf(c.in, tz), clockOf(c.out, tz), hours(c.worked), hours(c.ot), c.late ? mins(c.late) : ''];
    }),
  }];
}

export function sheetDoc(s: Sheet, title: string, filter: string): PrintDoc {
  const t = s.totals;
  const single = s.rows.length === 1;
  return {
    title: 'Hazri sheet',
    subtitle: title,
    meta: [
      ['Period', `${dayLabel(s.from)} — ${dayLabel(s.to)}`],
      ['Staff', String(s.rows.length)],
      ['Dukaan khulti hai', `${s.clock.openTime} (${s.clock.graceMinutes} min ki discount)`],
      ...(filter ? [['Filter', filter] as [string, string]] : []),
    ],
    sections: [
      {
        kind: 'table',
        title: 'Tankhwah ke liye khulasa',
        columns: [
          { label: 'Naam' }, { label: 'Kaam kiya', align: 'right' }, { label: 'Late', align: 'right' }, { label: 'Ghair hazir', align: 'right' },
          { label: 'Chhutti', align: 'right', wideOnly: true }, { label: 'Ghante', align: 'right', wideOnly: true }, { label: 'OT', align: 'right', wideOnly: true }, { label: 'Late min', align: 'right', wideOnly: true },
        ],
        rows: s.rows.map(({ staff, totals: x }) => [
          staff.fullName, `${x.daysWorked - x.halfDay / 2}/${x.workingDays}`, String(x.late), String(absentDays(x)),
          `${x.leave}${x.unpaidLeave ? ` + ${x.unpaidLeave} bina tankhwah` : ''}`, hours(x.workedHours), hours(x.overtimeHours), String(x.lateMinutes),
        ]),
        footer: ['Kul', String(t.daysWorked - t.halfDay / 2), String(t.late), String(absentDays(t)), String(t.leave + t.unpaidLeave), hours(t.workedHours), hours(t.overtimeHours), String(t.lateMinutes)],
      },
      ...(single ? personSections(s) : gridSections(s)),
      { kind: 'text', title: 'Nishan', text: LEGEND.map((c) => `${CODE[c].short} = ${CODE[c].label}`).join(' · ') },
      { kind: 'text', text: 'Kaam kiya = hazir + late + aadha din (aadha din adha gina). Tayyar karne wala: ____________    Malik / manager: ____________' },
    ],
    footer: s.clock.openTimeSet ? undefined : 'Dukaan khulne ka waqt Settings me nahi likha — late 09:00 se gina gaya.',
  };
}

export function boardDoc(b: Board): PrintDoc {
  const tz = b.clock.tz;
  return {
    title: 'Aaj ki hazri',
    subtitle: dayLabel(b.day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    meta: [['Andar', String(b.counts.inside)], ['Late', String(b.counts.late)], ['Nahi aaye', String(b.counts.notIn + b.counts.absent)], ['Chhutti', String(b.counts.leave)]],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Naam' }, { label: 'Branch', wideOnly: true }, { label: 'Haal' }, { label: 'Aaye' }, { label: 'Gaye', wideOnly: true }, { label: 'Late', align: 'right' }],
      rows: b.rows.map(({ staff, day }) => [staff.fullName, staff.shop?.name ?? '', LIVE[liveState(day)].label, clockOf(day.in, tz), clockOf(day.out, tz), day.late ? mins(day.late) : '']),
    }],
  };
}
