/**
 * Nafaa AI conversation engine.
 *
 * One question goes through these steps:
 *   1. limits: per-user burst, then the tenant's daily message cap by plan
 *   2. chat: load or create the user's chat; regenerate or edit-last trims it
 *   3. route:
 *        template  common questions answered from tools + a template, no model
 *        llm       the tool-use loop with Claude (or the mock provider)
 *      Model: Fast mode uses AI_MODEL (Haiku); analysis questions in Fast mode
 *      use AI_MODEL_ANALYSIS (Sonnet); Smart mode uses AI_MODEL_DEEP (Opus)
 *      and counts as AI_DEEP_COST messages.
 *   4. stream: text deltas, tool status lines, charts, report links and
 *      reorder groups go to the client as server-sent events
 *   5. save: both messages with tokens, cost and latency; the chat's running
 *      summary and title; the tenant's daily usage
 *
 * The model sees the last few messages verbatim plus a short running summary
 * of older turns, never the whole history.
 */

import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { isOwnerRole } from '../../common/helpers/reports-config.helper';
import { businessDayKey } from '../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import {
  AI_BUSY_MESSAGE, AI_DEEP_COST, AI_MAX_TOOL_ROUNDS, AI_RECENT_MESSAGES, AI_SUMMARY_CHARS, AI_USER_BURST,
  aiModels, aiProviderKind, costMicros, dailyLimitFor, type AiTokenUsage,
} from './ai.config';
import { AiHistoryStore, type ChatRow, type MessageRow } from './ai-history.store';
import { AiToolsService, TOOL_STATUS, toolDefinitions, type AiToolContext, type AiToolResult } from './ai-tools.service';
import { RuleProvider, createProvider, type AiProvider, type ContentBlockParam, type MessageParam, type ToolDef } from './ai-provider';
import { STATIC_SYSTEM, dynamicSystem } from './ai-prompt';
import { FollowupFilter, detectLang, isAnalysisQuestion, renderTool, suggestionsFor, templateIntent, type Lang, type TemplateIntent } from './ai-render';
import { AiActionsService } from './ai-actions.service';
import { ACTION_TOOL_NAMES } from './ai-action-tools';
import { MorningSummaryService } from './morning-summary.service';
import type {
  AiActionProposal, AiChart, AiChatRequest, AiConversationDetail, AiConversationSummary, AiErrorCode, AiLink, AiMessageView, AiMode, AiReorder, AiStatus, AiUsage,
} from './ai.types';

export type Emit = (event: string, data: unknown) => void;

/** A refusal before the stream opens; the controller turns it into an HTTP status. */
export class AiRefusal extends Error {
  constructor(readonly code: AiErrorCode, message: string, readonly status: number) { super(message); }
}

interface Extras { charts: AiChart[]; links: AiLink[]; reorder: AiReorder | null; actions: AiActionProposal[]; suggestions: string[] }

const DAY = 86_400_000;
const MAX_CHARTS = 3;

@Injectable()
export class AiChatService {
  private readonly logger = new Logger('NafaaAi');
  private provider: AiProvider | null | undefined;
  private readonly rules = new RuleProvider();
  private readonly burst = new Map<string, number[]>();
  private readonly planCache = new Map<string, { slug: string | null; at: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly tools: AiToolsService,
    private readonly history: AiHistoryStore,
    private readonly morning: MorningSummaryService,
    private readonly actions: AiActionsService,
  ) {}

  private getProvider(): AiProvider | null {
    if (this.provider === undefined) this.provider = createProvider();
    return this.provider;
  }

  /* ───────────────────────── limits ───────────────────────── */

