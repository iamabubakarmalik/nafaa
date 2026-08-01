import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertElectronicsProductDto } from './dto/upsert-electronics-product.dto';

@Injectable()
export class ElectronicsProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertElectronicsProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.electronicsProductProfile.findUnique({ where: { productId: dto.productId } });
    if (existing) {
      return this.prisma.electronicsProductProfile.update({
        where: { productId: dto.productId },
        data: { ...dto, tenantId: user.tenantId },
      });
    }
    return this.prisma.electronicsProductProfile.create({ data: { ...dto, tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: {
    brandId?: string;
    categoryType?: string;
    conditionType?: string;
    featured?: boolean;
    bestSeller?: boolean;
    newArrival?: boolean;
    trending?: boolean;
    search?: string;
  }) {
    const profiles = await this.prisma.electronicsProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.brandId && { brandId: params.brandId }),
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.conditionType && { conditionType: params.conditionType as any }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.newArrival !== undefined && { isNewArrival: params.newArrival }),
        ...(params.trending !== undefined && { isTrending: params.trending }),
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
      this.prisma.electronicsBrand.findMany({ where: { id: { in: brandIds } } }),
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
    const profile = await this.prisma.electronicsProductProfile.findFirst({
      where: { productId, tenantId: user.tenantId },
    });
    if (!profile) return null;
    const brand = profile.brandId ? await this.prisma.electronicsBrand.findUnique({ where: { id: profile.brandId } }) : null;
    const serialCount = await this.prisma.electronicsSerialTracking.count({
      where: { tenantId: user.tenantId, productId, status: 'IN_STOCK' },
    });
    return { ...profile, brand, availableSerials: serialCount };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.electronicsProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.byProduct(user, p.productId);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.electronicsProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.electronicsProductProfile.delete({ where: { id } });
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.electronicsProductProfile.findMany({ where: { tenantId: user.tenantId }, take: 500 });
    const grouped: Record<string, number> = {};
    all.forEach((p) => {
      const key = p.categoryType || 'OTHER';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  }
}
