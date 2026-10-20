/**
 * Public read filters (ARCH 7.2, API-CONTRACT 2): only live snapshots,
 * never draft fields; preview tokens open exactly one entry's draft; list,
 * sitemap and search endpoints honour feature status and robots; customers
 * and testimonials show only what consent allows.
 */
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { CmsEntry } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { PublicEntry } from '../contract/cms-contract';
import type { CmsContentService, CmsTokenService } from '../content';
import type { CmsMenusService } from '../menus/cms-menus.service';
import type { CmsPreviewService } from '../preview/cms-preview.service';
import type { CmsRedirectsService } from '../redirects/cms-redirects.service';
import type { CmsChecksService } from '../seo/cms-checks.service';
import type { CmsSettingsService } from '../settings/cms-settings.service';
import { entryRow, liveRow, publishedSnapshot } from '../../../../test/cms/fixtures';
import type { CmsCardsService, LiveEntry } from './cms-cards.service';
import type { CmsPublicCacheService } from './cms-public-cache.service';
import { CmsPublicEntryService } from './cms-public-entry.service';
import { CmsPublicService } from './cms-public.service';
import { LIVE_WHERE, isIndexable, publishedContent, type EntryRow } from './cms-snapshot';

function live(row: CmsEntry): LiveEntry {
  const content = publishedContent(row);
  if (!content) throw new Error('fixture is not live');
  return { row: row as EntryRow, content };
}

describe('publishedContent', () => {
  it('serves the snapshot, never the draft columns', () => {
    const row = liveRow({ title: 'Draft title', summary: 'Draft summary', blocks: [{ id: 'blk-draft-1', type: 'richText', markdown: 'DRAFT ONLY' }] });
    const content = publishedContent(row);
    expect(content?.title).toBe('GST (live)');
    expect(content?.summary).toBe('Live summary');
    expect(JSON.stringify(content)).not.toContain('DRAFT ONLY');
    expect(JSON.stringify(content)).not.toContain('Draft title');
  });

  it('does not expose the focus keyword or the draft hash', () => {
    const json = JSON.stringify(publishedContent(liveRow()));
    expect(json).not.toContain('internal keyword');
    expect(json).not.toContain('hash-0');
  });

  it('drops hidden blocks even if a snapshot holds one', () => {
    const row = liveRow({}, { blocks: [{ id: 'blk-a-0001', type: 'richText', markdown: 'shown' }, { id: 'blk-b-0001', type: 'richText', markdown: 'secret', hidden: true }] });
    expect(publishedContent(row)?.blocks.map((b) => b.id)).toEqual(['blk-a-0001']);
  });

  it('returns null when the entry is not live or the snapshot format is unknown', () => {
    expect(publishedContent(entryRow())).toBeNull();
    expect(publishedContent({ ...liveRow(), publishedPath: null })).toBeNull();
    expect(publishedContent({ ...liveRow(), published: { ...publishedSnapshot(), format: 2 } as unknown as CmsEntry['published'] })).toBeNull();
  });

  it('LIVE_WHERE needs a published path and a PUBLISHED or SCHEDULED status', () => {
    expect(LIVE_WHERE).toEqual({ publishedPath: { not: null }, status: { in: ['PUBLISHED', 'SCHEDULED'] } });
  });

  it('indexable means robots index and a self canonical', () => {
    const content = publishedContent(liveRow());
    if (!content) throw new Error('fixture');
    expect(isIndexable(content)).toBe(true);
    expect(isIndexable({ ...content, robots: { index: false, follow: true, reason: 'quality_gate' } })).toBe(false);
    expect(isIndexable({ ...content, canonicalUrl: 'https://nafaa.pk/other' })).toBe(false);
  });
});

