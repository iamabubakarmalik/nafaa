import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertPetProductDto } from './dto/upsert-pet-product.dto';

@Injectable()
export class PetProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertPetProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const data: any = {
      ...dto,
      tenantId: user.tenantId,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
    };

    const existing = await this.prisma.petProductProfile.findUnique({ where: { productId: dto.productId } });
    if (existing) return this.prisma.petProductProfile.update({ where: { productId: dto.productId }, data });
    return this.prisma.petProductProfile.create({ data });
  }

  async list(user: AuthenticatedUser, params: {
    categoryType?: string; species?: string; lifeStage?: string; brand?: string;
    grainFree?: boolean; organic?: boolean; hypoallergenic?: boolean; prescriptionOnly?: boolean;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean; onSale?: boolean;
    minPrice?: number; maxPrice?: number; search?: string;
  }) {
    const profiles = await this.prisma.petProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.species && { species: params.species as any }),
        ...(params.lifeStage && { lifeStage: params.lifeStage as any }),
        ...(params.brand && { brand: { contains: params.brand, mode: 'insensitive' } }),
        ...(params.grainFree !== undefined && { isGrainFree: params.grainFree }),
        ...(params.organic !== undefined && { isOrganic: params.organic }),
        ...(params.hypoallergenic !== undefined && { isHypoallergenic: params.hypoallergenic }),
        ...(params.prescriptionOnly !== undefined && { isPrescriptionOnly: params.prescriptionOnly }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.newArrival !== undefined && { isNewArrival: params.newArrival }),
        ...(params.onSale !== undefined && { isOnSale: params.onSale }),
        ...(params.minPrice || params.maxPrice ? {
          retailPrice: {
            ...(params.minPrice && { gte: params.minPrice }),
            ...(params.maxPrice && { lte: params.maxPrice }),
          },
        } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
      take: 400,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { sku: { contains: params.search, mode: 'insensitive' } },
            { barcode: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    return profiles.filter((p) => map.has(p.productId)).map((p) => ({ ...p, product: map.get(p.productId) }));
  }

  /** Everything suitable for one pet: species + life stage */
  async forPet(user: AuthenticatedUser, species: string, lifeStage?: string) {
    const profiles = await this.prisma.petProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        species: species as any,
        ...(lifeStage ? { OR: [{ lifeStage: lifeStage as any }, { lifeStage: 'ALL_STAGES' }] } : {}),
      },
      orderBy: [{ isBestSeller: 'desc' }, { totalSold: 'desc' }],
      take: 200,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    return profiles.filter((p) => map.has(p.productId)).map((p) => ({ ...p, product: map.get(p.productId) }));
  }

  /** Medicines / food expiring soon (vet store safety) */
  async expiringSoon(user: AuthenticatedUser, days = 90) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const profiles = await this.prisma.petProductProfile.findMany({
      where: { tenantId: user.tenantId, expiryDate: { gte: now, lte: future } },
      orderBy: { expiryDate: 'asc' },
      take: 200,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const map = new Map(products.map((p) => [p.id, p]));

    return profiles.map((p) => {
      const daysLeft = p.expiryDate ? Math.ceil((new Date(p.expiryDate).getTime() - now.getTime()) / 86400000) : null;
      return { ...p, product: map.get(p.productId), daysLeft };
    });
  }

  async expired(user: AuthenticatedUser) {
    const profiles = await this.prisma.petProductProfile.findMany({
      where: { tenantId: user.tenantId, expiryDate: { lt: new Date() } },
      orderBy: { expiryDate: 'asc' },
      take: 200,
    });
    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    const map = new Map(products.map((p) => [p.id, p]));
    return profiles.map((p) => ({ ...p, product: map.get(p.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.petProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.petProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return p;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.petProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.petProductProfile.delete({ where: { id } });
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.petProductProfile.findMany({ where: { tenantId: user.tenantId }, take: 800 });
    const byCat: Record<string, number> = {};
    const bySpecies: Record<string, number> = {};
    all.forEach((p) => {
      const c = p.categoryType || 'OTHER';
      byCat[c] = (byCat[c] || 0) + 1;
      const s = p.species || 'OTHER';
      bySpecies[s] = (bySpecies[s] || 0) + 1;
    });
    return { byCategory: byCat, bySpecies };
  }

  async brands(user: AuthenticatedUser) {
    const rows = await this.prisma.petProductProfile.groupBy({
      by: ['brand'],
      where: { tenantId: user.tenantId, brand: { not: null } },
      _count: { _all: true },
      _sum: { totalRevenue: true },
    });
    return rows
      .map((r) => ({ brand: r.brand, count: r._count._all, revenue: r._sum.totalRevenue ?? 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }
}
