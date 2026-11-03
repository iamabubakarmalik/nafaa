/**
 * Pure rules of the appliances pack (shared by web and mobile): product types
 * with their fitting and weight flags, job money (installations, repairs,
 * AMC and delivery), repair steps, AMC plan presets and dates, warranty claim
 * money and qist instalments. No labels here; screens translate keys.
 */

export const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

/* ── Product types ── */

export interface CategoryRule { group: string; needsInstall: boolean; heavy: boolean }

export const CATEGORY_RULES: Record<string, CategoryRule> = {
  REFRIGERATOR: { group: 'fridge', needsInstall: false, heavy: true }, DEEP_FREEZER: { group: 'fridge', needsInstall: false, heavy: true },
  AIR_CONDITIONER_SPLIT: { group: 'ac', needsInstall: true, heavy: true }, AIR_CONDITIONER_WINDOW: { group: 'ac', needsInstall: true, heavy: true },
  AIR_CONDITIONER_PORTABLE: { group: 'ac', needsInstall: false, heavy: true }, AIR_CONDITIONER_INVERTER: { group: 'ac', needsInstall: true, heavy: true },
  WASHING_MACHINE_TOP_LOAD: { group: 'washer', needsInstall: true, heavy: true }, WASHING_MACHINE_FRONT_LOAD: { group: 'washer', needsInstall: true, heavy: true },
  WASHING_MACHINE_TWIN_TUB: { group: 'washer', needsInstall: false, heavy: true }, DRYER: { group: 'washer', needsInstall: true, heavy: true },
  DISHWASHER: { group: 'kitchen', needsInstall: true, heavy: true },
  LED_TV: { group: 'tv', needsInstall: true, heavy: false }, SMART_TV: { group: 'tv', needsInstall: true, heavy: false },
  QLED_TV: { group: 'tv', needsInstall: true, heavy: false }, OLED_TV: { group: 'tv', needsInstall: true, heavy: false },
  MICROWAVE_OVEN: { group: 'kitchen', needsInstall: false, heavy: false }, OTG_OVEN: { group: 'kitchen', needsInstall: false, heavy: false },
  ELECTRIC_STOVE: { group: 'kitchen', needsInstall: true, heavy: false }, GAS_STOVE: { group: 'kitchen', needsInstall: true, heavy: false },
  RANGE_HOOD: { group: 'kitchen', needsInstall: true, heavy: false }, CHIMNEY: { group: 'kitchen', needsInstall: true, heavy: true },
  WATER_DISPENSER: { group: 'water', needsInstall: false, heavy: true }, WATER_PURIFIER: { group: 'water', needsInstall: true, heavy: false },
  GEYSER_ELECTRIC: { group: 'water', needsInstall: true, heavy: true }, GEYSER_GAS: { group: 'water', needsInstall: true, heavy: true },
  AIR_COOLER: { group: 'cooling', needsInstall: false, heavy: true }, AIR_PURIFIER: { group: 'cooling', needsInstall: false, heavy: false },
  ROOM_HEATER: { group: 'cooling', needsInstall: false, heavy: false }, FAN_CEILING: { group: 'cooling', needsInstall: true, heavy: false },
  FAN_PEDESTAL: { group: 'cooling', needsInstall: false, heavy: false },
  VACUUM_CLEANER: { group: 'small', needsInstall: false, heavy: false }, BLENDER: { group: 'small', needsInstall: false, heavy: false },
  JUICER: { group: 'small', needsInstall: false, heavy: false }, IRON_STEAM: { group: 'small', needsInstall: false, heavy: false },
  IRON_DRY: { group: 'small', needsInstall: false, heavy: false },
  UPS: { group: 'power', needsInstall: true, heavy: true }, SOLAR_PANEL: { group: 'power', needsInstall: true, heavy: true },
  SOLAR_INVERTER: { group: 'power', needsInstall: true, heavy: true }, BATTERY: { group: 'power', needsInstall: false, heavy: true },
  GENERATOR: { group: 'power', needsInstall: true, heavy: true },
  OTHER: { group: 'other', needsInstall: false, heavy: false },
};

