import { BadRequestException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { emitStockChanged } from './stock-events';

/**
 * ════════════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH FOR STOCK
 * ════════════════════════════════════════════════════════════════
 *
 * `ShopStock` (one row per shop × product × variant) is the truth.
 * `Product.stock` and `ProductVariant.stock` are caches kept in step with it
 * so that catalog screens, exports and the marketplace can read a single
 * number without fanning out per branch.
 *
 * Every code path that moves stock — purchase in, sale out, return, damage,
 * adjustment, transfer — must go through `applyStockDelta` so the two never
 * drift apart. They used to: purchases wrote only to `Product.stock` while
 * sales wrote only to `ShopStock`.
 */

/** Stock is kept to 4 decimals so float sums (3 x 3.2) do not leave 9.600000000000001. */
export const roundStock = (n: number) => Math.round((Number(n) || 0) * 10_000) / 10_000;

/** Product types and units that are a service, not goods on a shelf. */
export const SERVICE_PRODUCT_TYPES = ['SERVICE', 'SERVICE_FEE'] as const;

/**
 * True for a service line (fees, labour, haircut): it has no stock to check,
 * count or reorder. Matches `productType` SERVICE / SERVICE_FEE or unit "service".
 */
export function isServiceProduct(p: { productType?: string | null; unit?: string | null } | null | undefined): boolean {
  if (!p) return false;
  const type = (p.productType ?? '').toUpperCase();
  if ((SERVICE_PRODUCT_TYPES as readonly string[]).includes(type)) return true;
  return (p.unit ?? '').trim().toLowerCase() === 'service';
}

/**
 * Prisma product filter that leaves service products out (stock lists and
 * alerts). `productType` is nullable, so NULL is matched explicitly.
 */
export const NOT_SERVICE_PRODUCT = {
  AND: [
    { OR: [{ productType: null }, { productType: { notIn: [...SERVICE_PRODUCT_TYPES] } }] },
    { NOT: { unit: { equals: 'service', mode: 'insensitive' as const } } },
  ],
};

/** The same rule in SQL, for raw queries on the "Product" table under `alias`. */
export const notServiceProductSql = (alias: 'p' | 'wp' | '"Product"' = 'p') =>
  Prisma.raw(`(${alias}."productType" IS NULL OR upper(${alias}."productType") NOT IN ('SERVICE','SERVICE_FEE')) AND lower(trim(${alias}.unit)) <> 'service'`);

export interface StockDelta {
  tx: any;
  tenantId: string;
  /** Branch the stock physically moves in or out of. */
  shopId: string;
  productId: string;
  variantId?: string | null;
  /** Positive to add stock, negative to remove it. */
  delta: number;
  /** Recorded on StockMovement when `movementType` is given. */
  movementType?: StockMovementType;
  reference?: string | null;
  note?: string | null;
  /** Refuse the write if the branch would go negative. */
  preventNegative?: boolean;
  /** Shown in the error when `preventNegative` trips. */
  label?: string;
  /** Recorded on the movement: who did it, and the cost of one base unit (default: current cost). */
  userId?: string | null;
  unitCost?: number | null;
}

export interface StockDeltaResult {
  shopStockId: string;
  /** Branch stock after the move. */
  shopStock: number;
  /** Tenant-wide stock after the move. */
  globalStock: number;
}

/**
 * Apply a stock change to one branch and re-derive the cached totals.
 */
export async function applyStockDelta(
  input: StockDelta,
): Promise<StockDeltaResult> {
  const {
    tx,
    tenantId,
    shopId,
    productId,
    movementType,
    reference = null,
    note = null,
    preventNegative = false,
    label,
  } = input;
  const delta = roundStock(input.delta);
  const variantId = input.variantId ?? null;

  if (!shopId) {
    throw new BadRequestException(
      'Stock update ke liye shop zaroori hai — upar dropdown se shop select karein',
    );
  }

  // Make sure the branch row exists, then change it atomically so two
  // writers at once (two counters, a sale and a transfer) both count.
  let row = await tx.shopStock.findFirst({ where: { shopId, productId, variantId }, select: { id: true } });
  if (!row) {
    // A new branch row starts with the item's own alert level, not the
    // column default of 5.
    const src = variantId
      ? await tx.productVariant.findUnique({ where: { id: variantId }, select: { lowStockAlert: true } })
      : await tx.product.findUnique({ where: { id: productId }, select: { lowStockAlert: true } });
    row = await tx.shopStock.create({
      data: {
        tenantId, shopId, productId, variantId, stock: 0, isActive: true,
        ...(src?.lowStockAlert != null && { lowStockAlert: Number(src.lowStockAlert) }),
      },
      select: { id: true },
    });
  }
  const shopStockId: string = row.id;
  const changed = await tx.shopStock.updateMany({
    where: { id: shopStockId, ...(preventNegative && delta < 0 ? { stock: { gte: -delta - 0.0001 } } : {}) },
    data: { stock: { increment: delta } },
  });
  if (!changed.count) {
    const now = await tx.shopStock.findUnique({ where: { id: shopStockId }, select: { stock: true } });
    throw new BadRequestException(
      `${label ?? 'Item'} is shop mein kaafi nahi hai. Available: ${Number(now?.stock ?? 0)}, chahiye: ${Math.abs(delta)}`,
    );
  }
  let after = Number((await tx.shopStock.findUnique({ where: { id: shopStockId }, select: { stock: true } }))?.stock ?? 0);
  const rounded = roundStock(after);
  if (rounded !== after) {
    // Only when nobody changed the row since the read above.
    await tx.shopStock.updateMany({ where: { id: shopStockId, stock: after }, data: { stock: rounded } });
    after = rounded;
  }

  const globalStock = await recacheProductStock(tx, productId, variantId);

  if (movementType) {
    let unitCost = input.unitCost ?? null;
    if (unitCost == null) {
      const src = variantId
        ? await tx.productVariant.findUnique({ where: { id: variantId }, select: { costPrice: true } })
        : await tx.product.findUnique({ where: { id: productId }, select: { costPrice: true } });
      unitCost = Number(src?.costPrice ?? 0);
    }
    await tx.stockMovement.create({
      data: {
        tenantId,
        shopId,
        productId,
        variantId,
        type: movementType,
        quantity: delta,
        balanceAfter: after,
        reference,
        note,
        createdById: input.userId ?? null,
        unitCost,
      },
    });
  }

  // Online store ko batao — website ka stock foran (debounce ke baad) update
  emitStockChanged({ tenantId, productId, variantId });

  return { shopStockId, shopStock: after, globalStock };
}

/**
 * Re-derive `Product.stock` (and `ProductVariant.stock`) from the branch rows.
 * Safe to call on its own after a bulk write that touched ShopStock directly.
 */
export async function recacheProductStock(
  tx: any,
  productId: string,
  variantId?: string | null,
): Promise<number> {
  if (variantId) {
    const variantAgg = await tx.shopStock.aggregate({
      where: { productId, variantId },
      _sum: { stock: true },
    });
    await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: roundStock(Number(variantAgg._sum.stock ?? 0)) },
    });
  }

  // Product total spans every branch row — variant rows for a variant product,
  // the single null-variant row otherwise.
  const productAgg = await tx.shopStock.aggregate({
    where: { productId },
    _sum: { stock: true },
  });
  const globalStock = roundStock(Number(productAgg._sum.stock ?? 0));

  await tx.product.update({
    where: { id: productId },
    data: { stock: globalStock },
  });

  return globalStock;
}

/**
 * Branch stock for one item, without creating a row for it.
 */
export async function readShopStock(
  tx: any,
  shopId: string,
  productId: string,
  variantId?: string | null,
): Promise<number> {
  const row = await tx.shopStock.findFirst({
    where: { shopId, productId, variantId: variantId ?? null },
    select: { stock: true },
  });
  return row ? Number(row.stock) : 0;
}
