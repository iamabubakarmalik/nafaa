import { Injectable } from '@nestjs/common';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class JewelryDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const monthAgo = subDays(new Date(), 30);

    const [
      currentRates,
      totalProducts,
      activeKarigars,
      todaySales, monthlyRevenue,
      totalGoldSold, totalSilverSold,
      pendingCustomOrders, todayCustomOrders,
      todayExchanges, monthlyExchanges,
    ] = await Promise.all([
      this.prisma.jewelryMetalRate.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        orderBy: [{ metalType: 'asc' }, { purity: 'asc' }],
      }),
      this.prisma.jewelryProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.jewelryKarigar.count({ where: { tenantId: user.tenantId, isActive: true } }),

      this.prisma.jewelrySale.aggregate({
        where: { tenantId: user.tenantId, saleDate: { gte: todayStart, lte: todayEnd } },
        _sum: { total: true, netWeight: true },
        _count: { _all: true },
      }),
      this.prisma.jewelrySale.aggregate({
        where: { tenantId: user.tenantId, saleDate: { gte: monthAgo } },
        _sum: { total: true, paidAmount: true, netWeight: true },
        _count: { _all: true },
      }),

      this.prisma.jewelrySaleItem.aggregate({
        where: {
          sale: { tenantId: user.tenantId, saleDate: { gte: monthAgo } },
          metalType: 'GOLD',
        },
        _sum: { netWeight: true },
      }),
      this.prisma.jewelrySaleItem.aggregate({
        where: {
          sale: { tenantId: user.tenantId, saleDate: { gte: monthAgo } },
          metalType: 'SILVER',
        },
        _sum: { netWeight: true },
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

    // Top selling categories
    const topCategories = await this.prisma.jewelrySaleItem.groupBy({
      by: ['category'],
      where: {
        sale: { tenantId: user.tenantId, saleDate: { gte: monthAgo } },
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
        sales: todaySales._count._all,
        revenue: todaySales._sum.total ?? 0,
        weightSold: todaySales._sum.netWeight ?? 0,
        customOrders: todayCustomOrders,
        exchanges: todayExchanges._count._all,
      },
      monthly: {
        sales: monthlyRevenue._count._all,
        revenue: monthlyRevenue._sum.total ?? 0,
        collected: monthlyRevenue._sum.paidAmount ?? 0,
        outstanding: (monthlyRevenue._sum.total ?? 0) - (monthlyRevenue._sum.paidAmount ?? 0),
        goldSold: totalGoldSold._sum.netWeight ?? 0,
        silverSold: totalSilverSold._sum.netWeight ?? 0,
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
