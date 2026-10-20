import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertFloristProductDto } from './dto/upsert-product.dto';
import { addDaysTz, parseDay } from '../florist-common';
import { endOfDayTz } from '../../../common/helpers/business-time.helper';

@Injectable()
export class FloristProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertFloristProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.floristProductProfile.findUnique({
      where: { productId: dto.productId },
    });

    const data: any = { ...dto, tenantId: user.tenantId };
    if (dto.arrivalDate) data.arrivalDate = parseDay(dto.arrivalDate);
    if (dto.freshUntil) data.freshUntil = parseDay(dto.freshUntil);
    // Fresh-until follows the arrival day and shelf life when not given.
    const days = dto.daysToWither ?? existing?.daysToWither;
    if (data.arrivalDate && !dto.freshUntil && days && days > 0) data.freshUntil = endOfDayTz(addDaysTz(data.arrivalDate, days - 1));

    if (existing) {
      return this.prisma.floristProductProfile.update({
        where: { productId: dto.productId },
        data,
      });
    }
    return this.prisma.floristProductProfile.create({ data });
  }

  async list(user: AuthenticatedUser, params: {
    categoryType?: string;
    freshnessGrade?: string;
    flowerType?: string;
    color?: string;
    occasion?: string;
    isImported?: boolean;
    isPreArranged?: boolean;
    isCustomizable?: boolean;
    featured?: boolean;
    bestSeller?: boolean;
    seasonalSpecial?: boolean;
    search?: string;
  }) {
    const profiles = await this.prisma.floristProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.freshnessGrade && { freshnessGrade: params.freshnessGrade as any }),
        ...(params.flowerType && { flowerType: params.flowerType }),
        ...(params.color && { color: params.color }),
        ...(params.occasion && { occasions: { has: params.occasion } }),
        ...(params.isImported !== undefined && { isImported: params.isImported }),
        ...(params.isPreArranged !== undefined && { isPreArranged: params.isPreArranged }),
        ...(params.isCustomizable !== undefined && { isCustomizable: params.isCustomizable }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.seasonalSpecial !== undefined && { isSeasonalSpecial: params.seasonalSpecial }),
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

    return profiles
      .filter((p) => productsMap.has(p.productId))
      .map((p) => ({ ...p, product: productsMap.get(p.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.floristProductProfile.findFirst({
      where: { productId, tenantId: user.tenantId },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.floristProductProfile.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Profile not found');
    return p;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.floristProductProfile.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.floristProductProfile.delete({ where: { id } });
  }

  /**
   * Flowers past or near their fresh-until date, with the product's name,
   * stock and cost so the freshness page can write the wastage off.
   */
  async freshnessAlerts(user: AuthenticatedUser) {
    const now = new Date();
    const in2Days = new Date(now.getTime() + 2 * 86400000);
    const in5Days = new Date(now.getTime() + 5 * 86400000);
    const find = (freshUntil: Prisma.DateTimeNullableFilter) => this.prisma.floristProductProfile.findMany({
      where: { tenantId: user.tenantId, freshUntil },
      orderBy: { freshUntil: 'asc' },
      take: 50,
    });
    const [witheringToday, witheringSoon, witheringLater] = await Promise.all([
      find({ lt: now }), find({ gte: now, lte: in2Days }), find({ gt: in2Days, lte: in5Days }),
    ]);
    const ids = [...witheringToday, ...witheringSoon, ...witheringLater].map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: ids } },
      select: { id: true, name: true, unit: true, stock: true, costPrice: true, price: true, isActive: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const withProduct = <T extends { productId: string }>(rows: T[]) => rows
      .filter((r) => byId.get(r.productId)?.isActive !== false)
      .map((r) => ({ ...r, product: byId.get(r.productId) ?? null }));
    return { witheringToday: withProduct(witheringToday), witheringSoon: withProduct(witheringSoon), witheringLater: withProduct(witheringLater) };
  }

  async byOccasion(user: AuthenticatedUser, occasion: string) {
    return this.prisma.floristProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        occasions: { has: occasion },
      },
      take: 100,
    });
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.floristProductProfile.findMany({
      where: { tenantId: user.tenantId },
      take: 1000,
    });
    const grouped: Record<string, number> = {};
    all.forEach((p) => {
      const key = p.categoryType || 'OTHER';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  }
}
