/**
 * Admin entry CRUD (API-CONTRACT 8.1): list, lookup, get, create, autosave
 * (PATCH with optimistic `version`), delete, duplicate, translations,
 * fact-check, inbound links and link suggestions.
 *
 * Every save recomputes the path (CmsPathService), the main-content word
 * count and the SEO report (CmsChecksService), sets hasUnpublishedChanges for
 * live entries and keeps at most one SAVE revision per editor per 10 minutes.
 */
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CmsStatus, Prisma, type CmsEntry } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_LOCALE,
  DRAFT_ENTRY_DATA_SCHEMAS,
  KNOWN_LOCALES,
  type AdminEntriesQuery,
  type AdminEntry,
  type AdminEntryListItem,
  type AdminEntryRef,
  type CmsEntryType,
  type CmsStatus as ContractStatus,
  type CreateEntryBody,
  type DraftSnapshot,
  type DuplicateEntryBody,
  type EntryLookupItem,
  type InboundLinksResponse,
  type LinkSuggestion,
  type Paginated,
  type PatchEntryBody,
  type PatchEntryResponse,
  type RobotsReason,
} from '../contract/cms-contract';
import { collectReferencedEntryIds } from '../content/entry-links';
import { CmsPathService } from '../paths/cms-path.service';
import { absoluteUrl } from '../paths/cms-paths';
import { EntryConflictException } from '../publishing/cms-errors';
import { draftSnapshotOf, hasUnpublishedChanges, readPublished } from '../publishing/snapshot';
import { CmsChecksService } from '../seo/cms-checks.service';
import { collectMediaRefs } from '../seo/seo-rules';
import { toAdminEntry, toPublicMedia } from './admin-entry.mapper';
import { starterBlocks } from './starter-blocks';

type Rec = Record<string, unknown>;

const SAVE_REVISION_WINDOW_MS = 10 * 60 * 1000;
/** Types whose children's paths are built from theirs. */
const TREE_TYPES: readonly CmsEntryType[] = ['PAGE', 'DOC', 'CITY'];

