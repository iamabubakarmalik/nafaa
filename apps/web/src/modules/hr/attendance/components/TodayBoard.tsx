/**
 * Today's board: one line per person with where they are now, check-in and
 * check-out time on the shop's clock, late minutes and branch, plus the
 * check-in / check-out buttons and the manager's fix button.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LogIn, LogOut, PencilLine } from 'lucide-react';
import { Avatar } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { attendanceApi, type AttStaff, type Board, type DayCell } from '../api/attendance.api';
import { ATT_KEY, LEAVE_TYPE, LIVE, clockOf, hours, liveState, mins } from './meta';

type Row = Board['rows'][number];

export function TodayBoard({ rows, board, showShop, canPunch, canCorrect, onCorrect }: {
  rows: Row[]; board: Board; showShop: boolean; canPunch: boolean; canCorrect: boolean;
  onCorrect: (staff: AttStaff, cell: DayCell) => void;
}) {
  const qc = useQueryClient();
  const onError = (e: { response?: { data?: { message?: string | string[] } } }) => {
    const m = e?.response?.data?.message;
    toast.error(Array.isArray(m) ? m[0] : m ?? 'Nahi hua');
  };
  const punchIn = useMutation({
    mutationFn: (s: AttStaff) => attendanceApi.checkIn(s.id),
    onSuccess: (r, s) => { toast.success(r.already ? `${s.fullName} pehle hi check-in kar chuke` : `${s.fullName} — check-in ho gaya`); void qc.invalidateQueries({ queryKey: [ATT_KEY] }); },
    onError,
  });
  const punchOut = useMutation({
    mutationFn: (s: AttStaff) => attendanceApi.checkOut(s.id),
    onSuccess: (r, s) => { toast.success(r.already ? `${s.fullName} pehle hi ja chuke` : `${s.fullName} — check-out ho gaya`); void qc.invalidateQueries({ queryKey: [ATT_KEY] }); },
    onError,
  });
  const busy = (id: string) => (punchIn.isPending && punchIn.variables?.id === id) || (punchOut.isPending && punchOut.variables?.id === id);
  const tz = board.clock.tz;

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {rows.map(({ staff, day }) => {
        const st = LIVE[liveState(day)];
        const sinceIn = day.in && !day.out ? Math.round((Date.now() - new Date(day.in).getTime()) / 60_000) : 0;
        return (
          <li key={staff.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap sm:px-4">
            <Avatar name={staff.fullName} url={staff.avatarUrl} size={40} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold text-slate-900">{staff.fullName}</span>
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>
                  <st.icon className="h-3 w-3" />{st.label}
                </span>
                {day.late > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-800 ring-1 ring-amber-200">{mins(day.late)} late</span>}
                {day.code === 'H' && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[0.6875rem] font-medium text-sky-700 ring-1 ring-sky-200">Aadha din</span>}
              </span>
              <span className="mt-0.5 block truncate text-[0.75rem] text-slate-400">
                {staff.designation}{showShop && staff.shop ? ` · ${staff.shop.name}` : ''}
                {day.leaveType ? ` · ${LEAVE_TYPE[day.leaveType]}` : ''}
                {day.note ? ` · ${day.note}` : ''}
              </span>
            </span>
            <span className="text-right">
              <span className="block text-[0.6875rem] text-slate-400">Aaye · gaye</span>
              <span className="block text-[0.8125rem] tabular-nums text-slate-700">{clockOf(day.in, tz)} · {clockOf(day.out, tz)}</span>
            </span>
            <span className="hidden w-24 text-right sm:block">
              <span className="block text-[0.6875rem] text-slate-400">{day.out ? 'Kaam kiya' : sinceIn ? 'Andar' : ' '}</span>
              <span className="block text-[0.8125rem] font-semibold tabular-nums text-slate-900">
                {day.out ? hours(day.worked) : sinceIn ? mins(sinceIn) : ''}
                {day.ot > 0 && <span className="ml-1 text-[0.6875rem] font-medium text-emerald-700">+{hours(day.ot)} OT</span>}
              </span>
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              {canPunch && !day.in && (
                <button type="button" disabled={busy(staff.id)} onClick={() => punchIn.mutate(staff)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[0.8125rem] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                  <LogIn className="h-4 w-4" /> Check-in
                </button>
              )}
              {canPunch && day.in && !day.out && (
                <button type="button" disabled={busy(staff.id)} onClick={() => punchOut.mutate(staff)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[0.8125rem] font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50">
                  <LogOut className="h-4 w-4" /> Check-out
                </button>
              )}
              {canCorrect && (
                <button type="button" onClick={() => onCorrect(staff, day)} title="Hazri theek karein" aria-label="Hazri theek karein"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50">
                  <PencilLine className="h-4 w-4" />
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
