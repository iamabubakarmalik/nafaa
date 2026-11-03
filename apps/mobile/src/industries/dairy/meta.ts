/** Dairy labels, tones and helpers (mirror of the web dairy lib/meta.ts and productTypes.ts). Labels are source keys marked with msg(). */

import { businessDayKey, pkParts } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import { slotForHour } from '@nafaa/core/industries/dairy';

export const DAIRY_KEYS = {
  customers: 'dairy-customers', customer: 'dairy-customer', deliveries: 'dairy-deliveries', farmers: 'dairy-farmers', farmer: 'dairy-farmer', supplies: 'dairy-supplies',
  bills: 'dairy-bills', routes: 'dairy-routes', tests: 'dairy-tests', production: 'dairy-production', profiles: 'dairy-profiles', overview: 'dairy-dashboard',
} as const;

/** Everything money or stock changes touch. */
const MONEY_KEYS = [
  DAIRY_KEYS.customers, DAIRY_KEYS.customer, DAIRY_KEYS.deliveries, DAIRY_KEYS.bills, DAIRY_KEYS.farmers, DAIRY_KEYS.farmer, DAIRY_KEYS.supplies, DAIRY_KEYS.overview,
  'customers-directory', 'customer', 'customer-ledger', 'sales-history', 'cash-register', 'dashboard', 'inv', 'offline',
];
export function refreshDairy(keys: string[], money = false) {
  [...keys, DAIRY_KEYS.overview, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export type Slot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export const SLOT_LABEL: Record<Slot, string> = { MORNING: msg('Subah'), AFTERNOON: msg('Dopahar'), EVENING: msg('Shaam'), NIGHT: msg('Raat') };
export const slotLabel = (s?: string | null) => (s && s in SLOT_LABEL ? t(SLOT_LABEL[s as Slot]) : s ?? '—');
export const slotNow = (): 'MORNING' | 'EVENING' => slotForHour(pkParts(Date.now()).hour);

export const FREQUENCY: Record<string, { label: string; hint: string }> = {
  DAILY: { label: msg('Roz'), hint: msg('Subah aur shaam dono, jo quantity likhi ho') },
  MORNING_EVENING: { label: msg('Subah + shaam'), hint: msg('Dono waqt') },
  MORNING_ONLY: { label: msg('Sirf subah'), hint: msg('Shaam ki list me nahi aata') },
  EVENING_ONLY: { label: msg('Sirf shaam'), hint: msg('Subah ki list me nahi aata') },
  ALTERNATE_DAY: { label: msg('Ek din chhor kar'), hint: msg('Har doosre din') },
  WEEKLY: { label: msg('Hafte me ek dafa'), hint: msg('Har Monday') },
  ON_DEMAND: { label: msg('Jab maange'), hint: msg('Roz ki list me nahi — delivery khud jorein') },
};

export const CUSTOMER_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Chalu'), tone: 'success' }, SUSPENDED: { label: msg('Ruka hua'), tone: 'warning' }, CLOSED: { label: msg('Band'), tone: 'neutral' }, DEFAULTED: { label: msg('Paisa phansa'), tone: 'danger' },
};
export const DELIVERY_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: msg('Baqi'), tone: 'warning' }, DELIVERED: { label: msg('Pohancha'), tone: 'success' }, SKIPPED: { label: msg('Naga'), tone: 'neutral' },
  MISSED: { label: msg('Reh gaya'), tone: 'danger' }, RETURNED: { label: msg('Wapas'), tone: 'danger' }, CANCELLED: { label: msg('Cancel'), tone: 'neutral' },
};
export const ROUTE_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Chalu'), tone: 'success' }, PAUSED: { label: msg('Ruka hua'), tone: 'warning' }, DISCONTINUED: { label: msg('Band'), tone: 'neutral' },
};
export const QUALITY: Record<string, { label: string; tone: StatusTone }> = {
  A_GRADE: { label: msg('A grade'), tone: 'success' }, B_GRADE: { label: msg('B grade'), tone: 'info' }, C_GRADE: { label: msg('C grade'), tone: 'warning' }, REJECTED: { label: msg('Wapas kiya'), tone: 'danger' },
};
/** Gawala payment cycle. */
export const CYCLE: Record<string, string> = { DAILY: msg('Roz'), WEEKLY: msg('Hafta'), BIWEEKLY: msg('15 din'), MONTHLY: msg('Mahina'), QUARTERLY: msg('3 mahine') };

