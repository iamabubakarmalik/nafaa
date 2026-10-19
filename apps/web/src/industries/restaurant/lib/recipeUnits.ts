/**
 * Recipe unit conversion, mirroring the API (industries/restaurant/recipes/recipe-units.ts).
 * A recipe line may be written in grams while the ingredient is stocked in kg;
 * the cost per unit is always per stocked unit.
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

/** Quantity expressed in `toUnit`; unrelated or unknown units are returned unchanged. */
export function convertQty(qty: number, fromUnit?: string | null, toUnit?: string | null): number {
  const from = norm(fromUnit);
  const to = norm(toUnit);
  if (!from || !to || from === to) return qty;
  if (MASS[from] && MASS[to]) return (qty * MASS[from]) / MASS[to];
  if (VOLUME[from] && VOLUME[to]) return (qty * VOLUME[from]) / VOLUME[to];
  if (COUNT[from] && COUNT[to]) return (qty * COUNT[from]) / COUNT[to];
  return qty;
}

/**
 * Units a recipe line may use for an ingredient stocked in `stockUnit`: the
 * stock unit and its smaller or larger relatives (kg ↔ gram, litre ↔ ml,
 * pcs ↔ dozen). The API refuses any other unit.
 */
export function unitChoices(stockUnit?: string | null): string[] {
  const u = norm(stockUnit);
  if (!u) return ['pcs'];
  if (MASS[u]) return [...new Set([u, 'kg', 'gram'])];
  if (VOLUME[u]) return [...new Set([u, 'liter', 'ml'])];
  if (COUNT[u]) return [...new Set([u, 'pcs', 'dozen'])];
  return [u];
}

/** The smaller unit a cook writes in: grams for kg, ml for litres. */
export function cookUnit(stockUnit?: string | null): string {
  const u = norm(stockUnit);
  if (MASS[u] && MASS[u] >= 1000) return 'gram';
  if (VOLUME[u] && VOLUME[u] >= 1000) return 'ml';
  return u || 'pcs';
}
