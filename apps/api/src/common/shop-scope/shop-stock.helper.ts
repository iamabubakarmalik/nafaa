import { BadRequestException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';

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
    delta,
    movementType,
    reference = null,
    note = null,
    preventNegative = false,
    label,
  } = input;
  const variantId = input.variantId ?? null;

  if (!shopId) {
    throw new BadRequestException(
      'Stock update ke liye shop zaroori hai — upar dropdown se shop select karein',
    );
  }

  const existing = await tx.shopStock.findFirst({
    where: { shopId, productId, variantId },
    select: { id: true, stock: true },
  });

  const before = existing ? Number(existing.stock) : 0;
  const after = before + delta;

  if (preventNegative && after < -0.0001) {
    throw new BadRequestException(
      `${label ?? 'Item'} is shop mein kaafi nahi hai. Available: ${before}, chahiye: ${Math.abs(delta)}`,
    );
  }

  let shopStockId: string;
  if (existing) {
    const updated = await tx.shopStock.update({
      where: { id: existing.id },
      data: { stock: after },
      select: { id: true },
    });
    shopStockId = updated.id;
  } else {
    const created = await tx.shopStock.create({
      data: { tenantId, shopId, productId, variantId, stock: after, isActive: true },
      select: { id: true },
    });
    shopStockId = created.id;
  }

  const globalStock = await recacheProductStock(tx, productId, variantId);

  if (movementType) {
    await tx.stockMovement.create({
      data: {
        tenantId,
        shopId,
        productId,
        type: movementType,
        quantity: delta,
        balanceAfter: after,
        reference,
        note,
      },
    });
  }

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
      data: { stock: Number(variantAgg._sum.stock ?? 0) },
    });
  }

  // Product total spans every branch row — variant rows for a variant product,
  // the single null-variant row otherwise.
  const productAgg = await tx.shopStock.aggregate({
    where: { productId },
    _sum: { stock: true },
  });
  const globalStock = Number(productAgg._sum.stock ?? 0);

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
