import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  DEFAULT_TZ,
  dateKeyTz,
  hourInTz,
  startOfDayTz,
  startOfMonthTz,
  subDaysTz,
  subMonthsTz,
} from '../../../common/helpers/business-time.helper';

/** Sirf mukammal sales ginti me — draft/cancel nahi. */
const SOLD_STATUSES = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;

@Injectable()
export class RetailDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser, shopId?: string) {
    // `Prisma.sql` / `Prisma.empty`, never a plain nested template string: a
    // nested `${...}` inside $queryRaw becomes a bound parameter, so the SQL
    // ends up with a stray placeholder where the AND clause should be.
    const shopFilter = shopId
      ? Prisma.sql`AND s."shopId" = ${shopId}`
      : Prisma.empty;

    // Har hadd dukaan ke waqt par — server UTC par chalta hai, is liye
    // `startOfDay(new Date())` se din 5 ghante pehle shuru ho jata tha.
    const now = new Date();
    const todayStart = startOfDayTz(now);
    const yesterdayStart = subDaysTz(todayStart, 1);
    const weekAgo = subDaysTz(todayStart, 6);
    const monthStart = startOfMonthTz(now);
    const lastMonthStart = startOfMonthTz(subMonthsTz(now, 1));

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
      timezone: DEFAULT_TZ,
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
   * "Paisa kahan hai" — ek nazar me poora hisaab.
   *
   * Dashboard par pehle sirf sale aur profit tha. Dukaan-daar ka asli
   * sawal is se bara hai: maal kitne ka para hai, kharcha kitna gaya,
   * supplier ka kitna dena hai, aur logon se kitna lena hai.
   */
  async moneyMap(user: AuthenticatedUser, shopId?: string) {
    const now = new Date();
    const todayStart = startOfDayTz(now);
    const monthStart = startOfMonthTz(now);
    const lastMonthStart = startOfMonthTz(subMonthsTz(now, 1));

    const saleWhere = {
      tenantId: user.tenantId,
      status: { in: [...SOLD_STATUSES] },
      ...(shopId && { shopId }),
    };
    // Purchase/Expense par shopId optional hai — sirf tab chaanein jab
    // shop chuni gayi ho, warna tenant ke poore aankre.
    const shopScope = shopId ? { shopId } : {};

    const [
      salesToday,
      salesMonth,
      purchasesToday,
      purchasesMonth,
      purchasesPending,
      supplierDue,
      expensesToday,
      expensesMonth,
      expensesLastMonth,
      expenseByCategory,
      inventory,
      deadStock,
      customerDue,
      openRegister,
      returnsMonth,
      damageMonth,
      recentPurchases,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { ...saleWhere, soldAt: { gte: todayStart } },
        _sum: { total: true, costOfGoods: true },
      }),
      this.prisma.sale.aggregate({
        where: { ...saleWhere, soldAt: { gte: monthStart } },
        _sum: { total: true, costOfGoods: true },
      }),

