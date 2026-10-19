import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/** Body without ids, the tenant or timestamps; those never come from a form. */
function clean(dto: any) {
  const { id: _i, tenantId: _t, createdAt: _c, updatedAt: _u, ...rest } = dto ?? {};
  return rest;
}

@Injectable()
export class SpecialtyService {
  constructor(private readonly prisma: PrismaService) {}

  /** The patient (and appointment, when given) must belong to this clinic. */
  private async ownRefs(user: AuthenticatedUser, dto: any) {
    if (!dto?.patientId) throw new BadRequestException('Mareez chunein');
    const p = await this.prisma.clinicPatientProfile.findFirst({ where: { id: dto.patientId, tenantId: user.tenantId }, select: { id: true } });
    if (!p) throw new NotFoundException('Mareez nahi mila');
    if (dto.appointmentId) {
      const a = await this.prisma.clinicAppointment.findFirst({ where: { id: dto.appointmentId, tenantId: user.tenantId, patientId: dto.patientId }, select: { id: true } });
      if (!a) throw new NotFoundException('Appointment nahi mili');
    }
  }

  // ─── DENTAL ───
  async recordDental(user: AuthenticatedUser, dto: any) {
    await this.ownRefs(user, dto);
    return this.prisma.clinicDentalRecord.create({
      data: {
        ...clean(dto),
        tenantId: user.tenantId,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : new Date(),
      },
    });
  }

  async dentalChart(user: AuthenticatedUser, patientId: string) {
    return this.prisma.clinicDentalRecord.findMany({
      where: { tenantId: user.tenantId, patientId },
      orderBy: [{ toothNumber: 'asc' }, { performedAt: 'desc' }],
    });
  }

  private async ownDental(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.clinicDentalRecord.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!r) throw new NotFoundException('Record nahi mila');
  }

  async updateDental(user: AuthenticatedUser, id: string, dto: any) {
    await this.ownDental(user, id);
    const { patientId: _p, ...data } = clean(dto);
    return this.prisma.clinicDentalRecord.update({ where: { id }, data });
  }

  async removeDental(user: AuthenticatedUser, id: string) {
    await this.ownDental(user, id);
    return this.prisma.clinicDentalRecord.delete({ where: { id } });
  }

  // ─── ANTENATAL (Gyne) ───
  async createAncVisit(user: AuthenticatedUser, dto: any) {
    await this.ownRefs(user, dto);
    return this.prisma.clinicAntenatalVisit.create({
      data: {
        ...clean(dto),
        tenantId: user.tenantId,
        visitDate: dto.visitDate ? new Date(dto.visitDate) : new Date(),
        nextVisitDate: dto.nextVisitDate ? new Date(dto.nextVisitDate) : undefined,
      },
    });
  }

  async ancHistory(user: AuthenticatedUser, patientId: string) {
    return this.prisma.clinicAntenatalVisit.findMany({
      where: { tenantId: user.tenantId, patientId },
      orderBy: { visitDate: 'desc' },
    });
  }

  // ─── PHYSIO ───
  async createPhysioSession(user: AuthenticatedUser, dto: any) {
    await this.ownRefs(user, dto);
    return this.prisma.clinicPhysioSession.create({
      data: {
        ...clean(dto),
        tenantId: user.tenantId,
        sessionDate: dto.sessionDate ? new Date(dto.sessionDate) : new Date(),
        nextSessionDate: dto.nextSessionDate ? new Date(dto.nextSessionDate) : undefined,
      },
    });
  }

  async physioHistory(user: AuthenticatedUser, patientId: string) {
    return this.prisma.clinicPhysioSession.findMany({
      where: { tenantId: user.tenantId, patientId },
      orderBy: { sessionDate: 'desc' },
    });
  }
}
