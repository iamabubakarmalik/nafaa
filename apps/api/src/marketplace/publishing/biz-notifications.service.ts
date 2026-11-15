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

  // ─── Preferences: one JSON per shop in SystemSetting `market:seller-notify:<tenantId>:<shopId>` ───

  private async prefsKey(tenantId: string, shopId: string | null) {
    let id = shopId;
    if (id) {
      const own = await this.prisma.shop.findFirst({ where: { id, tenantId }, select: { id: true } });
      id = own?.id ?? null;
    }
    if (!id) {
      const first = await this.prisma.shop.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
      if (!first) throw new NotFoundException('Koi dukaan nahi mili');
      id = first.id;
    }
    return `market:seller-notify:${tenantId}:${id}`;
  }

  private defaults(): NotifyPrefs {
    const on = (email: boolean, sms: boolean) => ({ push: true, email, sms });
    return {
      channels: {
        NEW_ORDER: on(true, true),
        ORDER_CANCELLED: on(true, false),
        REVIEW_RECEIVED: on(false, false),
        LOW_STOCK: on(true, false),
        PAYMENT_RECEIVED: on(true, false),
        PAYOUT_PROCESSED: on(true, false),
        DISPUTE_OPENED: on(true, true),
        MESSAGE_RECEIVED: on(false, false),
        SUBSCRIPTION_EXPIRING: on(true, false),
        SYSTEM_ALERT: on(true, false),
        ACHIEVEMENT: on(false, false),
      },
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      soundEnabled: true,
    };
  }

  /** Saved preferences over the defaults; unknown keys and bad values are dropped. */
  private merge(base: NotifyPrefs, raw: unknown): NotifyPrefs {
    const v = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
    const out: NotifyPrefs = { ...base, channels: { ...base.channels } };
    if (v.channels && typeof v.channels === 'object') {
      for (const [k, c] of Object.entries(v.channels as Record<string, any>)) {
        if (!out.channels[k] || !c || typeof c !== 'object') continue;
        out.channels[k] = {
          push: typeof c.push === 'boolean' ? c.push : out.channels[k].push,
          email: typeof c.email === 'boolean' ? c.email : out.channels[k].email,
          sms: typeof c.sms === 'boolean' ? c.sms : out.channels[k].sms,
        };
      }
    }
    const hhmm = (x: unknown) => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
    if (typeof v.quietHoursEnabled === 'boolean') out.quietHoursEnabled = v.quietHoursEnabled;
    if (hhmm(v.quietHoursStart)) out.quietHoursStart = v.quietHoursStart;
    if (hhmm(v.quietHoursEnd)) out.quietHoursEnd = v.quietHoursEnd;
    if (typeof v.soundEnabled === 'boolean') out.soundEnabled = v.soundEnabled;
    return out;
  }

  private async readPrefs(key: string): Promise<NotifyPrefs> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key }, select: { value: true } });
    let saved: unknown = null;
    try { saved = row ? JSON.parse(row.value) : null; } catch { saved = null; }
    return this.merge(this.defaults(), saved);
  }

  async getPreferences(tenantId: string, shopId: string | null) {
    return this.readPrefs(await this.prefsKey(tenantId, shopId));
  }

  async updatePreferences(tenantId: string, shopId: string | null, data: unknown) {
    const key = await this.prefsKey(tenantId, shopId);
    const next = this.merge(await this.readPrefs(key), data);
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(next) },
      create: { key, value: JSON.stringify(next), category: 'market', description: 'Seller Market notification preferences' },
    });
    return next;
  }
}

export interface NotifyPrefs {
  channels: Record<string, { push: boolean; email: boolean; sms: boolean }>;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  soundEnabled: boolean;
}
