/**
 * The bill's money, worked out the same way on every counter: items, the
 * hand discount (percent or rupees), a discount code, loyalty points,
 * delivery and other charges. The server works the bill out again; these
 * numbers are what the cashier sees and what an offline bill records.
 */

import type { PosCartLine, PosDiscountMode, ServiceChargeItem } from './types';

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface LoyaltyRules {
  /** Loyalty is on and a customer is on the bill. */
  on: boolean;
  /** Points the customer has. */
  available: number;
  /** Rupees per point. */
  rate: number;
  /** Most of the bill points may pay, in percent. */
  maxRedeemPercent: number;
  /** Fewest points that can be used at once. */
  minRedeem: number;
}

export interface BillInput {
  lines: PosCartLine[];
  discountMode: PosDiscountMode;
  discountPct: number;
  discountRs: number;
  /** Rupees a discount code gives (as validated); capped to what is left. */
  codeDiscount?: number;
  loyalty?: LoyaltyRules;
  /** Points the cashier wants to use. */
  pointsWanted?: number;
  /** Delivery or other charges added to the bill (pass-through charges are not). */
  charges?: ServiceChargeItem[];
}

export interface BillTotals {
  subtotal: number;
  /** Hand discount in rupees. */
  discount: number;
  codeDiscount: number;
  /** Points that will be used and their rupees. */
  pointsUsed: number;
  pointsMax: number;
  loyaltyDiscount: number;
  /** Charges added to the total. */
  charges: number;
  total: number;
  /** Combo savings shown to the customer. */
  savings: number;
  /** Pieces/units on the bill. */
  quantity: number;
}

/** Charges that count in the bill (an outside rider's charge is printed only). */
export const chargesTotal = (charges: ServiceChargeItem[] = []) =>
  r2(charges.filter((c) => !c.passThrough).reduce((s, c) => s + (Number(c.amount) || 0), 0));

export function billTotals(b: BillInput): BillTotals {
  const subtotal = r2(b.lines.reduce((s, l) => s + l.lineTotal, 0));
  const discount = b.discountMode === 'pct'
    ? r2((subtotal * Math.min(Math.max(b.discountPct || 0, 0), 100)) / 100)
    : r2(Math.min(Math.max(b.discountRs || 0, 0), subtotal));
  const afterManual = Math.max(subtotal - discount, 0);
  const codeDiscount = r2(Math.min(Math.max(b.codeDiscount || 0, 0), afterManual));
  const lo = b.loyalty;
  let pointsMax = 0;
  let pointsUsed = 0;
  if (lo?.on) {
    const rate = lo.rate > 0 ? lo.rate : 1;
    const cap = ((afterManual - codeDiscount) * Math.min(100, lo.maxRedeemPercent ?? 100)) / 100;
    pointsMax = Math.max(0, Math.min(lo.available, Math.floor(cap / rate)));
    const want = Math.min(b.pointsWanted ?? 0, pointsMax);
    pointsUsed = want >= Math.max(1, lo.minRedeem || 0) ? want : 0;
  }
  const loyaltyDiscount = r2(pointsUsed * (lo?.rate && lo.rate > 0 ? lo.rate : 1));
  const charges = chargesTotal(b.charges);
  const total = r2(Math.max(afterManual - codeDiscount - loyaltyDiscount, 0) + charges);
  return {
    subtotal, discount, codeDiscount, pointsUsed, pointsMax, loyaltyDiscount, charges, total,
    savings: r2(b.lines.reduce((s, l) => s + (l.savings || 0) * l.quantity, 0)),
    quantity: Number(b.lines.reduce((s, l) => s + l.quantity, 0).toFixed(3)),
  };
}

/** Rupees given by lowering line rates by hand (counts toward the discount limit). */
export const priceCutOf = (lines: PosCartLine[]) =>
  r2(lines.reduce((s, l) => s + Math.max(0, (Number(l.basePrice) || 0) - (Number(l.unitPrice) || 0)) * (Number(l.quantity) || 0), 0));

/**
 * "Round the bill": the discount that brings the subtotal down to a whole
 * 10, 50 or 100. Zero when it is already round.
 */
export function roundOffOptions(subtotal: number, steps: number[] = [10, 50, 100]) {
  return steps.map((step) => {
    const off = r2(subtotal % step);
    return { step, off, total: r2(subtotal - off) };
  });
}

/** Next whole hundred at or above the total (the "customer gave a round note" button). */
export const roundUpTo = (total: number, step = 100) => Math.ceil(total / step) * step;

/** Tax as a charge on the bill: a percent of what the customer pays for the items. */
export function taxCharge(base: number, percent: number, label = 'Tax'): ServiceChargeItem | null {
  const amount = r2((Math.max(base, 0) * Math.max(percent, 0)) / 100);
  if (!(amount > 0)) return null;
  // Collected for the government: its cost equals its amount, so it never shows as profit.
  return { type: 'TAX', label: `${label} ${Number(percent.toFixed(2))}%`, amount, cost: amount };
}
