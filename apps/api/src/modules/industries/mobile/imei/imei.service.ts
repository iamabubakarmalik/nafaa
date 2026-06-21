import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { ImeiStatus, PtaStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateImeiDto } from './dto/create-imei.dto';
import { BulkCreateImeiDto } from './dto/bulk-create-imei.dto';

@Injectable()
export class ImeiService {
  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════
  // HELPER: Sync product/variant stock from IMEI counts
  // ════════════════════════════════════════════════════════
  private async syncStockFromImeis(
    tx: any,
    tenantId: string,
    productId: string,
    variantId?: string | null,
  ) {
    // Count IN_STOCK IMEIs for the product
    const productInStock = await tx.productImei.count({
      where: { tenantId, productId, status: 'IN_STOCK' },
    });
    await tx.product.update({
      where: { id: productId },
      data: { stock: productInStock },
    });

    // Count IN_STOCK IMEIs for the variant (if applicable)
    if (variantId) {
      const variantInStock = await tx.productImei.count({
        where: { tenantId, productId, variantId, status: 'IN_STOCK' },
      });
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: variantInStock },
      });
    }

    // Sync ShopStock (use first shop or null)
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      include: { shops: { where: { isActive: true }, take: 1 } },
    });
    const shopId = tenant?.shops?.[0]?.id;
    if (shopId) {
      const existing = await tx.shopStock.findFirst({
        where: { shopId, productId, variantId: variantId ?? null },
      });
      if (existing) {
        await tx.shopStock.update({
          where: { id: existing.id },
          data: { stock: variantId ? productInStock : productInStock },
        });
      } else if (productInStock > 0) {
        await tx.shopStock.create({
          data: {
            tenantId, shopId, productId, variantId: variantId ?? null,
            stock: productInStock, isActive: true,
          },
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════
  // CREATE
  // ════════════════════════════════════════════════════════
  async create(user: AuthenticatedUser, dto: CreateImeiDto) {
    const existing = await this.prisma.productImei.findFirst({
      where: { tenantId: user.tenantId, imei1: dto.imei1 },
    });
    if (existing) {
      throw new ConflictException(`IMEI ${dto.imei1} already exists`);
    }

    const warrantyExpiry = dto.warrantyMonths
      ? new Date(Date.now() + dto.warrantyMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    return this.prisma.$transaction(async (tx) => {
      const imei = await tx.productImei.create({
        data: {
          tenantId: user.tenantId,
          productId: dto.productId,
          variantId: dto.variantId,
          imei1: dto.imei1,
          imei2: dto.imei2,
          serialNumber: dto.serialNumber,
          ptaStatus: dto.ptaStatus ?? 'PENDING',
          ptaTaxPaid: dto.ptaTaxPaid ?? 0,
          ptaTaxDueAt: dto.ptaTaxDueAt ? new Date(dto.ptaTaxDueAt) : null,
          ptaVerifiedAt: dto.ptaVerifiedAt ? new Date(dto.ptaVerifiedAt) : null,
          costPrice: dto.costPrice ?? 0,
          warrantyMonths: dto.warrantyMonths ?? 12,
          warrantyExpiry,
          color: dto.color,
          notes: dto.notes,
          purchasedAt: new Date(),
        },
      });

      await this.syncStockFromImeis(tx, user.tenantId, dto.productId, dto.variantId);
      return imei;
    });
  }

  // ════════════════════════════════════════════════════════
  // BULK CREATE
  // ════════════════════════════════════════════════════════
  async bulkCreate(user: AuthenticatedUser, dto: BulkCreateImeiDto) {
    const imeis = dto.imeis.map((i) => i.imei1);
    const existing = await this.prisma.productImei.findMany({
      where: { tenantId: user.tenantId, imei1: { in: imeis } },
      select: { imei1: true },
    });
    if (existing.length > 0) {
      throw new ConflictException(
        `IMEIs already exist: ${existing.map((e) => e.imei1).join(', ')}`,
      );
    }

    const warrantyExpiry = dto.warrantyMonths
      ? new Date(Date.now() + dto.warrantyMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    const count = dto.imeis.length;

    await this.prisma.$transaction(async (tx) => {
      await tx.productImei.createMany({
        data: dto.imeis.map((i) => ({
          tenantId: user.tenantId,
          productId: dto.productId,
          variantId: dto.variantId,
          imei1: i.imei1,
          imei2: i.imei2,
          serialNumber: i.serialNumber,
          ptaStatus: i.ptaStatus ?? 'PENDING',
          ptaTaxPaid: i.ptaTaxPaid ?? 0,
          costPrice: dto.costPrice ?? 0,
          warrantyMonths: dto.warrantyMonths ?? 12,
          warrantyExpiry,
          color: i.color,
          notes: i.notes,
          purchasedAt: new Date(),
        })),
      });

      await this.syncStockFromImeis(tx, user.tenantId, dto.productId, dto.variantId);
    });

    return { count, message: `${count} IMEIs added successfully` };
  }

  // ════════════════════════════════════════════════════════
  // GLOBAL LIST (with filters)
  // ════════════════════════════════════════════════════════
  async listAll(
    user: AuthenticatedUser,
    params: {
      search?: string;
      status?: ImeiStatus;
      ptaStatus?: PtaStatus;
      productId?: string;
      variantId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const where: Prisma.ProductImeiWhereInput = {
      tenantId: user.tenantId,
      ...(params.status && { status: params.status }),
      ...(params.ptaStatus && { ptaStatus: params.ptaStatus }),
      ...(params.productId && { productId: params.productId }),
      ...(params.variantId && { variantId: params.variantId }),
      ...(params.search && {
        OR: [
          { imei1: { contains: params.search } },
          { imei2: { contains: params.search } },
          { serialNumber: { contains: params.search, mode: 'insensitive' as const } },
          { color: { contains: params.search, mode: 'insensitive' as const } },
          { product: { name: { contains: params.search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const page = params.page ?? 1;
    const limit = params.limit ?? 100;

    const [items, total] = await Promise.all([
      this.prisma.productImei.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, brandId: true, brand: { select: { name: true } } } },
          variant: { select: { id: true, name: true, color: true, colorHex: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.productImei.count({ where }),
    ]);

    return {
      items, total, page, limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ════════════════════════════════════════════════════════
  // GLOBAL STATS (with PTA breakdown)
  // ════════════════════════════════════════════════════════
  async stats(user: AuthenticatedUser) {
    const [byStatus, byPta, totalAgg] = await Promise.all([
      this.prisma.productImei.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId },
        _count: { _all: true },
      }),
      this.prisma.productImei.groupBy({
        by: ['ptaStatus'],
        where: { tenantId: user.tenantId, status: 'IN_STOCK' },
        _count: { _all: true },
        _sum: { ptaTaxPaid: true },
      }),
      this.prisma.productImei.aggregate({
        where: { tenantId: user.tenantId, status: 'IN_STOCK' },
        _sum: { costPrice: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s) => { statusMap[s.status] = s._count._all; });

    return {
      total: byStatus.reduce((s, x) => s + x._count._all, 0),
      inStock: statusMap.IN_STOCK ?? 0,
      sold: statusMap.SOLD ?? 0,
      returned: statusMap.RETURNED ?? 0,
      damaged: statusMap.DAMAGED ?? 0,
      reserved: statusMap.RESERVED ?? 0,
      lost: statusMap.LOST ?? 0,
      stockValue: totalAgg._sum.costPrice ?? 0,
      byPta: byPta.map((p) => ({
        ptaStatus: p.ptaStatus,
        count: p._count._all,
        taxPaid: p._sum.ptaTaxPaid ?? 0,
      })),
    };
  }

  // ════════════════════════════════════════════════════════
  // STOCK RECALC (Admin tool — fix existing data)
  // ════════════════════════════════════════════════════════
  async recalcAllStocks(user: AuthenticatedUser) {
    // Find all products that have IMEIs
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        productImeis: { some: {} },
      },
      include: {
        variants: { where: { isActive: true } },
      },
    });

    let productCount = 0;
    let variantCount = 0;

    for (const product of products) {
      await this.prisma.$transaction(async (tx) => {
        // Product-level
        const inStock = await tx.productImei.count({
          where: { tenantId: user.tenantId, productId: product.id, status: 'IN_STOCK' },
        });
        await tx.product.update({
          where: { id: product.id },
          data: { stock: inStock },
        });
        productCount++;

        // Variants
        for (const variant of product.variants) {
          const vInStock = await tx.productImei.count({
            where: {
              tenantId: user.tenantId,
              productId: product.id,
              variantId: variant.id,
              status: 'IN_STOCK',
            },
          });
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: vInStock },
          });
          variantCount++;
        }
      });
    }

    return {
      message: 'Stock recalculated successfully',
      productsUpdated: productCount,
      variantsUpdated: variantCount,
    };
  }

  // ════════════════════════════════════════════════════════
  // LIST BY PRODUCT / VARIANT
  // ════════════════════════════════════════════════════════
  async listByProduct(user: AuthenticatedUser, productId: string, status?: ImeiStatus) {
    return this.prisma.productImei.findMany({
      where: { tenantId: user.tenantId, productId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByVariant(user: AuthenticatedUser, variantId: string, status?: ImeiStatus) {
    return this.prisma.productImei.findMany({
      where: { tenantId: user.tenantId, variantId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async availableForSale(user: AuthenticatedUser, productId: string, variantId?: string) {
    return this.prisma.productImei.findMany({
      where: {
        tenantId: user.tenantId,
        productId,
        ...(variantId && { variantId }),
        status: 'IN_STOCK',
      },
      orderBy: { purchasedAt: 'asc' },
    });
  }

  async search(user: AuthenticatedUser, query: string) {
    return this.prisma.productImei.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          { imei1: { contains: query } },
          { imei2: { contains: query } },
          { serialNumber: { contains: query } },
        ],
      },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, color: true } },
      },
      take: 20,
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const imei = await this.prisma.productImei.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { product: true, variant: true },
    });
    if (!imei) throw new NotFoundException('IMEI not found');
    return imei;
  }

  async update(user: AuthenticatedUser, id: string, data: Partial<CreateImeiDto>) {
    await this.findOne(user, id);
    const updateData: any = { ...data };
    if (data.warrantyMonths) {
      updateData.warrantyExpiry = new Date(
        Date.now() + data.warrantyMonths * 30 * 24 * 60 * 60 * 1000,
      );
    }
    if (data.ptaTaxDueAt) updateData.ptaTaxDueAt = new Date(data.ptaTaxDueAt);
    if (data.ptaVerifiedAt) updateData.ptaVerifiedAt = new Date(data.ptaVerifiedAt);
    delete updateData.productId;
    delete updateData.variantId;

    return this.prisma.productImei.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const imei = await this.findOne(user, id);
    if (imei.status === 'SOLD') {
      throw new BadRequestException('Cannot delete sold IMEI');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImei.delete({ where: { id } });
      await this.syncStockFromImeis(tx, user.tenantId, imei.productId, imei.variantId);
    });

    return { success: true };
  }

  async markSold(
    tx: any,
    tenantId: string,
    imeiId: string,
    saleItemId: string,
    soldPrice: number,
  ) {
    const imei = await tx.productImei.findFirst({
      where: { id: imeiId, tenantId },
    });
    if (!imei) throw new NotFoundException('IMEI not found');
    if (imei.status !== 'IN_STOCK') {
      throw new BadRequestException(`IMEI ${imei.imei1} is not in stock (${imei.status})`);
    }

    const updated = await tx.productImei.update({
      where: { id: imeiId },
      data: {
        status: 'SOLD',
        saleItemId,
        soldPrice,
        soldAt: new Date(),
      },
    });

    // Sync stock after marking sold
    await this.syncStockFromImeis(tx, tenantId, imei.productId, imei.variantId);
    return updated;
  }
}
