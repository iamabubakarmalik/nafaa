/**
 * Admin notifications: the team inbox, the live feed the admin app polls,
 * per-admin alert preferences and the write path behind notifyAdmins().
 *
 * Every read is limited to the categories the admin's role can see
 * (CATEGORY_PERMISSIONS in admin-notify.logic.ts). Read state is shared by
 * the team: marking a notification read marks it for everyone.
 */

import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { AdminNotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminNotificationDto } from './dto/create-notification.dto';
import { dayRange } from '../common/date-range';
import { AdminEvent, AdminNotifier, registerAdminNotifier } from './admin-notify';
import {
  AdminNotifyCategory,
  AdminNotifyPrefs,
  AdminNotifySeverity,
  alertPlan,
  categoryForType,
  isCategory,
  isSeverity,
  normalizePrefs,
  planDedupe,
  priorityToSeverity,
  severityPriorities,
  severityToPriority,
} from './admin-notify.logic';

const PREFS_PREFIX = 'admin_notify_prefs:';
const MARKER_PREFIX = 'admin_notify_marker:';
const SETTING_CATEGORY = 'admin_notifications';
const FEED_LIMIT = 30;

const TYPE_FOR_SEVERITY: Record<AdminNotifySeverity, AdminNotificationType> = { info: 'INFO', warning: 'WARNING', critical: 'ERROR' };

type Row = Prisma.AdminNotificationGetPayload<object>;

@Injectable()
export class AdminNotificationsService implements AdminNotifier, OnModuleDestroy {
  private readonly logger = new Logger(AdminNotificationsService.name);
  /** Serializes writes per dedupe key inside this process, so a burst gives one row. */
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(private readonly prisma: PrismaService) {
    registerAdminNotifier(this);
  }

  onModuleDestroy() {
    registerAdminNotifier(null);
  }

  /* ───────────────────────── writing ───────────────────────── */

