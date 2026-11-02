/** Labels, tones and small formatters shared by the dairy pages. */

import { Moon, Sun, Sunrise, Sunset, type LucideIcon } from 'lucide-react';
import { t as tr } from '@core/i18n';

export type Slot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export const SLOTS: Record<Slot, { label: string; icon: LucideIcon }> = {
  MORNING: { label: tr('Subah'), icon: Sunrise },
  AFTERNOON: { label: tr('Dopahar'), icon: Sun },
  EVENING: { label: tr('Shaam'), icon: Sunset },
  NIGHT: { label: tr('Raat'), icon: Moon },
};
export const slotLabel = (s?: string | null) => (s && s in SLOTS ? SLOTS[s as Slot].label : s ?? '—');

export const FREQUENCY: Record<string, { label: string; hint: string }> = {
  DAILY: { label: tr('Roz'), hint: tr('Subah aur shaam dono, jo quantity likhi ho') },
  MORNING_EVENING: { label: tr('Subah + shaam'), hint: tr('Dono waqt') },
  MORNING_ONLY: { label: tr('Sirf subah'), hint: tr('Shaam ki list me nahi aata') },
  EVENING_ONLY: { label: tr('Sirf shaam'), hint: tr('Subah ki list me nahi aata') },
  ALTERNATE_DAY: { label: tr('Ek din chhor kar'), hint: tr('Har doosre din') },
  WEEKLY: { label: tr('Hafte me ek dafa'), hint: tr('Har Monday') },
  ON_DEMAND: { label: tr('Jab maange'), hint: tr('Roz ki list me nahi — delivery khud jorein') },
};

export const CUSTOMER_STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: tr('Chalu'), tone: 'bg-success-50 text-success-700 ring-success-200' },
  SUSPENDED: { label: tr('Ruka hua'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  CLOSED: { label: tr('Band'), tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  DEFAULTED: { label: tr('Paisa phansa'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const DELIVERY_STATUS: Record<string, { label: string; tone: string }> = {
  SCHEDULED: { label: tr('Baqi'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  DELIVERED: { label: tr('Pohancha'), tone: 'bg-success-50 text-success-700 ring-success-200' },
  SKIPPED: { label: tr('Naga'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  MISSED: { label: tr('Reh gaya'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  RETURNED: { label: tr('Wapas'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

/** Gawala payment cycle. */
export const CYCLE: Record<string, string> = { DAILY: tr('Roz'), WEEKLY: tr('Hafta'), BIWEEKLY: '15 din', MONTHLY: tr('Mahina'), QUARTERLY: '3 mahine' };

export const QUALITY: Record<string, { label: string; tone: string }> = {
  A_GRADE: { label: tr('A grade'), tone: 'bg-success-50 text-success-700 ring-success-200' },
  B_GRADE: { label: tr('B grade'), tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  C_GRADE: { label: tr('C grade'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  REJECTED: { label: tr('Wapas kiya'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const PAY_METHODS = [
  { value: 'CASH', label: tr('Cash') },
  { value: 'JAZZCASH', label: tr('JazzCash') },
  { value: 'EASYPAISA', label: tr('EasyPaisa') },
  { value: 'BANK_TRANSFER', label: tr('Bank') },
  { value: 'CARD', label: tr('Card') },
];

export const MONTHS = [tr('Jan'), tr('Feb'), tr('Mar'), tr('Apr'), tr('May'), tr('Jun'), tr('Jul'), tr('Aug'), tr('Sep'), tr('Oct'), tr('Nov'), tr('Dec')];
export const monthLabel = (m: number, y: number) => `${MONTHS[m - 1] ?? m} ${y}`;

/** 12.5 → "12.5", 3 → "3". */
export const qty = (n: number | null | undefined) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
};
export const liters = (n: number | null | undefined) => `${qty(n)} L`;

export const shortDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(v)) : '—';
export const dateTime = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v)) : '—';

/** `yyyy-mm-dd` of a local date. */
export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const shiftDay = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days));
};

/** Slot the counter is in now: evening from 3 pm. */
export const slotNow = (): Slot => (new Date().getHours() >= 15 ? 'EVENING' : 'MORNING');

export const errorText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;

export const phoneOk = (v: string) => !v.trim() || /^[0-9+\-\s]{10,15}$/.test(v.trim());
export const cnicOk = (v: string) => !v.trim() || /^\d{5}-?\d{7}-?\d$/.test(v.trim());

/** Number typed in a text box ("1,200" → 1200); empty → null. */
export const numIn = (v: string): number | null => {
  const t = v.replace(/[^\d.-]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** React Query keys for this industry. */
export const DAIRY_KEYS = {
  customers: 'dairy-customers',
  customer: 'dairy-customer',
  deliveries: 'dairy-deliveries',
  farmers: 'dairy-farmers',
  farmer: 'dairy-farmer',
  supplies: 'dairy-supplies',
  bills: 'dairy-bills',
  routes: 'dairy-routes',
  tests: 'dairy-tests',
  production: 'dairy-production',
  profiles: 'dairy-profiles',
} as const;

/** Every dairy query that money or stock changes touch. */
export const MONEY_KEYS = [
  DAIRY_KEYS.customers, DAIRY_KEYS.customer, DAIRY_KEYS.deliveries, DAIRY_KEYS.bills, DAIRY_KEYS.farmers, DAIRY_KEYS.farmer, DAIRY_KEYS.supplies,
  'dairy-dashboard', 'dairy-customers-dash', 'customers', 'khata', 'sales', 'products', 'dashboard',
];
