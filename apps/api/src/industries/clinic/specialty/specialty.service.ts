import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class SpecialtyService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── DENTAL ───
  async recordDental(user: AuthenticatedUser, dto: any) {
    return this.prisma.clinicDentalRecord.create({
      data: {
        ...dto,
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
    const { tenantId: _t, id: _i, ...data } = dto ?? {};
    return this.prisma.clinicDentalRecord.update({ where: { id }, data });
  }

  async removeDental(user: AuthenticatedUser, id: string) {
    await this.ownDental(user, id);
    return this.prisma.clinicDentalRecord.delete({ where: { id } });
  }

  // ─── ANTENATAL (Gyne) ───
  async createAncVisit(user: AuthenticatedUser, dto: any) {
    return this.prisma.clinicAntenatalVisit.create({
      data: {
        ...dto,
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
    return this.prisma.clinicPhysioSession.create({
      data: {
        ...dto,
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
