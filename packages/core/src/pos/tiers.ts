/**
 * Price tiers: the same item sold at a retail, wholesale or credit (khata)
 * price. Wholesale and credit prices are optional and fall back to retail.
 * Mirrors apps/api/src/common/helpers/price-tier.helper.ts.
 */

import type { PosCartLine, PosUnitOption, PriceTier, TierPriced } from './types';

export const PRICE_TIERS: PriceTier[] = ['RETAIL', 'WHOLESALE', 'CREDIT'];

export const isPriceTier = (v: unknown): v is PriceTier => PRICE_TIERS.includes(v as PriceTier);

/** Tier of a stored sale line; null and unknown values count as retail. */
export const tierOf = (v: unknown): PriceTier => (isPriceTier(v) ? v : 'RETAIL');

/** The price for a tier; an empty or zero tier price falls back to the retail price. */
export function tierPrice(src: TierPriced, tier: PriceTier | null | undefined): number {
  const retail = Number(src.price) || 0;
  if (tier === 'WHOLESALE') return Number(src.wholesalePrice) > 0 ? Number(src.wholesalePrice) : retail;
  if (tier === 'CREDIT') return Number(src.creditPrice) > 0 ? Number(src.creditPrice) : retail;
  return retail;
}

const positive = (v: unknown) => (Number(v) > 0 ? Number(v) : null);

/**
 * Retail, wholesale and credit price of one unit of an item. The base unit
 * uses the product's prices (a variant's own prices first, like the server);
 * a pack uses its own tier prices, else the product's tier price times the
 * pack size.
 */
export function tierSrcFor(
  product: { wholesalePrice?: number | null; creditPrice?: number | null },
  unit: PosUnitOption,
  variant?: { price?: number | null; wholesalePrice?: number | null; creditPrice?: number | null },
): TierPriced {
  const rate = Number(unit.conversionRate) || 1;
  if (rate === 1 && variant?.price != null) {
    return {
      price: Number(variant.price),
      wholesalePrice: positive(variant.wholesalePrice) ?? positive(product.wholesalePrice),
      creditPrice: positive(variant.creditPrice) ?? positive(product.creditPrice),
    };
  }
  if (unit.isBase || rate === 1) {
    return { price: unit.price, wholesalePrice: positive(unit.wholesalePrice) ?? positive(product.wholesalePrice), creditPrice: positive(unit.creditPrice) ?? positive(product.creditPrice) };
  }
  const scaled = (v: unknown) => { const n = positive(v); return n == null ? null : Number((n * rate).toFixed(2)); };
  return {
    price: unit.price,
    wholesalePrice: positive(unit.wholesalePrice) ?? scaled(product.wholesalePrice),
    creditPrice: positive(unit.creditPrice) ?? scaled(product.creditPrice),
  };
}

/** A line at the bill's tier; fixed, hand-priced and line-picked lines keep their rate. */
export function retier(l: PosCartLine, tier: PriceTier): PosCartLine {
  if (l.type !== 'product' || !l.tierSrc || l.fixedPrice || l.priceEdited || l.tierLocked || l.dist || l.priceTier === tier) return l;
  const price = tierPrice(l.tierSrc, tier);
  return { ...l, priceTier: tier, unitPrice: price, basePrice: price, lineTotal: l.quantity * price };
}
