/**
 * Dairy profile of a catalog product: what kind of milk item it is, fat and
 * SNF, morning / evening / bulk / home delivery rates and shelf life. The
 * product itself (price, cost, stock) lives in the shared catalog.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DairyMilkQuality, DairyProductType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertDairyProductDto } from './dto/upsert-dairy-product.dto';
import { cleanInput, parseDay } from '../dairy-common';

const RATES = ['morningPrice', 'eveningPrice', 'bulkPrice', 'minBulkQty', 'wholesalePrice', 'retailPrice', 'homeDeliveryPrice'] as const;

@Injectable()
export class DairyProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertDairyProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product nahi mila');
    for (const k of RATES) {
      const v = dto[k];
      if (v !== undefined && v !== null && !(Number(v) >= 0)) throw new BadRequestException('Rate manfi nahi ho sakta');
    }

    const data = {
      ...(cleanInput(dto) as Omit<UpsertDairyProductDto, 'productionDate'>),
      productionDate: dto.productionDate ? parseDay(dto.productionDate) : undefined,
    };
    const existing = await this.prisma.dairyProduct.findFirst({ where: { productId: dto.productId }, select: { tenantId: true, minBulkQty: true } });
    if (existing && existing.tenantId !== user.tenantId) throw new NotFoundException('Product nahi mila');
    if (dto.bulkPrice && !(dto.minBulkQty ?? existing?.minBulkQty)) throw new BadRequestException('Bulk rate ke saath kam se kam quantity bhi likhein');
    if (existing) return this.prisma.dairyProduct.update({ where: { productId: dto.productId }, data });
    return this.prisma.dairyProduct.create({ data: { ...data, tenantId: user.tenantId } as Prisma.DairyProductUncheckedCreateInput });
  }

  async list(user: AuthenticatedUser, params: { productType?: string; quality?: string; featured?: boolean; bestSeller?: boolean; morning?: boolean; evening?: boolean; search?: string }) {
    const profiles = await this.prisma.dairyProduct.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.productType && params.productType in DairyProductType && { productType: params.productType as DairyProductType }),
        ...(params.quality && params.quality in DairyMilkQuality && { quality: params.quality as DairyMilkQuality }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.bestSeller !== undefined && { isBestSeller: params.bestSeller }),
        ...(params.morning && { availableMorning: true }),
        ...(params.evening && { availableEvening: true }),
      },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { updatedAt: 'desc' }],
      take: 500,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        tenantId: user.tenantId,
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
    if (!p) throw new NotFoundException('Profile nahi mila');
    const product = await this.prisma.product.findFirst({ where: { id: p.productId, tenantId: user.tenantId }, include: { images: true, category: true } });
    return { ...p, product };
  }

  /**
   * Kept for old screens. The profile holds rates, not history, so nothing
   * is deleted: it stops being the featured item and leaves the morning,
   * evening and home delivery lists. The product is switched off from
   * the shared products page.
   */
  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.dairyProduct.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile nahi mila');
    return this.prisma.dairyProduct.update({
      where: { id },
      data: { isFeatured: false, isBestSeller: false, availableMorning: false, availableEvening: false, homeDeliveryAvailable: false },
    });
  }
}
