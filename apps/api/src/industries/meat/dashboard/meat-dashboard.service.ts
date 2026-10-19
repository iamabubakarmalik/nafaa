import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { saleFigures } from '../../../common/helpers/business-math.helper';
import { addDaysTz, dayEnd, dayStart } from '../meat-common';

@Injectable()
export class MeatDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    // Shop-day edges (Pakistan time), not the server's UTC day.
    const todayStart = dayStart();
    const todayEnd = dayEnd();
    const monthAgo = addDaysTz(todayStart, -30);

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

      // Revenue is what the counter billed; weight orders alone left a butcher's sales at 0.
      saleFigures(this.prisma, { tenantId: user.tenantId }, { gte: todayStart, lt: new Date(todayEnd.getTime() + 1) }),
      saleFigures(this.prisma, { tenantId: user.tenantId }, { gte: monthAgo }),

      this.calculateHalalPct(user, monthAgo),
    ]);

    const creditGiven = (await this.prisma.sale.aggregate({
      where: { tenantId: user.tenantId, status: { not: 'VOIDED' }, soldAt: { gte: monthAgo } },
      _sum: { creditAmount: true },
    }))._sum.creditAmount ?? 0;

    // Top selling cuts (30 days), from the bills.
    const topSellingRaw = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: { productId: { not: null }, sale: { tenantId: user.tenantId, status: { not: 'VOIDED' }, soldAt: { gte: monthAgo } } },
      _sum: { quantity: true, total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    });
    const names = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: topSellingRaw.map((r) => r.productId as string) } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(names.map((p) => [p.id, p.name]));
    const topSelling = topSellingRaw.map((r) => ({
      productId: r.productId,
      productName: nameOf.get(r.productId as string) ?? '',
      _sum: { actualKg: r._sum.quantity ?? 0, total: r._sum.total ?? 0 },
      _count: r._count,
    }));

    // Upcoming subscription deliveries
    const upcomingSubs = await this.prisma.meatSubscription.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        nextDeliveryDate: { lte: dayEnd(addDaysTz(todayStart, 3)) },
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
        today: todayRevenue.net,
        monthly: monthlyRevenue.net,
        collected: Math.max(Math.round((monthlyRevenue.net - creditGiven) * 100) / 100, 0),
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
