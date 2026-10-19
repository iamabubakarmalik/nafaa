import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DAY_MS, GYM_SALE, gymClock, r2 } from '../common/gym-common';

/** Bills that count as sales in the reports (a voided bill drops out, a returned one keeps its net). */
const LIVE_SALE: Prisma.SaleWhereInput['status'] = { in: ['COMPLETED', 'PARTIALLY_RETURNED'] };

/**
 * Gym numbers for the dashboard. Money comes from the bills (the same
 * sales the day book and profit report read), never from membership rows,
 * and "today" is the shop's business day.
 */
@Injectable()
export class GymDashboardService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  async overview(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const clock = await gymClock(this.tz, tenantId);
    const now = new Date();
    const today = clock.today(now);
    const monthStart = clock.dayStart(`${clock.todayKey(now).slice(0, 7)}-01`);
    const in7Days = new Date(now.getTime() + 7 * DAY_MS);
    const gymBills = (gte: Date, lt: Date): Prisma.SaleWhereInput => ({ tenantId, status: LIVE_SALE, saleNumber: { startsWith: GYM_SALE }, createdAt: { gte, lt } });

    const [
      totalMembers, activeMembers, totalTrainers, classesToday,
      checkIns, currentlyInside, classBookings,
      activeMemberships, expiringMemberships, dues,
      todaySales, monthSales,
    ] = await Promise.all([
      this.prisma.gymMember.count({ where: { tenantId, isActive: true } }),
      this.prisma.gymMember.count({ where: { tenantId, isActive: true, memberships: { some: { status: { in: ['ACTIVE', 'FROZEN'] }, endDate: { gte: now } } } } }),
      this.prisma.gymTrainer.count({ where: { tenantId, isActive: true } }),
      this.prisma.gymClass.count({ where: { tenantId, scheduledStart: { gte: today.gte, lt: today.lt }, status: { not: 'CANCELLED' } } }),
      this.prisma.gymAttendance.count({ where: { tenantId, checkInAt: { gte: today.gte, lt: today.lt } } }),
      this.prisma.gymAttendance.count({ where: { tenantId, checkOutAt: null, checkInAt: { gte: new Date(now.getTime() - 16 * 3_600_000) } } }),
      this.prisma.gymClassBooking.count({ where: { tenantId, status: { not: 'CANCELLED' }, class: { scheduledStart: { gte: today.gte, lt: today.lt } } } }),
      this.prisma.gymMemberMembership.count({ where: { tenantId, status: { in: ['ACTIVE', 'FROZEN'] }, startDate: { lte: now }, endDate: { gte: now } } }),
      this.prisma.gymMemberMembership.count({ where: { tenantId, status: 'ACTIVE', endDate: { gte: now, lte: in7Days } } }),
      this.prisma.gymMemberMembership.aggregate({ where: { tenantId, status: { not: 'CANCELLED' }, balanceDue: { gt: 0.009 } }, _sum: { balanceDue: true }, _count: { _all: true } }),
      this.prisma.sale.aggregate({ where: gymBills(today.gte, today.lt), _sum: { total: true, creditAmount: true } }),
      this.prisma.sale.aggregate({ where: gymBills(monthStart, today.lt), _sum: { total: true, creditAmount: true } }),
    ]);

    const recentCheckIns = await this.prisma.gymAttendance.findMany({
      where: { tenantId },
      include: { member: { select: { id: true, memberNumber: true, customerId: true, photoUrl: true } } },
      orderBy: { checkInAt: 'desc' },
      take: 10,
    });
    const people = await this.prisma.customer.findMany({ where: { tenantId, id: { in: recentCheckIns.map((a) => a.member.customerId) } }, select: { id: true, name: true } });
    const nameOf = new Map(people.map((p) => [p.id, p.name]));
    const sold = (a: typeof todaySales) => r2(a._sum.total ?? 0);
    const unpaid = (a: typeof todaySales) => r2(a._sum.creditAmount ?? 0);

    return {
      totals: { totalMembers, activeMembers, totalTrainers, activeMemberships },
      today: { checkIns, currentlyInside, classes: classesToday, classBookings, revenue: sold(todaySales), udhaar: unpaid(todaySales) },
      monthly: { revenue: sold(monthSales), collected: r2(sold(monthSales) - unpaid(monthSales)) },
      alerts: { expiringMemberships, duesCount: dues._count._all, duesAmount: r2(dues._sum.balanceDue ?? 0) },
      recentCheckIns: recentCheckIns.map((a) => ({ ...a, member: { ...a.member, name: nameOf.get(a.member.customerId) ?? null } })),
    };
  }
}
