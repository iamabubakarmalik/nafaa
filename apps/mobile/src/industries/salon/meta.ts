/** Salon labels and helpers (mirror of the web salon lib/meta.ts). Labels are source keys marked with msg(). */

import { queryClient } from '@/core/query/client';
import { msg, t } from '@/core/i18n';
import { formatDate, formatTime } from '@/core/format';
import type { StatusTone } from '@/design';
import type { AppointmentStatus } from './api';

export const SALON_KEYS = { appointments: 'salon-appointments', calendar: 'salon-calendar', services: 'salon-services', staff: 'salon-staff', memberships: 'salon-memberships', plans: 'salon-plans', packages: 'salon-packages', vouchers: 'salon-vouchers', customers: 'salon-customers', dash: 'salon-dash', commission: 'salon-commission', perks: 'salon-perks' } as const;

const MONEY_KEYS = ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline'];
export function refreshSalon(keys: string[] = [], money = false) {
  [...Object.values(SALON_KEYS), ...keys, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const STATUS: Record<AppointmentStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: msg('Kachchi'), tone: 'neutral' }, CONFIRMED: { label: msg('Booked'), tone: 'info' }, RESCHEDULED: { label: msg('Waqt badla'), tone: 'info' },
  ARRIVED: { label: msg('Aa gaye'), tone: 'accent' }, IN_PROGRESS: { label: msg('Chair par'), tone: 'warning' }, COMPLETED: { label: msg('Ho gaya'), tone: 'success' },
  NO_SHOW: { label: msg('Nahi aaye'), tone: 'danger' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};

export const CATEGORIES = [
  ['HAIR_CUT', msg('Hair cut')], ['HAIR_COLOR', msg('Hair colour')], ['HAIR_TREATMENT', msg('Hair treatment')], ['HAIR_STYLING', msg('Hair styling')], ['KERATIN', msg('Keratin / rebonding')],
  ['HAIR_EXTENSION', msg('Hair extension')], ['BEARD_SHAVE', msg('Shave / beard')], ['FACIAL', msg('Facial')], ['MAKEUP', msg('Makeup')], ['PARTY_MAKEUP', msg('Party makeup')],
  ['BRIDAL_MAKEUP', msg('Bridal makeup')], ['MEHNDI', msg('Mehndi')], ['MANICURE', msg('Manicure')], ['PEDICURE', msg('Pedicure')], ['NAIL_ART', msg('Nail art')], ['WAXING', msg('Waxing')],
  ['THREADING', msg('Threading')], ['MASSAGE', msg('Massage')], ['BODY_TREATMENT', msg('Body treatment')], ['SPA_PACKAGE', msg('Spa')], ['BOTOX', msg('Botox / skin')], ['OTHER', msg('Doosri')],
] as const;
export const categoryOptions = () => CATEGORIES.map(([value, label]) => ({ value, label: t(label) }));
export const categoryLabel = (c?: string | null) => t(CATEGORIES.find(([v]) => v === c)?.[1] ?? msg('Doosri'));

export const ROLES = [
  ['STYLIST', msg('Stylist')], ['COLORIST', msg('Colourist')], ['BEAUTICIAN', msg('Beautician')], ['MAKEUP_ARTIST', msg('Makeup artist')], ['NAIL_TECH', msg('Nail technician')],
  ['MASSAGE_THERAPIST', msg('Massage')], ['MEHNDI_ARTIST', msg('Mehndi artist')], ['APPRENTICE', msg('Shagird')], ['RECEPTIONIST', msg('Reception')], ['MANAGER', msg('Manager')], ['OTHER', msg('Doosra')],
] as const;
export const roleOptions = () => ROLES.map(([value, label]) => ({ value, label: t(label) }));
export const roleLabel = (r?: string | null) => t(ROLES.find(([v]) => v === r)?.[1] ?? msg('Staff'));

export const COMMISSION_TYPES = [['NONE', msg('Koi nahi')], ['PERCENTAGE', msg('Percent')], ['FIXED_PER_SERVICE', msg('Fixed per service')], ['HYBRID', msg('Percent + fixed')]] as const;
export const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CUSTOM'] as const;
export const tierOptions = () => TIERS.map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase() }));
export const WEEKDAYS = [msg('Itwaar'), msg('Peer'), msg('Mangal'), msg('Budh'), msg('Jumeraat'), msg('Juma'), msg('Hafta')];

export const staffName = (s?: { staff?: { fullName?: string } | null } | null) => s?.staff?.fullName?.trim() || t('Staff');
export const timeOf = (iso?: string | null) => (iso ? formatTime(iso) : '—');
export const dateOf = (iso?: string | null) => (iso ? formatDate(iso, { year: true }) : '—');
export const serviceLine = (services?: Array<{ serviceName?: string }>) => {
  const first = services?.[0]?.serviceName || t('Service');
  const more = (services?.length ?? 0) - 1;
  return more > 0 ? `${first} +${more}` : first;
};
export const minutesText = (m: number) => (m >= 60 ? (m % 60 ? t('{{h}} ghanta {{m}} min', { h: Math.floor(m / 60), m: m % 60 }) : t('{{h}} ghanta', { h: Math.floor(m / 60) })) : t('{{m}} min', { m }));
/** Shop wall-clock date and time (Asia/Karachi, UTC+5, no daylight saving) to an ISO instant. */
export const toIso = (date: string, time: string) => new Date(`${date}T${time || '00:00'}:00+05:00`).toISOString();
