/**
 * Meta Graph API helpers with no I/O: the API version, appsecret_proof,
 * webhook and signed_request verification, error classification, and the
 * payloads for publishing, messaging and catalog batches. Everything here is
 * unit-tested in meta.spec.ts; the services only add HTTP and storage.
 */

import { apiText } from '../../common/i18n/api-message';
import * as crypto from 'crypto';

/** The one Graph API version used by every Meta call in Nafaa. */
export const GRAPH_VERSION = 'v26.0';
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
export const DIALOG_BASE = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

export interface MetaAppConfig {
  appId: string;
  appSecret: string;
  loginConfigId: string | null;
  verifyToken: string | null;
}

/** App credentials from the environment, or null when they are not set. */
export function metaAppConfig(env: NodeJS.ProcessEnv = process.env): MetaAppConfig | null {
  const appId = (env.META_APP_ID ?? '').trim();
  const appSecret = (env.META_APP_SECRET ?? '').trim();
  if (!appId || !appSecret) return null;
  return {
    appId,
    appSecret,
    loginConfigId: (env.META_LOGIN_CONFIG_ID ?? '').trim() || null,
    verifyToken: (env.META_WEBHOOK_VERIFY_TOKEN ?? '').trim() || null,
  };
}

/** HMAC-SHA256 of the access token keyed by the app secret, sent with every server call. */
export function appSecretProof(accessToken: string, appSecret: string): string {
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Checks the X-Hub-Signature-256 header ("sha256=<hex>") against the raw request body. */
export function verifyHubSignature(rawBody: Buffer | string, header: string | undefined | null, appSecret: string): boolean {
  if (!header || !appSecret) return false;
  const m = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!m) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return safeEqual(m[1].toLowerCase(), expected);
}

const b64urlDecode = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export interface SignedRequest {
  algorithm: string;
  user_id?: string;
  issued_at?: number;
  [k: string]: unknown;
}

/**
 * Parses and verifies a Meta signed_request ("<sig>.<payload>", both
 * base64url; sig = HMAC-SHA256(payload, app secret)). Returns null when the
 * signature or algorithm is wrong.
 */
export function parseSignedRequest(signed: string | undefined | null, appSecret: string): SignedRequest | null {
  if (!signed || !appSecret) return null;
  const [sig, payload] = String(signed).split('.', 2);
  if (!sig || !payload) return null;
  let data: SignedRequest;
  try {
    data = JSON.parse(b64urlDecode(payload).toString('utf8'));
  } catch {
    return null;
  }
  if (String(data?.algorithm ?? '').toUpperCase() !== 'HMAC-SHA256') return null;
  const expected = crypto.createHmac('sha256', appSecret).update(payload).digest();
  const given = b64urlDecode(sig);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  return data;
}

/* ───────────────────────── OAuth state ───────────────────────── */

/** Signed OAuth state: tenant, user, return origin, expiry. */
export function signState(p: { tenantId: string; userId: string; origin: string }, secret: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ t: p.tenantId, u: p.userId, o: p.origin, e: now + 30 * 60_000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`meta:${body}`).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyState(state: string, secret: string, now = Date.now()): { tenantId: string; userId: string; origin: string } | 'expired' | null {
  const [body, sig] = String(state ?? '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(`meta:${body}`).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  try {
    const d = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof d?.t !== 'string' || typeof d?.u !== 'string') return null;
    if (!(Number(d.e) > now)) return 'expired';
    return { tenantId: d.t, userId: d.u, origin: String(d.o ?? '') };
  } catch {
    return null;
  }
}

/* ───────────────────────── errors ───────────────────────── */

export type MetaErrorKind = 'token' | 'permission' | 'rate_limit' | 'transient' | 'media' | 'window' | 'not_found' | 'invalid' | 'unknown';

export interface GraphErrorBody {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  is_transient?: boolean;
  fbtrace_id?: string;
}

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80000, 80001, 80002, 80003, 80004, 80005, 80006, 80008, 80009, 80014]);

/** Sorts a Graph error into a kind the caller can act on. */
export function classifyGraphError(e: GraphErrorBody | null | undefined, httpStatus = 400): MetaErrorKind {
  const code = Number(e?.code ?? 0);
  const sub = Number(e?.error_subcode ?? 0);
  if (code === 190 || code === 102 || sub === 458 || sub === 460 || sub === 463 || sub === 467) return 'token';
  if (RATE_LIMIT_CODES.has(code)) return 'rate_limit';
  // Messenger: outside the 24 hour window / message tag needed.
  if (code === 10 && (sub === 2018278 || sub === 2018065)) return 'window';
  if (code === 551 || sub === 2534022) return 'window';
  if (code === 10 || code === 3 || (code >= 200 && code <= 299)) return 'permission';
  if (code === 9004 || code === 36003 || code === 324 || code === 352 || (sub >= 2207001 && sub <= 2207057)) return 'media';
  if (code === 100 && sub === 33) return 'not_found';
  if (code === 1 || code === 2 || e?.is_transient || httpStatus >= 500) return 'transient';
  if (code === 100) return 'invalid';
  return 'unknown';
}

