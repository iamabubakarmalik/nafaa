/**
 * Publish, schedule, unpublish and archive (ARCH 5.3; API-CONTRACT 8.1).
 *
 * Publish:
 * 1. Runs the checks (CmsChecksService); any error → 422.
 * 2. Freezes a PublishedSnapshot into `published` and a PUBLISH revision,
 *    guarded by the entry `version` (409 when it moved).
 * 3. Rebuilds the published index: CmsEntryRelation (TAG, RELATED from the
 *    draft relations; MENTIONS from links and id references) and CmsEntryFaq.
 * 4. On a path change: SLUG_CHANGE redirect old → new, chains repointed, a
 *    rule from the new path disabled, live descendants moved with redirects.
 * 5. Upserts SeoPage (and BlogPostAnalytics for posts and guides).
 * 6. After commit: site revalidation (waits for the first attempt) and IndexNow.
 *
 * Scheduled publishing: a SCHEDULE revision freezes the draft; the cron below
 * publishes that revision at `publishAt`. A live entry keeps status PUBLISHED
 * while an update is scheduled (the public API serves PUBLISHED rows), so
 * "scheduled" means `publishAt` is set.
 */
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CmsStatus, Prisma, type CmsEntry } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PUBLISHED_SNAPSHOT_FORMAT,
  parseEntryLink,
  type BulkEntriesBody,
  type BulkEntriesResponse,
  type CmsEntryType,
  type DraftSnapshot,
  type EntryData,
  type EntryRevisionSnapshot,
  type PublicRedirect,
  type PublishEntryBody,
  type PublishedSnapshot,
  type RevalidationResult,
  type ScheduleEntryBody,
  type UnpublishEntryBody,
} from '../contract/cms-contract';
import { CmsTokenService } from '../content/cms-token.service';
import { resolveTokensInText } from '../content/tokens';
import { CmsPathService } from '../paths/cms-path.service';
import { absoluteUrl, localizedPath, type PathProblem } from '../paths/cms-paths';
import { CmsFanoutService } from '../revalidation/cms-fanout.service';
import { IndexNowService } from '../revalidation/indexnow.service';
import { SiteRevalidationService } from '../revalidation/site-revalidation.service';
import { CmsChecksService, type CheckResult } from '../seo/cms-checks.service';
import { ChecksFailedException, EntryConflictException } from './cms-errors';
import { draftFromRevision, draftHash, draftSnapshotOf, readPublished } from './snapshot';

type Tx = Prisma.TransactionClient;
type Rec = Record<string, unknown>;

const TX_OPTIONS = { timeout: 20_000, maxWait: 10_000 } as const;

export interface PublishOutcome {
  entryId: string;
  revisionId: string;
  revalidation: RevalidationResult;
  redirectCreated?: PublicRedirect;
}
export interface UnpublishOutcome {
  entryId: string;
  revalidation: RevalidationResult;
  redirectCreated?: PublicRedirect;
}

/** Stored in a SCHEDULE revision next to the draft fields. */
interface ScheduleOptions {
  contentUpdated?: boolean;
  note?: string;
}

function toPublicRedirect(r: { id: string; fromPath: string; toPath: string | null; statusCode: number; isPattern: boolean }): PublicRedirect {
  return { id: r.id, from: r.fromPath, to: r.toPath, status: r.statusCode as PublicRedirect['status'], pattern: r.isPattern };
}

