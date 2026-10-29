/**
 * Cost and quantity rules for manufacturing, kept free of the database so
 * they can be unit tested.
 *
 * - A recipe line is written in the raw item's own unit, one of its packs
 *   (ProductUnit, e.g. bori = 50 kg) or a related unit (g for an item kept
 *   in kg). Stock always moves in the item's base unit.
 * - Wastage is extra raw material used on top of every line.
 * - Fixed costs (packing, labour, gas/electricity) are per recipe batch and
 *   scale with the number of batches made.
 * - The cost of one unit made = (raw material at today's cost + fixed costs)
 *   / units made.
 */

import { convertQty, unitsCompatible } from '../../industries/restaurant/recipes/recipe-units';

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const r4 = (n: number) => Math.round((Number(n) || 0) * 10_000) / 10_000;

export interface LineUnit {
  /** Unit the line is written in. */
  unitName: string;
  /** Base units in one pack, when the unit is one of the item's packs. */
  packRate?: number | null;
  /** The raw item's base (stock) unit. */
  stockUnit: string;
}

/** Whether a line written in `unitName` can be taken from stock kept in `stockUnit`. */
export function lineUnitOk(u: LineUnit): boolean {
  if (u.packRate != null && u.packRate > 0) return true;
  return unitsCompatible(u.unitName, u.stockUnit);
}

/** Base (stock) units for `qty` written in the line's unit. */
export function toBaseQty(qty: number, u: LineUnit): number {
  const q = Number(qty) || 0;
  if (u.packRate != null && u.packRate > 0) return r4(q * u.packRate);
  return r4(convertQty(q, u.unitName, u.stockUnit));
}

export interface CostLineInput extends LineUnit {
  productId: string;
  quantity: number;
  /** Cost of one base unit of the raw item today. */
  cost: number;
}

export interface RecipeCostInput {
  yieldQty: number;
  wastagePercent?: number | null;
  packingCost?: number | null;
  labourCost?: number | null;
  overheadCost?: number | null;
  lines: CostLineInput[];
}

export interface CostedLine {
  productId: string;
  /** Base units used, wastage included. */
  baseQty: number;
  unitCost: number;
  total: number;
}

export interface RecipeCost {
  /** Recipe batches the quantity takes. */
  batches: number;
  /** Units made. */
  quantity: number;
  lines: CostedLine[];
  materialCost: number;
  extraCost: number;
  totalCost: number;
  /** Cost of one unit made. */
  unitCost: number;
}

/**
 * Raw material, fixed costs and the cost per unit for making `quantity`
 * units (default: one batch).
 */
export function costRecipe(r: RecipeCostInput, quantity?: number): RecipeCost {
  const yieldQty = Number(r.yieldQty) > 0 ? Number(r.yieldQty) : 1;
  const qty = quantity != null && quantity > 0 ? quantity : yieldQty;
  const batches = qty / yieldQty;
  const waste = 1 + Math.max(0, Number(r.wastagePercent) || 0) / 100;
  const lines = r.lines.map((l) => {
    const baseQty = r4(toBaseQty(l.quantity, l) * waste * batches);
    const unitCost = Math.max(0, Number(l.cost) || 0);
    return { productId: l.productId, baseQty, unitCost, total: r2(baseQty * unitCost) };
  });
  const materialCost = r2(lines.reduce((s, l) => s + l.baseQty * l.unitCost, 0));
  const perBatch = Math.max(0, Number(r.packingCost) || 0) + Math.max(0, Number(r.labourCost) || 0) + Math.max(0, Number(r.overheadCost) || 0);
  const extraCost = r2(perBatch * batches);
  const totalCost = r2(materialCost + extraCost);
  return { batches: r4(batches), quantity: r4(qty), lines, materialCost, extraCost, totalCost, unitCost: r4(totalCost / qty) };
}

/**
 * Weighted average cost after adding `addQty` at `addCost` to `oldQty` at
 * `oldCost` — the same rule purchases follow. Stock below zero counts as zero.
 */
export function blendCost(oldQty: number, oldCost: number, addQty: number, addCost: number): number {
  const old = Math.max(Number(oldQty) || 0, 0);
  const add = Math.max(Number(addQty) || 0, 0);
  if (old <= 0 || !(Number(oldCost) > 0)) return r4(addCost);
  if (add <= 0) return r4(oldCost);
  return r4((old * oldCost + add * addCost) / (old + add));
}

/**
 * Undo `blendCost` when goods made are taken back out: the average of what
 * stays. Keeps the current cost when nothing sensible remains.
 */
export function unblendCost(curQty: number, curCost: number, removeQty: number, removeCost: number): number {
  const left = (Number(curQty) || 0) - (Number(removeQty) || 0);
  if (left <= 0.0001) return r4(curCost);
  const value = curQty * curCost - removeQty * removeCost;
  const avg = value / left;
  return avg > 0 ? r4(avg) : r4(curCost);
}

/** Margin of a selling price over a cost, in percent of the price. */
export function marginPct(price: number, cost: number): number | null {
  const p = Number(price) || 0;
  if (p <= 0 || !(Number(cost) > 0)) return null;
  return Math.round(((p - cost) / p) * 1000) / 10;
}
