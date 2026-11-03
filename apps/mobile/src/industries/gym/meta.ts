/** Gym labels and helpers (mirror of the web gym lib/meta.ts). Labels are source keys marked with msg(). */

import { queryClient } from '@/core/query/client';
import { msg, t } from '@/core/i18n';
import { formatDate, formatTime } from '@/core/format';
import type { StatusTone } from '@/design';
import type { MemberState } from './api';

export const GYM_KEYS = { members: 'gym-members', memberships: 'gym-memberships', plans: 'gym-plans', attendance: 'gym-attendance', trainers: 'gym-trainers', classes: 'gym-classes', lockers: 'gym-lockers', equipment: 'gym-equipment', pt: 'gym-pt', dash: 'gym-dash' } as const;

const MONEY_KEYS = ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline'];
export function refreshGym(money = false) {
  [...Object.values(GYM_KEYS), ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const MEMBER_STATE: Record<MemberState, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Chal rahi'), tone: 'success' }, EXPIRING: { label: msg('Jald khatam'), tone: 'warning' }, EXPIRED: { label: msg('Khatam'), tone: 'danger' }, FROZEN: { label: msg('Freeze'), tone: 'info' },
  UPCOMING: { label: msg('Abhi shuru nahi'), tone: 'info' }, PENDING: { label: msg('Paisa baqi'), tone: 'warning' }, NONE: { label: msg('Plan nahi'), tone: 'neutral' },
};

export const PLAN_TYPES = [['DAILY', msg('Daily')], ['WEEKLY', msg('Weekly')], ['MONTHLY', msg('Monthly')], ['QUARTERLY', msg('3 mahine')], ['HALF_YEARLY', msg('6 mahine')], ['YEARLY', msg('Saal')], ['LIFETIME', msg('Lifetime')], ['PAY_PER_VISIT', msg('Per visit')], ['CUSTOM', msg('Custom')]] as const;
export const planTypeOptions = () => PLAN_TYPES.map(([value, label]) => ({ value, label: t(label) }));
export const planDays: Record<string, number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30, QUARTERLY: 90, HALF_YEARLY: 180, YEARLY: 365, LIFETIME: 36500, PAY_PER_VISIT: 1, CUSTOM: 30 };

export const TRAINER_ROLES = [['HEAD_TRAINER', msg('Head trainer')], ['PERSONAL_TRAINER', msg('Personal trainer')], ['YOGA_INSTRUCTOR', msg('Yoga')], ['ZUMBA_INSTRUCTOR', msg('Zumba')], ['CROSSFIT_COACH', msg('CrossFit')], ['CARDIO_COACH', msg('Cardio')], ['STRENGTH_COACH', msg('Strength')], ['NUTRITIONIST', msg('Nutritionist')], ['BOXING_COACH', msg('Boxing')], ['OTHER', msg('Doosra')]] as const;
export const trainerRoleOptions = () => TRAINER_ROLES.map(([value, label]) => ({ value, label: t(label) }));
export const trainerRoleLabel = (r?: string) => t(TRAINER_ROLES.find(([v]) => v === r)?.[1] ?? msg('Trainer'));

export const CLASS_TYPES = ['YOGA', 'ZUMBA', 'AEROBICS', 'CROSSFIT', 'HIIT', 'SPINNING', 'BOXING', 'KICKBOXING', 'MMA', 'KARATE', 'DANCE', 'PILATES', 'STRETCHING', 'BOOTCAMP', 'MEDITATION', 'OTHER'] as const;
export const classTypeOptions = () => CLASS_TYPES.map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase().replace('_', ' ') }));
export const EQUIPMENT_CATEGORIES = ['CARDIO', 'STRENGTH', 'FREE_WEIGHTS', 'MACHINES', 'FUNCTIONAL', 'YOGA_MAT', 'BOXING', 'CROSSFIT', 'ACCESSORIES', 'OTHER'] as const;
export const equipmentCategoryOptions = () => EQUIPMENT_CATEGORIES.map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase().replace('_', ' ') }));
export const EQUIPMENT_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  AVAILABLE: { label: msg('Theek'), tone: 'success' }, IN_USE: { label: msg('Chal rahi'), tone: 'info' }, MAINTENANCE: { label: msg('Maintenance'), tone: 'warning' }, OUT_OF_ORDER: { label: msg('Kharab'), tone: 'danger' }, RESERVED: { label: msg('Reserved'), tone: 'neutral' }, RETIRED: { label: msg('Band'), tone: 'neutral' },
};
export const PT_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: msg('Booked'), tone: 'info' }, CONFIRMED: { label: msg('Booked'), tone: 'info' }, IN_PROGRESS: { label: msg('Chal raha'), tone: 'warning' }, COMPLETED: { label: msg('Ho gaya'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' }, NO_SHOW: { label: msg('Nahi aaye'), tone: 'danger' },
};

export const timeOf = (iso?: string | null) => (iso ? formatTime(iso) : '—');
export const dateOf = (iso?: string | null) => (iso ? formatDate(iso, { year: true }) : '—');
/** Shop wall-clock date and time (Asia/Karachi, UTC+5, no daylight saving) to an ISO instant. */
export const toIso = (date: string, time: string) => new Date(`${date}T${time || '00:00'}:00+05:00`).toISOString();
export const memberName = (m?: { customer?: { name?: string } | null; memberNumber?: string } | null) => m?.customer?.name ?? m?.memberNumber ?? '—';
