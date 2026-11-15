/**
 * Nafaa Social results and control of live posts:
 * - the Published list (every post that went out, per-platform links,
 *   status and latest numbers, totals, filters and sorting);
 * - one post's results (per platform, a daily trend from the metric rows,
 *   metrics a platform refused);
 * - "Refresh results" for one post now (once every 2 minutes per post);
 * - edit, delete and Instagram comments on/off, only where the platform's
 *   API allows it (rules in brand-social-actions.logic.ts).
 * Every change is a POST under /admin and lands in the admin audit log.
 */

import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BrandSocialAccount, BrandSocialPost, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { dateKeyTz } from '../../common/helpers/business-time.helper';
import { BrandSocialGraphService, SocialGraphError, toSocialError } from './brand-social-graph.service';
import { BrandSocialInsightsService } from './brand-social-insights.service';
import { BrandSocialPlatformsService } from './brand-social-platforms.service';
import { BrandSocialPostsService, SocialActor } from './brand-social-posts.service';
import { isOAuthPlatform } from './brand-social-oauth.logic';
import { isKind, isPlatform, isStatus, parsePktDateTime, PLATFORM_LABEL, platformFrom, textFor } from './brand-social.logic';
import { BrandSocialSettingsService } from './brand-social-settings.service';
import { platformActions, sumMetrics, zeroTotals } from './brand-social-actions.logic';
import {
  METRIC_KEYS, type BrandPlatform, type BrandPostKind, type BrandPostStatus, type MetricKey, type PlatformEditInput, type PlatformPublishState,
  type PostMediaItem, type PostMetricView, type PostResultsResponse, type PublishedPlatformView, type PublishedQuery, type PublishedResponse,
  type PublishedRow, type PublishStateMap,
} from './brand-social.types';

const REFRESH_EVERY_MS = 2 * 60_000;
const stateOf = (p: Pick<BrandSocialPost, 'publishState'>): PublishStateMap =>
  p.publishState && typeof p.publishState === 'object' && !Array.isArray(p.publishState) ? { ...(p.publishState as unknown as PublishStateMap) } : {};
const mediaOf = (p: Pick<BrandSocialPost, 'media'>) => (Array.isArray(p.media) ? p.media : []) as unknown as PostMediaItem[];
const thumbOf = (media: PostMediaItem[]) => media[0]?.thumbUrl ?? (media[0]?.kind === 'image' ? media[0].url : null);

