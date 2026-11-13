/**
 * Nafaa Social posts: list and calendar reads, create / edit / duplicate /
 * archive, the review flow (submit, approve, reject), scheduling and bulk
 * actions. Status moves follow TRANSITIONS in brand-social.logic.ts. Every
 * post read carries its per-platform warnings, final texts and tagged links.
 * Publishing itself lives in BrandSocialPublisherService.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BrandSocialPost, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandSocialSettingsService } from './brand-social-settings.service';
import {
  approvedStatus, blockingErrors, canTransition, cleanHashtags, EDITABLE, isKind, isPlatform, isStatus, linkFor, newPostCode,
  parsePktDateTime, platformFrom, statusAfterEdit, textFor, validatePost,
} from './brand-social.logic';
import type {
  BrandPlatform, BrandPostKind, BrandPostStatus, BrandPostView, BulkInput, BulkResponse, PostInput, PostListQuery, PostMediaItem,
  PostMetricView, PublishStateMap, BrandSocialSettings,
} from './brand-social.types';

/** Who is acting: an admin user, or an automation key ("key:<id>"). */
export interface SocialActor { id: string; automation?: boolean }

const CONTENT_FIELDS = ['title', 'kind', 'caption', 'captions', 'hashtags', 'firstComment', 'link', 'media', 'platforms'] as const;
const LOCKED: readonly BrandPostStatus[] = ['PUBLISHING', 'PUBLISHED', 'PARTIAL', 'ARCHIVED'];
const PAST_GRACE_MS = 60_000;

const asObj = <T>(v: unknown, fallback: T): T => (v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : fallback);
const asArr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

@Injectable()
export class BrandSocialPostsService {
  constructor(private readonly prisma: PrismaService, private readonly settings: BrandSocialSettingsService) {}

  /* ───────────────────────── views ───────────────────────── */

