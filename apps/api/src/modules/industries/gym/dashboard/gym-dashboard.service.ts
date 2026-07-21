import { Injectable } from '@nestjs/common';
import { startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class GymDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const monthAgo = subDays(new Date(), 30);
    const in7Days = addDays(new Date(), 7);

    const [
      totalMembers, activeMembers, totalTrainers, totalClasses,
      todayCheckIns, currentlyInside, todayClassBookings,
      activeMemberships, expiringMemberships,
      monthlyRevenue, todayRevenue,
    ] = await Promise.all([
      this.prisma.gymMember.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.gymMember.count({ where: { tenantId: user.tenantId, isActive: true, status: 'ACTIVE' } }),
      this.prisma.gymTrainer.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.gymClass.count({
        where: {
          tenantId: user.tenantId,
          scheduledStart: { gte: todayStart, lte: todayEnd },
          status: { notIn: ['CANCELLED'] },
        },
      }),

      this.prisma.gymAttendance.count({
        where: { tenantId: user.tenantId, checkInAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.gymAttendance.count({
        where: { tenantId: user.tenantId, checkOutAt: null },
      }),
      this.prisma.gymClassBooking.count({
        where: {
          tenantId: user.tenantId,
          bookedAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      this.prisma.gymMemberMembership.count({
        where: { tenantId: user.tenantId, status: 'ACTIVE', endDate: { gte: new Date() } },
      }),
      this.prisma.gymMemberMembership.count({
        where: {
          tenantId: user.tenantId,
          status: 'ACTIVE',
          endDate: { gte: new Date(), lte: in7Days },
        },
      }),

      this.prisma.gymMemberMembership.aggregate({
        where: { tenantId: user.tenantId, createdAt: { gte: monthAgo } },
        _sum: { totalPrice: true, paidAmount: true },
      }),
      this.prisma.gymMemberMembership.aggregate({
        where: { tenantId: user.tenantId, createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { paidAmount: true },
      }),
    ]);

    // Upcoming classes today
    const upcomingClasses = await this.prisma.gymClass.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledStart: { gte: new Date(), lte: todayEnd },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: { trainer: true, bookings: true },
      orderBy: { scheduledStart: 'asc' },
      take: 10,
    });

    // Top trainers by revenue
    const topTrainersRaw = await this.prisma.gymPersonalTraining.groupBy({
      by: ['trainerId'],
      where: {
        appointment: { tenantId: user.tenantId } as any,
        actualEnd: { gte: monthAgo },
        status: 'COMPLETED',
      } as any,
      _sum: { price: true, commissionAmount: true },
      _count: { _all: true },
    }).catch(() => []);

    // Members by goal
    const byGoal = await this.prisma.gymMember.groupBy({
      by: ['primaryGoal'],
      where: { tenantId: user.tenantId, isActive: true },
      _count: { _all: true },
    });

    // Recent check-ins
    const recentCheckIns = await this.prisma.gymAttendance.findMany({
      where: { tenantId: user.tenantId },
      include: { member: true },
      orderBy: { checkInAt: 'desc' },
      take: 10,
    });

    return {
      totals: {
        totalMembers,
        activeMembers,
        totalTrainers,
        activeMemberships,
      },
      today: {
        checkIns: todayCheckIns,
        currentlyInside,
        classes: totalClasses,
        classBookings: todayClassBookings,
        revenue: todayRevenue._sum.paidAmount ?? 0,
      },
      monthly: {
        revenue: monthlyRevenue._sum.totalPrice ?? 0,
        collected: monthlyRevenue._sum.paidAmount ?? 0,
      },
      alerts: {
        expiringMemberships,
      },
      upcomingClasses,
      byGoal,
      recentCheckIns,
    };
  }
}
