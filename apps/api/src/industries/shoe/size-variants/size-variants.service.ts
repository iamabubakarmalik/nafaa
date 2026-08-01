import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AdjustStockDto, BulkUpsertSizeVariantsDto, UpsertSizeVariantDto } from './dto/upsert-size-variant.dto';

@Injectable()
export class ShoeSizeVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertSizeVariantDto) {
    const sizeSystem = dto.sizeSystem ?? 'UK';
    const width = dto.width ?? 'REGULAR';

    const existing = await this.prisma.shoeSizeVariant.findFirst({
      where: {
        tenantId: user.tenantId,
        productId: dto.productId,
        size: dto.size,
        sizeSystem,
        width,
      },
    });

    const data: any = {
      tenantId: user.tenantId,
      productId: dto.productId,
      size: dto.size,
      sizeSystem,
      width,
      sku: dto.sku,
      barcode: dto.barcode,
      boxNumber: dto.boxNumber,
      shelfLocation: dto.shelfLocation,
      stock: dto.stock ?? 0,
      lowStockAlert: dto.lowStockAlert ?? 1,
      priceOverride: dto.priceOverride,
      costOverride: dto.costOverride,
      isActive: dto.isActive ?? true,
    };

    if (existing) return this.prisma.shoeSizeVariant.update({ where: { id: existing.id }, data });
    return this.prisma.shoeSizeVariant.create({ data });
  }

  async bulkUpsert(user: AuthenticatedUser, dto: BulkUpsertSizeVariantsDto) {
    const results = [];
    for (const v of dto.variants) {
      const result = await this.upsert(user, { ...v, productId: dto.productId });
      results.push(result);
    }
    return { count: results.length, variants: results };
  }

  async list(user: AuthenticatedUser, params: {
    productId?: string;
    size?: string;
    inStock?: boolean;
    lowStock?: boolean;
    active?: boolean;
    search?: string;
  }) {
    return this.prisma.shoeSizeVariant.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.productId && { productId: params.productId }),
        ...(params.size && { size: params.size }),
        ...(params.inStock && { stock: { gt: 0 } }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { sku: { contains: params.search, mode: 'insensitive' } },
            { barcode: { contains: params.search } },
            { boxNumber: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ productId: 'asc' }, { sizeSystem: 'asc' }, { size: 'asc' }],
      take: 500,
    });
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.shoeSizeVariant.findMany({
      where: { tenantId: user.tenantId, productId },
      orderBy: [{ sizeSystem: 'asc' }, { width: 'asc' }, { size: 'asc' }],
    });
  }

  async bySku(user: AuthenticatedUser, sku: string) {
    return this.prisma.shoeSizeVariant.findFirst({ where: { tenantId: user.tenantId, sku } });
  }

  async byBarcode(user: AuthenticatedUser, barcode: string) {
    return this.prisma.shoeSizeVariant.findFirst({ where: { tenantId: user.tenantId, barcode } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const v = await this.prisma.shoeSizeVariant.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Size variant not found');
    return v;
  }

  async adjustStock(user: AuthenticatedUser, id: string, dto: AdjustStockDto) {
    const v = await this.prisma.shoeSizeVariant.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Size variant not found');
    const newStock = Math.max(v.stock + dto.delta, 0);
    return this.prisma.shoeSizeVariant.update({
      where: { id },
      data: { stock: newStock },
    });
  }

  async reserve(user: AuthenticatedUser, id: string, quantity: number) {
    const v = await this.prisma.shoeSizeVariant.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Size variant not found');
    const available = v.stock - v.reservedStock;
    if (available < quantity) throw new BadRequestException(`Only ${available} available for reservation`);
    return this.prisma.shoeSizeVariant.update({
      where: { id },
      data: { reservedStock: v.reservedStock + quantity },
    });
  }

  async releaseReservation(user: AuthenticatedUser, id: string, quantity: number) {
    const v = await this.prisma.shoeSizeVariant.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Size variant not found');
    return this.prisma.shoeSizeVariant.update({
      where: { id },
      data: { reservedStock: Math.max(v.reservedStock - quantity, 0) },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const v = await this.prisma.shoeSizeVariant.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Size variant not found');
    return this.prisma.shoeSizeVariant.delete({ where: { id } });
  }

  async lowStockReport(user: AuthenticatedUser) {
    const all = await this.prisma.shoeSizeVariant.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });
    return all.filter((v) => v.stock <= v.lowStockAlert);
  }

  async sizeAvailability(user: AuthenticatedUser, productId: string) {
    const variants = await this.prisma.shoeSizeVariant.findMany({
      where: { tenantId: user.tenantId, productId, isActive: true },
      orderBy: [{ sizeSystem: 'asc' }, { size: 'asc' }],
    });
    return variants.map((v) => ({
      id: v.id,
      size: v.size,
      sizeSystem: v.sizeSystem,
      width: v.width,
      available: v.stock - v.reservedStock,
      stock: v.stock,
      reserved: v.reservedStock,
      isAvailable: (v.stock - v.reservedStock) > 0,
      boxNumber: v.boxNumber,
      shelfLocation: v.shelfLocation,
    }));
  }
}
