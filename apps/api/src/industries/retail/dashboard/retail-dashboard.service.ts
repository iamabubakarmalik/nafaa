import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  startOfDayTz,
  startOfMonthTz,
  subDaysTz,
  subMonthsTz,
} from '../../../common/helpers/business-time.helper';
import { BusinessPulseService } from '../../../modules/dashboard/business-pulse.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';

/** Sirf mukammal sales ginti me — draft/cancel nahi. */
const SOLD_STATUSES = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;

@Injectable()
export class RetailDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pulse: BusinessPulseService,
    private readonly tzService: TenantTimezoneService,
  ) {}

  async overview(user: AuthenticatedUser, shopId?: string) {
    // `Prisma.sql` / `Prisma.empty`, never a plain nested template string: a
    // nested `${...}` inside $queryRaw becomes a bound parameter, so the SQL
    // ends up with a stray placeholder where the AND clause should be.
    const shopFilter = shopId
      ? Prisma.sql`AND s."shopId" = ${shopId}`
      : Prisma.empty;

    // Har hadd DUKAAN ke apne waqt par. Server UTC par chalta hai, is
    // liye `startOfDay(new Date())` se din 5 ghante pehle shuru ho
    // jata tha — aur timezone har tenant ka apna hai, kyunke Nafaa
    // sirf Pakistan me nahi chalta.
    const tz = await this.tzService.resolve(user.tenantId);
    const now = new Date();
    const todayStart = startOfDayTz(now, tz);
    const yesterdayStart = subDaysTz(todayStart, 1, tz);
    const weekAgo = subDaysTz(todayStart, 6, tz);
    const monthStart = startOfMonthTz(now, tz);
    const lastMonthStart = startOfMonthTz(subMonthsTz(now, 1, tz), tz);

    const baseWhere = {
      tenantId: user.tenantId,
      status: { in: [...SOLD_STATUSES] },
      ...(shopId && { shopId }),
    };

    const [
      todaySales,
      yesterdaySales,
      weekSales,
      monthSales,
      lastMonthSales,
      topProducts,
      categoryPerformance,
      lowStockCount,
      damagesToday,
      pendingReorders,
    ] = await Promise.all([
      // Today's revenue
      this.prisma.sale.aggregate({
        where: { ...baseWhere, soldAt: { gte: todayStart } },
        _sum: { total: true, costOfGoods: true, paidAmount: true, creditAmount: true },
        _count: { _all: true },
      }),

      // Yesterday for comparison
      this.prisma.sale.aggregate({
        where: {
          ...baseWhere,
          soldAt: { gte: yesterdayStart, lt: todayStart },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),

      // Last 7 days
      this.prisma.sale.aggregate({
        where: { ...baseWhere, soldAt: { gte: weekAgo } },
        _sum: { total: true, costOfGoods: true },
        _count: { _all: true },
      }),

      // Is mahine
      this.prisma.sale.aggregate({
        where: { ...baseWhere, soldAt: { gte: monthStart } },
        _sum: { total: true, costOfGoods: true },
        _count: { _all: true },
      }),

      // Pichhle mahine — poora mahina, taake muqabla barabar ka ho
      this.prisma.sale.aggregate({
        where: { ...baseWhere, soldAt: { gte: lastMonthStart, lt: monthStart } },
        _sum: { total: true, costOfGoods: true },
      }),

      // Top selling products today
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            tenantId: user.tenantId,
            status: { in: [...SOLD_STATUSES] },
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
          AND s.status IN ('COMPLETED', 'PARTIALLY_RETURNED')
          AND s."soldAt" >= ${weekAgo}
          ${shopFilter}
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
      where: { id: { in: productIds.filter((id): id is string => !!id) } },
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
      yesterdayRev > 0
        ? ((todayRev - yesterdayRev) / yesterdayRev) * 100
        : todayRev > 0 ? 100 : 0;

    const monthRev = monthSales._sum.total ?? 0;
    const lastMonthRev = lastMonthSales._sum.total ?? 0;

    return {
      timezone: tz,
      generatedAt: now.toISOString(),
      today: {
        revenue: todayRev,
        profit: todayRev - (todaySales._sum.costOfGoods ?? 0),
        orders: todaySales._count._all,
        paid: todaySales._sum.paidAmount ?? 0,
        credit: todaySales._sum.creditAmount ?? 0,
        growthPercent,
      },
      yesterday: {
        revenue: yesterdayRev,
        orders: yesterdaySales._count._all,
      },
      week: {
        revenue: weekSales._sum.total ?? 0,
        profit: (weekSales._sum.total ?? 0) - (weekSales._sum.costOfGoods ?? 0),
        orders: weekSales._count._all,
      },
      month: {
        revenue: monthRev,
        cogs: monthSales._sum.costOfGoods ?? 0,
        profit: monthRev - (monthSales._sum.costOfGoods ?? 0),
        orders: monthSales._count._all,
        lastMonthRevenue: lastMonthRev,
        growthPercent:
          lastMonthRev > 0
            ? ((monthRev - lastMonthRev) / lastMonthRev) * 100
            : monthRev > 0 ? 100 : 0,
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

  /**
   * "Paisa kahan hai" aur ghanton ka naqsha — dono ab
   * `BusinessPulseService` me hain, kyunke har industry ko bilkul
   * yehi chahiye. Retail sirf raasta deta hai.
   */
  moneyMap(user: AuthenticatedUser, shopId?: string) {
    return this.pulse.moneyMap(user, shopId);
  }

  salesByHour(user: AuthenticatedUser, shopId?: string, days = 1) {
    return this.pulse.salesByHour(user, shopId, days);
  }

  async slowMovers(user: AuthenticatedUser, days = 30) {
    const tz = await this.tzService.resolve(user.tenantId);
    const cutoff = subDaysTz(startOfDayTz(new Date(), tz), days, tz);

    // Products with no sales in `days` days
    const soldProductIds = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId: user.tenantId,
          status: { in: [...SOLD_STATUSES] },
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
        id: { notIn: soldIds.filter((id): id is string => !!id) },
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
