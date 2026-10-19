/**
 * Housekeeping: cleaning, linen and repair jobs per room. Finishing a clean
 * marks the room clean, and a room waiting after check-out becomes ready to
 * sell; a room with a guest in it keeps its status. A problem found sends
 * the room to maintenance only when it is empty.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { startOfDayTz } from '../../../common/helpers/business-time.helper';
import { resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { IN_HOUSE, dayOf, found, nextTaskNumber, type Db } from '../common/hotel-common';
import { AssignTaskDto, CompleteTaskDto, HousekeepingTaskDto } from '../common/hotel.dto';

const OPEN = ['PENDING', 'ASSIGNED', 'IN_PROGRESS'];
const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

@Injectable()
export class HousekeepingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: HousekeepingTaskDto) {
    const room = found(await this.prisma.hotelRoom.findFirst({ where: { id: dto.roomId, tenantId: user.tenantId, isActive: true } }), 'Room');
    const same = await this.prisma.hotelHousekeepingTask.findFirst({ where: { tenantId: user.tenantId, roomId: room.id, taskType: dto.taskType, status: { in: OPEN } }, select: { taskNumber: true } });
    if (same) throw new BadRequestException(`Room ${room.roomNumber} ka ye kaam pehle se khula hai (${same.taskNumber})`);
    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, null);
      const task = await tx.hotelHousekeepingTask.create({
        data: {
          tenantId: user.tenantId, shopId, taskNumber: await nextTaskNumber(tx as Db, user.tenantId),
          roomId: room.id, roomNumber: room.roomNumber, taskType: dto.taskType, priority: dto.priority ?? 'NORMAL',
          scheduledFor: dto.scheduledFor ? dayOf(dto.scheduledFor, 'Date') : new Date(),
          assignedTo: dto.assignedTo?.trim() || null, assignedName: dto.assignedName?.trim() || null,
          status: dto.assignedName?.trim() ? 'ASSIGNED' : 'PENDING', notes: dto.notes?.trim() || null,
        },
      });
      if (['CHECKOUT_CLEAN', 'DAILY_CLEAN', 'DEEP_CLEAN'].includes(dto.taskType) && room.housekeepingStatus !== 'DIRTY') {
        await tx.hotelRoom.update({ where: { id: room.id }, data: { housekeepingStatus: 'DIRTY' } });
      }
      return task;
    });
  }

  /** Jobs by view: open (default), done today, all. Open jobs come urgent-first. */
  async list(user: AuthenticatedUser, params: { status?: string; assignedTo?: string; priority?: string; roomId?: string; view?: string; search?: string }) {
    const search = params.search?.trim();
    const where: Prisma.HotelHousekeepingTaskWhereInput = {
      tenantId: user.tenantId,
      ...(params.status ? { status: params.status } : params.view === 'all' ? {} : params.view === 'done' ? { status: { in: ['COMPLETED', 'CANCELLED'] } } : { status: { in: OPEN } }),
      ...(params.assignedTo && { assignedTo: params.assignedTo }),
      ...(params.priority && { priority: params.priority }),
      ...(params.roomId && { roomId: params.roomId }),
      ...(search && { OR: [{ roomNumber: { contains: search, mode: 'insensitive' } }, { assignedName: { contains: search, mode: 'insensitive' } }, { taskNumber: { contains: search, mode: 'insensitive' } }] }),
    };
    const rows = await this.prisma.hotelHousekeepingTask.findMany({ where, orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }], take: 300 });
    return rows.sort((a, b) => (OPEN.includes(a.status) === OPEN.includes(b.status) ? (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) : OPEN.includes(a.status) ? -1 : 1));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    return found(await this.prisma.hotelHousekeepingTask.findFirst({ where: { id, tenantId: user.tenantId } }), 'Kaam');
  }

  private async openTask(user: AuthenticatedUser, id: string) {
    const t = await this.getOne(user, id);
    if (!OPEN.includes(t.status)) throw new BadRequestException('Ye kaam band ho chuka');
    return t;
  }

  async assign(user: AuthenticatedUser, id: string, dto: AssignTaskDto) {
    const t = await this.openTask(user, id);
    const name = dto.assignedName.trim();
    if (!name) throw new BadRequestException('Kis ko dena hai — naam likhein');
    return this.prisma.hotelHousekeepingTask.update({
      where: { id }, data: { assignedTo: dto.assignedTo?.trim() || null, assignedName: name, ...(t.status === 'PENDING' && { status: 'ASSIGNED' }) },
    });
  }

  async start(user: AuthenticatedUser, id: string) {
    const t = await this.openTask(user, id);
    if (t.status === 'IN_PROGRESS') return t;
    return this.prisma.hotelHousekeepingTask.update({ where: { id }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
  }

  async cancel(user: AuthenticatedUser, id: string, reason: string) {
    const t = await this.openTask(user, id);
    const why = reason?.trim();
    if (!why) throw new BadRequestException('Wajah likhein');
    return this.prisma.hotelHousekeepingTask.update({ where: { id }, data: { status: 'CANCELLED', notes: [t.notes, `Cancel: ${why}`].filter(Boolean).join('\n') } });
  }

  async complete(user: AuthenticatedUser, id: string, dto: CompleteTaskDto) {
    const t = await this.openTask(user, id);
    const completedAt = new Date();
    const startedAt = t.startedAt ?? null;
    const durationMin = startedAt ? Math.round((completedAt.getTime() - startedAt.getTime()) / 60000) : null;
    const issue = dto.issueFound?.trim() || null;

    return this.prisma.$transaction(async (tx) => {
      const done = await tx.hotelHousekeepingTask.updateMany({
        where: { id, status: { in: OPEN } },
        data: { status: 'COMPLETED', completedAt, durationMin, notes: dto.notes?.trim() || t.notes, issueFound: issue },
      });
      if (!done.count) throw new BadRequestException('Ye kaam band ho chuka');
      if (t.roomId) {
        const room = await tx.hotelRoom.findFirst({ where: { id: t.roomId, tenantId: user.tenantId } });
        const guestIn = await tx.hotelBookedRoom.findFirst({ where: { roomId: t.roomId, booking: { tenantId: user.tenantId, status: { in: [...IN_HOUSE] } } }, select: { id: true } });
        if (room && issue) {
          await tx.hotelRoom.update({
            where: { id: room.id },
            data: { housekeepingStatus: 'MAINTENANCE_REQUIRED', maintenanceNotes: issue, ...(!guestIn && room.status !== 'OCCUPIED' && { status: 'MAINTENANCE' }) },
          });
        } else if (room && t.taskType !== 'MAINTENANCE') {
          const inspected = t.taskType === 'INSPECTION';
          await tx.hotelRoom.update({
            where: { id: room.id },
            data: {
              housekeepingStatus: inspected ? 'INSPECTED' : 'CLEAN', ...(inspected ? { lastInspectedAt: completedAt } : { lastCleanedAt: completedAt }),
              ...(!guestIn && room.status === 'CLEANING' && { status: 'AVAILABLE' }),
            },
          });
        } else if (room && !guestIn && room.status === 'MAINTENANCE') {
          await tx.hotelRoom.update({ where: { id: room.id }, data: { status: 'AVAILABLE', housekeepingStatus: 'CLEAN', maintenanceNotes: null } });
        }
      }
      return tx.hotelHousekeepingTask.findUniqueOrThrow({ where: { id } });
    });
  }

  async summary(user: AuthenticatedUser) {
    const since = startOfDayTz();
    const [pending, assigned, inProgress, completedToday, urgent, dirtyRooms] = await Promise.all([
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId: user.tenantId, status: 'ASSIGNED' } }),
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId: user.tenantId, status: 'IN_PROGRESS' } }),
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId: user.tenantId, status: 'COMPLETED', completedAt: { gte: since } } }),
      this.prisma.hotelHousekeepingTask.count({ where: { tenantId: user.tenantId, status: { in: OPEN }, priority: { in: ['URGENT', 'HIGH'] } } }),
      this.prisma.hotelRoom.count({ where: { tenantId: user.tenantId, isActive: true, housekeepingStatus: { in: ['DIRTY', 'MAINTENANCE_REQUIRED'] } } }),
    ]);
    // `completed` is kept for older screens.
    return { pending, assigned, inProgress, completedToday, completed: completedToday, urgent, dirtyRooms };
  }
}
