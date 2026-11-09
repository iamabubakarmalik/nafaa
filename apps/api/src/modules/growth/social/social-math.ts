/**
 * Social media studio: pure helpers with no database access.
 *
 * - Platforms, post kinds and statuses.
 * - The Pakistani sale and festival calendar (fixed dates, and Islamic dates
 *   from a table that is approximate by a day because of moon sighting).
 * - Link tagging for product links in posts (utm_source / utm_medium /
 *   utm_campaign / utm_content=np-<code>) and reading those tags back from an
 *   order's stored data, so orders can be counted per post.
 * - Weekly counts for the analytics tab.
 * - Ready-made captions, hashtags, reel scripts and content plans used when
 *   Nafaa AI cannot answer (no model, daily limit, or a failed call).
 */

import { utmLink } from '../marketing/attribution';

export const SOCIAL_PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'WHATSAPP_STATUS'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export const POST_KINDS = ['POST', 'REEL', 'STORY', 'STATUS'] as const;
export type PostKind = (typeof POST_KINDS)[number];
export const POST_STATUSES = ['IDEA', 'DRAFT', 'READY', 'POSTED'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const isPlatform = (v: unknown): v is SocialPlatform => typeof v === 'string' && (SOCIAL_PLATFORMS as readonly string[]).includes(v);
export const isPostKind = (v: unknown): v is PostKind => typeof v === 'string' && (POST_KINDS as readonly string[]).includes(v);
export const isPostStatus = (v: unknown): v is PostStatus => typeof v === 'string' && (POST_STATUSES as readonly string[]).includes(v);

/** utm_source value per platform (lower case, as ad platforms and Shopify report it). */
export const UTM_SOURCE: Record<SocialPlatform, string> = {
  FACEBOOK: 'facebook', INSTAGRAM: 'instagram', TIKTOK: 'tiktok', YOUTUBE: 'youtube', WHATSAPP_STATUS: 'whatsapp',
};

/* ───────────────────────── codes ───────────────────────── */

const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

/** A short random tag for a post (no look-alike characters). */
export function newPostCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return s;
}

/* ───────────────────────── links ───────────────────────── */

/** Lower-case slug for utm_campaign. */
export function slugify(text: string, max = 40): string {
  return text.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, max).replace(/-$/, '');
}

/**
 * A product link tagged for one post and platform, made with the marketing
 * hub's link builder (utmLink) so both pages make the same links. Source,
 * medium, campaign and term already on the link are kept; utm_content is
 * always the post tag. Returns the input unchanged when it is not an
 * http(s) link.
 */
export function tagLink(url: string, opts: { platform: SocialPlatform; code: string; campaign?: string | null }): string {
  let u: URL;
  try { u = new URL(url); } catch { return url; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return url;
  const has = (k: string) => u.searchParams.get(k) || undefined;
  return utmLink(url, {
    source: has('utm_source') ?? UTM_SOURCE[opts.platform],
    medium: has('utm_medium') ?? 'social',
    campaign: has('utm_campaign') ?? (slugify(opts.campaign || '') || 'nafaa-social'),
    content: `np-${opts.code}`,
    term: has('utm_term'),
  });
}

/* ───────────────────────── attribution ───────────────────────── */

export interface SocialSignal {
  /** Platform the order came from, when its data says so. */
  platform: SocialPlatform | null;
  /** Post tag found in the order's link data (utm_content=np-<code>). */
  code: string | null;
}

const SOURCE_WORDS: Array<[RegExp, SocialPlatform]> = [
  [/^(facebook|fb|m\.facebook|l\.facebook|meta)/, 'FACEBOOK'],
  [/^(instagram|ig|l\.instagram)/, 'INSTAGRAM'],
  [/^(tiktok|tt)/, 'TIKTOK'],
  [/^(youtube|yt)/, 'YOUTUBE'],
  [/^(whatsapp|wa)/, 'WHATSAPP_STATUS'],
];

/** Platform for a source word such as "facebook", "IG" or "l.instagram.com". */
export function platformFromSource(value: unknown): SocialPlatform | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  for (const [re, p] of SOURCE_WORDS) if (re.test(v)) return p;
  return null;
}

