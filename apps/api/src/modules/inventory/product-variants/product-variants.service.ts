/**
 * Product variants (size, colour, pack). A variant's stock lives in its own
 * ShopStock rows like any product, so a stock number given when a variant is
 * created is booked as opening stock in one branch, and later changes go
 * through purchases and stock adjustments.
 */

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, applyStockDelta, readShopStock, resolveWriteShopId, roundStock } from '../../../common/shop-scope';
import { UpsertVariantDto } from './dto/upsert-variant.dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureProduct(user: AuthenticatedUser, productId: string) {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  private shopFor(user: AuthenticatedUser, scope: ShopScope | undefined, shopId?: string) {
    return resolveWriteShopId(this.prisma, user.tenantId, scope ?? new ShopScope(null, true), shopId);
  }

  private variantData(productId: string, v: UpsertVariantDto, sortOrder: number) {
    return {
      productId,
      name: v.name,
      sku: v.sku,
      barcode: v.barcode,
      color: v.color,
      colorHex: v.colorHex,
      size: v.size,
      weight: v.weight,
      unit: v.unit,
      price: v.price,
      costPrice: v.costPrice ?? 0,
      wholesalePrice: v.wholesalePrice,
      // Filled in by the opening-stock movement.
      stock: 0,
      lowStockAlert: v.lowStockAlert ?? 5,
      imageUrl: v.imageUrl,
      isActive: v.isActive ?? true,
      sortOrder: v.sortOrder ?? sortOrder,
    };
  }

  /**
   * Opening stock for new variants in one branch. When the product had no
   * variants before, units already on its plain (no-variant) row in that
   * branch are moved to the variants first: product wizards save the total
   * on the product and then the split per variant, and that total must not
   * be counted twice. Only the part not covered is booked as new stock.
   */
  private async openVariantStock(
    tx: Tx,
    user: AuthenticatedUser,
    product: { id: string; name: string },
    shopId: string,
    lines: Array<{ id: string; name: string; qty: number }>,
    hadVariants: boolean,
  ) {
    let plain = hadVariants ? 0 : await readShopStock(tx, shopId, product.id, null);
    for (const l of lines) {
      const qty = roundStock(l.qty);
      if (!(qty > 0)) continue;
      const note = `Opening stock: ${product.name} (${l.name})`;
      const fromPlain = roundStock(Math.min(Math.max(plain, 0), qty));
      if (fromPlain > 0) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: product.id, variantId: null, delta: -fromPlain,
          movementType: 'OPENING_BALANCE', reference: 'VARIANT-SPLIT',
          note: `${product.name}: stock variant "${l.name}" ke khane me gaya`, userId: user.id,
        });
        plain = roundStock(plain - fromPlain);
      }
      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId, productId: product.id, variantId: l.id, delta: qty,
        movementType: 'OPENING_BALANCE', reference: fromPlain > 0 ? 'VARIANT-SPLIT' : 'OPENING', note, userId: user.id,
      });
    }
  }

  async list(user: AuthenticatedUser, productId: string) {
    await this.ensureProduct(user, productId);
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(user: AuthenticatedUser, productId: string, dto: UpsertVariantDto, scope?: ShopScope) {
    const product = await this.ensureProduct(user, productId);

    if (dto.sku) {
      const existing = await this.prisma.productVariant.findFirst({
        where: { sku: dto.sku, product: { tenantId: user.tenantId } },
      });
      if (existing) throw new ConflictException('Variant SKU already exists');
    }

    if (dto.barcode) {
      const existing = await this.prisma.productVariant.findFirst({
        where: { barcode: dto.barcode, product: { tenantId: user.tenantId } },
      });
      if (existing) throw new ConflictException('Variant barcode already exists');
    }

    const qty = roundStock(Number(dto.stock ?? 0));
    const shopId = qty > 0 ? await this.shopFor(user, scope, dto.shopId) : null;
    const hadVariants = (await this.prisma.productVariant.count({ where: { productId } })) > 0;

    const variant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productVariant.create({ data: this.variantData(productId, dto, 0) });
      await tx.product.update({ where: { id: productId }, data: { hasVariants: true } });
      if (shopId) {
        await this.openVariantStock(tx, user, product, shopId, [{ id: created.id, name: created.name, qty }], hadVariants);
      }
      return created;
    });

    return this.prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
  }

  async update(user: AuthenticatedUser, productId: string, id: string, dto: UpsertVariantDto, scope?: ShopScope) {
    const product = await this.ensureProduct(user, productId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id, productId },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    // Stock changes through movements only. A stock number is used just once,
    // as opening stock, for a variant that has never held stock.
    const { stock, shopId: wantedShop, ...data } = dto;
    const wanted = stock === undefined || stock === null ? null : roundStock(Number(stock));
    let stockIgnored = false;
    if (wanted !== null && wanted !== roundStock(Number(variant.stock))) {
      const history = await this.prisma.stockMovement.count({ where: { tenantId: user.tenantId, productId, variantId: id } });
      if (history === 0 && Number(variant.stock) === 0 && wanted > 0) {
        const shopId = await this.shopFor(user, scope, wantedShop);
        await this.prisma.$transaction((tx) =>
          this.openVariantStock(tx, user, product, shopId, [{ id, name: variant.name, qty: wanted }], true),
        );
      } else {
        stockIgnored = true;
      }
    }

    const updated = await this.prisma.productVariant.update({
      where: { id },
      data,
    });
    return stockIgnored
      ? { ...updated, stockIgnored: true, stockMessage: 'Stock yahan se nahi badalta — Stock Adjustment ya Purchase se badlein' }
      : updated;
  }

  async remove(user: AuthenticatedUser, productId: string, id: string) {
    await this.ensureProduct(user, productId);
    await this.prisma.productVariant.delete({ where: { id } });

    const remaining = await this.prisma.productVariant.count({ where: { productId } });
    if (remaining === 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { hasVariants: false },
      });
    }

    return { message: 'Variant deleted' };
  }

  async bulkCreate(
    user: AuthenticatedUser,
    productId: string,
    variants: UpsertVariantDto[],
    scope?: ShopScope,
    shopId?: string,
  ) {
    const product = await this.ensureProduct(user, productId);
    const list = Array.isArray(variants) ? variants : [];
    const withStock = list.some((v) => Number(v?.stock) > 0);
    const stockShopId = withStock ? await this.shopFor(user, scope, shopId) : null;
    const hadVariants = (await this.prisma.productVariant.count({ where: { productId } })) > 0;

    const created = await this.prisma.$transaction(async (tx) => {
      const rows = [];
      for (const [i, v] of list.entries()) {
        rows.push(await tx.productVariant.create({ data: this.variantData(productId, v, i) }));
      }
      await tx.product.update({ where: { id: productId }, data: { hasVariants: true } });
      if (stockShopId) {
        await this.openVariantStock(
          tx, user, product, stockShopId,
          rows.map((r, i) => ({ id: r.id, name: r.name, qty: Number(list[i].stock ?? 0) })),
          hadVariants,
        );
      }
      return rows;
    }, { timeout: 60_000 });

    // Re-read so each variant carries its stock after the opening movements.
    const items = await this.prisma.productVariant.findMany({
      where: { id: { in: created.map((c) => c.id) } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { created: items.length, items };
  }
}
