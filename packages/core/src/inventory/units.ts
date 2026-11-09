/**
 * Packs and units: a product is counted in its base unit (piece, kg) and can
 * also be sold or bought in packs (dozen, box, carton) of N base units. One
 * place for the conversions, the per-unit price of a pack and the ready-made
 * pack sizes the product editor offers.
 */

export type PackKind = 'BASE' | 'PACK' | 'BOX' | 'DOZEN' | 'CARTON' | 'CUSTOM';

/** Ready-made pack sizes (same list as the web editor). Names are raw text; translate at render. */
export const PACK_PRESETS: ReadonlyArray<{ name: string; rate: number; type: PackKind }> = [
  { name: 'Aadha darjan', rate: 6, type: 'PACK' },
  { name: 'Darjan', rate: 12, type: 'DOZEN' },
  { name: 'Pack (10)', rate: 10, type: 'PACK' },
  { name: 'Dabba (24)', rate: 24, type: 'BOX' },
  { name: 'Carton', rate: 120, type: 'CARTON' },
  { name: 'Bori (50)', rate: 50, type: 'CUSTOM' },
];

/** Units sold by measure (a scan says which item, not how much). */
const WEIGHED = new Set(['kg', 'g', 'gram', 'grams', 'lb', 'litre', 'liter', 'l', 'ml', 'meter', 'metre', 'm', 'ft', 'feet', 'sqft', 'sqm', 'yard']);
export const isWeighedUnit = (unit: string | null | undefined) => WEIGHED.has(String(unit ?? '').trim().toLowerCase());

/** Quick quantities for a stock or count field: fractions for weighed goods. */
export const quickQuantities = (unit: string | null | undefined): number[] =>
  isWeighedUnit(unit) ? [0.25, 0.5, 1, 2, 5, 10] : [1, 5, 10, 25, 50, 100];

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Base units in `qty` packs of `rate` (2 cartons of 24 = 48). */
export const toBaseQty = (qty: number, rate: number | null | undefined) => r3((Number(qty) || 0) * (Number(rate) > 0 ? Number(rate) : 1));

/** Packs of `rate` in `baseQty` base units (48 pieces = 2 cartons of 24). */
export const fromBaseQty = (baseQty: number, rate: number | null | undefined) => r3((Number(baseQty) || 0) / (Number(rate) > 0 ? Number(rate) : 1));

/** Price of one base unit when a pack of `rate` sells for `packPrice`. */
export const perBaseUnit = (packPrice: number, rate: number) => (rate > 0 ? (Number(packPrice) || 0) / rate : 0);

/** How much cheaper one base unit is in the pack than loose, in percent (0 when not cheaper). */
export function packSavingPct(basePrice: number, packPrice: number, rate: number): number {
  if (!(basePrice > 0) || !(rate > 1)) return 0;
  const saving = ((basePrice - perBaseUnit(packPrice, rate)) / basePrice) * 100;
  return saving > 0 ? r2(saving) : 0;
}

/** Pack price from the base price, with an optional discount in percent, rounded to whole rupees. */
export const packPrice = (basePrice: number, rate: number, discountPct = 0) =>
  Math.round((Number(basePrice) || 0) * rate * (1 - discountPct / 100));

export interface BasePrices {
  price: number;
  costPrice: number;
  wholesalePrice: number | null;
  creditPrice: number | null;
}

/** Prices for a new pack of `rate` base units: every tier times the size (prices in whole rupees, cost keeps paisa), empty tiers stay empty. */
export const packPricesFromBase = (base: BasePrices, rate: number) => autoPackPrices(base, rate);

/*
 * Automatic pack prices. Each price tier of a pack follows the piece price
 * times the pack size (less an optional pack discount) until the user types
 * their own rate into that tier. Nothing about this is stored: on load a tier
 * counts as automatic when its saved value matches the automatic one within
 * rounding.
 */

/** The four price tiers a pack carries. */
export const PACK_PRICE_FIELDS = ['price', 'costPrice', 'wholesalePrice', 'creditPrice'] as const;
export type PackPriceField = (typeof PACK_PRICE_FIELDS)[number];

/** Tiers the user typed by hand; every other tier follows the piece. */
export type PackManual = Partial<Record<PackPriceField, boolean>>;

/** Largest pack discount read back from saved prices. */
const MAX_PACK_DISCOUNT = 50;
const clampDiscount = (d: number | null | undefined) => Math.min(100, Math.max(0, Number(d) || 0));

/**
 * Automatic value of one pack tier: piece value x pack size. Sale tiers take
 * off the pack discount and round to whole rupees; cost keeps paisa and is
 * never discounted. Wholesale and credit stay empty when the piece has none.
 */
export function autoPackValue(field: PackPriceField, base: BasePrices, rate: number, discountPct = 0): number | null {
  const size = Number(rate) > 0 ? Number(rate) : 0;
  if (field === 'costPrice') return r2((Number(base.costPrice) || 0) * size);
  const piece = Number(base[field]);
  if (field !== 'price' && !(piece > 0)) return null;
  return Math.round((piece || 0) * size * (1 - clampDiscount(discountPct) / 100));
}

/** All four automatic tiers of a pack. */
export function autoPackPrices(base: BasePrices, rate: number, discountPct = 0) {
  return {
    price: autoPackValue('price', base, rate, discountPct) ?? 0,
    costPrice: autoPackValue('costPrice', base, rate) ?? 0,
    wholesalePrice: autoPackValue('wholesalePrice', base, rate, discountPct),
    creditPrice: autoPackValue('creditPrice', base, rate, discountPct),
  };
}

