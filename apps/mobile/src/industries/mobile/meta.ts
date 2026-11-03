/**
 * Labels, tones and small helpers shared by the mobile shop screens (mirror of
 * the web mobile components/meta.ts). Labels are source keys marked with msg()
 * and translated where shown.
 */

import { Linking } from 'react-native';
import { digits } from '@nafaa/core/industries/mobile';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { EmiInstallmentStatus, EmiPlanStatus, ImeiStatus, PtaStatus, RepairPriority, RepairStatus, TradeInSource, UsedPhoneCondition, UsedPhoneStatus } from './api';

export { addMonths, formatCnic, isLuhnValid, QIST_COUNTS } from '@nafaa/core/industries/mobile';

/** Query roots; every mobile screen refreshes these after a change. */
export const IMEI_KEY = 'mobile-imeis';
export const USED_KEY = 'used-phones';
export const REPAIR_KEY = 'repair-tickets';
export const EMI_KEY = 'emi-plans';
export const CATALOG_KEY = 'mobile-pos-catalog';

/** Other screens that show the same money or stock. */
const MONEY_KEYS = ['sales-history', 'dashboard', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline', CATALOG_KEY, 'repair-stats', 'emi-stats', 'used-phones-stats', 'imei-stats', 'product-imeis', 'imei-available', 'mobile-imei-shelf', 'mobile-dashboard-ops'];

export function refreshMobile(keys: string[], money = false) {
  [...keys, CATALOG_KEY, 'imei-stats', ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export interface Meta { label: string; tone: StatusTone }

const nice = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
const pick = <K extends string>(map: Record<K, Meta>, k: string | null | undefined): Meta => map[k as K] ?? { label: nice(k), tone: 'neutral' };

/** Label of a meta entry, translated. */
export const metaText = (m: Meta) => t(m.label);

/* New phones (IMEI) */
const IMEI: Record<ImeiStatus, Meta> = {
  IN_STOCK: { label: msg('Stock me'), tone: 'success' }, SOLD: { label: msg('Bik gaya'), tone: 'accent' }, RESERVED: { label: msg('Rakha hua'), tone: 'warning' },
  RETURNED: { label: msg('Supplier ko wapas'), tone: 'neutral' }, DAMAGED: { label: msg('Kharab'), tone: 'danger' }, LOST: { label: msg('Gum'), tone: 'danger' },
};
export const imeiStatusOf = (s?: string | null) => pick(IMEI, s);
export const IMEI_STATUSES = Object.keys(IMEI) as ImeiStatus[];

const PTA: Record<PtaStatus, Meta> = {
  APPROVED: { label: msg('PTA Approved'), tone: 'success' }, NON_PTA: { label: msg('Non-PTA'), tone: 'danger' }, PATCH: { label: msg('Patched'), tone: 'warning' },
  PENDING: { label: msg('PTA baqi'), tone: 'info' }, EXEMPT: { label: msg('Exempt'), tone: 'neutral' },
};
export const ptaOf = (s?: string | null) => pick(PTA, s);
export const PTA_LIST = Object.keys(PTA) as PtaStatus[];
export const PTA_HINT: Record<PtaStatus, string> = {
  APPROVED: msg('Tax ada, har SIM chalegi'), NON_PTA: msg('Tax nahi diya — SIM 60 din baad band'), PATCH: msg('Ghair-sarkari tareeqa — customer ko batayein'),
  PENDING: msg('Registration jaari hai'), EXEMPT: msg('Pakistan me bana — tax lagu nahi'),
};
/** A phone the customer must be told about before the sale. */
export const ptaWarn = (s?: string | null) => s === 'NON_PTA' || s === 'PENDING';

/* Used phones */
const USED: Record<UsedPhoneStatus, Meta> = {
  PENDING_INSPECTION: { label: msg('Check baqi'), tone: 'warning' }, IN_STOCK: { label: msg('Bikne ko tayyar'), tone: 'success' }, IN_TRANSIT: { label: msg('Raaste me'), tone: 'info' },
  REPAIRING: { label: msg('Repair me'), tone: 'warning' }, SOLD: { label: msg('Bik gaya'), tone: 'accent' }, RETURNED: { label: msg('Wapas aaya'), tone: 'info' }, DISCARDED: { label: msg('Hata diya'), tone: 'neutral' },
};
export const usedStatusOf = (s?: string | null) => pick(USED, s);
export const USED_STATUSES = Object.keys(USED) as UsedPhoneStatus[];

const CONDITION: Record<UsedPhoneCondition, Meta & { score: string }> = {
  EXCELLENT: { label: msg('Bilkul naya'), score: '10/10', tone: 'success' }, VERY_GOOD: { label: msg('Bohat acha'), score: '9/10', tone: 'success' }, GOOD: { label: msg('Acha'), score: '8/10', tone: 'info' },
  FAIR: { label: msg('Theek'), score: '6-7/10', tone: 'warning' }, POOR: { label: msg('Kamzor'), score: '<6', tone: 'danger' },
};
export const conditionOf = (c?: string | null) => CONDITION[c as UsedPhoneCondition] ?? { label: nice(c), score: '', tone: 'neutral' as StatusTone };
export const CONDITIONS = Object.keys(CONDITION) as UsedPhoneCondition[];

const SOURCE: Record<TradeInSource, Meta & { hint: string }> = {
  CASH_BUYBACK: { label: msg('Cash me khareeda'), hint: msg('Customer ko paise galle se diye'), tone: 'info' },
  EXCHANGE: { label: msg('Exchange (trade-in)'), hint: msg('Naye phone ke bill me qeemat kategi'), tone: 'warning' },
  CONSIGNMENT: { label: msg('Customer ki taraf se bechna'), hint: msg('Bikne par customer ko paise denge'), tone: 'neutral' },
};
export const sourceOf = (s?: string | null) => SOURCE[s as TradeInSource] ?? { label: nice(s), hint: '', tone: 'neutral' as StatusTone };
export const SOURCES = Object.keys(SOURCE) as TradeInSource[];

/* Repairs */
const REPAIR: Record<RepairStatus, Meta & { next?: string }> = {
  RECEIVED: { label: msg('Mila'), tone: 'info', next: msg('Check kar ke kharabi aur andaza likhein') },
  DIAGNOSED: { label: msg('Check ho gaya'), tone: 'info', next: msg('Customer ko andaza batayein, haan ho to kaam shuru') },
  AWAITING_APPROVAL: { label: msg('Customer ki haan baqi'), tone: 'warning', next: msg('Customer se andaza pakka karwayein') },
  AWAITING_PARTS: { label: msg('Part ka intezar'), tone: 'warning', next: msg('Part aate hi kaam shuru karein') },
  IN_PROGRESS: { label: msg('Kaam chal raha'), tone: 'accent', next: msg('Kaam khatam ho to "Tayyar" karein') },
  READY: { label: msg('Tayyar'), tone: 'success', next: msg('Customer ko bulayein — baqi paisa le kar wapas dein') },
  DELIVERED: { label: msg('Wapas de diya'), tone: 'neutral' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
  UNREPAIRABLE: { label: msg('Theek nahi ho sakta'), tone: 'danger', next: msg('Phone customer ko wapas dein') },
};
export const repairStatusOf = (s?: string | null) => REPAIR[s as RepairStatus] ?? { label: nice(s), tone: 'neutral' as StatusTone, next: undefined };
export const REPAIR_FLOW: RepairStatus[] = ['RECEIVED', 'DIAGNOSED', 'IN_PROGRESS', 'READY', 'DELIVERED'];
export const REPAIR_CLOSED: RepairStatus[] = ['DELIVERED', 'CANCELLED'];

const PRIORITY: Record<RepairPriority, Meta> = {
  NORMAL: { label: msg('Aam'), tone: 'neutral' }, URGENT: { label: msg('Jaldi'), tone: 'warning' }, EMERGENCY: { label: msg('Foran'), tone: 'danger' },
};
export const priorityOf = (p?: string | null) => pick(PRIORITY, p);
export const PRIORITIES = Object.keys(PRIORITY) as RepairPriority[];

/* Installments */
const PLAN: Record<EmiPlanStatus, Meta> = {
  ACTIVE: { label: msg('Chal raha'), tone: 'info' }, COMPLETED: { label: msg('Mukammal'), tone: 'success' }, DEFAULTED: { label: msg('Default'), tone: 'danger' }, CANCELLED: { label: msg('Cancel'), tone: 'neutral' },
};
export const planStatusOf = (s?: string | null) => pick(PLAN, s);
const INSTALLMENT: Record<EmiInstallmentStatus, Meta> = {
  PENDING: { label: msg('Baqi'), tone: 'warning' }, OVERDUE: { label: msg('Late'), tone: 'danger' }, PAID: { label: msg('Mil gayi'), tone: 'success' }, WAIVED: { label: msg('Maaf'), tone: 'neutral' },
};
export const installmentOf = (s?: string | null) => pick(INSTALLMENT, s);

/* Payment methods */
export const METHODS = [
  { value: 'CASH', label: msg('Cash') }, { value: 'JAZZCASH', label: msg('JazzCash') }, { value: 'EASYPAISA', label: msg('Easypaisa') },
  { value: 'BANK_TRANSFER', label: msg('Bank') }, { value: 'CARD', label: msg('Card') },
] as const;
export const methodLabel = (m?: string | null) => { const x = METHODS.find((y) => y.value === m); return x ? t(x.label) : nice(m); };

/* Dates and numbers */
export const daysTo = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);
export const ageText = (days?: number | null) => (days == null ? '—' : days === 0 ? t('Aaj') : days === 1 ? t('1 din') : t('{{days}} din', { days }));
export const money = (v: string) => v.replace(/[^\d.]/g, '');
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
/** A picked wall-clock date as the noon-UTC ISO string the API keeps. */
export const dateISO = (d: Date | null) => (d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)).toISOString() : undefined);
export const keyToDate = (k?: string | null) => (k ? new Date(`${k.slice(0, 10)}T12:00:00`) : null);

/** WhatsApp link with a ready text; undefined when the number is too short. */
export function waLink(phone: string | null | undefined, text: string): string | undefined {
  const d = digits(String(phone ?? ''));
  if (d.length < 10) return undefined;
  const intl = d.startsWith('0') ? `92${d.slice(1)}` : d;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
export const openWhatsApp = (phone: string | null | undefined, text: string) => { const u = waLink(phone, text); if (u) void Linking.openURL(u); };
export const callPhone = (phone?: string | null) => { if (phone) void Linking.openURL(`tel:${phone}`); };
