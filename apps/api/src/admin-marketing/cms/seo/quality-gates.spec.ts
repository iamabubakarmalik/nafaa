/**
 * Publish checks and quality gates (ARCH 5.5, API-CONTRACT 8 issue codes).
 *
 * Runs the real CmsChecksService and CmsContentService over a fake Prisma
 * client: hard errors block publish; the word gate, similarity, editor
 * noindex and feature status `coming` force noindex but still allow publish.
 */
import { Logger } from '@nestjs/common';
import type { CmsEntry } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import { BLOCK_TYPES, CMS_ENTRY_TYPES, isBlockAllowed, type CmsEntryType, type Issue } from '../contract/cms-contract';
import { CmsContentService } from '../content/cms-content.service';
import type { CmsTokenService } from '../content/cms-token.service';
import { draftSnapshotOf } from '../publishing/snapshot';
import { entryRow, liveRow, tokenContext, words } from '../../../../test/cms/fixtures';
import { CmsChecksService, type CheckMode } from './cms-checks.service';

interface FakeOptions {
  /** Rows findable by id (links, relations, people, parent). */
  entries?: CmsEntry[];
  /** Live rows of the same type (similarity). */
  sameType?: CmsEntry[];
  /** Rows returned by the duplicate-title query. */
  titles?: { title: string; seoTitle: string | null }[];
  settings?: Record<string, unknown>;
  testimonials?: unknown[];
}

function fakes(opts: FakeOptions = {}) {
  const db = {
    cmsMedia: { findMany: jest.fn(async () => []) },
    cmsEntry: {
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if ('faqIds' in where) return [];
        if ('type' in where && 'publishedPath' in where) return opts.sameType ?? [];
        const ids = ((where.id as { in?: string[] } | undefined)?.in ?? []) as string[];
        return (opts.entries ?? []).filter((e) => ids.includes(e.id));
      }),
    },
    cmsFaq: { findMany: jest.fn(async () => []) },
    cmsEntryRelation: { count: jest.fn(async () => 5) },
    $queryRaw: jest.fn(async () => opts.titles ?? []),
    cmsCustomer: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    cmsTestimonial: { findMany: jest.fn(async () => opts.testimonials ?? []) },
  };
  const tokens = {
    loadContext: jest.fn(async () => tokenContext),
    settingValue: jest.fn(async (key: string) => opts.settings?.[key] ?? null),
  };
  const prisma = db as unknown as PrismaService;
  const content = new CmsContentService(prisma, tokens as unknown as CmsTokenService);
  const checks = new CmsChecksService(prisma, content, tokens as unknown as CmsTokenService);
  return { db, checks };
}

const glossaryData = { type: 'GLOSSARY_TERM', term: 'GST', definition: 'General sales tax on goods.', definitionRomanUrdu: 'Maal par sales tax.' };

function glossary(markdown: string, overrides: Partial<CmsEntry> = {}): CmsEntry {
  return entryRow({
    title: 'GST',
    data: glossaryData,
    blocks: [{ id: 'blk-rich-1', type: 'richText', markdown }],
    ...overrides,
  });
}

async function run(row: CmsEntry, opts: FakeOptions = {}, mode: CheckMode = 'publish') {
  const { checks, db } = fakes(opts);
  const result = await checks.run({ entry: row, draft: draftSnapshotOf(row), path: row.path, mode }, db as unknown as PrismaService);
  const codes = (severity: Issue['severity']) => result.issues.filter((i) => i.severity === severity).map((i) => i.code);
  return { result, errors: codes('error'), warnings: codes('warning'), db };
}

beforeAll(() => Logger.overrideLogger(false));