export const categoryRule = (type?: string | null): CategoryRule => CATEGORY_RULES[type ?? 'OTHER'] ?? CATEGORY_RULES.OTHER;
export const isAc = (c?: string | null) => !!c && c.startsWith('AIR_CONDITIONER');
export const isFridge = (c?: string | null) => c === 'REFRIGERATOR' || c === 'DEEP_FREEZER';
export const isWasher = (c?: string | null) => !!c && (c.startsWith('WASHING_MACHINE') || c === 'DRYER');
export const isTv = (c?: string | null) => !!c && c.endsWith('_TV');

/** Guesses the type from what the shopkeeper types ("Haier 1.5 ton inverter AC"). */
const NAME_HINTS: Array<[RegExp, string]> = [
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
export function categoryFromName(name: string): string | null {
  for (const [re, type] of NAME_HINTS) if (re.test(name)) return type;
  return null;
}

/* ── Statuses ── */

export const INSTALL_OPEN = ['PENDING', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'RESCHEDULED'];
export const SERVICE_OPEN = ['REQUESTED', 'SCHEDULED', 'TECHNICIAN_ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'PENDING_PARTS'];
export const DELIVERY_OPEN = ['PENDING', 'SCHEDULED', 'DISPATCHED', 'ARRIVED'];

/** Next steps offered on an open repair, in the order the work goes. */
export const SERVICE_NEXT: Record<string, string[]> = {
  REQUESTED: ['EN_ROUTE', 'IN_PROGRESS'], SCHEDULED: ['EN_ROUTE', 'IN_PROGRESS'], TECHNICIAN_ASSIGNED: ['EN_ROUTE', 'IN_PROGRESS'],
  EN_ROUTE: ['ON_SITE'], ON_SITE: ['IN_PROGRESS', 'PENDING_PARTS'], IN_PROGRESS: ['PENDING_PARTS', 'UNRESOLVED'], PENDING_PARTS: ['IN_PROGRESS', 'UNRESOLVED'],
};

export const INSTALL_TYPES = ['INSTALLATION', 'DEMO', 'RELOCATION', 'UNINSTALLATION', 'INSPECTION'];
export const REPAIR_TYPES = ['REPAIR', 'MAINTENANCE', 'GAS_REFILL', 'DEEP_CLEANING', 'WARRANTY_CLAIM', 'AMC_VISIT', 'INSPECTION', 'OTHER'];

/* ── Job money ── */

export interface JobMoneyInput {
  /** Charges on the job card. */
  charges: number[];
  /** Free of charge (warranty, AMC): the customer owes nothing. */
  covered: boolean;
  /** Money taken earlier. */
  advance: number;
  /** Money taken now. */
  now: number;
}

/** Total, what the customer still owes, what stays on khata and whether the money taken is too much. */
export function jobMoney(i: JobMoneyInput) {
  const total = r2(i.charges.reduce((s, v) => s + (Number(v) || 0), 0));
  const owed = i.covered ? 0 : Math.max(r2(total - i.advance), 0);
  const paid = r2(i.advance + i.now);
  return { total, owed, paid, tooMuch: !i.covered && paid > total + 0.01, left: i.covered ? 0 : Math.max(r2(total - paid), 0) };
}

/** Still to collect on a job (the server's figure when it sends one). */
export const jobDue = (total: unknown, paid: unknown, serverDue?: number | null, covered = false) =>
  serverDue ?? (covered ? 0 : Math.max(r2(Number(total) - Number(paid)), 0));

export const deliveryTotal = (c: { delivery?: unknown; loading?: unknown; unloading?: unknown; floor?: unknown }) =>
  r2([c.delivery, c.loading, c.unloading, c.floor].reduce<number>((s, v) => s + (Number(v) || 0), 0));

/* ── AMC ── */

export type AmcType = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'COMPREHENSIVE';
export const AMC_PRESETS: Record<AmcType, { visits: number; labor: boolean; parts: boolean; gas: boolean }> = {
  BASIC: { visits: 2, labor: false, parts: false, gas: false },
  STANDARD: { visits: 3, labor: true, parts: false, gas: false },
  PREMIUM: { visits: 4, labor: true, parts: false, gas: true },
  COMPREHENSIVE: { visits: 4, labor: true, parts: true, gas: true },
};
export const AMC_MONTHS = [6, 12, 24];

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** yyyy-mm-dd plus months; the day is kept inside the target month (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsKey(key: string, months: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last));
  return keyOf(target);
}
export function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return keyOf(new Date(y, m - 1, d + days));
}
/** Whole days from one yyyy-mm-dd key to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

export function amcProblems(f: { product: string; value: number; paid: number; visits: number }): string[] {
  return [
    f.product.trim().length < 2 ? 'product' : '',
    !(f.value > 0) ? 'value' : '',
    f.paid > f.value + 0.01 ? 'paid' : '',
    !(f.visits >= 0) ? 'visits' : '',
  ].filter(Boolean);
}

/* ── Warranty claims (shop to brand) ── */

