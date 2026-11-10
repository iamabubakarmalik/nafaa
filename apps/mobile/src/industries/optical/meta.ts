/**
 * Labels, statuses, lens choices and small helpers shared by the optical
 * screens (mirror of the web optical lib/meta.ts). Labels are source keys
 * marked with msg() and translated where shown.
 */

import {
  frameSize, kindOf, nextOrderStep, orderMessage, rxRecallMessage, rxShareMessage, testBookedMessage, type OrderStepKey, type StageKey,
} from '@nafaa/core/industries/optical';
import type { MessageLang } from '@nafaa/core/customers';
import { businessDayKey, formatDate, formatDateTime, startOfBusinessDay, endOfBusinessDay } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { OpticalFacts } from './api';
import type { Period } from '@/modules/sales/lib/period';

export const OPTICAL_KEYS = {
  orders: 'optical-lens-orders', tests: 'optical-eye-tests', rx: 'optical-prescriptions', doctors: 'optical-optometrists', facts: 'optical-facts',
  overview: 'optical-dashboard-overview', profile: 'optical-product-detail',
} as const;

/** Screens that read money moved by orders and test fees. */
export const MONEY_KEYS = ['sales-history', 'dashboard', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'offline', 'bookings', 'inv'];

export function refreshOptical(keys: string[], money = false) {
  const all = [...keys, OPTICAL_KEYS.overview, ...(money ? MONEY_KEYS : [])];
  all.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

interface StatusMeta { label: string; tone: StatusTone }

const ORDER_STATUS: Record<string, StatusMeta> = {
  ORDERED: { label: msg('Order liya'), tone: 'neutral' },
  SENT_TO_LAB: { label: msg('Lab gaya'), tone: 'info' },
  AT_LAB: { label: msg('Lab me'), tone: 'info' },
  RECEIVED: { label: msg('Lab se aaya'), tone: 'accent' },
  QC_PASSED: { label: msg('Check ho gaya'), tone: 'accent' },
  FITTED: { label: msg('Fit ho gaya'), tone: 'success' },
  READY: { label: msg('Tayyar'), tone: 'success' },
  DELIVERED: { label: msg('De diya'), tone: 'neutral' },
  CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};
const nice = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
export const orderStatusOf = (s?: string | null): StatusMeta => ORDER_STATUS[s ?? ''] ?? { label: nice(s), tone: 'neutral' };

const STEP_LABEL: Record<OrderStepKey, string> = {
  toLab: msg('Lab bhejein'), repaired: msg('Repair ho gayi'), fromLab: msg('Lab se aa gaya'), fitted: msg('Fit karke tayyar'),
};
export const stepLabel = (s: OrderStepKey) => t(STEP_LABEL[s]);
export { nextOrderStep };

const STAGE_LABEL: Record<StageKey, string> = { order: msg('Order'), lab: msg('Lab'), received: msg('Lab se aaya'), ready: msg('Tayyar'), delivered: msg('De diya') };
export const stageLabel = (s: StageKey) => t(STAGE_LABEL[s]);

const TEST_STATUS: Record<string, StatusMeta> = {
  SCHEDULED: { label: msg('Booked'), tone: 'neutral' },
  CONFIRMED: { label: msg('Confirm'), tone: 'info' },
  IN_PROGRESS: { label: msg('Test jaari'), tone: 'warning' },
  COMPLETED: { label: msg('Ho gaya'), tone: 'success' },
  CANCELLED: { label: msg('Cancel'), tone: 'danger' },
  NO_SHOW: { label: msg('Nahi aaya'), tone: 'danger' },
  RESCHEDULED: { label: msg('Waqt badla'), tone: 'accent' },
};
export const testStatusOf = (s?: string | null): StatusMeta => TEST_STATUS[s ?? ''] ?? { label: nice(s), tone: 'neutral' };
export const OPEN_TEST = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'RESCHEDULED'];

export const PAY_METHODS: Array<{ id: 'CASH' | 'CARD' | 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER'; label: string }> = [
  { id: 'CASH', label: msg('Cash') }, { id: 'CARD', label: msg('Card') }, { id: 'JAZZCASH', label: msg('JazzCash') }, { id: 'EASYPAISA', label: msg('EasyPaisa') }, { id: 'BANK_TRANSFER', label: msg('Bank') },
];

