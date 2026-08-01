import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

function daysUntilNextBirthday(birthDate: Date, from = new Date()): number {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

@Injectable()
export class ToystoreDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const [
      totalProducts, educationalCount, rcCount, giftPacks, activeGiftPacks,
      birthdaysRegistered, safetyIssues, batteryUpsell,
    ] = await Promise.all([
      this.prisma.toyProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.toyProductProfile.count({ where: { tenantId: user.tenantId, isEducational: true } }),
      this.prisma.toyProductProfile.count({ where: { tenantId: user.tenantId, isRemoteControlled: true } }),
      this.prisma.toyGiftPack.count({ where: { tenantId: user.tenantId } }),
      this.prisma.toyGiftPack.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.toyBirthdayReminder.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.toyProductProfile.count({
        where: {
          tenantId: user.tenantId,
          OR: [{ chokingHazard: true }, { isNonToxic: false }, { safetyCertifications: { isEmpty: true } }],
        },
      }),
      this.prisma.toyProductProfile.count({
        where: { tenantId: user.tenantId, requiresBatteries: true, batteriesIncluded: false },
      }),
    ]);

    // Upcoming birthdays
    const allBirthdays = await this.prisma.toyBirthdayReminder.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      take: 1000,
    });
    const upcoming = allBirthdays
      .map((r) => ({
        id: r.id, childName: r.childName, customerName: r.customerName, customerPhone: r.customerPhone,
        childGender: r.childGender, budgetRange: r.budgetRange, lastGiftGiven: r.lastGiftGiven,
        totalSpent: r.totalSpent,
        daysUntil: daysUntilNextBirthday(r.childBirthDate),
        turningAge: Math.floor((Date.now() - new Date(r.childBirthDate).getTime()) / (365.25 * 86400000)) + 1,
      }))
      .filter((r) => r.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 20);

    const thisWeekBirthdays = upcoming.filter((u) => u.daysUntil <= 7).length;

    // Revenue aggregates from product profiles
    const revenueAgg = await this.prisma.toyProductProfile.aggregate({
      where: { tenantId: user.tenantId },
      _sum: { totalRevenue: true, totalSold: true },
    });

    const giftPackAgg = await this.prisma.toyGiftPack.aggregate({
      where: { tenantId: user.tenantId },
      _sum: { totalSold: true }, _avg: { savingsPct: true },
    });

    const topProducts = await this.prisma.toyProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 10,
    });

    const topGiftPacks = await this.prisma.toyGiftPack.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalSold: 'desc' },
      take: 5,
    });

    const [byCategory, byAgeGroup, byGender] = await Promise.all([
      this.prisma.toyProductProfile.groupBy({
        by: ['categoryType'], where: { tenantId: user.tenantId }, _count: { _all: true },
      }),
      this.prisma.toyProductProfile.groupBy({
        by: ['ageGroup'], where: { tenantId: user.tenantId }, _count: { _all: true }, _sum: { totalRevenue: true },
      }),
      this.prisma.toyProductProfile.groupBy({
        by: ['genderTarget'], where: { tenantId: user.tenantId }, _count: { _all: true },
      }),
    ]);

    return {
      totals: {
        totalProducts, educationalCount, rcCount,
        giftPacks, activeGiftPacks, birthdaysRegistered,
        lifetimeUnitsSold: revenueAgg._sum.totalSold ?? 0,
        lifetimeRevenue: revenueAgg._sum.totalRevenue ?? 0,
        giftPacksSold: giftPackAgg._sum.totalSold ?? 0,
        avgGiftPackSavingsPct: Number((giftPackAgg._avg.savingsPct ?? 0).toFixed(1)),
      },
      alerts: {
        safetyIssues,
        batteryUpsellOpportunities: batteryUpsell,
        birthdaysThisWeek: thisWeekBirthdays,
        birthdaysThisMonth: upcoming.length,
      },
      upcomingBirthdays: upcoming,
      topProducts,
      topGiftPacks,
      byCategory,
      byAgeGroup: byAgeGroup.map((a) => ({ ageGroup: a.ageGroup, count: a._count._all, revenue: a._sum.totalRevenue ?? 0 })),
      byGender: byGender.map((g) => ({ gender: g.genderTarget, count: g._count._all })),
    };
  }

  async ageAnalytics(user: AuthenticatedUser) {
    const rows = await this.prisma.toyProductProfile.groupBy({
      by: ['ageGroup'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
      _sum: { totalSold: true, totalRevenue: true },
      _avg: { retailPrice: true },
    });

    const totalRevenue = rows.reduce((s, r) => s + (r._sum.totalRevenue ?? 0), 0);

    return {
      totalRevenue,
      segments: rows
        .map((r) => ({
          ageGroup: r.ageGroup,
          productCount: r._count._all,
          unitsSold: r._sum.totalSold ?? 0,
          revenue: r._sum.totalRevenue ?? 0,
          avgPrice: Number((r._avg.retailPrice ?? 0).toFixed(0)),
          revenueSharePct: totalRevenue ? Number((((r._sum.totalRevenue ?? 0) / totalRevenue) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue),
    };
  }

  async salesReport(user: AuthenticatedUser, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);

    // Sales come from the core sale tables; here we aggregate toy-profile products sold
    const sales = await this.prisma.sale.findMany({
      where: { tenantId: user.tenantId, soldAt: { gte: start, lte: end } },
      include: { items: { include: { product: true } } },
      take: 2000,
    });

    const toyProfiles = await this.prisma.toyProductProfile.findMany({
      where: { tenantId: user.tenantId },
      select: { productId: true, categoryType: true, ageGroup: true, genderTarget: true, isEducational: true },
    });
    const profileMap = new Map(toyProfiles.map((p) => [p.productId, p]));

    let revenue = 0;
    let units = 0;
    const byCategory: Record<string, { units: number; revenue: number }> = {};
    const byAgeGroup: Record<string, { units: number; revenue: number }> = {};
    let educationalRevenue = 0;

    sales.forEach((s) => {
      s.items.forEach((it: any) => {
        const prof = profileMap.get(it.product?.id);
        if (!prof) return;
        const line = Number(it.total || 0);
        const qty = Number(it.quantity || 0);
        revenue += line;
        units += qty;

        const c = prof.categoryType || 'OTHER';
        byCategory[c] = byCategory[c] || { units: 0, revenue: 0 };
        byCategory[c].units += qty;
        byCategory[c].revenue += line;

        const a = prof.ageGroup;
        byAgeGroup[a] = byAgeGroup[a] || { units: 0, revenue: 0 };
        byAgeGroup[a].units += qty;
        byAgeGroup[a].revenue += line;

        if (prof.isEducational) educationalRevenue += line;
      });
    });

    return {
      period: { from, to },
      totals: {
        orders: sales.length,
        unitsSold: units,
        revenue,
        avgOrderValue: sales.length ? Number((revenue / sales.length).toFixed(0)) : 0,
        educationalRevenue,
        educationalSharePct: revenue ? Number(((educationalRevenue / revenue) * 100).toFixed(1)) : 0,
      },
      byCategory,
      byAgeGroup,
    };
  }
}
