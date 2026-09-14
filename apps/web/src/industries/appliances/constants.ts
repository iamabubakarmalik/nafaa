/**
 * Home Appliances — saari industry ke sanjhe labels, rang aur emoji.
 *
 * Har page apni jagah enum ko translate karta tha, is liye kahin
 * "AIR_CONDITIONER_SPLIT" chapta tha aur kahin "Split AC". Ab sab
 * yahin se aata hai — Roman Urdu me, dukaan-daar ki zabaan me.
 */
import type { ApplianceCategoryType, ApplianceEnergyRating } from './api/products.api';

/* ═══════════════════════════════════════════════════════════
   CATEGORY — 41 qism ke appliance
   ═══════════════════════════════════════════════════════════ */
export interface CategoryMeta {
  label: string;
  emoji: string;
  /** Bara group — filter chips aur reports me isi se todte hain */
  group: string;
  /** Ye cheez lagane wali hai? (AC, geyser, washing machine…) */
  needsInstall: boolean;
  /** Bhari saman — delivery me gaari/helper chahiye */
  heavy: boolean;
}

export const CATEGORY_META: Record<ApplianceCategoryType, CategoryMeta> = {
  REFRIGERATOR:              { label: 'Fridge',              emoji: '🧊', group: 'Cooling',  needsInstall: false, heavy: true },
  DEEP_FREEZER:              { label: 'Deep Freezer',        emoji: '❄️', group: 'Cooling',  needsInstall: false, heavy: true },

  AIR_CONDITIONER_SPLIT:     { label: 'Split AC',            emoji: '🌬️', group: 'AC',       needsInstall: true,  heavy: true },
  AIR_CONDITIONER_WINDOW:    { label: 'Window AC',           emoji: '🪟', group: 'AC',       needsInstall: true,  heavy: true },
  AIR_CONDITIONER_PORTABLE:  { label: 'Portable AC',         emoji: '🎐', group: 'AC',       needsInstall: false, heavy: true },
  AIR_CONDITIONER_INVERTER:  { label: 'Inverter AC',         emoji: '⚡', group: 'AC',       needsInstall: true,  heavy: true },

  WASHING_MACHINE_TOP_LOAD:  { label: 'Washing M. (Top)',    emoji: '🫧', group: 'Laundry',  needsInstall: true,  heavy: true },
  WASHING_MACHINE_FRONT_LOAD:{ label: 'Washing M. (Front)',  emoji: '🌀', group: 'Laundry',  needsInstall: true,  heavy: true },
  WASHING_MACHINE_TWIN_TUB:  { label: 'Twin Tub',            emoji: '🪣', group: 'Laundry',  needsInstall: false, heavy: true },
  DRYER:                     { label: 'Dryer',               emoji: '🌪️', group: 'Laundry',  needsInstall: true,  heavy: true },
  DISHWASHER:                { label: 'Dishwasher',          emoji: '🍽️', group: 'Kitchen',  needsInstall: true,  heavy: true },

  LED_TV:                    { label: 'LED TV',              emoji: '📺', group: 'TV',       needsInstall: true,  heavy: false },
  SMART_TV:                  { label: 'Smart TV',            emoji: '📱', group: 'TV',       needsInstall: true,  heavy: false },
  QLED_TV:                   { label: 'QLED TV',             emoji: '🖥️', group: 'TV',       needsInstall: true,  heavy: false },
  OLED_TV:                   { label: 'OLED TV',             emoji: '✨', group: 'TV',       needsInstall: true,  heavy: false },

  MICROWAVE_OVEN:            { label: 'Microwave',           emoji: '📡', group: 'Kitchen',  needsInstall: false, heavy: false },
  OTG_OVEN:                  { label: 'OTG Oven',            emoji: '🍞', group: 'Kitchen',  needsInstall: false, heavy: false },
  ELECTRIC_STOVE:            { label: 'Electric Chulha',     emoji: '🔌', group: 'Kitchen',  needsInstall: true,  heavy: false },
  GAS_STOVE:                 { label: 'Gas Chulha',          emoji: '🔥', group: 'Kitchen',  needsInstall: true,  heavy: false },
  RANGE_HOOD:                { label: 'Range Hood',          emoji: '🌫️', group: 'Kitchen',  needsInstall: true,  heavy: false },

  WATER_DISPENSER:           { label: 'Water Dispenser',     emoji: '🚰', group: 'Water',    needsInstall: false, heavy: true },
  WATER_PURIFIER:            { label: 'Water Purifier',      emoji: '💧', group: 'Water',    needsInstall: true,  heavy: false },
  GEYSER_ELECTRIC:           { label: 'Electric Geyser',     emoji: '♨️', group: 'Water',    needsInstall: true,  heavy: true },
  GEYSER_GAS:                { label: 'Gas Geyser',          emoji: '🔥', group: 'Water',    needsInstall: true,  heavy: true },

  AIR_COOLER:                { label: 'Air Cooler',          emoji: '💨', group: 'Cooling',  needsInstall: false, heavy: true },
  AIR_PURIFIER:              { label: 'Air Purifier',        emoji: '🍃', group: 'Cooling',  needsInstall: false, heavy: false },
  ROOM_HEATER:               { label: 'Room Heater',         emoji: '🔆', group: 'Heating',  needsInstall: false, heavy: false },
  VACUUM_CLEANER:            { label: 'Vacuum Cleaner',      emoji: '🧹', group: 'Cleaning', needsInstall: false, heavy: false },
  CHIMNEY:                   { label: 'Chimney',             emoji: '🏭', group: 'Kitchen',  needsInstall: true,  heavy: true },

  BLENDER:                   { label: 'Blender / Juicer M.', emoji: '🥤', group: 'Small',    needsInstall: false, heavy: false },
  JUICER:                    { label: 'Juicer',              emoji: '🍹', group: 'Small',    needsInstall: false, heavy: false },
  IRON_STEAM:                { label: 'Steam Iron',          emoji: '♨️', group: 'Small',    needsInstall: false, heavy: false },
  IRON_DRY:                  { label: 'Dry Iron',            emoji: '🧺', group: 'Small',    needsInstall: false, heavy: false },

  FAN_CEILING:               { label: 'Ceiling Fan',         emoji: '🌀', group: 'Fans',     needsInstall: true,  heavy: false },
  FAN_PEDESTAL:              { label: 'Pedestal Fan',        emoji: '🎏', group: 'Fans',     needsInstall: false, heavy: false },

  UPS:                       { label: 'UPS',                 emoji: '🔋', group: 'Power',    needsInstall: true,  heavy: true },
  SOLAR_PANEL:               { label: 'Solar Panel',         emoji: '🔆', group: 'Power',    needsInstall: true,  heavy: true },
  SOLAR_INVERTER:            { label: 'Solar Inverter',      emoji: '☀️', group: 'Power',    needsInstall: true,  heavy: true },
  BATTERY:                   { label: 'Battery',             emoji: '🔌', group: 'Power',    needsInstall: false, heavy: true },
  GENERATOR:                 { label: 'Generator',           emoji: '⛽', group: 'Power',    needsInstall: true,  heavy: true },

  OTHER:                     { label: 'Doosra',              emoji: '📦', group: 'Doosra',   needsInstall: false, heavy: false },
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_META) as ApplianceCategoryType[];

