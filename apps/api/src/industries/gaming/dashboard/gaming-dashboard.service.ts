import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class GamingDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const monthAgo = subDays(new Date(), 30);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [
      totalProducts, totalStations, activeStations,
      activeRentals, overdueRentals, activeSessions,
      availableTopups, upcomingTournaments,
    ] = await Promise.all([
      this.prisma.gamingProductProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.gamingStation.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.gamingCafeSession.count({ where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'PAUSED'] } } }),
      this.prisma.gamingRental.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.gamingRental.count({ where: { tenantId: user.tenantId, status: 'OVERDUE' } }),
      this.prisma.gamingCafeSession.count({ where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'PAUSED'] } } }),
      this.prisma.gamingDigitalTopup.count({ where: { tenantId: user.tenantId, soldAt: null, isRedeemed: false } }),
      this.prisma.gamingTournament.count({ where: { tenantId: user.tenantId, scheduledDate: { gte: new Date() }, status: 'UPCOMING' } }),
    ]);

    // Today's revenue: cafe sessions + topups + rentals
    const [todayCafeRevenue, todayTopupRevenue, todayRentalRevenue] = await Promise.all([
      this.prisma.gamingCafeSession.aggregate({
        where: { tenantId: user.tenantId, status: 'ENDED', endedAt: { gte: todayStart } },
        _sum: { totalAmount: true, paidAmount: true }, _count: { _all: true },
      }),
      this.prisma.gamingDigitalTopup.aggregate({
        where: { tenantId: user.tenantId, soldAt: { gte: todayStart } },
        _sum: { sellingPrice: true, profit: true }, _count: { _all: true },
      }),
      this.prisma.gamingRental.aggregate({
        where: { tenantId: user.tenantId, createdAt: { gte: todayStart } },
        _sum: { totalPrice: true }, _count: { _all: true },
      }),
    ]);

    // Monthly business
    const [monthlyCafe, monthlyTopup, monthlyRental] = await Promise.all([
      this.prisma.gamingCafeSession.aggregate({
        where: { tenantId: user.tenantId, status: 'ENDED', endedAt: { gte: monthAgo } },
        _sum: { totalAmount: true },
      }),
      this.prisma.gamingDigitalTopup.aggregate({
        where: { tenantId: user.tenantId, soldAt: { gte: monthAgo } },
        _sum: { sellingPrice: true, profit: true },
      }),
      this.prisma.gamingRental.aggregate({
        where: { tenantId: user.tenantId, createdAt: { gte: monthAgo } },
        _sum: { totalPrice: true },
      }),
    ]);

    // Live station status
    const liveSessions = await this.prisma.gamingCafeSession.findMany({
      where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'PAUSED'] } },
      include: { station: true },
      orderBy: { startedAt: 'asc' },
    });

    // Top selling games
    const topProducts = await this.prisma.gamingProductProfile.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { totalSold: 'desc' },
      take: 10,
    });

    // Upcoming tournaments
    const tournaments = await this.prisma.gamingTournament.findMany({
      where: { tenantId: user.tenantId, scheduledDate: { gte: new Date() }, status: 'UPCOMING' },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    });

    return {
      totals: { totalProducts, totalStations, activeStations, activeSessions },
      inventory: { availableTopups, upcomingTournaments },
      rentals: { active: activeRentals, overdue: overdueRentals },
      today: {
        sessionsCount: todayCafeRevenue._count._all,
        cafeRevenue: todayCafeRevenue._sum.totalAmount ?? 0,
        topupCount: todayTopupRevenue._count._all,
        topupRevenue: todayTopupRevenue._sum.sellingPrice ?? 0,
        topupProfit: todayTopupRevenue._sum.profit ?? 0,
        rentalCount: todayRentalRevenue._count._all,
        rentalRevenue: todayRentalRevenue._sum.totalPrice ?? 0,
        totalRevenue: (todayCafeRevenue._sum.totalAmount ?? 0) + (todayTopupRevenue._sum.sellingPrice ?? 0) + (todayRentalRevenue._sum.totalPrice ?? 0),
      },
      monthly: {
        cafeRevenue: monthlyCafe._sum.totalAmount ?? 0,
        topupRevenue: monthlyTopup._sum.sellingPrice ?? 0,
        topupProfit: monthlyTopup._sum.profit ?? 0,
        rentalRevenue: monthlyRental._sum.totalPrice ?? 0,
        totalRevenue: (monthlyCafe._sum.totalAmount ?? 0) + (monthlyTopup._sum.sellingPrice ?? 0) + (monthlyRental._sum.totalPrice ?? 0),
      },
      liveSessions, topProducts, tournaments,
    };
  }
}
