import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertAgriProductDto } from './dto/upsert-agri-product.dto';
import { addDaysTz, parseDay } from '../agri-common';

@Injectable()
export class AgriProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertAgriProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.bulkDiscountPct != null && (dto.bulkDiscountPct < 0 || dto.bulkDiscountPct > 90)) throw new BadRequestException('Bulk discount 0 se 90% tak');
    if (dto.bulkDiscountThreshold != null && dto.bulkDiscountThreshold < 0) throw new BadRequestException('Bulk quantity manfi nahi ho sakti');
    const payload: any = {
      ...dto,
      govtRegExpiry: parseDay(dto.govtRegExpiry),
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
    const q = params.search?.trim();
    const matching = q
      ? (await this.prisma.product.findMany({ where: { tenantId: user.tenantId, name: { contains: q, mode: 'insensitive' } }, select: { id: true }, take: 2000 })).map((p) => p.id)
      : null;
    const profiles = await this.prisma.agriProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(matching && { productId: { in: matching } }),
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
      take: 2000,
    });

    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: profiles.map((p) => p.productId) } },
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    return profiles
      .filter((p) => productsMap.has(p.productId))
      .map((p) => ({ ...p, product: productsMap.get(p.productId) }));
  }

  /** Light facts per product for the counter, the products page and sales history. */
  async facts(user: AuthenticatedUser) {
    return this.prisma.agriProductProfile.findMany({
      where: { tenantId: user.tenantId },
      select: {
        productId: true, category: true, season: true, brand: true, manufacturer: true, npkRatio: true, activeIngredient: true,
        packSize: true, packUnit: true, targetCrops: true, targetPests: true, applicationRate: true, toxicityLevel: true,
        govtRegNumber: true, govtRegExpiry: true, isRestricted: true, requiresLicense: true, isOrganic: true,
        bulkDiscountThreshold: true, bulkDiscountPct: true, reEntryPeriod: true, ppePeriod: true,
      },
    });
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.agriProductProfile.findFirst({ where: { productId, tenantId: user.tenantId } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.agriProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    const product = await this.prisma.product.findFirst({
      where: { id: p.productId, tenantId: user.tenantId },
      include: { images: true, category: true },
    });
    return { ...p, product };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.agriProductProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    // Registration and safety details stay on record; a product is switched off from the products page.
    throw new BadRequestException('Agri details mitaye nahi jate — product band karna ho to Products page se band karein');
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.agriProductProfile.findMany({
      where: { tenantId: user.tenantId },
    });
    const productIds = all.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: productIds } },
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
    const cutoff = addDaysTz(new Date(), daysAhead);
    return this.prisma.agriProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        govtRegExpiry: { gte: new Date(), lte: cutoff },
      },
      orderBy: { govtRegExpiry: 'asc' },
    });
  }
}
