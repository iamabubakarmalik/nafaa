import { Injectable } from '@nestjs/common';
import { startOfDay, startOfMonth, subDays, format } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminSystemService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const todayStart = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    const [
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      totalUsers,
      totalProducts,
      totalSales,
      totalRevenue,
      totalSubscriptions,
      activeSubscriptions,
      pendingPayments,
      approvedPaymentsAgg,
      newTenantsToday,
      newTenantsMonth,
      tenantsByStatus,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { slug: { not: 'nafaa-system' } } }),
      this.prisma.tenant.count({
        where: { status: 'ACTIVE', slug: { not: 'nafaa-system' } },
      }),
      this.prisma.tenant.count({
        where: { status: 'TRIAL', slug: { not: 'nafaa-system' } },
      }),
      this.prisma.tenant.count({
        where: { status: 'SUSPENDED', slug: { not: 'nafaa-system' } },
      }),
      this.prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      this.prisma.product.count(),
      this.prisma.sale.count({ where: { status: 'COMPLETED' } }),
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { total: true },
      }),
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
      }),
      this.prisma.tenant.count({
        where: {
          createdAt: { gte: todayStart },
          slug: { not: 'nafaa-system' },
        },
      }),
      this.prisma.tenant.count({
        where: {
          createdAt: { gte: monthStart },
          slug: { not: 'nafaa-system' },
        },
      }),
      this.prisma.tenant.groupBy({
        by: ['status'],
        where: { slug: { not: 'nafaa-system' } },
        _count: { _all: true },
      }),
    ]);

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        trial: trialTenants,
        suspended: suspendedTenants,
        newToday: newTenantsToday,
        newThisMonth: newTenantsMonth,
        byStatus: tenantsByStatus,
      },
      users: {
        total: totalUsers,
      },
      business: {
        totalProducts,
        totalSales,
        totalRevenuePlatform: totalRevenue._sum.total ?? 0,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
      },
      payments: {
        pendingCount: pendingPayments,
        totalApprovedRevenue: approvedPaymentsAgg._sum.amount ?? 0,
      },
    };
  }

  async signupTrend(days = 30) {
    const start = startOfDay(subDays(new Date(), days - 1));

    const tenants = await this.prisma.tenant.findMany({
      where: {
        slug: { not: 'nafaa-system' },
        createdAt: { gte: start },
      },
      select: { createdAt: true },
    });

    const buckets: Record<string, { date: string; count: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      buckets[d] = { date: d, count: 0 };
    }

    for (const t of tenants) {
      const key = format(t.createdAt, 'yyyy-MM-dd');
      if (buckets[key]) buckets[key].count += 1;
    }

    return Object.values(buckets);
  }

  async revenueTrend(days = 30) {
    const start = startOfDay(subDays(new Date(), days - 1));

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'APPROVED',
        approvedAt: { gte: start, not: null },
      },
      select: { approvedAt: true, amount: true },
    });

    const buckets: Record<string, { date: string; amount: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      buckets[d] = { date: d, amount: 0 };
    }

    for (const p of payments) {
      if (!p.approvedAt) continue;
      const key = format(p.approvedAt, 'yyyy-MM-dd');
      if (buckets[key]) buckets[key].amount += p.amount;
    }

    return Object.values(buckets);
  }

  async planDistribution() {
    const subs = await this.prisma.subscription.findMany({
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: { select: { id: true, name: true, slug: true } } },
    });

    const buckets: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const s of subs) {
      const key = s.plan.id;
      if (!buckets[key]) {
        buckets[key] = { name: s.plan.name, count: 0, revenue: 0 };
      }
      buckets[key].count += 1;
      buckets[key].revenue += s.amount;
    }

    return Object.values(buckets).sort((a, b) => b.count - a.count);
  }

  async recentActivity() {
    const [recentTenants, recentPayments, recentSubscriptions] = await Promise.all([
      this.prisma.tenant.findMany({
        where: { slug: { not: 'nafaa-system' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          referralCode: true,
        },
      }),
      this.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          tenant: { select: { id: true, name: true } },
          invoice: { select: { invoiceNumber: true } },
        },
      }),
      this.prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          tenant: { select: { id: true, name: true } },
          plan: { select: { name: true } },
        },
      }),
    ]);

    return {
      recentTenants,
      recentPayments,
      recentSubscriptions,
    };
  }
}
