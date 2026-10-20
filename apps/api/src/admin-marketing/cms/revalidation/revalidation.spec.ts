/**
 * Revalidation (API-CONTRACT 6, ARCH 7.4): HMAC signing, the tag cap, the
 * signed request the API sends to the site, and the publish fan-out.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { Logger } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service';
import { REVALIDATION, revalidateRequestSchema, revalidationSigningInput } from '../contract/cms-contract';
import { CmsFanoutService } from './cms-fanout.service';
import { normalizeTags, signRevalidation, verifyRevalidationSignature } from './revalidation-signing';
import { SiteRevalidationService } from './site-revalidation.service';

beforeAll(() => Logger.overrideLogger(false));

const SECRET = 'site-secret';
const NOW = 1_800_000_000;

/** The site's check (apps/site/src/app/api/revalidate/route.ts), restated to pin the wire format. */
function siteAccepts(secret: string, timestamp: string, rawBody: string, header: string, nowSeconds: number): boolean {
  if (!/^\d{9,11}$/.test(timestamp) || Math.abs(nowSeconds - Number(timestamp)) > REVALIDATION.maxSkewSeconds) return false;
  if (!header.startsWith(REVALIDATION.signaturePrefix)) return false;
  const given = Buffer.from(header.slice(REVALIDATION.signaturePrefix.length), 'hex');
  const expected = createHmac('sha256', secret).update(revalidationSigningInput(timestamp, rawBody)).digest();
  return given.length === expected.length && timingSafeEqual(given, expected);
}

describe('revalidation signing', () => {
  const body = JSON.stringify({ tags: ['page:en:/pricing', 'plans'], reason: 'plans' });

  it('signs `<timestamp>.<rawBody>` as sha256=<hex>', () => {
    const sig = signRevalidation(SECRET, NOW, body);
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(sig).toBe(`sha256=${createHmac('sha256', SECRET).update(`${NOW}.${body}`).digest('hex')}`);
  });

  it('verifies on the API side and on the site side', () => {
    const sig = signRevalidation(SECRET, NOW, body);
    expect(verifyRevalidationSignature(SECRET, NOW, body, sig, NOW)).toBe(true);
    expect(siteAccepts(SECRET, String(NOW), body, sig, NOW)).toBe(true);
  });

  it('rejects a changed body, timestamp, secret or signature', () => {
    const sig = signRevalidation(SECRET, NOW, body);
    expect(verifyRevalidationSignature(SECRET, NOW, body.replace('plans"]', 'all"]'), sig, NOW)).toBe(false);
    expect(verifyRevalidationSignature(SECRET, NOW + 1, body, sig, NOW)).toBe(false);
    expect(verifyRevalidationSignature('other', NOW, body, sig, NOW)).toBe(false);
    expect(verifyRevalidationSignature(SECRET, NOW, body, sig.toUpperCase(), NOW)).toBe(false);
    expect(verifyRevalidationSignature(SECRET, NOW, body, '', NOW)).toBe(false);
    expect(siteAccepts(SECRET, String(NOW), body, sig.replace('sha256=', ''), NOW)).toBe(false);
  });

  it('rejects timestamps outside the ±300 s window', () => {
    const skew = REVALIDATION.maxSkewSeconds;
    const late = signRevalidation(SECRET, NOW - skew - 1, body);
    const early = signRevalidation(SECRET, NOW + skew + 1, body);
    expect(verifyRevalidationSignature(SECRET, NOW - skew - 1, body, late, NOW)).toBe(false);
    expect(verifyRevalidationSignature(SECRET, NOW + skew + 1, body, early, NOW)).toBe(false);
    expect(verifyRevalidationSignature(SECRET, NOW - skew, body, signRevalidation(SECRET, NOW - skew, body), NOW)).toBe(true);
    expect(verifyRevalidationSignature(SECRET, Number.NaN, body, late, NOW)).toBe(false);
    expect(siteAccepts(SECRET, `${NOW}.5`, body, signRevalidation(SECRET, NOW, body), NOW)).toBe(false);
  });

  it('dedupes tags, drops bad ones and collapses to `all` over the cap', () => {
    expect(normalizeTags(['a', 'a', '', 'b'])).toEqual(['a', 'b']);
    expect(normalizeTags(['x'.repeat(REVALIDATION.maxTagLength + 1), 'ok'])).toEqual(['ok']);
    expect(normalizeTags(['page:en:/', 'all'])).toEqual(['all']);
    const many = Array.from({ length: REVALIDATION.maxTags + 1 }, (_, i) => `page:en:/p${i}`);
    expect(normalizeTags(many)).toEqual(['all']);
    expect(normalizeTags(many.slice(0, REVALIDATION.maxTags))).toHaveLength(REVALIDATION.maxTags);
  });
});

