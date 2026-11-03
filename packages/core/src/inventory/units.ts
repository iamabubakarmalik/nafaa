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

/** Prices for a new pack of `rate` base units: every tier times the size, empty tiers stay empty. */
export function packPricesFromBase(base: BasePrices, rate: number) {
  return {
    price: Math.round(base.price * rate),
    costPrice: Math.round(base.costPrice * rate),
    wholesalePrice: base.wholesalePrice ? Math.round(base.wholesalePrice * rate) : null,
    creditPrice: base.creditPrice ? Math.round(base.creditPrice * rate) : null,
  };
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
