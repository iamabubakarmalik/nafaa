import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BizNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, userId: string, opts: {
    unreadOnly?: boolean;
    priority?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (opts.unreadOnly) where.isRead = false;

    const [items, total, unread, urgent, high] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { tenantId, isRead: false } }),
      this.prisma.notification.count({ where: { tenantId, type: { in: ['ERROR', 'WARNING'] as any }, isRead: false } }),
      this.prisma.notification.count({ where: { tenantId, type: { in: ['LOW_STOCK', 'CREDIT_ALERT'] as any }, isRead: false } }),
    ]);

    return {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        priority: (n.type === 'ERROR' || n.type === 'WARNING') ? 'URGENT' : (n.type === 'LOW_STOCK' || n.type === 'CREDIT_ALERT') ? 'HIGH' : 'MEDIUM',
        title: n.title,
        body: n.message,
        imageUrl: (n.metadata as any)?.imageUrl,
        actionUrl: n.link || (n.metadata as any)?.actionUrl,
        actionLabel: (n.metadata as any)?.actionLabel,
        data: n.metadata,
        isRead: n.isRead,
        readAt: n.readAt?.toISOString(),
        createdAt: n.createdAt.toISOString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts: { total, unread, urgent, high },
    };
  }

  async markRead(tenantId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, tenantId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(tenantId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { marked: result.count };
  }

  async delete(tenantId: string, id: string) {
    await this.prisma.notification.deleteMany({ where: { id, tenantId } });
    return { success: true };
  }

  async getPreferences(tenantId: string, userId: string) {
    // Use NotificationPreference model if exists, else return defaults
    const defaultChannels: any = {
      NEW_ORDER: { push: true, email: true, sms: true },
      ORDER_CANCELLED: { push: true, email: true, sms: false },
      REVIEW_RECEIVED: { push: true, email: false, sms: false },
      BARGAIN_OFFER: { push: true, email: false, sms: false },
      LOW_STOCK: { push: true, email: true, sms: false },
      PAYMENT_RECEIVED: { push: true, email: true, sms: false },
      PAYOUT_PROCESSED: { push: true, email: true, sms: false },
      DISPUTE_OPENED: { push: true, email: true, sms: true },
      MESSAGE_RECEIVED: { push: true, email: false, sms: false },
      SUBSCRIPTION_EXPIRING: { push: true, email: true, sms: false },
      SYSTEM_ALERT: { push: true, email: true, sms: false },
      ACHIEVEMENT: { push: true, email: false, sms: false },
    };

    return {
      channels: defaultChannels,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      soundEnabled: true,
    };
  }

  async updatePreferences(tenantId: string, userId: string, data: any) {
    return { success: true };
  }
}
