/**
 * Labels, colours and small helpers shared by the appliance pages: product
 * types, job and delivery statuses, AMC plans, warranty claims, time slots,
 * dates, WhatsApp links and API error text.
 */

import type { ApplianceCategoryType, ApplianceEnergyRating } from '../api/products.api';
import { msg, t as tr } from '@core/i18n';

/** Query roots; every appliance screen refreshes these after a change. */
export const INSTALL_KEY = 'appliance-installations';
export const SERVICE_KEY = 'appliance-services';
export const TECH_KEY = 'appliance-technicians';
export const AMC_KEY = 'appliance-amc';
export const DELIVERY_KEY = 'appliance-deliveries';
export const SERIAL_KEY = 'appliance-serials';
export const TRADE_IN_KEY = 'appliance-trade-ins';
export const CLAIM_KEY = 'appliance-claims';
export const PROFILE_KEY = 'appliance-profiles';

/** Keys other screens read (dashboard, sales, khata, cash) that move with job money. */
export const MONEY_KEYS = ['sales', 'sales-history', 'dashboard', 'khata-summary', 'customer', 'customer-ledger', 'customers', 'cash-register', 'money', 'appliance-profit'];

export interface Meta { label: string; tone: string; color: string }

export const tone = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const nice = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
const pick = (map: Record<string, Meta>, k?: string | null): Meta => map[k ?? ''] ?? { label: nice(k), tone: tone.slate, color: '#94a3b8' };

