/**
 * Staff alerts: turns a business event (sale, expense, low stock, …) into
 * in-app notifications and phone pushes for the right people.
 *
 * Who gets it: active users of the business who hold the event's permission,
 * work in the event's shop (owners see all shops), are not the person who
 * did it, and have the event switched on (role defaults plus their own
 * choices). Pushes follow each person's sound, vibration and quiet hours;
 * sale pushes can come as one summary per window instead of one per bill.
 *
 * Callers never wait: emit() returns at once and the work runs after the
 * request. Errors are logged, never thrown back.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { apiMessage, MessageText, notificationText } from '../../../common/i18n/api-message';
import { QUEUE_NAMES } from '../../../core/queue/queue.constants';
import { PushDeliveryService, type DeliveryItem, type TestOutcome } from '../../push/push-delivery.service';
import { pushText, type AlertEvent } from './alert-catalog';
import {
  canReceive, digestWindow, deviceHasTones, eventSwitch, inQuietHours, inScope, normalizePrefs, pushSound,
  type AlertPerson, type AlertPrefs,
} from './alert-rules';

export interface AlertInput {
  tenantId: string;
  event: AlertEvent;
  type?: NotificationType;
  /** Shop the event happened in; people tied to another shop are skipped. */
  shopId?: string | null;
  /** The person who did it; they are told only if their own-actions switches allow it. */
  actorId?: string | null;
  title: MessageText;
  message: MessageText;
  link?: string;
  metadata?: Record<string, unknown>;
  /** False keeps it in the app only (e.g. a register opened normally). */
  pushWorthy?: boolean;
  /** Bill amount, for the "only sales above" choice. */
  amount?: number;
  /** Discount percent, for the big-discount threshold. */
  percent?: number;
  /** Limit to these people (e.g. the daily summary's chosen people). */
  onlyUserIds?: string[];
}

export interface PushOnlyInput {
  tenantId: string;
  /** Null for a notification that is not one of the switchable events. */
  event: AlertEvent | null;
  userId?: string | null;
  title: MessageText;
  message: MessageText;
  link?: string | null;
  data?: Record<string, unknown>;
  legacyChannel?: string;
}

interface Recipient extends AlertPerson {
  language: string | null;
  prefs: AlertPrefs;
  tokens: Array<{ token: string; platform: string | null; tones: boolean }>;
}

interface DigestJob { tenantId: string; userId: string; start: number; end: number; minutes: number }

const personSelect = {
  id: true, role: true, permissions: true, shopId: true, language: true, pushTokens: true,
  notificationPref: true,
  mobileDevices: { where: { pushToken: { not: null } }, select: { pushToken: true, platform: true, runtimeVersion: true } },
} satisfies Prisma.UserSelect;

type PersonRow = Prisma.UserGetPayload<{ select: typeof personSelect }>;

const textOf = (m: MessageText) => (typeof m === 'string' ? { template: m, params: {} as Record<string, unknown> } : { template: m.messageKey, params: m.params as Record<string, unknown> });

/** Fills {{by}} with the actor's name when the emitter left it out. */
function withActor(text: MessageText, name: string): MessageText {
  if (typeof text === 'string' || !text.messageKey.includes('{{by}}') || 'by' in text.params) return text;
  return apiMessage(text.messageKey, { ...text.params, by: name });
}

const legacyChannelFor = (event: AlertEvent | null) =>
  event === 'sale' || event === 'khataPayment' || event === 'onlineOrder' ? 'sales'
    : event === 'lowStock' || event === 'register' || event === 'bigDiscount' || event === 'voidRefund' ? 'alerts' : 'default';