export const CATEGORY_GROUPS = [...new Set(CATEGORY_ORDER.map((c) => CATEGORY_META[c].group))];

export const catMeta = (c?: string | null): CategoryMeta =>
  CATEGORY_META[(c ?? 'OTHER') as ApplianceCategoryType] ?? CATEGORY_META.OTHER;

export const catLabel = (c?: string | null) => catMeta(c).label;
export const catEmoji = (c?: string | null) => catMeta(c).emoji;

/**
 * Category ke naam se qism ka andaza — wizard me dukaan-daar
 * "Haier 1.5 Ton Inverter AC" likhta hai, enum khud lag jaye.
 * Roman Urdu ke aam lafz bhi pehchante hain.
 */
const NAME_HINTS: Array<[RegExp, ApplianceCategoryType]> = [
  [/inverter\s*ac|ac\s*inverter/i,            'AIR_CONDITIONER_INVERTER'],
  [/split\s*ac/i,                             'AIR_CONDITIONER_SPLIT'],
  [/window\s*ac/i,                            'AIR_CONDITIONER_WINDOW'],
  [/portable\s*ac/i,                          'AIR_CONDITIONER_PORTABLE'],
  [/\bac\b|air\s*condition/i,                 'AIR_CONDITIONER_SPLIT'],
  [/deep\s*freez/i,                           'DEEP_FREEZER'],
  [/fridge|refrigerat/i,                      'REFRIGERATOR'],
  [/front\s*load/i,                           'WASHING_MACHINE_FRONT_LOAD'],
  [/twin\s*tub|do\s*tub/i,                    'WASHING_MACHINE_TWIN_TUB'],
  [/top\s*load|washing|kapray\s*dhone/i,      'WASHING_MACHINE_TOP_LOAD'],
  [/dryer|sukhane/i,                          'DRYER'],
  [/dish\s*wash|bartan\s*dhone/i,             'DISHWASHER'],
  [/qled/i,                                   'QLED_TV'],
  [/oled/i,                                   'OLED_TV'],
  [/smart\s*tv|android\s*tv/i,                'SMART_TV'],
  [/\btv\b|led|television/i,                  'LED_TV'],
  [/microwave/i,                              'MICROWAVE_OVEN'],
  [/\botg\b|baking\s*oven/i,                  'OTG_OVEN'],
  [/gas\s*(stove|chulha|choola)/i,            'GAS_STOVE'],
  [/electric\s*(stove|chulha)/i,              'ELECTRIC_STOVE'],
  [/range\s*hood|hood/i,                      'RANGE_HOOD'],
  [/chimney/i,                                'CHIMNEY'],
  [/dispenser/i,                              'WATER_DISPENSER'],
  [/purifier|\bro\b|filter/i,                 'WATER_PURIFIER'],
  [/gas\s*geyser/i,                           'GEYSER_GAS'],
  [/geyser|water\s*heater/i,                  'GEYSER_ELECTRIC'],
  [/air\s*cool|room\s*cool/i,                 'AIR_COOLER'],
  [/air\s*purif/i,                            'AIR_PURIFIER'],
  [/heater|hot\s*blow/i,                      'ROOM_HEATER'],
  [/vacuum|jharoo/i,                          'VACUUM_CLEANER'],
  [/juicer/i,                                 'JUICER'],
  [/blender|grinder|chopper/i,                'BLENDER'],
  [/steam\s*iron|bhaap/i,                     'IRON_STEAM'],
  [/iron|istri/i,                             'IRON_DRY'],
  [/ceiling\s*fan|chat\s*ka\s*pankha/i,       'FAN_CEILING'],
  [/pedestal|stand\s*fan|pankha/i,            'FAN_PEDESTAL'],
  [/solar\s*inverter/i,                       'SOLAR_INVERTER'],
  [/solar|panel/i,                            'SOLAR_PANEL'],
  [/\bups\b/i,                                'UPS'],
  [/battery|batri/i,                          'BATTERY'],
  [/generator|genset/i,                       'GENERATOR'],
];