/**
 * True when a saved tier matches the automatic value within rounding. Sale
 * tiers are whole rupees (half a rupee either way); cost allows half a paisa
 * per piece, so a carton cost of 1000 over 24 pieces (41.67 each) still
 * matches. An empty saved tier means "follow", so it counts as automatic.
 */
export function isAutoValue(field: PackPriceField, stored: number | null | undefined, auto: number | null | undefined, rate = 1): boolean {
  const s = Number(stored);
  if (stored == null || !(s > 0)) return true;
  if (auto == null) return false;
  const slack = field === 'costPrice' ? Math.max(0.01, (Number(rate) || 1) * 0.005) : 0.5;
  return Math.abs(s - Number(auto)) <= slack + 1e-9;
}

/**
 * Reads a saved pack back into the automatic model: the pack discount its
 * sale price implies (a whole percent up to 50, else 0) and which tiers were
 * typed by hand.
 */
export function inferPackAuto(base: BasePrices, pack: BasePrices & { conversionRate: number }): { discountPct: number; manual: PackManual } {
  const rate = Number(pack.conversionRate) || 0;
  let discountPct = 0;
  const full = Number(base.price) * rate;
  if (Number(pack.price) > 0 && full > 0 && !isAutoValue('price', pack.price, autoPackValue('price', base, rate), rate)) {
    const d = Math.round((1 - Number(pack.price) / full) * 100);
    if (d >= 1 && d <= MAX_PACK_DISCOUNT && isAutoValue('price', pack.price, autoPackValue('price', base, rate, d), rate)) discountPct = d;
  }
  const manual: PackManual = {};
  for (const f of PACK_PRICE_FIELDS) {
    if (!isAutoValue(f, pack[f], autoPackValue(f, base, rate, discountPct), rate)) manual[f] = true;
  }
  return { discountPct, manual };
}

/**
 * The pack with its automatic tiers filled from the piece. Hand-typed tiers
 * are kept. An automatic tier keeps its saved value while that still matches
 * within rounding (so a typed carton cost of 1000 is not shown as 1000.08).
 */
export function applyAutoPrices<T extends BasePrices & { conversionRate: number }>(base: BasePrices, pack: T, manual: PackManual = {}, discountPct = 0): T {
  const out = { ...pack };
  const rate = Number(pack.conversionRate) || 0;
  for (const f of PACK_PRICE_FIELDS) {
    if (manual[f]) continue;
    const auto = autoPackValue(f, base, rate, discountPct);
    const saved = pack[f];
    const keep = saved != null && Number(saved) > 0 && auto != null && isAutoValue(f, saved, auto, rate);
    (out as BasePrices)[f] = (keep ? Number(saved) : f === 'price' || f === 'costPrice' ? auto ?? 0 : auto) as never;
  }
  return out;
}

/** One piece's value from a pack value (carton cost / 24), keeping paisa. */
export const pieceFromPack = (packValue: number, rate: number) => (Number(rate) > 0 ? r2((Number(packValue) || 0) / Number(rate)) : 0);

/**
 * Summary of a pack for its one-line description: price per piece, profit
 * on the pack and its margin, and how much a piece saves over buying loose.
 */
export function packSummary(base: BasePrices, pack: BasePrices & { conversionRate: number }) {
  const rate = Number(pack.conversionRate) || 0;
  const price = Number(pack.price) || 0;
  const cost = Number(pack.costPrice) || 0;
  const perPiece = rate > 0 ? r2(price / rate) : 0;
  const profit = cost > 0 && price > 0 ? r2(price - cost) : null;
  const profitPct = profit !== null ? r2((profit / price) * 100) : null;
  const saving = Number(base.price) > 0 && rate > 1 ? r2(Number(base.price) - price / rate) : 0;
  return { perPiece, profit, profitPct, savingPerPiece: saving >= 0.01 ? saving : 0 };
}

/**
 * A base quantity written in packs, biggest first: 50 pieces with a carton
 * of 24 and a dozen = [{carton, 2}, {pcs, 2}]. Packs of 1 or less are skipped.
 */
export function splitIntoPacks(baseQty: number, baseUnit: string, packs: ReadonlyArray<{ unitName: string; conversionRate: number }>) {
  const out: Array<{ unitName: string; qty: number }> = [];
  let left = Math.max(0, Number(baseQty) || 0);
  for (const p of [...packs].filter((x) => x.conversionRate > 1).sort((a, b) => b.conversionRate - a.conversionRate)) {
    const n = Math.floor(left / p.conversionRate + 1e-9);
    if (n > 0) { out.push({ unitName: p.unitName, qty: n }); left = r3(left - n * p.conversionRate); }
  }
  if (left > 0 || !out.length) out.push({ unitName: baseUnit, qty: r3(left) });
  return out;
}

/** Two pack barcodes that are the same (ignoring blanks); used to stop a save. */
export function duplicateCodes(codes: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const c of codes) {
    const k = String(c ?? '').trim().toLowerCase();
    if (!k) continue;
    if (seen.has(k)) dup.add(k); else seen.add(k);
  }
  return [...dup];
}

/** Opening stock on a new product: variants and batches carry their own, otherwise the simple count. */
export function openingStock(core: { stock: number; variants: ReadonlyArray<{ stock: number }>; batches: ReadonlyArray<{ quantity: number }> }) {
  if (core.variants.length) return core.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  if (core.batches.length) return core.batches.reduce((s, b) => s + (Number(b.quantity) || 0), 0);
  return Number(core.stock) || 0;
}
