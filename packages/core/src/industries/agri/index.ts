/**
 * Pure rules of the agri pack (shared by web and mobile): product kind from
 * a category or name, unit conversion between bags, kilos and litres,
 * government registration state, farmer credit and the bulk order flow.
 * No labels here; screens translate the keys.
 */

export type AgriKind =
  | 'SEEDS' | 'FERTILIZER' | 'PESTICIDE' | 'HERBICIDE' | 'FUNGICIDE'
  | 'INSECTICIDE' | 'ANIMAL_FEED' | 'POULTRY_FEED' | 'CATTLE_FEED' | 'FISH_FEED'
  | 'VETERINARY_MEDICINE' | 'FARM_TOOLS' | 'IRRIGATION' | 'MACHINERY_PART'
  | 'MULCH_COVER' | 'GROWTH_HORMONE' | 'SOIL_CONDITIONER' | 'PLANT_NUTRIENT'
  | 'ORGANIC_INPUT' | 'OTHER';

export type OrderStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';

const RULES: Array<[AgriKind, string[]]> = [
  ['POULTRY_FEED', ['poultry', 'murghi', 'murgi', 'chick', 'broiler', 'layer feed']],
  ['CATTLE_FEED', ['cattle', 'mawayshi', 'wanda', 'vanda', 'bhains', 'gaye ka feed', 'dairy feed']],
  ['FISH_FEED', ['fish feed', 'machhli', 'machli']],
  ['ANIMAL_FEED', ['feed', 'chara', 'khal', 'banola', 'silage', 'jaanwar ka']],
  ['VETERINARY_MEDICINE', ['veterinary', 'jaanwar ki dawa', 'animal medicine', 'vaccine', 'dewormer', 'tika']],
  ['HERBICIDE', ['herbicide', 'weedicide', 'weed', 'ghaas', 'khar patwar', 'kharpatwar']],
  ['FUNGICIDE', ['fungicide', 'fungus', 'phaphoondi', 'blight', 'rust']],
  ['INSECTICIDE', ['insecticide', 'sundi', 'sunni', 'keera', 'keeray', 'kira']],
  ['PESTICIDE', ['pesticide', 'spray', 'zeher', 'zahar', 'dawa', 'acaricide', 'miticide', 'nematicide']],
  ['GROWTH_HORMONE', ['hormone', 'growth regulator', 'pgr', 'rooting']],
  ['SOIL_CONDITIONER', ['soil', 'zameen', 'gypsum', 'lime', 'humic', 'sudhaar']],
  ['PLANT_NUTRIENT', ['micronutrient', 'nutrient', 'ghiza', 'boron', 'zinc', 'foliar', 'chelate']],
  ['ORGANIC_INPUT', ['organic', 'compost', 'gobar', 'bio', 'vermi', 'neem cake']],
  ['FERTILIZER', ['fertilizer', 'khaad', 'khad', 'urea', 'dap', 'npk', 'potash', 'sop', 'mop', 'ssp', 'nitro', 'can bag']],
  ['IRRIGATION', ['irrigation', 'drip', 'sprinkler', 'pipe', 'paani', 'nozzle', 'hose', 'tube well', 'tubewell']],
  ['MACHINERY_PART', ['machine', 'purza', 'spare', 'bearing', 'belt', 'blade', 'tractor', 'thresher']],
  ['MULCH_COVER', ['mulch', 'tarpal', 'tarpaulin', 'plastic sheet', 'cover', 'tunnel']],
  ['FARM_TOOLS', ['tool', 'auzaar', 'belcha', 'kudal', 'darati', 'sprayer', 'drum', 'kassi', 'rassi']],
  // Seeds last: crop words also appear in fertilizer and spray names.
  ['SEEDS', ['seed', 'beej', 'bij', 'gandum', 'wheat', 'cotton', 'kapas', 'dhan', 'paddy', 'maize', 'makai', 'sabzi', 'nursery', 'pouda', 'plant']],
];

/** Kind from the shop's category name and the product name; OTHER when nothing matches. */
export function deriveAgriKind(categoryName?: string | null, productName?: string | null): AgriKind {
  const hay = `${categoryName ?? ''} ${productName ?? ''}`.toLowerCase();
  if (!hay.trim()) return 'OTHER';
  for (const [value, words] of RULES) if (words.some((w) => hay.includes(w))) return value;
  return 'OTHER';
}