  async views(rows: BrandSocialPost[], withMetrics = true): Promise<BrandPostView[]> {
    if (!rows.length) return [];
    const s = await this.settings.get();
    const userIds = new Set<string>();
    for (const r of rows) for (const id of [r.createdById, r.approvedById, r.rejectedById]) if (id && !id.startsWith('key:')) userIds.add(id);
    const [users, keyNames, metrics] = await Promise.all([
      userIds.size ? this.prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, fullName: true } }) : Promise.resolve([]),
      rows.some((r) => [r.createdById, r.approvedById].some((x) => x?.startsWith('key:'))) ? this.settings.keyNames() : Promise.resolve(new Map<string, string>()),
      withMetrics ? this.latestMetrics(rows.filter((r) => r.publishedAt).map((r) => r.id)) : Promise.resolve(new Map<string, Partial<Record<BrandPlatform, PostMetricView>>>()),
    ]);
    const names = new Map(users.map((u) => [u.id, u.fullName]));
    const person = (id: string | null) => {
      if (!id) return null;
      if (id.startsWith('key:')) return { id, name: `${keyNames.get(id.slice(4)) ?? 'Automation'} (automation)` };
      return { id, name: names.get(id) ?? 'Admin' };
    };
    return rows.map((r) => this.view(r, s, person, metrics.get(r.id)));
  }

  private view(
    r: BrandSocialPost, s: BrandSocialSettings, person: (id: string | null) => { id: string; name: string } | null,
    metrics?: Partial<Record<BrandPlatform, PostMetricView>>,
  ): BrandPostView {
    const platforms = r.platforms.filter(isPlatform);
    const media = asArr<PostMediaItem>(r.media);
    const captions = asObj<Partial<Record<BrandPlatform, string>>>(r.captions, {});
    const src = { code: r.code, caption: r.caption, captions, hashtags: r.hashtags, link: r.link, campaign: r.campaign, media };
    const texts: BrandPostView['texts'] = {};
    const links: BrandPostView['links'] = {};
    for (const p of platforms) {
      texts[p] = textFor(src, p, s.utm);
      const l = linkFor(src, p, s.utm);
      if (l) links[p] = l;
    }
    return {
      id: r.id,
      code: r.code,
      title: r.title,
      kind: (isKind(r.kind) ? r.kind : 'POST') as BrandPostKind,
      pillar: r.pillar,
      campaign: r.campaign,
      caption: r.caption,
      captions,
      hashtags: r.hashtags,
      firstComment: r.firstComment,
      link: r.link,
      media,
      platforms,
      scheduledAt: r.scheduledAt?.toISOString() ?? null,
      status: (isStatus(r.status) ? r.status : 'DRAFT') as BrandPostStatus,
      publishState: asObj<PublishStateMap>(r.publishState, {}),
      publishedAt: r.publishedAt?.toISOString() ?? null,
      approvedBy: person(r.approvedById),
      approvedAt: r.approvedAt?.toISOString() ?? null,
      rejectedBy: person(r.rejectedById),
      rejectReason: r.rejectReason,
      aiMade: r.aiMade,
      notes: r.notes,
      createdBy: person(r.createdById),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      warnings: validatePost({ ...src, kind: (isKind(r.kind) ? r.kind : 'POST'), platforms, media, firstComment: r.firstComment }, s.utm),
      texts,
      links,
      ...(metrics ? { metrics } : {}),
    };
  }

  /** The newest metrics row per post and platform. */
  async latestMetrics(postIds: string[]): Promise<Map<string, Partial<Record<BrandPlatform, PostMetricView>>>> {
    const out = new Map<string, Partial<Record<BrandPlatform, PostMetricView>>>();
    if (!postIds.length) return out;
    const rows = await this.prisma.brandSocialPostMetric.findMany({
      where: { postId: { in: postIds } }, orderBy: { day: 'desc' }, distinct: ['postId', 'platform'],
    });
    for (const m of rows) {
      if (!isPlatform(m.platform)) continue;
      const cur = out.get(m.postId) ?? {};
      cur[m.platform] = {
        reach: m.reach, impressions: m.impressions, likes: m.likes, comments: m.comments, shares: m.shares,
        saves: m.saves, plays: m.plays, clicks: m.clicks, engagement: m.engagement, fetchedAt: m.fetchedAt.toISOString(),
      };
      out.set(m.postId, cur);
    }
    return out;
  }

  async row(id: string): Promise<BrandSocialPost> {
    const r = await this.prisma.brandSocialPost.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Post not found.');
    return r;
  }

  async one(id: string): Promise<BrandPostView> {
    return (await this.views([await this.row(id)]))[0];
  }

  /* ───────────────────────── list ───────────────────────── */

  async list(q: PostListQuery) {
    const where: Prisma.BrandSocialPostWhereInput = {};
    const and: Prisma.BrandSocialPostWhereInput[] = [];
    const statuses = String(q?.status ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(isStatus);
    where.status = statuses.length ? { in: statuses } : { not: 'ARCHIVED' };
    const from = q?.from ? parsePktDateTime(/^\d{4}-\d{2}-\d{2}$/.test(q.from) ? `${q.from}T00:00` : q.from) : null;
    const to = q?.to ? parsePktDateTime(/^\d{4}-\d{2}-\d{2}$/.test(q.to) ? `${q.to}T23:59:59` : q.to) : null;
    if (q?.unscheduled === '1') where.scheduledAt = null;
    else if (from || to) {
      const range = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
      and.push({ OR: [{ scheduledAt: range }, { scheduledAt: null, publishedAt: range }] });
    }
    const platform = platformFrom(q?.platform);
    if (platform) where.platforms = { has: platform };
    if (q?.pillar) where.pillar = q.pillar;
    if (q?.campaign) where.campaign = q.campaign;
    const search = String(q?.search ?? '').trim();
    if (search) {
      and.push({ OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { caption: { contains: search, mode: 'insensitive' } },
        { code: { equals: search.toLowerCase() } },
        { notes: { contains: search, mode: 'insensitive' } },
      ] });
    }
    if (and.length) where.AND = and;
    const [rows, total] = await Promise.all([
      this.prisma.brandSocialPost.findMany({ where, orderBy: [{ scheduledAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }], take: 1000 }),
      this.prisma.brandSocialPost.count({ where }),
    ]);
    return { posts: await this.views(rows), total };
  }

  /* ───────────────────────── input ───────────────────────── */

  private async platformsFrom(list: unknown): Promise<BrandPlatform[]> {
    const raw = asArr<unknown>(list).filter((x): x is string => typeof x === 'string').slice(0, 20);
    const out = new Set<BrandPlatform>();
    const ids: string[] = [];
    for (const x of raw) {
      const p = platformFrom(x);
      if (p) out.add(p); else ids.push(x);
    }
    if (ids.length) {
      const accounts = await this.prisma.brandSocialAccount.findMany({ where: { id: { in: ids } }, select: { platform: true } });
      for (const a of accounts) if (isPlatform(a.platform)) out.add(a.platform);
    }
    return [...out];
  }

  private async mediaFrom(list: unknown): Promise<PostMediaItem[]> {
    const raw = asArr<Record<string, unknown>>(list).filter((m) => m && typeof m === 'object').slice(0, 20);
    const ids = raw.map((m) => (typeof m.assetId === 'string' ? m.assetId : null)).filter((x): x is string => !!x);
    const assets = ids.length ? await this.prisma.brandSocialAsset.findMany({ where: { id: { in: ids } } }) : [];
    const byId = new Map(assets.map((a) => [a.id, a]));
    const out: PostMediaItem[] = [];
    for (const m of raw) {
      const a = typeof m.assetId === 'string' ? byId.get(m.assetId) : undefined;
      const alt = typeof m.alt === 'string' ? m.alt.slice(0, 500) : null;
      if (a) {
        out.push({ assetId: a.id, url: a.url, kind: a.kind === 'video' ? 'video' : 'image', width: a.width, height: a.height, durationSec: a.durationSec, thumbUrl: a.thumbUrl, alt });
        continue;
      }
      if (typeof m.assetId === 'string' && m.assetId) throw new BadRequestException('A media item points to an asset that no longer exists.');
      const url = typeof m.url === 'string' ? m.url.trim() : '';
      if (!/^https?:\/\//i.test(url)) throw new BadRequestException('Every media item needs an asset or an http(s) URL.');
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
      out.push({ assetId: null, url, kind: m.kind === 'video' ? 'video' : 'image', width: num(m.width), height: num(m.height), durationSec: num(m.durationSec), thumbUrl: typeof m.thumbUrl === 'string' ? m.thumbUrl : null, alt });
    }
    return out;
  }

  private captionsFrom(v: unknown): Partial<Record<BrandPlatform, string>> {
    const out: Partial<Record<BrandPlatform, string>> = {};
    for (const [k, val] of Object.entries(asObj<Record<string, unknown>>(v, {}))) {
      const p = platformFrom(k);
      if (p && typeof val === 'string' && val.trim()) out[p] = val.slice(0, 70_000);
    }
    return out;
  }

  private parseWhen(v: unknown): Date | null {
    if (v === null || v === '') return null;
    const d = parsePktDateTime(v);
    if (!d) throw new BadRequestException('Unreadable date and time.');
    return d;
  }

  /** Clean column values for the fields present in the input. */
  private async data(input: PostInput): Promise<Prisma.BrandSocialPostUncheckedUpdateInput> {
    const d: Prisma.BrandSocialPostUncheckedUpdateInput = {};
    const has = (k: keyof PostInput) => Object.prototype.hasOwnProperty.call(input ?? {}, k);
    const opt = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
    if (has('title')) d.title = String(input.title ?? '').trim().slice(0, 200);
    if (has('kind')) d.kind = isKind(input.kind) ? input.kind : 'POST';
    if (has('pillar')) d.pillar = opt(input.pillar, 60);
    if (has('campaign')) d.campaign = opt(input.campaign, 120);
    if (has('caption')) d.caption = String(input.caption ?? '').slice(0, 70_000);
    if (has('captions')) d.captions = this.captionsFrom(input.captions) as Prisma.InputJsonValue;
    if (has('hashtags')) d.hashtags = cleanHashtags(input.hashtags);
    if (has('firstComment')) d.firstComment = typeof input.firstComment === 'string' && input.firstComment.trim() ? input.firstComment.slice(0, 8_000) : null;
    if (has('link')) {
      const l = opt(input.link, 2000);
      if (l && !/^https?:\/\//i.test(l)) throw new BadRequestException('The link must start with http:// or https://');
      d.link = l;
    }
    if (has('media')) {
      const media = await this.mediaFrom(input.media);
      d.media = media as unknown as Prisma.InputJsonValue;
      d.assetIds = [...new Set(media.map((m) => m.assetId).filter((x): x is string => !!x))];
    }
    if (has('platforms')) d.platforms = await this.platformsFrom(input.platforms);
    if (has('notes')) d.notes = typeof input.notes === 'string' && input.notes.trim() ? input.notes.slice(0, 8_000) : null;
    return d;
  }

  private async newCode(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const code = newPostCode();
      if (!(await this.prisma.brandSocialPost.findUnique({ where: { code }, select: { id: true } }))) return code;
    }
    throw new BadRequestException('Could not make a post tag. Try again.');
  }

  /* ───────────────────────── create / edit ───────────────────────── */

  /**
   * New post. Status IDEA or DRAFT (default DRAFT); automation keys always
   * create IN_REVIEW. A time given here is kept; the post is scheduled only
   * once approved.
   */
  async create(input: PostInput, actor: SocialActor, extra: Partial<Prisma.BrandSocialPostUncheckedCreateInput> = {}): Promise<BrandPostView> {
    const d = await this.data(input ?? {});
    const scheduledAt = input?.scheduledAt != null ? this.parseWhen(input.scheduledAt) : null;
    const status: BrandPostStatus = actor.automation ? 'IN_REVIEW' : input?.status === 'IDEA' ? 'IDEA' : 'DRAFT';
    const row = await this.prisma.brandSocialPost.create({
      data: {
        ...(d as Prisma.BrandSocialPostUncheckedCreateInput),
        code: await this.newCode(),
        status,
        scheduledAt,
        createdById: actor.id,
        ...extra,
      },
    });
    return this.one(row.id);
  }

  async update(id: string, input: PostInput, actor: SocialActor): Promise<BrandPostView> {
    const post = await this.row(id);
    const status = post.status as BrandPostStatus;
    if (actor.automation && !['IDEA', 'DRAFT', 'IN_REVIEW', 'REJECTED'].includes(status)) {
      throw new ForbiddenException('Automation keys can only edit posts that are not approved yet.');
    }
    const d = await this.data(input ?? {});
    const contentChanged = CONTENT_FIELDS.some((k) => Object.prototype.hasOwnProperty.call(input ?? {}, k));
    if (contentChanged && !EDITABLE.includes(status)) throw new BadRequestException(`A ${status.toLowerCase().replace('_', ' ')} post cannot be edited. Duplicate it instead.`);
    if (LOCKED.includes(status) && Object.prototype.hasOwnProperty.call(input ?? {}, 'scheduledAt')) throw new BadRequestException('This post is already out; its time cannot change.');

    const s = await this.settings.get();
    let next: BrandPostStatus = contentChanged ? statusAfterEdit(status, s.requireApproval) : status;
    if (actor.automation) next = 'IN_REVIEW';
    else if (input?.status && (input.status === 'IDEA' || input.status === 'DRAFT')) {
      if (!canTransition(next, input.status)) throw new BadRequestException(`A ${next.toLowerCase()} post cannot become ${input.status.toLowerCase()}.`);
      next = input.status;
    }
    if (next === 'DRAFT' && status === 'FAILED') d.publishState = {} as Prisma.InputJsonValue;

    let scheduledAt = post.scheduledAt;
    if (Object.prototype.hasOwnProperty.call(input ?? {}, 'scheduledAt')) {
      scheduledAt = input.scheduledAt == null ? null : this.parseWhen(input.scheduledAt);
      if (scheduledAt && scheduledAt.getTime() < Date.now() - PAST_GRACE_MS && (next === 'APPROVED' || next === 'SCHEDULED')) {
        throw new BadRequestException('That time has passed. Pick a time in the future.');
      }
    }
    if (next === 'SCHEDULED' && !scheduledAt) next = 'APPROVED';
    if (next === 'APPROVED' && scheduledAt && status === 'SCHEDULED') next = 'SCHEDULED';
    if (next === 'APPROVED' && scheduledAt && scheduledAt.getTime() > Date.now()) next = 'SCHEDULED';

    const leavingApproval = next !== status && (next === 'IN_REVIEW' || next === 'DRAFT' || next === 'IDEA');
    await this.prisma.brandSocialPost.update({
      where: { id },
      data: {
        ...d,
        scheduledAt,
        status: next,
        nextRunAt: next === 'SCHEDULED' ? scheduledAt : null,
        ...(leavingApproval ? { approvedById: null, approvedAt: null } : {}),
        ...(next !== 'REJECTED' && status === 'REJECTED' ? { rejectReason: null, rejectedById: null } : {}),
      },
    });
    return this.one(id);
  }

  async archive(id: string): Promise<BrandPostView> {
    const post = await this.row(id);
    if (post.status === 'PUBLISHING') throw new BadRequestException('This post is being published right now. Try again in a minute.');
    await this.prisma.brandSocialPost.update({ where: { id }, data: { status: 'ARCHIVED', nextRunAt: null } });
    return this.one(id);
  }

  async duplicate(id: string, actor: SocialActor): Promise<BrandPostView> {
    const p = await this.row(id);
    const row = await this.prisma.brandSocialPost.create({
      data: {
        code: await this.newCode(),
        title: `${p.title || 'Post'} (copy)`.slice(0, 200),
        kind: p.kind, pillar: p.pillar, campaign: p.campaign, caption: p.caption,
        captions: p.captions as Prisma.InputJsonValue, hashtags: p.hashtags, firstComment: p.firstComment, link: p.link,
        media: p.media as Prisma.InputJsonValue, assetIds: p.assetIds, platforms: p.platforms,
        status: 'DRAFT', notes: p.notes, aiMade: p.aiMade, createdById: actor.id,
      },
    });
    return this.one(row.id);
  }

  /* ───────────────────────── review flow ───────────────────────── */

  private move(post: BrandSocialPost, to: BrandPostStatus) {
    const from = post.status as BrandPostStatus;
    if (!canTransition(from, to)) throw new BadRequestException(`A ${from.toLowerCase().replace('_', ' ')} post cannot move to ${to.toLowerCase().replace('_', ' ')}.`);
  }

  /** Sends a post for review, or straight to approved when approval is not required. */
  async submit(id: string, actor: SocialActor): Promise<BrandPostView> {
    const post = await this.row(id);
    const s = await this.settings.get();
    const skipReview = !actor.automation && (!s.requireApproval || (post.aiMade && s.autoApproveAiDrafts));
    if (skipReview) return this.approveRow(post, actor.id);
    this.move(post, 'IN_REVIEW');
    await this.prisma.brandSocialPost.update({ where: { id }, data: { status: 'IN_REVIEW', rejectReason: null, rejectedById: null, nextRunAt: null } });
    return this.one(id);
  }

  async approve(id: string, actor: SocialActor): Promise<BrandPostView> {
    if (actor.automation) throw new ForbiddenException('Automation keys cannot approve posts.');
    return this.approveRow(await this.row(id), actor.id);
  }

  private async approveRow(post: BrandSocialPost, userId: string): Promise<BrandPostView> {
    const view = (await this.views([post], false))[0];
    const errors = blockingErrors(view.warnings);
    if (errors.length) throw new BadRequestException(`Fix these first: ${errors.map((e) => e.message).join(' ')}`);
    if (post.scheduledAt && post.scheduledAt.getTime() < Date.now() - PAST_GRACE_MS) {
      throw new BadRequestException('The scheduled time has passed. Pick a new time, or approve without a time and publish now.');
    }
    const to = approvedStatus(post.scheduledAt);
    this.move(post, to);
    await this.prisma.brandSocialPost.update({
      where: { id: post.id },
      data: { status: to, approvedById: userId, approvedAt: new Date(), rejectReason: null, rejectedById: null, nextRunAt: to === 'SCHEDULED' ? post.scheduledAt : null },
    });
    return this.one(post.id);
  }

  async reject(id: string, reason: string | undefined, actor: SocialActor): Promise<BrandPostView> {
    if (actor.automation) throw new ForbiddenException('Automation keys cannot reject posts.');
    const post = await this.row(id);
    const why = String(reason ?? '').trim().slice(0, 1000);
    if (!why) throw new BadRequestException('Say why it was rejected, so the writer can fix it.');
    this.move(post, 'REJECTED');
    await this.prisma.brandSocialPost.update({ where: { id }, data: { status: 'REJECTED', rejectReason: why, rejectedById: actor.id, approvedById: null, approvedAt: null, nextRunAt: null } });
    return this.one(id);
  }

  /** Calendar drag or the schedule picker. */
  async schedule(id: string, when: string | null | undefined): Promise<BrandPostView> {
    const post = await this.row(id);
    const status = post.status as BrandPostStatus;
    if (LOCKED.includes(status)) throw new BadRequestException('This post is already out or archived; its time cannot change.');
    const at = when == null || when === '' ? null : this.parseWhen(when);
    if (at && at.getTime() < Date.now() - PAST_GRACE_MS) throw new BadRequestException('That time has passed. Pick a time in the future.');
    let next = status;
    if ((status === 'APPROVED' || status === 'FAILED') && at) next = 'SCHEDULED';
    if (status === 'SCHEDULED' && !at) next = 'APPROVED';
    await this.prisma.brandSocialPost.update({
      where: { id },
      data: {
        scheduledAt: at, status: next, nextRunAt: next === 'SCHEDULED' ? at : null,
        ...(status === 'FAILED' && next === 'SCHEDULED' ? { publishState: {} as Prisma.InputJsonValue } : {}),
      },
    });
    return this.one(id);
  }

  /** Automation: a suggested first comment. Posts still in review take it directly; approved ones get it in the notes. */
  async commentDraft(id: string, text: string | undefined, actor: SocialActor): Promise<BrandPostView> {
    const post = await this.row(id);
    const t = String(text ?? '').trim().slice(0, 2_200);
    if (!t) throw new BadRequestException('The comment is empty.');
    if (['IDEA', 'DRAFT', 'IN_REVIEW', 'REJECTED'].includes(post.status)) {
      await this.prisma.brandSocialPost.update({ where: { id }, data: { firstComment: t, ...(actor.automation && post.status !== 'IN_REVIEW' ? { status: 'IN_REVIEW' } : {}) } });
    } else {
      const note = `Suggested first comment: ${t}`;
      await this.prisma.brandSocialPost.update({ where: { id }, data: { notes: [post.notes, note].filter(Boolean).join('\n\n').slice(0, 8_000) } });
    }
    return this.one(id);
  }

  /* ───────────────────────── bulk ───────────────────────── */

  async bulk(body: BulkInput, actor: SocialActor, canApprove: boolean): Promise<BulkResponse> {
    const ids = [...new Set(asArr<string>(body?.ids).filter((x) => typeof x === 'string'))].slice(0, 200);
    if (!ids.length) throw new BadRequestException('Choose at least one post.');
    const action = body?.action;
    if (!['approve', 'reject', 'schedule', 'archive', 'shift-days'].includes(action)) throw new BadRequestException('Unknown bulk action.');
    if ((action === 'approve' || action === 'reject') && !canApprove) throw new ForbiddenException('Your admin role does not include "social.approve".');
    const days = Math.trunc(Number(body?.days));
    if (action === 'shift-days' && (!Number.isFinite(days) || days === 0 || Math.abs(days) > 365)) throw new BadRequestException('Shift by 1 to 365 days (or minus).');
    if (action === 'reject' && !String(body?.reason ?? '').trim()) throw new BadRequestException('Say why they were rejected.');
    if (action === 'schedule' && !body?.scheduledAt) throw new BadRequestException('Pick a time.');

    const done: string[] = [];
    const failed: BulkResponse['failed'] = [];
    for (const id of ids) {
      try {
        if (action === 'approve') await this.approve(id, actor);
        else if (action === 'reject') await this.reject(id, body.reason, actor);
        else if (action === 'archive') await this.archive(id);
        else if (action === 'schedule') await this.schedule(id, body.scheduledAt);
        else {
          const p = await this.row(id);
          if (!p.scheduledAt) throw new BadRequestException('This post has no time.');
          await this.schedule(id, new Date(p.scheduledAt.getTime() + days * 86_400_000).toISOString());
        }
        done.push(id);
      } catch (e) {
        failed.push({ id, error: (e as Error)?.message || 'Failed.' });
      }
    }
    return { done, failed };
  }
}