/* ── Product type ── */
interface CategoryMeta { label: string; group: string; needsInstall: boolean; heavy: boolean }
export const CATEGORY_META: Record<ApplianceCategoryType, CategoryMeta> = {
  REFRIGERATOR: { label: tr('Fridge'), group: msg('Fridge / freezer'), needsInstall: false, heavy: true },
  DEEP_FREEZER: { label: tr('Deep freezer'), group: msg('Fridge / freezer'), needsInstall: false, heavy: true },
  AIR_CONDITIONER_SPLIT: { label: tr('Split AC'), group: msg('AC'), needsInstall: true, heavy: true },
  AIR_CONDITIONER_WINDOW: { label: tr('Window AC'), group: msg('AC'), needsInstall: true, heavy: true },
  AIR_CONDITIONER_PORTABLE: { label: tr('Portable AC'), group: msg('AC'), needsInstall: false, heavy: true },
  AIR_CONDITIONER_INVERTER: { label: tr('Inverter AC'), group: msg('AC'), needsInstall: true, heavy: true },
  WASHING_MACHINE_TOP_LOAD: { label: tr('Washing machine (top)'), group: msg('Washing machine'), needsInstall: true, heavy: true },
  WASHING_MACHINE_FRONT_LOAD: { label: tr('Washing machine (front)'), group: msg('Washing machine'), needsInstall: true, heavy: true },
  WASHING_MACHINE_TWIN_TUB: { label: tr('Twin tub'), group: msg('Washing machine'), needsInstall: false, heavy: true },
  DRYER: { label: tr('Dryer'), group: msg('Washing machine'), needsInstall: true, heavy: true },
  DISHWASHER: { label: tr('Dishwasher'), group: msg('Kitchen'), needsInstall: true, heavy: true },
  LED_TV: { label: tr('LED TV'), group: msg('TV / LED'), needsInstall: true, heavy: false },
  SMART_TV: { label: tr('Smart TV'), group: msg('TV / LED'), needsInstall: true, heavy: false },
  QLED_TV: { label: tr('QLED TV'), group: msg('TV / LED'), needsInstall: true, heavy: false },
  OLED_TV: { label: tr('OLED TV'), group: msg('TV / LED'), needsInstall: true, heavy: false },
  MICROWAVE_OVEN: { label: tr('Microwave'), group: msg('Kitchen'), needsInstall: false, heavy: false },
  OTG_OVEN: { label: tr('Oven'), group: msg('Kitchen'), needsInstall: false, heavy: false },
  ELECTRIC_STOVE: { label: tr('Electric chulha'), group: msg('Kitchen'), needsInstall: true, heavy: false },
  GAS_STOVE: { label: tr('Gas chulha'), group: msg('Kitchen'), needsInstall: true, heavy: false },
  RANGE_HOOD: { label: tr('Range hood'), group: msg('Kitchen'), needsInstall: true, heavy: false },
  CHIMNEY: { label: tr('Chimney'), group: msg('Kitchen'), needsInstall: true, heavy: true },
  WATER_DISPENSER: { label: tr('Water dispenser'), group: msg('Paani / geyser'), needsInstall: false, heavy: true },
  WATER_PURIFIER: { label: tr('Water filter'), group: msg('Paani / geyser'), needsInstall: true, heavy: false },
  GEYSER_ELECTRIC: { label: tr('Electric geyser'), group: msg('Paani / geyser'), needsInstall: true, heavy: true },
  GEYSER_GAS: { label: tr('Gas geyser'), group: msg('Paani / geyser'), needsInstall: true, heavy: true },
  AIR_COOLER: { label: tr('Air cooler'), group: msg('Cooler / pankha'), needsInstall: false, heavy: true },
  AIR_PURIFIER: { label: tr('Air purifier'), group: msg('Cooler / pankha'), needsInstall: false, heavy: false },
  ROOM_HEATER: { label: tr('Heater'), group: msg('Cooler / pankha'), needsInstall: false, heavy: false },
  FAN_CEILING: { label: tr('Ceiling fan'), group: msg('Cooler / pankha'), needsInstall: true, heavy: false },
  FAN_PEDESTAL: { label: tr('Pedestal fan'), group: msg('Cooler / pankha'), needsInstall: false, heavy: false },
  VACUUM_CLEANER: { label: tr('Vacuum cleaner'), group: msg('Chhota saman'), needsInstall: false, heavy: false },
  BLENDER: { label: tr('Blender / grinder'), group: msg('Chhota saman'), needsInstall: false, heavy: false },
  JUICER: { label: tr('Juicer'), group: msg('Chhota saman'), needsInstall: false, heavy: false },
  IRON_STEAM: { label: tr('Steam iron'), group: msg('Chhota saman'), needsInstall: false, heavy: false },
  IRON_DRY: { label: tr('Iron'), group: msg('Chhota saman'), needsInstall: false, heavy: false },
  UPS: { label: tr('UPS'), group: msg('Bijli / solar'), needsInstall: true, heavy: true },
  SOLAR_PANEL: { label: tr('Solar panel'), group: msg('Bijli / solar'), needsInstall: true, heavy: true },
  SOLAR_INVERTER: { label: tr('Solar inverter'), group: msg('Bijli / solar'), needsInstall: true, heavy: true },
  BATTERY: { label: tr('Battery'), group: msg('Bijli / solar'), needsInstall: false, heavy: true },
  GENERATOR: { label: tr('Generator'), group: msg('Bijli / solar'), needsInstall: true, heavy: true },
  OTHER: { label: tr('Kuch aur'), group: msg('Kuch aur'), needsInstall: false, heavy: false },
};
export const CATEGORY_TYPES = Object.keys(CATEGORY_META) as ApplianceCategoryType[];
export const CATEGORY_GROUPS = [...new Set(CATEGORY_TYPES.map((c) => CATEGORY_META[c].group))];
export const catMeta = (c?: string | null) => CATEGORY_META[(c ?? 'OTHER') as ApplianceCategoryType] ?? CATEGORY_META.OTHER;
export const catLabel = (c?: string | null) => catMeta(c).label;
export const isAc = (c?: string | null) => !!c && c.startsWith('AIR_CONDITIONER');
export const isFridge = (c?: string | null) => c === 'REFRIGERATOR' || c === 'DEEP_FREEZER';
export const isWasher = (c?: string | null) => !!c && (c.startsWith('WASHING_MACHINE') || c === 'DRYER');
export const isTv = (c?: string | null) => !!c && c.endsWith('_TV');

