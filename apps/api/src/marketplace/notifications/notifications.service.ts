import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@Injectable()
export class MarketplaceNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // LIST
  // ═══════════════════════════════════════════════════════════

  async list(customerId: string, dto: ListNotificationsDto) {
    const where: Prisma.CustomerNotificationWhereInput = { customerId };
    if (dto.type) where.type = dto.type;
    if (dto.onlyUnread) where.isRead = false;

    const [items, total, unreadCount, typeCounts] = await Promise.all([
      this.prisma.customerNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: dto.limit ?? 20,
        skip: dto.offset ?? 0,
      }),
      this.prisma.customerNotification.count({ where }),
      this.prisma.customerNotification.count({
        where: { customerId, isRead: false },
      }),
      this.prisma.customerNotification.groupBy({
        by: ['type'],
        where: { customerId, isRead: false },
        _count: { type: true },
      }),
    ]);

    const byType: Record<string, number> = {};
    typeCounts.forEach((t) => (byType[t.type] = t._count.type));

    return {
      items,
      total,
      unreadCount,
      unreadByType: byType,
      limit: dto.limit ?? 20,
      offset: dto.offset ?? 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // UNREAD COUNT (for badge)
  // ═══════════════════════════════════════════════════════════

  async getUnreadCount(customerId: string) {
    const count = await this.prisma.customerNotification.count({
      where: { customerId, isRead: false },
    });
    return { count };
  }

  // ═══════════════════════════════════════════════════════════
  // MARK ONE AS READ
  // ═══════════════════════════════════════════════════════════

  async markRead(customerId: string, notificationId: string) {
    const n = await this.prisma.customerNotification.findFirst({
      where: { id: notificationId, customerId },
    });
    if (!n) throw new NotFoundException('Notification not found');
    if (n.isRead) return { success: true, alreadyRead: true };

    await this.prisma.customerNotification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // MARK ALL AS READ (optionally per type)
  // ═══════════════════════════════════════════════════════════

  async markAllRead(customerId: string, type?: string) {
    const where: Prisma.CustomerNotificationWhereInput = { customerId, isRead: false };
    if (type) where.type = type;
    const res = await this.prisma.customerNotification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true, markedCount: res.count };
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE ONE
  // ═══════════════════════════════════════════════════════════

  async delete(customerId: string, notificationId: string) {
    const n = await this.prisma.customerNotification.findFirst({
      where: { id: notificationId, customerId },
    });
    if (!n) throw new NotFoundException('Notification not found');
    await this.prisma.customerNotification.delete({ where: { id: notificationId } });
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // CLEAR ALL (with optional filter)
  // ═══════════════════════════════════════════════════════════

  async clearAll(customerId: string, opts?: { onlyRead?: boolean; type?: string }) {
    const where: Prisma.CustomerNotificationWhereInput = { customerId };
    if (opts?.onlyRead) where.isRead = true;
    if (opts?.type) where.type = opts.type;
    const res = await this.prisma.customerNotification.deleteMany({ where });
    return { success: true, deletedCount: res.count };
  }

  // ═══════════════════════════════════════════════════════════
  // PREFERENCES
  // ═══════════════════════════════════════════════════════════

  async getPreferences(customerId: string) {
    const customer = await this.prisma.marketplaceCustomer.findUnique({
      where: { id: customerId },
      select: {
        marketingEmails: true, marketingSms: true,
        marketingPush: true, marketingWhatsapp: true,
      },
    });
    if (!customer) throw new NotFoundException();
    return customer;
  }

  async updatePreferences(
    customerId: string,
    prefs: { emails?: boolean; sms?: boolean; push?: boolean; whatsapp?: boolean },
  ) {
    return this.prisma.marketplaceCustomer.update({
      where: { id: customerId },
      data: {
        marketingEmails: prefs.emails,
        marketingSms: prefs.sms,
        marketingPush: prefs.push,
        marketingWhatsapp: prefs.whatsapp,
      },
      select: {
        marketingEmails: true, marketingSms: true,
        marketingPush: true, marketingWhatsapp: true,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // INTERNAL — CREATE (called by other services)
  // ═══════════════════════════════════════════════════════════

  async create(params: {
    customerId: string;
    type: string;
    title: string;
    body: string;
    imageUrl?: string;
    actionUrl?: string;
    data?: any;
    channels?: NotificationChannel[];
  }) {
    return this.prisma.customerNotification.create({
      data: {
        customerId: params.customerId,
        type: params.type,
        title: params.title,
        body: params.body,
        imageUrl: params.imageUrl,
        actionUrl: params.actionUrl,
        data: params.data,
        channel: params.channels?.[0] ?? 'IN_APP',
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // BULK CREATE — used for campaigns / promo blasts
  // ═══════════════════════════════════════════════════════════

  async createBulk(params: {
    customerIds: string[];
    type: string;
    title: string;
    body: string;
    imageUrl?: string;
    actionUrl?: string;
    data?: any;
  }) {
    if (params.customerIds.length === 0) return { count: 0 };
    const res = await this.prisma.customerNotification.createMany({
      data: params.customerIds.map((cid) => ({
        customerId: cid,
        type: params.type,
        title: params.title,
        body: params.body,
        imageUrl: params.imageUrl,
        actionUrl: params.actionUrl,
        data: params.data,
        channel: 'IN_APP' as NotificationChannel,
      })),
    });
    return { count: res.count };
  }
}
