/**
 * Pack (multi-unit) arithmetic used by products, purchases and the units
 * page. Stock and costs are always kept in the product's base unit; a pack of
 * rate N is N base units. Kept free of Prisma so it can be tested directly.
 */

import type { Prisma } from '@prisma/client';

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

/** A usable rate: positive and finite, otherwise 1. */
export const safeRate = (rate: unknown) => {
  const n = Number(rate);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/** Base units in `qty` packs (2 cartons of 24 = 48). */
export const toBase = (qty: number, rate: unknown) => r4((Number(qty) || 0) * safeRate(rate));

/** Packs in `baseQty` base units (48 pieces = 2 cartons of 24). */
export const fromBase = (baseQty: number, rate: unknown) => r4((Number(baseQty) || 0) / safeRate(rate));

/** Whole packs that can be made from the stock (never negative). */
export const wholePacks = (baseQty: number, rate: unknown) => Math.max(0, Math.floor((Number(baseQty) || 0) / safeRate(rate) + 1e-9));

/** Cost or price of one base unit when a pack of `rate` costs `packAmount`. */
export const perBase = (packAmount: number, rate: unknown) => r4((Number(packAmount) || 0) / safeRate(rate));

/** A pack's price from the base price: rate times, rounded to paisa. */
export const packFromBase = (baseAmount: number, rate: unknown) => r2((Number(baseAmount) || 0) * safeRate(rate));

/** Optional tier price of a pack from the base tier price; empty stays empty. */
export const optionalPackFromBase = (baseAmount: number | null | undefined, rate: unknown) =>
  baseAmount != null && Number(baseAmount) > 0 ? packFromBase(Number(baseAmount), rate) : null;

export interface BaseProductPrices {
  unit: string;
  price: number;
  costPrice: number;
  wholesalePrice: number | null;
  creditPrice: number | null;
}

/**
 * The base pack row is the product itself in pack form: same name, rate 1 and
 * the product's prices. `nameFree` is false when another pack of the product
 * already uses the product's unit name; the old name is then kept.
 */
export function baseRowFromProduct(p: BaseProductPrices, nameFree: boolean) {
  return {
    ...(nameFree && { unitName: p.unit }),
    conversionRate: 1,
    conversionType: 'BASE' as const,
    price: Number(p.price) || 0,
    costPrice: Number(p.costPrice) || 0,
    wholesalePrice: p.wholesalePrice ?? null,
    creditPrice: p.creditPrice ?? null,
  };
}

/** Cost of each pack after the base average cost changes (a carton of 24 costs 24 base units). */
export const packCostFromAverage = (avgBaseCost: number, rate: unknown) => r2((Number(avgBaseCost) || 0) * safeRate(rate));

/*
 * Automatic pack prices, the same rules as packages/core/src/inventory/units.ts
 * (the editors use those). A pack tier follows the piece (piece x size, sale
 * tiers less the pack discount and in whole rupees, cost in paisa) until
 * someone types a rate of their own. Nothing is stored about it: a tier
 * counts as automatic when its value matches the automatic one within
 * rounding, and an empty tier always counts as automatic.
 */

export interface PackTiers {
  price: number;
  costPrice: number;
  wholesalePrice: number | null;
  creditPrice: number | null;
}
const PACK_TIERS = ['price', 'costPrice', 'wholesalePrice', 'creditPrice'] as const;
type PackTier = (typeof PACK_TIERS)[number];

/** Automatic value of one pack tier from the piece tiers. */
export function autoPackTier(tier: PackTier, piece: PackTiers, rate: number, discountPct = 0): number | null {
  const size = Number(rate) > 0 ? Number(rate) : 0;
  if (tier === 'costPrice') return r2((Number(piece.costPrice) || 0) * size);
  const v = Number(piece[tier]);
  if (tier !== 'price' && !(v > 0)) return null;
  return Math.round((v || 0) * size * (1 - Math.min(100, Math.max(0, discountPct)) / 100));
}

/** True when a saved tier matches its automatic value within rounding (half a rupee; half a paisa per piece for cost). */
export function isAutoTier(tier: PackTier, saved: number | null | undefined, auto: number | null, rate: number): boolean {
  const s = Number(saved);
  if (saved == null || !(s > 0)) return true;
  if (auto == null) return false;
  const slack = tier === 'costPrice' ? Math.max(0.01, (Number(rate) || 1) * 0.005) : 0.5;
  return Math.abs(s - auto) <= slack + 1e-9;
}

/** The whole-percent pack discount (up to 50) that the pack's sale price implies; 0 when none fits. */
export function packDiscountOf(piece: PackTiers, pack: PackTiers & { conversionRate: number }): number {
  const rate = Number(pack.conversionRate) || 0;
  const full = Number(piece.price) * rate;
  if (!(Number(pack.price) > 0) || !(full > 0) || isAutoTier('price', pack.price, autoPackTier('price', piece, rate), rate)) return 0;
  const d = Math.round((1 - Number(pack.price) / full) * 100);
  return d >= 1 && d <= 50 && isAutoTier('price', pack.price, autoPackTier('price', piece, rate, d), rate) ? d : 0;
}

/**
 * Tier changes for a pack when the piece prices move from `before` to
 * `after`: tiers that followed the old piece follow the new one, typed tiers
 * stay. Returns only the tiers whose value changes.
 */
export function followPiecePrices(before: PackTiers, after: PackTiers, pack: PackTiers & { conversionRate: number }): Partial<PackTiers> {
  const rate = Number(pack.conversionRate) || 0;
  const d = packDiscountOf(before, pack);
  const out: Partial<PackTiers> = {};
  for (const tier of PACK_TIERS) {
    if (!isAutoTier(tier, pack[tier], autoPackTier(tier, before, rate, d), rate)) continue;
    const next = autoPackTier(tier, after, rate, d);
    // A tier that still matches stays as saved (no churn from rounding).
    if (pack[tier] != null && Number(pack[tier]) > 0 && isAutoTier(tier, pack[tier], next, rate)) continue;
    if (tier === 'price' || tier === 'costPrice') { if (next !== Number(pack[tier])) out[tier] = next ?? 0; }
    else if (next !== (pack[tier] ?? null)) out[tier] = next;
  }
  return out;
}

/**
 * Brings the product's base pack rows (product level, not variant) in line
 * with the product. Call after the product's unit or prices change. With
 * `followPacks`, product-level packs whose tiers were automatic against the old
 * piece prices (still held by the base row) move with the new prices.
 */
export async function syncBaseUnits(tx: Prisma.TransactionClient, productId: string, opts: { followPacks?: boolean } = {}) {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: {
      unit: true, price: true, costPrice: true, wholesalePrice: true, creditPrice: true,
      units: { where: { variantId: null }, select: { id: true, unitName: true, isBase: true, conversionRate: true, price: true, costPrice: true, wholesalePrice: true, creditPrice: true } },
    },
  });
  if (!product) return;
  const bases = product.units.filter((u) => u.isBase);
  if (!bases.length) return;
  if (opts.followPacks) {
    const before = bases[0];
    for (const pack of product.units.filter((u) => !u.isBase)) {
      const data = followPiecePrices(before, product, pack);
      if (Object.keys(data).length) await tx.productUnit.update({ where: { id: pack.id }, data });
    }
  }
  for (const b of bases) {
    const clash = product.units.some((u) => u.id !== b.id && u.unitName.trim().toLowerCase() === product.unit.trim().toLowerCase());
    await tx.productUnit.update({ where: { id: b.id }, data: baseRowFromProduct(product, !clash) });
  }
}
