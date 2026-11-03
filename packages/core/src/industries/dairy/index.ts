/**
 * Pure rules of the dairy pack (shared by web and mobile): milk intake money
 * (fat bonus, adjustments, rejected milk), which slot a time falls in, product
 * kinds that count as milk, the counter's slot and bulk rates, and farmer or
 * customer balances. No labels here; screens translate the keys.
 */

export type Slot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

/** Fat percentage the farmer's base rate is for (same as the server). */
export const BASE_FAT = 6;

export const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

/** Fat bonus: every fat point above the base earns the farmer's bonus rate per litre. */
export function fatBonus(quantity: number, fat: number | null | undefined, bonusRate: number): number {
  return fat && fat > BASE_FAT && bonusRate > 0 ? r2((fat - BASE_FAT) * bonusRate * quantity) : 0;
}

/** Amount of one milk slip. Rejected milk is worth nothing. */
export function supplyTotal(i: { quantity: number; rate: number; fat?: number | null; bonusRate?: number; adjust?: number; quality?: string | null }): number {
  if (i.quality === 'REJECTED') return 0;
  return r2(i.rate * i.quantity + fatBonus(i.quantity, i.fat, i.bonusRate ?? 0) + (i.adjust ?? 0));
}

/** Slot of the counter now: evening from 3 pm (hour on the shop's clock). */
export const slotForHour = (hour: number): 'MORNING' | 'EVENING' => (hour >= 15 ? 'EVENING' : 'MORNING');

const MILK = new Set(['FRESH_MILK', 'BUFFALO_MILK', 'COW_MILK', 'MIXED_MILK', 'BOILED_MILK', 'RAW_MILK']);
export const isMilkType = (t?: string | null) => !!t && MILK.has(t);
export const CULTURED = new Set(['DAHI', 'YOGURT', 'LASSI', 'BUTTER_MILK']);
export const FATS = new Set(['MAKHAN', 'BUTTER', 'DESI_GHEE', 'CREAM', 'MALAI']);
export const SWEET = new Set(['KHOA', 'MAWA', 'KHEER', 'RABRI', 'KULFI', 'SWEETS', 'ICE_CREAM', 'PANEER', 'CHEESE']);

/** Profile unit enum from the product's base unit. */
export function profileUnit(unit: string): 'LITER' | 'KG' | 'GRAM' | 'PIECE' | 'CUP' | 'PLATE' | 'BOTTLE' | 'PACKET' {
  const u = unit.toLowerCase();
  if (u === 'kg') return 'KG';
  if (u === 'gram' || u === 'g') return 'GRAM';
  if (u === 'piece' || u === 'pcs') return 'PIECE';
  if (u === 'cup') return 'CUP';
  if (u === 'plate') return 'PLATE';
  if (u === 'bottle') return 'BOTTLE';
  if (u === 'packet') return 'PACKET';
  return 'LITER';
}

interface RateProfile { morningPrice?: number | null; eveningPrice?: number | null; bulkPrice?: number | null; minBulkQty?: number | null }

/** Rate of one base unit right now: the slot rate when set, else the product price. */
export function slotRate(p: RateProfile | undefined | null, price: number, slot: 'MORNING' | 'EVENING'): number {
  const s = p && (slot === 'EVENING' ? p.eveningPrice : p.morningPrice);
  return s && s > 0 ? s : price;
}

/** Counter rate for a quantity: the bulk price once the quantity reaches the bulk minimum. */
export function counterRate(p: RateProfile | undefined | null, price: number, slot: 'MORNING' | 'EVENING', quantity: number): number {
  if (p?.bulkPrice && p.minBulkQty && quantity >= p.minBulkQty) return p.bulkPrice;
  return slotRate(p, price, slot);
}

/** Litres of daily milk for a subscriber by delivery frequency (alternate day and weekly count as a share of a day). */
export function dailyLiters(c: { deliveryFrequency: string; morningQuantity: number; eveningQuantity: number }): number {
  const m = Number(c.morningQuantity) || 0;
  const e = Number(c.eveningQuantity) || 0;
  switch (c.deliveryFrequency) {
    case 'MORNING_ONLY': return m;
    case 'EVENING_ONLY': return e;
    case 'ALTERNATE_DAY': return (m + e) / 2;
    case 'WEEKLY': return (m + e) / 7;
    case 'ON_DEMAND': return 0;
    default: return m + e;
  }
}

/** Delivery money: delivered litres at the rate. */
export const deliveryAmount = (deliveredQty: number, rate: number) => r2(deliveredQty * rate);

/** Month and year as "Nov 2026" parts, and the previous month for the bill run. */
export function previousMonth(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}
