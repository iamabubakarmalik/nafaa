import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertFurnitureProductDto } from './dto/upsert-furniture-product.dto';

@Injectable()
export class FurnitureProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertFurnitureProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.furnitureProductProfile.findUnique({ where: { productId: dto.productId } });
    const data: any = { ...dto, tenantId: user.tenantId };
    if (existing) return this.prisma.furnitureProductProfile.update({ where: { productId: dto.productId }, data });
    return this.prisma.furnitureProductProfile.create({ data });
  }

  async list(user: AuthenticatedUser, params: {
    categoryType?: string; conditionType?: string; primaryMaterial?: string;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean;
    customizable?: boolean; ecoFriendly?: boolean;
    minPrice?: number; maxPrice?: number;
    search?: string;
  }) {
    const profiles = await this.prisma.furnitureProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.conditionType && { conditionType: params.conditionType as any }),
        ...(params.primaryMaterial && { primaryMaterial: params.primaryMaterial as any }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.newArrival !== undefined && { isNewArrival: params.newArrival }),
        ...(params.customizable !== undefined && { isCustomizable: params.customizable }),
        ...(params.ecoFriendly !== undefined && { isEcoFriendly: params.ecoFriendly }),
        ...(params.minPrice || params.maxPrice ? {
          retailPrice: {
            ...(params.minPrice && { gte: params.minPrice }),
            ...(params.maxPrice && { lte: params.maxPrice }),
          },
        } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
      take: 300,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { sku: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    return profiles.filter((p) => map.has(p.productId)).map((p) => ({ ...p, product: map.get(p.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.furnitureProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.furnitureProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return p;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.furnitureProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.furnitureProductProfile.delete({ where: { id } });
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.furnitureProductProfile.findMany({ where: { tenantId: user.tenantId }, take: 500 });
    const grouped: Record<string, number> = {};
    all.forEach((p) => {
      const key = p.categoryType || 'OTHER';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  }

  async showroomLayout(user: AuthenticatedUser) {
    const all = await this.prisma.furnitureProductProfile.findMany({
      where: { tenantId: user.tenantId, showroomLocation: { not: null } },
    });
    const layout: Record<string, any[]> = {};
    all.forEach((p) => {
      const key = `${p.showroomLocation}${p.showroomFloor ? ' - ' + p.showroomFloor : ''}`;
      if (!layout[key]) layout[key] = [];
      layout[key].push(p);
    });
    return layout;
  }
}
