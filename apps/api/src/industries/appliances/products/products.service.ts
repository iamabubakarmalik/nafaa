import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertApplianceProductDto } from './dto/upsert-product.dto';

@Injectable()
export class ApplianceProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertApplianceProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.applianceProductProfile.findUnique({ where: { productId: dto.productId } });
    if (existing) {
      return this.prisma.applianceProductProfile.update({ where: { productId: dto.productId }, data: { ...dto, tenantId: user.tenantId } });
    }
    return this.prisma.applianceProductProfile.create({ data: { ...dto, tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: {
    brandId?: string; categoryType?: string; energyRating?: string;
    requiresInstallation?: boolean; featured?: boolean; bestSeller?: boolean; newArrival?: boolean;
    isInverter?: boolean; search?: string;
  }) {
    const profiles = await this.prisma.applianceProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.brandId && { brandId: params.brandId }),
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.energyRating && { energyRating: params.energyRating as any }),
        ...(params.requiresInstallation !== undefined && { requiresInstallation: params.requiresInstallation }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.newArrival !== undefined && { isNewArrival: params.newArrival }),
        ...(params.isInverter !== undefined && { isInverter: params.isInverter }),
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
      this.prisma.applianceBrand.findMany({ where: { id: { in: brandIds } } }),
    ]);

    const productsMap = new Map(products.map((p) => [p.id, p]));
    const brandsMap = new Map(brands.map((b) => [b.id, b]));

    return profiles.filter((p) => productsMap.has(p.productId)).map((p) => ({
      ...p,
      product: productsMap.get(p.productId),
      brand: p.brandId ? brandsMap.get(p.brandId) : null,
    }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    const profile = await this.prisma.applianceProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
    if (!profile) return null;
    const brand = profile.brandId ? await this.prisma.applianceBrand.findUnique({ where: { id: profile.brandId } }) : null;
    return { ...profile, brand };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.applianceProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.byProduct(user, p.productId);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.applianceProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.applianceProductProfile.delete({ where: { id } });
  }
}
