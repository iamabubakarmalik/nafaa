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
import { MessageText, notificationText, apiMessage } from '../../common/i18n/api-message';
import { isAlertEvent, type AlertEvent } from './alerts/alert-catalog';
import { StaffAlertsService, type AlertInput } from './alerts/staff-alerts.service';

interface CreateNotificationParams {
  tenantId: string;
  userId?: string;
  type: NotificationType;
  /** Plain text, or apiMessage() for a text with values (translated on display). */
  title: MessageText;
  message: MessageText;
  link?: string;
  metadata?: any;
  /** Alert event for push choices; worked out from the type when left out. */
  event?: AlertEvent | null;
}

/** The switchable event a stored notification belongs to, or null for general ones. */
export function eventForNotification(type: NotificationType, metadata?: any, link?: string | null): AlertEvent | null {
  const kind = metadata?.kind;
  if (isAlertEvent(metadata?.event)) return metadata.event;
  if (kind === 'daily-summary') return 'dailySummary';
  if (kind === 'ONLINE_ORDER' || link?.startsWith('/online-orders')) return 'onlineOrder';
  switch (type) {
    case 'NEW_SALE': return 'sale';
    case 'PAYMENT_RECEIVED': return 'khataPayment';
    case 'RETURN_PROCESSED': return 'voidRefund';
    case 'REGISTER_OPENED': case 'REGISTER_CLOSED': return 'register';
    case 'LOW_STOCK': return 'lowStock';
    case 'SUBSCRIPTION_EXPIRING': case 'PAYMENT_APPROVED': case 'PAYMENT_REJECTED': case 'REFERRAL_EARNED': case 'REFERRAL_SIGNUP': return 'account';
    default: return null;
  }
}

/** Page groups. A notification can sit in more than one. */
export const NOTIFICATION_GROUPS = ['summary', 'sales', 'online', 'stock', 'alerts'] as const;
export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number];

const GROUP_WHERE: Record<NotificationGroup, Prisma.NotificationWhereInput> = {
  summary: { metadata: { path: ['kind'], equals: 'daily-summary' } },
  sales: { type: { in: ['NEW_SALE', 'PAYMENT_RECEIVED', 'RETURN_PROCESSED', 'REGISTER_OPENED', 'REGISTER_CLOSED'] } },
  online: { OR: [{ metadata: { path: ['kind'], equals: 'ONLINE_ORDER' } }, { link: { startsWith: '/online-orders' } }, { link: { startsWith: '/online-store' } }] },
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
    private readonly alerts: StaffAlertsService,
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

  /** A business event for the right people (see StaffAlertsService). Returns at once. */
  alert(input: AlertInput) {
    this.alerts.emit(input);
  }

  async create(input: CreateNotificationParams) {
    const params = { ...input, ...notificationText(input.title, input.message, input.metadata) };
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

    this.alerts.pushForNotification({
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      event: params.event ?? eventForNotification(params.type, params.metadata, params.link),
      title: input.title,
      message: input.message,
      link: params.link ?? null,
      data: { notificationId: notification.id, type: params.type },
    });

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
          message: apiMessage('{{name}} ka stock kam ho gaya hai ({{stock}} {{unit}} bacha)', { name: product.name, stock: product.stock, unit: product.unit }),
          link: '/low-stock',
          metadata: { productId: product.id, stock: product.stock },
        });
      }
    }
  }
}
