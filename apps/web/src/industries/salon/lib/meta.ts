/**
 * Labels, colours and small helpers shared by the salon screens: appointment
 * status and source, service categories, staff roles, membership tiers, time and
 * money formatting, query keys and the API error text.
 */

import type { AppointmentSource, AppointmentStatus } from '../api/appointments.api';
import type { ServiceCategory } from '../api/services.api';
import type { StaffProfile, StaffRole } from '../api/staff-profiles.api';

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
  DRAFT: { label: 'Kachchi', variant: 'default', color: '#64748b' },
  CONFIRMED: { label: 'Booked', variant: 'info', color: '#2563eb' },
  RESCHEDULED: { label: 'Waqt badla', variant: 'info', color: '#0891b2' },
  ARRIVED: { label: 'Aa gaye', variant: 'brand', color: '#7c3aed' },
  IN_PROGRESS: { label: 'Chair par', variant: 'warning', color: '#d97706' },
  COMPLETED: { label: 'Ho gaya', variant: 'success', color: '#16a34a' },
  NO_SHOW: { label: 'Nahi aaye', variant: 'danger', color: '#e11d48' },
  CANCELLED: { label: 'Cancel', variant: 'danger', color: '#94a3b8' },
};

export const SOURCE_LABEL: Record<AppointmentSource, string> = {
  BOOKED: 'Booking',
  WALK_IN: 'Walk-in',
  COUNTER: 'Counter',
};

export const CATEGORIES: Array<{ value: ServiceCategory; label: string }> = [
  { value: 'HAIR_CUT', label: 'Hair cut' },
  { value: 'HAIR_COLOR', label: 'Hair colour' },
  { value: 'HAIR_TREATMENT', label: 'Hair treatment' },
  { value: 'HAIR_STYLING', label: 'Hair styling' },
  { value: 'KERATIN', label: 'Keratin / rebonding' },
  { value: 'HAIR_EXTENSION', label: 'Hair extension' },
  { value: 'BEARD_SHAVE', label: 'Shave / beard' },
  { value: 'FACIAL', label: 'Facial' },
  { value: 'MAKEUP', label: 'Makeup' },
  { value: 'PARTY_MAKEUP', label: 'Party makeup' },
  { value: 'BRIDAL_MAKEUP', label: 'Bridal makeup' },
  { value: 'MEHNDI', label: 'Mehndi' },
  { value: 'MANICURE', label: 'Manicure' },
  { value: 'PEDICURE', label: 'Pedicure' },
  { value: 'NAIL_ART', label: 'Nail art' },
  { value: 'WAXING', label: 'Waxing' },
  { value: 'THREADING', label: 'Threading' },
  { value: 'MASSAGE', label: 'Massage' },
  { value: 'BODY_TREATMENT', label: 'Body treatment' },
  { value: 'SPA_PACKAGE', label: 'Spa' },
  { value: 'BOTOX', label: 'Botox / skin' },
  { value: 'OTHER', label: 'Doosri' },
];
export const categoryLabel = (c?: string | null) => CATEGORIES.find((x) => x.value === c)?.label ?? 'Doosri';

export const ROLES: Array<{ value: StaffRole; label: string }> = [
  { value: 'STYLIST', label: 'Stylist' },
  { value: 'COLORIST', label: 'Colourist' },
  { value: 'BEAUTICIAN', label: 'Beautician' },
  { value: 'MAKEUP_ARTIST', label: 'Makeup artist' },
  { value: 'NAIL_TECH', label: 'Nail technician' },
  { value: 'MASSAGE_THERAPIST', label: 'Massage' },
  { value: 'MEHNDI_ARTIST', label: 'Mehndi artist' },
  { value: 'APPRENTICE', label: 'Shagird' },
  { value: 'RECEPTIONIST', label: 'Reception' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'OTHER', label: 'Doosra' },
];
export const roleLabel = (r?: string | null) => ROLES.find((x) => x.value === r)?.label ?? 'Staff';

export const TIERS: Array<{ value: string; label: string; color: string }> = [
  { value: 'BRONZE', label: 'Bronze', color: '#b45309' },
  { value: 'SILVER', label: 'Silver', color: '#64748b' },
  { value: 'GOLD', label: 'Gold', color: '#ca8a04' },
  { value: 'PLATINUM', label: 'Platinum', color: '#0f766e' },
  { value: 'DIAMOND', label: 'Diamond', color: '#7c3aed' },
  { value: 'CUSTOM', label: 'Custom', color: '#db2777' },
];
export const tierOf = (t?: string | null) => TIERS.find((x) => x.value === t) ?? TIERS[5];

export const WEEKDAYS = ['Itwaar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

export const staffName = (s?: StaffProfile | null) => s?.staff?.fullName?.trim() || 'Staff';

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
export const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} ghanta${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

/** Local date and time inputs → ISO, read in this device's time zone. */
export const toIso = (date: string, time: string) => new Date(`${date}T${time || '00:00'}:00`).toISOString();

/** WhatsApp link to a Pakistani mobile number. */
export function waLink(phone: string | null | undefined, text: string) {
  const p = String(phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

/** First service and how many more, for one-line lists. */
export const serviceLine = (services?: Array<{ serviceName?: string }>) => {
  const first = services?.[0]?.serviceName || 'Service';
  const more = (services?.length ?? 0) - 1;
  return more > 0 ? `${first} +${more}` : first;
};