/** What the brand is asked to pay back: parts, labour and other costs. */
export const claimAmount = (c: { parts?: unknown; labor?: unknown; other?: unknown }) => r2([c.parts, c.labor, c.other].reduce<number>((s, v) => s + (Number(v) || 0), 0));

export function claimMoney(c: { claimedAmount: number; approvedAmount: number; receivedAmount: number }) {
  const pending = Math.max(r2(c.approvedAmount - c.receivedAmount), 0);
  const shortfall = Math.max(r2(c.claimedAmount - c.approvedAmount), 0);
  return { pending, shortfall, recovery: c.claimedAmount > 0 ? Math.round((c.receivedAmount / c.claimedAmount) * 100) : 0 };
}

export const CLAIM_NEXT: Record<string, string[]> = {
  DRAFT: ['SUBMIT'], SUBMITTED: ['RESPOND'], BRAND_REVIEWING: ['RESPOND'], APPROVED: ['SETTLE'], PARTIALLY_APPROVED: ['SETTLE'], REJECTED: [], SETTLED: [],
};

/* ── Qist ── */

export const QIST_COUNTS = [3, 6, 9, 12, 18, 24];

/** Monthly instalments of the udhaar on a bill: equal parts, the last one takes the rounding. */
export function qistSchedule(credit: number, count: number, start: string) {
  const n = Math.max(Math.floor(count), 1);
  const each = Math.round((credit / n) * 100) / 100;
  const rows = Array.from({ length: n }, (_, i) => ({ no: i + 1, due: addMonthsKey(start, i), amount: each }));
  rows[n - 1].amount = r2(credit - each * (n - 1));
  return { each, rows };
}

export interface Guarantor { name: string; phone: string; cnic: string }
export function guarantorErrors(g: Guarantor, customerPhone = ''): { name?: 'name'; phone?: 'phone' | 'self'; cnic?: 'cnic' } {
  const tail = (v: string) => v.replace(/\D/g, '').slice(-10);
  const e: { name?: 'name'; phone?: 'phone' | 'self'; cnic?: 'cnic' } = {};
  if (g.name.trim().length < 2) e.name = 'name';
  if (g.phone.trim() && !/^(\+?92|0)3\d{9}$/.test(g.phone.replace(/[\s-]/g, ''))) e.phone = 'phone';
  else if (g.phone.trim() && customerPhone && tail(g.phone) === tail(customerPhone)) e.phone = 'self';
  if (!/^\d{5}-?\d{7}-?\d$/.test(g.cnic.trim())) e.cnic = 'cnic';
  return e;
}

/* ── Serial units ── */

/** The warranty that ends first, from days left per kind (null: not covered). */
export function soonestWarranty(days: Record<string, number | null | undefined>): { kind: string; days: number } | null {
  let best: { kind: string; days: number } | null = null;
  for (const [kind, d] of Object.entries(days)) {
    if (d == null || d < 0) continue;
    if (!best || d < best.days) best = { kind, days: d };
  }
  return best;
}

/** Serial numbers typed one per line, comma or space separated: trimmed, upper-cased, duplicates dropped. */
export function parseSerials(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(/[\s,;]+/)) {
    const s = part.trim().toUpperCase();
    if (s.length >= 3) seen.add(s);
  }
  return [...seen];
}
