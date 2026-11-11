/**
 * Auto-publishing from the Social studio to the connected Facebook page and
 * Instagram account.
 *
 * A post publishes when it has autoPublish on, a time that has come, and the
 * shop's Meta connection is live with auto-publish on. Each platform keeps
 * its own state in social_posts.publishState: PUBLISHING → PUBLISHED (post id
 * + permalink) or FAILED (plain reason). Transient failures retry 3 times
 * (5, 15, 60 minutes); Instagram videos wait for processing between runs.
 * When every platform of the post is published, the post becomes POSTED with
 * its links, like a post the merchant marked by hand.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '../../core/system-control/cron.decorator';
import { Prisma, SocialPost } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { apiMessage, apiText } from '../../common/i18n/api-message';
import { tagLink } from '../../modules/growth/social/social-math';
import { GraphStep, PublishInput, containerState, facebookPlan, instagramPlan, publishCaption, resolveRefs, retryable } from './meta-graph';
import { MetaGraphError, MetaGraphService, metaFail } from './meta-graph.service';
import { metaAccess } from './meta-access';

export const META_PLATFORMS = ['FACEBOOK', 'INSTAGRAM'] as const;
export type MetaPlatform = (typeof META_PLATFORMS)[number];
const isMetaPlatform = (p: string): p is MetaPlatform => (META_PLATFORMS as readonly string[]).includes(p);

export interface PlatformState {
  status: 'PUBLISHING' | 'WAITING' | 'PUBLISHED' | 'FAILED';
  postId?: string | null;
  permalink?: string | null;
  /** Instagram container waiting for video processing. */
  containerId?: string | null;
  error?: string | null;
  /** True when another try will happen on its own. */
  willRetry?: boolean;
  attempts: number;
  at: string;
  nextAt?: string | null;
}
export type PublishState = Partial<Record<MetaPlatform, PlatformState>>;

const RETRY_MINUTES = [5, 15, 60];
const MAX_ATTEMPTS = 3;
const STUCK_MS = 10 * 60_000;

