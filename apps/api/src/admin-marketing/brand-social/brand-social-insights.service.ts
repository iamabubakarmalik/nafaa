/**
 * Nafaa Social results: an hourly job reads post insights (every hour for
 * posts younger than 7 days, then daily up to 60 days) and account numbers
 * (followers today; reach, views, profile views and website clicks for the
 * last full day). Each metric that Graph refuses is skipped; a run never fails
 * as a whole. Also the analytics page, the overview tiles and the read-only
 * ads overview.
 *
 * Link clicks and signups come from the marketing site's own tracking
 * (marketing_page_views / marketing_leads) by utm_content = post code.
 */

import { Injectable, Logger } from '@nestjs/common';
import { BrandSocialAccount, BrandSocialPost, Prisma } from '@prisma/client';
import { Cron } from '../../core/system-control/cron.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt } from '../../core/lib/crypto';
import { addDaysTz, dateKeyTz, hourInTz, startOfDayTz, weekdayInTz } from '../../common/helpers/business-time.helper';
import { BrandSocialGraphService, toSocialError } from './brand-social-graph.service';
import { BrandSocialAccountsService } from './brand-social-accounts.service';
import { BrandSocialPostsService } from './brand-social-posts.service';
import { BrandSocialSettingsService } from './brand-social-settings.service';
import { BrandSocialPlatformsService } from './brand-social-platforms.service';
import { jobsDisabled } from './brand-social-publisher.service';
import { engagementOf, parsePktDateTime, rate } from './brand-social.logic';
import type { AdsOverviewResponse, AnalyticsResponse, BrandPlatform, OverviewResponse, PostMediaItem, PublishStateMap } from './brand-social.types';

const DAY = 86_400_000;
const dayDate = (key: string) => new Date(`${key}T00:00:00.000Z`);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

interface MetricRow { reach: number; impressions: number; likes: number; comments: number; shares: number; saves: number; plays: number; clicks: number; raw: Record<string, unknown> }

