/**
 * Price calculator maths. Pure functions, so the calculator page, the bulk
 * preview and the tests give the same numbers.
 *
 * Everything is per delivered order of one piece. For a price P:
 *
 *   customer pays     P + delivery charged (D)
 *   GST               P − P ÷ (1 + t), when the price includes tax t
 *   product cost      the piece's cost
 *   packaging         per order
 *   shipping          own courier's forward charge, or the channel's shipping fee
 *   COD fee           COD share × (codPct × (P + D) + codFixed), own courier only
 *   commission        commissionPct × P
 *   payment fee       paymentFeePct × (P + D) on prepaid orders (every order when
 *                     the channel ships)
 *   fixed fee         per order
 *   ads               ads per order ÷ (1 − r): ads are paid on every order placed,
 *                     returned ones too
 *   RTO               r ÷ (1 − r) × (packaging + shipping + return leg): returned
 *                     parcels per delivered one, times what each costs
 *   profit            what is left
 *
 * Profit is linear in P (profit = a·P + b), so the break-even price is −b ÷ a,
 * the price for a margin m (profit as a share of P) is −b ÷ (a − m), and the
 * price for Rs T a piece is (T − b) ÷ a. "End with 9" rounds up to the next
 * price ending in 9, so profit never falls below the target.
 */

import type { ChannelFees, TargetMode } from '../growth-settings';

export interface PriceInputs {
  cost: number;
  packaging: number;
  /** Own courier's forward charge per order. */
  courier: number;
  /** Return leg as a % of the forward charge. */
  returnPct: number;
  codPct: number;
  codFixed: number;
  adsPerOrder: number;
  /** Expected returned orders, %. */
  rtoPct: number;
  /** Delivery charged to the customer per order. */
  deliveryCharge: number;
  /** GST included in the price, %. */
  taxPct: number;
  target: { mode: TargetMode; value: number };
  endWith9: boolean;
}

export type BreakdownKey =
  | 'tax' | 'cost' | 'packaging' | 'shipping' | 'codFee' | 'commission' | 'paymentFee' | 'fixedFee' | 'ads' | 'rto' | 'profit';

export interface BreakdownLine { key: BreakdownKey; value: number }

export interface ChannelQuote {
  /** Suggested price; null when the fees leave nothing at any price. */
  price: number | null;
  /** Lowest price with no loss. */
  breakEven: number | null;
  /** Profit per delivered order at `price`. */
  profit: number | null;
  /** Profit as a % of the price. */
  margin: number | null;
  /** Where the customer's money goes at `price`, adding up to price + delivery. */
  breakdown: BreakdownLine[];
  /** The fees take everything (a ≤ 0) or the target margin is too high. */
  problem: 'FEES_TOO_HIGH' | 'MARGIN_TOO_HIGH' | null;
}

export const r2 = (v: number) => Math.round(v * 100) / 100;
const pct = (v: number) => Math.max(0, Number(v) || 0) / 100;
const pos = (v: number) => Math.max(0, Number(v) || 0);

/** Next price ending in 9 at or above `p` (1234 → 1239, 1240 → 1249). */
export function endWith9(p: number): number {
  if (!(p > 0)) return 9;
  return Math.ceil((Math.ceil(p) + 1) / 10) * 10 - 1;
}

/** The linear profit model and the pieces it is made of. */
export function profitModel(i: PriceInputs, f: ChannelFees) {
  const r = Math.min(0.9, pct(i.rtoPct));
  const perDelivered = r / (1 - r);
  const t = pct(i.taxPct);
  const own = f.ownCourier;
  const codShare = own ? Math.min(1, pct(f.codShare)) : 0;
  const prepaid = own ? 1 - codShare : 1;
  const D = pos(i.deliveryCharge);
  const shipping = own ? pos(i.courier) : pos(f.shippingFee);
  const returnLeg = shipping * pct(i.returnPct);
  const rtoEach = pos(i.packaging) + shipping + returnLeg;
  const codRate = codShare * pct(i.codPct);
  const payRate = prepaid * pct(f.paymentFeePct);
  const fixed = {
    cost: pos(i.cost),
    packaging: pos(i.packaging),
    shipping,
    codFixed: codShare * pos(i.codFixed),
    fixedFee: pos(f.fixedFee),
    ads: pos(i.adsPerOrder) / (1 - r),
    rto: perDelivered * rtoEach,
  };
  const a = 1 / (1 + t) - codRate - pct(f.commissionPct) - payRate;
  const b = D - (codRate + payRate) * D - Object.values(fixed).reduce((s, v) => s + v, 0);
  return { a, b, t, codRate, payRate, D, fixed, commissionRate: pct(f.commissionPct) };
}

/** Where every rupee goes at price `p`. */
export function breakdownAt(p: number, i: PriceInputs, f: ChannelFees): { lines: BreakdownLine[]; profit: number } {
  const m = profitModel(i, f);
  const paid = p + m.D;
  const lines: BreakdownLine[] = [
    { key: 'tax', value: p - p / (1 + m.t) },
    { key: 'cost', value: m.fixed.cost },
    { key: 'packaging', value: m.fixed.packaging },
    { key: 'shipping', value: m.fixed.shipping },
    { key: 'codFee', value: m.codRate * paid + m.fixed.codFixed },
    { key: 'commission', value: m.commissionRate * p },
    { key: 'paymentFee', value: m.payRate * paid },
    { key: 'fixedFee', value: m.fixed.fixedFee },
    { key: 'ads', value: m.fixed.ads },
    { key: 'rto', value: m.fixed.rto },
  ].map((l) => ({ key: l.key as BreakdownKey, value: r2(l.value) }));
  const profit = r2(paid - lines.reduce((s, l) => s + l.value, 0));
  return { lines: [...lines.filter((l) => l.value !== 0), { key: 'profit', value: profit }], profit };
}

/** Suggested price, break-even, profit and breakdown for one channel. */
export function quoteChannel(i: PriceInputs, f: ChannelFees): ChannelQuote {
  const m = profitModel(i, f);
  if (!(m.a > 0.0001)) return { price: null, breakEven: null, profit: null, margin: null, breakdown: [], problem: 'FEES_TOO_HIGH' };
  const breakEven = Math.max(0, Math.ceil(-m.b / m.a - 1e-9));
  let raw: number;
  if (i.target.mode === 'RUPEES') {
    raw = (pos(i.target.value) - m.b) / m.a;
  } else {
    const margin = pct(i.target.value);
    if (m.a - margin <= 0.0001) return { price: null, breakEven, profit: null, margin: null, breakdown: [], problem: 'MARGIN_TOO_HIGH' };
    raw = -m.b / (m.a - margin);
  }
  raw = Math.max(raw, breakEven, 1);
  const price = i.endWith9 ? endWith9(raw) : Math.ceil(raw - 1e-9);
  return { ...at(price, i, f), breakEven, problem: null };
}

/** Profit and margin at a price the shop picked. */
export function at(price: number, i: PriceInputs, f: ChannelFees): Omit<ChannelQuote, 'breakEven' | 'problem'> {
  const { lines, profit } = breakdownAt(price, i, f);
  return { price, profit, margin: price > 0 ? Math.round((profit / price) * 1000) / 10 : null, breakdown: lines };
}

