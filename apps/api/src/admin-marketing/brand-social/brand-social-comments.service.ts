/**
 * Nafaa Social comments inbox. Every 15 minutes a job reads recent comments
 * and replies on Nafaa's own live posts (published in the last 30 days) from
 * Facebook, Instagram, Threads and YouTube, and from X for posts under 7
 * days (recent search; skipped for a day when the X plan refuses reads).
 * New comments land as NEW; Nafaa's own replies are stored too and shown
 * under the comment they answer.
 *
 * Admin actions: reply, hide / unhide, delete (where the platform allows it,
 * see commentActions in brand-social-actions.logic.ts) and mark done. The job
 * respects the pause switch and DISABLE_BRAND_SOCIAL_JOBS / DISABLE_META_JOBS.
 */

import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BrandSocialAccount, BrandSocialComment, BrandSocialPost, Prisma } from '@prisma/client';
import { Cron } from '../../core/system-control/cron.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandSocialGraphService, SocialGraphError, toSocialError } from './brand-social-graph.service';
import { BrandSocialPlatformsService } from './brand-social-platforms.service';
import { BrandSocialSettingsService } from './brand-social-settings.service';
import { jobsDisabled } from './brand-social-publisher.service';
import { SocialActor } from './brand-social-posts.service';
import { RemoteComment } from './brand-social-adapter';
import { isOAuthPlatform } from './brand-social-oauth.logic';
import { isPlatform, PLATFORM_LABEL, platformFrom } from './brand-social.logic';
import { commentActions } from './brand-social-actions.logic';
import { INBOX_PLATFORMS, type BrandPlatform, type InboxQuery, type InboxResponse, type PostMediaItem, type PublishStateMap, type SocialCommentView } from './brand-social.types';

const DAY = 86_400_000;
const SOURCES_KEY = 'brand_social_inbox_sources';
/** Posts read per run (oldest check first). */
const POSTS_PER_RUN = 60;
/** X recent search covers 7 days; reads cost credits, so X posts are read at most hourly. */
const X_MAX_AGE_MS = 7 * DAY;
const X_EVERY_MS = 60 * 60_000;
/** After a plan refusal, X is not asked again for a day. */
const X_PLAN_BACKOFF_MS = DAY;

interface SourceState { ok: boolean; message: string | null; checkedAt: string | null; retryAfter?: string | null; lastRunAt?: string | null }
type Sources = Partial<Record<BrandPlatform, SourceState>>;

const stateOf = (p: Pick<BrandSocialPost, 'publishState'>): PublishStateMap =>
  p.publishState && typeof p.publishState === 'object' && !Array.isArray(p.publishState) ? (p.publishState as unknown as PublishStateMap) : {};

