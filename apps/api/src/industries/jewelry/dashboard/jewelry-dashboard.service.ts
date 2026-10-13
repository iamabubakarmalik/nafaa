import { Injectable } from '@nestjs/common';
import { endOfDayTz, startOfDayTz, subDaysTz } from '../../../common/helpers/business-time.helper';
import { saleFigures } from '../../../common/helpers/business-math.helper';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class JewelryDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    // Business day in Pakistan time; the server clock runs in UTC.
    const todayStart = startOfDayTz(new Date());
    const todayEnd = endOfDayTz(new Date());
    const monthAgo = subDaysTz(todayStart, 30);
    const live = { status: { not: 'CANCELLED' as const } };

    const [
      currentRates,
      totalProducts,
      activeKarigars,
      todayMoney, monthMoney,
      monthBills,
      pendingCustomOrders, todayCustomOrders,
      todayExchanges, monthlyExchanges,
    ] = await Promise.all([
      this.prisma.jewelryMetalRate.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        orderBy: [{ metalType: 'asc' }, { purity: 'asc' }],
      }),
      this.prisma.jewelryProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.jewelryKarigar.count({ where: { tenantId: user.tenantId, isActive: true } }),

      // Money comes from the shared bills, so it matches the day book and reports
      // (custom order deliveries included, cancelled bills left out).
      saleFigures(this.prisma, { tenantId: user.tenantId }, { gte: todayStart }),
      saleFigures(this.prisma, { tenantId: user.tenantId }, { gte: monthAgo }),

      this.prisma.jewelrySale.findMany({
        where: { tenantId: user.tenantId, ...live, saleDate: { gte: monthAgo } },
        select: { invoiceNumber: true, saleDate: true, netWeight: true, items: { select: { metalType: true, netWeight: true, quantity: true } } },
      }),

      this.prisma.jewelryCustomOrder.count({
        where: {
          tenantId: user.tenantId,
          status: { in: ['DRAFT', 'QUOTED', 'CONFIRMED', 'DESIGNING', 'METAL_ISSUED', 'IN_PRODUCTION', 'POLISHING', 'QUALITY_CHECK', 'HALLMARKING'] },
        },
      }),
      this.prisma.jewelryCustomOrder.count({
        where: {
          tenantId: user.tenantId,
          orderDate: { gte: todayStart, lte: todayEnd },
        },
      }),

      this.prisma.jewelryExchange.aggregate({
        where: { tenantId: user.tenantId, exchangeDate: { gte: todayStart, lte: todayEnd } },
        _sum: { fineGoldEquivalent: true, netValue: true },
        _count: { _all: true },
      }),
      this.prisma.jewelryExchange.aggregate({
        where: { tenantId: user.tenantId, exchangeDate: { gte: monthAgo } },
        _sum: { fineGoldEquivalent: true, netValue: true },
        _count: { _all: true },
      }),
    ]);

    // Weight sold: jewelry bills whose shared bill is still live.
    const voided = new Set((await this.prisma.sale.findMany({
      where: { tenantId: user.tenantId, status: 'VOIDED', saleNumber: { in: monthBills.map((b) => b.invoiceNumber) } },
      select: { saleNumber: true },
    })).map((x) => x.saleNumber));
    const liveBills = monthBills.filter((b) => !voided.has(b.invoiceNumber));
    const weightOf = (metal?: string) => liveBills.reduce((sum, b) => sum + b.items
      .filter((i) => !metal || i.metalType === metal)
      .reduce((w, i) => w + i.netWeight * (i.quantity || 1), 0), 0);
    const todayWeight = liveBills.filter((b) => b.saleDate >= todayStart && b.saleDate <= todayEnd)
      .reduce((sum, b) => sum + (b.netWeight || 0), 0);
    const r3 = (v: number) => Math.round(v * 1000) / 1000;

    // Top selling categories
    const topCategories = await this.prisma.jewelrySaleItem.groupBy({
      by: ['category'],
      where: {
        sale: { tenantId: user.tenantId, ...live, saleDate: { gte: monthAgo } },
      },
      _sum: { itemTotal: true, netWeight: true },
      _count: { _all: true },
    });

    // Recent sales
    const recentSales = await this.prisma.jewelrySale.findMany({
      where: { tenantId: user.tenantId },
      include: { items: true },
      orderBy: { saleDate: 'desc' },
      take: 5,
    });

    // Top karigars
    const topKarigars = await this.prisma.jewelryKarigar.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalEarnings: 'desc' },
      take: 5,
    });

    // Pending custom orders (upcoming)
    const upcomingOrders = await this.prisma.jewelryCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['CONFIRMED', 'DESIGNING', 'IN_PRODUCTION', 'POLISHING'] },
      },
      orderBy: { promisedDate: 'asc' },
      take: 5,
    });

    return {
      currentRates,
      totals: {
        totalProducts,
        activeKarigars,
      },
      today: {
        sales: todayMoney.bills,
        revenue: todayMoney.net,
        weightSold: r3(todayWeight),
        customOrders: todayCustomOrders,
        exchanges: todayExchanges._count._all,
      },
      monthly: {
        sales: monthMoney.bills,
        revenue: monthMoney.net,
        collected: monthMoney.cashIn,
        outstanding: monthMoney.credit,
        goldSold: r3(weightOf('GOLD')),
        silverSold: r3(weightOf('SILVER')),
        exchangesCount: monthlyExchanges._count._all,
        exchangesValue: monthlyExchanges._sum.netValue ?? 0,
        exchangesGold: monthlyExchanges._sum.fineGoldEquivalent ?? 0,
      },
      pendingCustomOrders,
      topCategories,
      recentSales,
      topKarigars,
      upcomingOrders,
    };
  }
}