@Injectable()
export class StaffAlertsService implements OnModuleDestroy {
  private readonly logger = new Logger(StaffAlertsService.name);
  /** Summary timers used only when the queue is unavailable. */
  private readonly localDigests = new Map<string, NodeJS.Timeout>();
  /** Products already alerted today, also when nobody keeps the in-app row. */
  private readonly stockSeen = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: PushDeliveryService,
    private readonly clocks: TenantTimezoneService,
    @InjectQueue(QUEUE_NAMES.STAFF_ALERTS) private readonly queue: Queue,
  ) {}

  onModuleDestroy() {
    for (const t of this.localDigests.values()) clearTimeout(t);
    this.localDigests.clear();
  }

  /** Fire and forget. */
  emit(input: AlertInput): void {
    setImmediate(() => {
      this.run(input).catch((e) => this.logger.warn(`Alert ${input.event} failed: ${e?.message}`));
    });
  }

  private toRecipient(row: PersonRow): Recipient {
    const seen = new Set<string>();
    const tokens: Recipient['tokens'] = [];
    for (const d of row.mobileDevices) {
      if (!d.pushToken || seen.has(d.pushToken)) continue;
      seen.add(d.pushToken);
      tokens.push({ token: d.pushToken, platform: d.platform, tones: deviceHasTones(d.platform, d.runtimeVersion) });
    }
    // Older app versions saved the token on the user only.
    for (const t of row.pushTokens ?? []) {
      if (seen.has(t)) continue;
      seen.add(t);
      tokens.push({ token: t, platform: null, tones: false });
    }
    return {
      id: row.id, role: row.role, permissions: row.permissions ?? [], shopId: row.shopId,
      language: row.language, prefs: normalizePrefs(row.notificationPref as never), tokens,
    };
  }

  private async people(tenantId: string, onlyUserIds?: string[]): Promise<Recipient[]> {
    const rows = await this.prisma.user.findMany({
      where: { tenantId, isActive: true, ...(onlyUserIds ? { id: { in: onlyUserIds } } : {}) },
      select: personSelect,
    });
    return rows.map((r) => this.toRecipient(r));
  }

  /** Who gets the in-app row and who gets a push, for one event. Exposed for tests. */
  plan(input: AlertInput, people: Recipient[]) {
    const inApp: Recipient[] = [];
    const push: Recipient[] = [];
    for (const p of people) {
      const isActor = !!input.actorId && p.id === input.actorId && input.event !== 'dailySummary';
      if (isActor && !p.prefs.ownActionsInApp && !p.prefs.ownActionsPush) continue;
      if (!inScope(p, input.shopId)) continue;
      if (input.event === 'sale' && (input.amount ?? 0) < p.prefs.saleMinAmount) continue;
      if (input.event === 'bigDiscount' && (input.percent ?? 0) < p.prefs.discountPercent) continue;
      const sw = eventSwitch(input.event, p, p.prefs);
      if (sw.inApp && (!isActor || p.prefs.ownActionsInApp)) inApp.push(p);
      if (sw.push && (!isActor || p.prefs.ownActionsPush) && input.pushWorthy !== false && p.tokens.length) push.push(p);
    }
    return { inApp, push };
  }

  async run(raw: AlertInput) {
    const people = await this.people(raw.tenantId, raw.onlyUserIds);
    const { inApp, push } = this.plan(raw, people);
    if (!inApp.length && !push.length) return { inApp: 0, push: 0 };
    const actor = raw.actorId ? await this.prisma.user.findUnique({ where: { id: raw.actorId }, select: { fullName: true } }) : null;
    const name = actor?.fullName ?? '';
    const input = { ...raw, title: withActor(raw.title, name), message: withActor(raw.message, name) };
    const metadata = { ...(input.metadata ?? {}), event: input.event };

    if (inApp.length) {
      const text = notificationText(input.title, input.message, metadata);
      await this.prisma.notification.createMany({
        data: inApp.map((p) => ({
          tenantId: input.tenantId, userId: p.id, type: input.type ?? 'INFO',
          title: text.title, message: text.message, link: input.link ?? null,
          metadata: text.metadata as Prisma.InputJsonValue,
        })),
      });
    }
    if (!push.length) return { inApp: inApp.length, push: 0 };

    const now = new Date();
    const direct: Recipient[] = [];
    for (const p of push) {
      if (input.event === 'sale' && p.prefs.saleDigestMinutes > 0) await this.scheduleDigest(input.tenantId, p.id, p.prefs.saleDigestMinutes, now);
      else direct.push(p);
    }
    await this.sendTo(direct, {
      tenantId: input.tenantId, event: input.event, title: input.title, message: input.message,
      link: input.link, data: input.metadata, legacyChannel: legacyChannelFor(input.event),
    });
    return { inApp: inApp.length, push: direct.length };
  }

  /** Builds and sends the pushes for these people in their own language and sound. */
  private async sendTo(people: Recipient[], input: PushOnlyInput & { event: AlertEvent | null }) {
    if (!people.length) return [];
    const { tz } = await this.clocks.clock(input.tenantId);
    const now = new Date();
    const title = textOf(input.title);
    const body = textOf(input.message);
    const items: DeliveryItem[] = [];
    for (const p of people) {
      const quiet = inQuietHours(p.prefs, now, tz);
      for (const t of p.tokens) {
        const { channelId, sound } = pushSound(p.prefs, { quiet, tones: t.tones, legacyChannel: input.legacyChannel ?? legacyChannelFor(input.event) });
        items.push({
          event: input.event ?? 'general',
          tenantId: input.tenantId,
          userId: p.id,
          platform: t.platform,
          message: {
            to: t.token,
            title: pushText(p.language, title.template, title.params),
            body: pushText(p.language, body.template, body.params),
            data: { ...(input.data ?? {}), ...(input.event ? { event: input.event } : {}), ...(input.link ? { link: input.link } : {}) },
            channelId,
            sound,
          },
        });
      }
    }
    return this.delivery.deliver(items);
  }

  /**
   * Push for a notification row created elsewhere (billing, transfers, AI
   * summary, …). A row for one person goes to that person; a business-wide
   * row goes to everyone who may receive the event.
   */
  pushForNotification(input: PushOnlyInput): void {
    setImmediate(() => {
      this.pushOnly(input).catch((e) => this.logger.warn(`Push for notification failed: ${e?.message}`));
    });
  }

  async pushOnly(input: PushOnlyInput) {
    const people = await this.people(input.tenantId, input.userId ? [input.userId] : undefined);
    const chosen = people.filter((p) => {
      if (!p.tokens.length) return false;
      if (!input.event) return input.userId ? true : p.role === 'OWNER';
      // A row addressed to this person still reaches them when the event is
      // outside their permissions; otherwise their switch decides.
      if (input.userId && !canReceive(input.event, p)) return true;
      return eventSwitch(input.event, p, p.prefs).push;
    });
    return this.sendTo(chosen, input);
  }

  // ─── Stock ────────────────────────────────────────────────────────

  /**
   * After stock goes down: one alert per product that is now low or out,
   * at most once a day per product.
   */
  checkStock(tenantId: string, productIds: string[], shopId: string | null): void {
    if (!productIds.length) return;
    setImmediate(() => {
      this.runStockCheck(tenantId, [...new Set(productIds)], shopId).catch((e) => this.logger.warn(`Stock alert failed: ${e?.message}`));
    });
  }

  async runStockCheck(tenantId: string, productIds: string[], shopId: string | null) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: productIds }, isActive: true },
      select: { id: true, name: true, stock: true, unit: true, lowStockAlert: true },
    });
    const low = products.filter((p) => p.lowStockAlert > 0 ? p.stock <= p.lowStockAlert : p.stock <= 0);
    if (!low.length) return 0;
    const since = new Date(Date.now() - 24 * 3_600_000);
    let sent = 0;
    for (const p of low.slice(0, 10)) {
      const out = p.stock <= 0;
      const key = `${tenantId}:${p.id}:${out ? 'out' : 'low'}`;
      if ((this.stockSeen.get(key) ?? 0) > since.getTime()) continue;
      this.stockSeen.set(key, Date.now());
      if (this.stockSeen.size > 5000) this.stockSeen.clear();
      const recent = await this.prisma.notification.findFirst({
        where: { tenantId, type: 'LOW_STOCK', createdAt: { gte: since }, AND: [{ metadata: { path: ['productId'], equals: p.id } }, { metadata: { path: ['out'], equals: out } }] },
        select: { id: true },
      });
      if (recent) continue;
      await this.run({
        tenantId, event: 'lowStock', type: 'LOW_STOCK', shopId,
        title: out ? '⛔ Stock khatam' : '⚠️ Low Stock Alert',
        message: out
          ? apiMessage('{{name}} ka stock khatam ho gaya', { name: p.name })
          : apiMessage('{{name}} ka stock kam ho gaya hai ({{stock}} {{unit}} bacha)', { name: p.name, stock: p.stock, unit: p.unit }),
        link: '/low-stock',
        metadata: { productId: p.id, stock: p.stock, out },
      });
      sent++;
    }
    return sent;
  }

  // ─── Test ─────────────────────────────────────────────────────────

  /**
   * Sends a test push to every phone signed in as this person and waits a few
   * seconds for Expo's receipts, so the screen can say what really happened.
   */
  async testPush(userId: string, tenantId: string): Promise<{ status: TestOutcome; devices: number; platforms: Record<string, number>; errors: string[] }> {
    const row = await this.prisma.user.findFirst({ where: { id: userId, tenantId }, select: personSelect });
    if (!row) return { status: 'no-device', devices: 0, platforms: {}, errors: [] };
    const p = this.toRecipient(row);
    const platforms: Record<string, number> = {};
    for (const t of p.tokens) platforms[t.platform ?? 'older app'] = (platforms[t.platform ?? 'older app'] ?? 0) + 1;
    if (!p.tokens.length) return { status: 'no-device', devices: 0, platforms, errors: [] };

    const results = await this.sendTo([{ ...p, prefs: { ...p.prefs, quietHours: false } }], {
      tenantId, event: null, title: '🔔 Test Notification', message: 'Is phone par notifications chal rahi hain.',
      link: '/notifications', data: { kind: 'test' },
    });
    const receipts = results.some((r) => r.ticketId) ? await this.delivery.waitForReceipts(results.map((r) => r.ticketId!).filter(Boolean)) : {};
    const detailed = results.map((r, i) => ({ platform: p.tokens[i]?.platform ?? null, ...r, receipt: r.ticketId ? receipts[r.ticketId] : undefined }));
    const errors = [...new Set(detailed.map((d) => d.receipt?.error ?? d.error).filter((e): e is string => !!e))];
    return { status: PushDeliveryService.summarize(detailed), devices: p.tokens.length, platforms, errors };
  }

  // ─── Sale summaries ───────────────────────────────────────────────

  private async scheduleDigest(tenantId: string, userId: string, minutes: number, now: Date) {
    const { start, end } = digestWindow(now, minutes);
    const job: DigestJob = { tenantId, userId, start: start.getTime(), end: end.getTime(), minutes };
    const jobId = `sale-digest-${userId}-${job.start}`;
    const delay = Math.max(0, job.end - now.getTime()) + 5_000;
    try {
      await this.queue.add('sale-digest', job, { jobId, delay, attempts: 1, removeOnComplete: { age: 7200 }, removeOnFail: { age: 7200 } });
    } catch (err: any) {
      if (this.localDigests.has(jobId)) return;
      this.logger.warn(`Queue unavailable, sale summary kept in process: ${err?.message}`);
      this.localDigests.set(jobId, setTimeout(() => {
        this.localDigests.delete(jobId);
        void this.sendDigest(job).catch((e) => this.logger.warn(`Sale summary failed: ${e?.message}`));
      }, delay));
    }
  }

  /** One push with the count and total of sales in the window. Called by the queue worker. */
  async sendDigest(job: DigestJob) {
    const row = await this.prisma.user.findFirst({ where: { id: job.userId, tenantId: job.tenantId, isActive: true }, select: personSelect });
    if (!row) return { sent: 0 };
    const p = this.toRecipient(row);
    if (!p.tokens.length || !eventSwitch('sale', p, p.prefs).push) return { sent: 0 };
    const scoped = p.role !== 'OWNER' && p.role !== 'SUPER_ADMIN' && p.shopId;
    const agg = await this.prisma.sale.aggregate({
      where: {
        tenantId: job.tenantId,
        createdAt: { gte: new Date(job.start), lt: new Date(job.end) },
        status: { not: 'VOIDED' },
        total: { gte: p.prefs.saleMinAmount },
        OR: [{ createdById: null }, { createdById: { not: p.id } }],
        ...(scoped ? { shopId: p.shopId } : {}),
      },
      _count: { _all: true },
      _sum: { total: true },
    });
    const count = agg._count._all;
    if (!count) return { sent: 0 };
    const total = Math.round(agg._sum.total ?? 0).toLocaleString('en-PK');
    await this.sendTo([p], {
      tenantId: job.tenantId, event: 'sale', link: '/sales',
      title: { message: '', messageKey: '💰 {{count}} Sales', params: { count } },
      message: { message: '', messageKey: 'Pichle {{minutes}} minute me Rs {{total}}', params: { minutes: job.minutes, total } },
      data: { kind: 'sale-digest' },
    });
    return { sent: count };
  }
}
