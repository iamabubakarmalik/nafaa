/**
 * Labels, colours and small helpers shared by the mobile shop pages: phone
 * and PTA statuses, used phone condition and source, repair and installment
 * statuses, dates, WhatsApp links and API error text.
 */

import type { ImeiStatus, PtaStatus } from '../api/imei.api';
import type { TradeInSource, UsedPhoneCondition, UsedPhoneStatus } from '../api/used-phones.api';
import type { RepairPriority, RepairStatus } from '../api/repairs.api';
import type { EmiInstallmentStatus, EmiPlanStatus } from '../api/emi.api';

/** Query roots; every mobile screen refreshes these after a change. */
export const IMEI_KEY = 'mobile-imeis';
export const USED_KEY = 'used-phones';
export const REPAIR_KEY = 'repair-tickets';
export const EMI_KEY = 'emi-plans';

/** Keys other screens read (dashboard, POS, products, khata) that move with these records. */
export const MONEY_KEYS = ['sales', 'sales-history', 'dashboard', 'khata', 'customers', 'cash-register', 'mobile-pos-catalog', 'products-catalog', 'products-for-pos', 'repair-stats', 'emi-stats', 'used-phones-stats'];

interface Meta { label: string; tone: string; color: string }

export const tone = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const pick = <K extends string>(map: Record<K, Meta>, k: string | null | undefined): Meta =>
  map[k as K] ?? { label: nice(k), tone: tone.slate, color: '#94a3b8' };

/** "IN_STOCK" → "In stock". */
const nice = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—');

/* ── New phones (IMEI) ── */
const IMEI: Record<ImeiStatus, Meta> = {
  IN_STOCK: { label: 'Stock me', tone: tone.green, color: '#10b981' },
  SOLD: { label: 'Bik gaya', tone: tone.violet, color: '#8b5cf6' },
  RESERVED: { label: 'Rakha hua', tone: tone.amber, color: '#f59e0b' },
  RETURNED: { label: 'Supplier ko wapas', tone: tone.slate, color: '#64748b' },
  DAMAGED: { label: 'Kharab', tone: tone.rose, color: '#f43f5e' },
  LOST: { label: 'Gum', tone: tone.rose, color: '#be123c' },
};
export const imeiStatusOf = (s?: string | null) => pick(IMEI, s);
export const IMEI_STATUSES = Object.keys(IMEI) as ImeiStatus[];

const PTA: Record<PtaStatus, Meta> = {
  APPROVED: { label: 'PTA Approved', tone: tone.green, color: '#10b981' },
  NON_PTA: { label: 'Non-PTA', tone: tone.rose, color: '#f43f5e' },
  PATCH: { label: 'Patched', tone: tone.amber, color: '#f59e0b' },
  PENDING: { label: 'PTA baqi', tone: tone.blue, color: '#3b82f6' },
  EXEMPT: { label: 'Exempt', tone: tone.slate, color: '#64748b' },
};
export const ptaOf = (s?: string | null) => pick(PTA, s);
export const PTA_LIST = Object.keys(PTA) as PtaStatus[];
export const PTA_HINT: Record<PtaStatus, string> = {
  APPROVED: 'Tax ada, har SIM chalegi',
  NON_PTA: 'Tax nahi diya — SIM 60 din baad band',
  PATCH: 'Ghair-sarkari tareeqa — customer ko batayein',
  PENDING: 'Registration jaari hai',
  EXEMPT: 'Pakistan me bana — tax lagu nahi',
};

/* ── Used phones ── */
const USED: Record<UsedPhoneStatus, Meta> = {
  PENDING_INSPECTION: { label: 'Check baqi', tone: tone.amber, color: '#f59e0b' },
  IN_STOCK: { label: 'Bikne ko tayyar', tone: tone.green, color: '#10b981' },
  IN_TRANSIT: { label: 'Raaste me', tone: tone.sky, color: '#0ea5e9' },
  REPAIRING: { label: 'Repair me', tone: tone.orange, color: '#f97316' },
  SOLD: { label: 'Bik gaya', tone: tone.violet, color: '#8b5cf6' },
  RETURNED: { label: 'Wapas aaya', tone: tone.blue, color: '#3b82f6' },
  DISCARDED: { label: 'Hata diya', tone: tone.slate, color: '#64748b' },
};
export const usedStatusOf = (s?: string | null) => pick(USED, s);
export const USED_STATUSES = Object.keys(USED) as UsedPhoneStatus[];

const CONDITION: Record<UsedPhoneCondition, Meta & { score: string }> = {
  EXCELLENT: { label: 'Bilkul naya', score: '10/10', tone: tone.green, color: '#10b981' },
  VERY_GOOD: { label: 'Bohat acha', score: '9/10', tone: tone.teal, color: '#14b8a6' },
  GOOD: { label: 'Acha', score: '8/10', tone: tone.blue, color: '#3b82f6' },
  FAIR: { label: 'Theek', score: '6-7/10', tone: tone.amber, color: '#f59e0b' },
  POOR: { label: 'Kamzor', score: '6 se kam', tone: tone.rose, color: '#f43f5e' },
};
export const conditionOf = (c?: string | null) => (CONDITION[c as UsedPhoneCondition] ?? { label: nice(c), score: '', tone: tone.slate, color: '#94a3b8' });
export const CONDITIONS = Object.keys(CONDITION) as UsedPhoneCondition[];

