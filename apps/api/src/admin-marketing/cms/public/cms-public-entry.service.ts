/**
 * Builds `PublicEntry` (API-CONTRACT 2.3) from a live snapshot, or from the
 * draft for preview links. Direct references come resolved: tokens,
 * `entry:` links, CTA keywords, related and tag cards, author and reviewer,
 * FAQs, media, breadcrumbs, parent/children and translations.
 */
import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CmsStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_LOCALE,
  ENTRY_TYPE_META,
  type Breadcrumb,
  type CmsEntryType,
  type EntryCard,
  type PreviewValidation,
  type PublicEntry,
  type PublicFaq,
  type PublicMedia,
} from '../contract/cms-contract';
import { CmsContentService, type TokenContext } from '../content';
import { absoluteUrl, localizedPath, typeHubPath } from '../paths/cms-paths';
import { CmsPreviewService } from '../preview/cms-preview.service';
import { draftSnapshotOf } from '../publishing/snapshot';
import { CmsChecksService, type PreparedEntry } from '../seo/cms-checks.service';
import { CmsSettingsService } from '../settings/cms-settings.service';
import { CmsCardsService, type LiveEntry } from './cms-cards.service';
import { collectMediaIds } from './cms-media-view';
import { splitLocalePath } from '../redirects/cms-redirects.service';
import {
  ENTRY_ROW_SELECT,
  LIVE_WHERE,
  draftContent,
  publishedContent,
  type ContentMode,
  type EntryContent,
  type EntryRow,
} from './cms-snapshot';

/** Types whose children are listed on the page (DOC tree, PAGE sub-pages). */
const CHILDREN_TYPES: ReadonlySet<CmsEntryType> = new Set(['DOC', 'PAGE']);
const MAX_ANCESTORS = 12;

@Injectable()
export class CmsPublicEntryService {
  private readonly logger = new Logger(CmsPublicEntryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cards: CmsCardsService,
    private readonly content: CmsContentService,
    private readonly settings: CmsSettingsService,
    private readonly checks: CmsChecksService,
    private readonly previews: CmsPreviewService,
  ) {}

  /** The live entry at `path` (no locale prefix), or null. */
  async byPath(path: string, locale: string): Promise<PublicEntry | null> {
    const row = await this.prisma.cmsEntry.findFirst({
      where: { AND: [LIVE_WHERE, { locale, publishedPath: path }] },
      select: ENTRY_ROW_SELECT,
    });
    if (!row) return null;
    const content = publishedContent(row);
    return content ? this.build(row, content, 'published') : null;
  }

  // ─── Preview ───

  private verifyOrThrow(token: string): { entryId: string; expiresAt: string } {
    const verified = this.previews.verify(token);
    if (!verified) throw new UnauthorizedException('Preview link ghalat hai ya expire ho gaya');
    return verified;
  }

  async previewInfo(token: string): Promise<PreviewValidation> {
    const { entryId, expiresAt } = this.verifyOrThrow(token);
    const row = await this.prisma.cmsEntry.findUnique({ where: { id: entryId }, select: { id: true, locale: true, path: true } });
    if (!row) throw new UnauthorizedException('Preview wali entry mojood nahi');
    return { valid: true, entryId: row.id, path: localizedPath(row.locale, row.path), expiresAt };
  }

