/**
 * Nafaa AI for Nafaa Social: caption options and a month of post ideas.
 *
 * Low-cost routing as in the merchant studio: one short call to the everyday
 * model (AI_MODEL) at low effort, no tools, a small output budget. Usage is
 * counted in ai_usage_daily under the "nafaa-social" key so it shows in the
 * admin AI usage page. Without a model, or when a call fails, simple
 * ready-made text answers instead.
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createProvider, type AiProvider } from '../../modules/ai-assistant/ai-provider';
import { aiModels, costMicros } from '../../modules/ai-assistant/ai.config';
import { dateKeyTz } from '../../common/helpers/business-time.helper';
import { parseJsonObject } from '../../modules/growth/social/social-math';
import { BrandSocialPostsService, SocialActor } from './brand-social-posts.service';
import { BrandSocialSettingsService } from './brand-social-settings.service';
import { cleanHashtags, isKind, parsePktDateTime, platformFrom, PLATFORM_LABEL, CAPTION_LIMITS } from './brand-social.logic';
import type { AiCaptionInput, AiCaptionResponse, AiPlanInput, AiPlanResponse, BrandPlatform, BrandPostKind } from './brand-social.types';

const USAGE_KEY = 'nafaa-social';

const SYSTEM = [
  'You write social media posts for Nafaa (nafaa.pk), a Pakistani business app for shops:',
  'POS and billing, stock, customer credit (khata), expenses and profit reports, an online store and a mobile app,',
  'for retail, grocery, pharmacy, bakery, restaurants and wholesale. Audience: Pakistani shop owners and managers.',
  'Rules: honest and specific; never invent prices, discounts, customer numbers, awards or features that are not given;',
  'no political or religious claims beyond simple greetings; emojis sparingly. Answer with one JSON object only, no other text.',
].join(' ');

@Injectable()
export class BrandSocialAiService {
  private readonly logger = new Logger('BrandSocialAi');
  private provider: AiProvider | null | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: BrandSocialSettingsService,
    private readonly posts: BrandSocialPostsService,
  ) {}

  private getProvider(): AiProvider | null {
    if (this.provider === undefined) this.provider = createProvider();
    return this.provider;
  }

  private async ask(task: string, maxTokens: number): Promise<Record<string, unknown> | null> {
    const provider = this.getProvider();
    if (!provider) return null;
    const s = await this.settings.get();
    const model = aiModels().chat;
    try {
      const res = await provider.turn({
        model, effort: 'low', maxTokens, staticSystem: SYSTEM,
        dynamicSystem: `Today: ${dateKeyTz(new Date())}. Brand voice: ${s.brandVoice || 'friendly and clear'}.`,
        tools: [], noTools: false,
        messages: [{ role: 'user', content: task }],
      }, () => undefined);
      await this.addUsage(model, res.usage);
      const text = res.content.map((b) => ((b as { type?: string }).type === 'text' ? (b as { text: string }).text : '')).join('');
      return parseJsonObject(text);
    } catch (e) {
      this.logger.warn(`AI call failed, using ready-made text: ${(e as Error).message}`);
      return null;
    }
  }

  private async addUsage(model: string, usage: { input: number; output: number; cacheRead: number; cacheWrite: number }) {
    const date = dateKeyTz(new Date());
    const tokens = usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
    const cost = costMicros(model, usage);
    await this.prisma.aiUsageDaily.upsert({
      where: { tenantId_date: { tenantId: USAGE_KEY, date } },
      create: { tenantId: USAGE_KEY, date, messages: 1, tokens, costMicros: cost },
      update: { messages: { increment: 1 }, tokens: { increment: tokens }, costMicros: { increment: cost } },
    }).catch((e) => this.logger.warn(`AI usage not saved: ${(e as Error).message}`));
  }

  /* ───────────────────────── captions ───────────────────────── */

  async caption(body: AiCaptionInput): Promise<AiCaptionResponse> {
    const brief = String(body?.brief ?? '').trim().slice(0, 1500);
    if (!brief) throw new BadRequestException('Write a short brief first.');
    const platform: BrandPlatform | null = platformFrom(body?.platform);
    const tone = String(body?.tone ?? '').trim().slice(0, 80);
    const limit = platform ? CAPTION_LIMITS[platform] : 2200;
    const smart = await this.ask(
      `Write 3 different captions for ${platform ? PLATFORM_LABEL[platform] : 'Facebook and Instagram'}` +
      `${tone ? ` in a ${tone} tone` : ''}, each under ${Math.min(limit, 600)} characters with a clear call to action, and 12 relevant hashtags.` +
      ` Brief: ${brief}\nJSON: {"captions": string[3], "hashtags": string[]}`,
      900,
    );
    const captions = Array.isArray(smart?.captions) ? smart!.captions.filter((c): c is string => typeof c === 'string' && !!c.trim()).map((c) => c.slice(0, limit)).slice(0, 3) : [];
    if (captions.length) return { captions, hashtags: cleanHashtags(smart!.hashtags, 30), smart: true };
    return {
      captions: [
        `${brief}\n\nTry Nafaa free: nafaa.pk`,
        `Running a shop is hard work. ${brief}\n\nSee how Nafaa helps: nafaa.pk`,
        `${brief}\n\nQuestions? Message us and our team will help.`,
      ].map((c) => c.slice(0, limit)),
      hashtags: ['#Nafaa', '#NafaaPK', '#PakistanBusiness', '#SmallBusiness', '#POS', '#ShopOwner'],
      smart: false,
    };
  }

  /* ───────────────────────── month plan ───────────────────────── */

  async plan(body: AiPlanInput, actor: SocialActor): Promise<AiPlanResponse> {
    const m = /^(\d{4})-(\d{2})$/.exec(String(body?.month ?? ''));
    if (!m || +m[2] < 1 || +m[2] > 12) throw new BadRequestException('Month must look like 2026-12.');
    const year = +m[1];
    const month = +m[2];
    const daysIn = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const perDay = Math.max(1, Math.min(3, Math.trunc(Number(body?.perDay) || 1)));
    const s = await this.settings.get();
    const pillarKeys = (Array.isArray(body?.pillars) && body.pillars.length ? body.pillars : s.pillars.map((p) => p.key)).filter((x): x is string => typeof x === 'string').slice(0, 10);
    const platforms = (Array.isArray(body?.platforms) && body.platforms.length ? body.platforms : ['FACEBOOK', 'INSTAGRAM']).map(platformFrom).filter((x): x is BrandPlatform => !!x);
    const total = daysIn * perDay;
    const todayKey = dateKeyTz(new Date());

    type Idea = { date: string; time: string; kind: BrandPostKind; pillar: string | null; title: string; caption: string; hashtags: string[] };
    let ideas: Idea[] = [];
    const smart = await this.ask(
      `Plan ${total} post ideas for ${year}-${String(month).padStart(2, '0')} (${perDay} per day, every day).` +
      ` Pillars (use these keys): ${JSON.stringify(s.pillars.filter((p) => pillarKeys.includes(p.key)).map((p) => ({ key: p.key, label: p.label })))}.` +
      ` Platforms: ${platforms.map((p) => PLATFORM_LABEL[p]).join(', ')}. Mix kinds: POST, CAROUSEL, REEL, STORY. Spread pillars evenly.` +
      ` Times are Pakistan time; good times: ${JSON.stringify(s.bestTimes.INSTAGRAM ?? ['20:00'])}.` +
      `${body?.brief ? ` Focus: ${String(body.brief).slice(0, 600)}.` : ''}` +
      ` Keep each caption under 400 characters. JSON: {"ideas": [{"date": "YYYY-MM-DD", "time": "HH:MM", "kind": string, "pillar": string, "title": string, "caption": string, "hashtags": string[]}]}`,
      Math.min(12_000, 600 + total * 170),
    );
    if (Array.isArray(smart?.ideas)) {
      ideas = (smart!.ideas as Array<Record<string, unknown>>).slice(0, total).map((x): Idea | null => {
        const date = typeof x.date === 'string' && x.date.startsWith(`${year}-${String(month).padStart(2, '0')}-`) ? x.date : null;
        if (!date) return null;
        return {
          date,
          time: typeof x.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.time) ? x.time : '20:00',
          kind: isKind(x.kind) ? x.kind : 'POST',
          pillar: typeof x.pillar === 'string' && pillarKeys.includes(x.pillar) ? x.pillar : null,
          title: String(x.title ?? '').slice(0, 200) || 'Post idea',
          caption: String(x.caption ?? '').slice(0, 2000),
          hashtags: cleanHashtags(x.hashtags, 15),
        };
      }).filter((x): x is Idea => !!x);
    }
    const isSmart = ideas.length > 0;
    if (!isSmart) {
      const kinds: BrandPostKind[] = ['POST', 'REEL', 'CAROUSEL', 'STORY'];
      for (let d = 1; d <= daysIn; d++) {
        for (let k = 0; k < perDay; k++) {
          const i = (d - 1) * perDay + k;
          const pillar = pillarKeys.length ? pillarKeys[i % pillarKeys.length] : null;
          const label = s.pillars.find((p) => p.key === pillar)?.label ?? 'Post';
          ideas.push({ date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`, time: k === 0 ? '13:00' : k === 1 ? '20:30' : '17:00', kind: kinds[i % kinds.length], pillar, title: `${label} idea`, caption: '', hashtags: [] });
        }
      }
    }

    const created = [];
    for (const idea of ideas) {
      const when = idea.date >= todayKey ? parsePktDateTime(`${idea.date}T${idea.time}`) : null;
      created.push(await this.posts.create({
        title: idea.title, kind: idea.kind, pillar: idea.pillar, caption: idea.caption, hashtags: idea.hashtags,
        platforms, scheduledAt: when && when.getTime() > Date.now() ? when.toISOString() : null, status: 'IDEA',
      }, actor, { aiMade: true }));
    }
    return { created: created.length, smart: isSmart, posts: created };
  }
}
