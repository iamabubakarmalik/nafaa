/**
 * Nafaa Social: the contract each OAuth platform adapter follows
 * (brand-social-threads / -youtube / -tiktok / -x / -pinterest .service.ts),
 * plus the small HTTP and media helpers they share. Failures are thrown as
 * SocialGraphError with a kind the publisher already understands
 * (token, permission, rate_limit, transient, media, plan, unknown).
 */

import * as https from 'https';
import * as http from 'http';
import { Readable } from 'stream';
import { SocialGraphError } from './brand-social-graph.service';
import { PLATFORM_LABEL } from './brand-social.logic';
import type { AccountPlatformSettings, BrandPostKind, OAuthPlatform, PlatformPublishState, PostMediaItem, PostOptions } from './brand-social.types';

/* ───────────────────────── contract ───────────────────────── */

export interface PlatformApp { clientId: string; clientSecret: string }

export interface TokenSet {
  accessToken: string;
  refreshToken?: string | null;
  /** Seconds. */
  expiresIn?: number | null;
  refreshExpiresIn?: number | null;
  scopes?: string[];
  /** The platform user id when the token answer carries it (Threads, TikTok). */
  userId?: string | null;
}

export interface ProfileInfo {
  externalId: string;
  name: string;
  handle: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  followers: number | null;
}

export interface PublishContext {
  accessToken: string;
  /** brand_social_accounts.externalId (the platform user / channel id). */
  externalId: string;
  handle: string | null;
  settings: AccountPlatformSettings;
  post: { id: string; code: string; title: string; kind: BrandPostKind; firstComment: string | null; options: PostOptions };
  /** The full text for this platform (caption, hashtags, tagged link where it belongs). */
  text: string;
  /** The same text without the link (Pinterest keeps the link separately). */
  textNoLink: string;
  /** The UTM-tagged link, or null. */
  link: string | null;
  /** Absolute URLs. */
  media: PostMediaItem[];
  /** The state from the last run (WAITING carries containerId). */
  prev: PlatformPublishState;
}

export type AdapterResult =
  | { postId: string; permalink?: string | null }
  /** Still processing on the platform side; look again in a minute. */
  | { waiting: true; containerId: string }
  /** The platform cannot take this post through its API; a person posts it. */
  | { handoff: string }
  /** This platform does not take this kind of post; nothing to do. */
  | { skipped: string };

export interface MetricValues { reach: number; impressions: number; likes: number; comments: number; shares: number; saves: number; plays: number; clicks: number; raw: Record<string, unknown> }

export interface SocialAdapter {
  readonly platform: OAuthPlatform;
  exchangeCode(app: PlatformApp, code: string, redirectUri: string, verifier: string | null): Promise<TokenSet>;
  refresh(app: PlatformApp, t: { accessToken: string; refreshToken: string | null }): Promise<TokenSet>;
  profile(accessToken: string, hint: { userId?: string | null }): Promise<ProfileInfo>;
  publish(ctx: PublishContext): Promise<AdapterResult>;
  /** Replies to the new post with the first comment, where the platform allows it. */
  comment?(ctx: PublishContext, postId: string, text: string): Promise<string | null>;
  /** Numbers for published posts (by platform post id). Missing ids are left out. */
  metrics?(accessToken: string, externalId: string, postIds: string[]): Promise<Map<string, MetricValues>>;
}

/** A post still processing on the platform after this long fails. */
export const CONTAINER_TIMEOUT_MS = 60 * 60_000;

export const emptyMetrics = (): MetricValues => ({ reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, plays: 0, clicks: 0, raw: {} });
export const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ───────────────────────── HTTP ───────────────────────── */

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  bearer?: string;
  /** Basic auth (client id, client secret). */
  basic?: [string, string];
  json?: unknown;
  form?: Record<string, string>;
  body?: RequestInit['body'];
  timeoutMs?: number;
  /** Platform-specific error sorting; the default reads common error shapes. */
  onError?: (status: number, body: unknown) => SocialGraphError;
}

export interface HttpResult<T> { status: number; headers: Headers; data: T }

/** The readable message and code inside a platform error body. */
export function errorParts(body: unknown): { message: string; code: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, any>;
  const err = b.error && typeof b.error === 'object' ? b.error : null;
  const message = String(
    b.error_description ?? err?.message ?? b.error_message ?? b.detail ?? b.errors?.[0]?.message ?? b.errors?.[0]?.detail
      ?? b.message ?? (typeof b.error === 'string' ? b.error : '') ?? b.title ?? '',
  ).trim();
  const code = String(err?.code ?? err?.status ?? b.code ?? b.error_type ?? b.title ?? b.errors?.[0]?.type ?? (typeof b.error === 'string' ? b.error : '') ?? '').trim();
  return { message, code };
}

/** Sorts an HTTP failure into a publisher kind. */
export function kindOf(status: number, code: string, message: string): string {
  const t = `${code} ${message}`.toLowerCase();
  const tokenWords = /invalid_grant|access_token_invalid|invalid[_ ]token|token.*expired|unauthori[sz]ed/.test(t);
  if (status === 401 || (tokenWords && status >= 400 && status < 500 && status !== 429 && status !== 403)) return 'token';
  if (status === 402 || /creditsdepleted|credits|payment required|client-not-enrolled|usage cap/.test(t)) return 'plan';
  if (status === 429 || /rate_limit|ratelimit|quota|too many/.test(t)) return 'rate_limit';
  if (status >= 500 || status === 0) return 'transient';
  if (status === 403) return 'permission';
  if (/video|image|media|duration|file|format|size|resolution/.test(t)) return 'media';
  return 'unknown';
}