@Injectable()
export class BrandSocialResultsService {
  private readonly logger = new Logger('BrandSocialResults');
  private readonly lastRefresh = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: BrandSocialGraphService,
    private readonly posts: BrandSocialPostsService,
    private readonly insights: BrandSocialInsightsService,
    private readonly platforms: BrandSocialPlatformsService,
    private readonly settings: BrandSocialSettingsService,
  ) {}

  /* ───────────────────────── reads ───────────────────────── */

  private liveAccounts() {
    return this.prisma.brandSocialAccount.findMany({ where: { status: { not: 'DISCONNECTED' } }, orderBy: { createdAt: 'asc' } });
  }

  private accountFor(accounts: BrandSocialAccount[], p: BrandPlatform) {
    return accounts.find((a) => a.platform === p && a.status === 'CONNECTED') ?? accounts.find((a) => a.platform === p) ?? null;
  }

  private platformViews(post: BrandSocialPost, accounts: BrandSocialAccount[], metrics: Partial<Record<BrandPlatform, PostMetricView>>): PublishedPlatformView[] {
    const state = stateOf(post);
    const kind = (isKind(post.kind) ? post.kind : 'POST') as BrandPostKind;
    return post.platforms.filter(isPlatform).map((p) => {
      const s = state[p];
      return {
        platform: p,
        status: s?.status ?? 'PUBLISHING',
        postId: s?.postId ?? null,
        permalink: s?.permalink ?? null,
        at: s?.status === 'PUBLISHED' ? s.at : null,
        manual: !!s?.manual,
        deletedAt: s?.deletedAt ?? null,
        ...(p === 'INSTAGRAM' ? { commentsOff: !!s?.commentsOff } : {}),
        metrics: metrics[p] ?? null,
        actions: platformActions(p, s, this.accountFor(accounts, p), kind),
      };
    });
  }

  /** Every post that went out (at least one platform live or marked posted), newest first by default. */
  async published(q: PublishedQuery): Promise<PublishedResponse> {
    const where: Prisma.BrandSocialPostWhereInput = { publishedAt: { not: null } };
    const and: Prisma.BrandSocialPostWhereInput[] = [];
    const from = q?.from && /^\d{4}-\d{2}-\d{2}$/.test(q.from) ? parsePktDateTime(`${q.from}T00:00`) : null;
    const to = q?.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to) ? parsePktDateTime(`${q.to}T23:59:59`) : null;
    if (from || to) and.push({ publishedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
    const platform = platformFrom(q?.platform);
    if (platform) where.platforms = { has: platform };
    if (q?.kind && isKind(q.kind)) where.kind = q.kind;
    if (q?.pillar) where.pillar = q.pillar;
    const search = String(q?.search ?? '').trim();
    if (search) {
      and.push({ OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { caption: { contains: search, mode: 'insensitive' } },
        { code: { equals: search.toLowerCase() } },
      ] });
    }
    if (and.length) where.AND = and;
    const [rows, accounts, settings] = await Promise.all([
      this.prisma.brandSocialPost.findMany({ where, orderBy: { publishedAt: 'desc' }, take: 500 }),
      this.liveAccounts(),
      this.settings.get(),
    ]);
    const latest = await this.posts.latestMetrics(rows.map((r) => r.id));
    let out: PublishedRow[] = rows.map((r) => {
      const metrics = latest.get(r.id) ?? {};
      const views = this.platformViews(r, accounts, metrics);
      const shown = platform ? views.filter((v) => v.platform === platform) : views;
      const fetched = shown.map((v) => v.metrics?.fetchedAt).filter((x): x is string => !!x).sort();
      const media = mediaOf(r);
      return {
        id: r.id, code: r.code, title: r.title, kind: (isKind(r.kind) ? r.kind : 'POST') as BrandPostKind, pillar: r.pillar, campaign: r.campaign,
        status: (isStatus(r.status) ? r.status : 'PUBLISHED') as BrandPostStatus, publishedAt: r.publishedAt?.toISOString() ?? null,
        thumbUrl: thumbOf(media), mediaCount: media.length, caption: r.caption,
        texts: Object.fromEntries(views.map((v) => [v.platform, textFor({ code: r.code, caption: r.caption, captions: (r.captions ?? {}) as Partial<Record<BrandPlatform, string>>, hashtags: r.hashtags, link: r.link, campaign: r.campaign, media }, v.platform, settings.utm)])),
        platforms: views,
        totals: sumMetrics(shown.map((v) => v.metrics)),
        fetchedAt: fetched.length ? fetched[fetched.length - 1] : null,
      };
    });
    // With a platform filter, keep only posts that are actually live (or were) there.
    if (platform) out = out.filter((r) => r.platforms.some((v) => v.platform === platform && v.status === 'PUBLISHED'));
    const key = String(q?.sort ?? 'publishedAt');
    const dir = q?.dir === 'asc' ? 1 : -1;
    if ((METRIC_KEYS as readonly string[]).includes(key)) out.sort((a, b) => dir * (a.totals[key as MetricKey] - b.totals[key as MetricKey]) || (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
    else if (dir === 1) out.reverse();
    const totals = zeroTotals();
    for (const r of out) for (const k of METRIC_KEYS) totals[k] += r.totals[k];
    return { posts: out, total: out.length, totals };
  }

  /** One post: per-platform numbers, links and actions, and the daily trend. */
  async results(id: string): Promise<PostResultsResponse> {
    const post = await this.posts.row(id);
    const [accounts, latest, rows] = await Promise.all([
      this.liveAccounts(),
      this.posts.latestMetrics([id]),
      this.prisma.brandSocialPostMetric.findMany({ where: { postId: id }, orderBy: { day: 'asc' }, select: { day: true, platform: true, reach: true, impressions: true, engagement: true, raw: true } }),
    ]);
    const views = this.platformViews(post, accounts, latest.get(id) ?? {});
    const byDay = new Map<string, { reach: number; impressions: number; engagement: number }>();
    for (const r of rows) {
      const k = r.day.toISOString().slice(0, 10);
      const t = byDay.get(k) ?? { reach: 0, impressions: 0, engagement: 0 };
      t.reach += r.reach; t.impressions += r.impressions; t.engagement += r.engagement;
      byDay.set(k, t);
    }
    const notes: PostResultsResponse['notes'] = [];
    const newest = new Map<string, Record<string, unknown>>();
    for (const r of rows) newest.set(r.platform, (r.raw ?? {}) as Record<string, unknown>);
    for (const [p, raw] of newest) {
      const refused = Array.isArray(raw.refused) ? (raw.refused as string[]) : [];
      if (refused.length && isPlatform(p)) notes.push({ platform: p, message: `${PLATFORM_LABEL[p]} did not give: ${refused.join(', ')}.` });
    }
    for (const v of views) {
      if (v.status !== 'PUBLISHED' || v.manual || v.deletedAt || v.metrics) continue;
      if (v.platform === 'TIKTOK') notes.push({ platform: v.platform, message: 'TikTok numbers are not available through the posting API. See them in TikTok Studio.' });
    }
    const last = this.lastRefresh.get(id);
    return {
      postId: id,
      platforms: views,
      totals: sumMetrics(views.map((v) => v.metrics)),
      trend: [...byDay.entries()].map(([day, t]) => ({ day, ...t })),
      refreshAfter: last && last + REFRESH_EVERY_MS > Date.now() ? new Date(last + REFRESH_EVERY_MS).toISOString() : null,
      notes,
    };
  }

  /* ───────────────────────── refresh one post ───────────────────────── */

  /** Pulls fresh numbers for one post from every live platform now. A platform that refuses is skipped. */
  async refresh(id: string): Promise<PostResultsResponse> {
    const last = this.lastRefresh.get(id);
    if (last && Date.now() - last < REFRESH_EVERY_MS) {
      const wait = Math.ceil((last + REFRESH_EVERY_MS - Date.now()) / 1000);
      throw new HttpException(`Results were refreshed a moment ago. Try again in ${wait} seconds.`, HttpStatus.TOO_MANY_REQUESTS);
    }
    this.lastRefresh.set(id, Date.now());
    if (this.lastRefresh.size > 2000) for (const [k, t] of this.lastRefresh) if (Date.now() - t > REFRESH_EVERY_MS) this.lastRefresh.delete(k);
    const post = await this.posts.row(id);
    const state = stateOf(post);
    const accounts = await this.prisma.brandSocialAccount.findMany({ where: { status: 'CONNECTED', accessTokenEnc: { not: null } } });
    const today = new Date(`${dateKeyTz(new Date())}T00:00:00.000Z`);
    for (const p of post.platforms.filter(isPlatform)) {
      const s = state[p];
      if (s?.status !== 'PUBLISHED' || s.manual || !s.postId || s.deletedAt) continue;
      const account = accounts.find((a) => a.platform === p);
      if (!account) continue;
      try {
        if (p === 'FACEBOOK' || p === 'INSTAGRAM') {
          await this.insights.saveMetric(id, p, await this.insights.metaPostMetrics(account, p, s.postId, post), today);
        } else if (isOAuthPlatform(p)) {
          const adapter = this.platforms.adapter(p);
          if (!adapter.metrics) continue;
          const token = await this.platforms.accessToken(account);
          const m = (await adapter.metrics(token, account.externalId, [s.postId])).get(s.postId);
          if (m) await this.insights.saveMetric(id, p, m, today);
        }
      } catch (e) {
        this.logger.warn(`Refresh ${id}/${p}: ${toSocialError(e).text}`);
      }
    }
    await this.prisma.brandSocialPost.update({ where: { id }, data: { insightsAt: new Date() } }).catch(() => null);
    return this.results(id);
  }

  /* ───────────────────────── edit / delete ───────────────────────── */

  private async target(id: string, platformRaw: string) {
    const platform = platformFrom(platformRaw);
    const post = await this.posts.row(id);
    if (!platform || !post.platforms.includes(platform)) throw new BadRequestException('This post is not set for that platform.');
    const state = stateOf(post);
    const s = state[platform];
    const accounts = await this.liveAccounts();
    const account = this.accountFor(accounts, platform);
    const actions = platformActions(platform, s, account, (isKind(post.kind) ? post.kind : 'POST') as BrandPostKind);
    return { post, platform, state, s: s as PlatformPublishState | undefined, account, actions };
  }

  private async saveState(id: string, state: PublishStateMap) {
    await this.prisma.brandSocialPost.update({ where: { id }, data: { publishState: state as unknown as Prisma.InputJsonValue } });
  }

  /** Runs one platform call; turns platform errors into a 400 with the plain text. */
  private async run<T>(platform: BrandPlatform, account: BrandSocialAccount, fn: (token: string | null) => Promise<T>): Promise<T> {
    try {
      const token = isOAuthPlatform(platform) ? await this.platforms.accessToken(account) : null;
      return await fn(token);
    } catch (e) {
      const err = toSocialError(e);
      if (err.kind === 'token' && isOAuthPlatform(platform)) await this.graph.markReconnect(account.id, err.text);
      throw new BadRequestException(err.text);
    }
  }

  /** Changes the live post's text: Facebook message, YouTube title and description, Pinterest title, description and link. */
  async edit(id: string, platformRaw: string, body: PlatformEditInput, actor: SocialActor): Promise<PostResultsResponse> {
    const t = await this.target(id, platformRaw);
    if (!t.actions.edit.ok) throw new BadRequestException(t.actions.edit.reason ?? `${PLATFORM_LABEL[t.platform]} cannot be edited from Nafaa.`);
    const fields = t.actions.edit.fields;
    const pick = (k: 'message' | 'title' | 'description') => (fields.includes(k) && typeof body?.[k] === 'string' ? String(body[k]) : undefined);
    const message = pick('message');
    const title = pick('title');
    const description = pick('description');
    let link: string | null | undefined;
    if (fields.includes('link') && body && 'link' in body) {
      link = typeof body.link === 'string' && body.link.trim() ? body.link.trim() : null;
      if (link && !/^https?:\/\//i.test(link)) throw new BadRequestException('The link must start with https://');
    }
    if (message === undefined && title === undefined && description === undefined && link === undefined) throw new BadRequestException('Nothing to change.');
    if (message !== undefined && !message.trim()) throw new BadRequestException('The text cannot be empty.');
    if (title !== undefined && !title.trim()) throw new BadRequestException('The title cannot be empty.');
    const postId = t.s!.postId!;
    const account = t.account!;
    await this.run(t.platform, account, async (token) => {
      if (t.platform === 'FACEBOOK') {
        // A video published through /videos is a video id; its text is the description.
        const isVideoId = mediaOf(t.post).some((m) => m.kind === 'video') && !postId.includes('_');
        const res = await this.graph.call<{ success?: boolean }>(account, { method: 'POST', path: postId, body: isVideoId ? { description: message } : { message } });
        if (res && res.success === false) throw new SocialGraphError('unknown', 'Facebook did not change the post. Facebook lets an app edit only posts it made.');
        return;
      }
      const adapter = isOAuthPlatform(t.platform) ? this.platforms.adapter(t.platform) : null;
      if (!adapter?.editPost || !token) throw new SocialGraphError('unknown', `${PLATFORM_LABEL[t.platform]} cannot be edited from Nafaa.`);
      await adapter.editPost(token, postId, { title, description, link });
    });
    t.state[t.platform] = { ...t.s!, editedAt: new Date().toISOString(), postedById: t.s!.postedById ?? null };
    await this.saveState(id, t.state);
    this.logger.log(`Edited ${id}/${t.platform} by ${actor.id}`);
    return this.results(id);
  }

  /** Removes the live post from one platform. The post and its results stay in Nafaa. */
  async remove(id: string, platformRaw: string, actor: SocialActor): Promise<PostResultsResponse> {
    const t = await this.target(id, platformRaw);
    if (!t.actions.delete.ok) throw new BadRequestException(t.actions.delete.reason ?? `${PLATFORM_LABEL[t.platform]} cannot delete from Nafaa.`);
    const postId = t.s!.postId!;
    const account = t.account!;
    await this.run(t.platform, account, async (token) => {
      if (t.platform === 'FACEBOOK' || t.platform === 'INSTAGRAM') {
        const res = await this.graph.call<{ success?: boolean }>(account, { method: 'DELETE', path: postId });
        if (res && res.success === false) throw new SocialGraphError('unknown', `${PLATFORM_LABEL[t.platform]} did not delete the post.`);
        return;
      }
      const adapter = isOAuthPlatform(t.platform) ? this.platforms.adapter(t.platform) : null;
      if (!adapter?.deletePost || !token) throw new SocialGraphError('unknown', `${PLATFORM_LABEL[t.platform]} cannot delete from Nafaa.`);
      await adapter.deletePost(token, postId);
    });
    t.state[t.platform] = { ...t.s!, deletedAt: new Date().toISOString(), deletedById: actor.id };
    await this.saveState(id, t.state);
    await this.prisma.brandSocialComment.updateMany({ where: { postId: id, platform: t.platform, deletedAt: null }, data: { deletedAt: new Date() } }).catch(() => null);
    return this.results(id);
  }

  /** Instagram: turns comments on or off for the live post (comment_enabled). */
  async toggleComments(id: string, platformRaw: string, enabled: unknown): Promise<PostResultsResponse> {
    const t = await this.target(id, platformRaw);
    if (typeof enabled !== 'boolean') throw new BadRequestException('Say whether comments are on or off.');
    if (!t.actions.toggleComments.ok) throw new BadRequestException(t.actions.toggleComments.reason ?? 'Comments cannot be switched here.');
    const account = t.account!;
    await this.run(t.platform, account, async () => {
      await this.graph.call(account, { method: 'POST', path: t.s!.postId!, body: { comment_enabled: enabled } });
    });
    t.state[t.platform] = { ...t.s!, commentsOff: !enabled };
    await this.saveState(id, t.state);
    return this.results(id);
  }
}
