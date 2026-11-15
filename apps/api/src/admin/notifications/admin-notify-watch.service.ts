/**
 * Scheduled admin notifications:
 * - Nafaa Social watcher (every minute): a post failed on a platform, a post
 *   waits to be posted by hand, an account needs reconnecting. It reads the
 *   posts' publish state, so the publisher itself needs no changes.
 * - Daily checks (every 10 minutes, each sent once per Pakistan day through a
 *   stored marker, so restarts never send twice):
 *   10:00 trials ending in 2 days and social tokens expiring within 7 days;
 *   21:00 the Nafaa Social summary of the day.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron } from '../../core/system-control/cron.decorator';
import { addDaysTz, endOfDayTz, startOfDayTz } from '../../common/helpers/business-time.helper';
import { PLATFORM_LABEL } from '../../admin-marketing/brand-social/brand-social.logic';
import { AdminNotificationsService } from './admin-notifications.service';
import { ADMIN_NOTIFY_TZ, pktDayKey, pktHour } from './admin-notify.logic';

const MIN = 60_000;
const DAY = 86_400_000;

interface PlatformState { status?: string; error?: string | null; at?: string; willRetry?: boolean }

const label = (p: string) => (PLATFORM_LABEL as Record<string, string>)[p] ?? p;
const postName = (p: { title: string; caption: string }) => {
  const t = (p.title || p.caption || 'Untitled post').replace(/\s+/g, ' ').trim();
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
};
const asStates = (v: unknown): Record<string, PlatformState> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, PlatformState>) : {};
const list = (names: string[], max = 5) => (names.length > max ? `${names.slice(0, max).join(', ')} and ${names.length - max} more` : names.join(', '));

@Injectable()
export class AdminNotifyWatchService {
  private readonly logger = new Logger(AdminNotifyWatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: AdminNotificationsService,
  ) {}

  /* ───────────────────────── Nafaa Social, every minute ───────────────────────── */

  @Cron('30 * * * * *')
  async watchSocial() {
    const now = new Date();
    const marker = await this.notifications.getMarker('social-watch');
    await this.notifications.setMarker('social-watch', now.toISOString());
    // First run: start from now instead of replaying history.
    if (!marker) return;
    // Small overlap; the dedupe keys make a second look harmless.
    const since = new Date(Math.max(Date.parse(marker) - 2 * MIN, now.getTime() - DAY));

    const posts = await this.prisma.brandSocialPost.findMany({
      where: { updatedAt: { gt: since } },
      select: { id: true, title: true, caption: true, publishState: true },
      orderBy: { updatedAt: 'asc' },
      take: 200,
    });
    for (const post of posts) {
      const handoff: string[] = [];
      for (const [platform, s] of Object.entries(asStates(post.publishState))) {
        const at = s.at ? Date.parse(s.at) : NaN;
        if (!Number.isFinite(at) || at <= since.getTime()) continue;
        if (s.status === 'FAILED' && !s.willRetry) {
          await this.notifications.notify({
            category: 'social', event: 'social.post_failed', severity: 'warning',
            title: `Post failed on ${label(platform)}`,
            message: `"${postName(post)}": ${s.error?.trim() || 'No reason was given.'}`,
            link: `/social/posts/${post.id}`, entityType: 'brand_social_post', entityId: post.id,
            metadata: { platform, error: s.error ?? null },
            dedupeKey: `social-failed:${post.id}:${platform}:${s.at}`, once: true,
          });
        } else if (s.status === 'HANDOFF') {
          handoff.push(platform);
        }
      }
      if (handoff.length) {
        handoff.sort();
        await this.notifications.notify({
          category: 'social', event: 'social.post_handoff', severity: 'info',
          title: `Post by hand on ${list(handoff.map(label))}`,
          message: `"${postName(post)}" is ready and waiting for someone to post it.`,
          link: '/social/handoff', entityType: 'brand_social_post', entityId: post.id,
          metadata: { platforms: handoff },
          dedupeKey: `social-handoff:${post.id}:${handoff.join(',')}`, once: true,
        });
      }
    }

    const broken = await this.prisma.brandSocialAccount.findMany({
      where: { status: 'NEEDS_RECONNECT', updatedAt: { gt: since } },
      select: { id: true, platform: true, name: true, lastError: true },
    });
    for (const a of broken) {
      await this.notifications.notify({
        category: 'social', event: 'social.account_reconnect', severity: 'critical',
        title: `Reconnect ${label(a.platform)}: ${a.name}`,
        message: `Nafaa cannot post to this account until it is connected again.${a.lastError ? ` ${a.lastError}` : ''}`,
        link: '/social/accounts', entityType: 'brand_social_account', entityId: a.id,
        dedupeKey: `social-reconnect:${a.id}`, windowMinutes: 24 * 60, quietRepeat: true,
      });
    }
  }

  /* ───────────────────────── daily checks ───────────────────────── */

  @Cron('0 */10 * * * *')
  async dailyChecks() {
    const now = new Date();
    const day = pktDayKey(now);
    const hour = pktHour(now);
    const run = async (name: string, fn: () => Promise<void>) => {
      try {
        if (await this.notifications.claimDaily(name, day)) await fn();
      } catch (e) {
        this.logger.warn(`Daily admin check "${name}" failed: ${e instanceof Error ? e.message : e}`);
      }
    };
    if (hour >= 10) {
      await run('trials-ending', () => this.trialsEnding(now, day));
      await run('social-tokens', () => this.socialTokens(now));
    }
    if (hour >= 21) await run('social-summary', () => this.socialSummary(now, day));
  }

  /** Trials whose last day is two days from today (Pakistan time). */
  async trialsEnding(now: Date, day: string) {
    const target = addDaysTz(now, 2, ADMIN_NOTIFY_TZ);
    const subs = await this.prisma.subscription.findMany({
      where: { status: 'TRIAL', trialEndsAt: { gte: startOfDayTz(target, ADMIN_NOTIFY_TZ), lte: endOfDayTz(target, ADMIN_NOTIFY_TZ) } },
      select: { tenantId: true, tenant: { select: { name: true } } },
      take: 200,
    });
    if (!subs.length) return;
    const names = [...new Set(subs.map((s) => s.tenant?.name ?? 'Shop'))];
    const one = subs.length === 1;
    await this.notifications.notify({
      category: 'billing', event: 'billing.trial_ending', severity: 'info', type: 'SUBSCRIPTION_EXPIRING',
      title: one ? `Trial ends in 2 days: ${names[0]}` : `${subs.length} trials end in 2 days`,
      message: one ? 'A good time to call and help them choose a plan.' : `${list(names, 10)}. A good time to call and help them choose a plan.`,
      link: one ? `/tenants/${subs[0].tenantId}` : '/subscriptions',
      tenantId: one ? subs[0].tenantId : null,
      metadata: { tenantIds: subs.map((s) => s.tenantId) },
      dedupeKey: `trial-ending:${day}`, once: true,
    });
  }

  /** Social accounts whose token runs out within 7 days and cannot renew itself. */
  async socialTokens(now: Date) {
    const rows = await this.prisma.brandSocialAccount.findMany({
      where: { status: 'CONNECTED', accessTokenEnc: { not: null }, tokenExpiresAt: { gt: now, lt: new Date(now.getTime() + 7 * DAY) } },
      select: { id: true, platform: true, name: true, tokenExpiresAt: true, meta: true },
    });
    for (const a of rows) {
      const meta = a.meta && typeof a.meta === 'object' && !Array.isArray(a.meta) ? (a.meta as Record<string, unknown>) : {};
      if (meta.refreshTokenEnc) continue; // renewed automatically before use
      const days = Math.max(1, Math.ceil((a.tokenExpiresAt!.getTime() - now.getTime()) / DAY));
      await this.notifications.notify({
        category: 'social', event: 'social.token_expiring', severity: 'warning',
        title: `${label(a.platform)} connection ends in ${days} day${days === 1 ? '' : 's'}`,
        message: `Reconnect "${a.name}" before then, or scheduled posts to it will fail.`,
        link: '/social/accounts', entityType: 'brand_social_account', entityId: a.id,
        dedupeKey: `social-token:${a.id}:${a.tokenExpiresAt!.toISOString().slice(0, 10)}`, once: true,
      });
    }
  }

  /** 21:00 summary: what went out today, what failed and what still waits for a person. */
  async socialSummary(now: Date, day: string) {
    const start = startOfDayTz(now, ADMIN_NOTIFY_TZ).getTime();
    const posts = await this.prisma.brandSocialPost.findMany({
      where: { updatedAt: { gte: new Date(start) } },
      select: { publishState: true },
      take: 2000,
    });
    const published = new Map<string, number>();
    let failed = 0;
    let waiting = 0;
    let total = 0;
    for (const p of posts) {
      for (const [platform, s] of Object.entries(asStates(p.publishState))) {
        const at = s.at ? Date.parse(s.at) : NaN;
        if (s.status === 'HANDOFF') waiting++;
        if (!Number.isFinite(at) || at < start) continue;
        if (s.status === 'PUBLISHED') { published.set(platform, (published.get(platform) ?? 0) + 1); total++; }
        else if (s.status === 'FAILED' && !s.willRetry) failed++;
      }
    }
    if (!total && !failed && !waiting) return;
    const parts = [...published.entries()].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${label(p)} ${n}`);
    const extra = [failed ? `${failed} failed` : '', waiting ? `${waiting} waiting to be posted by hand` : ''].filter(Boolean).join(', ');
    await this.notifications.notify({
      category: 'social', event: 'social.daily_summary', severity: failed ? 'warning' : 'info',
      title: total ? `Nafaa Social today: ${total} post${total === 1 ? '' : 's'} went out` : 'Nafaa Social today: nothing went out',
      message: [parts.length ? parts.join(' · ') : '', extra ? `${extra[0].toUpperCase()}${extra.slice(1)}.` : ''].filter(Boolean).join('. '),
      link: '/social/calendar',
      metadata: { day, published: Object.fromEntries(published), failed, waiting },
      dedupeKey: `social-summary:${day}`, once: true,
    });
  }
}
