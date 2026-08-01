import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class SportsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const monthAgo = subDays(new Date(), 30);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

    const [
      totalBrands, totalProducts, teamOrderableCount,
      activeTeamOrders, pendingRepairs, completedRepairs,
    ] = await Promise.all([
      this.prisma.sportsBrand.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.sportsProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.sportsProductProfile.count({
        where: { tenantId: user.tenantId, isTeamOrderable: true },
      }),
      this.prisma.sportsTeamOrder.count({
        where: {
          tenantId: user.tenantId,
          status: { in: ['DRAFT', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'READY'] },
        },
      }),
      this.prisma.sportsRepairService.count({
        where: { tenantId: user.tenantId, status: { in: ['RECEIVED', 'IN_PROGRESS'] } },
      }),
      this.prisma.sportsRepairService.count({
        where: { tenantId: user.tenantId, status: 'DELIVERED' },
      }),
    ]);

    // Today
    const [todayTeamOrders, todayRepairs] = await Promise.all([
      this.prisma.sportsTeamOrder.aggregate({
        where: {
          tenantId: user.tenantId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { totalAmount: true, advancePaid: true },
        _count: { _all: true },
      }),
      this.prisma.sportsRepairService.aggregate({
        where: {
          tenantId: user.tenantId,
          receivedAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { finalCost: true, advancePaid: true },
        _count: { _all: true },
      }),
    ]);

    // Monthly
    const [monthlyTeamOrders, monthlyRepairs] = await Promise.all([
      this.prisma.sportsTeamOrder.aggregate({
        where: {
          tenantId: user.tenantId,
          createdAt: { gte: monthAgo },
          status: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true, advancePaid: true },
        _count: { _all: true },
      }),
      this.prisma.sportsRepairService.aggregate({
        where: {
          tenantId: user.tenantId,
          receivedAt: { gte: monthAgo },
        },
        _sum: { finalCost: true, advancePaid: true },
        _count: { _all: true },
      }),
    ]);

    // Top products
    const topProducts = await this.prisma.sportsProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 10,
    });

    // Top brands
    const topBrands = await this.prisma.sportsBrand.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: 5,
    });

    // Category breakdown
    const byCategory = await this.prisma.sportsProductProfile.groupBy({
      by: ['categoryType'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    // Sport breakdown
    const bySport = await this.prisma.sportsProductProfile.groupBy({
      by: ['sport'],
      where: { tenantId: user.tenantId, sport: { not: null } },
      _count: { _all: true },
    });

    // Upcoming deliveries
    const upcomingTeamDeliveries = await this.prisma.sportsTeamOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['CONFIRMED', 'IN_PRODUCTION', 'READY'] },
        expectedDeliveryDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 14 * 86400000),
        },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
      take: 10,
    });

    // Active repairs
    const activeRepairs = await this.prisma.sportsRepairService.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['RECEIVED', 'IN_PROGRESS'] },
      },
      orderBy: { receivedAt: 'desc' },
      take: 10,
    });

    // Overdue repairs
    const overdueRepairs = await this.prisma.sportsRepairService.count({
      where: {
        tenantId: user.tenantId,
        status: { in: ['RECEIVED', 'IN_PROGRESS'] },
        estimatedReadyAt: { lt: new Date() },
      },
    });

    return {
      totals: {
        totalBrands,
        totalProducts,
        teamOrderableCount,
        activeTeamOrders,
        pendingRepairs,
        completedRepairs,
        overdueRepairs,
      },
      today: {
        teamOrdersCount: todayTeamOrders._count._all,
        teamOrdersRevenue: todayTeamOrders._sum.totalAmount ?? 0,
        teamOrdersCollected: todayTeamOrders._sum.advancePaid ?? 0,
        repairsCount: todayRepairs._count._all,
        repairsRevenue: todayRepairs._sum.finalCost ?? 0,
        totalRevenue:
          (todayTeamOrders._sum.totalAmount ?? 0) +
          (todayRepairs._sum.finalCost ?? 0),
      },
      monthly: {
        teamOrdersCount: monthlyTeamOrders._count._all,
        teamOrdersRevenue: monthlyTeamOrders._sum.totalAmount ?? 0,
        teamOrdersCollected: monthlyTeamOrders._sum.advancePaid ?? 0,
        repairsCount: monthlyRepairs._count._all,
        repairsRevenue: monthlyRepairs._sum.finalCost ?? 0,
        totalRevenue:
          (monthlyTeamOrders._sum.totalAmount ?? 0) +
          (monthlyRepairs._sum.finalCost ?? 0),
      },
      topProducts,
      topBrands,
      byCategory,
      bySport,
      upcomingTeamDeliveries,
      activeRepairs,
    };
  }

  async salesReport(user: AuthenticatedUser, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);

    const [teamOrders, repairs] = await Promise.all([
      this.prisma.sportsTeamOrder.findMany({
        where: {
          tenantId: user.tenantId,
          createdAt: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sportsRepairService.findMany({
        where: {
          tenantId: user.tenantId,
          receivedAt: { gte: start, lte: end },
        },
        orderBy: { receivedAt: 'desc' },
      }),
    ]);

    const teamRevenue = teamOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    const teamCollected = teamOrders.reduce((s, o) => s + Number(o.advancePaid || 0), 0);
    const repairRevenue = repairs.reduce((s, r) => s + Number(r.finalCost || 0), 0);
    const repairCollected = repairs.reduce((s, r) => s + Number(r.advancePaid || 0), 0);

    return {
      period: { from, to },
      teamOrders: {
        count: teamOrders.length,
        revenue: teamRevenue,
        collected: teamCollected,
        pending: teamRevenue - teamCollected,
        items: teamOrders,
      },
      repairs: {
        count: repairs.length,
        revenue: repairRevenue,
        collected: repairCollected,
        pending: repairRevenue - repairCollected,
        items: repairs,
      },
      totalRevenue: teamRevenue + repairRevenue,
      totalCollected: teamCollected + repairCollected,
    };
  }

  async categoryPerformance(user: AuthenticatedUser) {
    const profiles = await this.prisma.sportsProductProfile.findMany({
      where: { tenantId: user.tenantId },
    });

    const byCategory: Record<string, { count: number; totalSold: number; revenue: number }> = {};
    profiles.forEach((p) => {
      const key = p.categoryType || 'OTHER';
      if (!byCategory[key]) byCategory[key] = { count: 0, totalSold: 0, revenue: 0 };
      byCategory[key].count += 1;
      byCategory[key].totalSold += Number(p.totalSold || 0);
      byCategory[key].revenue += Number(p.totalRevenue || 0);
    });

    return Object.entries(byCategory)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);
  }
}
