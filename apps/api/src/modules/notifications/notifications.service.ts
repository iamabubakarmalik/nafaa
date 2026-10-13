/**
 * In-app notifications: create (with mobile push), the bell's latest list,
 * the Notifications page feed (groups, read state, period, text, cursor
 * paging), and read/unread/delete for one or many. A person sees their own
 * notifications and the business-wide ones (no user).
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { zonedToUtc } from '../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';

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

/** Page groups. A notification can sit in more than one. */
export const NOTIFICATION_GROUPS = ['summary', 'sales', 'online', 'stock', 'alerts'] as const;
export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number];

const GROUP_WHERE: Record<NotificationGroup, Prisma.NotificationWhereInput> = {
  summary: { metadata: { path: ['kind'], equals: 'daily-summary' } },
  sales: { type: { in: ['NEW_SALE', 'PAYMENT_RECEIVED', 'RETURN_PROCESSED', 'REGISTER_OPENED', 'REGISTER_CLOSED'] } },
  online: { OR: [{ metadata: { path: ['kind'], equals: 'ONLINE_ORDER' } }, { link: { startsWith: '/online-orders' } }] },
  stock: { OR: [{ type: 'LOW_STOCK' }, { link: { startsWith: '/transfers' } }, { link: { startsWith: '/low-stock' } }] },
  alerts: { type: { in: ['WARNING', 'ERROR', 'CREDIT_ALERT', 'PAYMENT_REJECTED', 'SUBSCRIPTION_EXPIRING'] } },
};

export interface NotificationFeedQuery {
  group?: NotificationGroup;
  unreadOnly?: boolean;
  /** Business days "YYYY-MM-DD". */
  from?: string;
  to?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export type BulkAction = 'read' | 'unread' | 'delete';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clocks: TenantTimezoneService,
  ) {}

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

  /** The viewer's own notifications and the business-wide ones. */
  private mine(user: AuthenticatedUser): Prisma.NotificationWhereInput {
    return { tenantId: user.tenantId, OR: [{ userId: user.id }, { userId: null }] };
  }

  /** Latest notifications (bell, mobile, offline cache). */
  async list(user: AuthenticatedUser, opts: { limit?: number; unreadOnly?: boolean } = {}) {
    return this.prisma.notification.findMany({
      where: { ...this.mine(user), ...(opts.unreadOnly && { isRead: false }) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(opts.limit ?? 100, 1), 200),
    });
  }

  /** Notifications page: one page of the filtered list plus counts for the tabs. */
  async feed(user: AuthenticatedUser, q: NotificationFeedQuery) {
    const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
    const needle = q.search?.trim();
    const { tz, dayStartHour: h } = await this.clocks.clock(user.tenantId);
    const dayStart = (key: string) => { const [y, m, d] = key.split('-').map(Number); return zonedToUtc(y, m, d, h, 0, 0, tz); };
    const gte = q.from ? dayStart(q.from) : undefined;
    const lt = q.to ? new Date(dayStart(q.to).getTime() + 86_400_000) : undefined;
    const base: Prisma.NotificationWhereInput[] = [
      this.mine(user),
      ...(gte || lt ? [{ createdAt: { ...(gte && { gte }), ...(lt && { lt }) } }] : []),
      ...(needle ? [{ OR: [{ title: { contains: needle, mode: 'insensitive' as const } }, { message: { contains: needle, mode: 'insensitive' as const } }] }] : []),
    ];
    const where: Prisma.NotificationWhereInput = {
      AND: [...base, ...(q.group ? [GROUP_WHERE[q.group]] : []), ...(q.unreadOnly ? [{ isRead: false }] : [])],
    };
    const cursor = this.parseCursor(q.cursor);
    const pageWhere: Prisma.NotificationWhereInput = cursor
      ? { AND: [where, { OR: [{ createdAt: { lt: cursor.at } }, { createdAt: cursor.at, id: { lt: cursor.id } }] }] }
      : where;

    const [rows, total, all, unread, ...groups] = await Promise.all([
      this.prisma.notification.findMany({ where: pageWhere, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1 }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { AND: base } }),
      this.prisma.notification.count({ where: { AND: [...base, { isRead: false }] } }),
      ...NOTIFICATION_GROUPS.map((g) => this.prisma.notification.count({ where: { AND: [...base, GROUP_WHERE[g], ...(q.unreadOnly ? [{ isRead: false }] : [])] } })),
    ]);
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: rows.length > limit && last ? `${last.createdAt.toISOString()}_${last.id}` : null,
      total,
      counts: { all, unread, groups: Object.fromEntries(NOTIFICATION_GROUPS.map((g, i) => [g, groups[i]])) as Record<NotificationGroup, number> },
    };
  }

  private parseCursor(raw?: string): { at: Date; id: string } | null {
    if (!raw) return null;
    const cut = raw.indexOf('_');
    const at = new Date(raw.slice(0, cut));
    const id = raw.slice(cut + 1);
    if (cut < 0 || Number.isNaN(at.getTime()) || !id) throw new BadRequestException('Ghalat cursor');
    return { at, id };
  }

  /** Read, unread or delete many at once; only the viewer's own and business-wide ones. */
  async bulk(user: AuthenticatedUser, ids: string[], action: BulkAction) {
    const where: Prisma.NotificationWhereInput = { AND: [this.mine(user), { id: { in: ids } }] };
    if (action === 'delete') {
      const r = await this.prisma.notification.deleteMany({ where });
      return { count: r.count };
    }
    const r = await this.prisma.notification.updateMany({
      where,
      data: action === 'read' ? { isRead: true, readAt: new Date() } : { isRead: false, readAt: null },
    });
    return { count: r.count };
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
      where: { AND: [this.mine(user), { id }] },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAsUnread(user: AuthenticatedUser, id: string) {
    return this.prisma.notification.updateMany({
      where: { AND: [this.mine(user), { id }] },
      data: { isRead: false, readAt: null },
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
      where: { AND: [this.mine(user), { id }] },
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
