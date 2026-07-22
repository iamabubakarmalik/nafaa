import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertDoctorDto } from './dto/upsert-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertDoctorDto) {
    const staff = await this.prisma.staff.findFirst({ where: { id: dto.staffId, tenantId: user.tenantId } });
    if (!staff) throw new NotFoundException('Staff not found');

    const payload: any = {
      ...dto,
      licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined,
    };

    const existing = await this.prisma.clinicDoctorProfile.findUnique({ where: { staffId: dto.staffId } });
    if (existing) {
      return this.prisma.clinicDoctorProfile.update({ where: { staffId: dto.staffId }, data: payload });
    }
    return this.prisma.clinicDoctorProfile.create({ data: { ...payload, tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: { specialty?: string; search?: string; featured?: boolean; active?: boolean }) {
    return this.prisma.clinicDoctorProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.specialty && { specialties: { has: params.specialty as any } }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { fullName: { contains: params.search, mode: 'insensitive' } },
            { pmcNumber: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isFeatured: 'desc' }, { fullName: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.clinicDoctorProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Doctor not found');
    return d;
  }

  async byStaffId(user: AuthenticatedUser, staffId: string) {
    return this.prisma.clinicDoctorProfile.findFirst({ where: { staffId, tenantId: user.tenantId } });
  }

  async availability(user: AuthenticatedUser, id: string, date: string) {
    const doc = await this.prisma.clinicDoctorProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!doc) throw new NotFoundException('Doctor not found');

    const dow = new Date(date).getDay();
    if (!doc.workingDays.includes(dow)) return { available: false, reason: 'Not a working day', slots: [] };

    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    const booked = await this.prisma.clinicAppointment.findMany({
      where: {
        tenantId: user.tenantId,
        doctorId: id,
        scheduledStart: { gte: dayStart, lte: dayEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_CONSULTATION'] },
      },
      orderBy: { scheduledStart: 'asc' },
    });

    return {
      available: true,
      workingHours: { start: doc.workStartTime, end: doc.workEndTime },
      slotDuration: doc.slotDurationMin,
      bookings: booked.map((b) => ({ start: b.scheduledStart, end: b.scheduledEnd, status: b.status })),
    };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.clinicDoctorProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Doctor not found');
    return this.prisma.clinicDoctorProfile.update({ where: { id }, data: { isActive: false } });
  }
}
