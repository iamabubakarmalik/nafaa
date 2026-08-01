import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class FloristDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const monthAgo = subDays(new Date(), 30);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
    const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);
    const in30Days = new Date(); in30Days.setDate(in30Days.getDate() + 30);

    const [
      totalProducts,
      activeOrders,
      deliveredToday,
      activeSubscriptions,
      upcomingWeddings,
      witheringSoon,
    ] = await Promise.all([
      this.prisma.floristProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.floristOrder.count({
        where: {
          tenantId: user.tenantId,
          status: { in: ['CONFIRMED', 'IN_PREPARATION', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'] },
        },
      }),
      this.prisma.floristOrder.count({
        where: {
          tenantId: user.tenantId,
          status: 'DELIVERED',
          actualDeliveryTime: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.floristSubscription.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.floristWeddingContract.count({
        where: {
          tenantId: user.tenantId,
          weddingDate: { gte: new Date(), lte: in30Days },
          status: { in: ['QUOTED', 'CONFIRMED'] },
        },
      }),
      this.prisma.floristProductProfile.count({
        where: {
          tenantId: user.tenantId,
          freshUntil: { gte: new Date(), lte: new Date(Date.now() + 3 * 86400000) },
        },
      }),
    ]);

    const [monthlyOrders, monthlyWeddings, monthlySubscriptions] = await Promise.all([
      this.prisma.floristOrder.aggregate({
        where: {
          tenantId: user.tenantId,
          createdAt: { gte: monthAgo },
          status: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true, advancePaid: true },
        _count: { _all: true },
      }),
      this.prisma.floristWeddingContract.aggregate({
        where: {
          tenantId: user.tenantId,
          createdAt: { gte: monthAgo },
        },
        _sum: { quotedAmount: true, advanceAmount: true },
        _count: { _all: true },
      }),
      this.prisma.floristSubscription.aggregate({
        where: {
          tenantId: user.tenantId,
          createdAt: { gte: monthAgo },
        },
        _sum: { pricePerDelivery: true },
        _count: { _all: true },
      }),
    ]);

    const todayScheduledDeliveries = await this.prisma.floristOrder.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDeliveryDate: { gte: todayStart, lte: todayEnd },
        status: { in: ['CONFIRMED', 'IN_PREPARATION', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'] },
      },
      orderBy: [{ deliveryTimeSlot: 'asc' }, { scheduledDeliveryTime: 'asc' }],
    });

    const upcomingWeddingList = await this.prisma.floristWeddingContract.findMany({
      where: {
        tenantId: user.tenantId,
        weddingDate: { gte: new Date(), lte: in30Days },
        status: { in: ['QUOTED', 'CONFIRMED'] },
      },
      orderBy: { weddingDate: 'asc' },
      take: 10,
    });

    const dueSubscriptions = await this.prisma.floristSubscription.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        nextDeliveryDate: { lte: in7Days },
      },
      orderBy: { nextDeliveryDate: 'asc' },
      take: 10,
    });

    const witheringProducts = await this.prisma.floristProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        freshUntil: { lte: new Date(Date.now() + 3 * 86400000) },
      },
      orderBy: { freshUntil: 'asc' },
      take: 10,
    });

    const topProducts = await this.prisma.floristProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 10,
    });

    const byCategory = await this.prisma.floristProductProfile.groupBy({
      by: ['categoryType'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    return {
      totals: {
        totalProducts, activeOrders, deliveredToday,
        activeSubscriptions, upcomingWeddings, witheringSoon,
      },
      monthly: {
        orders: {
          count: monthlyOrders._count._all,
          revenue: monthlyOrders._sum.totalAmount ?? 0,
          collected: monthlyOrders._sum.advancePaid ?? 0,
        },
        weddings: {
          count: monthlyWeddings._count._all,
          revenue: monthlyWeddings._sum.quotedAmount ?? 0,
          collected: monthlyWeddings._sum.advanceAmount ?? 0,
        },
        subscriptions: {
          count: monthlySubscriptions._count._all,
        },
        totalRevenue:
          (monthlyOrders._sum.totalAmount ?? 0) +
          (monthlyWeddings._sum.quotedAmount ?? 0),
      },
      todayScheduledDeliveries,
      upcomingWeddingList,
      dueSubscriptions,
      witheringProducts,
      topProducts,
      byCategory,
    };
  }

  async deliveryReport(user: AuthenticatedUser, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);
    const orders = await this.prisma.floristOrder.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDeliveryDate: { gte: start, lte: end },
        status: 'DELIVERED',
      },
      orderBy: { scheduledDeliveryDate: 'asc' },
    });
    const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    const totalDeliveryCharge = orders.reduce((s, o) => s + Number(o.deliveryCharge || 0), 0);
    return {
      period: { from, to },
      count: orders.length,
      totalRevenue,
      totalDeliveryCharge,
      orders,
    };
  }
}