  /**
   * `path` carries the locale prefix (as in the preview link). The token's
   * entry renders from its draft when the path is its draft path; any other
   * path renders the live page.
   */
  async previewPage(token: string, rawPath: string): Promise<PublicEntry> {
    const { entryId } = this.verifyOrThrow(token);
    const { locale, path } = splitLocalePath(rawPath);
    const full = await this.prisma.cmsEntry.findUnique({ where: { id: entryId } });
    if (full && full.locale === locale && full.path === path && full.status !== CmsStatus.ARCHIVED) {
      let prepared: PreparedEntry | null = null;
      try {
        const result = await this.checks.run({ entry: full, draft: draftSnapshotOf(full), path: full.path, mode: 'preview' });
        prepared = result.prepared;
      } catch (err: unknown) {
        this.logger.warn(`Preview checks failed for ${full.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
      const built = await this.build(full, draftContent(full, prepared), 'draft');
      return { ...built, preview: true };
    }
    const live = await this.byPath(path, locale);
    if (!live) throw new NotFoundException('Is path par koi live page nahi');
    return live;
  }

  // ─── Builder ───

  private async faqs(row: EntryRow, content: EntryContent, mode: ContentMode): Promise<{ id: string; question: string; answer: string; topic: string | null }[]> {
    if (mode === 'published') {
      const indexed = await this.prisma.cmsEntryFaq.findMany({
        where: { entryId: row.id, faq: { status: CmsStatus.PUBLISHED } },
        orderBy: { sortOrder: 'asc' },
        select: { faq: { select: { id: true, publishedQuestion: true, publishedAnswer: true, topic: true } } },
      });
      if (indexed.length > 0 || content.faqIds.length === 0) {
        return indexed
          .filter((x) => x.faq.publishedQuestion && x.faq.publishedAnswer)
          .map((x) => ({ id: x.faq.id, question: x.faq.publishedQuestion as string, answer: x.faq.publishedAnswer as string, topic: x.faq.topic }));
      }
    }
    // Draft preview, or a snapshot whose FAQ index is not built: follow faqIds.
    const rows = await this.prisma.cmsFaq.findMany({ where: { id: { in: content.faqIds } } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const out: { id: string; question: string; answer: string; topic: string | null }[] = [];
    for (const id of content.faqIds) {
      const f = byId.get(id);
      if (!f) continue;
      if (mode === 'draft') out.push({ id: f.id, question: f.question, answer: f.answer, topic: f.topic });
      else if (f.status === CmsStatus.PUBLISHED && f.publishedQuestion && f.publishedAnswer) {
        out.push({ id: f.id, question: f.publishedQuestion, answer: f.publishedAnswer, topic: f.topic });
      }
    }
    return out;
  }

  private async breadcrumbs(row: EntryRow, path: string, title: string, siteUrl: string): Promise<Breadcrumb[]> {
    const locale = row.locale;
    const crumb = (name: string, p: string): Breadcrumb => ({ name, path: p, url: absoluteUrl(siteUrl, locale, p) });
    if (path === '/') return [crumb(title, '/')];

    const out: Breadcrumb[] = [crumb('Home', '/')];
    const seen = new Set<string>(['/']);

    // Ancestors (PAGE, DOC, CITY_INDUSTRY parents), nearest last.
    const ancestors: LiveEntry[] = [];
    let parentId = row.parentId;
    for (let i = 0; parentId && i < MAX_ANCESTORS; i++) {
      const [parent] = await this.cards.liveByIds([parentId]);
      if (!parent) break;
      ancestors.unshift(parent);
      parentId = parent.row.parentId;
    }

    const hub = typeHubPath(row.type);
    if (hub && hub !== path && !ancestors.some((a) => a.row.publishedPath === hub)) {
      const hubLive = await this.prisma.cmsEntry.findFirst({ where: { AND: [LIVE_WHERE, { locale, publishedPath: hub }] }, select: { id: true } });
      if (hubLive) {
        const hubType: CmsEntryType = row.type === 'CITY_INDUSTRY' ? 'CITY' : row.type;
        out.push(crumb(ENTRY_TYPE_META[hubType].labelPlural, hub));
        seen.add(hub);
      }
    }
    for (const a of ancestors) {
      const p = a.row.publishedPath as string;
      if (seen.has(p)) continue;
      out.push(crumb(a.content.title, p));
      seen.add(p);
    }
    out.push(crumb(title, path));
    return out;
  }

  private async alternates(row: EntryRow, path: string, siteUrl: string): Promise<{ locale: string; path: string; url: string }[]> {
    const self = { locale: row.locale, path, url: absoluteUrl(siteUrl, row.locale, path) };
    if (!row.translationKey) return [self];
    const others = await this.prisma.cmsEntry.findMany({
      where: { translationKey: row.translationKey, id: { not: row.id }, ...LIVE_WHERE },
      select: { locale: true, publishedPath: true },
    });
    return [self, ...others.map((o) => ({ locale: o.locale, path: o.publishedPath as string, url: absoluteUrl(siteUrl, o.locale, o.publishedPath as string) }))];
  }

  async build(row: EntryRow, content: EntryContent, mode: ContentMode): Promise<PublicEntry> {
    const locale = row.locale;
    const path = mode === 'published' ? (row.publishedPath as string) : row.path;
    const [siteUrl, tokens, site] = await Promise.all([this.cards.siteUrl(), this.cards.tokenContext(locale), this.settings.get('site', locale)]);
    const cta = { signupUrl: site?.signupUrl ?? null, demoPath: site?.demoPath ?? null, whatsapp: site?.whatsapp ?? null };

    const resolved = await this.content.resolve({
      value: {
        title: content.title,
        summary: content.summary,
        blocks: content.blocks,
        data: content.data,
        seoTitle: content.seoTitle,
        seoDescription: content.seoDescription,
      },
      locale,
      mode: mode === 'published' ? 'published' : 'draft',
      tokens,
      cta,
    });

    // Referenced entries: relations, people, parent and children.
    const relIds = content.relations.map((r) => r.entryId);
    const peopleIds = [content.authorId, content.reviewerId].filter((x): x is string => !!x);
    const [relLive, people, parentLive, childLive, faqRows] = await Promise.all([
      this.cards.liveByIds(relIds),
      this.cards.liveByIds(peopleIds),
      row.parentId ? this.cards.liveByIds([row.parentId]) : Promise.resolve([]),
      CHILDREN_TYPES.has(row.type)
        ? this.cards.live({ parentId: row.id, locale }, [{ sortOrder: 'asc' }, { title: 'asc' }])
        : Promise.resolve([] as LiveEntry[]),
      this.faqs(row, content, mode),
    ]);

    const relById = new Map(relLive.map((e) => [e.row.id, e]));
    const cardList = [...relLive, ...parentLive, ...childLive];
    const cardsArr = await this.cards.cards(cardList, locale, tokens);
    const cardById = new Map<string, EntryCard>(cardsArr.map((c) => [c.id, c]));
    const personCards = await this.cards.personCards(people, locale);
    const personById = new Map(personCards.map((p) => [p.id, p]));

    const related: EntryCard[] = [];
    const tags: Partial<Record<CmsEntryType, EntryCard[]>> = {};
    for (const rel of content.relations) {
      const card = relById.has(rel.entryId) ? cardById.get(rel.entryId) : undefined;
      if (!card) continue;
      if (rel.kind === 'RELATED') related.push(card);
      else (tags[card.type] ??= []).push(card);
    }

    // Media: everything blocks and data point at, plus card/OG images.
    const mediaIds = collectMediaIds([content.blocks, content.data]);
    for (const id of content.mediaIds) mediaIds.add(id);
    if (content.imageId) mediaIds.add(content.imageId);
    if (content.ogImageId) mediaIds.add(content.ogImageId);
    const mediaMap = await this.cards.mediaMap(mediaIds, locale);
    const media: Record<string, PublicMedia> = Object.fromEntries(mediaMap);

    const faqs = await this.resolveFaqs(faqRows, locale, mode, tokens);
    const title = resolved.title || content.title;
    const data = { ...resolved.data, type: row.type } as unknown as PublicEntry['data'];

    return {
      id: row.id,
      type: row.type,
      locale,
      path,
      url: absoluteUrl(siteUrl, locale, path),
      title,
      summary: resolved.summary,
      blocks: resolved.blocks as unknown as PublicEntry['blocks'],
      data,
      seo: {
        title: resolved.seoTitle || title,
        titleIncludesBrand: content.titleIncludesBrand,
        description: resolved.seoDescription || resolved.summary || '',
        canonical: content.canonicalUrl ?? absoluteUrl(siteUrl, locale, path),
        robots: content.robots,
        ogImage: (content.ogImageId && mediaMap.get(content.ogImageId)) || null,
        schemaExtra: content.schemaExtra,
      },
      image: (content.imageId && mediaMap.get(content.imageId)) || null,
      author: (content.authorId && personById.get(content.authorId)) || null,
      reviewer: (content.reviewerId && personById.get(content.reviewerId)) || null,
      factCheckedAt: content.factCheckedAt,
      datePublished: row.firstPublishedAt?.toISOString() ?? null,
      dateModified: (row.contentUpdatedAt ?? row.publishedAt)?.toISOString() ?? null,
      breadcrumbs: await this.breadcrumbs(row, path, title, siteUrl),
      parent: (row.parentId && cardById.get(row.parentId)) || null,
      children: childLive.map((c) => cardById.get(c.row.id)).filter((c): c is EntryCard => c !== undefined),
      tags,
      related,
      faqs,
      alternates: await this.alternates(row, path, siteUrl),
      media,
      quality: content.quality,
    };
  }

  /** FAQ question/answer with tokens and links resolved. */
  async resolveFaqs(
    rows: readonly { id: string; question: string; answer: string; topic: string | null }[],
    locale: string = DEFAULT_LOCALE,
    mode: ContentMode = 'published',
    tokens?: TokenContext,
  ): Promise<PublicFaq[]> {
    if (rows.length === 0) return [];
    const resolved = await this.content.resolve({
      value: rows.map((r) => ({ question: r.question, answer: r.answer })),
      locale,
      mode: mode === 'published' ? 'published' : 'draft',
      ...(tokens ? { tokens } : {}),
    });
    return rows.map((r, i) => ({ id: r.id, question: resolved[i]?.question ?? r.question, answer: resolved[i]?.answer ?? r.answer, topic: r.topic }));
  }
}
