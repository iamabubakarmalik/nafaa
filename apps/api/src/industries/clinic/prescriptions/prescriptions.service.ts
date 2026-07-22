import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.encounterId || !dto.items?.length) throw new BadRequestException('encounterId and items required');

    const encounter = await this.prisma.clinicEncounter.findFirst({ where: { id: dto.encounterId, tenantId: user.tenantId } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    const count = await this.prisma.clinicPrescription.count({ where: { tenantId: user.tenantId } });
    const prescriptionNumber = 'RX-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    return this.prisma.clinicPrescription.create({
      data: {
        tenantId: user.tenantId,
        encounterId: dto.encounterId,
        patientId: encounter.patientId,
        doctorId: encounter.doctorId,
        prescriptionNumber,
        generalInstructions: dto.generalInstructions,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        totalItems: dto.items.length,
        items: {
          create: dto.items.map((it: any, i: number) => ({
            drugId: it.drugId,
            drugName: it.drugName,
            strength: it.strength,
            form: it.form,
            dose: it.dose,
            frequency: it.frequency,
            route: it.route,
            durationDays: it.durationDays ? Number(it.durationDays) : undefined,
            quantity: it.quantity,
            beforeMeal: it.beforeMeal,
            afterMeal: it.afterMeal,
            atBedtime: it.atBedtime,
            emptyStomach: it.emptyStomach,
            instructions: it.instructions,
            displayOrder: i,
          })),
        },
      },
      include: { items: true },
    });
  }

  async list(user: AuthenticatedUser, params: { patientId?: string; doctorId?: string; status?: string }) {
    return this.prisma.clinicPrescription.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.patientId && { patientId: params.patientId }),
        ...(params.doctorId && { doctorId: params.doctorId }),
        ...(params.status && { status: params.status as any }),
      },
      include: { items: true },
      orderBy: { issuedAt: 'desc' },
      take: 100,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.clinicPrescription.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!p) throw new NotFoundException('Not found');
    return p;
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    return this.prisma.clinicPrescription.update({ where: { id }, data: { status: status as any } });
  }
}
