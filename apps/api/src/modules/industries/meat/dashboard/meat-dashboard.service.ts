import { Injectable } from '@nestjs/common';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class MeatDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const monthAgo = subDays(new Date(), 30);

    const [
      liveAnimalCount, totalProducts, activeSubscriptions, activeQurbani, wholesaleAccounts,
      todayOrders, pendingOrders, upcomingDeliveries,
      todayRevenue, monthlyRevenue, halalPct,
    ] = await Promise.all([
      this.prisma.meatLiveAnimal.count({ where: { tenantId: user.tenantId, isActive: true, isSlaughtered: false } }),
      this.prisma.meatProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.meatSubscription.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.meatQurbaniBooking.count({ where: { tenantId: user.tenantId, status: { in: ['BOOKED', 'CONFIRMED'] } } }),
      this.prisma.meatWholesaleAccount.count({ where: { tenantId: user.tenantId, isActive: true } }),

      this.prisma.meatWeightOrder.count({
        where: { tenantId: user.tenantId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.meatWeightOrder.count({
        where: { tenantId: user.tenantId, status: { in: ['CONFIRMED', 'PROCESSING', 'CUTTING', 'PACKED', 'READY'] } },
      }),
      this.prisma.meatWeightOrder.count({
        where: { tenantId: user.tenantId, status: 'OUT_FOR_DELIVERY' },
      }),

      this.prisma.meatWeightOrder.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'DELIVERED',
          deliveredAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { total: true },
      }),
      this.prisma.meatWeightOrder.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'DELIVERED',
          deliveredAt: { gte: monthAgo },
        },
        _sum: { total: true, paidAmount: true },
      }),

      this.calculateHalalPct(user, monthAgo),
    ]);

    // Top selling cuts (30 days)
    const topSellingRaw = await this.prisma.meatWeightOrderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: {
          tenantId: user.tenantId,
          status: 'DELIVERED',
          deliveredAt: { gte: monthAgo },
        },
      },
      _sum: { actualKg: true, total: true },
      _count: { _all: true },
    });
    const topSelling = topSellingRaw
      .sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0))
      .slice(0, 5);

    // Upcoming subscription deliveries
    const upcomingSubs = await this.prisma.meatSubscription.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        nextDeliveryDate: { gte: new Date(), lte: subDays(new Date(), -3) },
      },
      orderBy: { nextDeliveryDate: 'asc' },
      take: 10,
    });

    // By animal type breakdown
    const byAnimal = await this.prisma.meatProductProfile.groupBy({
      by: ['animalType'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
      _sum: { totalSoldKg: true, totalRevenue: true },
    });

    return {
      totals: {
        liveAnimals: liveAnimalCount,
        totalProducts,
        activeSubscriptions,
        activeQurbani,
        wholesaleAccounts,
      },
      operations: {
        todayOrders,
        pendingOrders,
        upcomingDeliveries,
      },
      revenue: {
        today: todayRevenue._sum.total ?? 0,
        monthly: monthlyRevenue._sum.total ?? 0,
        collected: monthlyRevenue._sum.paidAmount ?? 0,
      },
      halalCompliance: halalPct,
      topSelling,
      upcomingSubs,
      byAnimal,
    };
  }

  private async calculateHalalPct(user: AuthenticatedUser, from: Date) {
    const [total, halal] = await Promise.all([
      this.prisma.meatSlaughterLog.count({
        where: { tenantId: user.tenantId, slaughterDate: { gte: from } },
      }),
      this.prisma.meatSlaughterLog.count({
        where: { tenantId: user.tenantId, slaughterDate: { gte: from }, isHalal: true },
      }),
    ]);
    return {
      total,
      halal,
      pct: total > 0 ? (halal / total) * 100 : 100,
    };
  }
}
