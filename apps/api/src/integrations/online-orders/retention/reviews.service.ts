/**
 * Review requests after delivery. A request is one row per delivered order
 * with a random token; the customer opens /rate/<token> (no login), gives
 * 1–5 stars and a comment, and a good rating is offered the shop's public
 * review pages. The merchant sends the link over WhatsApp one by one.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { assertManager } from '../order-costs.service';
import { DEFAULT_RETENTION, normalizeRetention, readRetention, retentionKey } from './retention-settings';

const orderNo = (o: { externalOrderNumber: string | null; externalOrderId: string }) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');
const DAY = 86_400_000;
/** A rating can be changed for this long after it is first given. */
const EDIT_HOURS = 24;

export type ReviewFilter = 'TO_SEND' | 'SENT' | 'RATED' | 'LOW' | 'ALL';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates the request for a delivered order (once per order). Returns null when the order does not qualify. */
  async request(tenantId: string, orderId: string, source: 'AUTOMATION' | 'MANUAL') {
    const o = await this.prisma.channelOrder.findFirst({
      where: { id: orderId, tenantId, deletedAt: null },
      select: { id: true, orderStatus: true, customerName: true, customerPhone: true, externalOrderNumber: true, externalOrderId: true, metadata: true },
    });
    if (!o || o.orderStatus !== 'DELIVERED' || (o.metadata as any)?.test) return null;
    const existing = await this.prisma.onlineReview.findUnique({ where: { channelOrderId: o.id } });
    if (existing) return existing;
    try {
      return await this.prisma.onlineReview.create({
        data: {
          tenantId, channelOrderId: o.id, token: crypto.randomBytes(18).toString('base64url'), source,
          customerName: o.customerName, customerPhone: o.customerPhone, orderNo: orderNo(o),
        },
      });
    } catch {
      // A second event raced this one; the first row stands.
      return this.prisma.onlineReview.findUnique({ where: { channelOrderId: o.id } });
    }
  }

  /** Requests for every delivered order of the last `days` days that has none yet. */
  async requestRecent(user: AuthenticatedUser, scope: ShopScope, days: number) {
    const since = new Date(Date.now() - Math.min(Math.max(days || 14, 1), 60) * DAY);
    const orders = await this.prisma.channelOrder.findMany({
      where: { tenantId: user.tenantId, ...(scope.whereLoose as any), orderStatus: 'DELIVERED', deletedAt: null, deliveredAt: { gte: since }, customerPhone: { not: null } },
      select: { id: true },
      take: 500,
    });
    const have = new Set((await this.prisma.onlineReview.findMany({ where: { channelOrderId: { in: orders.map((o) => o.id) } }, select: { channelOrderId: true } })).map((r) => r.channelOrderId));
    let made = 0;
    for (const o of orders) {
      if (have.has(o.id)) continue;
      if (await this.request(user.tenantId, o.id, 'MANUAL')) made++;
    }
    return { made };
  }

  async requestOne(user: AuthenticatedUser, orderId: string) {
    const r = await this.request(user.tenantId, orderId, 'MANUAL');
    if (!r) throw new BadRequestException('Review sirf deliver hue order ka maanga ja sakta hai');
    return r;
  }

  async list(user: AuthenticatedUser, q: { filter?: string; days?: string | number; search?: string }) {
    const days = Math.min(Math.max(Number(q.days) || 90, 1), 730);
    const since = new Date(Date.now() - days * DAY);
    const base = { tenantId: user.tenantId, createdAt: { gte: since } };
    const filter = (['TO_SEND', 'SENT', 'RATED', 'LOW', 'ALL'] as const).includes(q.filter as ReviewFilter) ? (q.filter as ReviewFilter) : 'ALL';
    const where: Record<string, unknown> = { ...base };
    if (filter === 'TO_SEND') Object.assign(where, { sentAt: null, ratedAt: null });
    if (filter === 'SENT') Object.assign(where, { sentAt: { not: null }, ratedAt: null });
    if (filter === 'RATED') Object.assign(where, { ratedAt: { not: null } });
    if (filter === 'LOW') Object.assign(where, { rating: { lte: 3 } });
    const term = String(q.search ?? '').trim();
    if (term) Object.assign(where, { OR: [{ customerName: { contains: term, mode: 'insensitive' } }, { customerPhone: { contains: term.replace(/\D/g, '') || term } }, { orderNo: { contains: term } }] });
    const [items, all] = await Promise.all([
      this.prisma.onlineReview.findMany({ where, orderBy: [{ ratedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }], take: 300 }),
      this.prisma.onlineReview.findMany({ where: base, select: { sentAt: true, rating: true, ratedAt: true } }),
    ]);
    return { items, stats: reviewStats(all), days };
  }

  async markSent(user: AuthenticatedUser, id: string, undo = false) {
    const done = await this.prisma.onlineReview.updateMany({ where: { id, tenantId: user.tenantId }, data: { sentAt: undo ? null : new Date() } });
    if (!done.count) throw new NotFoundException('Review request nahi mili');
    return { ok: true };
  }

  async settings(tenantId: string) {
    return readRetention(this.prisma, tenantId);
  }

  /** Saves part of the retention settings (only the sections sent). Owner or manager. */
  async saveSettings(user: AuthenticatedUser, body: unknown) {
    assertManager(user);
    const cur = await readRetention(this.prisma, user.tenantId);
    const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    const next = normalizeRetention({
      loyalty: b.loyalty ?? cur.loyalty,
      referral: b.referral ?? cur.referral,
      reviews: b.reviews ?? cur.reviews ?? DEFAULT_RETENTION.reviews,
    });
    const value = JSON.stringify(next);
    await this.prisma.systemSetting.upsert({
      where: { key: retentionKey(user.tenantId) },
      create: { key: retentionKey(user.tenantId), value, category: 'online_orders', isPublic: false },
      update: { value },
    });
    return next;
  }

  /** Rating summary for reports. */
  async summary(tenantId: string, from: Date, to: Date) {
    const rows = await this.prisma.onlineReview.findMany({ where: { tenantId, createdAt: { gte: from, lte: to } }, select: { sentAt: true, rating: true, ratedAt: true } });
    return reviewStats(rows);
  }

  // ─── public page (no login) ───────────────────────────────────

  private async byToken(token: string) {
    if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) throw new NotFoundException('Link sahi nahi');
    const r = await this.prisma.onlineReview.findUnique({ where: { token } });
    if (!r) throw new NotFoundException('Link sahi nahi');
    return r;
  }

  async publicInfo(token: string) {
    const r = await this.byToken(token);
    const [tenant, settings] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: r.tenantId }, select: { name: true } }),
      readRetention(this.prisma, r.tenantId),
    ]);
    const canEdit = !r.ratedAt || Date.now() - r.ratedAt.getTime() < EDIT_HOURS * 3_600_000;
    return {
      shop: tenant?.name ?? '',
      orderNo: r.orderNo,
      firstName: String(r.customerName ?? '').trim().split(/\s+/)[0] || null,
      rating: r.rating,
      comment: r.comment,
      rated: !!r.ratedAt,
      canEdit,
      links: r.rating && r.rating >= settings.reviews.linksFrom ? settings.reviews.links : [],
      linksFrom: settings.reviews.linksFrom,
    };
  }

  async publicRate(token: string, body: { rating?: unknown; comment?: unknown }) {
    const r = await this.byToken(token);
    const rating = Number(body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new BadRequestException('1 se 5 star chunein');
    if (r.ratedAt && Date.now() - r.ratedAt.getTime() >= EDIT_HOURS * 3_600_000) throw new BadRequestException('Rating pehle hi mil chuki hai — shukriya!');
    const comment = String(body?.comment ?? '').replace(/[\u0000-\u0008\u000B-\u001F]/g, '').trim().slice(0, 1000) || null;
    await this.prisma.onlineReview.update({ where: { id: r.id }, data: { rating, comment, ratedAt: r.ratedAt ?? new Date() } });
    return this.publicInfo(token);
  }
}

export function reviewStats(rows: Array<{ sentAt: Date | null; rating: number | null; ratedAt: Date | null }>) {
  const rated = rows.filter((r) => r.ratedAt && r.rating);
  const dist = [1, 2, 3, 4, 5].map((s) => rated.filter((r) => r.rating === s).length);
  const sum = rated.reduce((s, r) => s + (r.rating ?? 0), 0);
  const asked = rows.filter((r) => r.sentAt || r.ratedAt).length;
  return {
    requests: rows.length,
    toSend: rows.filter((r) => !r.sentAt && !r.ratedAt).length,
    sent: asked,
    rated: rated.length,
    average: rated.length ? Math.round((sum / rated.length) * 10) / 10 : null,
    responseRate: asked ? Math.round((rated.length / asked) * 1000) / 10 : 0,
    distribution: dist,
    low: rated.filter((r) => (r.rating ?? 0) <= 3).length,
  };
}
