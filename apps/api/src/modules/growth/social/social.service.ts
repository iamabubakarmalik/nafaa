/**
 * Social media studio: the content calendar, reminders, the brand kit for
 * the creative maker, and basic social analytics.
 *
 * Posting by hand: at post time a reminder (in-app notification plus
 * mobile push) opens the "Post karein" sheet, and the merchant marks the
 * post posted and may paste the post's link. Posts with autoPublish on go to
 * a connected Facebook page / Instagram account by themselves
 * (integrations/meta/meta-publish.service.ts); those get no reminder.
 *
 * Environment: DISABLE_SOCIAL_REMINDERS=1 stops the reminder job.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '../../../core/system-control/cron.decorator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, dateKeyTz, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { NotificationsService } from '../../notifications/notifications.service';
import { apiMessage } from '../../../common/i18n/api-message';
import {
  SOCIAL_PLATFORMS, addDays, festivalsBetween, isPlatform, isPostKind, isPostStatus, newPostCode, socialSignal, tagLink, weeklyCounts,
  type PlanIdea, type PostStatus, type SocialPlatform,
} from './social-math';
import { SocialAiService } from './social-ai.service';

export interface PostMedia { url: string; kind: 'image' | 'video'; source: 'product' | 'upload' | 'creative'; productId?: string | null }
export interface PostLink { productId?: string | null; label: string; url: string }

export interface PostInput {
  title?: string | null;
  kind?: string;
  scheduledAt?: string | null;
  platforms?: string[];
  caption?: string;
  hashtags?: string[];
  media?: PostMedia[];
  productIds?: string[];
  links?: PostLink[];
  status?: string;
  remindMinutes?: number;
  festivalKey?: string | null;
  aiMade?: boolean;
  notes?: string | null;
  assignedToId?: string | null;
  autoPublish?: boolean;
}

const BRAND_KEY = (tenantId: string) => `social_brand:${tenantId}`;
const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_RANGE_DAYS = 120;

type PostRow = Prisma.SocialPostGetPayload<Record<string, never>>;

@Injectable()
export class SocialService {
  private readonly logger = new Logger('SocialStudio');
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly notifications: NotificationsService,
    private readonly ai: SocialAiService,
  ) {}

  /* ───────────────────────── calendar ───────────────────────── */

  async list(user: AuthenticatedUser, q: { from?: string; to?: string; status?: string; platform?: string; search?: string; undated?: string }) {
    const clock = await this.tz.clock(user.tenantId);
    const today = businessDayKey(new Date(), clock.tz, clock.dayStartHour);
    const { from, to } = this.range(q.from, q.to, today);
    const start = this.dayStart(from, clock.tz);
    const end = this.dayStart(addDays(to, 1), clock.tz);
    const where: Prisma.SocialPostWhereInput = {
      tenantId: user.tenantId,
      ...(isPostStatus(q.status) && { status: q.status }),
      ...(isPlatform(q.platform) && { platforms: { has: q.platform } }),
      ...(q.search?.trim() && { OR: [{ title: { contains: q.search.trim(), mode: 'insensitive' } }, { caption: { contains: q.search.trim(), mode: 'insensitive' } }] }),
    };
    const [dated, undated, stats] = await Promise.all([
      this.prisma.socialPost.findMany({ where: { ...where, scheduledAt: { gte: start, lt: end } }, orderBy: { scheduledAt: 'asc' }, take: 1000 }),
      q.undated === '0' ? Promise.resolve([] as PostRow[]) : this.prisma.socialPost.findMany({ where: { ...where, scheduledAt: null }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.stats(user.tenantId, clock.tz, today),
    ]);
    return {
      from, to, today,
      items: [...dated, ...undated].map((p) => this.view(p, clock.tz)),
      festivals: festivalsBetween(from, to),
      upcomingFestivals: festivalsBetween(today, addDays(today, 60)).slice(0, 6),
      stats,
    };
  }

  async get(user: AuthenticatedUser, id: string) {
    const clock = await this.tz.clock(user.tenantId);
    return this.view(await this.find(user.tenantId, id), clock.tz);
  }

  async create(user: AuthenticatedUser, body: PostInput) {
    const data = this.clean(body, true);
    const clock = await this.tz.clock(user.tenantId);
    for (let i = 0; i < 5; i++) {
      try {
        const row = await this.prisma.socialPost.create({
          data: { ...(data as Prisma.SocialPostUncheckedCreateInput), tenantId: user.tenantId, code: newPostCode(), createdById: user.id },
        });
        return this.view(row, clock.tz);
      } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e;
      }
    }
    throw new BadRequestException('Post nahi bani, dobara koshish karein');
  }

  async update(user: AuthenticatedUser, id: string, body: PostInput) {
    const old = await this.find(user.tenantId, id);
    const data = this.clean(body, false);
    // A new time sends a new reminder.
    if (data.scheduledAt !== undefined && String(data.scheduledAt ?? '') !== String(old.scheduledAt ?? '')) {
      data.reminderSentAt = null;
      // A new time gives failed auto-publish platforms a fresh start; published ones stay.
      const st = (old.publishState ?? {}) as Record<string, { status?: string }>;
      const kept = Object.fromEntries(Object.entries(st).filter(([, v]) => v?.status === 'PUBLISHED'));
      if (Object.keys(st).length !== Object.keys(kept).length) data.publishState = Object.keys(kept).length ? kept : Prisma.DbNull;
    }
    if (data.remindMinutes !== undefined && data.remindMinutes !== old.remindMinutes) data.reminderSentAt = null;
    if (data.status === 'POSTED' && !old.postedAt) data.postedAt = new Date();
    if (data.status && data.status !== 'POSTED' && old.status === 'POSTED') data.postedAt = null;
    const row = await this.prisma.socialPost.update({ where: { id: old.id }, data: data as Prisma.SocialPostUncheckedUpdateInput });
    const clock = await this.tz.clock(user.tenantId);
    return this.view(row, clock.tz);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const old = await this.find(user.tenantId, id);
    await this.prisma.socialPost.delete({ where: { id: old.id } });
    return { ok: true };
  }

  /** Marks a post posted (with optional post links per platform), or undoes it. */
  async markPosted(user: AuthenticatedUser, id: string, body: { urls?: Record<string, string>; undo?: boolean }) {
    const old = await this.find(user.tenantId, id);
    const clock = await this.tz.clock(user.tenantId);
    if (body?.undo) {
      const row = await this.prisma.socialPost.update({ where: { id: old.id }, data: { status: 'READY', postedAt: null } });
      return this.view(row, clock.tz);
    }
    const urls: Record<string, string> = { ...((old.postUrls as Record<string, string> | null) ?? {}) };
    for (const [k, v] of Object.entries(body?.urls ?? {})) {
      if (!isPlatform(k)) continue;
      const s = String(v ?? '').trim();
      if (!s) { delete urls[k]; continue; }
      if (!/^https?:\/\//i.test(s) || s.length > 500) throw new BadRequestException('Post ka link https:// se shuru ho');
      urls[k] = s;
    }
    const row = await this.prisma.socialPost.update({
      where: { id: old.id },
      data: { status: 'POSTED', postedAt: old.postedAt ?? new Date(), postUrls: Object.keys(urls).length ? urls : Prisma.DbNull },
    });
    return this.view(row, clock.tz);
  }

  /** Posts to do now: due in the next 24 hours or overdue up to 3 days, not posted yet. */
  async due(user: AuthenticatedUser) {
    const clock = await this.tz.clock(user.tenantId);
    const now = Date.now();
    const rows = await this.prisma.socialPost.findMany({
      where: {
        tenantId: user.tenantId, status: { in: ['DRAFT', 'READY'] },
        scheduledAt: { gte: new Date(now - 3 * 86_400_000), lte: new Date(now + 86_400_000) },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    });
    return { items: rows.map((p) => this.view(p, clock.tz)), now: new Date(now).toISOString() };
  }

  /** Saves a content plan as posts (ideas by default, so no reminder flood). */
  async applyPlan(user: AuthenticatedUser, body: { ideas?: PlanIdea[]; status?: string; remind?: boolean }) {
    const ideas = Array.isArray(body?.ideas) ? body.ideas : [];
    if (!ideas.length) throw new BadRequestException('Plan me koi post nahi');
    SocialAiService.checkPlanSize(ideas.length);
    const clock = await this.tz.clock(user.tenantId);
    const status: PostStatus = isPostStatus(body.status) ? body.status : 'IDEA';
    const links = await this.productLinks(user.tenantId, [...new Set(ideas.flatMap((i) => i.productIds ?? []))]);
    let created = 0;
    for (const idea of ideas) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(idea.date))) continue;
      const [y, m, d] = idea.date.split('-').map(Number);
      const [hh, mm] = (/^\d{2}:\d{2}$/.test(String(idea.time)) ? idea.time : '20:00').split(':').map(Number);
      const productIds = (idea.productIds ?? []).filter((x) => typeof x === 'string').slice(0, 10);
      await this.create(user, {
        title: idea.title, kind: idea.kind, scheduledAt: zonedToUtc(y, m, d, hh, mm, 0, clock.tz).toISOString(),
        platforms: idea.platforms, caption: idea.caption, hashtags: idea.hashtags, productIds,
        links: productIds.map((id) => links.get(id)).filter((l): l is PostLink => !!l),
        status, festivalKey: idea.festivalKey, aiMade: true,
      });
      created++;
    }
    return { created };
  }

  /* ───────────────────────── products and brand ───────────────────────── */

  /** Products for the post editor and creative maker: photo, price, Discount price, shop link. */
  async products(user: AuthenticatedUser, q: { search?: string; ids?: string }) {
    const ids = (q.ids ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50);
    const term = q.search?.trim();
    const rows = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId, isActive: true,
        ...(ids.length ? { id: { in: ids } } : term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { sku: { contains: term, mode: 'insensitive' } }] } : {}),
      },
      select: {
        id: true, name: true, price: true, sku: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 4, select: { url: true } },
        channelMappings: { select: { externalUrl: true, externalImage: true, compareAtPrice: true }, take: 5 },
      },
      orderBy: { updatedAt: 'desc' },
      take: ids.length ? ids.length : 30,
    });
    return rows.map((p) => {
      const link = p.channelMappings.find((m) => m.externalUrl)?.externalUrl ?? null;
      const compare = p.channelMappings.find((m) => m.compareAtPrice != null)?.compareAtPrice;
      const images = [...p.images.map((i) => i.url), ...p.channelMappings.map((m) => m.externalImage).filter((u): u is string => !!u)];
      return { id: p.id, name: p.name, sku: p.sku, price: Number(p.price) || 0, comparePrice: compare != null ? Number(compare) : null, images: [...new Set(images)].slice(0, 6), link };
    });
  }

  private async productLinks(tenantId: string, ids: string[]): Promise<Map<string, PostLink>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.product.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true, name: true, channelMappings: { where: { externalUrl: { not: null } }, select: { externalUrl: true }, take: 1 } },
    });
    return new Map(rows.filter((r) => r.channelMappings[0]?.externalUrl).map((r) => [r.id, { productId: r.id, label: r.name, url: r.channelMappings[0].externalUrl! }]));
  }

  /** Shop name, logo, phone and saved brand colours for the creative maker. */
  async brand(user: AuthenticatedUser) {
    const [s, t, saved] = await Promise.all([
      this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { shopName: true, logoUrl: true, shopPhone: true, shopWhatsapp: true } }),
      this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, phone: true } }),
      this.prisma.systemSetting.findUnique({ where: { key: BRAND_KEY(user.tenantId) }, select: { value: true } }),
    ]);
    let colors = { primary: '#0f766e', accent: '#f59e0b', text: '#ffffff' };
    let handle: string | null = null;
    try {
      const v = saved ? JSON.parse(saved.value) : null;
      if (v?.colors) colors = { primary: HEX.test(v.colors.primary) ? v.colors.primary : colors.primary, accent: HEX.test(v.colors.accent) ? v.colors.accent : colors.accent, text: HEX.test(v.colors.text) ? v.colors.text : colors.text };
      if (typeof v?.handle === 'string') handle = v.handle;
    } catch { /* keep defaults */ }
    return {
      name: s?.shopName || t?.name || '',
      logoUrl: s?.logoUrl ?? null,
      phone: s?.shopWhatsapp || s?.shopPhone || t?.phone || null,
      handle,
      colors,
    };
  }

  async saveBrand(user: AuthenticatedUser, body: { colors?: { primary?: string; accent?: string; text?: string }; handle?: string | null }) {
    const c = body?.colors ?? {};
    for (const v of [c.primary, c.accent, c.text]) if (v !== undefined && !HEX.test(String(v))) throw new BadRequestException('Rang #RRGGBB shakal me ho');
    const current = await this.brand(user);
    const value = {
      colors: { primary: c.primary ?? current.colors.primary, accent: c.accent ?? current.colors.accent, text: c.text ?? current.colors.text },
      handle: body?.handle === undefined ? current.handle : (String(body.handle ?? '').trim().slice(0, 40) || null),
    };
    await this.prisma.systemSetting.upsert({
      where: { key: BRAND_KEY(user.tenantId) },
      create: { key: BRAND_KEY(user.tenantId), value: JSON.stringify(value), category: 'social', updatedById: user.id },
      update: { value: JSON.stringify(value), updatedById: user.id },
    });
    return this.brand(user);
  }

  /* ───────────────────────── analytics ───────────────────────── */

  /**
   * Posts per platform per week (posted ones, by posting day) and orders from
   * social sources: by platform (link tags, website/Shopify source data, the
   * manual order source) and per post when the order came through a tagged link.
   */
  async analytics(user: AuthenticatedUser, q: { from?: string; to?: string }) {
    const clock = await this.tz.clock(user.tenantId);
    const today = businessDayKey(new Date(), clock.tz, clock.dayStartHour);
    const { from, to } = this.range(q.from ?? addDays(today, -55), q.to ?? today, today);
    const start = this.dayStart(from, clock.tz);
    const end = this.dayStart(addDays(to, 1), clock.tz);

    const [posts, orders] = await Promise.all([
      this.prisma.socialPost.findMany({
        where: { tenantId: user.tenantId, status: 'POSTED', OR: [{ postedAt: { gte: start, lt: end } }, { postedAt: null, scheduledAt: { gte: start, lt: end } }] },
        select: { id: true, code: true, title: true, caption: true, platforms: true, postedAt: true, scheduledAt: true, postUrls: true },
        take: 2000,
      }),
      this.prisma.channelOrder.findMany({
        where: { tenantId: user.tenantId, deletedAt: null, receivedAt: { gte: start, lt: end } },
        select: { id: true, metadata: true, total: true, orderStatus: true, utmSource: true, utmContent: true, referrer: true, landingPage: true },
        take: 20000,
      }),
    ]);

    const byPlatform: Record<SocialPlatform, { orders: number; delivered: number; sales: number }> = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, { orders: 0, delivered: 0, sales: 0 }])) as never;
    const byCode = new Map<string, { orders: number; delivered: number; sales: number }>();
    let social = 0;
    for (const o of orders) {
      const sig = socialSignal(o);
      if (!sig.platform && !sig.code) continue;
      const dead = o.orderStatus === 'CANCELLED' || o.orderStatus === 'REJECTED';
      const delivered = o.orderStatus === 'DELIVERED';
      const value = dead ? 0 : Number(o.total) || 0;
      social++;
      if (sig.platform) {
        const b = byPlatform[sig.platform];
        b.orders++; if (delivered) b.delivered++; b.sales += value;
      }
      if (sig.code) {
        const c = byCode.get(sig.code) ?? { orders: 0, delivered: 0, sales: 0 };
        c.orders++; if (delivered) c.delivered++; c.sales += value;
        byCode.set(sig.code, c);
      }
    }

    const day = (p: { postedAt: Date | null; scheduledAt: Date | null }) => dateKeyTz(p.postedAt ?? p.scheduledAt ?? new Date(), clock.tz);
    const allCodes = await this.prisma.socialPost.findMany({
      where: { tenantId: user.tenantId, code: { in: [...byCode.keys()] } },
      select: { id: true, code: true, title: true, caption: true, platforms: true, postedAt: true, scheduledAt: true, postUrls: true },
    });
    const postRows = [...new Map([...posts, ...allCodes].map((p) => [p.id, p])).values()]
      .map((p) => ({
        id: p.id, title: p.title || p.caption.split('\n')[0].slice(0, 80), platforms: p.platforms, day: day(p),
        postUrls: (p.postUrls as Record<string, string> | null) ?? {},
        ...(byCode.get(p.code) ?? { orders: 0, delivered: 0, sales: 0 }),
      }))
      .sort((a, b) => b.orders - a.orders || b.day.localeCompare(a.day))
      .slice(0, 50);

    const postsPerPlatform: Record<string, number> = {};
    for (const p of posts) for (const pl of p.platforms) postsPerPlatform[pl] = (postsPerPlatform[pl] ?? 0) + 1;

    return {
      from, to,
      weeks: weeklyCounts(posts.map((p) => ({ day: day(p), platforms: p.platforms }))),
      totals: {
        posts: posts.length,
        postsPerPlatform,
        socialOrders: social,
        socialSales: Math.round(Object.values(byPlatform).reduce((s, b) => s + b.sales, 0)),
        taggedOrders: [...byCode.values()].reduce((s, c) => s + c.orders, 0),
        allOrders: orders.length,
      },
      byPlatform,
      posts: postRows,
    };
  }

  /* ───────────────────────── reminders ───────────────────────── */

  /** Every minute: posts whose reminder time has come get a notification and a push. */
  @Cron('25 * * * * *')
  async sendReminders() {
    if (this.running || process.env.DISABLE_SOCIAL_REMINDERS === '1') return;
    this.running = true;
    try {
      const now = new Date();
      // Reminders up to 2 hours early are allowed; anything older than 6 hours is skipped.
      const rows = await this.prisma.socialPost.findMany({
        where: { status: { in: ['DRAFT', 'READY'] }, reminderSentAt: null, scheduledAt: { gte: new Date(now.getTime() - 6 * 3600_000), lte: new Date(now.getTime() + 2 * 3600_000) } },
        select: { id: true, tenantId: true, title: true, caption: true, platforms: true, scheduledAt: true, remindMinutes: true, createdById: true, assignedToId: true, autoPublish: true },
        take: 200,
      });
      // Posts that only go to Facebook / Instagram and will be published by Nafaa need no reminder.
      const autoTenants = new Set((await this.prisma.metaConnection.findMany({
        where: { tenantId: { in: [...new Set(rows.filter((r) => r.autoPublish).map((r) => r.tenantId))] }, status: 'CONNECTED', autoPublish: true },
        select: { tenantId: true },
      })).map((c) => c.tenantId));
      for (const p of rows) {
        if (p.autoPublish && autoTenants.has(p.tenantId) && p.platforms.length && p.platforms.every((x) => x === 'FACEBOOK' || x === 'INSTAGRAM')) continue;
        const at = p.scheduledAt!.getTime() - Math.max(0, p.remindMinutes) * 60_000;
        if (at > now.getTime()) continue;
        // Claim first so two servers never send the same reminder.
        const claimed = await this.prisma.socialPost.updateMany({ where: { id: p.id, reminderSentAt: null }, data: { reminderSentAt: now } });
        if (!claimed.count) continue;
        const what = p.title || p.caption.split('\n')[0].slice(0, 60) || 'Social post';
        await this.notifications.create({
          tenantId: p.tenantId,
          userId: p.assignedToId ?? p.createdById ?? undefined,
          type: 'INFO',
          title: apiMessage('Post karne ka waqt'),
          message: apiMessage('{{what}} · {{platforms}}', { what, platforms: p.platforms.map((x) => PLATFORM_NAME[x] ?? x).join(', ') }),
          link: `/online-store/social?post=${p.id}`,
          metadata: { kind: 'SOCIAL_POST', postId: p.id },
        }).catch((e) => this.logger.warn(`Social reminder failed for ${p.id}: ${(e as Error).message}`));
      }
    } catch (e) {
      this.logger.warn(`Social reminders failed: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /* ───────────────────────── helpers ───────────────────────── */

  private async find(tenantId: string, id: string): Promise<PostRow> {
    const row = await this.prisma.socialPost.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Post nahi mili');
    return row;
  }

  private range(from: string | undefined, to: string | undefined, today: string) {
    const ok = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
    let f = ok(from) ? from! : addDays(today, -7);
    let t = ok(to) ? to! : addDays(today, 35);
    if (t < f) [f, t] = [t, f];
    if (addDays(f, MAX_RANGE_DAYS) < t) t = addDays(f, MAX_RANGE_DAYS);
    return { from: f, to: t };
  }

  private dayStart(day: string, tz: string): Date {
    const [y, m, d] = day.split('-').map(Number);
    return zonedToUtc(y, m, d, 0, 0, 0, tz);
  }

  private async stats(tenantId: string, tz: string, today: string) {
    const weekFrom = this.dayStart(addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7)), tz);
    const weekTo = new Date(weekFrom.getTime() + 7 * 86_400_000);
    const now = new Date();
    const [thisWeek, postedWeek, overdue, ideas, ready] = await Promise.all([
      this.prisma.socialPost.count({ where: { tenantId, scheduledAt: { gte: weekFrom, lt: weekTo } } }),
      this.prisma.socialPost.count({ where: { tenantId, status: 'POSTED', postedAt: { gte: weekFrom, lt: weekTo } } }),
      this.prisma.socialPost.count({ where: { tenantId, status: { in: ['DRAFT', 'READY'] }, scheduledAt: { lt: now, gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
      this.prisma.socialPost.count({ where: { tenantId, status: 'IDEA' } }),
      this.prisma.socialPost.count({ where: { tenantId, status: 'READY', scheduledAt: { gte: now } } }),
    ]);
    return { thisWeek, postedWeek, overdue, ideas, ready };
  }

  /** Validated column values from a create/update body (undefined = leave as is). */
  private clean(b: PostInput, creating: boolean): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const str = (v: unknown, max: number) => (v == null ? null : String(v).trim().slice(0, max) || null);
    if (b.title !== undefined) out.title = str(b.title, 160);
    if (b.kind !== undefined) out.kind = isPostKind(b.kind) ? b.kind : 'POST';
    if (b.scheduledAt !== undefined) {
      if (b.scheduledAt === null || b.scheduledAt === '') out.scheduledAt = null;
      else {
        const d = new Date(b.scheduledAt);
        if (Number.isNaN(d.getTime())) throw new BadRequestException('Post ka waqt sahi nahi');
        out.scheduledAt = d;
      }
    }
    if (b.platforms !== undefined) out.platforms = [...new Set((Array.isArray(b.platforms) ? b.platforms : []).filter(isPlatform))];
    if (b.caption !== undefined) out.caption = String(b.caption ?? '').slice(0, 5000);
    if (b.hashtags !== undefined) out.hashtags = (Array.isArray(b.hashtags) ? b.hashtags : []).filter((h) => typeof h === 'string' && h.trim()).map((h) => `#${h.trim().replace(/^#+/, '').replace(/\s+/g, '')}`).slice(0, 30);
    if (b.media !== undefined) {
      out.media = (Array.isArray(b.media) ? b.media : []).filter((m) => m && typeof m.url === 'string' && /^(https?:\/\/|\/uploads\/)/.test(m.url) && m.url.length <= 1000).slice(0, 10)
        .map((m) => ({ url: m.url, kind: m.kind === 'video' ? 'video' : 'image', source: ['product', 'upload', 'creative'].includes(m.source) ? m.source : 'upload', productId: typeof m.productId === 'string' ? m.productId : null }));
    }
    if (b.productIds !== undefined) out.productIds = (Array.isArray(b.productIds) ? b.productIds : []).filter((x) => typeof x === 'string').slice(0, 10);
    if (b.links !== undefined) {
      out.links = (Array.isArray(b.links) ? b.links : []).filter((l) => l && typeof l.url === 'string' && /^https?:\/\//i.test(l.url) && l.url.length <= 1000).slice(0, 10)
        .map((l) => ({ productId: typeof l.productId === 'string' ? l.productId : null, label: String(l.label ?? '').slice(0, 120), url: l.url.trim() }));
    }
    if (b.status !== undefined) out.status = isPostStatus(b.status) ? b.status : 'DRAFT';
    else if (creating) out.status = b.scheduledAt ? 'DRAFT' : 'IDEA';
    if (b.remindMinutes !== undefined) out.remindMinutes = Math.max(0, Math.min(24 * 60, Math.round(Number(b.remindMinutes) || 0)));
    if (b.festivalKey !== undefined) out.festivalKey = str(b.festivalKey, 40);
    if (b.aiMade !== undefined) out.aiMade = !!b.aiMade;
    if (b.notes !== undefined) out.notes = str(b.notes, 2000);
    if (b.assignedToId !== undefined) out.assignedToId = str(b.assignedToId, 64);
    if (b.autoPublish !== undefined) out.autoPublish = !!b.autoPublish;
    if (out.status === 'POSTED' && creating) out.postedAt = new Date();
    return out;
  }

  /** API shape: plain links plus links tagged for each chosen platform. */
  private view(p: PostRow, tz: string) {
    const links = (Array.isArray(p.links) ? p.links : []) as unknown as PostLink[];
    const platforms = p.platforms.filter(isPlatform);
    return {
      id: p.id, code: p.code, title: p.title, kind: p.kind, status: p.status,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      day: p.scheduledAt ? dateKeyTz(p.scheduledAt, tz) : null,
      platforms, caption: p.caption, hashtags: p.hashtags,
      media: (Array.isArray(p.media) ? p.media : []) as unknown as PostMedia[],
      productIds: p.productIds, links,
      taggedLinks: Object.fromEntries(platforms.map((pl) => [pl, links.map((l) => ({ ...l, url: tagLink(l.url, { platform: pl, code: p.code, campaign: p.festivalKey || p.title }) }))])),
      remindMinutes: p.remindMinutes, reminderSentAt: p.reminderSentAt?.toISOString() ?? null,
      postedAt: p.postedAt?.toISOString() ?? null,
      postUrls: (p.postUrls as Record<string, string> | null) ?? {},
      festivalKey: p.festivalKey, aiMade: p.aiMade, notes: p.notes, assignedToId: p.assignedToId,
      autoPublish: p.autoPublish,
      publishState: (p.publishState as Record<string, unknown> | null) ?? {},
      createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
    };
  }
}

const PLATFORM_NAME: Record<string, string> = { FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', YOUTUBE: 'YouTube', WHATSAPP_STATUS: 'WhatsApp status' };
