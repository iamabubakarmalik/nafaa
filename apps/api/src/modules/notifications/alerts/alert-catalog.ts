/**
 * Staff alert events: who may receive each one, the defaults per role, the
 * Android channel family, and the push text in the three app languages.
 *
 * In-app rows keep the Roman Urdu source text (clients translate it from
 * their `api` catalogs); pushes are written in the receiver's language here
 * because the phone shows them as they arrive.
 */

import { PERMISSIONS, type PermissionKey } from '../../../common/constants/permissions.constants';

export const ALERT_EVENTS = [
  'sale', 'bigDiscount', 'voidRefund', 'expense', 'purchase', 'lowStock', 'khataPayment',
  'onlineOrder', 'register', 'lateCheckIn', 'booking', 'dailySummary', 'account',
] as const;
export type AlertEvent = (typeof ALERT_EVENTS)[number];

export const isAlertEvent = (v: unknown): v is AlertEvent => typeof v === 'string' && (ALERT_EVENTS as readonly string[]).includes(v);

export interface ChannelSwitch { inApp: boolean; push: boolean }

interface EventSpec {
  /** Needed to receive the event at all. Owners always pass. */
  permission?: PermissionKey;
  /** Defaults for owners and managers. */
  lead: ChannelSwitch;
  /** Defaults for everyone else who holds the permission. */
  staff: ChannelSwitch;
  /** Only the owner receives it (billing and account messages). */
  ownerOnly?: boolean;
}

const ON: ChannelSwitch = { inApp: true, push: true };
const IN_APP: ChannelSwitch = { inApp: true, push: false };
const OFF: ChannelSwitch = { inApp: false, push: false };

export const EVENT_SPECS: Record<AlertEvent, EventSpec> = {
  // One push per sale is noise for a busy counter: sale pushes are off by
  // default and, when switched on, come as a summary every few minutes.
  sale: { permission: PERMISSIONS.SALES_VIEW, lead: IN_APP, staff: OFF },
  bigDiscount: { permission: PERMISSIONS.SALES_VIEW, lead: ON, staff: OFF },
  voidRefund: { permission: PERMISSIONS.RETURNS_VIEW, lead: ON, staff: OFF },
  expense: { permission: PERMISSIONS.EXPENSES_VIEW, lead: ON, staff: OFF },
  purchase: { permission: PERMISSIONS.PURCHASES_VIEW, lead: IN_APP, staff: OFF },
  lowStock: { permission: PERMISSIONS.LOW_STOCK_VIEW, lead: ON, staff: OFF },
  khataPayment: { permission: PERMISSIONS.KHATA_VIEW, lead: ON, staff: OFF },
  onlineOrder: { permission: PERMISSIONS.ONLINE_ORDERS_VIEW, lead: ON, staff: IN_APP },
  register: { permission: PERMISSIONS.CASH_REGISTER_VIEW, lead: ON, staff: OFF },
  lateCheckIn: { permission: PERMISSIONS.STAFF_VIEW, lead: IN_APP, staff: OFF },
  booking: { permission: PERMISSIONS.SERVICE_BOOKINGS_VIEW, lead: ON, staff: IN_APP },
  // The daily summary picks its own people; the switch only lets them mute it.
  dailySummary: { lead: ON, staff: ON },
  account: { lead: ON, staff: OFF, ownerOnly: true },
};

/** Android channel family: alerts get the louder treatment on the web. */
export const URGENT_EVENTS: ReadonlySet<AlertEvent> = new Set(['bigDiscount', 'voidRefund', 'lowStock', 'register']);

// ─── Sounds ─────────────────────────────────────────────────────────

export const ALERT_SOUNDS = ['chime', 'cash', 'bell', 'alert', 'silent'] as const;
export type AlertSound = (typeof ALERT_SOUNDS)[number];
export const isAlertSound = (v: unknown): v is AlertSound => typeof v === 'string' && (ALERT_SOUNDS as readonly string[]).includes(v);

// ─── Push text ──────────────────────────────────────────────────────

export type PushLanguage = 'en' | 'ur' | 'roman';

