/**
 * The public read API (`/public/site/*`, API-CONTRACT 2). Every method
 * returns published data only and goes through the 60 s LRU cache.
 */
import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CmsStatus, Prisma, SaleStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CMS_ENTRY_TYPES,
  DEFAULT_LOCALE,
  PLAN_FEATURE_KEYS,
  SITEMAP_SECTIONS,
  SITEMAP_SECTION_KEYS,
  isMoneyType,
  type CmsEntryType,
  type EntryCard,
  type FeatureStatus,
  type LlmsPayload,
  type PageTemplate,
  type PreviewValidation,
  type PublicCustomer,
  type PublicEntity,
  type PublicEntriesResponse,
  type PublicEntry,
  type PublicFaqsResponse,
  type PublicLayout,
  type PublicPathsResponse,
  type PublicPlan,
  type PublicRedirectsResponse,
  type PublicSitemapResponse,
  type PublicStatsResponse,
  type PublicTestimonial,
  type SearchIndexResponse,
  type SitemapSection,
  type StatMetric,
} from '../contract/cms-contract';
import { CmsTokenService, formatCount, formatPkr, minMonthlyPrice } from '../content';
import { topicLabel } from '../faqs/cms-faqs.service';
import { CmsMenusService } from '../menus/cms-menus.service';
import { absoluteUrl, localizedPath } from '../paths/cms-paths';
import { CmsRedirectsService } from '../redirects/cms-redirects.service';
import { CmsSettingsService } from '../settings/cms-settings.service';
import { CmsCardsService, type LiveEntry } from './cms-cards.service';
import { PUBLIC_MEDIA_SELECT, toPublicMedia } from './cms-media-view';
import { CmsPublicCacheService } from './cms-public-cache.service';
import { CmsPublicEntryService } from './cms-public-entry.service';
import { dataString, isIndexable } from './cms-snapshot';

/** Section titles for llms.txt (English site copy). */
const LLMS_SECTION_TITLES: Record<SitemapSection, string> = {
  pages: 'Main pages',
  products: 'Products and integrations',
  industries: 'Industries, solutions and services',
  locations: 'Cities',
  compliance: 'Tax compliance (FBR, PRA, SRB, KPRA)',
  compare: 'Comparisons and best-of lists',
  content: 'Guides, blog and tools',
  glossary: 'Glossary',
  people: 'Team',
  developers: 'Developer docs',
};

const TOP_FAQS = 20;
const DAY_MS = 24 * 3600 * 1000;

export interface EntriesQuery {
  type: CmsEntryType;
  locale: string;
  tag?: string | undefined;
  group?: string | undefined;
  featured?: boolean | undefined;
  parentId?: string | undefined;
  status?: FeatureStatus[] | undefined;
  sort: 'order' | 'recent' | 'title';
  limit: number;
  cursor?: string | undefined;
}

export interface TestimonialsQuery {
  locale: string;
  ids?: string[] | undefined;
  industry?: string | undefined;
  city?: string | undefined;
  limit?: number | undefined;
}

export interface CustomersQuery {
  ids?: string[] | undefined;
  industry?: string | undefined;
  city?: string | undefined;
  limit?: number | undefined;
}

function encodeCursor(offset: number): string {
  return Buffer.from(`o:${offset}`).toString('base64url');
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  const m = /^o:(\d{1,7})$/.exec(Buffer.from(cursor, 'base64url').toString('utf8'));
  return m?.[1] ? Number(m[1]) : 0;
}

function lastmodOf(e: LiveEntry): string {
  return (e.row.contentUpdatedAt ?? e.row.publishedAt ?? e.row.updatedAt).toISOString();
}