export function categoryTypeFromName(name: string): ApplianceCategoryType | null {
  const n = (name || '').trim();
  if (!n) return null;
  for (const [re, type] of NAME_HINTS) if (re.test(n)) return type;
  return null;
}

/* ═══════════════════════════════════════════════════════════
   ENERGY RATING
   ═══════════════════════════════════════════════════════════ */
export const ENERGY_META: Record<ApplianceEnergyRating, { label: string; emoji: string; tone: string }> = {
  FIVE_STAR:  { label: '5 Star',     emoji: '⭐⭐⭐⭐⭐', tone: 'emerald' },
  FOUR_STAR:  { label: '4 Star',     emoji: '⭐⭐⭐⭐',   tone: 'emerald' },
  THREE_STAR: { label: '3 Star',     emoji: '⭐⭐⭐',     tone: 'amber' },
  TWO_STAR:   { label: '2 Star',     emoji: '⭐⭐',       tone: 'orange' },
  ONE_STAR:   { label: '1 Star',     emoji: '⭐',         tone: 'rose' },
  NOT_RATED:  { label: 'Rating nahi', emoji: '—',         tone: 'slate' },
  INVERTER:   { label: 'Inverter',   emoji: '⚡',         tone: 'blue' },
};
export const energyMeta = (e?: string | null) =>
  ENERGY_META[(e ?? 'NOT_RATED') as ApplianceEnergyRating] ?? ENERGY_META.NOT_RATED;