@Injectable()
export class CmsPublishingService {
  private readonly logger = new Logger(CmsPublishingService.name);
  private cronRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly checks: CmsChecksService,
    private readonly paths: CmsPathService,
    private readonly tokens: CmsTokenService,
    private readonly revalidation: SiteRevalidationService,
    private readonly fanout: CmsFanoutService,
    private readonly indexNow: IndexNowService,
  ) {}

  private async load(id: string): Promise<CmsEntry> {
    const row = await this.prisma.cmsEntry.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Entry nahi mili');
    return row;
  }

  /** Path for publishing `draft`, with problems instead of an exception. */
  private async publishPath(row: CmsEntry, draft: DraftSnapshot): Promise<{ path: string; problems: PathProblem[] }> {
    const result = await this.paths.resolvePath({ type: row.type as CmsEntryType, locale: row.locale, slug: draft.slug, parentId: draft.parentId, entryId: row.id });
    return result.ok ? { path: result.path, problems: [] } : { path: row.path, problems: result.problems };
  }

  /** Runs the publish checks for the current draft (Validate). */
  async validate(id: string): Promise<CheckResult> {
    const row = await this.load(id);
    const draft = draftSnapshotOf(row);
    const { path, problems } = await this.publishPath(row, draft);
    return this.checks.run({ entry: row, draft, path, pathProblems: problems, mode: 'publish' });
  }

  /**
   * The draft as a PublishedSnapshot without publishing (public preview).
   * Invalid blocks are left out and invalid data is passed through as is.
   */
  async buildPreviewSnapshot(id: string): Promise<PublishedSnapshot> {
    const row = await this.load(id);
    const draft = draftSnapshotOf(row);
    const result = await this.checks.run({ entry: row, draft, path: row.path, mode: 'preview', publishFaqs: true });
    const now = new Date().toISOString();
    return this.snapshotFrom(row, draft, row.path, result, {
      publishedAt: row.publishedAt?.toISOString() ?? now,
      firstPublishedAt: row.firstPublishedAt?.toISOString() ?? now,
      contentUpdatedAt: row.contentUpdatedAt?.toISOString() ?? now,
      revisionId: null,
    });
  }

  private snapshotFrom(
    row: CmsEntry,
    draft: DraftSnapshot,
    path: string,
    result: CheckResult,
    dates: { publishedAt: string; firstPublishedAt: string; contentUpdatedAt: string | null; revisionId: string | null },
  ): PublishedSnapshot {
    const p = result.prepared;
    return {
      format: PUBLISHED_SNAPSHOT_FORMAT,
      id: row.id,
      type: row.type as CmsEntryType,
      locale: row.locale,
      path,
      slug: draft.slug,
      parentId: draft.parentId,
      translationKey: draft.translationKey,
      template: p.template,
      title: draft.title,
      summary: draft.summary,
      blocks: p.blocks,
      data: p.data as unknown as EntryData,
      relations: draft.relations,
      faqIds: draft.faqIds,
      imageId: draft.imageId,
      authorId: draft.authorId,
      reviewerId: draft.reviewerId,
      factCheckedAt: row.factCheckedAt?.toISOString() ?? null,
      featureStatus: p.featureStatus,
      seo: {
        title: p.seoTitle,
        titleIncludesBrand: p.titleIncludesBrand,
        description: p.description,
        canonicalUrl: draft.canonicalUrl,
        robots: p.robots,
        ogImageId: draft.ogImageId,
        schemaExtra: draft.schemaExtra ?? [],
        focusKeyword: draft.focusKeyword,
      },
      quality: p.quality,
      mediaIds: p.mediaIds,
      referencedIds: p.referencedIds,
      draftHash: draftHash(draft),
      sortOrder: draft.sortOrder,
      featured: draft.featured,
      ...dates,
    };
  }

  /**
   * Publishes the current draft (or, for the scheduler, a frozen revision).
   * `version` must match unless `fromRevision` is given.
   */
  async publish(
    id: string,
    body: PublishEntryBody,
    userId: string | null,
    opts: { fromRevision?: { id: string; draft: DraftSnapshot } } = {},
  ): Promise<PublishOutcome> {
    const row = await this.load(id);
    if (!opts.fromRevision && body.version !== row.version) throw new EntryConflictException(null);
    if (row.status === CmsStatus.ARCHIVED) throw new BadRequestException('Archived entry pehle restore karein');

    const draft = opts.fromRevision?.draft ?? draftSnapshotOf(row);
    const { path, problems } = await this.publishPath(row, draft);
    const result = await this.checks.run({ entry: row, draft, path, pathProblems: problems, publishFaqs: body.publishFaqs, mode: 'publish' });
    if (!result.canPublish) throw new ChecksFailedException(result.issues);

    const now = new Date();
    const oldPath = row.publishedPath;
    const wasLive = oldPath !== null;
    const contentUpdatedAt = body.contentUpdated || !row.firstPublishedAt ? now : row.contentUpdatedAt;
    const firstPublishedAt = row.firstPublishedAt ?? now;
    const newVersion = row.version + 1;
    const currentDraft = draftSnapshotOf(row);
    const oldStatus = readPublished(row)?.featureStatus ?? null;

    let redirectCreated: PublicRedirect | undefined;
    const movedPaths: string[] = [];
    let revisionId = '';

    try {
      await this.prisma.$transaction(async (tx) => {
        if (body.publishFaqs && draft.faqIds.length > 0) {
          const faqs = await tx.cmsFaq.findMany({ where: { id: { in: draft.faqIds }, locale: row.locale } });
          for (const f of faqs) {
            if (f.status === CmsStatus.PUBLISHED && !f.hasUnpublishedChanges) continue;
            await tx.cmsFaq.update({
              where: { id: f.id },
              data: { status: CmsStatus.PUBLISHED, publishedQuestion: f.question, publishedAnswer: f.answer, publishedAt: now, hasUnpublishedChanges: false, updatedById: userId },
            });
          }
        }

        const snapshot = this.snapshotFrom(row, draft, path, result, {
          publishedAt: now.toISOString(),
          firstPublishedAt: firstPublishedAt.toISOString(),
          contentUpdatedAt: contentUpdatedAt?.toISOString() ?? null,
          revisionId: null,
        });
        const revSnapshot: EntryRevisionSnapshot = { ...draft, published: snapshot };
        const rev = await tx.cmsRevision.create({
          data: {
            entryId: id,
            subject: 'ENTRY',
            version: newVersion,
            action: 'PUBLISH',
            snapshot: revSnapshot as unknown as Prisma.InputJsonValue,
            note: body.note ?? null,
            createdById: userId,
          },
        });
        revisionId = rev.id;
        snapshot.revisionId = rev.id;

        const updated = await tx.cmsEntry.updateMany({
          where: { id, version: row.version },
          data: {
            published: snapshot as unknown as Prisma.InputJsonValue,
            publishedPath: path,
            publishedRevisionId: rev.id,
            publishedAt: now,
            firstPublishedAt,
            contentUpdatedAt,
            status: CmsStatus.PUBLISHED,
            hasUnpublishedChanges: draftHash(currentDraft) !== snapshot.draftHash,
            publishAt: null,
            scheduledRevisionId: null,
            publishedById: userId,
            archivedAt: null,
            wordCount: result.prepared.quality.wordCount,
            seoScore: result.report.score,
            version: newVersion,
          },
        });
        if (updated.count !== 1) throw new EntryConflictException(null);

        await this.rebuildIndex(tx, id, draft, result.prepared.referencedIds);

        if (oldPath && oldPath !== path) {
          redirectCreated = await this.moveLivePath(tx, row.locale, oldPath, path, id);
          movedPaths.push(...(await this.moveLiveDescendants(tx, row.locale, oldPath, path)));
        }
        await this.upsertSeoRows(tx, row, draft, snapshot, oldPath);
      }, TX_OPTIONS);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new EntryConflictException(null, 'Path kisi aur entry ke paas hai (shayad neeche wale page ka); slug badlein');
      }
      throw error;
    }

    const tags = await this.fanout.entryTags({
      id,
      type: row.type as CmsEntryType,
      locale: row.locale,
      paths: [oldPath, path, ...movedPaths],
      liveStateChanged: !wasLive || oldStatus !== result.prepared.featureStatus,
    });
    const revalidation = await this.revalidation.revalidate({ tags, reason: opts.fromRevision ? 'schedule' : 'publish', entryId: id, revisionId });
    if (result.prepared.robots.index || wasLive) {
      const siteUrl = await this.paths.siteUrl();
      this.indexNow.enqueue([absoluteUrl(siteUrl, row.locale, path), ...(oldPath && oldPath !== path ? [absoluteUrl(siteUrl, row.locale, oldPath)] : [])]);
    }
    return { entryId: id, revisionId, revalidation, ...(redirectCreated ? { redirectCreated } : {}) };
  }

  /** Rebuilds the published relation and FAQ index for one entry. */
  private async rebuildIndex(tx: Tx, id: string, draft: DraftSnapshot, mentionIds: readonly string[]): Promise<void> {
    await tx.cmsEntryRelation.deleteMany({ where: { fromId: id } });
    await tx.cmsEntryFaq.deleteMany({ where: { entryId: id } });
    const targetIds = [...new Set([...draft.relations.map((r) => r.entryId), ...mentionIds])].filter((t) => t !== id);
    const existing = new Set(
      targetIds.length ? (await tx.cmsEntry.findMany({ where: { id: { in: targetIds } }, select: { id: true } })).map((r) => r.id) : [],
    );
    const rows: Prisma.CmsEntryRelationCreateManyInput[] = [];
    for (const rel of draft.relations) {
      if (existing.has(rel.entryId)) rows.push({ fromId: id, toId: rel.entryId, kind: rel.kind, sortOrder: rel.sortOrder });
    }
    mentionIds.forEach((toId, i) => {
      if (existing.has(toId)) rows.push({ fromId: id, toId, kind: 'MENTIONS', sortOrder: i });
    });
    if (rows.length) await tx.cmsEntryRelation.createMany({ data: rows, skipDuplicates: true });
    if (draft.faqIds.length) {
      const faqs = new Set((await tx.cmsFaq.findMany({ where: { id: { in: draft.faqIds } }, select: { id: true } })).map((f) => f.id));
      const faqRows = draft.faqIds.filter((f) => faqs.has(f)).map((faqId, sortOrder) => ({ entryId: id, faqId, sortOrder }));
      if (faqRows.length) await tx.cmsEntryFaq.createMany({ data: faqRows, skipDuplicates: true });
    }
  }

  /** SLUG_CHANGE redirect old → new; repoints chains and disables a rule from the new path. */
  private async moveLivePath(tx: Tx, locale: string, oldPath: string, newPath: string, entryId: string): Promise<PublicRedirect> {
    const from = localizedPath(locale, oldPath);
    const to = localizedPath(locale, newPath);
    await tx.cmsRedirect.updateMany({ where: { fromPath: to, isPattern: false, isActive: true }, data: { isActive: false, note: 'Band: yeh path dobara live hai' } });
    await tx.cmsRedirect.updateMany({ where: { toPath: from }, data: { toPath: to } });
    const red = await tx.cmsRedirect.upsert({
      where: { fromPath: from },
      create: { fromPath: from, toPath: to, statusCode: 301, isPattern: false, isActive: true, source: 'SLUG_CHANGE', entryId },
      update: { toPath: to, statusCode: 301, isPattern: false, isActive: true, source: 'SLUG_CHANGE', entryId },
    });
    return toPublicRedirect(red);
  }

  /** Moves live descendants (PAGE, DOC, CITY_INDUSTRY under a moved parent). Returns their old and new paths. */
  private async moveLiveDescendants(tx: Tx, locale: string, oldPath: string, newPath: string): Promise<string[]> {
    const prefix = oldPath === '/' ? '/' : `${oldPath}/`;
    if (prefix === '/') return [];
    const rows = await tx.cmsEntry.findMany({ where: { locale, publishedPath: { startsWith: prefix } }, select: { id: true, publishedPath: true, published: true } });
    const touched: string[] = [];
    for (const r of rows) {
      if (!r.publishedPath) continue;
      const moved = `${newPath}${r.publishedPath.slice(oldPath.length)}`;
      const snap = readPublished(r);
      await tx.cmsEntry.update({
        where: { id: r.id },
        data: { publishedPath: moved, ...(snap ? { published: { ...snap, path: moved } as unknown as Prisma.InputJsonValue } : {}) },
      });
      await this.moveLivePath(tx, locale, r.publishedPath, moved, r.id);
      touched.push(r.publishedPath, moved);
    }
    return touched;
  }

  /** SeoPage for every published path; BlogPostAnalytics for posts and guides. */
  private async upsertSeoRows(tx: Tx, row: CmsEntry, draft: DraftSnapshot, snap: PublishedSnapshot, oldPath: string | null): Promise<void> {
    const ctx = await this.tokens.loadContext(row.locale, tx);
    const title = resolveTokensInText(snap.seo.title, ctx, 'remove').text;
    const description = resolveTokensInText(snap.seo.description, ctx, 'remove').text;
    const path = localizedPath(row.locale, snap.path);
    const minutes = Math.max(1, Math.ceil(snap.quality.wordCount / 200));
    const common = {
      title,
      metaDescription: description || null,
      canonicalUrl: snap.seo.canonicalUrl,
      wordCount: snap.quality.wordCount,
      readingTimeMin: minutes,
      contentType: row.type,
      hasStructuredData: true,
      hasOgImage: true,
      hasCanonical: true,
      language: row.locale,
      isPublished: true,
      publishedAt: new Date(snap.publishedAt),
    };
    await tx.seoPage.upsert({
      where: { path },
      create: { path, ...common, status: snap.seo.robots.index ? 'PENDING' : 'BLOCKED' },
      update: { ...common, ...(snap.seo.robots.index ? {} : { status: 'BLOCKED' as const }) },
    });
    if (oldPath && oldPath !== snap.path) {
      await tx.seoPage.updateMany({ where: { path: localizedPath(row.locale, oldPath) }, data: { isPublished: false } });
    }
    if (row.type === 'BLOG_POST' || row.type === 'GUIDE') {
      const postSlug = row.type === 'BLOG_POST' ? draft.slug : `guides/${draft.slug}`;
      const tagIds = draft.relations.filter((r) => r.kind === 'TAG').map((r) => r.entryId);
      const [category, author] = await Promise.all([
        tagIds.length ? tx.cmsEntry.findFirst({ where: { id: { in: tagIds }, type: 'BLOG_CATEGORY' }, select: { title: true } }) : null,
        draft.authorId ? tx.cmsEntry.findUnique({ where: { id: draft.authorId }, select: { title: true } }) : null,
      ]);
      const fields = { postTitle: draft.title, category: category?.title ?? null, author: author?.title ?? null, publishedAt: new Date(snap.firstPublishedAt) };
      await tx.blogPostAnalytics.upsert({ where: { postSlug }, create: { postSlug, ...fields }, update: fields });
    }
  }

  // ─── Unpublish, archive ───

  async unpublish(id: string, body: UnpublishEntryBody, userId: string | null, reason: 'unpublish' = 'unpublish'): Promise<UnpublishOutcome> {
    const row = await this.load(id);
    if (!row.publishedPath) throw new BadRequestException('Entry live nahi hai');
    const oldPath = row.publishedPath;
    const target = await this.redirectTarget(body.redirectTo, row.locale);
    const statusCode = body.statusCode ?? (target ? 301 : undefined);
    if (statusCode && statusCode !== 410 && !target) throw new BadRequestException('301/302 ke liye redirectTo do');

    const tags = await this.fanout.entryTags({ id, type: row.type as CmsEntryType, locale: row.locale, paths: [oldPath], liveStateChanged: true });
    let redirectCreated: PublicRedirect | undefined;
    let revisionId = '';
    const newVersion = row.version + 1;
    await this.prisma.$transaction(async (tx) => {
      const rev = await tx.cmsRevision.create({
        data: { entryId: id, subject: 'ENTRY', version: newVersion, action: 'UNPUBLISH', snapshot: draftSnapshotOf(row) as unknown as Prisma.InputJsonValue, note: body.note ?? null, createdById: userId },
      });
      revisionId = rev.id;
      await tx.cmsEntry.update({
        where: { id },
        data: {
          published: Prisma.DbNull,
          publishedPath: null,
          publishedRevisionId: null,
          publishedAt: null,
          status: CmsStatus.DRAFT,
          hasUnpublishedChanges: false,
          publishAt: null,
          scheduledRevisionId: null,
          version: newVersion,
          updatedById: userId,
        },
      });
      await tx.cmsEntryRelation.deleteMany({ where: { fromId: id } });
      await tx.cmsEntryFaq.deleteMany({ where: { entryId: id } });
      if (statusCode) {
        const from = localizedPath(row.locale, oldPath);
        const to = statusCode === 410 ? null : (target?.path ?? null);
        const red = await tx.cmsRedirect.upsert({
          where: { fromPath: from },
          create: { fromPath: from, toPath: to, statusCode, isPattern: false, isActive: true, source: 'UNPUBLISH', entryId: target?.entryId ?? null, createdById: userId },
          update: { toPath: to, statusCode, isPattern: false, isActive: true, source: 'UNPUBLISH', entryId: target?.entryId ?? null },
        });
        if (to) await tx.cmsRedirect.updateMany({ where: { toPath: from }, data: { toPath: to } });
        redirectCreated = toPublicRedirect(red);
      }
      await tx.seoPage.updateMany({ where: { path: localizedPath(row.locale, oldPath) }, data: { isPublished: false } });
    }, TX_OPTIONS);

    const revalidation = await this.revalidation.revalidate({ tags: redirectCreated ? [...tags, 'redirects'] : tags, reason, entryId: id, revisionId });
    this.indexNow.enqueue([absoluteUrl(await this.paths.siteUrl(), row.locale, oldPath)]);
    return { entryId: id, revalidation, ...(redirectCreated ? { redirectCreated } : {}) };
  }

  /** `/path` (with locale prefix when relevant) or `entry:<id>` of a live entry. */
  private async redirectTarget(redirectTo: string | undefined, locale: string): Promise<{ path: string; entryId: string | null } | null> {
    if (!redirectTo) return null;
    const link = parseEntryLink(redirectTo);
    if (!link) return { path: redirectTo, entryId: null };
    const target = await this.prisma.cmsEntry.findUnique({ where: { id: link.id }, select: { id: true, locale: true, publishedPath: true } });
    if (!target?.publishedPath) throw new BadRequestException('Redirect wali entry live nahi');
    const base = localizedPath(target.locale || locale, target.publishedPath);
    return { path: link.anchor ? `${base}#${link.anchor}` : base, entryId: target.id };
  }

  async archive(id: string, body: { redirectTo?: string; note?: string }, userId: string | null): Promise<void> {
    const row = await this.load(id);
    if (row.publishedPath) await this.unpublish(id, { redirectTo: body.redirectTo, note: body.note }, userId);
    await this.prisma.cmsEntry.update({
      where: { id },
      data: { status: CmsStatus.ARCHIVED, archivedAt: new Date(), publishAt: null, scheduledRevisionId: null, updatedById: userId, version: { increment: 1 } },
    });
  }

  async restoreArchive(id: string, userId: string | null): Promise<void> {
    const row = await this.load(id);
    if (row.status !== CmsStatus.ARCHIVED) throw new BadRequestException('Entry archived nahi');
    await this.prisma.cmsEntry.update({ where: { id }, data: { status: CmsStatus.DRAFT, archivedAt: null, updatedById: userId, version: { increment: 1 } } });
  }

  // ─── Schedule ───

  async schedule(id: string, body: ScheduleEntryBody, userId: string | null): Promise<{ entryId: string; revisionId: string }> {
    const row = await this.load(id);
    if (body.version !== row.version) throw new EntryConflictException(null);
    if (row.status === CmsStatus.ARCHIVED) throw new BadRequestException('Archived entry schedule nahi ho sakti');
    const publishAt = new Date(body.publishAt);
    if (publishAt.getTime() < Date.now() + 60_000) throw new BadRequestException('Schedule ka waqt kam az kam 1 minute aage ka ho');

    const draft = draftSnapshotOf(row);
    const { path, problems } = await this.publishPath(row, draft);
    const result = await this.checks.run({ entry: row, draft, path, pathProblems: problems, mode: 'publish' });
    if (!result.canPublish) throw new ChecksFailedException(result.issues);

    const newVersion = row.version + 1;
    const options: ScheduleOptions = { ...(body.contentUpdated ? { contentUpdated: true } : {}), ...(body.note ? { note: body.note } : {}) };
    const revisionId = await this.prisma.$transaction(async (tx) => {
      const rev = await tx.cmsRevision.create({
        data: {
          entryId: id,
          subject: 'ENTRY',
          version: newVersion,
          action: 'SCHEDULE',
          snapshot: { ...draft, scheduleOptions: options } as unknown as Prisma.InputJsonValue,
          note: body.note ?? null,
          createdById: userId,
        },
      });
      const updated = await tx.cmsEntry.updateMany({
        where: { id, version: row.version },
        data: {
          publishAt,
          scheduledRevisionId: rev.id,
          status: row.publishedPath ? CmsStatus.PUBLISHED : CmsStatus.SCHEDULED,
          version: newVersion,
          updatedById: userId,
        },
      });
      if (updated.count !== 1) throw new EntryConflictException(null);
      return rev.id;
    }, TX_OPTIONS);
    return { entryId: id, revisionId };
  }

  async cancelSchedule(id: string, userId: string | null): Promise<void> {
    const row = await this.load(id);
    if (!row.scheduledRevisionId && !row.publishAt) throw new BadRequestException('Koi schedule nahi');
    await this.prisma.cmsEntry.update({
      where: { id },
      data: { publishAt: null, scheduledRevisionId: null, status: row.publishedPath ? CmsStatus.PUBLISHED : CmsStatus.DRAFT, updatedById: userId },
    });
  }

  /** Publishes due scheduled revisions. Safe with several API instances: each row is claimed first. */
  @Cron(CronExpression.EVERY_MINUTE)
  async runScheduled(): Promise<void> {
    if (this.cronRunning) return;
    this.cronRunning = true;
    try {
      const due = await this.prisma.cmsEntry.findMany({
        where: { publishAt: { lte: new Date() }, scheduledRevisionId: { not: null } },
        select: { id: true, publishAt: true, scheduledRevisionId: true, publishedPath: true },
        take: 20,
        orderBy: { publishAt: 'asc' },
      });
      for (const e of due) {
        const claim = await this.prisma.cmsEntry.updateMany({
          where: { id: e.id, publishAt: e.publishAt, scheduledRevisionId: e.scheduledRevisionId },
          data: { publishAt: null },
        });
        if (claim.count !== 1 || !e.scheduledRevisionId) continue;
        await this.publishScheduled(e.id, e.scheduledRevisionId, e.publishedPath !== null);
      }
    } catch (error) {
      this.logger.error(`Scheduled publish run failed: ${String(error)}`);
    } finally {
      this.cronRunning = false;
    }
  }

  private async publishScheduled(entryId: string, revisionId: string, isLive: boolean): Promise<void> {
    const rev = await this.prisma.cmsRevision.findUnique({ where: { id: revisionId } });
    const row = await this.prisma.cmsEntry.findUnique({ where: { id: entryId } });
    if (!rev || !row) return;
    const options = ((rev.snapshot as Rec | null)?.scheduleOptions ?? {}) as ScheduleOptions;
    try {
      await this.publish(
        entryId,
        { version: row.version, ...(options.note ? { note: options.note } : {}), ...(options.contentUpdated ? { contentUpdated: true } : {}) },
        rev.createdById,
        { fromRevision: { id: rev.id, draft: draftFromRevision(rev.snapshot, draftSnapshotOf(row)) } },
      );
      this.logger.log(`Scheduled publish done: ${entryId}`);
    } catch (error) {
      const message = error instanceof ChecksFailedException
        ? error.issues.filter((i) => i.severity === 'error').map((i) => i.message).join('; ')
        : error instanceof Error ? error.message : String(error);
      this.logger.warn(`Scheduled publish failed for ${entryId}: ${message}`);
      await this.prisma.cmsEntry.update({
        where: { id: entryId },
        data: { scheduledRevisionId: null, status: isLive ? CmsStatus.PUBLISHED : CmsStatus.DRAFT },
      });
      await this.prisma.cmsRevision.update({
        where: { id: revisionId },
        data: { note: `${rev.note ? `${rev.note} | ` : ''}Schedule publish fail: ${message}`.slice(0, 2000) },
      });
    }
  }

  // ─── Bulk ───

  async bulk(body: BulkEntriesBody, userId: string | null): Promise<BulkEntriesResponse> {
    const results: BulkEntriesResponse['results'] = [];
    for (const id of body.ids) {
      try {
        if (body.action === 'publish') {
          const row = await this.load(id);
          await this.publish(id, { version: row.version }, userId);
        } else if (body.action === 'unpublish') {
          await this.unpublish(id, {}, userId);
        } else {
          await this.archive(id, {}, userId);
        }
        results.push({ id, ok: true });
      } catch (error) {
        if (error instanceof ChecksFailedException) results.push({ id, ok: false, issues: error.issues.filter((i) => i.severity === 'error') });
        else {
          const message = error instanceof Error ? error.message : String(error);
          results.push({ id, ok: false, issues: [{ code: 'INVALID_DATA', severity: 'error', message }] });
        }
      }
    }
    return results.length ? { results } : { results: [] };
  }
}
