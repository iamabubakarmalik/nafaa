/**
 * Push broadcasts from the admin panel to staff mobile app users.
 *
 * Sending never happens inside the request: a broadcast row is saved, a job
 * is queued, and the worker sends in batches of 100 with a short pause
 * between batches, updating the sent and failed counts as it goes. Dead
 * tokens reported by the push service are removed.
 *
 * Outside production the server does not deliver (see PushService
 * .expoDeliveryEnabled); broadcasts are then recorded as dry runs.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../core/queue/queue.constants';
import { PushService, type ExpoPushMessage } from '../push/push.service';
import {
  pickText, sanitizeTarget, sanitizeText, versionInRange,
  type LocalizedText, type MobileTarget,
} from './mobile-targeting';

const BATCH = 100;
const PAUSE_MS = 250;

export interface Recipient {
  token: string;
  language: string | null;
  platform: string | null;
  olderApp: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class MobilePushService {
  private readonly logger = new Logger(MobilePushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    @InjectQueue(QUEUE_NAMES.MOBILE_PUSH) private readonly queue: Queue,
  ) {}

  // ─── Audience ─────────────────────────────────────────────────────

  /** Business ids the audience covers, or null for every business. */
  private async tenantScope(target: MobileTarget): Promise<string[] | null> {
    switch (target.audience) {
      case 'tenant':
        return target.tenantIds;
      case 'industry': {
        if (!target.industries.length) return [];
        const rows = await this.prisma.tenant.findMany({
          where: { OR: target.industries.map((i) => ({ businessType: { equals: i, mode: 'insensitive' as const } })) },
          select: { id: true },
        });
        return rows.map((r) => r.id);
      }
      case 'plan': {
        if (!target.planSlugs.length) return [];
        const subs = await this.prisma.subscription.findMany({
          where: { status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] } },
          orderBy: { createdAt: 'desc' },
          distinct: ['tenantId'],
          select: { tenantId: true, plan: { select: { slug: true } } },
        });
        return subs.filter((s) => target.planSlugs.includes(s.plan.slug)).map((s) => s.tenantId);
      }
      default:
        return null;
    }
  }

  async recipients(target: MobileTarget, includeOlderApp: boolean): Promise<Recipient[]> {
    const scope = await this.tenantScope(target);
    if (scope && !scope.length) return [];
    const tenantWhere = scope ? { tenantId: { in: scope } } : {};

    const devices = await this.prisma.mobileDevice.findMany({
      where: {
        ...tenantWhere,
        pushToken: { not: null },
        user: { isActive: true },
        ...(target.platforms.length ? { platform: { in: target.platforms } } : {}),
      },
      select: { pushToken: true, language: true, platform: true, appVersion: true },
    });

    const seen = new Set<string>();
    const out: Recipient[] = [];
    for (const d of devices) {
      if (!d.pushToken || seen.has(d.pushToken)) continue;
      if (!versionInRange(d.appVersion, target.minVersion, target.maxVersion)) continue;
      seen.add(d.pushToken);
      out.push({ token: d.pushToken, language: d.language, platform: d.platform, olderApp: false });
    }

    // People on the older app have a saved token but no device record, so
    // platform and version filters cannot apply to them.
    const canReachOlder = includeOlderApp && !target.platforms.length && !target.minVersion && !target.maxVersion;
    if (canReachOlder) {
      const users = await this.prisma.user.findMany({
        where: { ...tenantWhere, isActive: true, pushTokens: { isEmpty: false } },
        select: { pushTokens: true, language: true },
      });
      for (const u of users) {
        for (const token of u.pushTokens) {
          if (seen.has(token)) continue;
          seen.add(token);
          out.push({ token, language: u.language, platform: null, olderApp: true });
        }
      }
    }
    return out;
  }

  async audience(input: unknown) {
    const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const target = sanitizeTarget(src);
    const list = await this.recipients(target, src.includeOlderApp !== false);
    const count = (key: (r: Recipient) => string) =>
      list.reduce<Record<string, number>>((acc, r) => {
        const k = key(r);
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
    return {
      total: list.length,
      devices: list.filter((r) => !r.olderApp).length,
      olderApp: list.filter((r) => r.olderApp).length,
      byPlatform: count((r) => r.platform ?? 'older app'),
      byLanguage: count((r) => r.language ?? 'en'),
      delivery: this.push.expoDeliveryEnabled() ? 'live' : 'dry-run',
    };
  }

  // ─── Broadcasts ───────────────────────────────────────────────────

  async create(adminId: string, input: unknown) {
    const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const title = sanitizeText(src.title, 65);
    const body = sanitizeText(src.body, 240);
    if (!title || !body) throw new BadRequestException('English title and message are required');
    const deepLink = typeof src.deepLink === 'string' && src.deepLink.trim() ? src.deepLink.trim().slice(0, 300) : null;

    const busy = await this.prisma.mobilePushBroadcast.count({
      where: { status: { in: ['QUEUED', 'SENDING'] }, createdAt: { gt: new Date(Date.now() - 30 * 60_000) } },
    });
    if (busy) throw new BadRequestException('Another push is still sending. Try again when it finishes.');

    const target = sanitizeTarget(src);
    if (target.audience !== 'all' && !target.planSlugs.length && !target.industries.length && !target.tenantIds.length) {
      throw new BadRequestException('Pick at least one plan, industry or business');
    }
    const row = await this.prisma.mobilePushBroadcast.create({
      data: {
        ...target,
        title: title as unknown as Prisma.InputJsonValue,
        body: body as unknown as Prisma.InputJsonValue,
        deepLink,
        includeOlderApp: src.includeOlderApp !== false,
        dryRun: !this.push.expoDeliveryEnabled(),
        createdById: adminId,
      },
    });
    await this.enqueue(row.id);
    return row;
  }

  private async enqueue(id: string) {
    try {
      await this.queue.add('broadcast', { broadcastId: id }, { jobId: `mobile-push-${id}`, attempts: 1 });
    } catch (err: any) {
      // Queue unavailable: send from this process in the background instead.
      this.logger.warn(`Queue unavailable, sending broadcast ${id} in process: ${err?.message}`);
      setImmediate(() => void this.process(id).catch((e) => this.logger.error(`Broadcast ${id} failed: ${e?.message}`)));
    }
  }

  /** Runs one broadcast. Called by the queue worker. */
  async process(id: string) {
    const claimed = await this.prisma.mobilePushBroadcast.updateMany({
      where: { id, status: 'QUEUED' },
      data: { status: 'SENDING', startedAt: new Date() },
    });
    if (!claimed.count) return { skipped: true };
    const b = await this.prisma.mobilePushBroadcast.findUniqueOrThrow({ where: { id } });

    try {
      const list = await this.recipients(sanitizeTarget(b), b.includeOlderApp);
      await this.prisma.mobilePushBroadcast.update({ where: { id }, data: { audienceCount: list.length } });

      if (b.dryRun || !this.push.expoDeliveryEnabled()) {
        await this.prisma.mobilePushBroadcast.update({
          where: { id }, data: { status: 'SENT', dryRun: true, sentCount: list.length, finishedAt: new Date() },
        });
        return { sent: list.length, dryRun: true };
      }

      const title = b.title as unknown as LocalizedText;
      const body = b.body as unknown as LocalizedText;
      let sent = 0;
      let failed = 0;
      const dead: string[] = [];
      for (let i = 0; i < list.length; i += BATCH) {
        const chunk = list.slice(i, i + BATCH);
        const messages: ExpoPushMessage[] = chunk.map((r) => ({
          to: r.token,
          title: pickText(title, r.language),
          body: pickText(body, r.language),
          data: { kind: 'broadcast', broadcastId: id, ...(b.deepLink ? { url: b.deepLink } : {}) },
        }));
        const results = await this.push.sendExpo(messages);
        results.forEach((res, j) => {
          if (res.ok) sent++;
          else {
            failed++;
            if (res.error === 'DeviceNotRegistered') dead.push(chunk[j].token);
          }
        });
        await this.prisma.mobilePushBroadcast.update({ where: { id }, data: { sentCount: sent, failedCount: failed } });
        if (i + BATCH < list.length) await sleep(PAUSE_MS);
      }

      if (dead.length) await this.removeDeadTokens(dead);
      await this.prisma.mobilePushBroadcast.update({
        where: { id },
        data: { status: sent === 0 && failed > 0 ? 'FAILED' : 'SENT', finishedAt: new Date() },
      });
      return { sent, failed };
    } catch (err: any) {
      await this.prisma.mobilePushBroadcast.update({
        where: { id }, data: { status: 'FAILED', error: String(err?.message ?? err).slice(0, 500), finishedAt: new Date() },
      });
      throw err;
    }
  }

  private async removeDeadTokens(tokens: string[]) {
    await this.prisma.mobileDevice.updateMany({ where: { pushToken: { in: tokens } }, data: { pushToken: null } });
    const users = await this.prisma.user.findMany({ where: { pushTokens: { hasSome: tokens } }, select: { id: true, pushTokens: true } });
    const dead = new Set(tokens);
    for (const u of users) {
      await this.prisma.user.update({ where: { id: u.id }, data: { pushTokens: u.pushTokens.filter((t) => !dead.has(t)) } });
    }
  }

  async history(page = 1, limit = 20) {
    const [total, items] = await Promise.all([
      this.prisma.mobilePushBroadcast.count(),
      this.prisma.mobilePushBroadcast.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    ]);
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async get(id: string) {
    const row = await this.prisma.mobilePushBroadcast.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Push not found');
    return row;
  }
}