/** Guesses the type from what the shopkeeper types ("Haier 1.5 ton inverter AC"). */
const NAME_HINTS: Array<[RegExp, ApplianceCategoryType]> = [
  [/inverter\s*ac|ac\s*inverter|dc\s*inverter/i, 'AIR_CONDITIONER_INVERTER'], [/window\s*ac/i, 'AIR_CONDITIONER_WINDOW'],
  [/portable\s*ac/i, 'AIR_CONDITIONER_PORTABLE'], [/\bac\b|air\s*condition|split/i, 'AIR_CONDITIONER_SPLIT'],
  [/deep\s*freez/i, 'DEEP_FREEZER'], [/fridge|refrigerat/i, 'REFRIGERATOR'],
  [/front\s*load/i, 'WASHING_MACHINE_FRONT_LOAD'], [/twin\s*tub/i, 'WASHING_MACHINE_TWIN_TUB'], [/top\s*load|washing/i, 'WASHING_MACHINE_TOP_LOAD'],
  [/dryer/i, 'DRYER'], [/dish\s*wash/i, 'DISHWASHER'], [/qled/i, 'QLED_TV'], [/oled/i, 'OLED_TV'], [/smart\s*tv|android\s*tv|google\s*tv/i, 'SMART_TV'],
  [/\btv\b|\bled\b|television/i, 'LED_TV'], [/microwave/i, 'MICROWAVE_OVEN'], [/oven|otg/i, 'OTG_OVEN'],
  [/gas\s*(stove|chulha|hob)/i, 'GAS_STOVE'], [/electric\s*(stove|chulha)/i, 'ELECTRIC_STOVE'], [/chimney/i, 'CHIMNEY'], [/hood/i, 'RANGE_HOOD'],
  [/dispenser/i, 'WATER_DISPENSER'], [/purifier|filter|\bro\b/i, 'WATER_PURIFIER'], [/gas\s*geyser/i, 'GEYSER_GAS'], [/geyser/i, 'GEYSER_ELECTRIC'],
  [/cooler/i, 'AIR_COOLER'], [/heater/i, 'ROOM_HEATER'], [/vacuum/i, 'VACUUM_CLEANER'], [/juicer/i, 'JUICER'], [/blender|grinder|chopper/i, 'BLENDER'],
  [/steam\s*iron/i, 'IRON_STEAM'], [/\biron\b|istri/i, 'IRON_DRY'], [/ceiling\s*fan/i, 'FAN_CEILING'], [/fan|pankha/i, 'FAN_PEDESTAL'],
  [/solar\s*inverter/i, 'SOLAR_INVERTER'], [/solar|panel/i, 'SOLAR_PANEL'], [/\bups\b/i, 'UPS'], [/battery/i, 'BATTERY'], [/generator/i, 'GENERATOR'],
];
export function categoryFromName(name: string): ApplianceCategoryType | null {
  for (const [re, t] of NAME_HINTS) if (re.test(name)) return t;
  return null;
}

export const ENERGY: Array<{ value: ApplianceEnergyRating; label: string }> = [
  { value: 'INVERTER', label: tr('Inverter') }, { value: 'FIVE_STAR', label: tr('5 star') }, { value: 'FOUR_STAR', label: tr('4 star') },
  { value: 'THREE_STAR', label: tr('3 star') }, { value: 'TWO_STAR', label: tr('2 star') }, { value: 'ONE_STAR', label: tr('1 star') }, { value: 'NOT_RATED', label: tr('Rating nahi') },
];
export const energyLabel = (e?: string | null) => ENERGY.find((x) => x.value === e)?.label ?? '';

/* ── Service type (installations and repairs share it) ── */
const SERVICE_TYPE: Record<string, string> = {
  INSTALLATION: tr('Installation'), DEMO: tr('Demo'), INSPECTION: tr('Checking'), REPAIR: tr('Repair'), MAINTENANCE: tr('Service / maintenance'),
  DEEP_CLEANING: tr('Deep cleaning'), GAS_REFILL: tr('Gas refill'), WARRANTY_CLAIM: tr('Warranty claim'), AMC_VISIT: tr('AMC visit'),
  RELOCATION: tr('Shifting'), UNINSTALLATION: tr('Utaarna'), OTHER: tr('Kuch aur'),
};
export const serviceTypeOf = (t?: string | null) => SERVICE_TYPE[t ?? ''] ?? nice(t);
export const INSTALL_TYPES = ['INSTALLATION', 'DEMO', 'RELOCATION', 'UNINSTALLATION', 'INSPECTION'];
export const REPAIR_TYPES = ['REPAIR', 'MAINTENANCE', 'GAS_REFILL', 'DEEP_CLEANING', 'WARRANTY_CLAIM', 'AMC_VISIT', 'INSPECTION', 'OTHER'];

/* ── Installation status ── */
const INSTALL_STATUS: Record<string, Meta> = {
  PENDING: { label: tr('Date baqi'), tone: tone.sky, color: '#0ea5e9' },
  SCHEDULED: { label: tr('Date lag gayi'), tone: tone.blue, color: '#3b82f6' },
  ASSIGNED: { label: tr('Technician laga'), tone: tone.violet, color: '#8b5cf6' },
  IN_PROGRESS: { label: tr('Kaam chal raha'), tone: tone.amber, color: '#f59e0b' },
  RESCHEDULED: { label: tr('Nayi date'), tone: tone.orange, color: '#f97316' },
  COMPLETED: { label: tr('Lag gaya'), tone: tone.green, color: '#16a34a' },
  FAILED: { label: tr('Nahi lag saka'), tone: tone.rose, color: '#e11d48' },
  CANCELLED: { label: tr('Cancel'), tone: tone.slate, color: '#94a3b8' },
};
export const installStatusOf = (s?: string | null) => pick(INSTALL_STATUS, s);
export const INSTALL_OPEN = ['PENDING', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'RESCHEDULED'];

