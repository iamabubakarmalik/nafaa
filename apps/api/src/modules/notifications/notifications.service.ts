import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

interface CreateNotificationParams {
  tenantId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerPushToken(userId: string, token: string) {
    if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
      return { message: 'Invalid token format' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushTokens: true },
    });

    if (!user) return { message: 'User not found' };

    const existing = user.pushTokens || [];
    if (existing.includes(token)) {
      return { message: 'Already registered' };
    }

    // Keep only last 5 tokens per user (avoid stale tokens from old devices)
    const updated = [token, ...existing].slice(0, 5);

    await this.prisma.user.update({
      where: { id: userId },
      data: { pushTokens: updated },
    });

    return { message: 'Push token registered', token };
  }

  async sendPushToUsers(userIds: string[], payload: {
    title: string;
    body: string;
    data?: any;
    channelId?: string;
  }) {
    if (userIds.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { pushTokens: true },
    });

    const tokens = users.flatMap((u) => u.pushTokens || []);
    if (tokens.length === 0) return;

    // Build Expo push messages (batched)
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      channelId: payload.channelId || 'default',
      priority: 'high' as const,
    }));

    // Expo accepts max 100 per request
    const chunks: any[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        const result = (await res.json()) as { data?: Array<{ status: string; details?: { error?: string } }> };

        // Handle invalid tokens — remove from DB
        if (result?.data) {
          for (let i = 0; i < result.data.length; i++) {
            const ticket = result.data[i];
            if (
              ticket?.status === 'error' &&
              ticket?.details?.error === 'DeviceNotRegistered'
            ) {
              const badToken = chunk[i].to;
              await this.removeInvalidToken(badToken);
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Push send failed: ${err?.message}`);
      }
    }
  }

  private async removeInvalidToken(token: string) {
    const users = await this.prisma.user.findMany({
      where: { pushTokens: { has: token } },
      select: { id: true, pushTokens: true },
    });

    for (const user of users) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { pushTokens: user.pushTokens.filter((t) => t !== token) },
      });
    }
  }

  async create(params: CreateNotificationParams) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        metadata: params.metadata,
      },
    });

    // Send push notifications
    let targetUserIds: string[] = [];
    if (params.userId) {
      targetUserIds = [params.userId];
    } else {
      // Tenant-wide notification — send to all active users in the tenant
      const tenantUsers = await this.prisma.user.findMany({
        where: { tenantId: params.tenantId, isActive: true },
        select: { id: true },
      });
      targetUserIds = tenantUsers.map((u) => u.id);
    }

    // Choose Android channel based on type
    let channelId = 'default';
    if (['NEW_SALE', 'PAYMENT_RECEIVED'].includes(params.type)) {
      channelId = 'sales';
    } else if (['LOW_STOCK', 'OUT_OF_STOCK', 'INVOICE_DUE'].includes(params.type)) {
      channelId = 'alerts';
    }

    this.sendPushToUsers(targetUserIds, {
      title: params.title,
      body: params.message,
      data: {
        notificationId: notification.id,
        type: params.type,
        link: params.link,
        ...(params.metadata || {}),
      },
      channelId,
    }).catch((e) => this.logger.warn(`Async push failed: ${e?.message}`));

    return notification;
  }

  async list(user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [{ userId: user.id }, { userId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async unreadCount(user: AuthenticatedUser) {
    const count = await this.prisma.notification.count({
      where: {
        tenantId: user.tenantId,
        OR: [{ userId: user.id }, { userId: null }],
        isRead: false,
      },
    });
    return { count };
  }

  async markAsRead(user: AuthenticatedUser, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, tenantId: user.tenantId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(user: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: {
        tenantId: user.tenantId,
        OR: [{ userId: user.id }, { userId: null }],
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  async delete(user: AuthenticatedUser, id: string) {
    await this.prisma.notification.deleteMany({
      where: { id, tenantId: user.tenantId },
    });
    return { message: 'Notification deleted' };
  }

  async checkLowStock(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
    });

    const lowStock = products.filter((p) => p.stock <= p.lowStockAlert);

    for (const product of lowStock.slice(0, 5)) {
      const exists = await this.prisma.notification.findFirst({
        where: {
          tenantId,
          type: 'LOW_STOCK',
          metadata: { path: ['productId'], equals: product.id },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (!exists) {
        await this.create({
          tenantId,
          type: 'LOW_STOCK',
          title: '⚠️ Low Stock Alert',
          message: `${product.name} ka stock kam ho gaya hai (${product.stock} ${product.unit} bacha)`,
          link: '/low-stock',
          metadata: { productId: product.id, stock: product.stock },
        });
      }
    }
  }
}