describe('quality gate', () => {
  it('below the gate: publishable, but noindex with reason quality_gate', async () => {
    const { result, errors, warnings } = await run(glossary(words(30)));
    expect(errors).toEqual([]);
    expect(result.canPublish).toBe(true);
    expect(warnings).toContain('WORDS_BELOW_GATE');
    expect(result.prepared.robots).toEqual({ index: false, follow: true, reason: 'quality_gate' });
    expect(result.prepared.quality).toMatchObject({ gate: 120, passed: false });
  });

  it('above the gate: indexable', async () => {
    const { result, warnings } = await run(glossary(words(300)));
    expect(warnings).not.toContain('WORDS_BELOW_GATE');
    expect(result.prepared.robots).toEqual({ index: true, follow: true });
    expect(result.prepared.quality.passed).toBe(true);
  });

  it('gates from settings seo.qualityGates override the defaults', async () => {
    const settings = { seo: { titleTemplate: '%s | Nafaa', qualityGates: { GLOSSARY_TERM: { minWords: 500 } } } };
    const { result } = await run(glossary(words(300)), { settings });
    expect(result.prepared.quality).toMatchObject({ gate: 500, passed: false });
    expect(result.prepared.robots.reason).toBe('quality_gate');
  });

  it('hidden blocks do not count towards the gate', async () => {
    const row = glossary(words(30), {
      blocks: [
        { id: 'blk-rich-1', type: 'richText', markdown: words(30) },
        { id: 'blk-rich-2', type: 'richText', markdown: words(500, 'h'), hidden: true },
      ],
    });
    const { result } = await run(row);
    expect(result.prepared.quality.passed).toBe(false);
    expect(result.prepared.blocks.map((b) => b.id)).toEqual(['blk-rich-1']);
  });

  it('editor noindex wins over every other reason', async () => {
    const { result } = await run(glossary(words(30), { noindex: true }));
    expect(result.prepared.robots).toMatchObject({ index: false, reason: 'editor' });
  });
});

describe('similarity gate', () => {
  const settings = { seo: { titleTemplate: '%s | Nafaa', qualityGates: { GLOSSARY_TERM: { minWords: 10, similarityMax: 0.5 } } } };
  const text = words(200);

  it('near-duplicate text of another live entry forces noindex (reason similarity)', async () => {
    const twin = liveRow({ id: 'twin', slug: 'twin', path: '/glossary/twin', publishedPath: '/glossary/twin', title: 'Twin' }, {
      id: 'twin',
      summary: null,
      blocks: [{ id: 'blk-twin-1', type: 'richText', markdown: text }],
      data: { ...glossaryData, alsoKnownAs: [] } as never,
    });
    const { result, warnings, errors } = await run(glossary(text), { settings, sameType: [twin] });
    expect(errors).toEqual([]);
    expect(warnings).toContain('SIMILARITY');
    expect(result.prepared.robots.reason).toBe('similarity');
    expect(result.prepared.quality.similarity).toBeGreaterThanOrEqual(0.5);
  });

  it('different text passes, and preview mode skips the cross-entry query', async () => {
    const other = liveRow({ id: 'other', slug: 'other', path: '/glossary/other', publishedPath: '/glossary/other' }, {
      id: 'other',
      blocks: [{ id: 'blk-oth-1', type: 'richText', markdown: words(200, 'z') }],
    });
    const { result } = await run(glossary(text), { settings, sameType: [other] });
    expect(result.prepared.robots.index).toBe(true);

    const preview = await run(glossary(text), { settings, sameType: [other] }, 'preview');
    const sameTypeQueries = preview.db.cmsEntry.findMany.mock.calls.filter((c) => {
      const where = (c as unknown as [{ where: Record<string, unknown> }])[0].where;
      return 'type' in where && 'publishedPath' in where;
    });
    expect(sameTypeQueries).toHaveLength(0);
    expect(preview.db.$queryRaw).not.toHaveBeenCalled();
  });
});

