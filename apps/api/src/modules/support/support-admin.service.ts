/**
 * Admin side of live support: the inbox list and counts, conversation
 * changes (status, priority, tags, assignment), AI drafts, the merchant
 * context panel, one-off sends to a shop (in-app, email, SMS), agents and
 * presence, settings, canned replies and reports.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resolveAdminAccess } from '../../admin/access/admin-access';
import { dayRange } from '../../admin/common/date-range';
import { pktDayKey } from '../../admin/notifications/admin-notify.logic';
import { SupportHub } from './support.hub';
import { SupportService, type SupportViewer } from './support.service';
import { SupportSettingsService } from './support-settings.service';
import { SupportAiService } from './support-ai.service';
import { SUPPORT_PERMS, adminCan, cleanTags, firstName, isSupportPriority, isSupportStatus } from './support.logic';
import { isSupportLang } from './support.copy';
import type {
  SupportAdminConversation,
  SupportAdminListCounts,
  SupportAdminUpdateBody,
  SupportAgentRef,
  SupportCannedReply,
  SupportPage,
} from './support.types';

export interface AdminListQuery {
  status?: string;
  view?: 'mine' | 'unassigned' | 'all';
  priority?: string;
  tag?: string;
  search?: string;
  tenantId?: string;
  /** Several shops (comma separated in the query), e.g. from the Journey page's bulk select. */
  tenantIds?: string[];
  cursor?: string;
  limit?: number;
}

/** Most shops one "Message all" send may reach. */
export const BULK_START_MAX = 50;

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN_STAFF];
const NEEDS: string[] = ['WAITING', 'OPEN'];
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

