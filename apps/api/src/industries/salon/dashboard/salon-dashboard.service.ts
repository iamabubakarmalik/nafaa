import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DAY_MS } from '../common/salon-common';

@Injectable()
export class SalonDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async overview(user: AuthenticatedUser) {
    // The shop's own calendar day; the server clock is UTC.
    const zone = await this.tz.resolve(user.tenantId);
    const todayStart = startOfDayTz(new Date(), zone);
    const todayEnd = endOfDayTz(new Date(), zone);
    const monthAgo = new Date(todayStart.getTime() - 30 * DAY_MS);

    const [
      totalServices, totalStaff, activeMemberships,
      todayAppointments, upcomingToday, completedToday,
      todayRevenue, monthlyRevenue,
    ] = await Promise.all([
      this.prisma.salonService.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.salonStaffProfile.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.salonMembership.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.salonAppointment.count({
        where: {
          tenantId: user.tenantId,
          scheduledStart: { gte: todayStart, lte: todayEnd },
          status: { notIn: ['CANCELLED'] },
        },
      }),
      this.prisma.salonAppointment.count({
        where: {
          tenantId: user.tenantId,
          scheduledStart: { gte: new Date(), lte: todayEnd },
          status: { in: ['CONFIRMED', 'ARRIVED'] },
        },
      }),
      this.prisma.salonAppointment.count({
        where: {
          tenantId: user.tenantId,
          actualEnd: { gte: todayStart, lte: todayEnd },
          status: 'COMPLETED',
        },
      }),
      this.prisma.salonAppointment.aggregate({
        where: {
          tenantId: user.tenantId,
          actualEnd: { gte: todayStart, lte: todayEnd },
          status: 'COMPLETED',
        },
        _sum: { total: true, paidAmount: true },
      }),
      this.prisma.salonAppointment.aggregate({
        where: {
          tenantId: user.tenantId,
          actualEnd: { gte: monthAgo },
          status: 'COMPLETED',
        },
        _sum: { total: true, paidAmount: true },
      }),
    ]);

    // Upcoming appointments
    const upcoming = await this.prisma.salonAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledStart: { gte: new Date() },
        status: { in: ['CONFIRMED', 'ARRIVED'] },
      },
      include: { services: true },
      orderBy: { scheduledStart: 'asc' },
      take: 10,
    });

    // Top staff (by revenue this month)
    const topStaffData = await this.prisma.salonAppointmentService.groupBy({
      by: ['staffProfileId'],
      where: {
        staffProfileId: { not: null },
        appointment: {
          tenantId: user.tenantId,
          actualEnd: { gte: monthAgo },
          status: 'COMPLETED',
        },
      },
      _sum: { total: true, commissionAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    });

    const staffProfileIds = topStaffData.map((s) => s.staffProfileId).filter(Boolean) as string[];
    const staffProfiles = await this.prisma.salonStaffProfile.findMany({ where: { tenantId: user.tenantId, id: { in: staffProfileIds } } });
    const staffs = await this.prisma.staff.findMany({ where: { tenantId: user.tenantId, id: { in: staffProfiles.map((sp) => sp.staffId) } } });
    const spMap = new Map(staffProfiles.map((sp) => [sp.id, sp]));
    const staffMap = new Map(staffs.map((s) => [s.id, s]));

    const topStaff = topStaffData.map((t) => {
      const sp = spMap.get(t.staffProfileId!);
      const s = sp ? staffMap.get(sp.staffId) : null;
      return {
        staffProfileId: t.staffProfileId,
        name: s?.fullName,
        photoUrl: sp?.photoUrl,
        role: sp?.role,
        revenue: t._sum.total ?? 0,
        commission: t._sum.commissionAmount ?? 0,
        appointmentCount: t._count._all,
      };
    });

    // Top services
    const topServicesRaw = await this.prisma.salonAppointmentService.groupBy({
      by: ['serviceId'],
      where: {
        appointment: {
          tenantId: user.tenantId,
          actualEnd: { gte: monthAgo },
          status: 'COMPLETED',
        },
      },
      _sum: { total: true },
      _count: { _all: true },
    });
    const topServicesData = topServicesRaw
      .sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0))
      .slice(0, 5);
    const serviceIds = topServicesData.map((s) => s.serviceId);
    const services = await this.prisma.salonService.findMany({ where: { tenantId: user.tenantId, id: { in: serviceIds } } });
    const svcMap = new Map(services.map((s) => [s.id, s]));

    return {
      totals: {
        totalServices,
        totalStaff,
        activeMemberships,
      },
      today: {
        appointments: todayAppointments,
        upcoming: upcomingToday,
        completed: completedToday,
        revenue: todayRevenue._sum.total ?? 0,
        collected: todayRevenue._sum.paidAmount ?? 0,
      },
      monthly: {
        revenue: monthlyRevenue._sum.total ?? 0,
        collected: monthlyRevenue._sum.paidAmount ?? 0,
      },
      upcomingAppointments: upcoming,
      topStaff,
      topServices: topServicesData.map((t) => ({
        ...t,
        service: svcMap.get(t.serviceId),
      })),
    };
  }
}
