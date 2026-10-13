/**
 * Shoe sizes and the stock engine.
 *
 * A shoe size (ShoeSizeVariant) keeps the shoe-only details: size system,
 * width, box and shelf. The stock of a size lives on a matching core
 * ProductVariant (same product, name such as "UK 8" or "EU 42 WIDE"), so the
 * POS, returns, purchases, transfers and every stock report count it the
 * same way as any other variant.
 *
 * Sizes created before this link existed kept their count only on the shoe
 * row while the units sat on the product itself. Such a size is linked the
 * first time it is touched, by moving its units from the product row of the
 * branch to the new size row. If that branch does not hold enough units the
 * size stays unlinked and is sold at product level, as before.
 */

import { Prisma } from '@prisma/client';
import { applyStockDelta } from '../../../common/shop-scope';

type Db = Prisma.TransactionClient;

export interface SizeKey {
  size: string;
  sizeSystem: string;
  width?: string | null;
}

/** Name of the core variant that holds a size's stock. */
export function sizeLabel(v: SizeKey): string {
  const width = v.width && v.width !== 'REGULAR' ? ` ${v.width}` : '';
  return `${v.sizeSystem} ${String(v.size).trim()}${width}`;
}

/** Core variants for the given sizes, keyed by shoe size id. */
export async function linkedVariants<T extends SizeKey & { id: string; productId: string }>(
  db: Db,
  sizes: T[],
): Promise<Map<string, { id: string; stock: number }>> {
  const out = new Map<string, { id: string; stock: number }>();
  if (!sizes.length) return out;
  const productIds = [...new Set(sizes.map((s) => s.productId))];
  const names = [...new Set(sizes.map(sizeLabel))];
  const variants = await db.productVariant.findMany({
    where: { productId: { in: productIds }, name: { in: names } },
    select: { id: true, productId: true, name: true, stock: true },
  });
  const byKey = new Map(variants.map((v) => [`${v.productId}|${v.name}`, v]));
  for (const s of sizes) {
    const v = byKey.get(`${s.productId}|${sizeLabel(s)}`);
    if (v) out.set(s.id, { id: v.id, stock: Number(v.stock) || 0 });
  }
  return out;
}

/**
 * Adds the live stock (and the core variant id) to shoe size rows, and
 * refreshes the count kept on the shoe row so dashboards read the same number.
 */
export async function withLiveStock<T extends SizeKey & { id: string; productId: string; stock: number }>(
  db: Db,
  sizes: T[],
): Promise<Array<T & { variantId: string | null }>> {
  const links = await linkedVariants(db, sizes);
  const stale: Array<{ id: string; stock: number }> = [];
  const rows = sizes.map((s) => {
    const link = links.get(s.id);
    if (!link) return { ...s, variantId: null };
    if (link.stock !== s.stock) stale.push({ id: s.id, stock: link.stock });
    return { ...s, stock: link.stock, variantId: link.id };
  });
  for (const s of stale) {
    await db.shoeSizeVariant.update({ where: { id: s.id }, data: { stock: s.stock } });
  }
  return rows;
}

/** Shop-wide refresh of the counts kept on shoe size rows. */
export async function refreshSizeStock(db: Db, tenantId: string) {
  const sizes = await db.shoeSizeVariant.findMany({
    where: { tenantId },
    select: { id: true, productId: true, size: true, sizeSystem: true, width: true, stock: true },
  });
  await withLiveStock(db, sizes);
}

/**
 * Makes sure a size has its core variant, creating it if needed and moving
 * any stock recorded before the link from the product row of `shopId`.
 * Returns the variant id, or null when the size has to stay unlinked.
 */
export async function ensureSizeVariant(
  db: Db,
  input: {
    tenantId: string;
    userId: string;
    shopId: string;
    size: SizeKey & { id: string; productId: string; stock: number; sku?: string | null; barcode?: string | null;
      priceOverride?: number | null; costOverride?: number | null; isActive?: boolean };
  },
): Promise<string | null> {
  const { tenantId, userId, shopId, size } = input;
  const existing = (await linkedVariants(db, [size])).get(size.id);
  if (existing) return existing.id;

  const product = await db.product.findFirst({
    where: { id: size.productId, tenantId },
    select: { id: true, name: true, price: true, costPrice: true, unit: true },
  });
  if (!product) return null;

  // Units recorded on the shoe row before the link sit on the product row.
  const legacy = Math.max(Math.round(Number(size.stock) || 0), 0);
  if (legacy > 0) {
    const base = await db.shopStock.findFirst({
      where: { shopId, productId: product.id, variantId: null },
      select: { stock: true },
    });
    if (Number(base?.stock ?? 0) < legacy) return null;
  }

  const label = sizeLabel(size);
  const skuFree = size.sku
    ? !(await db.productVariant.findFirst({ where: { sku: size.sku, product: { tenantId } }, select: { id: true } }))
    : false;
  const barcodeFree = size.barcode
    ? !(await db.productVariant.findFirst({ where: { barcode: size.barcode, product: { tenantId } }, select: { id: true } }))
    : false;

  const variant = await db.productVariant.create({
    data: {
      productId: product.id,
      name: label,
      size: String(size.size).trim(),
      sku: skuFree ? size.sku : undefined,
      barcode: barcodeFree ? size.barcode : undefined,
      unit: product.unit,
      price: size.priceOverride ?? product.price,
      costPrice: size.costOverride ?? product.costPrice ?? 0,
      stock: 0,
      lowStockAlert: 1,
      isActive: size.isActive ?? true,
    },
    select: { id: true },
  });
  await db.product.update({ where: { id: product.id }, data: { hasVariants: true } });

  if (legacy > 0) {
    const note = `Size ${label} ka stock size ke khane me muntaqil`;
    await applyStockDelta({
      tx: db, tenantId, shopId, productId: product.id, variantId: null, delta: -legacy,
      movementType: 'ADJUSTMENT_OUT', reference: 'SIZE-LINK', note, preventNegative: true, label: product.name, userId,
    });
    await applyStockDelta({
      tx: db, tenantId, shopId, productId: product.id, variantId: variant.id, delta: legacy,
      movementType: 'ADJUSTMENT_IN', reference: 'SIZE-LINK', note, userId,
    });
  }
  return variant.id;
}
