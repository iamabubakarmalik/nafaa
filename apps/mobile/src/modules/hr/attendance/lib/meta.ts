/**
 * Day codes, labels, tones and date helpers shared by the attendance screens.
 * Business dates are "YYYY-MM-DD" keys on the shop's clock (Asia/Karachi).
 */

import {
  CalendarOff, CheckCircle2, Clock, Coffee, LogIn, LogOut, Palmtree, UserX, type LucideIcon,
} from 'lucide-react-native';
import { formatDate, formatTime, pkParts } from '@/core/format';
import { msg, t } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { DayCell, DayCode, LeaveStatus, LeaveType, Totals } from '../api/attendance';

export const ATT_KEY = 'hr-attendance';

export const CODE: Record<DayCode, { short: string; label: string; tone: StatusTone | null }> = {
  P: { short: 'P', label: msg('Hazir'), tone: 'success' },
  L: { short: 'L', label: msg('Late'), tone: 'warning' },
  H: { short: '½', label: msg('Aadha din'), tone: 'info' },
  A: { short: 'A', label: msg('Ghair hazir'), tone: 'danger' },
  LV: { short: 'C', label: msg('Chhutti'), tone: 'accent' },
  HO: { short: 'T', label: msg('Tehwar / band'), tone: 'neutral' },
  OFF: { short: '·', label: msg('Hafta war chhutti'), tone: 'neutral' },
  NONE: { short: '—', label: msg('Hazri nahi lagi'), tone: 'danger' },
  NA: { short: '', label: msg('Naukri par nahi tha'), tone: null },
  FUT: { short: '', label: msg('Abhi aana hai'), tone: null },
};

export const LEGEND: DayCode[] = ['P', 'L', 'H', 'A', 'LV', 'HO', 'OFF', 'NONE'];

export type LiveState = 'inside' | 'out' | 'notIn' | 'absent' | 'leave' | 'off';

export const LIVE: Record<LiveState, { label: string; icon: LucideIcon; tone: StatusTone }> = {
  inside: { label: msg('Andar hain'), icon: LogIn, tone: 'success' },
  out: { label: msg('Ja chuke'), icon: LogOut, tone: 'neutral' },
  notIn: { label: msg('Abhi nahi aaye'), icon: Clock, tone: 'danger' },
  absent: { label: msg('Ghair hazir'), icon: UserX, tone: 'danger' },
  leave: { label: msg('Chhutti par'), icon: Palmtree, tone: 'accent' },
  off: { label: msg('Aaj off'), icon: CalendarOff, tone: 'neutral' },
};

export function liveState(c: DayCell): LiveState {
  if (c.in) return c.out ? 'out' : 'inside';
  if (c.code === 'A') return 'absent';
  if (c.code === 'LV') return 'leave';
  if (c.code === 'OFF' || c.code === 'HO') return 'off';
  return 'notIn';
}

export const LEAVE_TYPE: Record<LeaveType, string> = {
  CASUAL: msg('Aam chhutti'), SICK: msg('Beemari'), ANNUAL: msg('Salana'), UNPAID: msg('Bina tankhwah'),
  EMERGENCY: msg('Emergency'), MATERNITY: msg('Maternity'), OTHER: msg('Koi aur'),
};

export const LEAVE_STATUS: Record<LeaveStatus, { label: string; tone: StatusTone; icon: LucideIcon }> = {
  PENDING: { label: msg('Faisla baqi'), tone: 'warning', icon: Clock },
  APPROVED: { label: msg('Approved'), tone: 'success', icon: CheckCircle2 },
  REJECTED: { label: msg('Na-approve'), tone: 'danger', icon: UserX },
  CANCELLED: { label: msg('Cancel'), tone: 'neutral', icon: Coffee },
};

/** A business date key as a moment (noon in Pakistan, so it never slips a day). */
export const atNoon = (key: string) => new Date(`${key}T12:00:00+05:00`);

export const clockOf = (iso: string | null | undefined) => (iso ? formatTime(iso) : '—');

/** "08:30" of an instant on the shop's clock, for the correction form. */
export function hhmm(iso: string | null | undefined): string {
  if (!iso) return '';
  const p = pkParts(iso);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** The date picker works with the phone's own wall clock; these convert to business keys. */
export const keyOfDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dateOfKey = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const timeOfHhmm = (value: string) => { const [h, m] = (value || '09:00').split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; };
export const hhmmOfDate = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export const mins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : t('{{count}} min', { count: m }));
export const hours = (h: number) => (h ? `${Math.round(h * 10) / 10} h` : '0');

export const dayLabel = (key: string) => formatDate(atNoon(key), { year: false });
export const dayLabelYear = (key: string) => formatDate(atNoon(key));

/** First and last day of a YYYY-MM month. */
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

const MONTHS = [msg('January'), msg('February'), msg('March'), msg('April'), msg('May'), msg('June'), msg('July'), msg('August'), msg('September'), msg('October'), msg('November'), msg('December')];
export const monthLabel = (month: string) => `${t(MONTHS[Number(month.slice(5, 7)) - 1] ?? '')} ${month.slice(0, 4)}`;

export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Days counted absent: marked absent plus past working days with no mark. */
export const absentDays = (x: Totals) => x.absent + x.missing;

export const mondayIndex = (key: string) => (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7;
