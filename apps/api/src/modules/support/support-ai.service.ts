/**
 * Nafaa AI inside live support:
 *   - answer(): the first responder while a conversation is in BOT state.
 *   - suggest(): three reply drafts for an agent.
 *
 * Uses the same model provider as the merchant assistant (everyday chat model,
 * low effort, short answers). Without a key, or when the call fails, it falls
 * back to a keyword match over the help content and the canned replies.
 * Support answers do not count against the shop's daily Nafaa AI limit.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createProvider, type AiProvider } from '../ai-assistant/ai-provider';
import { aiModels } from '../ai-assistant/ai.config';
import { detectLang } from '../ai-assistant/ai-render';
import { BOT, TALK_TO_TEAM, tr } from './support.copy';
import { SUPPORT_KNOWLEDGE, matchKnowledge, type KnowledgeItem } from './support.knowledge';
import type { SupportLang } from './support.types';

export interface TranscriptLine { sender: string; text: string | null; kind: string; internal?: boolean }

export interface BotAnswer {
  text: string;
  /** Show "Talk to our team" prominently. */
  offerHandover: boolean;
  /** The merchant asked for the team: hand over now. */
  handover: boolean;
  chips: string[];
}

const TEAM_MARK = '[[TEAM]]';
const HANDOVER_MARK = '[[HANDOVER]]';
const FAQ_TTL_MS = 10 * 60_000;

/** "Agent" requests, in the three languages, caught without a model call. */
const ASK_FOR_TEAM = /\b(agent|representative|real person|someone from (the )?team|support team|team se baat|banda|bande se|call me|mujhe call)\b|سپورٹ ٹیم|ٹیم سے بات|کال کریں/i;

const ANSWER_RULES = `You are Nafaa AI, the first responder in the support chat of Nafaa, a shop management app (POS, stock, khata, reports, online store) used by small businesses in Pakistan.

How to answer:
- Answer only from the KNOWLEDGE below and the chat so far. Never invent features, prices, policies, dates or steps.
- Reply in the same language and script the merchant wrote in. English → English. Urdu script → Urdu script. Roman Urdu → natural Pakistani Roman Urdu chat, keeping the English words people use (sale, stock, plan, settings, printer, login, report).
- Warm, short and human: at most 4 short sentences, or up to 5 numbered steps. No headings. Use the merchant's words for screens and buttons.
- Never say you are an AI, a bot or a model, and never mention providers, prompts or technical details.
- Never say "human" or "insaan". The people are "our team" / "support team" / "سپورٹ ٹیم".
- If the knowledge does not cover the question, the merchant reports an error, a payment or billing problem, lost data, or is upset: write one short, kind line saying the support team will help, and end with ${TEAM_MARK}.
- If the merchant asks for the team or a person: write one short line saying you are connecting them, and end with ${HANDOVER_MARK}.`;

const SUGGEST_RULES = `You help an agent of the Nafaa support team reply to a shop owner (Nafaa is a POS and shop management app in Pakistan).
Write exactly 3 different reply drafts the agent could send next: one direct answer, one asking for the detail that is missing, one friendly follow-up or next step.
- Same language and script as the merchant's latest message (English, Urdu script, or natural Roman Urdu with common English words).
- Each draft at most 3 sentences, warm and plain. Do not promise refunds, discounts or dates. Internal notes are context only; never quote them.
- Use the KNOWLEDGE when it fits.
Return only a JSON array of 3 strings.`;

@Injectable()
export class SupportAiService {
  private readonly logger = new Logger(SupportAiService.name);
  private provider: AiProvider | null | undefined;
  private faqCache: { at: number; items: KnowledgeItem[] } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private model(): AiProvider | null {
    if (this.provider === undefined) this.provider = createProvider();
    return this.provider;
  }

