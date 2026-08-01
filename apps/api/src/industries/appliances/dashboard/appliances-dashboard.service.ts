import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class AppliancesDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const monthAgo = subDays(new Date(), 30);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const [
      totalBrands, totalProducts, totalSerials, soldSerials,
      pendingInstallations, todayInstallations, activeAmc, expiringAmc,
      pendingServiceRequests, activeTechnicians, pendingDeliveries,
    ] = await Promise.all([
      this.prisma.applianceBrand.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.applianceProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.applianceSerialTracking.count({ where: { tenantId: user.tenantId } }),
      this.prisma.applianceSerialTracking.count({ where: { tenantId: user.tenantId, status: 'SOLD' } }),
      this.prisma.applianceInstallation.count({ where: { tenantId: user.tenantId, status: { in: ['PENDING', 'SCHEDULED', 'ASSIGNED'] } } }),
      this.prisma.applianceInstallation.count({
        where: {
          tenantId: user.tenantId,
          scheduledDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.applianceAmcContract.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.applianceAmcContract.count({
        where: { tenantId: user.tenantId, status: 'ACTIVE', expiryDate: { gte: new Date(), lte: in30Days } },
      }),
      this.prisma.applianceServiceRequest.count({ where: { tenantId: user.tenantId, status: { in: ['REQUESTED', 'SCHEDULED', 'TECHNICIAN_ASSIGNED'] } } }),
      this.prisma.applianceTechnician.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.applianceDelivery.count({ where: { tenantId: user.tenantId, status: { in: ['PENDING', 'SCHEDULED'] } } }),
    ]);

    // Monthly revenue: sales + service + installations + AMC
    const [monthlySales, monthlyService, monthlyInstallation, monthlyAmc] = await Promise.all([
      this.prisma.applianceSerialTracking.aggregate({
        where: { tenantId: user.tenantId, status: 'SOLD', soldAt: { gte: monthAgo } },
        _sum: { soldPrice: true },
        _count: { _all: true },
      }),
      this.prisma.applianceServiceRequest.aggregate({
        where: { tenantId: user.tenantId, status: 'COMPLETED', completedAt: { gte: monthAgo } },
        _sum: { totalCharge: true, paidAmount: true },
        _count: { _all: true },
      }),
      this.prisma.applianceInstallation.aggregate({
        where: { tenantId: user.tenantId, status: 'COMPLETED', completedAt: { gte: monthAgo } },
        _sum: { totalCharge: true, paidByCustomer: true },
        _count: { _all: true },
      }),
      this.prisma.applianceAmcContract.aggregate({
        where: { tenantId: user.tenantId, createdAt: { gte: monthAgo } },
        _sum: { contractValue: true, paidAmount: true },
        _count: { _all: true },
      }),
    ]);

    // Today's schedule
    const todaySchedule = await this.prisma.applianceInstallation.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDate: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 20,
    });

    // Expiring warranties
    const expiringWarranties = await this.prisma.applianceSerialTracking.count({
      where: {
        tenantId: user.tenantId,
        warrantyEndDate: { gte: new Date(), lte: in30Days },
      },
    });

    // Top selling products
    const topProducts = await this.prisma.applianceProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 10,
    });

    // Top technicians
    const topTechnicians = await this.prisma.applianceTechnician.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: 5,
    });

    // Category breakdown
    const byCategory = await this.prisma.applianceProductProfile.groupBy({
      by: ['categoryType'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    // Recent AMC contracts expiring
    const expiringAmcList = await this.prisma.applianceAmcContract.findMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE', expiryDate: { gte: new Date(), lte: in30Days } },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    });

    // Pending service requests
    const urgentServiceRequests = await this.prisma.applianceServiceRequest.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['REQUESTED', 'SCHEDULED', 'TECHNICIAN_ASSIGNED'] },
      },
      orderBy: [{ priority: 'desc' }, { requestedAt: 'asc' }],
      take: 10,
    });

    return {
      totals: {
        totalBrands, totalProducts, totalSerials, soldSerials,
        activeTechnicians, activeAmc,
      },
      pending: {
        installations: pendingInstallations,
        todayInstallations,
        serviceRequests: pendingServiceRequests,
        deliveries: pendingDeliveries,
        expiringAmc,
        expiringWarranties,
      },
      monthly: {
        sales: {
          count: monthlySales._count._all,
          revenue: monthlySales._sum.soldPrice ?? 0,
        },
        service: {
          count: monthlyService._count._all,
          revenue: monthlyService._sum.totalCharge ?? 0,
          collected: monthlyService._sum.paidAmount ?? 0,
        },
        installation: {
          count: monthlyInstallation._count._all,
          revenue: monthlyInstallation._sum.totalCharge ?? 0,
          collected: monthlyInstallation._sum.paidByCustomer ?? 0,
        },
        amc: {
          count: monthlyAmc._count._all,
          contractValue: monthlyAmc._sum.contractValue ?? 0,
          collected: monthlyAmc._sum.paidAmount ?? 0,
        },
        totalRevenue: (monthlySales._sum.soldPrice ?? 0) + (monthlyService._sum.totalCharge ?? 0) + (monthlyInstallation._sum.totalCharge ?? 0) + (monthlyAmc._sum.contractValue ?? 0),
      },
      todaySchedule,
      topProducts,
      topTechnicians,
      byCategory,
      expiringAmcList,
      urgentServiceRequests,
    };
  }

  async salesReport(user: AuthenticatedUser, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);

    const sales = await this.prisma.applianceSerialTracking.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'SOLD',
        soldAt: { gte: start, lte: end },
      },
      orderBy: { soldAt: 'desc' },
    });

    const totalRevenue = sales.reduce((s, x) => s + (x.soldPrice ?? 0), 0);
    const totalCost = sales.reduce((s, x) => s + (x.purchasePrice ?? 0), 0);
    const profit = totalRevenue - totalCost;

    return {
      period: { from, to },
      salesCount: sales.length,
      totalRevenue,
      totalCost,
      profit,
      profitMargin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0,
      sales,
    };
  }

  async technicianPerformance(user: AuthenticatedUser, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);

    const technicians = await this.prisma.applianceTechnician.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });

    const performance = await Promise.all(
      technicians.map(async (tech) => {
        const [installations, serviceRequests] = await Promise.all([
          this.prisma.applianceInstallation.aggregate({
            where: {
              technicianId: tech.id,
              completedAt: { gte: start, lte: end },
              status: 'COMPLETED',
            },
            _count: { _all: true },
            _sum: { totalCharge: true },
            _avg: { customerRating: true },
          }),
          this.prisma.applianceServiceRequest.aggregate({
            where: {
              technicianId: tech.id,
              completedAt: { gte: start, lte: end },
              status: 'COMPLETED',
            },
            _count: { _all: true },
            _sum: { totalCharge: true },
            _avg: { customerRating: true },
          }),
        ]);

        return {
          technician: tech,
          installations: {
            count: installations._count._all,
            revenue: installations._sum.totalCharge ?? 0,
            avgRating: installations._avg.customerRating ?? 0,
          },
          serviceRequests: {
            count: serviceRequests._count._all,
            revenue: serviceRequests._sum.totalCharge ?? 0,
            avgRating: serviceRequests._avg.customerRating ?? 0,
          },
          totalJobs: installations._count._all + serviceRequests._count._all,
          totalRevenue: (installations._sum.totalCharge ?? 0) + (serviceRequests._sum.totalCharge ?? 0),
        };
      }),
    );

    return performance.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }
}
