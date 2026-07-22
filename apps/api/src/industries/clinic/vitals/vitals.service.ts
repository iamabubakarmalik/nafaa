import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class VitalsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(user: AuthenticatedUser, appointmentId: string, dto: any) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id: appointmentId, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment not found');

    let bmi: number | undefined;
    if (dto.heightCm && dto.weightKg) {
      const heightM = dto.heightCm / 100;
      bmi = Number((dto.weightKg / (heightM * heightM)).toFixed(2));
    }

    const existing = await this.prisma.clinicVitals.findUnique({ where: { appointmentId } });
    if (existing) {
      return this.prisma.clinicVitals.update({
        where: { appointmentId },
        data: { ...dto, bmi, recordedById: user.id, recordedAt: new Date() },
      });
    }

    return this.prisma.clinicVitals.create({
      data: {
        ...dto,
        appointmentId,
        patientId: apt.patientId,
        bmi,
        recordedById: user.id,
      },
    });
  }

  async byAppointment(user: AuthenticatedUser, appointmentId: string) {
    return this.prisma.clinicVitals.findUnique({ where: { appointmentId } });
  }

  async byPatient(user: AuthenticatedUser, patientId: string) {
    return this.prisma.clinicVitals.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
  }
}
