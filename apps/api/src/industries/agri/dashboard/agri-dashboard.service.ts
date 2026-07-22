import { Injectable } from '@nestjs/common';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class AgriDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const monthAgo = subDays(new Date(), 30);

    const [
      totalFarmers, activeFarmers, overdueFarmers,
      totalProducts, seasonalProducts, restrictedProducts,
      todayOrders, pendingOrders, deliveringOrders,
      todayRevenue, monthlyRevenue,
      totalCredit, totalOutstanding,
      pendingSubsidies, disbursedSubsidies,
      expiringCerts,
    ] = await Promise.all([
      this.prisma.agriFarmer.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.agriFarmer.count({ where: { tenantId: user.tenantId, isActive: true, status: 'ACTIVE' } }),
      this.prisma.agriFarmer.count({ where: { tenantId: user.tenantId, isActive: true, totalOutstanding: { gt: 0 } } }),

      this.prisma.agriProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.agriProductProfile.count({ where: { tenantId: user.tenantId, isSeasonal: true } }),
      this.prisma.agriProductProfile.count({ where: { tenantId: user.tenantId, isRestricted: true } }),

      this.prisma.agriBulkOrder.count({
        where: { tenantId: user.tenantId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.agriBulkOrder.count({
        where: { tenantId: user.tenantId, status: { in: ['CONFIRMED', 'PROCESSING'] } },
      }),
      this.prisma.agriBulkOrder.count({
        where: { tenantId: user.tenantId, status: 'OUT_FOR_DELIVERY' },
      }),

      this.prisma.agriBulkOrder.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'DELIVERED',
          orderDate: { gte: todayStart, lte: todayEnd },
        },
        _sum: { total: true },
      }),
      this.prisma.agriBulkOrder.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'DELIVERED',
          orderDate: { gte: monthAgo },
        },
        _sum: { total: true, paidAmount: true },
      }),

      this.prisma.agriFarmer.aggregate({
        where: { tenantId: user.tenantId, isActive: true },
        _sum: { creditLimit: true, currentBalance: true },
      }),
      this.prisma.agriFarmer.aggregate({
        where: { tenantId: user.tenantId, isActive: true },
        _sum: { totalOutstanding: true },
      }),

      this.prisma.agriSubsidyClaim.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
      this.prisma.agriSubsidyClaim.count({ where: { tenantId: user.tenantId, status: 'DISBURSED' } }),

      this.prisma.agriProductProfile.count({
        where: {
          tenantId: user.tenantId,
          govtRegExpiry: { gte: new Date(), lte: subDays(new Date(), -30) },
        },
      }),
    ]);

    // Top selling products (30 days)
    const topSellingRaw = await this.prisma.agriBulkOrderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: {
          tenantId: user.tenantId,
          status: 'DELIVERED',
          orderDate: { gte: monthAgo },
        },
      },
      _sum: { quantity: true, total: true },
      _count: { _all: true },
    });
    const topSelling = topSellingRaw
      .sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0))
      .slice(0, 5);

    // Top farmers (by purchases)
    const topFarmers = await this.prisma.agriFarmer.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalPurchases: 'desc' },
      take: 5,
    });

    // By category breakdown
    const byCategory = await this.prisma.agriProductProfile.groupBy({
      by: ['category'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
      _sum: { totalRevenue: true },
    });

    // Recent advisories
    const recentAdvisories = await this.prisma.agriCropAdvisory.findMany({
      where: { tenantId: user.tenantId, completed: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      farmers: {
        total: totalFarmers,
        active: activeFarmers,
        overdue: overdueFarmers,
      },
      products: {
        total: totalProducts,
        seasonal: seasonalProducts,
        restricted: restrictedProducts,
        expiringCerts,
      },
      operations: {
        todayOrders,
        pendingOrders,
        deliveringOrders,
      },
      revenue: {
        today: todayRevenue._sum.total ?? 0,
        monthly: monthlyRevenue._sum.total ?? 0,
        collected: monthlyRevenue._sum.paidAmount ?? 0,
      },
      credit: {
        totalLimit: totalCredit._sum.creditLimit ?? 0,
        totalUsed: totalCredit._sum.currentBalance ?? 0,
        totalOutstanding: totalOutstanding._sum.totalOutstanding ?? 0,
      },
      subsidies: {
        pending: pendingSubsidies,
        disbursed: disbursedSubsidies,
      },
      topSelling,
      topFarmers,
      byCategory,
      recentAdvisories,
    };
  }
}
