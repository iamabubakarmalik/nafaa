/**
 * Nafaa Social publisher. Every minute it takes posts whose nextRunAt has
 * come (SCHEDULED posts at their time, retries, Instagram videos still
 * processing) and works through each platform:
 *  - Facebook / Instagram with a connected account and auto-publish on →
 *    published through the Graph API (plans from meta-graph.ts), then the
 *    first comment;
 *  - Threads, YouTube, TikTok, X, Pinterest with a connected account and
 *    auto-publish on → published through the platform's adapter
 *    (BrandSocialPlatformsService). An adapter can also hand a post to a
 *    person (HANDOFF with the reason) or skip a kind the platform does not
 *    take (SKIPPED with the reason);
 *  - every other platform, or auto-publish off → HANDOFF (posted by a person
 *    from the "To post by hand" queue, then marked posted).
 * Transient failures retry after 5, 15 and 60 minutes. Nothing runs while
 * settings.paused is on, or with DISABLE_BRAND_SOCIAL_JOBS=1 / DISABLE_META_JOBS=1.
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { BrandSocialAccount, BrandSocialPost, Prisma } from '@prisma/client';
import { Cron } from '../../core/system-control/cron.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { containerState, facebookPlan, instagramPlan, PublishInput, retryable } from '../../integrations/meta/meta-graph';
import { BrandSocialGraphService, SocialGraphError, toSocialError } from './brand-social-graph.service';
import { BrandSocialPostsService, SocialActor } from './brand-social-posts.service';
import { BrandSocialSettingsService } from './brand-social-settings.service';
import { BrandSocialPlatformsService } from './brand-social-platforms.service';
import { isOAuthPlatform } from './brand-social-oauth.logic';
import {
  blockingErrors, CONTAINER_WAIT_MS, dispatchFor, duePlatforms, isKind, isPlatform, linkFor, missedWindow, PLATFORM_LABEL, retryAt, STUCK_MS, summarize, textFor,
} from './brand-social.logic';
import type { BrandPlatform, BrandPostView, MarkPostedInput, PlatformPublishState, PostMediaItem, PublishStateMap } from './brand-social.types';

const apiOrigin = () => { try { return new URL(process.env.PUBLIC_API_URL || process.env.API_URL || 'https://api.nafaa.pk/api').origin; } catch { return 'https://api.nafaa.pk'; } };
const absUrl = (u: string) => (/^https?:\/\//.test(u) ? u : u.startsWith('/') ? `${apiOrigin()}${u}` : u);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stateOf = (p: Pick<BrandSocialPost, 'publishState'>): PublishStateMap =>
  p.publishState && typeof p.publishState === 'object' && !Array.isArray(p.publishState) ? { ...(p.publishState as unknown as PublishStateMap) } : {};

export const jobsDisabled = () => process.env.DISABLE_BRAND_SOCIAL_JOBS === '1' || process.env.DISABLE_META_JOBS === '1';

interface PublishResult { postId?: string; permalink?: string | null; waiting?: boolean; containerId?: string }

@Injectable()
export class BrandSocialPublisherService {
  private readonly logger = new Logger('BrandSocialPublisher');
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: BrandSocialGraphService,
    private readonly posts: BrandSocialPostsService,
    private readonly settings: BrandSocialSettingsService,
    private readonly platforms: BrandSocialPlatformsService,
  ) {}

  @Cron('20 * * * * *')
  async tick() {
    if (this.running || jobsDisabled()) return;
    if (await this.settings.paused()) return;
    this.running = true;
    try {
      const rows = await this.prisma.brandSocialPost.findMany({
        where: { status: { in: ['SCHEDULED', 'PUBLISHING'] }, nextRunAt: { lte: new Date() } },
        orderBy: { nextRunAt: 'asc' },
        take: 20,
      });
      for (const post of rows) {
        if (await this.settings.paused()) break;
        await this.process(post, false).catch((e) => this.logger.warn(`Publish ${post.id}: ${(e as Error).message}`));
      }
    } finally {
      this.running = false;
    }
  }

  /* ───────────────────────── manual actions ───────────────────────── */

  private async assertLive() {
    if (await this.settings.paused()) throw new BadRequestException('Publishing is paused (Settings). Turn it back on first.');
  }

  /** Publishes now: approved / scheduled posts, or the failed platforms of a failed or partial post. */
  async publishNow(id: string, actor: SocialActor): Promise<BrandPostView> {
    await this.assertLive();
    const post = await this.posts.row(id);
    const s = await this.settings.get();
    const ok = ['APPROVED', 'SCHEDULED', 'FAILED', 'PARTIAL', 'PUBLISHING'].includes(post.status)
      || (!s.requireApproval && ['DRAFT', 'IDEA'].includes(post.status));
    if (!ok) throw new BadRequestException(post.status === 'IN_REVIEW' ? 'Approve this post first.' : `A ${post.status.toLowerCase().replace('_', ' ')} post cannot be published.`);
    const state = stateOf(post);
    for (const p of Object.keys(state) as BrandPlatform[]) if (state[p]?.status === 'FAILED') delete state[p];
    const view = (await this.posts.views([post], false))[0];
    if (blockingErrors(view.warnings).some((w) => w.platform === null)) throw new BadRequestException(`Fix these first: ${blockingErrors(view.warnings).filter((w) => w.platform === null).map((w) => w.message).join(' ')}`);
    await this.prisma.brandSocialPost.update({
      where: { id },
      data: {
        publishState: state as unknown as Prisma.InputJsonValue, status: 'PUBLISHING', nextRunAt: new Date(),
        ...(post.approvedById ? {} : { approvedById: actor.id, approvedAt: new Date() }),
      },
    });
    await this.process(await this.posts.row(id), true);
    return this.posts.one(id);
  }

  /** Another try for one failed platform, now. */
  async retry(id: string, platform: string | undefined): Promise<BrandPostView> {
    await this.assertLive();
    const post = await this.posts.row(id);
    if (!isPlatform(platform) || !post.platforms.includes(platform)) throw new BadRequestException('This post is not set for that platform.');
    const state = stateOf(post);
    const cur = state[platform];
    if (!cur || !['FAILED', 'WAITING'].includes(cur.status)) throw new BadRequestException(`${PLATFORM_LABEL[platform]} has nothing to retry.`);
    delete state[platform];
    await this.prisma.brandSocialPost.update({ where: { id }, data: { publishState: state as unknown as Prisma.InputJsonValue, status: 'PUBLISHING', nextRunAt: new Date() } });
    await this.process(await this.posts.row(id), true);
    return this.posts.one(id);
  }

  /** A person posted it by hand (or chose to skip the platform). */
  async markPosted(id: string, body: MarkPostedInput, actor: SocialActor): Promise<BrandPostView> {
    const post = await this.posts.row(id);
    const platform = body?.platform;
    if (!isPlatform(platform) || !post.platforms.includes(platform)) throw new BadRequestException('This post is not set for that platform.');
    if (['IDEA', 'DRAFT', 'IN_REVIEW', 'REJECTED', 'ARCHIVED'].includes(post.status)) throw new BadRequestException('Approve this post before marking it posted.');
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    if (!body.skipped && url && !/^https?:\/\//i.test(url)) throw new BadRequestException('Paste the full link of the post (https://…).');
    const state = stateOf(post);
    if (state[platform]?.status === 'PUBLISHED' && !state[platform]?.manual) throw new BadRequestException(`${PLATFORM_LABEL[platform]} was already published by Nafaa.`);
    const now = new Date().toISOString();
    state[platform] = body.skipped
      ? { status: 'SKIPPED', attempts: state[platform]?.attempts ?? 0, at: now, postedById: actor.id }
      : { status: 'PUBLISHED', permalink: url || null, attempts: state[platform]?.attempts ?? 0, at: now, manual: true, postedById: actor.id };
    const platforms = post.platforms.filter(isPlatform);
    const early = ['APPROVED', 'SCHEDULED'].includes(post.status) && platforms.some((p) => !state[p]);
    const sum = summarize(platforms, state);
    await this.prisma.brandSocialPost.update({
      where: { id },
      data: {
        publishState: state as unknown as Prisma.InputJsonValue,
        ...(early ? {} : { status: sum.status, nextRunAt: sum.nextRunAt }),
        ...(!body.skipped && !post.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });
    return this.posts.one(id);
  }

  /* ───────────────────────── the run ───────────────────────── */

  /** Claims the post (optimistic lock on updatedAt) and works through its due platforms. */
  private async process(post: BrandSocialPost, manual: boolean) {
    const lease = new Date(Date.now() + STUCK_MS);
    const claimed = await this.prisma.brandSocialPost.updateMany({
      where: { id: post.id, updatedAt: post.updatedAt, status: { in: ['SCHEDULED', 'PUBLISHING'] } },
      data: { status: 'PUBLISHING', nextRunAt: lease },
    });
    if (!claimed.count) return;

    const s = await this.settings.get();
    const accounts = await this.prisma.brandSocialAccount.findMany({ where: { status: { not: 'DISCONNECTED' } } });
    const platforms = post.platforms.filter(isPlatform);
    const state = stateOf(post);
    const view = (await this.posts.views([post], false))[0];
    const late = !manual && missedWindow(post.scheduledAt) && !Object.keys(state).length;
    const now = () => new Date().toISOString();

    for (const platform of duePlatforms(platforms, state)) {
      const prev: PlatformPublishState = state[platform] ?? { status: 'PUBLISHING', attempts: 0, at: now() };
      const plan = dispatchFor(platform, accounts);
      if (plan.action === 'handoff') { state[platform] = { status: 'HANDOFF', attempts: 0, at: now() }; continue; }
      if (plan.action === 'fail') { state[platform] = { status: 'FAILED', error: plan.error, attempts: prev.attempts, at: now(), willRetry: false }; continue; }
      if (late) {
        state[platform] = { status: 'FAILED', error: 'Missed its time by more than 24 hours (publishing was paused or the server was down). Reschedule it or publish now.', attempts: 0, at: now(), willRetry: false };
        continue;
      }
      const errors = blockingErrors(view.warnings, platform);
      if (errors.length) { state[platform] = { status: 'FAILED', error: errors.map((e) => e.message).join(' '), attempts: prev.attempts, at: now(), willRetry: false }; continue; }
      const account = accounts.find((a) => a.platform === platform && a.autoPublish && a.status === 'CONNECTED')!;
      try {
        if (isOAuthPlatform(platform)) {
          const out = await this.platforms.publish(post, platform, account, prev, s.utm, absUrl);
          const r = out.result;
          if ('waiting' in r) {
            state[platform] = { status: 'WAITING', containerId: r.containerId, attempts: prev.attempts, at: prev.status === 'WAITING' ? prev.at : now(), nextAt: new Date(Date.now() + 60_000).toISOString(), error: null };
          } else if ('handoff' in r) {
            state[platform] = { status: 'HANDOFF', error: r.handoff, attempts: prev.attempts + 1, at: now() };
          } else if ('skipped' in r) {
            state[platform] = { status: 'SKIPPED', error: r.skipped, attempts: prev.attempts, at: now() };
          } else {
            state[platform] = {
              status: 'PUBLISHED', postId: r.postId, permalink: r.permalink ?? null, attempts: prev.attempts + 1, at: now(), error: null,
              ...(out.commentId ? { commentId: out.commentId } : {}), ...(out.commentError ? { commentError: out.commentError } : {}),
            };
          }
          continue;
        }
        const res = await this.publishOne(post, platform, account, prev, s.utm);
        if (res.waiting) {
          state[platform] = { status: 'WAITING', containerId: res.containerId, attempts: prev.attempts, at: prev.status === 'WAITING' ? prev.at : now(), nextAt: new Date(Date.now() + 60_000).toISOString(), error: null };
          continue;
        }
        const done: PlatformPublishState = { status: 'PUBLISHED', postId: res.postId, permalink: res.permalink ?? null, attempts: prev.attempts + 1, at: now(), error: null };
        if (post.firstComment?.trim() && res.postId) {
          try {
            const c = await this.graph.call<{ id?: string }>(account, { method: 'POST', path: `${res.postId}/comments`, body: { message: post.firstComment.trim() } });
            done.commentId = c?.id ?? null;
          } catch (e) {
            done.commentError = `The post is live, but the first comment failed: ${toSocialError(e).text}`;
          }
        }
        state[platform] = done;
      } catch (e) {
        const err = toSocialError(e);
        const attempts = prev.attempts + 1;
        const next = retryAt(attempts, retryable(err.kind as never));
        state[platform] = {
          status: 'FAILED', error: err.text, attempts, at: now(), willRetry: !!next, nextAt: next?.toISOString() ?? null,
          containerId: err.kind === 'media' ? null : prev.containerId ?? null,
        };
      }
    }

    const sum = summarize(platforms, state);
    const anyPublished = platforms.some((p) => state[p]?.status === 'PUBLISHED');
    await this.prisma.brandSocialPost.update({
      where: { id: post.id },
      data: {
        publishState: state as unknown as Prisma.InputJsonValue,
        status: sum.status,
        nextRunAt: sum.nextRunAt,
        ...(anyPublished && !post.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });
  }

  private input(post: BrandSocialPost, platform: BrandPlatform, utm: { medium: string; defaultCampaign: string }): PublishInput {
    const media = (Array.isArray(post.media) ? post.media : []) as unknown as PostMediaItem[];
    const kind = isKind(post.kind) ? post.kind : 'POST';
    const igKind = kind === 'STORY' ? 'STORY' : kind === 'REEL' || kind === 'VIDEO' ? 'REEL' : 'POST';
    const src = { code: post.code, caption: post.caption, captions: (post.captions ?? {}) as Partial<Record<BrandPlatform, string>>, hashtags: post.hashtags, link: post.link, campaign: post.campaign, media };
    const link = platform === 'FACEBOOK' && !media.length ? linkFor(src, platform, utm) : null;
    return {
      kind: platform === 'INSTAGRAM' ? igKind : kind,
      caption: textFor(src, platform, utm),
      media: media.map((m) => ({ url: absUrl(m.url), kind: m.kind === 'video' ? 'video' : 'image' })),
      link,
    };
  }

  private async publishOne(post: BrandSocialPost, platform: BrandPlatform, account: BrandSocialAccount, prev: PlatformPublishState, utm: { medium: string; defaultCampaign: string }): Promise<PublishResult> {
    if (platform === 'FACEBOOK') {
      const ids = await this.graph.runSteps(account, facebookPlan(account.externalId, this.input(post, platform, utm)));
      const postId = ids.post_post_id || ids.post;
      const link = await this.graph.call<{ permalink_url?: string }>(account, { path: postId, params: { fields: 'permalink_url' } }).catch(() => null);
      const permalink = link?.permalink_url ? (link.permalink_url.startsWith('http') ? link.permalink_url : `https://www.facebook.com${link.permalink_url}`) : null;
      return { postId, permalink };
    }
    const igUserId = account.externalId;
    let containerId = prev.status === 'WAITING' ? prev.containerId ?? null : null;
    if (!containerId) {
      const plan = instagramPlan(igUserId, this.input(post, platform, utm));
      if (!plan) throw new SocialGraphError('media', 'Instagram needs at least one image or video.');
      const ids = await this.graph.runSteps(account, plan.slice(0, -1));
      containerId = ids.container;
      if (plan[plan.length - 2]?.waitReady && !(await this.waitContainer(account, containerId, 6))) return { waiting: true, containerId };
      return this.igPublish(account, igUserId, containerId);
    }
    if (!(await this.waitContainer(account, containerId, 1))) {
      if (Date.now() - new Date(prev.at).getTime() > CONTAINER_WAIT_MS) throw new SocialGraphError('media', 'Instagram did not finish processing the video within an hour. Use an MP4, 3 to 90 seconds, 9:16.');
      return { waiting: true, containerId };
    }
    return this.igPublish(account, igUserId, containerId);
  }

  private async igPublish(account: BrandSocialAccount, igUserId: string, containerId: string): Promise<PublishResult> {
    const res = await this.graph.call<{ id: string }>(account, { method: 'POST', path: `${igUserId}/media_publish`, body: { creation_id: containerId } });
    const link = await this.graph.call<{ permalink?: string }>(account, { path: res.id, params: { fields: 'permalink' } }).catch(() => null);
    return { postId: res.id, permalink: link?.permalink ?? null };
  }

  /** true = ready, false = still processing. Throws when Instagram rejected the media. */
  private async waitContainer(account: BrandSocialAccount, id: string, tries: number): Promise<boolean> {
    for (let i = 0; i < tries; i++) {
      const r = await this.graph.call<{ status_code?: string; status?: string }>(account, { path: id, params: { fields: 'status_code,status' } });
      const st = containerState(r?.status_code);
      if (st === 'ready') return true;
      if (st === 'failed') throw new SocialGraphError('media', `Instagram rejected the media${r?.status ? ` (${r.status})` : ''}. Use an MP4, 3 to 90 seconds, 9:16.`);
      if (i < tries - 1) await sleep(5_000);
    }
    return false;
  }
}
