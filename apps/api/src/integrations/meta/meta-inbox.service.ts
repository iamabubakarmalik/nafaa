/**
 * Unified inbox for Facebook and Instagram: Messenger and Instagram direct
 * messages, and comments on page posts and Instagram posts.
 *
 * Webhooks (page: feed, messages; instagram: comments, messages) are stored
 * here. "Taaza karein" also pulls recent threads and comments, so the inbox
 * fills even where webhooks cannot reach the server (local testing).
 * Replies respect Messenger's 24 hour window and say why when it is closed.
 * WhatsApp webhooks are handed to handlers registered by the WhatsApp part.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { apiText } from '../../common/i18n/api-message';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { findPhone } from '../online-orders/order-parse';
import { InboundComment, InboundMessage, canReply, messagePayload, parseWebhook } from './meta-graph';
import { MetaGraphError, MetaGraphService, metaFail } from './meta-graph.service';
import { metaAccess } from './meta-access';

export type WebhookHandler = (body: any) => Promise<void>;
/** Sends a reply on another platform's thread (WhatsApp registers 'WHATSAPP'); returns the message id. */
export type ReplySender = (tenantId: string, participantId: string, text: string, userId: string) => Promise<{ messageId: string | null }>;

const last10 = (p: string | null | undefined) => String(p ?? '').replace(/\D/g, '').slice(-10);

@Injectable()
export class MetaInboxService {
  private readonly logger = new Logger('MetaInbox');
  private readonly handlers = new Map<string, WebhookHandler[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphService,
  ) {}

  /** Lets another part (WhatsApp) receive webhooks for its object type, e.g. 'whatsapp_business_account'. */
  registerWebhookHandler(object: string, handler: WebhookHandler) {
    this.handlers.set(object, [...(this.handlers.get(object) ?? []), handler]);
  }

  private readonly senders = new Map<string, ReplySender>();

  /** Lets another part (WhatsApp) send inbox replies for its platform. */
  registerReplySender(platform: string, sender: ReplySender) {
    this.senders.set(platform, sender);
  }

  /* ───────────────────────── webhook ───────────────────────── */

  async onWebhook(body: any) {
    const object = String(body?.object ?? '');
    for (const h of this.handlers.get(object) ?? []) await h(body).catch((e) => this.logger.warn(`Webhook handler ${object}: ${(e as Error).message}`));
    if (object !== 'page' && object !== 'instagram') return;
    const { messages, comments } = parseWebhook(body);
    for (const m of messages) await this.saveMessage(m).catch((e) => this.logger.warn(`Inbox message: ${(e as Error).message}`));
    for (const c of comments) await this.saveComment(c).catch((e) => this.logger.warn(`Inbox comment: ${(e as Error).message}`));
  }

  /** Connections that own a page / Instagram account id. */
  private async owners(accountId: string) {
    return this.prisma.metaConnection.findMany({
      where: { OR: [{ pageId: accountId }, { igUserId: accountId }], status: 'CONNECTED', inboxEnabled: true },
      select: { tenantId: true, pageId: true, igUserId: true, connectedById: true },
    });
  }