/**
 * Social source and post tag of one order. Reads the order's stored data as
 * text, so it works whatever field the link data lands in (landing page,
 * referrer, utm fields, website API fields), plus the manual order source
 * (INSTAGRAM, FACEBOOK, TIKTOK; WhatsApp chat orders are not counted).
 */
export function socialSignal(order: { metadata?: unknown; source?: string | null; utmSource?: string | null; utmContent?: string | null; referrer?: string | null; landingPage?: string | null }): SocialSignal {
  const meta = (order.metadata && typeof order.metadata === 'object' ? order.metadata : {}) as Record<string, unknown>;
  const text = [safeJson(order.metadata), order.utmContent ?? '', order.landingPage ?? ''].join(' ');
  const decoded = safeDecode(text);
  const code = /np-([a-z2-9]{6})\b/.exec(decoded)?.[1] ?? null;
  let platform: SocialPlatform | null = platformFromSource(order.utmSource);
  if (!platform) {
    const m = /utm_source["'=:\s\\]+([a-z.]+)/i.exec(decoded);
    if (m) platform = platformFromSource(m[1]);
  }
  if (!platform) {
    for (const k of ['utmSource', 'utm_source']) {
      const nested = [meta[k], (meta.utm as Record<string, unknown> | undefined)?.source, (meta.attribution as Record<string, unknown> | undefined)?.[k]];
      for (const v of nested) platform = platform ?? platformFromSource(v);
    }
  }
  // A manual order source or a referrer of WhatsApp is a chat order, not a status post: only a tagged link counts for status.
  const noChat = (p: SocialPlatform | null) => (p === 'WHATSAPP_STATUS' ? null : p);
  if (!platform) platform = noChat(platformFromSource(order.source ?? meta.source));
  if (!platform && order.referrer) platform = noChat(platformFromSource(hostOnly(order.referrer)));
  if (!platform) {
    const ref = /referr\w*["'=:\s\\]+(?:https?:\/\/)?(?:www\.)?([a-z.]+)/i.exec(decoded);
    if (ref) platform = noChat(platformFromSource(ref[1]));
  }
  return { platform, code };
}

function hostOnly(v: string): string {
  try { return new URL(v).hostname; } catch { return v; }
}
function safeJson(v: unknown): string {
  try { return v == null ? '' : JSON.stringify(v); } catch { return ''; }
}
function safeDecode(s: string): string {
  try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch { return s; }
}

/* ───────────────────────── weeks ───────────────────────── */

/** Monday (YYYY-MM-DD) of the week a business day falls in. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Posts per platform per week: [{ week, counts: { FACEBOOK: 2, … }, total }], oldest first. */
export function weeklyCounts(posts: Array<{ day: string; platforms: string[] }>): Array<{ week: string; counts: Partial<Record<SocialPlatform, number>>; total: number }> {
  const map = new Map<string, Partial<Record<SocialPlatform, number>>>();
  for (const p of posts) {
    const w = weekStart(p.day);
    const row = map.get(w) ?? {};
    for (const pl of p.platforms) if (isPlatform(pl)) row[pl] = (row[pl] ?? 0) + 1;
    map.set(w, row);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([week, counts]) => ({ week, counts, total: Object.values(counts).reduce((s, n) => s + (n ?? 0), 0) }));
}

/* ───────────────────────── festival calendar ───────────────────────── */

export interface Festival {
  key: string;
  /** YYYY-MM-DD */
  date: string;
  name: string;
  /** Days before the date to start posting about it. */
  leadDays: number;
  /** Islamic dates move by a day with the moon. */
  approx: boolean;
  /** Short idea for posts. */
  idea: string;
  hashtags: string[];
  /** False for days that call for a greeting, not a sale post. */
  sale: boolean;
}

/** Islamic dates in Pakistan (expected; final date follows the moon sighting). */
const ISLAMIC: Record<number, Array<[string, string]>> = {
  2026: [['ramadan', '2026-02-19'], ['chand-raat-fitr', '2026-03-20'], ['eid-ul-fitr', '2026-03-21'], ['eid-ul-adha', '2026-05-27'], ['muharram', '2026-06-16'], ['rabi-ul-awal', '2026-08-26']],
  2027: [['ramadan', '2027-02-08'], ['chand-raat-fitr', '2027-03-09'], ['eid-ul-fitr', '2027-03-10'], ['eid-ul-adha', '2027-05-17'], ['muharram', '2027-06-06'], ['rabi-ul-awal', '2027-08-15']],
  2028: [['ramadan', '2028-01-28'], ['chand-raat-fitr', '2028-02-26'], ['eid-ul-fitr', '2028-02-27'], ['eid-ul-adha', '2028-05-05'], ['muharram', '2028-05-25'], ['rabi-ul-awal', '2028-08-04']],
};

/** Days for a simple greeting or remembrance post, never a sale. */
const GREETING_ONLY = new Set(['muharram', 'rabi-ul-awal', 'kashmir-day', 'labour-day', 'iqbal-day', 'quaid-day']);

const FEST_INFO: Record<string, { name: string; lead: number; idea: string; tags: string[] }> = {
  'ramadan': { name: 'Ramadan', lead: 10, idea: 'Ramadan offer, sehri/iftar ke waqt posts', tags: ['#Ramadan', '#RamadanKareem', '#RamadanSale'] },
  'chand-raat-fitr': { name: 'Chand Raat', lead: 3, idea: 'Last-minute Eid shopping, same-day delivery jahan mumkin', tags: ['#ChandRaat', '#EidShopping'] },
  'eid-ul-fitr': { name: 'Eid ul Fitr', lead: 15, idea: 'Eid collection, gift ideas, "Eid se pehle delivery" ki aakhri tareekh', tags: ['#EidMubarak', '#EidCollection', '#EidSale'] },
  'eid-ul-adha': { name: 'Eid ul Adha', lead: 12, idea: 'Eid ul Adha collection aur kitchen/ghar ki cheezein', tags: ['#EidUlAdha', '#EidMubarak', '#EidSale'] },
  'muharram': { name: 'Muharram', lead: 0, idea: 'Sale posts rok dein; sirf sada aur izzat wali post', tags: [] },
  'rabi-ul-awal': { name: '12 Rabi ul Awal', lead: 2, idea: 'Mubarakbaad ki sada post', tags: ['#EidMiladUnNabi'] },
  'kashmir-day': { name: 'Kashmir Day', lead: 1, idea: 'Yakjehti ki sada post', tags: ['#KashmirDay'] },
  'pakistan-day': { name: 'Pakistan Day', lead: 3, idea: 'Green collection, 23 March offer', tags: ['#PakistanDay', '#23March'] },
  'labour-day': { name: 'Labour Day', lead: 1, idea: 'Team ki tasveer, shukriya post', tags: ['#LabourDay'] },
  'mothers-day': { name: "Mother's Day", lead: 7, idea: 'Ammi ke liye gift ideas', tags: ['#MothersDay', '#GiftForMom'] },
  'fathers-day': { name: "Father's Day", lead: 7, idea: 'Abbu ke liye gift ideas', tags: ['#FathersDay', '#GiftForDad'] },
  'independence-day': { name: 'Independence Day', lead: 10, idea: '14 August sale, green-white collection', tags: ['#14August', '#IndependenceDay', '#PakistanZindabad'] },
  'back-to-school': { name: 'Back to school', lead: 7, idea: 'School wapsi ki cheezein aur bundles', tags: ['#BackToSchool'] },
  'iqbal-day': { name: 'Iqbal Day', lead: 1, idea: 'Allama Iqbal ka sher, sada post', tags: ['#IqbalDay'] },
  '11-11': { name: '11.11 Sale', lead: 7, idea: '11.11 Discount, countdown posts, free delivery', tags: ['#1111Sale', '#11_11', '#SinglesDay'] },
  'white-friday': { name: 'White Friday', lead: 10, idea: 'White Friday deals, "sirf aaj" posts, countdown', tags: ['#WhiteFriday', '#BlackFriday', '#WhiteFridaySale'] },
  '12-12': { name: '12.12 Sale', lead: 7, idea: '12.12 Discount, year-end bundles', tags: ['#1212Sale', '#12_12'] },
  'winter-sale': { name: 'Winter sale', lead: 7, idea: 'Sardi ki collection, year-end clearance', tags: ['#WinterSale', '#WinterCollection'] },
  'quaid-day': { name: 'Quaid Day', lead: 2, idea: '25 December, Quaid-e-Azam ki yaad me sada post', tags: ['#QuaidDay', '#25December'] },
  'new-year': { name: 'New Year', lead: 5, idea: 'Naya saal, nayi collection, shukriya customers', tags: ['#NewYear', '#NewYearSale'] },
  'summer-lawn': { name: 'Summer / lawn season', lead: 10, idea: 'Garmi ki nayi collection launch', tags: ['#SummerCollection', '#LawnCollection'] },
};

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Day of month of the n-th given weekday (0 = Sunday) in a month. */
function nthWeekday(y: number, m: number, weekday: number, n: number): number {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
}
/** Day of month of the last Friday. */
function lastFriday(y: number, m: number): number {
  const last = new Date(Date.UTC(y, m, 0));
  return last.getUTCDate() - ((last.getUTCDay() - 5 + 7) % 7);
}

function yearFestivals(y: number): Festival[] {
  const fixed: Array<[string, string]> = [
    ['new-year', iso(y, 1, 1)], ['kashmir-day', iso(y, 2, 5)], ['summer-lawn', iso(y, 3, 15)], ['pakistan-day', iso(y, 3, 23)],
    ['labour-day', iso(y, 5, 1)], ['mothers-day', iso(y, 5, nthWeekday(y, 5, 0, 2))], ['fathers-day', iso(y, 6, nthWeekday(y, 6, 0, 3))],
    ['back-to-school', iso(y, 8, 1)], ['independence-day', iso(y, 8, 14)], ['iqbal-day', iso(y, 11, 9)], ['11-11', iso(y, 11, 11)],
    ['white-friday', iso(y, 11, lastFriday(y, 11))], ['winter-sale', iso(y, 12, 1)], ['12-12', iso(y, 12, 12)], ['quaid-day', iso(y, 12, 25)],
  ];
  const all = [...fixed.map(([k, d]) => [k, d, false] as const), ...(ISLAMIC[y] ?? []).map(([k, d]) => [k, d, true] as const)];
  return all.map(([key, date, approx]) => {
    const f = FEST_INFO[key];
    return { key, date, name: f.name, leadDays: f.lead, approx, idea: f.idea, hashtags: f.tags, sale: !GREETING_ONLY.has(key) };
  });
}

/** Festivals and sale days between two dates (inclusive), by date. */
export function festivalsBetween(from: string, to: string): Festival[] {
  const y1 = Number(from.slice(0, 4)), y2 = Number(to.slice(0, 4));
  const out: Festival[] = [];
  for (let y = y1; y <= y2; y++) out.push(...yearFestivals(y));
  return out.filter((f) => f.date >= from && f.date <= to).sort((a, b) => a.date.localeCompare(b.date));
}

/** Festivals whose posting window (date − leadDays … date) touches the range. */
export function festivalsInWindow(from: string, to: string): Festival[] {
  const later = addDays(to, 31);
  return festivalsBetween(addDays(from, -1), later).filter((f) => addDays(f.date, -f.leadDays) <= to && f.date >= from);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/* ───────────────────────── ready-made content ───────────────────────── */

export type Lang = 'roman' | 'ur' | 'en';

export interface ProductBrief {
  id?: string;
  name: string;
  price?: number | null;
  /** Price before Discount, when on sale. */
  comparePrice?: number | null;
  category?: string | null;
}

export interface ContentInput {
  shop: string;
  products: ProductBrief[];
  platform?: SocialPlatform | null;
  lang?: Lang;
  offer?: string | null;
  festival?: Pick<Festival, 'name' | 'hashtags'> & { sale?: boolean } | null;
  /** Cash on delivery and nationwide delivery lines. */
  cod?: boolean;
}

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-US')}`;

function priceLine(p: ProductBrief | undefined, lang: Lang): string {
  if (!p?.price) return '';
  const off = p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
  if (lang === 'en') return off ? `Now ${rs(p.price)} (was ${rs(p.comparePrice!)}, ${off}% off)` : `Price: ${rs(p.price)}`;
  if (lang === 'ur') return off ? `اب صرف ${rs(p.price)} (پہلے ${rs(p.comparePrice!)}، ${off}% Discount)` : `قیمت: ${rs(p.price)}`;
  return off ? `Ab sirf ${rs(p.price)} (pehle ${rs(p.comparePrice!)}, ${off}% Discount)` : `Price sirf ${rs(p.price)}`;
}

/** Ready-made caption (three variants) for the first product, an offer or a festival. */
export function quickCaptions(input: ContentInput): string[] {
  const lang = input.lang ?? 'roman';
  if (input.festival && input.festival.sale === false) {
    const f = input.festival.name;
    if (lang === 'en') return [`${f} — warm wishes from ${input.shop}.`, `Remembering ${f} with respect. — ${input.shop}`, `${f}: thank you for being part of our family. — ${input.shop}`];
    if (lang === 'ur') return [`${f} — ${input.shop} کی طرف سے نیک تمنائیں۔`, `${f} کو عزت سے یاد کرتے ہیں۔ — ${input.shop}`, `${f}: ہمارے ساتھ رہنے کا شکریہ۔ — ${input.shop}`];
    return [`${f} — ${input.shop} ki taraf se dili mubarakbaad.`, `${f} ko izzat se yaad karte hain. — ${input.shop}`, `${f}: hamare saath rehne ka shukriya. — ${input.shop}`];
  }
  const p = input.products[0];
  const name = p?.name ?? input.shop;
  const price = priceLine(p, lang);
  const fest = input.festival?.name;
  const offer = input.offer?.trim();
  const cod = input.cod !== false;
  if (lang === 'en') {
    return [
      [fest ? `${fest} special at ${input.shop}!` : `New at ${input.shop}: ${name}`, price, offer, cod ? 'Cash on delivery all over Pakistan.' : '', 'Order now: DM us or tap the link.'].filter(Boolean).join('\n'),
      [`Looking for ${name}?`, 'Quality you can trust, delivered to your door.', price, offer, 'Limited stock, order today!'].filter(Boolean).join('\n'),
      [`${name} — loved by our customers.`, offer || (fest ? `Celebrate ${fest} with us.` : ''), price, cod ? 'COD available | Delivery all over Pakistan' : ''].filter(Boolean).join('\n'),
    ];
  }
  if (lang === 'ur') {
    return [
      [fest ? `${input.shop} کی طرف سے ${fest} اسپیشل!` : `${input.shop} پر نیا: ${name}`, price, offer, cod ? 'پورے پاکستان میں کیش آن ڈیلیوری۔' : '', 'ابھی آرڈر کریں — ہمیں میسج کریں یا لنک دبائیں۔'].filter(Boolean).join('\n'),
      [`${name} چاہیے؟`, 'اچھی کوالٹی، گھر تک ڈیلیوری۔', price, offer, 'اسٹاک محدود ہے، آج ہی آرڈر کریں!'].filter(Boolean).join('\n'),
      [`${name} — ہمارے کسٹمرز کی پسند۔`, offer, price, cod ? 'COD دستیاب | پورے پاکستان میں ڈیلیوری' : ''].filter(Boolean).join('\n'),
    ];
  }
  return [
    [fest ? `${fest} special — ${input.shop} ki taraf se!` : `${input.shop} par naya: ${name}`, price, offer, cod ? 'Poore Pakistan me Cash on Delivery.' : '', 'Abhi order karein — DM karein ya link dabayein.'].filter(Boolean).join('\n'),
    [`${name} chahiye?`, 'Achhi quality, ghar tak delivery.', price, offer, 'Stock kam hai, aaj hi order karein!'].filter(Boolean).join('\n'),
    [`${name} — hamare customers ki pasand.`, offer || (fest ? `${fest} hamare saath manayein.` : ''), price, cod ? 'COD available | Delivery poore Pakistan me' : ''].filter(Boolean).join('\n'),
  ];
}

const BASE_TAGS = ['#OnlineShoppingPakistan', '#ShopOnline', '#CashOnDelivery', '#Pakistan', '#Karachi', '#Lahore', '#Islamabad'];
const PLATFORM_TAGS: Partial<Record<SocialPlatform, string[]>> = {
  INSTAGRAM: ['#InstaShop', '#InstaPakistan'],
  TIKTOK: ['#TikTokPakistan', '#fyp', '#TikTokMadeMeBuyIt'],
  FACEBOOK: ['#ShopLocal'],
  YOUTUBE: ['#Shorts'],
};

/** Hashtags from product names, category, shop, festival and platform (max 20, no repeats). */
export function quickHashtags(input: ContentInput): string[] {
  const words = (s?: string | null) => (s ?? '').split(/[^A-Za-z0-9]+/).filter((w) => w.length > 2 && !/^\d/.test(w));
  const tag = (w: string) => `#${w.charAt(0).toUpperCase()}${w.slice(1)}`;
  const out: string[] = [];
  const add = (t: string) => { if (t.length > 1 && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t); };
  add(`#${input.shop.replace(/[^A-Za-z0-9]/g, '')}`);
  for (const p of input.products.slice(0, 3)) {
    add(`#${p.name.replace(/[^A-Za-z0-9]/g, '')}`);
    words(p.name).slice(0, 2).forEach((w) => add(tag(w)));
    words(p.category).forEach((w) => add(tag(w)));
  }
  input.festival?.hashtags.forEach(add);
  if (input.offer) add('#Sale');
  (input.platform ? PLATFORM_TAGS[input.platform] ?? [] : []).forEach(add);
  BASE_TAGS.forEach(add);
  return out.filter((t) => t.length > 2 && t.length <= 40).slice(0, 20);
}

export interface ReelScript {
  hook: string;
  scenes: Array<{ shot: string; text: string; seconds: number }>;
  cta: string;
  music: string;
}

/** Ready-made 15–25 second reel/TikTok script. */
export function quickReelScript(input: ContentInput): ReelScript {
  const p = input.products[0];
  const name = p?.name ?? input.shop;
  const en = input.lang === 'en';
  const ur = input.lang === 'ur';
  const fest = input.festival?.name;
  const pick = (r: string, e: string, u: string) => (en ? e : ur ? u : r);
  return {
    hook: fest
      ? pick(`${fest} ke liye abhi tak kuch nahi liya? Ye dekhein!`, `Still nothing for ${fest}? Watch this!`, `${fest} کے لیے ابھی تک کچھ نہیں لیا؟ یہ دیکھیں!`)
      : pick(`Ruk jayein! ${name} ka ye kamaal dekha?`, `Wait! Have you seen this ${name}?`, `رکیں! ${name} کا یہ کمال دیکھا؟`),
    scenes: [
      { shot: pick('Close-up: product haath me, achhi roshni', 'Close-up: product in hand, good light', 'کلوز اپ: پروڈکٹ ہاتھ میں، اچھی روشنی'), text: name, seconds: 3 },
      { shot: pick('Detail: kapra / finish / size dikhayein', 'Detail: show fabric / finish / size', 'تفصیل: کپڑا / فنش / سائز دکھائیں'), text: pick('Quality khud dekhein', 'See the quality', 'کوالٹی خود دیکھیں'), seconds: 5 },
      { shot: pick('Use me: pehen kar ya istemal karte hue', 'In use: wearing or using it', 'استعمال میں: پہن کر یا استعمال کرتے ہوئے'), text: priceLine(p, input.lang ?? 'roman') || pick('Behtareen qeemat', 'Best price', 'بہترین قیمت'), seconds: 5 },
      { shot: pick('Packing: parcel tayyar, shop ka logo', 'Packing: parcel ready, shop logo', 'پیکنگ: پارسل تیار، شاپ کا لوگو'), text: input.cod !== false ? pick('COD · Poore Pakistan me delivery', 'COD · Delivery all over Pakistan', 'COD · پورے پاکستان میں ڈیلیوری') : input.shop, seconds: 4 },
    ],
    cta: input.offer?.trim() || pick('Abhi order karein — link bio me / DM karein', 'Order now — link in bio / DM us', 'ابھی آرڈر کریں — لنک بائیو میں / میسج کریں'),
    music: pick('Koi trending audio, halki awaaz me', 'Any trending audio, low volume', 'کوئی ٹرینڈنگ آڈیو، ہلکی آواز میں'),
  };
}

export interface PlanIdea {
  date: string;
  time: string;
  platforms: SocialPlatform[];
  kind: PostKind;
  title: string;
  caption: string;
  hashtags: string[];
  productIds: string[];
  festivalKey: string | null;
}

/**
 * Ready-made content plan: one idea a day for `days` days from `from`.
 * Festival windows come first; other days rotate products through a weekly
 * rhythm (new arrival, reel, customer trust, offer, behind the scenes,
 * best seller, WhatsApp status).
 */
export function quickPlan(input: ContentInput & { from: string; days: number }): PlanIdea[] {
  const lang = input.lang ?? 'roman';
  const to = addDays(input.from, input.days - 1);
  const fests = festivalsInWindow(input.from, to).filter((f) => f.key !== 'muharram');
  const rhythm: Array<{ kind: PostKind; platforms: SocialPlatform[]; title: (n: string) => string; time: string }> = [
    { kind: 'POST', platforms: ['FACEBOOK', 'INSTAGRAM'], title: (n) => `New arrival: ${n}`, time: '20:00' },
    { kind: 'REEL', platforms: ['INSTAGRAM', 'TIKTOK'], title: (n) => `Reel: ${n} close-up`, time: '21:00' },
    { kind: 'POST', platforms: ['FACEBOOK', 'INSTAGRAM'], title: () => 'Customer review / delivery photo', time: '19:00' },
    { kind: 'POST', platforms: ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP_STATUS'], title: (n) => `Offer: ${n}`, time: '20:30' },
    { kind: 'STORY', platforms: ['INSTAGRAM', 'WHATSAPP_STATUS'], title: () => 'Behind the scenes: packing', time: '18:00' },
    { kind: 'REEL', platforms: ['TIKTOK', 'INSTAGRAM', 'YOUTUBE'], title: (n) => `Best seller: ${n}`, time: '21:30' },
    { kind: 'STATUS', platforms: ['WHATSAPP_STATUS'], title: (n) => `Status: ${n} price`, time: '13:00' },
  ];
  const products = input.products.length ? input.products : [{ name: input.shop }];
  const out: PlanIdea[] = [];
  for (let i = 0; i < input.days; i++) {
    const date = addDays(input.from, i);
    const fest = fests.find((f) => f.date === date) ?? fests.find((f) => f.sale && date >= addDays(f.date, -f.leadDays) && date < f.date && (i % 2 === 0));
    const p = products[i % products.length];
    const r = rhythm[i % rhythm.length];
    const ctx: ContentInput = { ...input, products: [p], festival: fest ?? null, lang };
    const title = fest ? (fest.date === date ? `${fest.name}` : `${fest.name}: ${p.name}`) : r.title(p.name);
    if (fest && !fest.sale) {
      // A greeting or remembrance post: no product, no selling tags.
      out.push({
        date, time: '10:00', platforms: ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP_STATUS'], kind: 'POST', title,
        caption: quickCaptions(ctx)[i % 3], hashtags: [`#${input.shop.replace(/[^A-Za-z0-9]/g, '')}`, ...fest.hashtags].filter((h) => h.length > 1),
        productIds: [], festivalKey: fest.key,
      });
      continue;
    }
    out.push({
      date,
      time: r.time,
      platforms: r.platforms,
      kind: r.kind,
      title,
      caption: quickCaptions(ctx)[i % 3],
      hashtags: quickHashtags({ ...ctx, platform: r.platforms[0] }).slice(0, 12),
      productIds: p.id ? [p.id] : [],
      festivalKey: fest?.key ?? null,
    });
  }
  return out;
}

/* ───────────────────────── model output ───────────────────────── */

/** The first JSON object in a model answer, or null. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1));
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
  } catch { return null; }
}

/** Hashtags cleaned: leading #, no spaces, no repeats, max 30. */
export function cleanHashtags(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const t = `#${raw.replace(/^#+/, '').replace(/\s+/g, '')}`;
    if (t.length > 1 && t.length <= 60 && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out.slice(0, 30);
}
