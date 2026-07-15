import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RefillRemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    return this.prisma.refillReminder.create({
      data: {
        tenantId: user.tenantId,
        customerId: dto.customerId,
        productId: dto.productId,
        prescriptionId: dto.prescriptionId,
        medicineName: dto.medicineName,
        scheduledFor: new Date(dto.scheduledFor),
        reminderType: dto.reminderType ?? 'SMS',
        status: 'PENDING',
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string }) {
    return this.prisma.refillReminder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to ? {
          scheduledFor: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  async dueToday(user: AuthenticatedUser) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.prisma.refillReminder.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'PENDING',
        scheduledFor: { gte: start, lte: end },
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  async markSent(user: AuthenticatedUser, id: string) {
    return this.prisma.refillReminder.updateMany({
      where: { id, tenantId: user.tenantId },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  async acknowledge(user: AuthenticatedUser, id: string) {
    return this.prisma.refillReminder.updateMany({
      where: { id, tenantId: user.tenantId },
      data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.refillReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Reminder not found');
    return this.prisma.refillReminder.delete({ where: { id } });
  }
}
