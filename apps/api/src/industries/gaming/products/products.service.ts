import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertGamingProductDto } from './dto/upsert-gaming-product.dto';

@Injectable()
export class GamingProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertGamingProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.gamingProductProfile.findUnique({ where: { productId: dto.productId } });
    const data: any = {
      ...dto,
      tenantId: user.tenantId,
      releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
      preOrderReleaseDate: dto.preOrderReleaseDate ? new Date(dto.preOrderReleaseDate) : undefined,
    };

    if (existing) return this.prisma.gamingProductProfile.update({ where: { productId: dto.productId }, data });
    return this.prisma.gamingProductProfile.create({ data });
  }

  async list(user: AuthenticatedUser, params: {
    categoryType?: string; platform?: string; conditionType?: string;
    featured?: boolean; bestSeller?: boolean; newRelease?: boolean; preOrder?: boolean; rentable?: boolean;
    search?: string;
  }) {
    const profiles = await this.prisma.gamingProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.platform && { platform: params.platform as any }),
        ...(params.conditionType && { conditionType: params.conditionType as any }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.newRelease !== undefined && { isNewRelease: params.newRelease }),
        ...(params.preOrder !== undefined && { isPreOrder: params.preOrder }),
        ...(params.rentable !== undefined && { isRentable: params.rentable }),
      },
      orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
      take: 300,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    return profiles.filter((p) => productsMap.has(p.productId)).map((p) => ({ ...p, product: productsMap.get(p.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.gamingProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.gamingProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return p;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.gamingProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.gamingProductProfile.delete({ where: { id } });
  }
}
