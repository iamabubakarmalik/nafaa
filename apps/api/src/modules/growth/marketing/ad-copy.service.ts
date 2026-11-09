/**
 * Nafaa AI ad copy: a headline, primary text and call-to-action button in
 * Roman Urdu, Urdu and English, written from the product's own data. Copy
 * only; nothing is posted anywhere.
 *
 * Uses the assistant's provider on the everyday (low-cost) model with low
 * effort. Without a model, or when the call fails, a template writes the copy
 * from the same data, so the button always gives something usable.
 * A shop gets 40 writes a day and a person 5 a minute.
 */

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { createProvider } from '../../ai-assistant/ai-provider';
import { aiModels } from '../../ai-assistant/ai.config';

export interface AdCopyInput {
  productId?: string;
  /** Free text when no product is picked. */
  name?: string;
  price?: number | string | null;
  offer?: string | null;
  audience?: string | null;
  platform?: string | null;
  shopName?: string | null;
}

export interface CopySet { headline: string; primaryText: string; cta: string }
export interface AdCopyResult { roman: CopySet; urdu: CopySet; en: CopySet; source: 'ai' | 'template' }

const CTAS = ['Shop Now', 'Order Now', 'Send WhatsApp Message', 'Learn More', 'Get Offer', 'Send Message'];
const DAILY_LIMIT = 40;
const BURST = { max: 5, windowMs: 60_000 };

const SYSTEM = [
  'You write short paid-social ad copy (Facebook, Instagram, TikTok) for a Pakistani online shop.',
  'Return JSON only, no other text, in this shape:',
  '{"roman":{"headline":"","primaryText":"","cta":""},"urdu":{"headline":"","primaryText":"","cta":""},"en":{"headline":"","primaryText":"","cta":""}}',
  'roman = Roman Urdu with simple everyday words; keep business words in English (Sale, Discount, COD, Free delivery, Order).',
  'urdu = Urdu script. en = plain English.',
  'headline: at most 40 characters. primaryText: at most 220 characters, may use one or two emoji, mention cash on delivery when it fits.',
  `cta: exactly one of ${CTAS.join(', ')} (same English button text in all three).`,
  'Use only the facts given. Never invent prices, discounts, ratings or claims. No hashtags.',
].join('\n');

const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

/** Pulls the JSON object out of a model answer and checks its shape. */
export function parseCopy(text: string): Omit<AdCopyResult, 'source'> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(text.slice(start, end + 1));
    const set = (x: any): CopySet | null => {
      if (!x || typeof x !== 'object') return null;
      const headline = clip(x.headline, 60);
      const primaryText = clip(x.primaryText, 400);
      if (!headline || !primaryText) return null;
      const cta = CTAS.find((c) => c.toLowerCase() === String(x.cta ?? '').trim().toLowerCase()) ?? 'Shop Now';
      return { headline, primaryText, cta };
    };
    const roman = set(j.roman); const urdu = set(j.urdu); const en = set(j.en);
    return roman && urdu && en ? { roman, urdu, en } : null;
  } catch {
    return null;
  }
}

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

/** Copy without a model, from the same facts. */
export function templateCopy(f: { name: string; price: number | null; offer: string | null; shopName: string | null }): Omit<AdCopyResult, 'source'> {
  const price = f.price && f.price > 0 ? rs(f.price) : null;
  const offer = f.offer ? f.offer.trim() : null;
  const shop = f.shopName ? f.shopName.trim() : null;
  return {
    roman: {
      headline: clip(`${f.name}${price ? ` sirf ${price}` : ''}`, 60),
      primaryText: clip(`${f.name} ab ${shop ? `${shop} par ` : ''}mojood hai${offer ? ` — ${offer}` : ''}. Poore Pakistan me delivery, COD available. Abhi order karein! 🛍️`, 400),
      cta: 'Order Now',
    },
    urdu: {
      headline: clip(`${f.name}${price ? ` صرف ${price}` : ''}`, 60),
      primaryText: clip(`${f.name} اب ${shop ? `${shop} پر ` : ''}دستیاب ہے${offer ? ` — ${offer}` : ''}۔ پورے پاکستان میں ڈیلیوری، کیش آن ڈیلیوری۔ ابھی آرڈر کریں! 🛍️`, 400),
      cta: 'Order Now',
    },
    en: {
      headline: clip(`${f.name}${price ? ` for just ${price}` : ''}`, 60),
      primaryText: clip(`${f.name} is now available${shop ? ` at ${shop}` : ''}${offer ? ` — ${offer}` : ''}. Delivery all over Pakistan, cash on delivery. Order today! 🛍️`, 400),
      cta: 'Order Now',
    },
  };
}

