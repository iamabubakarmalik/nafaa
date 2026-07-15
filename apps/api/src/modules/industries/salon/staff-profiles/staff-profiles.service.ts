import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertStaffProfileDto } from './dto/upsert-staff-profile.dto';

@Injectable()
export class StaffProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertStaffProfileDto) {
    const staff = await this.prisma.staff.findFirst({ where: { id: dto.staffId, tenantId: user.tenantId } });
    if (!staff) throw new NotFoundException('Staff not found');

    const existing = await this.prisma.salonStaffProfile.findUnique({ where: { staffId: dto.staffId } });
    if (existing) {
      return this.prisma.salonStaffProfile.update({
        where: { staffId: dto.staffId },
        data: { ...dto, tenantId: user.tenantId },
      });
    }
    return this.prisma.salonStaffProfile.create({
      data: { ...dto, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: { role?: string; bookable?: boolean; search?: string }) {
    const profiles = await this.prisma.salonStaffProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.role && { role: params.role as any }),
        ...(params.bookable !== undefined && { isBookable: params.bookable }),
      },
      include: { services: true },
      orderBy: { updatedAt: 'desc' },
    });

    const staffIds = profiles.map((p) => p.staffId);
    const staffs = await this.prisma.staff.findMany({
      where: {
        id: { in: staffIds },
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
    });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));

    return profiles
      .filter((p) => staffMap.has(p.staffId))
      .map((p) => ({ ...p, staff: staffMap.get(p.staffId) }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.salonStaffProfile.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { services: true },
    });
    if (!p) throw new NotFoundException('Staff profile not found');
    const staff = await this.prisma.staff.findUnique({ where: { id: p.staffId } });

    // Fetch service names
    const serviceIds = p.services.map((s) => s.serviceId);
    const services = await this.prisma.salonService.findMany({ where: { id: { in: serviceIds } } });
    const servicesMap = new Map(services.map((s) => [s.id, s]));

    return {
      ...p,
      staff,
      services: p.services.map((sv) => ({ ...sv, service: servicesMap.get(sv.serviceId) })),
    };
  }

  async byStaffId(user: AuthenticatedUser, staffId: string) {
    return this.prisma.salonStaffProfile.findFirst({
      where: { staffId, tenantId: user.tenantId },
      include: { services: true },
    });
  }

  async assignServices(user: AuthenticatedUser, staffProfileId: string, services: { serviceId: string; customPrice?: number; customDuration?: number; customCommissionPct?: number; isPrimary?: boolean }[]) {
    const profile = await this.prisma.salonStaffProfile.findFirst({ where: { id: staffProfileId, tenantId: user.tenantId } });
    if (!profile) throw new NotFoundException('Profile not found');

    await this.prisma.salonStaffService.deleteMany({ where: { staffProfileId } });
    if (services.length > 0) {
      await this.prisma.salonStaffService.createMany({
        data: services.map((s) => ({
          staffProfileId,
          serviceId: s.serviceId,
          customPrice: s.customPrice,
          customDuration: s.customDuration,
          customCommissionPct: s.customCommissionPct,
          isPrimary: s.isPrimary ?? false,
        })),
      });
    }
    return this.prisma.salonStaffService.findMany({ where: { staffProfileId } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.salonStaffProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Profile not found');
    return this.prisma.salonStaffProfile.update({ where: { id }, data: { isActive: false } });
  }

  async availability(user: AuthenticatedUser, staffProfileId: string, date: string) {
    const profile = await this.prisma.salonStaffProfile.findFirst({ where: { id: staffProfileId, tenantId: user.tenantId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const dayOfWeek = new Date(date).getDay();
    const isWorkingDay = profile.workingDays.includes(dayOfWeek);
    if (!isWorkingDay) return { available: false, reason: 'Not a working day', bookings: [] };

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Fetch appointments for staff on that date
    const appointments = await this.prisma.salonAppointmentService.findMany({
      where: {
        staffProfileId,
        appointment: {
          tenantId: user.tenantId,
          scheduledStart: { gte: dayStart, lte: dayEnd },
          status: { in: ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS'] },
        },
      },
      include: { appointment: true },
    });

    return {
      available: true,
      workingHours: { start: profile.workStartTime, end: profile.workEndTime },
      breakHours: profile.breakStartTime ? { start: profile.breakStartTime, end: profile.breakEndTime } : null,
      bookings: appointments.map((a) => ({
        appointmentId: a.appointmentId,
        start: a.appointment.scheduledStart,
        end: a.appointment.scheduledEnd,
        serviceName: a.serviceName,
      })),
    };
  }
}
