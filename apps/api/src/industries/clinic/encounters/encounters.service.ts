import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

const TEXT = [
  'subjective', 'objective', 'assessment', 'plan', 'historyOfIllness', 'reviewOfSystems', 'physicalExamination',
  'provisionalDiagnosis', 'finalDiagnosis', 'differentialDiagnosis', 'advice', 'dietaryAdvice', 'activityAdvice',
  'warningSigns', 'followUpAdvice', 'referredTo', 'referralNotes',
] as const;

/** Visit note fields a form may set; ids and the tenant come from the appointment. */
function readNote(dto: any): Prisma.ClinicEncounterUncheckedUpdateInput {
  const out: Record<string, unknown> = {};
  for (const k of TEXT) {
    if (dto[k] === undefined) continue;
    out[k] = dto[k] === null || String(dto[k]).trim() === '' ? null : String(dto[k]).slice(0, 8000);
  }
  for (const k of ['icd10Codes', 'attachmentUrls'] as const) {
    if (dto[k] === undefined) continue;
    if (!Array.isArray(dto[k])) throw new BadRequestException(`${k} list honi chahiye`);
    out[k] = dto[k].map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 30);
  }
  if (dto.followUpDate !== undefined) {
    if (!dto.followUpDate) out.followUpDate = null;
    else {
      const d = new Date(dto.followUpDate);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Follow-up ki tareekh sahi likhein');
      out.followUpDate = d;
    }
  }
  return out as Prisma.ClinicEncounterUncheckedUpdateInput;
}

@Injectable()
export class EncountersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, appointmentId: string, dto: any) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id: appointmentId, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    if (apt.status === 'CANCELLED') throw new BadRequestException('Cancel appointment par checkup nahi likha ja sakta');
    const data = readNote(dto ?? {});
    return this.prisma.clinicEncounter.upsert({
      where: { appointmentId },
      update: data,
      create: { ...(data as Prisma.ClinicEncounterUncheckedCreateInput), tenantId: user.tenantId, appointmentId, patientId: apt.patientId, doctorId: apt.doctorId },
    });
  }

  async byAppointment(user: AuthenticatedUser, appointmentId: string) {
    return this.prisma.clinicEncounter.findFirst({
      where: { appointmentId, tenantId: user.tenantId },
      include: { prescriptions: { include: { items: { orderBy: { displayOrder: 'asc' } } } }, labOrders: { include: { tests: true } } },
    });
  }

  async byPatient(user: AuthenticatedUser, patientId: string) {
    return this.prisma.clinicEncounter.findMany({
      where: { patientId, tenantId: user.tenantId },
      include: { prescriptions: { include: { items: true } }, labOrders: { include: { tests: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