const SOURCE: Record<TradeInSource, Meta & { hint: string }> = {
  CASH_BUYBACK: { label: 'Cash me khareeda', hint: 'Customer ko paise galle se diye', tone: tone.indigo, color: '#6366f1' },
  EXCHANGE: { label: 'Exchange (trade-in)', hint: 'Naye phone ke bill me qeemat kategi', tone: tone.orange, color: '#f97316' },
  CONSIGNMENT: { label: 'Customer ki taraf se bechna', hint: 'Bikne par customer ko paise denge', tone: tone.slate, color: '#64748b' },
};
export const sourceOf = (s?: string | null) => (SOURCE[s as TradeInSource] ?? { label: nice(s), hint: '', tone: tone.slate, color: '#94a3b8' });
export const SOURCES = Object.keys(SOURCE) as TradeInSource[];

/* ── Repairs ── */
const REPAIR: Record<RepairStatus, Meta & { next?: string }> = {
  RECEIVED: { label: 'Mila', tone: tone.blue, color: '#3b82f6', next: 'Check kar ke kharabi aur andaza likhein' },
  DIAGNOSED: { label: 'Check ho gaya', tone: tone.indigo, color: '#6366f1', next: 'Customer ko andaza batayein, haan ho to kaam shuru' },
  AWAITING_APPROVAL: { label: 'Customer ki haan baqi', tone: tone.amber, color: '#f59e0b', next: 'Customer se andaza pakka karwayein' },
  AWAITING_PARTS: { label: 'Part ka intezar', tone: tone.orange, color: '#f97316', next: 'Part aate hi kaam shuru karein' },
  IN_PROGRESS: { label: 'Kaam chal raha', tone: tone.violet, color: '#8b5cf6', next: 'Kaam khatam ho to "Tayyar" karein' },
  READY: { label: 'Tayyar', tone: tone.green, color: '#10b981', next: 'Customer ko bulayein — baqi paisa le kar wapas dein' },
  DELIVERED: { label: 'Wapas de diya', tone: tone.slate, color: '#64748b' },
  CANCELLED: { label: 'Cancel', tone: tone.rose, color: '#f43f5e' },
  UNREPAIRABLE: { label: 'Theek nahi ho sakta', tone: tone.rose, color: '#be123c', next: 'Phone customer ko wapas dein' },
};
export const repairStatusOf = (s?: string | null) => (REPAIR[s as RepairStatus] ?? { label: nice(s), tone: tone.slate, color: '#94a3b8' });
export const REPAIR_FLOW: RepairStatus[] = ['RECEIVED', 'DIAGNOSED', 'IN_PROGRESS', 'READY', 'DELIVERED'];
export const REPAIR_CLOSED: RepairStatus[] = ['DELIVERED', 'CANCELLED'];

const PRIORITY: Record<RepairPriority, Meta> = {
  NORMAL: { label: 'Aam', tone: tone.slate, color: '#64748b' },
  URGENT: { label: 'Jaldi', tone: tone.orange, color: '#f97316' },
  EMERGENCY: { label: 'Foran', tone: tone.rose, color: '#f43f5e' },
};
export const priorityOf = (p?: string | null) => pick(PRIORITY, p);
export const PRIORITIES = Object.keys(PRIORITY) as RepairPriority[];

/* ── Installments ── */
const PLAN: Record<EmiPlanStatus, Meta> = {
  ACTIVE: { label: 'Chal raha', tone: tone.blue, color: '#3b82f6' },
  COMPLETED: { label: 'Mukammal', tone: tone.green, color: '#10b981' },
  DEFAULTED: { label: 'Default', tone: tone.rose, color: '#f43f5e' },
  CANCELLED: { label: 'Cancel', tone: tone.slate, color: '#64748b' },
};
export const planStatusOf = (s?: string | null) => pick(PLAN, s);

const INSTALLMENT: Record<EmiInstallmentStatus, Meta> = {
  PENDING: { label: 'Baqi', tone: tone.amber, color: '#f59e0b' },
  OVERDUE: { label: 'Late', tone: tone.rose, color: '#f43f5e' },
  PAID: { label: 'Mil gayi', tone: tone.green, color: '#10b981' },
  WAIVED: { label: 'Maaf', tone: tone.slate, color: '#64748b' },
};
export const installmentOf = (s?: string | null) => pick(INSTALLMENT, s);

/* ── Payment methods (labels only; the codes come from the API) ── */
export const METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'Easypaisa' },
  { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'CARD', label: 'Card' },
] as const;
export const methodLabel = (m?: string | null) => METHODS.find((x) => x.value === m)?.label ?? nice(m);

/* ── Dates ── */
export const dateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
export const dayOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
/** Today in this device's time as yyyy-MM-dd. */
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Installment counts offered for a plan. */
export const QIST_COUNTS = [2, 3, 4, 6, 9, 12];
/** yyyy-MM-dd `months` after `key`, the day clamped to the month's end. */
export function addMonths(key: string, months: number) {
  const [y, m, d] = key.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}
/** Whole days from now to `iso` (negative when past). */
export const daysTo = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);
export const ageText = (days?: number | null) => (days == null ? '—' : days === 0 ? 'Aaj' : days === 1 ? '1 din' : `${days} din`);

/* ── Numbers and validation ── */
export const digits = (v: string) => v.replace(/\D/g, '');
export const money = (v: string) => v.replace(/[^\d.]/g, '');
/** IMEIs are 15 digits; the last is a Luhn check digit. */
export function isLuhnValid(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let n = Number(imei[14 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}
/** 13 digits typed any way → 35202-1234567-1. */
export function formatCnic(v: string) {
  const d = digits(v).slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

/* ── Links and errors ── */
export function waLink(phone: string | null | undefined, text: string): string | undefined {
  const d = digits(String(phone ?? ''));
  if (d.length < 10) return undefined;
  const intl = d.startsWith('0') ? `92${d.slice(1)}` : d;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}