@Injectable()
export class BrandSocialInsightsService {
  private readonly logger = new Logger('BrandSocialInsights');
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: BrandSocialGraphService,
    private readonly posts: BrandSocialPostsService,
    private readonly accounts: BrandSocialAccountsService,
    private readonly settings: BrandSocialSettingsService,
    private readonly platforms: BrandSocialPlatformsService,
  ) {}

  /* ───────────────────────── job ───────────────────────── */

  @Cron('0 17 * * * *')
  async hourly() {
    if (this.running || jobsDisabled()) return;
    if (await this.settings.paused()) return;
    this.running = true;
    try {
      if (this.graph.configured()) {
        const accounts = await this.prisma.brandSocialAccount.findMany({ where: { status: 'CONNECTED', platform: { in: ['FACEBOOK', 'INSTAGRAM'] }, accessTokenEnc: { not: null } } });
        if (accounts.length) {
          await this.postInsights(accounts);
          for (const a of accounts) await this.accountDay(a).catch((e) => this.logger.warn(`Account day ${a.id}: ${(e as Error).message}`));
        }
      }
      // Threads, YouTube, X, Pinterest: post numbers and followers (every 3 hours).
      await this.platforms.insightsRun().catch((e) => this.logger.warn(`Platform insights: ${(e as Error).message}`));
    } finally {
      this.running = false;
    }
  }

  private async postInsights(accounts: BrandSocialAccount[]) {
    const now = Date.now();
    const rows = await this.prisma.brandSocialPost.findMany({
      where: {
        publishedAt: { gte: new Date(now - 60 * DAY) },
        status: { in: ['PUBLISHED', 'PARTIAL', 'PUBLISHING'] },
        OR: [
          { insightsAt: null },
          { publishedAt: { gte: new Date(now - 7 * DAY) }, insightsAt: { lt: new Date(now - 55 * 60_000) } },
          { insightsAt: { lt: new Date(now - 23 * 3600_000) } },
        ],
      },
      orderBy: { insightsAt: { sort: 'asc', nulls: 'first' } },
      take: 80,
    });
    const today = dayDate(dateKeyTz(new Date()));
    for (const post of rows) {
      const state = (post.publishState ?? {}) as PublishStateMap;
      for (const platform of ['FACEBOOK', 'INSTAGRAM'] as const) {
        const s = state[platform];
        if (s?.status !== 'PUBLISHED' || s.manual || !s.postId) continue;
        const account = accounts.find((a) => a.platform === platform);
        if (!account) continue;
        try {
          const m = platform === 'FACEBOOK' ? await this.fbPost(account, s.postId, post) : await this.igPost(account, s.postId, post);
          const data = { ...m, engagement: engagementOf(m), raw: m.raw as Prisma.InputJsonValue, fetchedAt: new Date() };
          await this.prisma.brandSocialPostMetric.upsert({
            where: { postId_platform_day: { postId: post.id, platform, day: today } },
            create: { postId: post.id, platform, day: today, ...data },
            update: data,
          });
        } catch (e) {
          this.logger.warn(`Insights ${post.id}/${platform}: ${toSocialError(e).text}`);
        }
      }
      await this.prisma.brandSocialPost.update({ where: { id: post.id }, data: { insightsAt: new Date() } }).catch(() => null);
    }
  }

  /** Insight values by name; tries all at once, then one by one, skipping refused metrics. */
  private async insights(account: BrandSocialAccount, objectId: string, metrics: string[], params: Record<string, unknown> = {}): Promise<Record<string, number>> {
    const read = (res: { data?: any[] }) => {
      const out: Record<string, number> = {};
      for (const d of res?.data ?? []) {
        const v = d?.total_value?.value ?? (Array.isArray(d?.values) ? d.values.reduce((s: number, x: any) => s + (typeof x?.value === 'number' ? x.value : 0), 0) : 0);
        if (d?.name) out[d.name] = num(v);
      }
      return out;
    };
    try {
      return read(await this.graph.call(account, { path: `${objectId}/insights`, params: { metric: metrics.join(','), ...params } }));
    } catch {
      const out: Record<string, number> = {};
      for (const m of metrics) {
        try { Object.assign(out, read(await this.graph.call(account, { path: `${objectId}/insights`, params: { metric: m, ...params }, attempts: 1 }))); } catch { /* metric not available */ }
      }
      return out;
    }
  }

  private async fields<T>(account: BrandSocialAccount, id: string, sets: string[]): Promise<T | null> {
    for (const f of sets) {
      try { return await this.graph.call<T>(account, { path: id, params: { fields: f } }); } catch { /* try a smaller set */ }
    }
    return null;
  }

  private async fbPost(account: BrandSocialAccount, postId: string, post: BrandSocialPost): Promise<MetricRow> {
    const f = await this.fields<any>(account, postId, [
      'reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares',
      'reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)',
    ]);
    const video = ((post.media ?? []) as unknown as PostMediaItem[]).some((m) => m.kind === 'video');
    const ins = await this.insights(account, postId, ['post_impressions', 'post_impressions_unique', 'post_media_view', 'post_total_media_view_unique', 'post_clicks', ...(video ? ['post_video_views'] : [])]);
    return {
      reach: ins.post_total_media_view_unique || ins.post_impressions_unique || 0,
      impressions: ins.post_media_view || ins.post_impressions || 0,
      likes: num(f?.reactions?.summary?.total_count),
      comments: num(f?.comments?.summary?.total_count),
      shares: num(f?.shares?.count),
      saves: 0,
      plays: ins.post_video_views || 0,
      clicks: ins.post_clicks || 0,
      raw: { fields: f ?? null, insights: ins },
    };
  }

  private async igPost(account: BrandSocialAccount, mediaId: string, post: BrandSocialPost): Promise<MetricRow> {
    const f = await this.fields<any>(account, mediaId, ['like_count,comments_count,media_product_type']);
    const ins = await this.insights(account, mediaId, ['reach', 'views', 'saved', 'shares', 'total_interactions', 'likes', 'comments']);
    const reel = f?.media_product_type === 'REELS' || post.kind === 'REEL';
    return {
      reach: ins.reach || 0,
      impressions: ins.views || 0,
      likes: ins.likes || num(f?.like_count),
      comments: ins.comments || num(f?.comments_count),
      shares: ins.shares || 0,
      saves: ins.saved || 0,
      plays: reel ? ins.views || 0 : 0,
      clicks: 0,
      raw: { fields: f ?? null, insights: ins },
    };
  }

  /** Followers for today; reach, views, profile views and website clicks for yesterday (the last full day). */
  async accountDay(a: BrandSocialAccount) {
    const todayKey = dateKeyTz(new Date());
    const today = dayDate(todayKey);
    const recent = await this.prisma.brandSocialAccountDay.findUnique({ where: { accountId_day: { accountId: a.id, day: today } } });
    if (recent && Date.now() - recent.updatedAt.getTime() < 3 * 3600_000) return;
    const yStart = startOfDayTz(addDaysTz(new Date(), -1));
    const tStart = startOfDayTz(new Date());
    const span = { since: Math.floor(yStart.getTime() / 1000), until: Math.floor(tStart.getTime() / 1000) };
    const yesterday = dayDate(dateKeyTz(yStart));

    let followers: number | null = null;
    let day: { reach: number | null; impressions: number | null; profileViews: number | null; websiteClicks: number | null };
    if (a.platform === 'FACEBOOK') {
      const f = await this.fields<any>(a, a.externalId, ['followers_count,fan_count', 'fan_count']);
      followers = f ? num(f.followers_count ?? f.fan_count) : null;
      const ins = await this.insights(a, a.externalId, ['page_impressions_unique', 'page_impressions', 'page_media_view', 'page_views_total'], { period: 'day', ...span });
      day = {
        reach: ins.page_impressions_unique ?? null,
        impressions: ins.page_media_view ?? ins.page_impressions ?? null,
        profileViews: ins.page_views_total ?? null,
        websiteClicks: null,
      };
    } else {
      const f = await this.fields<any>(a, a.externalId, ['followers_count']);
      followers = f ? num(f.followers_count) : null;
      const reach = await this.insights(a, a.externalId, ['reach'], { period: 'day', ...span });
      const totals = await this.insights(a, a.externalId, ['views', 'profile_views', 'website_clicks'], { period: 'day', metric_type: 'total_value', ...span });
      day = { reach: reach.reach ?? null, impressions: totals.views ?? null, profileViews: totals.profile_views ?? null, websiteClicks: totals.website_clicks ?? null };
    }
    await this.prisma.brandSocialAccountDay.upsert({
      where: { accountId_day: { accountId: a.id, day: today } },
      create: { accountId: a.id, day: today, followers },
      update: { followers: followers ?? undefined },
    });
    await this.prisma.brandSocialAccountDay.upsert({
      where: { accountId_day: { accountId: a.id, day: yesterday } },
      create: { accountId: a.id, day: yesterday, ...day },
      update: day,
    });
  }

  /* ───────────────────────── analytics ───────────────────────── */

  private range(from?: string, to?: string) {
    const toKey = /^\d{4}-\d{2}-\d{2}$/.test(to ?? '') ? to! : dateKeyTz(new Date());
    const fromKey = /^\d{4}-\d{2}-\d{2}$/.test(from ?? '') ? from! : dateKeyTz(new Date(Date.now() - 29 * DAY));
    const start = parsePktDateTime(`${fromKey}T00:00`)!;
    const end = new Date(parsePktDateTime(`${toKey}T00:00`)!.getTime() + DAY - 1);
    return { fromKey, toKey, start, end };
  }

  async analytics(q: { from?: string; to?: string }): Promise<AnalyticsResponse> {
    const { fromKey, toKey, start, end } = this.range(q?.from, q?.to);
    const posts = await this.prisma.brandSocialPost.findMany({
      where: { publishedAt: { gte: start, lte: end } },
      select: { id: true, title: true, code: true, kind: true, pillar: true, campaign: true, publishedAt: true, media: true, publishState: true },
    });
    const latest = await this.posts.latestMetrics(posts.map((p) => p.id));

    const totals = { posts: posts.length, reach: 0, impressions: 0, engagement: 0, engagementRate: 0, likes: 0, comments: 0, shares: 0, saves: 0, plays: 0, linkClicks: 0, signups: 0 };
    const top: AnalyticsResponse['topPosts'] = [];
    const cells = new Map<string, { posts: number; rateSum: number }>();
    const pillars = new Map<string, { posts: number; reach: number; engagement: number }>();
    for (const p of posts) {
      const per = latest.get(p.id) ?? {};
      let reach = 0;
      let eng = 0;
      for (const [platform, m] of Object.entries(per) as Array<[BrandPlatform, NonNullable<(typeof per)[BrandPlatform]>]>) {
        totals.reach += m.reach; totals.impressions += m.impressions; totals.likes += m.likes; totals.comments += m.comments;
        totals.shares += m.shares; totals.saves += m.saves; totals.plays += m.plays; totals.engagement += m.engagement;
        reach += m.reach; eng += m.engagement;
        const state = (p.publishState ?? {}) as PublishStateMap;
        const media = (p.media ?? []) as unknown as PostMediaItem[];
        top.push({
          id: p.id, title: p.title, code: p.code, kind: p.kind as never, pillar: p.pillar, platform,
          publishedAt: p.publishedAt?.toISOString() ?? null, permalink: state[platform]?.permalink ?? null,
          thumbUrl: media[0]?.thumbUrl ?? (media[0]?.kind === 'image' ? media[0].url : null),
          reach: m.reach, engagement: m.engagement, engagementRate: rate(m.engagement, m.reach), clicks: m.clicks,
        });
      }
      if (p.publishedAt) {
        const k = `${weekdayInTz(p.publishedAt)}:${hourInTz(p.publishedAt)}`;
        const c = cells.get(k) ?? { posts: 0, rateSum: 0 };
        c.posts += 1; c.rateSum += rate(eng, reach);
        cells.set(k, c);
      }
      const pk = p.pillar || 'none';
      const pl = pillars.get(pk) ?? { posts: 0, reach: 0, engagement: 0 };
      pl.posts += 1; pl.reach += reach; pl.engagement += eng;
      pillars.set(pk, pl);
    }
    totals.engagementRate = rate(totals.engagement, totals.reach);

    const heatmap: AnalyticsResponse['heatmap'] = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      for (let hour = 0; hour < 24; hour++) {
        const c = cells.get(`${weekday}:${hour}`);
        heatmap.push({ weekday, hour, posts: c?.posts ?? 0, avgEngagementRate: c ? Math.round((c.rateSum / c.posts) * 100) / 100 : 0 });
      }
    }

    const links = await this.linkStats(start, end);
    totals.linkClicks = links.clicks;
    totals.signups = links.signups;

    return {
      range: { from: fromKey, to: toKey },
      totals,
      followers: await this.followerSeries(fromKey, toKey),
      topPosts: top.sort((a, b) => b.engagement - a.engagement || b.reach - a.reach).slice(0, 15),
      heatmap,
      pillars: [...pillars.entries()].map(([pillar, v]) => ({ pillar, ...v, engagementRate: rate(v.engagement, v.reach) })).sort((a, b) => b.engagement - a.engagement),
      links,
    };
  }

  private async followerSeries(fromKey: string, toKey: string): Promise<AnalyticsResponse['followers']> {
    const accounts = await this.prisma.brandSocialAccount.findMany({ where: { status: { not: 'DISCONNECTED' } } });
    if (!accounts.length) return [];
    const days = await this.prisma.brandSocialAccountDay.findMany({
      where: { accountId: { in: accounts.map((a) => a.id) }, day: { gte: dayDate(fromKey), lte: dayDate(toKey) } },
      orderBy: { day: 'asc' },
    });
    return accounts.map((a) => {
      const series = days.filter((d) => d.accountId === a.id).map((d) => ({ day: d.day.toISOString().slice(0, 10), followers: d.followers, reach: d.reach }));
      const withF = series.filter((s) => s.followers != null);
      const current = withF.length ? withF[withF.length - 1].followers : null;
      return {
        accountId: a.id, platform: a.platform as BrandPlatform, name: a.name, current,
        growth: withF.length > 1 ? (withF[withF.length - 1].followers ?? 0) - (withF[0].followers ?? 0) : null,
        series,
      };
    });
  }

  /** Site visits and leads tagged with a post code (utm_content) in the range. */
  private async linkStats(start: Date, end: Date): Promise<AnalyticsResponse['links']> {
    const where = { createdAt: { gte: start, lte: end }, utmContent: { not: null } };
    const [views, leads] = await Promise.all([
      this.prisma.marketingPageView.groupBy({ by: ['utmContent', 'utmCampaign'], where: { ...where, utmMedium: 'social' }, _count: { _all: true } }).catch(() => []),
      this.prisma.marketingLead.groupBy({ by: ['utmContent', 'utmCampaign'], where, _count: { _all: true } }).catch(() => []),
    ]);
    const codes = [...new Set([...views, ...leads].map((r) => r.utmContent).filter((c): c is string => !!c))];
    const posts = codes.length ? await this.prisma.brandSocialPost.findMany({ where: { code: { in: codes } }, select: { id: true, code: true, title: true } }) : [];
    const byCode = new Map(posts.map((p) => [p.code, p]));
    const perPost = new Map<string, { clicks: number; signups: number }>();
    const perCampaign = new Map<string, { clicks: number; signups: number }>();
    const add = (code: string | null, campaign: string | null, k: 'clicks' | 'signups', n: number) => {
      if (!code || !byCode.has(code)) return;
      const p = perPost.get(code) ?? { clicks: 0, signups: 0 }; p[k] += n; perPost.set(code, p);
      const ck = campaign || 'none';
      const c = perCampaign.get(ck) ?? { clicks: 0, signups: 0 }; c[k] += n; perCampaign.set(ck, c);
    };
    for (const v of views) add(v.utmContent, v.utmCampaign, 'clicks', v._count._all);
    for (const l of leads) add(l.utmContent, l.utmCampaign, 'signups', l._count._all);
    const byPost = [...perPost.entries()].map(([code, v]) => ({ code, postId: byCode.get(code)?.id ?? null, title: byCode.get(code)?.title ?? code, ...v }))
      .sort((a, b) => b.clicks - a.clicks || b.signups - a.signups);
    return {
      clicks: byPost.reduce((s, x) => s + x.clicks, 0),
      signups: byPost.reduce((s, x) => s + x.signups, 0),
      byPost: byPost.slice(0, 50),
      byCampaign: [...perCampaign.entries()].map(([campaign, v]) => ({ campaign, ...v })).sort((a, b) => b.clicks - a.clicks),
    };
  }

  /* ───────────────────────── overview ───────────────────────── */

  async overview(): Promise<OverviewResponse> {
    const now = new Date();
    const weekStart = startOfDayTz(addDaysTz(now, -((weekdayInTz(now) + 6) % 7)));
    const in7 = new Date(now.getTime() + 7 * DAY);
    const [accountsRes, settings, postsThisWeek, pendingApprovals, failedCount, queue, approvals, failed, handoffRows, recent] = await Promise.all([
      this.accounts.list(),
      this.settings.get(),
      this.prisma.brandSocialPost.count({ where: { OR: [{ publishedAt: { gte: weekStart } }, { status: 'SCHEDULED', scheduledAt: { gte: weekStart, lt: new Date(weekStart.getTime() + 7 * DAY) } }] } }),
      this.prisma.brandSocialPost.count({ where: { status: 'IN_REVIEW' } }),
      this.prisma.brandSocialPost.count({ where: { status: { in: ['FAILED', 'PARTIAL'] } } }),
      this.prisma.brandSocialPost.findMany({ where: { status: { in: ['SCHEDULED', 'APPROVED', 'IN_REVIEW', 'PUBLISHING'] }, scheduledAt: { gte: startOfDayTz(now), lte: in7 } }, orderBy: { scheduledAt: 'asc' }, take: 50 }),
      this.prisma.brandSocialPost.findMany({ where: { status: 'IN_REVIEW' }, orderBy: [{ scheduledAt: { sort: 'asc', nulls: 'last' } }], take: 10 }),
      this.prisma.brandSocialPost.findMany({ where: { status: { in: ['FAILED', 'PARTIAL'] } }, orderBy: { updatedAt: 'desc' }, take: 10 }),
      this.handoffRows(),
      this.prisma.brandSocialPostMetric.findMany({ where: { day: { gte: dayDate(dateKeyTz(new Date(now.getTime() - 7 * DAY))) }, post: { publishedAt: { gte: new Date(now.getTime() - 7 * DAY) } } }, orderBy: { day: 'desc' }, distinct: ['postId', 'platform'] }),
    ]);
    const reach7d = recent.reduce((s, m) => s + m.reach, 0);
    const eng7d = recent.reduce((s, m) => s + m.engagement, 0);
    const byPlatform = new Map<BrandPlatform, number | null>();
    for (const a of accountsRes.accounts.filter((x) => x.status !== 'DISCONNECTED')) {
      const prev = byPlatform.get(a.platform);
      byPlatform.set(a.platform, a.followers == null ? prev ?? null : (prev ?? 0) + a.followers);
    }
    const [queueV, approvalsV, failedV, handoffV] = await Promise.all([this.posts.views(queue, false), this.posts.views(approvals, false), this.posts.views(failed, false), this.posts.views(handoffRows, false)]);
    return {
      followers: { total: [...byPlatform.values()].reduce<number>((s, v) => s + (v ?? 0), 0), byPlatform: [...byPlatform.entries()].map(([platform, followers]) => ({ platform, followers })) },
      postsThisWeek,
      reach7d,
      engagementRate7d: rate(eng7d, reach7d),
      pendingApprovals,
      failed: failedCount,
      handoffDue: handoffRows.length,
      paused: settings.paused,
      queue: queueV,
      needsYou: { approvals: approvalsV, failed: failedV, handoff: handoffV },
      accounts: accountsRes.accounts,
    };
  }

  /** Posts with at least one platform waiting to be posted by hand. */
  async handoffRows(): Promise<BrandSocialPost[]> {
    const rows = await this.prisma.brandSocialPost.findMany({
      where: { status: { in: ['PUBLISHING', 'PARTIAL', 'FAILED'] }, updatedAt: { gte: new Date(Date.now() - 60 * DAY) } },
      orderBy: [{ scheduledAt: { sort: 'asc', nulls: 'first' } }],
      take: 300,
    });
    return rows.filter((r) => Object.values((r.publishState ?? {}) as PublishStateMap).some((s) => s?.status === 'HANDOFF'));
  }

  async handoff() {
    return { posts: await this.posts.views(await this.handoffRows(), false) };
  }

  /* ───────────────────────── ads ───────────────────────── */

  async adsOverview(q: { from?: string; to?: string }): Promise<AdsOverviewResponse> {
    const s = await this.settings.get();
    if (!s.adAccountId) return { connected: false, reason: 'No ad account is set in Settings.' };
    const u = await this.settings.metaUser();
    const token = decrypt(u?.tokenEnc ?? null);
    if (!token) return { connected: false, reason: 'Connect Facebook on the Accounts page first.' };
    if (!u?.scopes?.some((x) => x === 'ads_read' || x === 'ads_management')) return { connected: false, reason: 'The Facebook connection has no ads_read permission. Reconnect and allow ads access.' };
    const { fromKey, toKey } = this.range(q?.from, q?.to);
    const act = `act_${s.adAccountId}`;
    const time_range = { since: fromKey, until: toKey };
    try {
      const [acc, rows, statuses] = await Promise.all([
        this.graph.withToken<{ currency?: string }>(token, { path: act, params: { fields: 'currency,name' } }).catch(() => null),
        this.graph.withToken<{ data?: any[] }>(token, {
          path: `${act}/insights`,
          params: { level: 'campaign', fields: 'campaign_id,campaign_name,spend,impressions,clicks,cpc,ctr,reach,actions', time_range, limit: 200 },
        }),
        this.graph.withToken<{ data?: any[] }>(token, { path: `${act}/campaigns`, params: { fields: 'id,effective_status', limit: 200 } }).catch(() => null),
      ]);
      const statusOf = new Map((statuses?.data ?? []).map((c: any) => [String(c.id), String(c.effective_status ?? '')]));
      const campaigns = (rows?.data ?? []).map((r: any) => {
        const actions: Array<{ action_type: string; value: string }> = Array.isArray(r.actions) ? r.actions : [];
        const pick = actions.find((a) => /lead|complete_registration|purchase/.test(a.action_type)) ?? actions.find((a) => a.action_type === 'link_click') ?? null;
        return {
          id: String(r.campaign_id), name: String(r.campaign_name ?? r.campaign_id), status: statusOf.get(String(r.campaign_id)) || null,
          spend: num(r.spend), impressions: num(r.impressions), clicks: num(r.clicks), cpc: num(r.cpc), ctr: num(r.ctr), reach: num(r.reach),
          results: pick ? num(pick.value) : 0, resultType: pick?.action_type ?? null,
        };
      });
      const t = campaigns.reduce((a, c) => ({ spend: a.spend + c.spend, impressions: a.impressions + c.impressions, clicks: a.clicks + c.clicks, reach: a.reach + c.reach, results: a.results + c.results }), { spend: 0, impressions: 0, clicks: 0, reach: 0, results: 0 });
      return {
        connected: true, adAccountId: s.adAccountId, currency: acc?.currency ?? null, range: { from: fromKey, to: toKey },
        totals: { ...t, cpc: t.clicks ? Math.round((t.spend / t.clicks) * 100) / 100 : 0, ctr: t.impressions ? Math.round((t.clicks / t.impressions) * 10_000) / 100 : 0 },
        campaigns: campaigns.sort((a, b) => b.spend - a.spend),
      };
    } catch (e) {
      const err = toSocialError(e);
      return { connected: false, reason: err.kind === 'permission' ? `This Facebook user has no access to ad account ${s.adAccountId}.` : err.text };
    }
  }
}
