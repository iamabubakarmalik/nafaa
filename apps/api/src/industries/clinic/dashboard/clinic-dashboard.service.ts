import { Injectable } from '@nestjs/common';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class ClinicDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
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
      this.prisma.clinicAppointment.aggregate({
        where: {
          tenantId: user.tenantId,
          consultationEnd: { gte: todayStart, lte: todayEnd },
          status: 'COMPLETED',
        },
        _sum: { total: true, paidAmount: true },
      }),
      this.prisma.clinicAppointment.aggregate({
        where: {
          tenantId: user.tenantId,
          consultationEnd: { gte: monthAgo },
          status: 'COMPLETED',
        },
        _sum: { total: true, paidAmount: true },
      }),
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
      this.prisma.clinicPatientProfile.findMany({ where: { id: { in: patientIds } } }),
      this.prisma.clinicDoctorProfile.findMany({ where: { id: { in: doctorIds } } }),
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
      _sum: { total: true },
      _count: { _all: true },
    });
    const topDocsSorted = topDocsRaw.sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0)).slice(0, 5);
    const topDoctorIds = topDocsSorted.map((t) => t.doctorId);
    const topDoctors = await this.prisma.clinicDoctorProfile.findMany({ where: { id: { in: topDoctorIds } } });
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
        revenue: todayRevenue._sum.total ?? 0,
        collected: todayRevenue._sum.paidAmount ?? 0,
      },
      monthly: {
        revenue: monthlyRevenue._sum.total ?? 0,
        collected: monthlyRevenue._sum.paidAmount ?? 0,
      },
      upcomingAppointments: upcoming.map((a) => ({
        ...a,
        patient: patientsMap.get(a.patientId),
        doctor: doctorsMap.get(a.doctorId),
      })),
      topDoctors: topDocsSorted.map((t) => ({
        doctorId: t.doctorId,
        doctor: topDocsMap.get(t.doctorId),
        revenue: t._sum.total ?? 0,
        consultations: t._count._all,
      })),
      byGender,
    };
  }
}
