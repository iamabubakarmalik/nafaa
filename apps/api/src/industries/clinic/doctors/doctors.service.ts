import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz, weekdayInTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertDoctorDto } from './dto/upsert-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates or updates a doctor. Without `staffId` a staff record is made first (name, phone, "Doctor"). */
  async upsert(user: AuthenticatedUser, dto: UpsertDoctorDto) {
    const { staffId: givenStaff, phone, ...rest } = dto;
    const fullName = (dto.fullName ?? '').trim();
    if (fullName.length < 2) throw new BadRequestException('Doctor ka naam likhein');
    let staffId = givenStaff;
    if (staffId) {
      const staff = await this.prisma.staff.findFirst({ where: { id: staffId, tenantId: user.tenantId }, select: { id: true } });
      if (!staff) throw new NotFoundException('Staff nahi mila');
    } else {
      const digits = String(phone ?? '').replace(/\D/g, '');
      if (digits.length < 10) throw new BadRequestException('Doctor ka phone likhein (03xx…)');
      staffId = await this.prisma.$transaction(async (tx) => {
        const rows = await tx.staff.findMany({ where: { tenantId: user.tenantId }, select: { staffNumber: true } });
        const max = rows.reduce((m, r) => Math.max(m, Number(/(\d+)$/.exec(r.staffNumber)?.[1] ?? 0)), 0);
        const st = await tx.staff.create({
          data: { tenantId: user.tenantId, staffNumber: `EMP-${String(max + 1).padStart(4, '0')}`, fullName, phone: digits, designation: 'Doctor', department: 'Clinic', joinDate: new Date() },
          select: { id: true },
        });
        return st.id;
      });
    }
    if (rest.workStartTime && rest.workEndTime && rest.workStartTime >= rest.workEndTime) throw new BadRequestException('Clinic ka waqt sahi likhein');
    if (rest.workingDays && rest.workingDays.some((d) => !(Number.isInteger(d) && d >= 0 && d <= 6))) throw new BadRequestException('Din ghalat hain');
    if (rest.commissionType !== 'FIXED' && (rest.commissionPct ?? 0) > 100) throw new BadRequestException('Share 100% se zyada nahi ho sakta');

    const payload = {
      ...rest,
      fullName,
      licenseExpiry: rest.licenseExpiry ? new Date(rest.licenseExpiry) : undefined,
    };
    const existing = await this.prisma.clinicDoctorProfile.findFirst({ where: { staffId, tenantId: user.tenantId }, select: { id: true } });
    if (existing) return this.prisma.clinicDoctorProfile.update({ where: { id: existing.id }, data: payload });
    return this.prisma.clinicDoctorProfile.create({ data: { ...payload, staffId: staffId!, tenantId: user.tenantId } });
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

    const dow = weekdayInTz(new Date(date));
    if (!doc.workingDays.includes(dow)) return { available: false, reason: 'Not a working day', slots: [] };

    const dayStart = startOfDayTz(new Date(date));
    const dayEnd = endOfDayTz(new Date(date));

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
