/**
 * Site settings (API-CONTRACT 5.3, 8.7): one JSON document per key and
 * locale, validated by the contract schema for that key. Every change writes
 * a SETTING revision and revalidates the site tags that read the key.
 *
 * Reads fall back from the requested locale to "en", so a `ur` site uses the
 * English settings until someone saves `ur` ones.
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_ANALYTICS_SETTINGS,
  DEFAULT_LOCALE,
  DEFAULT_SEO_SETTINGS,
  SETTINGS_SCHEMAS,
  cacheTags,
  settingKeySchema,
  type AnalyticsSettings,
  type EntitySettings,
  type IndustryGroups,
  type PricingSettings,
  type PutSettingResponse,
  type SeoSettings,
  type SettingKey,
  type SiteSettings,
} from '../contract/cms-contract';
import { parseOr400 } from '../public/cms-http';
import { CmsSiteEvents } from '../public/cms-site-events.service';
import { subjectKey, writeSubjectRevision } from '../public/cms-subject-revision';

type Db = PrismaService | Prisma.TransactionClient;

interface SettingTypes {
  site: SiteSettings;
  entity: EntitySettings;
  pricing: PricingSettings;
  seo: SeoSettings;
  analytics: AnalyticsSettings;
  'industry-groups': IndustryGroups;
}

/** Admin GET /settings: raw stored values (null when never saved). */
export interface AdminSettingsResponse {
  site: unknown;
  entity: unknown;
  pricing: unknown;
  seo: unknown;
  analytics: unknown;
  industryGroups: unknown;
  /** Keys whose stored value no longer passes the contract (shown as a warning). */
  invalid: SettingKey[];
}

/** Keys that would put a price into settings; prices live only in the Plan table. */
const PRICE_KEY = /price|amount/i;

function hasPriceKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasPriceKey);
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([k, v]) => PRICE_KEY.test(k) || hasPriceKey(v));
  }
  return false;
}

/** Site tags that read each settings key (ARCH 7.4). */
export function settingTags(key: SettingKey, locale: string): string[] {
  switch (key) {
    case 'site':
      return [cacheTags.layout(locale), cacheTags.llms];
    case 'entity':
      return [cacheTags.settings, cacheTags.llms];
    case 'pricing':
      return [cacheTags.settings, cacheTags.plans, cacheTags.llms];
    case 'seo':
      // Title patterns and gates change every page's metadata.
      return [cacheTags.all];
    case 'analytics':
      return [cacheTags.settings, cacheTags.layout(locale)];
    case 'industry-groups':
      return [cacheTags.settings, cacheTags.type(locale, 'INDUSTRY'), cacheTags.layout(locale)];
  }
}

@Injectable()
export class CmsSettingsService {
  private readonly logger = new Logger(CmsSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: CmsSiteEvents,
  ) {}

  /** Stored value for a key, falling back to the default locale; null when never saved. */
  async raw(key: SettingKey, locale: string = DEFAULT_LOCALE, db: Db = this.prisma): Promise<{ value: unknown; updatedAt: Date } | null> {
    const locales = locale === DEFAULT_LOCALE ? [locale] : [locale, DEFAULT_LOCALE];
    for (const loc of locales) {
      const row = await db.cmsSetting.findUnique({ where: { key_locale: { key, locale: loc } }, select: { value: true, updatedAt: true } });
      if (row) return row;
    }
    return null;
  }

  /**
   * Parsed value (contract defaults applied), or null when missing or no
   * longer valid. `seo` and `analytics` fall back to the contract defaults.
   */
  async get<K extends SettingKey>(key: K, locale: string = DEFAULT_LOCALE, db: Db = this.prisma): Promise<SettingTypes[K] | null> {
    const row = await this.raw(key, locale, db);
    if (row) {
      const parsed = SETTINGS_SCHEMAS[key].safeParse(row.value);
      if (parsed.success) return parsed.data as SettingTypes[K];
      this.logger.warn(`Stored settings "${key}" (${locale}) do not match the contract; using defaults`);
    }
    if (key === 'seo') return DEFAULT_SEO_SETTINGS as SettingTypes[K];
    if (key === 'analytics') return DEFAULT_ANALYTICS_SETTINGS as SettingTypes[K];
    return null;
  }

  async adminBundle(locale: string = DEFAULT_LOCALE): Promise<AdminSettingsResponse> {
    const keys: SettingKey[] = ['site', 'entity', 'pricing', 'seo', 'analytics', 'industry-groups'];
    const rows = await Promise.all(keys.map((k) => this.raw(k, locale)));
    const invalid: SettingKey[] = [];
    rows.forEach((row, i) => {
      const key = keys[i] as SettingKey;
      if (row && !SETTINGS_SCHEMAS[key].safeParse(row.value).success) invalid.push(key);
    });
    const [site, entity, pricing, seo, analytics, industryGroups] = rows.map((r) => r?.value ?? null);
    return { site, entity, pricing, seo, analytics, industryGroups, invalid };
  }

  async put(keyParam: string, body: { locale?: string | undefined; value: unknown }, userId: string | null): Promise<PutSettingResponse & { revalidation: { ok: boolean; error?: string } }> {
    const key = parseOr400(settingKeySchema, keyParam, 'key');
    const locale = body.locale ?? DEFAULT_LOCALE;
    if (key === 'pricing' && hasPriceKey(body.value)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Price yahan nahi badalti. Prices Admin → Plans me badlein.',
      });
    }
    const value = parseOr400(SETTINGS_SCHEMAS[key], body.value, 'value') as unknown;

    const { row, revisionId } = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.cmsSetting.upsert({
        where: { key_locale: { key, locale } },
        create: { key, locale, value: value as Prisma.InputJsonValue, updatedById: userId },
        update: { value: value as Prisma.InputJsonValue, updatedById: userId },
      });
      const revId = await writeSubjectRevision(tx, {
        subject: 'SETTING',
        key: subjectKey(key, locale),
        action: 'SAVE',
        snapshot: value,
        userId,
      });
      return { row: saved, revisionId: revId };
    });

    const revalidation = await this.events.changed({ tags: settingTags(key, locale), reason: 'settings', revisionId });
    return { key, value: row.value, updatedAt: row.updatedAt.toISOString(), revalidation };
  }
}