/** Kinds worth another try after a pause. */
export const retryable = (k: MetaErrorKind) => k === 'transient' || k === 'rate_limit';

/** A plain Roman Urdu sentence for the merchant (no technical words). */
export function friendlyMetaError(kind: MetaErrorKind, e?: GraphErrorBody | null): string {
  switch (kind) {
    case 'token': return apiText('Facebook se rabta toot gaya — Settings → Facebook & Instagram me "Dobara joren" dabayein');
    case 'permission': return apiText('Facebook ne is kaam ki ijazat nahi di — dobara joren aur har sawal par "Allow" karein');
    case 'rate_limit': return apiText('Facebook ne thori der ke liye rok diya hai — kuch der baad khud dobara koshish hogi');
    case 'transient': return apiText('Facebook abhi jawab nahi de raha — thori der baad dobara koshish hogi');
    case 'media': return `Tasveer ya video Facebook tak nahi pohanchi${e?.error_user_msg ? ` (${e.error_user_msg})` : ''} — sahi size ki tasveer lagayein`;
    case 'window': return apiText('Is bande ka aakhri message 24 ghante se purana hai — Facebook ab jawab bhejne nahi deta. Woh dobara message kare to jawab de sakte hain');
    case 'not_found': return apiText('Ye cheez Facebook par ab maujood nahi (shayad mita di gayi)');
    default: {
      const msg = e?.error_user_msg || e?.message;
      return msg ? `Facebook ne mana kar diya: ${String(msg).slice(0, 200)}` : apiText('Facebook ne mana kar diya — dobara koshish karein');
    }
  }
}

/** Connection status after a token error (subcode 458 = the person removed the app). */
export function tokenErrorStatus(e: GraphErrorBody | null | undefined): 'REVOKED' | 'EXPIRED' {
  const sub = Number(e?.error_subcode ?? 0);
  return sub === 458 || sub === 460 ? 'REVOKED' : 'EXPIRED';
}

/** Milliseconds to wait before the next try (attempt starts at 1). */
export function backoffMs(attempt: number, kind: MetaErrorKind): number {
  const base = kind === 'rate_limit' ? 5_000 : 1_000;
  return Math.min(30_000, base * 3 ** (attempt - 1));
}

/**
 * Minutes until access returns, from X-Business-Use-Case-Usage / X-App-Usage
 * headers, or 0 when they do not say. Also returns the highest usage percent.
 */
export function usageFromHeaders(headers: Record<string, string | null | undefined>): { maxPct: number; waitMin: number } {
  let maxPct = 0;
  let waitMin = 0;
  const read = (raw: string | null | undefined) => {
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      // X-App-Usage is one flat object; the business / ad account headers map ids to lists.
      const flat = v && typeof v === 'object' && !Array.isArray(v) && ('call_count' in v || 'acc_id_util_pct' in v);
      const all: any[] = flat ? [v] : Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v).flat() : [];
      for (const r of all) {
        if (!r || typeof r !== 'object') continue;
        for (const k of ['call_count', 'total_cputime', 'total_time']) maxPct = Math.max(maxPct, Number(r[k] ?? 0) || 0);
        waitMin = Math.max(waitMin, Number(r.estimated_time_to_regain_access ?? 0) || 0);
      }
    } catch {
      /* ignore unreadable headers */
    }
  };
  read(headers['x-app-usage']);
  read(headers['x-business-use-case-usage']);
  read(headers['x-ad-account-usage']);
  return { maxPct, waitMin };
}

/* ───────────────────────── token expiry ───────────────────────── */

export type TokenHealth = 'ok' | 'expiring' | 'expired';

/** Long-lived user tokens last about 60 days; warn 7 days before. null expiry = never expires. */
export function tokenHealth(expiresAt: Date | null | undefined, now = new Date()): TokenHealth {
  if (!expiresAt) return 'ok';
  const left = expiresAt.getTime() - now.getTime();
  if (left <= 0) return 'expired';
  if (left < 7 * 86_400_000) return 'expiring';
  return 'ok';
}

