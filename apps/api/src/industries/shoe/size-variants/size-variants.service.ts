import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta } from '../../../common/shop-scope';
import { resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { ensureSizeVariant, linkedVariants, sizeLabel, withLiveStock } from '../common/size-stock.helper';
import { AdjustStockDto, BulkUpsertSizeVariantsDto, UpsertSizeVariantDto } from './dto/upsert-size-variant.dto';

@Injectable()
export class ShoeSizeVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Saves a size. A given `stock` is the count wanted for the size: the
   * difference is booked as a stock adjustment in the branch, so the POS
   * and the stock reports see it.
   */
  async upsert(user: AuthenticatedUser, dto: UpsertSizeVariantDto, activeShopId?: string | null) {
    const sizeSystem = dto.sizeSystem ?? 'UK';
    const width = dto.width ?? 'REGULAR';
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
      select: { id: true, name: true },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    if (dto.stock !== undefined && dto.stock < 0) throw new BadRequestException('Stock manfi nahi ho sakta');

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.shoeSizeVariant.findFirst({
        where: { tenantId: user.tenantId, productId: dto.productId, size: dto.size, sizeSystem, width },
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
        lowStockAlert: dto.lowStockAlert ?? 1,
        priceOverride: dto.priceOverride,
        costOverride: dto.costOverride,
        isActive: dto.isActive ?? true,
      };
      const saved = existing
        ? await tx.shoeSizeVariant.update({ where: { id: existing.id }, data })
        : await tx.shoeSizeVariant.create({ data: { ...data, stock: 0 } });

      const shopId = await resolveIndustryShopId(tx, user, activeShopId);
      const variantId = await ensureSizeVariant(tx, {
        tenantId: user.tenantId, userId: user.id, shopId, size: saved,
      });

      if (dto.stock !== undefined) {
        if (!variantId) {
          // Unlinked size (older data the branch cannot cover): keep the old count-only behaviour.
          await tx.shoeSizeVariant.update({ where: { id: saved.id }, data: { stock: dto.stock } });
        } else {
          const current = Number((await tx.productVariant.findUnique({ where: { id: variantId }, select: { stock: true } }))?.stock ?? 0);
          const delta = Math.round(dto.stock - current);
          const history = await tx.stockMovement.count({ where: { tenantId: user.tenantId, productId: dto.productId, variantId } });
          if (delta !== 0 && history > 0) {
            // A size with stock history changes through purchase or a stock
            // adjustment, so the change is on record with its reason.
            throw new BadRequestException(`Size ${sizeLabel(saved)} ka stock ${current} hai — badalne ke liye Stock Adjustment karein`);
          }
          if (delta > 0) {
            await applyStockDelta({
              tx, tenantId: user.tenantId, shopId, productId: dto.productId, variantId,
              delta, movementType: 'OPENING_BALANCE', reference: 'OPENING',
              note: `Opening stock: ${product.name} (${sizeLabel(saved)})`, userId: user.id,
            });
          }
        }
      }
      const fresh = await tx.shoeSizeVariant.findUniqueOrThrow({ where: { id: saved.id } });
      return (await withLiveStock(tx, [fresh]))[0];
    });
  }

  async bulkUpsert(user: AuthenticatedUser, dto: BulkUpsertSizeVariantsDto, activeShopId?: string | null) {
    const results = [];
    for (const v of dto.variants) {
      const result = await this.upsert(user, { ...v, productId: dto.productId }, activeShopId);
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
    const rows = await this.prisma.shoeSizeVariant.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.productId && { productId: params.productId }),
        ...(params.size && { size: params.size }),
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
    const live = await withLiveStock(this.prisma as any, rows);
    return live.filter((v) => (!params.inStock || v.stock > 0) && (!params.lowStock || v.stock <= v.lowStockAlert));
  }

  /** Sizes of one product with live stock; older sizes get linked to the stock engine here. */
  async byProduct(user: AuthenticatedUser, productId: string, activeShopId?: string | null) {
    const rows = await this.prisma.shoeSizeVariant.findMany({
      where: { tenantId: user.tenantId, productId },
      orderBy: [{ sizeSystem: 'asc' }, { width: 'asc' }, { size: 'asc' }],
    });
    const links = await linkedVariants(this.prisma as any, rows);
    const unlinked = rows.filter((r) => !links.has(r.id));
    if (unlinked.length && activeShopId) {
      await this.prisma.$transaction(async (tx) => {
        const shopId = await resolveIndustryShopId(tx, user, activeShopId);
        for (const r of unlinked) {
          await ensureSizeVariant(tx, { tenantId: user.tenantId, userId: user.id, shopId, size: r });
        }
      });
    }
    return withLiveStock(this.prisma as any, rows);
  }

  async bySku(user: AuthenticatedUser, sku: string) {
    const v = await this.prisma.shoeSizeVariant.findFirst({ where: { tenantId: user.tenantId, sku } });
    return v ? (await withLiveStock(this.prisma as any, [v]))[0] : null;
  }

  async byBarcode(user: AuthenticatedUser, barcode: string) {
    const v = await this.prisma.shoeSizeVariant.findFirst({ where: { tenantId: user.tenantId, barcode } });
    return v ? (await withLiveStock(this.prisma as any, [v]))[0] : null;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const v = await this.prisma.shoeSizeVariant.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Size variant not found');
    return (await withLiveStock(this.prisma as any, [v]))[0];
  }

  /**
   * Stock correction for one size. A size linked to the stock engine is
   * corrected on the Stock Adjustment page (variant of the product), so the
   * change keeps its reason and shows in the adjustment and profit reports.
   */
  async adjustStock(user: AuthenticatedUser, id: string, dto: AdjustStockDto, activeShopId?: string | null) {
    const v = await this.prisma.shoeSizeVariant.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Size variant not found');
    const delta = Math.round(dto.delta);
    if (!delta) return this.getOne(user, id);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, activeShopId);
      const variantId = await ensureSizeVariant(tx, { tenantId: user.tenantId, userId: user.id, shopId, size: v });
      if (variantId) {
        throw new BadRequestException(`Size ${sizeLabel(v)} ka stock Stock Adjustment se badlein (variant "${sizeLabel(v)}")`);
      }
      return tx.shoeSizeVariant.update({ where: { id }, data: { stock: Math.max(v.stock + delta, 0) } });
    });
  }

  async reserve(user: AuthenticatedUser, id: string, quantity: number) {
    const v = await this.getOne(user, id);
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
    const v = await this.getOne(user, id);
    if (v.stock > 0) {
      throw new BadRequestException(`Size ${sizeLabel(v)} me abhi ${v.stock} joray hain — pehle stock 0 karein`);
    }
    return this.prisma.$transaction(async (tx) => {
      // The stock row is kept for sale history; it is only switched off.
      if (v.variantId) await tx.productVariant.update({ where: { id: v.variantId }, data: { isActive: false } });
      return tx.shoeSizeVariant.delete({ where: { id } });
    });
  }

  async lowStockReport(user: AuthenticatedUser) {
    const all = await this.prisma.shoeSizeVariant.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });
    const live = await withLiveStock(this.prisma as any, all);
    return live.filter((v) => v.stock <= v.lowStockAlert);
  }

  async sizeAvailability(user: AuthenticatedUser, productId: string) {
    const rows = await this.prisma.shoeSizeVariant.findMany({
      where: { tenantId: user.tenantId, productId, isActive: true },
      orderBy: [{ sizeSystem: 'asc' }, { size: 'asc' }],
    });
    const variants = await withLiveStock(this.prisma as any, rows);
    return variants.map((v) => ({
      id: v.id,
      variantId: v.variantId,
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
