import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertMeatProductDto } from './dto/upsert-meat-product.dto';

@Injectable()
export class MeatProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertMeatProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const payload: any = {
      ...dto,
      halalCertExpiry: dto.halalCertExpiry ? new Date(dto.halalCertExpiry) : null,
    };

    const existing = await this.prisma.meatProductProfile.findUnique({ where: { productId: dto.productId } });
    if (existing) {
      return this.prisma.meatProductProfile.update({
        where: { productId: dto.productId },
        data: payload,
      });
    }
    return this.prisma.meatProductProfile.create({
      data: { ...payload, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: { animalType?: string; cutCategory?: string; freshnessType?: string; featured?: boolean; popular?: boolean; onSale?: boolean; search?: string }) {
    const profiles = await this.prisma.meatProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.animalType && { animalType: params.animalType as any }),
        ...(params.cutCategory && { cutCategory: params.cutCategory as any }),
        ...(params.freshnessType && { freshnessType: params.freshnessType as any }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.popular !== undefined && { isPopular: params.popular }),
        ...(params.onSale !== undefined && { isOnSale: params.onSale }),
      },
      orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
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

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.meatProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.meatProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    const product = await this.prisma.product.findUnique({
      where: { id: p.productId },
      include: { images: true, category: true },
    });
    return { ...p, product };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.meatProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.meatProductProfile.delete({ where: { id } });
  }
}
