/**
 * Nafaa Social: pure rules for the platforms with their own OAuth app
 * (Threads, YouTube, TikTok, X, Pinterest). Authorize URLs, the signed state
 * and the PKCE pair, redirect URIs, text length as each platform counts it,
 * when a token needs refreshing, and which media each platform can take.
 * No I/O; unit-tested in brand-social-oauth.spec.ts.
 */

import * as crypto from 'crypto';
import { OAUTH_PLATFORMS, type BrandPlatform, type BrandPostKind, type OAuthPlatform, type PostMediaItem } from './brand-social.types';

export const isOAuthPlatform = (p: unknown): p is OAuthPlatform => typeof p === 'string' && (OAUTH_PLATFORMS as readonly string[]).includes(p);

/** "threads" / "x" in routes → THREADS / X. */
export function platformFromSlug(slug: unknown): OAuthPlatform | null {
  const k = String(slug ?? '').trim().toUpperCase();
  return isOAuthPlatform(k) ? k : null;
}
export const slugOf = (p: OAuthPlatform) => p.toLowerCase();

/* ───────────────────────── platform facts ───────────────────────── */

export interface OAuthConfig {
  authorizeUrl: string;
  scopes: string[];
  /** How scopes are joined in the authorize URL. */
  scopeSep: ',' | ' ';
  /** TikTok names the id "client_key". */
  idParam: 'client_id' | 'client_key';
  /** Extra authorize parameters. */
  extra?: Record<string, string>;
  /** X needs PKCE (S256). */
  pkce: boolean;
  idLabel: string;
  consoleUrl: string;
  howTo: string;
}

export const OAUTH: Record<OAuthPlatform, OAuthConfig> = {
  THREADS: {
    authorizeUrl: 'https://threads.com/oauth/authorize',
    scopes: ['threads_basic', 'threads_content_publish', 'threads_manage_insights', 'threads_read_replies', 'threads_manage_replies'],
    scopeSep: ',',
    idParam: 'client_id',
    pkce: false,
    idLabel: 'Threads app ID',
    consoleUrl: 'https://developers.facebook.com/apps/',
    howTo: 'Meta app → Use cases → Access the Threads API → Settings. Use the Threads app ID and Threads app secret (not the Facebook app ID). Add the redirect URI under Redirect Callback URLs, and the uninstall and delete URLs below.',
  },
  YOUTUBE: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
    scopeSep: ' ',
    idParam: 'client_id',
    extra: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
    pkce: false,
    idLabel: 'Client ID',
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
    howTo: 'Google Cloud → enable "YouTube Data API v3" → OAuth consent screen → Credentials → OAuth client ID (Web application). Add the redirect URI under Authorized redirect URIs. While the consent screen is in Testing, sign-ins last 7 days and uploads stay private.',
  },
  TIKTOK: {
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    scopes: ['user.info.basic', 'video.upload', 'video.publish'],
    scopeSep: ',',
    idParam: 'client_key',
    pkce: false,
    idLabel: 'Client key',
    consoleUrl: 'https://developers.tiktok.com/apps/',
    howTo: 'TikTok for Developers → your app → add Login Kit and Content Posting API (Direct Post on). Add the redirect URI under Login Kit → Redirect URI. Until TikTok audits the app, direct posts are private (Only me).',
  },
  X: {
    authorizeUrl: 'https://x.com/i/oauth2/authorize',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'media.write', 'offline.access'],
    scopeSep: ' ',
    idParam: 'client_id',
    pkce: true,
    idLabel: 'OAuth 2.0 Client ID',
    consoleUrl: 'https://developer.x.com/en/portal/dashboard',
    howTo: 'X developer portal → your app → User authentication settings: OAuth 2.0, type "Web App" (confidential), permissions Read and write. Add the redirect URI as Callback URI. Use the OAuth 2.0 Client ID and Client Secret, not the API key.',
  },
  PINTEREST: {
    authorizeUrl: 'https://www.pinterest.com/oauth/',
    scopes: ['boards:read', 'pins:read', 'pins:write', 'user_accounts:read'],
    scopeSep: ',',
    idParam: 'client_id',
    pkce: false,
    idLabel: 'App ID',
    consoleUrl: 'https://developers.pinterest.com/apps/',
    howTo: 'Pinterest developers → My apps → your app. Add the redirect URI under Redirect URIs. Pins can be created on live boards once the app has Standard access; Trial access is limited.',
  },
};