/** Source (Roman Urdu) template → English and Urdu. Texts with only values need no entry. */
export const PUSH_TEXT: Record<string, { en: string; ur: string }> = {
  '💰 Sale Complete': { en: '💰 Sale complete', ur: '💰 سیل مکمل' },
  '{{saleNumber}} · Rs {{total}} · {{count}} items': { en: '{{saleNumber}} · Rs {{total}} · {{count}} items', ur: '{{saleNumber}} · Rs {{total}} · {{count}} آئٹمز' },
  '💰 {{count}} Sales': { en: '💰 {{count}} sales', ur: '💰 {{count}} سیل' },
  'Pichle {{minutes}} minute me Rs {{total}}': { en: 'Rs {{total}} in the last {{minutes}} min', ur: 'پچھلے {{minutes}} منٹ میں Rs {{total}}' },
  '🏷️ Bara Discount': { en: '🏷️ Big discount', ur: '🏷️ بڑا ڈسکاؤنٹ' },
  '{{saleNumber}} par Rs {{discount}} Discount ({{percent}}%) · {{by}}': {
    en: 'Rs {{discount}} discount ({{percent}}%) on {{saleNumber}} · {{by}}',
    ur: '{{saleNumber}} پر Rs {{discount}} ڈسکاؤنٹ ({{percent}}%) · {{by}}',
  },
  '🚫 Bill void hua': { en: '🚫 Bill voided', ur: '🚫 بل منسوخ ہوا' },
  '↩️ Return hui': { en: '↩️ Return processed', ur: '↩️ واپسی ہوئی' },
  '{{number}} · Rs {{amount}} wapas · {{by}}': { en: '{{number}} · Rs {{amount}} refunded · {{by}}', ur: '{{number}} · Rs {{amount}} واپس · {{by}}' },
  '🧾 Naya Expense': { en: '🧾 New expense', ur: '🧾 نیا ایکسپینس' },
  '📦 Purchase receive hui': { en: '📦 Purchase received', ur: '📦 پرچیز موصول ہوئی' },
  '⚠️ Low Stock Alert': { en: '⚠️ Low stock', ur: '⚠️ کم اسٹاک الرٹ' },
  '{{name}} ka stock kam ho gaya hai ({{stock}} {{unit}} bacha)': {
    en: '{{name}} stock is low ({{stock}} {{unit}} left)',
    ur: '{{name}} کا اسٹاک کم ہو گیا ہے ({{stock}} {{unit}} بچا)',
  },
  '⛔ Stock khatam': { en: '⛔ Out of stock', ur: '⛔ اسٹاک ختم' },
  '{{name}} ka stock khatam ho gaya': { en: '{{name}} is out of stock', ur: '{{name}} کا اسٹاک ختم ہو گیا' },
  '💵 Udhaar ki wasooli': { en: '💵 Credit payment received', ur: '💵 ادھار کی وصولی' },
  '{{customer}} ne Rs {{amount}} diye': { en: '{{customer}} paid Rs {{amount}}', ur: '{{customer}} نے Rs {{amount}} دیے' },
  '🛍️ Naya online order #{{num}}': { en: '🛍️ New online order #{{num}}', ur: '🛍️ نیا آن لائن آرڈر #{{num}}' },
  '🔓 Register khula': { en: '🔓 Register opened', ur: '🔓 رجسٹر کھلا' },
  '🔒 Register band hua': { en: '🔒 Register closed', ur: '🔒 رجسٹر بند ہوا' },
  '⚠️ Register me kami': { en: '⚠️ Cash short at closing', ur: '⚠️ رجسٹر میں کمی' },
  '{{shop}} · {{by}} · Rs {{amount}} kam': { en: '{{shop}} · {{by}} · Rs {{amount}} short', ur: '{{shop}} · {{by}} · Rs {{amount}} کم' },
  '⏰ Late check-in': { en: '⏰ Late check-in', ur: '⏰ دیر سے حاضری' },
  '{{name}} {{minutes}} minute late aaye': { en: '{{name}} checked in {{minutes}} min late', ur: '{{name}} {{minutes}} منٹ دیر سے آئے' },
  '📅 Nayi booking': { en: '📅 New booking', ur: '📅 نئی بکنگ' },
  '🔔 Test Notification': { en: '🔔 Test notification', ur: '🔔 ٹیسٹ نوٹیفکیشن' },
  'Is phone par notifications chal rahi hain.': { en: 'Notifications are working on this phone.', ur: 'اس فون پر نوٹیفکیشنز چل رہی ہیں۔' },
};

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

/** Push text in the receiver's language; unknown templates stay as written. */
export function pushText(language: string | null | undefined, template: string, params: Record<string, unknown> = {}): string {
  const lang: PushLanguage = language === 'ur' || language === 'roman' ? language : 'en';
  const entry = PUSH_TEXT[template];
  const chosen = lang === 'roman' || !entry ? template : entry[lang];
  return chosen.replace(PLACEHOLDER, (whole, name: string) => {
    const v = params[name];
    if (v === undefined || v === null) return whole;
    if (typeof v === 'object' && v && 'message' in (v as object)) return String((v as { message: unknown }).message);
    return String(v);
  });
}