export const LENS_TYPES: string[] = [msg('Single vision'), msg('KT bifocal'), msg('Progressive'), msg('Reading'), msg('Photochromic'), msg('Blue cut'), msg('Sunglass (number wala)'), msg('Contact lens')];
export const LENS_INDEX = ['1.50', '1.56', '1.59 Poly', '1.61', '1.67', '1.74'];
export const LENS_MATERIAL: string[] = [msg('Plastic (CR-39)'), msg('Polycarbonate'), msg('Glass'), msg('Hi-index')];
export const COATINGS: string[] = [msg('ARC (anti-glare)'), msg('Blue cut'), msg('UV 400'), msg('Hard coat'), msg('Photo-grey'), msg('Tint'), msg('Polarized')];
export const REPAIR_KINDS: string[] = [msg('Pech / screw'), msg('Nose pad'), msg('Dandi (temple)'), msg('Welding / joint'), msg('Frame seedha'), msg('Lens fitting')];
export const TIME_SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];
export const COMPLAINTS: string[] = [msg('Door ka nazar nahi aata'), msg('Parhne me mushkil'), msg('Sar dard'), msg('Aankh me pani / jalan'), msg('Purana number check'), msg('Contact lens')];
export const VA_CHOICES = ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'];
export const DAYS: string[] = [msg('Itwar'), msg('Peer'), msg('Mangal'), msg('Budh'), msg('Jumerat'), msg('Juma'), msg('Hafta')];
export const SPECIALTIES: string[] = [msg('Refraction'), msg('Contact lens'), msg('Bachon ki aankh'), msg('Low vision'), msg('Squint')];
export const CANCEL_ORDER_REASONS: string[] = [msg('Customer ne mana kar diya'), msg('Number ghalat tha'), msg('Lab ne lens nahi banaya'), msg('Frame stock me nahi')];
export const NO_SHOW_REASONS: string[] = [msg('Phone nahi uthaya'), msg('Kal aayega')];
export const CANCEL_TEST_REASONS: string[] = [msg('Customer ne mana kiya'), msg('Doctor chhutti par')];

export const RX_TYPES: Array<{ value: string; label: string }> = [
  { value: 'DISTANCE', label: msg('Door ka') }, { value: 'READING', label: msg('Parhne ka') }, { value: 'BIFOCAL', label: msg('Bifocal') },
  { value: 'PROGRESSIVE', label: msg('Progressive') }, { value: 'COMPUTER', label: msg('Computer') }, { value: 'MYOPIA', label: msg('Myopia (-)') },
  { value: 'HYPEROPIA', label: msg('Hyperopia (+)') }, { value: 'ASTIGMATISM', label: msg('Cylinder') }, { value: 'PRESBYOPIA', label: msg('Umar wala (ADD)') },
  { value: 'DRIVING', label: msg('Driving') }, { value: 'OTHER', label: msg('Doosra') },
];
export const rxTypeLabel = (v?: string | null) => { const o = RX_TYPES.find((x) => x.value === v); return o ? t(o.label) : v ? nice(v) : '—'; };

/* ───────────── small helpers ───────────── */

export const digits = (v: string) => v.replace(/\D/g, '');
export const phoneOk = (v: string) => digits(v).length >= 10 && digits(v).length <= 13;
export const dayOnly = (d?: string | null) => (d ? formatDate(d, { year: true }) : '—');
export const dateTime = (d?: string | null) => (d ? formatDateTime(d) : '—');
export const dayKey = (d?: string | null) => (d ? businessDayKey(d) : '');
export const todayKey = () => businessDayKey(Date.now());

/** A business-day key plus a time as an ISO instant (Pakistan clock). */
export const isoAt = (key: string, time = '12:00') => new Date(`${key}T${time}:00+05:00`).toISOString();

/** A business-day key as a Date (noon, Pakistan) for the date pickers. */
export const asDate = (key: string) => new Date(`${key}T12:00:00+05:00`);

