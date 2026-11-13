/**
 * Nafaa Social OAuth platforms, pure parts: authorize URLs, signed state and
 * PKCE, redirect URIs, text length per platform, token refresh timing, media
 * routes, upload chunking and publisher dispatch for the new platforms.
 */
import * as crypto from 'crypto';
import {
  buildAuthorizeUrl, evenChunks, needsRefresh, OAUTH, pinterestRoute, pkceChallenge, pkceVerifier, platformFromSlug,
  platformRedirectUri, platformTextLength, signOAuthState, threadsLength, threadsRoute, tiktokChunks, tiktokRoute, verifyOAuthState, xLength, xRoute,
  youtubeRoute, youtubeSafe,
} from './brand-social-oauth.logic';
import { errorParts, kindOf } from './brand-social-adapter';
import { CAPTION_LIMITS, dispatchFor, isApiPlatform, validatePost } from './brand-social.logic';
import { OAUTH_PLATFORMS, type PostMediaItem } from './brand-social.types';

const SECRET = 'test-secret';
const img = (url = 'https://res.cloudinary.com/a.jpg'): PostMediaItem => ({ url, kind: 'image', width: 1080, height: 1080 });
const vid = (d = 30): PostMediaItem => ({ url: 'https://res.cloudinary.com/a.mp4', kind: 'video', width: 1080, height: 1920, durationSec: d });

describe('authorize URLs', () => {
  const base = { clientId: 'cid', redirectUri: 'https://admin.nafaa.pk/social/accounts/callback/threads', state: 'st' };

  it('Threads: threads.com, comma scopes, code response', () => {
    const u = new URL(buildAuthorizeUrl('THREADS', base));
    expect(u.origin + u.pathname).toBe('https://threads.com/oauth/authorize');
    expect(u.searchParams.get('client_id')).toBe('cid');
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('scope')).toBe('threads_basic,threads_content_publish,threads_manage_insights,threads_read_replies,threads_manage_replies');
    expect(u.searchParams.get('state')).toBe('st');
  });
  it('YouTube: offline access with forced consent', () => {
    const u = new URL(buildAuthorizeUrl('YOUTUBE', base));
    expect(u.hostname).toBe('accounts.google.com');
    expect(u.searchParams.get('access_type')).toBe('offline');
    expect(u.searchParams.get('prompt')).toBe('consent');
    expect(u.searchParams.get('scope')!.split(' ')).toEqual(['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly']);
  });
  it('TikTok: client_key, not client_id', () => {
    const u = new URL(buildAuthorizeUrl('TIKTOK', base));
    expect(u.searchParams.get('client_key')).toBe('cid');
    expect(u.searchParams.has('client_id')).toBe(false);
    expect(u.searchParams.get('scope')).toBe('user.info.basic,video.upload,video.publish');
  });
  it('X: PKCE S256 required, space scopes with offline.access', () => {
    expect(() => buildAuthorizeUrl('X', base)).toThrow();
    const u = new URL(buildAuthorizeUrl('X', { ...base, codeChallenge: 'chal' }));
    expect(u.searchParams.get('code_challenge')).toBe('chal');
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('scope')!.split(' ')).toContain('offline.access');
  });
  it('Pinterest: www.pinterest.com/oauth/', () => {
    const u = new URL(buildAuthorizeUrl('PINTEREST', base));
    expect(u.origin + u.pathname).toBe('https://www.pinterest.com/oauth/');
    expect(u.searchParams.get('scope')).toBe('boards:read,pins:read,pins:write,user_accounts:read');
  });
  it('every OAuth platform has a config and a redirect URI per slug', () => {
    for (const p of OAUTH_PLATFORMS) {
      expect(OAUTH[p].scopes.length).toBeGreaterThan(0);
      expect(platformRedirectUri(p, 'https://admin.nafaa.pk/')).toBe(`https://admin.nafaa.pk/social/accounts/callback/${p.toLowerCase()}`);
      expect(platformFromSlug(p.toLowerCase())).toBe(p);
    }
    expect(platformFromSlug('meta')).toBeNull();
    expect(platformFromSlug('linkedin')).toBeNull();
  });
});

