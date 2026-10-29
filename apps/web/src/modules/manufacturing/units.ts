/**
 * Recipe line units on the client, matching the server: a line may be in the
 * raw item's own unit, one of its packs (bori = 50 kg) or a related unit
 * (g for an item kept in kg). Used for the live cost while editing.
 */

const MASS: Record<string, number> = { kg: 1000, kgs: 1000, kilo: 1000, kilogram: 1000, kilograms: 1000, g: 1, gm: 1, gms: 1, gram: 1, grams: 1, mg: 0.001, lb: 453.592, lbs: 453.592, oz: 28.3495 };
const VOLUME: Record<string, number> = { l: 1000, ltr: 1000, litre: 1000, liter: 1000, liters: 1000, litres: 1000, ml: 1, millilitre: 1, milliliter: 1 };
const COUNT: Record<string, number> = { pc: 1, pcs: 1, piece: 1, pieces: 1, nos: 1, dozen: 12, dz: 12 };

const norm = (u?: string | null) => (u ?? '').trim().toLowerCase();

/** Quantity in `to`; units of different kinds come back unchanged. */
export function convertQty(qty: number, from?: string | null, to?: string | null): number {
  const a = norm(from);
  const b = norm(to);
  if (!a || !b || a === b) return qty;
  if (MASS[a] && MASS[b]) return (qty * MASS[a]) / MASS[b];
  if (VOLUME[a] && VOLUME[b]) return (qty * VOLUME[a]) / VOLUME[b];
  if (COUNT[a] && COUNT[b]) return (qty * COUNT[a]) / COUNT[b];
  return qty;
}

/** Related units a recipe line can be written in for an item kept in `stockUnit`. */
export function relatedUnits(stockUnit: string): string[] {
  const u = norm(stockUnit);
  if (MASS[u]) return MASS[u] >= 1000 ? ['g'] : MASS[u] === 1 ? ['kg'] : [];
  if (VOLUME[u]) return VOLUME[u] >= 1000 ? ['ml'] : ['litre'];
  if (COUNT[u] === 1) return ['dozen'];
  return [];
}

export interface UnitOption {
  /** "base", "pack:<id>" or "rel:<name>". */
  key: string;
  name: string;
  unitId: string | null;
  /** Base units in one of this unit (packs); null for converted units. */
  packRate: number | null;
}

/** Choices for a line: the item's own unit, its packs, and related units. */
export function unitOptions(stockUnit: string, packs: Array<{ id: string | null; name: string; rate: number }>): UnitOption[] {
  const base: UnitOption = { key: 'base', name: stockUnit, unitId: null, packRate: null };
  const packOpts = packs.filter((p) => p.id && norm(p.name) !== norm(stockUnit)).map((p) => ({ key: `pack:${p.id}`, name: p.name, unitId: p.id, packRate: p.rate }));
  const rel = relatedUnits(stockUnit).filter((r) => !packOpts.some((p) => norm(p.name) === r)).map((r) => ({ key: `rel:${r}`, name: r, unitId: null, packRate: null }));
  return [base, ...packOpts, ...rel];
}

/** Base units for `qty` written in `unit`. */
export function baseQty(qty: number, unit: { name: string; packRate: number | null }, stockUnit: string): number {
  const q = Number(qty) || 0;
  if (unit.packRate && unit.packRate > 0) return q * unit.packRate;
  return convertQty(q, unit.name, stockUnit);
}

/** Units sold by weight or volume can be made in fractions; pieces, packets and boxes only whole. */
export function wholeUnits(n: number, unit: string): number {
  const u = norm(unit);
  return MASS[u] || VOLUME[u] ? Math.floor(n * 1000) / 1000 : Math.floor(n + 1e-9);
}

export const round = (n: number, d = 2) => Math.round((Number(n) || 0) * 10 ** d) / 10 ** d;

/** Margin of a price over a cost, in percent of the price. */
export function marginPct(price: number | null | undefined, cost: number): number | null {
  const p = Number(price) || 0;
  if (p <= 0 || !(cost > 0)) return null;
  return Math.round(((p - cost) / p) * 1000) / 10;
}