export const PAY_METHODS = [
  { value: 'CASH', label: msg('Cash') }, { value: 'JAZZCASH', label: msg('JazzCash') }, { value: 'EASYPAISA', label: msg('EasyPaisa') }, { value: 'BANK_TRANSFER', label: msg('Bank') }, { value: 'CARD', label: msg('Card') },
];
export const TEST_SOURCES: Record<string, string> = { FARMER: msg('Gawale ka doodh'), INCOMING_BATCH: msg('Aaya hua doodh'), STORAGE_TANK: msg('Tanki / stock'), CUSTOMER_COMPLAINT: msg('Customer ki shikayat'), RANDOM: msg('Achanak check') };
export const ADULTERATION = [msg('Paani'), msg('Starch'), msg('Urea'), msg('Detergent'), msg('Cheeni'), msg('Formalin')];

export const PRODUCT_TYPES: Array<{ value: string; label: string; milk?: boolean }> = [
  { value: 'FRESH_MILK', label: msg('Doodh'), milk: true }, { value: 'BUFFALO_MILK', label: msg('Bhains ka doodh'), milk: true }, { value: 'COW_MILK', label: msg('Gaye ka doodh'), milk: true },
  { value: 'MIXED_MILK', label: msg('Mix doodh'), milk: true }, { value: 'BOILED_MILK', label: msg('Garam doodh'), milk: true }, { value: 'RAW_MILK', label: msg('Kacha doodh'), milk: true },
  { value: 'GOAT_MILK', label: msg('Bakri ka doodh') }, { value: 'DAHI', label: msg('Dahi') }, { value: 'YOGURT', label: msg('Yogurt') }, { value: 'LASSI', label: msg('Lassi') },
  { value: 'BUTTER_MILK', label: msg('Chhaach') }, { value: 'MAKHAN', label: msg('Makhan') }, { value: 'BUTTER', label: msg('Butter') }, { value: 'DESI_GHEE', label: msg('Desi ghee') },
  { value: 'CREAM', label: msg('Cream') }, { value: 'MALAI', label: msg('Malai') }, { value: 'KHOA', label: msg('Khoya') }, { value: 'PANEER', label: msg('Paneer') }, { value: 'KHEER', label: msg('Kheer') },
  { value: 'RABRI', label: msg('Rabri') }, { value: 'KULFI', label: msg('Kulfi') }, { value: 'ICE_CREAM', label: msg('Ice cream') }, { value: 'SWEETS', label: msg('Mithai') }, { value: 'OTHER', label: msg('Kuch aur') },
];
export const typeLabel = (v?: string | null) => { const p = PRODUCT_TYPES.find((x) => x.value === v); return p ? t(p.label) : v ?? ''; };

export const MONTHS = [msg('Jan'), msg('Feb'), msg('Mar'), msg('Apr'), msg('May'), msg('Jun'), msg('Jul'), msg('Aug'), msg('Sep'), msg('Oct'), msg('Nov'), msg('Dec')];
export const monthLabel = (m: number, y: number) => `${t(MONTHS[m - 1] ?? String(m))} ${y}`;

/** 12.5 → "12.5", 3 → "3". */
export const qty = (n: number | null | undefined) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
};
export const liters = (n: number | null | undefined) => `${qty(n)} L`;
export const todayKey = () => businessDayKey();
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
export const phoneOk = (v: string) => !v.trim() || /^[0-9+\-\s]{10,15}$/.test(v.trim());
export const cnicOk = (v: string) => !v.trim() || /^\d{5}-?\d{7}-?\d$/.test(v.trim());
