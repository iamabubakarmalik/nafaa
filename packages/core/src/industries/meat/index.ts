/**
 * Pure rules of the meat pack (shared by web and mobile): weight pricing at the
 * counter and on orders (kg for an amount, amount for a weight, grams), the
 * morning rate bump, cutting yield, order money, order steps, the supply plan
 * schedule and halal shares. No labels here; screens translate the keys.
 */

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'CUTTING' | 'PACKED' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
/** Weights are kept to the gram. */
export const r3 = (n: unknown) => Math.round((Number(n) || 0) * 1000) / 1000;

/** Money for a weight at a rate per kg. */
export const amountForKg = (kg: number, ratePerKg: number) => r2(kg * ratePerKg);

/** Weight for an amount of money ("Rs 500 ka") at a rate per kg; 0 when there is no rate. */
export const kgForAmount = (amount: number, ratePerKg: number) => (ratePerKg > 0 ? r3(amount / ratePerKg) : 0);

/** Grams typed at the scale to kilos. */
export const gramsToKg = (g: number) => r3(g / 1000);

/** A rate moved up or down by a percentage, rounded to a whole rupee (the morning change of chicken). */
export const bumpRate = (rate: number, pct: number) => Math.round(rate * (1 + pct / 100));

/** Yield of a cutting job or slaughter: output weight as a share of the weight put in (one decimal). Null when nothing went in. */
export function yieldPct(outKg: number, inKg: number): number | null {
  return inKg > 0 ? Math.round((outKg / inKg) * 1000) / 10 : null;
}

/** Waste of a cutting job: what went in less the cuts, never below zero. */
export const autoWaste = (inKg: number, cutsKg: number) => Math.max(r3(inKg - cutsKg), 0);

/** Cuts that weigh more than what went in cannot be right. */
export const cutsTooHeavy = (inKg: number, cutsKg: number, wasteKg = 0) => r3(cutsKg + wasteKg) > r3(inKg) + 0.0005;

export interface OrderLine { kg: number; rate: number }

/** Order money: items plus delivery less discount, never below zero. */
export function orderTotals(lines: OrderLine[], extra: { deliveryCharges?: number; discount?: number } = {}) {
  const subtotal = r2(lines.reduce((s, l) => s + amountForKg(l.kg, l.rate), 0));
  const total = Math.max(r2(subtotal + (extra.deliveryCharges ?? 0) - (extra.discount ?? 0)), 0);
  return { subtotal, total };
}

/** Still to be paid on an order, never negative. */
export const dueOf = (total: number, paid: number) => Math.max(r2(total - paid), 0);

/** Total of an order once the scale weights replace the asked weights (items without a weight keep the asked one). */
export function weighedTotal(items: Array<{ requestedKg: number; actualKg?: number | null; pricePerKg: number }>, deliveryCharges = 0, discount = 0) {
  return Math.max(r2(items.reduce((s, i) => s + amountForKg(i.actualKg ?? i.requestedKg, i.pricePerKg), 0) + deliveryCharges - discount), 0);
}

/** The next work step of an open weight order (null at the end or when it only waits for hand-over). */
export function nextOrderStep(status: OrderStatus, isDelivery: boolean): { status: OrderStatus; step: string } | null {
  switch (status) {
    case 'DRAFT': return { status: 'CONFIRMED', step: 'confirm' };
    case 'CONFIRMED':
    case 'PROCESSING': return { status: 'CUTTING', step: 'cutting' };
    case 'CUTTING': return { status: 'PACKED', step: 'packed' };
    case 'PACKED': return { status: 'READY', step: 'ready' };
    case 'READY': return isDelivery ? { status: 'OUT_FOR_DELIVERY', step: 'rider' } : null;
    default: return null;
  }
}
export const isOpenOrder = (status: OrderStatus) => status !== 'DELIVERED' && status !== 'CANCELLED';
/** Open and needed more than an hour ago. */
export const isLateOrder = (o: { status: OrderStatus; neededBy?: string | null }, now = Date.now()) => isOpenOrder(o.status) && !!o.neededBy && new Date(o.neededBy).getTime() < now - 3_600_000;

/** Money split on the hand-over bill: what is left after the advance, what the parts cover and what goes on khata. */
export function checkoutSplit(total: number, held: number, legacy: number, parts: number[]) {
  const due = Math.max(r2(total - held - legacy), 0);
  const paid = r2(parts.reduce((s, p) => s + (Number(p) || 0), 0));
  return { due, paid, credit: Math.max(r2(due - paid), 0), over: paid > due + 0.005 };
}

/** Qurbani and similar animals sold in shares (up to seven). */
export const SHARED_ANIMALS = ['BEEF', 'CAMEL', 'BUFFALO'];
export const isShared = (animalType: string) => SHARED_ANIMALS.includes(animalType);
export const sharesOk = (animalType: string, shares: number) => !isShared(animalType) || (Number.isInteger(shares) && shares >= 1 && shares <= 7);

/** How many deliveries a supply plan makes in a 30 day month. */
export function deliveriesPerMonth(frequency: string, customDays: number[] = []): number {
  switch (frequency) {
    case 'DAILY': return 30;
    case 'ALTERNATE_DAY': return 15;
    case 'WEEKLY': return 4;
    case 'BIWEEKLY': return 2;
    case 'MONTHLY': return 1;
    case 'CUSTOM': return Math.round((customDays.length * 30) / 7);
    default: return 0;
  }
}

/** Kilos a supply plan delivers in a month, and what that is worth at today's rates after the plan discount. */
export function planMonthly(items: Array<{ kg: number; rate?: number }>, frequency: string, discountPct = 0, customDays: number[] = []) {
  const per = deliveriesPerMonth(frequency, customDays);
  const kgEach = r3(items.reduce((s, i) => s + i.kg, 0));
  const eachValue = items.reduce((s, i) => s + i.kg * (i.rate ?? 0), 0);
  return { kg: r3(kgEach * per), estimate: r2(eachValue * per * (1 - discountPct / 100)) };
}

/** A supply plan is due when active and its next delivery is today or tomorrow. */
export const planDue = (p: { status: string; nextDeliveryDate?: string | null }, now = Date.now()) => p.status === 'ACTIVE' && !!p.nextDeliveryDate && new Date(p.nextDeliveryDate).getTime() <= now + 86_400_000;

/** Meat from a slaughter: dressed weight as a share of the live weight. */
export const dressingPct = (liveKg: number, dressedKg: number) => yieldPct(dressedKg, liveKg);

/** Live stock bought by weight: cost of the weight plus other charges. */
export const mandiTotal = (kg: number, ratePerKg: number, other = 0) => r2(kg * ratePerKg + other);

/** Daily feed cost of an animal held for some days. */
export const feedCost = (days: number, perDay: number) => r2(days * perDay);