  /** Manual create (POST /admin/notifications) and older callers that pass only a type. */
  async create(dto: CreateAdminNotificationDto & { category?: string }) {
    const now = new Date();
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
        category: isCategory(dto.category) ? dto.category : categoryForType(dto.type, dto.link),
        lastAt: now,
      },
    });
  }

  /** The write behind notifyAdmins(). Errors are logged, never thrown. */
  async notify(e: AdminEvent): Promise<Row | null> {
    const run = () => this.write(e).catch((err) => {
      this.logger.warn(`Admin notification "${e.event}" failed: ${err instanceof Error ? err.message : err}`);
      return null;
    });
    if (!e.dedupeKey) return run();
    const key = e.dedupeKey;
    const prev = this.locks.get(key) ?? Promise.resolve();
    const next = prev.then(run, run);
    this.locks.set(key, next);
    void next.finally(() => { if (this.locks.get(key) === next) this.locks.delete(key); });
    return next;
  }

  private async write(e: AdminEvent): Promise<Row | null> {
    const now = new Date();
    const severity: AdminNotifySeverity = e.severity ?? 'info';
    const title = e.title.slice(0, 300);
    const message = e.message.slice(0, 4000);
    const metadata = { ...(e.metadata ?? {}), event: e.event } as Prisma.InputJsonValue;

    if (e.dedupeKey) {
      const latest = await this.prisma.adminNotification.findFirst({
        where: { dedupeKey: e.dedupeKey },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true },
      });
      const plan = planDedupe(latest, now, { windowMinutes: e.windowMinutes, once: e.once });
      if (plan.action === 'skip') return null;
      if (plan.action === 'bump') {
        return this.prisma.adminNotification.update({
          where: { id: plan.id },
          data: e.quietRepeat
            ? { occurrences: { increment: 1 } }
            : { occurrences: { increment: 1 }, lastAt: now, title, message, metadata, isRead: false, readAt: null, readById: null },
        });
      }
    }

    return this.prisma.adminNotification.create({
      data: {
        type: e.type ?? TYPE_FOR_SEVERITY[severity],
        priority: severityToPriority(severity),
        category: e.category,
        title,
        message,
        link: e.link ?? null,
        tenantId: e.tenantId ?? null,
        entityType: e.entityType ?? null,
        entityId: e.entityId ?? null,
        metadata,
        dedupeKey: e.dedupeKey ?? null,
        lastAt: now,
      },
    });
  }

  /* ───────────────────────── reading ───────────────────────── */

  private scope(allowed: AdminNotifyCategory[], category?: string): Prisma.AdminNotificationWhereInput {
    const cats = isCategory(category) ? allowed.filter((c) => c === category) : allowed;
    return { category: { in: cats } };
  }

  private present<T extends Row>(n: T) {
    return { ...n, category: (isCategory(n.category) ? n.category : 'general') as AdminNotifyCategory, severity: priorityToSeverity(n.priority) };
  }

  async list(
    params: {
      isRead?: boolean;
      type?: string;
      priority?: string;
      severity?: string;
      category?: string;
      search?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
    allowed: AdminNotifyCategory[],
  ) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.AdminNotificationWhereInput = this.scope(allowed, params.category);
    if (params.isRead !== undefined) where.isRead = params.isRead;
    if (params.type) where.type = params.type as AdminNotificationType;
    if (isSeverity(params.severity)) where.priority = { in: severityPriorities(params.severity) };
    else if (params.priority) where.priority = params.priority as never;
    const range = dayRange(params.from, params.to);
    if (range) where.lastAt = range;
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where,
        orderBy: [{ lastAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
        include: { readBy: { select: { id: true, fullName: true } } },
      }),
      this.prisma.adminNotification.count({ where }),
    ]);

    return {
      items: items.map((n) => this.present(n)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async unreadCount(allowed: AdminNotifyCategory[]) {
    const base = { ...this.scope(allowed), isRead: false };
    const [total, urgent, high] = await Promise.all([
      this.prisma.adminNotification.count({ where: base }),
      this.prisma.adminNotification.count({ where: { ...base, priority: 'URGENT' } }),
      this.prisma.adminNotification.count({ where: { ...base, priority: 'HIGH' } }),
    ]);
    return { total, urgent, high };
  }

  async recent(allowed: AdminNotifyCategory[], limit = 10) {
    const rows = await this.prisma.adminNotification.findMany({
      where: { ...this.scope(allowed), isRead: false },
      orderBy: [{ lastAt: 'desc' }],
      take: Math.min(50, Math.max(1, limit)),
    });
    return rows.map((n) => this.present(n));
  }

  /**
   * What the admin app polls every ~15 seconds: notifications that happened
   * after `since`, each with how it should alert this admin, plus unread
   * counts for the bell. Without `since` it only returns the cursor.
   */
  async feed(userId: string, allowed: AdminNotifyCategory[], since?: string) {
    const now = new Date();
    const t = since ? Date.parse(since) : NaN;
    const [unread, prefs] = await Promise.all([this.unreadCount(allowed), this.getPrefs(userId)]);
    if (!Number.isFinite(t)) return { now: now.toISOString(), unread, items: [] };
    // Never look back more than a day (a laptop waking up should not replay a week).
    const from = new Date(Math.max(t, now.getTime() - 86_400_000));
    const rows = await this.prisma.adminNotification.findMany({
      where: { ...this.scope(allowed), lastAt: { gt: from }, isRead: false },
      orderBy: { lastAt: 'asc' },
      take: FEED_LIMIT,
    });
    const items = rows.map((n) => {
      const v = this.present(n);
      return { ...v, alert: alertPlan(prefs, v.category, v.severity, now) };
    });
    const cursor = rows.length === FEED_LIMIT ? rows[rows.length - 1].lastAt : now;
    return { now: cursor.toISOString(), unread, items };
  }

  async markAsRead(id: string, userId: string, allowed: AdminNotifyCategory[]) {
    const r = await this.prisma.adminNotification.updateMany({
      where: { id, ...this.scope(allowed) },
      data: { isRead: true, readAt: new Date(), readById: userId },
    });
    if (!r.count) throw new NotFoundException('Notification not found');
    return { id, isRead: true };
  }

  async markAllAsRead(userId: string, allowed: AdminNotifyCategory[], category?: string) {
    const result = await this.prisma.adminNotification.updateMany({
      where: { ...this.scope(allowed, category), isRead: false },
      data: { isRead: true, readAt: new Date(), readById: userId },
    });
    return { updatedCount: result.count };
  }

  async remove(id: string, allowed: AdminNotifyCategory[]) {
    const r = await this.prisma.adminNotification.deleteMany({ where: { id, ...this.scope(allowed) } });
    if (!r.count) throw new NotFoundException('Notification not found');
    return { message: 'Deleted' };
  }

  async clearAllRead(allowed: AdminNotifyCategory[]) {
    const result = await this.prisma.adminNotification.deleteMany({ where: { ...this.scope(allowed), isRead: true } });
    return { deletedCount: result.count };
  }

  async stats(allowed: AdminNotifyCategory[]) {
    const scope = this.scope(allowed);
    const since = new Date(Date.now() - 86_400_000);
    const [total, unread, today, byType, byPriority, byCategory] = await Promise.all([
      this.prisma.adminNotification.count({ where: scope }),
      this.prisma.adminNotification.count({ where: { ...scope, isRead: false } }),
      this.prisma.adminNotification.count({ where: { ...scope, lastAt: { gte: since } } }),
      this.prisma.adminNotification.groupBy({ by: ['type'], where: scope, _count: true }),
      this.prisma.adminNotification.groupBy({ by: ['priority'], where: { ...scope, isRead: false }, _count: true }),
      this.prisma.adminNotification.groupBy({ by: ['category'], where: { ...scope, isRead: false }, _count: true }),
    ]);
    return { total, unread, today, byType, byPriority, byCategory, categories: allowed };
  }

  /* ───────────────────────── preferences ───────────────────────── */

  async getPrefs(userId: string): Promise<AdminNotifyPrefs> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: PREFS_PREFIX + userId }, select: { value: true } });
    if (!row) return normalizePrefs(null);
    try {
      return normalizePrefs(JSON.parse(row.value));
    } catch {
      return normalizePrefs(null);
    }
  }

  async setPrefs(userId: string, body: unknown): Promise<AdminNotifyPrefs> {
    const current = await this.getPrefs(userId);
    const patch = body && typeof body === 'object' ? (body as Record<string, any>) : {};
    const prefs = normalizePrefs({
      ...current,
      ...patch,
      categories: { ...current.categories, ...(patch.categories ?? {}) },
      quietHours: { ...current.quietHours, ...(patch.quietHours ?? {}) },
    });
    const value = JSON.stringify(prefs);
    await this.prisma.systemSetting.upsert({
      where: { key: PREFS_PREFIX + userId },
      create: { key: PREFS_PREFIX + userId, value, category: SETTING_CATEGORY, description: 'Admin notification alert preferences', updatedById: userId },
      update: { value, updatedById: userId },
    });
    return prefs;
  }

  /* ───────────────────────── markers for scheduled checks ───────────────────────── */

  async getMarker(name: string): Promise<string | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: MARKER_PREFIX + name }, select: { value: true } });
    return row?.value || null;
  }

  async setMarker(name: string, value: string) {
    await this.prisma.systemSetting.upsert({
      where: { key: MARKER_PREFIX + name },
      create: { key: MARKER_PREFIX + name, value, category: SETTING_CATEGORY, description: 'Admin notifications: last run marker' },
      update: { value },
    });
  }

  /**
   * Claims a once-a-day job for `day` (YYYY-MM-DD). Returns true only for the
   * first caller of that day, across restarts and servers: the conditional
   * update succeeds once.
   */
  async claimDaily(name: string, day: string): Promise<boolean> {
    const key = MARKER_PREFIX + name;
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: '', category: SETTING_CATEGORY, description: 'Admin notifications: last day sent' },
      update: {},
    });
    const r = await this.prisma.systemSetting.updateMany({ where: { key, value: { not: day } }, data: { value: day } });
    return r.count === 1;
  }
}