  private async saveMessage(m: InboundMessage, tenantIds?: string[]) {
    const owners = tenantIds ? tenantIds.map((tenantId) => ({ tenantId })) : await this.owners(m.accountId);
    for (const o of owners) {
      const exists = await this.prisma.metaMessage.findUnique({ where: { tenantId_externalId: { tenantId: o.tenantId, externalId: m.mid } } });
      if (exists) continue;
      const key = { tenantId: o.tenantId, platform: m.platform, accountId: m.accountId, participantId: m.participantId };
      let conv = await this.prisma.metaConversation.findUnique({ where: { tenantId_platform_accountId_participantId: key } });
      if (!conv) {
        const who = await this.profile(o.tenantId, m).catch(() => null);
        conv = await this.prisma.metaConversation.create({ data: { ...key, participantName: who?.name ?? null, participantUsername: who?.username ?? null } });
      }
      const text = m.text ?? (m.attachments.length ? `[${m.attachments.map((a) => a.type).join(', ')}]` : null);
      await this.prisma.metaMessage.create({
        data: {
          tenantId: o.tenantId, conversationId: conv.id, externalId: m.mid, direction: m.echo ? 'OUT' : 'IN', text: m.text,
          attachments: m.attachments.length ? (m.attachments as unknown as Prisma.InputJsonValue) : undefined, sentAt: m.at,
        },
      }).catch((e) => { if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e; });
      const phone = !m.echo && !conv.phone ? findPhone(m.text ?? '') : null;
      const newer = !conv.lastMessageAt || m.at >= conv.lastMessageAt;
      await this.prisma.metaConversation.update({
        where: { id: conv.id },
        data: {
          ...(newer ? { lastText: text?.slice(0, 300) ?? null, lastMessageAt: m.at } : {}),
          ...(!m.echo ? { unread: { increment: 1 }, status: 'OPEN', ...(!conv.lastInboundAt || m.at > conv.lastInboundAt ? { lastInboundAt: m.at } : {}) } : {}),
          ...(phone ? { phone } : {}),
        },
      });
    }
  }

  private async profile(tenantId: string, m: Pick<InboundMessage, 'platform' | 'accountId' | 'participantId'>) {
    const conn = await this.graph.connection(tenantId);
    if (!conn?.pageId) return null;
    const token = `page:${conn.pageId}` as const;
    if (m.platform === 'MESSENGER') {
      const r = await this.graph.call<{ first_name?: string; last_name?: string; name?: string }>(tenantId, { path: m.participantId, params: { fields: 'first_name,last_name' }, token, attempts: 1 });
      return { name: [r?.first_name, r?.last_name].filter(Boolean).join(' ') || r?.name || null, username: null };
    }
    const r = await this.graph.call<{ name?: string; username?: string }>(tenantId, { path: m.participantId, params: { fields: 'name,username' }, token, attempts: 1 });
    return { name: r?.name ?? null, username: r?.username ?? null };
  }

  private async saveComment(c: InboundComment, tenantIds?: string[]) {
    const owners = tenantIds ? tenantIds.map((tenantId) => ({ tenantId })) : await this.owners(c.accountId);
    for (const o of owners) {
      const where = { tenantId_externalId: { tenantId: o.tenantId, externalId: c.commentId } };
      if (c.verb === 'remove') { await this.prisma.metaComment.updateMany({ where: { tenantId: o.tenantId, externalId: c.commentId }, data: { deletedAt: new Date() } }); continue; }
      if (c.verb === 'hide' || c.verb === 'unhide') { await this.prisma.metaComment.updateMany({ where: { tenantId: o.tenantId, externalId: c.commentId }, data: { hidden: c.verb === 'hide' } }); continue; }
      const fromShop = !!c.authorId && c.authorId === c.accountId;
      const socialPostId = c.objectId ? await this.socialPostFor(o.tenantId, c.objectId) : null;
      await this.prisma.metaComment.upsert({
        where,
        create: {
          tenantId: o.tenantId, platform: c.platform, accountId: c.accountId, externalId: c.commentId, objectId: c.objectId, parentId: c.parentId,
          authorId: c.authorId, authorName: c.authorName, text: c.text, commentedAt: c.at, fromShop, socialPostId, readAt: fromShop ? new Date() : null,
        },
        update: { text: c.text, ...(c.authorName ? { authorName: c.authorName } : {}) },
      });
      // A shop reply marks the parent as answered.
      if (fromShop && c.parentId) await this.prisma.metaComment.updateMany({ where: { tenantId: o.tenantId, externalId: c.parentId }, data: { repliedAt: c.at } });
    }
  }