describe('state and PKCE', () => {
  it('round-trips and rejects tampering, expiry and other secrets', () => {
    const now = Date.now();
    const s = signOAuthState({ platform: 'X', userId: 'u1', nonce: 'n1' }, SECRET, now);
    expect(verifyOAuthState(s, SECRET, now)).toEqual({ platform: 'X', userId: 'u1', nonce: 'n1' });
    expect(verifyOAuthState(s, 'other', now)).toBeNull();
    expect(verifyOAuthState(`${s}x`, SECRET, now)).toBeNull();
    expect(verifyOAuthState(s, SECRET, now + 31 * 60_000)).toBe('expired');
    expect(verifyOAuthState('', SECRET)).toBeNull();
  });
  it('PKCE verifier is stable per nonce, secret-bound, and the challenge is S256', () => {
    const v = pkceVerifier('n1', SECRET);
    expect(v).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(pkceVerifier('n1', SECRET)).toBe(v);
    expect(pkceVerifier('n1', 'other')).not.toBe(v);
    expect(pkceChallenge(v)).toBe(crypto.createHash('sha256').update(v).digest('base64url'));
  });
});

describe('text length per platform', () => {
  it('X counts links as 23, emoji as 2, CJK as 2', () => {
    expect(xLength('hello')).toBe(5);
    expect(xLength('see https://nafaa.pk/pricing?utm_source=x&utm_medium=social&utm_campaign=a-very-long-campaign')).toBe(4 + 23);
    expect(xLength('😀')).toBe(2);
    expect(xLength('👨‍👩‍👧')).toBe(2);
    expect(xLength('日本')).toBe(4);
    expect(xLength('نفع')).toBe(3);
  });
  it('Threads counts emoji by UTF-8 bytes', () => {
    expect(threadsLength('abc')).toBe(3);
    expect(threadsLength('😀')).toBe(4);
  });
  it('limits: X 280, Threads 500, Pinterest 500, YouTube 5000, TikTok 2200', () => {
    expect(CAPTION_LIMITS.X).toBe(280);
    expect(CAPTION_LIMITS.THREADS).toBe(500);
    expect(CAPTION_LIMITS.PINTEREST).toBe(500);
    expect(CAPTION_LIMITS.YOUTUBE).toBe(5000);
    expect(CAPTION_LIMITS.TIKTOK).toBe(2200);
    expect(platformTextLength('FACEBOOK', '😀')).toBe(2);
  });
  it('validation uses the platform count: a long link does not break X', () => {
    const link = `https://nafaa.pk/${'a'.repeat(300)}`;
    const p = { code: 'c', caption: 'Hi', hashtags: [], link, campaign: null, captions: {}, kind: 'TEXT' as const, platforms: ['X' as const], media: [], firstComment: null };
    expect(validatePost(p).filter((w) => w.code === 'caption_long')).toEqual([]);
    const long = { ...p, link: null, caption: 'a'.repeat(279) + '😀' };
    expect(validatePost(long).map((w) => w.code)).toContain('caption_long');
  });
  it('YouTube warns on non-video kinds', () => {
    const p = { code: 'c', caption: 'Hi', hashtags: [], link: null, campaign: null, captions: {}, kind: 'POST' as const, platforms: ['YOUTUBE' as const], media: [vid()], firstComment: null };
    expect(validatePost(p).map((w) => `${w.code}:${w.level}`)).toContain('youtube_kind:warning');
  });
});

describe('token refresh timing', () => {
  const now = Date.UTC(2026, 10, 13);
  const day = 86_400_000;
  it('Threads: within 7 days of expiry, once the token is a day old', () => {
    expect(needsRefresh('THREADS', new Date(now + 30 * day), new Date(now - 2 * day), now)).toBe(false);
    expect(needsRefresh('THREADS', new Date(now + 5 * day), new Date(now - 2 * day), now)).toBe(true);
    expect(needsRefresh('THREADS', new Date(now + 5 * day), new Date(now - 3600_000), now)).toBe(false);
    expect(needsRefresh('THREADS', new Date(now - 1), new Date(now - 2 * day), now)).toBe(false);
  });
  it('Pinterest within 5 days; short-token platforms every 5 days or when expired', () => {
    expect(needsRefresh('PINTEREST', new Date(now + 4 * day), null, now)).toBe(true);
    expect(needsRefresh('PINTEREST', new Date(now + 20 * day), null, now)).toBe(false);
    expect(needsRefresh('X', new Date(now + 3600_000), new Date(now - day), now)).toBe(false);
    expect(needsRefresh('X', new Date(now - 1), new Date(now - day), now)).toBe(true);
    expect(needsRefresh('YOUTUBE', new Date(now + 3600_000), new Date(now - 6 * day), now)).toBe(true);
  });
});

