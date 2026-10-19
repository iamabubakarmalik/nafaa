/**
 * Garment details of products: gender, garment type, season, collection
 * and the size/colour of each variant. Also the size grid of one product
 * (stock per size and colour in the branch) and the size-wise reorder list.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DAY_MS, r2 } from '../common/garments-common';
import { moveSale } from '../common/collection-sale';
import { addVariantOpeningStock, OpeningStockDto, splitLegacyVariantStock } from '../common/opening-stock.helper';
import { UpsertGarmentProductDto, UpsertVariantProfileDto, VariantProfilesDto } from './dto/upsert-garment-product.dto';

const SOLD = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;

@Injectable()
export class GarmentProductsService {
  constructor(private readonly prisma: PrismaService) {}

  openingStock(user: AuthenticatedUser, productId: string, dto: OpeningStockDto, activeShopId?: string | null) {
    return this.prisma.$transaction((tx) => addVariantOpeningStock(tx, user, productId, dto.items, activeShopId));
  }

  splitVariantStock(user: AuthenticatedUser, productId: string, activeShopId?: string | null) {
    return this.prisma.$transaction((tx) => splitLegacyVariantStock(tx, user, productId, activeShopId));
  }

  private async ownProduct(user: AuthenticatedUser, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true, name: true } });
    if (!product) throw new NotFoundException('Product nahi mila');
    return product;
  }

  /** Collection and size chart must be this shop's own. */
  private async checkLinks(user: AuthenticatedUser, dto: { collectionId?: string | null; sizeChartId?: string | null }) {
    if (dto.collectionId) {
      const c = await this.prisma.garmentCollection.findFirst({ where: { id: dto.collectionId, tenantId: user.tenantId }, select: { id: true } });
      if (!c) throw new BadRequestException('Collection nahi mili');
    }
    if (dto.sizeChartId) {
      const s = await this.prisma.garmentSizeChart.findFirst({ where: { id: dto.sizeChartId, tenantId: user.tenantId }, select: { id: true } });
      if (!s) throw new BadRequestException('Size chart nahi mila');
    }
  }

  /** Saves the garment details; a product changing collection takes on that collection's sale price (or loses the old one). */
  async upsertProfile(user: AuthenticatedUser, dto: UpsertGarmentProductDto) {
    await this.ownProduct(user, dto.productId);
    const data = { ...dto, collectionId: dto.collectionId || null, sizeChartId: dto.sizeChartId || null };
    await this.checkLinks(user, data);
    return this.prisma.$transaction(async (tx) => {
      const moved = await moveSale(tx, user.tenantId, [dto.productId], data.collectionId);
      const onSale = data.collectionId
        ? (await tx.garmentCollection.findFirst({ where: { id: data.collectionId }, select: { salePercent: true } }))?.salePercent != null
        : false;
      if (moved.changes.length) {
        await tx.activityLog.create({
          data: {
            tenantId: user.tenantId, userId: user.id, action: 'COLLECTION_SALE_CHANGED', entityType: 'GarmentCollection', entityId: data.collectionId,
            description: `Collection badalne par ${moved.changes.length} rate badle`,
            metadata: { total: moved.changes.length, changes: moved.changes } as unknown as Prisma.InputJsonValue,
          },
        });
      }
      const row = { ...data, ...(onSale && { isOnSale: true }), tenantId: user.tenantId };
      return tx.garmentProductProfile.upsert({ where: { productId: dto.productId }, update: row, create: row });
    });
  }

  async list(user: AuthenticatedUser, params: { gender?: string; categoryType?: string; season?: string; collectionId?: string; featured?: boolean; newArrival?: boolean; bestSeller?: boolean; onSale?: boolean; search?: string }) {
    const profiles = await this.prisma.garmentProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.gender && { gender: params.gender as never }),
        ...(params.categoryType && { categoryType: params.categoryType as never }),
        ...(params.season && { season: params.season as never }),
        ...(params.collectionId && { collectionId: params.collectionId }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.newArrival !== undefined && { isNewArrival: params.newArrival }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.onSale !== undefined && { isOnSale: params.onSale }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: profiles.map((p) => p.productId) },
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true, brand: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return profiles.filter((p) => byId.has(p.productId)).map((p) => ({ ...p, product: byId.get(p.productId) }));
  }

  /**
   * The garment facts of every product in one small answer, for the POS
   * and the products page: gender, type, season, collection and flags.
   */
  async meta(user: AuthenticatedUser) {
    const [profiles, collections] = await Promise.all([
      this.prisma.garmentProductProfile.findMany({
        where: { tenantId: user.tenantId },
        select: {
          productId: true, gender: true, categoryType: true, season: true, collectionId: true, fabricType: true, styleCode: true,
          isReadyMade: true, isStitchable: true, isFabricOnly: true, isNewArrival: true, isBestSeller: true, isOnSale: true,
        },
      }),
      this.prisma.garmentCollection.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true, isActive: true } }),
    ]);
    return { items: profiles, collections };
  }

  async getByProductId(user: AuthenticatedUser, productId: string) {
    return this.prisma.garmentProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.garmentProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Garment detail nahi mili');
    const [product, variantProfiles] = await Promise.all([
      this.prisma.product.findFirst({ where: { id: p.productId, tenantId: user.tenantId }, include: { images: true, category: true, brand: true, variants: true } }),
      this.prisma.garmentVariantProfile.findMany({ where: { productId: p.productId, tenantId: user.tenantId } }),
    ]);
    return { ...p, product, variantProfiles };
  }

  /** Removes only the garment details; the product, its stock and bills stay. */
  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.garmentProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Garment detail nahi mili');
    return this.prisma.garmentProductProfile.delete({ where: { id } });
  }

  /** The variant must belong to a product of this shop. */
  private async ownVariant(user: AuthenticatedUser, productId: string, variantId: string) {
    const v = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, product: { tenantId: user.tenantId } },
      select: { id: true },
    });
    if (!v) throw new BadRequestException('Ye size/rang is product ka nahi');
  }

  async upsertVariantProfile(user: AuthenticatedUser, dto: UpsertVariantProfileDto) {
    await this.ownVariant(user, dto.productId, dto.variantId);
    return this.prisma.garmentVariantProfile.upsert({
      where: { variantId: dto.variantId },
      update: { ...dto, tenantId: user.tenantId },
      create: { ...dto, tenantId: user.tenantId },
    });
  }

  /** Size and colour of several variants of one product in one call (product editor). */
  async saveVariantProfiles(user: AuthenticatedUser, productId: string, dto: VariantProfilesDto) {
    await this.ownProduct(user, productId);
    const ids = dto.items.map((i) => i.variantId);
    const own = await this.prisma.productVariant.findMany({ where: { productId, id: { in: ids } }, select: { id: true } });
    const known = new Set(own.map((v) => v.id));
    const rows = dto.items.filter((i) => known.has(i.variantId));
    await this.prisma.$transaction(rows.map((i, idx) => {
      const data = {
        size: i.size?.trim() || null, colorName: i.colorName?.trim() || null, colorHex: i.colorHex?.trim() || null,
        displayOrder: i.displayOrder ?? idx,
      };
      return this.prisma.garmentVariantProfile.upsert({
        where: { variantId: i.variantId },
        update: data,
        create: { ...data, tenantId: user.tenantId, productId, variantId: i.variantId },
      });
    }));
    return { saved: rows.length };
  }

  async variantProfilesByProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.garmentVariantProfile.findMany({ where: { productId, tenantId: user.tenantId }, orderBy: { displayOrder: 'asc' } });
  }

  async removeVariantProfile(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.garmentVariantProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Size/rang detail nahi mili');
    return this.prisma.garmentVariantProfile.delete({ where: { id } });
  }

  /**
   * Size × colour grid of one product: each active variant with its size and
   * colour, stock and held pieces in the branch being viewed, stock in every
   * branch and pieces sold in the last 30 days.
   */
  async sizeGrid(user: AuthenticatedUser, scope: ShopScope, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: { id: true, name: true, price: true, lowStockAlert: true, variants: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, size: true, color: true, colorHex: true, barcode: true, sku: true, price: true, isActive: true, lowStockAlert: true } } },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    const ids = product.variants.map((v) => v.id);
    const since = new Date(Date.now() - 30 * DAY_MS);
    const [profiles, stocks, sold, shops] = await Promise.all([
      this.prisma.garmentVariantProfile.findMany({ where: { tenantId: user.tenantId, variantId: { in: ids } } }),
      this.prisma.shopStock.findMany({ where: { tenantId: user.tenantId, productId, variantId: { in: ids } }, select: { shopId: true, variantId: true, stock: true, reserved: true } }),
      this.prisma.saleItemVariant.findMany({
        where: { variantId: { in: ids }, saleItem: { sale: { tenantId: user.tenantId, status: { in: [...SOLD] }, createdAt: { gte: since }, ...scope.where } } },
        select: { variantId: true, saleItem: { select: { quantity: true, returnedQty: true } } },
      }),
      this.prisma.shop.findMany({ where: { tenantId: user.tenantId, isActive: true }, select: { id: true, name: true }, orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }] }),
    ]);
    const profileOf = new Map(profiles.map((p) => [p.variantId, p]));
    const soldOf = new Map<string, number>();
    for (const s of sold) soldOf.set(s.variantId, (soldOf.get(s.variantId) ?? 0) + Number(s.saleItem.quantity) - Number(s.saleItem.returnedQty));
    const variants = product.variants.map((v) => {
      const p = profileOf.get(v.id);
      const rows = stocks.filter((s) => s.variantId === v.id);
      const here = scope.shopId ? rows.filter((s) => s.shopId === scope.shopId) : rows;
      return {
        id: v.id, name: v.name, barcode: v.barcode, sku: v.sku, price: v.price, isActive: v.isActive,
        size: p?.size ?? v.size ?? null, colorName: p?.colorName ?? v.color ?? null, colorHex: p?.colorHex ?? v.colorHex ?? null,
        lowStockAlert: Number(v.lowStockAlert ?? product.lowStockAlert ?? 0),
        stock: r2(here.reduce((s, r) => s + Number(r.stock), 0)),
        /** Pieces held for customers in the branch (holds, instalment plans). */
        reserved: r2(here.reduce((s, r) => s + Number(r.reserved), 0)),
        allStock: r2(rows.reduce((s, r) => s + Number(r.stock), 0)),
        byShop: shops.map((sh) => ({ shopId: sh.id, name: sh.name, stock: r2(rows.filter((r) => r.shopId === sh.id).reduce((s, r) => s + Number(r.stock), 0)) })),
        sold30: r2(soldOf.get(v.id) ?? 0),
      };
    });
    const sizes = [...new Set(variants.map((v) => v.size).filter((x): x is string => !!x))];
    const colors = [...new Set(variants.map((v) => v.colorName).filter((x): x is string => !!x))];
    return { productId: product.id, name: product.name, sizes, colors, shops, variants };
  }

  /**
   * Size-wise reorder for the branch: active sizes/colours at or below their
   * low-stock mark, with what sold in the last 30 days, grouped by product.
   */
  async reorder(user: AuthenticatedUser, scope: ShopScope, q: { limit?: string }) {
    const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
    const variants = await this.prisma.productVariant.findMany({
      where: { isActive: true, product: { tenantId: user.tenantId, isActive: true, hasVariants: true } },
      select: { id: true, name: true, size: true, color: true, lowStockAlert: true, productId: true, product: { select: { name: true, costPrice: true } } },
      take: 20000,
    });
    if (!variants.length) return { items: [], products: 0, pieces: 0 };
    const ids = variants.map((v) => v.id);
    const since = new Date(Date.now() - 30 * DAY_MS);
    const [stocks, sold, profiles] = await Promise.all([
      this.prisma.shopStock.groupBy({ by: ['variantId'], where: { tenantId: user.tenantId, variantId: { in: ids }, ...scope.where }, _sum: { stock: true } }),
      this.prisma.saleItemVariant.findMany({
        where: { variantId: { in: ids }, saleItem: { sale: { tenantId: user.tenantId, status: { in: [...SOLD] }, createdAt: { gte: since }, ...scope.where } } },
        select: { variantId: true, saleItem: { select: { quantity: true, returnedQty: true } } },
      }),
      this.prisma.garmentVariantProfile.findMany({ where: { tenantId: user.tenantId, variantId: { in: ids } }, select: { variantId: true, size: true, colorName: true } }),
    ]);
    const stockOf = new Map(stocks.map((s) => [s.variantId, Number(s._sum.stock ?? 0)]));
    const soldOf = new Map<string, number>();
    for (const s of sold) soldOf.set(s.variantId, (soldOf.get(s.variantId) ?? 0) + Number(s.saleItem.quantity) - Number(s.saleItem.returnedQty));
    const profileOf = new Map(profiles.map((p) => [p.variantId, p]));
    const groups = new Map<string, { productId: string; name: string; sizes: Array<{ variantId: string; name: string; size: string | null; colorName: string | null; stock: number; alert: number; sold30: number; suggest: number }>; sold30: number }>();
    for (const v of variants) {
      const stock = r2(stockOf.get(v.id) ?? 0);
      const alert = Number(v.lowStockAlert ?? 0);
      const sold30 = r2(soldOf.get(v.id) ?? 0);
      // Only sizes that are running out and either sell or have a mark set.
      if (stock > alert || (alert <= 0 && sold30 <= 0)) continue;
      const p = profileOf.get(v.id);
      // Enough for the next 30 days at the recent rate, at least back to the mark.
      const suggest = Math.max(Math.ceil(sold30 - stock), Math.ceil(alert - stock) + 1, 1);
      const g = groups.get(v.productId) ?? { productId: v.productId, name: v.product.name, sizes: [], sold30: 0 };
      g.sizes.push({ variantId: v.id, name: v.name, size: p?.size ?? v.size, colorName: p?.colorName ?? v.color, stock, alert, sold30, suggest });
      g.sold30 = r2(g.sold30 + sold30);
      groups.set(v.productId, g);
    }
    const items = [...groups.values()].sort((a, b) => b.sold30 - a.sold30 || a.name.localeCompare(b.name));
    return {
      items: items.slice(0, limit),
      products: items.length,
      pieces: items.reduce((s, g) => s + g.sizes.reduce((t, x) => t + x.suggest, 0), 0),
    };
  }
}