      // Maal kitne ka aaya
      this.prisma.purchase.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'RECEIVED',
          purchasedAt: { gte: todayStart },
          ...shopScope,
        },
        _sum: { total: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'RECEIVED',
          purchasedAt: { gte: monthStart },
          ...shopScope,
        },
        _sum: { total: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.count({
        where: {
          tenantId: user.tenantId,
          status: 'PENDING',
          ...shopScope,
        },
      }),
      // Supplier ka dena — ledger se nahi, supplier par jama hua balance
      this.prisma.supplier.aggregate({
        where: { tenantId: user.tenantId, outstandingDue: { gt: 0 } },
        _sum: { outstandingDue: true },
        _count: { _all: true },
      }),

      // Kharche
      this.prisma.expense.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'PAID',
          expenseDate: { gte: todayStart },
          ...shopScope,
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'PAID',
          expenseDate: { gte: monthStart },
          ...shopScope,
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'PAID',
          expenseDate: { gte: lastMonthStart, lt: monthStart },
          ...shopScope,
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: {
          tenantId: user.tenantId,
          status: 'PAID',
          expenseDate: { gte: monthStart },
          ...shopScope,
        },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 8,
      }),

      // Godown me kitne ka maal para hai
      this.prisma.product.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { stock: true, costPrice: true, price: true },
      }),
      // 60 din se na bikne wala maal — phansa hua paisa
      this.prisma.$queryRaw<Array<{ value: number; count: number }>>`
        SELECT
          COALESCE(SUM(p.stock * p."costPrice"), 0)::float as value,
          COUNT(*)::int as count
        FROM "Product" p
        WHERE p."tenantId" = ${user.tenantId}
          AND p."isActive" = true
          AND p.stock > 0
          AND NOT EXISTS (
            SELECT 1 FROM "SaleItem" si
            JOIN "Sale" s ON s.id = si."saleId"
            WHERE si."productId" = p.id
              AND s.status IN ('COMPLETED', 'PARTIALLY_RETURNED')
              AND s."soldAt" >= ${subDaysTz(todayStart, 60)}
          )
      `,

      // Logon se lena
      this.prisma.customer.aggregate({
        where: { tenantId: user.tenantId, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: { _all: true },
      }),

      this.prisma.cashRegister.findFirst({
        where: { tenantId: user.tenantId, status: 'OPEN', ...shopScope },
        select: {
          id: true, registerNumber: true, openingBalance: true,
          expectedBalance: true, totalCashIn: true, totalCashOut: true,
          openedAt: true,
        },
      }),

      this.prisma.saleReturn.aggregate({
        where: { tenantId: user.tenantId, returnedAt: { gte: monthStart } },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
      this.prisma.damageLog.aggregate({
        where: { tenantId: user.tenantId, createdAt: { gte: monthStart } },
        _sum: { netLoss: true },
        _count: { _all: true },
      }),

      this.prisma.purchase.findMany({
        where: { tenantId: user.tenantId, ...shopScope },
        orderBy: { purchasedAt: 'desc' },
        take: 6,
        select: {
          id: true, purchaseNumber: true, total: true, paidAmount: true,
          status: true, purchasedAt: true,
          supplier: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Expense categories ke naam alag query me — groupBy relation nahi laata
    const categoryIds = expenseByCategory
      .map((e) => e.categoryId)
      .filter((id): id is string => !!id);
    const expenseCategories = categoryIds.length
      ? await this.prisma.expenseCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, color: true, icon: true },
        })
      : [];
    const catMap = new Map(expenseCategories.map((c) => [c.id, c]));

    const stockAtCost = inventory.reduce((sum, p) => sum + p.costPrice * p.stock, 0);
    const stockAtRetail = inventory.reduce((sum, p) => sum + p.price * p.stock, 0);
    const stockUnits = inventory.reduce((sum, p) => sum + p.stock, 0);

    const revToday = salesToday._sum.total ?? 0;
    const cogsToday = salesToday._sum.costOfGoods ?? 0;
    const expToday = expensesToday._sum.amount ?? 0;

    const revMonth = salesMonth._sum.total ?? 0;
    const cogsMonth = salesMonth._sum.costOfGoods ?? 0;
    const expMonth = expensesMonth._sum.amount ?? 0;
    const grossMonth = revMonth - cogsMonth;
    const netMonth = grossMonth - expMonth;

    const dead = deadStock[0] ?? { value: 0, count: 0 };

    return {
      timezone: DEFAULT_TZ,
      generatedAt: now.toISOString(),

      profit: {
        todayGross: revToday - cogsToday,
        todayNet: revToday - cogsToday - expToday,
        monthGross: grossMonth,
        monthNet: netMonth,
        monthMarginPct: revMonth > 0 ? (netMonth / revMonth) * 100 : 0,
        monthRevenue: revMonth,
        monthCogs: cogsMonth,
        monthExpenses: expMonth,
      },

      purchases: {
        todayTotal: purchasesToday._sum.total ?? 0,
        todayCount: purchasesToday._count._all,
        monthTotal: purchasesMonth._sum.total ?? 0,
        monthPaid: purchasesMonth._sum.paidAmount ?? 0,
        monthUnpaid:
          (purchasesMonth._sum.total ?? 0) - (purchasesMonth._sum.paidAmount ?? 0),
        monthCount: purchasesMonth._count._all,
        pendingCount: purchasesPending,
        recent: recentPurchases,
      },

      payable: {
        total: supplierDue._sum.outstandingDue ?? 0,
        supplierCount: supplierDue._count._all,
      },

      receivable: {
        total: customerDue._sum.balance ?? 0,
        customerCount: customerDue._count._all,
      },

      expenses: {
        today: expToday,
        todayCount: expensesToday._count._all,
        month: expMonth,
        monthCount: expensesMonth._count._all,
        lastMonth: expensesLastMonth._sum.amount ?? 0,
        byCategory: expenseByCategory.map((row) => {
          const cat = row.categoryId ? catMap.get(row.categoryId) : null;
          return {
            categoryId: row.categoryId,
            name: cat?.name ?? 'Baghair category',
            color: cat?.color ?? '#94a3b8',
            icon: cat?.icon ?? null,
            amount: row._sum.amount ?? 0,
            count: row._count._all,
          };
        }),
      },

      inventory: {
        valueAtCost: stockAtCost,
        valueAtRetail: stockAtRetail,
        potentialProfit: stockAtRetail - stockAtCost,
        totalUnits: stockUnits,
        productCount: inventory.length,
        deadStockValue: Number(dead.value) || 0,
        deadStockCount: Number(dead.count) || 0,
      },

      cash: {
        registerOpen: !!openRegister,
        register: openRegister,
        expected: openRegister?.expectedBalance ?? 0,
        opening: openRegister?.openingBalance ?? 0,
      },

      losses: {
        returnsMonth: returnsMonth._sum.refundAmount ?? 0,
        returnsCount: returnsMonth._count._all,
        damageMonth: damageMonth._sum.netLoss ?? 0,
        damageCount: damageMonth._count._all,
      },
    };
  }

  /**
   * Ghante ke hisaab se sale.
   *
   * Ghanta dukaan ke timezone se nikalta hai. Pehle `getHours()` server
   * ke waqt par chalta tha — UTC par — to raat 8 baje ka rush chart me
   * dopahar 3 baje dikhta tha. Ab jo ghanta dukaan-daar ki ghari par
   * tha, wohi chart par hai.
   *
   * @param days 1 = sirf aaj. Is se zyada = utne dinon ka rozana ausat,
   *             taake "asal me kaunsa waqt masroof hai" saaf nazar aaye.
   */
  async salesByHour(user: AuthenticatedUser, shopId?: string, days = 1) {
    const span = Math.min(Math.max(Math.trunc(days) || 1, 1), 90);
    const now = new Date();
    const todayStart = startOfDayTz(now);
    const rangeStart = span > 1 ? subDaysTz(todayStart, span - 1) : todayStart;

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: [...SOLD_STATUSES] },
        soldAt: { gte: rangeStart },
        ...(shopId && { shopId }),
      },
      select: { total: true, soldAt: true },
    });

    const buckets: Record<number, { hour: number; total: number; count: number }> = {};
    for (let h = 0; h < 24; h++) {
      buckets[h] = { hour: h, total: 0, count: 0 };
    }

    // Ausat nikalne ke liye sirf wohi din ginein jin me koi sale hui —
    // dukaan band wale din ausat ko be-wajah neecha kar dete hain.
    const activeDays = new Set<string>();

    for (const s of sales) {
      const hour = hourInTz(s.soldAt);
      buckets[hour].total += s.total;
      buckets[hour].count += 1;
      activeDays.add(dateKeyTz(s.soldAt));
    }

    const divisor = span > 1 ? Math.max(activeDays.size, 1) : 1;
    const hours = Object.values(buckets).map((b) => ({
      hour: b.hour,
      total: span > 1 ? b.total / divisor : b.total,
      count: span > 1 ? b.count / divisor : b.count,
      rawTotal: b.total,
      rawCount: b.count,
    }));

    const peak = hours.reduce((best, h) => (h.total > best.total ? h : best), hours[0]);
    const grandTotal = hours.reduce((sum, h) => sum + h.total, 0);

    return {
      timezone: DEFAULT_TZ,
      days: span,
      daysCounted: divisor,
      rangeStart: rangeStart.toISOString(),
      generatedAt: now.toISOString(),
      currentHour: hourInTz(now),
      peakHour: grandTotal > 0 ? peak.hour : null,
      peakTotal: grandTotal > 0 ? peak.total : 0,
      total: grandTotal,
      hours,
    };
  }

  async slowMovers(user: AuthenticatedUser, days = 30) {
    const cutoff = subDaysTz(startOfDayTz(new Date()), days);

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
