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

export const round3 = (v: number) => Math.round(v * 1000) / 1000;
export const round2 = (v: number) => Math.round(v * 100) / 100;
