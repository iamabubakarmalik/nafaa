import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class ClinicDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Clinic money in a period, read from the fee and lab bills themselves
   * (voided and fully returned bills left out), so it matches the day book.
   */
  private async feeBills(tenantId: string, from: Date, to: Date) {
    const lines = await this.prisma.saleItem.findMany({
      where: { product: { tenantId, sku: 'CLINIC-FEE', productType: 'SERVICE_FEE' }, sale: { tenantId, createdAt: { gte: from, lte: to }, status: { notIn: ['VOIDED', 'FULLY_RETURNED'] } } },
      select: { total: true, sale: { select: { total: true, paidAmount: true } } },
    });
    let billed = 0;
    let collected = 0;
    for (const l of lines) {
      billed += l.total;
      collected += l.sale.total > 0 ? Math.min(l.sale.paidAmount, l.sale.total) * (l.total / l.sale.total) : 0;
    }
    return { billed: Math.round(billed * 100) / 100, collected: Math.round(collected * 100) / 100 };
  }

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDayTz();
    const todayEnd = endOfDayTz(new Date());
    const monthAgo = subDays(new Date(), 30);
    const upcomingWeek = new Date();
    upcomingWeek.setDate(upcomingWeek.getDate() + 7);

    const [
      totalDoctors, totalPatients, activePatients,
      todayAppointments, todayCompleted, todayInQueue,
      todayRevenue, monthlyRevenue,
      pendingLabOrders, dueVaccinations,
    ] = await Promise.all([
      this.prisma.clinicDoctorProfile.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.clinicPatientProfile.count({ where: { tenantId: user.tenantId } }),
      this.prisma.clinicPatientProfile.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.clinicAppointment.count({
        where: {
          tenantId: user.tenantId,
          scheduledStart: { gte: todayStart, lte: todayEnd },
          status: { notIn: ['CANCELLED'] },
        },
      }),
      this.prisma.clinicAppointment.count({
        where: {
          tenantId: user.tenantId,
          consultationEnd: { gte: todayStart, lte: todayEnd },
          status: 'COMPLETED',
        },
      }),
      this.prisma.clinicAppointment.count({
        where: {
          tenantId: user.tenantId,
          scheduledStart: { gte: todayStart, lte: todayEnd },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_CONSULTATION'] },
        },
      }),
      this.feeBills(user.tenantId, todayStart, todayEnd),
      this.feeBills(user.tenantId, monthAgo, todayEnd),
      this.prisma.clinicLabOrder.count({
        where: {
          tenantId: user.tenantId,
          status: { in: ['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.clinicVaccination.count({
        where: {
          tenantId: user.tenantId,
          status: 'DUE',
          dueDate: { lte: upcomingWeek },
        },
      }),
    ]);

    // Upcoming appointments
    const upcoming = await this.prisma.clinicAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledStart: { gte: new Date(), lte: todayEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'ARRIVED'] },
      },
      orderBy: { scheduledStart: 'asc' },
      take: 15,
    });

    const patientIds = upcoming.map((a) => a.patientId);
    const doctorIds = upcoming.map((a) => a.doctorId);
    const [patients, doctors] = await Promise.all([
      this.prisma.clinicPatientProfile.findMany({ where: { tenantId: user.tenantId, id: { in: patientIds } }, select: { id: true, fullName: true, mrn: true, phonePrimary: true, gender: true } }),
      this.prisma.clinicDoctorProfile.findMany({ where: { tenantId: user.tenantId, id: { in: doctorIds } }, select: { id: true, fullName: true, title: true, photoUrl: true } }),
    ]);
    const patientsMap = new Map(patients.map((p) => [p.id, p]));
    const doctorsMap = new Map(doctors.map((d) => [d.id, d]));

    // Top doctors
    const topDocsRaw = await this.prisma.clinicAppointment.groupBy({
      by: ['doctorId'],
      where: {
        tenantId: user.tenantId,
        status: 'COMPLETED',
        consultationEnd: { gte: monthAgo },
      },
      _sum: { paidAmount: true },
      _count: { _all: true },
    });
    const topDocsSorted = topDocsRaw.sort((a, b) => (b._sum.paidAmount ?? 0) - (a._sum.paidAmount ?? 0)).slice(0, 5);
    const topDoctorIds = topDocsSorted.map((t) => t.doctorId);
    const topDoctors = await this.prisma.clinicDoctorProfile.findMany({ where: { tenantId: user.tenantId, id: { in: topDoctorIds } }, select: { id: true, fullName: true, title: true, photoUrl: true, specialties: true } });
    const topDocsMap = new Map(topDoctors.map((d) => [d.id, d]));

    // By gender
    const byGender = await this.prisma.clinicPatientProfile.groupBy({
      by: ['gender'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    });

    return {
      totals: { totalDoctors, totalPatients, activePatients, pendingLabOrders, dueVaccinations },
      today: {
        appointments: todayAppointments,
        completed: todayCompleted,
        inQueue: todayInQueue,
        revenue: todayRevenue.billed,
        collected: todayRevenue.collected,
      },
      monthly: {
        revenue: monthlyRevenue.billed,
        collected: monthlyRevenue.collected,
      },
      upcomingAppointments: upcoming.map((a) => ({
        ...a,
        patient: patientsMap.get(a.patientId),
        doctor: doctorsMap.get(a.doctorId),
      })),
      topDoctors: topDocsSorted.map((t) => ({
        doctorId: t.doctorId,
        doctor: topDocsMap.get(t.doctorId),
        revenue: t._sum.paidAmount ?? 0,
        consultations: t._count._all,
      })),
      byGender,
    };
  }
}
