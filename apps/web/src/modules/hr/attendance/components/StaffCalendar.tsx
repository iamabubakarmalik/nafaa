/**
 * One person's month as a calendar: a week per line, each day with its
 * status, check-in / check-out and late minutes. Shown on the month tab
 * when the staff filter picks one person; a manager clicks a day to fix it.
 */

import { cn } from '@core/lib/cn';
import type { AttStaff, DayCell, Sheet } from '../api/attendance.api';
import { CODE, absentDays, clockOf, hours, mins } from './meta';

const WEEK = ['Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta', 'Itwar'];

/** Monday-first weekday index of a YYYY-MM-DD key. */
const mondayIndex = (key: string) => (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7;

export function StaffCalendar({ sheet, row, canCorrect, onCell }: {
  sheet: Sheet; row: Sheet['rows'][number]; canCorrect: boolean;
  onCell: (staff: AttStaff, key: string, cell: DayCell) => void;
}) {
  const tz = sheet.clock.tz;
  const t = row.totals;
  const lead = sheet.keys.length ? mondayIndex(sheet.keys[0]) : 0;
  const slots: Array<string | null> = [...Array<null>(lead).fill(null), ...sheet.keys];
  while (slots.length % 7) slots.push(null);

  return (
    <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-semibold text-slate-900">{row.staff.fullName}</span>
        <span className="text-[0.75rem] text-slate-500">
          {t.daysWorked - t.halfDay / 2}/{t.workingDays} din kaam · {t.late} late ({mins(t.lateMinutes)}) · {absentDays(t)} ghair hazir · {t.leave + t.unpaidLeave} chhutti · {hours(t.overtimeHours)} OT
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.6875rem] font-medium text-slate-500">
        {WEEK.map((d) => <span key={d} className="truncate py-1"><span className="sm:hidden">{d.slice(0, 2)}</span><span className="hidden sm:inline">{d}</span></span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {slots.map((key, i) => {
          if (!key) return <span key={`x${i}`} />;
          const c = row.days[key];
          const meta = CODE[c.code];
          const clickable = canCorrect && c.code !== 'FUT' && c.code !== 'NA';
          return (
            <button key={key} type="button" disabled={!clickable} onClick={() => onCell(row.staff, key, c)}
              aria-label={`${key}: ${meta.label}`}
              className={cn('flex min-h-[4.25rem] flex-col items-start rounded-xl p-1.5 text-left ring-1 ring-slate-100 transition sm:min-h-[5rem] sm:p-2',
                clickable && 'hover:ring-2 hover:ring-brand-400', key === sheet.today && 'ring-2 ring-brand-500')}>
              <span className="flex w-full items-center justify-between gap-1">
                <span className="text-[0.75rem] font-semibold tabular-nums text-slate-700">{Number(key.slice(8))}</span>
                {meta.short && <span className={cn('rounded px-1 text-[0.625rem] font-bold', meta.tone)}>{meta.short}</span>}
              </span>
              {c.in && (
                <span className="mt-1 block text-[0.625rem] leading-tight tabular-nums text-slate-600">
                  {clockOf(c.in, tz)}<span className="hidden sm:inline"> – {c.out ? clockOf(c.out, tz) : '…'}</span>
                </span>
              )}
              {c.late > 0 && <span className="block text-[0.625rem] font-medium text-amber-700">{mins(c.late)} late</span>}
              {c.ot > 0 && <span className="hidden text-[0.625rem] font-medium text-sky-700 sm:block">+{hours(c.ot)} OT</span>}
              {!c.in && c.code !== 'FUT' && c.code !== 'NA' && <span className="mt-1 hidden truncate text-[0.625rem] text-slate-400 sm:block">{meta.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