@Injectable()
export class AdCopyService {
  private readonly logger = new Logger(AdCopyService.name);
  private readonly burst = new Map<string, number[]>();
  private readonly daily = new Map<string, { day: string; count: number }>();

  private take(user: AuthenticatedUser) {
    const now = Date.now();
    const list = (this.burst.get(user.id) ?? []).filter((t) => now - t < BURST.windowMs);
    if (list.length >= BURST.max) throw new HttpException('Thora ruk kar dobara likhwayein', HttpStatus.TOO_MANY_REQUESTS);
    const day = new Date().toISOString().slice(0, 10);
    const d = this.daily.get(user.tenantId);
    const used = d && d.day === day ? d.count : 0;
    if (used >= DAILY_LIMIT) throw new HttpException('Aaj ki Nafaa AI ad copy ki had poori ho gayi — kal dobara', HttpStatus.TOO_MANY_REQUESTS);
    list.push(now);
    this.burst.set(user.id, list);
    this.daily.set(user.tenantId, { day, count: used + 1 });
    if (this.burst.size > 5000) this.burst.clear();
  }

  async write(
    user: AuthenticatedUser,
    b: AdCopyInput,
    product: { name: string; price: number; description: string | null; category: string | null } | null,
  ): Promise<AdCopyResult> {
    const name = clip(product?.name ?? b.name, 120);
    if (!name) throw new HttpException('Product chunein ya naam likhein', HttpStatus.BAD_REQUEST);
    this.take(user);
    const priceIn = b.price === undefined || b.price === null || b.price === '' ? null : Number(b.price);
    const price = priceIn !== null && Number.isFinite(priceIn) && priceIn > 0 ? priceIn : product?.price && product.price > 0 ? product.price : null;
    const facts = {
      name, price, offer: clip(b.offer, 160) || null, shopName: clip(b.shopName, 80) || null,
    };
    const provider = createProvider();
    if (provider) {
      const lines = [
        `Product: ${name}`,
        price ? `Price: Rs ${Math.round(price)}` : null,
        product?.category ? `Category: ${clip(product.category, 80)}` : null,
        product?.description ? `Details: ${clip(product.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), 600)}` : null,
        facts.offer ? `Offer: ${facts.offer}` : null,
        b.audience ? `Audience: ${clip(b.audience, 120)}` : null,
        b.platform ? `Platform: ${clip(b.platform, 30)}` : null,
        facts.shopName ? `Shop: ${facts.shopName}` : null,
      ].filter(Boolean).join('\n');
      try {
        const res = await provider.turn({
          model: aiModels().chat, effort: 'low', maxTokens: 1200, staticSystem: SYSTEM, dynamicSystem: 'Write one set of ad copy.',
          tools: [], messages: [{ role: 'user', content: lines }],
        }, () => undefined);
        const text = res.content.map((c) => ((c as { type?: string }).type === 'text' ? (c as { text: string }).text : '')).join('');
        const parsed = parseCopy(text);
        if (parsed) return { ...parsed, source: 'ai' };
        this.logger.warn(`Ad copy answer was not usable (${user.tenantId})`);
      } catch (e) {
        this.logger.warn(`Ad copy failed, template used (${user.tenantId}): ${(e as Error)?.message}`);
      }
    }
    return { ...templateCopy(facts), source: 'template' };
  }
}
