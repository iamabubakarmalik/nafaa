import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertToyProductDto } from './dto/upsert-toy-product.dto';

/** Map a child's age in years to the matching ToyAgeGroup enum values */
export function ageGroupsForYears(years: number): string[] {
  const groups: string[] = ['ALL_AGES'];
  if (years < 0.5) groups.push('NEWBORN_0_6M');
  if (years >= 0.5 && years < 1) groups.push('INFANT_6_12M');
  if (years >= 1 && years < 2) groups.push('TODDLER_1_2Y');
  if (years >= 2 && years < 3) groups.push('TODDLER_2_3Y');
  if (years >= 3 && years < 5) groups.push('PRESCHOOL_3_5Y');
  if (years >= 5 && years < 8) groups.push('KIDS_5_8Y');
  if (years >= 8 && years < 12) groups.push('KIDS_8_12Y');
  if (years >= 12 && years < 14) groups.push('TWEEN_12_14Y');
  if (years >= 14) groups.push('TEEN_14_PLUS');
  return groups;
}

@Injectable()
export class ToyProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertToyProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.toyProductProfile.findUnique({ where: { productId: dto.productId } });
    const data: any = { ...dto, tenantId: user.tenantId };
    if (existing) return this.prisma.toyProductProfile.update({ where: { productId: dto.productId }, data });
    return this.prisma.toyProductProfile.create({ data });
  }

  async list(user: AuthenticatedUser, params: {
    categoryType?: string; ageGroup?: string; genderTarget?: string;
    brand?: string; franchise?: string;
    educational?: boolean; rc?: boolean; requiresBatteries?: boolean;
    montessori?: boolean; collectible?: boolean; multiplayer?: boolean;
    noChokingHazard?: boolean;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean; trending?: boolean;
    birthdayGift?: boolean; eidGift?: boolean;
    minPrice?: number; maxPrice?: number; search?: string;
  }) {
    const profiles = await this.prisma.toyProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.ageGroup && {
          OR: [{ ageGroup: params.ageGroup as any }, { ageGroups: { has: params.ageGroup as any } }, { ageGroup: 'ALL_AGES' }],
        }),
        ...(params.genderTarget && {
          OR: [{ genderTarget: params.genderTarget as any }, { genderTarget: 'UNISEX' }],
        }),
        ...(params.brand && { brand: { contains: params.brand, mode: 'insensitive' } }),
        ...(params.franchise && { characterFranchise: { contains: params.franchise, mode: 'insensitive' } }),
        ...(params.educational !== undefined && { isEducational: params.educational }),
        ...(params.rc !== undefined && { isRemoteControlled: params.rc }),
        ...(params.requiresBatteries !== undefined && { requiresBatteries: params.requiresBatteries }),
        ...(params.montessori !== undefined && { isMontessoriApproved: params.montessori }),
        ...(params.collectible !== undefined && { isCollectible: params.collectible }),
        ...(params.multiplayer !== undefined && { isMultiplayer: params.multiplayer }),
        ...(params.noChokingHazard && { chokingHazard: false }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.newArrival !== undefined && { isNewArrival: params.newArrival }),
        ...(params.trending !== undefined && { isTrending: params.trending }),
        ...(params.birthdayGift !== undefined && { isBirthdayGift: params.birthdayGift }),
        ...(params.eidGift !== undefined && { isEidGift: params.eidGift }),
        ...(params.minPrice || params.maxPrice ? {
          retailPrice: {
            ...(params.minPrice && { gte: params.minPrice }),
            ...(params.maxPrice && { lte: params.maxPrice }),
          },
        } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
      take: 400,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { sku: { contains: params.search, mode: 'insensitive' } },
            { barcode: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    return profiles.filter((p) => map.has(p.productId)).map((p) => ({ ...p, product: map.get(p.productId) }));
  }

  /** THE killer feature — age-appropriate & safety-filtered gift finder */
  async forAge(user: AuthenticatedUser, params: {
    years: number; gender?: string; maxBudget?: number; educationalOnly?: boolean; safeOnly?: boolean;
  }) {
    const groups = ageGroupsForYears(params.years);

    const profiles = await this.prisma.toyProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          { ageGroup: { in: groups as any } },
          { ageGroups: { hasSome: groups as any } },
          { AND: [{ ageMinYears: { lte: params.years } }, { ageMaxYears: { gte: params.years } }] },
        ],
        ...(params.gender && params.gender !== 'UNISEX'
          ? { OR2: undefined, genderTarget: { in: [params.gender as any, 'UNISEX'] } }
          : {}),
        ...(params.educationalOnly ? { isEducational: true } : {}),
        ...(params.safeOnly && params.years < 3 ? { chokingHazard: false, smallPartsWarning: false } : {}),
        ...(params.maxBudget ? { retailPrice: { lte: params.maxBudget } } : {}),
      },
      orderBy: [{ isBestSeller: 'desc' }, { totalSold: 'desc' }],
      take: 200,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, stock: { gt: 0 } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const map = new Map(products.map((p) => [p.id, p]));

    const results = profiles
      .filter((p) => map.has(p.productId))
      .map((p) => ({ ...p, product: map.get(p.productId) }));

    return {
      childAgeYears: params.years,
      matchedAgeGroups: groups,
      safetyFilterApplied: !!(params.safeOnly && params.years < 3),
      count: results.length,
      items: results,
    };
  }

  /** Products that carry an age-safety warning — for compliance checks */
  async safetyReview(user: AuthenticatedUser) {
    const risky = await this.prisma.toyProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          { chokingHazard: true },
          { smallPartsWarning: true },
          { isNonToxic: false },
          { safetyCertifications: { isEmpty: true } },
        ],
      },
      take: 200,
    });

    const productIds = risky.map((p) => p.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    const map = new Map(products.map((p) => [p.id, p]));

    return risky.map((p) => ({
      ...p,
      product: map.get(p.productId),
      riskFlags: [
        p.chokingHazard ? 'CHOKING_HAZARD' : null,
        p.smallPartsWarning ? 'SMALL_PARTS' : null,
        !p.isNonToxic ? 'NOT_CERTIFIED_NON_TOXIC' : null,
        (p.safetyCertifications ?? []).length === 0 ? 'NO_SAFETY_CERTIFICATION' : null,
      ].filter(Boolean),
    }));
  }

  /** Toys needing batteries but not including them — upsell opportunity */
  async batteryUpsell(user: AuthenticatedUser) {
    const profiles = await this.prisma.toyProductProfile.findMany({
      where: { tenantId: user.tenantId, requiresBatteries: true, batteriesIncluded: false },
      take: 200,
    });
    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    return profiles.map((p) => ({ ...p, product: map.get(p.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.toyProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.toyProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return p;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.toyProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.toyProductProfile.delete({ where: { id } });
  }

  async counts(user: AuthenticatedUser) {
    const all = await this.prisma.toyProductProfile.findMany({ where: { tenantId: user.tenantId }, take: 1000 });
    const byCategory: Record<string, number> = {};
    const byAgeGroup: Record<string, number> = {};
    const byGender: Record<string, number> = {};
    all.forEach((p) => {
      byCategory[p.categoryType || 'OTHER'] = (byCategory[p.categoryType || 'OTHER'] || 0) + 1;
      byAgeGroup[p.ageGroup] = (byAgeGroup[p.ageGroup] || 0) + 1;
      byGender[p.genderTarget] = (byGender[p.genderTarget] || 0) + 1;
    });
    return { byCategory, byAgeGroup, byGender, total: all.length };
  }

  async brands(user: AuthenticatedUser) {
    const [brands, franchises] = await Promise.all([
      this.prisma.toyProductProfile.groupBy({
        by: ['brand'],
        where: { tenantId: user.tenantId, brand: { not: null } },
        _count: { _all: true }, _sum: { totalRevenue: true },
      }),
      this.prisma.toyProductProfile.groupBy({
        by: ['characterFranchise'],
        where: { tenantId: user.tenantId, characterFranchise: { not: null } },
        _count: { _all: true }, _sum: { totalRevenue: true },
      }),
    ]);

    return {
      brands: brands.map((b) => ({ name: b.brand, count: b._count._all, revenue: b._sum.totalRevenue ?? 0 }))
        .sort((a, b) => b.revenue - a.revenue),
      franchises: franchises.map((f) => ({ name: f.characterFranchise, count: f._count._all, revenue: f._sum.totalRevenue ?? 0 }))
        .sort((a, b) => b.revenue - a.revenue),
    };
  }
}