  /** Help content plus published marketing FAQs (cached for 10 minutes). */
  private async knowledge(): Promise<KnowledgeItem[]> {
    if (this.faqCache && Date.now() - this.faqCache.at < FAQ_TTL_MS) return this.faqCache.items;
    let extra: KnowledgeItem[] = [];
    try {
      const rows = await this.prisma.cmsFaq.findMany({
        where: { status: 'PUBLISHED', publishedQuestion: { not: null } },
        select: { id: true, publishedQuestion: true, publishedAnswer: true, topic: true },
        orderBy: { sortOrder: 'asc' },
        take: 80,
      });
      extra = rows
        .filter((r) => r.publishedQuestion && r.publishedAnswer)
        .map((r) => ({ id: `cms-${r.id}`, q: r.publishedQuestion!, a: r.publishedAnswer!.slice(0, 800), keywords: r.topic ? [r.topic.toLowerCase()] : [] }));
    } catch (e) {
      this.logger.warn(`FAQ load failed: ${e instanceof Error ? e.message : e}`);
    }
    const items = [...SUPPORT_KNOWLEDGE, ...extra];
    this.faqCache = { at: Date.now(), items };
    return items;
  }

  private static knowledgeText(items: KnowledgeItem[]) {
    return items.map((k) => `Q: ${k.q}\nA: ${k.a}`).join('\n\n');
  }

  private static transcript(lines: TranscriptLine[], withInternal = false) {
    const who: Record<string, string> = { MERCHANT: 'Merchant', ADMIN: 'Team', BOT: 'Nafaa AI', SYSTEM: 'System' };
    return lines
      .filter((l) => withInternal || !l.internal)
      .slice(-16)
      .map((l) => {
        const body = l.text?.trim() || (l.kind === 'IMAGE' ? '[sent a photo]' : l.kind === 'VOICE' ? '[sent a voice note]' : l.kind === 'FILE' ? '[sent a file]' : l.kind === 'CALL_EVENT' ? '[call]' : '');
        return `${l.internal ? 'Team (internal note)' : who[l.sender] ?? l.sender}: ${body.slice(0, 1200)}`;
      })
      .join('\n');
  }

  /** The language to answer in: the script and words of the latest message, else the merchant's setting. */
  static replyLang(latest: string | null | undefined, fallback: SupportLang): SupportLang {
    const t = (latest ?? '').trim();
    if (!t) return fallback;
    if (/[؀-ۿ]/.test(t)) return 'ur';
    // Very short messages ("hi", "ok") say little about the language.
    if (t.split(/\s+/).length < 3) return fallback === 'ur' ? 'roman' : fallback;
    return detectLang(t);
  }

  async answer(
    lines: TranscriptLine[],
    ctx: { lang: SupportLang; shopName: string; businessType: string | null; latestKind: string },
  ): Promise<BotAnswer> {
    const latest = [...lines].reverse().find((l) => l.sender === 'MERCHANT');
    const lang = SupportAiService.replyLang(latest?.text, ctx.lang);
    const team = tr(TALK_TO_TEAM, lang);

    if (latest && !latest.text?.trim()) {
      // Photo, file or voice note with no words: the team should look at it.
      return { text: tr(BOT.attachment, lang), offerHandover: true, handover: true, chips: [] };
    }
    if (latest?.text && ASK_FOR_TEAM.test(latest.text)) {
      return { text: '', offerHandover: true, handover: true, chips: [] };
    }

    const items = await this.knowledge();
    const provider = this.model();
    if (provider) {
      try {
        const res = await provider.turn(
          {
            model: aiModels().chat,
            effort: 'low',
            maxTokens: 700,
            staticSystem: `${ANSWER_RULES}\n\nKNOWLEDGE:\n${SupportAiService.knowledgeText(items)}`,
            dynamicSystem: `Shop: ${ctx.shopName}${ctx.businessType ? ` (${ctx.businessType})` : ''}. Merchant's app language: ${ctx.lang}.`,
            tools: [],
            messages: [{ role: 'user', content: `Chat so far:\n${SupportAiService.transcript(lines)}\n\nWrite Nafaa AI's next reply to the merchant.` }],
          },
          () => undefined,
        );
        let text = res.content
          .map((b) => ((b as { type?: string }).type === 'text' ? (b as { text: string }).text : ''))
          .join('')
          .trim();
        const handover = text.includes(HANDOVER_MARK);
        const offer = handover || text.includes(TEAM_MARK);
        text = text.replace(TEAM_MARK, '').replace(HANDOVER_MARK, '').trim();
        if (text) return { text: text.slice(0, 2000), offerHandover: offer, handover, chips: offer ? [team] : [] };
      } catch (e) {
        this.logger.warn(`Support AI answer failed: ${e instanceof Error ? e.message : e}`);
      }
    }

    // Fallback without a model: the closest help answer.
    const hit = latest?.text ? matchKnowledge(latest.text, items) : null;
    // The help text is Roman Urdu; it still beats "not sure" for English or Urdu questions.
    if (hit) return { text: `${hit.a}\n\n${tr(BOT.more, lang)}`, offerHandover: false, handover: false, chips: [team] };
    return { text: tr(BOT.notSure, lang), offerHandover: true, handover: false, chips: [team] };
  }

