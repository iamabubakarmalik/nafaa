/**
 * Gym labels, query keys and small helpers shared by the gym pages.
 */

import type { BadgeVariant } from '@/design-system/components';
import type { Goal, MemberState } from '../api/members.api';
import type { MembershipStatus } from '../api/memberships.api';
import type { PlanType } from '../api/membership-plans.api';
import { t as tr } from '@core/i18n';

/** React Query keys. Every gym list starts with one of these so a save can refresh them all. */
export const GYM_KEYS = {
  members: 'gym-members',
  memberships: 'gym-memberships',
  plans: 'gym-plans',
  attendance: 'gym-attendance',
  trainers: 'gym-trainers',
  pt: 'gym-pt',
  classes: 'gym-classes',
  equipment: 'gym-equipment',
  lockers: 'gym-lockers',
  ptPackages: 'gym-pt-packages',
} as const;

/** Keys to refresh after money moved (bill, khata, dashboard). */
export const MONEY_KEYS = [GYM_KEYS.members, GYM_KEYS.memberships, 'gym-dashboard', 'sales', 'customers', 'khata', 'dashboard'];

export const GOALS: Array<{ value: Goal; label: string }> = [
  { value: 'GENERAL_FITNESS', label: tr('Aam fitness') },
  { value: 'WEIGHT_LOSS', label: tr('Wazan kam') },
  { value: 'WEIGHT_GAIN', label: tr('Wazan barhana') },
  { value: 'MUSCLE_GAIN', label: tr('Muscle banana') },
  { value: 'BODY_BUILDING', label: tr('Body building') },
  { value: 'STRENGTH', label: tr('Taaqat') },
  { value: 'CARDIO', label: tr('Cardio') },
  { value: 'ENDURANCE', label: tr('Stamina') },
  { value: 'TONING', label: tr('Toning') },
  { value: 'FLEXIBILITY', label: tr('Lachak') },
  { value: 'REHABILITATION', label: tr('Chot ke baad') },
  { value: 'COMPETITION_PREP', label: tr('Muqabla tayyari') },
  { value: 'OTHER', label: tr('Doosra') },
];
export const goalLabel = (g?: string | null) => GOALS.find((x) => x.value === g)?.label ?? '—';

export const PLAN_TYPES: Array<{ value: PlanType; label: string; days: number }> = [
  { value: 'MONTHLY', label: tr('Mahana'), days: 30 },
  { value: 'QUARTERLY', label: tr('3 mahine'), days: 90 },
  { value: 'HALF_YEARLY', label: tr('6 mahine'), days: 180 },
  { value: 'YEARLY', label: tr('Saalana'), days: 365 },
  { value: 'WEEKLY', label: tr('Hafta'), days: 7 },
  { value: 'DAILY', label: tr('Ek din'), days: 1 },
  { value: 'PAY_PER_VISIT', label: tr('Visits wala'), days: 30 },
  { value: 'LIFETIME', label: tr('Lifetime'), days: 36500 },
  { value: 'CUSTOM', label: tr('Apna (couple, student, PT)'), days: 30 },
];
export const planTypeLabel = (t?: string | null) => PLAN_TYPES.find((x) => x.value === t)?.label ?? t ?? '—';

export const MEMBERSHIP_STATUS: Record<MembershipStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: tr('Chal rahi'), variant: 'success' },
  FROZEN: { label: tr('Freeze'), variant: 'info' },
  PAUSED: { label: tr('Ruki hui'), variant: 'info' },
  EXPIRED: { label: tr('Khatam'), variant: 'default' },
  CANCELLED: { label: tr('Cancel'), variant: 'danger' },
  PENDING_PAYMENT: { label: tr('Paisa baqi'), variant: 'warning' },
};

export const MEMBER_STATE: Record<MemberState, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: tr('Chal rahi'), variant: 'success' },
  EXPIRING: { label: tr('Jald khatam'), variant: 'warning' },
  EXPIRED: { label: tr('Khatam'), variant: 'danger' },
  FROZEN: { label: tr('Freeze'), variant: 'info' },
  UPCOMING: { label: tr('Abhi shuru nahi'), variant: 'info' },
  PENDING: { label: tr('Paisa baqi'), variant: 'warning' },
  NONE: { label: tr('Plan nahi'), variant: 'default' },
};

export const PT_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  SCHEDULED: { label: tr('Booked'), variant: 'info' },
  IN_PROGRESS: { label: tr('Chal raha'), variant: 'warning' },
  COMPLETED: { label: tr('Ho gaya'), variant: 'success' },
  CANCELLED: { label: tr('Cancel'), variant: 'danger' },
  NO_SHOW: { label: tr('Nahi aaya'), variant: 'default' },
};

export const WEEKDAYS = [tr('Itwar'), tr('Peer'), tr('Mangal'), tr('Budh'), tr('Jumeraat'), tr('Jumma'), tr('Hafta')];

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
export const num = (v: string) => v.replace(/[^\d.]/g, '');

export const dateOf = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const shortDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');
export const timeOf = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) : '—');
export const minutes = (m?: number | null) => (m == null ? '—' : m >= 60 ? tr('{{value}} ghanta{{value2}}', { value: Math.floor(m / 60), value2: m % 60 ? tr(' {{value}} min', { value: m % 60 }) : '' }) : tr('{{m}} min', { m }));

/** Today's date on this device as `yyyy-mm-dd`, for date inputs. */
export const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Local date and time inputs to ISO, read in this device's time zone. */
export const toIso = (date: string, time: string) => new Date(`${date}T${time || '00:00'}:00`).toISOString();

const DAY = 86_400_000;
/** Whole days from now until the end date; negative once it has passed. */
export const daysLeft = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DAY) : 0);

/** WhatsApp text reminding a member to renew or pay. */
export function reminderText(p: { name?: string | null; plan?: string | null; endDate?: string | null; due?: number; gym?: string | null }) {
  const left = daysLeft(p.endDate);
  const when = !p.endDate ? '' : left < 0 ? tr('{{endDate}} ko khatam ho chuki hai', { endDate: dateOf(p.endDate) }) : left === 0 ? tr('aaj khatam ho rahi hai') : tr('{{left}} din me ({{endDate}}) khatam ho rahi hai', { left, endDate: dateOf(p.endDate) });
  const lines = [
    `Assalam o Alaikum ${p.name ?? ''},`.trim(),
    p.endDate ? `Aap ki ${p.plan ?? 'gym'} membership ${when}.` : '',
    p.due && p.due > 0 ? `Baqi fee: Rs ${Math.round(p.due).toLocaleString('en-PK')}.` : '',
    'Renew karwa kar training jaari rakhein.',
    p.gym ? `— ${p.gym}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}
