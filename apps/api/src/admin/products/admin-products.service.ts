import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const real = { tenant: { slug: { not: 'nafaa-system' } } };
    const [total, active, lowStock, outOfStock, valueAgg] = await Promise.all([
      this.prisma.product.count({ where: real }),
      this.prisma.product.count({ where: { ...real, isActive: true } }),
      this.prisma.product.count({
        where: {
          ...real,
          isActive: true,
          stock: { gt: 0, lte: this.prisma.product.fields.lowStockAlert as any },
        },
      }),
      this.prisma.product.count({ where: { ...real, isActive: true, stock: 0 } }),
      this.prisma.product.aggregate({
        where: { ...real, isActive: true },
        _sum: { stock: true },
      }),
    ]);

    return {
      total,
      active,
      lowStock,
      outOfStock,
      totalStockUnits: valueAgg._sum.stock ?? 0,
    };
  }

  async list(params: {
    search?: string;
    tenantId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenant: { slug: { not: 'nafaa-system' } },
      ...(params.status === 'active' ? { isActive: true } : {}),
      ...(params.status === 'inactive' ? { isActive: false } : {}),
      ...(params.status === 'out' ? { isActive: true, stock: 0 } : {}),
      ...(params.status === 'low' ? { isActive: true, stock: { gt: 0, lte: this.prisma.product.fields.lowStockAlert as any } } : {}),
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { sku: { contains: params.search, mode: 'insensitive' } },
              { barcode: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, color: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
