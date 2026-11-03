/**
 * Labels, tones and small helpers shared by the electronics screens (mirror of
 * the web electronics constants.ts and components/meta.ts). Labels are source
 * keys marked with msg() and translated where shown.
 */

import { CATEGORY_GROUPS, CATEGORY_IDS, CATEGORY_EMOJI, claimStageKey, type CategoryType, type ConditionType } from '@nafaa/core/industries/electronics';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { ClaimRow, ResolutionType, SerialStatus, WarrantyStatus } from './api';

export { CATEGORY_GROUPS, CATEGORY_IDS, CATEGORY_EMOJI };

/** Query roots; every electronics screen refreshes these after a change. */
export const SERIAL_KEYS = ['electronics-serials', 'electronics-serials-all', 'electronics-pos-catalog', 'serials-for-pos', 'electronics-stock-report', 'products-catalog', 'electronics-dashboard-overview', 'recent-serials'];
export const CLAIM_KEYS = ['warranty-claims', 'warranty-claims-summary', 'warranty-claims-list', 'electronics-dashboard-overview'];
export const BUNDLE_KEY = 'electronics-bundles';
const MONEY_KEYS = ['sales-history', 'dashboard', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline'];

export function refreshElectronics(keys: string[], money = false) {
  [...keys, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const CATEGORY_LABEL: Record<CategoryType, string> = {
  TV: msg('TV / LED'),
  HOME_THEATER: msg('Home Theater'),
  LAPTOP: msg('Laptop'),
  DESKTOP: msg('Desktop / PC'),
  TABLET: msg('Tablet'),
  PRINTER: msg('Printer'),
  GAMING_CONSOLE: msg('Gaming Console'),
  UPS: msg('UPS / Inverter'),
  CABLE: msg('Cable'),
  CHARGER: msg('Charger'),
  POWER_BANK: msg('Power Bank'),
  HEADPHONE: msg('Headphones'),
  EARBUD: msg('Earbuds'),
  SPEAKER: msg('Speaker'),
  BLUETOOTH_SPEAKER: msg('Bluetooth Speaker'),
  MICROPHONE: msg('Microphone'),
  SMARTWATCH: msg('Smart Watch'),
  FITNESS_BAND: msg('Fitness Band'),
  VR_HEADSET: msg('VR Headset'),
  DRONE: msg('Drone'),
  CAMERA: msg('Camera'),
  DSLR: msg('DSLR'),
  ACTION_CAMERA: msg('Action Camera'),
  TRIPOD: msg('Tripod'),
  GIMBAL: msg('Gimbal'),
  WEBCAM: msg('Webcam'),
  KEYBOARD: msg('Keyboard'),
  MOUSE: msg('Mouse'),
  MONITOR: msg('Monitor / Screen'),
  PROJECTOR: msg('Projector'),
  LAPTOP_ACCESSORY: msg('Laptop Accessory'),
  ROUTER: msg('Router / WiFi'),
  MEMORY_CARD: msg('Memory Card'),
  USB_DRIVE: msg('USB Drive'),
  HARD_DRIVE: msg('Hard Drive'),
  SSD: msg('SSD'),
  PHONE_ACCESSORY: msg('Phone Accessory'),
  MOBILE_CASE: msg('Mobile Cover'),
  SCREEN_PROTECTOR: msg('Screen Protector'),
  TABLET_ACCESSORY: msg('Tablet Accessory'),
  ADAPTER: msg('Adapter'),
  CONVERTER: msg('Converter'),
  CAR_ACCESSORY: msg('Car Accessory'),
  SMART_HOME: msg('Smart Home'),
  LED_LIGHT: msg('LED Light'),
  OTHER: msg('Other'),
};
export const categoryLabel = (c?: string | null) => (c && CATEGORY_LABEL[c as CategoryType] ? t(CATEGORY_LABEL[c as CategoryType]) : c ? c.replace(/_/g, ' ').toLowerCase() : '—');
export const categoryEmoji = (c?: string | null) => CATEGORY_EMOJI[(c as CategoryType) ?? 'OTHER'] ?? '📦';
export const groupLabel = (g: string) => t(g);

export const CONDITION_META: Record<ConditionType, { label: string; hint: string; tone: StatusTone }> = {
  BRAND_NEW: { label: msg('Brand New'), hint: msg('Seal pack, kabhi khula nahi'), tone: 'success' },
  OPEN_BOX: { label: msg('Open Box'), hint: msg('Dabba khula, cheez nayi'), tone: 'info' },
  REFURBISHED: { label: msg('Refurbished'), hint: msg('Company ne theek karke bheja'), tone: 'warning' },
  USED: { label: msg('Used'), hint: msg('Istemal shuda'), tone: 'accent' },
  DAMAGED: { label: msg('Damaged'), hint: msg('Kharab — kam qeemat par'), tone: 'danger' },
  FOR_PARTS: { label: msg('For Parts'), hint: msg('Sirf parts ke liye'), tone: 'neutral' },
};
export const conditionLabel = (c?: string | null) => (c && CONDITION_META[c as ConditionType] ? t(CONDITION_META[c as ConditionType].label) : c ? c.replace(/_/g, ' ').toLowerCase() : '—');

export interface Meta { label: string; tone: StatusTone }
export const metaText = (m: Meta) => t(m.label);

export const SERIAL_STATUS: Record<SerialStatus, Meta> = {
  IN_STOCK: { label: msg('Stock mein'), tone: 'success' }, RESERVED: { label: msg('Rakha hua'), tone: 'accent' }, IN_TRANSIT: { label: msg('Raste mein'), tone: 'warning' },
  SOLD: { label: msg('Bik gaya'), tone: 'info' }, RETURNED: { label: msg('Stock se nikla'), tone: 'neutral' }, IN_REPAIR: { label: msg('Repair mein'), tone: 'warning' },
  DEFECTIVE: { label: msg('Kharab'), tone: 'danger' }, LOST: { label: msg('Gum'), tone: 'neutral' },
};
export const serialStatusOf = (s?: string | null): Meta => SERIAL_STATUS[s as SerialStatus] ?? SERIAL_STATUS.IN_STOCK;

export const WARRANTY_STATUS: Record<WarrantyStatus, Meta> = {
  ACTIVE: { label: msg('Warranty chal rahi'), tone: 'success' }, CLAIMED: { label: msg('Claim ho chuka'), tone: 'warning' }, IN_REPAIR: { label: msg('Repair mein'), tone: 'warning' },
  EXPIRED: { label: msg('Khatam'), tone: 'neutral' }, VOID: { label: msg('Warranty khatam (rad)'), tone: 'danger' }, NO_WARRANTY: { label: msg('Warranty nahi'), tone: 'neutral' },
};
export const warrantyStatusOf = (s?: string | null): Meta => WARRANTY_STATUS[s as WarrantyStatus] ?? { label: s ?? '—', tone: 'neutral' };

export const OUTCOME: Record<ResolutionType, Meta & { hint: string }> = {
  REPAIRED: { label: msg('Theek kar diya'), tone: 'success', hint: msg('Unit theek ho kar customer ko wapas') },
  REPLACED: { label: msg('Naya unit diya'), tone: 'info', hint: msg('Stock se naya unit — purana kharab mein') },
  REFUNDED: { label: msg('Paisa wapas'), tone: 'warning', hint: msg('Asal bill par Return pehle karein') },
  REJECTED: { label: msg('Warranty mein nahi'), tone: 'danger', hint: msg('Toota / paani — claim rad') },
};
export const RESOLUTIONS = Object.keys(OUTCOME) as ResolutionType[];

const STAGE: Record<ReturnType<typeof claimStageKey>, Meta> = {
  resolved: { label: msg('Theek kar diya'), tone: 'success' }, cancelled: { label: msg('Cancel'), tone: 'neutral' }, brand: { label: msg('Company ke paas'), tone: 'accent' },
  repair: { label: msg('Repair mein'), tone: 'warning' }, new: { label: msg('Naya'), tone: 'info' },
};
/** Where a claim stands as a label and tone. */
export function claimStage(c: Pick<ClaimRow, 'status' | 'resolvedAt' | 'sentToBrand' | 'resolutionType'>): Meta {
  if (c.resolvedAt) return OUTCOME[(c.resolutionType as ResolutionType) ?? 'REPAIRED'] ?? OUTCOME.REPAIRED;
  return STAGE[claimStageKey(c)];
}

export const ISSUE_CHIPS = [msg('Chalta nahi'), msg('Screen / display'), msg('Awaaz nahi'), msg('Charging'), msg('Battery'), msg('Remote / button'), msg('Garam hota hai'), msg('Network / WiFi')];

export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
export const num = (v: string) => v.replace(/[^\d.]/g, '');
