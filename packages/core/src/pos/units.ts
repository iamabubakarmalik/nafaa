/**
 * Units and packs at the counter: piece, dozen, carton, kilo. One place for
 * the unit icon, weight units, the +/− step and turning a product with its
 * packs into the list the unit picker shows.
 */

import type { PosUnitOption } from './types';

const UNIT_EMOJI: Record<string, string> = {
  kg: '⚖️', gram: '⚖️', g: '⚖️', liter: '🧴', ml: '🧴',
  pcs: '🔢', piece: '🔢', box: '📦', carton: '📦',
  dozen: '🥚', packet: '🎁', bag: '🛍️', bottle: '🍾',
  meter: '📏', feet: '📏', tray: '🥚', bori: '🛍️',
};

export const unitEmoji = (u: string) => UNIT_EMOJI[(u || '').toLowerCase()] ?? '📦';

/** Units sold by measure: a scan says which item, not how much, so the counter asks for the weight. */
const WEIGHT_UNITS = ['kg', 'gram', 'g', 'liter', 'litre', 'l', 'ml', 'meter', 'metre', 'm', 'feet', 'ft'];

export const isWeightUnit = (u: string) => WEIGHT_UNITS.includes((u || '').toLowerCase());

/** How much one +/− press changes the quantity. */
export const qtyStep = (unitName: string) => {
  const u = (unitName || '').toLowerCase();
  if (u === 'kg' || u === 'liter' || u === 'meter') return 0.25;
  if (u === 'gram' || u === 'g' || u === 'ml') return 50;
  return 1;
};

/** Different spellings of one unit ("kilo", "kg", "Kilogram") as one key. */
export function unitKeyOf(unitName: string): string {
  const u = (unitName || '').toLowerCase();
  if (['kg', 'kilo', 'kilogram'].includes(u)) return 'kg';
  if (['g', 'gram', 'grams'].includes(u)) return 'gram';
  if (['l', 'liter', 'litre'].includes(u)) return 'liter';
  if (u === 'ml') return 'ml';
  if (u === 'dozen') return 'dozen';
  if (['packet', 'pack'].includes(u)) return 'packet';
  if (u === 'box') return 'box';
  if (u === 'carton') return 'carton';
  if (u === 'bag') return 'bag';
  return u;
}

export interface UnitSourceProduct {
  unit?: string | null;
  price: number;
  wholesalePrice?: number | null;
  creditPrice?: number | null;
  barcode?: string | null;
  sku?: string | null;
}

export interface UnitSourcePack {
  id: string;
  unitName: string;
  unitLabel?: string | null;
  conversionRate: number | string;
  price?: number | string | null;
  wholesalePrice?: number | null;
  creditPrice?: number | null;
  barcode?: string | null;
  sku?: string | null;
  isBase?: boolean;
}

/**
 * Product + its packs → the counter's unit list. The base unit (the
 * product's own rate) comes first; a pack named like the base unit is
 * skipped so the picker never shows "PCS" twice.
 */
export function derivePosUnits(product: UnitSourceProduct, packs: UnitSourcePack[] = []): PosUnitOption[] {
  const base = (product.unit || 'pcs').toLowerCase();
  const out: PosUnitOption[] = [{
    id: 'base',
    unitName: base,
    label: base.toUpperCase(),
    emoji: unitEmoji(base),
    conversionRate: 1,
    price: product.price,
    wholesalePrice: product.wholesalePrice ?? null,
    creditPrice: product.creditPrice ?? null,
    isBase: true,
    barcode: product.barcode ?? null,
    sku: product.sku ?? null,
  }];
  for (const u of packs) {
    if (!u?.unitName || u.isBase || u.unitName.toLowerCase() === base) continue; // the base row is the product itself
    out.push(packUnit(u, product.price));
  }
  return out;
}

/** One pack as a unit option; a pack without a price is the base price times its size. */
export function packUnit(u: UnitSourcePack, basePrice: number): PosUnitOption {
  const rate = Number(u.conversionRate) || 1;
  return {
    id: u.id,
    unitName: u.unitName,
    label: (u.unitLabel || u.unitName).toUpperCase(),
    emoji: unitEmoji(u.unitName),
    conversionRate: rate,
    price: Number(u.price) || basePrice * rate,
    wholesalePrice: u.wholesalePrice ?? null,
    creditPrice: u.creditPrice ?? null,
    barcode: u.barcode ?? null,
    sku: u.sku ?? null,
  };
}

/** "2 carton = 24 pcs": the note a pack line carries. */
export function packNote(qty: number, unit: PosUnitOption, baseUnit: string): string {
  return unit.conversionRate !== 1 ? `${qty} ${unit.unitName} = ${Number((qty * unit.conversionRate).toFixed(3))} ${baseUnit}` : '';
}
