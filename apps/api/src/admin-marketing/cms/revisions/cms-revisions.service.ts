/**
 * Revisions (API-CONTRACT 8.2): list, detail, diff against the current draft,
 * restore into the draft (never published by restore) and the history of
 * menus, settings and FAQs.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CmsStatus, Prisma, type CmsRevision } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DRAFT_SNAPSHOT_FIELDS,
  type CmsEntryType,
  type DraftBlock,
  type RevisionAction,
  type RevisionDetail,
  type RevisionDiff,
  type RevisionListItem,
  type RevisionSubject,
} from '../contract/cms-contract';
import { CmsPathService } from '../paths/cms-path.service';
import { EntryConflictException } from '../publishing/cms-errors';
import { draftFromRevision, draftSnapshotOf, hasUnpublishedChanges, stableStringify } from '../publishing/snapshot';

@Injectable()
export class CmsRevisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paths: CmsPathService,
  ) {}

  private async names(ids: (string | null)[]): Promise<Map<string, string>> {
    const list = [...new Set(ids.filter((v): v is string => !!v))];
    if (!list.length) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: list } }, select: { id: true, fullName: true } });
    return new Map(users.map((u) => [u.id, u.fullName]));
  }

  private toItem(r: CmsRevision, names: Map<string, string>): RevisionListItem {
    return {
      id: r.id,
      version: r.version,
      action: r.action as RevisionAction,
      note: r.note,
      createdById: r.createdById,
      createdByName: r.createdById ? (names.get(r.createdById) ?? null) : null,
      createdAt: r.createdAt.toISOString(),
      revalidatedAt: r.revalidatedAt?.toISOString() ?? null,
      revalidateError: r.revalidateError,
    };
  }

  async list(entryId: string): Promise<RevisionListItem[]> {
    const rows = await this.prisma.cmsRevision.findMany({ where: { entryId }, orderBy: { createdAt: 'desc' }, take: 200 });
    const names = await this.names(rows.map((r) => r.createdById));
    return rows.map((r) => this.toItem(r, names));
  }

  async detail(revisionId: string): Promise<RevisionDetail> {
    const r = await this.prisma.cmsRevision.findUnique({ where: { id: revisionId } });
    if (!r) throw new NotFoundException('Revision nahi mili');
    const names = await this.names([r.createdById]);
    return {
      ...this.toItem(r, names),
      entryId: r.entryId,
      subject: r.subject as RevisionSubject,
      subjectKey: r.subjectKey,
      snapshot: (r.snapshot ?? {}) as Record<string, unknown>,
    };
  }

  async history(subject: 'MENU' | 'SETTING' | 'FAQ', key: string): Promise<RevisionListItem[]> {
    const rows = await this.prisma.cmsRevision.findMany({
      where: { subject, subjectKey: key },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const names = await this.names(rows.map((r) => r.createdById));
    return rows.map((r) => this.toItem(r, names));
  }

  private async entryRevision(entryId: string, revisionId: string): Promise<CmsRevision> {
    const r = await this.prisma.cmsRevision.findUnique({ where: { id: revisionId } });
    if (!r || r.entryId !== entryId) throw new NotFoundException('Revision nahi mili');
    return r;
  }

  /** Field and block changes from the revision (`before`) to the current draft (`after`). */
  async diff(entryId: string, revisionId: string): Promise<RevisionDiff> {
    const row = await this.prisma.cmsEntry.findUnique({ where: { id: entryId } });
    if (!row) throw new NotFoundException('Entry nahi mili');
    const rev = await this.entryRevision(entryId, revisionId);
    const current = draftSnapshotOf(row);
    const before = draftFromRevision(rev.snapshot, current);
    const fields: RevisionDiff['fields'] = [];
    for (const field of DRAFT_SNAPSHOT_FIELDS) {
      if (field === 'blocks') continue;
      if (stableStringify(before[field]) !== stableStringify(current[field])) fields.push({ field, before: before[field], after: current[field] });
    }
    const blocks: RevisionDiff['blocks'] = [];
    const prev = new Map((before.blocks as DraftBlock[]).map((b, i) => [b.id, { b, i }]));
    const next = new Map((current.blocks as DraftBlock[]).map((b, i) => [b.id, { b, i }]));
    for (const [id, p] of prev) {
      const n = next.get(id);
      if (!n) blocks.push({ id, change: 'removed', before: p.b });
      else if (stableStringify(p.b) !== stableStringify(n.b)) blocks.push({ id, change: 'changed', before: p.b, after: n.b });
      else if (p.i !== n.i) blocks.push({ id, change: 'moved', before: p.i, after: n.i });
    }
    for (const [id, n] of next) if (!prev.has(id)) blocks.push({ id, change: 'added', after: n.b });
    return { fields, blocks };
  }

  /** Copies a revision's draft fields into the draft and writes a RESTORE revision. */
  async restore(entryId: string, revisionId: string, userId: string | null): Promise<void> {
    const row = await this.prisma.cmsEntry.findUnique({ where: { id: entryId } });
    if (!row) throw new NotFoundException('Entry nahi mili');
    if (row.status === CmsStatus.ARCHIVED) throw new BadRequestException('Archived entry pehle restore karein');
    const rev = await this.entryRevision(entryId, revisionId);
    const draft = draftFromRevision(rev.snapshot, draftSnapshotOf(row));
    const type = row.type as CmsEntryType;
    const path = await this.paths.resolvePathOrThrow({ type, locale: row.locale, slug: draft.slug, parentId: draft.parentId, entryId });
    const newVersion = row.version + 1;
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.cmsEntry.updateMany({
        where: { id: entryId, version: row.version },
        data: {
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
          hasUnpublishedChanges: hasUnpublishedChanges(row, draft),
          updatedById: userId,
          version: newVersion,
        },
      });
      if (res.count !== 1) throw new EntryConflictException(null);
      await tx.cmsRevision.create({
        data: {
          entryId,
          subject: 'ENTRY',
          version: newVersion,
          action: 'RESTORE',
          snapshot: draft as unknown as Prisma.InputJsonValue,
          note: `Restored from v${rev.version} (${rev.action})`,
          createdById: userId,
        },
      });
    });
  }
}
