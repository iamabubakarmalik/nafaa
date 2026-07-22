import { Injectable } from '@nestjs/common';
import { startOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class RetailDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser, shopId?: string) {
    const todayStart = startOfDay(new Date());
    const yesterdayStart = startOfDay(subDays(new Date(), 1));
    const weekAgo = startOfDay(subDays(new Date(), 7));

    const baseWhere = {
      tenantId: user.tenantId,
      status: 'COMPLETED' as const,
      ...(shopId && { shopId }),
    };

    const [
      todaySales,
      yesterdaySales,
      weekSales,
      topProducts,
      categoryPerformance,
      lowStockCount,
      damagesToday,
      pendingReorders,
    ] = await Promise.all([
      // Today's revenue
      this.prisma.sale.aggregate({
        where: { ...baseWhere, soldAt: { gte: todayStart } },
        _sum: { total: true, costOfGoods: true },
        _count: { _all: true },
      }),

      // Yesterday for comparison
      this.prisma.sale.aggregate({
        where: {
          ...baseWhere,
          soldAt: { gte: yesterdayStart, lt: todayStart },
        },
        _sum: { total: true },
      }),

      // Last 7 days
      this.prisma.sale.aggregate({
        where: { ...baseWhere, soldAt: { gte: weekAgo } },
        _sum: { total: true, costOfGoods: true },
      }),

      // Top selling products today
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            tenantId: user.tenantId,
            status: 'COMPLETED',
            soldAt: { gte: todayStart },
            ...(shopId && { shopId }),
          },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),

      // Category performance
      this.prisma.$queryRaw<Array<{ categoryId: string; name: string; total: number; count: number }>>`
        SELECT
          c.id as "categoryId",
          c.name,
          COALESCE(SUM(si.total), 0)::float as total,
          COUNT(DISTINCT si.id)::int as count
        FROM "SaleItem" si
        JOIN "Product" p ON p.id = si."productId"
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."tenantId" = ${user.tenantId}
          AND s.status = 'COMPLETED'
          AND s."soldAt" >= ${weekAgo}
          ${shopId ? `AND s."shopId" = '${shopId}'` : ''}
        GROUP BY c.id, c.name
        ORDER BY total DESC
        LIMIT 8
      `,

      // Low stock alert
      this.prisma.product.count({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          stock: { lte: this.prisma.product.fields.lowStockAlert as any },
        },
      }),

      // Damages today
      this.prisma.damageLog.aggregate({
        where: {
          tenantId: user.tenantId,
          createdAt: { gte: todayStart },
        },
        _sum: { netLoss: true },
        _count: { _all: true },
      }),

      // Pending reorders
      this.prisma.reorderSuggestion.count({
        where: {
          tenantId: user.tenantId,
          status: 'PENDING',
        },
      }),
    ]);

    // Enrich top products with names
    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: true,
      },
    });
    const topProductsEnriched = topProducts.map((tp) => ({
      ...tp,
      product: products.find((p) => p.id === tp.productId),
    }));

    const todayRev = todaySales._sum.total ?? 0;
    const yesterdayRev = yesterdaySales._sum.total ?? 0;
    const growthPercent =
      yesterdayRev > 0 ? ((todayRev - yesterdayRev) / yesterdayRev) * 100 : 0;

    return {
      today: {
        revenue: todayRev,
        profit: (todayRev - (todaySales._sum.costOfGoods ?? 0)),
        orders: todaySales._count._all,
        growthPercent,
      },
      week: {
        revenue: weekSales._sum.total ?? 0,
        profit: (weekSales._sum.total ?? 0) - (weekSales._sum.costOfGoods ?? 0),
      },
      topProducts: topProductsEnriched,
      categoryPerformance,
      alerts: {
        lowStockCount,
        damagesToday: damagesToday._count._all,
        damageLossToday: damagesToday._sum.netLoss ?? 0,
        pendingReorders,
      },
    };
  }

  async salesByHour(user: AuthenticatedUser, shopId?: string) {
    const todayStart = startOfDay(new Date());

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'COMPLETED',
        soldAt: { gte: todayStart },
        ...(shopId && { shopId }),
      },
      select: { total: true, soldAt: true },
    });

    // Group by hour
    const buckets: Record<number, { hour: number; total: number; count: number }> = {};
    for (let h = 0; h < 24; h++) {
      buckets[h] = { hour: h, total: 0, count: 0 };
    }

    for (const s of sales) {
      const hour = new Date(s.soldAt).getHours();
      buckets[hour].total += s.total;
      buckets[hour].count += 1;
    }

    return Object.values(buckets);
  }

  async slowMovers(user: AuthenticatedUser, days = 30) {
    const cutoff = subDays(new Date(), days);

    // Products with no sales in `days` days
    const soldProductIds = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          soldAt: { gte: cutoff },
        },
      },
      select: { productId: true },
      distinct: ['productId'],
    });

    const soldIds = soldProductIds.map((s) => s.productId);

    return this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        stock: { gt: 0 },
        id: { notIn: soldIds },
      },
      include: {
        category: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { stock: 'desc' },
      take: 20,
    });
  }
}