export const isSprayKind = (k: AgriKind) => (['PESTICIDE', 'HERBICIDE', 'FUNGICIDE', 'INSECTICIDE', 'GROWTH_HORMONE', 'VETERINARY_MEDICINE'] as AgriKind[]).includes(k);
export const isSeedKind = (k: AgriKind) => k === 'SEEDS';
export const isFertKind = (k: AgriKind) => (['FERTILIZER', 'SOIL_CONDITIONER', 'PLANT_NUTRIENT', 'ORGANIC_INPUT'] as AgriKind[]).includes(k);
export const isFeedKind = (k: AgriKind) => (['ANIMAL_FEED', 'POULTRY_FEED', 'CATTLE_FEED', 'FISH_FEED'] as AgriKind[]).includes(k);
export const isToolKind = (k: AgriKind) => (['FARM_TOOLS', 'IRRIGATION', 'MACHINERY_PART', 'MULCH_COVER'] as AgriKind[]).includes(k);
/** Seeds (Seed Act), pesticides and fertilizer cannot be sold without a valid registration. */
export const needsGovtReg = (k: AgriKind) => isSprayKind(k) || isSeedKind(k) || k === 'FERTILIZER';

const WEIGHT_IN_GRAM: Record<string, number> = { gram: 1, kg: 1000, ton: 1_000_000 };
const VOLUME_IN_ML: Record<string, number> = { ml: 1, litre: 1000 };
const PACKED = ['bag', 'packet', 'bottle', 'bundle', 'pcs', 'custom'];

/** How many `baseKey` units one `fromKey` unit holds; a bag's weight comes from the product's pack size and unit. */
export function agriRate(fromKey: string, baseKey: string, opts: { packSize?: number | ''; packUnit?: string } = {}): number {
  if (fromKey === baseKey) return 1;
  const packQty = Number(opts.packSize) || 0;
  const packUnit = (opts.packUnit || 'kg').toLowerCase();
  const packInGram = packQty > 0 && WEIGHT_IN_GRAM[packUnit] ? packQty * WEIGHT_IN_GRAM[packUnit] : 0;
  const packInMl = packQty > 0 && VOLUME_IN_ML[packUnit] ? packQty * VOLUME_IN_ML[packUnit] : 0;
  if (WEIGHT_IN_GRAM[fromKey] && WEIGHT_IN_GRAM[baseKey]) return WEIGHT_IN_GRAM[fromKey] / WEIGHT_IN_GRAM[baseKey];
  if (VOLUME_IN_ML[fromKey] && VOLUME_IN_ML[baseKey]) return VOLUME_IN_ML[fromKey] / VOLUME_IN_ML[baseKey];
  if (PACKED.includes(fromKey) && WEIGHT_IN_GRAM[baseKey]) return packInGram > 0 ? packInGram / WEIGHT_IN_GRAM[baseKey] : 1;
  if (PACKED.includes(fromKey) && VOLUME_IN_ML[baseKey]) return packInMl > 0 ? packInMl / VOLUME_IN_ML[baseKey] : 1;
  if (WEIGHT_IN_GRAM[fromKey] && PACKED.includes(baseKey)) return packInGram > 0 ? WEIGHT_IN_GRAM[fromKey] / packInGram : 1;
  if (VOLUME_IN_ML[fromKey] && PACKED.includes(baseKey)) return packInMl > 0 ? VOLUME_IN_ML[fromKey] / packInMl : 1;
  return 1;
}

export type CertState = 'none' | 'ok' | 'soon' | 'expired';
/** Government registration validity from its expiry date (60 days warning). */
export function certState(expiry: string | null | undefined, now = Date.now()): { state: CertState; days: number | null } {
  if (!expiry) return { state: 'none', days: null };
  const t = new Date(expiry).getTime();
  if (Number.isNaN(t)) return { state: 'none', days: null };
  const days = Math.round((t - now) / 86_400_000);
  return { state: days < 0 ? 'expired' : days <= 60 ? 'soon' : 'ok', days };
}

/** Next step offered for an open bulk order. */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  DRAFT: 'CONFIRMED', PENDING: 'CONFIRMED', CONFIRMED: 'PROCESSING', PROCESSING: 'READY', READY: 'OUT_FOR_DELIVERY', OUT_FOR_DELIVERY: 'DELIVERED',
};
export const OPEN_STATUSES: OrderStatus[] = ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY'];

export const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

/** Bulk order money: items less discount plus delivery and other charges. */
export function orderTotals(items: Array<{ quantity: number; pricePerUnit: number; discount?: number }>, extra: { bulkDiscount?: number; deliveryCharges?: number; otherCharges?: number } = {}) {
  const subtotal = r2(items.reduce((s, i) => s + Math.max(Number(i.quantity) * Number(i.pricePerUnit) - Number(i.discount || 0), 0), 0));
  const total = Math.max(r2(subtotal - Number(extra.bulkDiscount || 0) + Number(extra.deliveryCharges || 0) + Number(extra.otherCharges || 0)), 0);
  return { subtotal, total };
}

