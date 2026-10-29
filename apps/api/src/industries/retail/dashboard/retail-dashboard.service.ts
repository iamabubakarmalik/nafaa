/**
 * Retail dashboard figures. Sales numbers come from the shared business-math
 * helper (net of returns, cash in = paid − change, branch-scoped) so they
 * match the Reports centre, Profit report and the main dashboard. Alerts are
 * scoped to the branch in view; low stock and reorders are counted live from
 * the low-stock service, so they match the Low stock page.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  startOfDayTz,
  subDaysTz,
  subMonthsTz,
  startOfBusinessDayTz,
  startOfBusinessMonthTz,
  tzParts,
} from '../../../common/helpers/business-time.helper';
import {
  KEPT_QTY,
  LINE_REVENUE,
  billMathCte,
  liveSaleSql,
  profitParts,
  saleFigures,
  type MathScope,
} from '../../../common/helpers/business-math.helper';
import { ShopScope } from '../../../common/shop-scope';
import { BusinessPulseService } from '../../../modules/dashboard/business-pulse.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { LowStockService } from '../../../modules/inventory/low-stock/low-stock.service';

/** Bills that still count for "what sold" lists (not voided, not fully returned). */
const SOLD_STATUSES = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;

const growth = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : now > 0 ? 100 : 0);