describe('hard errors', () => {
  it('missing title', async () => {
    const { errors, result } = await run(glossary(words(300), { title: '   ' }));
    expect(errors).toContain('MISSING_TITLE');
    expect(result.canPublish).toBe(false);
  });

  it('duplicate final title among indexable live entries; skipped when the page is noindex', async () => {
    const titles = [{ title: 'Other GST page', seoTitle: 'What is GST? Meaning in Urdu & Business Use' }];
    const dup = await run(glossary(words(300)), { titles });
    expect(dup.errors).toContain('DUPLICATE_TITLE');

    const below = await run(glossary(words(30)), { titles });
    expect(below.errors).not.toContain('DUPLICATE_TITLE');
  });

  it('broken entry: links (missing or not live) and unknown tokens', async () => {
    const draftTarget = entryRow({ id: 'draft-target', title: 'Not live', path: '/glossary/x' });
    const md = `${words(200)} [a](entry:draft-target) [b](entry:missing-one) {{price:gold.monthly}} {{nope}}`;
    const { errors, result } = await run(glossary(md), { entries: [draftTarget] });
    expect(errors.filter((c) => c === 'BROKEN_LINK')).toHaveLength(2);
    expect(errors.filter((c) => c === 'UNKNOWN_TOKEN')).toHaveLength(2);
    expect(result.canPublish).toBe(false);
  });

  it('H1 or skipped heading levels in Markdown', async () => {
    const { errors } = await run(glossary(`# Big\n\n${words(200)}\n\n## A\n\n#### Deep`));
    expect(errors.filter((c) => c === 'HEADING_LEVEL').length).toBeGreaterThanOrEqual(2);
  });

  it('blocks not allowed on the type; hidden ones are ignored', async () => {
    const notAllowed = BLOCK_TYPES.find((b) => !isBlockAllowed('GLOSSARY_TERM', b));
    if (!notAllowed) throw new Error('every block is allowed on GLOSSARY_TERM');
    const rich = { id: 'blk-rich-1', type: 'richText', markdown: words(300) };
    const row = glossary(words(300), { blocks: [rich, { id: 'blk-bad-01', type: notAllowed }] });
    expect((await run(row)).errors).toContain('BLOCK_NOT_ALLOWED');
    const hidden = glossary(words(300), { blocks: [rich, { id: 'blk-bad-01', type: notAllowed, hidden: true }] });
    const { errors } = await run(hidden);
    expect(errors).not.toContain('BLOCK_NOT_ALLOWED');
    expect(errors).not.toContain('INVALID_BLOCK');
  });

  it('invalid entry data', async () => {
    const { errors } = await run(glossary(words(300), { data: { type: 'GLOSSARY_TERM', term: '' } }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((c) => c === 'INVALID_DATA' || c === 'MISSING_DATA')).toBe(true);
  });

  it('fact-check stamp on COMPARE / ALTERNATIVE / BEST_OF / COMPLIANCE', async () => {
    for (const type of ['COMPARE', 'ALTERNATIVE', 'BEST_OF', 'COMPLIANCE'] as CmsEntryType[]) {
      const { errors } = await run(entryRow({ type, title: 'A title for this page', summary: words(50), data: {}, blocks: [] }));
      expect(errors).toContain('NOT_FACT_CHECKED');
    }
  });

  it('picked testimonials need QUOTE consent from a public customer', async () => {
    const type = CMS_ENTRY_TYPES.find((t) => isBlockAllowed(t, 'testimonial'));
    if (!type) throw new Error('no type allows testimonial');
    const block = { id: 'blk-tst-01', type: 'testimonial', mode: 'pick', ids: ['t1'] };
    const testimonials = [{ id: 't1', status: 'PUBLISHED', customer: { consentScope: ['NAME'], consentAt: new Date(), isPublic: true } }];
    const { errors } = await run(entryRow({ type, title: 'Some page title here', summary: words(50), blocks: [block] }), { testimonials });
    expect(errors).toContain('NO_CONSENT');
  });

  it('money types need a summary', async () => {
    const { errors } = await run(entryRow({ type: 'INTEGRATION', title: 'Some integration', data: { type: 'INTEGRATION', status: 'coming', category: 'Payments' } }));
    expect(errors).toContain('MISSING_SUMMARY');
  });
});

describe('feature status and "real only" rules', () => {
  it('coming integrations are noindex with reason coming, even above the gate', async () => {
    const row = entryRow({
      type: 'INTEGRATION',
      title: 'Payments integration for shops',
      summary: words(50),
      data: { type: 'INTEGRATION', status: 'coming', category: 'Payments' },
      blocks: [],
    });
    const { result } = await run(row);
    expect(result.prepared.featureStatus).toBe('coming');
    expect(result.prepared.robots).toMatchObject({ index: false, reason: 'coming' });
  });

  it('a typed Rs amount raises TYPED_PRICE', async () => {
    const { warnings } = await run(glossary(`${words(200)} Only Rs 1500 a month.`));
    expect(warnings).toContain('TYPED_PRICE');
  });

  /**
   * Finding (contract owner + A1 checks + S1 graph.ts): ARCH 5.6 says no
   * AggregateRating or review schema anywhere, but `schemaExtra` is merged
   * into the page graph verbatim and nothing checks it. Flip to `it` once
   * publish refuses rating/review nodes in schemaExtra.
   */
  it.failing('schemaExtra cannot add AggregateRating or Review nodes', async () => {
    const schemaExtra = [{ '@type': 'Product', name: 'Nafaa', aggregateRating: { '@type': 'AggregateRating', ratingValue: 5, reviewCount: 999 } }];
    const { errors } = await run(glossary(words(300), { schemaExtra }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('tokens are kept in the prepared title and description (resolved at read time)', async () => {
    const { result } = await run(glossary(words(300), { seoTitle: 'GST from {{price:min.monthly}} a month' }));
    expect(result.prepared.seoTitle).toBe('GST from {{price:min.monthly}} a month');
    expect(result.report.finalTitle).toBe('GST from Rs 1,500 a month');
  });
});