@Injectable()
export class SupportAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hub: SupportHub,
    private readonly support: SupportService,
    private readonly settingsService: SupportSettingsService,
    private readonly ai: SupportAiService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
    private readonly notifications: NotificationsService,
  ) {}

  viewer(adminId: string, manage = false): SupportViewer {
    return { id: adminId, side: 'ADMIN', tenantId: null, manage };
  }

  /* ───────────────────────── inbox ───────────────────────── */

  async list(adminId: string, q: AdminListQuery): Promise<SupportPage<SupportAdminConversation> & { counts: SupportAdminListCounts }> {
    const where: Prisma.LiveSupportConversationWhereInput = {};
    if (q.status === 'needs_reply') where.status = { in: NEEDS };
    else if (q.status === 'active') where.status = { in: ['BOT', 'WAITING', 'OPEN', 'PENDING_MERCHANT'] };
    else if (isSupportStatus(q.status)) where.status = q.status;
    if (q.view === 'mine') where.assignedAdminId = adminId;
    else if (q.view === 'unassigned') where.assignedAdminId = null;
    if (isSupportPriority(q.priority)) where.priority = q.priority;
    if (q.tag) where.tags = { has: q.tag.toLowerCase() };
    if (q.tenantId) where.tenantId = q.tenantId;
    else if (q.tenantIds?.length) where.tenantId = { in: q.tenantIds.slice(0, 200) };
    if (q.search?.trim()) {
      const s = q.search.trim();
      const tenants = await this.prisma.tenant.findMany({
        where: { OR: [{ name: { contains: s, mode: 'insensitive' } }, { phone: { contains: s } }, { slug: { contains: s, mode: 'insensitive' } }] },
        select: { id: true },
        take: 200,
      });
      where.OR = [
        { tenantId: { in: tenants.map((t) => t.id) } },
        { subject: { contains: s, mode: 'insensitive' } },
        { lastMessagePreview: { contains: s, mode: 'insensitive' } },
        { messages: { some: { text: { contains: s, mode: 'insensitive' } } } },
      ];
    }
    const limit = Math.min(100, Math.max(1, q.limit ?? 30));
    const rows = await this.prisma.liveSupportConversation.findMany({
      where,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
    });
    const page = rows.slice(0, limit);
    const [items, counts] = await Promise.all([this.support.toAdminConversations(page), this.counts(adminId)]);
    return { items, nextCursor: rows.length > limit ? page[page.length - 1].id : null, counts };
  }

  async counts(adminId: string): Promise<SupportAdminListCounts> {
    const [needsReply, waiting, mine, unassigned, unread] = await Promise.all([
      this.prisma.liveSupportConversation.count({ where: { status: { in: NEEDS } } }),
      this.prisma.liveSupportConversation.count({ where: { status: 'WAITING' } }),
      this.prisma.liveSupportConversation.count({ where: { assignedAdminId: adminId, status: { in: [...NEEDS, 'PENDING_MERCHANT'] } } }),
      this.prisma.liveSupportConversation.count({ where: { assignedAdminId: null, status: { in: NEEDS } } }),
      this.prisma.liveSupportConversation.count({ where: { unreadForAdmin: { gt: 0 }, status: { not: 'BOT' } } }),
    ]);
    return { needsReply, waiting, mine, unassigned, unread };
  }

  async get(id: string): Promise<SupportAdminConversation> {
    const c = await this.prisma.liveSupportConversation.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Conversation not found');
    const [a] = await this.support.toAdminConversations([c]);
    return a;
  }

  async tags(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ tag: string }>>`SELECT DISTINCT unnest("tags") AS tag FROM "live_support_conversations" ORDER BY tag LIMIT 200`;
    return rows.map((r) => r.tag);
  }

  /* ───────────────────────── changes ───────────────────────── */

  async update(adminId: string, id: string, body: SupportAdminUpdateBody, manage: boolean): Promise<SupportAdminConversation> {
    const viewer = this.viewer(adminId, manage);
    let c = await this.support.loadFor(viewer, id);
    if (body.assignedAdminId !== undefined) c = await this.support.assign(c, body.assignedAdminId || null, adminId);
    const data: Prisma.LiveSupportConversationUpdateInput = {};
    if (body.priority !== undefined) {
      if (!isSupportPriority(body.priority)) throw new BadRequestException('Unknown priority');
      data.priority = body.priority;
    }
    if (body.tags !== undefined) data.tags = cleanTags(body.tags);
    if (body.subject !== undefined) data.subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 200) || null : null;
    if (Object.keys(data).length) c = await this.prisma.liveSupportConversation.update({ where: { id }, data });
    if (body.status !== undefined && body.status !== c.status) c = await this.support.setStatus(viewer, id, body.status);
    else await this.support.push(c);
    return this.get(c.id);
  }

  async suggest(adminId: string, id: string): Promise<{ drafts: string[] }> {
    const c = await this.support.loadFor(this.viewer(adminId), id);
    const [rows, canned, t, me] = await Promise.all([
      this.prisma.liveSupportMessage.findMany({ where: { conversationId: id, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 20, select: { sender: true, text: true, kind: true, internal: true } }),
      this.prisma.liveSupportCannedReply.findMany({ select: { title: true, text: true }, orderBy: { title: 'asc' }, take: 50 }),
      this.support.tenant(c.tenantId),
      this.support.person(adminId),
    ]);
    const drafts = await this.ai.suggest(rows.reverse(), { shopName: t?.name ?? 'Shop', agentName: firstName(me?.name), canned });
    return { drafts };
  }

  async start(adminId: string, body: { tenantId?: string; text?: string; subject?: string }) {
    if (!body?.tenantId) throw new BadRequestException('tenantId is required');
    const c = await this.support.adminStart(adminId, body.tenantId, body.text, body.subject);
    return this.get(c.id);
  }

  /**
   * "Message all": the same text to several shops, each into its active
   * conversation (or a new one). One shop failing does not stop the rest.
   */
  async bulkStart(adminId: string, body: { tenantIds?: unknown; text?: unknown; subject?: unknown }) {
    const ids = Array.isArray(body?.tenantIds)
      ? [...new Set(body.tenantIds.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim()))]
      : [];
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!ids.length) throw new BadRequestException('Pick at least one shop.');
    if (ids.length > BULK_START_MAX) throw new BadRequestException(`At most ${BULK_START_MAX} shops at a time.`);
    if (!text) throw new BadRequestException('Write the message first.');
    const subject = typeof body.subject === 'string' ? body.subject : undefined;
    const results: Array<{ tenantId: string; conversationId: string | null; error: string | null }> = [];
    for (const tenantId of ids) {
      try {
        const c = await this.support.adminStart(adminId, tenantId, text, subject, { skipRate: true });
        results.push({ tenantId, conversationId: c.id, error: null });
      } catch (e) {
        results.push({ tenantId, conversationId: null, error: e instanceof Error ? e.message : 'Failed' });
      }
    }
    return { sent: results.filter((r) => !r.error).length, failed: results.filter((r) => r.error).length, results };
  }

  /* ───────────────────────── merchant context ───────────────────────── */

  async context(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, name: true, slug: true, phone: true, status: true, businessType: true, businessModels: true, language: true,
        createdAt: true, lastActiveAt: true, pausedAt: true, address: true,
        users: { where: { role: UserRole.OWNER }, take: 1, select: { id: true, fullName: true, email: true, phone: true, lastSeenAt: true, lastSeenVia: true, lastLoginAt: true, language: true } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, trialEndsAt: true, currentPeriodEnd: true, interval: true, plan: { select: { name: true, slug: true } } } },
        _count: { select: { users: true, shops: true } },
      },
    });
    if (!t) throw new NotFoundException('Shop not found');
    const [conversations, lastSale, recentErrors] = await Promise.all([
      this.prisma.liveSupportConversation.findMany({
        where: { tenantId }, orderBy: { lastMessageAt: 'desc' }, take: 10,
        select: { id: true, status: true, subject: true, lastMessagePreview: true, lastMessageAt: true, rating: true },
      }),
      this.prisma.sale.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }).catch(() => null),
      this.recentErrors(tenantId),
    ]);
    const owner = t.users[0] ?? null;
    const sub = t.subscriptions[0] ?? null;
    const phone = owner?.phone || t.phone || null;
    const digits = phone ? phone.replace(/\D/g, '').replace(/^0/, '92') : null;
    return {
      tenant: {
        id: t.id, name: t.name, slug: t.slug, phone: t.phone, status: t.status, businessType: t.businessType, businessModels: t.businessModels,
        language: t.language, address: t.address, createdAt: t.createdAt, lastActiveAt: t.lastActiveAt, paused: !!t.pausedAt,
        users: t._count.users, shops: t._count.shops, lastSaleAt: lastSale?.createdAt ?? null,
      },
      owner,
      plan: sub ? { name: sub.plan?.name ?? null, slug: sub.plan?.slug ?? null, status: sub.status, interval: sub.interval, trialEndsAt: sub.trialEndsAt, currentPeriodEnd: sub.currentPeriodEnd } : null,
      merchantOnline: this.hub.presence.merchantOnline(tenantId),
      whatsappUrl: digits ? `https://wa.me/${digits}` : null,
      conversations,
      recentErrors,
    };
  }

  /** Failed emails and SMS for the shop in the last week (the platform keeps no per-shop error log). */
  private async recentErrors(tenantId: string) {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [emails, sms] = await Promise.all([
      this.prisma.emailLog.findMany({ where: { tenantId, status: 'FAILED', createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, subject: true, errorMessage: true, createdAt: true } }).catch(() => []),
      this.prisma.smsLog.findMany({ where: { tenantId, status: 'FAILED', createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, errorMessage: true, createdAt: true } }).catch(() => []),
    ]);
    return [
      ...emails.map((e) => ({ kind: 'email', at: e.createdAt, text: `${e.subject ?? 'Email'}: ${e.errorMessage ?? 'failed'}` })),
      ...sms.map((s) => ({ kind: 'sms', at: s.createdAt, text: `SMS: ${s.errorMessage ?? 'failed'}` })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  /* ───────────────────────── one-off sends to a shop ───────────────────────── */

  private async owner(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, phone: true, users: { where: { role: UserRole.OWNER, isActive: true }, take: 1, select: { id: true, fullName: true, email: true, phone: true } } },
    });
    if (!t) throw new NotFoundException('Shop not found');
    return { tenant: t, owner: t.users[0] ?? null };
  }

  async notify(tenantId: string, body: { title?: string; message?: string; link?: string }) {
    const title = body?.title?.trim().slice(0, 200);
    const message = body?.message?.trim().slice(0, 2000);
    if (!title || !message) throw new BadRequestException('Title and message are required');
    await this.owner(tenantId);
    const link = typeof body.link === 'string' && body.link.startsWith('/') ? body.link.slice(0, 300) : undefined;
    const n = await this.notifications.create({ tenantId, type: 'INFO', title, message, link, metadata: { kind: 'nafaa-team', from: 'admin' } });
    return { ok: true, id: n.id };
  }

  async sendEmail(tenantId: string, body: { subject?: string; body?: string; to?: string }) {
    const { tenant, owner } = await this.owner(tenantId);
    const to = body?.to?.trim() || owner?.email;
    const subject = body?.subject?.trim().slice(0, 200);
    const text = body?.body?.trim().slice(0, 20_000);
    if (!to || !subject || !text) throw new BadRequestException('Subject, message and an email address are required');
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${esc(text).replace(/\n/g, '<br>')}</div>`;
    await this.email.send({ tenantId: tenant.id, toEmail: to, toName: owner?.fullName ?? tenant.name, subject, bodyHtml: html, bodyText: text });
    return { ok: true, to };
  }

  async sendSms(tenantId: string, body: { message?: string; to?: string }) {
    const { tenant, owner } = await this.owner(tenantId);
    const to = body?.to?.trim() || owner?.phone || tenant.phone;
    const message = body?.message?.trim().slice(0, 640);
    if (!to || !message) throw new BadRequestException('A message and a phone number are required');
    await this.sms.send({ tenantId: tenant.id, toPhone: to, message });
    return { ok: true, to };
  }

  /* ───────────────────────── agents and presence ───────────────────────── */

  /** Every admin who can see support, with live state. */
  async agents(): Promise<SupportAgentRef[]> {
    const users = await this.prisma.user.findMany({
      where: { role: { in: ADMIN_ROLES }, isActive: true },
      select: { id: true, fullName: true, avatarUrl: true, role: true, lastSeenAt: true },
      orderBy: { fullName: 'asc' },
      take: 200,
    });
    const out: SupportAgentRef[] = [];
    for (const u of users) {
      const access = await resolveAdminAccess(this.prisma, u.id, u.role);
      if (!adminCan(access, SUPPORT_PERMS.view)) continue;
      const live = this.hub.presence.agent(u.id);
      out.push({
        id: u.id,
        name: u.fullName,
        avatarUrl: u.avatarUrl,
        state: this.hub.presence.agentState(u.id),
        lastSeenAt: iso(live?.lastSeenAt ?? u.lastSeenAt),
      });
    }
    return out;
  }

  async setPresence(adminId: string, state: unknown) {
    if (state !== 'online' && state !== 'away') throw new BadRequestException('State must be online or away');
    const known = this.hub.presence.setAgentState(adminId, state);
    this.hub.broadcastPresence(await this.agents());
    return { ok: true, connected: known, state: this.hub.presence.agentState(adminId) };
  }

  /* ───────────────────────── settings and canned replies ───────────────────────── */

  settings() {
    return this.settingsService.get();
  }

  iceServers() {
    return this.settingsService.iceServers();
  }

  saveSettings(adminId: string, body: unknown) {
    return this.settingsService.save(body, adminId);
  }

  private canned(r: Prisma.LiveSupportCannedReplyGetPayload<object>): SupportCannedReply {
    return { id: r.id, title: r.title, text: r.text, tags: r.tags, language: isSupportLang(r.language) ? r.language : 'roman', createdById: r.createdById, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
  }

  async listCanned(search?: string) {
    const s = search?.trim();
    const rows = await this.prisma.liveSupportCannedReply.findMany({
      where: s ? { OR: [{ title: { contains: s, mode: 'insensitive' } }, { text: { contains: s, mode: 'insensitive' } }, { tags: { has: s.toLowerCase() } }] } : {},
      orderBy: { title: 'asc' },
      take: 300,
    });
    return rows.map((r) => this.canned(r));
  }

  private cannedInput(body: Record<string, unknown>, partial: boolean) {
    const data: { title?: string; text?: string; tags?: string[]; language?: string } = {};
    if (body.title !== undefined || !partial) {
      const v = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
      if (!v) throw new BadRequestException('Title is required');
      data.title = v;
    }
    if (body.text !== undefined || !partial) {
      const v = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
      if (!v) throw new BadRequestException('Text is required');
      data.text = v;
    }
    if (body.tags !== undefined) data.tags = cleanTags(body.tags);
    if (body.language !== undefined) data.language = isSupportLang(body.language) ? body.language : 'roman';
    return data;
  }

  async createCanned(adminId: string, body: Record<string, unknown>) {
    const d = this.cannedInput(body ?? {}, false);
    const r = await this.prisma.liveSupportCannedReply.create({ data: { title: d.title!, text: d.text!, tags: d.tags ?? [], language: d.language ?? 'roman', createdById: adminId } });
    return this.canned(r);
  }

  async updateCanned(id: string, body: Record<string, unknown>) {
    const exists = await this.prisma.liveSupportCannedReply.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Saved reply not found');
    const r = await this.prisma.liveSupportCannedReply.update({ where: { id }, data: this.cannedInput(body ?? {}, true) });
    return this.canned(r);
  }

  async deleteCanned(id: string) {
    const r = await this.prisma.liveSupportCannedReply.deleteMany({ where: { id } });
    if (!r.count) throw new NotFoundException('Saved reply not found');
    return { ok: true };
  }

  /* ───────────────────────── reports ───────────────────────── */

  /** Conversations per day, first response and resolution times, ratings and per-agent numbers (PKT days). */
  async reports(from?: string, to?: string) {
    const range = dayRange(from, to) ?? { gte: new Date(Date.now() - 30 * 86_400_000) };
    const rows = await this.prisma.liveSupportConversation.findMany({
      where: { createdAt: range },
      select: { id: true, createdAt: true, handedOverAt: true, firstResponseAt: true, resolvedAt: true, rating: true, status: true, source: true, assignedAdminId: true },
      take: 20_000,
    });
    const replies = await this.prisma.liveSupportMessage.groupBy({
      by: ['senderUserId'],
      where: { sender: 'ADMIN', internal: false, createdAt: range },
      _count: { _all: true },
    });

    const days = new Map<string, { day: string; conversations: number; handedOver: number; resolved: number }>();
    const firstResponse: number[] = [];
    const resolution: number[] = [];
    let up = 0;
    let down = 0;
    let botOnly = 0;
    const perAgent = new Map<string, { resolved: number; conversations: number; up: number; down: number }>();
    for (const r of rows) {
      const key = pktDayKey(r.createdAt);
      const d = days.get(key) ?? { day: key, conversations: 0, handedOver: 0, resolved: 0 };
      d.conversations++;
      if (r.handedOverAt) d.handedOver++;
      if (r.resolvedAt) d.resolved++;
      days.set(key, d);
      if (r.firstResponseAt && r.source !== 'admin-started') {
        firstResponse.push((r.firstResponseAt.getTime() - (r.handedOverAt ?? r.createdAt).getTime()) / 1000);
      }
      if (r.resolvedAt) resolution.push((r.resolvedAt.getTime() - r.createdAt.getTime()) / 1000);
      if (r.rating === 'up') up++;
      if (r.rating === 'down') down++;
      if (!r.handedOverAt && !r.firstResponseAt && r.source !== 'admin-started') botOnly++;
      if (r.assignedAdminId) {
        const a = perAgent.get(r.assignedAdminId) ?? { resolved: 0, conversations: 0, up: 0, down: 0 };
        a.conversations++;
        if (r.resolvedAt) a.resolved++;
        if (r.rating === 'up') a.up++;
        if (r.rating === 'down') a.down++;
        perAgent.set(r.assignedAdminId, a);
      }
    }
    const stat = (xs: number[]) => {
      if (!xs.length) return { avgSec: null, medianSec: null, count: 0 };
      const s = [...xs].sort((a, b) => a - b);
      return { avgSec: Math.round(s.reduce((x, y) => x + y, 0) / s.length), medianSec: Math.round(s[Math.floor(s.length / 2)]), count: s.length };
    };
    const agentIds = [...new Set([...perAgent.keys(), ...replies.map((r) => r.senderUserId).filter((x): x is string => !!x)])];
    const names = new Map((await this.prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, fullName: true } })).map((u) => [u.id, u.fullName]));
    return {
      range: { from: range.gte ?? null, to: range.lt ?? null },
      totals: { conversations: rows.length, handedOver: rows.filter((r) => r.handedOverAt).length, answeredByAiOnly: botOnly, resolved: resolution.length, open: rows.filter((r) => r.status !== 'RESOLVED' && r.status !== 'CLOSED').length },
      perDay: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
      firstResponse: stat(firstResponse),
      resolution: stat(resolution),
      rating: { up, down, score: up + down ? Math.round((up / (up + down)) * 100) : null },
      agents: agentIds.map((id) => ({
        id, name: names.get(id) ?? 'Unknown',
        replies: replies.find((r) => r.senderUserId === id)?._count._all ?? 0,
        ...(perAgent.get(id) ?? { resolved: 0, conversations: 0, up: 0, down: 0 }),
      })).sort((a, b) => b.replies - a.replies),
    };
  }
}
