import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertSportsProductDto } from './dto/upsert-sports-product.dto';

@Injectable()
export class SportsProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertSportsProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

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
