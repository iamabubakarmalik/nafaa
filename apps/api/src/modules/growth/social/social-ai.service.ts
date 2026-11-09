/**
 * Nafaa AI for the social media studio: captions, hashtags, reel scripts and
 * 7/30-day content plans from the shop's products, offers and festivals.
 *
 * Low-cost routing: one short call to the everyday model (AI_MODEL, the
 * small one) at low effort, no tools, a small output budget. Each call
 * counts as one Nafaa AI message against the shop's daily limit. When no
 * model is set up, the limit is used up, or the call fails, the ready-made
 * content from social-math answers instead, so the page always works.
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { createProvider, type AiProvider } from '../../ai-assistant/ai-provider';
import { aiModels, costMicros, dailyLimitFor } from '../../ai-assistant/ai.config';
import {
  cleanHashtags, festivalsBetween, isPlatform, parseJsonObject, quickCaptions, quickHashtags, quickPlan, quickReelScript, addDays,
  type ContentInput, type Festival, type Lang, type PlanIdea, type ProductBrief, type ReelScript, type SocialPlatform, isPostKind,
} from './social-math';

export type AiKind = 'caption' | 'hashtags' | 'script' | 'plan';

export interface AiRequest {
  kind?: AiKind;
  productIds?: string[];
  platform?: string;
  lang?: Lang;
  offer?: string;
  festivalKey?: string;
  /** Extra words from the merchant ("funny", "short", "for mothers"). */
  note?: string;
  /** Plans: 7 or 30 days from `from` (default today). */
  days?: number;
  from?: string;
}

export interface AiResult {
  kind: AiKind;
  captions?: string[];
  hashtags?: string[];
  script?: ReelScript;
  plan?: PlanIdea[];
  /** True when Nafaa AI wrote it; false for the ready-made version. */
  smart: boolean;
  remaining: number | null;
}

const LANG_NAME: Record<Lang, string> = {
  roman: 'Roman Urdu (Urdu in English letters, simple everyday words; business words like Sale, Discount, COD stay in English)',
  ur: 'Urdu script (simple words; business words like Sale, Discount, COD may stay in English)',
  en: 'simple English',
};

const SYSTEM = [
  'You write social media content for small online shops in Pakistan.',
  'Audience: Pakistani shoppers on Facebook, Instagram, TikTok, YouTube Shorts and WhatsApp status.',
  'Rules: keep it short and honest; never invent prices, discounts, stock counts or delivery promises that are not given;',
  'use emojis sparingly; no political or religious claims beyond simple greetings;',
  'on days marked saleDay=false (Muharram, 12 Rabi ul Awal, Kashmir Day, Iqbal Day, Quaid Day, Labour Day) write only a simple respectful greeting with no product or price.',
  'Answer with one JSON object only, no other text.',
].join(' ');

@Injectable()
export class SocialAiService {
  private readonly logger = new Logger('SocialAi');
  private provider: AiProvider | null | undefined;

  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  private getProvider(): AiProvider | null {
    if (this.provider === undefined) this.provider = createProvider();
    return this.provider;
  }

  async generate(user: AuthenticatedUser, body: AiRequest): Promise<AiResult> {
    const kind: AiKind = (['caption', 'hashtags', 'script', 'plan'] as const).includes(body.kind as AiKind) ? body.kind as AiKind : 'caption';
    const lang: Lang = body.lang === 'ur' || body.lang === 'en' ? body.lang : 'roman';
    const platform: SocialPlatform | null = isPlatform(body.platform) ? body.platform : null;
    const today = await this.today(user.tenantId);
    const from = /^\d{4}-\d{2}-\d{2}$/.test(body.from ?? '') ? body.from! : today;
    const days = kind === 'plan' ? (Number(body.days) >= 30 ? 30 : 7) : 0;

    const [shop, products] = await Promise.all([this.shopName(user.tenantId), this.products(user.tenantId, body.productIds, kind === 'plan' ? 12 : 3)]);
    const festival = body.festivalKey ? festivalsBetween(addDays(today, -400), addDays(today, 400)).find((f) => f.key === body.festivalKey && f.date >= addDays(today, -7)) ?? null : null;
    const input: ContentInput = { shop, products, platform, lang, offer: body.offer?.slice(0, 200) || null, festival, cod: true };

    const quota = await this.quota(user.tenantId, today);
    const provider = this.getProvider();
    if (provider && quota.remaining > 0) {
      try {
        const smart = await this.ask(provider, user.tenantId, today, kind, input, { note: body.note, from, days, festival });
        if (smart) return { ...smart, kind, smart: true, remaining: quota.remaining - 1 };
      } catch (e) {
        this.logger.warn(`Social AI call failed, using ready-made content: ${(e as Error).message}`);
      }
    }
    return { ...this.quick(kind, input, from, days), kind, smart: false, remaining: provider ? quota.remaining : null };
  }