export const plusDays = (n: number) => {
  const d = new Date(`${todayKey()}T12:00:00+05:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return businessDayKey(d);
};

/** Period (day keys) to server bounds; nothing for "all". */
export function rangeParams(p: Period, startHour = 0): { from?: string; to?: string } {
  if (p.from === 'all') return {};
  return {
    from: startOfBusinessDay(new Date(`${p.from}T12:00:00+05:00`), startHour).toISOString(),
    to: endOfBusinessDay(new Date(`${p.to}T12:00:00+05:00`), startHour).toISOString(),
  };
}

/** Option rows for a Select from a list of raw labels. */
export const optionsOf = (list: string[]) => list.map((v) => ({ value: v, label: t(v) }));

/* ───────────── customer messages (shop's bill language) ───────────── */

export const orderText = (o: { customerName: string; orderNumber: string; status: string; expectedDate?: string | null; remainingAmount: number }, repair: boolean, due: string, lang: MessageLang) =>
  orderMessage({ customer: o.customerName, number: o.orderNumber, repair, ready: o.status === 'FITTED' || o.status === 'READY', date: dayOnly(o.expectedDate), due: o.remainingAmount > 0 ? due : null }, lang);
export const rxRecallText = (customer: string, date: string, lang: MessageLang) => rxRecallMessage({ customer, date }, lang);
export const rxShareText = (customer: string, number: string, date: string, lang: MessageLang) => rxShareMessage({ customer, number, date }, lang);
export const testBookedText = (customer: string, date: string, slot: string | null | undefined, lang: MessageLang) => testBookedMessage({ customer, date, slot }, lang);

/* ───────────── product facts ───────────── */

export const KIND_LABEL: Record<string, string> = {
  frame: msg('Frame'), sun: msg('Sunglasses'), lens: msg('Lens (stock)'), contact: msg('Contact lens'), care: msg('Solution / case'), other: msg('Doosra'),
};

const TYPE_LABEL: Record<string, string> = {
  FRAME_FULL_RIM: msg('Full rim'), FRAME_HALF_RIM: msg('Half rim'), FRAME_RIMLESS: msg('Rimless'), FRAME_SPORTS: msg('Sports'), FRAME_KIDS: msg('Bachon ka'), FRAME_READING: msg('Reading'),
  SUNGLASSES: msg('Sunglasses'), SUNGLASSES_POLARIZED: msg('Polarized'), SUNGLASSES_KIDS: msg('Bachon ki'),
  LENS_SINGLE_VISION: msg('Single vision'), LENS_BIFOCAL: msg('Bifocal'), LENS_PROGRESSIVE: msg('Progressive'), LENS_PHOTOCHROMIC: msg('Photochromic'), LENS_BLUE_CUT: msg('Blue cut'),
  LENS_ANTI_GLARE: msg('Anti-glare'), LENS_CYLINDRICAL: msg('Cylinder'), LENS_SPHERICAL: msg('Spherical'),
  CONTACT_LENS_MONTHLY: msg('Monthly'), CONTACT_LENS_DAILY: msg('Daily'), CONTACT_LENS_YEARLY: msg('Yearly'), CONTACT_LENS_COLORED: msg('Rangeen'), CONTACT_LENS_TORIC: msg('Toric'), CONTACT_LENS_MULTIFOCAL: msg('Multifocal'),
  CLEANING_SOLUTION: msg('Solution'), LENS_CASE: msg('Lens case'), ACCESSORY: msg('Accessory'), OTHER: msg('Doosra'),
};
/** Untranslated label (a msg key), for lists that translate at render time. */
export const typeLabelKey = (c: string) => TYPE_LABEL[c] ?? c;
export const typeLabel = (c?: string | null) => (c ? t(TYPE_LABEL[c] ?? c) : '');
export { kindOf };

/** "Ray-Ban RB2140 · Black · 52-18-145", "1.56 Blue cut", "Monthly · BC 8.6". */
export function factLine(f?: OpticalFacts): string | undefined {
  if (!f) return undefined;
  const parts = f.isContactLens
    ? [f.brand, f.clDuration, f.clBaseCurve && `BC ${f.clBaseCurve}`, f.clDiameter && `DIA ${f.clDiameter}`]
    : [[f.brand, f.modelNumber].filter(Boolean).join(' '), f.colorName, frameSize(f.frameSizeMm, f.bridgeSizeMm, f.templeLengthMm), f.lensIndex, f.lensType];
  return parts.filter(Boolean).join(' · ') || undefined;
}
