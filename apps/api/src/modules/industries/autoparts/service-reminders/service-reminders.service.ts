import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays } from 'date-fns';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ServiceRemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const v = await this.prisma.customerVehicle.findFirst({ where: { id: dto.vehicleId, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Vehicle not found');

    return this.prisma.vehicleServiceReminder.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; vehicleId?: string; upcoming?: boolean; overdue?: boolean }) {
    const now = new Date();
    const in30d = addDays(now, 30);

    return this.prisma.vehicleServiceReminder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.vehicleId && { vehicleId: params.vehicleId }),
        ...(params.upcoming && { dueDate: { gte: now, lte: in30d }, status: { in: ['PENDING', 'SENT'] } }),
        ...(params.overdue && { dueDate: { lt: now }, status: { in: ['PENDING', 'SENT'] } }),
      },
      orderBy: { dueDate: 'asc' },
      take: 200,
    });
  }

  async byVehicle(user: AuthenticatedUser, vehicleId: string) {
    return this.prisma.vehicleServiceReminder.findMany({
      where: { tenantId: user.tenantId, vehicleId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    const r = await this.prisma.vehicleServiceReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Reminder not found');
    const patch: any = { status };
    const now = new Date();
    if (status === 'SENT') patch.sentAt = now;
    if (status === 'ACKNOWLEDGED') patch.acknowledgedAt = now;
    if (status === 'DONE') patch.doneAt = now;
    return this.prisma.vehicleServiceReminder.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.vehicleServiceReminder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Reminder not found');
    return this.prisma.vehicleServiceReminder.delete({ where: { id } });
  }

  async autoGenerate(user: AuthenticatedUser, vehicleId: string) {
    const v = await this.prisma.customerVehicle.findFirst({ where: { id: vehicleId, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Vehicle not found');

    const created: any[] = [];

    // Insurance reminder
    if (v.insuranceExpiry) {
      const dueDate = addDays(v.insuranceExpiry, -15);
      const dup = await this.prisma.vehicleServiceReminder.findFirst({
        where: { tenantId: user.tenantId, vehicleId, reminderType: 'INSURANCE', status: { in: ['PENDING', 'SENT'] } },
      });
      if (!dup) {
        const r = await this.prisma.vehicleServiceReminder.create({
          data: {
            tenantId: user.tenantId,
            vehicleId,
            reminderType: 'INSURANCE',
            title: 'Insurance Renewal Due',
            description: `Insurance expires on ${v.insuranceExpiry.toDateString()}`,
            dueDate,
            autoCreated: true,
          },
        });
        created.push(r);
      }
    }

    // Token tax reminder
    if (v.tokenTaxExpiry) {
      const dueDate = addDays(v.tokenTaxExpiry, -30);
      const dup = await this.prisma.vehicleServiceReminder.findFirst({
        where: { tenantId: user.tenantId, vehicleId, reminderType: 'TOKEN_TAX', status: { in: ['PENDING', 'SENT'] } },
      });
      if (!dup) {
        const r = await this.prisma.vehicleServiceReminder.create({
          data: {
            tenantId: user.tenantId,
            vehicleId,
            reminderType: 'TOKEN_TAX',
            title: 'Token Tax Renewal Due',
            description: `Token tax expires on ${v.tokenTaxExpiry.toDateString()}`,
            dueDate,
            autoCreated: true,
          },
        });
        created.push(r);
      }
    }

    // Fitness reminder
    if (v.fitnessExpiry) {
      const dueDate = addDays(v.fitnessExpiry, -30);
      const dup = await this.prisma.vehicleServiceReminder.findFirst({
        where: { tenantId: user.tenantId, vehicleId, reminderType: 'FITNESS', status: { in: ['PENDING', 'SENT'] } },
      });
      if (!dup) {
        const r = await this.prisma.vehicleServiceReminder.create({
          data: {
            tenantId: user.tenantId,
            vehicleId,
            reminderType: 'FITNESS',
            title: 'Fitness Certificate Renewal',
            description: `Fitness expires on ${v.fitnessExpiry.toDateString()}`,
            dueDate,
            autoCreated: true,
          },
        });
        created.push(r);
      }
    }

    return { created: created.length, reminders: created };
  }
}
