/**
 * Reusable FAQs with their own draft and publish (API-CONTRACT 8.3).
 *
 * The draft is `question` / `answer`; the live copy is `publishedQuestion` /
 * `publishedAnswer`. Publishing an FAQ revalidates every page that shows it
 * (the `CmsEntryFaq` published index), the /faq hub and llms.txt.
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CmsStatus, Prisma, type CmsFaq } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_LOCALE,
  cacheTags,
  type AdminFaq,
  type CreateFaqBody,
  type FaqMutationResponse,
  type FaqTopic,
  type Paginated,
  type PatchFaqBody,
} from '../contract/cms-contract';
import { CmsContentService } from '../content';
import { checksFailed, iso } from '../public/cms-http';
import { CmsSiteEvents } from '../public/cms-site-events.service';
import { writeSubjectRevision } from '../public/cms-subject-revision';
import { paginated, parsePagination } from '../../_shared/helpers/pagination.helper';

export interface FaqsQuery {
  locale?: string | undefined;
  topic?: string | undefined;
  status?: CmsStatus | undefined;
  q?: string | undefined;
  page: number;
  limit: number;
}

/** Label for a topic key: "fbr-invoicing" → "Fbr invoicing". Editors pick keys; there is no label table. */
export function topicLabel(key: string | null): string {
  if (!key) return 'General';
  const words = key.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

@Injectable()
export class CmsFaqsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: CmsContentService,
    private readonly events: CmsSiteEvents,
  ) {}

  private async usedOn(ids: readonly string[]): Promise<Map<string, { id: string; title: string; path: string }[]>> {
    const out = new Map<string, { id: string; title: string; path: string }[]>();
    if (ids.length === 0) return out;
    const [drafts, live] = await Promise.all([
      this.prisma.cmsEntry.findMany({
        where: { faqIds: { hasSome: [...ids] }, status: { not: 'ARCHIVED' } },
        select: { id: true, title: true, path: true, faqIds: true },
      }),
      this.prisma.cmsEntryFaq.findMany({
        where: { faqId: { in: [...ids] } },
        select: { faqId: true, entry: { select: { id: true, title: true, path: true, publishedPath: true } } },
      }),
    ]);
    const add = (faqId: string, e: { id: string; title: string; path: string }) => {
      const list = out.get(faqId) ?? [];
      if (!list.some((x) => x.id === e.id)) list.push(e);
      out.set(faqId, list);
    };
    for (const e of drafts) for (const faqId of e.faqIds) if (ids.includes(faqId)) add(faqId, { id: e.id, title: e.title, path: e.path });
    for (const l of live) add(l.faqId, { id: l.entry.id, title: l.entry.title, path: l.entry.publishedPath ?? l.entry.path });
    return out;
  }

  private toAdmin(row: CmsFaq, usedOn: { id: string; title: string; path: string }[] = []): AdminFaq {
    return {
      id: row.id,
      locale: row.locale,
      translationKey: row.translationKey,
      topic: row.topic,
      question: row.question,
      answer: row.answer,
      status: row.status,
      publishedQuestion: row.publishedQuestion,
      publishedAnswer: row.publishedAnswer,
      publishedAt: iso(row.publishedAt),
      hasUnpublishedChanges: row.hasUnpublishedChanges,
      sourceNote: row.sourceNote,
      sortOrder: row.sortOrder,
      createdById: row.createdById,
      updatedById: row.updatedById,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      usedOn,
    };
  }

  private async findOrThrow(id: string): Promise<CmsFaq> {
    const row = await this.prisma.cmsFaq.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('FAQ nahi mila');
    return row;
  }

  async list(query: FaqsQuery): Promise<Paginated<AdminFaq>> {
    const { page, limit, skip } = parsePagination(query);
    const where: Prisma.CmsFaqWhereInput = {};
    if (query.locale) where.locale = query.locale;
    if (query.topic) where.topic = query.topic;
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { question: { contains: query.q, mode: 'insensitive' } },
        { answer: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.cmsFaq.findMany({ where, orderBy: [{ topic: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }], skip, take: limit }),
      this.prisma.cmsFaq.count({ where }),
    ]);
    const used = await this.usedOn(rows.map((r) => r.id));
    return paginated(rows.map((r) => this.toAdmin(r, used.get(r.id))), total, page, limit);
  }

  async get(id: string): Promise<AdminFaq> {
    const row = await this.findOrThrow(id);
    return this.toAdmin(row, (await this.usedOn([id])).get(id));
  }

  async create(body: CreateFaqBody, userId: string | null): Promise<AdminFaq> {
    const locale = body.locale ?? DEFAULT_LOCALE;
    const last = await this.prisma.cmsFaq.findFirst({
      where: { locale, topic: body.topic ?? null },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const row = await this.prisma.cmsFaq.create({
      data: {
        locale,
        topic: body.topic ?? null,
        question: body.question,
        answer: body.answer,
        sourceNote: body.sourceNote ?? null,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        createdById: userId,
        updatedById: userId,
      },
    });
    return this.toAdmin(row);
  }

  async update(id: string, body: PatchFaqBody, userId: string | null): Promise<AdminFaq> {
    const current = await this.findOrThrow(id);
    const question = body.question ?? current.question;
    const answer = body.answer ?? current.answer;
    const isLive = current.status === CmsStatus.PUBLISHED;
    const row = await this.prisma.cmsFaq.update({
      where: { id },
      data: {
        ...(body.locale !== undefined ? { locale: body.locale } : {}),
        ...(body.topic !== undefined ? { topic: body.topic } : {}),
        ...(body.sourceNote !== undefined ? { sourceNote: body.sourceNote } : {}),
        question,
        answer,
        hasUnpublishedChanges: isLive && (question !== current.publishedQuestion || answer !== current.publishedAnswer),
        updatedById: userId,
      },
    });
    // A topic change moves a live FAQ on the /faq hub.
    if (isLive && body.topic !== undefined && body.topic !== current.topic) {
      await this.events.changed({ tags: [cacheTags.faq(row.locale), cacheTags.llms], reason: 'faq' });
    }
    return this.get(row.id);
  }

  /** Site tags for an FAQ: every live page showing it, the FAQ hub and llms. */
  private async tagsFor(faq: CmsFaq): Promise<string[]> {
    const links = await this.prisma.cmsEntryFaq.findMany({
      where: { faqId: faq.id, entry: { publishedPath: { not: null } } },
      select: { entry: { select: { locale: true, publishedPath: true } } },
    });
    return [
      ...links.map((l) => cacheTags.page(l.entry.locale, l.entry.publishedPath as string)),
      cacheTags.faq(faq.locale),
      cacheTags.llms,
    ];
  }

  async publish(id: string, userId: string | null): Promise<FaqMutationResponse> {
    const current = await this.findOrThrow(id);
    const issues = (await this.content.check({ fields: { question: current.question, answer: current.answer }, locale: current.locale }))
      .filter((i) => i.severity === 'error');
    if (issues.length > 0) throw checksFailed(issues);

    const { row, revisionId } = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.cmsFaq.update({
        where: { id },
        data: {
          status: CmsStatus.PUBLISHED,
          publishedQuestion: current.question,
          publishedAnswer: current.answer,
          publishedAt: new Date(),
          hasUnpublishedChanges: false,
          updatedById: userId,
        },
      });
      const revId = await writeSubjectRevision(tx, {
        subject: 'FAQ',
        key: id,
        action: 'PUBLISH',
        snapshot: { question: current.question, answer: current.answer, topic: current.topic, locale: current.locale },
        userId,
      });
      return { row: saved, revisionId: revId };
    });
    const revalidation = await this.events.changed({ tags: await this.tagsFor(row), reason: 'faq', revisionId });
    return { faq: await this.get(row.id), revalidation };
  }

  async unpublish(id: string, userId: string | null): Promise<FaqMutationResponse> {
    const current = await this.findOrThrow(id);
    const tags = await this.tagsFor(current);
    const { revisionId } = await this.prisma.$transaction(async (tx) => {
      await tx.cmsFaq.update({
        where: { id },
        data: { status: CmsStatus.DRAFT, publishedQuestion: null, publishedAnswer: null, publishedAt: null, hasUnpublishedChanges: false, updatedById: userId },
      });
      const revId = await writeSubjectRevision(tx, {
        subject: 'FAQ',
        key: id,
        action: 'UNPUBLISH',
        snapshot: { question: current.publishedQuestion, answer: current.publishedAnswer },
        userId,
      });
      return { revisionId: revId };
    });
    const revalidation = await this.events.changed({ tags, reason: 'faq', revisionId });
    return { faq: await this.get(id), revalidation };
  }

  async remove(id: string): Promise<void> {
    const current = await this.findOrThrow(id);
    const liveUse = await this.prisma.cmsEntryFaq.count({ where: { faqId: id, entry: { publishedPath: { not: null } } } });
    if (liveUse > 0) {
      throw new ConflictException(`Yeh FAQ ${liveUse} live page(s) par laga hai. Pehle un pages se hata kar publish karein.`);
    }
    await this.prisma.cmsFaq.delete({ where: { id } });
    if (current.status === CmsStatus.PUBLISHED) {
      await this.events.changed({ tags: [cacheTags.faq(current.locale), cacheTags.llms], reason: 'faq' });
    }
  }

  async topics(locale?: string): Promise<FaqTopic[]> {
    const grouped = await this.prisma.cmsFaq.groupBy({
      by: ['topic'],
      ...(locale ? { where: { locale } } : {}),
      _count: { _all: true },
    });
    return grouped
      .map((g) => ({ key: g.topic ?? '', label: topicLabel(g.topic), count: g._count._all }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
}
