/**
 * Price tiers: the same item sold at a retail, wholesale or credit (udhaar)
 * price. Wholesale and credit prices are optional and fall back to retail.
 * A sale line stores the tier it was sold at; null on older rows means retail.
 */

export const PRICE_TIERS = ['RETAIL', 'WHOLESALE', 'CREDIT'] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export const isPriceTier = (v: unknown): v is PriceTier => PRICE_TIERS.includes(v as PriceTier);

/** Tier of a stored sale line; null and unknown values count as retail. */
export const tierOf = (v: unknown): PriceTier => (isPriceTier(v) ? v : 'RETAIL');

export const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  RETAIL: 'Retail',
  WHOLESALE: 'Wholesale',
  CREDIT: 'Credit',
};

interface TierPriced {
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