/* ═══════════════════════════════════════════════════════════
   SERVICE TYPE — installation, repair, AMC visit…
   ═══════════════════════════════════════════════════════════ */
export type ApplianceServiceType =
  | 'INSTALLATION' | 'DEMO' | 'INSPECTION' | 'REPAIR' | 'MAINTENANCE'
  | 'DEEP_CLEANING' | 'GAS_REFILL' | 'WARRANTY_CLAIM' | 'AMC_VISIT'
  | 'RELOCATION' | 'UNINSTALLATION' | 'OTHER';

export const SERVICE_TYPE_META: Record<ApplianceServiceType, { label: string; emoji: string; tone: string }> = {
  INSTALLATION:   { label: 'Installation',       emoji: '🔧', tone: 'blue' },
  DEMO:           { label: 'Demo / Samjhana',    emoji: '🎬', tone: 'violet' },
  INSPECTION:     { label: 'Checking',           emoji: '🔍', tone: 'slate' },
  REPAIR:         { label: 'Repair',             emoji: '🛠️', tone: 'amber' },
  MAINTENANCE:    { label: 'Maintenance',        emoji: '🧰', tone: 'teal' },
  DEEP_CLEANING:  { label: 'Deep Cleaning',      emoji: '🫧', tone: 'cyan' },
  GAS_REFILL:     { label: 'Gas Refill',         emoji: '💨', tone: 'indigo' },
  WARRANTY_CLAIM: { label: 'Warranty Claim',     emoji: '🛡️', tone: 'emerald' },
  AMC_VISIT:      { label: 'AMC Visit',          emoji: '📋', tone: 'purple' },
  RELOCATION:     { label: 'Shifting',           emoji: '🚚', tone: 'orange' },
  UNINSTALLATION: { label: 'Utaarna',            emoji: '🔩', tone: 'rose' },
  OTHER:          { label: 'Doosra',             emoji: '📌', tone: 'slate' },
};
export const svcTypeMeta = (t?: string | null) =>
  SERVICE_TYPE_META[(t ?? 'OTHER') as ApplianceServiceType] ?? SERVICE_TYPE_META.OTHER;

export const SERVICE_TYPE_ORDER = Object.keys(SERVICE_TYPE_META) as ApplianceServiceType[];

/* ═══════════════════════════════════════════════════════════
   SERVICE STATUS — repair ka safar
   ═══════════════════════════════════════════════════════════ */
export type ApplianceServiceStatus =
  | 'REQUESTED' | 'SCHEDULED' | 'TECHNICIAN_ASSIGNED' | 'EN_ROUTE'
  | 'ON_SITE' | 'IN_PROGRESS' | 'COMPLETED' | 'PENDING_PARTS'
  | 'CANCELLED' | 'UNRESOLVED';

export interface StatusMeta {
  label: string;
  emoji: string;
  /** Tailwind classes — light + dark dono */
  cls: string;
  /** Dot/bar ka rang (charts ke liye) */
  hex: string;
  isOpen: boolean;
}

