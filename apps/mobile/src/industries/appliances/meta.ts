/**
 * Labels, tones and small helpers shared by the appliances screens (mirror of
 * the web appliances components/meta.ts). Labels are source keys marked with
 * msg() and translated where shown.
 */

import { INSTALL_OPEN, SERVICE_OPEN, categoryRule } from '@nafaa/core/industries/appliances';
import { formatDate, formatDateTime } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';

export { INSTALL_OPEN, SERVICE_OPEN };

/** Query roots; every appliance screen refreshes these after a change. */
export const KEYS = {
  install: 'appliance-installations', service: 'appliance-services', tech: 'appliance-technicians', amc: 'appliance-amc', delivery: 'appliance-deliveries',
  serial: 'appliance-serials', tradeIn: 'appliance-trade-ins', claim: 'appliance-claims', profile: 'appliance-profiles', profit: 'appliance-profit', qist: 'appliance-qist-plan',
} as const;

/** Screens outside the pack that show the same money. */
const MONEY_KEYS = ['sales-history', 'dashboard', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'money', 'inv', 'offline', KEYS.profit];

export function refreshAppliances(keys: string[], money = false) {
  [...keys, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export interface StatusMeta { label: string; tone: StatusTone }
const nice = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
const pick = (map: Record<string, StatusMeta>, k?: string | null): StatusMeta => {
  const m = map[k ?? ''];
  return m ? { label: t(m.label), tone: m.tone } : { label: nice(k), tone: 'neutral' };
};

/* ── Product type ── */

export const CATEGORY_LABEL: Record<string, string> = {
  REFRIGERATOR: msg('Fridge'), DEEP_FREEZER: msg('Deep freezer'), AIR_CONDITIONER_SPLIT: msg('Split AC'), AIR_CONDITIONER_WINDOW: msg('Window AC'),
  AIR_CONDITIONER_PORTABLE: msg('Portable AC'), AIR_CONDITIONER_INVERTER: msg('Inverter AC'), WASHING_MACHINE_TOP_LOAD: msg('Washing machine (top)'),
  WASHING_MACHINE_FRONT_LOAD: msg('Washing machine (front)'), WASHING_MACHINE_TWIN_TUB: msg('Twin tub'), DRYER: msg('Dryer'), DISHWASHER: msg('Dishwasher'),
  LED_TV: msg('LED TV'), SMART_TV: msg('Smart TV'), QLED_TV: msg('QLED TV'), OLED_TV: msg('OLED TV'), MICROWAVE_OVEN: msg('Microwave'), OTG_OVEN: msg('Oven'),
  ELECTRIC_STOVE: msg('Electric chulha'), GAS_STOVE: msg('Gas chulha'), RANGE_HOOD: msg('Range hood'), CHIMNEY: msg('Chimney'), WATER_DISPENSER: msg('Water dispenser'),
  WATER_PURIFIER: msg('Water filter'), GEYSER_ELECTRIC: msg('Electric geyser'), GEYSER_GAS: msg('Gas geyser'), AIR_COOLER: msg('Air cooler'), AIR_PURIFIER: msg('Air purifier'),
  ROOM_HEATER: msg('Heater'), FAN_CEILING: msg('Ceiling fan'), FAN_PEDESTAL: msg('Pedestal fan'), VACUUM_CLEANER: msg('Vacuum cleaner'), BLENDER: msg('Blender / grinder'),
  JUICER: msg('Juicer'), IRON_STEAM: msg('Steam iron'), IRON_DRY: msg('Iron'), UPS: msg('UPS'), SOLAR_PANEL: msg('Solar panel'), SOLAR_INVERTER: msg('Solar inverter'),
  BATTERY: msg('Battery'), GENERATOR: msg('Generator'), OTHER: msg('Kuch aur'),
};
export const GROUP_LABEL: Record<string, string> = {
  fridge: msg('Fridge / freezer'), ac: msg('AC'), washer: msg('Washing machine'), kitchen: msg('Kitchen'), tv: msg('TV / LED'), water: msg('Paani / geyser'),
  cooling: msg('Cooler / pankha'), small: msg('Chhota saman'), power: msg('Bijli / solar'), other: msg('Kuch aur'),
};
export const CATEGORY_TYPES = Object.keys(CATEGORY_LABEL);
export const GROUPS = Object.keys(GROUP_LABEL).filter((g) => g !== 'other');
export const catLabel = (c?: string | null) => t(CATEGORY_LABEL[c ?? 'OTHER'] ?? CATEGORY_LABEL.OTHER);
export const groupLabel = (g: string) => t(GROUP_LABEL[g] ?? GROUP_LABEL.other);
export const groupOf = (c?: string | null) => categoryRule(c).group;

export const ENERGY = [
  { value: 'INVERTER', label: msg('Inverter') }, { value: 'FIVE_STAR', label: msg('5 star') }, { value: 'FOUR_STAR', label: msg('4 star') },
  { value: 'THREE_STAR', label: msg('3 star') }, { value: 'TWO_STAR', label: msg('2 star') }, { value: 'ONE_STAR', label: msg('1 star') }, { value: 'NOT_RATED', label: msg('Rating nahi') },
];
export const energyLabel = (e?: string | null) => { const x = ENERGY.find((v) => v.value === e); return x ? t(x.label) : ''; };

/** Common faults by type group, one tap on a new complaint. */
const ISSUES: Record<string, string[]> = {
  ac: [msg('Cooling nahi kar raha'), msg('Gas kam hai'), msg('Paani tapak raha'), msg('Awaz aa rahi'), msg('Remote kaam nahi kar raha'), msg('Compressor band')],
  fridge: [msg('Cooling nahi'), msg('Barf jam rahi'), msg('Awaz aa rahi'), msg('Door seal kharab'), msg('Light nahi jalti')],
  washer: [msg('Paani nahi nikalta'), msg('Drum nahi ghoomta'), msg('Awaz aa rahi'), msg('Paani leak'), msg('Spin kaam nahi karta')],
  tv: [msg('Screen nahi chalti'), msg('Awaz nahi'), msg('Screen par line'), msg('Remote kaam nahi karta'), msg('Panel kharab')],
  water: [msg('Paani garam nahi hota'), msg('Leak'), msg('Element kharab'), msg('Thermostat kharab')],
  kitchen: [msg('Garam nahi karta'), msg('Plate nahi ghoomti'), msg('Burner band'), msg('Ignition kaam nahi karti')],
  power: [msg('Backup nahi deta'), msg('Charging nahi hoti'), msg('Battery kharab'), msg('Beep karta hai')],
  cooling: [msg('Nahi ghoomta'), msg('Awaz aa rahi'), msg('Speed kam'), msg('Capacitor kharab')],
};
export const issuesFor = (c?: string | null) => (ISSUES[groupOf(c)] ?? [msg('Chal nahi raha'), msg('Awaz aa rahi'), msg('Garam ho raha'), msg('Spark aa raha')]).map((s) => t(s));

/* ── Service type ── */

const SERVICE_TYPE: Record<string, string> = {
  INSTALLATION: msg('Installation'), DEMO: msg('Demo'), INSPECTION: msg('Checking'), REPAIR: msg('Repair'), MAINTENANCE: msg('Service / maintenance'),
  DEEP_CLEANING: msg('Deep cleaning'), GAS_REFILL: msg('Gas refill'), WARRANTY_CLAIM: msg('Warranty claim'), AMC_VISIT: msg('AMC visit'),
  RELOCATION: msg('Shifting'), UNINSTALLATION: msg('Utaarna'), OTHER: msg('Kuch aur'),
};
export const serviceTypeOf = (v?: string | null) => (v && SERVICE_TYPE[v] ? t(SERVICE_TYPE[v]) : nice(v));

const INSTALL_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: msg('Date baqi'), tone: 'info' }, SCHEDULED: { label: msg('Date lag gayi'), tone: 'info' }, ASSIGNED: { label: msg('Technician laga'), tone: 'accent' },
  IN_PROGRESS: { label: msg('Kaam chal raha'), tone: 'warning' }, RESCHEDULED: { label: msg('Nayi date'), tone: 'warning' }, COMPLETED: { label: msg('Lag gaya'), tone: 'success' },
  FAILED: { label: msg('Nahi lag saka'), tone: 'danger' }, CANCELLED: { label: msg('Cancel'), tone: 'neutral' },
};
export const installStatus = (s?: string | null) => pick(INSTALL_STATUS, s);

