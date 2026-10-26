/**
 * Price tiers: the same item sold at a retail, wholesale or credit (udhaar)
 * price. Wholesale and credit prices are optional and fall back to retail.
 * Mirrors apps/api/src/common/helpers/price-tier.helper.ts.
 */

export type PriceTier = 'RETAIL' | 'WHOLESALE' | 'CREDIT';

export const PRICE_TIERS: PriceTier[] = ['RETAIL', 'WHOLESALE', 'CREDIT'];

export const isPriceTier = (v: unknown): v is PriceTier => PRICE_TIERS.includes(v as PriceTier);

/** Tier of a stored sale line; null and unknown values count as retail. */
export const tierOf = (v: unknown): PriceTier => (isPriceTier(v) ? v : 'RETAIL');

/** Short name, used on chips and report rows. */
export const PRICE_TIER_LABEL: Record<PriceTier, string> = {
  RETAIL: 'Retail',
  WHOLESALE: 'Wholesale',
  CREDIT: 'Credit',
};

/** Field label on product forms and tables. */
export const PRICE_TIER_FIELD: Record<PriceTier, string> = {
  RETAIL: 'Retail price',
  WHOLESALE: 'Wholesale price',
  CREDIT: 'Credit (udhaar) price',
};

/** Label for the purchase cost; owners call it the company price. */
export const COST_PRICE_LABEL = 'Cost price (Company price)';

/** Badge tone per tier, for the design-system Badge. */
export const PRICE_TIER_TONE: Record<PriceTier, 'neutral' | 'info' | 'warning'> = {
  RETAIL: 'neutral',
  WHOLESALE: 'info',
  CREDIT: 'warning',
};

export interface TierPriced {
  price: number;
  wholesalePrice?: number | null;
  creditPrice?: number | null;
}

/** The price for a tier; an empty or zero tier price falls back to the retail price. */
export function tierPrice(src: TierPriced, tier: PriceTier): number {
  const retail = Number(src.price) || 0;
  if (tier === 'WHOLESALE') return Number(src.wholesalePrice) > 0 ? Number(src.wholesalePrice) : retail;
  if (tier === 'CREDIT') return Number(src.creditPrice) > 0 ? Number(src.creditPrice) : retail;
  return retail;
}

/** Margin on the selling price, in percent; null when there is no price or cost. */
export function marginPct(price: number | null | undefined, cost: number | null | undefined): number | null {
  const p = Number(price), c = Number(cost);
  if (!(p > 0) || !(c > 0)) return null;
  return ((p - c) / p) * 100;
}