describe('SiteRevalidationService', () => {
  const saved = { ...process.env };
  const realFetch = global.fetch;
  const prisma = { cmsRevision: { update: jest.fn(async () => ({})) } } as unknown as PrismaService;
  const fanout = { textMatchTags: jest.fn(async () => ['page:en:/pricing']) } as unknown as CmsFanoutService;

  afterEach(() => {
    process.env = { ...saved };
    global.fetch = realFetch;
  });

  it('sends a body the site schema accepts, signed over the exact bytes sent', async () => {
    process.env = { ...saved, SITE_REVALIDATE_URLS: 'https://site.example/api/revalidate, ftp://bad, ', SITE_REVALIDATE_SECRET: SECRET };
    const calls: { url: string; init: RequestInit }[] = [];
    global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    const service = new SiteRevalidationService(prisma, fanout);
    const heard: string[][] = [];
    service.subscribe((e) => heard.push(e.tags));
    const result = await service.revalidate({ tags: ['page:en:/a', 'page:en:/a', 'sitemap'], reason: 'publish', entryId: 'entry-1', revisionId: 'rev-1' });

    expect(result).toEqual({ ok: true });
    expect(heard).toEqual([['page:en:/a', 'sitemap']]);
    expect(calls).toHaveLength(1);
    const [call] = calls;
    const headers = call?.init.headers as Record<string, string>;
    const rawBody = String(call?.init.body);
    expect(call?.url).toBe('https://site.example/api/revalidate');
    expect(revalidateRequestSchema.safeParse(JSON.parse(rawBody)).success).toBe(true);
    const ts = headers[REVALIDATION.timestampHeader] ?? '';
    expect(siteAccepts(SECRET, ts, rawBody, headers[REVALIDATION.signatureHeader] ?? '', Number(ts))).toBe(true);
    expect(prisma.cmsRevision.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'rev-1' } }));
  });

  it('reports "not configured" without calling out, and still informs listeners', async () => {
    process.env = { ...saved, SITE_REVALIDATE_URLS: '', SITE_REVALIDATE_SECRET: '' };
    global.fetch = jest.fn() as unknown as typeof fetch;
    const service = new SiteRevalidationService(prisma, fanout);
    const listener = jest.fn();
    service.subscribe(listener);
    const result = await service.revalidate({ tags: ['settings'], reason: 'settings' });
    expect(result.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('a throwing listener does not stop delivery', async () => {
    process.env = { ...saved, SITE_REVALIDATE_URLS: 'https://site.example/api/revalidate', SITE_REVALIDATE_SECRET: SECRET };
    global.fetch = jest.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
    const service = new SiteRevalidationService(prisma, fanout);
    service.subscribe(() => {
      throw new Error('boom');
    });
    await expect(service.revalidate({ tags: ['all'], reason: 'manual' })).resolves.toEqual({ ok: true });
  });

  it('does nothing for an empty tag list', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const service = new SiteRevalidationService(prisma, fanout);
    await expect(service.revalidate({ tags: [], reason: 'publish' })).resolves.toEqual({ ok: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('CmsFanoutService.entryTags', () => {
  function db(opts: { inbound?: number; menuMentions?: boolean; textMatches?: number } = {}) {
    return {
      cmsEntryRelation: {
        findMany: jest.fn(async () =>
          Array.from({ length: opts.inbound ?? 0 }, (_, i) => ({ from: { locale: 'en', publishedPath: i % 2 ? `/in/${i}` : null } })),
        ),
      },
      cmsEntry: { findMany: jest.fn(async () => [{ locale: 'en', publishedPath: '/industries' }]) },
      cmsMenu: { findMany: jest.fn(async () => (opts.menuMentions ? [{ items: [{ entryId: 'entry-1' }] }] : [{ items: [] }])) },
      $queryRaw: jest.fn(async () => Array.from({ length: opts.textMatches ?? 0 }, (_, i) => ({ locale: 'en', publishedPath: `/t/${i}`, id: `f${i}` }))),
      cmsEntryFaq: { findMany: jest.fn(async () => []) },
    };
  }

  it('covers old and new paths, type, sitemap, llms, live inbound pages and tree neighbours', async () => {
    const fake = db({ inbound: 4 });
    const service = new CmsFanoutService(fake as unknown as PrismaService);
    const tags = await service.entryTags({ id: 'entry-1', type: 'INDUSTRY', locale: 'en', paths: ['/industries/old', '/industries/new', null] });
    expect(tags).toEqual(
      expect.arrayContaining([
        'page:en:/industries/old',
        'page:en:/industries/new',
        'type:en:INDUSTRY',
        'sitemap',
        'llms',
        'page:en:/in/1',
        'page:en:/in/3',
        'page:en:/industries',
      ]),
    );
    expect(tags).not.toContain('layout:en');
    expect(fake.$queryRaw).not.toHaveBeenCalled();
  });

  it('adds the layout when a menu names the entry, and count-token pages when live state changed', async () => {
    const fake = db({ menuMentions: true, textMatches: 2 });
    const service = new CmsFanoutService(fake as unknown as PrismaService);
    const tags = await service.entryTags({ id: 'entry-1', type: 'INTEGRATION', locale: 'en', paths: ['/integrations/x'], liveStateChanged: true });
    expect(tags).toEqual(expect.arrayContaining(['layout:en', 'page:en:/t/0', 'page:en:/t/1']));
  });

  it('collapses to `all` above the tag cap', async () => {
    const fake = db({ inbound: (REVALIDATION.maxTags + 10) * 2 });
    const service = new CmsFanoutService(fake as unknown as PrismaService);
    await expect(service.entryTags({ id: 'entry-1', type: 'INDUSTRY', locale: 'en', paths: ['/x'] })).resolves.toEqual(['all']);
  });

  it('escapes LIKE wildcards in the text match needle', async () => {
    const fake = db();
    const service = new CmsFanoutService(fake as unknown as PrismaService);
    await service.textMatchTags('price:%_\\');
    const values = (fake.$queryRaw.mock.calls[0] as unknown[]).slice(1);
    expect(values).toContain('%price:\\%\\_\\\\%');
  });
});