describe('CmsPublicEntryService preview scope', () => {
  const draftA = entryRow({ id: 'entry-a', path: '/glossary/a', title: 'A draft', status: 'DRAFT' });
  const liveB = liveRow({ id: 'entry-b', slug: 'b', path: '/glossary/b', publishedPath: '/glossary/b' });

  function setup(tokenEntry: string | null, rows: CmsEntry[] = [draftA, liveB]) {
    const prisma = {
      cmsEntry: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id) ?? null),
        findFirst: jest.fn(async ({ where }: { where: { AND: [unknown, { locale: string; publishedPath: string }] } }) => {
          const { locale, publishedPath } = where.AND[1];
          return rows.find((r) => r.locale === locale && r.publishedPath === publishedPath && ['PUBLISHED', 'SCHEDULED'].includes(r.status)) ?? null;
        }),
      },
    };
    const previews = { verify: jest.fn(() => (tokenEntry ? { entryId: tokenEntry, expiresAt: '2026-10-27T00:00:00.000Z' } : null)) };
    const checks = { run: jest.fn(async (_input: unknown) => ({ prepared: null })) };
    const service = new CmsPublicEntryService(
      prisma as unknown as PrismaService,
      {} as CmsCardsService,
      {} as CmsContentService,
      {} as CmsSettingsService,
      checks as unknown as CmsChecksService,
      previews as unknown as CmsPreviewService,
    );
    const build = jest
      .spyOn(service, 'build')
      .mockImplementation(async (row, _content, mode) => ({ id: row.id, path: mode === 'draft' ? row.path : row.publishedPath, mode }) as unknown as PublicEntry);
    return { service, build, prisma, checks };
  }

  it('rejects bad tokens with 401', async () => {
    const { service } = setup(null);
    await expect(service.previewPage('bad-token-xx', '/glossary/a')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.previewInfo('bad-token-xx')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('previewInfo rejects a token whose entry no longer exists', async () => {
    const { service } = setup('deleted-entry');
    await expect(service.previewInfo('token-xxxxxx')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("renders the token's own entry from its draft, in preview checks mode", async () => {
    const { service, build, checks } = setup('entry-a');
    const page = await service.previewPage('token-xxxxxx', '/glossary/a');
    expect(page).toMatchObject({ id: 'entry-a', preview: true });
    expect(build).toHaveBeenCalledWith(expect.objectContaining({ id: 'entry-a' }), expect.anything(), 'draft');
    expect(checks.run).toHaveBeenCalledWith(expect.objectContaining({ mode: 'preview' }));
  });

  it('a token for one entry never opens the draft of another', async () => {
    const draftC = entryRow({ id: 'entry-c', path: '/glossary/c', status: 'DRAFT' });
    const { service, build } = setup('entry-a', [draftA, liveB, draftC]);
    await expect(service.previewPage('token-xxxxxx', '/glossary/c')).rejects.toBeInstanceOf(NotFoundException);
    const other = await service.previewPage('token-xxxxxx', '/glossary/b');
    expect(other).toMatchObject({ id: 'entry-b', mode: 'published' });
    expect(build).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'entry-c' }), expect.anything(), expect.anything());
  });

  it('does not preview archived entries or another locale of the same path', async () => {
    const archived = entryRow({ id: 'entry-a', path: '/glossary/a', status: 'ARCHIVED' });
    const { service } = setup('entry-a', [archived]);
    await expect(service.previewPage('token-xxxxxx', '/glossary/a')).rejects.toBeInstanceOf(NotFoundException);
    const { service: s2, build } = setup('entry-a');
    await expect(s2.previewPage('token-xxxxxx', '/ur/glossary/a')).rejects.toBeInstanceOf(NotFoundException);
    expect(build).not.toHaveBeenCalled();
  });

  it('byPath reads live rows only', async () => {
    const { service, prisma } = setup(null);
    await expect(service.byPath('/glossary/a', 'en')).resolves.toBeNull();
    const where = (prisma.cmsEntry.findFirst.mock.calls[0] as unknown as [{ where: { AND: unknown[] } }])[0].where;
    expect(where.AND[0]).toBe(LIVE_WHERE);
  });
});

describe('CmsPublicService list filters', () => {
  const passThroughCache = { get: <T>(_key: string, load: () => Promise<T>) => load() } as unknown as CmsPublicCacheService;

  function service(entries: LiveEntry[], prisma: Record<string, unknown> = {}) {
    const cards = {
      live: jest.fn(async (_where: unknown) => entries),
      liveByIds: jest.fn(async () => []),
      cards: jest.fn(async (list: LiveEntry[]) => list.map((e) => ({ id: e.row.id, type: e.row.type, title: e.content.title, path: e.row.publishedPath, summary: e.content.summary }))),
      siteUrl: jest.fn(async () => 'https://nafaa.pk'),
      mediaMap: jest.fn(async () => new Map()),
    };
    const svc = new CmsPublicService(
      prisma as unknown as PrismaService,
      passThroughCache,
      cards as unknown as CmsCardsService,
      {} as CmsPublicEntryService,
      {} as CmsSettingsService,
      {} as CmsMenusService,
      {} as CmsRedirectsService,
      {} as CmsTokenService,
    );
    return { svc, cards };
  }

  const integration = (id: string, status: 'live' | 'beta' | 'coming', extra: { featured?: boolean; index?: boolean } = {}) =>
    live(
      liveRow(
        { id, type: 'INTEGRATION', slug: id, path: `/integrations/${id}`, publishedPath: `/integrations/${id}` },
        {
          type: 'INTEGRATION',
          template: 'product',
          title: id,
          featureStatus: status,
          featured: extra.featured ?? false,
          data: { type: 'INTEGRATION', status, category: 'Payments' },
          seo: { ...publishedSnapshot().seo, robots: extra.index === false ? { index: false, follow: true, reason: 'coming' } : { index: true, follow: true } },
        },
      ),
    );

  it('entries filter by feature status and featured, and page with a cursor', async () => {
    const list = [integration('a', 'live', { featured: true }), integration('b', 'beta'), integration('c', 'coming', { index: false }), integration('d', 'coming', { index: false })];
    const { svc, cards } = service(list);

    const roadmap = await svc.entries({ type: 'INTEGRATION', locale: 'en', status: ['coming', 'beta'], sort: 'title', limit: 2 });
    expect(roadmap.items.map((i) => i.id)).toEqual(['b', 'c']);
    expect(roadmap.nextCursor).not.toBeNull();
    const next = await svc.entries({ type: 'INTEGRATION', locale: 'en', status: ['coming', 'beta'], sort: 'title', limit: 2, cursor: roadmap.nextCursor ?? undefined });
    expect(next.items.map((i) => i.id)).toEqual(['d']);
    expect(next.nextCursor).toBeNull();

    const featured = await svc.entries({ type: 'INTEGRATION', locale: 'en', featured: true, sort: 'order', limit: 10 });
    expect(featured.items.map((i) => i.id)).toEqual(['a']);
    expect(cards.live).toHaveBeenCalledWith(expect.objectContaining({ type: 'INTEGRATION', locale: 'en' }));
  });

  it('a garbage cursor starts at the beginning instead of failing', async () => {
    const { svc } = service([integration('a', 'live')]);
    const res = await svc.entries({ type: 'INTEGRATION', locale: 'en', sort: 'order', limit: 5, cursor: 'not-a-cursor' });
    expect(res.items).toHaveLength(1);
  });

  it('search index and sitemap leave out noindex and canonicalised pages', async () => {
    const canonicalised = live(liveRow({ id: 'canon', slug: 'canon', path: '/glossary/canon', publishedPath: '/glossary/canon' }, { seo: { ...publishedSnapshot().seo, canonicalUrl: 'https://nafaa.pk/glossary/gst' } }));
    const list = [integration('a', 'live'), integration('c', 'coming', { index: false }), canonicalised];
    const { svc } = service(list, { cmsEntry: { findMany: jest.fn(async () => []) } });
    const search = await svc.searchIndex('en');
    expect(search.items.map((i) => i.path)).toEqual(['/integrations/a']);
    const sitemap = await svc.sitemap('products', 'en');
    expect(sitemap.items.map((i) => i.url)).toEqual(['https://nafaa.pk/integrations/a']);
  });

  it('paths list only what cards.live returns (live rows)', async () => {
    const { svc } = service([integration('a', 'live')]);
    const res = await svc.paths('INTEGRATION', 'en');
    expect(res.items).toEqual([expect.objectContaining({ path: '/integrations/a', type: 'INTEGRATION', locale: 'en' })]);
  });
});

describe('CmsPublicService consent rules', () => {
  const media = (id: string) => ({
    id, kind: 'IMAGE', publicId: id, url: `https://res.cloudinary.com/x/${id}.png`, width: 10, height: 10, alt: `alt ${id}`, altTranslations: null,
    caption: null, credit: null, sourceUrl: null, blurDataUrl: null, dominantColor: null, focalX: null, focalY: null, mimeType: 'image/png', bytes: 100,
  });

  function svcWith(prisma: Record<string, unknown>) {
    const cards = { liveByIds: jest.fn(async () => []), live: jest.fn(async () => []) };
    return new CmsPublicService(
      prisma as unknown as PrismaService,
      { get: <T>(_k: string, load: () => Promise<T>) => load() } as unknown as CmsPublicCacheService,
      cards as unknown as CmsCardsService,
      {} as CmsPublicEntryService,
      {} as CmsSettingsService,
      {} as CmsMenusService,
      {} as CmsRedirectsService,
      {} as CmsTokenService,
    );
  }

  it('testimonials query only published quotes of public customers with QUOTE consent, and mask by scope', async () => {
    const findMany = jest.fn(async () => [
      {
        id: 't1', quote: 'Q', personName: 'P', personRole: null, sourceType: 'INTERVIEW', sourceUrl: null, collectedAt: null,
        photo: media('photo'),
        customer: { id: 'c1', name: 'Real Shop', consentScope: ['QUOTE'], cityEntryId: null, industryEntryId: null, logo: media('logo') },
      },
    ]);
    const svc = svcWith({ cmsTestimonial: { findMany } });
    const [t] = await svc.testimonials({ locale: 'en' });
    const where = (findMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where;
    expect(where).toMatchObject({ status: 'PUBLISHED', locale: 'en', customer: { isPublic: true, consentAt: { not: null }, consentScope: { has: 'QUOTE' } } });
    expect(t?.customer.name).toBe('');
    expect(t?.customer.logo).toBeNull();
    expect(t?.photo).toBeNull();
    expect(t?.customer.caseStudyPath).toBeNull();
  });

  it('customers query needs public + LOGO consent + a live logo; the name needs NAME consent', async () => {
    const findMany = jest.fn(async () => [
      { id: 'c1', name: 'Real Shop', consentScope: ['LOGO'], website: null, cityEntryId: null, industryEntryId: null, logo: media('logo') },
      { id: 'c2', name: 'Named Shop', consentScope: ['LOGO', 'NAME'], website: null, cityEntryId: null, industryEntryId: null, logo: media('logo2') },
    ]);
    const svc = svcWith({ cmsCustomer: { findMany } });
    const list = await svc.customers({});
    const where = (findMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where;
    expect(where).toMatchObject({ isPublic: true, consentAt: { not: null }, consentScope: { has: 'LOGO' }, logo: { deletedAt: null } });
    expect(list.map((c) => c.name)).toEqual(['alt logo', 'Named Shop']);
  });
});