  private quick(kind: AiKind, input: ContentInput, from: string, days: number): Omit<AiResult, 'kind' | 'smart' | 'remaining'> {
    if (kind === 'hashtags') return { hashtags: quickHashtags(input) };
    if (kind === 'script') return { script: quickReelScript(input) };
    if (kind === 'plan') return { plan: quickPlan({ ...input, from, days }) };
    return { captions: quickCaptions(input), hashtags: quickHashtags(input).slice(0, 12) };
  }

  /** One model call; null when the answer could not be read. */
  private async ask(
    provider: AiProvider, tenantId: string, day: string, kind: AiKind, input: ContentInput,
    extra: { note?: string; from: string; days: number; festival: Festival | null },
  ): Promise<Omit<AiResult, 'kind' | 'smart' | 'remaining'> | null> {
    const facts = {
      shop: input.shop,
      language: LANG_NAME[input.lang ?? 'roman'],
      platform: input.platform ?? 'any',
      products: input.products.map((p) => ({ id: p.id, name: p.name, price: p.price ?? undefined, priceBeforeDiscount: p.comparePrice ?? undefined, category: p.category ?? undefined })),
      offer: input.offer ?? undefined,
      festival: extra.festival ? { name: extra.festival.name, date: extra.festival.date, idea: extra.festival.idea, saleDay: extra.festival.sale } : undefined,
      cashOnDelivery: true,
      merchantNote: extra.note?.slice(0, 300) || undefined,
    };
    let task: string;
    let maxTokens = 900;
    if (kind === 'caption') task = 'Write 3 different captions (each under 60 words, with a call to action) and 12 hashtags. JSON: {"captions": string[3], "hashtags": string[]}';
    else if (kind === 'hashtags') task = 'Write 20 relevant hashtags: product, category, Pakistani cities and shopping tags, platform tags. JSON: {"hashtags": string[]}';
    else if (kind === 'script') task = 'Write a 15–25 second reel/TikTok script: a strong hook (first 2 seconds), 3–5 scenes with what to film and on-screen text and seconds, a call to action and a music hint. JSON: {"hook": string, "scenes": [{"shot": string, "text": string, "seconds": number}], "cta": string, "music": string}';
    else {
      const fests = festivalsBetween(extra.from, addDays(extra.from, extra.days + 20)).map((f) => ({ key: f.key, name: f.name, date: f.date, startPostingDaysBefore: f.leadDays, idea: f.idea, saleDay: f.sale }));
      task = `Make a ${extra.days}-day content plan starting ${extra.from}, one post idea per day, mixing posts, reels, stories and WhatsApp status; build up to these festivals/sale days: ${JSON.stringify(fests)}. Use the product ids given. Platforms from: FACEBOOK, INSTAGRAM, TIKTOK, YOUTUBE, WHATSAPP_STATUS. Kinds: POST, REEL, STORY, STATUS. JSON: {"plan": [{"date": "YYYY-MM-DD", "time": "HH:MM", "platforms": string[], "kind": string, "title": string, "caption": string, "hashtags": string[], "productIds": string[], "festivalKey": string|null}]}`;
      maxTokens = extra.days > 7 ? 6000 : 2200;
    }

    const model = aiModels().chat;
    const res = await provider.turn({
      model, effort: 'low', maxTokens, staticSystem: SYSTEM,
      dynamicSystem: `Today: ${day}.`,
      tools: [], noTools: false,
      messages: [{ role: 'user', content: `${task}\n\nFacts: ${JSON.stringify(facts)}` }],
    }, () => undefined);
    await this.addUsage(tenantId, day, model, res.usage);

    const text = res.content.map((b) => ((b as { type?: string }).type === 'text' ? (b as { text: string }).text : '')).join('');
    const obj = parseJsonObject(text);
    if (!obj) return null;
    if (kind === 'caption') {
      const captions = Array.isArray(obj.captions) ? obj.captions.filter((c): c is string => typeof c === 'string' && !!c.trim()).slice(0, 3) : [];
      return captions.length ? { captions, hashtags: cleanHashtags(obj.hashtags) } : null;
    }
    if (kind === 'hashtags') { const h = cleanHashtags(obj.hashtags); return h.length ? { hashtags: h } : null; }
    if (kind === 'script') {
      const s = obj as Partial<ReelScript>;
      if (typeof s.hook !== 'string' || !Array.isArray(s.scenes)) return null;
      return { script: {
        hook: s.hook, cta: String(s.cta ?? ''), music: String(s.music ?? ''),
        scenes: s.scenes.slice(0, 8).map((x) => ({ shot: String((x as { shot?: unknown }).shot ?? ''), text: String((x as { text?: unknown }).text ?? ''), seconds: Math.max(1, Math.min(30, Number((x as { seconds?: unknown }).seconds) || 3)) })),
      } };
    }
    const ids = new Set(input.products.map((p) => p.id).filter(Boolean) as string[]);
    const plan = (Array.isArray(obj.plan) ? obj.plan : []).slice(0, extra.days).map((raw): PlanIdea | null => {
      const x = raw as Record<string, unknown>;
      if (typeof x.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.date)) return null;
      return {
        date: x.date,
        time: typeof x.time === 'string' && /^\d{2}:\d{2}$/.test(x.time) ? x.time : '20:00',
        platforms: (Array.isArray(x.platforms) ? x.platforms : []).filter(isPlatform),
        kind: isPostKind(x.kind) ? x.kind : 'POST',
        title: String(x.title ?? '').slice(0, 120),
        caption: String(x.caption ?? '').slice(0, 2000),
        hashtags: cleanHashtags(x.hashtags).slice(0, 15),
        productIds: (Array.isArray(x.productIds) ? x.productIds : []).filter((id): id is string => typeof id === 'string' && ids.has(id)),
        festivalKey: typeof x.festivalKey === 'string' ? x.festivalKey : null,
      };
    }).filter((x): x is PlanIdea => !!x && x.platforms.length > 0);
    return plan.length ? { plan } : null;
  }

  /* ───────────────────────── data ───────────────────────── */

  private async shopName(tenantId: string): Promise<string> {
    const [s, t] = await Promise.all([
      this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { shopName: true } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);
    return s?.shopName || t?.name || 'Shop';
  }

  /** Chosen products, or the shop's recent active products with a price. */
  async products(tenantId: string, ids: string[] | undefined, take: number): Promise<ProductBrief[]> {
    const pick = Array.isArray(ids) ? ids.filter((x) => typeof x === 'string').slice(0, 20) : [];
    const rows = await this.prisma.product.findMany({
      where: { tenantId, isActive: true, ...(pick.length ? { id: { in: pick } } : { price: { gt: 0 } }) },
      select: { id: true, name: true, price: true, category: { select: { name: true } }, channelMappings: { where: { compareAtPrice: { not: null } }, select: { compareAtPrice: true }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      take: pick.length ? pick.length : take,
    });
    return rows.map((p) => ({
      id: p.id, name: p.name, price: Number(p.price) || null,
      comparePrice: p.channelMappings[0]?.compareAtPrice != null ? Number(p.channelMappings[0].compareAtPrice) : null,
      category: p.category?.name ?? null,
    }));
  }

  /* ───────────────────────── limits ───────────────────────── */

  private async today(tenantId: string): Promise<string> {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    return businessDayKey(new Date(), tz, dayStartHour);
  }

  private async quota(tenantId: string, day: string): Promise<{ remaining: number }> {
    const [sub, used] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: { tenantId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
        orderBy: [{ currentPeriodEnd: 'desc' }],
        select: { plan: { select: { slug: true } } },
      }),
      this.prisma.aiUsageDaily.findUnique({ where: { tenantId_date: { tenantId, date: day } }, select: { messages: true } }).catch(() => null),
    ]);
    return { remaining: Math.max(0, dailyLimitFor(sub?.plan?.slug) - (used?.messages ?? 0)) };
  }

  private async addUsage(tenantId: string, date: string, model: string, usage: { input: number; output: number; cacheRead: number; cacheWrite: number }) {
    const tokens = usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
    const cost = costMicros(model, usage);
    await this.prisma.aiUsageDaily.upsert({
      where: { tenantId_date: { tenantId, date } },
      create: { tenantId, date, messages: 1, tokens, costMicros: cost },
      update: { messages: { increment: 1 }, tokens: { increment: tokens }, costMicros: { increment: cost } },
    }).catch((e) => this.logger.warn(`AI usage not saved: ${(e as Error).message}`));
  }

  /** Guards the plan apply endpoint against huge bodies. */
  static checkPlanSize(n: number) {
    if (n > 31) throw new BadRequestException('Ek dafa me 31 se zyada posts nahi');
  }
}
