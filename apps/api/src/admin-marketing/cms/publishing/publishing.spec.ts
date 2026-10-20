/**
 * Publishing (ARCH 5.3): version guard, checks gate, the frozen snapshot,
 * the published relation/FAQ index, SLUG_CHANGE redirects, revalidation and
 * IndexNow. Prisma is a fake; nothing touches a database.
 */
import { BadRequestException, Logger } from '@nestjs/common';
import { Prisma, type CmsEntry } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import { PUBLISHED_SNAPSHOT_FORMAT, type PublishedSnapshot } from '../contract/cms-contract';
import type { CmsTokenService } from '../content/cms-token.service';
import type { CmsPathService } from '../paths/cms-path.service';
import type { CmsFanoutService } from '../revalidation/cms-fanout.service';
import type { IndexNowService } from '../revalidation/indexnow.service';
import type { SiteRevalidationService } from '../revalidation/site-revalidation.service';
import type { CheckResult, CmsChecksService } from '../seo/cms-checks.service';
import { entryRow, liveRow, tokenContext } from '../../../../test/cms/fixtures';
import { ChecksFailedException, EntryConflictException } from './cms-errors';
import { CmsPublishingService } from './cms-publishing.service';
import { draftFromRevision, draftHash, draftSnapshotOf, hasUnpublishedChanges, readPublished, stableStringify } from './snapshot';

beforeAll(() => Logger.overrideLogger(false));

function checkResult(overrides: Partial<CheckResult['prepared']> = {}, canPublish = true): CheckResult {
  return {
    issues: canPublish ? [] : [{ code: 'MISSING_TITLE', severity: 'error', message: 'Title zaroori hai' }],
    canPublish,
    report: { score: 90, issues: [], finalTitle: 'T', finalDescription: 'D', robots: { index: true, follow: true }, gate: { words: 300, required: 120 } },
    prepared: {
      template: 'glossary',
      blocks: [{ id: 'blk-rich-1', type: 'richText', markdown: 'Body' }],
      data: { type: 'GLOSSARY_TERM', term: 'GST', definition: 'd', definitionRomanUrdu: 'd', alsoKnownAs: [] },
      dataValid: true,
      seoTitle: 'GST from {{price:min.monthly}}',
      titleIncludesBrand: false,
      description: 'Description',
      robots: { index: true, follow: true },
      quality: { wordCount: 300, gate: 120, passed: true },
      mediaIds: [],
      referencedIds: ['mention-1', 'gone-1'],
      featureStatus: null,
      ...overrides,
    },
  };
}

function setup(row: CmsEntry, opts: { result?: CheckResult; newPath?: string; updatedCount?: number; txError?: unknown } = {}) {
  const tx = {
    cmsFaq: { findMany: jest.fn(async (_args: unknown) => [{ id: 'faq-1' }]), update: jest.fn(async (_args: unknown) => ({})) },
    cmsRevision: { create: jest.fn(async () => ({ id: 'rev-9' })) },
    cmsEntry: {
      updateMany: jest.fn(async () => ({ count: opts.updatedCount ?? 1 })),
      findMany: jest.fn(async ({ where }: { where: { id?: { in: string[] } } }) =>
        where.id ? where.id.in.filter((id) => id !== 'gone-1').map((id) => ({ id })) : [],
      ),
      update: jest.fn(async () => ({})),
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async () => null),
    },
    cmsEntryRelation: { deleteMany: jest.fn(async (_args: unknown) => ({})), createMany: jest.fn(async (_args: unknown) => ({})) },
    cmsEntryFaq: { deleteMany: jest.fn(async () => ({})), createMany: jest.fn(async () => ({})) },
    cmsRedirect: {
      updateMany: jest.fn(async (_args: unknown) => ({ count: 0 })),
      upsert: jest.fn(async ({ create }: { create: Record<string, unknown> }) => ({ id: 'red-1', ...create })),
    },
    seoPage: { upsert: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
    blogPostAnalytics: { upsert: jest.fn(async () => ({})) },
  };
  const prisma = {
    cmsEntry: { findUnique: jest.fn(async () => row) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => {
      if (opts.txError) throw opts.txError;
      return fn(tx);
    }),
  };
  const checks = { run: jest.fn(async (_input: unknown) => opts.result ?? checkResult()) };
  const paths = {
    resolvePath: jest.fn(async () => ({ ok: true, path: opts.newPath ?? row.path })),
    siteUrl: jest.fn(async () => 'https://nafaa.pk'),
  };
  const tokens = { loadContext: jest.fn(async () => tokenContext) };
  const revalidation = { revalidate: jest.fn(async (_input: unknown) => ({ ok: true })) };
  const fanout = { entryTags: jest.fn(async (_input: unknown) => ['page:en:/glossary/gst', 'sitemap']) };
  const indexNow = { enqueue: jest.fn((_urls: string[]) => undefined) };
  const service = new CmsPublishingService(
    prisma as unknown as PrismaService,
    checks as unknown as CmsChecksService,
    paths as unknown as CmsPathService,
    tokens as unknown as CmsTokenService,
    revalidation as unknown as SiteRevalidationService,
    fanout as unknown as CmsFanoutService,
    indexNow as unknown as IndexNowService,
  );
  return { service, prisma, tx, checks, revalidation, fanout, indexNow };
}

