/**
 * Chat history and daily usage for Nafaa AI.
 *
 * Rows live in ai_chats, ai_chat_messages and ai_usage_daily (migration
 * 20261026120000_nafaa_ai). Until that migration is applied the tables do not
 * exist; the store then keeps everything in server memory so the assistant
 * still works, and switches to the database by itself once the tables appear
 * (checked every few minutes).
 *
 * Every read and write is filtered by tenant and user: a user only ever sees
 * their own chats.
 */

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface ChatRow {
  id: string;
  tenantId: string;
  userId: string;
  shopId: string | null;
  title: string;
  pinned: boolean;
  archived: boolean;
  summary: string | null;
  createdAt: Date;
  lastMessageAt: Date;
}

export interface MessageRow {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: unknown;
  charts: unknown;
  model: string | null;
  route: string | null;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  costMicros: number;
  latencyMs: number;
  feedback: number;
  createdAt: Date;
}

export type NewMessage = Omit<MessageRow, 'id' | 'createdAt' | 'feedback'> & { feedback?: number };

interface UsageRow { tenantId: string; date: string; messages: number; tokens: number; costMicros: number }

const PROBE_MS = 5 * 60_000;
/** Memory fallback caps, so a long-running server without the tables does not grow without end. */
const MEMORY_CHATS_PER_USER = 50;

@Injectable()
export class AiHistoryStore {
  private readonly logger = new Logger('NafaaAiHistory');
  private dbReady: boolean | null = null;
  private probedAt = 0;

  private readonly memChats = new Map<string, ChatRow>();
  private readonly memMessages = new Map<string, MessageRow[]>();
  private readonly memUsage = new Map<string, UsageRow>();

  constructor(private readonly prisma: PrismaService) {}

  /** True when the history tables exist. */
  async persisted(): Promise<boolean> {
    if (this.dbReady !== null && Date.now() - this.probedAt < PROBE_MS) return this.dbReady;
    try {
      const rows = await this.prisma.$queryRaw<Array<{ ok: boolean }>>`
        SELECT (to_regclass('public.ai_chats') IS NOT NULL AND to_regclass('public.ai_chat_messages') IS NOT NULL
          AND to_regclass('public.ai_usage_daily') IS NOT NULL) AS ok`;
      const ready = !!rows[0]?.ok;
      if (ready !== this.dbReady) this.logger.log(ready ? 'History tables found: chats are saved in the database' : 'History tables missing: chats are kept in memory until the migration runs');
      this.dbReady = ready;
    } catch {
      this.dbReady = false;
    }
    this.probedAt = Date.now();
    return this.dbReady;
  }

  /* ───────────────────────── chats ───────────────────────── */

  async createChat(tenantId: string, userId: string, shopId: string | null, title: string): Promise<ChatRow> {
    if (await this.persisted()) {
      return this.prisma.aiChat.create({ data: { tenantId, userId, shopId, title } }) as Promise<ChatRow>;
    }
    const now = new Date();
    const row: ChatRow = { id: randomUUID(), tenantId, userId, shopId, title, pinned: false, archived: false, summary: null, createdAt: now, lastMessageAt: now };
    this.memChats.set(row.id, row);
    this.trimMemory(tenantId, userId);
    return row;
  }

  async getChat(tenantId: string, userId: string, id: string): Promise<ChatRow | null> {
    if (await this.persisted()) {
      return this.prisma.aiChat.findFirst({ where: { id, tenantId, userId, archived: false } }) as Promise<ChatRow | null>;
    }
    const c = this.memChats.get(id);
    return c && c.tenantId === tenantId && c.userId === userId && !c.archived ? c : null;
  }

