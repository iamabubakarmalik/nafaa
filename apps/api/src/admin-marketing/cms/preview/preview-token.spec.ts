/**
 * Preview tokens (API-CONTRACT 7): signing, verification and the scope rules
 * of CmsPreviewService. A token must name one entry, carry the preview scope,
 * be signed with the server secret and not be expired.
 */
import { createHmac } from 'crypto';
import { PREVIEW } from '../contract/cms-contract';
import type { CmsPathService } from '../paths/cms-path.service';
import { CmsPreviewService } from './cms-preview.service';
import { signPreviewToken, verifyPreviewToken } from './preview-token';

const SECRET = 'test-preview-secret';
const NOW = 1_800_000_000;

function b64(value: unknown): string {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
}

function forge(header: unknown, payload: unknown, secret = SECRET): string {
  const input = `${b64(header)}.${b64(payload)}`;
  return `${input}.${createHmac('sha256', secret).update(input).digest('base64url')}`;
}

describe('preview tokens', () => {
  const claims = { sub: 'entry-1', scope: PREVIEW.tokenScope, exp: NOW + 3600 };

  it('round-trips and returns only the known claims', () => {
    const token = signPreviewToken(SECRET, claims);
    expect(verifyPreviewToken(SECRET, token, NOW)).toEqual(claims);
    const withExtra = forge({ alg: 'HS256', typ: 'JWT' }, { ...claims, role: 'SUPER_ADMIN', path: '/admin' });
    expect(verifyPreviewToken(SECRET, withExtra, NOW)).toEqual(claims);
  });

  it('rejects a wrong secret, a changed payload or a changed signature', () => {
    const token = signPreviewToken(SECRET, claims);
    expect(verifyPreviewToken('other-secret', token, NOW)).toBeNull();

    const [h, , s] = token.split('.');
    const otherEntry = `${h}.${b64({ ...claims, sub: 'entry-2' })}.${s}`;
    expect(verifyPreviewToken(SECRET, otherEntry, NOW)).toBeNull();

    const flipped = `${token.slice(0, -2)}${token.endsWith('AA') ? 'BB' : 'AA'}`;
    expect(verifyPreviewToken(SECRET, flipped, NOW)).toBeNull();
  });

  it('rejects expired tokens, including exp equal to now', () => {
    expect(verifyPreviewToken(SECRET, signPreviewToken(SECRET, { ...claims, exp: NOW }), NOW)).toBeNull();
    expect(verifyPreviewToken(SECRET, signPreviewToken(SECRET, { ...claims, exp: NOW - 1 }), NOW)).toBeNull();
  });

  it('rejects other scopes and malformed claims even when correctly signed', () => {
    const header = { alg: 'HS256', typ: 'JWT' };
    expect(verifyPreviewToken(SECRET, forge(header, { ...claims, scope: 'access' }), NOW)).toBeNull();
    expect(verifyPreviewToken(SECRET, forge(header, { scope: PREVIEW.tokenScope, exp: NOW + 60 }), NOW)).toBeNull();
    expect(verifyPreviewToken(SECRET, forge(header, { ...claims, exp: String(NOW + 60) }), NOW)).toBeNull();
    expect(verifyPreviewToken(SECRET, forge(header, { ...claims, sub: 42 }), NOW)).toBeNull();
    expect(verifyPreviewToken(SECRET, forge(header, 'not json'), NOW)).toBeNull();
  });

  it('rejects other algorithms and header tricks (alg none, key swap)', () => {
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.`;
    expect(verifyPreviewToken(SECRET, unsigned, NOW)).toBeNull();
    expect(verifyPreviewToken(SECRET, forge({ alg: 'HS512', typ: 'JWT' }, claims), NOW)).toBeNull();
    expect(verifyPreviewToken(SECRET, forge({ typ: 'JWT', alg: 'HS256' }, claims), NOW)).toBeNull();
  });

  it('rejects malformed strings without throwing', () => {
    for (const bad of ['', 'abc', 'a.b', 'a.b.c.d', '..', `${'x'.repeat(5000)}.y.z`]) {
      expect(verifyPreviewToken(SECRET, bad, NOW)).toBeNull();
    }
  });

  it('does not accept an app login token signed with the same secret', () => {
    const appToken = forge({ alg: 'HS256', typ: 'JWT' }, { sub: 'user-1', role: 'SUPER_ADMIN', exp: NOW + 60 });
    expect(verifyPreviewToken(SECRET, appToken, NOW)).toBeNull();
  });
});

describe('CmsPreviewService', () => {
  const paths = { siteUrl: jest.fn(async () => 'https://nafaa.pk') } as unknown as CmsPathService;
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('refuses to sign or verify in production without CMS_PREVIEW_SECRET', async () => {
    process.env = { ...saved, NODE_ENV: 'production', JWT_ACCESS_SECRET: 'jwt' };
    delete process.env.CMS_PREVIEW_SECRET;
    const service = new CmsPreviewService(paths);
    await expect(service.createLink({ id: 'entry-1', locale: 'en', path: '/x' })).rejects.toThrow(/CMS_PREVIEW_SECRET/);
    const devToken = signPreviewToken('anything', { sub: 'entry-1', scope: PREVIEW.tokenScope, exp: Math.floor(Date.now() / 1000) + 60 });
    expect(service.verify(devToken)).toBeNull();
  });

  it('signs links that verify, encode the path and clamp the expiry', async () => {
    process.env = { ...saved, NODE_ENV: 'production', CMS_PREVIEW_SECRET: SECRET, SITE_PREVIEW_URL: 'https://preview.nafaa.pk/' };
    const service = new CmsPreviewService(paths);
    const before = Math.floor(Date.now() / 1000);

    const link = await service.createLink({ id: 'entry-1', locale: 'ur', path: '/pricing' }, 10_000);
    const url = new URL(link.url);
    expect(url.origin).toBe('https://preview.nafaa.pk');
    expect(url.pathname).toBe(PREVIEW.sitePreviewPath);
    expect(url.searchParams.get('path')).toBe('/ur/pricing');

    const verified = service.verify(url.searchParams.get('token') ?? '');
    expect(verified?.entryId).toBe('entry-1');
    const hours = (Date.parse(link.expiresAt) / 1000 - before) / 3600;
    expect(hours).toBeLessThanOrEqual(PREVIEW.maxHours + 0.01);
    expect(hours).toBeGreaterThan(PREVIEW.maxHours - 0.01);

    const short = await service.createLink({ id: 'entry-1', locale: 'en', path: '/' }, 0);
    expect((Date.parse(short.expiresAt) / 1000 - before) / 3600).toBeGreaterThanOrEqual(PREVIEW.minHours - 0.01);
  });

  it('outside production derives a secret, so a token from another secret fails', () => {
    process.env = { ...saved, NODE_ENV: 'development', JWT_ACCESS_SECRET: 'jwt-a' };
    delete process.env.CMS_PREVIEW_SECRET;
    const a = new CmsPreviewService(paths);
    const token = signPreviewToken('jwt-a', { sub: 'entry-1', scope: PREVIEW.tokenScope, exp: Math.floor(Date.now() / 1000) + 60 });
    expect(a.verify(token)).toBeNull();
  });
});
