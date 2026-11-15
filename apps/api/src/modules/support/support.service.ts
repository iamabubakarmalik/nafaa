/**
 * Live support core: conversations and messages for both sides, status
 * changes, read receipts, assignment, the Nafaa AI first responder, admin
 * alerts and the offline-reply email. Admin-only screens (list, context,
 * settings, reports) are in SupportAdminService.
 *
 * Every event is pushed through SupportHub:
 *   merchant copies → support:tenant:<tenantId> (internal notes never go here)
 *   admin copies    → support:agents
 */

import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { v2 as cloudinaryApi } from 'cloudinary';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { StaffAlertsService } from '../notifications/alerts/staff-alerts.service';
import { notifyAdmins } from '../../admin/notifications/admin-notify';
import { SupportHub } from './support.hub';
import { SupportSettingsService } from './support-settings.service';
import { SupportAiService } from './support-ai.service';
import {
  ACTIVE_STATUSES,
  SupportRateLimiter,
  baseMime,
  canDeleteMessage,
  canEditMessage,
  canPurgeMessage,
  canSetStatus,
  checkRecording,
  checkUpload,
  cleanAttachments,
  firstName,
  historyAfterEdit,
  hoursText,
  isSupportStatus,
  kindForAttachments,
  merchantAttachments,
  merchantCanSee,
  nextWaitingSince,
  pickRoundRobin,
  previewFor,
  readHistory,
  statusAfterAdminMessage,
  statusAfterHandover,
  statusAfterMerchantMessage,
  withinWorkingHours,
  type SupportActor,
} from './support.logic';
import { etaText, offlineEmail, pickLang, systemText, teamLine, tr } from './support.copy';
import { quickRepliesFor } from './support.knowledge';
import {
  SUPPORT_ALLOWED_MIME,
  SUPPORT_EVENTS,
  SUPPORT_LIMITS,
  type SupportAdminConversation,
  type SupportAgentRef,
  type SupportAttachment,
  type SupportConversation,
  type SupportLang,
  type SupportMessage,
  type SupportMessageMeta,
  type SupportPage,
  type SupportProactiveKey,
  type SupportSendBody,
  type SupportSource,
  type SupportStartBody,
  type SupportStatus,
  type SupportStatusInfo,
  type SupportSystemCode,
} from './support.types';

export type ConvRow = Prisma.LiveSupportConversationGetPayload<object>;
type MsgRow = Prisma.LiveSupportMessageGetPayload<object>;

export interface SupportViewer {
  id: string;
  side: SupportActor;
  tenantId: string | null;
  /** Admin signed in as this shop: reads do not mark messages read. */
  impersonatedBy?: string | null;
  /** Admin has support.manage. */
  manage?: boolean;
}

interface Person {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  language: string | null;
  lastSeenAt: Date | null;
  tenantId: string;
}

