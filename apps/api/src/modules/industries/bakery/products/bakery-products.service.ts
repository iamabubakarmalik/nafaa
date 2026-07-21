import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertBakeryProductDto } from './dto/upsert-bakery-product.dto';

@Injectable()
export class BakeryProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertBakeryProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.bakeryProductProfile.findUnique({ where: { productId: dto.productId } });
    if (existing) {
      return this.prisma.bakeryProductProfile.update({ where: { productId: dto.productId }, data: dto });
    }
    return this.prisma.bakeryProductProfile.create({ data: { ...dto, tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: { category?: string; featured?: boolean; popular?: boolean; bestSeller?: boolean; newArrival?: boolean; seasonal?: boolean; eggless?: boolean; vegan?: boolean; sugarFree?: boolean; search?: string }) {
    const profiles = await this.prisma.bakeryProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category as any }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.popular !== undefined && { isPopular: params.popular }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.newArrival !== undefined && { isNewArrival: params.newArrival }),
        ...(params.seasonal !== undefined && { isSeasonalItem: params.seasonal }),
        ...(params.eggless !== undefined && { isEggless: params.eggless }),
        ...(params.vegan !== undefined && { isVegan: params.vegan }),
        ...(params.sugarFree !== undefined && { isSugarFree: params.sugarFree }),
      },
      orderBy: [{ isFeatured: 'desc' }, { isBestSeller: 'desc' }, { updatedAt: 'desc' }],
      take: 300,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: true,
      },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    return profiles
      .filter((p) => productsMap.has(p.productId))
      .map((p) => ({ ...p, product: productsMap.get(p.productId) }));
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.bakeryProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { updatedAt: 'desc' },
    });
    const grouped: Record<string, any[]> = {};
    all.forEach((p) => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    return grouped;
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.bakeryProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.bakeryProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    const product = await this.prisma.product.findUnique({
      where: { id: p.productId },
      include: { images: true, category: true },
    });
    return { ...p, product };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.bakeryProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.bakeryProductProfile.delete({ where: { id } });
  }
}
