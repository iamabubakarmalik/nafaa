import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAdminNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class AdminNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAdminNotificationDto) {
    return this.prisma.adminNotification.create({
      data: {
        type: dto.type,
        priority: dto.priority ?? 'NORMAL',
        title: dto.title,
        message: dto.message,
        link: dto.link,
        tenantId: dto.tenantId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        metadata: dto.metadata ?? Prisma.JsonNull,
      },
    });
  }

  async list(params: {
    isRead?: boolean;
    type?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.isRead !== undefined) where.isRead = params.isRead;
    if (params.type) where.type = params.type;
    if (params.priority) where.priority = params.priority;

    const [items, total] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          readBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.adminNotification.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async unreadCount() {
    const [total, urgent, high] = await Promise.all([
      this.prisma.adminNotification.count({ where: { isRead: false } }),
      this.prisma.adminNotification.count({
        where: { isRead: false, priority: 'URGENT' },
      }),
      this.prisma.adminNotification.count({
        where: { isRead: false, priority: 'HIGH' },
      }),
    ]);
    return { total, urgent, high };
  }

  async recent(limit = 10) {
    return this.prisma.adminNotification.findMany({
      where: { isRead: false },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.adminNotification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
        readById: userId,
      },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
        readById: userId,
      },
    });
    return { updatedCount: result.count };
  }

  async remove(id: string) {
    await this.prisma.adminNotification.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  async clearAllRead() {
    const result = await this.prisma.adminNotification.deleteMany({
      where: { isRead: true },
    });
    return { deletedCount: result.count };
  }

  async stats() {
    const [total, unread, byType, byPriority] = await Promise.all([
      this.prisma.adminNotification.count(),
      this.prisma.adminNotification.count({ where: { isRead: false } }),
      this.prisma.adminNotification.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.adminNotification.groupBy({
        by: ['priority'],
        where: { isRead: false },
        _count: true,
      }),
    ]);

    return { total, unread, byType, byPriority };
  }
}
