/**
 * Staff app pushes with delivery tracking.
 *
 * Every push sent through Expo is logged as a PushTicket. Expo's ticket only
 * says the message was accepted; whether Google (FCM) or Apple accepted it
 * comes later as a receipt. A cron reads the receipts, marks each ticket
 * DELIVERED or ERROR, and removes tokens of uninstalled apps. The admin
 * delivery view and the "Test" button read the same log.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '../../core/system-control/cron.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService, type ExpoPushMessage, type ExpoReceipt } from './push.service';

export interface DeliveryItem {
  message: ExpoPushMessage;
  event: string;
  tenantId?: string | null;
  userId?: string | null;
  platform?: string | null;
}

export interface DeliveryResult {
  ok: boolean;
  ticketId?: string;
  error?: string;
  /** Delivery is off on this server (not production): nothing was sent. */
  dryRun?: boolean;
}

/** Plain outcome of a test push, shown to the person who pressed "Test". */
export type TestOutcome = 'delivered' | 'sent' | 'no-device' | 'android-setup' | 'ios-setup' | 'device-gone' | 'failed' | 'dry-run';

const BATCH = 100;
const RECEIPT_MIN_AGE_MS = 60_000;
const RECEIPT_MAX_AGE_MS = 23 * 3_600_000;
const KEEP_DAYS = 30;