const SERVICE_STATUS: Record<string, StatusMeta> = {
  REQUESTED: { label: msg('Nayi shikayat'), tone: 'info' }, SCHEDULED: { label: msg('Date lag gayi'), tone: 'info' }, TECHNICIAN_ASSIGNED: { label: msg('Technician laga'), tone: 'accent' },
  EN_ROUTE: { label: msg('Raaste me'), tone: 'accent' }, ON_SITE: { label: msg('Ghar pohancha'), tone: 'accent' }, IN_PROGRESS: { label: msg('Kaam chal raha'), tone: 'warning' },
  PENDING_PARTS: { label: msg('Parts ka intezar'), tone: 'warning' }, COMPLETED: { label: msg('Theek ho gaya'), tone: 'success' }, UNRESOLVED: { label: msg('Theek nahi hua'), tone: 'danger' },
  CANCELLED: { label: msg('Cancel'), tone: 'neutral' },
};
export const serviceStatus = (s?: string | null) => pick(SERVICE_STATUS, s);

const PRIORITY: Record<string, StatusMeta> = {
  LOW: { label: msg('Aram se'), tone: 'neutral' }, NORMAL: { label: msg('Normal'), tone: 'neutral' }, HIGH: { label: msg('Jaldi'), tone: 'warning' }, URGENT: { label: msg('Foran'), tone: 'danger' },
};
export const priorityOf = (p?: string | null) => pick(PRIORITY, p);
export const PRIORITIES = ['NORMAL', 'HIGH', 'URGENT', 'LOW'];