/** Expiry date from an OAuth token response (`expires_in` seconds; 0 or missing = never). */
export function expiryFrom(expiresIn: unknown, now = Date.now()): Date | null {
  const n = Number(expiresIn);
  return Number.isFinite(n) && n > 0 ? new Date(now + n * 1000) : null;
}

/* ───────────────────────── Messenger window ───────────────────────── */

export const MESSAGING_WINDOW_MS = 24 * 3600_000;

/** Whether a normal reply may be sent: the person wrote within the last 24 hours. */
export function canReply(lastInboundAt: Date | null | undefined, now = new Date()): { ok: boolean; closesAt: Date | null } {
  if (!lastInboundAt) return { ok: false, closesAt: null };
  const closesAt = new Date(lastInboundAt.getTime() + MESSAGING_WINDOW_MS);
  return { ok: closesAt.getTime() > now.getTime(), closesAt };
}

export function messagePayload(recipientId: string, text: string) {
  return { recipient: { id: recipientId }, messaging_type: 'RESPONSE', message: { text: String(text).slice(0, 2000) } };
}

/* ───────────────────────── publishing ───────────────────────── */

export interface PublishMedia { url: string; kind: 'image' | 'video' }
export interface PublishInput {
  kind: string; // POST | REEL | STORY | STATUS
  caption: string;
  media: PublishMedia[];
  link?: string | null;
}

/** A step of the publish plan: one Graph call. `ref` lets later steps use an earlier id. */
export interface GraphStep {
  ref: string;
  method: 'POST' | 'GET';
  path: string;
  body: Record<string, unknown>;
  /** Video containers must be ready (status_code FINISHED) before they are published. */
  waitReady?: boolean;
}

/** Turns "{{ref}}" placeholders in a body into ids from earlier steps. */
export function resolveRefs(body: Record<string, unknown>, ids: Record<string, string>): Record<string, unknown> {
  const sub = (v: unknown): unknown => {
    if (typeof v === 'string') return v.replace(/\{\{(\w+)\}\}/g, (_, k) => ids[k] ?? '');
    if (Array.isArray(v)) return v.map(sub);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sub(x)]));
    return v;
  };
  return sub(body) as Record<string, unknown>;
}

/**
 * Facebook page publish plan:
 *  - one video → /videos; one photo → /photos;
 *  - several photos → each uploaded unpublished, then one /feed post with attached_media;
 *  - no media → a /feed post with the link (or text only).
 * The final step's ref is always "post".
 */
export function facebookPlan(pageId: string, p: PublishInput): GraphStep[] {
  const message = p.caption;
  const images = p.media.filter((m) => m.kind === 'image').slice(0, 10);
  const video = p.media.find((m) => m.kind === 'video');
  if (video) return [{ ref: 'post', method: 'POST', path: `${pageId}/videos`, body: { file_url: video.url, description: message } }];
  if (images.length === 1) return [{ ref: 'post', method: 'POST', path: `${pageId}/photos`, body: { url: images[0].url, caption: message } }];
  if (images.length > 1) {
    const uploads: GraphStep[] = images.map((m, i) => ({ ref: `p${i}`, method: 'POST', path: `${pageId}/photos`, body: { url: m.url, published: false } }));
    return [...uploads, {
      ref: 'post', method: 'POST', path: `${pageId}/feed`,
      body: { message, attached_media: images.map((_, i) => ({ media_fbid: `{{p${i}}}` })) },
    }];
  }
  return [{ ref: 'post', method: 'POST', path: `${pageId}/feed`, body: { message, ...(p.link ? { link: p.link } : {}) } }];
}

/**
 * Instagram publish plan (container → publish):
 *  - REEL or a video → REELS container (waits until processed);
 *  - STORY → STORIES container with the first image or video;
 *  - several images → item containers, a CAROUSEL container, publish;
 *  - one image → image container, publish.
 * Instagram needs at least one image or video; returns null without media.
 */
