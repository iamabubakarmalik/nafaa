import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class ShoeDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
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

  async sizePopularity(user: AuthenticatedUser) {
    const variants = await this.prisma.shoeSizeVariant.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 30,
    });
    const grouped: Record<string, number> = {};
    variants.forEach((v) => {
      const key = `${v.size} (${v.sizeSystem})`;
      grouped[key] = (grouped[key] || 0) + v.totalSold;
    });
    return Object.entries(grouped)
      .map(([size, sold]) => ({ size, sold }))
      .sort((a, b) => b.sold - a.sold);
  }
}
