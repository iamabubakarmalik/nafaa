/**
 * Pure rules of the furniture pack (shared by web and mobile): day keys,
 * days to a date, the staircase charge of a delivery and how many percent of
 * an order is paid. No labels here; screens translate the words.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** `yyyy-mm-dd` of a local date. */
export const dayKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days));
};

/** Whole days from today to a date (negative = late). */
export const daysTo = (v?: string | null, today: string = dayKey()): number | null => {
  if (!v) return null;
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${dayKey(new Date(v))}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
};

/** Rupees charged for each floor without a lift. */
export const FLOOR_RATE = 500;

/** Charge for carrying up the stairs: nothing with a lift or on the ground floor. */
export const floorCharge = (floor: number, hasLift: boolean) => (!hasLift && floor > 0 ? Math.round(floor) * FLOOR_RATE : 0);

/** All charges of a delivery; a blank floor charge falls back to the staircase rate. */
export function deliveryCharges(c: { delivery?: number | null; loading?: number | null; unloading?: number | null; floorCharge?: number | null; assembly?: number | null; floor?: number; hasLift?: boolean }): number {
  const floor = c.floorCharge ?? floorCharge(c.floor ?? 0, !!c.hasLift);
  return (c.delivery ?? 0) + (c.loading ?? 0) + (c.unloading ?? 0) + floor + (c.assembly ?? 0);
}

/** Share of an order paid, 0 to 100. */
export const paidPercent = (total: number, paid: number) => (total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 0);

/** Advance amount for a percentage of the total. */
export const advanceFor = (total: number, pct: number) => Math.round((total * pct) / 100);

/** The date an order is due: quotation day plus the days to make it. */
export const dueDate = (quotationDay: string, days: number) => addDays(quotationDay, days);