const DELIVERY_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: msg('Gaari baqi'), tone: 'info' }, SCHEDULED: { label: msg('Gaari lag gayi'), tone: 'info' }, DISPATCHED: { label: msg('Nikal gaya'), tone: 'accent' },
  ARRIVED: { label: msg('Pohanch gaya'), tone: 'accent' }, DELIVERED: { label: msg('De diya'), tone: 'success' }, FAILED: { label: msg('Nahi de sake'), tone: 'danger' }, CANCELLED: { label: msg('Cancel'), tone: 'neutral' },
};
export const deliveryStatus = (s?: string | null) => pick(DELIVERY_STATUS, s);

const SERIAL_STATUS: Record<string, StatusMeta> = {
  IN_STOCK: { label: msg('Stock me'), tone: 'info' }, RESERVED: { label: msg('Rakha hua'), tone: 'accent' }, SOLD: { label: msg('Bik gaya'), tone: 'success' },
  IN_TRANSIT: { label: msg('Raaste me'), tone: 'accent' }, IN_REPAIR: { label: msg('Repair me'), tone: 'warning' }, RETURNED: { label: msg('Wapas aaya'), tone: 'warning' },
  DEFECTIVE: { label: msg('Kharab'), tone: 'danger' }, LOST: { label: msg('Gum'), tone: 'neutral' }, REMOVED: { label: msg('Register se hataya'), tone: 'neutral' },
};
export const serialStatus = (s?: string | null) => pick(SERIAL_STATUS, s);
export const SERIAL_STATUSES = ['IN_STOCK', 'SOLD', 'RESERVED', 'IN_REPAIR', 'RETURNED', 'DEFECTIVE', 'LOST'];