  /** The studio post that was published as this Facebook post / Instagram media. */
  private async socialPostFor(tenantId: string, objectId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM social_posts WHERE "tenantId" = ${tenantId}
        AND ("publishState"->'FACEBOOK'->>'postId' = ${objectId} OR "publishState"->'INSTAGRAM'->>'postId' = ${objectId}) LIMIT 1`.catch(() => []);
    return rows[0]?.id ?? null;
  }

  /* ───────────────────────── merchant API ───────────────────────── */

  async list(user: AuthenticatedUser, q: { tab?: string; status?: string; search?: string; platform?: string }) {
    const tenantId = user.tenantId;
    const [access, conn] = await Promise.all([metaAccess(this.prisma, tenantId), this.graph.connection(tenantId)]);
    const search = String(q.search ?? '').trim().slice(0, 80);
    const [openThreads, unreadComments, unanswered] = await Promise.all([
      this.prisma.metaConversation.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.metaComment.count({ where: { tenantId, readAt: null, deletedAt: null, fromShop: false } }),
      this.prisma.metaComment.count({ where: { tenantId, repliedAt: null, deletedAt: null, fromShop: false, parentId: null } }),
    ]);
    const unreadMessages = await this.prisma.metaConversation.aggregate({ where: { tenantId }, _sum: { unread: true } });
    const stats = { openThreads, unreadMessages: unreadMessages._sum.unread ?? 0, unreadComments, unanswered };
    const head = { access, connected: !!conn && conn.status === 'CONNECTED', needsReconnect: !!conn && !['CONNECTED', 'DISCONNECTED'].includes(conn.status), webhooksAt: conn?.webhooksAt?.toISOString() ?? null, stats };

    if (q.tab === 'comments') {
      const rows = await this.prisma.metaComment.findMany({
        where: {
          tenantId, deletedAt: null, fromShop: false,
          ...(q.platform === 'FACEBOOK' || q.platform === 'INSTAGRAM' ? { platform: q.platform } : {}),
          ...(q.status === 'unanswered' ? { repliedAt: null } : {}),
          ...(search ? { OR: [{ text: { contains: search, mode: 'insensitive' } }, { authorName: { contains: search, mode: 'insensitive' } }] } : {}),
        },
        orderBy: { commentedAt: 'desc' },
        take: 100,
      });
      const replies = await this.prisma.metaComment.findMany({ where: { tenantId, parentId: { in: rows.map((r) => r.externalId) }, deletedAt: null }, orderBy: { commentedAt: 'asc' } });
      return {
        ...head,
        comments: rows.map((c) => ({
          ...this.commentView(c),
          replies: replies.filter((r) => r.parentId === c.externalId).map((r) => this.commentView(r)),
        })),
      };
    }
    const rows = await this.prisma.metaConversation.findMany({
      where: {
        tenantId,
        ...(q.platform === 'MESSENGER' || q.platform === 'INSTAGRAM' ? { platform: q.platform } : {}),
        ...(q.status === 'done' ? { status: 'DONE' } : q.status === 'all' ? {} : { status: 'OPEN' }),
        ...(search ? { OR: [{ participantName: { contains: search, mode: 'insensitive' } }, { participantUsername: { contains: search, mode: 'insensitive' } }, { lastText: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });
    return { ...head, conversations: rows.map((c) => this.convView(c)) };
  }

  async conversation(user: AuthenticatedUser, id: string) {
    const conv = await this.prisma.metaConversation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!conv) throw new NotFoundException('Baat-cheet nahi mili');
    const messages = await this.prisma.metaMessage.findMany({ where: { conversationId: conv.id }, orderBy: { sentAt: 'asc' }, take: 300 });
    if (conv.unread) await this.prisma.metaConversation.update({ where: { id: conv.id }, data: { unread: 0 } });
    const links = await this.lookup(user, conv.phone ?? '');
    return {
      conversation: this.convView({ ...conv, unread: 0 }),
      messages: messages.map((m) => ({ id: m.id, direction: m.direction, text: m.text, attachments: m.attachments ?? [], sentAt: m.sentAt.toISOString(), status: m.status, error: m.error })),
      links,
    };
  }

  async reply(user: AuthenticatedUser, id: string, body: { text?: string }) {
    const text = String(body?.text ?? '').trim();
    if (!text) throw new BadRequestException('Jawab likhein');
    const conv = await this.prisma.metaConversation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!conv) throw new NotFoundException('Baat-cheet nahi mili');
    const win = canReply(conv.lastInboundAt);
    if (!win.ok) throw metaFail('window', apiText('Is bande ka aakhri message 24 ghante se purana hai — Facebook ab jawab bhejne nahi deta. Woh dobara message kare to jawab de sakte hain'));
    const sender = this.senders.get(conv.platform);
    if (sender) {
      const sentAt = new Date();
      const res = await sender(user.tenantId, conv.participantId, text, user.id);
      await this.prisma.metaMessage.create({ data: { tenantId: user.tenantId, conversationId: conv.id, externalId: res.messageId, direction: 'OUT', text, sentAt, sentById: user.id } });
      await this.prisma.metaConversation.update({ where: { id: conv.id }, data: { lastText: text.slice(0, 300), lastMessageAt: sentAt, unread: 0 } });
      return { ok: true };
    }
    const conn = await this.graph.connection(user.tenantId);
    if (!conn?.pageId) throw metaFail('not_connected', apiText('Facebook page chuna nahi — Settings → Facebook & Instagram me page chunein'));
    const now = new Date();
    try {
      const res = await this.graph.call<{ message_id?: string }>(user.tenantId, { method: 'POST', path: `${conn.pageId}/messages`, body: messagePayload(conv.participantId, text), token: `page:${conn.pageId}` });
      await this.prisma.metaMessage.create({ data: { tenantId: user.tenantId, conversationId: conv.id, externalId: res?.message_id ?? null, direction: 'OUT', text, sentAt: now, sentById: user.id } })
        .catch((e) => { if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e; });
      await this.prisma.metaConversation.update({ where: { id: conv.id }, data: { lastText: text.slice(0, 300), lastMessageAt: now, unread: 0 } });
      return { ok: true };
    } catch (e) {
      const err = e instanceof MetaGraphError ? e.friendly : 'Jawab nahi gaya';
      await this.prisma.metaMessage.create({ data: { tenantId: user.tenantId, conversationId: conv.id, direction: 'OUT', text, sentAt: now, sentById: user.id, status: 'FAILED', error: err } });
      throw e;
    }
  }

  async updateConversation(user: AuthenticatedUser, id: string, body: { status?: string; phone?: string | null; customerId?: string | null; channelOrderId?: string | null }) {
    const conv = await this.prisma.metaConversation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!conv) throw new NotFoundException('Baat-cheet nahi mili');
    const data: Prisma.MetaConversationUpdateInput = {};
    if (body.status === 'OPEN' || body.status === 'DONE') data.status = body.status;
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).replace(/[^\d+]/g, '').slice(0, 20) || null : null;
    if (body.customerId !== undefined) {
      if (body.customerId && !(await this.prisma.customer.findFirst({ where: { id: body.customerId, tenantId: user.tenantId }, select: { id: true } }))) throw new NotFoundException('Customer nahi mila');
      data.customerId = body.customerId || null;
    }
    if (body.channelOrderId !== undefined) {
      if (body.channelOrderId && !(await this.prisma.channelOrder.findFirst({ where: { id: body.channelOrderId, tenantId: user.tenantId }, select: { id: true } }))) throw new NotFoundException('Order nahi mila');
      data.channelOrderId = body.channelOrderId || null;
    }
    const row = await this.prisma.metaConversation.update({ where: { id: conv.id }, data });
    return this.convView(row);
  }

  /** Customers and recent online orders with this phone number (last 10 digits). */
  async lookup(user: AuthenticatedUser, phone: string) {
    const tail = last10(phone);
    if (tail.length < 10) return { phone: null, customers: [], orders: [] };
    const [customers, orders] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId: user.tenantId, phone: { endsWith: tail } }, select: { id: true, name: true, phone: true }, take: 5 }),
      this.prisma.channelOrder.findMany({
        where: { tenantId: user.tenantId, customerPhone: { endsWith: tail } },
        select: { id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, total: true, orderStatus: true, receivedAt: true },
        orderBy: { receivedAt: 'desc' }, take: 5,
      }),
    ]);
    return {
      phone: `0${tail}`,
      customers,
      orders: orders.map((o) => ({ id: o.id, number: o.externalOrderNumber || o.externalOrderId, customerName: o.customerName, total: Number(o.total), status: o.orderStatus, createdAt: o.receivedAt.toISOString() })),
    };
  }

  /* ── comments ── */

  private async comment(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.metaComment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Comment nahi mila');
    const conn = await this.graph.connection(user.tenantId);
    if (!conn?.pageId) throw metaFail('not_connected', apiText('Facebook page chuna nahi — Settings → Facebook & Instagram me page chunein'));
    return { c, token: `page:${conn.pageId}` as const, pageId: conn.pageId };
  }

  /** Public reply under the comment, or a private message to the person (one per comment, within 7 days). */
  async replyComment(user: AuthenticatedUser, id: string, body: { text?: string; private?: boolean }) {
    const text = String(body?.text ?? '').trim().slice(0, 2000);
    if (!text) throw new BadRequestException('Jawab likhein');
    const { c, token, pageId } = await this.comment(user, id);
    if (body?.private) {
      await this.graph.call(user.tenantId, { method: 'POST', path: `${pageId}/messages`, body: { recipient: { comment_id: c.externalId }, message: { text } }, token });
    } else {
      const path = c.platform === 'INSTAGRAM' ? `${c.externalId}/replies` : `${c.externalId}/comments`;
      const res = await this.graph.call<{ id?: string }>(user.tenantId, { method: 'POST', path, body: { message: text }, token });
      if (res?.id) {
        await this.prisma.metaComment.upsert({
          where: { tenantId_externalId: { tenantId: user.tenantId, externalId: res.id } },
          create: { tenantId: user.tenantId, platform: c.platform, accountId: c.accountId, externalId: res.id, objectId: c.objectId, parentId: c.externalId, authorId: c.accountId, authorName: null, text, commentedAt: new Date(), fromShop: true, readAt: new Date() },
          update: {},
        });
      }
    }
    await this.prisma.metaComment.update({ where: { id: c.id }, data: { repliedAt: new Date(), readAt: c.readAt ?? new Date() } });
    return { ok: true };
  }

  async hideComment(user: AuthenticatedUser, id: string, body: { hidden?: boolean }) {
    const { c, token } = await this.comment(user, id);
    const hidden = body?.hidden !== false;
    await this.graph.call(user.tenantId, { method: 'POST', path: c.externalId, body: c.platform === 'INSTAGRAM' ? { hide: hidden } : { is_hidden: hidden }, token });
    await this.prisma.metaComment.update({ where: { id: c.id }, data: { hidden, readAt: c.readAt ?? new Date() } });
    return { ok: true, hidden };
  }

  async deleteComment(user: AuthenticatedUser, id: string) {
    const { c, token } = await this.comment(user, id);
    await this.graph.call(user.tenantId, { method: 'DELETE', path: c.externalId, token }).catch((e) => {
      if (!(e instanceof MetaGraphError && e.kind === 'not_found')) throw e;
    });
    await this.prisma.metaComment.update({ where: { id: c.id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  async markCommentsRead(user: AuthenticatedUser, body: { ids?: string[] }) {
    const ids = (Array.isArray(body?.ids) ? body.ids : []).filter((x) => typeof x === 'string').slice(0, 200);
    const r = await this.prisma.metaComment.updateMany({ where: { tenantId: user.tenantId, readAt: null, ...(ids.length ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
    return { count: r.count };
  }

  /* ── pull (no webhooks needed) ── */

  /** Pulls recent threads (Messenger + Instagram) and comments on recent posts. */
  async pull(user: AuthenticatedUser) {
    const conn = await this.graph.connection(user.tenantId);
    if (!conn?.pageId || conn.status !== 'CONNECTED') throw metaFail('not_connected', apiText('Facebook abhi jura nahi — Settings → Facebook & Instagram se joren'));
    const tenantIds = [user.tenantId];
    const token = `page:${conn.pageId}` as const;
    let messages = 0;
    let comments = 0;
    const platforms: Array<['messenger' | 'instagram', 'MESSENGER' | 'INSTAGRAM', string]> = [['messenger', 'MESSENGER', conn.pageId]];
    if (conn.igUserId) platforms.push(['instagram', 'INSTAGRAM', conn.igUserId]);
    for (const [pf, platform, accountId] of platforms) {
      const res = await this.graph.call<{ data?: any[] }>(user.tenantId, {
        path: `${conn.pageId}/conversations`, token,
        params: { platform: pf, limit: 20, fields: 'participants,messages.limit(15){id,message,from,created_time}' },
      }).catch((e) => { this.logger.warn(`Pull ${pf}: ${(e as Error).message}`); return null; });
      for (const t of res?.data ?? []) {
        const other = (t.participants?.data ?? []).find((p: any) => p.id !== accountId && p.id !== conn.pageId);
        if (!other?.id) continue;
        for (const m of [...(t.messages?.data ?? [])].reverse()) {
          const echo = m.from?.id === accountId || m.from?.id === conn.pageId;
          await this.saveMessage({ platform, accountId, participantId: String(other.id), mid: String(m.id), text: m.message ?? null, attachments: [], at: new Date(m.created_time), echo }, tenantIds);
          messages++;
        }
        if (other.name || other.username) {
          await this.prisma.metaConversation.updateMany({
            where: { tenantId: user.tenantId, platform, accountId, participantId: String(other.id), participantName: null },
            data: { participantName: other.name ?? null, participantUsername: other.username ?? null },
          });
        }
      }
    }
    // Comments on the last 10 page posts and Instagram posts.
    const fb = await this.graph.call<{ data?: any[] }>(user.tenantId, {
      path: `${conn.pageId}/posts`, token, params: { limit: 10, fields: 'id,comments.limit(25){id,message,from,created_time,parent{id}}' },
    }).catch(() => null);
    for (const p of fb?.data ?? []) {
      for (const c of p.comments?.data ?? []) {
        await this.saveComment({ platform: 'FACEBOOK', accountId: conn.pageId, commentId: String(c.id), objectId: String(p.id), parentId: c.parent?.id ?? null, authorId: c.from?.id ?? null, authorName: c.from?.name ?? null, text: c.message ?? null, at: new Date(c.created_time), verb: 'add' }, tenantIds);
        comments++;
      }
    }
    if (conn.igUserId) {
      const ig = await this.graph.call<{ data?: any[] }>(user.tenantId, {
        path: `${conn.igUserId}/media`, token, params: { limit: 10, fields: 'id,comments.limit(25){id,text,username,from,timestamp}' },
      }).catch(() => null);
      for (const p of ig?.data ?? []) {
        for (const c of p.comments?.data ?? []) {
          await this.saveComment({ platform: 'INSTAGRAM', accountId: conn.igUserId, commentId: String(c.id), objectId: String(p.id), parentId: null, authorId: c.from?.id ?? null, authorName: c.username ?? c.from?.username ?? null, text: c.text ?? null, at: new Date(c.timestamp), verb: 'add' }, tenantIds);
          comments++;
        }
      }
    }
    return { messages, comments };
  }

  /* ───────────────────────── views ───────────────────────── */

  private convView(c: Prisma.MetaConversationGetPayload<Record<string, never>>) {
    const win = canReply(c.lastInboundAt);
    return {
      id: c.id, platform: c.platform, participantName: c.participantName, participantUsername: c.participantUsername,
      lastText: c.lastText, lastMessageAt: c.lastMessageAt?.toISOString() ?? null, unread: c.unread, status: c.status,
      phone: c.phone, customerId: c.customerId, channelOrderId: c.channelOrderId,
      canReply: win.ok, replyClosesAt: win.closesAt?.toISOString() ?? null,
    };
  }

  private commentView(c: Prisma.MetaCommentGetPayload<Record<string, never>>) {
    return {
      id: c.id, platform: c.platform, authorName: c.authorName, text: c.text, commentedAt: c.commentedAt.toISOString(), hidden: c.hidden,
      fromShop: c.fromShop, repliedAt: c.repliedAt?.toISOString() ?? null, read: !!c.readAt, objectId: c.objectId, socialPostId: c.socialPostId,
      phone: findPhone(c.text ?? ''),
    };
  }
}
