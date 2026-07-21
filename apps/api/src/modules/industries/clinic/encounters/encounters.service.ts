import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class EncountersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, appointmentId: string, dto: any) {
    const apt = await this.prisma.clinicAppointment.findFirst({ where: { id: appointmentId, tenantId: user.tenantId } });
    if (!apt) throw new NotFoundException('Appointment not found');

    const existing = await this.prisma.clinicEncounter.findUnique({ where: { appointmentId } });
    if (existing) {
      return this.prisma.clinicEncounter.update({
        where: { appointmentId },
        data: {
          ...dto,
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
        },
      });
    }

    return this.prisma.clinicEncounter.create({
      data: {
        tenantId: user.tenantId,
        appointmentId,
        patientId: apt.patientId,
        doctorId: apt.doctorId,
        ...dto,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
    });
  }

  async byAppointment(user: AuthenticatedUser, appointmentId: string) {
    return this.prisma.clinicEncounter.findUnique({
      where: { appointmentId },
      include: { prescriptions: { include: { items: true } }, labOrders: { include: { tests: true } } },
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