const TRADE_IN_STATUS: Record<string, StatusMeta> = {
  HELD: { label: msg('Dukaan me'), tone: 'warning' }, SOLD: { label: msg('Bech diya'), tone: 'success' }, SCRAPPED: { label: msg('Kabar'), tone: 'neutral' }, RETURNED: { label: msg('Customer ko wapas'), tone: 'info' },
};
export const tradeInStatus = (s?: string | null) => pick(TRADE_IN_STATUS, s);
export const TRADE_IN_CONDITIONS = [
  { value: 'WORKING', label: msg('Chalta hai') }, { value: 'NEEDS_REPAIR', label: msg('Repair chahiye') }, { value: 'SCRAP', label: msg('Sirf kabar') },
];
export const conditionLabel = (c?: string | null) => { const x = TRADE_IN_CONDITIONS.find((v) => v.value === c); return x ? t(x.label) : ''; };

export const AMC_PLANS: Record<string, { label: string; hint: string }> = {
  BASIC: { label: msg('Basic'), hint: msg('Sirf checking visits') }, STANDARD: { label: msg('Standard'), hint: msg('Visits aur mazdoori free') },
  PREMIUM: { label: msg('Premium'), hint: msg('Mazdoori aur gas refill free') }, COMPREHENSIVE: { label: msg('Comprehensive'), hint: msg('Parts bhi free') },
};
export const amcPlanLabel = (v?: string | null) => t((AMC_PLANS[v ?? 'STANDARD'] ?? AMC_PLANS.STANDARD).label);
const AMC_STATUS: Record<string, StatusMeta> = {
  ACTIVE: { label: msg('Chal raha'), tone: 'success' }, RENEWED: { label: msg('Renew ho gaya'), tone: 'info' }, SUSPENDED: { label: msg('Roka hua'), tone: 'warning' },
  EXPIRED: { label: msg('Khatam'), tone: 'danger' }, CANCELLED: { label: msg('Cancel'), tone: 'neutral' },
};
export const amcStatus = (s?: string | null) => pick(AMC_STATUS, s);

const CLAIM_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: msg('Bheja nahi'), tone: 'neutral' }, SUBMITTED: { label: msg('Company ko bheja'), tone: 'info' }, BRAND_REVIEWING: { label: msg('Company dekh rahi'), tone: 'accent' },
  APPROVED: { label: msg('Approve'), tone: 'success' }, PARTIALLY_APPROVED: { label: msg('Thora approve'), tone: 'warning' }, REJECTED: { label: msg('Mana'), tone: 'danger' }, SETTLED: { label: msg('Paisa mil gaya'), tone: 'brand' },
};
export const claimStatus = (s?: string | null) => pick(CLAIM_STATUS, s);
export const WARRANTY_KIND: Record<string, string> = { MAIN: msg('Company warranty'), COMPRESSOR: msg('Compressor'), MOTOR: msg('Motor'), SHOP: msg('Dukaan warranty') };
export const warrantyKindLabel = (k?: string | null) => (k && WARRANTY_KIND[k] ? t(WARRANTY_KIND[k]) : k ?? '');

/* ── Dates and text ── */

export const dayOnly = (iso?: string | null) => (iso ? formatDate(iso, { year: true }) : '—');
export const dateTime = (iso?: string | null) => (iso ? formatDateTime(iso) : '—');
export const daysTo = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);
/** "3 din baqi" / "2 din guzre". */
export function daysPhrase(days: number | null | undefined) {
  if (days === null || days === undefined) return '—';
  if (days === 0) return t('Aaj');
  if (days === 1) return t('Kal');
  return days > 0 ? t('{{days}} din baqi', { days }) : t('{{days}} din guzre', { days: Math.abs(days) });
}
