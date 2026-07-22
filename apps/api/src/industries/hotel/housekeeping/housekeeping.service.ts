import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class HousekeepingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.hotelHousekeepingTask.count({ where: { tenantId: user.tenantId } });
    const taskNumber = 'HK-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');
    return this.prisma.hotelHousekeepingTask.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        taskNumber,
        ...dto,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; assignedTo?: string; priority?: string; roomId?: string }) {
    return this.prisma.hotelHousekeepingTask.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.assignedTo && { assignedTo: params.assignedTo }),
        ...(params.priority && { priority: params.priority }),
        ...(params.roomId && { roomId: params.roomId }),
      },
      orderBy: [{ priority: 'desc' }, { scheduledFor: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.hotelHousekeepingTask.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Task not found');
    return t;
  }

  async assign(user: AuthenticatedUser, id: string, assignedTo: string, assignedName: string) {
    return this.prisma.hotelHousekeepingTask.update({
      where: { id },
      data: { assignedTo, assignedName, status: 'ASSIGNED' },
    });
  }

  async start(user: AuthenticatedUser, id: string) {
    return this.prisma.hotelHousekeepingTask.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });
  }

  async complete(user: AuthenticatedUser, id: string, dto: { notes?: string; issueFound?: string; photoUrls?: string[]; suppliesUsed?: any }) {
    const t = await this.prisma.hotelHousekeepingTask.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Task not found');

    const completedAt = new Date();
    const durationMin = t.startedAt ? Math.round((completedAt.getTime() - t.startedAt.getTime()) / 60000) : null;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.hotelHousekeepingTask.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt,
          durationMin,
          notes: dto.notes,
          issueFound: dto.issueFound,
          photoUrls: dto.photoUrls,
          suppliesUsed: dto.suppliesUsed,
        },
      });

      // Update room housekeeping status if linked
      if (t.roomId && !dto.issueFound) {
        await tx.hotelRoom.update({
          where: { id: t.roomId },
          data: { housekeepingStatus: 'CLEAN', lastCleanedAt: completedAt, status: 'AVAILABLE' },
        });
      } else if (t.roomId && dto.issueFound) {
        await tx.hotelRoom.update({
          where: { id: t.roomId },
          data: { housekeepingStatus: 'MAINTENANCE_REQUIRED', status: 'MAINTENANCE', maintenanceNotes: dto.issueFound },
        });
      }

      return updated;
    });
  }

  async summary(user: AuthenticatedUser) {
    const [pending, inProgress, completed] = await Promise.all([
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId: user.tenantId, status: 'IN_PROGRESS' } }),
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
    ]);
    return { pending, inProgress, completed };
  }
}
