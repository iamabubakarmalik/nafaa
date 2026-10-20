/**
 * Website dashboard and health report (API-CONTRACT 8.9).
 *
 * The health report looks at what is live now: pages below their quality
 * gate, weak titles and descriptions, duplicate titles, orphans (fewer than
 * 3 inbound links), stale fact-checked pages, links and tokens that broke
 * after publish, missing media and case studies whose consent was withdrawn.
 */
import { Injectable } from '@nestjs/common';
import { CmsStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CMS_ENTRY_TYPES,
  FACT_CHECK_TYPES,
  TEXT_LIMITS,
  type CmsDashboard,
  type CmsEntryType,
  type CmsHealthReport,
  type Issue,
} from '../contract/cms-contract';
import { CmsContentService, type TokenContext } from '../content';
import { CmsCardsService, type LiveEntry } from '../public/cms-cards.service';
import { dataString, isIndexable } from '../public/cms-snapshot';
import { SiteRevalidationBridge } from '../public/site-revalidation.bridge';

const MIN_INBOUND = 3;
const STALE_DAYS = 365;
const DAY_MS = 24 * 3600 * 1000;

function issue(code: Issue['code'], severity: Issue['severity'], message: string, field?: string): Issue {
  return { code, severity, message, ...(field ? { field } : {}) };
}

