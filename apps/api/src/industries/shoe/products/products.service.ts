import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertShoeProductDto } from './dto/upsert-product.dto';

@Injectable()
export class ShoeProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertShoeProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

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
