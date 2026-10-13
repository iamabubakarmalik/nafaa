import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import { loadKhata } from '../common/customer-khata';

@Injectable()
export class HardwareDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDayTz();
    const monthAgo = subDays(new Date(), 30);

    const [
      totalBrands, totalProducts, activeProjects,
      pendingQuotations, pendingDeliveries, todayDeliveries,
    ] = await Promise.all([
      this.prisma.hardwareBrand.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.hardwareProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.hardwareProject.count({ where: { tenantId: user.tenantId, status: { in: ['APPROVED', 'IN_PROGRESS'] } } }),
      this.prisma.hardwareQuotation.count({ where: { tenantId: user.tenantId, status: { in: ['SENT', 'VIEWED'] } } }),
      this.prisma.hardwareDelivery.count({ where: { tenantId: user.tenantId, status: { in: ['PENDING', 'SCHEDULED', 'LOADED', 'DISPATCHED', 'IN_TRANSIT'] } } }),
      this.prisma.hardwareDelivery.count({
        where: {
          tenantId: user.tenantId,
          scheduledDate: { gte: todayStart, lte: endOfDayTz() },
        },
      }),
    ]);

    // Udhaar comes from the customer khata — the same figures as the khata page and day book.
    const debtors = await this.prisma.customer.findMany({
      where: { tenantId: user.tenantId, balance: { gt: 0.009 } },
      select: { id: true, name: true, phone: true, balance: true, creditLimit: true },
      orderBy: { balance: 'desc' },
    });
    const khata = await loadKhata(this.prisma, user.tenantId, debtors.map((d) => d.id));
    const debtorRows = debtors.map((d) => {
      const k = khata.get(d.id);
      return {
        id: d.id,
        customerId: d.id,
        customerName: d.name,
        customerPhone: d.phone,
        currentBalance: d.balance,
        creditLimit: d.creditLimit,
        age0To30Days: k?.age0To30Days ?? 0,
        age31To60Days: k?.age31To60Days ?? 0,
        age61To90Days: k?.age61To90Days ?? 0,
        ageOver90Days: k?.ageOver90Days ?? 0,
        lastPurchaseDate: k?.lastPurchaseDate ?? null,
        lastPaymentDate: k?.lastPaymentDate ?? null,
      };
    });
    const isOverdue = (d: (typeof debtorRows)[number]) =>
      d.ageOver90Days > 0 || (d.creditLimit > 0 && d.currentBalance > d.creditLimit);
    const totalCreditAccounts = debtorRows.length;
    const overdueAccounts = debtorRows.filter(isOverdue).length;

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

    const topDebtors = debtorRows.slice(0, 5);

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
        totalOutstanding: Math.round(debtorRows.reduce((s, d) => s + d.currentBalance, 0) * 100) / 100,
        totalPurchases: 0,
        totalOverdue90Plus: Math.round(debtorRows.reduce((s, d) => s + d.ageOver90Days, 0) * 100) / 100,
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
