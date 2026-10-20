import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { cleanInput } from '../bookstore-common';

@Injectable()
export class StationeryProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: any) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Item nahi mila');

    const existing = await this.prisma.stationeryProfile.findUnique({ where: { productId: dto.productId } });
    if (existing) {
      return this.prisma.stationeryProfile.update({
        where: { productId: dto.productId },
        data: { ...cleanInput(dto), tenantId: user.tenantId },
      });
    }
    return this.prisma.stationeryProfile.create({
      data: { ...cleanInput(dto), tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: any) {
    const profiles = await this.prisma.stationeryProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category }),
        ...(params.brand && { brand: params.brand }),
        ...(params.color && { color: params.color }),
        ...(params.isSchoolItem !== undefined && { isSchoolItem: params.isSchoolItem }),
        ...(params.isOfficeItem !== undefined && { isOfficeItem: params.isOfficeItem }),
        ...(params.isFastMoving !== undefined && { isFastMoving: params.isFastMoving }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: productIds },
        isActive: true,
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    return profiles.filter((p) => productMap.has(p.productId)).map((p) => ({ ...p, product: productMap.get(p.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.stationeryProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  /** Hides the product (nothing is erased; it can be switched back on). */
  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.stationeryProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Stationery ki tafseel nahi mili');
    // The profile is kept with its product; removing it hides the product instead.
    await this.prisma.product.updateMany({ where: { id: p.productId, tenantId: user.tenantId }, data: { isActive: false } });
    return p;
  }
}
