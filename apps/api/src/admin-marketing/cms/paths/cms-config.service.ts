/**
 * GET /admin/marketing/cms/config: the static contract tables (types, blocks,
 * icons, diagrams) plus live token examples, locales and the site URL.
 */
import { Injectable } from '@nestjs/common';
import {
  COUNT_TOKEN_KEYS,
  DEFAULT_LOCALE,
  LOCALE_PATTERN,
  PRICE_PERIODS,
  buildStaticCmsConfig,
  type CmsConfig,
} from '../contract/cms-contract';
import { CmsTokenService } from '../content/cms-token.service';
import { lookupFact, resolveTokensInText, type TokenContext } from '../content/tokens';
import { resolveSiteUrl } from './cms-paths';

/** Top-level entity facts offered in the token helper when they are set. */
const SIMPLE_FACT_PATHS = ['brandName', 'legalName', 'foundingDate'] as const;

/** Token list with examples rendered from live data. */
export function tokenExamples(ctx: TokenContext): { token: string; example: string }[] {
  const tokens: string[] = [];
  for (const plan of ctx.plans) {
    for (const period of PRICE_PERIODS) tokens.push(`{{price:${plan.slug}.${period}}}`);
  }
  tokens.push('{{price:min.monthly}}');
  for (const key of COUNT_TOKEN_KEYS) tokens.push(`{{count:${key}}}`);

  const entity = ctx.entity && typeof ctx.entity === 'object' ? (ctx.entity as Record<string, unknown>) : {};
  const compliance = entity.compliance && typeof entity.compliance === 'object' ? Object.keys(entity.compliance as object) : [];
  for (const key of compliance) tokens.push(`{{fact:compliance.${key}}}`);
  for (const path of SIMPLE_FACT_PATHS) {
    if (lookupFact(ctx.entity, path) !== null) tokens.push(`{{fact:${path}}}`);
  }
  tokens.push('{{year}}');

  return tokens
    .map((token) => ({ token, ...resolveTokensInText(token, ctx, 'remove') }))
    .filter((t) => t.problems.length === 0)
    .map((t) => ({ token: t.token, example: t.text }));
}

@Injectable()
export class CmsConfigService {
  constructor(private readonly tokens: CmsTokenService) {}

  async getConfig(): Promise<CmsConfig> {
    const [ctx, site] = await Promise.all([this.tokens.loadContext(DEFAULT_LOCALE), this.tokens.settingValue('site')]);
    const siteValue = site && typeof site === 'object' ? (site as { baseUrl?: unknown; locales?: unknown }) : {};
    const locales = Array.isArray(siteValue.locales)
      ? siteValue.locales.filter((l): l is string => typeof l === 'string' && LOCALE_PATTERN.test(l))
      : [];
    return {
      ...buildStaticCmsConfig(),
      tokens: tokenExamples(ctx),
      locales: locales.length > 0 ? locales : [DEFAULT_LOCALE],
      siteUrl: resolveSiteUrl(process.env.SITE_PUBLIC_URL, typeof siteValue.baseUrl === 'string' ? siteValue.baseUrl : null),
    };
  }
}