describe('media routes', () => {
  it('YouTube: only VIDEO / REEL, skipped otherwise', () => {
    expect(youtubeRoute('REEL', [vid()])).toMatchObject({ ok: true });
    expect(youtubeRoute('POST', [vid()])).toMatchObject({ ok: false, skip: true });
    expect(youtubeRoute('VIDEO', [img()])).toMatchObject({ ok: false, skip: false });
    expect(youtubeSafe('a <b> c', 100)).toBe('a b c');
  });
  it('TikTok, X, Pinterest, Threads pick their media', () => {
    expect(tiktokRoute([img(), vid()])).toMatchObject({ ok: true, video: { kind: 'video' } });
    expect(tiktokRoute([])).toMatchObject({ ok: false });
    expect((xRoute([img(), img(), img(), img(), img()]) as { images: unknown[] }).images).toHaveLength(4);
    expect(pinterestRoute([])).toMatchObject({ ok: false });
    expect((pinterestRoute(Array(7).fill(img())) as { images: unknown[] }).images).toHaveLength(5);
    expect(threadsRoute([]).type).toBe('TEXT');
    expect(threadsRoute([vid()]).type).toBe('VIDEO');
    expect(threadsRoute([img(), vid()]).type).toBe('CAROUSEL');
  });
});

describe('upload chunking', () => {
  const MB = 1024 * 1024;
  it('TikTok: one piece under the chunk size, count rounded down, last takes the rest', () => {
    expect(tiktokChunks(3 * MB)).toEqual({ chunkSize: 3 * MB, ranges: [[0, 3 * MB - 1]] });
    const big = tiktokChunks(50_000_123, 10_000_000);
    expect(big.ranges).toHaveLength(5);
    expect(big.ranges[4]).toEqual([40_000_000, 50_000_122]);
  });
  it('X: even 4 MB pieces', () => {
    expect(evenChunks(9 * MB)).toEqual([[0, 4 * MB - 1], [4 * MB, 8 * MB - 1], [8 * MB, 9 * MB - 1]]);
  });
});

describe('adapter selection and errors', () => {
  const acc = (platform: string, status: string, autoPublish: boolean) => ({ platform, status, autoPublish });
  it('OAuth platforms publish automatically when connected with auto-publish on', () => {
    for (const p of OAUTH_PLATFORMS) {
      expect(isApiPlatform(p)).toBe(true);
      expect(dispatchFor(p, [acc(p, 'CONNECTED', true)])).toEqual({ action: 'auto' });
      expect(dispatchFor(p, [acc(p, 'CONNECTED', false)])).toEqual({ action: 'handoff' });
      expect(dispatchFor(p, [acc(p, 'MANUAL', false)])).toEqual({ action: 'handoff' });
      expect(dispatchFor(p, [acc(p, 'NEEDS_RECONNECT', true)]).action).toBe('fail');
    }
    expect(dispatchFor('LINKEDIN', [acc('LINKEDIN', 'CONNECTED', true)])).toEqual({ action: 'handoff' });
  });
  it('sorts platform errors into publisher kinds', () => {
    expect(kindOf(401, '', '')).toBe('token');
    expect(kindOf(400, 'invalid_grant', 'bad refresh token')).toBe('token');
    expect(kindOf(402, 'CreditsDepleted', '')).toBe('plan');
    expect(kindOf(403, 'client-not-enrolled', '')).toBe('plan');
    expect(kindOf(403, '', 'The request cannot be completed because you have exceeded your quota.')).toBe('rate_limit');
    expect(kindOf(429, '', '')).toBe('rate_limit');
    expect(kindOf(503, '', '')).toBe('transient');
    expect(kindOf(403, 'spam_risk_too_many_posts', '')).toBe('permission');
    expect(errorParts({ error: { code: 'access_token_invalid', message: 'expired' } })).toEqual({ message: 'expired', code: 'access_token_invalid' });
    expect(errorParts({ title: 'CreditsDepleted', detail: 'No credits', status: 402 }).message).toBe('No credits');
  });
});
