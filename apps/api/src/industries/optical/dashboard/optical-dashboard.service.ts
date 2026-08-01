import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class OpticalDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const now = new Date();
    const monthAgo = subDays(now, 30);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
    const in60 = new Date(); in60.setDate(in60.getDate() + 60);

    const [
      totalProducts, totalOptometrists, activeOptometrists,
      totalPrescriptions, activePrescriptions, expiringPrescriptions,
      todayAppointments, pendingTests, lensOrdersAtLab, lensOrdersReady, overdueLensOrders,
    ] = await Promise.all([
      this.prisma.opticalProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.opticalOptometrist.count({ where: { tenantId: user.tenantId } }),
      this.prisma.opticalOptometrist.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId } }),
      this.prisma.opticalPrescription.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.opticalPrescription.count({
        where: { tenantId: user.tenantId, isActive: true, expiryDate: { gte: now, lte: in60 } },
      }),
      this.prisma.opticalEyeTest.count({
        where: { tenantId: user.tenantId, appointmentDate: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.opticalEyeTest.count({
        where: { tenantId: user.tenantId, status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] } },
      }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: { in: ['SENT_TO_LAB', 'AT_LAB'] } } }),
      this.prisma.opticalLensOrder.count({ where: { tenantId: user.tenantId, status: { in: ['FITTED', 'READY'] } } }),
      this.prisma.opticalLensOrder.count({
        where: { tenantId: user.tenantId, status: { notIn: ['DELIVERED', 'CANCELLED'] }, expectedDate: { lt: now } },
      }),
    ]);

    // Revenue streams
    const [testRevenueMonth, lensRevenueMonth, lensRevenueToday, testRevenueToday, receivables] = await Promise.all([
      this.prisma.opticalEyeTest.aggregate({
        where: { tenantId: user.tenantId, testCompletedAt: { gte: monthStart } },
        _sum: { paidAmount: true }, _count: { _all: true },
      }),
      this.prisma.opticalLensOrder.aggregate({
        where: { tenantId: user.tenantId, orderedAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
        _sum: { totalPrice: true, framePrice: true, lensPrice: true }, _count: { _all: true },
      }),
      this.prisma.opticalLensOrder.aggregate({
        where: { tenantId: user.tenantId, orderedAt: { gte: todayStart, lte: todayEnd }, status: { not: 'CANCELLED' } },
        _sum: { totalPrice: true }, _count: { _all: true },
      }),
      this.prisma.opticalEyeTest.aggregate({
        where: { tenantId: user.tenantId, testCompletedAt: { gte: todayStart, lte: todayEnd } },
        _sum: { paidAmount: true }, _count: { _all: true },
      }),
      this.prisma.opticalLensOrder.aggregate({
        where: { tenantId: user.tenantId, status: { not: 'CANCELLED' } },
        _sum: { remainingAmount: true },
      }),
    ]);

    // Today's appointment schedule
    const todaySchedule = await this.prisma.opticalEyeTest.findMany({
      where: { tenantId: user.tenantId, appointmentDate: { gte: todayStart, lte: todayEnd } },
      orderBy: { appointmentDate: 'asc' },
      take: 25,
    });

    // Orders ready for customer pickup
    const readyForPickup = await this.prisma.opticalLensOrder.findMany({
      where: { tenantId: user.tenantId, status: { in: ['FITTED', 'READY'] } },
      orderBy: { fittedAt: 'asc' },
      take: 15,
    });

    // Overdue lab orders
    const overdueList = await this.prisma.opticalLensOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
        expectedDate: { lt: now },
      },
      orderBy: { expectedDate: 'asc' },
      take: 15,
    });

    // Expiring prescriptions (recall opportunity)
    const expiringList = await this.prisma.opticalPrescription.findMany({
      where: { tenantId: user.tenantId, isActive: true, expiryDate: { gte: now, lte: in60 } },
      orderBy: { expiryDate: 'asc' },
      take: 15,
    });

    // Top products
    const topProducts = await this.prisma.opticalProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 10,
    });

    // Top optometrists
    const topOptometrists = await this.prisma.opticalOptometrist.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: 5,
    });

    // Category breakdown
    const byCategory = await this.prisma.opticalProductProfile.groupBy({
      by: ['categoryType'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    const testRev = testRevenueMonth._sum.paidAmount ?? 0;
    const lensRev = lensRevenueMonth._sum.totalPrice ?? 0;

    return {
      totals: {
        totalProducts, totalOptometrists, activeOptometrists,
        totalPrescriptions, activePrescriptions,
      },
      pending: {
        todayAppointments,
        pendingTests,
        lensOrdersAtLab,
        lensOrdersReady,
        overdueLensOrders,
        expiringPrescriptions,
      },
      today: {
        testCount: testRevenueToday._count._all,
        testRevenue: testRevenueToday._sum.paidAmount ?? 0,
        lensOrderCount: lensRevenueToday._count._all,
        lensRevenue: lensRevenueToday._sum.totalPrice ?? 0,
        totalRevenue: (testRevenueToday._sum.paidAmount ?? 0) + (lensRevenueToday._sum.totalPrice ?? 0),
      },
      monthly: {
        eyeTests: { count: testRevenueMonth._count._all, revenue: testRev },
        lensOrders: {
          count: lensRevenueMonth._count._all,
          revenue: lensRev,
          frameRevenue: lensRevenueMonth._sum.framePrice ?? 0,
          lensOnlyRevenue: lensRevenueMonth._sum.lensPrice ?? 0,
        },
        totalRevenue: testRev + lensRev,
        totalReceivable: receivables._sum.remainingAmount ?? 0,
      },
      todaySchedule,
      readyForPickup,
      overdueList,
      expiringList,
      topProducts,
      topOptometrists,
      byCategory,
    };
  }

  async salesReport(user: AuthenticatedUser, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);

    const [lensOrders, eyeTests] = await Promise.all([
      this.prisma.opticalLensOrder.findMany({
        where: { tenantId: user.tenantId, orderedAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
        orderBy: { orderedAt: 'desc' },
      }),
      this.prisma.opticalEyeTest.findMany({
        where: { tenantId: user.tenantId, testCompletedAt: { gte: start, lte: end } },
        orderBy: { testCompletedAt: 'desc' },
      }),
    ]);

    const lensRevenue = lensOrders.reduce((s, o) => s + o.totalPrice, 0);
    const lensCollected = lensOrders.reduce((s, o) => s + o.paidAmount, 0);
    const frameRevenue = lensOrders.reduce((s, o) => s + o.framePrice, 0);
    const lensOnly = lensOrders.reduce((s, o) => s + o.lensPrice, 0);
    const fitting = lensOrders.reduce((s, o) => s + o.fittingCharge, 0);
    const testRevenue = eyeTests.reduce((s, t) => s + t.paidAmount, 0);

    return {
      period: { from, to },
      lensOrders: {
        count: lensOrders.length,
        billed: lensRevenue,
        collected: lensCollected,
        outstanding: lensRevenue - lensCollected,
        breakdown: { frames: frameRevenue, lenses: lensOnly, fitting },
        avgOrderValue: lensOrders.length ? lensRevenue / lensOrders.length : 0,
      },
      eyeTests: {
        count: eyeTests.length,
        revenue: testRevenue,
        prescriptionsIssued: eyeTests.filter((t) => t.prescriptionIssued).length,
        avgFee: eyeTests.length ? testRevenue / eyeTests.length : 0,
      },
      grandTotal: lensRevenue + testRevenue,
      orders: lensOrders,
      tests: eyeTests,
    };
  }

  async optometristPerformance(user: AuthenticatedUser, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);
    const list = await this.prisma.opticalOptometrist.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });

    const performance = await Promise.all(
      list.map(async (o) => {
        const tests = await this.prisma.opticalEyeTest.findMany({
          where: { optometristId: o.id, appointmentDate: { gte: start, lte: end } },
        });
        const completed = tests.filter((t) => t.status === 'COMPLETED');
        const revenue = completed.reduce((s, t) => s + t.paidAmount, 0);
        const avgDuration = completed.length
          ? completed.reduce((s, t) => s + (t.testDurationMinutes ?? 0), 0) / completed.length
          : 0;

        return {
          optometrist: o,
          totalAppointments: tests.length,
          completed: completed.length,
          noShow: tests.filter((t) => t.status === 'NO_SHOW').length,
          cancelled: tests.filter((t) => t.status === 'CANCELLED').length,
          prescriptionsIssued: completed.filter((t) => t.prescriptionIssued).length,
          revenue,
          avgDurationMinutes: Math.round(avgDuration),
          completionRate: tests.length ? Number(((completed.length / tests.length) * 100).toFixed(1)) : 0,
        };
      }),
    );

    return performance.sort((a, b) => b.revenue - a.revenue);
  }

  async prescriptionAnalytics(user: AuthenticatedUser) {
    const all = await this.prisma.opticalPrescription.findMany({
      where: { tenantId: user.tenantId },
      select: { rightSph: true, leftSph: true, rightCyl: true, leftCyl: true, customerAge: true, prescriptionType: true },
      take: 2000,
    });

    const buckets = { high_myopia: 0, myopia: 0, mild: 0, hyperopia: 0, high_hyperopia: 0 };
    let astigmatismCount = 0;

    all.forEach((rx) => {
      const sph = rx.rightSph ?? rx.leftSph;
      if (sph == null) return;
      if (sph <= -6) buckets.high_myopia++;
      else if (sph < -0.5) buckets.myopia++;
      else if (sph <= 0.5) buckets.mild++;
      else if (sph < 3) buckets.hyperopia++;
      else buckets.high_hyperopia++;

      const cyl = Math.abs(rx.rightCyl ?? 0) + Math.abs(rx.leftCyl ?? 0);
      if (cyl > 0) astigmatismCount++;
    });

    const byType: Record<string, number> = {};
    all.forEach((rx) => {
      const k = rx.prescriptionType || 'UNSPECIFIED';
      byType[k] = (byType[k] || 0) + 1;
    });

    const ageGroups = { kids_0_12: 0, teens_13_19: 0, adults_20_39: 0, adults_40_59: 0, seniors_60_plus: 0, unknown: 0 };
    all.forEach((rx) => {
      const a = rx.customerAge;
      if (a == null) ageGroups.unknown++;
      else if (a <= 12) ageGroups.kids_0_12++;
      else if (a <= 19) ageGroups.teens_13_19++;
      else if (a <= 39) ageGroups.adults_20_39++;
      else if (a <= 59) ageGroups.adults_40_59++;
      else ageGroups.seniors_60_plus++;
    });

    return {
      totalAnalyzed: all.length,
      powerDistribution: buckets,
      astigmatismCount,
      astigmatismPct: all.length ? Number(((astigmatismCount / all.length) * 100).toFixed(1)) : 0,
      byPrescriptionType: byType,
      byAgeGroup: ageGroups,
    };
  }
}
