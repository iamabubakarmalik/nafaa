/**
 * Opening stock for variants (sizes, colours) of a newly created product.
 *
 * Creating a variant with a stock number only fills the cached count; the
 * POS sells from branch stock rows, so the first stock of each new variant
 * is booked here as an OPENING_BALANCE movement. It is refused for a
 * variant that already has stock history: later changes are purchases or
 * stock adjustments, which keep their own records.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsPositive, IsString, ValidateNested } from 'class-validator';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta } from '../../../common/shop-scope';
import { resolveIndustryShopId } from '../../_shared/industry-sale.helper';

export interface OpeningStockLine {
  variantId: string;
  quantity: number;
}

export async function addVariantOpeningStock(
  db: Prisma.TransactionClient,
  user: AuthenticatedUser,
  productId: string,
  lines: OpeningStockLine[],
  activeShopId?: string | null,
) {
  const product = await db.product.findFirst({
    where: { id: productId, tenantId: user.tenantId },
    select: { id: true, name: true, variants: { select: { id: true, name: true } } },
  });
  if (!product) throw new NotFoundException('Product nahi mila');
  const names = new Map(product.variants.map((v) => [v.id, v.name]));
  const wanted = (lines ?? []).filter((l) => Number(l?.quantity) > 0);
  for (const l of wanted) {
    if (!names.has(l.variantId)) throw new BadRequestException('Variant is product ka nahi');
  }
  if (!wanted.length) return { count: 0 };

  const history = await db.stockMovement.count({
    where: { tenantId: user.tenantId, productId, variantId: { in: wanted.map((l) => l.variantId) } },
  });
  if (history > 0) {
    throw new BadRequestException('Is variant ka stock pehle se darj hai — ab Purchase ya Stock Adjustment se badlein');
  }

  const shopId = await resolveIndustryShopId(db, user, activeShopId);
  for (const l of wanted) {
    await applyStockDelta({
      tx: db, tenantId: user.tenantId, shopId, productId, variantId: l.variantId,
      delta: Number(l.quantity), movementType: 'OPENING_BALANCE', reference: 'OPENING',
      note: `Opening stock: ${product.name} (${names.get(l.variantId)})`, userId: user.id,
    });
  }
  return { count: wanted.length };
}

/**
 * Variant products saved by the older product wizard kept all their units
 * on the product row of the branch, while each variant only had a cached
 * count. The POS sells a variant from its own branch row, so such a product
 * could not be sold. When the branch has no variant rows yet and its product
 * row holds at least the cached counts, the units are moved to the variant
 * rows (totals do not change). Anything less clean is left for a stock count.
 */
export async function splitLegacyVariantStock(
  db: Prisma.TransactionClient,
  user: AuthenticatedUser,
  productId: string,
  activeShopId?: string | null,
): Promise<{ moved: number; reason?: string }> {
  const product = await db.product.findFirst({
    where: { id: productId, tenantId: user.tenantId },
    select: { id: true, name: true, hasVariants: true, variants: { where: { isActive: true }, select: { id: true, name: true, stock: true } } },
  });
  if (!product) throw new NotFoundException('Product nahi mila');
  if (!product.hasVariants || !product.variants.length) return { moved: 0 };

  const shopId = await resolveIndustryShopId(db, user, activeShopId);
  const variantRows = await db.shopStock.count({ where: { shopId, productId, variantId: { not: null } } });
  if (variantRows > 0) return { moved: 0 };
  const base = await db.shopStock.findFirst({ where: { shopId, productId, variantId: null }, select: { stock: true } });
  const want = product.variants.reduce((s, v) => s + Math.max(Number(v.stock) || 0, 0), 0);
  if (want <= 0) return { moved: 0 };
  if (Number(base?.stock ?? 0) < want) {
    return { moved: 0, reason: 'Variants ki ginti product ke stock se zyada hai — stock count karein' };
  }
  for (const v of product.variants) {
    const qty = Math.max(Number(v.stock) || 0, 0);
    if (!qty) continue;
    const note = `${product.name}: stock variant "${v.name}" ke khane me muntaqil`;
    await applyStockDelta({
      tx: db, tenantId: user.tenantId, shopId, productId, variantId: null, delta: -qty,
      movementType: 'ADJUSTMENT_OUT', reference: 'VARIANT-SPLIT', note, preventNegative: true, label: product.name, userId: user.id,
    });
    await applyStockDelta({
      tx: db, tenantId: user.tenantId, shopId, productId, variantId: v.id, delta: qty,
      movementType: 'ADJUSTMENT_IN', reference: 'VARIANT-SPLIT', note, userId: user.id,
    });
  }
  return { moved: want };
}

class OpeningStockLineDto {
  @ApiProperty() @IsString() variantId!: string;
  @ApiProperty() @IsNumber() @IsPositive() quantity!: number;
}

export class OpeningStockDto {
  @ApiProperty({ type: [OpeningStockLineDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OpeningStockLineDto)
  items!: OpeningStockLineDto[];
}