export const SERVICE_STATUS_META: Record<ApplianceServiceStatus, StatusMeta> = {
  REQUESTED:           { label: 'Nayi request',      emoji: '📥', isOpen: true,  hex: '#64748b', cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/40' },
  SCHEDULED:           { label: 'Tareekh lag gayi',  emoji: '📅', isOpen: true,  hex: '#6366f1', cls: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/40' },
  TECHNICIAN_ASSIGNED: { label: 'Banda lag gaya',    emoji: '👷', isOpen: true,  hex: '#3b82f6', cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40' },
  EN_ROUTE:            { label: 'Raaste me',         emoji: '🛵', isOpen: true,  hex: '#06b6d4', cls: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/40' },
  ON_SITE:             { label: 'Ghar pohanch gaya', emoji: '🏠', isOpen: true,  hex: '#14b8a6', cls: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/40' },
  IN_PROGRESS:         { label: 'Kaam chal raha',    emoji: '🛠️', isOpen: true,  hex: '#f59e0b', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40' },
  PENDING_PARTS:       { label: 'Parts ka intezar',  emoji: '⏳', isOpen: true,  hex: '#f97316', cls: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/40' },
  COMPLETED:           { label: 'Mukammal',          emoji: '✅', isOpen: false, hex: '#10b981', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40' },
  UNRESOLVED:          { label: 'Hal nahi hua',      emoji: '⚠️', isOpen: false, hex: '#ef4444', cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40' },
  CANCELLED:           { label: 'Cancel',            emoji: '🚫', isOpen: false, hex: '#94a3b8', cls: 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-700/40 dark:text-slate-400 dark:border-slate-600' },
};
export const svcStatusMeta = (s?: string | null): StatusMeta =>
  SERVICE_STATUS_META[(s ?? 'REQUESTED') as ApplianceServiceStatus] ?? SERVICE_STATUS_META.REQUESTED;

export const SERVICE_STATUS_ORDER = Object.keys(SERVICE_STATUS_META) as ApplianceServiceStatus[];

/** Agla qadam kya hoga — status buttons isi se bante hain */
export const SERVICE_NEXT: Partial<Record<ApplianceServiceStatus, ApplianceServiceStatus[]>> = {
  REQUESTED:           ['SCHEDULED', 'CANCELLED'],
  SCHEDULED:           ['TECHNICIAN_ASSIGNED', 'CANCELLED'],
  TECHNICIAN_ASSIGNED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE:            ['ON_SITE'],
  ON_SITE:             ['IN_PROGRESS'],
  IN_PROGRESS:         ['PENDING_PARTS', 'UNRESOLVED'],
  PENDING_PARTS:       ['IN_PROGRESS', 'UNRESOLVED'],
};

/* ═══════════════════════════════════════════════════════════
   INSTALLATION STATUS
   ═══════════════════════════════════════════════════════════ */
export type ApplianceInstallationStatus =
  | 'PENDING' | 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED' | 'FAILED';

export const INSTALL_STATUS_META: Record<ApplianceInstallationStatus, StatusMeta> = {
  PENDING:     { label: 'Tareekh baqi',     emoji: '📥', isOpen: true,  hex: '#64748b', cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/40' },
  SCHEDULED:   { label: 'Tareekh lag gayi', emoji: '📅', isOpen: true,  hex: '#6366f1', cls: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/40' },
  ASSIGNED:    { label: 'Banda lag gaya',   emoji: '👷', isOpen: true,  hex: '#3b82f6', cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40' },
  IN_PROGRESS: { label: 'Kaam chal raha',   emoji: '🛠️', isOpen: true,  hex: '#f59e0b', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40' },
  RESCHEDULED: { label: 'Aage barh gayi',   emoji: '🔄', isOpen: true,  hex: '#a855f7', cls: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/40' },
  COMPLETED:   { label: 'Lag gaya',         emoji: '✅', isOpen: false, hex: '#10b981', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40' },
  FAILED:      { label: 'Nahi lag saka',    emoji: '❌', isOpen: false, hex: '#ef4444', cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40' },
  CANCELLED:   { label: 'Cancel',           emoji: '🚫', isOpen: false, hex: '#94a3b8', cls: 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-700/40 dark:text-slate-400 dark:border-slate-600' },
};
export const instStatusMeta = (s?: string | null): StatusMeta =>
  INSTALL_STATUS_META[(s ?? 'PENDING') as ApplianceInstallationStatus] ?? INSTALL_STATUS_META.PENDING;

export const INSTALL_STATUS_ORDER = Object.keys(INSTALL_STATUS_META) as ApplianceInstallationStatus[];

export const INSTALL_NEXT: Partial<Record<ApplianceInstallationStatus, ApplianceInstallationStatus[]>> = {
  PENDING:     ['SCHEDULED', 'CANCELLED'],
  SCHEDULED:   ['ASSIGNED', 'RESCHEDULED', 'CANCELLED'],
  ASSIGNED:    ['IN_PROGRESS', 'RESCHEDULED', 'CANCELLED'],
  IN_PROGRESS: ['FAILED'],
  RESCHEDULED: ['ASSIGNED', 'CANCELLED'],
};

/* ═══════════════════════════════════════════════════════════
   DELIVERY STATUS (String column hai, enum nahi)
   ═══════════════════════════════════════════════════════════ */
export const DELIVERY_STATUS_META: Record<string, StatusMeta> = {
  PENDING:    { label: 'Tareekh baqi',   emoji: '📦', isOpen: true,  hex: '#64748b', cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/40' },
  SCHEDULED:  { label: 'Gaari lag gayi', emoji: '📅', isOpen: true,  hex: '#6366f1', cls: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/40' },
  DISPATCHED: { label: 'Nikal gaya',     emoji: '🚚', isOpen: true,  hex: '#06b6d4', cls: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/40' },
  ARRIVED:    { label: 'Pohanch gaya',   emoji: '📍', isOpen: true,  hex: '#14b8a6', cls: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/40' },
  DELIVERED:  { label: 'De diya',        emoji: '✅', isOpen: false, hex: '#10b981', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40' },
  CANCELLED:  { label: 'Cancel',         emoji: '🚫', isOpen: false, hex: '#94a3b8', cls: 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-700/40 dark:text-slate-400 dark:border-slate-600' },
};
export const delStatusMeta = (s?: string | null): StatusMeta =>
  DELIVERY_STATUS_META[s ?? 'PENDING'] ?? DELIVERY_STATUS_META.PENDING;

export const DELIVERY_STATUS_ORDER = Object.keys(DELIVERY_STATUS_META);

export const DELIVERY_NEXT: Record<string, string[]> = {
  PENDING:    ['SCHEDULED', 'CANCELLED'],
  SCHEDULED:  ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['ARRIVED'],
  ARRIVED:    [],
};

/* ═══════════════════════════════════════════════════════════
   SERIAL STATUS (String column)
   ═══════════════════════════════════════════════════════════ */
export const SERIAL_STATUS_META: Record<string, StatusMeta> = {
  IN_STOCK:  { label: 'Stock me',     emoji: '📦', isOpen: true,  hex: '#3b82f6', cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40' },
  RESERVED:  { label: 'Rakha hua',    emoji: '🔖', isOpen: true,  hex: '#a855f7', cls: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/40' },
  SOLD:      { label: 'Bik gaya',     emoji: '💰', isOpen: false, hex: '#10b981', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40' },
  IN_TRANSIT:{ label: 'Raaste me',    emoji: '🚚', isOpen: true,  hex: '#06b6d4', cls: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/40' },
  IN_REPAIR: { label: 'Repair me',    emoji: '🛠️', isOpen: true,  hex: '#f59e0b', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40' },
  RETURNED:  { label: 'Wapas aaya',   emoji: '↩️', isOpen: true,  hex: '#f97316', cls: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/40' },
  DEFECTIVE: { label: 'Kharab',       emoji: '⚠️', isOpen: false, hex: '#ef4444', cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40' },
  LOST:      { label: 'Gum ho gaya',  emoji: '❓', isOpen: false, hex: '#94a3b8', cls: 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-700/40 dark:text-slate-400 dark:border-slate-600' },
};
export const serialStatusMeta = (s?: string | null): StatusMeta =>
  SERIAL_STATUS_META[s ?? 'IN_STOCK'] ?? SERIAL_STATUS_META.IN_STOCK;

export const SERIAL_STATUS_ORDER = Object.keys(SERIAL_STATUS_META);

/* ═══════════════════════════════════════════════════════════
   AMC
   ═══════════════════════════════════════════════════════════ */
export type ApplianceAmcType = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'COMPREHENSIVE';

export const AMC_TYPE_META: Record<ApplianceAmcType, { label: string; emoji: string; cls: string; hex: string; hint: string }> = {
  BASIC:         { label: 'Basic',         emoji: '🥉', hex: '#94a3b8', hint: 'Sirf checking visits',            cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/40' },
  STANDARD:      { label: 'Standard',      emoji: '🥈', hex: '#3b82f6', hint: 'Visits + labor free',             cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40' },
  PREMIUM:       { label: 'Premium',       emoji: '🥇', hex: '#f59e0b', hint: 'Labor + gas refill free',          cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40' },
  COMPREHENSIVE: { label: 'Comprehensive', emoji: '💎', hex: '#a855f7', hint: 'Parts bhi free — sab kuch cover',  cls: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/40' },
};
export const amcTypeMeta = (t?: string | null) =>
  AMC_TYPE_META[(t ?? 'STANDARD') as ApplianceAmcType] ?? AMC_TYPE_META.STANDARD;

export type ApplianceAmcStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'RENEWED' | 'SUSPENDED';

export const AMC_STATUS_META: Record<ApplianceAmcStatus, StatusMeta> = {
  ACTIVE:    { label: 'Chal raha',    emoji: '✅', isOpen: true,  hex: '#10b981', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40' },
  RENEWED:   { label: 'Renew ho gaya',emoji: '🔄', isOpen: false, hex: '#3b82f6', cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40' },
  SUSPENDED: { label: 'Rok diya',     emoji: '⏸️', isOpen: false, hex: '#f59e0b', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40' },
  EXPIRED:   { label: 'Khatam',       emoji: '⌛', isOpen: false, hex: '#ef4444', cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40' },
  CANCELLED: { label: 'Cancel',       emoji: '🚫', isOpen: false, hex: '#94a3b8', cls: 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-700/40 dark:text-slate-400 dark:border-slate-600' },
};
export const amcStatusMeta = (s?: string | null): StatusMeta =>
  AMC_STATUS_META[(s ?? 'ACTIVE') as ApplianceAmcStatus] ?? AMC_STATUS_META.ACTIVE;

/* ═══════════════════════════════════════════════════════════
   PRIORITY
   ═══════════════════════════════════════════════════════════ */
export const PRIORITY_META: Record<string, { label: string; emoji: string; cls: string; rank: number }> = {
  URGENT: { label: 'Foran',   emoji: '🚨', rank: 0, cls: 'bg-rose-600 text-white border-rose-600' },
  HIGH:   { label: 'Zaroori', emoji: '🔴', rank: 1, cls: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/40' },
  NORMAL: { label: 'Aam',     emoji: '🔵', rank: 2, cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40' },
  LOW:    { label: 'Baad me', emoji: '⚪', rank: 3, cls: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-500/15 dark:text-slate-400 dark:border-slate-500/40' },
};
export const prioMeta = (p?: string | null) => PRIORITY_META[p ?? 'NORMAL'] ?? PRIORITY_META.NORMAL;
export const PRIORITY_ORDER = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];

/* ═══════════════════════════════════════════════════════════
   AAM KHARABIYAN — service request banate waqt 1 click
   ═══════════════════════════════════════════════════════════ */
export const ISSUE_PRESETS: Record<string, string[]> = {
  AC: ['Cooling nahi kar raha', 'Gas khatam', 'Paani tapak raha', 'Awaz aa rahi', 'Remote kaam nahi kar raha', 'Compressor band'],
  Cooling: ['Cooling nahi ho rahi', 'Barf jam rahi', 'Awaz aa rahi', 'Door seal kharab', 'Light nahi jal rahi'],
  Laundry: ['Paani nahi nikal raha', 'Drum ghoom nahi raha', 'Awaz aa rahi', 'Paani leak', 'Door lock kharab', 'Spin kaam nahi kar raha'],
  TV: ['Screen nahi chal rahi', 'Awaz nahi aa rahi', 'Line aa rahi hai', 'Remote kaam nahi kar raha', 'Panel kharab'],
  Water: ['Paani garam nahi ho raha', 'Leak ho raha', 'Element kharab', 'Thermostat kharab'],
  Kitchen: ['Heating nahi ho rahi', 'Plate nahi ghoom rahi', 'Burner band', 'Ignition kaam nahi kar rahi'],
  Power: ['Backup nahi de raha', 'Charging nahi ho rahi', 'Battery kharab', 'Beep kar raha hai'],
  Fans: ['Ghoom nahi raha', 'Awaz aa rahi', 'Speed kam hai', 'Capacitor kharab'],
  Doosra: ['Chal nahi raha', 'Awaz aa rahi', 'Garam ho raha', 'Spark aa raha'],
};

/** Product ki qism ke hisab se aam kharabiyan */
export const issuesFor = (categoryType?: string | null): string[] => {
  const group = catMeta(categoryType).group;
  return ISSUE_PRESETS[group] ?? ISSUE_PRESETS.Doosra;
};

/* ═══════════════════════════════════════════════════════════
   TIME SLOTS — technician ka din
   ═══════════════════════════════════════════════════════════ */
export const TIME_SLOTS = [
  { value: '09:00-12:00', label: 'Subah 9 – 12',    emoji: '🌅' },
  { value: '12:00-15:00', label: 'Dopahar 12 – 3',  emoji: '☀️' },
  { value: '15:00-18:00', label: 'Sham 3 – 6',      emoji: '🌇' },
  { value: '18:00-21:00', label: 'Raat 6 – 9',      emoji: '🌙' },
];

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
/** "3 din baqi" / "2 din late" — warranty aur schedule dono ke liye */
export const daysPhrase = (days: number | null | undefined): string => {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'Aaj';
  if (days === 1) return 'Kal';
  if (days === -1) return '1 din late';
  if (days > 0) return `${days} din baqi`;
  return `${Math.abs(days)} din late`;
};

/** Warranty ka rang — 30 din se kam par laal */
export const warrantyTone = (days: number | null | undefined) => {
  if (days === null || days === undefined) return 'slate';
  if (days < 0) return 'rose';
  if (days <= 30) return 'amber';
  return 'emerald';
};

/* ═══════════════════════════════════════════════════════════
   WARRANTY CLAIM — brand se paisa wapas lene ka safar
   ═══════════════════════════════════════════════════════════ */
export type ApplianceClaimStatus =
  | 'DRAFT' | 'SUBMITTED' | 'BRAND_REVIEWING'
  | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'SETTLED';

export const CLAIM_STATUS_META: Record<ApplianceClaimStatus, StatusMeta> = {
  DRAFT:              { label: 'Bheja nahi',      emoji: '📝', isOpen: true,  hex: '#64748b', cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/40' },
  SUBMITTED:          { label: 'Brand ko bheja',  emoji: '📤', isOpen: true,  hex: '#3b82f6', cls: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40' },
  BRAND_REVIEWING:    { label: 'Brand dekh raha', emoji: '🔍', isOpen: true,  hex: '#06b6d4', cls: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/40' },
  APPROVED:           { label: 'Manzoor',         emoji: '✅', isOpen: true,  hex: '#10b981', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40' },
  PARTIALLY_APPROVED: { label: 'Thora manzoor',   emoji: '➗', isOpen: true,  hex: '#f59e0b', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40' },
  REJECTED:           { label: 'Mana kar diya',   emoji: '❌', isOpen: false, hex: '#ef4444', cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40' },
  SETTLED:            { label: 'Paisa mil gaya',  emoji: '💰', isOpen: false, hex: '#8b5cf6', cls: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/40' },
};
export const claimStatusMeta = (s?: string | null): StatusMeta =>
  CLAIM_STATUS_META[(s ?? 'DRAFT') as ApplianceClaimStatus] ?? CLAIM_STATUS_META.DRAFT;

export const CLAIM_STATUS_ORDER = Object.keys(CLAIM_STATUS_META) as ApplianceClaimStatus[];

/** Warranty ki qism — claim par kaunsi lagi */
export const WARRANTY_KIND_META: Record<string, { label: string; emoji: string }> = {
  MAIN:       { label: 'Main warranty', emoji: '🛡️' },
  COMPRESSOR: { label: 'Compressor',    emoji: '❄️' },
  MOTOR:      { label: 'Motor',         emoji: '⚙️' },
};
export const warrantyKindMeta = (k?: string | null) =>
  WARRANTY_KIND_META[k ?? 'MAIN'] ?? WARRANTY_KIND_META.MAIN;