@Injectable()
export class CmsEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paths: CmsPathService,
    private readonly checks: CmsChecksService,
  ) {}

  async loadRow(id: string): Promise<CmsEntry> {
    const row = await this.prisma.cmsEntry.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Entry nahi mili');
    return row;
  }

  // ─── Read ───

  async get(id: string): Promise<AdminEntry> {
    return this.toAdmin(await this.loadRow(id));
  }

  async toAdmin(row: CmsEntry): Promise<AdminEntry> {
    const draft = draftSnapshotOf(row);
    const ids = new Set<string>([
      ...collectReferencedEntryIds(row.type as CmsEntryType, draft.blocks, draft.data),
      ...draft.relations.map((r) => r.entryId),
      ...[row.authorId, row.reviewerId, row.parentId].filter((v): v is string => !!v),
    ]);
    const mediaIds = [
      ...new Set([
        ...collectMediaRefs(draft.blocks, 'blocks').map((m) => m.id),
        ...collectMediaRefs(draft.data, 'data').map((m) => m.id),
        ...[row.imageId, row.ogImageId].filter((v): v is string => !!v),
      ]),
    ];
    const [refRows, mediaRows, siteUrl] = await Promise.all([
      ids.size ? this.prisma.cmsEntry.findMany({ where: { id: { in: [...ids] } }, select: { id: true, type: true, title: true, path: true, status: true } }) : [],
      mediaIds.length ? this.prisma.cmsMedia.findMany({ where: { id: { in: mediaIds } } }) : [],
      this.paths.siteUrl(),
    ]);
    const refs: Record<string, AdminEntryRef> = {};
    for (const r of refRows) refs[r.id] = { id: r.id, type: r.type as CmsEntryType, title: r.title, path: r.path, status: r.status as ContractStatus };
    const mediaRefs = Object.fromEntries(mediaRows.map((m) => [m.id, toPublicMedia(m, row.locale)]));
    const liveUrl = row.publishedPath ? absoluteUrl(siteUrl, row.locale, row.publishedPath) : null;
    return toAdminEntry(row, refs, mediaRefs, liveUrl);
  }

  async list(q: AdminEntriesQuery): Promise<Paginated<AdminEntryListItem>> {
    const where: Prisma.CmsEntryWhereInput = {
      ...(q.type ? { type: q.type } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.locale ? { locale: q.locale } : {}),
      ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { path: { contains: q.q, mode: 'insensitive' } }] } : {}),
      ...(q.tag ? { relations: { array_contains: [{ entryId: q.tag }] } } : {}),
      ...(q.group ? { data: { path: ['group'], equals: q.group } } : {}),
      ...(q.gate === 'below' ? { publishedPath: { not: null }, published: { path: ['quality', 'passed'], equals: false } } : {}),
      ...(q.gate === 'passed' ? { publishedPath: { not: null }, published: { path: ['quality', 'passed'], equals: true } } : {}),
    };
    const orderBy: Prisma.CmsEntryOrderByWithRelationInput[] =
      q.sort === 'title' ? [{ title: 'asc' }] : q.sort === 'score' ? [{ seoScore: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }] : [{ updatedAt: 'desc' }];
    const [total, rows] = await Promise.all([
      this.prisma.cmsEntry.count({ where }),
      this.prisma.cmsEntry.findMany({
        where,
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true, type: true, locale: true, title: true, path: true, status: true, hasUnpublishedChanges: true,
          seoScore: true, wordCount: true, publishAt: true, publishedAt: true, updatedAt: true, published: true,
          author: { select: { title: true } },
        },
      }),
    ]);
    const items: AdminEntryListItem[] = rows.map((r) => {
      const robots = readPublished(r)?.seo.robots;
      return {
        id: r.id,
        type: r.type as CmsEntryType,
        locale: r.locale,
        title: r.title,
        path: r.path,
        status: r.status as ContractStatus,
        hasUnpublishedChanges: r.hasUnpublishedChanges,
        noindexReason: robots && !robots.index ? ((robots.reason ?? 'editor') as RobotsReason) : null,
        seoScore: r.seoScore,
        wordCount: r.wordCount,
        publishAt: r.publishAt?.toISOString() ?? null,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        updatedAt: r.updatedAt.toISOString(),
        authorName: r.author?.title ?? null,
      };
    });
    const totalPages = Math.ceil(total / q.limit);
    return { items, meta: { page: q.page, limit: q.limit, total, totalPages, hasNext: q.page < totalPages, hasPrev: q.page > 1 } };
  }

  async lookup(q: { q: string; types?: CmsEntryType[] | undefined; limit: number; locale?: string | undefined }): Promise<EntryLookupItem[]> {
    const rows = await this.prisma.cmsEntry.findMany({
      where: {
        status: { not: CmsStatus.ARCHIVED },
        ...(q.types?.length ? { type: { in: q.types } } : {}),
        ...(q.locale ? { locale: q.locale } : {}),
        ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { path: { contains: q.q, mode: 'insensitive' } }] } : {}),
      },
      orderBy: [{ publishedPath: { sort: 'asc', nulls: 'last' } }, { title: 'asc' }],
      take: q.limit,
      select: { id: true, type: true, title: true, path: true, status: true },
    });
    return rows.map((r) => ({ id: r.id, type: r.type as CmsEntryType, title: r.title, path: r.path, status: r.status as ContractStatus }));
  }

  // ─── Create ───

  private parseDraftData(type: CmsEntryType, data: Rec | undefined): Rec {
    const result = DRAFT_ENTRY_DATA_SCHEMAS[type].safeParse({ ...(data ?? {}), type });
    if (!result.success) {
      const first = result.error.issues[0];
      throw new BadRequestException({ statusCode: 400, message: `Data theek nahi (data.${first?.path.join('.') ?? ''}): ${first?.message ?? ''}`, error: 'Bad Request' });
    }
    return { ...(data ?? {}), ...(result.data as Rec), type };
  }

  private checkLocale(locale: string): void {
    if (!(KNOWN_LOCALES as readonly string[]).includes(locale)) throw new BadRequestException(`Locale "${locale}" nahi chalti`);
  }

  async create(body: CreateEntryBody, userId: string | null): Promise<AdminEntry> {
    const locale = body.locale ?? DEFAULT_LOCALE;
    this.checkLocale(locale);
    const type = body.type;
    const data = this.parseDraftData(type, body.data);
    if (type === 'PAGE' && !data.template) data.template = 'default';
    const parentId = body.parentId ?? null;
    let slug = body.slug;
    if (slug === undefined) {
      slug = (await this.paths.suggestSlug({ type, locale, parentId, title: body.title })) ?? undefined;
      if (slug === undefined) throw new BadRequestException('Title se slug nahi bana; slug khud likhein');
    }
    const path = await this.paths.resolvePathOrThrow({ type, locale, slug, parentId });
    const row = await this.prisma.cmsEntry.create({
      data: {
        type,
        locale,
        slug,
        path,
        parentId,
        title: body.title,
        data: data as Prisma.InputJsonValue,
        blocks: starterBlocks(type, data) as unknown as Prisma.InputJsonValue,
        translationKey: body.translationKey ?? null,
        status: CmsStatus.DRAFT,
        createdById: userId,
        updatedById: userId,
      },
    });
    return this.toAdmin(row);
  }

  // ─── Save ───

  async patch(id: string, body: PatchEntryBody, userId: string | null): Promise<PatchEntryResponse> {
    const row = await this.loadRow(id);
    if (body.version !== row.version) throw new EntryConflictException(await this.toAdmin(row));
    if (row.status === CmsStatus.ARCHIVED) throw new BadRequestException('Archived entry edit nahi hoti; pehle restore karein');
    const type = row.type as CmsEntryType;

    const update: Prisma.CmsEntryUpdateManyMutationInput = {};
    const draft: DraftSnapshot = draftSnapshotOf(row);
    const assign = <K extends keyof DraftSnapshot>(key: K, value: DraftSnapshot[K] | undefined) => {
      if (value === undefined) return;
      draft[key] = value;
    };
    assign('title', body.title);
    assign('summary', body.summary === undefined ? undefined : body.summary || null);
    assign('slug', body.slug);
    assign('parentId', body.parentId);
    assign('translationKey', body.translationKey);
    if (body.blocks) assign('blocks', body.blocks);
    if (body.data) assign('data', this.parseDraftData(type, body.data));
    assign('relations', body.relations);
    assign('faqIds', body.faqIds);
    assign('imageId', body.imageId);
    assign('seoTitle', body.seoTitle === undefined ? undefined : body.seoTitle || null);
    assign('seoDescription', body.seoDescription === undefined ? undefined : body.seoDescription || null);
    assign('focusKeyword', body.focusKeyword === undefined ? undefined : body.focusKeyword || null);
    assign('canonicalUrl', body.canonicalUrl);
    assign('noindex', body.noindex);
    assign('nofollow', body.nofollow);
    assign('ogImageId', body.ogImageId);
    assign('schemaExtra', body.schemaExtra);
    assign('authorId', body.authorId);
    assign('reviewerId', body.reviewerId);
    assign('sortOrder', body.sortOrder);
    assign('featured', body.featured);

    await this.checkPeople(draft);
    await this.checkMedia([draft.imageId, draft.ogImageId]);

    let path = row.path;
    if (body.slug !== undefined || body.parentId !== undefined) {
      path = await this.paths.resolvePathOrThrow({ type, locale: row.locale, slug: draft.slug, parentId: draft.parentId, entryId: id });
    }

    const result = await this.checks.run({ entry: row, draft, path, mode: 'save' });

    Object.assign(update, {
      title: draft.title,
      summary: draft.summary,
      slug: draft.slug,
      path,
      parentId: draft.parentId,
      translationKey: draft.translationKey,
      blocks: draft.blocks as unknown as Prisma.InputJsonValue,
      data: { ...draft.data, type } as Prisma.InputJsonValue,
      relations: draft.relations as unknown as Prisma.InputJsonValue,
      faqIds: draft.faqIds,
      imageId: draft.imageId,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      focusKeyword: draft.focusKeyword,
      canonicalUrl: draft.canonicalUrl,
      noindex: draft.noindex,
      nofollow: draft.nofollow,
      ogImageId: draft.ogImageId,
      schemaExtra: draft.schemaExtra === null ? Prisma.DbNull : (draft.schemaExtra as Prisma.InputJsonValue),
      authorId: draft.authorId,
      reviewerId: draft.reviewerId,
      sortOrder: draft.sortOrder,
      featured: draft.featured,
      wordCount: result.prepared.quality.wordCount,
      seoScore: result.report.score,
      hasUnpublishedChanges: hasUnpublishedChanges(row, draft),
      updatedById: userId,
      version: row.version + 1,
    } satisfies Prisma.CmsEntryUncheckedUpdateManyInput);

    try {
      await this.prisma.$transaction(async (tx) => {
        const res = await tx.cmsEntry.updateMany({ where: { id, version: row.version }, data: update as Prisma.CmsEntryUncheckedUpdateManyInput });
        if (res.count !== 1) throw new EntryConflictException(null);
        if (path !== row.path && TREE_TYPES.includes(type)) {
          for (const d of await this.paths.descendantUpdates(id, path, tx)) {
            await tx.cmsEntry.update({ where: { id: d.id }, data: { path: d.path } });
          }
        }
        await this.saveRevision(tx, id, row.version + 1, draft, userId);
      }, { timeout: 20_000 });
    } catch (error) {
      if (error instanceof EntryConflictException) throw new EntryConflictException(await this.get(id));
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Neeche wale kisi page ka naya path pehle se kisi aur ke paas hai');
      }
      throw error;
    }
    return { entry: await this.get(id), seo: result.report };
  }

  /** One SAVE revision per editor per 10 minutes: the latest one is refreshed inside the window. */
  private async saveRevision(tx: Prisma.TransactionClient, entryId: string, version: number, draft: DraftSnapshot, userId: string | null): Promise<void> {
    const recent = await tx.cmsRevision.findFirst({
      where: { entryId, action: 'SAVE', createdById: userId, createdAt: { gte: new Date(Date.now() - SAVE_REVISION_WINDOW_MS) } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const snapshot = draft as unknown as Prisma.InputJsonValue;
    if (recent) await tx.cmsRevision.update({ where: { id: recent.id }, data: { version, snapshot } });
    else await tx.cmsRevision.create({ data: { entryId, subject: 'ENTRY', version, action: 'SAVE', snapshot, createdById: userId } });
  }

  private async checkPeople(draft: DraftSnapshot): Promise<void> {
    const ids = [draft.authorId, draft.reviewerId].filter((v): v is string => !!v);
    if (!ids.length) return;
    const rows = await this.prisma.cmsEntry.findMany({ where: { id: { in: ids } }, select: { id: true, type: true } });
    if (rows.length !== new Set(ids).size || rows.some((r) => r.type !== 'PERSON')) {
      throw new BadRequestException('Author/reviewer sirf Team (Person) entry ho sakta hai');
    }
  }

  private async checkMedia(ids: (string | null)[]): Promise<void> {
    const list = ids.filter((v): v is string => !!v);
    if (!list.length) return;
    const count = await this.prisma.cmsMedia.count({ where: { id: { in: list }, deletedAt: null } });
    if (count !== new Set(list).size) throw new BadRequestException('Image media library me nahi mili');
  }

  // ─── Delete, duplicate, translations, fact-check ───

  async remove(id: string): Promise<void> {
    const row = await this.loadRow(id);
    if (row.firstPublishedAt || row.publishedPath) throw new ConflictException('Jo entry kabhi publish hui ho woh delete nahi hoti; archive karein');
    if (row.status !== CmsStatus.DRAFT && row.status !== CmsStatus.ARCHIVED) throw new ConflictException('Sirf Draft ya Archived entry delete hoti hai');
    await this.prisma.cmsEntry.delete({ where: { id } });
  }

  async duplicate(id: string, body: DuplicateEntryBody, userId: string | null): Promise<AdminEntry> {
    const row = await this.loadRow(id);
    const type = row.type as CmsEntryType;
    const title = body.title ?? `${row.title} (copy)`;
    const slug = body.slug ?? (await this.paths.suggestSlug({ type, locale: row.locale, parentId: row.parentId, title }));
    if (slug === null || slug === undefined) throw new BadRequestException('Naya slug do');
    const path = await this.paths.resolvePathOrThrow({ type, locale: row.locale, slug, parentId: row.parentId });
    const d = draftSnapshotOf(row);
    const copy = await this.prisma.cmsEntry.create({
      data: {
        type, locale: row.locale, slug, path, parentId: row.parentId, title, summary: d.summary,
        blocks: d.blocks as unknown as Prisma.InputJsonValue,
        data: { ...d.data, type } as Prisma.InputJsonValue,
        relations: d.relations as unknown as Prisma.InputJsonValue,
        faqIds: d.faqIds, imageId: d.imageId, focusKeyword: d.focusKeyword, noindex: d.noindex, nofollow: d.nofollow,
        ogImageId: d.ogImageId, schemaExtra: d.schemaExtra === null ? Prisma.DbNull : (d.schemaExtra as Prisma.InputJsonValue),
        authorId: d.authorId, reviewerId: d.reviewerId, sortOrder: d.sortOrder,
        status: CmsStatus.DRAFT, createdById: userId, updatedById: userId,
      },
    });
    return this.toAdmin(copy);
  }

  async translate(id: string, locale: string, userId: string | null): Promise<AdminEntry> {
    this.checkLocale(locale);
    const row = await this.loadRow(id);
    if (row.locale === locale) throw new BadRequestException('Yeh entry pehle se isi language me hai');
    const key = row.translationKey ?? row.id;
    const exists = await this.prisma.cmsEntry.findFirst({ where: { translationKey: key, locale }, select: { id: true } });
    if (exists) throw new ConflictException('Is language ka version pehle se mojood hai');
    let parentId: string | null = null;
    if (row.parentId) {
      const parent = await this.prisma.cmsEntry.findUnique({ where: { id: row.parentId }, select: { id: true, translationKey: true } });
      const twin = parent ? await this.prisma.cmsEntry.findFirst({ where: { locale, translationKey: parent.translationKey ?? parent.id }, select: { id: true } }) : null;
      parentId = twin?.id ?? null;
    }
    const type = row.type as CmsEntryType;
    let slug = row.slug;
    const first = await this.paths.resolvePath({ type, locale, slug, parentId });
    if (!first.ok) {
      const suggested = await this.paths.suggestSlug({ type, locale, parentId, title: row.slug || row.title });
      if (!suggested) throw new BadRequestException(first.problems[0]?.message ?? 'Path nahi bana');
      slug = suggested;
    }
    const path = await this.paths.resolvePathOrThrow({ type, locale, slug, parentId });
    const d = draftSnapshotOf(row);
    const created = await this.prisma.$transaction(async (tx) => {
      if (!row.translationKey) await tx.cmsEntry.update({ where: { id: row.id }, data: { translationKey: key } });
      return tx.cmsEntry.create({
        data: {
          type, locale, slug, path, parentId, title: row.title, summary: d.summary, translationKey: key,
          blocks: d.blocks as unknown as Prisma.InputJsonValue,
          data: { ...d.data, type } as Prisma.InputJsonValue,
          imageId: d.imageId, ogImageId: d.ogImageId, authorId: d.authorId, reviewerId: d.reviewerId, sortOrder: d.sortOrder,
          status: CmsStatus.DRAFT, createdById: userId, updatedById: userId,
        },
      });
    });
    return this.toAdmin(created);
  }

  async factCheck(id: string, userId: string | null): Promise<AdminEntry> {
    await this.loadRow(id);
    const row = await this.prisma.cmsEntry.update({ where: { id }, data: { factCheckedAt: new Date(), factCheckedById: userId } });
    return this.toAdmin(row);
  }

  // ─── Links ───

  async inbound(id: string): Promise<InboundLinksResponse> {
    await this.loadRow(id);
    const rows = await this.prisma.cmsEntryRelation.findMany({
      where: { toId: id },
      select: { kind: true, from: { select: { id: true, type: true, title: true, path: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return { from: rows.map((r) => ({ id: r.from.id, type: r.from.type as CmsEntryType, title: r.from.title, path: r.from.path, kind: r.kind })) };
  }

  /** Live entries that share a tag with this one (or are tagged with it) and are not linked yet. */
  async suggestions(id: string): Promise<LinkSuggestion[]> {
    const row = await this.loadRow(id);
    const d = draftSnapshotOf(row);
    const linked = new Set<string>([id, ...d.relations.map((r) => r.entryId), ...collectReferencedEntryIds(row.type as CmsEntryType, d.blocks, d.data)]);
    const tagIds = d.relations.filter((r) => r.kind === 'TAG').map((r) => r.entryId);
    const rows = await this.prisma.cmsEntryRelation.findMany({
      where: {
        kind: 'TAG',
        from: { publishedPath: { not: null }, locale: row.locale },
        OR: [...(tagIds.length ? [{ toId: { in: tagIds } }] : []), { toId: id }],
      },
      select: { toId: true, from: { select: { id: true, type: true, title: true, path: true } } },
      take: 200,
    });
    const tagTitles = new Map(
      tagIds.length ? (await this.prisma.cmsEntry.findMany({ where: { id: { in: tagIds } }, select: { id: true, title: true } })).map((t) => [t.id, t.title]) : [],
    );
    const out = new Map<string, LinkSuggestion>();
    for (const r of rows) {
      if (linked.has(r.from.id) || out.has(r.from.id)) continue;
      const reason = r.toId === id ? 'Yeh page is entry ko tag karta hai' : `Same tag: ${tagTitles.get(r.toId) ?? ''}`;
      out.set(r.from.id, { id: r.from.id, type: r.from.type as CmsEntryType, title: r.from.title, path: r.from.path, reason });
      if (out.size >= 20) break;
    }
    return [...out.values()];
  }
}