@Injectable()
export class CmsPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CmsPublicCacheService,
    private readonly cards: CmsCardsService,
    private readonly entryBuilder: CmsPublicEntryService,
    private readonly settings: CmsSettingsService,
    private readonly menus: CmsMenusService,
    private readonly redirects: CmsRedirectsService,
    private readonly tokens: CmsTokenService,
  ) {}

  // ─── Entries ───

  async entry(path: string, locale: string): Promise<PublicEntry> {
    const entry = await this.cache.get(`entry:${locale}:${path}`, () => this.entryBuilder.byPath(path, locale));
    if (!entry) throw new NotFoundException('Is path par koi page publish nahi');
    return entry;
  }

  previewInfo(token: string): Promise<PreviewValidation> {
    return this.entryBuilder.previewInfo(token);
  }

  previewPage(token: string, path: string): Promise<PublicEntry> {
    return this.entryBuilder.previewPage(token, path);
  }

  entries(q: EntriesQuery): Promise<PublicEntriesResponse> {
    const key = `entries:${JSON.stringify(q)}`;
    return this.cache.get(key, async () => {
      const where: Prisma.CmsEntryWhereInput = { type: q.type, locale: q.locale };
      if (q.tag) where.relationsFrom = { some: { toId: q.tag, kind: 'TAG' } };
      if (q.parentId) where.parentId = q.parentId;
      let list = await this.cards.live(where);
      if (q.group) list = list.filter((e) => dataString(e.content, 'group') === q.group);
      if (q.featured !== undefined) list = list.filter((e) => e.content.featured === q.featured);
      if (q.status?.length) list = list.filter((e) => e.content.featureStatus !== null && q.status?.includes(e.content.featureStatus));
      list.sort((a, b) => {
        if (q.sort === 'recent') return lastmodOf(b).localeCompare(lastmodOf(a));
        if (q.sort === 'title') return a.content.title.localeCompare(b.content.title);
        return a.content.sortOrder - b.content.sortOrder || a.content.title.localeCompare(b.content.title);
      });
      const offset = decodeCursor(q.cursor);
      const page = list.slice(offset, offset + q.limit);
      const items = await this.cards.cards(page, q.locale);
      const next = offset + q.limit < list.length ? encodeCursor(offset + q.limit) : null;
      return { items, nextCursor: next };
    });
  }

  paths(type: CmsEntryType | undefined, locale: string): Promise<PublicPathsResponse> {
    return this.cache.get(`paths:${type ?? '*'}:${locale}`, async () => {
      const list = await this.cards.live({ locale, ...(type ? { type } : {}) }, [{ type: 'asc' }, { publishedPath: 'asc' }]);
      return { items: list.map((e) => ({ type: e.row.type, path: e.row.publishedPath as string, locale: e.row.locale, updatedAt: lastmodOf(e) })) };
    });
  }

  searchIndex(locale: string): Promise<SearchIndexResponse> {
    return this.cache.get(`search:${locale}`, async () => {
      const list = (await this.cards.live({ locale }, [{ type: 'asc' }, { sortOrder: 'asc' }])).filter((e) => isIndexable(e.content));
      const cards = await this.cards.cards(list, locale);
      return {
        items: cards.map((c) => ({ title: c.title, path: c.path, type: c.type, ...(c.summary ? { summary: c.summary } : {}) })),
      };
    });
  }

  sitemap(section: SitemapSection, locale: string): Promise<PublicSitemapResponse> {
    return this.cache.get(`sitemap:${section}:${locale}`, async () => {
      const types = SITEMAP_SECTIONS[section] as readonly CmsEntryType[];
      const list = (await this.cards.live({ locale, type: { in: [...types] } }, [{ publishedPath: 'asc' }])).filter((e) => isIndexable(e.content));
      if (list.length === 0) return { items: [] };
      const [siteUrl, media] = await Promise.all([
        this.cards.siteUrl(),
        this.cards.mediaMap(list.map((e) => e.content.imageId).filter((x): x is string => !!x), locale),
      ]);
      const keys = [...new Set(list.map((e) => e.row.translationKey).filter((k): k is string => !!k))];
      const translations = keys.length
        ? await this.prisma.cmsEntry.findMany({
            where: { translationKey: { in: keys }, publishedPath: { not: null }, status: { in: [CmsStatus.PUBLISHED, CmsStatus.SCHEDULED] } },
            select: { translationKey: true, locale: true, publishedPath: true },
          })
        : [];
      return {
        items: list.map((e) => {
          const path = e.row.publishedPath as string;
          const image = e.content.imageId ? media.get(e.content.imageId) : undefined;
          const group = e.row.translationKey ? translations.filter((t) => t.translationKey === e.row.translationKey) : [];
          return {
            url: absoluteUrl(siteUrl, locale, path),
            lastmod: lastmodOf(e),
            images: image ? [{ url: image.url, title: image.alt }] : [],
            alternates: group.length > 1 ? group.map((t) => ({ hreflang: t.locale, url: absoluteUrl(siteUrl, t.locale, t.publishedPath as string) })) : [],
          };
        }),
      };
    });
  }

  // ─── Layout, entity, plans ───

  layout(locale: string): Promise<PublicLayout> {
    return this.cache.get(`layout:${locale}`, async () => {
      const [site, menus, siteRow, menuRows] = await Promise.all([
        this.settings.get('site', locale),
        this.menus.publicMenus(locale),
        this.settings.raw('site', locale),
        this.prisma.cmsMenu.findMany({ where: { locale: { in: [locale, DEFAULT_LOCALE] } }, select: { updatedAt: true } }),
      ]);
      if (!site) throw new ServiceUnavailableException('Site settings (site) abhi save nahi hue');
      const stamps = [siteRow?.updatedAt, ...menuRows.map((m) => m.updatedAt)].filter((d): d is Date => d instanceof Date);
      const updatedAt = new Date(Math.max(0, ...stamps.map((d) => d.getTime())));
      return { locale, menus, site, updatedAt: updatedAt.toISOString() };
    });
  }

  /** Active, public plans with display settings. Feature rows only for keys the owner labelled in settings. */
  plans(): Promise<PublicPlan[]> {
    return this.cache.get('plans', async () => {
      const [rows, pricing] = await Promise.all([
        this.prisma.plan.findMany({ where: { isActive: true, isPublic: true }, orderBy: [{ sortOrder: 'asc' }, { priceMonthly: 'asc' }] }),
        this.settings.get('pricing'),
      ]);
      const labels = pricing?.featureLabels ?? {};
      return rows.map((p) => {
        const display = pricing?.plans[p.slug] ?? {};
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          priceMonthly: p.priceMonthly,
          priceQuarterly: p.priceQuarterly,
          priceYearly: p.priceYearly,
          currency: 'PKR' as const,
          trialDays: p.trialDays,
          sortOrder: p.sortOrder,
          limits: { maxProducts: p.maxProducts, maxUsers: p.maxUsers, maxShops: p.maxShops, maxSalesPerMonth: p.maxSalesPerMonth },
          features: PLAN_FEATURE_KEYS.filter((k) => !!labels[k]).map((k) => ({ key: k, label: labels[k] as string, included: p[k] === true })),
          display: {
            ...(display.tagline ? { tagline: display.tagline } : {}),
            highlight: display.highlight === true,
            ...(display.ctaLabel ? { ctaLabel: display.ctaLabel } : {}),
            ...(display.ctaHref ? { ctaHref: display.ctaHref } : {}),
          },
        };
      });
    });
  }

  /** Live counts for entity facts and stats (integrations: feature status `live` only). */
  private async counts(locale: string): Promise<PublicEntity['counts']> {
    const base = await this.tokens.publishedCounts(locale);
    const integrations = await this.cards.live({ locale, type: 'INTEGRATION' });
    return {
      industries: base.industries,
      cities: base.cities,
      integrationsLive: integrations.filter((e) => (e.content.featureStatus ?? 'coming') === 'live').length,
      glossaryTerms: base.glossary,
      posts: base.posts,
    };
  }

  entity(locale: string): Promise<PublicEntity> {
    return this.cache.get(`entity:${locale}`, async () => {
      const [entity, counts, plans] = await Promise.all([this.settings.get('entity', locale), this.counts(locale), this.tokens.publicPlans()]);
      if (!entity) throw new ServiceUnavailableException('Entity settings abhi save nahi hue');
      const names = await this.prisma.plan.findMany({ where: { slug: { in: plans.map((p) => p.slug) } }, select: { slug: true, name: true } });
      const nameBySlug = new Map(names.map((n) => [n.slug, n.name]));
      const planSummary: PublicEntity['plans'] = plans.map((p) => ({ slug: p.slug, name: nameBySlug.get(p.slug) ?? p.slug, priceMonthly: p.priceMonthly }));
      return { ...entity, counts, plans: planSummary, minPaidMonthly: minMonthlyPrice(plans), generatedAt: new Date().toISOString() };
    });
  }

  // ─── FAQs, testimonials, customers ───

  faqs(locale: string, topic?: string): Promise<PublicFaqsResponse> {
    return this.cache.get(`faqs:${locale}:${topic ?? '*'}`, async () => {
      const rows = await this.prisma.cmsFaq.findMany({
        where: { locale, status: CmsStatus.PUBLISHED, publishedQuestion: { not: null }, publishedAnswer: { not: null }, ...(topic ? { topic } : {}) },
        orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'asc' }],
      });
      const faqs = await this.entryBuilder.resolveFaqs(
        rows.map((r) => ({ id: r.id, question: r.publishedQuestion as string, answer: r.publishedAnswer as string, topic: r.topic })),
        locale,
      );
      const groups = new Map<string, PublicFaqsResponse['topics'][number]>();
      for (const f of faqs) {
        const key = f.topic ?? 'general';
        const group = groups.get(key) ?? { key, label: topicLabel(f.topic), faqs: [] };
        group.faqs.push(f);
        groups.set(key, group);
      }
      return { topics: [...groups.values()].sort((a, b) => a.label.localeCompare(b.label)) };
    });
  }

  /** City/industry names for customers, from live entries only. */
  private async entryNames(ids: readonly (string | null)[]): Promise<Map<string, string>> {
    const live = await this.cards.liveByIds(ids.filter((x): x is string => !!x));
    return new Map(live.map((e) => [e.row.id, dataString(e.content, 'name') ?? dataString(e.content, 'shortName') ?? e.content.title]));
  }

  testimonials(q: TestimonialsQuery): Promise<PublicTestimonial[]> {
    return this.cache.get(`testimonials:${JSON.stringify(q)}`, async () => {
      const rows = await this.prisma.cmsTestimonial.findMany({
        where: {
          status: CmsStatus.PUBLISHED,
          locale: q.locale,
          ...(q.ids?.length ? { id: { in: q.ids } } : {}),
          customer: {
            isPublic: true,
            consentAt: { not: null },
            consentScope: { has: 'QUOTE' },
            ...(q.industry ? { industryEntryId: q.industry } : {}),
            ...(q.city ? { cityEntryId: q.city } : {}),
          },
        },
        include: {
          photo: { select: PUBLIC_MEDIA_SELECT },
          customer: { include: { logo: { select: PUBLIC_MEDIA_SELECT } } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });
      const ordered = q.ids?.length ? q.ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is (typeof rows)[number] => !!r) : rows;
      const limited = q.limit ? ordered.slice(0, q.limit) : ordered;
      const names = await this.entryNames(limited.flatMap((r) => [r.customer.cityEntryId, r.customer.industryEntryId]));
      const caseStudies = await this.caseStudyPaths(limited.map((r) => r.customer.id), q.locale);
      return limited.map((r) => {
        const c = r.customer;
        const scope = c.consentScope;
        return {
          id: r.id,
          quote: r.quote,
          personName: r.personName,
          personRole: r.personRole,
          photo: r.photo && scope.includes('PHOTO') ? toPublicMedia(r.photo, q.locale) : null,
          sourceType: r.sourceType,
          sourceUrl: r.sourceUrl,
          collectedAt: r.collectedAt?.toISOString() ?? null,
          customer: {
            // The business name is shown only with NAME consent.
            name: scope.includes('NAME') ? c.name : '',
            city: (c.cityEntryId && names.get(c.cityEntryId)) || null,
            industry: (c.industryEntryId && names.get(c.industryEntryId)) || null,
            logo: c.logo && scope.includes('LOGO') ? toPublicMedia(c.logo, q.locale) : null,
            caseStudyPath: scope.includes('CASE_STUDY') ? caseStudies.get(c.id) ?? null : null,
          },
        };
      });
    });
  }

  /** Live CASE_STUDY path per customer id. */
  private async caseStudyPaths(customerIds: readonly string[], locale: string): Promise<Map<string, string>> {
    if (customerIds.length === 0) return new Map();
    const list = await this.cards.live({ locale, type: 'CASE_STUDY' });
    const out = new Map<string, string>();
    for (const e of list) {
      const id = dataString(e.content, 'customerId');
      if (id && customerIds.includes(id) && !out.has(id)) out.set(id, localizedPath(e.row.locale, e.row.publishedPath as string));
    }
    return out;
  }

  customers(q: CustomersQuery): Promise<PublicCustomer[]> {
    return this.cache.get(`customers:${JSON.stringify(q)}`, async () => {
      const rows = await this.prisma.cmsCustomer.findMany({
        where: {
          isPublic: true,
          consentAt: { not: null },
          consentScope: { has: 'LOGO' },
          logo: { deletedAt: null },
          ...(q.ids?.length ? { id: { in: q.ids } } : {}),
          ...(q.industry ? { industryEntryId: q.industry } : {}),
          ...(q.city ? { cityEntryId: q.city } : {}),
        },
        include: { logo: { select: PUBLIC_MEDIA_SELECT } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      const ordered = q.ids?.length ? q.ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is (typeof rows)[number] => !!r) : rows;
      const limited = q.limit ? ordered.slice(0, q.limit) : ordered;
      const names = await this.entryNames(limited.flatMap((r) => [r.cityEntryId, r.industryEntryId]));
      return limited
        .filter((r) => r.logo !== null)
        .map((r) => {
          const logo = toPublicMedia(r.logo as NonNullable<typeof r.logo>);
          return {
            id: r.id,
            name: r.consentScope.includes('NAME') ? r.name : logo.alt,
            logo,
            website: r.website,
            city: (r.cityEntryId && names.get(r.cityEntryId)) || null,
            industry: (r.industryEntryId && names.get(r.industryEntryId)) || null,
          };
        });
    });
  }

  // ─── Stats ───

  stats(metrics: StatMetric[], locale: string = DEFAULT_LOCALE): Promise<PublicStatsResponse> {
    const unique = [...new Set(metrics)].sort();
    return this.cache.get(`stats:${locale}:${unique.join(',')}`, async () => {
      const out: PublicStatsResponse = {};
      const asOf = new Date().toISOString();
      const needCounts = unique.some((m) => m.endsWith('.count') && !m.startsWith('plans'));
      const counts = needCounts ? await this.counts(locale) : null;
      const plans = unique.some((m) => m.startsWith('plans.')) ? await this.tokens.publicPlans() : [];
      const analytics = unique.some((m) => m.startsWith('platform.')) ? await this.settings.get('analytics') : null;
      const put = (m: StatMetric, value: number, formatted = formatCount(value)) => {
        out[m] = { value, formatted, asOf };
      };
      for (const m of unique) {
        switch (m) {
          case 'industries.count': put(m, counts?.industries ?? 0); break;
          case 'cities.count': put(m, counts?.cities ?? 0); break;
          case 'integrations.live.count': put(m, counts?.integrationsLive ?? 0); break;
          case 'glossary.count': put(m, counts?.glossaryTerms ?? 0); break;
          case 'posts.count': put(m, counts?.posts ?? 0); break;
          case 'plans.count': put(m, plans.length); break;
          case 'plans.minPaid.monthly': {
            const min = minMonthlyPrice(plans);
            if (min !== null) put(m, min, formatPkr(min));
            break;
          }
          case 'platform.bills30d':
          case 'platform.activeShops30d': {
            // Owner decision O9: platform numbers only when explicitly allowed.
            if (!analytics?.allowPlatformStats) break;
            const since = new Date(Date.now() - 30 * DAY_MS);
            const where: Prisma.SaleWhereInput = { createdAt: { gte: since }, status: { in: [SaleStatus.COMPLETED, SaleStatus.PARTIALLY_RETURNED] } };
            if (m === 'platform.bills30d') put(m, await this.prisma.sale.count({ where }));
            else put(m, (await this.prisma.sale.groupBy({ by: ['tenantId'], where })).length);
            break;
          }
        }
      }
      return out;
    });
  }

  // ─── Redirects ───

  redirectRules(): Promise<PublicRedirectsResponse> {
    return this.cache.get('redirects', () => this.redirects.publicRules());
  }

  redirectHit(id: string): Promise<void> {
    return this.redirects.hit(id);
  }

  // ─── llms ───

  llms(locale: string): Promise<LlmsPayload> {
    return this.cache.get(`llms:${locale}`, async () => {
      const [entity, all, faqs] = await Promise.all([
        this.entity(locale),
        this.cards.live({ locale }, [{ sortOrder: 'asc' }, { title: 'asc' }]),
        this.faqs(locale),
      ]);
      const indexable = all.filter((e) => isIndexable(e.content));
      const tokens = await this.cards.tokenContext(locale);
      const cards = await this.cards.cards(indexable, locale, tokens);
      const cardById = new Map<string, EntryCard>(cards.map((c) => [c.id, c]));

      const sections: LlmsPayload['sections'] = [];
      for (const key of SITEMAP_SECTION_KEYS) {
        const types = SITEMAP_SECTIONS[key] as readonly CmsEntryType[];
        const items = indexable
          .filter((e) => types.includes(e.row.type))
          .sort((a, b) => CMS_ENTRY_TYPES.indexOf(a.row.type) - CMS_ENTRY_TYPES.indexOf(b.row.type))
          .map((e) => cardById.get(e.row.id))
          .filter((c): c is EntryCard => !!c)
          .map((c) => ({ title: c.title, url: c.url, summary: c.summary }));
        if (items.length > 0) sections.push({ key, title: LLMS_SECTION_TITLES[key], items });
      }

      const allFaqs = faqs.topics.flatMap((t) => t.faqs);
      const money = indexable.filter((e) => isMoneyType(e.row.type, (dataString(e.content, 'template') as PageTemplate | undefined) ?? undefined));
      const full: LlmsPayload['full'] = [];
      for (const e of money) {
        const built = await this.entryBuilder.byPath(e.row.publishedPath as string, locale);
        if (!built) continue;
        const keyFacts: { label: string; value: string }[] = [];
        for (const block of built.blocks) {
          if (block.type === 'answerBox') for (const f of block.facts) keyFacts.push({ label: f.label, value: f.value });
        }
        full.push({ url: built.url, title: built.title, summary: built.summary, keyFacts, faqs: built.faqs });
      }
      return { entity, sections, topFaqs: allFaqs.slice(0, TOP_FAQS), full, generatedAt: new Date().toISOString() };
    });
  }
}
