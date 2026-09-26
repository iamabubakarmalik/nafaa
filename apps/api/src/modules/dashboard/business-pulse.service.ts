import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  dateKeyTz, hourInTz, startOfDayTz, startOfMonthTz,
  subDaysTz, subMonthsTz,
} from '../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';

/* ═════════════════════════════════════════════════════════════
   BUSINESS PULSE — har dukaan ke wohi sawal
   ─────────────────────────────────────────────────────────────
   Dukaan bakery ho ya kiryana, malik ke sawal wohi hain:
   maal kitne ka para hai, kharcha kitna gaya, supplier ka kitna
   dena hai, logon se kitna lena hai, aur dukaan kis waqt
   masroof hoti hai.

   Pehle ye hisaab har industry ke apne dashboard service me
   dobara likha jata tha. Nateeja ye ke timezone ka bug bhi har
   jagah alag alag theek hota tha, aur "kharcha" ki tareef bhi
   har jagah thori si alag ho jati thi.

   Ab ek jagah. Industry apna khaas hissa (cake orders, freshness,
   production) apne service me rakhti hai, aur ye mushtarak hisaab
   yahan se leti hai.
   ═════════════════════════════════════════════════════════════ */

/** Sirf mukammal sales ginti me — draft/cancel nahi. */
const SOLD_STATUSES = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;

@Injectable()
export class BusinessPulseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /**
   * "Paisa kahan hai" — ek nazar me poora hisaab.
   *
   * Dashboard par pehle sirf sale aur profit tha. Dukaan-daar ka asli
   * sawal is se bara hai: maal kitne ka para hai, kharcha kitna gaya,
   * supplier ka kitna dena hai, aur logon se kitna lena hai.
   */
  async moneyMap(user: AuthenticatedUser, shopId?: string) {
    // Dukaan ka apna waqt — Karachi wali Karachi par, Tehran wali
    // Tehran par. Server kahin bhi ho, farq nahi parta.
    const tz = await this.tz.resolve(user.tenantId);
    const now = new Date();
    const todayStart = startOfDayTz(now, tz);
    const monthStart = startOfMonthTz(now, tz);
    const lastMonthStart = startOfMonthTz(subMonthsTz(now, 1, tz), tz);

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
              AND s."soldAt" >= ${subDaysTz(todayStart, 60, tz)}
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
      timezone: tz,
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
    const tz = await this.tz.resolve(user.tenantId);
    const span = Math.min(Math.max(Math.trunc(days) || 1, 1), 90);
    const now = new Date();
    const todayStart = startOfDayTz(now, tz);
    const rangeStart = span > 1 ? subDaysTz(todayStart, span - 1, tz) : todayStart;

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
      const hour = hourInTz(s.soldAt, tz);
      buckets[hour].total += s.total;
      buckets[hour].count += 1;
      activeDays.add(dateKeyTz(s.soldAt, tz));
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
      timezone: tz,
      days: span,
      daysCounted: divisor,
      rangeStart: rangeStart.toISOString(),
      generatedAt: now.toISOString(),
      currentHour: hourInTz(now, tz),
      peakHour: grandTotal > 0 ? peak.hour : null,
      peakTotal: grandTotal > 0 ? peak.total : 0,
      total: grandTotal,
      hours,
    };
  }
}