/* ── Repair status ── */
const SERVICE_STATUS: Record<string, Meta> = {
  REQUESTED: { label: tr('Nayi shikayat'), tone: tone.sky, color: '#0ea5e9' },
  SCHEDULED: { label: tr('Date lag gayi'), tone: tone.blue, color: '#3b82f6' },
  TECHNICIAN_ASSIGNED: { label: tr('Technician laga'), tone: tone.violet, color: '#8b5cf6' },
  EN_ROUTE: { label: tr('Raaste me'), tone: tone.teal, color: '#14b8a6' },
  ON_SITE: { label: tr('Ghar pohancha'), tone: tone.teal, color: '#0d9488' },
  IN_PROGRESS: { label: tr('Kaam chal raha'), tone: tone.amber, color: '#f59e0b' },
  PENDING_PARTS: { label: tr('Parts ka intezar'), tone: tone.orange, color: '#f97316' },
  COMPLETED: { label: tr('Theek ho gaya'), tone: tone.green, color: '#16a34a' },
  UNRESOLVED: { label: tr('Theek nahi hua'), tone: tone.rose, color: '#e11d48' },
  CANCELLED: { label: tr('Cancel'), tone: tone.slate, color: '#94a3b8' },
};
export const serviceStatusOf = (s?: string | null) => pick(SERVICE_STATUS, s);
export const SERVICE_OPEN = ['REQUESTED', 'SCHEDULED', 'TECHNICIAN_ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'PENDING_PARTS'];
/** Next steps offered on an open repair, in the order the work goes. */
export const SERVICE_NEXT: Record<string, string[]> = {
  REQUESTED: ['EN_ROUTE', 'IN_PROGRESS'], SCHEDULED: ['EN_ROUTE', 'IN_PROGRESS'], TECHNICIAN_ASSIGNED: ['EN_ROUTE', 'IN_PROGRESS'],
  EN_ROUTE: ['ON_SITE'], ON_SITE: ['IN_PROGRESS', 'PENDING_PARTS'], IN_PROGRESS: ['PENDING_PARTS', 'UNRESOLVED'], PENDING_PARTS: ['IN_PROGRESS', 'UNRESOLVED'],
};

const PRIORITY: Record<string, Meta> = {
  LOW: { label: tr('Aram se'), tone: tone.slate, color: '#94a3b8' },
  NORMAL: { label: tr('Normal'), tone: tone.slate, color: '#64748b' },
  HIGH: { label: tr('Jaldi'), tone: tone.amber, color: '#f59e0b' },
  URGENT: { label: tr('Foran'), tone: tone.rose, color: '#e11d48' },
};
export const priorityOf = (p?: string | null) => pick(PRIORITY, p);
export const PRIORITIES = ['NORMAL', 'HIGH', 'URGENT', 'LOW'];

/* ── Delivery status ── */
const DELIVERY_STATUS: Record<string, Meta> = {
  PENDING: { label: tr('Gaari baqi'), tone: tone.sky, color: '#0ea5e9' },
  SCHEDULED: { label: tr('Gaari lag gayi'), tone: tone.blue, color: '#3b82f6' },
  DISPATCHED: { label: tr('Nikal gaya'), tone: tone.violet, color: '#8b5cf6' },
  ARRIVED: { label: tr('Pohanch gaya'), tone: tone.teal, color: '#14b8a6' },
  DELIVERED: { label: tr('De diya'), tone: tone.green, color: '#16a34a' },
  FAILED: { label: tr('Nahi de sake'), tone: tone.rose, color: '#e11d48' },
  CANCELLED: { label: tr('Cancel'), tone: tone.slate, color: '#94a3b8' },
};
export const deliveryStatusOf = (s?: string | null) => pick(DELIVERY_STATUS, s);
export const DELIVERY_OPEN = ['PENDING', 'SCHEDULED', 'DISPATCHED', 'ARRIVED'];

/* ── Serial unit ── */
const SERIAL_STATUS: Record<string, Meta> = {
  IN_STOCK: { label: tr('Stock me'), tone: tone.blue, color: '#3b82f6' },
  RESERVED: { label: tr('Rakha hua'), tone: tone.violet, color: '#8b5cf6' },
  SOLD: { label: tr('Bik gaya'), tone: tone.green, color: '#16a34a' },
  IN_TRANSIT: { label: tr('Raaste me'), tone: tone.teal, color: '#14b8a6' },
  IN_REPAIR: { label: tr('Repair me'), tone: tone.amber, color: '#f59e0b' },
  RETURNED: { label: tr('Wapas aaya'), tone: tone.orange, color: '#f97316' },
  DEFECTIVE: { label: tr('Kharab'), tone: tone.rose, color: '#e11d48' },
  LOST: { label: tr('Gum'), tone: tone.slate, color: '#94a3b8' },
  REMOVED: { label: tr('Register se hataya'), tone: tone.slate, color: '#94a3b8' },
};
export const serialStatusOf = (s?: string | null) => pick(SERIAL_STATUS, s);
export const SERIAL_STATUSES = ['IN_STOCK', 'SOLD', 'RESERVED', 'IN_REPAIR', 'RETURNED', 'DEFECTIVE', 'LOST'];

/* ── Old appliance taken in trade ── */
const TRADE_IN_STATUS: Record<string, Meta> = {
  HELD: { label: tr('Dukaan me'), tone: tone.amber, color: '#d97706' },
  SOLD: { label: tr('Bech diya'), tone: tone.green, color: '#16a34a' },
  SCRAPPED: { label: tr('Kabar'), tone: tone.slate, color: '#64748b' },
  RETURNED: { label: tr('Customer ko wapas'), tone: tone.sky, color: '#0284c7' },
};
export const tradeInStatusOf = (s?: string | null) => pick(TRADE_IN_STATUS, s);
export const TRADE_IN_CONDITIONS: Array<{ value: 'WORKING' | 'NEEDS_REPAIR' | 'SCRAP'; label: string }> = [
  { value: 'WORKING', label: tr('Chalta hai') }, { value: 'NEEDS_REPAIR', label: tr('Repair chahiye') }, { value: 'SCRAP', label: tr('Sirf kabar') },
];
export const conditionLabel = (c?: string | null) => TRADE_IN_CONDITIONS.find((x) => x.value === c)?.label ?? '';

/* ── AMC ── */
export const AMC_PLANS: Record<string, { label: string; hint: string; color: string }> = {
  BASIC: { label: tr('Basic'), hint: tr('Sirf checking visits'), color: '#64748b' },
  STANDARD: { label: tr('Standard'), hint: tr('Visits aur mazdoori free'), color: '#2563eb' },
  PREMIUM: { label: tr('Premium'), hint: tr('Mazdoori aur gas refill free'), color: '#d97706' },
  COMPREHENSIVE: { label: tr('Comprehensive'), hint: tr('Parts bhi free'), color: '#7c3aed' },
};
export const amcPlanOf = (t?: string | null) => AMC_PLANS[t ?? 'STANDARD'] ?? AMC_PLANS.STANDARD;
const AMC_STATUS: Record<string, Meta> = {
  ACTIVE: { label: tr('Chal raha'), tone: tone.green, color: '#16a34a' },
  RENEWED: { label: tr('Renew ho gaya'), tone: tone.blue, color: '#3b82f6' },
  SUSPENDED: { label: tr('Roka hua'), tone: tone.amber, color: '#f59e0b' },
  EXPIRED: { label: tr('Khatam'), tone: tone.rose, color: '#e11d48' },
  CANCELLED: { label: tr('Cancel'), tone: tone.slate, color: '#94a3b8' },
};
export const amcStatusOf = (s?: string | null) => pick(AMC_STATUS, s);

/* ── Warranty claim (shop → brand) ── */
const CLAIM_STATUS: Record<string, Meta> = {
  DRAFT: { label: tr('Bheja nahi'), tone: tone.slate, color: '#64748b' },
  SUBMITTED: { label: tr('Company ko bheja'), tone: tone.blue, color: '#3b82f6' },
  BRAND_REVIEWING: { label: tr('Company dekh rahi'), tone: tone.teal, color: '#14b8a6' },
  APPROVED: { label: tr('Approve'), tone: tone.green, color: '#16a34a' },
  PARTIALLY_APPROVED: { label: tr('Thora approve'), tone: tone.amber, color: '#f59e0b' },
  REJECTED: { label: tr('Mana'), tone: tone.rose, color: '#e11d48' },
  SETTLED: { label: tr('Paisa mil gaya'), tone: tone.violet, color: '#8b5cf6' },
};
export const claimStatusOf = (s?: string | null) => pick(CLAIM_STATUS, s);
export const WARRANTY_KIND: Record<string, string> = { MAIN: tr('Company warranty'), COMPRESSOR: tr('Compressor'), MOTOR: tr('Motor'), SHOP: tr('Dukaan warranty') };

/* ── Common faults by type, one tap on a new complaint ── */
const ISSUES: Record<string, string[]> = {
  AC: ['Cooling nahi kar raha', 'Gas kam hai', 'Paani tapak raha', 'Awaz aa rahi', 'Remote kaam nahi kar raha', 'Compressor band'],
  'Fridge / freezer': ['Cooling nahi', 'Barf jam rahi', 'Awaz aa rahi', 'Door seal kharab', 'Light nahi jalti'],
  'Washing machine': ['Paani nahi nikalta', 'Drum nahi ghoomta', 'Awaz aa rahi', 'Paani leak', 'Spin kaam nahi karta'],
  'TV / LED': ['Screen nahi chalti', 'Awaz nahi', 'Screen par line', 'Remote kaam nahi karta', 'Panel kharab'],
  'Paani / geyser': ['Paani garam nahi hota', 'Leak', 'Element kharab', 'Thermostat kharab'],
  Kitchen: ['Garam nahi karta', 'Plate nahi ghoomti', 'Burner band', 'Ignition kaam nahi karti'],
  'Bijli / solar': ['Backup nahi deta', 'Charging nahi hoti', 'Battery kharab', 'Beep karta hai'],
  'Cooler / pankha': ['Nahi ghoomta', 'Awaz aa rahi', 'Speed kam', 'Capacitor kharab'],
};
export const issuesFor = (c?: string | null) => ISSUES[catMeta(c).group] ?? ['Chal nahi raha', 'Awaz aa rahi', 'Garam ho raha', 'Spark aa raha'];

export const TIME_SLOTS = [
  { value: '09:00-12:00', label: tr('Subah 9–12') },
  { value: '12:00-15:00', label: tr('Dopahar 12–3') },
  { value: '15:00-18:00', label: tr('Sham 3–6') },
  { value: '18:00-21:00', label: tr('Raat 6–9') },
];
export const slotLabel = (s?: string | null) => TIME_SLOTS.find((x) => x.value === s)?.label ?? s ?? '';

/* ── Dates and text ── */
export const dateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
export const dayOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const daysTo = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);
/** "3 din baqi" / "2 din late". */
export const daysPhrase = (days: number | null | undefined) => {
  if (days === null || days === undefined) return '—';
  if (days === 0) return tr('Aaj');
  if (days === 1) return tr('Kal');
  return days > 0 ? tr('{{days}} din baqi', { days }) : tr('{{days}} din guzre', { days: Math.abs(days) });
};
export const money = (v: string) => v.replace(/[^\d.]/g, '');
export const digits = (v: string) => v.replace(/\D/g, '');
const pad = (n: number) => String(n).padStart(2, '0');
export const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => dateInput(new Date());
export const addDays = (key: string, n: number) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + n); return dateInput(d); };
export const addMonths = (key: string, n: number) => { const d = new Date(`${key}T12:00:00`); d.setMonth(d.getMonth() + n); return dateInput(d); };
/** Pakistani mobile number: 03xx-xxxxxxx (11 digits) or +92. */
export const phoneOk = (v: string) => /^(\+?92|0)3\d{9}$/.test(v.replace(/[\s-]/g, ''));
export const cnicOk = (v: string) => !v.trim() || /^\d{5}-?\d{7}-?\d$/.test(v.trim());

/** WhatsApp link for a Pakistani number (03xx… or 923xx…). */
export function waLink(phone: string | null | undefined, text: string): string | undefined {
  const d = digits(phone ?? '');
  if (d.length < 10) return undefined;
  const intl = d.startsWith('92') ? d : d.startsWith('0') ? `92${d.slice(1)}` : `92${d}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

/** The server's message, or the fallback. */
export function apiError(e: unknown, fallback: string) {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || (e instanceof Error && e.message && !e.message.startsWith('Request failed') ? e.message : fallback);
}
