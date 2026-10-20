/**
 * Shoe details of products (brand, type, gender, article, season, sizing,
 * features, MRP) and the size views built on the core variants: the size ×
 * colour grid of one article, size-wise reorder, and saving the size and
 * colour of each variant made by the editor. Stock always lives on the
 * core variants and branch rows; nothing here changes stock except the
 * one-time move of older variant stock (splitVariantStock).
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { splitLegacyVariantStock } from '../../sports/common/opening-stock.helper';
import { DAY_MS, SOLD, freeBrandSlug, r2, sizeSort, variantParts } from '../common/shoe-common';
import { UpsertShoeProductDto, VariantSizesDto } from './dto/upsert-product.dto';

@Injectable()
export class ShoeProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertShoeProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (dto.brandId && !(await this.prisma.shoeBrand.count({ where: { id: dto.brandId, tenantId: user.tenantId } }))) {
      throw new BadRequestException('Brand is dukaan ka nahi');
    }
    for (const k of ['mrp', 'costPrice', 'wholesalePrice', 'retailPrice', 'memberPrice', 'warrantyMonths'] as const) {
      if (dto[k] != null && Number(dto[k]) < 0) throw new BadRequestException('Rate ya warranty manfi nahi ho sakti');
    }

    const existing = await this.prisma.shoeProductProfile.findUnique({ where: { productId: dto.productId } });
    const data: any = { ...dto, tenantId: user.tenantId };

    if (existing) return this.prisma.shoeProductProfile.update({ where: { productId: dto.productId }, data });
    return this.prisma.shoeProductProfile.create({ data });
  }

  async list(user: AuthenticatedUser, params: {
    brandId?: string;
    categoryType?: string;
    gender?: string;
    sizeSystem?: string;
    color?: string;
    sport?: string;
    isWaterproof?: boolean;
    isOrthopedic?: boolean;
    featured?: boolean;
    bestSeller?: boolean;
    newArrival?: boolean;
    trending?: boolean;
    bridal?: boolean;
    eidSpecial?: boolean;
    search?: string;
  }) {
    const profiles = await this.prisma.shoeProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.brandId && { brandId: params.brandId }),
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.gender && { gender: params.gender as any }),
        ...(params.sizeSystem && { sizeSystem: params.sizeSystem as any }),
        ...(params.color && { colorName: params.color }),
        ...(params.sport && { sport: params.sport }),
        ...(params.isWaterproof !== undefined && { isWaterproof: params.isWaterproof }),
        ...(params.isOrthopedic !== undefined && { isOrthopedic: params.isOrthopedic }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.newArrival !== undefined && { isNewArrival: params.newArrival }),
        ...(params.trending !== undefined && { isTrending: params.trending }),
        ...(params.bridal !== undefined && { isBridal: params.bridal }),
        ...(params.eidSpecial !== undefined && { isEidSpecial: params.eidSpecial }),
      },
      orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
      take: 300,
    });

    const productIds = profiles.map((p) => p.productId);
    const brandIds = profiles.map((p) => p.brandId).filter(Boolean) as string[];

    const [products, brands] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
        },
        include: { images: { where: { isPrimary: true }, take: 1 }, category: true },
      }),
      this.prisma.shoeBrand.findMany({ where: { id: { in: brandIds } } }),
    ]);

    const productsMap = new Map(products.map((p) => [p.id, p]));
    const brandsMap = new Map(brands.map((b) => [b.id, b]));

    return profiles
      .filter((p) => productsMap.has(p.productId))
      .map((p) => ({
        ...p,
        product: productsMap.get(p.productId),
        brand: p.brandId ? brandsMap.get(p.brandId) : null,
      }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    const p = await this.prisma.shoeProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
    if (!p) return null;
    const brand = p.brandId ? await this.prisma.shoeBrand.findUnique({ where: { id: p.brandId } }) : null;
    return { ...p, brand };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.shoeProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.byProduct(user, p.productId);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.shoeProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.shoeProductProfile.delete({ where: { id } });
  }

  /**
   * Shoe facts of every product in one small answer, for the POS and the
   * products page. `onSale` is true when the MRP printed on the box is
   * above the shop's selling price (sale / clearance).
   */
  async meta(user: AuthenticatedUser) {
    const profiles = await this.prisma.shoeProductProfile.findMany({
      where: { tenantId: user.tenantId },
      select: {
        productId: true, categoryType: true, gender: true, modelName: true, modelCode: true, collection: true, season: true,
        colorName: true, sizeSystem: true, mrp: true, isNewArrival: true, isBestSeller: true, isBridal: true, isEidSpecial: true,
      },
    });
    const prices = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: profiles.map((p) => p.productId) } },
      select: { id: true, price: true },
    });
    const priceOf = new Map(prices.map((p) => [p.id, Number(p.price)]));
    return {
      items: profiles.map((p) => {
        const price = priceOf.get(p.productId) ?? 0;
        const onSale = !!p.mrp && p.mrp > price + 0.009 && price > 0;
        return { ...p, onSale, offPct: onSale ? Math.round(((p.mrp! - price) / p.mrp!) * 100) : 0 };
      }),
    };
  }

  /** Moves units of an older variant product from the product row to its variants, when exact. */
  splitVariantStock(user: AuthenticatedUser, productId: string, activeShopId?: string | null) {
    return this.prisma.$transaction((tx) => splitLegacyVariantStock(tx, user, productId, activeShopId));
  }

  /** Saves the size and colour of each variant made by the size grid. */
  async saveVariantSizes(user: AuthenticatedUser, productId: string, dto: VariantSizesDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: { variants: { select: { id: true } } },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    const own = new Set(product.variants.map((v) => v.id));
    if (dto.items.some((i) => !own.has(i.variantId))) throw new BadRequestException('Variant is product ka nahi');
    await this.prisma.$transaction(dto.items.map((i) => this.prisma.productVariant.update({
      where: { id: i.variantId },
      data: {
        size: i.size?.trim() || null,
        color: i.color?.trim() || null,
        ...(i.colorHex !== undefined && { colorHex: i.colorHex || null }),
      },
    })));
    return { count: dto.items.length };
  }

  /**
   * Size × colour grid of one article: each variant with its stock in the
   * branch being viewed, stock in every branch and pairs sold in 30 days.
   */
  async sizeGrid(user: AuthenticatedUser, scope: ShopScope, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: {
        id: true, name: true, lowStockAlert: true,
        variants: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, size: true, color: true, colorHex: true, barcode: true, sku: true, price: true, isActive: true, lowStockAlert: true } },
      },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    const ids = product.variants.map((v) => v.id);
    const since = new Date(Date.now() - 30 * DAY_MS);
    const [stocks, sold, shops] = await Promise.all([
      this.prisma.shopStock.findMany({ where: { tenantId: user.tenantId, productId, variantId: { in: ids } }, select: { shopId: true, variantId: true, stock: true } }),
      this.prisma.saleItemVariant.findMany({
        where: { variantId: { in: ids }, saleItem: { sale: { tenantId: user.tenantId, status: { in: [...SOLD] }, createdAt: { gte: since }, ...scope.where } } },
        select: { variantId: true, saleItem: { select: { quantity: true, returnedQty: true } } },
      }),
      this.prisma.shop.findMany({ where: { tenantId: user.tenantId, isActive: true }, select: { id: true, name: true }, orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }] }),
    ]);
    const soldOf = new Map<string, number>();
    for (const s of sold) soldOf.set(s.variantId, (soldOf.get(s.variantId) ?? 0) + Number(s.saleItem.quantity) - Number(s.saleItem.returnedQty));
    const variants = product.variants.map((v) => {
      const rows = stocks.filter((s) => s.variantId === v.id);
      const here = scope.shopId ? rows.filter((s) => s.shopId === scope.shopId) : rows;
      const parts = variantParts(v);
      return {
        id: v.id, name: v.name, barcode: v.barcode, sku: v.sku, price: Number(v.price), isActive: v.isActive,
        size: parts.size, colorName: parts.color, colorHex: v.colorHex,
        lowStockAlert: Number(v.lowStockAlert ?? product.lowStockAlert ?? 0),
        stock: r2(here.reduce((s, r) => s + Number(r.stock), 0)),
        allStock: r2(rows.reduce((s, r) => s + Number(r.stock), 0)),
        byShop: shops.map((sh) => ({ shopId: sh.id, name: sh.name, stock: r2(rows.filter((r) => r.shopId === sh.id).reduce((s, r) => s + Number(r.stock), 0)) })),
        sold30: r2(soldOf.get(v.id) ?? 0),
      };
    });
    const sizes = [...new Set(variants.map((v) => v.size).filter((x): x is string => !!x))].sort(sizeSort);
    const colors = [...new Set(variants.map((v) => v.colorName).filter((x): x is string => !!x))];
    return { productId: product.id, name: product.name, sizes, colors, shops, variants };
  }

  /**
   * Size-wise reorder for the branch: active sizes at or below their
   * low-stock mark that sell (or have a mark), with a suggested quantity
   * for the next 30 days at the recent rate, grouped by article.
   */
  async reorder(user: AuthenticatedUser, scope: ShopScope, q: { limit?: string }) {
    const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
    const variants = await this.prisma.productVariant.findMany({
      where: { isActive: true, product: { tenantId: user.tenantId, isActive: true, hasVariants: true } },
      select: { id: true, name: true, size: true, color: true, lowStockAlert: true, productId: true, product: { select: { name: true, brand: { select: { name: true } } } } },
      take: 20000,
    });
    if (!variants.length) return { items: [], products: 0, pairs: 0 };
    const ids = variants.map((v) => v.id);
    const since = new Date(Date.now() - 30 * DAY_MS);
    const [stocks, sold] = await Promise.all([
      this.prisma.shopStock.groupBy({ by: ['variantId'], where: { tenantId: user.tenantId, variantId: { in: ids }, ...scope.where }, _sum: { stock: true } }),
      this.prisma.saleItemVariant.findMany({
        where: { variantId: { in: ids }, saleItem: { sale: { tenantId: user.tenantId, status: { in: [...SOLD] }, createdAt: { gte: since }, ...scope.where } } },
        select: { variantId: true, saleItem: { select: { quantity: true, returnedQty: true } } },
      }),
    ]);
    const stockOf = new Map(stocks.map((s) => [s.variantId, Number(s._sum.stock ?? 0)]));
    const soldOf = new Map<string, number>();
    for (const s of sold) soldOf.set(s.variantId, (soldOf.get(s.variantId) ?? 0) + Number(s.saleItem.quantity) - Number(s.saleItem.returnedQty));
    type Row = { variantId: string; name: string; size: string | null; colorName: string | null; stock: number; alert: number; sold30: number; suggest: number };
    const groups = new Map<string, { productId: string; name: string; brand: string | null; sizes: Row[]; sold30: number }>();
    for (const v of variants) {
      const stock = r2(stockOf.get(v.id) ?? 0);
      const alert = Number(v.lowStockAlert ?? 0);
      const sold30 = r2(soldOf.get(v.id) ?? 0);
      if (stock > alert || (alert <= 0 && sold30 <= 0)) continue;
      const parts = variantParts(v);
      const suggest = Math.max(Math.ceil(sold30 - stock), Math.ceil(alert - stock) + 1, 1);
      const g = groups.get(v.productId) ?? { productId: v.productId, name: v.product.name, brand: v.product.brand?.name ?? null, sizes: [], sold30: 0 };
      g.sizes.push({ variantId: v.id, name: v.name, size: parts.size, colorName: parts.color, stock, alert, sold30, suggest });
      g.sold30 = r2(g.sold30 + sold30);
      groups.set(v.productId, g);
    }
    const items = [...groups.values()]
      .map((g) => ({ ...g, sizes: g.sizes.sort((a, b) => sizeSort(a.size ?? a.name, b.size ?? b.name)) }))
      .sort((a, b) => b.sold30 - a.sold30 || a.name.localeCompare(b.name));
    return {
      items: items.slice(0, limit),
      products: items.length,
      pairs: items.reduce((s, g) => s + g.sizes.reduce((t, x) => t + x.suggest, 0), 0),
    };
  }

  /**
   * Older shoe brands become the shop's product brands (one list for the
   * editor, filters and reports), and products whose shoe details named a
   * brand get that brand when they have none. Safe to run again.
   */
  async syncBrands(user: AuthenticatedUser) {
    const old = await this.prisma.shoeBrand.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true, countryOfOrigin: true, logoUrl: true, websiteUrl: true, isActive: true, warrantyPolicy: true } });
    if (!old.length) return { brands: 0, products: 0 };
    return this.prisma.$transaction(async (tx) => {
      const core = await tx.brand.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } });
      const byName = new Map(core.map((b) => [b.name.trim().toLowerCase(), b.id]));
      let brands = 0;
      const coreOf = new Map<string, string>();
      for (const b of old) {
        let id = byName.get(b.name.trim().toLowerCase());
        if (!id) {
          id = (await tx.brand.create({
            data: {
              tenantId: user.tenantId, name: b.name.trim(), slug: await freeBrandSlug(tx, user.tenantId, b.name),
              countryOfOrigin: b.countryOfOrigin, logoUrl: b.logoUrl, website: b.websiteUrl, warrantyPolicy: b.warrantyPolicy, isActive: b.isActive,
            },
            select: { id: true },
          })).id;
          byName.set(b.name.trim().toLowerCase(), id);
          brands += 1;
        }
        coreOf.set(b.id, id);
      }
      const profiles = await tx.shoeProductProfile.findMany({ where: { tenantId: user.tenantId, brandId: { not: null } }, select: { productId: true, brandId: true } });
      let products = 0;
      for (const p of profiles) {
        const brandId = coreOf.get(p.brandId!);
        if (!brandId) continue;
        const r = await tx.product.updateMany({ where: { id: p.productId, tenantId: user.tenantId, brandId: null }, data: { brandId } });
        products += r.count;
      }
      return { brands, products };
    });
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.shoeProductProfile.findMany({ where: { tenantId: user.tenantId }, take: 1000 });
    const grouped: Record<string, number> = {};
    all.forEach((p) => {
      const key = p.categoryType || 'OTHER';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  }

  async byGender(user: AuthenticatedUser) {
    const grouped = await this.prisma.shoeProductProfile.groupBy({
      by: ['gender'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });
    return grouped;
  }
}
