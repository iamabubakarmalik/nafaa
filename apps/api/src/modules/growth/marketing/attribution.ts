/**
 * Order attribution: where an online buyer came from.
 *
 * Read from what each channel sends with the order:
 *   Shopify      landing_site, referring_site, source_name, discount_codes,
 *                note_attributes (utm_* keys some themes and apps add)
 *   WooCommerce  meta_data _wc_order_attribution_* (WooCommerce 8.5+), coupon_lines
 *   Website API  utm {source, medium, campaign, content, term} or utm_* fields,
 *                source, landingPage, referrer, discountCode(s) / coupon(s)
 *   Manual       the source the shop picked (WhatsApp, Instagram, …)
 *
 * The result is stored on the order (ChannelOrder utm* columns,
 * trafficSource, discountCodes) and in metadata.attribution, which also keeps
 * the ad click ids (fbclid, gclid, ttclid) for the Conversions API.
 * Pure functions; no database access.
 */

export const TRAFFIC_SOURCES = ['META', 'GOOGLE', 'TIKTOK', 'SNAPCHAT', 'WHATSAPP', 'EMAIL', 'PHONE', 'REFERRAL', 'ORGANIC', 'DIRECT', 'OTHER'] as const;
export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

export interface OrderAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landingPage?: string;
  /** Channel's own source label (Shopify source_name, Woo source_type). */
  sourceName?: string;
  discountCodes?: string[];
  clickIds?: { fbclid?: string; gclid?: string; ttclid?: string; sccid?: string };
}

/** Columns written on ChannelOrder. */
export interface AttributionColumns {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrer: string | null;
  landingPage: string | null;
  trafficSource: TrafficSource | null;
  discountCodes: string[];
}

const clip = (v: unknown, max = 300): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s ? s.slice(0, max) : undefined;
};

const lowerClip = (v: unknown, max = 120) => clip(v, max)?.toLowerCase();

