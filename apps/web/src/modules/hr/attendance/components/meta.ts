/**
 * Day codes, labels, colours and small helpers shared by the attendance
 * page, its dialogs, analytics, print-outs and CSV.
 */

import { CalendarOff, CheckCircle2, Clock, Coffee, LogIn, LogOut, Palmtree, UserX, type LucideIcon } from 'lucide-react';
import type { DayCell, DayCode, LeaveStatus, LeaveType, Totals } from '../api/attendance.api';

export const ATT_KEY = 'attendance';

export const CODE: Record<DayCode, { short: string; label: string; tone: string; color: string }> = {
  P: { short: 'P', label: 'Hazir', tone: 'bg-emerald-100 text-emerald-800', color: '#16a34a' },
  L: { short: 'L', label: 'Late', tone: 'bg-amber-100 text-amber-800', color: '#d97706' },
  H: { short: '½', label: 'Aadha din', tone: 'bg-sky-100 text-sky-800', color: '#0284c7' },
  A: { short: 'A', label: 'Ghair hazir', tone: 'bg-rose-100 text-rose-800', color: '#e11d48' },
  LV: { short: 'C', label: 'Chhutti', tone: 'bg-violet-100 text-violet-800', color: '#7c3aed' },
  HO: { short: 'T', label: 'Tehwar / band', tone: 'bg-slate-200 text-slate-700', color: '#64748b' },
  OFF: { short: '·', label: 'Hafta war chhutti', tone: 'bg-slate-100 text-slate-400', color: '#94a3b8' },
  NONE: { short: '—', label: 'Hazri nahi lagi', tone: 'bg-rose-50 text-rose-500 ring-1 ring-inset ring-rose-200', color: '#fb7185' },
  NA: { short: '', label: 'Naukri par nahi tha', tone: 'bg-transparent text-slate-300', color: '#cbd5e1' },
  FUT: { short: '', label: 'Abhi aana hai', tone: 'bg-transparent text-slate-300', color: '#cbd5e1' },
};

/** Legend order on the sheet and print-out. */
export const LEGEND: DayCode[] = ['P', 'L', 'H', 'A', 'LV', 'HO', 'OFF', 'NONE'];

/** What a person is doing right now, for the board. */
export type LiveState = 'inside' | 'out' | 'notIn' | 'absent' | 'leave' | 'off';

export const LIVE: Record<LiveState, { label: string; hint: string; icon: LucideIcon; color: string; tone: string }> = {
  inside: { label: 'Andar hain', hint: 'Check-in ho chuka', icon: LogIn, color: '#16a34a', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  out: { label: 'Ja chuke', hint: 'Check-out ho chuka', icon: LogOut, color: '#475569', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  notIn: { label: 'Abhi nahi aaye', hint: 'Check-in baqi', icon: Clock, color: '#e11d48', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  absent: { label: 'Ghair hazir', hint: 'Absent lagaya gaya', icon: UserX, color: '#be123c', tone: 'bg-rose-100 text-rose-800 ring-rose-200' },
  leave: { label: 'Chhutti par', hint: 'Approve chhutti', icon: Palmtree, color: '#7c3aed', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  off: { label: 'Aaj off', hint: 'Hafta war chhutti ya tehwar', icon: CalendarOff, color: '#64748b', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export function liveState(c: DayCell): LiveState {
  if (c.in) return c.out ? 'out' : 'inside';
  if (c.code === 'A') return 'absent';
  if (c.code === 'LV') return 'leave';
  if (c.code === 'OFF' || c.code === 'HO') return 'off';
  return 'notIn';
}

export const LEAVE_TYPE: Record<LeaveType, string> = {
  CASUAL: 'Aam chhutti', SICK: 'Beemari', ANNUAL: 'Salana', UNPAID: 'Bina tankhwah', EMERGENCY: 'Emergency', MATERNITY: 'Maternity', OTHER: 'Koi aur',
};

export const LEAVE_STATUS: Record<LeaveStatus, { label: string; tone: string; icon: LucideIcon }> = {
  PENDING: { label: 'Faisla baqi', tone: 'bg-amber-50 text-amber-800 ring-amber-200', icon: Clock },
  APPROVED: { label: 'Approve', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  REJECTED: { label: 'Na-approve', tone: 'bg-rose-50 text-rose-700 ring-rose-200', icon: UserX },
  CANCELLED: { label: 'Cancel', tone: 'bg-slate-100 text-slate-600 ring-slate-200', icon: Coffee },
};

/** Time of an instant on the shop's clock. */
export const clockOf = (iso: string | null | undefined, tz: string) =>
  iso ? new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', timeZone: tz }) : '—';

/** HH:mm of an instant on the shop's clock, for time inputs. */
export function hhmm(iso: string | null | undefined, tz: string) {
  if (!iso) return '';
  const p = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).formatToParts(new Date(iso));
  return `${p.find((x) => x.type === 'hour')?.value ?? '00'}:${p.find((x) => x.type === 'minute')?.value ?? '00'}`;
}

export const mins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}g ${m % 60}m` : `${m} min`);
export const hours = (h: number) => (h ? `${Math.round(h * 10) / 10} g` : '0');

export const dayLabel = (key: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('en-PK', opts);

export const weekdayShort = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('en-PK', { weekday: 'narrow' });

/** First and last day of a YYYY-MM month. */
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

/** The last 12 months, newest first, as YYYY-MM with a label. */
export function recentMonths(today: string) {
  const [y, m] = today.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    return { value, label: d.toLocaleDateString('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
  });
}

export const monthLabel = (month: string) => new Date(`${month}-15T12:00:00Z`).toLocaleDateString('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Days counted absent: marked absent plus past working days with no mark. */
export const absentDays = (t: Totals) => t.absent + t.missing;

/** Downloads rows as a UTF-8 CSV that Excel opens with Urdu names intact. */
export function downloadCsv(name: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