const apiOrigin = () => { try { return new URL(process.env.PUBLIC_API_URL || process.env.API_URL || 'https://api.nafaa.pk/api').origin; } catch { return 'https://api.nafaa.pk'; } };
const absUrl = (u: string) => (/^https?:\/\//.test(u) ? u : u.startsWith('/') ? `${apiOrigin()}${u}` : u);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class MetaPublishService {
  private readonly logger = new Logger('MetaPublish');
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphService,
    private readonly notifications: NotificationsService,
  ) {}

  /** What the studio needs: live or not, which page / Instagram, auto-publish setting. */
  async studioStatus(user: AuthenticatedUser) {
    const [access, conn] = await Promise.all([metaAccess(this.prisma, user.tenantId), this.graph.connection(user.tenantId)]);
    const page = this.graph.pages(conn).find((p) => p.id === conn?.pageId);
    const connected = !!conn && conn.status === 'CONNECTED';
    return {
      live: access.live,
      reason: access.reason,
      connected,
      needsReconnect: !!conn && conn.status !== 'CONNECTED' && conn.status !== 'DISCONNECTED',
      autoPublish: !!conn?.autoPublish,
      platforms: {
        FACEBOOK: connected && !!conn?.pageId ? { name: page?.name ?? null } : null,
        INSTAGRAM: connected && !!conn?.igUserId ? { name: page?.igUsername ? `@${page.igUsername}` : null } : null,
      },
    };
  }

  /** "Abhi post karein" from the studio: publishes now to the chosen (or all) Meta platforms of the post. */
  async publishNow(user: AuthenticatedUser, id: string, body: { platforms?: string[] }) {
    const post = await this.prisma.socialPost.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!post) throw new NotFoundException('Post nahi mili');
    const access = await metaAccess(this.prisma, user.tenantId);
    if (!access.live) throw metaFail('not_connected', apiText('Facebook & Instagram par khud post abhi chalu nahi'));
    const wanted = (body?.platforms?.length ? body.platforms : post.platforms).filter(isMetaPlatform);
    if (!wanted.length) throw metaFail('invalid', apiText('Is post me Facebook ya Instagram chuna nahi'));
    // A manual run resets failed platforms so they try again now.
    const state = this.state(post);
    for (const p of wanted) if (state[p]?.status === 'FAILED') state[p] = { ...state[p]!, attempts: 0, nextAt: null };
    await this.prisma.socialPost.update({ where: { id: post.id }, data: { publishState: state as unknown as Prisma.InputJsonValue } });
    const fresh = await this.prisma.socialPost.findUniqueOrThrow({ where: { id: post.id } });
    await this.run(fresh, wanted, { manual: true });
    const after = await this.prisma.socialPost.findUniqueOrThrow({ where: { id: post.id } });
    return { status: after.status, publishState: this.state(after), postUrls: (after.postUrls as Record<string, string> | null) ?? {} };
  }

  /** Every minute: due auto-publish posts and retries / video checks that are due. */
  @Cron('40 * * * * *')
  async tick() {
    if (this.running || process.env.DISABLE_META_JOBS === '1') return;
    this.running = true;
    try {
      const now = new Date();
      const rows = await this.prisma.socialPost.findMany({
        where: {
          autoPublish: true, status: { in: ['DRAFT', 'READY'] },
          scheduledAt: { lte: now, gte: new Date(now.getTime() - 3 * 86_400_000) },
          platforms: { hasSome: [...META_PLATFORMS] },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 50,
      });
      const ok = new Map<string, boolean>();
      for (const post of rows) {
        if (!ok.has(post.tenantId)) {
          const [access, conn] = await Promise.all([metaAccess(this.prisma, post.tenantId), this.graph.connection(post.tenantId)]);
          ok.set(post.tenantId, access.live && !!conn && conn.status === 'CONNECTED' && conn.autoPublish);
        }
        if (!ok.get(post.tenantId)) continue;
        const state = this.state(post);
        const due = post.platforms.filter(isMetaPlatform).filter((p) => {
          const s = state[p];
          if (!s) return true;
          if (s.status === 'PUBLISHED') return false;
          if (s.status === 'PUBLISHING') return now.getTime() - new Date(s.at).getTime() > STUCK_MS;
          if (s.status === 'FAILED' && !s.willRetry) return false;
          return !s.nextAt || new Date(s.nextAt) <= now;
        });
        if (due.length) await this.run(post, due, { manual: false }).catch((e) => this.logger.warn(`Publish ${post.id}: ${(e as Error).message}`));
      }
    } catch (e) {
      this.logger.warn(`Publish tick: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  state(post: Pick<SocialPost, 'publishState'>): PublishState {
    return post.publishState && typeof post.publishState === 'object' && !Array.isArray(post.publishState) ? { ...(post.publishState as unknown as PublishState) } : {};
  }

  /** Claims the post (optimistic lock on updatedAt) and publishes each platform in turn. */
  private async run(post: SocialPost, platforms: MetaPlatform[], o: { manual: boolean }) {
    const state = this.state(post);
    const at = new Date().toISOString();
    for (const p of platforms) state[p] = { ...(state[p] ?? { attempts: 0 }), status: state[p]?.status === 'WAITING' ? 'WAITING' : 'PUBLISHING', at, attempts: state[p]?.attempts ?? 0 };
    const claimed = await this.prisma.socialPost.updateMany({ where: { id: post.id, updatedAt: post.updatedAt }, data: { publishState: state as unknown as Prisma.InputJsonValue } });
    if (!claimed.count) return;

    const conn = await this.graph.connection(post.tenantId);
    for (const p of platforms) {
      const prev = state[p]!;
      try {
        const res = await this.publishOne(post, p, conn?.pageId ?? null, conn?.igUserId ?? null, prev);
        state[p] = res.waiting
          ? { status: 'WAITING', containerId: res.containerId, attempts: prev.attempts, at: new Date().toISOString(), nextAt: new Date(Date.now() + 60_000).toISOString(), error: null }
          : { status: 'PUBLISHED', postId: res.postId, permalink: res.permalink, attempts: prev.attempts + 1, at: new Date().toISOString(), error: null };
      } catch (e) {
        const err = e instanceof MetaGraphError ? e : metaFail('unknown', apiText('Post nahi hui — dobara koshish karein'));
        const attempts = prev.attempts + 1;
        const again = retryable(err.kind as any) && attempts < MAX_ATTEMPTS;
        state[p] = {
          status: 'FAILED', error: err.friendly, attempts, at: new Date().toISOString(), willRetry: again,
          nextAt: again ? new Date(Date.now() + RETRY_MINUTES[attempts - 1] * 60_000).toISOString() : null,
          containerId: prev.containerId ?? null,
        };
        if (!again) await this.notifyFailure(post, p, err.friendly, o.manual);
      }
    }

    const urls: Record<string, string> = { ...((post.postUrls as Record<string, string> | null) ?? {}) };
    for (const p of META_PLATFORMS) if (state[p]?.status === 'PUBLISHED' && state[p]!.permalink) urls[p] = state[p]!.permalink!;
    // POSTED once every platform of the post is published (other platforms are posted by hand and marked there).
    const allDone = post.platforms.length > 0 && post.platforms.every((p) => isMetaPlatform(p) && state[p]?.status === 'PUBLISHED');
    await this.prisma.socialPost.update({
      where: { id: post.id },
      data: {
        publishState: state as unknown as Prisma.InputJsonValue,
        postUrls: Object.keys(urls).length ? urls : Prisma.DbNull,
        ...(allDone ? { status: 'POSTED', postedAt: post.postedAt ?? new Date() } : {}),
      },
    });
  }

  private input(post: SocialPost, platform: MetaPlatform): PublishInput {
    const media = (Array.isArray(post.media) ? post.media : []) as Array<{ url: string; kind: 'image' | 'video' }>;
    const links = (Array.isArray(post.links) ? post.links : []) as Array<{ url: string }>;
    const link = links[0]?.url ? tagLink(links[0].url, { platform, code: post.code, campaign: post.festivalKey || post.title }) : null;
    let caption = publishCaption(post.caption, post.hashtags);
    // Links are clickable on Facebook only; with media, the first product link goes under the caption.
    if (platform === 'FACEBOOK' && link && media.length) caption = `${caption}\n\n${link}`.trim();
    return { kind: post.kind, caption, media: media.map((m) => ({ url: absUrl(m.url), kind: m.kind === 'video' ? 'video' : 'image' })), link: platform === 'FACEBOOK' ? link : null };
  }

  private async publishOne(post: SocialPost, platform: MetaPlatform, pageId: string | null, igUserId: string | null, prev: PlatformState): Promise<{ postId?: string; permalink?: string | null; waiting?: boolean; containerId?: string }> {
    const tenantId = post.tenantId;
    if (platform === 'FACEBOOK') {
      if (!pageId) throw metaFail('permission', apiText('Facebook page chuna nahi — Settings → Facebook & Instagram me page chunein'));
      const token = `page:${pageId}` as const;
      const ids = await this.runSteps(tenantId, facebookPlan(pageId, this.input(post, platform)), token);
      const postId = ids.post_post_id || ids.post;
      const link = await this.graph.call<{ permalink_url?: string }>(tenantId, { path: postId, params: { fields: 'permalink_url' }, token }).catch(() => null);
      const permalink = link?.permalink_url ? (link.permalink_url.startsWith('http') ? link.permalink_url : `https://www.facebook.com${link.permalink_url}`) : null;
      return { postId, permalink };
    }
    if (!igUserId) throw metaFail('permission', apiText('Is Facebook page ke saath Instagram business account jura nahi — Instagram ko page se joren'));
    const token = pageId ? (`page:${pageId}` as const) : 'user';
    let containerId = prev.status === 'WAITING' || prev.containerId ? prev.containerId ?? null : null;
    if (!containerId) {
      const plan = instagramPlan(igUserId, this.input(post, platform));
      if (!plan) throw metaFail('media', apiText('Instagram par post ke liye kam az kam ek tasveer ya video chahiye'));
      const publishStep = plan[plan.length - 1];
      const ids = await this.runSteps(tenantId, plan.slice(0, -1), token);
      containerId = ids.container;
      const wait = plan[plan.length - 2]?.waitReady;
      if (wait && !(await this.waitContainer(tenantId, containerId, token, 10))) return { waiting: true, containerId };
      return this.igPublish(tenantId, publishStep.path, containerId, token);
    }
    // A container from an earlier run: publish when processed.
    if (!(await this.waitContainer(tenantId, containerId, token, 1))) {
      if (Date.now() - new Date(prev.at).getTime() > 60 * 60_000) throw metaFail('media', apiText('Instagram ne video ek ghante me tayyar nahi ki — chhoti video (MP4, 3–90 second) lagayein'));
      return { waiting: true, containerId };
    }
    return this.igPublish(tenantId, `${igUserId}/media_publish`, containerId, token);
  }

  private async igPublish(tenantId: string, path: string, containerId: string, token: 'user' | `page:${string}`) {
    const res = await this.graph.call<{ id: string }>(tenantId, { method: 'POST', path, body: { creation_id: containerId }, token });
    const link = await this.graph.call<{ permalink?: string }>(tenantId, { path: res.id, params: { fields: 'permalink' }, token }).catch(() => null);
    return { postId: res.id, permalink: link?.permalink ?? null };
  }

  /** true = ready, false = still processing. Throws when Instagram rejected the media. */
  private async waitContainer(tenantId: string, id: string, token: 'user' | `page:${string}`, tries: number): Promise<boolean> {
    for (let i = 0; i < tries; i++) {
      const r = await this.graph.call<{ status_code?: string; status?: string }>(tenantId, { path: id, params: { fields: 'status_code,status' }, token });
      const s = containerState(r?.status_code);
      if (s === 'ready') return true;
      if (s === 'failed') throw metaFail('media', `Instagram ne video nahi li${r?.status ? ` (${r.status})` : ''} — MP4, 3–90 second, 9:16 lagayein`);
      if (i < tries - 1) await sleep(5_000);
    }
    return false;
  }

  /** Runs plan steps in order; each step's id is saved under its ref (and photo post ids under `<ref>_post_id`). */
  private async runSteps(tenantId: string, steps: GraphStep[], token: 'user' | `page:${string}`): Promise<Record<string, string>> {
    const ids: Record<string, string> = {};
    for (const s of steps) {
      const res = await this.graph.call<{ id?: string; post_id?: string }>(tenantId, { method: s.method, path: s.path, body: resolveRefs(s.body, ids), token });
      if (!res?.id) throw metaFail('unknown', apiText('Facebook ne post ka number nahi diya — dobara koshish karein'));
      ids[s.ref] = res.id;
      if (res.post_id) ids[`${s.ref}_post_id`] = res.post_id;
    }
    return ids;
  }

  private async notifyFailure(post: SocialPost, platform: MetaPlatform, reason: string, manual: boolean) {
    if (manual) return; // The merchant sees the reason on screen.
    const what = post.title || post.caption.split('\n')[0].slice(0, 60) || 'Social post';
    await this.notifications.create({
      tenantId: post.tenantId,
      userId: post.assignedToId ?? post.createdById ?? undefined,
      type: 'WARNING',
      title: apiMessage('{{platform}} par post nahi hui', { platform: platform === 'FACEBOOK' ? 'Facebook' : 'Instagram' }),
      message: apiMessage('{{what}}: {{reason}}', { what, reason }),
      link: `/online-store/social?post=${post.id}`,
      metadata: { kind: 'SOCIAL_POST', postId: post.id },
    }).catch(() => null);
  }
}
