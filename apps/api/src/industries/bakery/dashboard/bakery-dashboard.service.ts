import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BusinessPulseService } from '../../../modules/dashboard/business-pulse.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import {
  addDaysTz, endOfDayTz, subDaysTz,
  startOfBusinessDayTz,
  endOfBusinessDayTz,
  startOfBusinessMonthTz,
  tzParts
} from '../../../common/helpers/business-time.helper';
import { profitParts, saleFigures } from '../../../common/helpers/business-math.helper';

/** Counter par bikne wali sales — draft/cancel nahi. */
const SOLD_STATUSES = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;

@Injectable()
export class BakeryDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pulse: BusinessPulseService,
    private readonly tzService: TenantTimezoneService,
  ) {}

  async overview(user: AuthenticatedUser, shopId?: string) {
    // Har hadd DUKAAN ke apne waqt par. Pehle `startOfDay` server ke
    // UTC par chalta tha: bakery ka din subah 5 baje shuru hota tha
    // aur subah-subah bikne wale nashte ki sari sales "kal" ke khate
    // me chali jati thin. Timezone tenant ka apna hai.
    const { tz, dayStartHour } = await this.tzService.clock(user.tenantId);
    const now = new Date();
    /* Karobari din: dukaan ka apna ghanta. Jo dukaan raat 2 baje band
       hoti hai wo 4 rakhti hai, phir raat 1 baje ki bikri usi din me
       girti hai jis din dukaan khuli thi. 0 (default) par hisab bilkul
       wohi rehta hai jo pehle tha — kisi chalti dukaan ka kuch nahi
       badalta jab tak wo khud na badle. */
    const todayStart = startOfBusinessDayTz(now, tz, dayStartHour);
    const todayEnd = endOfBusinessDayTz(now, tz, dayStartHour);
    const tomorrowEnd = endOfDayTz(addDaysTz(now, 1, tz), tz);
    const weekEnd = endOfDayTz(addDaysTz(now, 7, tz), tz);
    const _m = tzParts(todayStart, tz);
    const monthStart = startOfBusinessMonthTz(_m.year, _m.month, tz, dayStartHour);
    const monthAgo = subDaysTz(todayStart, 30, tz);
    const weekAgo = subDaysTz(todayStart, 6, tz);
    const yesterdayStart = subDaysTz(todayStart, 1, tz);

    const math = { tenantId: user.tenantId, shopId: shopId ?? null };

    const [
      totalProducts, totalIngredients, criticalIngredients, lowStock,
      todayOrders, tomorrowOrders, weekOrders, urgentOrders,
      inProduction, ready, todayRevenue, monthlyRevenue,
      activeBulkOrders,
      freshnessSummary,
      counterToday,
      counterYesterday,
      counterWeek,
      counterMonth,
      topCounterProducts,
    ] = await Promise.all([
      this.prisma.bakeryProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.bakeryIngredient.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.bakeryIngredient.count({ where: { tenantId: user.tenantId, isActive: true, isCritical: true } }),
      this.prisma.bakeryIngredient.findMany({
        where: { tenantId: user.tenantId, isActive: true },
      }).then((all) => all.filter((i) => i.currentStock <= i.minStock).length),

      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          neededBy: { gte: todayStart, lte: todayEnd },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          neededBy: { gte: todayEnd, lte: tomorrowEnd },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          neededBy: { gte: new Date(), lte: weekEnd },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          neededBy: { gte: new Date(), lte: new Date(Date.now() + 6 * 60 * 60 * 1000) },
          status: { notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          status: { in: ['IN_PRODUCTION', 'BAKING', 'DECORATING', 'QUALITY_CHECK'] },
        },
      }),
      this.prisma.bakeryCakeOrder.count({
        where: {
          tenantId: user.tenantId,
          status: 'READY',
        },
      }),
      this.prisma.bakeryCakeOrder.aggregate({
        where: {
          tenantId: user.tenantId,
          deliveredAt: { gte: todayStart, lte: todayEnd },
          status: 'DELIVERED',
        },
        _sum: { total: true, paidAmount: true },
      }),
      this.prisma.bakeryCakeOrder.aggregate({
        where: {
          tenantId: user.tenantId,
          deliveredAt: { gte: monthAgo },
          status: 'DELIVERED',
        },
        _sum: { total: true, paidAmount: true },
      }),
      this.prisma.bakeryBulkOrder.count({
        where: {
          tenantId: user.tenantId,
          status: { notIn: ['CANCELLED', 'DELIVERED'] },
        },
      }),
      this.getFreshnessSummary(user),

      /* ── Counter ki sales ──────────────────────────────────────
         Bakery ka dashboard ab tak sirf cake orders ginta tha. Magar
         bakery ki rozana kamai counter se aati hai — rusk, biscuit,
         patties, bread. Malik ko "aaj kitna hua" poochna ho to us me
         wo sab shamil hona chahiye, sirf cake ka order nahi. */
      // Shared sale math (net of returns, cost of what was kept), so these match the day book and reports.
      saleFigures(this.prisma, math, { gte: todayStart }),
      saleFigures(this.prisma, math, { gte: yesterdayStart, lt: todayStart }),
      saleFigures(this.prisma, math, { gte: weekAgo }),
      saleFigures(this.prisma, math, { gte: monthStart }),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            tenantId: user.tenantId,
            status: { in: [...SOLD_STATUSES] },
            soldAt: { gte: weekAgo },
            ...(shopId && { shopId }),
          },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 8,
      }),
    ]);

    // Counter ke top products ke naam alag query me — groupBy relation
    // nahi laata.
    const counterProductIds = topCounterProducts
      .map((t) => t.productId)
      .filter((id): id is string => !!id);
    const counterProducts = counterProductIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: counterProductIds } },
          select: {
            id: true, name: true, unit: true, price: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        })
      : [];
    const counterProductMap = new Map(counterProducts.map((p) => [p.id, p]));

    // Upcoming cake orders
    const upcoming = await this.prisma.bakeryCakeOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED'] },
        neededBy: { gte: new Date(), lte: weekEnd },
      },
      orderBy: { neededBy: 'asc' },
      take: 10,
    });

    // Top selling products (30 days)
    const topSelling = await this.prisma.bakeryCakeOrder.groupBy({
      by: ['productName'],
      where: {
        tenantId: user.tenantId,
        deliveredAt: { gte: monthAgo },
        status: 'DELIVERED',
      },
      _sum: { total: true },
      _count: { _all: true },
    });
    const top = topSelling
      .filter((t) => t.productName)
      .sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0))
      .slice(0, 5);

    // By category
    const byCategory = await this.prisma.bakeryProductProfile.groupBy({
      by: ['category'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
      _sum: { totalOrders: true, totalRevenue: true },
    });

    // By occasion
    const byOccasion = await this.prisma.bakeryCakeOrder.groupBy({
      by: ['occasion'],
      where: {
        tenantId: user.tenantId,
        createdAt: { gte: monthAgo },
      },
      _count: { _all: true },
    });

    // Headline profit on the shop's khata basis, with the in-hand / udhaar split (business-math.helper).
    const [partsToday, partsWeek, partsMonth] = await Promise.all([
      profitParts(this.prisma, math, { gte: todayStart }),
      profitParts(this.prisma, math, { gte: weekAgo }),
      profitParts(this.prisma, math, { gte: monthStart }),
    ]);

    const revToday = counterToday.net;
    const revYesterday = counterYesterday.net;
    const revMonth = counterMonth.net;

    return {
      timezone: tz,
      generatedAt: now.toISOString(),

      /* Counter ki bikri — cake orders se bilkul alag cheez. Dono ko
         jorne se "aaj ki kamai" do dafa gini jati, is liye alag. */
      counter: {
        today: revToday,
        todayOrders: counterToday.bills,
        todayProfit: partsToday.split.headline,
        todaySplit: partsToday.split,
        yesterday: revYesterday,
        yesterdayOrders: counterYesterday.bills,
        growthPercent:
          revYesterday > 0
            ? ((revToday - revYesterday) / revYesterday) * 100
            : revToday > 0 ? 100 : 0,
        week: counterWeek.net,
        weekProfit: partsWeek.split.headline,
        month: revMonth,
        monthOrders: counterMonth.bills,
        monthProfit: partsMonth.split.headline,
        monthSplit: partsMonth.split,
        monthOtherIncome: partsMonth.otherIncome,
        topProducts: topCounterProducts.map((t) => ({
          productId: t.productId,
          product: t.productId ? counterProductMap.get(t.productId) : undefined,
          quantity: t._sum.quantity ?? 0,
          revenue: t._sum.total ?? 0,
        })),
      },

      totals: {
        totalProducts,
        totalIngredients,
        criticalIngredients,
        lowStockIngredients: lowStock,
        activeBulkOrders,
      },
      operations: {
        todayOrders,
        tomorrowOrders,
        weekOrders,
        urgentOrders,
        inProduction,
        ready,
      },
      revenue: {
        today: todayRevenue._sum.total ?? 0,
        todayCollected: todayRevenue._sum.paidAmount ?? 0,
        monthly: monthlyRevenue._sum.total ?? 0,
        monthlyCollected: monthlyRevenue._sum.paidAmount ?? 0,
      },
      freshness: freshnessSummary,
      upcoming,
      topSelling: top,
      byCategory,
      byOccasion,
    };
  }

  /**
   * Ghanton ka naqsha aur paise ka hisaab — dono mushtarak service se.
   * Bakery ka apna kuch nahi, is liye seedha raasta.
   */
  salesByHour(user: AuthenticatedUser, shopId?: string, days = 1) {
    return this.pulse.salesByHour(user, shopId, days);
  }

  moneyMap(user: AuthenticatedUser, shopId?: string) {
    return this.pulse.moneyMap(user, shopId);
  }

  private async getFreshnessSummary(user: AuthenticatedUser) {
    const [fresh, dayOld, nearExpiry, expired] = await Promise.all([
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'FRESH', currentQty: { gt: 0 } } }),
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'DAY_OLD', currentQty: { gt: 0 } } }),
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'NEAR_EXPIRY', currentQty: { gt: 0 } } }),
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'EXPIRED', currentQty: { gt: 0 } } }),
    ]);
    return { fresh, dayOld, nearExpiry, expired };
  }
}
