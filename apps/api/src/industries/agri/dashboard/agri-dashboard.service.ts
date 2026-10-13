import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { saleFigures } from '../../../common/helpers/business-math.helper';
import { addDaysTz, dayEnd, dayStart } from '../agri-common';

@Injectable()
export class AgriDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    // Shop-day edges (Pakistan time), not the server's UTC day.
    const todayStart = dayStart();
    const todayEnd = dayEnd();
    const monthAgo = addDaysTz(todayStart, -30);

    const [
      totalFarmers, activeFarmers,
      totalProducts, seasonalProducts, restrictedProducts,
      todayOrders, pendingOrders, deliveringOrders,
      todayRevenue, monthlyRevenue,
      totalCredit, totalOutstanding,
      pendingSubsidies, disbursedSubsidies,
      expiringCerts,
    ] = await Promise.all([
      this.prisma.agriFarmer.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.agriFarmer.count({ where: { tenantId: user.tenantId, isActive: true, status: 'ACTIVE' } }),

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

      // Every bill counts: counter sales and delivered bulk orders (which become bills).
      saleFigures(this.prisma, { tenantId: user.tenantId }, { gte: todayStart, lt: new Date(todayEnd.getTime() + 1) }),
      saleFigures(this.prisma, { tenantId: user.tenantId }, { gte: monthAgo }),

      this.prisma.agriFarmer.aggregate({
        where: { tenantId: user.tenantId, isActive: true },
        _sum: { creditLimit: true },
      }),
      // Udhaar lives on each farmer's customer khata.
      this.prisma.agriFarmer.findMany({
        where: { tenantId: user.tenantId, isActive: true, customerId: { not: null } },
        select: { customerId: true },
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

    const farmerCustomerIds = totalOutstanding.map((f) => f.customerId as string);
    const khata = farmerCustomerIds.length
      ? await this.prisma.customer.findMany({
        where: { tenantId: user.tenantId, id: { in: farmerCustomerIds } },
        select: { id: true, balance: true, totalSpent: true },
      })
      : [];
    const owed = khata.reduce((s, c) => s + Math.max(c.balance, 0), 0);
    const farmersOwing = khata.filter((c) => c.balance > 0.01).length;
    // Money taken on the bills themselves in the last 30 days (udhaar left out).
    const creditGiven = (await this.prisma.sale.aggregate({
      where: { tenantId: user.tenantId, status: { not: 'VOIDED' }, soldAt: { gte: monthAgo } },
      _sum: { creditAmount: true },
    }))._sum.creditAmount ?? 0;
    const collected = monthlyRevenue.net - creditGiven;

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

    // Top farmers by what they bought, read from their khata.
    const spent = new Map(khata.map((c) => [c.id, c.totalSpent]));
    const balance = new Map(khata.map((c) => [c.id, Math.max(c.balance, 0)]));
    const topFarmers = (await this.prisma.agriFarmer.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    }))
      .map((f) => (f.customerId && spent.has(f.customerId)
        ? {
          ...f,
          totalPurchases: Math.max(spent.get(f.customerId) ?? 0, f.totalPurchases),
          currentBalance: balance.get(f.customerId) ?? 0,
          totalOutstanding: balance.get(f.customerId) ?? 0,
        }
        : f))
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 5);

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
        overdue: farmersOwing,
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
        today: todayRevenue.net,
        monthly: monthlyRevenue.net,
        collected: Math.max(Math.round(collected * 100) / 100, 0),
      },
      credit: {
        totalLimit: totalCredit._sum.creditLimit ?? 0,
        totalUsed: Math.round(owed * 100) / 100,
        totalOutstanding: Math.round(owed * 100) / 100,
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
