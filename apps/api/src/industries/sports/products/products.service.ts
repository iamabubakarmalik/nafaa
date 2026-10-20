/**
 * Sports details of products (sport, type, age group, bat / ball / apparel
 * specs, team rate, MRP) on top of the core product. Stock and sizes live
 * on the core product and variants.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { addVariantOpeningStock, OpeningStockDto, splitLegacyVariantStock } from '../common/opening-stock.helper';
import { freeBrandSlug } from '../../shoe/common/shoe-common';
import { UpsertSportsProductDto } from './dto/upsert-sports-product.dto';

@Injectable()
export class SportsProductsService {
  constructor(private readonly prisma: PrismaService) {}

  openingStock(user: AuthenticatedUser, productId: string, dto: OpeningStockDto, activeShopId?: string | null) {
    return this.prisma.$transaction((tx) => addVariantOpeningStock(tx, user, productId, dto.items, activeShopId));
  }

  splitVariantStock(user: AuthenticatedUser, productId: string, activeShopId?: string | null) {
    return this.prisma.$transaction((tx) => splitLegacyVariantStock(tx, user, productId, activeShopId));
  }

  async upsert(user: AuthenticatedUser, dto: UpsertSportsProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (dto.brandId && !(await this.prisma.sportsBrand.count({ where: { id: dto.brandId, tenantId: user.tenantId } }))) {
      throw new BadRequestException('Brand is dukaan ka nahi');
    }
    for (const k of ['mrp', 'costPrice', 'wholesalePrice', 'retailPrice', 'teamPrice', 'bulkDiscountPct', 'warrantyMonths', 'minTeamOrder'] as const) {
      if (dto[k] != null && Number(dto[k]) < 0) throw new BadRequestException('Rate, discount ya warranty manfi nahi ho sakti');
    }
    if (dto.bulkDiscountPct != null && dto.bulkDiscountPct > 100) throw new BadRequestException('Team discount 100% se zyada nahi');

    const existing = await this.prisma.sportsProductProfile.findUnique({
      where: { productId: dto.productId },
    });

    const data: any = { ...dto, tenantId: user.tenantId };

    if (existing) {
      return this.prisma.sportsProductProfile.update({
        where: { productId: dto.productId },
        data,
      });
    }
    return this.prisma.sportsProductProfile.create({ data });
  }

  async list(user: AuthenticatedUser, params: {
    brandId?: string;
    categoryType?: string;
    sport?: string;
    ageGroup?: string;
    genderTarget?: string;
    featured?: boolean;
    bestSeller?: boolean;
    newArrival?: boolean;
    professional?: boolean;
    teamOrderable?: boolean;
    search?: string;
  }) {
    const profiles = await this.prisma.sportsProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.brandId && { brandId: params.brandId }),
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.sport && { sport: params.sport }),
        ...(params.ageGroup && { ageGroup: params.ageGroup as any }),
        ...(params.genderTarget && { genderTarget: params.genderTarget as any }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.newArrival !== undefined && { isNewArrival: params.newArrival }),
        ...(params.professional !== undefined && { isProfessional: params.professional }),
        ...(params.teamOrderable !== undefined && { isTeamOrderable: params.teamOrderable }),
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
      this.prisma.sportsBrand.findMany({ where: { id: { in: brandIds } } }),
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
    const profile = await this.prisma.sportsProductProfile.findFirst({
      where: { productId, tenantId: user.tenantId },
    });
    if (!profile) return null;
    const brand = profile.brandId
      ? await this.prisma.sportsBrand.findUnique({ where: { id: profile.brandId } })
      : null;
    return { ...profile, brand };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.sportsProductProfile.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Profile not found');
    return this.byProduct(user, p.productId);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.sportsProductProfile.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.sportsProductProfile.delete({ where: { id } });
  }

  /** Sports facts of every product in one small answer, for the POS and the products page. */
  async meta(user: AuthenticatedUser) {
    const items = await this.prisma.sportsProductProfile.findMany({
      where: { tenantId: user.tenantId },
      select: {
        productId: true, categoryType: true, sport: true, ageGroup: true, genderTarget: true, size: true, color: true,
        isTeamOrderable: true, minTeamOrder: true, teamPrice: true, bulkDiscountPct: true, hasCustomization: true, mrp: true,
        isNewArrival: true, isBestSeller: true, isProfessional: true, warrantyMonths: true,
      },
    });
    return { items };
  }

  /**
   * Older sports brands become the shop's product brands, and products
   * whose sports details named a brand get it when they have none. Safe to run again.
   */
  async syncBrands(user: AuthenticatedUser) {
    const old = await this.prisma.sportsBrand.findMany({ where: { tenantId: user.tenantId } });
    if (!old.length) return { brands: 0, products: 0 };
    return this.prisma.$transaction(async (tx) => {
      const core = await tx.brand.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } });
      const byName = new Map(core.map((b) => [b.name.trim().toLowerCase(), b.id]));
      const coreOf = new Map<string, string>();
      let brands = 0;
      for (const b of old) {
        let id = byName.get(b.name.trim().toLowerCase());
        if (!id) {
          id = (await tx.brand.create({
            data: {
              tenantId: user.tenantId, name: b.name.trim(), slug: await freeBrandSlug(tx, user.tenantId, b.name), isActive: b.isActive,
              description: b.description, logoUrl: b.logoUrl, website: b.websiteUrl, countryOfOrigin: b.countryOfOrigin,
              authorizedDealer: b.authorizedDealer, dealerCode: b.dealerCode, supportPhone: b.supportPhone, supportEmail: b.supportEmail,
              warrantyPolicy: b.warrantyPolicy, isFeatured: b.isFeatured,
            },
            select: { id: true },
          })).id;
          byName.set(b.name.trim().toLowerCase(), id);
          brands += 1;
        }
        coreOf.set(b.id, id);
      }
      const profiles = await tx.sportsProductProfile.findMany({ where: { tenantId: user.tenantId, brandId: { not: null } }, select: { productId: true, brandId: true } });
      let products = 0;
      for (const p of profiles) {
        const brandId = coreOf.get(p.brandId!);
        if (!brandId) continue;
        products += (await tx.product.updateMany({ where: { id: p.productId, tenantId: user.tenantId, brandId: null }, data: { brandId } })).count;
      }
      return { brands, products };
    });
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.sportsProductProfile.findMany({
      where: { tenantId: user.tenantId },
      take: 1000,
    });
    const grouped: Record<string, number> = {};
    all.forEach((p) => {
      const key = p.categoryType || 'OTHER';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  }

  async bySport(user: AuthenticatedUser) {
    const all = await this.prisma.sportsProductProfile.findMany({
      where: { tenantId: user.tenantId, sport: { not: null } },
      take: 1000,
    });
    const grouped: Record<string, number> = {};
    all.forEach((p) => {
      const key = p.sport || 'OTHER';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  }

  async teamOrderable(user: AuthenticatedUser) {
    return this.prisma.sportsProductProfile.findMany({
      where: { tenantId: user.tenantId, isTeamOrderable: true },
      take: 200,
    });
  }
}
