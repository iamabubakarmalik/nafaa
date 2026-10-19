import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/** Allowed readings and their sane range; anything outside is a typing mistake. */
const RANGES: Record<string, [number, number, boolean]> = {
  bpSystolic: [40, 300, true], bpDiastolic: [20, 200, true], pulseRate: [20, 250, true], respiratoryRate: [4, 80, true],
  temperatureC: [30, 45, false], temperatureF: [86, 113, false], spo2: [40, 100, false], bloodSugar: [10, 1000, false],
  heightCm: [20, 260, false], weightKg: [0.3, 400, false], headCircumferenceCm: [20, 70, false], waistCm: [20, 250, false],
  painScore: [0, 10, true], glasgowScore: [3, 15, true],
};

function readVitals(dto: any) {
  const out: Record<string, number | string | null> = {};
  for (const [k, [min, max, int]] of Object.entries(RANGES)) {
    if (dto[k] === undefined) continue;
    if (dto[k] === null || dto[k] === '') { out[k] = null; continue; }
    const n = Number(dto[k]);
    if (!Number.isFinite(n) || n < min || n > max) throw new BadRequestException(`${k}: ${min} se ${max} ke darmiyan likhein`);
    out[k] = int ? Math.round(n) : n;
  }
  if (out.temperatureF != null && out.temperatureC === undefined) out.temperatureC = Number((((out.temperatureF as number) - 32) * 5 / 9).toFixed(1));
  if (out.temperatureC != null && out.temperatureF === undefined) out.temperatureF = Number((((out.temperatureC as number) * 9) / 5 + 32).toFixed(1));
  if (dto.bloodSugarType !== undefined) out.bloodSugarType = dto.bloodSugarType ? String(dto.bloodSugarType).slice(0, 30) : null;
  if (dto.notes !== undefined) out.notes = dto.notes ? String(dto.notes).slice(0, 1000) : null;
  return out;
}

@Injectable()
export class VitalsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(user: AuthenticatedUser, appointmentId: string, dto: any) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id: appointmentId, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    const data = readVitals(dto ?? {});
    const existing = await this.prisma.clinicVitals.findUnique({ where: { appointmentId } });
    const h = (data.heightCm as number | null | undefined) ?? existing?.heightCm;
    const w = (data.weightKg as number | null | undefined) ?? existing?.weightKg;
    const bmi = h && w ? Number((w / ((h / 100) ** 2)).toFixed(2)) : null;
    if (existing) {
      return this.prisma.clinicVitals.update({ where: { appointmentId }, data: { ...data, bmi, recordedById: user.id, recordedAt: new Date() } });
    }
    return this.prisma.clinicVitals.create({ data: { ...data, appointmentId, patientId: apt.patientId, bmi, recordedById: user.id } });
  }

  async byAppointment(user: AuthenticatedUser, appointmentId: string) {
    return this.prisma.clinicVitals.findFirst({ where: { appointmentId, appointment: { tenantId: user.tenantId } } });
  }

  async byPatient(user: AuthenticatedUser, patientId: string) {
    return this.prisma.clinicVitals.findMany({
      where: { patientId, appointment: { tenantId: user.tenantId } },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
  }
}