@Injectable()
export class RetailDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pulse: BusinessPulseService,
    private readonly tzService: TenantTimezoneService,
    private readonly lowStock: LowStockService,
  ) {}

  async overview(user: AuthenticatedUser, shopId?: string) {
    // Business days in the shop's own timezone and day-start hour.
    const { tz, dayStartHour } = await this.tzService.clock(user.tenantId);
    const now = new Date();
    const todayStart = startOfBusinessDayTz(now, tz, dayStartHour);
    const yesterdayStart = subDaysTz(todayStart, 1, tz);
    const weekAgo = subDaysTz(todayStart, 6, tz);
    const _m = tzParts(todayStart, tz);
    const monthStart = startOfBusinessMonthTz(_m.year, _m.month, tz, dayStartHour);
    const _lm = tzParts(subMonthsTz(todayStart, 1, tz), tz);
    const lastMonthStart = startOfBusinessMonthTz(_lm.year, _lm.month, tz, dayStartHour);

    const math: MathScope = { tenantId: user.tenantId, shopId: shopId ?? null };
    const weekWhere = liveSaleSql(math, { gte: weekAgo });
    const todayWhere = liveSaleSql(math, { gte: todayStart });

    const [
      today, yesterday, week, month, lastMonth,
      topProducts, categoryPerformance, stockAlerts, damagesToday,
      partsToday, partsWeek, partsMonth,
    ] = await Promise.all([
      saleFigures(this.prisma, math, { gte: todayStart }),
      saleFigures(this.prisma, math, { gte: yesterdayStart, lt: todayStart }),
      saleFigures(this.prisma, math, { gte: weekAgo }),
      saleFigures(this.prisma, math, { gte: monthStart }),
      saleFigures(this.prisma, math, { gte: lastMonthStart, lt: monthStart }),

      // Today's best sellers by what they earned after discounts and returns.
      this.prisma.$queryRaw<Array<{ productId: string | null; quantity: number; total: number }>>`
        WITH ${billMathCte(todayWhere)}
        SELECT si."productId" AS "productId",
          COALESCE(SUM(${KEPT_QTY}), 0)::float8 AS quantity,
          COALESCE(SUM(${LINE_REVENUE}), 0)::float8 AS total
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
        WHERE ${todayWhere} AND si."productId" IS NOT NULL
        GROUP BY 1
        HAVING COALESCE(SUM(${KEPT_QTY}), 0) > 0
        ORDER BY total DESC
        LIMIT 10`,

      // Category sales of the last 7 business days, net of discounts and returns.
      this.prisma.$queryRaw<Array<{ categoryId: string | null; name: string | null; total: number; count: number }>>`
        WITH ${billMathCte(weekWhere)}
        SELECT c.id AS "categoryId", c.name,
          COALESCE(SUM(${LINE_REVENUE}), 0)::float8 AS total,
          COUNT(DISTINCT si.id)::int AS count
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        JOIN bm ON bm.id = s.id
        JOIN "Product" p ON p.id = si."productId"
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        WHERE ${weekWhere}
        GROUP BY c.id, c.name
        ORDER BY total DESC
        LIMIT 8`,

      this.stockAlerts(user, shopId),

      // Damage noted today (rejected ones left out); the loss counts once approved, as in the reports.
      this.prisma.damageLog.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId, createdAt: { gte: todayStart }, status: { not: 'REJECTED' }, ...(shopId && { shopId }) },
        _sum: { netLoss: true },
        _count: { _all: true },
      }),

      // Headline profit on the shop's khata basis (business-math.helper, "Khata profit").
      profitParts(this.prisma, math, { gte: todayStart }),
      profitParts(this.prisma, math, { gte: weekAgo }),
      profitParts(this.prisma, math, { gte: monthStart }),
    ]);

    const productIds = topProducts.map((p) => p.productId).filter((id): id is string => !!id);
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { tenantId: user.tenantId, id: { in: productIds } },
          include: { images: { where: { isPrimary: true }, take: 1 }, category: true },
        })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));
    const topProductsEnriched = topProducts.map((tp) => ({
      productId: tp.productId,
      _sum: { quantity: tp.quantity, total: Math.round(tp.total * 100) / 100 },
      product: tp.productId ? byId.get(tp.productId) : undefined,
    }));

    return {
      timezone: tz,
      generatedAt: now.toISOString(),
      today: {
        revenue: today.net,
        profit: partsToday.split.headline,
        split: partsToday.split,
        orders: today.bills,
        paid: today.cashIn,
        credit: today.credit,
        growthPercent: growth(today.net, yesterday.net),
      },
      yesterday: {
        revenue: yesterday.net,
        orders: yesterday.bills,
      },
      week: {
        revenue: week.net,
        profit: partsWeek.split.headline,
        orders: week.bills,
      },
      month: {
        revenue: month.net,
        cogs: month.cost,
        profit: partsMonth.split.headline,
        split: partsMonth.split,
        orders: month.bills,
        lastMonthRevenue: lastMonth.net,
        growthPercent: growth(month.net, lastMonth.net),
      },
      topProducts: topProductsEnriched,
      categoryPerformance: categoryPerformance.map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 })),
      alerts: {
        lowStockCount: stockAlerts.low,
        damagesToday: damagesToday.reduce((n, d) => n + d._count._all, 0),
        damageLossToday: Math.round(damagesToday.filter((d) => d.status === 'APPROVED' || d.status === 'WRITTEN_OFF').reduce((n, d) => n + (d._sum.netLoss ?? 0), 0) * 100) / 100,
        pendingReorders: stockAlerts.reorders,
      },
    };
  }

  /**
   * Low-stock and reorder counts from the same rows as the Low stock page, so
   * the tiles match that page for one branch and for all branches (where a
   * product empty in one branch counts there even if another has plenty).
   */
  private async stockAlerts(user: AuthenticatedUser, shopId?: string): Promise<{ low: number; reorders: number }> {
    try {
      const scope = new ShopScope(shopId ?? null, !shopId);
      const rows = (await this.lowStock.rows(user, scope, this.lowStock.settings())).filter((r) => !r.ignored);
      return {
        low: rows.filter((r) => r.status === 'out' || r.status === 'low').length,
        reorders: rows.filter((r) => r.suggestQty > 0 && !r.made && (r.status === 'out' || r.status === 'low' || r.status === 'soon')).length,
      };
    } catch {
      return { low: 0, reorders: 0 };
    }
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