/** Farmer credit: share of the limit used (0..1, 0 when there is no limit) and whether a new udhaar would cross it. */
export function creditUse(owed: number, limit: number) {
  return { used: limit > 0 ? Math.min(owed / limit, 1) : 0, over: limit > 0 && owed > limit };
}

/** Days a farmer's udhaar is late: days since the last purchase less the credit days; null when not owing. */
export function lateBy(owed: number, lastPurchaseAt: string | null | undefined, creditDays: number, now = Date.now()): number | null {
  if (!(owed > 0) || !lastPurchaseAt) return null;
  const since = Math.floor((now - new Date(lastPurchaseAt).getTime()) / 86_400_000);
  return since - (creditDays || 60);
}

/** 3520212345671 becomes 35202-1234567-1. */
export function formatCnic(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 13);
  return [d.slice(0, 5), d.slice(5, 12), d.slice(12)].filter(Boolean).join('-');
}
export const cnicOk = (v: string) => !v.trim() || v.replace(/\D/g, '').length === 13;
export const phoneOk = (v: string) => v.replace(/\D/g, '').length >= 10;

/* ───────────── seasonal plans and advice (older rows stored other shapes) ───────────── */

export interface PlanProduct { productId?: string; name: string; perAcre: number; unit: string }
export interface PlanStep { day: number; what: string }

export function planProducts(v: unknown): PlanProduct[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? { name: x, perAcre: 0, unit: '' } : {
    productId: (x as PlanProduct).productId, name: String((x as PlanProduct).name ?? ''), perAcre: Number((x as PlanProduct).perAcre) || 0, unit: String((x as PlanProduct).unit ?? ''),
  })).filter((p) => p.name);
}
export function planSteps(v: unknown): PlanStep[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? { day: 0, what: x } : { day: Number((x as PlanStep).day) || 0, what: String((x as PlanStep).what ?? '') }))
    .filter((s) => s.what).sort((a, b) => a.day - b.day);
}
/** Advice lines, whatever shape an older row stored them in. */
export function adviceLines(v: unknown): string[] {
  if (!Array.isArray(v)) return typeof v === 'string' && v.trim() ? [v.trim()] : [];
  return v.map((x) => (typeof x === 'string' ? x : (x as { text?: string })?.text ?? (x as { title?: string })?.title ?? (x as { name?: string })?.name ?? '')).filter(Boolean);
}
export function adviceProducts(v: unknown): Array<{ productId?: string; name: string }> {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? { name: x } : { productId: (x as { productId?: string })?.productId, name: String((x as { name?: string })?.name ?? '') })).filter((p) => p.name);
}

const DAY = 86_400_000;
const keyMs = (key: string) => Date.parse(`${key.slice(0, 10)}T00:00:00Z`);
const msKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/** Same calendar day in another year (29 Feb moves to 1 Mar). */
const inYear = (key: string, year: number) => { const d = new Date(keyMs(key)); return Date.UTC(year, d.getUTCMonth(), d.getUTCDate()); };

/**
 * The plan's sowing window in the coming cycle: its month and day moved to
 * this year (or next, once this year's window is over), so last year's plan
 * keeps working. All dates are `yyyy-mm-dd` keys on the shop's calendar.
 */
export function planCycle(p: { sowingStart: string; sowingEnd: string; harvestStart: string; harvestEnd?: string }, todayKey: string, soonDays = 45) {
  const today = keyMs(todayKey);
  const s0 = keyMs(p.sowingStart);
  const len = keyMs(p.sowingEnd) - s0;
  const harvestAt = keyMs(p.harvestStart) - s0;
  const year = new Date(today).getUTCFullYear();
  let start = inYear(p.sowingStart, year);
  if (start + len < today) start = inYear(p.sowingStart, year + 1);
  if (start - today > 300 * DAY) {
    const prev = inYear(p.sowingStart, year - 1);
    if (prev + len >= today) start = prev;
  }
  const end = start + len;
  const toSow = Math.round((start - today) / DAY);
  const harvestEnd = start + harvestAt + (p.harvestEnd ? keyMs(p.harvestEnd) - keyMs(p.harvestStart) : 0);
  return { start: msKey(start), end: msKey(end), harvest: msKey(start + harvestAt), harvestEnd: msKey(harvestEnd), toSow, now: toSow <= 0 && end >= today, soon: toSow > 0 && toSow <= soonDays };
}

/** Stock for a plan line: how many acres the stock covers; null when the product is unknown. */
export function planLineCover(perAcre: number, stock: number | null): number | null {
  return stock !== null && perAcre > 0 ? Math.floor(stock / perAcre) : null;
}