  private async planSlug(tenantId: string): Promise<string | null> {
    const hit = this.planCache.get(tenantId);
    if (hit && Date.now() - hit.at < 10 * 60_000) return hit.slug;
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
      orderBy: [{ currentPeriodEnd: 'desc' }],
      select: { plan: { select: { slug: true } } },
    });
    const slug = sub?.plan?.slug ?? null;
    this.planCache.set(tenantId, { slug, at: Date.now() });
    return slug;
  }

  private async today(tenantId: string): Promise<string> {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    return businessDayKey(new Date(), tz, dayStartHour);
  }

  private async quota(tenantId: string) {
    const [slug, day] = await Promise.all([this.planSlug(tenantId), this.today(tenantId)]);
    const limit = dailyLimitFor(slug);
    const used = (await this.history.usageOn(tenantId, day)).messages;
    return { limit, used, remaining: Math.max(0, limit - used), day };
  }

  private takeBurst(userId: string): boolean {
    const now = Date.now();
    const list = (this.burst.get(userId) ?? []).filter((t) => now - t < AI_USER_BURST.windowMs);
    if (list.length >= AI_USER_BURST.max) { this.burst.set(userId, list); return false; }
    list.push(now);
    this.burst.set(userId, list);
    if (this.burst.size > 5000) for (const [k, v] of this.burst) if (!v.some((t) => now - t < AI_USER_BURST.windowMs)) this.burst.delete(k);
    return true;
  }

  async status(user: AuthenticatedUser): Promise<AiStatus> {
    const q = await this.quota(user.tenantId);
    return {
      configured: true,
      historySaved: await this.history.persisted(),
      limit: q.limit, used: q.used, remaining: q.remaining, deepCost: AI_DEEP_COST,
      message: null,
      // How answers are made is shown to Nafaa staff only.
      ...(user.role === 'SUPER_ADMIN' && { provider: aiProviderKind(), ...(aiProviderKind() !== 'anthropic' && { providerHint: 'AI provider set nahi — sirf rules wale jawab chal rahe hain' }) }),
    };
  }

  async usage(user: AuthenticatedUser): Promise<AiUsage> {
    const q = await this.quota(user.tenantId);
    const monthFrom = `${q.day.slice(0, 8)}01`;
    if (isOwnerRole(user.role)) {
      const m = await this.history.usageBetween(user.tenantId, monthFrom, q.day);
      return { scope: 'tenant', today: { messages: q.used, limit: q.limit, remaining: q.remaining }, month: m };
    }
    const [y, mo] = q.day.split('-').map(Number);
    const m = await this.history.userUsageSince(user.tenantId, user.id, new Date(Date.UTC(y, mo - 1, 1) - DAY));
    return { scope: 'me', today: { messages: q.used, limit: q.limit, remaining: q.remaining }, month: m };
  }

  /** Super admin: per-tenant totals for the last `days` days. */
  async platformUsage(days: number) {
    const from = new Date(Date.now() - Math.min(366, Math.max(1, days)) * DAY).toISOString().slice(0, 10);
    const rows = await this.history.platformUsage(from);
    const names = rows.length ? await this.prisma.tenant.findMany({ where: { id: { in: rows.map((r) => r.tenantId) } }, select: { id: true, name: true } }) : [];
    const nm = new Map(names.map((t) => [t.id, t.name]));
    const tenants = rows.map((r) => ({ ...r, name: nm.get(r.tenantId) ?? r.tenantId, costUsd: r.costMicros / 1e6 })).sort((a, b) => b.costMicros - a.costMicros);
    return {
      from, persisted: await this.history.persisted(),
      provider: aiProviderKind(),
      providerHint: aiProviderKind() === 'anthropic' ? null : 'AI provider set nahi (ANTHROPIC_API_KEY) — shops get rule-based answers only',
      totals: {
        tenants: tenants.length,
        messages: tenants.reduce((s, t) => s + t.messages, 0),
        tokens: tenants.reduce((s, t) => s + t.tokens, 0),
        costUsd: Math.round(tenants.reduce((s, t) => s + t.costMicros, 0)) / 1e6,
      },
      tenants: tenants.slice(0, 200),
    };
  }

  /* ───────────────────────── history endpoints ───────────────────────── */

  private summaryView(c: ChatRow): AiConversationSummary {
    return { id: c.id, title: c.title, pinned: c.pinned, createdAt: c.createdAt.toISOString(), lastMessageAt: c.lastMessageAt.toISOString() };
  }

  private messageView(m: MessageRow): AiMessageView {
    const extras = (m.charts ?? {}) as Partial<Extras> & { via?: 'text' | 'voice' };
    return {
      id: m.id, role: m.role, content: m.content,
      charts: Array.isArray(extras.charts) ? extras.charts : [], links: Array.isArray(extras.links) ? extras.links : [], reorder: extras.reorder ?? null,
      actions: Array.isArray(extras.actions) ? extras.actions : [], suggestions: Array.isArray(extras.suggestions) ? extras.suggestions : [],
      via: m.role === 'user' ? extras.via ?? 'text' : null,
      model: null, feedback: m.feedback, createdAt: m.createdAt.toISOString(),
    };
  }

  async listChats(user: AuthenticatedUser, q?: string, limit?: number): Promise<AiConversationSummary[]> {
    return (await this.history.listChats(user.tenantId, user.id, q, limit)).map((c) => this.summaryView(c));
  }

  async getChat(user: AuthenticatedUser, id: string): Promise<AiConversationDetail | null> {
    const c = await this.history.getChat(user.tenantId, user.id, id);
    if (!c) return null;
    const msgs = await this.history.messages(c.id);
    return { ...this.summaryView(c), messages: msgs.map((m) => this.messageView(m)) };
  }

  async updateChat(user: AuthenticatedUser, id: string, data: { title?: string; pinned?: boolean }) {
    const patch: { title?: string; pinned?: boolean } = {};
    if (typeof data.title === 'string' && data.title.trim()) patch.title = data.title.trim().slice(0, 80);
    if (typeof data.pinned === 'boolean') patch.pinned = data.pinned;
    const c = await this.history.updateChat(user.tenantId, user.id, id, patch);
    return c ? this.summaryView(c) : null;
  }

  async deleteChat(user: AuthenticatedUser, id: string) {
    return !!(await this.history.updateChat(user.tenantId, user.id, id, { archived: true }));
  }

  feedback(user: AuthenticatedUser, messageId: string, value: number) {
    return this.history.setFeedback(user.tenantId, user.id, messageId, Math.max(-1, Math.min(1, Math.trunc(value))));
  }

  /* ───────────────────────── asking ───────────────────────── */

  /**
   * Checks everything that can refuse a question before the stream opens, so
   * the controller can answer with a plain HTTP status. Returns the prepared
   * run, which `stream` then executes.
   */
  async prepare(user: AuthenticatedUser, scope: ShopScope, body: AiChatRequest) {
    if (!this.takeBurst(user.id)) throw new AiRefusal('RATE', 'Thora ruk kar poochein — ek minute me bohat sawal ho gaye.', 429);

    const ctx = await this.tools.context(user, scope);
    let chat: ChatRow | null = null;
    if (body.conversationId) {
      chat = await this.history.getChat(user.tenantId, user.id, body.conversationId);
      if (!chat) throw new AiRefusal('NOT_FOUND', 'Ye baat-cheet nahi mili.', 404);
    }

    // Regenerate and edit-last work on the chat's last question.
    let question = (body.message ?? '').trim();
    let replaceFrom: string | null = null;
    if (chat && (body.regenerate || body.editLast)) {
      const recent = await this.history.messages(chat.id, 4);
      const lastUser = [...recent].reverse().find((m) => m.role === 'user');
      if (lastUser) {
        if (body.regenerate) {
          question = lastUser.content;
          const after = recent.find((m) => m.role === 'assistant' && m.createdAt >= lastUser.createdAt);
          replaceFrom = after?.id ?? null;
        } else {
          replaceFrom = lastUser.id;
        }
      }
    }
    if (!question) throw new AiRefusal('BAD_REQUEST', 'Sawal khali hai.', 400);

    const mode: AiMode = body.mode === 'smart' ? 'smart' : 'fast';
    const intent = templateIntent(question);
    const route: 'template' | 'llm' = intent && mode === 'fast' ? 'template' : 'llm';
    // Only model answers count against the daily limit; rule answers cost nothing.
    const weight = route === 'template' || !this.getProvider() ? 0 : mode === 'smart' ? AI_DEEP_COST : 1;
    const q = await this.quota(user.tenantId);
    if (weight > 0 && q.remaining < weight) {
      throw new AiRefusal('LIMIT', mode === 'smart' && q.remaining > 0
        ? `Aaj ke ${q.remaining} message baqi hain — Smart sawal ${AI_DEEP_COST} ka hota hai. Fast mode me poochein.`
        : `Aaj ki had (${q.limit} sawal) poori ho gayi. Kal phir poochein, ya plan upgrade karein.`, 429);
    }
    return { user, scope, ctx, chat, question, replaceFrom, mode, intent, route, weight, quota: q, body };
  }

  /** Which engine will answer, for the X-Nafaa-AI-Route response header and logs (never shown in the UI). */
  engineTag(run: Awaited<ReturnType<AiChatService['prepare']>>): string {
    if (run.route === 'template') return 'template';
    return this.getProvider() ? 'model' : aiProviderKind();
  }

  async stream(run: Awaited<ReturnType<AiChatService['prepare']>>, emit: Emit, signal: AbortSignal): Promise<void> {
    const started = Date.now();
    const { user, ctx, question, mode, intent, route, weight, quota, body } = run;
    let chat = run.chat;

    // Chat and the user's message.
    if (!chat) chat = await this.history.createChat(user.tenantId, user.id, ctx.scope.shopId, this.titleFrom(question));
    emit('conversation', { id: chat.id, title: chat.title });
    if (run.replaceFrom) await this.history.deleteFrom(chat.id, run.replaceFrom);
    const prior = await this.history.messages(chat.id, AI_RECENT_MESSAGES + 1);
    const userMsg = body.regenerate && prior.length && prior[prior.length - 1].role === 'user'
      ? prior[prior.length - 1]
      : await this.history.addMessage({
        chatId: chat.id, role: 'user', content: question.slice(0, 4000), toolCalls: null,
        charts: { via: body.via === 'voice' ? 'voice' : 'text', ...(body.context && { context: body.context }) }, model: null, route: null,
        inputTokens: 0, outputTokens: 0, cachedTokens: 0, costMicros: 0, latencyMs: 0,
      });
    const history = prior.filter((m) => m.id !== userMsg.id).slice(-AI_RECENT_MESSAGES);

    const extras: Extras = { charts: [], links: [], reorder: null, actions: [], suggestions: [] };
    const onTool = (res: AiToolResult) => {
      if (res.refused) return;
      if (res.chart && extras.charts.length < MAX_CHARTS) { extras.charts.push(res.chart); emit('chart', res.chart); }
      if (res.link && !extras.links.some((l) => l.to === res.link!.to)) { extras.links.push(res.link); emit('link', res.link); }
      if (res.reorder && !extras.reorder) { extras.reorder = res.reorder; emit('reorder', res.reorder); }
      if (res.action && extras.actions.length < 3) { extras.actions.push(res.action); emit('action', res.action); }
    };
    // Urdu-script questions are understood; answers stay in Roman Urdu unless asked otherwise.
    const lang: Lang = detectLang(question) === 'en' ? 'en' : 'roman';

    let text = '';
    const toolLog: Array<{ name: string; input: unknown; ok: boolean }> = [];
    const usage: AiTokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    let model = 'template';
    let failed: { code: AiErrorCode; message: string } | null = null;

    try {
      // The client sees one neutral label; which engine answered stays on the server.
      emit('meta', { model: 'nafaa-ai', mode, route: route === 'template' ? 'template' : 'llm' });
      if (route === 'template') {
        text = await this.answerFromTemplate(intent!, lang, ctx, emit, onTool, toolLog);
      } else {
        const llm = this.getProvider();
        const models = aiModels();
        model = !llm ? 'rules' : mode === 'smart' ? models.deep : isAnalysisQuestion(question) ? models.analysis : models.chat;
        let streamed = false;
        const watch: Emit = (ev, data) => { if (ev === 'delta') streamed = true; emit(ev, data); };
        const loop = (provider: AiProvider, m: string) => this.agentLoop({
          provider, model: m, mode, ctx, question, history, summary: chat.summary, page: body.context ?? null,
          emit: watch, onTool, toolLog, usage, signal,
        });
        let out: Awaited<ReturnType<AiChatService['agentLoop']>>;
        try {
          out = await loop(llm ?? this.rules, model);
        } catch (e) {
          // The model call failed before any text: answer from the rules instead.
          if (!llm || streamed || signal.aborted) throw e;
          this.logger.warn(`Model answer failed, rules used instead (${user.tenantId}): ${(e as Error)?.message}`);
          model = 'rules';
          out = await loop(this.rules, 'rules');
        }
        text = out.text;
        if (out.model && llm && model !== 'rules') model = out.model;
        extras.suggestions = out.suggestions;
      }
    } catch (e: unknown) {
      failed = this.describeError(e, signal);
      if (failed.code !== 'BAD_REQUEST') this.logger.warn(`Answer failed (${user.tenantId}): ${(e as Error)?.message}`);
    }

    if (signal.aborted && !failed) failed = { code: 'BAD_REQUEST', message: 'Ruk gaya.' };
    if (failed && !text) {
      emit('error', failed);
      // Nothing was answered: keep the question, charge nothing.
      await this.touchChat(user, chat);
      return;
    }
    if (signal.aborted) text += '\n\n_(Jawab rok diya gaya.)_';

    if (!extras.suggestions.length) extras.suggestions = suggestionsFor(toolLog.map((t) => t.name), lang);
    const cost = model === 'template' || model === 'rules' ? 0 : costMicros(model, usage);
    const saved = await this.history.addMessage({
      chatId: chat.id, role: 'assistant', content: text,
      toolCalls: toolLog.length ? toolLog : null,
      charts: extras,
      model, route: route === 'template' ? 'template' : model === 'rules' ? 'rules' : 'llm',
      inputTokens: usage.input + usage.cacheWrite, outputTokens: usage.output, cachedTokens: usage.cacheRead,
      costMicros: cost, latencyMs: Date.now() - started,
    });
    await this.history.addUsage(user.tenantId, quota.day, {
      messages: weight, tokens: usage.input + usage.output + usage.cacheRead + usage.cacheWrite, costMicros: cost,
    });
    await this.touchChat(user, chat);
    if (failed) emit('error', failed);
    if (extras.suggestions.length) emit('suggestions', { items: extras.suggestions });
    emit('done', { messageId: saved.id, userMessageId: userMsg.id, remaining: Math.max(0, quota.remaining - weight), costMicros: cost });
  }

  /* ───────────────────────── template route ───────────────────────── */

  private async answerFromTemplate(
    intent: TemplateIntent, lang: Lang, ctx: AiToolContext, emit: Emit,
    onTool: (r: AiToolResult) => void, toolLog: Array<{ name: string; input: unknown; ok: boolean }>,
  ): Promise<string> {
    let text: string;
    if (intent === 'morning') {
      emit('status', { text: 'Kal ka hisaab jor raha hoon…' });
      const m = await this.morning.forUser(ctx.user, ctx.scope);
      text = m.text;
      toolLog.push({ name: 'morning_summary', input: {}, ok: m.allowed });
      if (m.allowed) onTool({ data: null, link: { label: 'Din ka hisaab', to: '/day-report' } });
    } else {
      const name = intent === 'today_sale' ? 'sales_summary' : 'stock_reorder';
      const input = intent === 'today_sale' ? { period: 'today' } : { mode: 'reorder' };
      emit('status', { text: TOOL_STATUS[name] });
      const res = await this.tools.run(name, input, ctx);
      toolLog.push({ name, input, ok: !res.refused });
      onTool(res);
      text = renderTool(name, res.data, lang);
    }
    for (const chunk of text.match(/[\s\S]{1,48}/g) ?? []) emit('delta', { text: chunk });
    return text;
  }

  /* ───────────────────────── model route ───────────────────────── */

  private async agentLoop(a: {
    provider: AiProvider; model: string; mode: AiMode; ctx: AiToolContext; question: string; history: MessageRow[]; summary: string | null;
    page: AiChatRequest['context'] | null; emit: Emit; onTool: (r: AiToolResult) => void;
    toolLog: Array<{ name: string; input: unknown; ok: boolean }>; usage: AiTokenUsage; signal: AbortSignal;
  }): Promise<{ text: string; model?: string; suggestions: string[] }> {
    const provider = a.provider;
    const tools = toolDefinitions() as ToolDef[];
    const dyn = dynamicSystem({ ctx: a.ctx, page: a.page, summary: a.summary });
    const messages: MessageParam[] = [];
    for (const m of a.history) {
      if (!m.content.trim()) continue;
      const last = messages[messages.length - 1];
      // Keep strict user/assistant alternation even when an answer is missing.
      if (last && last.role === m.role) { last.content = `${last.content as string}\n\n${m.content}`; continue; }
      messages.push({ role: m.role, content: m.content.slice(0, 3000) });
    }
    if (messages.length && messages[0].role === 'assistant') messages.shift();
    if (messages.length && messages[messages.length - 1].role === 'user') {
      messages[messages.length - 1].content = `${messages[messages.length - 1].content as string}\n\n${a.question}`;
    } else {
      messages.push({ role: 'user', content: a.question });
    }

    let text = '';
    let model: string | undefined;
    // Hides the "<<followups: …>>" tail while it streams.
    const filter = new FollowupFilter();
    for (let round = 0; round <= AI_MAX_TOOL_ROUNDS; round++) {
      const last = round === AI_MAX_TOOL_ROUNDS;
      let roundText = '';
      const turn = await provider.turn({
        model: a.model,
        effort: a.mode === 'smart' ? 'high' : 'medium',
        maxTokens: a.mode === 'smart' ? 16_000 : 8_000,
        staticSystem: STATIC_SYSTEM, dynamicSystem: dyn, tools, messages, noTools: last, signal: a.signal,
      }, (delta) => {
        roundText += delta;
        const show = filter.push(delta);
        if (show) a.emit('delta', { text: show });
      });
      model = turn.model;
      a.usage.input += turn.usage.input; a.usage.output += turn.usage.output;
      a.usage.cacheRead += turn.usage.cacheRead; a.usage.cacheWrite += turn.usage.cacheWrite;
      text += roundText;

      if (turn.stopReason === 'refusal') {
        if (!text) text = 'Is sawal ka jawab nahi de sakta. Apni dukaan ke hisaab-kitaab ke baare me poochein.';
        break;
      }
      const uses = turn.content.filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlockParam => (b as { type?: string }).type === 'tool_use');
      if (turn.stopReason !== 'tool_use' || !uses.length) break;
      if (text && !text.endsWith('\n')) { text += '\n\n'; const show = filter.push('\n\n'); if (show) a.emit('delta', { text: show }); }

      // Run this round's tools in parallel; all results go back in one message.
      messages.push({ role: 'assistant', content: turn.content });
      const results = await Promise.all(uses.map(async (u) => {
        a.emit('status', { text: TOOL_STATUS[u.name] ?? 'Data dekh raha hoon…' });
        const res = ACTION_TOOL_NAMES.has(u.name)
          ? await this.actions.propose(u.name, (u.input ?? {}) as Record<string, any>, a.ctx)
          : await this.tools.run(u.name, u.input, a.ctx);
        a.toolLog.push({ name: u.name, input: u.input, ok: !res.refused });
        a.onTool(res);
        return {
          type: 'tool_result' as const, tool_use_id: u.id,
          content: JSON.stringify(res.data ?? null).slice(0, 12_000),
          ...(res.refused && { is_error: true }),
        };
      }));
      messages.push({ role: 'user', content: results as ContentBlockParam[] });
      if (a.signal.aborted) break;
    }
    const done = filter.finish();
    if (done.leftover) a.emit('delta', { text: done.leftover });
    return { text: done.text.trim(), model, suggestions: done.suggestions };
  }

  private describeError(e: unknown, signal: AbortSignal): { code: AiErrorCode; message: string } {
    if (signal.aborted || e instanceof Anthropic.APIUserAbortError) return { code: 'BAD_REQUEST', message: 'Ruk gaya.' };
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { code: 'PROVIDER', message: AI_BUSY_MESSAGE };
    if (e instanceof Anthropic.RateLimitError) return { code: 'PROVIDER', message: 'AI par is waqt rush hai. Thori der baad koshish karein.' };
    if (e instanceof Anthropic.APIError) return { code: 'PROVIDER', message: 'AI se jawab nahi aa saka. Dobara koshish karein.' };
    return { code: 'PROVIDER', message: 'Jawab banane me masla hua. Dobara koshish karein.' };
  }

  /* ───────────────────────── chat upkeep ───────────────────────── */

  /** First question → short title, no model call. */
  titleFrom(question: string): string {
    const clean = question.replace(/\s+/g, ' ').replace(/[?؟!.]+$/, '').trim();
    const t = clean.length > 60 ? `${clean.slice(0, 57).replace(/\s+\S*$/, '')}…` : clean;
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Nayi baat';
  }

  /**
   * Updates the chat after a turn: last activity, and a running summary of
   * older turns built without a model (question + first line of the answer),
   * kept under AI_SUMMARY_CHARS. Only turns that fall out of the verbatim
   * window are added.
   */
  private async touchChat(user: AuthenticatedUser, chat: ChatRow) {
    const count = await this.history.countMessages(chat.id);
    let summary = chat.summary ?? '';
    if (count > AI_RECENT_MESSAGES + 1) {
      const older = await this.history.messages(chat.id, AI_RECENT_MESSAGES + 2);
      const [q, ans] = older.slice(0, 2);
      if (q?.role === 'user' && ans?.role === 'assistant') {
        const first = ans.content.split('\n').find((l) => l.trim()) ?? '';
        summary = `${summary} | Q: ${q.content.slice(0, 120)} → A: ${first.replace(/[*_]/g, '').slice(0, 160)}`.slice(-AI_SUMMARY_CHARS);
      }
    }
    await this.history.updateChat(user.tenantId, user.id, chat.id, { lastMessageAt: new Date(), ...(summary && { summary }) });
  }
}
