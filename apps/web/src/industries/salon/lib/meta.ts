/**
 * Labels, colours and small helpers shared by the salon screens: appointment
 * status and source, service categories, staff roles, membership tiers, time and
 * money formatting, query keys and the API error text.
 */

import type { AppointmentSource, AppointmentStatus } from '../api/appointments.api';
import type { ServiceCategory } from '../api/services.api';
import type { StaffProfile, StaffRole } from '../api/staff-profiles.api';
import { t as tr } from '@core/i18n';

export const SALON_KEYS = {
  appointments: 'salon-appointments',
  services: 'salon-services',
  staff: 'salon-staff',
  memberships: 'salon-memberships',
  packages: 'salon-packages',
  customers: 'salon-customers',
  vouchers: 'salon-vouchers',
} as const;

export type Tone = 'default' | 'info' | 'warning' | 'success' | 'danger' | 'brand';

export const STATUS: Record<AppointmentStatus, { label: string; variant: Tone; color: string }> = {
  DRAFT: { label: tr('Kachchi'), variant: 'default', color: '#64748b' },
  CONFIRMED: { label: tr('Booked'), variant: 'info', color: '#2563eb' },
  RESCHEDULED: { label: tr('Waqt badla'), variant: 'info', color: '#0891b2' },
  ARRIVED: { label: tr('Aa gaye'), variant: 'brand', color: '#7c3aed' },
  IN_PROGRESS: { label: tr('Chair par'), variant: 'warning', color: '#d97706' },
  COMPLETED: { label: tr('Ho gaya'), variant: 'success', color: '#16a34a' },
  NO_SHOW: { label: tr('Nahi aaye'), variant: 'danger', color: '#e11d48' },
  CANCELLED: { label: tr('Cancel'), variant: 'danger', color: '#94a3b8' },
};

export const SOURCE_LABEL: Record<AppointmentSource, string> = {
  BOOKED: tr('Booking'),
  WALK_IN: tr('Walk-in'),
  COUNTER: tr('Counter'),
};

export const CATEGORIES: Array<{ value: ServiceCategory; label: string }> = [
  { value: 'HAIR_CUT', label: tr('Hair cut') },
  { value: 'HAIR_COLOR', label: tr('Hair colour') },
  { value: 'HAIR_TREATMENT', label: tr('Hair treatment') },
  { value: 'HAIR_STYLING', label: tr('Hair styling') },
  { value: 'KERATIN', label: tr('Keratin / rebonding') },
  { value: 'HAIR_EXTENSION', label: tr('Hair extension') },
  { value: 'BEARD_SHAVE', label: tr('Shave / beard') },
  { value: 'FACIAL', label: tr('Facial') },
  { value: 'MAKEUP', label: tr('Makeup') },
  { value: 'PARTY_MAKEUP', label: tr('Party makeup') },
  { value: 'BRIDAL_MAKEUP', label: tr('Bridal makeup') },
  { value: 'MEHNDI', label: tr('Mehndi') },
  { value: 'MANICURE', label: tr('Manicure') },
  { value: 'PEDICURE', label: tr('Pedicure') },
  { value: 'NAIL_ART', label: tr('Nail art') },
  { value: 'WAXING', label: tr('Waxing') },
  { value: 'THREADING', label: tr('Threading') },
  { value: 'MASSAGE', label: tr('Massage') },
  { value: 'BODY_TREATMENT', label: tr('Body treatment') },
  { value: 'SPA_PACKAGE', label: tr('Spa') },
  { value: 'BOTOX', label: tr('Botox / skin') },
  { value: 'OTHER', label: tr('Doosri') },
];
export const categoryLabel = (c?: string | null) => CATEGORIES.find((x) => x.value === c)?.label ?? tr('Doosri');

export const ROLES: Array<{ value: StaffRole; label: string }> = [
  { value: 'STYLIST', label: tr('Stylist') },
  { value: 'COLORIST', label: tr('Colourist') },
  { value: 'BEAUTICIAN', label: tr('Beautician') },
  { value: 'MAKEUP_ARTIST', label: tr('Makeup artist') },
  { value: 'NAIL_TECH', label: tr('Nail technician') },
  { value: 'MASSAGE_THERAPIST', label: tr('Massage') },
  { value: 'MEHNDI_ARTIST', label: tr('Mehndi artist') },
  { value: 'APPRENTICE', label: tr('Shagird') },
  { value: 'RECEPTIONIST', label: tr('Reception') },
  { value: 'MANAGER', label: tr('Manager') },
  { value: 'OTHER', label: tr('Doosra') },
];
export const roleLabel = (r?: string | null) => ROLES.find((x) => x.value === r)?.label ?? tr('Staff');

export const TIERS: Array<{ value: string; label: string; color: string }> = [
  { value: 'BRONZE', label: tr('Bronze'), color: '#b45309' },
  { value: 'SILVER', label: tr('Silver'), color: '#64748b' },
  { value: 'GOLD', label: tr('Gold'), color: '#ca8a04' },
  { value: 'PLATINUM', label: tr('Platinum'), color: '#0f766e' },
  { value: 'DIAMOND', label: tr('Diamond'), color: '#7c3aed' },
  { value: 'CUSTOM', label: tr('Custom'), color: '#db2777' },
];
export const tierOf = (t?: string | null) => TIERS.find((x) => x.value === t) ?? TIERS[5];

export const WEEKDAYS = [tr('Itwaar'), tr('Peer'), tr('Mangal'), tr('Budh'), tr('Jumeraat'), tr('Juma'), tr('Hafta')];

export const staffName = (s?: StaffProfile | null) => s?.staff?.fullName?.trim() || tr('Staff');

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

/** Empty text becomes undefined so the API keeps optional fields out. */
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

const pad = (n: number) => String(n).padStart(2, '0');
/** `yyyy-mm-dd` of a date on this device (shop time). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const timeOf = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) : '—');
export const dateOf = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const shortDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');
export const minutes = (m: number) => (m >= 60 ? tr('{{value}} ghanta{{value2}}', { value: Math.floor(m / 60), value2: m % 60 ? tr(' {{value}} min', { value: m % 60 }) : '' }) : tr('{{m}} min', { m }));

/** Local date and time inputs → ISO, read in this device's time zone. */
export const toIso = (date: string, time: string) => new Date(`${date}T${time || '00:00'}:00`).toISOString();

/** WhatsApp link to a Pakistani mobile number. */
export function waLink(phone: string | null | undefined, text: string) {
  const p = String(phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

/** First service and how many more, for one-line lists. */
export const serviceLine = (services?: Array<{ serviceName?: string }>) => {
  const first = services?.[0]?.serviceName || tr('Service');
  const more = (services?.length ?? 0) - 1;
  return more > 0 ? `${first} +${more}` : first;
};