function writtenSnapshot(tx: ReturnType<typeof setup>['tx']): PublishedSnapshot {
  const call = tx.cmsEntry.updateMany.mock.calls[0] as unknown as [{ data: { published: PublishedSnapshot } }];
  return call[0].data.published;
}

describe('snapshot helpers', () => {
  it('stableStringify ignores key order and undefined', () => {
    expect(stableStringify({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: undefined } })).toBe(stableStringify({ a: { d: [1, { x: 1, y: 2 }] }, b: 1 }));
  });

  it('draftHash drives hasUnpublishedChanges', () => {
    const draft = draftSnapshotOf(entryRow());
    const row = liveRow({}, { draftHash: draftHash(draft) });
    expect(hasUnpublishedChanges(row, draft)).toBe(false);
    expect(hasUnpublishedChanges(row, { ...draft, title: 'Changed' })).toBe(true);
    expect(hasUnpublishedChanges(entryRow(), draft)).toBe(false);
  });

  it('readPublished rejects missing or unknown snapshot formats', () => {
    expect(readPublished({ published: null })).toBeNull();
    expect(readPublished({ published: { format: 99 } })).toBeNull();
    expect(readPublished(liveRow())?.format).toBe(PUBLISHED_SNAPSHOT_FORMAT);
  });

  it('draftFromRevision copies only draft fields', () => {
    const fallback = draftSnapshotOf(entryRow());
    const restored = draftFromRevision({ title: 'Old', published: { format: 1 }, version: 3, status: 'PUBLISHED' }, fallback);
    expect(restored.title).toBe('Old');
    expect(Object.keys(restored).sort()).toEqual(Object.keys(fallback).sort());
  });
});