/** English text for a platform failure. */
export function platformErrorText(platform: OAuthPlatform, kind: string, message: string): string {
  const name = PLATFORM_LABEL[platform];
  const detail = message ? ` (${message.slice(0, 220)})` : '';
  switch (kind) {
    case 'token': return `The ${name} connection has expired or was removed. Reconnect it on the Accounts page.${detail}`;
    case 'permission': return `${name} did not allow this. Reconnect and allow every permission asked for${detail}.`;
    case 'rate_limit': return `${name} asked us to slow down. Another try will happen on its own.${detail}`;
    case 'transient': return `${name} did not answer. Another try will happen on its own.${detail}`;
    case 'plan': return `${name} refused because of the developer plan or credits${detail}. Check the plan in the ${name} developer portal, then retry.`;
    case 'media': return `${name} could not use the image or video${detail}. Check its size and format.`;
    default: return `${name} refused the request${detail}.`;
  }
}

export function platformError(platform: OAuthPlatform, status: number, body: unknown): SocialGraphError {
  const { message, code } = errorParts(body);
  const kind = kindOf(status, code, message);
  return new SocialGraphError(kind, platformErrorText(platform, kind, message || (status ? `HTTP ${status}` : '')));
}

/** One JSON call. Non-2xx answers become a SocialGraphError. */
export async function httpJson<T = any>(platform: OAuthPlatform, url: string, o: HttpOptions = {}): Promise<HttpResult<T>> {
  const u = new URL(url);
  for (const [k, v] of Object.entries(o.query ?? {})) if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  const headers: Record<string, string> = { Accept: 'application/json', ...(o.headers ?? {}) };
  if (o.bearer) headers.Authorization = `Bearer ${o.bearer}`;
  if (o.basic) headers.Authorization = `Basic ${Buffer.from(`${o.basic[0]}:${o.basic[1]}`).toString('base64')}`;
  let body: RequestInit['body'] = o.body;
  if (o.json !== undefined) { body = JSON.stringify(o.json); headers['Content-Type'] = headers['Content-Type'] ?? 'application/json; charset=UTF-8'; }
  if (o.form) { body = new URLSearchParams(o.form).toString(); headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
  let res: Response;
  try {
    res = await fetch(u, { method: o.method ?? (body ? 'POST' : 'GET'), headers, body, signal: AbortSignal.timeout(o.timeoutMs ?? 60_000) });
  } catch (e) {
    throw new SocialGraphError('transient', platformErrorText(platform, 'transient', (e as Error).message));
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw (o.onError ?? ((st: number, b: unknown) => platformError(platform, st, b)))(res.status, data);
  return { status: res.status, headers: res.headers, data: data as T };
}

/* ───────────────────────── media ───────────────────────── */

/** Size and type of a media URL (HEAD, then a one-byte range request). */
export async function mediaHead(platform: OAuthPlatform, url: string): Promise<{ size: number; type: string }> {
  try {
    const h = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20_000) });
    const size = Number(h.headers.get('content-length'));
    if (h.ok && size > 0) return { size, type: h.headers.get('content-type') || 'application/octet-stream' };
    const r = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(20_000) });
    const total = Number(/\/(\d+)$/.exec(r.headers.get('content-range') ?? '')?.[1]);
    await r.arrayBuffer().catch(() => null);
    if (total > 0) return { size: total, type: r.headers.get('content-type') || 'application/octet-stream' };
  } catch (e) {
    throw new SocialGraphError('transient', `Could not read the media file for ${PLATFORM_LABEL[platform]}: ${(e as Error).message}`);
  }
  throw new SocialGraphError('media', `The media file for ${PLATFORM_LABEL[platform]} has no readable size. Upload it again in the Media library.`);
}

/** Bytes start..end (inclusive) of a media URL. Falls back to slicing the whole file when ranges are not served. */
export async function mediaRange(url: string, start: number, end: number, cache: { whole?: Buffer } = {}): Promise<Buffer> {
  if (cache.whole) return cache.whole.subarray(start, end + 1);
  const r = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, signal: AbortSignal.timeout(300_000) });
  if (!r.ok) throw new SocialGraphError('transient', `Could not read the media file (HTTP ${r.status}).`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (r.status === 206) return buf;
  cache.whole = buf;
  return buf.subarray(start, end + 1);
}

/**
 * Streams a media URL into a PUT (or POST) to `target` without holding the
 * file in memory. Returns the status, headers and body text.
 */
export async function streamUpload(target: string, sourceUrl: string, headers: Record<string, string>, method: 'PUT' | 'POST' = 'PUT'): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  const src = await fetch(sourceUrl, { signal: AbortSignal.timeout(30 * 60_000) });
  if (!src.ok || !src.body) throw new SocialGraphError('transient', `Could not read the media file (HTTP ${src.status}).`);
  const length = src.headers.get('content-length');
  const u = new URL(target);
  const lib = u.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const req = lib.request(u, { method, headers: { ...headers, ...(length ? { 'Content-Length': length } : {}) } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.setTimeout(30 * 60_000, () => req.destroy(new Error('Upload timed out')));
    req.on('error', (e) => reject(new SocialGraphError('transient', `Upload failed: ${e.message}`)));
    Readable.fromWeb(src.body as never).on('error', (e) => req.destroy(e)).pipe(req);
  });
}

/** MIME type for a video by its URL / declared type (TikTok accepts mp4, quicktime and webm). */
export function videoMime(url: string, declared?: string | null): string {
  const d = String(declared ?? '').toLowerCase();
  if (/^video\/(mp4|quicktime|webm)$/.test(d)) return d;
  if (/\.mov(\?|$)/i.test(url)) return 'video/quicktime';
  if (/\.webm(\?|$)/i.test(url)) return 'video/webm';
  return 'video/mp4';
}