@Injectable()
export class BrandSocialCommentsService {
  private readonly logger = new Logger('BrandSocialComments');
  private running = false;
  private lastCheck = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: BrandSocialGraphService,
    private readonly platforms: BrandSocialPlatformsService,
    private readonly settings: BrandSocialSettingsService,
  ) {}

  /* ───────────────────────── source status ───────────────────────── */

  private async readSources(): Promise<Sources> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: SOURCES_KEY } }).catch(() => null);
    if (!row?.value) return {};
    try { const v = JSON.parse(row.value); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
  }

  private async writeSources(s: Sources) {
    const value = JSON.stringify(s);
    await this.prisma.systemSetting.upsert({
      where: { key: SOURCES_KEY },
      create: { key: SOURCES_KEY, value, category: 'brand_social', description: 'Nafaa Social: comments inbox read status per platform', isPublic: false },
      update: { value },
    }).catch((e) => this.logger.warn(`Save inbox sources: ${(e as Error).message}`));
  }

  /* ───────────────────────── job ───────────────────────── */

  @Cron('0 */15 * * * *')
  async poll() {
    if (this.running || jobsDisabled()) return;
    if (await this.settings.paused()) return;
    this.running = true;
    try {
      await this.sync();
    } catch (e) {
      this.logger.warn(`Inbox poll: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** Reads comments for live posts; returns how many comments were new. */
  async sync(onlyPostId?: string): Promise<number> {
    const accounts = await this.prisma.brandSocialAccount.findMany({ where: { status: 'CONNECTED', platform: { in: [...INBOX_PLATFORMS] }, accessTokenEnc: { not: null } } });
    if (!accounts.length) return 0;
    const posts = await this.prisma.brandSocialPost.findMany({
      where: onlyPostId ? { id: onlyPostId } : { publishedAt: { gte: new Date(Date.now() - 30 * DAY) }, status: { not: 'ARCHIVED' } },
      orderBy: { publishedAt: 'desc' },
      take: onlyPostId ? 1 : 200,
    });
    const sources = await this.readSources();
    const now = Date.now();
    const xDue = !sources.X?.lastRunAt || now - new Date(sources.X.lastRunAt).getTime() >= X_EVERY_MS || !!onlyPostId;
    const xBlocked = !!sources.X?.retryAfter && new Date(sources.X.retryAfter).getTime() > now;
    const touched = new Set<BrandPlatform>();
    let added = 0;
    let calls = 0;
    for (const post of posts) {
      const state = stateOf(post);
      for (const platform of INBOX_PLATFORMS) {
        const s = state[platform];
        if (s?.status !== 'PUBLISHED' || s.manual || !s.postId || s.deletedAt || !post.platforms.includes(platform)) continue;
        if (post.kind === 'STORY') continue;
        const account = accounts.find((a) => a.platform === platform);
        if (!account) continue;
        if (platform === 'X' && (!xDue || xBlocked || !post.publishedAt || now - post.publishedAt.getTime() > X_MAX_AGE_MS)) continue;
        if (calls >= POSTS_PER_RUN) break;
        calls++;
        touched.add(platform);
        try {
          const list = await this.fetch(platform, account, s.postId);
          added += await this.store(post.id, platform, s.postId, list);
          sources[platform] = { ...(sources[platform] ?? {}), ok: true, message: null, checkedAt: new Date().toISOString(), retryAfter: null };
        } catch (e) {
          const err = toSocialError(e);
          const planRefused = err.kind === 'plan' || (platform === 'X' && err.kind === 'permission');
          sources[platform] = {
            ok: false,
            message: platform === 'X' && planRefused ? `X did not allow reading replies on the current developer plan. ${err.text}` : err.text,
            checkedAt: new Date().toISOString(),
            retryAfter: platform === 'X' && planRefused ? new Date(now + X_PLAN_BACKOFF_MS).toISOString() : null,
          };
          if (err.kind === 'token' && isOAuthPlatform(platform)) await this.graph.markReconnect(account.id, err.text);
        }
      }
    }
    if (touched.has('X')) sources.X = { ...(sources.X as SourceState), lastRunAt: new Date().toISOString() };
    if (touched.size) await this.writeSources(sources);
    return added;
  }

  /** Comments of one platform post. */
  private async fetch(platform: BrandPlatform, account: BrandSocialAccount, postId: string): Promise<RemoteComment[]> {
    if (platform === 'FACEBOOK') {
      const r = await this.graph.call<{ data?: any[] }>(account, {
        path: `${postId}/comments`,
        params: { fields: 'id,message,from{id,name},created_time,is_hidden,permalink_url,parent{id}', filter: 'stream', order: 'reverse_chronological', limit: 100 },
      });
      return (r?.data ?? []).map((c: any): RemoteComment => ({
        id: String(c.id), parentId: c.parent?.id ? String(c.parent.id) : null, authorId: c.from?.id ? String(c.from.id) : null,
        authorName: c.from?.name ?? 'Facebook user', authorHandle: null, text: String(c.message ?? ''), permalink: c.permalink_url ?? null,
        at: c.created_time ? new Date(c.created_time).toISOString() : new Date().toISOString(),
        mine: !!c.from?.id && String(c.from.id) === account.externalId, hidden: !!c.is_hidden,
      }));
    }
    if (platform === 'INSTAGRAM') {
      const fields = 'id,text,username,timestamp,hidden,from{id,username}';
      const r = await this.graph.call<{ data?: any[] }>(account, { path: `${postId}/comments`, params: { fields: `${fields},replies{${fields}}`, limit: 50 } });
      const me = account.handle?.replace(/^@/, '').toLowerCase() ?? null;
      const one = (c: any, parentId: string | null): RemoteComment => ({
        id: String(c.id), parentId, authorId: c.from?.id ? String(c.from.id) : null, authorName: c.username ? `@${c.username}` : 'Instagram user',
        authorHandle: c.username ? `@${c.username}` : null, text: String(c.text ?? ''), permalink: null,
        at: c.timestamp ? new Date(c.timestamp).toISOString() : new Date().toISOString(),
        mine: (!!c.from?.id && String(c.from.id) === account.externalId) || (!!me && String(c.username ?? '').toLowerCase() === me), hidden: !!c.hidden,
      });
      const out: RemoteComment[] = [];
      for (const c of r?.data ?? []) {
        out.push(one(c, null));
        for (const rep of c.replies?.data ?? []) out.push(one(rep, String(c.id)));
      }
      return out;
    }
    if (!isOAuthPlatform(platform)) return [];
    const adapter = this.platforms.adapter(platform);
    if (!adapter.listComments) return [];
    const token = await this.platforms.accessToken(account);
    return adapter.listComments(token, { externalId: account.externalId, handle: account.handle }, postId);
  }

  /** Saves comments; text and hidden state follow the platform, the done flag stays Nafaa's. */
  private async store(postId: string, platform: BrandPlatform, objectId: string, list: RemoteComment[]): Promise<number> {
    if (!list.length) return 0;
    const existing = await this.prisma.brandSocialComment.findMany({ where: { platform, externalId: { in: list.map((c) => c.id) } }, select: { externalId: true } });
    const known = new Set(existing.map((e) => e.externalId));
    let added = 0;
    for (const c of list) {
      const base = {
        objectId, parentId: c.parentId, authorId: c.authorId, authorName: c.authorName.slice(0, 200), authorHandle: c.authorHandle?.slice(0, 200) ?? null,
        text: c.text.slice(0, 10_000), permalink: c.permalink, commentedAt: new Date(c.at), mine: c.mine, hidden: c.hidden,
      };
      if (known.has(c.id)) {
        await this.prisma.brandSocialComment.update({ where: { platform_externalId: { platform, externalId: c.id } }, data: base }).catch(() => null);
      } else {
        await this.prisma.brandSocialComment.create({
          data: { postId, platform, externalId: c.id, ...base, status: c.mine ? 'DONE' : 'NEW', ...(c.mine ? { doneAt: new Date() } : {}) },
        }).then(() => { if (!c.mine) added++; }).catch(() => null);
      }
    }
    // A reply from Nafaa's account answers its parent.
    const answered = list.filter((c) => c.mine && c.parentId).map((c) => c.parentId!);
    if (answered.length) {
      await this.prisma.brandSocialComment.updateMany({ where: { platform, externalId: { in: answered }, repliedAt: null }, data: { repliedAt: new Date() } }).catch(() => null);
    }
    return added;
  }

  /* ───────────────────────── reads ───────────────────────── */

  unread(): Promise<number> {
    return this.prisma.brandSocialComment.count({ where: { status: 'NEW', mine: false, deletedAt: null } });
  }

  async list(q: InboxQuery): Promise<InboxResponse> {
    const where: Prisma.BrandSocialCommentWhereInput = { mine: false };
    const status = String(q?.status ?? 'NEW').toUpperCase();
    if (status === 'NEW' || status === 'DONE') where.status = status;
    if (status === 'HIDDEN') where.hidden = true;
    if (status !== 'DELETED') where.deletedAt = null; else where.deletedAt = { not: null };
    const platform = platformFrom(q?.platform);
    if (platform) where.platform = platform;
    if (q?.postId) where.postId = q.postId;
    const search = String(q?.search ?? '').trim();
    if (search) where.OR = [{ text: { contains: search, mode: 'insensitive' } }, { authorName: { contains: search, mode: 'insensitive' } }, { authorHandle: { contains: search, mode: 'insensitive' } }];
    const [rows, unread, sources, accounts] = await Promise.all([
      this.prisma.brandSocialComment.findMany({ where, orderBy: { commentedAt: 'desc' }, take: 300, include: { post: { select: { id: true, title: true, code: true, media: true, publishState: true } } } }),
      this.unread(),
      this.readSources(),
      this.prisma.brandSocialAccount.findMany({ where: { platform: { in: [...INBOX_PLATFORMS] }, status: { not: 'DISCONNECTED' } } }),
    ]);
    const replies = rows.length
      ? await this.prisma.brandSocialComment.findMany({
          where: { mine: true, deletedAt: null, OR: rows.map((r) => ({ platform: r.platform, parentId: r.externalId })) },
          orderBy: { commentedAt: 'asc' }, select: { id: true, platform: true, parentId: true, text: true, commentedAt: true },
        })
      : [];
    const connected = new Set(accounts.filter((a) => a.status === 'CONNECTED').map((a) => a.platform));
    return {
      comments: rows.map((r) => this.view(r, r.post, accounts, replies.filter((x) => x.platform === r.platform && x.parentId === r.externalId))),
      unread,
      sources: INBOX_PLATFORMS.filter((p) => connected.has(p)).map((p) => ({
        platform: p, ok: sources[p]?.ok ?? true, message: sources[p]?.message ?? null, checkedAt: sources[p]?.checkedAt ?? null,
      })),
    };
  }

  private view(
    r: BrandSocialComment, post: { id: string; title: string; code: string; media: unknown; publishState: unknown },
    accounts: BrandSocialAccount[], replies: Array<{ id: string; text: string; commentedAt: Date }>,
  ): SocialCommentView {
    const platform = (isPlatform(r.platform) ? r.platform : 'FACEBOOK') as BrandPlatform;
    const media = (Array.isArray(post.media) ? post.media : []) as PostMediaItem[];
    const state = (post.publishState ?? {}) as PublishStateMap;
    const account = accounts.find((a) => a.platform === platform && a.status === 'CONNECTED') ?? null;
    const can = r.deletedAt ? { reply: false, hide: false, delete: false, reason: 'Deleted.' } : commentActions(platform, account, r.mine);
    return {
      id: r.id, platform,
      post: { id: post.id, title: post.title, code: post.code, permalink: state[platform]?.permalink ?? null, thumbUrl: media[0]?.thumbUrl ?? (media[0]?.kind === 'image' ? media[0].url : null) },
      externalId: r.externalId, parentId: r.parentId,
      author: { name: r.authorName, handle: r.authorHandle },
      text: r.text, permalink: r.permalink ?? state[platform]?.permalink ?? null, commentedAt: r.commentedAt.toISOString(),
      mine: r.mine, hidden: r.hidden, status: r.status === 'DONE' ? 'DONE' : 'NEW', repliedAt: r.repliedAt?.toISOString() ?? null, deletedAt: r.deletedAt?.toISOString() ?? null,
      replies: replies.map((x) => ({ id: x.id, text: x.text, commentedAt: x.commentedAt.toISOString() })),
      can,
    };
  }

  /* ───────────────────────── actions ───────────────────────── */

  private async row(id: string) {
    const r = await this.prisma.brandSocialComment.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Comment not found.');
    if (r.deletedAt) throw new BadRequestException('This comment was deleted.');
    const platform = r.platform as BrandPlatform;
    const account = await this.prisma.brandSocialAccount.findFirst({ where: { platform, status: 'CONNECTED' } });
    return { r, platform, account, can: commentActions(platform, account, r.mine) };
  }

  private async act<T>(platform: BrandPlatform, account: BrandSocialAccount, fn: (token: string | null) => Promise<T>): Promise<T> {
    try {
      const token = isOAuthPlatform(platform) ? await this.platforms.accessToken(account) : null;
      return await fn(token);
    } catch (e) {
      throw new BadRequestException(toSocialError(e).text);
    }
  }

  private async one(id: string): Promise<SocialCommentView> {
    const r = await this.prisma.brandSocialComment.findUnique({ where: { id }, include: { post: { select: { id: true, title: true, code: true, media: true, publishState: true } } } });
    if (!r) throw new NotFoundException('Comment not found.');
    const accounts = await this.prisma.brandSocialAccount.findMany({ where: { platform: r.platform } });
    const replies = await this.prisma.brandSocialComment.findMany({ where: { platform: r.platform, parentId: r.externalId, mine: true, deletedAt: null }, orderBy: { commentedAt: 'asc' } });
    return this.view(r, r.post, accounts, replies);
  }

  /** Replies from Nafaa's account; the comment is then marked done. */
  async reply(id: string, text: unknown, actor: SocialActor): Promise<SocialCommentView> {
    const body = String(text ?? '').trim();
    if (!body) throw new BadRequestException('Write a reply first.');
    const { r, platform, account, can } = await this.row(id);
    if (!account || !can.reply) throw new BadRequestException(can.reason ?? `Replying on ${PLATFORM_LABEL[platform]} is not possible from Nafaa.`);
    if (platform === 'X' && [...body].length > 280) throw new BadRequestException('An X reply can be at most 280 characters.');
    if (platform === 'THREADS' && [...body].length > 500) throw new BadRequestException('A Threads reply can be at most 500 characters.');
    // Instagram and YouTube reply only to top-level comments.
    const target = (platform === 'INSTAGRAM' || platform === 'YOUTUBE') && r.parentId ? r.parentId : r.externalId;
    const newId = await this.act(platform, account, async (token) => {
      if (platform === 'FACEBOOK') return (await this.graph.call<{ id?: string }>(account, { method: 'POST', path: `${target}/comments`, body: { message: body } }))?.id ?? null;
      if (platform === 'INSTAGRAM') return (await this.graph.call<{ id?: string }>(account, { method: 'POST', path: `${target}/replies`, body: { message: body } }))?.id ?? null;
      const adapter = isOAuthPlatform(platform) ? this.platforms.adapter(platform) : null;
      if (!adapter?.replyComment || !token) throw new SocialGraphError('unknown', `Replying on ${PLATFORM_LABEL[platform]} is not possible from Nafaa.`);
      return adapter.replyComment(token, { externalId: account.externalId, handle: account.handle }, r.objectId, target, body);
    });
    const now = new Date();
    if (newId) {
      await this.prisma.brandSocialComment.upsert({
        where: { platform_externalId: { platform, externalId: newId } },
        create: {
          postId: r.postId, platform, externalId: newId, objectId: r.objectId, parentId: r.externalId, authorName: account.name, authorHandle: account.handle,
          text: body, commentedAt: now, mine: true, status: 'DONE', doneAt: now, doneById: actor.id,
        },
        update: {},
      }).catch(() => null);
    }
    await this.prisma.brandSocialComment.update({ where: { id }, data: { repliedAt: now, status: 'DONE', doneAt: now, doneById: actor.id } });
    return this.one(id);
  }

  async hide(id: string, hidden: unknown): Promise<SocialCommentView> {
    if (typeof hidden !== 'boolean') throw new BadRequestException('Say whether to hide or show the comment.');
    const { r, platform, account, can } = await this.row(id);
    if (!account || !can.hide) throw new BadRequestException(can.reason ?? `Hiding comments on ${PLATFORM_LABEL[platform]} is not possible from Nafaa.`);
    await this.act(platform, account, async (token) => {
      if (platform === 'FACEBOOK') { await this.graph.call(account, { method: 'POST', path: r.externalId, body: { is_hidden: hidden } }); return; }
      if (platform === 'INSTAGRAM') { await this.graph.call(account, { method: 'POST', path: r.externalId, body: { hide: hidden } }); return; }
      const adapter = isOAuthPlatform(platform) ? this.platforms.adapter(platform) : null;
      if (!adapter?.hideComment || !token) throw new SocialGraphError('unknown', `Hiding comments on ${PLATFORM_LABEL[platform]} is not possible from Nafaa.`);
      await adapter.hideComment(token, r.externalId, hidden);
    });
    await this.prisma.brandSocialComment.update({ where: { id }, data: { hidden } });
    return this.one(id);
  }

  async remove(id: string, actor: SocialActor): Promise<SocialCommentView> {
    const { r, platform, account, can } = await this.row(id);
    if (!account || !can.delete) throw new BadRequestException(can.reason ?? `Deleting comments on ${PLATFORM_LABEL[platform]} is not possible from Nafaa.`);
    await this.act(platform, account, async (token) => {
      if (platform === 'FACEBOOK' || platform === 'INSTAGRAM') { await this.graph.call(account, { method: 'DELETE', path: r.externalId }); return; }
      const adapter = isOAuthPlatform(platform) ? this.platforms.adapter(platform) : null;
      if (!adapter?.deleteComment || !token) throw new SocialGraphError('unknown', `Deleting comments on ${PLATFORM_LABEL[platform]} is not possible from Nafaa.`);
      await adapter.deleteComment(token, r.externalId);
    });
    const now = new Date();
    await this.prisma.brandSocialComment.update({ where: { id }, data: { deletedAt: now, status: 'DONE', doneAt: r.doneAt ?? now, doneById: r.doneById ?? actor.id } });
    return this.one(id);
  }

  async done(id: string, done: unknown, actor: SocialActor): Promise<SocialCommentView> {
    if (typeof done !== 'boolean') throw new BadRequestException('Say whether the comment is done.');
    const r = await this.prisma.brandSocialComment.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Comment not found.');
    await this.prisma.brandSocialComment.update({ where: { id }, data: done ? { status: 'DONE', doneAt: new Date(), doneById: actor.id } : { status: 'NEW', doneAt: null, doneById: null } });
    return this.one(id);
  }

  /** Marks many comments done at once (the "Mark all done" button). */
  async doneMany(ids: unknown, actor: SocialActor): Promise<{ count: number }> {
    const list = (Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === 'string').slice(0, 500);
    if (!list.length) return { count: 0 };
    const r = await this.prisma.brandSocialComment.updateMany({ where: { id: { in: list }, status: 'NEW' }, data: { status: 'DONE', doneAt: new Date(), doneById: actor.id } });
    return { count: r.count };
  }

  /** "Check now": reads one post's comments now (or all, with the normal limits). */
  async checkNow(postId?: string): Promise<{ added: number }> {
    if (this.running) throw new BadRequestException('The inbox is being read right now. Try again in a minute.');
    if (Date.now() - this.lastCheck < 60_000) throw new HttpException('The inbox was checked a moment ago. Try again in a minute.', HttpStatus.TOO_MANY_REQUESTS);
    this.lastCheck = Date.now();
    this.running = true;
    try {
      return { added: await this.sync(postId) };
    } finally {
      this.running = false;
    }
  }
}
