import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { linkedVariants, refreshSizeStock } from '../common/size-stock.helper';

@Injectable()
export class ShoeDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    // Size counts on the shoe rows follow the stock engine (sales, returns, purchases).
    await refreshSizeStock(this.prisma as any, user.tenantId);
    const [
      totalBrands,
      totalProducts,
      totalSizeVariants,
      totalStockUnits,
      pendingTryOns,
      pendingExchanges,
    ] = await Promise.all([
      this.prisma.shoeBrand.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.shoeProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.shoeSizeVariant.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.shoeSizeVariant.aggregate({
        where: { tenantId: user.tenantId, isActive: true },
        _sum: { stock: true },
      }),
      this.prisma.shoeTryOnRequest.count({
        where: { tenantId: user.tenantId, status: { in: ['PENDING', 'SCHEDULED'] } },
      }),
      this.prisma.shoeExchange.count({
        where: { tenantId: user.tenantId, status: { in: ['REQUESTED', 'APPROVED'] } },
      }),
    ]);

    const lowStockVariants = await this.prisma.shoeSizeVariant.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });
    const lowStock = lowStockVariants.filter((v) => v.stock <= v.lowStockAlert && v.stock > 0);
    const outOfStock = lowStockVariants.filter((v) => v.stock <= 0);

    const topProducts = await this.prisma.shoeProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 10,
    });

    const topBrands = await this.prisma.shoeBrand.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: 5,
    });

    const byCategory = await this.prisma.shoeProductProfile.groupBy({
      by: ['categoryType'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    const byGender = await this.prisma.shoeProductProfile.groupBy({
      by: ['gender'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    return {
      totals: {
        totalBrands,
        totalProducts,
        totalSizeVariants,
        totalStockUnits: totalStockUnits._sum.stock ?? 0,
        pendingTryOns,
        pendingExchanges,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
      },
      topProducts,
      topBrands,
      byCategory,
      byGender,
      lowStockVariants: lowStock.slice(0, 20),
      outOfStockVariants: outOfStock.slice(0, 20),
    };
  }

  /** Pairs sold per size, from completed bills (returns taken off). */
  async sizePopularity(user: AuthenticatedUser) {
    const sizes = await this.prisma.shoeSizeVariant.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, productId: true, size: true, sizeSystem: true, width: true },
    });
    const links = await linkedVariants(this.prisma as any, sizes);
    const keyOfVariant = new Map<string, string>();
    for (const sz of sizes) {
      const link = links.get(sz.id);
      if (link) keyOfVariant.set(link.id, `${sz.size} (${sz.sizeSystem})`);
    }
    const sold = keyOfVariant.size
      ? await this.prisma.saleItem.findMany({
        where: {
          variantLink: { variantId: { in: [...keyOfVariant.keys()] } },
          sale: { tenantId: user.tenantId, status: { notIn: ['VOIDED'] } },
        },
        select: { quantity: true, returnedQty: true, variantLink: { select: { variantId: true } } },
      })
      : [];
    const grouped: Record<string, number> = {};
    for (const it of sold) {
      const key = keyOfVariant.get(it.variantLink!.variantId);
      if (!key) continue;
      grouped[key] = (grouped[key] || 0) + Number(it.quantity) - Number(it.returnedQty || 0);
    }
    return Object.entries(grouped)
      .map(([size, sold]) => ({ size, sold }))
      .sort((a, b) => b.sold - a.sold);
  }
}
