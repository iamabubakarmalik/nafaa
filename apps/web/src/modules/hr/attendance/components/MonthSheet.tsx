/**
 * The month as a grid: one row per person, one coloured cell per day, and
 * the totals payroll needs on the right. A manager clicks a cell to fix it.
 */

import { cn } from '@core/lib/cn';
import type { AttStaff, DayCell, Sheet } from '../api/attendance.api';
import { CODE, LEGEND, absentDays, clockOf, dayLabel, hours, mins, weekdayShort } from './meta';

type Row = Sheet['rows'][number];

function cellTitle(name: string, key: string, c: DayCell, tz: string) {
  const parts = [`${name} · ${dayLabel(key, { weekday: 'short', day: 'numeric', month: 'short' })}`, CODE[c.code].label];
  if (c.in) parts.push(`Aaye ${clockOf(c.in, tz)}${c.out ? ` · gaye ${clockOf(c.out, tz)}` : ''}`);
  if (c.late) parts.push(`${mins(c.late)} late`);
  if (c.ot) parts.push(`${hours(c.ot)} overtime`);
  if (c.note) parts.push(c.note);
  return parts.join('\n');
}

export function MonthSheet({ sheet, rows, showShop, canCorrect, onCell }: {
  sheet: Sheet; rows: Row[]; showShop: boolean; canCorrect: boolean;
  onCell: (staff: AttStaff, key: string, cell: DayCell) => void;
}) {
  const tz = sheet.clock.tz;
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <table className="w-full border-separate border-spacing-0 text-[0.75rem]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[10rem] border-b border-slate-100 bg-white px-3 py-2 text-left font-semibold text-slate-600">Staff</th>
              {sheet.keys.map((k) => {
                const off = !sheet.byDay.find((d) => d.key === k)?.workingDay;
                return (
                  <th key={k} className={cn('border-b border-slate-100 px-0.5 py-1.5 text-center font-medium', k === sheet.today ? 'text-brand-700' : off ? 'text-slate-300' : 'text-slate-500')}>
                    <span className="block text-[0.625rem]">{weekdayShort(k)}</span>
                    <span className="block tabular-nums">{Number(k.slice(8))}</span>
                  </th>
                );
              })}
              <th className="border-b border-l border-slate-100 px-2 text-right font-semibold text-slate-600" title="Hazir + late + aadha din (aadha din adha gina)">Kaam</th>
              <th className="border-b border-slate-100 px-2 text-right font-semibold text-slate-600">Late</th>
              <th className="border-b border-slate-100 px-2 text-right font-semibold text-slate-600" title="Ghair hazir + jin dinon hazri nahi lagi">Ghair</th>
              <th className="border-b border-slate-100 px-2 text-right font-semibold text-slate-600">Chhutti</th>
              <th className="border-b border-slate-100 px-2 text-right font-semibold text-slate-600">OT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const t = r.totals;
              return (
                <tr key={r.staff.id} className="group">
                  <td className="sticky left-0 z-10 border-b border-slate-50 bg-white px-3 py-1.5 group-hover:bg-slate-50">
                    <span className="block max-w-[12rem] truncate font-semibold text-slate-900">{r.staff.fullName}</span>
                    <span className="block max-w-[12rem] truncate text-[0.6875rem] text-slate-400">{r.staff.designation}{showShop && r.staff.shop ? ` · ${r.staff.shop.name}` : ''}</span>
                  </td>
                  {sheet.keys.map((k) => {
                    const c = r.days[k];
                    const meta = CODE[c.code];
                    const clickable = canCorrect && c.code !== 'FUT' && c.code !== 'NA';
                    return (
                      <td key={k} className="border-b border-slate-50 px-0.5 py-1 text-center">
                        <button type="button" disabled={!clickable} onClick={() => onCell(r.staff, k, c)} title={cellTitle(r.staff.fullName, k, c, tz)}
                          aria-label={`${r.staff.fullName} ${k}: ${meta.label}`}
                          className={cn('mx-auto flex h-7 w-7 items-center justify-center rounded-md text-[0.6875rem] font-bold tabular-nums transition', meta.tone,
                            clickable && 'hover:ring-2 hover:ring-brand-400', k === sheet.today && 'outline outline-1 outline-offset-1 outline-brand-400')}>
                          {meta.short}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-b border-l border-slate-50 px-2 text-right font-semibold tabular-nums text-slate-900">{t.daysWorked - t.halfDay / 2}<span className="text-slate-400">/{t.workingDays}</span></td>
                  <td className={cn('border-b border-slate-50 px-2 text-right tabular-nums', t.late ? 'text-amber-700' : 'text-slate-400')} title={t.lateMinutes ? `${mins(t.lateMinutes)} kul` : undefined}>{t.late}</td>
                  <td className={cn('border-b border-slate-50 px-2 text-right tabular-nums', absentDays(t) ? 'text-rose-700' : 'text-slate-400')}>{absentDays(t)}</td>
                  <td className="border-b border-slate-50 px-2 text-right tabular-nums text-slate-700">{t.leave + t.unpaidLeave}</td>
                  <td className="border-b border-slate-50 px-2 text-right tabular-nums text-slate-700">{hours(t.overtimeHours)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 text-[0.6875rem] text-slate-500">
        {LEGEND.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span className={cn('flex h-5 w-5 items-center justify-center rounded text-[0.625rem] font-bold', CODE[c].tone)}>{CODE[c].short}</span>{CODE[c].label}
          </span>
        ))}
        {canCorrect && <span className="ml-auto">Kisi khane par click karein to theek kar sakte hain</span>}
      </div>
    </div>
  );
}