/** The admin page a platform sends the browser back to. */
export function platformRedirectUri(platform: OAuthPlatform, adminOrigin: string): string {
  return `${adminOrigin.replace(/\/+$/, '')}/social/accounts/callback/${slugOf(platform)}`;
}

/* ───────────────────────── state and PKCE ───────────────────────── */

export const STATE_TTL_MS = 30 * 60_000;

export interface OAuthState { platform: OAuthPlatform; userId: string; nonce: string }

/** Signed state: platform, admin user, a random nonce, expiry. */
export function signOAuthState(p: { platform: OAuthPlatform; userId: string; nonce?: string }, secret: string, now = Date.now()): string {
  const nonce = p.nonce ?? crypto.randomBytes(12).toString('base64url');
  const body = Buffer.from(JSON.stringify({ p: p.platform, u: p.userId, n: nonce, e: now + STATE_TTL_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`brand-oauth:${body}`).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyOAuthState(state: string, secret: string, now = Date.now()): OAuthState | 'expired' | null {
  const [body, sig] = String(state ?? '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(`brand-oauth:${body}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!isOAuthPlatform(d?.p) || typeof d?.u !== 'string' || typeof d?.n !== 'string') return null;
    if (!(Number(d.e) > now)) return 'expired';
    return { platform: d.p, userId: d.u, nonce: d.n };
  } catch {
    return null;
  }
}

/**
 * The PKCE verifier for a state nonce: an HMAC of the nonce with the server
 * secret, so it is never sent to the browser and needs no storage. 43
 * characters of base64url, inside the 43 to 128 that RFC 7636 allows.
 */
export function pkceVerifier(nonce: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`pkce:${nonce}`).digest('base64url');
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function buildAuthorizeUrl(platform: OAuthPlatform, o: { clientId: string; redirectUri: string; state: string; codeChallenge?: string | null }): string {
  const c = OAUTH[platform];
  const params = new URLSearchParams({
    [c.idParam]: o.clientId,
    redirect_uri: o.redirectUri,
    response_type: 'code',
    scope: c.scopes.join(c.scopeSep),
    state: o.state,
    ...(c.extra ?? {}),
  });
  if (c.pkce) {
    if (!o.codeChallenge) throw new Error(`${platform} needs a PKCE code challenge.`);
    params.set('code_challenge', o.codeChallenge);
    params.set('code_challenge_method', 'S256');
  }
  return `${c.authorizeUrl}?${params}`;
}

/* ───────────────────────── text length ───────────────────────── */

const URL_RE = /https?:\/\/[^\s]+/gi;
const PICTO = /\p{Extended_Pictographic}/u;

/** X weights: these code point ranges count 1, everything else 2 (twitter-text v3). */
const X_LIGHT: Array<[number, number]> = [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]];

const graphemes = (text: string): string[] => {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return [...new Seg(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment);
  return [...text];
};

/**
 * Length as X counts it: every link is 23, an emoji (any sequence) is 2,
 * Latin and most scripts up to U+10FF are 1, CJK and the rest are 2.
 */
export function xLength(text: string): number {
  let n = 0;
  const plain = String(text ?? '').replace(URL_RE, () => { n += 23; return ''; });
  for (const g of graphemes(plain.normalize('NFC'))) {
    if (PICTO.test(g)) { n += 2; continue; }
    for (const ch of g) {
      const cp = ch.codePointAt(0)!;
      n += X_LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2;
    }
  }
  return n;
}

/** Length as Threads counts it: characters, with emoji counted by their UTF-8 bytes. */
export function threadsLength(text: string): number {
  let n = 0;
  for (const g of graphemes(String(text ?? ''))) n += PICTO.test(g) ? Buffer.byteLength(g, 'utf8') : [...g].length;
  return n;
}

/** The length each platform checks its limit against. */
export function platformTextLength(platform: BrandPlatform, text: string): number {
  if (platform === 'X') return xLength(text);
  if (platform === 'THREADS') return threadsLength(text);
  return String(text ?? '').length;
}

/* ───────────────────────── tokens ───────────────────────── */

const DAY = 86_400_000;

/**
 * Whether the hourly job should refresh a token now:
 * - Threads: long-lived 60 days; refresh within 7 days of expiry, once the token is a day old;
 * - Pinterest: refresh within 5 days of expiry;
 * - YouTube, TikTok, X: short access tokens are refreshed on use; the job
 *   refreshes every 5 days anyway so rotating refresh tokens stay alive.
 * Any platform: refresh when the access token is already expired.
 */
export function needsRefresh(platform: OAuthPlatform, expiresAt: Date | null, refreshedAt: Date | null, now = Date.now()): boolean {
  const left = expiresAt ? expiresAt.getTime() - now : Infinity;
  const age = refreshedAt ? now - refreshedAt.getTime() : Infinity;
  switch (platform) {
    case 'THREADS': return left < 7 * DAY && age > DAY && left > 0;
    case 'PINTEREST': return left < 5 * DAY;
    default: return left <= 0 || age > 5 * DAY;
  }
}

/** Refresh before use when the access token ends within this window. */
export const USE_REFRESH_MS = 5 * 60_000;

/* ───────────────────────── what each platform takes ───────────────────────── */

export type MediaRoute =
  | { ok: true; video?: PostMediaItem; images: PostMediaItem[] }
  | { ok: false; skip: boolean; reason: string };

/** YouTube takes VIDEO and REEL posts with a video; anything else is skipped. */
export function youtubeRoute(kind: BrandPostKind, media: PostMediaItem[]): MediaRoute {
  if (kind !== 'VIDEO' && kind !== 'REEL') return { ok: false, skip: true, reason: 'YouTube takes video and reel posts only; this post was not sent there.' };
  const video = media.find((m) => m.kind === 'video');
  if (!video) return { ok: false, skip: false, reason: 'YouTube needs a video.' };
  return { ok: true, video, images: [] };
}

/** TikTok: one video, or up to 35 photos. */
export function tiktokRoute(media: PostMediaItem[]): MediaRoute {
  const video = media.find((m) => m.kind === 'video');
  if (video) return { ok: true, video, images: [] };
  const images = media.filter((m) => m.kind === 'image').slice(0, 35);
  if (!images.length) return { ok: false, skip: false, reason: 'TikTok needs a video or photos.' };
  return { ok: true, images };
}

/** X: one video, or up to 4 images, or text alone. */
export function xRoute(media: PostMediaItem[]): MediaRoute {
  const video = media.find((m) => m.kind === 'video');
  if (video) return { ok: true, video, images: [] };
  return { ok: true, images: media.filter((m) => m.kind === 'image').slice(0, 4) };
}

/** Pinterest: one video, one image, or 2 to 5 images as a carousel pin. */
export function pinterestRoute(media: PostMediaItem[]): MediaRoute {
  const video = media.find((m) => m.kind === 'video');
  if (video) return { ok: true, video, images: media.filter((m) => m.kind === 'image').slice(0, 1) };
  const images = media.filter((m) => m.kind === 'image').slice(0, 5);
  if (!images.length) return { ok: false, skip: false, reason: 'Pinterest needs an image or a video.' };
  return { ok: true, images };
}

/** Threads: text, one image or video, or a carousel of 2 to 20 items. */
export function threadsRoute(media: PostMediaItem[]): { type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL'; items: PostMediaItem[] } {
  const items = media.slice(0, 20);
  if (!items.length) return { type: 'TEXT', items };
  if (items.length === 1) return { type: items[0].kind === 'video' ? 'VIDEO' : 'IMAGE', items };
  return { type: 'CAROUSEL', items };
}

/**
 * TikTok FILE_UPLOAD chunks: at least 5 MB and at most 64 MB each, the
 * count rounded down, the last chunk taking the leftover bytes. A file
 * under the chunk size goes in one piece.
 */
export function tiktokChunks(total: number, chunk = 10 * 1024 * 1024): { chunkSize: number; ranges: Array<[number, number]> } {
  if (total <= chunk) return { chunkSize: total, ranges: [[0, total - 1]] };
  const count = Math.floor(total / chunk);
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) ranges.push([i * chunk, i === count - 1 ? total - 1 : (i + 1) * chunk - 1]);
  return { chunkSize: chunk, ranges };
}

/** Even pieces of `size` bytes (X media append, 4 MB by default). */
export function evenChunks(total: number, size = 4 * 1024 * 1024): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let s = 0; s < total; s += size) out.push([s, Math.min(total, s + size) - 1]);
  return out;
}

/**
 * The TikTok privacy level for a direct post: the account's choice when the
 * creator offers it, else SELF_ONLY, else the first option.
 */
export function pickTikTokPrivacy(options: string[], wanted?: string | null): string | null {
  if (wanted && options.includes(wanted)) return wanted;
  if (options.includes('SELF_ONLY')) return 'SELF_ONLY';
  return options[0] ?? null;
}

/** YouTube refuses < and > in titles and descriptions. */
export const youtubeSafe = (s: string, max: number) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, max);