/** Errors that mean the server's push credentials are missing or wrong, not the phone. */
export const CREDENTIAL_ERRORS = new Set(['InvalidCredentials', 'MismatchSenderId']);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class PushDeliveryService {
  private readonly logger = new Logger(PushDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  enabled() {
    return this.push.expoDeliveryEnabled();
  }

  /** Sends and logs. Never throws; one result per item, in order. */
  async deliver(items: DeliveryItem[]): Promise<DeliveryResult[]> {
    if (!items.length) return [];
    if (!this.enabled()) return items.map(() => ({ ok: true, dryRun: true }));
    const out: DeliveryResult[] = [];
    const dead: string[] = [];
    for (let i = 0; i < items.length; i += BATCH) {
      const chunk = items.slice(i, i + BATCH);
      const results = await this.push.sendExpo(chunk.map((c) => c.message));
      out.push(...results);
      results.forEach((r, j) => { if (r.error === 'DeviceNotRegistered') dead.push(chunk[j].message.to); });
      await this.prisma.pushTicket.createMany({
        data: chunk.map((c, j) => ({
          ticketId: results[j].ticketId ?? null,
          tenantId: c.tenantId ?? null,
          userId: c.userId ?? null,
          token: c.message.to,
          platform: c.platform ?? null,
          event: c.event.slice(0, 40),
          status: results[j].ok ? 'SENT' : 'ERROR',
          error: results[j].ok ? null : (results[j].error ?? 'Unknown').slice(0, 80),
          ...(results[j].ok ? {} : { checkedAt: new Date() }),
        })),
      }).catch((e) => this.logger.warn(`Push log failed: ${e?.message}`));
      for (const r of results) if (!r.ok) this.logger.warn(`Push not accepted: ${r.error}`);
    }
    if (dead.length) await this.removeDeadTokens(dead);
    return out;
  }

  /** Applies receipts to their tickets and returns them by ticket id. */
  private async applyReceipts(ticketIds: string[]): Promise<Record<string, ExpoReceipt>> {
    const receipts = await this.push.expoReceipts(ticketIds);
    const dead: string[] = [];
    const now = new Date();
    for (const [ticketId, r] of Object.entries(receipts)) {
      await this.prisma.pushTicket.updateMany({
        where: { ticketId },
        data: { status: r.status === 'ok' ? 'DELIVERED' : 'ERROR', error: r.status === 'ok' ? null : (r.error ?? 'Unknown').slice(0, 80), checkedAt: now },
      });
      if (r.error === 'DeviceNotRegistered') {
        const t = await this.prisma.pushTicket.findFirst({ where: { ticketId }, select: { token: true } });
        if (t) dead.push(t.token);
      }
      if (r.error && CREDENTIAL_ERRORS.has(r.error)) this.logger.error(`Push credentials problem reported by Expo: ${r.error}`);
    }
    if (dead.length) await this.removeDeadTokens(dead);
    return receipts;
  }

  /** Reads receipts for recent tickets; old rows are pruned. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkReceipts() {
    if (!this.enabled()) return;
    try {
      const now = Date.now();
      const pending = await this.prisma.pushTicket.findMany({
        where: { status: 'SENT', ticketId: { not: null }, createdAt: { lt: new Date(now - RECEIPT_MIN_AGE_MS), gt: new Date(now - RECEIPT_MAX_AGE_MS) } },
        select: { ticketId: true },
        orderBy: { createdAt: 'asc' },
        take: 1000,
      });
      if (pending.length) await this.applyReceipts(pending.map((p) => p.ticketId!));
      await this.prisma.pushTicket.updateMany({
        where: { status: 'SENT', createdAt: { lt: new Date(now - RECEIPT_MAX_AGE_MS) } },
        data: { status: 'UNKNOWN', checkedAt: new Date() },
      });
      await this.prisma.pushTicket.deleteMany({ where: { createdAt: { lt: new Date(now - KEEP_DAYS * 86_400_000) } } });
    } catch (err: any) {
      this.logger.warn(`Push receipt check failed: ${err?.message}`);
    }
  }

  /**
   * Waits a few seconds for receipts of a fresh send (the Test button).
   * Returns what is known by then; the cron finishes the rest.
   */
  async waitForReceipts(ticketIds: string[], waits = [1500, 2500, 3500]): Promise<Record<string, ExpoReceipt>> {
    const got: Record<string, ExpoReceipt> = {};
    let left = ticketIds.filter(Boolean);
    for (const ms of waits) {
      if (!left.length) break;
      await sleep(ms);
      Object.assign(got, await this.applyReceipts(left));
      left = left.filter((id) => !got[id]);
    }
    return got;
  }

  /** One plain outcome from several devices: the best one wins, then the most useful error. */
  static summarize(results: Array<{ platform: string | null; ok: boolean; error?: string; receipt?: ExpoReceipt; dryRun?: boolean }>): TestOutcome {
    if (!results.length) return 'no-device';
    if (results.every((r) => r.dryRun)) return 'dry-run';
    if (results.some((r) => r.receipt?.status === 'ok')) return 'delivered';
    const errors = results.map((r) => ({ platform: r.platform, error: r.receipt?.error ?? (r.ok ? undefined : r.error) }));
    const cred = errors.find((e) => e.error && CREDENTIAL_ERRORS.has(e.error));
    if (results.some((r) => r.ok && !r.receipt)) return cred ? (cred.platform === 'ios' ? 'ios-setup' : 'android-setup') : 'sent';
    if (cred) return cred.platform === 'ios' ? 'ios-setup' : 'android-setup';
    if (errors.every((e) => e.error === 'DeviceNotRegistered')) return 'device-gone';
    return 'failed';
  }

  async removeDeadTokens(tokens: string[]) {
    try {
      await this.prisma.mobileDevice.updateMany({ where: { pushToken: { in: tokens } }, data: { pushToken: null } });
      const users = await this.prisma.user.findMany({ where: { pushTokens: { hasSome: tokens } }, select: { id: true, pushTokens: true } });
      const dead = new Set(tokens);
      for (const u of users) {
        await this.prisma.user.update({ where: { id: u.id }, data: { pushTokens: u.pushTokens.filter((t) => !dead.has(t)) } });
      }
    } catch (err: any) {
      this.logger.warn(`Removing dead push tokens failed: ${err?.message}`);
    }
  }

  /** Admin delivery health: counts by status, error and platform for the last N days. */
  async health(days = 7) {
    const since = new Date(Date.now() - Math.min(Math.max(days, 1), 30) * 86_400_000);
    const where = { createdAt: { gte: since } };
    const [byStatus, byError, byPlatform, byEvent, lastError] = await Promise.all([
      this.prisma.pushTicket.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.pushTicket.groupBy({ by: ['error'], where: { ...where, status: 'ERROR' }, _count: { _all: true } }),
      this.prisma.pushTicket.groupBy({ by: ['platform', 'status'], where, _count: { _all: true } }),
      this.prisma.pushTicket.groupBy({ by: ['event'], where, _count: { _all: true } }),
      this.prisma.pushTicket.findFirst({ where: { ...where, status: 'ERROR' }, orderBy: { createdAt: 'desc' }, select: { error: true, platform: true, createdAt: true } }),
    ]);
    const status = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])) as Record<string, number>;
    const total = byStatus.reduce((n, r) => n + r._count._all, 0);
    const errors = byError.map((r) => ({ error: r.error ?? 'Unknown', count: r._count._all })).sort((a, b) => b.count - a.count);
    const platforms: Record<string, Record<string, number>> = {};
    for (const r of byPlatform) {
      const p = r.platform ?? 'older app';
      platforms[p] ??= {};
      platforms[p][r.status] = r._count._all;
    }
    return {
      days: Math.round((Date.now() - since.getTime()) / 86_400_000),
      delivery: this.enabled() ? 'live' : 'dry-run',
      total,
      sent: status.SENT ?? 0,
      delivered: status.DELIVERED ?? 0,
      failed: status.ERROR ?? 0,
      unknown: status.UNKNOWN ?? 0,
      errors,
      platforms,
      events: byEvent.map((r) => ({ event: r.event, count: r._count._all })).sort((a, b) => b.count - a.count),
      lastError,
      credentialsProblem: errors.some((e) => CREDENTIAL_ERRORS.has(e.error)),
    };
  }
}