@Injectable()
export class CmsDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cards: CmsCardsService,
    private readonly content: CmsContentService,
    private readonly bridge: SiteRevalidationBridge,
  ) {}

  async dashboard(): Promise<CmsDashboard> {
    const [grouped, live, scheduled, lastRevision] = await Promise.all([
      this.prisma.cmsEntry.groupBy({ by: ['type', 'status'], _count: { _all: true } }),
      this.cards.live({}),
      this.prisma.cmsEntry.findMany({
        where: { publishAt: { not: null }, status: { not: CmsStatus.ARCHIVED } },
        orderBy: { publishAt: 'asc' },
        take: 50,
        select: { id: true, title: true, publishAt: true },
      }),
      this.prisma.cmsRevision.findFirst({
        where: { OR: [{ revalidatedAt: { not: null } }, { revalidateError: { not: null } }] },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, revalidatedAt: true, revalidateError: true },
      }),
    ]);

    const byType = new Map<CmsEntryType, CmsDashboard['byType'][number]>();
    const row = (type: CmsEntryType) => {
      const r = byType.get(type) ?? { type, draft: 0, scheduled: 0, published: 0, noindex: 0 };
      byType.set(type, r);
      return r;
    };
    for (const g of grouped) {
      const r = row(g.type);
      if (g.status === CmsStatus.DRAFT) r.draft += g._count._all;
      if (g.status === CmsStatus.SCHEDULED) r.scheduled += g._count._all;
    }
    for (const e of live) {
      const r = row(e.row.type);
      r.published += 1;
      if (!e.content.robots.index) r.noindex += 1;
    }

    const memory = this.bridge.lastResult();
    const stored = lastRevision
      ? {
          at: (lastRevision.revalidatedAt ?? lastRevision.createdAt).toISOString(),
          ok: lastRevision.revalidateError === null,
          ...(lastRevision.revalidateError ? { error: lastRevision.revalidateError } : {}),
        }
      : null;
    const lastRevalidation = memory && (!stored || memory.at > stored.at) ? memory : stored;

    return {
      byType: CMS_ENTRY_TYPES.filter((t) => byType.has(t)).map((t) => byType.get(t) as CmsDashboard['byType'][number]),
      scheduled: scheduled.map((s) => ({ id: s.id, title: s.title, publishAt: (s.publishAt as Date).toISOString() })),
      lastRevalidation,
    };
  }

  async health(): Promise<CmsHealthReport> {
    const live = await this.cards.live({});
    const issues = new Map<string, Issue[]>();
    const add = (e: LiveEntry, i: Issue) => {
      const list = issues.get(e.row.id) ?? [];
      list.push(i);
      issues.set(e.row.id, list);
    };

    // Inbound links from the published index (other entries only).
    const inbound = await this.prisma.cmsEntryRelation.groupBy({ by: ['toId'], _count: { _all: true } });
    const inboundById = new Map(inbound.map((g) => [g.toId, g._count._all]));

    // Titles per locale, for duplicates among indexable pages.
    const titles = new Map<string, LiveEntry[]>();
    const mediaIds = new Set<string>();
    for (const e of live) {
      if (isIndexable(e.content)) {
        const key = `${e.row.locale}|${e.content.seoTitle.trim().toLowerCase()}`;
        titles.set(key, [...(titles.get(key) ?? []), e]);
      }
      for (const id of e.content.mediaIds) mediaIds.add(id);
      if (e.content.imageId) mediaIds.add(e.content.imageId);
    }
    const existingMedia = new Set(
      (await this.prisma.cmsMedia.findMany({ where: { id: { in: [...mediaIds] }, deletedAt: null }, select: { id: true } })).map((m) => m.id),
    );

    const caseStudyCustomers = live
      .filter((e) => e.row.type === 'CASE_STUDY')
      .map((e) => dataString(e.content, 'customerId'))
      .filter((x): x is string => !!x);
    const customers = new Map(
      (await this.prisma.cmsCustomer.findMany({ where: { id: { in: caseStudyCustomers } }, select: { id: true, isPublic: true, consentScope: true, consentAt: true } })).map((c) => [c.id, c]),
    );

    const now = Date.now();
    const tokenCtx = new Map<string, TokenContext>();
    for (const e of live) {
      const c = e.content;
      const indexable = isIndexable(c);

      if (!c.quality.passed) {
        add(e, issue('WORDS_BELOW_GATE', 'warning', `Live, noindex: ${c.quality.wordCount}/${c.quality.gate ?? '?'} words`));
      }
      const titleLen = c.seoTitle.length;
      if (titleLen < TEXT_LIMITS.titleChars.min || titleLen > TEXT_LIMITS.titleChars.max) {
        add(e, issue('TITLE_LENGTH', 'warning', `SEO title ${titleLen} huroof (${TEXT_LIMITS.titleChars.min}-${TEXT_LIMITS.titleChars.max} behtar)`, 'seoTitle'));
      }
      if (!c.seoDescription.trim()) add(e, issue('DESCRIPTION_LENGTH', 'warning', 'Meta description khali hai', 'seoDescription'));
      if (indexable && e.row.publishedPath !== '/' && (inboundById.get(e.row.id) ?? 0) < MIN_INBOUND) {
        add(e, issue('ORPHAN', 'warning', `Sirf ${inboundById.get(e.row.id) ?? 0} pages is page ko link karte hain (kam az kam ${MIN_INBOUND})`));
      }
      if ((FACT_CHECK_TYPES as readonly string[]).includes(e.row.type)) {
        const checked = c.factCheckedAt ? Date.parse(c.factCheckedAt) : NaN;
        if (Number.isNaN(checked) || now - checked > STALE_DAYS * DAY_MS) {
          add(e, issue('STALE', 'warning', `Fact-check ${STALE_DAYS} din se purana hai ya hua hi nahi`, 'factCheckedAt'));
        }
      }
      const missing = [...c.mediaIds, ...(c.imageId ? [c.imageId] : [])].filter((id) => !existingMedia.has(id));
      if (missing.length > 0) add(e, issue('MEDIA_MISSING', 'error', `${missing.length} media file(s) library me nahi rahe`));
      if (e.row.type === 'CASE_STUDY') {
        const cust = customers.get(dataString(c, 'customerId') ?? '');
        if (!cust || !cust.isPublic || !cust.consentAt || !cust.consentScope.includes('CASE_STUDY')) {
          add(e, issue('NO_CONSENT', 'error', 'Customer ki CASE_STUDY consent ab darj nahi'));
        }
      }
      // Links and tokens that broke after publish (a target went offline, a plan or fact was removed).
      let tokens = tokenCtx.get(e.row.locale);
      if (!tokens) {
        tokens = await this.cards.tokenContext(e.row.locale);
        tokenCtx.set(e.row.locale, tokens);
      }
      const broken = await this.content.check({ fields: { summary: c.summary, blocks: c.blocks, data: c.data }, locale: e.row.locale, blocks: c.blocks, tokens });
      for (const b of broken) if (b.code === 'BROKEN_LINK' || b.code === 'UNKNOWN_TOKEN') add(e, b);
    }
    for (const group of titles.values()) {
      if (group.length < 2) continue;
      for (const e of group) add(e, issue('DUPLICATE_TITLE', 'error', `Yahi title ${group.length - 1} aur page(s) ka bhi hai`, 'seoTitle'));
    }

    return {
      items: live
        .filter((e) => issues.has(e.row.id))
        .map((e) => ({ entryId: e.row.id, title: e.content.title, path: e.row.publishedPath as string, issues: issues.get(e.row.id) as Issue[] }))
        .sort((a, b) => b.issues.filter((i) => i.severity === 'error').length - a.issues.filter((i) => i.severity === 'error').length),
    };
  }

  revalidateAll() {
    return this.bridge.revalidateAll();
  }
}
