import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class VaccinationsService {
  constructor(private readonly prisma: PrismaService) {}

  async schedule(user: AuthenticatedUser, dto: any) {
    return this.prisma.clinicVaccination.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        dueDate: new Date(dto.dueDate),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  async bulkScheduleEPI(user: AuthenticatedUser, patientId: string, birthDate: string) {
    // Pakistan EPI Schedule
    const birth = new Date(birthDate);
    const epiSchedule = [
      { name: 'BCG', code: 'BCG', doseNumber: 1, weeksAfterBirth: 0 },
      { name: 'OPV-0', code: 'OPV0', doseNumber: 0, weeksAfterBirth: 0 },
      { name: 'Pentavalent-1', code: 'PENTA1', doseNumber: 1, weeksAfterBirth: 6 },
      { name: 'OPV-1', code: 'OPV1', doseNumber: 1, weeksAfterBirth: 6 },
      { name: 'Rotavirus-1', code: 'ROTA1', doseNumber: 1, weeksAfterBirth: 6 },
      { name: 'PCV-1', code: 'PCV1', doseNumber: 1, weeksAfterBirth: 6 },
      { name: 'Pentavalent-2', code: 'PENTA2', doseNumber: 2, weeksAfterBirth: 10 },
      { name: 'OPV-2', code: 'OPV2', doseNumber: 2, weeksAfterBirth: 10 },
      { name: 'Rotavirus-2', code: 'ROTA2', doseNumber: 2, weeksAfterBirth: 10 },
      { name: 'PCV-2', code: 'PCV2', doseNumber: 2, weeksAfterBirth: 10 },
      { name: 'Pentavalent-3', code: 'PENTA3', doseNumber: 3, weeksAfterBirth: 14 },
      { name: 'OPV-3', code: 'OPV3', doseNumber: 3, weeksAfterBirth: 14 },
      { name: 'IPV', code: 'IPV', doseNumber: 1, weeksAfterBirth: 14 },
      { name: 'PCV-3', code: 'PCV3', doseNumber: 3, weeksAfterBirth: 14 },
      { name: 'Measles-1', code: 'MR1', doseNumber: 1, weeksAfterBirth: 39 },
      { name: 'Measles-2', code: 'MR2', doseNumber: 2, weeksAfterBirth: 65 },
    ];

    return this.prisma.$transaction(
      epiSchedule.map((v) => {
        const dueDate = new Date(birth);
        dueDate.setDate(dueDate.getDate() + v.weeksAfterBirth * 7);
        return this.prisma.clinicVaccination.create({
          data: {
            tenantId: user.tenantId,
            patientId,
            vaccineName: v.name,
            vaccineCode: v.code,
            scheduleName: 'EPI',
            doseNumber: v.doseNumber,
            dueDate,
            status: 'DUE',
          },
        });
      })
    );
  }

  async administer(user: AuthenticatedUser, id: string, dto: { batchNumber?: string; manufacturer?: string; siteAdministered?: string; routeAdministered?: string; administeredBy?: string; expiryDate?: string; adverseReactions?: string }) {
    return this.prisma.clinicVaccination.update({
      where: { id },
      data: {
        ...dto,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        administeredAt: new Date(),
        status: 'ADMINISTERED',
      },
    });
  }

  async list(user: AuthenticatedUser, params: { patientId?: string; status?: string; from?: string; to?: string }) {
    return this.prisma.clinicVaccination.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.patientId && { patientId: params.patientId }),
        ...(params.status && { status: params.status as any }),
        ...(params.from || params.to ? {
          dueDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async due(user: AuthenticatedUser, days: number = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);
    return this.prisma.clinicVaccination.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'DUE',
        dueDate: { gte: now, lte: future },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