describe('CmsPublishingService.publish', () => {
  const draftRow = entryRow({
    version: 3,
    relations: [
      { entryId: 'rel-1', kind: 'RELATED', sortOrder: 0 },
      { entryId: 'entry-1', kind: 'TAG', sortOrder: 1 },
      { entryId: 'gone-1', kind: 'TAG', sortOrder: 2 },
    ],
    faqIds: ['faq-1', 'faq-missing'],
  });

  it('409 on a stale version, before any checks or writes', async () => {
    const { service, checks, prisma } = setup(draftRow);
    await expect(service.publish('entry-1', { version: 2 }, 'u1')).rejects.toBeInstanceOf(EntryConflictException);
    expect(checks.run).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses archived entries', async () => {
    const { service } = setup({ ...draftRow, status: 'ARCHIVED' });
    await expect(service.publish('entry-1', { version: 3 }, 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('422 with the issues when checks fail, and writes nothing', async () => {
    const { service, prisma } = setup(draftRow, { result: checkResult({}, false) });
    const err = await service.publish('entry-1', { version: 3 }, 'u1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChecksFailedException);
    expect(JSON.stringify((err as ChecksFailedException).getResponse())).toContain('MISSING_TITLE');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('freezes the snapshot with a revision, guarded by version, and rebuilds the index', async () => {
    const { service, tx, revalidation, fanout, indexNow, checks } = setup(draftRow);
    const out = await service.publish('entry-1', { version: 3 }, 'u1');
    expect(out).toMatchObject({ entryId: 'entry-1', revisionId: 'rev-9', revalidation: { ok: true } });
    expect(checks.run).toHaveBeenCalledWith(expect.objectContaining({ mode: 'publish' }));

    const update = (tx.cmsEntry.updateMany.mock.calls[0] as unknown as [{ where: unknown; data: Record<string, unknown> }])[0];
    expect(update.where).toEqual({ id: 'entry-1', version: 3 });
    expect(update.data).toMatchObject({ status: 'PUBLISHED', publishedPath: '/glossary/gst', version: 4, hasUnpublishedChanges: false, publishAt: null });

    const snap = writtenSnapshot(tx);
    expect(snap).toMatchObject({ format: PUBLISHED_SNAPSHOT_FORMAT, path: '/glossary/gst', revisionId: 'rev-9', draftHash: draftHash(draftSnapshotOf(draftRow)) });
    expect(snap.seo.title).toBe('GST from {{price:min.monthly}}');
    expect(snap.seo.robots).toEqual({ index: true, follow: true });

    const rev = (tx.cmsRevision.create.mock.calls[0] as unknown as [{ data: { action: string; version: number; snapshot: { published: unknown } } }])[0].data;
    expect(rev).toMatchObject({ action: 'PUBLISH', version: 4 });
    expect(rev.snapshot.published).toBeDefined();

    // Index: existing targets only, never self; MENTIONS from referenced ids; FAQs that exist.
    expect(tx.cmsEntryRelation.deleteMany).toHaveBeenCalledWith({ where: { fromId: 'entry-1' } });
    const relRows = (tx.cmsEntryRelation.createMany.mock.calls[0] as unknown as [{ data: { toId: string; kind: string }[] }])[0].data;
    expect(relRows).toEqual([expect.objectContaining({ toId: 'rel-1', kind: 'RELATED' }), expect.objectContaining({ toId: 'mention-1', kind: 'MENTIONS' })]);
    const faqRows = (tx.cmsEntryFaq.createMany.mock.calls[0] as unknown as [{ data: { faqId: string }[] }])[0].data;
    expect(faqRows.map((f) => f.faqId)).toEqual(['faq-1']);

    expect(tx.cmsRedirect.upsert).not.toHaveBeenCalled();
    expect(fanout.entryTags).toHaveBeenCalledWith(expect.objectContaining({ id: 'entry-1', liveStateChanged: true }));
    expect(revalidation.revalidate).toHaveBeenCalledWith(expect.objectContaining({ reason: 'publish', revisionId: 'rev-9', tags: ['page:en:/glossary/gst', 'sitemap'] }));
    expect(indexNow.enqueue).toHaveBeenCalledWith(['https://nafaa.pk/glossary/gst']);
  });

  it('a concurrent save between load and write is a 409', async () => {
    const { service } = setup(draftRow, { updatedCount: 0 });
    await expect(service.publish('entry-1', { version: 3 }, 'u1')).rejects.toBeInstanceOf(EntryConflictException);
  });

  it('a unique-path clash in the transaction is a 409, not a 500', async () => {
    const clash = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
    const { service } = setup(draftRow, { txError: clash });
    await expect(service.publish('entry-1', { version: 3 }, 'u1')).rejects.toBeInstanceOf(EntryConflictException);
  });

  it('a path change on a live entry creates a SLUG_CHANGE 301 and repoints chains', async () => {
    const live = liveRow({ version: 5, slug: 'gst-new', path: '/glossary/gst-new', publishedPath: '/glossary/gst' });
    const { service, tx, fanout, indexNow } = setup(live, { newPath: '/glossary/gst-new' });
    const out = await service.publish('entry-1', { version: 5 }, 'u1');

    expect(tx.cmsRedirect.updateMany).toHaveBeenCalledWith({ where: { fromPath: '/glossary/gst-new', isPattern: false, isActive: true }, data: expect.objectContaining({ isActive: false }) });
    expect(tx.cmsRedirect.updateMany).toHaveBeenCalledWith({ where: { toPath: '/glossary/gst' }, data: { toPath: '/glossary/gst-new' } });
    expect(tx.cmsRedirect.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { fromPath: '/glossary/gst' }, create: expect.objectContaining({ toPath: '/glossary/gst-new', statusCode: 301, source: 'SLUG_CHANGE' }) }),
    );
    expect(out.redirectCreated).toMatchObject({ from: '/glossary/gst', to: '/glossary/gst-new', status: 301 });
    expect(fanout.entryTags).toHaveBeenCalledWith(expect.objectContaining({ paths: expect.arrayContaining(['/glossary/gst', '/glossary/gst-new']), liveStateChanged: false }));
    expect(indexNow.enqueue).toHaveBeenCalledWith(['https://nafaa.pk/glossary/gst-new', 'https://nafaa.pk/glossary/gst']);
  });

  it('localizes redirect paths for non-default locales', async () => {
    const live = liveRow({ locale: 'ur', version: 1, slug: 'b', path: '/glossary/b', publishedPath: '/glossary/a' });
    const { service, tx } = setup(live, { newPath: '/glossary/b' });
    await service.publish('entry-1', { version: 1 }, 'u1');
    expect(tx.cmsRedirect.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { fromPath: '/ur/glossary/a' } }));
  });

  it('a first publish that is noindex does not ping IndexNow', async () => {
    const { service, indexNow } = setup(draftRow, { result: checkResult({ robots: { index: false, follow: true, reason: 'quality_gate' } }) });
    await service.publish('entry-1', { version: 3 }, 'u1');
    expect(indexNow.enqueue).not.toHaveBeenCalled();
  });

  it('publishFaqs publishes only attached FAQs in the entry locale', async () => {
    const { service, tx } = setup(draftRow);
    tx.cmsFaq.findMany.mockResolvedValueOnce([{ id: 'faq-1', status: 'DRAFT', hasUnpublishedChanges: false, question: 'Q', answer: 'A' }] as never);
    await service.publish('entry-1', { version: 3, publishFaqs: true }, 'u1');
    const where = (tx.cmsFaq.findMany.mock.calls[0] as unknown as [{ where: unknown }])[0].where;
    expect(where).toEqual({ id: { in: ['faq-1', 'faq-missing'] }, locale: 'en' });
    expect(tx.cmsFaq.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'faq-1' }, data: expect.objectContaining({ status: 'PUBLISHED', publishedQuestion: 'Q', publishedAnswer: 'A' }) }));
  });
});
