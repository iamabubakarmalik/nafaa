/**
 * Builds the `TokenContext` from live data: active public plans, published
 * entry counts and settings `entity`. Also the single place that defines
 * what each `{{count:...}}` key counts, so tokens, `GET /public/site/entity`
 * and llms.txt show the same numbers.
 */
import { Injectable } from '@nestjs/common';
import { CmsEntryType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { tzParts } from '../../../common/helpers/business-time.helper';
import { COUNT_TOKEN_KEYS, DEFAULT_LOCALE, type CountTokenKey } from '../contract/cms-contract';
import type { TokenContext, TokenPlan } from './tokens';

type Db = PrismaService | Prisma.TransactionClient;

/** Entry type counted by each `{{count:<key>}}` token. */
export const COUNT_TOKEN_TYPES: Readonly<Record<CountTokenKey, CmsEntryType>> = {
  industries: CmsEntryType.INDUSTRY,
  cities: CmsEntryType.CITY,
  integrations: CmsEntryType.INTEGRATION,
  glossary: CmsEntryType.GLOSSARY_TERM,
  posts: CmsEntryType.BLOG_POST,
};

/** Year for `{{year}}`, in Pakistan time (the server runs in UTC). */
export function currentYearPk(now: Date = new Date()): number {
  return tzParts(now, 'Asia/Karachi').year;
}

/** `published.data.status` when the snapshot has it, else the draft `data.status`. */
function integrationStatus(published: Prisma.JsonValue | null, data: Prisma.JsonValue): unknown {
  const snap = published as { data?: { status?: unknown } } | null;
  if (snap && typeof snap === 'object' && snap.data && typeof snap.data === 'object' && 'status' in snap.data) {
    return snap.data.status;
  }
  return (data as { status?: unknown } | null)?.status;
}

@Injectable()
export class CmsTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active, public plans in display order (the only plans tokens may show). */
  async publicPlans(db: Db = this.prisma): Promise<TokenPlan[]> {
    return db.plan.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: [{ sortOrder: 'asc' }, { priceMonthly: 'asc' }],
      select: { slug: true, priceMonthly: true, priceQuarterly: true, priceYearly: true },
    });
  }

  /**
   * Live (published) entries per count key in a locale. Integrations with
   * status `planned` are not counted: they are not available yet.
   */
  async publishedCounts(locale: string = DEFAULT_LOCALE, db: Db = this.prisma): Promise<Record<CountTokenKey, number>> {
    const types = COUNT_TOKEN_KEYS.map((k) => COUNT_TOKEN_TYPES[k]);
    const grouped = await db.cmsEntry.groupBy({
      by: ['type'],
      where: { locale, publishedPath: { not: null }, type: { in: types } },
      _count: { _all: true },
    });
    const byType = new Map<CmsEntryType, number>(grouped.map((g) => [g.type, g._count._all]));

    const integrations = await db.cmsEntry.findMany({
      where: { locale, publishedPath: { not: null }, type: CmsEntryType.INTEGRATION },
      select: { published: true, data: true },
    });
    const planned = integrations.filter((row) => integrationStatus(row.published, row.data) === 'planned').length;

    const counts = {} as Record<CountTokenKey, number>;
    for (const key of COUNT_TOKEN_KEYS) {
      const total = byType.get(COUNT_TOKEN_TYPES[key]) ?? 0;
      counts[key] = key === 'integrations' ? Math.max(0, total - planned) : total;
    }
    return counts;
  }

  /** Raw settings value for a key in a locale, falling back to the default locale. */
  async settingValue(key: string, locale: string = DEFAULT_LOCALE, db: Db = this.prisma): Promise<unknown> {
    const locales = locale === DEFAULT_LOCALE ? [locale] : [locale, DEFAULT_LOCALE];
    for (const loc of locales) {
      const row = await db.cmsSetting.findUnique({ where: { key_locale: { key, locale: loc } }, select: { value: true } });
      if (row) return row.value;
    }
    return null;
  }

  /** Everything token resolution needs for one locale. */
  async loadContext(locale: string = DEFAULT_LOCALE, db: Db = this.prisma): Promise<TokenContext> {
    const [plans, counts, entity] = await Promise.all([
      this.publicPlans(db),
      this.publishedCounts(locale, db),
      this.settingValue('entity', locale, db),
    ]);
    return { plans, counts, entity, year: currentYearPk() };
  }
}