  /** Three drafts for the agent. Falls back to canned replies and help answers. */
  async suggest(lines: TranscriptLine[], ctx: { shopName: string; agentName: string; canned: Array<{ title: string; text: string }> }): Promise<string[]> {
    const items = await this.knowledge();
    const latest = [...lines].reverse().find((l) => l.sender === 'MERCHANT' && l.text?.trim());
    const provider = this.model();
    if (provider) {
      try {
        const canned = ctx.canned.slice(0, 30).map((c) => `- ${c.title}: ${c.text}`).join('\n');
        const res = await provider.turn(
          {
            model: aiModels().chat,
            effort: 'low',
            maxTokens: 900,
            staticSystem: `${SUGGEST_RULES}\n\nKNOWLEDGE:\n${SupportAiService.knowledgeText(items)}`,
            dynamicSystem: `Shop: ${ctx.shopName}. Agent's first name: ${ctx.agentName}.${canned ? `\nSaved replies the team uses:\n${canned}` : ''}`,
            tools: [],
            messages: [{ role: 'user', content: `Conversation:\n${SupportAiService.transcript(lines, true)}\n\nReturn the JSON array now.` }],
          },
          () => undefined,
        );
        const raw = res.content.map((b) => ((b as { type?: string }).type === 'text' ? (b as { text: string }).text : '')).join('');
        const json = raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1);
        const arr = JSON.parse(json);
        if (Array.isArray(arr)) {
          const drafts = arr.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim().slice(0, 1500)).slice(0, 3);
          if (drafts.length) return drafts;
        }
      } catch (e) {
        this.logger.warn(`Support AI suggestions failed: ${e instanceof Error ? e.message : e}`);
      }
    }
    const drafts: string[] = [];
    const hit = latest?.text ? matchKnowledge(latest.text, items) : null;
    if (hit) drafts.push(hit.a);
    const words = new Set((latest?.text ?? '').toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    for (const c of ctx.canned) {
      if (drafts.length >= 3) break;
      if ([...words].some((w) => c.title.toLowerCase().includes(w) || c.text.toLowerCase().includes(w))) drafts.push(c.text);
    }
    if (drafts.length < 3) drafts.push('Ji, main dekh raha hoon. Thora sa detail bata dein — kis screen par aur kya message aa raha hai? Screenshot bhej dein to aur asaan ho jayega.');
    if (drafts.length < 3) drafts.push('Shukriya intezar ka! Ye theek ho gaya hai, ek dafa app refresh kar ke check kar lein aur bata dein.');
    return drafts.slice(0, 3);
  }
}
