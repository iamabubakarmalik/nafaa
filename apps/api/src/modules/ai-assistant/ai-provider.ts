/**
 * Model providers for Nafaa AI.
 *
 * AnthropicProvider streams one Messages API turn with the official SDK:
 * adaptive thinking, an effort level per mode, prompt caching on the tool
 * list and the fixed system prompt (one breakpoint at the end of the static
 * system block) plus automatic caching of the conversation prefix across
 * tool rounds, and the server-side refusal fallback on models that accept it.
 *
 * RuleProvider answers without a model: when no key is set, as a fallback when
 * the model call fails, and for local testing (AI_PROVIDER=mock). On the first
 * turn it asks for the tools a keyword router picks (reports and parsed
 * actions); on the next turn it writes a templated answer from the real tool
 * results. Questions it cannot route get a short "try one of these" reply and
 * suggestion chips. The agent loop, tools, streaming and history run exactly
 * as with the model.
 */

import Anthropic from '@anthropic-ai/sdk';
import { AI_FALLBACK_MODELS, AI_UNSURE_MESSAGE, AI_UNSURE_MESSAGE_EN, aiProviderKind, type AiTokenUsage } from './ai.config';
import { detectLang, ruleToolPlan, renderTool } from './ai-render';

export type MessageParam = Anthropic.Beta.Messages.BetaMessageParam;
export type ContentBlockParam = Anthropic.Beta.Messages.BetaContentBlockParam;
export type ToolDef = Anthropic.Beta.Messages.BetaTool;

export interface TurnRequest {
  model: string;
  effort: 'low' | 'medium' | 'high';
  maxTokens: number;
  /** Fixed instructions; cached. */
  staticSystem: string;
  /** Per-request facts (date, shop, page); after the cache breakpoint. */
  dynamicSystem: string;
  tools: ToolDef[];
  messages: MessageParam[];
  /** Last round: the model must answer in text. */
  noTools?: boolean;
  signal?: AbortSignal;
}

export interface TurnResult {
  content: ContentBlockParam[];
  stopReason: string | null;
  usage: AiTokenUsage;
  model: string;
}

export interface AiProvider {
  turn(req: TurnRequest, onText: (text: string) => void): Promise<TurnResult>;
}

/* ───────────────────────── Anthropic ───────────────────────── */

export class AnthropicProvider implements AiProvider {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    // Two retries on 429/5xx are the SDK default; answers are short, so a
    // 90 second ceiling per call is plenty and keeps a stuck request bounded.
    this.client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 2 });
  }

  async turn(req: TurnRequest, onText: (text: string) => void): Promise<TurnResult> {
    const fallback = AI_FALLBACK_MODELS.has(req.model);
    const stream = this.client.beta.messages.stream(
      {
        model: req.model,
        max_tokens: req.maxTokens,
        thinking: { type: 'adaptive' },
        output_config: { effort: req.effort },
        system: [
          { type: 'text', text: req.staticSystem, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: req.dynamicSystem },
        ],
        tools: req.tools,
        ...(req.noTools && { tool_choice: { type: 'none' as const } }),
        messages: req.messages,
        // Caches the growing conversation between tool rounds of one question.
        cache_control: { type: 'ephemeral' },
        ...(fallback && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
      },
      { signal: req.signal },
    );
    stream.on('text', (delta) => onText(delta));
    const msg = await stream.finalMessage();
    const u = msg.usage;
    return {
      content: msg.content as unknown as ContentBlockParam[],
      stopReason: msg.stop_reason,
      model: msg.model,
      usage: {
        input: u.input_tokens ?? 0,
        output: u.output_tokens ?? 0,
        cacheRead: u.cache_read_input_tokens ?? 0,
        cacheWrite: u.cache_creation_input_tokens ?? 0,
      },
    };
  }
}

/* ───────────────────────── Rules ───────────────────────── */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class RuleProvider implements AiProvider {
  async turn(req: TurnRequest, onText: (text: string) => void): Promise<TurnResult> {
    const last = req.messages[req.messages.length - 1];
    const blocks = Array.isArray(last?.content) ? last.content : [];
    const results = blocks.filter((b): b is Anthropic.Beta.Messages.BetaToolResultBlockParam => (b as { type?: string }).type === 'tool_result');
    const question = this.lastQuestion(req.messages);
    const empty: AiTokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

    if (!results.length && !req.noTools) {
      const plan = ruleToolPlan(question);
      if (!plan.length) {
        const text = detectLang(question) === 'en' ? AI_UNSURE_MESSAGE_EN : AI_UNSURE_MESSAGE;
        onText(text);
        return { model: 'rules', stopReason: 'end_turn', usage: empty, content: [{ type: 'text', text }] };
      }
      return {
        model: 'rules',
        stopReason: 'tool_use',
        usage: empty,
        content: plan.map((p, i) => ({ type: 'tool_use' as const, id: `rule_${Date.now()}_${i}`, name: p.name, input: p.input })),
      };
    }

    // Find the tool names behind the results in the previous assistant turn.
    const prev = req.messages[req.messages.length - 2];
    const uses = (Array.isArray(prev?.content) ? prev.content : []) as Array<{ type: string; id?: string; name?: string }>;
    const lang = detectLang(question) === 'en' ? 'en' : 'roman';
    const parts = results.map((r) => {
      const name = uses.find((u) => u.type === 'tool_use' && u.id === r.tool_use_id)?.name ?? '';
      const raw = typeof r.content === 'string' ? r.content : Array.isArray(r.content) ? r.content.map((c) => ('text' in c ? c.text : '')).join('') : '';
      let data: unknown = null;
      try { data = JSON.parse(raw); } catch { data = null; }
      return renderTool(name, data, lang);
    });
    const text = parts.join('\n\n');
    for (const chunk of text.match(/[\s\S]{1,24}/g) ?? []) {
      if (req.signal?.aborted) break;
      onText(chunk);
      await sleep(12);
    }
    return { model: 'rules', stopReason: 'end_turn', usage: empty, content: [{ type: 'text', text }] };
  }

  private lastQuestion(messages: MessageParam[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== 'user') continue;
      if (typeof m.content === 'string') return m.content;
      const t = m.content.find((b) => (b as { type?: string }).type === 'text') as { text?: string } | undefined;
      if (t?.text) return t.text;
    }
    return '';
  }
}

/** The model provider when a key is set; otherwise null (the rules provider answers). */
export function createProvider(): AiProvider | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return aiProviderKind() === 'anthropic' && key ? new AnthropicProvider(key) : null;
}
