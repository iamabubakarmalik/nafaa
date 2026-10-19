/**
 * Unit conversion for recipe ingredients.
 *
 * A recipe line is often written in grams or millilitres while the
 * ingredient is stocked in kilograms or litres. Without conversion a
 * "200 g rice" line took 200 kg out of stock and costed 200 × the kg price.
 */

const MASS: Record<string, number> = {
  kg: 1000, kgs: 1000, kilo: 1000, kilogram: 1000, kilograms: 1000,
  g: 1, gm: 1, gms: 1, gram: 1, grams: 1,
  mg: 0.001,
  lb: 453.592, lbs: 453.592, oz: 28.3495,
};

const VOLUME: Record<string, number> = {
  l: 1000, ltr: 1000, litre: 1000, liter: 1000, liters: 1000, litres: 1000,
  ml: 1, millilitre: 1, milliliter: 1,
};

const COUNT: Record<string, number> = {
  pc: 1, pcs: 1, piece: 1, pieces: 1, nos: 1,
  dozen: 12, dz: 12,
};

const norm = (u?: string | null) => (u ?? '').trim().toLowerCase();

/**
 * Quantity expressed in `toUnit`. Units of different kinds (or unknown
 * units such as "plate", "pcs") are returned unchanged.
 */
export function convertQty(qty: number, fromUnit?: string | null, toUnit?: string | null): number {
  const from = norm(fromUnit);
  const to = norm(toUnit);
  if (!from || !to || from === to) return qty;
  if (MASS[from] && MASS[to]) return (qty * MASS[from]) / MASS[to];
  if (VOLUME[from] && VOLUME[to]) return (qty * VOLUME[from]) / VOLUME[to];
  if (COUNT[from] && COUNT[to]) return (qty * COUNT[from]) / COUNT[to];
  return qty;
}

/** Unit family of a known unit; unknown units (plate, bottle, tin) are their own family. */
function familyOf(unit: string): string {
  if (MASS[unit]) return 'mass';
  if (VOLUME[unit]) return 'volume';
  if (COUNT[unit]) return 'count';
  return `own:${unit}`;
}

/**
 * Whether a recipe line written in `lineUnit` can be taken from stock kept
 * in `stockUnit`: the same unit, or two units of one family (g and kg, ml
 * and litre, pcs and dozen). "1 cup" of rice kept in kg is refused, since
 * it would take 1 kg.
 */
export function unitsCompatible(lineUnit?: string | null, stockUnit?: string | null): boolean {
  const a = norm(lineUnit);
  const b = norm(stockUnit);
  if (!a || !b || a === b) return true;
  return familyOf(a) === familyOf(b);
}

/** Quantity the store gives out for a line: the recipe quantity plus its wastage percent. */
export function withWastage(qty: number, wastagePercent?: number | null): number {
  return qty * (1 + (Number(wastagePercent) || 0) / 100);
}

export const round3 = (v: number) => Math.round(v * 1000) / 1000;
export const round2 = (v: number) => Math.round(v * 100) / 100;
