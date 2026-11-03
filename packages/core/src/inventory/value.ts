/**
 * Money on the shelf: margin and markup of a price over cost, the price for a
 * wanted markup, loss warnings and the cost/sale value of stock.
 */

/** Profit as a share of the sale price, in percent; null without both prices. */
export function marginPct(price: number | null | undefined, cost: number | null | undefined): number | null {
  const p = Number(price);
  const c = Number(cost);
  if (!(p > 0) || !(c > 0)) return null;
  return ((p - c) / p) * 100;
}

/** Profit as a share of cost, in percent; null without both prices. */
export function markupPct(price: number | null | undefined, cost: number | null | undefined): number | null {
  const p = Number(price);
  const c = Number(cost);
  if (!(p > 0) || !(c > 0)) return null;
  return ((p - c) / c) * 100;
}

/** Sale price for a markup on cost, rounded to whole rupees ("+20% on 100" = 120). */
export const priceForMarkup = (cost: number, pct: number) => Math.round((Number(cost) || 0) * (1 + pct / 100));

/** Sale price that keeps a margin of `pct` percent of the price. */
export const priceForMargin = (cost: number, pct: number) => (pct >= 100 ? 0 : Math.round((Number(cost) || 0) / (1 - pct / 100)));

/** Markup chips the editor offers on the price step. */
export const DEFAULT_MARKUPS = [10, 15, 20, 25, 30, 50] as const;

/** A tier price (wholesale, credit) set below cost sells at a loss. */
export const belowCost = (price: number | null | undefined, cost: number | null | undefined) =>
  Number(price) > 0 && Number(cost) > 0 && Number(price) < Number(cost);

export type MarginLevel = 'none' | 'loss' | 'thin' | 'fair' | 'good';

/** How a margin reads: thin under 10%, good from 20%. Same thresholds as the web margin card. */
export function marginLevel(price: number, cost: number): MarginLevel {
  if (!(price > 0) || !(cost > 0)) return 'none';
  const m = ((price - cost) / price) * 100;
  if (m < 0) return 'loss';
  if (m < 10) return 'thin';
  if (m >= 20) return 'good';
  return 'fair';
}

export interface ValuedStock {
  stock: number | null | undefined;
  costPrice?: number | null;
  price?: number | null;
}

/** Units, cost value, sale value and the profit inside them. Negative stock counts as zero. */
export function stockValue(items: ReadonlyArray<ValuedStock>) {
  let units = 0;
  let costValue = 0;
  let saleValue = 0;
  for (const i of items) {
    const q = Math.max(0, Number(i.stock) || 0);
    units += q;
    costValue += q * (Number(i.costPrice) || 0);
    saleValue += q * (Number(i.price) || 0);
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return { units: r(units), costValue: r(costValue), saleValue: r(saleValue), profit: r(saleValue - costValue) };
}

/** Average cost after receiving `qty` at `cost` on top of `onHand` at `avgCost` (moving average). */
export function movingAverageCost(onHand: number, avgCost: number, qty: number, cost: number): number {
  const a = Math.max(0, Number(onHand) || 0);
  const b = Math.max(0, Number(qty) || 0);
  if (a + b <= 0) return Number(cost) || 0;
  return Math.round(((a * (Number(avgCost) || 0) + b * (Number(cost) || 0)) / (a + b)) * 100) / 100;
}
