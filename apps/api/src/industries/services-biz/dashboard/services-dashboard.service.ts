import { Injectable } from '@nestjs/common';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class ServicesDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const monthAgo = subDays(new Date(), 30);

    const [
      totalServices, totalTechnicians, availableTechnicians,
      activeAmc, activeQuotes,
      todayJobs, pendingJobs, inProgressJobs, urgentJobs,
      todayRevenue, monthlyRevenue,
    ] = await Promise.all([
      this.prisma.serviceCatalog.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.serviceTechnicianProfile.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.serviceTechnicianProfile.count({ where: { tenantId: user.tenantId, isActive: true, status: 'AVAILABLE' } }),
      this.prisma.serviceAmc.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.serviceQuote.count({ where: { tenantId: user.tenantId, status: { in: ['DRAFT', 'SENT'] } } }),

      this.prisma.serviceJob.count({
        where: { tenantId: user.tenantId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.serviceJob.count({
        where: { tenantId: user.tenantId, status: { in: ['CONFIRMED', 'SCHEDULED', 'ASSIGNED'] } },
      }),
      this.prisma.serviceJob.count({
        where: { tenantId: user.tenantId, status: { in: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] } },
      }),
      this.prisma.serviceJob.count({
        where: {
          tenantId: user.tenantId,
          priority: { in: ['URGENT', 'EMERGENCY'] },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),

      this.prisma.serviceJob.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          completedAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { totalCharge: true, paidAmount: true },
      }),
      this.prisma.serviceJob.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'COMPLETED',
          completedAt: { gte: monthAgo },
        },
        _sum: { totalCharge: true, paidAmount: true, labourCharge: true, partsCharge: true },
      }),
    ]);

    // Upcoming today
    const upcomingToday = await this.prisma.serviceJob.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledStart: { gte: new Date(), lte: todayEnd },
        status: { in: ['CONFIRMED', 'SCHEDULED', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE'] },
      },
      orderBy: { scheduledStart: 'asc' },
      take: 10,
    });

    // Emergency queue
    const emergencyQueue = await this.prisma.serviceJob.findMany({
      where: {
        tenantId: user.tenantId,
        priority: { in: ['URGENT', 'EMERGENCY'] },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    });

    // AMC renewal due
    const renewalCutoff = new Date();
    renewalCutoff.setDate(renewalCutoff.getDate() + 30);
    const renewalDue = await this.prisma.serviceAmc.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        endDate: { gte: new Date(), lte: renewalCutoff },
      },
      orderBy: { endDate: 'asc' },
      take: 10,
    });

    // Top technicians
    const topTechData = await this.prisma.serviceJob.groupBy({
      by: ['primaryTechnicianId'],
      where: {
        tenantId: user.tenantId,
        status: 'COMPLETED',
        completedAt: { gte: monthAgo },
        primaryTechnicianId: { not: null },
      },
      _sum: { totalCharge: true },
      _count: { _all: true },
    });
    const sortedTopTech = topTechData
      .sort((a, b) => (b._sum.totalCharge ?? 0) - (a._sum.totalCharge ?? 0))
      .slice(0, 5);

    const techStaffIds = sortedTopTech.map((t) => t.primaryTechnicianId).filter(Boolean) as string[];
    const techStaff = await this.prisma.staff.findMany({ where: { id: { in: techStaffIds } } });
    const techMap = new Map(techStaff.map((s) => [s.id, s]));

    const topTechnicians = sortedTopTech.map((t) => ({
      technicianId: t.primaryTechnicianId,
      name: techMap.get(t.primaryTechnicianId!),
      revenue: t._sum.totalCharge ?? 0,
      completedJobs: t._count._all,
    }));

    // By business type
    const byBusinessType = await this.prisma.serviceJob.groupBy({
      by: ['businessType'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
      _sum: { totalCharge: true },
    });

    // Avg rating
    const ratings = await this.prisma.serviceJob.aggregate({
      where: {
        tenantId: user.tenantId,
        customerRating: { not: null },
        completedAt: { gte: monthAgo },
      },
      _avg: { customerRating: true },
      _count: { customerRating: true },
    });

    return {
      totals: {
        totalServices,
        totalTechnicians,
        availableTechnicians,
        activeAmc,
        activeQuotes,
      },
      today: {
        newJobs: todayJobs,
        pending: pendingJobs,
        inProgress: inProgressJobs,
        urgent: urgentJobs,
        revenue: todayRevenue._sum.totalCharge ?? 0,
        collected: todayRevenue._sum.paidAmount ?? 0,
      },
      monthly: {
        revenue: monthlyRevenue._sum.totalCharge ?? 0,
        collected: monthlyRevenue._sum.paidAmount ?? 0,
        labour: monthlyRevenue._sum.labourCharge ?? 0,
        parts: monthlyRevenue._sum.partsCharge ?? 0,
      },
      quality: {
        avgRating: ratings._avg.customerRating,
        ratedJobs: ratings._count.customerRating,
      },
      upcomingToday,
      emergencyQueue,
      renewalDue,
      topTechnicians,
      byBusinessType,
    };
  }
}
