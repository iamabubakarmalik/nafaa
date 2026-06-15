import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.salonAppointment.count({ where: { tenantId } });
    return `APT-${String(count + 1).padStart(4, '0')}`;
  }

  async create(user: AuthenticatedUser, dto: CreateAppointmentDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(startTime.getTime() + dto.duration * 60000);
    const appointmentNumber = await this.nextNumber(user.tenantId);

    return this.prisma.salonAppointment.create({
      data: {
        tenantId: user.tenantId,
        appointmentNumber,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerId: dto.customerId,
        serviceName: dto.serviceName,
        serviceProductId: dto.serviceProductId,
        duration: dto.duration,
        price: dto.price ?? 0,
        startTime,
        endTime,
        staffId: dto.staffId,
        notes: dto.notes,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { from?: string; to?: string; status?: AppointmentStatus; staffId?: string }) {
    const where: any = { tenantId: user.tenantId };
    if (params.from || params.to) {
      where.startTime = {};
      if (params.from) where.startTime.gte = new Date(params.from);
      if (params.to) where.startTime.lte = new Date(params.to);
    }
    if (params.status) where.status = params.status;
    if (params.staffId) where.staffId = params.staffId;

    return this.prisma.salonAppointment.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });
  }

  async today(user: AuthenticatedUser) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.list(user, { from: start.toISOString(), to: end.toISOString() });
  }

  async stats(user: AuthenticatedUser) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [today, scheduled, completed, upcoming] = await Promise.all([
      this.prisma.salonAppointment.count({
        where: { tenantId: user.tenantId, startTime: { gte: start, lte: end } },
      }),
      this.prisma.salonAppointment.count({
        where: { tenantId: user.tenantId, status: 'SCHEDULED', startTime: { gte: new Date() } },
      }),
      this.prisma.salonAppointment.count({
        where: { tenantId: user.tenantId, status: 'COMPLETED', startTime: { gte: start, lte: end } },
      }),
      this.prisma.salonAppointment.count({
        where: { tenantId: user.tenantId, status: { in: ['SCHEDULED', 'CONFIRMED'] }, startTime: { gte: new Date() } },
      }),
    ]);

    return { today, scheduled, completed, upcoming };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const apt = await this.prisma.salonAppointment.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!apt) throw new NotFoundException('Appointment not found');
    return apt;
  }

  async update(user: AuthenticatedUser, id: string, data: Partial<CreateAppointmentDto>) {
    await this.findOne(user, id);
    const updateData: any = { ...data };
    if (data.startTime) {
      updateData.startTime = new Date(data.startTime);
      const duration = data.duration ?? 30;
      updateData.endTime = new Date(updateData.startTime.getTime() + duration * 60000);
    }
    return this.prisma.salonAppointment.update({ where: { id }, data: updateData });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: AppointmentStatus) {
    await this.findOne(user, id);
    return this.prisma.salonAppointment.update({
      where: { id },
      data: { status },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.findOne(user, id);
    await this.prisma.salonAppointment.delete({ where: { id } });
    return { success: true };
  }
}