/** Query parameters of a full or relative URL ("/products/x?utm_source=fb"). */
export function urlParams(raw: unknown): Record<string, string> {
  const s = clip(raw, 2000);
  if (!s) return {};
  const q = s.indexOf('?');
  if (q < 0) return {};
  const out: Record<string, string> = {};
  const query = s.slice(q + 1).split('#')[0];
  for (const part of query.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const k = (eq < 0 ? part : part.slice(0, eq)).trim();
    let v = eq < 0 ? '' : part.slice(eq + 1);
    try { v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch { /* keep raw */ }
    if (k && !(k.toLowerCase() in out)) out[k.toLowerCase()] = v.trim();
  }
  return out;
}

/** Host of a URL without "www." ("https://l.facebook.com/x" → "l.facebook.com"). */
export function hostOf(raw: unknown): string | null {
  const s = clip(raw, 2000);
  if (!s) return null;
  const m = /^(?:[a-z][a-z0-9+.-]*:)?\/\/([^/?#:]+)/i.exec(s) ?? /^(?:android-app:\/\/)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i.exec(s);
  return m ? m[1].toLowerCase().replace(/^www\./, '') : null;
}

const fromParams = (p: Record<string, string>): OrderAttribution => {
  const clickIds = {
    ...(p.fbclid && { fbclid: p.fbclid.slice(0, 300) }),
    ...((p.gclid || p.gbraid || p.wbraid) && { gclid: (p.gclid || p.gbraid || p.wbraid).slice(0, 300) }),
    ...(p.ttclid && { ttclid: p.ttclid.slice(0, 300) }),
    ...(p.sccid && { sccid: p.sccid.slice(0, 300) }),
  };
  return {
    utmSource: lowerClip(p.utm_source),
    utmMedium: lowerClip(p.utm_medium),
    utmCampaign: clip(p.utm_campaign, 200),
    utmContent: clip(p.utm_content, 200),
    utmTerm: clip(p.utm_term, 200),
    ...(Object.keys(clickIds).length && { clickIds }),
  };
};

/** Fills empty fields of `a` from `b`. */
const merge = (a: OrderAttribution, b: OrderAttribution): OrderAttribution => {
  const out: OrderAttribution = { ...a };
  for (const k of Object.keys(b) as Array<keyof OrderAttribution>) {
    if (out[k] === undefined || (Array.isArray(out[k]) && !(out[k] as unknown[]).length)) (out as any)[k] = b[k];
  }
  if (a.clickIds || b.clickIds) out.clickIds = { ...(b.clickIds ?? {}), ...(a.clickIds ?? {}) };
  return out;
};

const codes = (list: unknown[]): string[] =>
  [...new Set(list.map((c) => clip(c, 60)?.toUpperCase()).filter((c): c is string => !!c))].slice(0, 10);

function fromShopify(body: any): OrderAttribution {
  const landing = clip(body.landing_site ?? body.landing_site_ref, 1000);
  const notes: Record<string, string> = {};
  for (const n of Array.isArray(body.note_attributes) ? body.note_attributes : []) {
    const k = String(n?.name ?? '').trim().toLowerCase();
    if (k) notes[k] = String(n?.value ?? '');
  }
  const base: OrderAttribution = {
    referrer: clip(body.referring_site, 1000),
    landingPage: landing,
    sourceName: lowerClip(body.source_name, 60),
    discountCodes: codes((Array.isArray(body.discount_codes) ? body.discount_codes : []).map((d: any) => d?.code)),
  };
  return merge(merge(base, fromParams(urlParams(landing))), fromParams(notes));
}

function fromWoo(body: any): OrderAttribution {
  const meta: Record<string, string> = {};
  for (const m of Array.isArray(body.meta_data) ? body.meta_data : []) {
    const k = String(m?.key ?? '');
    if (k.startsWith('_wc_order_attribution_') && (typeof m.value === 'string' || typeof m.value === 'number')) {
      meta[k.slice('_wc_order_attribution_'.length)] = String(m.value);
    }
  }
  const landing = clip(meta.session_entry, 1000);
  const fromLanding = fromParams(urlParams(landing));
  // WooCommerce stores "(none)" / "(direct)" for empty values.
  const v = (s: string | undefined) => (s && !/^\(.*\)$/.test(s.trim()) ? s : undefined);
  const base: OrderAttribution = {
    utmSource: lowerClip(v(meta.utm_source)),
    utmMedium: lowerClip(v(meta.utm_medium)),
    utmCampaign: clip(v(meta.utm_campaign), 200),
    utmContent: clip(v(meta.utm_content), 200),
    utmTerm: clip(v(meta.utm_term), 200),
    referrer: clip(v(meta.referrer), 1000),
    landingPage: landing,
    sourceName: lowerClip(v(meta.source_type), 60),
    discountCodes: codes((Array.isArray(body.coupon_lines) ? body.coupon_lines : []).map((c: any) => c?.code)),
  };
  return merge(base, fromLanding);
}

function fromCustom(body: any): OrderAttribution {
  const u = body.utm && typeof body.utm === 'object' ? body.utm : {};
  const landing = clip(body.landingPage ?? body.landing_page ?? body.landingSite, 1000);
  const list: unknown[] = [];
  for (const k of ['discountCodes', 'discount_codes', 'coupons', 'couponCodes']) if (Array.isArray(body[k])) list.push(...body[k].map((c: any) => (typeof c === 'object' ? c?.code : c)));
  for (const k of ['discountCode', 'discount_code', 'couponCode', 'coupon_code', 'coupon']) if (typeof body[k] === 'string') list.push(body[k]);
  const base: OrderAttribution = {
    utmSource: lowerClip(u.source ?? body.utm_source ?? body.utmSource),
    utmMedium: lowerClip(u.medium ?? body.utm_medium ?? body.utmMedium),
    utmCampaign: clip(u.campaign ?? body.utm_campaign ?? body.utmCampaign, 200),
    utmContent: clip(u.content ?? body.utm_content ?? body.utmContent, 200),
    utmTerm: clip(u.term ?? body.utm_term ?? body.utmTerm, 200),
    referrer: clip(body.referrer ?? body.referringSite ?? body.referring_site, 1000),
    landingPage: landing,
    sourceName: lowerClip(body.source ?? body.orderSource, 60),
    discountCodes: codes(list),
  };
  const click = fromParams({
    ...(body.fbclid && { fbclid: String(body.fbclid) }),
    ...(body.gclid && { gclid: String(body.gclid) }),
    ...(body.ttclid && { ttclid: String(body.ttclid) }),
  });
  return merge(merge(base, fromParams(urlParams(landing))), click);
}

/** Attribution from a raw channel payload; undefined when nothing was found. */
export function attributionOf(body: any, platform: string): OrderAttribution | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const a = platform === 'shopify' ? fromShopify(body) : platform === 'woocommerce' ? fromWoo(body) : platform === 'custom' ? fromCustom(body) : {};
  return compact(a);
}

const compact = (a: OrderAttribution): OrderAttribution | undefined => {
  const out: OrderAttribution = {};
  for (const [k, v] of Object.entries(a)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && !v.length) continue;
    if (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) continue;
    (out as any)[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
};

const SOURCE_WORDS: Array<[RegExp, TrafficSource]> = [
  [/^(fb|ig|facebook|instagram|meta|messenger|insta|an)$|facebook|instagram/, 'META'],
  [/^(google|youtube|yt|gads|adwords|gmc|shopping)$|google|youtube/, 'GOOGLE'],
  [/tiktok|^tt$/, 'TIKTOK'],
  [/snapchat|^snap$/, 'SNAPCHAT'],
  [/whatsapp|^wa$/, 'WHATSAPP'],
  [/e-?mail|newsletter|klaviyo|mailchimp|omnisend/, 'EMAIL'],
  [/^(phone|call|sms)$/, 'PHONE'],
];

const REFERRER_HOSTS: Array<[RegExp, TrafficSource]> = [
  [/(^|\.)(facebook|fb|instagram|messenger)\.com$|(^|\.)fb\.me$|^lm?\.facebook\.com$/, 'META'],
  [/(^|\.)google\.[a-z.]+$|(^|\.)youtube\.com$|googleadservices|googlesyndication/, 'GOOGLE'],
  [/(^|\.)tiktok\.com$/, 'TIKTOK'],
  [/(^|\.)snapchat\.com$/, 'SNAPCHAT'],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, 'WHATSAPP'],
  [/(^|\.)(bing\.com|yahoo\.com|duckduckgo\.com)$/, 'ORGANIC'],
];

/** The platform an order came from. Ad click ids win, then utm_source, the channel's source label, the referrer. */
export function trafficSourceOf(a: OrderAttribution | undefined, ownHosts: string[] = []): TrafficSource | null {
  if (!a) return null;
  if (a.clickIds?.fbclid) return 'META';
  if (a.clickIds?.gclid) return 'GOOGLE';
  if (a.clickIds?.ttclid) return 'TIKTOK';
  if (a.clickIds?.sccid) return 'SNAPCHAT';
  const src = (a.utmSource ?? '').toLowerCase();
  if (src) {
    for (const [re, s] of SOURCE_WORDS) if (re.test(src)) return s;
    return 'OTHER';
  }
  const name = (a.sourceName ?? '').toLowerCase();
  for (const [re, s] of SOURCE_WORDS) if (name && re.test(name)) return s;
  const host = hostOf(a.referrer);
  if (host && !ownHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
    for (const [re, s] of REFERRER_HOSTS) if (re.test(host)) return s;
    return 'REFERRAL';
  }
  if (a.utmCampaign || a.discountCodes?.length) return 'OTHER';
  if (a.landingPage || a.referrer || name === 'web' || name === 'typein' || name === 'direct') return 'DIRECT';
  return null;
}

/** Manual order source (Add order) → attribution. */
export function manualAttribution(source: unknown): OrderAttribution | undefined {
  const s = String(source ?? '').trim().toUpperCase();
  if (!s || s === 'MANUAL') return undefined;
  return { utmSource: s.toLowerCase(), sourceName: s.toLowerCase() };
}

const MANUAL_SOURCE: Record<string, TrafficSource> = { FACEBOOK: 'META', INSTAGRAM: 'META', TIKTOK: 'TIKTOK', WHATSAPP: 'WHATSAPP', PHONE: 'PHONE' };

/**
 * Columns for a new order from its metadata: metadata.attribution from the
 * channel payload, or metadata.source for an order the shop typed in.
 */
export function attributionColumns(metadata: unknown): AttributionColumns | null {
  const m = (metadata && typeof metadata === 'object' ? metadata : {}) as Record<string, any>;
  const a: OrderAttribution | undefined = m.attribution && typeof m.attribution === 'object' ? m.attribution : manualAttribution(m.source);
  if (!a) return null;
  const manual = !m.attribution && m.source ? MANUAL_SOURCE[String(m.source).toUpperCase()] ?? 'DIRECT' : null;
  return {
    utmSource: a.utmSource ?? null,
    utmMedium: a.utmMedium ?? null,
    utmCampaign: a.utmCampaign ?? null,
    utmContent: a.utmContent ?? null,
    utmTerm: a.utmTerm ?? null,
    referrer: a.referrer ?? null,
    landingPage: a.landingPage ?? null,
    trafficSource: manual ?? trafficSourceOf(a),
    discountCodes: Array.isArray(a.discountCodes) ? a.discountCodes : [],
  };
}

/* ───────────────────────── campaign matching ───────────────────────── */

/** Comparison key for campaign names and utm_campaign values. */
export const campaignKey = (s: string | null | undefined) => String(s ?? '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '');

export interface CampaignRule {
  id: string;
  platform: string;
  name: string;
  utmCampaign?: string | null;
  discountCodes?: string[];
}

export interface AttributedOrder {
  utmCampaign?: string | null;
  discountCodes?: string[];
}

export type MatchBy = 'CODE' | 'UTM';

/**
 * The campaign an order belongs to. A discount code is the stronger signal
 * (the buyer typed it), so it is checked first; then utm_campaign against the
 * campaign's own utm value or, without one, its name.
 */
export function matchCampaign<T extends CampaignRule>(order: AttributedOrder, rules: T[]): { rule: T; by: MatchBy } | null {
  const orderCodes = new Set((order.discountCodes ?? []).map((c) => c.trim().toUpperCase()).filter(Boolean));
  if (orderCodes.size) {
    const hit = rules.find((r) => (r.discountCodes ?? []).some((c) => orderCodes.has(c.trim().toUpperCase())));
    if (hit) return { rule: hit, by: 'CODE' };
  }
  const key = campaignKey(order.utmCampaign);
  if (key) {
    const hit = rules.find((r) => campaignKey(r.utmCampaign || r.name) === key) ?? rules.find((r) => campaignKey(r.name) === key);
    if (hit) return { rule: hit, by: 'UTM' };
  }
  return null;
}

/** A product link with UTM tags (the link builder). Existing query parameters are kept. */
export function utmLink(base: string, tags: { source: string; medium?: string; campaign?: string; content?: string; term?: string }): string {
  const url = base.trim();
  const [path, hash] = url.split('#');
  const keep = path.includes('?') ? path.slice(path.indexOf('?') + 1).split('&').filter((p) => p && !/^utm_/i.test(p)) : [];
  const head = path.includes('?') ? path.slice(0, path.indexOf('?')) : path;
  const add = ([['utm_source', tags.source], ['utm_medium', tags.medium], ['utm_campaign', tags.campaign], ['utm_content', tags.content], ['utm_term', tags.term]] as Array<[string, string | undefined]>)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}=${encodeURIComponent(v!.trim())}`);
  const q = [...keep, ...add].join('&');
  return `${head}${q ? `?${q}` : ''}${hash !== undefined ? `#${hash}` : ''}`;
}
