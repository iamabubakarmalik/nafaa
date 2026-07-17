import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertDairyProductDto } from './dto/upsert-dairy-product.dto';

@Injectable()
export class DairyProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertDairyProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.dairyProduct.findUnique({ where: { productId: dto.productId } });
    const data: any = { ...dto, tenantId: user.tenantId };
    if (dto.productionDate) data.productionDate = new Date(dto.productionDate);

    if (existing) return this.prisma.dairyProduct.update({ where: { productId: dto.productId }, data });
    return this.prisma.dairyProduct.create({ data });
  }

  async list(user: AuthenticatedUser, params: { productType?: string; quality?: string; featured?: boolean; bestSeller?: boolean; morning?: boolean; evening?: boolean; search?: string }) {
    const profiles = await this.prisma.dairyProduct.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.productType && { productType: params.productType as any }),
        ...(params.quality && { quality: params.quality as any }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.morning && { availableMorning: true }),
        ...(params.evening && { availableEvening: true }),
      },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { updatedAt: 'desc' }],
      take: 200,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    return profiles
      .filter((p) => productsMap.has(p.productId))
      .map((p) => ({ ...p, product: productsMap.get(p.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.dairyProduct.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.dairyProduct.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    const product = await this.prisma.product.findUnique({ where: { id: p.productId }, include: { images: true, category: true } });
    return { ...p, product };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.dairyProduct.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.dairyProduct.delete({ where: { id } });
  }
}
