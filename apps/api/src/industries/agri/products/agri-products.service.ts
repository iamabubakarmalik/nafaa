import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertAgriProductDto } from './dto/upsert-agri-product.dto';

@Injectable()
export class AgriProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertAgriProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const payload: any = {
      ...dto,
      govtRegExpiry: dto.govtRegExpiry ? new Date(dto.govtRegExpiry) : null,
    };

    const existing = await this.prisma.agriProductProfile.findUnique({ where: { productId: dto.productId } });
    if (existing) {
      return this.prisma.agriProductProfile.update({
        where: { productId: dto.productId },
        data: payload,
      });
    }
    return this.prisma.agriProductProfile.create({
      data: { ...payload, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: {
    category?: string;
    seedType?: string;
    fertilizerType?: string;
    feedType?: string;
    season?: string;
    isOrganic?: boolean;
    featured?: boolean;
    seasonal?: boolean;
    search?: string;
  }) {
    const profiles = await this.prisma.agriProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category as any }),
        ...(params.seedType && { seedType: params.seedType as any }),
        ...(params.fertilizerType && { fertilizerType: params.fertilizerType as any }),
        ...(params.feedType && { feedType: params.feedType as any }),
        ...(params.season && { season: params.season as any }),
        ...(params.isOrganic !== undefined && { isOrganic: params.isOrganic }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.seasonal !== undefined && { isSeasonal: params.seasonal }),
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
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    return profiles
      .filter((p) => productsMap.has(p.productId))
      .map((p) => ({ ...p, product: productsMap.get(p.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.agriProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.agriProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    const product = await this.prisma.product.findUnique({
      where: { id: p.productId },
      include: { images: true, category: true },
    });
    return { ...p, product };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.agriProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.agriProductProfile.delete({ where: { id } });
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.agriProductProfile.findMany({
      where: { tenantId: user.tenantId },
    });
    const productIds = all.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    const grouped: Record<string, any[]> = {};
    all.forEach((p) => {
      const cat = p.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ ...p, product: productsMap.get(p.productId) });
    });
    return grouped;
  }

  async expiringCerts(user: AuthenticatedUser, daysAhead = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return this.prisma.agriProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        govtRegExpiry: { gte: new Date(), lte: cutoff },
      },
      orderBy: { govtRegExpiry: 'asc' },
    });
  }
}