export function instagramPlan(igUserId: string, p: PublishInput): GraphStep[] | null {
  const images = p.media.filter((m) => m.kind === 'image');
  const video = p.media.find((m) => m.kind === 'video');
  const caption = p.caption.slice(0, 2200);
  const publish: GraphStep = { ref: 'post', method: 'POST', path: `${igUserId}/media_publish`, body: { creation_id: '{{container}}' } };
  if (p.kind === 'STORY' || p.kind === 'STATUS') {
    const m = video ?? images[0];
    if (!m) return null;
    const body = m.kind === 'video' ? { media_type: 'STORIES', video_url: m.url } : { media_type: 'STORIES', image_url: m.url };
    return [{ ref: 'container', method: 'POST', path: `${igUserId}/media`, body, waitReady: m.kind === 'video' }, publish];
  }
  if (video && (p.kind === 'REEL' || !images.length)) {
    return [{ ref: 'container', method: 'POST', path: `${igUserId}/media`, body: { media_type: 'REELS', video_url: video.url, caption, share_to_feed: true }, waitReady: true }, publish];
  }
  if (images.length > 1) {
    const items = images.slice(0, 10).map((m, i): GraphStep => ({ ref: `c${i}`, method: 'POST', path: `${igUserId}/media`, body: { image_url: m.url, is_carousel_item: true } }));
    return [...items, {
      ref: 'container', method: 'POST', path: `${igUserId}/media`,
      body: { media_type: 'CAROUSEL', caption, children: items.map((s) => `{{${s.ref}}}`).join(',') },
    }, publish];
  }
  if (images.length === 1) return [{ ref: 'container', method: 'POST', path: `${igUserId}/media`, body: { image_url: images[0].url, caption } }, publish];
  return null;
}

/** Instagram container status → whether it can be published, must wait, or failed. */
export function containerState(statusCode: unknown): 'ready' | 'wait' | 'failed' {
  const s = String(statusCode ?? '').toUpperCase();
  if (s === 'FINISHED' || s === 'PUBLISHED') return 'ready';
  if (s === 'ERROR' || s === 'EXPIRED') return 'failed';
  return 'wait';
}

/** Caption with hashtags, as the merchant sees it in the studio. */
export const publishCaption = (caption: string, hashtags: string[]) => [caption.trim(), hashtags.join(' ')].filter(Boolean).join('\n\n');

/* ───────────────────────── catalog batch ───────────────────────── */

export interface CatalogItemInput {
  id: string;
  groupId?: string;
  title: string;
  description: string;
  link: string;
  image: string;
  extraImages: string[];
  price: number;
  salePrice?: number | null;
  availability: 'in_stock' | 'out_of_stock' | 'backorder';
  brand?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  productType?: string | null;
  color?: string | null;
  size?: string | null;
}

const CATALOG_AVAILABILITY = { in_stock: 'in stock', out_of_stock: 'out of stock', backorder: 'available for order' } as const;
const money = (n: number) => `${(Math.round(n * 100) / 100).toFixed(2)} PKR`;

/** The `data` object of one items_batch UPDATE request (fields per Meta's product item spec). */
export function catalogItemData(i: CatalogItemInput): Record<string, unknown> {
  const sale = i.salePrice && i.salePrice > 0 && i.salePrice < i.price ? i.salePrice : null;
  const d: Record<string, unknown> = {
    id: i.id,
    title: i.title.slice(0, 200),
    description: (i.description || i.title).slice(0, 9999),
    availability: CATALOG_AVAILABILITY[i.availability],
    condition: 'new',
    price: money(i.price),
    link: i.link,
    image_link: i.image,
    brand: (i.brand || '').slice(0, 100) || undefined,
  };
  if (sale) d.sale_price = money(sale);
  if (i.extraImages.length) d.additional_image_link = i.extraImages.slice(0, 10);
  if (i.groupId) d.item_group_id = i.groupId;
  if (i.gtin) d.gtin = i.gtin;
  if (i.mpn) d.mpn = i.mpn;
  if (i.productType) d.product_type = i.productType;
  if (i.color) d.color = i.color;
  if (i.size) d.size = i.size;
  return Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined && v !== ''));
}

/** Stable hash of what is sent for an item, to skip unchanged items. */
export function catalogItemHash(data: Record<string, unknown>): string {
  const keys = Object.keys(data).sort();
  return crypto.createHash('sha1').update(JSON.stringify(keys.map((k) => [k, data[k]]))).digest('hex');
}

export interface CatalogDiff {
  upserts: Array<{ id: string; data: Record<string, unknown>; hash: string }>;
  deletes: string[];
  unchanged: number;
}

/** Items that changed or are new, and items sent before that are gone now. */
export function catalogDiff(items: CatalogItemInput[], sent: Map<string, string>, full = false): CatalogDiff {
  const upserts: CatalogDiff['upserts'] = [];
  const seen = new Set<string>();
  let unchanged = 0;
  for (const i of items) {
    if (seen.has(i.id)) continue;
    seen.add(i.id);
    const data = catalogItemData(i);
    const hash = catalogItemHash(data);
    if (!full && sent.get(i.id) === hash) { unchanged++; continue; }
    upserts.push({ id: i.id, data, hash });
  }
  const deletes = [...sent.keys()].filter((id) => !seen.has(id));
  return { upserts, deletes, unchanged };
}

export const CATALOG_BATCH_MAX = 1000;