  async listChats(tenantId: string, userId: string, q?: string, limit = 50): Promise<ChatRow[]> {
    const term = (q ?? '').trim().slice(0, 80);
    if (await this.persisted()) {
      return this.prisma.aiChat.findMany({
        where: {
          tenantId, userId, archived: false,
          ...(term && {
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { messages: { some: { content: { contains: term, mode: 'insensitive' } } } },
            ],
          }),
        },
        orderBy: [{ pinned: 'desc' }, { lastMessageAt: 'desc' }],
        take: Math.min(200, Math.max(1, limit)),
      }) as Promise<ChatRow[]>;
    }
    const t = term.toLowerCase();
    return [...this.memChats.values()]
      .filter((c) => c.tenantId === tenantId && c.userId === userId && !c.archived)
      .filter((c) => !t || c.title.toLowerCase().includes(t) || (this.memMessages.get(c.id) ?? []).some((m) => m.content.toLowerCase().includes(t)))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
      .slice(0, limit);
  }

  async updateChat(tenantId: string, userId: string, id: string, data: Partial<Pick<ChatRow, 'title' | 'pinned' | 'archived' | 'summary' | 'lastMessageAt'>>): Promise<ChatRow | null> {
    if (await this.persisted()) {
      const res = await this.prisma.aiChat.updateMany({ where: { id, tenantId, userId }, data });
      return res.count ? (this.prisma.aiChat.findUnique({ where: { id } }) as Promise<ChatRow | null>) : null;
    }
    const c = this.memChats.get(id);
    if (!c || c.tenantId !== tenantId || c.userId !== userId) return null;
    Object.assign(c, data);
    return c;
  }

  /* ───────────────────────── messages ───────────────────────── */

  async addMessage(m: NewMessage): Promise<MessageRow> {
    if (await this.persisted()) {
      return this.prisma.aiChatMessage.create({
        data: {
          ...m,
          toolCalls: (m.toolCalls ?? undefined) as Prisma.InputJsonValue | undefined,
          charts: (m.charts ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      }) as unknown as Promise<MessageRow>;
    }
    const row: MessageRow = { ...m, id: randomUUID(), feedback: m.feedback ?? 0, createdAt: new Date() };
    const list = this.memMessages.get(m.chatId) ?? [];
    list.push(row);
    this.memMessages.set(m.chatId, list);
    return row;
  }

  async messages(chatId: string, take?: number): Promise<MessageRow[]> {
    if (await this.persisted()) {
      const rows = await this.prisma.aiChatMessage.findMany({ where: { chatId }, orderBy: { createdAt: take ? 'desc' : 'asc' }, ...(take && { take }) });
      return (take ? rows.reverse() : rows) as unknown as MessageRow[];
    }
    const list = this.memMessages.get(chatId) ?? [];
    return take ? list.slice(-take) : [...list];
  }

  async countMessages(chatId: string): Promise<number> {
    if (await this.persisted()) return this.prisma.aiChatMessage.count({ where: { chatId } });
    return (this.memMessages.get(chatId) ?? []).length;
  }

  /** Removes messages created at or after `from` (regenerate / edit last question). */
  async deleteFrom(chatId: string, fromId: string): Promise<void> {
    if (await this.persisted()) {
      const from = await this.prisma.aiChatMessage.findFirst({ where: { id: fromId, chatId }, select: { createdAt: true } });
      if (from) await this.prisma.aiChatMessage.deleteMany({ where: { chatId, createdAt: { gte: from.createdAt } } });
      return;
    }
    const list = this.memMessages.get(chatId) ?? [];
    const i = list.findIndex((m) => m.id === fromId);
    if (i >= 0) this.memMessages.set(chatId, list.slice(0, i));
  }

  /** Thumbs up/down on an answer in one of the user's own chats. */
  async setFeedback(tenantId: string, userId: string, messageId: string, value: number): Promise<boolean> {
    if (await this.persisted()) {
      const res = await this.prisma.aiChatMessage.updateMany({ where: { id: messageId, role: 'assistant', chat: { tenantId, userId } }, data: { feedback: value } });
      return res.count > 0;
    }
    for (const [chatId, list] of this.memMessages) {
      const m = list.find((x) => x.id === messageId && x.role === 'assistant');
      const c = this.memChats.get(chatId);
      if (m && c && c.tenantId === tenantId && c.userId === userId) { m.feedback = value; return true; }
    }
    return false;
  }

  /* ───────────────────────── usage ───────────────────────── */

  async usageOn(tenantId: string, date: string): Promise<UsageRow> {
    if (await this.persisted()) {
      const row = await this.prisma.aiUsageDaily.findUnique({ where: { tenantId_date: { tenantId, date } } });
      return row ?? { tenantId, date, messages: 0, tokens: 0, costMicros: 0 };
    }
    return this.memUsage.get(`${tenantId}:${date}`) ?? { tenantId, date, messages: 0, tokens: 0, costMicros: 0 };
  }

  async addUsage(tenantId: string, date: string, d: { messages: number; tokens: number; costMicros: number }): Promise<void> {
    if (await this.persisted()) {
      await this.prisma.aiUsageDaily.upsert({
        where: { tenantId_date: { tenantId, date } },
        create: { tenantId, date, ...d },
        update: { messages: { increment: d.messages }, tokens: { increment: d.tokens }, costMicros: { increment: d.costMicros } },
      });
      return;
    }
    const k = `${tenantId}:${date}`;
    const row = this.memUsage.get(k) ?? { tenantId, date, messages: 0, tokens: 0, costMicros: 0 };
    row.messages += d.messages; row.tokens += d.tokens; row.costMicros += d.costMicros;
    this.memUsage.set(k, row);
  }

  /** Usage of one tenant between two business-day keys (inclusive). */
  async usageBetween(tenantId: string, from: string, to: string): Promise<{ messages: number; tokens: number; costMicros: number }> {
    if (await this.persisted()) {
      const a = await this.prisma.aiUsageDaily.aggregate({ where: { tenantId, date: { gte: from, lte: to } }, _sum: { messages: true, tokens: true, costMicros: true } });
      return { messages: a._sum.messages ?? 0, tokens: a._sum.tokens ?? 0, costMicros: a._sum.costMicros ?? 0 };
    }
    let messages = 0, tokens = 0, cost = 0;
    for (const u of this.memUsage.values()) if (u.tenantId === tenantId && u.date >= from && u.date <= to) { messages += u.messages; tokens += u.tokens; cost += u.costMicros; }
    return { messages, tokens, costMicros: cost };
  }

  /** One user's own usage: their assistant messages since `since`. */
  async userUsageSince(tenantId: string, userId: string, since: Date): Promise<{ messages: number; tokens: number; costMicros: number }> {
    if (await this.persisted()) {
      const a = await this.prisma.aiChatMessage.aggregate({
        where: { role: 'assistant', route: 'llm', createdAt: { gte: since }, chat: { tenantId, userId } },
        _count: { _all: true }, _sum: { inputTokens: true, outputTokens: true, cachedTokens: true, costMicros: true },
      });
      return { messages: a._count._all, tokens: (a._sum.inputTokens ?? 0) + (a._sum.outputTokens ?? 0) + (a._sum.cachedTokens ?? 0), costMicros: a._sum.costMicros ?? 0 };
    }
    let messages = 0, tokens = 0, cost = 0;
    for (const [chatId, list] of this.memMessages) {
      const c = this.memChats.get(chatId);
      if (!c || c.tenantId !== tenantId || c.userId !== userId) continue;
      for (const m of list) if (m.role === 'assistant' && m.route === 'llm' && m.createdAt >= since) { messages++; tokens += m.inputTokens + m.outputTokens + m.cachedTokens; cost += m.costMicros; }
    }
    return { messages, tokens, costMicros: cost };
  }

  /** Platform totals per tenant since a date key, for the super admin. */
  async platformUsage(fromKey: string): Promise<Array<{ tenantId: string; messages: number; tokens: number; costMicros: number; days: number }>> {
    if (await this.persisted()) {
      const rows = await this.prisma.aiUsageDaily.groupBy({
        by: ['tenantId'], where: { date: { gte: fromKey } },
        _sum: { messages: true, tokens: true, costMicros: true }, _count: { _all: true },
      });
      return rows.map((r) => ({ tenantId: r.tenantId, messages: r._sum.messages ?? 0, tokens: r._sum.tokens ?? 0, costMicros: r._sum.costMicros ?? 0, days: r._count._all }));
    }
    const by = new Map<string, { tenantId: string; messages: number; tokens: number; costMicros: number; days: number }>();
    for (const u of this.memUsage.values()) {
      if (u.date < fromKey) continue;
      const b = by.get(u.tenantId) ?? { tenantId: u.tenantId, messages: 0, tokens: 0, costMicros: 0, days: 0 };
      b.messages += u.messages; b.tokens += u.tokens; b.costMicros += u.costMicros; b.days += 1;
      by.set(u.tenantId, b);
    }
    return [...by.values()];
  }

  private trimMemory(tenantId: string, userId: string) {
    const mine = [...this.memChats.values()].filter((c) => c.tenantId === tenantId && c.userId === userId)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    for (const old of mine.slice(MEMORY_CHATS_PER_USER)) { this.memChats.delete(old.id); this.memMessages.delete(old.id); }
  }
}
