import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz, subDaysTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';

/** Orders and repairs of the selected branch; rows saved before branches were tagged show everywhere. */
const branchOf = (user: AuthenticatedUser, scope?: ShopScope) => ({
  tenantId: user.tenantId, ...(scope?.shopId && { AND: [scope.whereLoose] }),
});

@Injectable()
export class SportsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser, scope?: ShopScope) {
    const loose = branchOf(user, scope);
    const monthAgo = subDays(new Date(), 30);
    const todayStart = startOfDayTz();
    const todayEnd = endOfDayTz();

    const [
      totalBrands, totalProducts, teamOrderableCount,
      activeTeamOrders, pendingRepairs, completedRepairs,
    ] = await Promise.all([
      this.prisma.brand.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.sportsProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.sportsProductProfile.count({
        where: { tenantId: user.tenantId, isTeamOrderable: true },
      }),
      this.prisma.sportsTeamOrder.count({
        where: {
          ...loose,
          status: { in: ['DRAFT', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'READY'] },
        },
      }),
      this.prisma.sportsRepairService.count({
        where: { ...loose, status: { in: ['RECEIVED', 'IN_PROGRESS'] } },
      }),
      this.prisma.sportsRepairService.count({
        where: { ...loose, status: 'DELIVERED' },
      }),
    ]);

    // Today
    const [todayTeamOrders, todayRepairs] = await Promise.all([
      this.prisma.sportsTeamOrder.aggregate({
        where: {
          ...loose,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { totalAmount: true, advancePaid: true },
        _count: { _all: true },
      }),
      this.prisma.sportsRepairService.aggregate({
        where: {
          ...loose,
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
          ...loose,
          createdAt: { gte: monthAgo },
          status: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true, advancePaid: true },
        _count: { _all: true },
      }),
      this.prisma.sportsRepairService.aggregate({
        where: {
          ...loose,
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

    // Top brands: the shop's product brands by net sale in the last 30 days.
    const soldLines = await this.prisma.saleItem.findMany({
      where: { sale: { tenantId: user.tenantId, ...scope?.where, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }, createdAt: { gte: monthAgo } }, product: { brandId: { not: null } } },
      select: { quantity: true, returnedQty: true, total: true, product: { select: { brandId: true } } },
    });
    const brandSales = new Map<string, number>();
    for (const it of soldLines) {
      const share = Number(it.quantity) > 0 ? (Number(it.quantity) - Number(it.returnedQty || 0)) / Number(it.quantity) : 0;
      brandSales.set(it.product!.brandId!, (brandSales.get(it.product!.brandId!) ?? 0) + Number(it.total) * share);
    }
    const topBrands = (await this.prisma.brand.findMany({ where: { tenantId: user.tenantId, id: { in: [...brandSales.keys()] } }, select: { id: true, name: true, logoUrl: true } }))
      .map((b) => ({ ...b, totalRevenue: Math.round((brandSales.get(b.id) ?? 0) * 100) / 100 }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

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
        ...loose,
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
        ...loose,
        status: { in: ['RECEIVED', 'IN_PROGRESS'] },
      },
      orderBy: { receivedAt: 'desc' },
      take: 10,
    });

    // Overdue repairs
    const overdueRepairs = await this.prisma.sportsRepairService.count({
      where: {
        ...loose,
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

  async salesReport(user: AuthenticatedUser, from: string, to: string, scope?: ShopScope) {
    const loose = branchOf(user, scope);
    // Dates are shop days (Pakistan time); a missing range means the last 30 days.
    const start = from ? startOfDayTz(new Date(from)) : startOfDayTz(subDaysTz(new Date(), 30));
    const end = to ? endOfDayTz(new Date(to)) : endOfDayTz();

    const [teamOrders, repairs] = await Promise.all([
      this.prisma.sportsTeamOrder.findMany({
        where: {
          ...loose,
          createdAt: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sportsRepairService.findMany({
        where: {
          ...loose,
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