/** items_batch request bodies, at most CATALOG_BATCH_MAX requests each. */
export function catalogBatches(diff: Pick<CatalogDiff, 'upserts' | 'deletes'>, max = CATALOG_BATCH_MAX): Array<{ item_type: 'PRODUCT_ITEM'; allow_upsert: true; requests: Array<{ method: 'UPDATE' | 'DELETE'; data: Record<string, unknown> }> }> {
  const reqs = [
    ...diff.upserts.map((u) => ({ method: 'UPDATE' as const, data: u.data })),
    ...diff.deletes.map((id) => ({ method: 'DELETE' as const, data: { id } })),
  ];
  const out = [];
  for (let i = 0; i < reqs.length; i += max) out.push({ item_type: 'PRODUCT_ITEM' as const, allow_upsert: true as const, requests: reqs.slice(i, i + max) });
  return out;
}

/* ───────────────────────── webhooks ───────────────────────── */

export interface InboundMessage {
  platform: 'MESSENGER' | 'INSTAGRAM';
  accountId: string;
  participantId: string;
  mid: string;
  text: string | null;
  attachments: Array<{ type: string; url: string | null }>;
  at: Date;
  /** Sent by the page / account itself (an echo of a reply). */
  echo: boolean;
}

export interface InboundComment {
  platform: 'FACEBOOK' | 'INSTAGRAM';
  accountId: string;
  commentId: string;
  objectId: string | null;
  parentId: string | null;
  authorId: string | null;
  authorName: string | null;
  text: string | null;
  at: Date;
  verb: 'add' | 'edited' | 'remove' | 'hide' | 'unhide';
}

const asDate = (v: unknown) => {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return new Date(n < 1e12 ? n * 1000 : n);
  const d = new Date(String(v ?? ''));
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

/** Reads page / instagram webhook bodies into messages and comments. Unknown parts are skipped. */
export function parseWebhook(body: any): { messages: InboundMessage[]; comments: InboundComment[] } {
  const messages: InboundMessage[] = [];
  const comments: InboundComment[] = [];
  const object = String(body?.object ?? '');
  if (object !== 'page' && object !== 'instagram') return { messages, comments };
  const platformMsg = object === 'page' ? 'MESSENGER' : 'INSTAGRAM';
  for (const entry of Array.isArray(body?.entry) ? body.entry : []) {
    const accountId = String(entry?.id ?? '');
    if (!accountId) continue;
    for (const m of Array.isArray(entry?.messaging) ? entry.messaging : []) {
      const msg = m?.message;
      if (!msg?.mid || msg?.is_deleted) continue;
      const echo = !!msg.is_echo;
      const participantId = String(echo ? m?.recipient?.id ?? '' : m?.sender?.id ?? '');
      if (!participantId) continue;
      messages.push({
        platform: platformMsg, accountId, participantId, mid: String(msg.mid),
        text: typeof msg.text === 'string' ? msg.text : null,
        attachments: (Array.isArray(msg.attachments) ? msg.attachments : []).map((a: any) => ({ type: String(a?.type ?? 'file'), url: a?.payload?.url ?? null })),
        at: asDate(m?.timestamp), echo,
      });
    }
    for (const c of Array.isArray(entry?.changes) ? entry.changes : []) {
      const v = c?.value ?? {};
      if (object === 'page' && c?.field === 'feed' && v?.item === 'comment' && v?.comment_id) {
        comments.push({
          platform: 'FACEBOOK', accountId, commentId: String(v.comment_id), objectId: v.post_id ? String(v.post_id) : null,
          parentId: v.parent_id && v.parent_id !== v.post_id ? String(v.parent_id) : null,
          authorId: v.from?.id ? String(v.from.id) : null, authorName: v.from?.name ?? null,
          text: typeof v.message === 'string' ? v.message : null, at: asDate(v.created_time),
          verb: (['add', 'edited', 'remove', 'hide', 'unhide'].includes(v.verb) ? v.verb : 'add') as InboundComment['verb'],
        });
      }
      if (object === 'instagram' && (c?.field === 'comments' || c?.field === 'live_comments') && v?.id) {
        comments.push({
          platform: 'INSTAGRAM', accountId, commentId: String(v.id), objectId: v.media?.id ? String(v.media.id) : null,
          parentId: v.parent_id ? String(v.parent_id) : null,
          authorId: v.from?.id ? String(v.from.id) : null, authorName: v.from?.username ?? null,
          text: typeof v.text === 'string' ? v.text : null, at: asDate(entry?.time), verb: 'add',
        });
      }
    }
  }
  return { messages, comments };
}
