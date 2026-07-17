import { Injectable } from '@nestjs/common';
import { startOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class HardwareDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const monthAgo = subDays(new Date(), 30);

    const [
      totalBrands, totalProducts, activeProjects,
      pendingQuotations, pendingDeliveries, todayDeliveries,
      totalCreditAccounts, overdueAccounts,
    ] = await Promise.all([
      this.prisma.hardwareBrand.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.hardwareProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.hardwareProject.count({ where: { tenantId: user.tenantId, status: { in: ['APPROVED', 'IN_PROGRESS'] } } }),
      this.prisma.hardwareQuotation.count({ where: { tenantId: user.tenantId, status: { in: ['SENT', 'VIEWED'] } } }),
      this.prisma.hardwareDelivery.count({ where: { tenantId: user.tenantId, status: { in: ['PENDING', 'SCHEDULED', 'LOADED', 'DISPATCHED', 'IN_TRANSIT'] } } }),
      this.prisma.hardwareDelivery.count({
        where: {
          tenantId: user.tenantId,
          scheduledDate: { gte: todayStart, lte: new Date(new Date().setHours(23, 59, 59, 999)) },
        },
      }),
      this.prisma.hardwareCreditAccount.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.hardwareCreditAccount.count({ where: { tenantId: user.tenantId, status: 'OVERDUE' } }),
    ]);

    // Credit totals
    const creditAgg = await this.prisma.hardwareCreditAccount.aggregate({
      where: { tenantId: user.tenantId, status: 'ACTIVE' },
      _sum: { currentBalance: true, totalPurchases: true, ageOver90Days: true },
    });

    // Monthly business
    const monthlyDeliveries = await this.prisma.hardwareDelivery.aggregate({
      where: { tenantId: user.tenantId, status: 'DELIVERED', deliveredAt: { gte: monthAgo } },
      _count: { _all: true },
      _sum: { totalCharges: true },
    });

    // Recent projects
    const activeProjectsList = await this.prisma.hardwareProject.findMany({
      where: { tenantId: user.tenantId, status: { in: ['APPROVED', 'IN_PROGRESS'] } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // Upcoming deliveries
    const upcomingDeliveries = await this.prisma.hardwareDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['PENDING', 'SCHEDULED'] },
        scheduledDate: { gte: new Date() },
      },
      include: { items: { take: 2 } },
      orderBy: { scheduledDate: 'asc' },
      take: 10,
    });

    // Top credit debtors
    const topDebtors = await this.prisma.hardwareCreditAccount.findMany({
      where: { tenantId: user.tenantId, currentBalance: { gt: 0 } },
      orderBy: { currentBalance: 'desc' },
      take: 5,
    });

    // Low stock alerts count
    const reorderRules = await this.prisma.hardwareReorderRule.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });
    const productIds = reorderRules.map((r) => r.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const lowStockCount = reorderRules.filter((r) => (productMap.get(r.productId)?.stock ?? 0) <= r.reorderPoint).length;

    // By category
    const byCategoryAgg = await this.prisma.hardwareProductProfile.groupBy({
      by: ['categoryType'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    // By brand
    const brandsWithRevenue = await this.prisma.hardwareBrand.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: 5,
    });

    return {
      totals: { totalBrands, totalProducts, activeProjects, totalCreditAccounts },
      pending: { quotations: pendingQuotations, deliveries: pendingDeliveries, todayDeliveries, overdueAccounts, lowStockCount },
      creditSummary: {
        totalOutstanding: creditAgg._sum.currentBalance ?? 0,
        totalPurchases: creditAgg._sum.totalPurchases ?? 0,
        totalOverdue90Plus: creditAgg._sum.ageOver90Days ?? 0,
      },
      monthlyBusiness: {
        deliveryCount: monthlyDeliveries._count._all,
        revenue: monthlyDeliveries._sum.totalCharges ?? 0,
      },
      activeProjects: activeProjectsList,
      upcomingDeliveries,
      topDebtors,
      byCategory: byCategoryAgg,
      topBrands: brandsWithRevenue,
    };
  }

  async salesReport(user: AuthenticatedUser, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);

    const deliveries = await this.prisma.hardwareDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'DELIVERED',
        deliveredAt: { gte: start, lte: end },
      },
      include: { items: true, project: true },
    });

    const totalRevenue = deliveries.reduce((s, d) => s + d.totalCharges, 0);
    const deliveryCount = deliveries.length;

    // Group by category
    const byCategoryMap = new Map<string, number>();
    deliveries.forEach((d) => {
      d.items.forEach((it) => {
        byCategoryMap.set(it.brand || 'Uncategorized', (byCategoryMap.get(it.brand || 'Uncategorized') ?? 0) + it.total);
      });
    });

    return {
      period: { from, to },
      totalRevenue,
      deliveryCount,
      avgOrderValue: deliveryCount > 0 ? totalRevenue / deliveryCount : 0,
      byBrand: Array.from(byCategoryMap.entries()).map(([brand, revenue]) => ({ brand, revenue })).sort((a, b) => b.revenue - a.revenue),
      deliveries,
    };
  }
}
