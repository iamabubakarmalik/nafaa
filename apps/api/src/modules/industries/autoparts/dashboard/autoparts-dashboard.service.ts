import { Injectable } from '@nestjs/common';
import { addDays, startOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class AutoPartsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const monthAgo = subDays(new Date(), 30);
    const in30d = addDays(new Date(), 30);

    const [
      totalVehicles, totalMechanics, activeJobs, waitingParts, readyDelivery,
      todayRevenue, monthlyRevenue, expiringInsurance, expiringToken, expiringFitness,
    ] = await Promise.all([
      this.prisma.customerVehicle.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.mechanicProfile.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.workshopJob.count({ where: { tenantId: user.tenantId, status: { in: ['APPROVED', 'IN_PROGRESS'] } } }),
      this.prisma.workshopJob.count({ where: { tenantId: user.tenantId, status: 'WAITING_PARTS' } }),
      this.prisma.workshopJob.count({ where: { tenantId: user.tenantId, status: 'READY_FOR_TEST' } }),
      this.prisma.workshopJob.aggregate({
        where: { tenantId: user.tenantId, deliveredAt: { gte: todayStart }, status: 'DELIVERED' },
        _sum: { total: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.workshopJob.aggregate({
        where: { tenantId: user.tenantId, deliveredAt: { gte: monthAgo }, status: 'DELIVERED' },
        _sum: { total: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.customerVehicle.count({ where: { tenantId: user.tenantId, insuranceExpiry: { gte: new Date(), lte: in30d } } }),
      this.prisma.customerVehicle.count({ where: { tenantId: user.tenantId, tokenTaxExpiry: { gte: new Date(), lte: in30d } } }),
      this.prisma.customerVehicle.count({ where: { tenantId: user.tenantId, fitnessExpiry: { gte: new Date(), lte: in30d } } }),
    ]);

    const upcomingJobs = await this.prisma.workshopJob.findMany({
      where: {
        tenantId: user.tenantId,
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
        promisedAt: { gte: new Date() },
      },
      orderBy: { promisedAt: 'asc' },
      take: 10,
    });

    const overdueJobs = await this.prisma.workshopJob.findMany({
      where: {
        tenantId: user.tenantId,
        status: { notIn: ['DELIVERED', 'CANCELLED', 'COMPLETED'] },
        promisedAt: { lt: new Date() },
      },
      orderBy: { promisedAt: 'asc' },
      take: 10,
    });

    // Top mechanics — FIXED: added orderBy required by Prisma when using take
    const topMechanicsRaw = await this.prisma.workshopJob.groupBy({
      by: ['primaryMechanicId'],
      where: {
        tenantId: user.tenantId,
        primaryMechanicId: { not: null },
        deliveredAt: { gte: monthAgo },
        status: 'DELIVERED',
      },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 20,
    });
    const topMechanicsSorted: Array<{
      primaryMechanicId: string | null;
      _sum: { total: number | null };
      _count: { _all: number };
    }> = (topMechanicsRaw as any[]).slice(0, 5);

    const mechanicIds = topMechanicsSorted.map((m) => m.primaryMechanicId).filter((x): x is string => !!x);
    const mechs = await this.prisma.mechanicProfile.findMany({ where: { id: { in: mechanicIds } } });
    const staffs = await this.prisma.staff.findMany({ where: { id: { in: mechs.map((m) => m.staffId) } } });
    const mMap = new Map(mechs.map((m) => [m.id, m]));
    const sMap = new Map(staffs.map((s) => [s.id, s]));

    const topMechanics = topMechanicsSorted.map((t) => {
      const m = t.primaryMechanicId ? mMap.get(t.primaryMechanicId) : null;
      const s = m ? sMap.get(m.staffId) : null;
      const anyS = s as any;
      const nm = anyS ? `${anyS.firstName || ''} ${anyS.lastName || ''}`.trim() : '';
      return {
        mechanicId: t.primaryMechanicId,
        name: nm,
        photoUrl: m?.photoUrl,
        revenue: t._sum.total ?? 0,
        jobs: t._count._all,
      };
    });

    const jobsByType = await this.prisma.workshopJob.groupBy({
      by: ['jobType'],
      where: { tenantId: user.tenantId, createdAt: { gte: monthAgo } },
      _count: { _all: true },
    });

    return {
      totals: { totalVehicles, totalMechanics, activeJobs, waitingParts, readyDelivery },
      today: {
        revenue: todayRevenue._sum.total ?? 0,
        collected: todayRevenue._sum.paidAmount ?? 0,
        deliveredCount: todayRevenue._count._all,
      },
      monthly: {
        revenue: monthlyRevenue._sum.total ?? 0,
        collected: monthlyRevenue._sum.paidAmount ?? 0,
        jobCount: monthlyRevenue._count._all,
      },
      expiring: { insurance: expiringInsurance, tokenTax: expiringToken, fitness: expiringFitness },
      upcomingJobs,
      overdueJobs,
      topMechanics,
      jobsByType,
    };
  }
}