const PEOPLE_TTL_MS = 5 * 60_000;
const BOT_DELAY_MS = 1200;
const BOT_MAX_REPLIES = 8;
const OFFLINE_EMAIL_GAP_MS = 30 * 60_000;
const AWAY_LINE_GAP_MS = 2 * 60 * 60_000;
const PAGE = 40;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  readonly limiter = new SupportRateLimiter();
  private readonly people = new Map<string, { at: number; p: Person | null }>();
  private readonly tenants = new Map<string, { at: number; t: { id: string; name: string; phone: string | null; businessType: string | null; status: string; language: string } | null }>();
  private readonly botTimers = new Map<string, NodeJS.Timeout>();
  private readonly lastOfflineEmail = new Map<string, number>();
  private readonly lastAwayLine = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly hub: SupportHub,
    private readonly settings: SupportSettingsService,
    private readonly ai: SupportAiService,
    private readonly email: EmailService,
    private readonly cloudinary: CloudinaryService,
    private readonly config: ConfigService,
    private readonly alerts: StaffAlertsService,
  ) {}

  /* ═════════════════════════ lookups ═════════════════════════ */

  async person(id: string | null | undefined): Promise<Person | null> {
    if (!id) return null;
    const hit = this.people.get(id);
    if (hit && Date.now() - hit.at < PEOPLE_TTL_MS) return hit.p;
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, avatarUrl: true, email: true, phone: true, language: true, lastSeenAt: true, tenantId: true },
    });
    const p = u ? { id: u.id, name: u.fullName, avatarUrl: u.avatarUrl, email: u.email, phone: u.phone, language: u.language, lastSeenAt: u.lastSeenAt, tenantId: u.tenantId } : null;
    this.people.set(id, { at: Date.now(), p });
    return p;
  }

  private async peopleMap(ids: Array<string | null | undefined>) {
    const uniq = [...new Set(ids.filter((x): x is string => !!x))];
    const out = new Map<string, Person>();
    await Promise.all(uniq.map(async (id) => { const p = await this.person(id); if (p) out.set(id, p); }));
    return out;
  }

  async tenant(id: string) {
    const hit = this.tenants.get(id);
    if (hit && Date.now() - hit.at < PEOPLE_TTL_MS) return hit.t;
    const t = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true, name: true, phone: true, businessType: true, status: true, language: true } });
    const v = t ? { ...t, status: String(t.status) } : null;
    this.tenants.set(id, { at: Date.now(), t: v });
    return v;
  }

  /** The merchant's language for a conversation: the opener's setting, else the shop's, else English. */
  private async convLang(c: Pick<ConvRow, 'openedByUserId' | 'tenantId'>): Promise<SupportLang> {
    const [u, t] = await Promise.all([this.person(c.openedByUserId), this.tenant(c.tenantId)]);
    return pickLang(u?.language, t?.language);
  }

  private async userLang(userId: string, tenantId: string | null): Promise<SupportLang> {
    const [u, t] = await Promise.all([this.person(userId), tenantId ? this.tenant(tenantId) : null]);
    return pickLang(u?.language, t?.language);
  }

  agentRef(id: string | null, person: Person | null | undefined): SupportAgentRef | null {
    if (!id) return null;
    const live = this.hub.presence.agent(id);
    return {
      id,
      name: firstName(person?.name ?? live?.name),
      avatarUrl: person?.avatarUrl ?? live?.avatarUrl ?? null,
      state: this.hub.presence.agentState(id),
      lastSeenAt: iso(live?.lastSeenAt ?? person?.lastSeenAt ?? null),
    };
  }

  /* ═════════════════════════ DTOs ═════════════════════════ */

  /**
   * Message rows as one side sees them. The shop sees a deleted message as
   * empty and never sees call recordings. The team sees the original content
   * of a deleted message (until a super admin purges it), who deleted it, and
   * the earlier versions of an edited one.
   */
  async toMessages(rows: MsgRow[], side: 'MERCHANT' | 'ADMIN' = 'MERCHANT'): Promise<SupportMessage[]> {
    const replyIds = [...new Set(rows.map((r) => r.replyToId).filter((x): x is string => !!x))];
    const replies = replyIds.length ? await this.prisma.liveSupportMessage.findMany({ where: { id: { in: replyIds } } }) : [];
    const byId = new Map(replies.map((r) => [r.id, r]));
    const admin = side === 'ADMIN';
    const names = await this.peopleMap(rows.flatMap((r) => [r.senderUserId, ...(admin ? [r.deletedById, r.purgedById] : [])]));
    return rows.map((r) => {
      const rt = r.replyToId ? byId.get(r.replyToId) : undefined;
      const p = r.senderUserId ? names.get(r.senderUserId) : undefined;
      const files = (r.attachments as unknown as SupportAttachment[]) ?? [];
      const base: SupportMessage = {
        id: r.id,
        conversationId: r.conversationId,
        sender: r.sender as SupportMessage['sender'],
        senderUserId: r.senderUserId,
        senderName: (r.meta as SupportMessageMeta | null)?.senderName ?? (r.sender === 'ADMIN' ? firstName(p?.name) : r.sender === 'MERCHANT' ? p?.name ?? null : null),
        kind: r.kind as SupportMessage['kind'],
        text: admin ? (r.purgedAt ? null : r.text) : r.deletedAt ? null : r.text,
        attachments: admin ? files : r.deletedAt ? [] : merchantAttachments(files),
        replyTo: rt
          ? {
              id: rt.id, sender: rt.sender as SupportMessage['sender'], kind: rt.kind as SupportMessage['kind'],
              text: (admin ? rt.purgedAt : rt.deletedAt) ? null : rt.text?.slice(0, 140) ?? null, deleted: !!rt.deletedAt,
            }
          : null,
        meta: (r.meta as SupportMessageMeta | null) ?? null,
        clientId: r.clientId,
        deliveredAt: iso(r.deliveredAt),
        readAt: iso(r.readAt),
        editedAt: iso(r.editedAt),
        deletedAt: iso(r.deletedAt),
        internal: r.internal,
        createdAt: r.createdAt.toISOString(),
      };
      if (!admin) return base;
      const delName = r.deletedById ? names.get(r.deletedById)?.name : undefined;
      return {
        ...base,
        history: r.purgedAt ? [] : readHistory(r.history),
        deletedBy: (r.deletedBy as SupportMessage['deletedBy']) ?? null,
        deletedByName: r.deletedBy === 'ADMIN' ? firstName(delName) : delName ?? null,
        purgedAt: iso(r.purgedAt),
        purgedByName: r.purgedById ? firstName(names.get(r.purgedById)?.name) : null,
      };
    });
  }

  async toMerchantConversation(c: ConvRow): Promise<SupportConversation> {
    const agent = c.assignedAdminId ? await this.person(c.assignedAdminId) : null;
    return {
      id: c.id,
      tenantId: c.tenantId,
      shopId: c.shopId,
      subject: c.subject,
      status: c.status as SupportStatus,
      source: c.source as SupportSource,
      lastMessageAt: c.lastMessageAt.toISOString(),
      lastMessagePreview: c.lastMessagePreview,
      unread: c.unreadForMerchant,
      assignedAgent: this.agentRef(c.assignedAdminId, agent),
      rating: (c.rating as 'up' | 'down' | null) ?? null,
      ratingNote: c.ratingNote,
      createdAt: c.createdAt.toISOString(),
      resolvedAt: iso(c.resolvedAt),
    };
  }

  async toAdminConversations(rows: ConvRow[]): Promise<SupportAdminConversation[]> {
    const people = await this.peopleMap(rows.flatMap((c) => [c.openedByUserId, c.assignedAdminId]));
    const tenantIds = [...new Set(rows.map((c) => c.tenantId))];
    const tenants = new Map((await Promise.all(tenantIds.map((id) => this.tenant(id)))).filter(Boolean).map((t) => [t!.id, t!]));
    return rows.map((c) => {
      const t = tenants.get(c.tenantId);
      const opener = c.openedByUserId ? people.get(c.openedByUserId) : undefined;
      return {
        id: c.id,
        tenantId: c.tenantId,
        shopId: c.shopId,
        subject: c.subject,
        status: c.status as SupportStatus,
        source: c.source as SupportSource,
        lastMessageAt: c.lastMessageAt.toISOString(),
        lastMessagePreview: c.lastMessagePreview,
        unread: c.unreadForAdmin,
        assignedAgent: this.agentRef(c.assignedAdminId, c.assignedAdminId ? people.get(c.assignedAdminId) : null),
        rating: (c.rating as 'up' | 'down' | null) ?? null,
        ratingNote: c.ratingNote,
        createdAt: c.createdAt.toISOString(),
        resolvedAt: iso(c.resolvedAt),
        priority: c.priority as SupportAdminConversation['priority'],
        tags: c.tags,
        assignedAdminId: c.assignedAdminId,
        unreadForMerchant: c.unreadForMerchant,
        unreadForAdmin: c.unreadForAdmin,
        waitingSince: iso(c.waitingSince),
        firstResponseAt: iso(c.firstResponseAt),
        tenant: { id: c.tenantId, name: t?.name ?? 'Shop', phone: t?.phone ?? null, businessType: t?.businessType ?? null, status: t?.status ?? '' },
        openedBy: opener ? { id: opener.id, name: opener.name, email: opener.email, phone: opener.phone } : null,
        merchantOnline: this.hub.presence.merchantOnline(c.tenantId),
      };
    });
  }

  /* ═════════════════════════ push ═════════════════════════ */

  private async pushConversation(c: ConvRow) {
    const [m, [a]] = await Promise.all([this.toMerchantConversation(c), this.toAdminConversations([c])]);
    this.hub.toMerchants(c.tenantId, SUPPORT_EVENTS.conversation, { conversation: m });
    this.hub.toAgents(SUPPORT_EVENTS.conversation, { conversation: a });
  }

  /** Pushes both views of a message; returns the view of `side` (the caller's). */
  private async pushMessage(c: ConvRow, row: MsgRow, event: string = SUPPORT_EVENTS.message, side: 'MERCHANT' | 'ADMIN' = 'MERCHANT') {
    const [[mine], [team]] = await Promise.all([this.toMessages([row], 'MERCHANT'), this.toMessages([row], 'ADMIN')]);
    if (!row.internal) this.hub.toMerchants(c.tenantId, event, { conversationId: c.id, message: mine });
    this.hub.toAgents(event, { conversationId: c.id, message: team });
    return side === 'ADMIN' ? team : mine;
  }

  /* ═════════════════════════ access ═════════════════════════ */

  async loadFor(viewer: SupportViewer, id: string): Promise<ConvRow> {
    const c = await this.prisma.liveSupportConversation.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Conversation not found');
    if (viewer.side === 'MERCHANT' && !merchantCanSee(c, { tenantId: viewer.tenantId })) throw new NotFoundException('Conversation not found');
    return c;
  }

  /** For the socket: may this viewer join the conversation room? */
  async canJoin(viewer: SupportViewer, id: string): Promise<boolean> {
    try {
      await this.loadFor(viewer, id);
      return true;
    } catch {
      return false;
    }
  }

  /* ═════════════════════════ merchant: status and lists ═════════════════════════ */

  async status(viewer: SupportViewer): Promise<Omit<SupportStatusInfo, 'proactiveOff'>> {
    const s = await this.settings.get();
    const lang = await this.userLang(viewer.id, viewer.tenantId);
    const team = this.hub.presence.team();
    const inHours = withinWorkingHours(s.workingHours, new Date());
    const unread = viewer.tenantId
      ? (await this.prisma.liveSupportConversation.aggregate({ where: { tenantId: viewer.tenantId }, _sum: { unreadForMerchant: true } }))._sum.unreadForMerchant ?? 0
      : 0;
    return {
      team: { state: team.state, online: team.online, away: team.away, lastSeenAt: iso(team.lastSeenAt) },
      withinHours: inHours,
      hoursText: hoursText(s.workingHours),
      lang,
      welcomeMessage: tr(s.welcomeMessage, lang),
      awayMessage: tr(s.awayMessage, lang),
      teamLine: teamLine(team.state, inHours, lang),
      expectedReplyMinutes: s.expectedReplyMinutes,
      aiEnabled: s.aiFirstResponder,
      quickReplies: quickRepliesFor(lang),
      supportPhone: s.supportPhone,
      supportWhatsapp: s.supportWhatsapp,
      iceServers: this.settings.iceServers(),
      limits: SUPPORT_LIMITS,
      allowedMime: SUPPORT_ALLOWED_MIME,
      unread,
      latestUnread: unread ? await this.latestUnread(viewer.tenantId!) : null,
    };
  }

  /** Newest unread team / Nafaa AI message of the shop, for the bubble's one-time preview. */
  private async latestUnread(tenantId: string): Promise<SupportStatusInfo['latestUnread']> {
    const row = await this.prisma.liveSupportMessage.findFirst({
      where: { conversation: { tenantId }, sender: { in: ['ADMIN', 'BOT'] }, internal: false, readAt: null, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    const [message] = await this.toMessages([row]);
    return { conversationId: row.conversationId, message, proactive: !!message.meta?.proactive };
  }

  async unread(viewer: SupportViewer) {
    if (!viewer.tenantId) return { unread: 0 };
    const r = await this.prisma.liveSupportConversation.aggregate({ where: { tenantId: viewer.tenantId }, _sum: { unreadForMerchant: true } });
    return { unread: r._sum.unreadForMerchant ?? 0 };
  }

  async list(viewer: SupportViewer, cursor?: string): Promise<SupportPage<SupportConversation>> {
    const rows = await this.prisma.liveSupportConversation.findMany({
      where: { tenantId: viewer.tenantId ?? '__none__' },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: 21,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    const page = rows.slice(0, 20);
    return { items: await Promise.all(page.map((c) => this.toMerchantConversation(c))), nextCursor: rows.length > 20 ? page[page.length - 1].id : null };
  }

  async current(viewer: SupportViewer): Promise<SupportConversation | null> {
    const c = await this.prisma.liveSupportConversation.findFirst({
      where: { tenantId: viewer.tenantId ?? '__none__', status: { in: ACTIVE_STATUSES } },
      orderBy: { lastMessageAt: 'desc' },
    });
    return c ? this.toMerchantConversation(c) : null;
  }

  async get(viewer: SupportViewer, id: string): Promise<SupportConversation> {
    return this.toMerchantConversation(await this.loadFor(viewer, id));
  }

  async messages(viewer: SupportViewer, id: string, before?: string, limit = PAGE): Promise<SupportPage<SupportMessage>> {
    await this.loadFor(viewer, id);
    const take = Math.min(100, Math.max(1, limit));
    const where: Prisma.LiveSupportMessageWhereInput = { conversationId: id, ...(viewer.side === 'MERCHANT' && { internal: false }) };
    if (before) {
      const b = await this.prisma.liveSupportMessage.findFirst({ where: { id: before, conversationId: id }, select: { createdAt: true } });
      if (b) where.createdAt = { lt: b.createdAt };
    }
    const rows = await this.prisma.liveSupportMessage.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: take + 1 });
    const page = rows.slice(0, take);
    const items = await this.toMessages(page.reverse(), viewer.side);
    return { items, nextCursor: rows.length > take ? items[0]?.id ?? null : null };
  }

  /* ═════════════════════════ start ═════════════════════════ */

  /** Opens a conversation, or returns the shop's active one (with the first message posted into it). */
  async start(viewer: SupportViewer, body: SupportStartBody, shopId: string | null) {
    if (viewer.side !== 'MERCHANT' || !viewer.tenantId) throw new ForbiddenException();
    const s = await this.settings.get();
    let c = await this.prisma.liveSupportConversation.findFirst({
      where: { tenantId: viewer.tenantId, status: { in: ACTIVE_STATUSES } },
      orderBy: { lastMessageAt: 'desc' },
    });
    if (!c) {
      const lang = await this.userLang(viewer.id, viewer.tenantId);
      c = await this.prisma.liveSupportConversation.create({
        data: {
          tenantId: viewer.tenantId,
          shopId,
          openedByUserId: viewer.id,
          subject: body.subject?.trim().slice(0, 200) || null,
          status: s.aiFirstResponder ? 'BOT' : 'WAITING',
          source: body.source === 'mobile' ? 'mobile' : 'web',
        },
      });
      await this.addSystem(c, 'welcome', { text: tr(s.welcomeMessage, lang) }, lang, false);
      if (c.status === 'WAITING') c = await this.enterWaiting(c, 'start');
    }
    if (body.text?.trim()) {
      await this.send(viewer, c.id, { text: body.text });
      c = await this.loadFor(viewer, c.id);
    }
    if (body.human && (c.status === 'BOT' || c.status === 'RESOLVED')) c = await this.handover(viewer, c.id);
    const page = await this.messages(viewer, c.id);
    return { conversation: await this.toMerchantConversation(c), messages: page.items };
  }

  /* ═════════════════════════ send ═════════════════════════ */

  private allowedUrl = (url: string) => {
    if (url.startsWith('https://res.cloudinary.com/')) return true;
    const base = (this.config.get<string>('PUBLIC_API_URL') || 'http://localhost:4000').replace(/\/+$/, '');
    return url.startsWith(`${base}/uploads/`);
  };

  async send(viewer: SupportViewer, conversationId: string, body: SupportSendBody, opts: { skipRate?: boolean } = {}): Promise<SupportMessage> {
    const rate = opts.skipRate ? { ok: true as const, retryAfterMs: 0 } : this.limiter.hit(viewer.id);
    if (!rate.ok) {
      throw new HttpException({ message: 'Too many messages. Please wait a moment.', retryAfterMs: rate.retryAfterMs }, HttpStatus.TOO_MANY_REQUESTS);
    }
    let c = await this.loadFor(viewer, conversationId);
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, SUPPORT_LIMITS.maxTextChars) : '';
    const attachments = cleanAttachments(body.attachments, this.allowedUrl);
    if (!text && !attachments.length) throw new BadRequestException('Write a message or attach a file.');
    const internal = viewer.side === 'ADMIN' && body.internal === true;

    // A closed conversation is finished: the merchant's next message starts a new one.
    if (c.status === 'CLOSED' && viewer.side === 'MERCHANT') {
      const s = await this.settings.get();
      c = await this.prisma.liveSupportConversation.create({
        data: { tenantId: c.tenantId, shopId: c.shopId, openedByUserId: viewer.id, status: s.aiFirstResponder ? 'BOT' : 'WAITING', source: c.source === 'mobile' ? 'mobile' : 'web' },
      });
      if (c.status === 'WAITING') c = await this.enterWaiting(c, 'start');
    }

    let replyToId: string | null = null;
    if (body.replyToId) {
      const r = await this.prisma.liveSupportMessage.findFirst({ where: { id: body.replyToId, conversationId: c.id }, select: { id: true, internal: true } });
      if (r && (viewer.side === 'ADMIN' || !r.internal)) replyToId = r.id;
    }

    const kind = kindForAttachments(attachments, body.kind);
    const now = new Date();
    const row = await this.prisma.liveSupportMessage.create({
      data: {
        conversationId: c.id,
        sender: viewer.side,
        senderUserId: viewer.id,
        kind,
        text: text || null,
        attachments: attachments as unknown as Prisma.InputJsonValue,
        replyToId,
        clientId: typeof body.clientId === 'string' ? body.clientId.slice(0, 64) : null,
        internal,
        createdAt: now,
      },
    });
    const preview = previewFor({ kind, text, attachments });

    if (viewer.side === 'MERCHANT') {
      const s = await this.settings.get();
      const humanInvolved = !!c.firstResponseAt;
      const to = statusAfterMerchantMessage(c.status as SupportStatus, { aiEnabled: s.aiFirstResponder, humanInvolved });
      const before = c.status as SupportStatus;
      c = await this.prisma.liveSupportConversation.update({
        where: { id: c.id },
        data: {
          status: to,
          lastMessageAt: now,
          lastMessagePreview: preview,
          unreadForAdmin: { increment: 1 },
          waitingSince: nextWaitingSince(c.waitingSince, to, now),
          ...(before === 'RESOLVED' && { resolvedAt: null }),
        },
      });
      const msg = await this.pushMessage(c, row, SUPPORT_EVENTS.message, 'MERCHANT');
      // A reply within a day of a proactive message counts for its stats.
      void this.prisma.liveSupportProactive.updateMany({
        where: { tenantId: c.tenantId, repliedAt: null, messageId: { not: null }, sentAt: { gte: new Date(now.getTime() - 86_400_000) } },
        data: { repliedAt: now },
      }).catch(() => undefined);
      if (before === 'RESOLVED' && to !== 'RESOLVED') await this.addSystem(c, 'reopened', {}, await this.convLang(c));
      if (to === 'WAITING' && before !== 'WAITING') c = await this.enterWaiting(c, 'message');
      await this.pushConversation(c);
      if (to === 'BOT') this.scheduleBot(c.id);
      else this.alertTeam(c, preview, before !== to && to === 'WAITING');
      return msg;
    }

    // Admin
    const firstReplyByAgent = !internal && !(await this.prisma.liveSupportMessage.findFirst({
      where: { conversationId: c.id, sender: 'ADMIN', senderUserId: viewer.id, internal: false, id: { not: row.id } },
      select: { id: true },
    }));
    const to = statusAfterAdminMessage(c.status as SupportStatus, internal);
    c = await this.prisma.liveSupportConversation.update({
      where: { id: c.id },
      data: internal
        ? { updatedAt: now }
        : {
            status: to,
            lastMessageAt: now,
            lastMessagePreview: preview,
            unreadForMerchant: { increment: 1 },
            waitingSince: nextWaitingSince(c.waitingSince, to, now),
            firstResponseAt: c.firstResponseAt ?? now,
            ...(!c.assignedAdminId && { assignedAdminId: viewer.id, assignedAt: now }),
            ...((c.status === 'RESOLVED' || c.status === 'CLOSED') && { resolvedAt: null, closedAt: null }),
          },
    });
    if (firstReplyByAgent) {
      const agent = await this.person(viewer.id);
      await this.addSystem(c, 'agent_joined', { name: firstName(agent?.name) }, await this.convLang(c), true, new Date(now.getTime() - 1));
    }
    const msg = await this.pushMessage(c, row, SUPPORT_EVENTS.message, 'ADMIN');
    await this.pushConversation(c);
    if (!internal) {
      void this.maybeEmailMerchant(c, viewer.id, preview).catch(() => undefined);
      void this.maybePush(c, firstName((await this.person(viewer.id))?.name), preview).catch(() => undefined);
    }
    return msg;
  }

  /* ═════════════════════════ system lines ═════════════════════════ */

  /** Writes and pushes a SYSTEM line in the merchant's language. */
  async addSystem(
    c: ConvRow,
    code: SupportSystemCode,
    params: Record<string, string | number | null>,
    lang: SupportLang,
    touch = true,
    at: Date = new Date(),
  ) {
    const text = systemText(code, lang, params);
    const row = await this.prisma.liveSupportMessage.create({
      data: { conversationId: c.id, sender: 'SYSTEM', kind: 'SYSTEM', text, meta: { code, params } as Prisma.InputJsonValue, createdAt: at },
    });
    if (touch) await this.prisma.liveSupportConversation.update({ where: { id: c.id }, data: { lastMessageAt: at } });
    await this.pushMessage(c, row);
    return row;
  }

  /* ═════════════════════════ handover, waiting, assignment ═════════════════════════ */

  async handover(viewer: SupportViewer, id: string): Promise<ConvRow> {
    let c = await this.loadFor(viewer, id);
    const to = statusAfterHandover(c.status as SupportStatus);
    if (to === c.status) return c;
    const now = new Date();
    c = await this.prisma.liveSupportConversation.update({
      where: { id: c.id },
      data: { status: to, waitingSince: nextWaitingSince(c.waitingSince, to, now), resolvedAt: null },
    });
    this.cancelBot(c.id);
    c = await this.enterWaiting(c, 'handover');
    await this.pushConversation(c);
    this.alertTeam(c, c.lastMessagePreview ?? '', true);
    return c;
  }

  /**
   * The conversation now waits for the team: record the handover time, post
   * the handover line (or the away message when nobody is on), and auto-assign.
   */
  private async enterWaiting(c: ConvRow, why: 'start' | 'message' | 'handover'): Promise<ConvRow> {
    const s = await this.settings.get();
    const lang = await this.convLang(c);
    const now = new Date();
    if (!c.handedOverAt) c = await this.prisma.liveSupportConversation.update({ where: { id: c.id }, data: { handedOverAt: now } });
    const team = this.hub.presence.team();
    const inHours = withinWorkingHours(s.workingHours, now);
    if (team.state !== 'online' || !inHours) {
      const last = this.lastAwayLine.get(c.id) ?? 0;
      if (now.getTime() - last > AWAY_LINE_GAP_MS) {
        this.lastAwayLine.set(c.id, now.getTime());
        await this.addSystem(c, 'away', { away: tr(s.awayMessage, lang), eta: etaText(s.expectedReplyMinutes, lang) }, lang);
      }
    } else if (why === 'handover') {
      await this.addSystem(c, 'handover', {}, lang);
    }
    if (s.autoAssign === 'round_robin' && !c.assignedAdminId) c = await this.autoAssign(c);
    return c;
  }

  private async autoAssign(c: ConvRow): Promise<ConvRow> {
    const pool = this.hub.presence.onlineRepliers();
    if (!pool.length) return c;
    const [last, open] = await Promise.all([
      this.prisma.liveSupportConversation.groupBy({ by: ['assignedAdminId'], where: { assignedAdminId: { in: pool } }, _max: { assignedAt: true } }),
      this.prisma.liveSupportConversation.groupBy({
        by: ['assignedAdminId'],
        where: { assignedAdminId: { in: pool }, status: { in: ['WAITING', 'OPEN', 'PENDING_MERCHANT'] } },
        _count: { _all: true },
      }),
    ]);
    const id = pickRoundRobin(pool.map((a) => ({
      id: a,
      lastAssignedAt: last.find((r) => r.assignedAdminId === a)?._max.assignedAt ?? null,
      openCount: open.find((r) => r.assignedAdminId === a)?._count._all ?? 0,
    })));
    if (!id) return c;
    const updated = await this.prisma.liveSupportConversation.updateMany({ where: { id: c.id, assignedAdminId: null }, data: { assignedAdminId: id, assignedAt: new Date() } });
    if (!updated.count) return (await this.prisma.liveSupportConversation.findUnique({ where: { id: c.id } })) ?? c;
    const row = (await this.prisma.liveSupportConversation.findUnique({ where: { id: c.id } }))!;
    const [a] = await this.toAdminConversations([row]);
    this.hub.toAgent(id, SUPPORT_EVENTS.conversation, { conversation: a, assignedToYou: true });
    return row;
  }

  /** Admin alert for a merchant message or a new wait. Bursts fold into one notification per conversation. */
  private alertTeam(c: ConvRow, preview: string, newWait: boolean) {
    void this.tenant(c.tenantId).then((t) => {
      const shop = t?.name ?? 'Shop';
      notifyAdmins({
        category: 'support',
        event: newWait ? 'support.waiting' : 'support.message',
        severity: newWait ? 'warning' : 'info',
        title: newWait ? `${shop} wants to talk to the team` : `New support message: ${shop}`,
        message: preview || 'New message',
        link: `/support?c=${c.id}`,
        tenantId: c.tenantId,
        entityType: 'support_conversation',
        entityId: c.id,
        metadata: { conversationId: c.id, assignedAdminId: c.assignedAdminId, status: c.status },
        dedupeKey: `support:${c.id}`,
        windowMinutes: 30,
      });
    }).catch(() => undefined);
  }

  /* ═════════════════════════ Nafaa AI first responder ═════════════════════════ */

  private scheduleBot(conversationId: string) {
    this.cancelBot(conversationId);
    // Short wait so several quick messages get one answer.
    this.botTimers.set(conversationId, setTimeout(() => {
      this.botTimers.delete(conversationId);
      void this.botReply(conversationId).catch((e) => this.logger.warn(`Bot reply failed: ${e instanceof Error ? e.message : e}`));
    }, BOT_DELAY_MS));
  }

  private cancelBot(conversationId: string) {
    const t = this.botTimers.get(conversationId);
    if (t) clearTimeout(t);
    this.botTimers.delete(conversationId);
  }

  private async botReply(conversationId: string) {
    let c = await this.prisma.liveSupportConversation.findUnique({ where: { id: conversationId } });
    if (!c || c.status !== 'BOT') return;
    const s = await this.settings.get();
    const lang = await this.convLang(c);
    const typing = (on: boolean) => this.hub.toMerchants(c!.tenantId, SUPPORT_EVENTS.typingEvent, { conversationId, side: 'BOT', name: 'Nafaa AI', typing: on });

    if (!s.aiFirstResponder) {
      await this.handover({ id: c.openedByUserId ?? '', side: 'MERCHANT', tenantId: c.tenantId }, c.id);
      return;
    }
    if (c.botReplies >= BOT_MAX_REPLIES) {
      await this.postBot(c, { text: systemText('handover', lang) }, false);
      await this.handover({ id: c.openedByUserId ?? '', side: 'MERCHANT', tenantId: c.tenantId }, c.id);
      return;
    }

    typing(true);
    try {
      const rows = await this.prisma.liveSupportMessage.findMany({
        where: { conversationId, internal: false, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 16,
        select: { sender: true, text: true, kind: true },
      });
      const t = await this.tenant(c.tenantId);
      const answer = await this.ai.answer(rows.reverse(), { lang, shopName: t?.name ?? 'Shop', businessType: t?.businessType ?? null, latestKind: rows[rows.length - 1]?.kind ?? 'TEXT' });
      // The merchant may have handed over while the answer was being written.
      c = await this.prisma.liveSupportConversation.findUnique({ where: { id: conversationId } });
      if (!c || c.status !== 'BOT') return;
      if (answer.text) await this.postBot(c, { text: answer.text, meta: { chips: answer.chips, offerHandover: answer.offerHandover } }, true);
      if (answer.handover) await this.handover({ id: c.openedByUserId ?? '', side: 'MERCHANT', tenantId: c.tenantId }, c.id);
    } finally {
      typing(false);
    }
  }

  private async postBot(c: ConvRow, m: { text: string; meta?: SupportMessageMeta }, count: boolean) {
    const now = new Date();
    const row = await this.prisma.liveSupportMessage.create({
      data: { conversationId: c.id, sender: 'BOT', kind: 'TEXT', text: m.text, meta: (m.meta ?? undefined) as Prisma.InputJsonValue | undefined, createdAt: now },
    });
    const updated = await this.prisma.liveSupportConversation.update({
      where: { id: c.id },
      data: { lastMessageAt: now, lastMessagePreview: previewFor({ kind: 'TEXT', text: m.text, attachments: [] }), unreadForMerchant: { increment: 1 }, ...(count && { botReplies: { increment: 1 } }) },
    });
    await this.pushMessage(updated, row);
    await this.pushConversation(updated);
  }

  /* ═════════════════════════ offline email ═════════════════════════ */

  private async maybeEmailMerchant(c: ConvRow, agentId: string, preview: string) {
    const s = await this.settings.get();
    if (!s.offlineEmail || this.hub.presence.merchantOnline(c.tenantId)) return;
    const last = this.lastOfflineEmail.get(c.id) ?? 0;
    if (Date.now() - last < OFFLINE_EMAIL_GAP_MS) return;
    let to = await this.person(c.openedByUserId);
    if (!to?.email) {
      const owner = await this.prisma.user.findFirst({ where: { tenantId: c.tenantId, role: 'OWNER', isActive: true }, select: { id: true } });
      to = await this.person(owner?.id);
    }
    if (!to?.email) return;
    this.lastOfflineEmail.set(c.id, Date.now());
    const t = await this.tenant(c.tenantId);
    const lang = pickLang(to.language, t?.language);
    const agent = await this.person(agentId);
    const base = (this.config.get<string>('WEB_APP_URL') || this.config.get<string>('APP_URL') || 'https://app.nafaa.pk').replace(/\/+$/, '');
    const mail = offlineEmail(lang, { name: firstName(to.name), agent: firstName(agent?.name), preview, link: `${base}/support` });
    await this.email.send({ tenantId: c.tenantId, toEmail: to.email, toName: to.name, subject: mail.subject, bodyHtml: mail.html, bodyText: mail.text });
  }

  /**
   * Phone push for a team message while nobody from the shop has the app open:
   * to the person who opened the chat and the owners, in their language.
   */
  private async maybePush(c: ConvRow, agentName: string, preview: string) {
    if (this.hub.presence.merchantOnline(c.tenantId)) return;
    const owners = await this.prisma.user.findMany({ where: { tenantId: c.tenantId, role: 'OWNER', isActive: true }, select: { id: true } });
    const userIds = [...new Set([...(c.openedByUserId ? [c.openedByUserId] : []), ...owners.map((o) => o.id)])];
    const title = { en: 'Nafaa support', ur: 'نفع سپورٹ', roman: 'Nafaa support' };
    await this.alerts.pushSupport({
      tenantId: c.tenantId,
      userIds,
      text: (language) => ({ title: title[pickLang(language)], body: `${agentName}: ${preview}`.slice(0, 180) }),
      data: { kind: 'support', link: '/support', conversationId: c.id },
    });
  }

  /* ═════════════════════════ receipts ═════════════════════════ */

  async markRead(viewer: SupportViewer, id: string) {
    const c = await this.loadFor(viewer, id);
    if (viewer.impersonatedBy) return { ok: true };
    const now = new Date();
    const other = viewer.side === 'MERCHANT' ? ['ADMIN', 'BOT', 'SYSTEM'] : ['MERCHANT'];
    const r = await this.prisma.liveSupportMessage.updateMany({ where: { conversationId: id, sender: { in: other }, readAt: null }, data: { readAt: now } });
    await this.prisma.liveSupportMessage.updateMany({ where: { conversationId: id, sender: { in: other }, deliveredAt: null }, data: { deliveredAt: now } });
    const field = viewer.side === 'MERCHANT' ? 'unreadForMerchant' : 'unreadForAdmin';
    if (r.count || c[field]) {
      const updated = await this.prisma.liveSupportConversation.update({ where: { id }, data: { [field]: 0 } });
      const evt = { conversationId: id, of: viewer.side === 'MERCHANT' ? 'ADMIN' : 'MERCHANT', at: now.toISOString() };
      this.hub.toMerchants(c.tenantId, SUPPORT_EVENTS.readEvent, evt);
      this.hub.toAgents(SUPPORT_EVENTS.readEvent, evt);
      await this.pushConversation(updated);
    }
    return { ok: true };
  }

  async markDelivered(viewer: SupportViewer, id: string) {
    const c = await this.loadFor(viewer, id);
    const now = new Date();
    const other = viewer.side === 'MERCHANT' ? ['ADMIN', 'BOT'] : ['MERCHANT'];
    const r = await this.prisma.liveSupportMessage.updateMany({ where: { conversationId: id, sender: { in: other }, deliveredAt: null }, data: { deliveredAt: now } });
    if (r.count) {
      const evt = { conversationId: id, of: viewer.side === 'MERCHANT' ? 'ADMIN' : 'MERCHANT', at: now.toISOString() };
      this.hub.toMerchants(c.tenantId, SUPPORT_EVENTS.deliveredEvent, evt);
      this.hub.toAgents(SUPPORT_EVENTS.deliveredEvent, evt);
    }
    return { ok: true };
  }

  /* ═════════════════════════ status changes ═════════════════════════ */

  /** Status change by either side, with its system line. */
  async setStatus(viewer: SupportViewer, id: string, to: SupportStatus): Promise<ConvRow> {
    if (!isSupportStatus(to)) throw new BadRequestException('Unknown status');
    let c = await this.loadFor(viewer, id);
    const from = c.status as SupportStatus;
    if (!canSetStatus(viewer.side, from, to)) throw new BadRequestException(`Cannot change ${from} to ${to}`);
    if (from === to) return c;
    if (to === 'WAITING' && viewer.side === 'MERCHANT') return this.handover(viewer, id);
    const now = new Date();
    c = await this.prisma.liveSupportConversation.update({
      where: { id },
      data: {
        status: to,
        waitingSince: nextWaitingSince(c.waitingSince, to, now),
        ...(to === 'RESOLVED' && { resolvedAt: now }),
        ...(to === 'CLOSED' && { closedAt: now, resolvedAt: c.resolvedAt ?? now }),
        ...((from === 'RESOLVED' || from === 'CLOSED') && to !== 'RESOLVED' && to !== 'CLOSED' && { resolvedAt: null, closedAt: null }),
      },
    });
    if (to === 'BOT' || to === 'WAITING' || to === 'OPEN' || to === 'PENDING_MERCHANT') this.cancelBot(id);
    const lang = await this.convLang(c);
    if (to === 'RESOLVED') await this.addSystem(c, 'resolved', {}, lang);
    else if (to === 'CLOSED') await this.addSystem(c, 'closed', {}, lang);
    else if (from === 'RESOLVED' || from === 'CLOSED') await this.addSystem(c, 'reopened', {}, lang);
    if (to === 'WAITING' && from !== 'WAITING') c = await this.enterWaiting(c, 'handover');
    await this.pushConversation(c);
    return c;
  }

  async rate(viewer: SupportViewer, id: string, rating: unknown, note: unknown) {
    if (rating !== 'up' && rating !== 'down') throw new BadRequestException('Rating must be up or down');
    let c = await this.loadFor(viewer, id);
    c = await this.prisma.liveSupportConversation.update({
      where: { id },
      data: { rating, ratingNote: typeof note === 'string' ? note.trim().slice(0, 1000) || null : null, ratedAt: new Date() },
    });
    await this.addSystem(c, 'rated', { rating }, await this.convLang(c), false);
    await this.pushConversation(c);
    if (rating === 'down') {
      const t = await this.tenant(c.tenantId);
      notifyAdmins({
        category: 'support', event: 'support.rated_down', severity: 'warning',
        title: `${t?.name ?? 'Shop'} was not happy with support`,
        message: c.ratingNote || 'Thumbs down, no note.',
        link: `/support?c=${c.id}`, tenantId: c.tenantId, entityType: 'support_conversation', entityId: c.id,
        dedupeKey: `support-rating:${c.id}`, once: true,
      });
    }
    return this.toMerchantConversation(c);
  }

  /* ═════════════════════════ edit / delete ═════════════════════════ */

  async editMessage(viewer: SupportViewer, messageId: string, text: unknown) {
    const m = await this.prisma.liveSupportMessage.findUnique({ where: { id: messageId } });
    if (!m) throw new NotFoundException('Message not found');
    const c = await this.loadFor(viewer, m.conversationId);
    if (viewer.side === 'MERCHANT' && m.internal) throw new NotFoundException('Message not found');
    if (!canEditMessage(m, { id: viewer.id, side: viewer.side }, new Date())) throw new ForbiddenException('This message can no longer be edited.');
    const t = typeof text === 'string' ? text.trim().slice(0, SUPPORT_LIMITS.maxTextChars) : '';
    if (!t) throw new BadRequestException('Text is required');
    if (t === m.text) return (await this.toMessages([m], viewer.side))[0];
    // The replaced text is kept: the team can open earlier versions later.
    const history = historyAfterEdit(m.history, m);
    const row = await this.prisma.liveSupportMessage.update({
      where: { id: messageId },
      data: { text: t, editedAt: new Date(), history: history as unknown as Prisma.InputJsonValue },
    });
    return this.pushMessage(c, row, SUPPORT_EVENTS.messageUpdated, viewer.side);
  }

  async deleteMessage(viewer: SupportViewer, messageId: string) {
    const m = await this.prisma.liveSupportMessage.findUnique({ where: { id: messageId } });
    if (!m) throw new NotFoundException('Message not found');
    const c = await this.loadFor(viewer, m.conversationId);
    if (viewer.side === 'MERCHANT' && m.internal) throw new NotFoundException('Message not found');
    if (!canDeleteMessage(m, { id: viewer.id, side: viewer.side, manage: viewer.manage })) throw new ForbiddenException('You cannot delete this message.');
    // Soft: text and files stay for the team; the shop no longer sees them.
    const row = await this.prisma.liveSupportMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedBy: viewer.side, deletedById: viewer.id },
    });
    return this.pushMessage(c, row, SUPPORT_EVENTS.messageUpdated, viewer.side);
  }

  /**
   * Super admin: remove a message's content for good (text, files, earlier
   * versions). The row stays as a tombstone (who sent it, when, who removed
   * it), the stored files are deleted when no other message uses them, and
   * the admin audit log gets an entry.
   */
  async purgeMessage(admin: { id: string; email?: string | null; isSuperAdmin: boolean }, messageId: string, reason?: string) {
    const m = await this.prisma.liveSupportMessage.findUnique({ where: { id: messageId } });
    if (!m) throw new NotFoundException('Message not found');
    if (!canPurgeMessage(m, admin)) throw new ForbiddenException(m.purgedAt ? 'This message was already removed.' : 'Only a super admin can delete permanently.');
    const c = await this.loadFor({ id: admin.id, side: 'ADMIN', tenantId: null }, m.conversationId);
    const files = ((m.attachments as unknown as SupportAttachment[]) ?? []).filter((a) => a && typeof a.url === 'string');
    const history = readHistory(m.history);
    const now = new Date();
    const row = await this.prisma.liveSupportMessage.update({
      where: { id: messageId },
      data: {
        text: null,
        attachments: [] as unknown as Prisma.InputJsonValue,
        history: Prisma.DbNull,
        // A call line stays a call line for the shop; only its recordings go.
        ...(m.kind !== 'CALL_EVENT' && { deletedAt: m.deletedAt ?? now, deletedBy: m.deletedBy ?? 'ADMIN', deletedById: m.deletedById ?? admin.id }),
        purgedAt: now,
        purgedById: admin.id,
      },
    });
    await this.prisma.adminAuditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email ?? null,
        action: 'support.message.purge',
        method: 'DELETE',
        path: `/admin/support/messages/${messageId}/permanent`,
        targetType: 'support_message',
        targetId: messageId,
        statusCode: 200,
        summary: `Removed for good: ${m.kind} message from ${m.sender} (${files.length} file(s), ${history.length} earlier version(s))`,
        metadata: {
          conversationId: m.conversationId, tenantId: c.tenantId, sender: m.sender, senderUserId: m.senderUserId, kind: m.kind,
          sentAt: m.createdAt.toISOString(), textChars: m.text?.length ?? 0, files: files.map((f) => ({ name: f.name, mime: f.mime, bytes: f.bytes, recording: f.recording ?? null })),
          reason: typeof reason === 'string' ? reason.trim().slice(0, 500) || null : null,
        } as Prisma.InputJsonValue,
      },
    });
    for (const f of files) void this.removeStoredFile(f.url).catch((e) => this.logger.warn(`Purge: file not removed (${f.url}): ${e instanceof Error ? e.message : e}`));
    this.logger.log(`Support message ${messageId} purged by ${admin.id}`);
    return this.pushMessage(c, row, SUPPORT_EVENTS.messageUpdated, 'ADMIN');
  }

  /** Deletes an uploaded support file unless another message still uses it. */
  private async removeStoredFile(url: string) {
    const used = await this.prisma.liveSupportMessage.findFirst({ where: { attachments: { array_contains: [{ url }] } }, select: { id: true } });
    if (used) return;
    if (url.startsWith('https://res.cloudinary.com/')) {
      const m = url.match(/\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/);
      if (!m || !this.cloudinary.isConfigured()) return;
      const type = m[1] as 'image' | 'video' | 'raw';
      // Raw files keep their extension in the public id; images and media do not.
      const publicId = type === 'raw' ? decodeURIComponent(m[2]) : decodeURIComponent(m[2]).replace(/\.[a-z0-9]+$/i, '');
      await cloudinaryApi.uploader.destroy(publicId, { resource_type: type, invalidate: true });
      return;
    }
    const base = (this.config.get<string>('PUBLIC_API_URL') || 'http://localhost:4000').replace(/\/+$/, '');
    if (!url.startsWith(`${base}/uploads/`)) return;
    const root = path.join(process.cwd(), 'uploads');
    const file = path.normalize(path.join(root, decodeURIComponent(url.slice(`${base}/uploads/`.length))));
    if (!file.startsWith(root + path.sep) || !file.includes(`${path.sep}support${path.sep}`)) return;
    await fs.promises.unlink(file).catch(() => undefined);
  }

  /* ═════════════════════════ uploads ═════════════════════════ */

  async upload(
    viewer: SupportViewer,
    file: Express.Multer.File | undefined,
    extra: { durationSec?: string; waveform?: string; width?: string; height?: string },
  ): Promise<SupportAttachment> {
    const rate = this.limiter.hit(`upload:${viewer.id}`);
    if (!rate.ok) throw new HttpException({ message: 'Too many files. Please wait a moment.', retryAfterMs: rate.retryAfterMs }, HttpStatus.TOO_MANY_REQUESTS);
    if (!file?.buffer?.length) throw new BadRequestException('No file uploaded');
    const mime = baseMime(file.mimetype || '');
    const name = (file.originalname || 'file').replace(/[^\p{L}\p{N}.\-_ ]/gu, '_').slice(0, 120);
    const err = checkUpload({ mime, bytes: file.size || file.buffer.length, name });
    if (err) throw new BadRequestException(err);
    const folderTenant = viewer.tenantId ?? 'admin';
    const num = (v?: string) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
    let waveform: number[] | null = null;
    try {
      const w = extra.waveform ? JSON.parse(extra.waveform) : null;
      if (Array.isArray(w)) waveform = w.slice(0, 64).map((x: unknown) => (typeof x === 'number' ? Math.min(1, Math.max(0, x)) : 0));
    } catch {
      waveform = null;
    }

    const stored = await this.store(file.buffer, mime, name, `${folderTenant}/support`);
    const url = stored.url;
    const width = stored.width ?? num(extra.width);
    const height = stored.height ?? num(extra.height);
    const durationSec = num(extra.durationSec);
    return {
      url, name, mime, bytes: file.size || file.buffer.length, width, height,
      durationSec: durationSec == null ? null : Math.min(SUPPORT_LIMITS.maxVoiceSec + 5, Math.max(0, durationSec)),
      waveform,
    };
  }

  /** Saves a file to Cloudinary (or this API's /uploads when Cloudinary is not set up). */
  private async store(buffer: Buffer, mime: string, name: string, folder: string): Promise<{ url: string; width: number | null; height: number | null }> {
    if (this.cloudinary.isConfigured()) {
      const resourceType = mime.startsWith('image/') ? 'image' : mime.startsWith('audio/') || mime.startsWith('video/') ? 'video' : 'raw';
      const res = await this.cloudinary.uploadBuffer(buffer, { folder, resourceType, publicId: resourceType === 'raw' ? `${randomUUID()}-${name}` : undefined });
      return { url: res.secure_url, width: resourceType === 'image' ? res.width ?? null : null, height: resourceType === 'image' ? res.height ?? null : null };
    }
    const dir = path.join(process.cwd(), 'uploads', ...folder.split('/'));
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${name.replace(/[^a-z0-9.\-_]/gi, '_')}`;
    fs.writeFileSync(path.join(dir, filename), buffer);
    const base = (this.config.get<string>('PUBLIC_API_URL') || 'http://localhost:4000').replace(/\/+$/, '');
    return { url: `${base}/uploads/${folder}/${filename}`, width: null, height: null };
  }

  /* ═════════════════════════ calls ═════════════════════════ */

  /** Recordings that arrived before their call's CALL_EVENT line was written (per callId). */
  private readonly pendingRecordings = new Map<string, { at: number; conversationId: string; items: SupportAttachment[] }>();

  private takePendingRecordings(callId: string, conversationId: string): SupportAttachment[] {
    const p = this.pendingRecordings.get(callId);
    if (!p || p.conversationId !== conversationId) return [];
    this.pendingRecordings.delete(callId);
    return p.items;
  }

  /** Logs a CALL_EVENT line once the call is over (both sides see it; recordings only the team). */
  async logCall(conversationId: string, call: NonNullable<SupportMessageMeta['call']>, byUserId: string | null) {
    const c = await this.prisma.liveSupportConversation.findUnique({ where: { id: conversationId } });
    if (!c) return;
    const now = new Date();
    let row = await this.prisma.liveSupportMessage.create({
      data: { conversationId, sender: call.startedBy, senderUserId: byUserId, kind: 'CALL_EVENT', meta: { call } as Prisma.InputJsonValue, createdAt: now },
    });
    const early = this.takePendingRecordings(call.callId, conversationId);
    if (early.length) row = await this.appendAttachments(row.id, early);
    const updated = await this.prisma.liveSupportConversation.update({ where: { id: conversationId }, data: { lastMessageAt: now, lastMessagePreview: previewFor({ kind: 'CALL_EVENT', text: null, attachments: [] }) } });
    await this.pushMessage(updated, row);
    await this.pushConversation(updated);
  }

  /** Adds files to a message in one statement, so two recordings arriving together both stay. */
  private async appendAttachments(messageId: string, items: SupportAttachment[]): Promise<MsgRow> {
    await this.prisma.$executeRaw`UPDATE "live_support_messages" SET "attachments" = COALESCE("attachments", '[]'::jsonb) || ${JSON.stringify(items)}::jsonb WHERE "id" = ${messageId}`;
    return (await this.prisma.liveSupportMessage.findUnique({ where: { id: messageId } }))!;
  }

  private findCallLine(conversationId: string, callId: string) {
    return this.prisma.liveSupportMessage.findFirst({
      where: { conversationId, kind: 'CALL_EVENT', meta: { path: ['call', 'callId'], equals: callId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * A call or screen recording from the admin app: stored under the shop's
   * folder and added to the call's CALL_EVENT line. When the call is still
   * running (screen recording stopped mid-call) the file waits in memory and
   * is added as soon as the line is written.
   */
  async uploadRecording(
    adminId: string,
    callId: string,
    file: Express.Multer.File | undefined,
    extra: { conversationId?: string; kind?: string; durationSec?: string; startedAt?: string; part?: string },
  ): Promise<{ attachment: SupportAttachment; attached: boolean }> {
    if (!file?.buffer?.length) throw new BadRequestException('No file uploaded');
    const callKey = String(callId ?? '').slice(0, 64);
    if (!callKey || !extra.conversationId) throw new BadRequestException('callId and conversationId are required');
    const c = await this.loadFor({ id: adminId, side: 'ADMIN', tenantId: null }, extra.conversationId);
    const mime = baseMime(file.mimetype || '');
    const bytes = file.size || file.buffer.length;
    const err = checkRecording({ mime, bytes });
    if (err) throw new BadRequestException(err);
    const kind: 'call' | 'screen' = extra.kind === 'screen' ? 'screen' : 'call';
    const ext = mime.endsWith('mp4') ? 'mp4' : mime === 'audio/ogg' ? 'ogg' : 'webm';
    const started = extra.startedAt && !Number.isNaN(Date.parse(extra.startedAt)) ? new Date(extra.startedAt) : new Date();
    const part = Number(extra.part) > 1 ? `-part${Math.floor(Number(extra.part))}` : '';
    const name = `${kind === 'screen' ? 'screen' : 'call'}-${started.toISOString().slice(0, 19).replace(/[:T]/g, '-')}${part}.${ext}`;
    const stored = await this.store(file.buffer, mime, name, `${c.tenantId}/support/calls`);
    const dur = Number(extra.durationSec);
    const attachment: SupportAttachment = {
      url: stored.url, name, mime, bytes, width: null, height: null,
      durationSec: Number.isFinite(dur) && dur >= 0 ? Math.round(dur) : null,
      waveform: null, recording: kind, startedAt: started.toISOString(),
    };
    // The URL is in the log too, so a file can be found even if the call line never gets written.
    this.logger.log(`Call ${callKey} (conversation ${c.id}): ${kind} recording saved, ${Math.round(bytes / 1024)} KB, ${stored.url}`);

    const line = await this.findCallLine(c.id, callKey);
    if (line) {
      const row = await this.appendAttachments(line.id, [attachment]);
      await this.pushMessage(c, row, SUPPORT_EVENTS.messageUpdated);
      return { attachment, attached: true };
    }
    // The call is still on: hold it for logCall. Old entries (a call that never logged) go after a day.
    for (const [k, v] of this.pendingRecordings) if (Date.now() - v.at > 86_400_000) this.pendingRecordings.delete(k);
    const pending = this.pendingRecordings.get(callKey) ?? { at: Date.now(), conversationId: c.id, items: [] };
    pending.items.push(attachment);
    this.pendingRecordings.set(callKey, pending);
    // The line may have been written while the file was uploading.
    const late = await this.findCallLine(c.id, callKey);
    if (late) {
      const items = this.takePendingRecordings(callKey, c.id);
      if (items.length) {
        const row = await this.appendAttachments(late.id, items);
        await this.pushMessage(c, row, SUPPORT_EVENTS.messageUpdated);
      }
      return { attachment, attached: true };
    }
    return { attachment, attached: false };
  }

  /* ═════════════════════════ admin entry points used by SupportAdminService ═════════════════════════ */

  /**
   * A proactive message from the team (welcome, check-ins): posted into the
   * shop's active conversation, or a new one, as the configured agent. It is
   * not a "first response" and adds no "joined" line. The shop also gets a
   * bell notification (and a push on phones, per their settings).
   */
  async postProactive(tenantId: string, p: { key: SupportProactiveKey; text: string; chips: string[]; agentUserId: string; agentName: string }): Promise<MsgRow> {
    let c = await this.prisma.liveSupportConversation.findFirst({ where: { tenantId, status: { in: ACTIVE_STATUSES } }, orderBy: { lastMessageAt: 'desc' } });
    if (!c) {
      const owner = await this.prisma.user.findFirst({ where: { tenantId, role: 'OWNER', isActive: true }, select: { id: true } });
      c = await this.prisma.liveSupportConversation.create({
        data: { tenantId, openedByUserId: owner?.id ?? null, status: 'PENDING_MERCHANT', source: 'proactive', assignedAdminId: p.agentUserId, assignedAt: new Date() },
      });
    }
    const now = new Date();
    this.cancelBot(c.id);
    const row = await this.prisma.liveSupportMessage.create({
      data: {
        conversationId: c.id, sender: 'ADMIN', senderUserId: p.agentUserId, kind: 'TEXT', text: p.text.slice(0, SUPPORT_LIMITS.maxTextChars),
        meta: { proactive: p.key, chips: p.chips, senderName: p.agentName } as Prisma.InputJsonValue, createdAt: now,
      },
    });
    const preview = previewFor({ kind: 'TEXT', text: p.text, attachments: [] });
    c = await this.prisma.liveSupportConversation.update({
      where: { id: c.id },
      data: {
        status: c.status === 'BOT' || c.status === 'RESOLVED' ? 'PENDING_MERCHANT' : c.status,
        lastMessageAt: now, lastMessagePreview: preview, unreadForMerchant: { increment: 1 },
        ...(!c.assignedAdminId && { assignedAdminId: p.agentUserId, assignedAt: now }),
      },
    });
    await this.pushMessage(c, row);
    await this.pushConversation(c);
    void this.maybePush(c, p.agentName, preview).catch(() => undefined);
    return row;
  }

  /** Opens (or reuses) a conversation that the team starts with a shop. */
  async adminStart(adminId: string, tenantId: string, text: string | undefined, subject: string | undefined, opts: { skipRate?: boolean } = {}): Promise<ConvRow> {
    const t = await this.tenant(tenantId);
    if (!t) throw new NotFoundException('Shop not found');
    let c = await this.prisma.liveSupportConversation.findFirst({ where: { tenantId, status: { in: ACTIVE_STATUSES } }, orderBy: { lastMessageAt: 'desc' } });
    if (!c) {
      const owner = await this.prisma.user.findFirst({ where: { tenantId, role: 'OWNER', isActive: true }, select: { id: true } });
      c = await this.prisma.liveSupportConversation.create({
        data: { tenantId, openedByUserId: owner?.id ?? null, subject: subject?.trim().slice(0, 200) || null, status: 'PENDING_MERCHANT', source: 'admin-started', assignedAdminId: adminId, assignedAt: new Date() },
      });
      await this.pushConversation(c);
    }
    if (text?.trim()) {
      await this.send({ id: adminId, side: 'ADMIN', tenantId: null }, c.id, { text }, opts);
      c = (await this.prisma.liveSupportConversation.findUnique({ where: { id: c.id } }))!;
    }
    return c;
  }

  /** Assign / transfer, with a "now helping you" line when someone else takes over. */
  async assign(c: ConvRow, adminId: string | null, byAdminId: string): Promise<ConvRow> {
    if (c.assignedAdminId === adminId) return c;
    if (adminId) {
      const a = await this.prisma.user.findFirst({ where: { id: adminId, role: { in: ['SUPER_ADMIN', 'ADMIN_STAFF'] }, isActive: true }, select: { id: true } });
      if (!a) throw new BadRequestException('That team member was not found.');
    }
    const prev = c.assignedAdminId;
    const updated = await this.prisma.liveSupportConversation.update({ where: { id: c.id }, data: { assignedAdminId: adminId, assignedAt: adminId ? new Date() : null } });
    if (adminId && prev && prev !== adminId && c.firstResponseAt) {
      const p = await this.person(adminId);
      await this.addSystem(updated, 'transferred', { name: firstName(p?.name) }, await this.convLang(updated));
    }
    if (adminId && adminId !== byAdminId) {
      const [a] = await this.toAdminConversations([updated]);
      this.hub.toAgent(adminId, SUPPORT_EVENTS.conversation, { conversation: a, assignedToYou: true });
    }
    return updated;
  }

  async push(c: ConvRow) {
    await this.pushConversation(c);
  }
}
