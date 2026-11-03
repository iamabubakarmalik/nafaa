/** Plain-text summaries of the board and the month sheet for the share sheet. */

import { Share } from 'react-native';
import { t } from '@/core/i18n';
import type { Board, Sheet } from '../api/attendance';
import { CODE, LIVE, absentDays, clockOf, dayLabelYear, hours, liveState, mins, monthLabel } from './meta';

export function boardText(board: Board): string {
  const c = board.counts;
  const lines = [
    `${t('Hazri (attendance)')} — ${dayLabelYear(board.day)}`,
    t('{{present}} aaye · {{late}} late · {{notIn}} abhi nahi aaye · {{leave}} chhutti par', { present: c.present, late: c.late, notIn: c.notIn, leave: c.leave }),
    '',
    ...board.rows.map(({ staff, day }) => {
      const state = t(LIVE[liveState(day)].label);
      const times = day.in ? ` ${clockOf(day.in)} – ${day.out ? clockOf(day.out) : '…'}` : '';
      return `${staff.fullName}: ${state}${times}${day.late > 0 ? ` (${mins(day.late)} late)` : ''}`;
    }),
  ];
  return lines.join('\n');
}

export function sheetText(sheet: Sheet, month: string): string {
  const lines = [
    `${t('Hazri (attendance)')} — ${monthLabel(month)}`,
    '',
    ...sheet.rows.map(({ staff, totals: x }) =>
      `${staff.fullName}: ${x.daysWorked - x.halfDay / 2}/${x.workingDays} ${t('Kaam')} · ${x.late} ${t('Late')} · ${absentDays(x)} ${t('Ghair')} · ${x.leave + x.unpaidLeave} ${t('Chhutti')} · ${hours(x.overtimeHours)} OT`),
    '',
    `${CODE.P.short} ${t(CODE.P.label)} · ${CODE.L.short} ${t(CODE.L.label)} · ${CODE.A.short} ${t(CODE.A.label)} · ${CODE.LV.short} ${t(CODE.LV.label)}`,
  ];
  return lines.join('\n');
}

export const shareText = (message: string) => Share.share({ message }).catch(() => undefined);
