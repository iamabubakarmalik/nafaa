import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertOpticalProductDto } from './dto/upsert-optical-product.dto';

@Injectable()
export class OpticalProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertOpticalProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.opticalProductProfile.findUnique({ where: { productId: dto.productId } });
    const data: any = { ...dto, tenantId: user.tenantId };
    if (existing) return this.prisma.opticalProductProfile.update({ where: { productId: dto.productId }, data });
    return this.prisma.opticalProductProfile.create({ data });
  }

  async list(user: AuthenticatedUser, params: {
    categoryType?: string; frameShape?: string; frameMaterial?: string; gender?: string;
    brand?: string; contactLensOnly?: boolean;
    blueCut?: boolean; polarized?: boolean; photochromic?: boolean; progressive?: boolean;
    featured?: boolean; bestSeller?: boolean; newArrival?: boolean; designer?: boolean;
    minPrice?: number; maxPrice?: number;
    search?: string;
  }) {
    const profiles = await this.prisma.opticalProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.frameShape && { frameShape: params.frameShape as any }),
        ...(params.frameMaterial && { frameMaterial: params.frameMaterial as any }),
        ...(params.gender && { gender: params.gender as any }),
        ...(params.brand && { brand: { contains: params.brand, mode: 'insensitive' } }),
        ...(params.contactLensOnly !== undefined && { isContactLens: params.contactLensOnly }),
        ...(params.blueCut !== undefined && { hasBlueCut: params.blueCut }),
        ...(params.polarized !== undefined && { isPolarized: params.polarized }),
        ...(params.photochromic !== undefined && { isPhotochromic: params.photochromic }),
        ...(params.progressive !== undefined && { supportsProgressive: params.progressive }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.newArrival !== undefined && { isNewArrival: params.newArrival }),
        ...(params.designer !== undefined && { isDesigner: params.designer }),
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

  /**
   * Smart matching: given a prescription's SPH/CYL, return only lenses/frames
   * that can actually be made for this power.
   */
  async matchPrescription(user: AuthenticatedUser, params: {
    sph: number; cyl?: number; needsProgressive?: boolean; contactLens?: boolean;
  }) {
    const cyl = Math.abs(params.cyl ?? 0);
    const profiles = await this.prisma.opticalProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.contactLens !== undefined && { isContactLens: params.contactLens }),
        ...(params.needsProgressive ? { supportsProgressive: true } : {}),
        OR: [
          { supportsMinSph: null },
          {
            AND: [
              { supportsMinSph: { lte: params.sph } },
              { supportsMaxSph: { gte: params.sph } },
            ],
          },
        ],
      },
      take: 200,
    });

    const compatible = profiles.filter((p) => {
      if (p.supportsMaxCyl == null) return true;
      return cyl <= Math.abs(p.supportsMaxCyl);
    });

    const productIds = compatible.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const map = new Map(products.map((p) => [p.id, p]));

    return compatible
      .filter((p) => map.has(p.productId))
      .map((p) => ({ ...p, product: map.get(p.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.opticalProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.opticalProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return p;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.opticalProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.opticalProductProfile.delete({ where: { id } });
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.opticalProductProfile.findMany({ where: { tenantId: user.tenantId }, take: 800 });
    const grouped: Record<string, number> = {};
    all.forEach((p) => {
      const key = p.categoryType || 'OTHER';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  }

  async brands(user: AuthenticatedUser) {
    const rows = await this.prisma.opticalProductProfile.groupBy({
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
