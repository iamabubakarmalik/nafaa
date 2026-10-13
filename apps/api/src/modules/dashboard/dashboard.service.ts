import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  dateKeyTz, hourInTz, subDaysTz, subMonthsTz, startOfBusinessDayTz, startOfBusinessMonthTz, tzParts,
} from '../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { computeLiveCash } from '../../common/helpers/live-cash.helper';
import {
  LINE_REVENUE, LIVE_BILL, billMathCte, liveSaleSql, netProfit, paidExpenseWhere, saleFigures, saleFiguresBy, writeOffs,
} from '../../common/helpers/business-math.helper';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tzService: TenantTimezoneService,
  ) {}

  async getOverview(tenantId: string, shopId?: string) {
    // Sab haddein DUKAAN ke apne waqt par, server ke waqt par nahi.
    // Server UTC par chalta hai: bina is ke "aaj" Pakistan me subah 5
    // baje shuru hota tha aur subah ki sales kal ke khate me chali
    // jati thin. Aur timezone har tenant ka apna hai — Nafaa sirf
    // Pakistan me nahi chalta.
    const { tz, dayStartHour } = await this.tzService.clock(tenantId);
    const now = new Date();
    /* Karobari din: dukaan ka apna ghanta. Jo dukaan raat 2 baje band
       hoti hai wo 4 rakhti hai, phir raat 1 baje ki bikri usi din me
       girti hai jis din dukaan khuli thi. 0 (default) par hisab bilkul
       wohi rehta hai jo pehle tha — kisi chalti dukaan ka kuch nahi
       badalta jab tak wo khud na badle. */
    const todayStart = startOfBusinessDayTz(now, tz, dayStartHour);
    const yesterdayStart = subDaysTz(todayStart, 1, tz);
    const yesterdayEnd = new Date(todayStart.getTime() - 1);
    const _m = tzParts(todayStart, tz);
    const monthStart = startOfBusinessMonthTz(_m.year, _m.month, tz, dayStartHour);
    const _lm = tzParts(subMonthsTz(todayStart, 1, tz), tz);
    const lastMonthStart = startOfBusinessMonthTz(_lm.year, _lm.month, tz, dayStartHour);
    const thirtyDaysAgo = subDaysTz(todayStart, 29, tz);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessType: true, name: true, defaultUnit: true },
    });

    // Shop scope filter — applied to sales/registers/transfers
    const shopFilter = shopId ? { shopId } : {};
    const math = { tenantId, shopId };
    // A return belongs to the branch it was made at; older rows fall back to the bill's branch.
    const returnShop = shopId ? { OR: [{ shopId }, { shopId: null, sale: { shopId } }] } : {};
    const businessDay = Prisma.sql`to_char(((s."soldAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}) - make_interval(hours => ${dayStartHour}::int), 'YYYY-MM-DD')`;

    let shopContext: any = null;
    if (shopId) {
      shopContext = await this.prisma.shop.findFirst({
        where: { id: shopId, tenantId },
        select: { id: true, name: true, isMain: true, type: true, address: true },
      });
    }

    // Product-level: for a specific shop we use ShopStock; otherwise global Product.stock
    const useShopStock = !!shopId;

    const [
      products,
      totalUsers,
      recentProducts,
      lowStockList,
      salesTodayAgg,
      salesYesterdayAgg,
      ordersToday,
      ordersYesterday,
      salesMonthAgg,
      salesLastMonthAgg,
      ordersMonth,
      totalOrders,
      totalRevenue,
      recentSales,
      totalSuppliers,
      totalCustomers,
      totalCategories,
      udhaarAgg,
      purchasesTodayAgg,
      purchasesMonthAgg,
      expensesTodayAgg,
      expensesMonthAgg,
      dailySales,
      topProductsRaw,
      currentRegister,
      carpetRollsAgg,
      carpetCutPiecesAgg,
      carpetRollsLow,
      carpetActiveRolls,
      imeisAgg,
      imeisSoldToday,
      usedPhonesInStock,
      repairTicketsOpen,
      emiActivePlans,
      returnsToday,
      returnsMonth,
      pendingTransfers,
      salesTodayHourly,
      paymentMethodAgg,
      lostToday,
      lostMonth,
    ] = await Promise.all([
      // Products — global list (name, price, stock, image) — always tenant-level
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true, name: true, stock: true, lowStockAlert: true,
          costPrice: true, price: true, unit: true, sku: true,
        },
      }),
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, name: true, sku: true, stock: true, price: true,
          unit: true, createdAt: true,
          images: { take: 1, select: { url: true } },
        },
      }),
      useShopStock
        ? // Shop-specific low stock
          this.prisma.shopStock.findMany({
            where: {
              shopId,
              isActive: true,
              stock: { lte: 10 },
            },
            orderBy: { stock: 'asc' },
            take: 8,
            include: {
              product: {
                select: {
                  id: true, name: true, unit: true, price: true, lowStockAlert: true,
                  images: { take: 1, select: { url: true } },
                },
              },
            },
          }).then((rows) => rows.map((r) => ({
            id: r.product.id,
            name: r.product.name,
            stock: r.stock,
            lowStockAlert: r.lowStockAlert,
            unit: r.product.unit,
            price: r.product.price,
            images: r.product.images,
          })))
        : this.prisma.product.findMany({
            where: { tenantId, isActive: true, stock: { lte: 10 } },
            orderBy: { stock: 'asc' },
            take: 8,
            select: {
              id: true, name: true, stock: true, lowStockAlert: true,
              unit: true, price: true,
              images: { take: 1, select: { url: true } },
            },
          }),
      saleFigures(this.prisma, math, { gte: todayStart }),
      saleFigures(this.prisma, math, { gte: yesterdayStart, lt: todayStart }),
      this.prisma.sale.count({
        where: {
          tenantId,
          status: LIVE_BILL,
          soldAt: { gte: todayStart },
          ...shopFilter,
        },
      }),
      this.prisma.sale.count({
        where: {
          tenantId,
          status: LIVE_BILL,
          soldAt: { gte: yesterdayStart, lte: yesterdayEnd },
          ...shopFilter,
        },
      }),
      saleFigures(this.prisma, math, { gte: monthStart }),
      saleFigures(this.prisma, math, { gte: lastMonthStart, lt: monthStart }),
      this.prisma.sale.count({
        where: {
          tenantId,
          status: LIVE_BILL,
          soldAt: { gte: monthStart },
          ...shopFilter,
        },
      }),
      this.prisma.sale.count({
        where: {
          tenantId,
          status: LIVE_BILL,
          ...shopFilter,
        },
      }),
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          status: LIVE_BILL,
          ...shopFilter,
        },
        _sum: { total: true, refundedAmount: true },
      }),
      this.prisma.sale.findMany({
        where: {
          tenantId,
          status: LIVE_BILL,
          ...shopFilter,
        },
        orderBy: { soldAt: 'desc' },
        take: 8,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, fullName: true } },
          shop: { select: { id: true, name: true } },
        },
      }),
      this.prisma.supplier.count({ where: { tenantId, isActive: true } }),
      this.prisma.customer.count({ where: { tenantId, isActive: true } }),
      this.prisma.category.count({ where: { tenantId, isActive: true } }),
      this.prisma.customer.aggregate({
        where: { tenantId, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: { tenantId, status: { in: ['RECEIVED', 'PARTIAL'] }, purchasedAt: { gte: todayStart } },
        _sum: { receivedValue: true },
        _count: { _all: true },
      }),
      this.prisma.purchase.aggregate({
        where: { tenantId, status: { in: ['RECEIVED', 'PARTIAL'] }, purchasedAt: { gte: monthStart } },
        _sum: { receivedValue: true },
      }),
      this.prisma.expense.aggregate({
        where: paidExpenseWhere(math, { gte: todayStart }),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: paidExpenseWhere(math, { gte: monthStart }),
        _sum: { amount: true },
      }),
      // One pass over 30 business days serves both trend charts.
      saleFiguresBy(this.prisma, liveSaleSql(math, { gte: thirtyDaysAgo }), businessDay),
      this.topProducts(math, monthStart),
      this.prisma.cashRegister.findFirst({
        where: {
          tenantId,
          status: 'OPEN',
          ...shopFilter,
        },
        select: {
          id: true, registerNumber: true, openingBalance: true,
          expectedBalance: true, totalCashIn: true, totalCashOut: true,
          openedAt: true, shopId: true,
        },
      }),
      this.prisma.carpetRoll.aggregate({
        where: { tenantId, status: 'ACTIVE', ...shopFilter },
        _sum: { remainingSqft: true, remainingLengthFt: true },
        _count: { _all: true },
      }),
      this.prisma.carpetCutPiece.aggregate({
        where: { tenantId, status: 'AVAILABLE', ...shopFilter },
        _sum: { totalSqft: true, salePrice: true },
        _count: { _all: true },
      }),
      this.prisma.carpetRoll.findMany({
        where: {
          tenantId, status: 'ACTIVE',
          remainingLengthFt: { lt: 10 },
          ...shopFilter,
        },
        orderBy: { remainingLengthFt: 'asc' },
        take: 5,
        select: {
          id: true, rollNumber: true, remainingLengthFt: true,
          remainingSqft: true, salePricePerSqft: true,
          product: { select: { name: true } },
        },
      }),
      this.prisma.carpetRoll.findMany({
        where: { tenantId, status: 'ACTIVE', ...shopFilter },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, rollNumber: true, remainingSqft: true,
          remainingLengthFt: true, salePricePerSqft: true,
          designCode: true,
          product: { select: { name: true } },
          variant: { select: { name: true, colorHex: true } },
        },
      }),
      this.prisma.productImei.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.productImei.count({
        where: { tenantId, status: 'SOLD', soldAt: { gte: todayStart } },
      }),
      this.prisma.usedPhone.count({
        where: { tenantId, status: 'IN_STOCK', ...shopFilter },
      }),
      this.prisma.repairTicket.count({
        where: {
          tenantId,
          status: { in: ['RECEIVED', 'DIAGNOSED', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS', 'READY'] },
          ...shopFilter,
        },
      }),
      this.prisma.emiPlan.count({
        where: { tenantId, status: 'ACTIVE' },
      }),
      this.prisma.saleReturn.aggregate({
        where: { tenantId, returnedAt: { gte: todayStart }, ...returnShop },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
      this.prisma.saleReturn.aggregate({
        where: { tenantId, returnedAt: { gte: monthStart }, ...returnShop },
        _sum: { refundAmount: true },
        _count: { _all: true },
      }),
      this.prisma.stockTransfer.count({
        where: {
          tenantId,
          status: { in: ['PENDING', 'IN_TRANSIT'] },
          ...(shopId ? { OR: [{ fromShopId: shopId }, { toShopId: shopId }] } : {}),
        },
      }),
      this.prisma.sale.findMany({
        where: {
          tenantId,
          status: LIVE_BILL,
          soldAt: { gte: todayStart },
          ...shopFilter,
        },
        select: { soldAt: true, total: true, refundedAmount: true },
      }),
      this.prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: {
          tenantId,
          status: LIVE_BILL,
          soldAt: { gte: monthStart },
          ...shopFilter,
        },
        _sum: { total: true, refundedAmount: true },
        _count: { _all: true },
      }),
      writeOffs(this.prisma, math, { gte: todayStart }),
      writeOffs(this.prisma, math, { gte: monthStart }),
    ]);

    // Calculations
    const totalProducts = products.length;
    const { lowStockCount, outOfStockCount, inventoryValueAtCost, inventoryValueAtPrice } = await this.stockStats(tenantId, shopId, products);

    // Sales net of returns on the bill's own day; profit and net profit by business-math.helper.
    const salesToday = salesTodayAgg.net;
    const cogsToday = salesTodayAgg.cost;
    const expensesToday = expensesTodayAgg._sum.amount ?? 0;
    const grossProfitToday = salesTodayAgg.grossProfit;
    const netProfitToday = netProfit(grossProfitToday, expensesToday, lostToday.net);
    const salesYesterday = salesYesterdayAgg.net;

    const salesMonth = salesMonthAgg.net;
    const cogsMonth = salesMonthAgg.cost;
    const expensesMonth = expensesMonthAgg._sum.amount ?? 0;
    const grossProfitMonth = salesMonthAgg.grossProfit;
    const netProfitMonth = netProfit(grossProfitMonth, expensesMonth, lostMonth.net);
    const salesLastMonth = salesLastMonthAgg.net;

    const salesGrowthVsYesterday = salesYesterday > 0
      ? ((salesToday - salesYesterday) / salesYesterday) * 100
      : salesToday > 0 ? 100 : 0;

    const salesGrowthVsLastMonth = salesLastMonth > 0
      ? ((salesMonth - salesLastMonth) / salesLastMonth) * 100
      : salesMonth > 0 ? 100 : 0;

    const todayCredit = salesTodayAgg.credit;
    const todayPaid = salesTodayAgg.cashIn;
    const aovToday = ordersToday > 0 ? salesToday / ordersToday : 0;
    const aovMonth = ordersMonth > 0 ? salesMonth / ordersMonth : 0;

    // Business-day keys: the start of each business day, in the shop's calendar.
    const dayKeys = (count: number) => Array.from({ length: count }, (_, i) => dateKeyTz(subDaysTz(todayStart, count - 1 - i, tz), tz));
    const salesTrend7Days = dayKeys(7).map((date) => {
      const f = dailySales.get(date);
      return { date, sales: f?.net ?? 0, profit: f?.grossProfit ?? 0, orders: f?.bills ?? 0 };
    });
    const salesTrend30Days = dayKeys(30).map((date) => {
      const f = dailySales.get(date);
      return { date, sales: f?.net ?? 0, profit: f?.grossProfit ?? 0 };
    });

    const hourlyBuckets: Record<number, { hour: number; sales: number; orders: number }> = {};
    for (let h = 0; h < 24; h++) hourlyBuckets[h] = { hour: h, sales: 0, orders: 0 };
    for (const s of salesTodayHourly) {
      // Dukaan ki ghari ka ghanta — `getHours()` server ke UTC par chalta
      // tha, to shaam 8 baje ka rush chart me dopahar 3 baje dikhta tha.
      const h = hourInTz(s.soldAt, tz);
      hourlyBuckets[h].sales += s.total - s.refundedAmount;
      hourlyBuckets[h].orders += 1;
    }
    const hourlySalesToday = Object.values(hourlyBuckets);

    const topProductIds = topProductsRaw.map((t) => t.id);
    const topProductDetails = await this.prisma.product.findMany({
      where: { id: { in: topProductIds.filter((id): id is string => !!id) } },
      select: {
        id: true, name: true, sku: true, unit: true, price: true,
        images: { take: 1, select: { url: true } },
      },
    });
    const topProductMap = new Map(topProductDetails.map((p) => [p.id, p]));
    const topProducts = topProductsRaw.map((tp) => ({
      productId: tp.id,
      product: tp.id ? topProductMap.get(tp.id) : undefined,
      quantitySold: tp.qty,
      revenue: tp.revenue,
      orderCount: tp.bills,
    }));

    const bt = (tenant?.businessType || '').toUpperCase();
    const isCarpet = bt.includes('CARPET') || bt.includes('FLOORING');
    const isMobile = bt.includes('MOBILE') || bt.includes('PHONE') || bt.includes('ELECTRONICS');

    const imeiStats = {
      total: 0, inStock: 0, sold: 0, returned: 0, damaged: 0,
    };
    for (const row of imeisAgg) {
      const count = row._count._all;
      imeiStats.total += count;
      if (row.status === 'IN_STOCK') imeiStats.inStock = count;
      else if (row.status === 'SOLD') imeiStats.sold = count;
      else if (row.status === 'RETURNED') imeiStats.returned = count;
      else if (row.status === 'DAMAGED') imeiStats.damaged = count;
    }

    return {
      timezone: tz,
      tenant: {
        name: tenant?.name,
        businessType: tenant?.businessType,
        defaultUnit: tenant?.defaultUnit,
        isCarpet,
        isMobile,
      },
      shop: shopContext,
      scope: shopId ? 'shop' : 'all',
      stats: {
        salesToday, ordersToday, cogsToday, grossProfitToday, netProfitToday, expensesToday,
        purchasesToday: purchasesTodayAgg._sum.receivedValue ?? 0,
        purchaseCountToday: purchasesTodayAgg._count._all ?? 0,
        expenseCountToday: expensesTodayAgg._count._all ?? 0,
        todayCredit, todayPaid, aovToday,
        salesYesterday, ordersYesterday, salesGrowthVsYesterday,
        salesMonth, ordersMonth, cogsMonth, grossProfitMonth, netProfitMonth, expensesMonth,
        purchasesMonth: purchasesMonthAgg._sum.receivedValue ?? 0,
        aovMonth, salesLastMonth, salesGrowthVsLastMonth,
        totalOrders, totalRevenue: (totalRevenue._sum.total ?? 0) - (totalRevenue._sum.refundedAmount ?? 0),
        totalProducts, lowStockCount, outOfStockCount, totalUsers,
        totalSuppliers, totalCustomers, totalCategories,
        totalUdhaar: udhaarAgg._sum.balance ?? 0,
        customersWithUdhaar: udhaarAgg._count._all ?? 0,
        inventoryValueAtCost, inventoryValueAtPrice,
        potentialProfit: inventoryValueAtPrice - inventoryValueAtCost,
        registerOpen: !!currentRegister,
        registerExpected: currentRegister ? (await computeLiveCash(this.prisma, tenantId, currentRegister)).expected : 0,
        registerOpening: currentRegister?.openingBalance ?? 0,
        returnsTodayCount: returnsToday._count._all ?? 0,
        returnsTodayAmount: returnsToday._sum.refundAmount ?? 0,
        returnsMonthCount: returnsMonth._count._all ?? 0,
        returnsMonthAmount: returnsMonth._sum.refundAmount ?? 0,
        pendingTransfers,
      },
      carpetStats: isCarpet ? {
        totalActiveRolls: carpetRollsAgg._count._all ?? 0,
        totalSqft: Number(carpetRollsAgg._sum.remainingSqft ?? 0),
        totalLengthFt: Number(carpetRollsAgg._sum.remainingLengthFt ?? 0),
        cutPiecesCount: carpetCutPiecesAgg._count._all ?? 0,
        cutPiecesSqft: Number(carpetCutPiecesAgg._sum.totalSqft ?? 0),
        cutPiecesValue: Number(carpetCutPiecesAgg._sum.salePrice ?? 0),
        lowStockRolls: carpetRollsLow.map((r) => ({
          id: r.id,
          rollNumber: r.rollNumber,
          productName: r.product?.name,
          remainingLengthFt: Number(r.remainingLengthFt),
          remainingSqft: Number(r.remainingSqft),
          salePricePerSqft: Number(r.salePricePerSqft),
        })),
        recentRolls: carpetActiveRolls.map((r) => ({
          id: r.id,
          rollNumber: r.rollNumber,
          designCode: r.designCode,
          productName: r.product?.name,
          variantName: r.variant?.name,
          variantColorHex: r.variant?.colorHex,
          remainingSqft: Number(r.remainingSqft),
          remainingLengthFt: Number(r.remainingLengthFt),
          salePricePerSqft: Number(r.salePricePerSqft),
        })),
      } : null,
      mobileStats: isMobile ? {
        ...imeiStats,
        soldToday: imeisSoldToday,
        usedPhonesInStock,
        repairTicketsOpen,
        emiActivePlans,
      } : null,
      salesTrend7Days,
      salesTrend30Days,
      hourlySalesToday,
      topProducts,
      lowStockProducts: lowStockList,
      recentProducts,
      recentSales: recentSales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        total: s.total,
        paidAmount: s.paidAmount,
        creditAmount: s.creditAmount,
        paymentMethod: s.paymentMethod,
        status: s.status,
        soldAt: s.soldAt,
        customer: s.customer ? {
          id: s.customer.id, name: s.customer.name, phone: s.customer.phone,
        } : null,
        cashier: s.createdBy?.fullName ?? null,
        shop: s.shop ? { id: s.shop.id, name: s.shop.name } : null,
      })),
      paymentBreakdown: paymentMethodAgg.map((p) => ({
        method: p.paymentMethod,
        total: (p._sum.total ?? 0) - (p._sum.refundedAmount ?? 0),
        count: p._count._all,
      })),
      currentRegister,
    };
  }

  /**
   * Low / out-of-stock counts and stock value from branch stock (ShopStock),
   * one entry per branch and product as on the Low stock page: a product
   * empty in one branch counts there even if another branch has plenty.
   * Variants add up; the alert and branch prices come from the base row.
   * A single-branch shop falls back to Product.stock for a product with no
   * branch row (older imports), as the Low stock page does.
   */
  private async stockStats(
    tenantId: string,
    shopId: string | undefined,
    products: Array<{ id: string; stock: number; lowStockAlert: number; costPrice: number; price: number }>,
  ) {
    const activeShops = await this.prisma.shop.findMany({ where: { tenantId, isActive: true }, select: { id: true } });
    const shopIds = shopId ? [shopId] : activeShops.map((x) => x.id);
    const rows = shopIds.length
      ? await this.prisma.shopStock.findMany({
        where: { tenantId, shopId: { in: shopIds }, product: { isActive: true } },
        select: { shopId: true, productId: true, variantId: true, stock: true, lowStockAlert: true, shopCostPrice: true, shopPrice: true },
      })
      : [];
    const productBy = new Map(products.map((p) => [p.id, p]));
    const branch = new Map<string, { productId: string; stock: number; alert: number | null; cost: number | null; price: number | null }>();
    for (const r of rows) {
      const k = `${r.shopId}:${r.productId}`;
      const cur = branch.get(k) ?? { productId: r.productId, stock: 0, alert: null, cost: null, price: null };
      cur.stock += Number(r.stock) || 0;
      if (!r.variantId) { cur.alert = Number(r.lowStockAlert); cur.cost = r.shopCostPrice; cur.price = r.shopPrice; }
      branch.set(k, cur);
    }
    if (activeShops.length === 1) {
      const only = activeShops[0].id;
      if (!shopId || shopId === only) {
        for (const p of products) {
          const k = `${only}:${p.id}`;
          if (!branch.has(k)) branch.set(k, { productId: p.id, stock: Number(p.stock) || 0, alert: null, cost: null, price: null });
        }
      }
    }

    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inventoryValueAtCost = 0;
    let inventoryValueAtPrice = 0;
    for (const b of branch.values()) {
      const p = productBy.get(b.productId);
      if (!p) continue;
      const alert = b.alert ?? p.lowStockAlert;
      if (b.stock <= 0) outOfStockCount++;
      if (b.stock <= alert) lowStockCount++;
      const qty = Math.max(0, b.stock);
      inventoryValueAtCost += qty * (b.cost ?? p.costPrice);
      inventoryValueAtPrice += qty * (b.price ?? p.price);
    }
    const r2 = (v: number) => Math.round(v * 100) / 100;
    return { lowStockCount, outOfStockCount, inventoryValueAtCost: r2(inventoryValueAtCost), inventoryValueAtPrice: r2(inventoryValueAtPrice) };
  }

  /** Five best sellers of the month by what they earned after discounts and returns. */
  private topProducts(math: { tenantId: string; shopId?: string }, from: Date) {
    const where = liveSaleSql(math, { gte: from });
    return this.prisma.$queryRaw<Array<{ id: string | null; qty: number; revenue: number; bills: number }>>`
      WITH ${billMathCte(where)}
      SELECT si."productId" AS id, COALESCE(SUM(si.quantity), 0)::float8 AS qty,
        COALESCE(SUM(${LINE_REVENUE}), 0)::float8 AS revenue, COUNT(*)::int AS bills
      FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
      WHERE ${where}
      GROUP BY 1
      ORDER BY revenue DESC
      LIMIT 5`;
  }
}
