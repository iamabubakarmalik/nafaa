/**
 * Printable attendance documents: the monthly sheet (payroll summary plus
 * the day grid, or one person's day-by-day record) and today's board. Both
 * are PrintDocs, so the shared print button prints them on A4, as a PDF or
 * on a thermal slip, and the same rows feed the CSV.
 */

import type { PrintDoc, PrintSection } from '@core/print';
import type { Board, Sheet } from '../api/attendance.api';
import { CODE, LEGEND, LIVE, absentDays, clockOf, dayLabel, hours, liveState, mins } from './meta';
import { t as tr } from '@core/i18n';

const SUMMARY_HEAD = [
  tr('Staff #'), tr('Naam'), tr('Ohda'), tr('Branch'), tr('Kaam ke din (shop)'), tr('Kaam kiya (din)'), tr('Hazir'), tr('Late'), tr('Aadha din'), tr('Ghair hazir'),
  tr('Hazri nahi lagi'), tr('Chhutti (tankhwah wali)'), tr('Chhutti (bina tankhwah)'), tr('Off / tehwar'), tr('Ghante'), tr('Overtime ghante'), tr('Late minutes'),
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
    title: halves.length > 1 ? tr('Roz ki hazri ({{value}} hissa)', { value: i === 0 ? tr('pehla') : tr('doosra') }) : tr('Roz ki hazri'),
    columns: [{ label: tr('Naam') }, ...keys.map((k) => ({ label: k.slice(8), wideOnly: true }))],
    rows: s.rows.map((r) => [r.staff.fullName, ...keys.map((k) => CODE[r.days[k].code].short)]),
  }));
}

function personSections(s: Sheet): PrintSection[] {
  const r = s.rows[0];
  if (!r) return [];
  const tz = s.clock.tz;
  return [{
    kind: 'table',
    title: tr('{{fullName}} — roz ka record', { fullName: r.staff.fullName }),
    columns: [{ label: tr('Date') }, { label: tr('Haal') }, { label: tr('Aaye') }, { label: tr('Gaye') }, { label: tr('Ghante'), align: 'right', wideOnly: true }, { label: tr('OT'), align: 'right', wideOnly: true }, { label: tr('Late'), align: 'right', wideOnly: true }],
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
    title: tr('Hazri sheet'),
    subtitle: title,
    meta: [
      [tr('Period'), `${dayLabel(s.from)} — ${dayLabel(s.to)}`],
      [tr('Staff'), String(s.rows.length)],
      [tr('Dukaan khulti hai'), tr('{{openTime}} ({{graceMinutes}} min ki discount)', { openTime: s.clock.openTime, graceMinutes: s.clock.graceMinutes })],
      ...(filter ? [[tr('Filter'), filter] as [string, string]] : []),
    ],
    sections: [
      {
        kind: 'table',
        title: tr('Tankhwah ke liye khulasa'),
        columns: [
          { label: tr('Naam') }, { label: tr('Kaam kiya'), align: 'right' }, { label: tr('Late'), align: 'right' }, { label: tr('Ghair hazir'), align: 'right' },
          { label: tr('Chhutti'), align: 'right', wideOnly: true }, { label: tr('Ghante'), align: 'right', wideOnly: true }, { label: tr('OT'), align: 'right', wideOnly: true }, { label: tr('Late min'), align: 'right', wideOnly: true },
        ],
        rows: s.rows.map(({ staff, totals: x }) => [
          staff.fullName, `${x.daysWorked - x.halfDay / 2}/${x.workingDays}`, String(x.late), String(absentDays(x)),
          `${x.leave}${x.unpaidLeave ? tr(' + {{unpaidLeave}} bina tankhwah', { unpaidLeave: x.unpaidLeave }) : ''}`, hours(x.workedHours), hours(x.overtimeHours), String(x.lateMinutes),
        ]),
        footer: [tr('Kul'), String(t.daysWorked - t.halfDay / 2), String(t.late), String(absentDays(t)), String(t.leave + t.unpaidLeave), hours(t.workedHours), hours(t.overtimeHours), String(t.lateMinutes)],
      },
      ...(single ? personSections(s) : gridSections(s)),
      { kind: 'text', title: tr('Nishan'), text: LEGEND.map((c) => `${CODE[c].short} = ${CODE[c].label}`).join(' · ') },
      { kind: 'text', text: tr('Kaam kiya = hazir + late + aadha din (aadha din adha gina). Tayyar karne wala: ____________    Malik / manager: ____________') },
    ],
    footer: s.clock.openTimeSet ? undefined : tr('Dukaan khulne ka waqt Settings me nahi likha — late 09:00 se gina gaya.'),
  };
}

export function boardDoc(b: Board): PrintDoc {
  const tz = b.clock.tz;
  return {
    title: tr('Aaj ki hazri'),
    subtitle: dayLabel(b.day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    meta: [[tr('Andar'), String(b.counts.inside)], [tr('Late'), String(b.counts.late)], [tr('Nahi aaye'), String(b.counts.notIn + b.counts.absent)], [tr('Chhutti'), String(b.counts.leave)]],
    sections: [{
      kind: 'table',
      columns: [{ label: tr('Naam') }, { label: tr('Branch'), wideOnly: true }, { label: tr('Haal') }, { label: tr('Aaye') }, { label: tr('Gaye'), wideOnly: true }, { label: tr('Late'), align: 'right' }],
      rows: b.rows.map(({ staff, day }) => [staff.fullName, staff.shop?.name ?? '', LIVE[liveState(day)].label, clockOf(day.in, tz), clockOf(day.out, tz), day.late ? mins(day.late) : '']),
    }],
  };
}
