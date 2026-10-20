/**
 * Marketing CMS contract: the shared shapes of the nafaa.pk content system.
 *
 * Source of truth for docs/marketing-site/API-CONTRACT.md sections 3-5 plus the
 * public and admin DTOs of sections 2, 6, 7 and 8. The API (apps/api), the admin
 * panel (apps/admin) and the public site (apps/site) all validate against this
 * file. Each app gets a generated copy through `scripts/sync-cms-contract.mjs`;
 * edit only this file and run the sync script.
 *
 * Rules for this file:
 * - The only import is `zod` (v4). No Node or browser APIs, so the same file
 *   compiles in NestJS (NodeNext, CommonJS), Vite and Next.js.
 * - No TypeScript enums or namespaces (erasable syntax only).
 * - Publish-time checks that need the database (unknown token values, broken
 *   links, consent, title uniqueness, quality gates) live in the API. This file
 *   holds the shapes, the fixed maps and the pure grammar helpers.
 */
import { z } from 'zod';

export const CMS_CONTRACT_VERSION = '1.1.0';
/*
 * 1.1.0 (Phase 2, A1):
 * - Feature status `live | beta | coming` on PRODUCT, SOLUTION, SERVICE and
 *   INTEGRATION data, on featuresGrid items and as an entryGrid / public
 *   entries filter. INTEGRATION `planned` is now `coming`; robots reason
 *   `planned` is now `coming`.
 * - PAGE template `roadmap`.
 * - entryGrid allowed on PRODUCT, SERVICE, INTEGRATION; hero, answerBox and
 *   faq allowed on BLOG_CATEGORY.
 * - Title pattern variants (`SERVICE:worldwide`), `titlePatternVariant`.
 * - Issue codes INVALID_DATA and MEDIA_MISSING (both block publish).
 * - leadForm `form: 'quote'` with `currencies` and `whatsapp`.
 * - `PublishedSnapshot` / `DraftSnapshot` (the `published` column and
 *   revision snapshots).
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. Primitives
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_LOCALE = 'en';
/** Locales the code knows about. The live list comes from settings `site.locales`. */
export const KNOWN_LOCALES = ['en', 'ur'] as const;
export const LOCALE_PATTERN = /^[a-z]{2}$/;
export const localeSchema = z.string().regex(LOCALE_PATTERN, 'Locale must be a two-letter code');

/** Database ids (cuid for CMS rows, uuid for Plan). Kept loose on purpose. */
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export const idSchema = z.string().regex(ID_PATTERN, 'Invalid id');

/** Block ids are nanoid(10) in the admin; seeds may use other stable ids. */
export const BLOCK_ID_PATTERN = /^[A-Za-z0-9_-]{6,32}$/;
export const blockIdSchema = z.string().regex(BLOCK_ID_PATTERN, 'Invalid block id');

/** Entry slug: lowercase words joined by single hyphens, 2-80 chars. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MIN = 2;
export const SLUG_MAX = 80;
/**
 * `""` is allowed only for the PAGE home entry and the DOC root; the API
 * enforces that per type.
 */
export const slugSchema = z.union([
  z.literal(''),
  z.string().min(SLUG_MIN).max(SLUG_MAX).regex(SLUG_PATTERN, 'Slug: a-z, 0-9 and single hyphens only'),
]);

/** Block anchor and in-page fragment: a-z0-9-, starting with a letter or digit. */
export const ANCHOR_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const anchorSchema = z.string().regex(ANCHOR_PATTERN, 'Anchor: a-z, 0-9 and hyphens');

/** Short machine keys (groups, topics, settings record keys). */
export const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,47}$/;
export const keySchema = z.string().regex(KEY_PATTERN, 'Key: a-z, 0-9, hyphen or underscore');

/** Public site path without the locale prefix: "/" or "/a/b-c". */
export const SITE_PATH_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/;
export const sitePathSchema = z.string().max(512).regex(SITE_PATH_PATTERN, 'Path must look like /a/b-c');

/** Plan slugs as stored in `Plan.slug` (e.g. "free-trial", "basic"). */
export const PLAN_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const planSlugSchema = z.string().max(64).regex(PLAN_SLUG_PATTERN, 'Invalid plan slug');

export const isoDateTimeSchema = z.iso.datetime({ offset: true });
export const isoDateSchema = z.iso.date();
/** A calendar date (YYYY-MM-DD) or a full ISO date-time. */
export const dateOrDateTimeSchema = z.union([isoDateSchema, isoDateTimeSchema]);

export const httpUrlSchema = z.url({ protocol: /^https?$/ }).max(2048);

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** WCAG contrast ratio of a #rrggbb color against white. */
export function contrastRatioWithWhite(hex: string): number {
  if (!HEX_COLOR_PATTERN.test(hex)) return 0;
  const channel = (offset: number): number => {
    const v = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return 1.05 / (luminance + 0.05);
}
export const MIN_CONTRAST_WITH_WHITE = 4.5;

/** Count words the same way in the API, the admin counters and the site. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Enums (mirror the Prisma enums in schema.prisma, section "MARKETING CMS")
// ═══════════════════════════════════════════════════════════════════════════

export const CMS_ENTRY_TYPES = [
  'PAGE', 'PRODUCT', 'INDUSTRY', 'SOLUTION', 'SERVICE', 'INTEGRATION', 'COMPLIANCE',
  'CITY', 'CITY_INDUSTRY', 'BEST_OF', 'COMPARE', 'ALTERNATIVE', 'BLOG_POST',
  'BLOG_CATEGORY', 'GUIDE', 'GLOSSARY_TERM', 'TOOL', 'TEMPLATE', 'CASE_STUDY',
  'PERSON', 'DOC', 'CHANGELOG',
] as const;
export const cmsEntryTypeSchema = z.enum(CMS_ENTRY_TYPES);
export type CmsEntryType = z.infer<typeof cmsEntryTypeSchema>;

export const CMS_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const;
export const cmsStatusSchema = z.enum(CMS_STATUSES);
export type CmsStatus = z.infer<typeof cmsStatusSchema>;

export const CMS_RELATION_KINDS = ['TAG', 'RELATED', 'MENTIONS'] as const;
export const cmsRelationKindSchema = z.enum(CMS_RELATION_KINDS);
export type CmsRelationKind = z.infer<typeof cmsRelationKindSchema>;

/** Relation kinds an editor can store in the draft. MENTIONS is computed at publish. */
export const DRAFT_RELATION_KINDS = ['TAG', 'RELATED'] as const;

export const CMS_MEDIA_KINDS = ['IMAGE', 'SCREENSHOT', 'LOGO', 'ILLUSTRATION', 'VIDEO', 'DOCUMENT'] as const;
export const cmsMediaKindSchema = z.enum(CMS_MEDIA_KINDS);
export type CmsMediaKind = z.infer<typeof cmsMediaKindSchema>;

export const CMS_REDIRECT_SOURCES = ['MANUAL', 'SLUG_CHANGE', 'UNPUBLISH', 'IMPORT'] as const;
export const cmsRedirectSourceSchema = z.enum(CMS_REDIRECT_SOURCES);
export type CmsRedirectSource = z.infer<typeof cmsRedirectSourceSchema>;

/** `CmsRevision.subject` values. */
export const REVISION_SUBJECTS = ['ENTRY', 'FAQ', 'MENU', 'SETTING'] as const;
export type RevisionSubject = (typeof REVISION_SUBJECTS)[number];
/** `CmsRevision.action` values. */
export const REVISION_ACTIONS = ['SAVE', 'PUBLISH', 'UNPUBLISH', 'SCHEDULE', 'RESTORE'] as const;
export type RevisionAction = (typeof REVISION_ACTIONS)[number];

/** `CmsCustomer.consentScope` values. */
export const CONSENT_SCOPES = ['LOGO', 'NAME', 'QUOTE', 'CASE_STUDY', 'PHOTO'] as const;
export const consentScopeSchema = z.enum(CONSENT_SCOPES);
export type ConsentScope = z.infer<typeof consentScopeSchema>;

/** `CmsTestimonial.sourceType` values. */
export const TESTIMONIAL_SOURCE_TYPES = ['DIRECT', 'GOOGLE', 'PLAY_STORE', 'G2', 'CAPTERRA', 'OTHER'] as const;
export const testimonialSourceTypeSchema = z.enum(TESTIMONIAL_SOURCE_TYPES);
export type TestimonialSourceType = z.infer<typeof testimonialSourceTypeSchema>;

/** Boolean feature columns on `Plan`. */
export const PLAN_FEATURE_KEYS = [
  'featurePos', 'featureBarcodeScanner', 'featureMultiShop', 'featureReports', 'featureProfitReport',
  'featureLoyalty', 'featureDiscounts', 'featureKhata', 'featureExports', 'featureBackup',
  'featureNotifications', 'featureCashRegister', 'featureStockTransfer', 'featureReturns',
  'featureSupport24x7', 'featureWhatsappReceipt', 'featureCustomBranding',
] as const;
export const planFeatureKeySchema = z.enum(PLAN_FEATURE_KEYS);
export type PlanFeatureKey = z.infer<typeof planFeatureKeySchema>;

export const STAT_METRICS = [
  'industries.count', 'cities.count', 'integrations.live.count', 'glossary.count', 'posts.count',
  'plans.count', 'plans.minPaid.monthly',
  'platform.bills30d', 'platform.activeShops30d',
] as const;
export const statMetricSchema = z.enum(STAT_METRICS);
export type StatMetric = z.infer<typeof statMetricSchema>;
/** Metrics served only when settings `analytics.allowPlatformStats` is true. */
export const PLATFORM_STAT_METRICS: readonly StatMetric[] = ['platform.bills30d', 'platform.activeShops30d'];

export const TOOL_KEYS = [
  'gst-calculator', 'profit-margin-calculator', 'pos-cost-calculator',
  'invoice-generator', 'gold-rate-calculator', 'fbr-tier-1-checker',
] as const;
export const toolKeySchema = z.enum(TOOL_KEYS);
export type ToolKey = z.infer<typeof toolKeySchema>;

export const FRAMES = ['browser', 'phone', 'tablet', 'desktop', 'receipt', 'none'] as const;
export const frameSchema = z.enum(FRAMES);
export type Frame = z.infer<typeof frameSchema>;

export const BLOCK_THEMES = ['default', 'muted', 'ink'] as const;
export const blockThemeSchema = z.enum(BLOCK_THEMES);
export type BlockTheme = z.infer<typeof blockThemeSchema>;

export const CODE_LANGUAGES = ['bash', 'http', 'json', 'js', 'ts', 'python', 'php'] as const;
export const codeLanguageSchema = z.enum(CODE_LANGUAGES);
export type CodeLanguage = z.infer<typeof codeLanguageSchema>;

export const LEAD_FORM_TYPES = ['SALES', 'ENTERPRISE', 'PARTNERSHIP', 'GENERAL'] as const;

export const ROBOTS_REASONS = ['editor', 'quality_gate', 'coming', 'similarity', 'site_not_indexable'] as const;
export const robotsReasonSchema = z.enum(ROBOTS_REASONS);
export type RobotsReason = z.infer<typeof robotsReasonSchema>;

export const REDIRECT_STATUS_CODES = [301, 302, 410] as const;
export const redirectStatusSchema = z.union([z.literal(301), z.literal(302), z.literal(410)]);
export type RedirectStatus = z.infer<typeof redirectStatusSchema>;

/**
 * Feature status (owner rule): a feature that is not built yet may be
 * marketed only with a visible badge and on the roadmap page, never as live.
 * `coming` entries are always noindex (robots reason `coming`).
 */
export const FEATURE_STATUSES = ['live', 'beta', 'coming'] as const;
export const featureStatusSchema = z.enum(FEATURE_STATUSES);
export type FeatureStatus = z.infer<typeof featureStatusSchema>;
/** Badge text per locale. `live` shows no badge. */
export const FEATURE_STATUS_BADGES: Record<Exclude<FeatureStatus, 'live'>, Record<'en' | 'ur', string>> = {
  beta: { en: 'Beta', ur: 'Beta' },
  coming: { en: 'Coming soon', ur: 'Jald aa raha hai' },
};

/** Currencies a quote form can ask for (worldwide services quote in PKR or USD). */
export const LEAD_CURRENCIES = ['PKR', 'USD'] as const;
export type LeadCurrency = (typeof LEAD_CURRENCIES)[number];

// ═══════════════════════════════════════════════════════════════════════════
// 3. Entry types: routes, templates, sitemap sections, block maps, gates
// ═══════════════════════════════════════════════════════════════════════════

export const PAGE_TEMPLATES = ['home', 'pricing', 'hub', 'default', 'legal', 'contact', 'roadmap'] as const;
export const pageTemplateSchema = z.enum(PAGE_TEMPLATES);
export type PageTemplate = z.infer<typeof pageTemplateSchema>;

/** Template folders in apps/site/src/templates (PAGE picks one by `data.template`). */
export const SITE_TEMPLATES = [
  'home', 'pricing', 'hub', 'default', 'legal', 'contact', 'roadmap', 'product', 'industry', 'solution', 'service',
  'city', 'compliance', 'bestof', 'compare', 'article', 'glossary', 'person', 'docs', 'tool',
] as const;
export type SiteTemplate = (typeof SITE_TEMPLATES)[number];

export interface EntryTypeMeta {
  label: string;
  labelPlural: string;
  /** Human-readable URL pattern (shown in the admin and returned by GET /config). */
  pathPattern: string;
  /**
   * Fixed path prefix (no leading slash). `null` for PAGE (free path from the
   * parent chain), CITY_INDUSTRY (the parent CITY's path) and DOC
   * (`developers` + parent chain; see `DOC_ROOT_PATH`).
   */
  prefix: string | null;
  /** Required parent type, when the path is built from the parent. */
  parentType: CmsEntryType | null;
  /** Site template; PAGE resolves it from `data.template`. */
  template: SiteTemplate;
}

export const DOC_ROOT_PATH = '/developers';

export const ENTRY_TYPE_META: Record<CmsEntryType, EntryTypeMeta> = {
  PAGE: { label: 'Page', labelPlural: 'Pages', pathPattern: '/{parent chain}/{slug}', prefix: null, parentType: null, template: 'default' },
  PRODUCT: { label: 'Product', labelPlural: 'Products', pathPattern: '/product/{slug}', prefix: 'product', parentType: null, template: 'product' },
  INDUSTRY: { label: 'Industry', labelPlural: 'Industries', pathPattern: '/industries/{slug}', prefix: 'industries', parentType: null, template: 'industry' },
  SOLUTION: { label: 'Solution', labelPlural: 'Solutions', pathPattern: '/solutions/{slug}', prefix: 'solutions', parentType: null, template: 'solution' },
  SERVICE: { label: 'Service', labelPlural: 'Services', pathPattern: '/services/{slug}', prefix: 'services', parentType: null, template: 'service' },
  INTEGRATION: { label: 'Integration', labelPlural: 'Integrations', pathPattern: '/integrations/{slug}', prefix: 'integrations', parentType: null, template: 'product' },
  COMPLIANCE: { label: 'Compliance', labelPlural: 'Compliance pages', pathPattern: '/compliance/{slug}', prefix: 'compliance', parentType: null, template: 'compliance' },
  CITY: { label: 'City', labelPlural: 'Cities', pathPattern: '/pos-software/{slug}', prefix: 'pos-software', parentType: null, template: 'city' },
  CITY_INDUSTRY: { label: 'City + industry', labelPlural: 'City + industry pages', pathPattern: '/pos-software/{city}/{slug}', prefix: null, parentType: 'CITY', template: 'city' },
  BEST_OF: { label: 'Best-of', labelPlural: 'Best-of pages', pathPattern: '/best/{slug}', prefix: 'best', parentType: null, template: 'bestof' },
  COMPARE: { label: 'Compare', labelPlural: 'Compare pages', pathPattern: '/compare/{slug}', prefix: 'compare', parentType: null, template: 'compare' },
  ALTERNATIVE: { label: 'Alternative', labelPlural: 'Alternative pages', pathPattern: '/alternatives/{slug}', prefix: 'alternatives', parentType: null, template: 'compare' },
  BLOG_POST: { label: 'Blog post', labelPlural: 'Blog posts', pathPattern: '/blog/{slug}', prefix: 'blog', parentType: null, template: 'article' },
  BLOG_CATEGORY: { label: 'Blog category', labelPlural: 'Blog categories', pathPattern: '/blog/category/{slug}', prefix: 'blog/category', parentType: null, template: 'hub' },
  GUIDE: { label: 'Guide', labelPlural: 'Guides', pathPattern: '/guides/{slug}', prefix: 'guides', parentType: null, template: 'article' },
  GLOSSARY_TERM: { label: 'Glossary term', labelPlural: 'Glossary', pathPattern: '/glossary/{slug}', prefix: 'glossary', parentType: null, template: 'glossary' },
  TOOL: { label: 'Tool', labelPlural: 'Tools', pathPattern: '/tools/{slug}', prefix: 'tools', parentType: null, template: 'tool' },
  TEMPLATE: { label: 'Template', labelPlural: 'Templates', pathPattern: '/templates/{slug}', prefix: 'templates', parentType: null, template: 'article' },
  CASE_STUDY: { label: 'Case study', labelPlural: 'Case studies', pathPattern: '/customers/{slug}', prefix: 'customers', parentType: null, template: 'article' },
  PERSON: { label: 'Person', labelPlural: 'Team', pathPattern: '/team/{slug}', prefix: 'team', parentType: null, template: 'person' },
  DOC: { label: 'Developer doc', labelPlural: 'Developer docs', pathPattern: '/developers/{parent chain}/{slug}', prefix: null, parentType: 'DOC', template: 'docs' },
  CHANGELOG: { label: 'Changelog entry', labelPlural: 'Changelog', pathPattern: '/changelog/{slug}', prefix: 'changelog', parentType: null, template: 'article' },
};

/** Site template for an entry, resolving PAGE by `data.template`. */
export function templateFor(type: CmsEntryType, pageTemplate?: PageTemplate): SiteTemplate {
  if (type === 'PAGE') return pageTemplate ?? 'default';
  return ENTRY_TYPE_META[type].template;
}

/**
 * First path segments owned by typed routes. A PAGE may sit exactly at one of
 * them (the hub, e.g. `/industries`), but never below it (`/industries/x`
 * belongs to the INDUSTRY route).
 *
 * Resolved (Phase 2): `/pricing`, `/faq` and `/roadmap` are ordinary PAGE
 * entries (templates pricing, hub, roadmap); their site routes read the PAGE
 * at that path. `_next` needs no entry here because SITE_PATH_PATTERN never
 * allows `_`; `.xml`/`.txt` routes are unreachable for the same reason.
 */
export const TYPE_ROOT_SEGMENTS = [
  'product', 'industries', 'solutions', 'services', 'integrations', 'compliance', 'pos-software',
  'best', 'compare', 'alternatives', 'blog', 'guides', 'glossary', 'tools', 'templates',
  'customers', 'team', 'developers', 'changelog',
] as const;
/** First path segments a PAGE can never use, at any depth. */
export const RESERVED_ROOT_SEGMENTS = ['api', 'ur', 'sitemaps', 'indexnow', 'developers'] as const;

/** True when a PAGE may live at this path (see the two lists above). */
export function isPagePathAllowed(path: string): boolean {
  if (path === '/') return true;
  const segments = path.split('/').filter(Boolean);
  const first = segments[0] ?? '';
  if ((RESERVED_ROOT_SEGMENTS as readonly string[]).includes(first)) return false;
  if ((TYPE_ROOT_SEGMENTS as readonly string[]).includes(first) && segments.length > 1) return false;
  return true;
}

/** Sitemap files under /sitemaps/<section>.xml (ARCH 9). */
export const SITEMAP_SECTIONS = {
  pages: ['PAGE'],
  products: ['PRODUCT', 'INTEGRATION'],
  industries: ['INDUSTRY', 'SOLUTION', 'SERVICE'],
  locations: ['CITY', 'CITY_INDUSTRY'],
  compliance: ['COMPLIANCE'],
  compare: ['BEST_OF', 'COMPARE', 'ALTERNATIVE'],
  content: ['BLOG_POST', 'BLOG_CATEGORY', 'GUIDE', 'CHANGELOG', 'CASE_STUDY', 'TEMPLATE', 'TOOL'],
  glossary: ['GLOSSARY_TERM'],
  people: ['PERSON'],
  developers: ['DOC'],
} as const satisfies Record<string, readonly CmsEntryType[]>;
export type SitemapSection = keyof typeof SITEMAP_SECTIONS;
export const SITEMAP_SECTION_KEYS = Object.keys(SITEMAP_SECTIONS) as SitemapSection[];
export const sitemapSectionSchema = z.enum(SITEMAP_SECTION_KEYS as [SitemapSection, ...SitemapSection[]]);

export function sitemapSectionFor(type: CmsEntryType): SitemapSection {
  for (const key of SITEMAP_SECTION_KEYS) {
    if ((SITEMAP_SECTIONS[key] as readonly CmsEntryType[]).includes(type)) return key;
  }
  return 'pages';
}

/**
 * "Money" types: pages that sell. They need a summary at publish
 * (MISSING_SUMMARY) and get the 5-8 FAQ warning. PAGE counts as money only
 * for the templates in MONEY_PAGE_TEMPLATES.
 */
export const MONEY_TYPES = [
  'PRODUCT', 'INDUSTRY', 'SOLUTION', 'SERVICE', 'INTEGRATION', 'COMPLIANCE',
  'CITY', 'CITY_INDUSTRY', 'BEST_OF', 'COMPARE', 'ALTERNATIVE',
] as const satisfies readonly CmsEntryType[];
export const MONEY_PAGE_TEMPLATES = ['home', 'pricing'] as const satisfies readonly PageTemplate[];

export function isMoneyType(type: CmsEntryType, pageTemplate?: PageTemplate): boolean {
  if (type === 'PAGE') return pageTemplate !== undefined && (MONEY_PAGE_TEMPLATES as readonly string[]).includes(pageTemplate);
  return (MONEY_TYPES as readonly string[]).includes(type);
}

/** Types whose publish requires a fact-check stamp (NOT_FACT_CHECKED). */
export const FACT_CHECK_TYPES = ['COMPLIANCE', 'COMPARE', 'ALTERNATIVE', 'BEST_OF'] as const satisfies readonly CmsEntryType[];
/** Types whose comparison tables need `checkedAt` + a source when a competitor column exists. */
export const COMPETITOR_TYPES = ['COMPARE', 'ALTERNATIVE', 'BEST_OF'] as const satisfies readonly CmsEntryType[];

// ─── Blocks per type (API-CONTRACT 4, "Blocks allowed per type") ───

export const BLOCK_TYPES = [
  'hero', 'answerBox', 'featuresGrid', 'diagram', 'screenshot', 'faq', 'comparisonTable', 'cta',
  'richText', 'steps', 'stats', 'testimonial', 'logoCloud', 'pricingTable', 'codeSample', 'cityFacts',
  'entryGrid', 'relatedLinks', 'sources', 'callout', 'leadForm', 'tool',
] as const;
export const blockTypeSchema = z.enum(BLOCK_TYPES);
export type BlockType = z.infer<typeof blockTypeSchema>;

const BLOCKS_ALL_TYPES: readonly BlockType[] = ['richText', 'callout', 'cta', 'relatedLinks', 'sources', 'screenshot', 'diagram', 'steps'];
const BLOCKS_MARKETING: readonly BlockType[] = ['hero', 'answerBox', 'featuresGrid', 'faq', 'comparisonTable', 'stats', 'testimonial', 'logoCloud', 'pricingTable'];
const MARKETING_TYPES: readonly CmsEntryType[] = [
  'PAGE', 'PRODUCT', 'INDUSTRY', 'SOLUTION', 'SERVICE', 'INTEGRATION', 'CITY', 'CITY_INDUSTRY',
  'COMPLIANCE', 'COMPARE', 'ALTERNATIVE', 'BEST_OF', 'TOOL',
];
const BLOCK_EXTRA_TYPES: Partial<Record<BlockType, readonly CmsEntryType[]>> = {
  // Hub template on blog categories (ARCH 8).
  hero: ['BLOG_CATEGORY'],
  answerBox: ['BLOG_CATEGORY'],
  faq: ['BLOG_CATEGORY'],
  // Product/integration "industries using it" and service "work examples" (ARCH 8).
  entryGrid: ['PAGE', 'BLOG_CATEGORY', 'PERSON', 'CITY', 'INDUSTRY', 'PRODUCT', 'SERVICE', 'INTEGRATION'],
  cityFacts: ['CITY', 'CITY_INDUSTRY'],
  codeSample: ['DOC', 'BLOG_POST', 'GUIDE', 'SERVICE'],
  leadForm: ['PAGE', 'SERVICE', 'SOLUTION', 'INDUSTRY'],
  tool: ['TOOL'],
};

function buildAllowedBlocks(): Record<CmsEntryType, readonly BlockType[]> {
  const out = {} as Record<CmsEntryType, BlockType[]>;
  for (const type of CMS_ENTRY_TYPES) {
    const list: BlockType[] = [...BLOCKS_ALL_TYPES];
    if (MARKETING_TYPES.includes(type)) list.push(...BLOCKS_MARKETING);
    for (const [block, types] of Object.entries(BLOCK_EXTRA_TYPES) as [BlockType, readonly CmsEntryType[]][]) {
      if (types.includes(type)) list.push(block);
    }
    out[type] = BLOCK_TYPES.filter((b) => list.includes(b));
  }
  return out;
}
/** Block types the admin palette offers and the API accepts, per entry type. */
export const ALLOWED_BLOCKS: Record<CmsEntryType, readonly BlockType[]> = buildAllowedBlocks();

export function isBlockAllowed(entryType: CmsEntryType, blockType: BlockType): boolean {
  return ALLOWED_BLOCKS[entryType].includes(blockType);
}

/** Blocks a new entry starts with (ARCH 8 block order, limited to ALLOWED_BLOCKS). */
export const STARTER_BLOCKS: Record<CmsEntryType, readonly BlockType[]> = {
  PAGE: ['hero', 'richText'],
  PRODUCT: ['hero', 'answerBox', 'steps', 'featuresGrid', 'entryGrid', 'comparisonTable', 'pricingTable', 'faq'],
  INDUSTRY: ['hero', 'answerBox', 'featuresGrid', 'screenshot', 'steps', 'pricingTable', 'richText', 'comparisonTable', 'faq'],
  SOLUTION: ['hero', 'answerBox', 'featuresGrid', 'diagram', 'richText', 'faq'],
  SERVICE: ['hero', 'richText', 'diagram', 'steps', 'richText', 'entryGrid', 'faq', 'leadForm'],
  INTEGRATION: ['hero', 'answerBox', 'steps', 'featuresGrid', 'faq'],
  COMPLIANCE: ['hero', 'answerBox', 'richText', 'steps', 'richText', 'richText', 'faq', 'sources'],
  CITY: ['hero', 'answerBox', 'cityFacts', 'richText', 'cityFacts', 'cityFacts', 'faq', 'relatedLinks'],
  CITY_INDUSTRY: ['hero', 'answerBox', 'cityFacts', 'richText', 'faq', 'relatedLinks'],
  BEST_OF: ['hero', 'richText', 'comparisonTable', 'richText', 'faq'],
  COMPARE: ['hero', 'answerBox', 'comparisonTable', 'richText', 'richText', 'steps', 'faq'],
  ALTERNATIVE: ['hero', 'answerBox', 'comparisonTable', 'richText', 'richText', 'steps', 'faq'],
  BLOG_POST: ['richText'],
  BLOG_CATEGORY: ['hero', 'answerBox', 'entryGrid', 'faq'],
  GUIDE: ['richText'],
  GLOSSARY_TERM: ['richText'],
  TOOL: ['hero', 'tool', 'richText', 'richText', 'faq'],
  TEMPLATE: ['richText'],
  CASE_STUDY: ['richText'],
  PERSON: ['richText', 'entryGrid'],
  DOC: ['richText'],
  CHANGELOG: ['richText'],
};
/** PAGE starters by template (PAGE in STARTER_BLOCKS is the `default` template). */
export const PAGE_TEMPLATE_STARTER_BLOCKS: Record<PageTemplate, readonly BlockType[]> = {
  home: ['hero', 'answerBox', 'featuresGrid', 'entryGrid', 'diagram', 'pricingTable', 'faq'],
  pricing: ['hero', 'pricingTable', 'comparisonTable', 'richText', 'faq'],
  hub: ['hero', 'answerBox', 'entryGrid', 'faq'],
  default: ['hero', 'richText'],
  legal: ['richText'],
  contact: ['hero', 'leadForm'],
  /** Entries with status coming/beta, grouped by type (entryGrid `filter.status`). */
  roadmap: ['hero', 'answerBox', 'entryGrid', 'entryGrid', 'cta', 'faq'],
};

/** `data` fields that must be present at publish (MISSING_DATA), per type. */
export const REQUIRED_DATA_FIELDS: Record<CmsEntryType, readonly string[]> = {
  PAGE: [],
  PRODUCT: ['icon', 'shortName', 'benefit'],
  INDUSTRY: ['icon', 'color', 'group', 'shortName', 'shopNoun'],
  SOLUTION: ['icon', 'shortName', 'outcome'],
  SERVICE: ['icon', 'shortName', 'areaServed'],
  INTEGRATION: ['status', 'category'], // + verifiedAt when status is "live"
  COMPLIANCE: ['authority'],
  CITY: ['name', 'province', 'authority', 'wikidataId'],
  CITY_INDUSTRY: ['industryId', 'evidence'],
  BEST_OF: ['category', 'methodology', 'items'],
  COMPARE: ['competitorName', 'competitorUrl', 'verdict'],
  ALTERNATIVE: ['competitorName', 'competitorUrl', 'verdict'],
  BLOG_POST: [],
  BLOG_CATEGORY: [],
  GUIDE: [],
  GLOSSARY_TERM: ['term', 'definition', 'definitionRomanUrdu'],
  TOOL: ['toolKey', 'kind'],
  TEMPLATE: ['fileMediaId', 'format'],
  CASE_STUDY: ['customerId'],
  PERSON: ['name', 'role'],
  DOC: [],
  CHANGELOG: ['date', 'kind'],
};

/** Copied from `data` onto EntryCard when the type has them. */
export const CARD_DATA_FIELDS = ['icon', 'color', 'group', 'shortName', 'status'] as const;

/** Types whose `data.status` is a FeatureStatus. */
export const FEATURE_STATUS_TYPES = ['PRODUCT', 'SOLUTION', 'SERVICE', 'INTEGRATION'] as const satisfies readonly CmsEntryType[];

/**
 * Feature status of an entry, or null for types without one. A missing value
 * on a status type reads as `live` (the schema default), except INTEGRATION
 * where status is required and a missing value reads as `coming`.
 */
export function featureStatusOf(type: CmsEntryType, data: unknown): FeatureStatus | null {
  if (!(FEATURE_STATUS_TYPES as readonly string[]).includes(type)) return null;
  const raw = data && typeof data === 'object' ? (data as { status?: unknown }).status : undefined;
  if (typeof raw === 'string' && (FEATURE_STATUSES as readonly string[]).includes(raw)) return raw as FeatureStatus;
  return type === 'INTEGRATION' ? 'coming' : 'live';
}

// ─── Quality gates and text limits (ARCH 5.5, 8) ───

export interface QualityGate { minWords: number; minFaqs?: number; similarityMax?: number }

/** Default main-content word gates. Settings `seo.qualityGates` overrides them. */
export const DEFAULT_QUALITY_GATES: Partial<Record<CmsEntryType, QualityGate>> = {
  INDUSTRY: { minWords: 700 },
  CITY: { minWords: 700, similarityMax: 0.5 },
  CITY_INDUSTRY: { minWords: 900, similarityMax: 0.5 },
  PRODUCT: { minWords: 600 },
  SOLUTION: { minWords: 600 },
  SERVICE: { minWords: 500 },
  COMPLIANCE: { minWords: 900 },
  COMPARE: { minWords: 900 },
  ALTERNATIVE: { minWords: 800 },
  BEST_OF: { minWords: 1200 },
  BLOG_POST: { minWords: 800 },
  GUIDE: { minWords: 1500 },
  GLOSSARY_TERM: { minWords: 120 },
  CASE_STUDY: { minWords: 500 },
  TOOL: { minWords: 300 },
  TEMPLATE: { minWords: 200 },
  PERSON: { minWords: 80 },
};

/** Ranges behind the length warnings. Words unless the name says chars. */
export const TEXT_LIMITS = {
  titleChars: { min: 30, max: 60 },
  descriptionChars: { min: 140, max: 155 },
  summaryWords: { min: 40, max: 60 },
  heroSubWords: { min: 25, max: 60 },
  answerWords: { min: 40, max: 60 },
  romanUrduMaxWords: 60,
  faqAnswerWords: { min: 40, max: 80 },
  faqCountMoney: { min: 5, max: 8 },
  /** Article money-page link must appear in the first N words. */
  articleMoneyLinkWithinWords: 150,
  /** Stale warning after this many months without a content update. */
  staleMonths: 12,
  /** Orphan warning below this many inbound links. */
  minInboundLinks: 3,
  /** Hero image: delivered width-1080 AVIF should stay under this. */
  heroImageMaxBytes: 60 * 1024,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 4. Icons (lucide, kebab-case names as on lucide.dev; checked against
//    lucide-react 1.30). The site maps a name to the component in the
//    `icons` export by its PascalCase name (`iconExportName`).
// ═══════════════════════════════════════════════════════════════════════════

export const ALLOWED_ICONS = [
  // Commerce and money
  'store', 'shopping-cart', 'shopping-bag', 'shopping-basket', 'receipt', 'receipt-text', 'scan-barcode',
  'barcode', 'qr-code', 'credit-card', 'wallet', 'banknote', 'coins', 'hand-coins', 'piggy-bank',
  'calculator', 'percent', 'tag', 'tags', 'ticket', 'gift', 'badge-percent',
  // Stock, documents, printing
  'package', 'package-check', 'package-search', 'boxes', 'box', 'warehouse', 'truck', 'container',
  'clipboard-list', 'clipboard-check', 'list-checks', 'file-text', 'file-spreadsheet', 'files', 'folder',
  'printer', 'book-open', 'notebook-pen',
  // Reports
  'chart-column', 'chart-line', 'chart-pie', 'chart-bar', 'trending-up', 'trending-down', 'activity',
  'gauge', 'layout-dashboard', 'table',
  // People and organisations
  'users', 'user', 'user-check', 'user-plus', 'user-cog', 'contact', 'id-card', 'handshake', 'briefcase',
  'building', 'building-2', 'factory', 'landmark', 'school',
  // Devices, sync and tech
  'smartphone', 'tablet', 'monitor', 'laptop', 'cpu', 'server', 'database', 'cloud', 'cloud-off', 'wifi',
  'wifi-off', 'refresh-cw', 'rotate-ccw', 'repeat', 'arrow-left-right', 'arrow-right', 'arrow-up-right',
  'link', 'plug', 'plug-zap', 'webhook', 'code', 'code-xml', 'terminal', 'braces', 'key-round', 'lock',
  'shield', 'shield-check', 'fingerprint-pattern', 'scan-line',
  // Messaging and places
  'bell', 'bell-ring', 'mail', 'message-circle', 'message-square', 'phone', 'send', 'share-2', 'globe',
  'map-pin', 'map', 'navigation',
  // Time
  'clock', 'calendar', 'calendar-check', 'calendar-clock', 'timer', 'hourglass',
  // Status and general
  'check', 'circle', 'circle-check', 'circle-x', 'circle-alert', 'triangle-alert', 'info',
  'circle-question-mark', 'sparkles', 'star', 'zap', 'rocket', 'target', 'flag', 'award', 'trophy',
  'thumbs-up', 'heart', 'lightbulb', 'eye', 'search', 'funnel', 'settings', 'sliders-horizontal',
  'wrench', 'hammer', 'layers', 'layout-grid', 'list', 'git-branch', 'workflow', 'network', 'split',
  'merge', 'download', 'upload', 'languages',
  // Industries
  'pill', 'stethoscope', 'glasses', 'refrigerator', 'milk', 'hotel', 'gamepad-2', 'toy-brick', 'scissors',
  'shirt', 'cake-slice', 'flower-2', 'dumbbell', 'beef', 'utensils-crossed', 'footprints', 'paw-print',
  'gem', 'armchair', 'wheat', 'coffee', 'pizza', 'croissant', 'car', 'bike', 'sofa', 'tv', 'baby',
  'apple', 'carrot', 'fish', 'egg', 'syringe', 'heart-pulse', 'graduation-cap', 'bed', 'chef-hat', 'soup',
  'sandwich', 'ice-cream-cone', 'candy', 'watch', 'tractor', 'sprout', 'leaf', 'paintbrush', 'palette',
  'camera',
] as const;
export const iconNameSchema = z.enum(ALLOWED_ICONS);
export type IconName = z.infer<typeof iconNameSchema>;
/** Rendered when a stored name is not in ALLOWED_ICONS (the API rejects it at publish). */
export const FALLBACK_ICON: IconName = 'circle';

const ALLOWED_ICON_SET: ReadonlySet<string> = new Set(ALLOWED_ICONS);
export function isAllowedIcon(name: string): name is IconName {
  return ALLOWED_ICON_SET.has(name);
}
/** "gamepad-2" → "Gamepad2", the key in lucide-react's `icons` export. */
export function iconExportName(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Text conventions (API-CONTRACT 3): tokens, entry links, media links
// ═══════════════════════════════════════════════════════════════════════════

/** Matches every `{{...}}` token in a string; group 1 is the inner text. */
export const TOKEN_REGEX = /\{\{\s*([^{}]+?)\s*\}\}/g;

export const PRICE_PERIODS = ['monthly', 'quarterly', 'yearly'] as const;
export type PricePeriod = (typeof PRICE_PERIODS)[number];
export const COUNT_TOKEN_KEYS = ['industries', 'cities', 'integrations', 'glossary', 'posts'] as const;
export type CountTokenKey = (typeof COUNT_TOKEN_KEYS)[number];
/** Dotted path inside settings `entity`, e.g. "compliance.fbrPra". */
export const FACT_PATH_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)*$/;

export type ParsedToken =
  | { kind: 'price'; planSlug: string; period: PricePeriod }
  | { kind: 'priceMin'; period: 'monthly' }
  | { kind: 'count'; key: CountTokenKey }
  | { kind: 'fact'; path: string }
  | { kind: 'year' };

/**
 * Parses the inner text of a token (without braces). Returns null when the
 * syntax is unknown, which the API reports as UNKNOWN_TOKEN. Whether a plan
 * slug or fact path exists is checked by the API against live data.
 */
export function parseToken(inner: string): ParsedToken | null {
  const text = inner.trim();
  if (text === 'year') return { kind: 'year' };
  const colon = text.indexOf(':');
  if (colon < 0) return null;
  const name = text.slice(0, colon);
  const arg = text.slice(colon + 1);
  if (name === 'price') {
    if (arg === 'min.monthly') return { kind: 'priceMin', period: 'monthly' };
    const dot = arg.lastIndexOf('.');
    if (dot < 0) return null;
    const planSlug = arg.slice(0, dot);
    const period = arg.slice(dot + 1);
    if (!PLAN_SLUG_PATTERN.test(planSlug) || planSlug === 'min') return null;
    if (!(PRICE_PERIODS as readonly string[]).includes(period)) return null;
    return { kind: 'price', planSlug, period: period as PricePeriod };
  }
  if (name === 'count') {
    return (COUNT_TOKEN_KEYS as readonly string[]).includes(arg) ? { kind: 'count', key: arg as CountTokenKey } : null;
  }
  if (name === 'fact') {
    return FACT_PATH_PATTERN.test(arg) ? { kind: 'fact', path: arg } : null;
  }
  return null;
}

export interface FoundToken { raw: string; inner: string; index: number; token: ParsedToken | null }

/** Every token in a string, in order, with its parse result. */
export function findTokens(text: string): FoundToken[] {
  const out: FoundToken[] = [];
  for (const match of text.matchAll(TOKEN_REGEX)) {
    const inner = match[1] ?? '';
    out.push({ raw: match[0], inner, index: match.index ?? 0, token: parseToken(inner) });
  }
  return out;
}

/** Token reference for the admin's token helper (GET /config adds live examples). */
export const TOKEN_HELP: readonly { token: string; description: string }[] = [
  { token: '{{price:<planSlug>.monthly}}', description: 'Plan price from Admin → Plans (also .quarterly, .yearly)' },
  { token: '{{price:min.monthly}}', description: 'Lowest non-zero public monthly price' },
  { token: '{{count:industries}}', description: 'Published count (also cities, integrations, glossary, posts)' },
  { token: '{{fact:compliance.fbrPra}}', description: 'A value from settings → Entity facts' },
  { token: '{{year}}', description: 'Current year (Asia/Karachi)' },
];

/** `entry:<id>` or `entry:<id>#<anchor>` (Markdown hrefs and every href field). */
export const ENTRY_LINK_PATTERN = /^entry:([A-Za-z0-9_-]{1,64})(?:#([a-z0-9][a-z0-9-]{0,63}))?$/;
/** Entry links inside Markdown: `](entry:<id>)` or `](entry:<id>#anchor)`. */
export const MARKDOWN_ENTRY_LINK_REGEX = /\]\(\s*entry:([A-Za-z0-9_-]{1,64})(?:#([a-z0-9][a-z0-9-]{0,63}))?(?:\s+"[^"]*")?\s*\)/g;
/** Images inside Markdown: `![alt](media:<id>)`. */
export const MARKDOWN_MEDIA_REGEX = /!\[([^\]]*)\]\(\s*media:([A-Za-z0-9_-]{1,64})(?:\s+"[^"]*")?\s*\)/g;
export const MEDIA_LINK_PATTERN = /^media:([A-Za-z0-9_-]{1,64})$/;

export function parseEntryLink(href: string): { id: string; anchor: string | null } | null {
  const m = ENTRY_LINK_PATTERN.exec(href.trim());
  if (!m || !m[1]) return null;
  return { id: m[1], anchor: m[2] ?? null };
}
export function toEntryLink(id: string, anchor?: string | null): string {
  return anchor ? `entry:${id}#${anchor}` : `entry:${id}`;
}

/**
 * Special CTA hrefs: site settings `signupUrl`, `demoPath`, and a WhatsApp deep
 * link. Resolved (Phase 2): the API turns them into real links in every
 * public response (`href`, `ctaHref`, `url` fields), so the site never sees a
 * keyword. If settings lack the target the keyword is left as is; the site
 * must then render the CTA without a link (or hide it).
 */
export const CTA_HREF_KEYWORDS = ['signup', 'demo', 'whatsapp'] as const;
export type CtaHrefKeyword = (typeof CTA_HREF_KEYWORDS)[number];
export function isCtaKeyword(href: string): href is CtaHrefKeyword {
  return (CTA_HREF_KEYWORDS as readonly string[]).includes(href);
}

/**
 * Accepted href forms: `entry:<id>[#anchor]`, a CTA keyword, a site path
 * ("/x", query and fragment allowed), an in-page "#anchor", http(s) URLs,
 * `mailto:` and `tel:`.
 */
export function isValidHref(href: string): boolean {
  if (href.length === 0 || href.length > 2048 || /\s/.test(href)) return false;
  if (ENTRY_LINK_PATTERN.test(href) || isCtaKeyword(href)) return true;
  if (href.startsWith('/')) return !href.startsWith('//');
  if (href.startsWith('#')) return ANCHOR_PATTERN.test(href.slice(1));
  if (/^mailto:[^@\s]+@[^@\s]+$/.test(href)) return true;
  if (/^tel:\+?[0-9-]{5,20}$/.test(href)) return true;
  return /^https?:\/\/[^/\s]+\.[^/\s]+/.test(href);
}
export const hrefSchema = z.string().trim().refine(isValidHref, 'Link: entry:<id>, /path, #anchor, https://…, signup, demo or whatsapp');

/** Markdown headings allowed in content (H1 belongs to the hero or template). */
export const MARKDOWN_ALLOWED_HEADING_LEVELS = [2, 3] as const;

// ─── Text field schemas ───

/** Markdown (GFM). Rules in API-CONTRACT 3.3 are checked by the API. */
export const mdSchema = z.string().max(100_000);
/** Inline Markdown: bold, italic, links, tokens. */
export const inlineMdSchema = z.string().max(2_000);
const shortText = (max: number) => z.string().trim().min(1).max(max);

// ═══════════════════════════════════════════════════════════════════════════
// 6. Shared block pieces: CTA, source, diagrams
// ═══════════════════════════════════════════════════════════════════════════

export const ctaSchema = z.object({
  label: shortText(60),
  href: hrefSchema,
  variant: z.enum(['primary', 'secondary', 'ghost']).optional(),
  /** Analytics label for `cta_click`. */
  trackAs: z.string().regex(/^[a-z0-9_.:-]{1,64}$/).optional(),
});
export type Cta = z.infer<typeof ctaSchema>;

export const sourceSchema = z.object({
  title: shortText(300),
  url: httpUrlSchema,
  publisher: shortText(200),
  accessedAt: dateOrDateTimeSchema,
});
export type Source = z.infer<typeof sourceSchema>;

export const BESPOKE_DIAGRAM_KINDS = [
  'offline-sync', 'fbr-invoice', 'khata-cycle', 'multi-branch', 'order-to-cash',
  'store-sync', 'api-webhooks', 'service-process',
] as const;
export type BespokeDiagramKind = (typeof BESPOKE_DIAGRAM_KINDS)[number];
export const DATA_DIAGRAM_KINDS = ['flow', 'hub', 'timeline'] as const;
export type DataDiagramKind = (typeof DATA_DIAGRAM_KINDS)[number];
export const DIAGRAM_KINDS = [...BESPOKE_DIAGRAM_KINDS, ...DATA_DIAGRAM_KINDS] as const;
export type DiagramKind = (typeof DIAGRAM_KINDS)[number];

/**
 * Label keys per bespoke diagram, with the default English label. The site
 * renders `labels[key] ?? default`; the admin offers exactly these keys.
 * Adding a key is a code change in the diagram component and here.
 */
export const DIAGRAM_LABEL_KEYS: Record<BespokeDiagramKind, Readonly<Record<string, string>>> = {
  'offline-sync': { device: 'Your counter', queue: 'Offline queue', cloud: 'Nafaa cloud', branch: 'Other branch', offline: 'Offline', synced: 'Synced' },
  'fbr-invoice': { sale: 'POS sale', nafaa: 'Nafaa', authority: 'FBR / PRA', fiscal: 'Fiscal number', receipt: 'QR on receipt' },
  'khata-cycle': { sale: 'Udhaar sale', reminder: 'WhatsApp reminder', payment: 'Payment', balance: 'Balance updated' },
  'multi-branch': { hq: 'Head office', branchA: 'Branch 1', branchB: 'Branch 2', branchC: 'Branch 3', transfer: 'Stock transfer' },
  'order-to-cash': { booker: 'Order booker', warehouse: 'Warehouse', dispatch: 'Dispatch', invoice: 'Invoice', collection: 'Collection' },
  'store-sync': { nafaa: 'Nafaa', shopify: 'Shopify', website: 'Online store', bazaar: 'Nafaa Bazaar', stock: 'Stock', orders: 'Orders' },
  'api-webhooks': { app: 'Your app', api: 'API v1', nafaa: 'Nafaa', webhooks: 'Webhooks' },
  'service-process': { discover: 'Discover', design: 'Design', build: 'Build', launch: 'Launch', support: 'Support' },
};
export const DIAGRAM_LABEL_MAX = 48;

export const DIAGRAM_LIMITS = {
  flowNodes: { min: 2, max: 8 },
  flowEdgesMax: 16,
  hubSpokes: { min: 3, max: 8 },
  timelineItems: { min: 2, max: 6 },
} as const;

const diagramNodeIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/, 'Node id: a-z, 0-9, hyphens');

export const bespokeDiagramSchema = z
  .object({
    kind: z.enum(BESPOKE_DIAGRAM_KINDS),
    labels: z.record(z.string(), shortText(DIAGRAM_LABEL_MAX)).optional(),
    animate: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.labels) return;
    const allowed = DIAGRAM_LABEL_KEYS[value.kind];
    for (const key of Object.keys(value.labels)) {
      if (!(key in allowed)) {
        ctx.addIssue({ code: 'custom', path: ['labels', key], message: `Unknown label "${key}" for diagram ${value.kind}` });
      }
    }
  });

export const flowDiagramSchema = z
  .object({
    kind: z.literal('flow'),
    nodes: z
      .array(z.object({ id: diagramNodeIdSchema, label: shortText(DIAGRAM_LABEL_MAX), icon: iconNameSchema.optional(), note: z.string().max(120).optional() }))
      .min(DIAGRAM_LIMITS.flowNodes.min)
      .max(DIAGRAM_LIMITS.flowNodes.max),
    edges: z
      .array(z.object({ from: diagramNodeIdSchema, to: diagramNodeIdSchema, label: z.string().trim().max(32).optional() }))
      .max(DIAGRAM_LIMITS.flowEdgesMax),
    animate: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    value.nodes.forEach((node, i) => {
      if (ids.has(node.id)) ctx.addIssue({ code: 'custom', path: ['nodes', i, 'id'], message: `Duplicate node id "${node.id}"` });
      ids.add(node.id);
    });
    value.edges.forEach((edge, i) => {
      if (!ids.has(edge.from)) ctx.addIssue({ code: 'custom', path: ['edges', i, 'from'], message: `Unknown node "${edge.from}"` });
      if (!ids.has(edge.to)) ctx.addIssue({ code: 'custom', path: ['edges', i, 'to'], message: `Unknown node "${edge.to}"` });
    });
  });

export const hubDiagramSchema = z.object({
  kind: z.literal('hub'),
  center: z.object({ label: shortText(DIAGRAM_LABEL_MAX), icon: iconNameSchema.optional() }),
  spokes: z
    .array(z.object({ label: shortText(DIAGRAM_LABEL_MAX), icon: iconNameSchema.optional(), href: hrefSchema.optional() }))
    .min(DIAGRAM_LIMITS.hubSpokes.min)
    .max(DIAGRAM_LIMITS.hubSpokes.max),
  animate: z.boolean().optional(),
});

export const timelineDiagramSchema = z.object({
  kind: z.literal('timeline'),
  items: z
    .array(z.object({ date: shortText(40), label: shortText(60), note: z.string().max(160).optional() }))
    .min(DIAGRAM_LIMITS.timelineItems.min)
    .max(DIAGRAM_LIMITS.timelineItems.max),
  animate: z.boolean().optional(),
});

export const diagramSpecSchema = z.discriminatedUnion('kind', [
  bespokeDiagramSchema,
  flowDiagramSchema,
  hubDiagramSchema,
  timelineDiagramSchema,
]);
export type DiagramSpec = z.infer<typeof diagramSpecSchema>;
export type BespokeDiagramSpec = z.infer<typeof bespokeDiagramSchema>;
export type FlowDiagramSpec = z.infer<typeof flowDiagramSchema>;
export type HubDiagramSpec = z.infer<typeof hubDiagramSchema>;
export type TimelineDiagramSpec = z.infer<typeof timelineDiagramSchema>;

export function isBespokeDiagramKind(kind: string): kind is BespokeDiagramKind {
  return (BESPOKE_DIAGRAM_KINDS as readonly string[]).includes(kind);
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. Blocks (API-CONTRACT 4)
// ═══════════════════════════════════════════════════════════════════════════

const blockBaseShape = {
  id: blockIdSchema,
  anchor: anchorSchema.optional(),
  theme: blockThemeSchema.optional(),
  /** Kept in the draft, never rendered or published. */
  hidden: z.boolean().optional(),
};

export const BLOCK_LIMITS = {
  heroBadgesMax: 6,
  answerFacts: { min: 2, max: 8 },
  featureItems: { min: 3, max: 12 },
  screenshotCalloutsMax: 6,
  comparisonColumns: { min: 2, max: 6 },
  comparisonRowsMax: 60,
  stepsItems: { min: 2, max: 10 },
  statsItems: { min: 1, max: 6 },
  pickIdsMax: 24,
  testimonialLimitMax: 12,
  logoLimitMax: 24,
  pricingPlansMax: 6,
  codeTabs: { min: 1, max: 6 },
  entryGridLimitMax: 200,
  relatedLimitMax: 24,
  sourcesMax: 30,
  blocksPerEntryMax: 80,
} as const;

const heroMediaSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('screenshot'),
    mediaId: idSchema,
    frame: frameSchema,
    /** Text shown in the browser frame's address bar, e.g. "app.nafaa.pk/pos". */
    url: z.string().trim().max(120).optional(),
  }),
  z.object({ kind: z.literal('diagram'), diagram: diagramSpecSchema }),
  z.object({ kind: z.literal('image'), mediaId: idSchema }),
]);
export type HeroMedia = z.infer<typeof heroMediaSchema>;

export const heroBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('hero'),
  eyebrow: z.string().trim().max(60).optional(),
  /** Defaults to the entry title. Always the page H1. */
  heading: z.string().trim().max(160).optional(),
  sub: inlineMdSchema.min(1),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema.optional(),
  media: heroMediaSchema.optional(),
  badges: z.array(inlineMdSchema.max(120)).max(BLOCK_LIMITS.heroBadgesMax).optional(),
  layout: z.enum(['split', 'centered']),
});

export const answerBoxBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('answerBox'),
  heading: z.string().trim().max(120).optional(),
  /** Defaults to the entry summary. */
  answer: inlineMdSchema.optional(),
  facts: z
    .array(z.object({ label: shortText(60), value: inlineMdSchema.min(1).max(300) }))
    .min(BLOCK_LIMITS.answerFacts.min)
    .max(BLOCK_LIMITS.answerFacts.max),
  romanUrdu: z.string().trim().max(600).optional(),
});

export const featuresGridBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('featuresGrid'),
  heading: shortText(120),
  intro: inlineMdSchema.optional(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  items: z
    .array(
      z.object({
        icon: iconNameSchema,
        title: shortText(80),
        body: inlineMdSchema.min(1).max(600),
        href: hrefSchema.optional(),
        /** Absent means live. `beta`/`coming` render a badge (FEATURE_STATUS_BADGES). */
        status: featureStatusSchema.optional(),
      }),
    )
    .min(BLOCK_LIMITS.featureItems.min)
    .max(BLOCK_LIMITS.featureItems.max),
});

export const diagramBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('diagram'),
  heading: z.string().trim().max(120).optional(),
  /** figcaption and SVG <desc>. */
  caption: shortText(300),
  diagram: diagramSpecSchema,
});

export const screenshotBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('screenshot'),
  heading: z.string().trim().max(120).optional(),
  body: mdSchema.optional(),
  /** Media kind must be IMAGE or SCREENSHOT (checked by the API). */
  mediaId: idSchema,
  frame: frameSchema,
  url: z.string().trim().max(120).optional(),
  callouts: z
    .array(z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), label: shortText(80) }))
    .max(BLOCK_LIMITS.screenshotCalloutsMax)
    .optional(),
  layout: z.enum(['full', 'split-left', 'split-right']),
  caption: z.string().trim().max(300).optional(),
});

export const faqBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('faq'),
  heading: z.string().trim().max(120).optional(),
});

/** Cell values with their own rendering; any other string is shown as text. */
export const COMPARISON_CELL_MARKS = ['yes', 'no', 'partial'] as const;
const comparisonColumnKeySchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,31}$/, 'Column key: a-z, 0-9, _ or -');

export const comparisonTableBlockSchema = z
  .object({
    ...blockBaseShape,
    type: z.literal('comparisonTable'),
    heading: shortText(120),
    caption: shortText(300),
    columns: z
      .array(z.object({ key: comparisonColumnKeySchema, label: shortText(60), highlight: z.boolean().optional() }))
      .min(BLOCK_LIMITS.comparisonColumns.min)
      .max(BLOCK_LIMITS.comparisonColumns.max),
    rows: z
      .array(
        z.object({
          label: shortText(160),
          cells: z.record(z.string(), z.object({ value: shortText(200), note: z.string().trim().max(300).optional() })),
        }),
      )
      .min(1)
      .max(BLOCK_LIMITS.comparisonRowsMax),
    /** Required (with checkedAt) when a column is a competitor on COMPARE, ALTERNATIVE, BEST_OF; checked by the API. */
    sources: z.array(sourceSchema).max(BLOCK_LIMITS.sourcesMax).optional(),
    checkedAt: dateOrDateTimeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const keys = new Set<string>();
    value.columns.forEach((col, i) => {
      if (keys.has(col.key)) ctx.addIssue({ code: 'custom', path: ['columns', i, 'key'], message: `Duplicate column key "${col.key}"` });
      keys.add(col.key);
    });
    value.rows.forEach((row, r) => {
      for (const key of Object.keys(row.cells)) {
        if (!keys.has(key)) ctx.addIssue({ code: 'custom', path: ['rows', r, 'cells', key], message: `Cell for unknown column "${key}"` });
      }
    });
  });

export const ctaBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('cta'),
  heading: shortText(120),
  body: inlineMdSchema.optional(),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema.optional(),
});

export const richTextBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('richText'),
  markdown: mdSchema.min(1),
});

export const stepsBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('steps'),
  heading: shortText(120),
  intro: inlineMdSchema.optional(),
  items: z
    .array(z.object({ title: shortText(120), body: mdSchema.min(1).max(5_000), mediaId: idSchema.optional() }))
    .min(BLOCK_LIMITS.stepsItems.min)
    .max(BLOCK_LIMITS.stepsItems.max),
  /** Emits HowTo schema; use only for real step-by-step instructions. */
  howTo: z.boolean().optional(),
});

export const statsBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('stats'),
  heading: z.string().trim().max(120).optional(),
  /** Values come only from GET /public/site/stats; there is no number field. */
  items: z
    .array(z.object({ metric: statMetricSchema, label: shortText(60), suffix: z.string().trim().max(16).optional() }))
    .min(BLOCK_LIMITS.statsItems.min)
    .max(BLOCK_LIMITS.statsItems.max),
});

const pickOrAutoShape = {
  heading: z.string().trim().max(120).optional(),
  mode: z.enum(['pick', 'auto']),
  ids: z.array(idSchema).max(BLOCK_LIMITS.pickIdsMax).optional(),
  filter: z.object({ industryId: idSchema.optional(), cityId: idSchema.optional() }).optional(),
};
function requireIdsWhenPicked(value: { mode: 'pick' | 'auto'; ids?: string[] | undefined }, ctx: z.RefinementCtx): void {
  if (value.mode === 'pick' && (!value.ids || value.ids.length === 0)) {
    ctx.addIssue({ code: 'custom', path: ['ids'], message: 'Pick at least one item, or switch to auto' });
  }
}

export const testimonialBlockSchema = z
  .object({
    ...blockBaseShape,
    type: z.literal('testimonial'),
    ...pickOrAutoShape,
    limit: z.number().int().min(1).max(BLOCK_LIMITS.testimonialLimitMax).optional(),
  })
  .superRefine(requireIdsWhenPicked);

export const logoCloudBlockSchema = z
  .object({
    ...blockBaseShape,
    type: z.literal('logoCloud'),
    ...pickOrAutoShape,
    limit: z.number().int().min(1).max(BLOCK_LIMITS.logoLimitMax).optional(),
  })
  .superRefine(requireIdsWhenPicked);

export const pricingTableBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('pricingTable'),
  heading: z.string().trim().max(120).optional(),
  /** Empty or absent: every active public plan, in Plan.sortOrder. */
  planSlugs: z.array(planSlugSchema).max(BLOCK_LIMITS.pricingPlansMax).optional(),
  showToggle: z.boolean(),
  highlightPlan: planSlugSchema.optional(),
  featureKeys: z.array(planFeatureKeySchema).optional(),
  compact: z.boolean().optional(),
});

export const codeSampleBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('codeSample'),
  heading: z.string().trim().max(120).optional(),
  tabs: z
    .array(z.object({ label: shortText(40), language: codeLanguageSchema, code: z.string().min(1).max(20_000) }))
    .min(BLOCK_LIMITS.codeTabs.min)
    .max(BLOCK_LIMITS.codeTabs.max),
  caption: z.string().trim().max(300).optional(),
});

export const CITY_FACT_SECTIONS = ['tax', 'markets', 'areas', 'support', 'nearby'] as const;
export const cityFactsBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('cityFacts'),
  show: z
    .array(z.enum(CITY_FACT_SECTIONS))
    .min(1)
    .refine((list) => new Set(list).size === list.length, 'Each section once'),
  heading: z.string().trim().max(120).optional(),
});

export const ENTRY_SORTS = ['order', 'recent', 'title'] as const;
export const entrySortSchema = z.enum(ENTRY_SORTS);
export type EntrySort = z.infer<typeof entrySortSchema>;

export const entryGridBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('entryGrid'),
  heading: z.string().trim().max(120).optional(),
  intro: inlineMdSchema.optional(),
  entryType: cmsEntryTypeSchema,
  filter: z
    .object({
      tagId: idSchema.optional(),
      group: keySchema.optional(),
      featured: z.boolean().optional(),
      parentId: idSchema.optional(),
      /** Feature status filter (types with `data.status`), e.g. ['coming'] on the roadmap. */
      status: z.array(featureStatusSchema).min(1).max(3).optional(),
    })
    .optional(),
  sort: entrySortSchema.optional(),
  limit: z.number().int().min(1).max(BLOCK_LIMITS.entryGridLimitMax).optional(),
  /** `grouped` groups by `data.group` in the order of settings `industry-groups`. */
  layout: z.enum(['cards', 'list', 'grouped']),
});

export const relatedLinksBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('relatedLinks'),
  heading: z.string().trim().max(120).optional(),
  source: z.enum(['related', 'tags']),
  tagType: cmsEntryTypeSchema.optional(),
  limit: z.number().int().min(1).max(BLOCK_LIMITS.relatedLimitMax).optional(),
});

export const sourcesBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('sources'),
  heading: z.string().trim().max(120).optional(),
  items: z.array(sourceSchema).min(1).max(BLOCK_LIMITS.sourcesMax),
});

export const calloutBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('callout'),
  tone: z.enum(['info', 'tip', 'warning']),
  title: z.string().trim().max(120).optional(),
  body: mdSchema.min(1).max(5_000),
});

export const leadFormBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('leadForm'),
  heading: shortText(120),
  intro: inlineMdSchema.optional(),
  /**
   * contact → POST /public/marketing/contact-form; demo → /public/marketing/demo-booking;
   * quote ("Quote lein") → contact-form with formType SALES, the budget and
   * currency written into the message. Every form creates a MarketingLead.
   */
  form: z.enum(['contact', 'demo', 'quote']),
  formType: z.enum(LEAD_FORM_TYPES).optional(),
  subjectPrefix: z.string().trim().max(80).optional(),
  successMessage: shortText(300),
  /** quote only: currencies offered for the budget field; default both. */
  currencies: z.array(z.enum(LEAD_CURRENCIES)).min(1).max(2).optional(),
  /** Show a WhatsApp button (site settings `whatsapp`) next to the form. */
  whatsapp: z.boolean().optional(),
});

export const toolBlockSchema = z.object({
  ...blockBaseShape,
  type: z.literal('tool'),
  toolKey: toolKeySchema,
});

/** Per-type block schemas (admin forms, API validation by type). */
export const BLOCK_SCHEMAS = {
  hero: heroBlockSchema,
  answerBox: answerBoxBlockSchema,
  featuresGrid: featuresGridBlockSchema,
  diagram: diagramBlockSchema,
  screenshot: screenshotBlockSchema,
  faq: faqBlockSchema,
  comparisonTable: comparisonTableBlockSchema,
  cta: ctaBlockSchema,
  richText: richTextBlockSchema,
  steps: stepsBlockSchema,
  stats: statsBlockSchema,
  testimonial: testimonialBlockSchema,
  logoCloud: logoCloudBlockSchema,
  pricingTable: pricingTableBlockSchema,
  codeSample: codeSampleBlockSchema,
  cityFacts: cityFactsBlockSchema,
  entryGrid: entryGridBlockSchema,
  relatedLinks: relatedLinksBlockSchema,
  sources: sourcesBlockSchema,
  callout: calloutBlockSchema,
  leadForm: leadFormBlockSchema,
  tool: toolBlockSchema,
} as const satisfies Record<BlockType, z.ZodType>;

/** One complete, publishable block. */
export const blockSchema = z.discriminatedUnion('type', [
  heroBlockSchema, answerBoxBlockSchema, featuresGridBlockSchema, diagramBlockSchema, screenshotBlockSchema,
  faqBlockSchema, comparisonTableBlockSchema, ctaBlockSchema, richTextBlockSchema, stepsBlockSchema,
  statsBlockSchema, testimonialBlockSchema, logoCloudBlockSchema, pricingTableBlockSchema, codeSampleBlockSchema,
  cityFactsBlockSchema, entryGridBlockSchema, relatedLinksBlockSchema, sourcesBlockSchema, calloutBlockSchema,
  leadFormBlockSchema, toolBlockSchema,
]);
export type Block = z.infer<typeof blockSchema>;
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;
export type HeroBlock = BlockOf<'hero'>;
export type AnswerBoxBlock = BlockOf<'answerBox'>;
export type FeaturesGridBlock = BlockOf<'featuresGrid'>;
export type DiagramBlock = BlockOf<'diagram'>;
export type ScreenshotBlock = BlockOf<'screenshot'>;
export type FaqBlock = BlockOf<'faq'>;
export type ComparisonTableBlock = BlockOf<'comparisonTable'>;
export type CtaBlock = BlockOf<'cta'>;
export type RichTextBlock = BlockOf<'richText'>;
export type StepsBlock = BlockOf<'steps'>;
export type StatsBlock = BlockOf<'stats'>;
export type TestimonialBlock = BlockOf<'testimonial'>;
export type LogoCloudBlock = BlockOf<'logoCloud'>;
export type PricingTableBlock = BlockOf<'pricingTable'>;
export type CodeSampleBlock = BlockOf<'codeSample'>;
export type CityFactsBlock = BlockOf<'cityFacts'>;
export type EntryGridBlock = BlockOf<'entryGrid'>;
export type RelatedLinksBlock = BlockOf<'relatedLinks'>;
export type SourcesBlock = BlockOf<'sources'>;
export type CalloutBlock = BlockOf<'callout'>;
export type LeadFormBlock = BlockOf<'leadForm'>;
export type ToolBlock = BlockOf<'tool'>;

function refineBlockList(blocks: readonly { id: string; anchor?: string | undefined }[], ctx: z.RefinementCtx): void {
  const ids = new Set<string>();
  const anchors = new Set<string>();
  blocks.forEach((block, i) => {
    if (ids.has(block.id)) ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `Duplicate block id "${block.id}"` });
    ids.add(block.id);
    if (block.anchor) {
      if (anchors.has(block.anchor)) ctx.addIssue({ code: 'custom', path: [i, 'anchor'], message: `Duplicate anchor "${block.anchor}"` });
      anchors.add(block.anchor);
    }
  });
}

/** Publish-time block list: every block complete, ids and anchors unique. */
export const blocksSchema = z.array(blockSchema).max(BLOCK_LIMITS.blocksPerEntryMax).superRefine(refineBlockList);

/**
 * Draft block (autosave): only `id` and `type` are checked so half-filled
 * blocks can be saved. The full shape is checked by Validate and Publish.
 */
export const draftBlockSchema = z
  .object({ id: blockIdSchema, type: blockTypeSchema, anchor: anchorSchema.optional(), hidden: z.boolean().optional() })
  .loose();
export type DraftBlock = z.infer<typeof draftBlockSchema>;
export const draftBlocksSchema = z.array(draftBlockSchema).max(BLOCK_LIMITS.blocksPerEntryMax).superRefine(refineBlockList);

/** Blocks with `hidden` removed: what gets published and rendered. */
export function visibleBlocks<T extends { hidden?: boolean | undefined }>(blocks: readonly T[]): T[] {
  return blocks.filter((b) => b.hidden !== true);
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. Entry data per type (API-CONTRACT 5.1)
//    `*Shape` objects hold the publish shape; drafts accept any subset.
// ═══════════════════════════════════════════════════════════════════════════

export const INDUSTRY_AUTHORITIES = ['FBR', 'PRA', 'SRB', 'KPRA', 'BRA', 'ICT', 'DRAP', 'OTHER'] as const;
export const CITY_AUTHORITIES = ['PRA', 'SRB', 'KPRA', 'BRA', 'ICT'] as const;
export const PROVINCES = [
  'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Gilgit-Baltistan', 'Azad Kashmir',
] as const;
export const WIKIDATA_ID_PATTERN = /^Q[1-9][0-9]*$/;
export const TEMPLATE_FORMATS = ['xlsx', 'pdf', 'docx', 'csv'] as const;
export const CHANGELOG_KINDS = ['new', 'improved', 'fixed'] as const;
export const HTTP_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const;

const industryColorSchema = z
  .string()
  .regex(HEX_COLOR_PATTERN, 'Color: #rrggbb')
  .refine((hex) => contrastRatioWithWhite(hex) >= MIN_CONTRAST_WITH_WHITE, 'Color needs at least 4.5:1 contrast with white text');

const pageDataShape = z.object({
  type: z.literal('PAGE'),
  template: pageTemplateSchema.default('default'),
  hubOf: cmsEntryTypeSchema.optional(),
});
const productDataShape = z.object({
  type: z.literal('PRODUCT'),
  icon: iconNameSchema,
  shortName: shortText(40),
  benefit: shortText(60),
  /** `coming`: marketed with a badge and on the roadmap only; always noindex. */
  status: featureStatusSchema.default('live'),
  planFeature: planFeatureKeySchema.optional(),
  /** App route the feature lives at, e.g. "/pos" (for screenshots and links to the app). */
  appRoute: z.string().regex(/^\/[A-Za-z0-9/_-]*$/).max(200).optional(),
});
const industryDataShape = z.object({
  type: z.literal('INDUSTRY'),
  icon: iconNameSchema,
  color: industryColorSchema,
  /** Key from settings `industry-groups`. */
  group: keySchema,
  shortName: shortText(40),
  /** Plural noun for the businesses: "shops", "pharmacies". */
  shopNoun: shortText(40),
  romanUrduName: z.string().trim().max(60).optional(),
  appIndustryKey: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,47}$/).optional(),
  signupParam: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,47}$/).optional(),
});
const solutionDataShape = z.object({
  type: z.literal('SOLUTION'),
  icon: iconNameSchema,
  shortName: shortText(40),
  outcome: shortText(60),
  segment: z.string().trim().max(60).optional(),
  status: featureStatusSchema.default('live'),
});
const serviceDataShape = z.object({
  type: z.literal('SERVICE'),
  icon: iconNameSchema,
  shortName: shortText(40),
  areaServed: z.enum(['PK', 'worldwide']),
  pricingModel: z.string().trim().max(200).optional(),
  timeline: z.string().trim().max(200).optional(),
  status: featureStatusSchema.default('live'),
});
const integrationDataShape = z.object({
  type: z.literal('INTEGRATION'),
  logoMediaId: idSchema.optional(),
  icon: iconNameSchema.optional(),
  /** `coming` is always noindex. */
  status: featureStatusSchema,
  category: shortText(60),
  vendorUrl: httpUrlSchema.optional(),
  /** Required when status is "live". */
  verifiedAt: dateOrDateTimeSchema.optional(),
});
const complianceDataShape = z.object({
  type: z.literal('COMPLIANCE'),
  authority: z.enum(INDUSTRY_AUTHORITIES),
  sroRefs: z.array(shortText(120)).max(30).default([]),
  effectiveDate: dateOrDateTimeSchema.optional(),
  penaltySummary: z.string().trim().max(500).optional(),
});
const cityDataShape = z.object({
  type: z.literal('CITY'),
  name: shortText(60),
  province: z.enum(PROVINCES),
  authority: z.enum(CITY_AUTHORITIES),
  wikidataId: z.string().regex(WIKIDATA_ID_PATTERN, 'Wikidata id like Q11739'),
  geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
  servicesTax: z.object({ rate: shortText(40), appliesTo: shortText(300), source: sourceSchema }).optional(),
  tier1Note: z.string().trim().max(600).optional(),
  markets: z.array(z.object({ name: shortText(80), area: z.string().trim().max(80).optional(), note: z.string().trim().max(600) })).max(30).default([]),
  /** Rendered as H3s inside the hub; never URLs. */
  areas: z.array(z.object({ name: shortText(80), note: z.string().trim().max(600) })).max(40).default([]),
  support: z.object({ onsite: z.boolean(), note: z.string().trim().max(600) }).default({ onsite: false, note: '' }),
  /** CITY entry ids; 3 recommended. */
  nearbyCityIds: z.array(idSchema).max(8).default([]),
  staticMapMediaId: idSchema.optional(),
});
const cityIndustryDataShape = z.object({
  type: z.literal('CITY_INDUSTRY'),
  /** INDUSTRY entry id. The parent (entry.parentId) is the CITY. */
  industryId: idSchema,
  /** Case study id or a "5+ real customers" note. */
  evidence: shortText(1000),
});
const bestOfItemSchema = z.object({
  name: shortText(80),
  isNafaa: z.boolean(),
  url: httpUrlSchema.optional(),
  price: z.string().trim().max(120).optional(),
  /** Needed for a competitor price (COMPETITOR_UNDATED, checked by the API). */
  priceSource: sourceSchema.optional(),
  strengths: z.array(shortText(200)).max(12).default([]),
  weaknesses: z.array(shortText(200)).max(12).default([]),
  bestFor: shortText(200),
});
const bestOfDataShape = z.object({
  type: z.literal('BEST_OF'),
  category: shortText(80),
  methodology: mdSchema.min(1).max(20_000),
  items: z.array(bestOfItemSchema).min(2).max(20),
});
const compareShapeFields = {
  competitorName: shortText(80),
  competitorUrl: httpUrlSchema,
  verdict: inlineMdSchema.min(1).max(600),
  competitorPrice: z.string().trim().max(120).optional(),
  priceSource: sourceSchema.optional(),
};
const compareDataShape = z.object({ type: z.literal('COMPARE'), ...compareShapeFields });
const alternativeDataShape = z.object({ type: z.literal('ALTERNATIVE'), ...compareShapeFields });
const articleShapeFields = {
  toc: z.boolean().default(true),
  /** Computed by the API from the word count. */
  readingMinutes: z.number().int().min(1).max(600).optional(),
};
const blogPostDataShape = z.object({ type: z.literal('BLOG_POST'), ...articleShapeFields });
const guideDataShape = z.object({ type: z.literal('GUIDE'), ...articleShapeFields });
const blogCategoryDataShape = z.object({ type: z.literal('BLOG_CATEGORY'), icon: iconNameSchema.optional() });
const glossaryTermDataShape = z.object({
  type: z.literal('GLOSSARY_TERM'),
  term: shortText(80),
  /** One sentence. */
  definition: shortText(400),
  definitionRomanUrdu: shortText(400),
  example: mdSchema.max(5_000).optional(),
  alsoKnownAs: z.array(shortText(80)).max(12).default([]),
});
const toolDataShape = z.object({
  type: z.literal('TOOL'),
  toolKey: toolKeySchema,
  /** "GST", "Profit margin". */
  kind: shortText(40),
});
const templateDataShape = z.object({
  type: z.literal('TEMPLATE'),
  /** A DOCUMENT media id. */
  fileMediaId: idSchema,
  format: z.enum(TEMPLATE_FORMATS),
});
const caseStudyDataShape = z.object({
  type: z.literal('CASE_STUDY'),
  /** CmsCustomer id with CASE_STUDY consent. */
  customerId: idSchema,
  results: z.array(z.object({ label: shortText(80), value: shortText(80), sourceNote: shortText(300) })).max(12).default([]),
});
const personDataShape = z.object({
  type: z.literal('PERSON'),
  name: shortText(80),
  role: shortText(80),
  photoMediaId: idSchema.optional(),
  sameAs: z.array(httpUrlSchema).max(12).default([]),
  knowsAbout: z.array(shortText(80)).max(20).default([]),
});
const docDataShape = z.object({
  type: z.literal('DOC'),
  navTitle: z.string().trim().max(60).optional(),
  apiRef: z.object({ method: z.enum(HTTP_METHODS), path: z.string().regex(/^\/[A-Za-z0-9/{}:_.-]*$/).max(200) }).optional(),
});
const changelogDataShape = z.object({
  type: z.literal('CHANGELOG'),
  date: isoDateSchema,
  version: z.string().trim().max(40).optional(),
  kind: z.enum(CHANGELOG_KINDS),
});

const integrationDataSchema = integrationDataShape.superRefine((value, ctx) => {
  if (value.status === 'live' && !value.verifiedAt) {
    ctx.addIssue({ code: 'custom', path: ['verifiedAt'], message: 'A live integration needs verifiedAt' });
  }
});

/** Publish-shape `data` schema per type. */
export const ENTRY_DATA_SCHEMAS = {
  PAGE: pageDataShape,
  PRODUCT: productDataShape,
  INDUSTRY: industryDataShape,
  SOLUTION: solutionDataShape,
  SERVICE: serviceDataShape,
  INTEGRATION: integrationDataSchema,
  COMPLIANCE: complianceDataShape,
  CITY: cityDataShape,
  CITY_INDUSTRY: cityIndustryDataShape,
  BEST_OF: bestOfDataShape,
  COMPARE: compareDataShape,
  ALTERNATIVE: alternativeDataShape,
  BLOG_POST: blogPostDataShape,
  BLOG_CATEGORY: blogCategoryDataShape,
  GUIDE: guideDataShape,
  GLOSSARY_TERM: glossaryTermDataShape,
  TOOL: toolDataShape,
  TEMPLATE: templateDataShape,
  CASE_STUDY: caseStudyDataShape,
  PERSON: personDataShape,
  DOC: docDataShape,
  CHANGELOG: changelogDataShape,
} as const satisfies Record<CmsEntryType, z.ZodType>;

/** Draft `data` schema per type: every field optional except `type`. */
export const DRAFT_ENTRY_DATA_SCHEMAS = {
  PAGE: pageDataShape.partial().required({ type: true }),
  PRODUCT: productDataShape.partial().required({ type: true }),
  INDUSTRY: industryDataShape.partial().required({ type: true }),
  SOLUTION: solutionDataShape.partial().required({ type: true }),
  SERVICE: serviceDataShape.partial().required({ type: true }),
  INTEGRATION: integrationDataShape.partial().required({ type: true }),
  COMPLIANCE: complianceDataShape.partial().required({ type: true }),
  CITY: cityDataShape.partial().required({ type: true }),
  CITY_INDUSTRY: cityIndustryDataShape.partial().required({ type: true }),
  BEST_OF: bestOfDataShape.partial().required({ type: true }),
  COMPARE: compareDataShape.partial().required({ type: true }),
  ALTERNATIVE: alternativeDataShape.partial().required({ type: true }),
  BLOG_POST: blogPostDataShape.partial().required({ type: true }),
  BLOG_CATEGORY: blogCategoryDataShape.partial().required({ type: true }),
  GUIDE: guideDataShape.partial().required({ type: true }),
  GLOSSARY_TERM: glossaryTermDataShape.partial().required({ type: true }),
  TOOL: toolDataShape.partial().required({ type: true }),
  TEMPLATE: templateDataShape.partial().required({ type: true }),
  CASE_STUDY: caseStudyDataShape.partial().required({ type: true }),
  PERSON: personDataShape.partial().required({ type: true }),
  DOC: docDataShape.partial().required({ type: true }),
  CHANGELOG: changelogDataShape.partial().required({ type: true }),
} as const satisfies Record<CmsEntryType, z.ZodType>;

/** Any type's publish-shape data, discriminated by `type`. */
export const entryDataSchema = z.discriminatedUnion('type', [
  pageDataShape, productDataShape, industryDataShape, solutionDataShape, serviceDataShape, integrationDataSchema,
  complianceDataShape, cityDataShape, cityIndustryDataShape, bestOfDataShape, compareDataShape, alternativeDataShape,
  blogPostDataShape, blogCategoryDataShape, guideDataShape, glossaryTermDataShape, toolDataShape, templateDataShape,
  caseStudyDataShape, personDataShape, docDataShape, changelogDataShape,
]);
export type EntryData = z.infer<typeof entryDataSchema>;
export type EntryDataInput = z.input<typeof entryDataSchema>;
export type EntryDataOf<T extends CmsEntryType> = Extract<EntryData, { type: T }>;
export type DraftEntryDataOf<T extends CmsEntryType> = z.infer<(typeof DRAFT_ENTRY_DATA_SCHEMAS)[T]>;
export type DraftEntryData = { [T in CmsEntryType]: DraftEntryDataOf<T> }[CmsEntryType];
export type BestOfItem = z.infer<typeof bestOfItemSchema>;

/**
 * Validates stored `data` for an entry type. The stored JSON may lack `type`
 * (the column defaults to `{}`), so it is injected from the entry.
 */
export function parseEntryData<T extends CmsEntryType>(type: T, data: unknown, mode: 'publish'): z.ZodSafeParseResult<EntryDataOf<T>>;
export function parseEntryData<T extends CmsEntryType>(type: T, data: unknown, mode: 'draft'): z.ZodSafeParseResult<DraftEntryDataOf<T>>;
export function parseEntryData(type: CmsEntryType, data: unknown, mode: 'draft' | 'publish'): z.ZodSafeParseResult<unknown> {
  const base = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const schema: z.ZodType = mode === 'publish' ? ENTRY_DATA_SCHEMAS[type] : DRAFT_ENTRY_DATA_SCHEMAS[type];
  return schema.safeParse({ ...base, type });
}

/** Draft relations (`CmsEntry.relations`). MENTIONS is computed at publish. */
export const draftRelationSchema = z.object({
  entryId: idSchema,
  kind: z.enum(DRAFT_RELATION_KINDS),
  sortOrder: z.number().int().min(0),
});
export type DraftRelation = z.infer<typeof draftRelationSchema>;
export const draftRelationsSchema = z
  .array(draftRelationSchema)
  .max(200)
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    list.forEach((rel, i) => {
      const key = `${rel.kind}:${rel.entryId}`;
      if (seen.has(key)) ctx.addIssue({ code: 'custom', path: [i], message: `Duplicate ${rel.kind} relation to ${rel.entryId}` });
      seen.add(key);
    });
  });

// ═══════════════════════════════════════════════════════════════════════════
// 9. Menus (API-CONTRACT 5.2)
// ═══════════════════════════════════════════════════════════════════════════

export const MENU_KEYS = ['header', 'footer', 'legal', 'mobile'] as const;
export const menuKeySchema = z.enum(MENU_KEYS);
export type MenuKey = z.infer<typeof menuKeySchema>;
export const MENU_MAX_DEPTH = 3;
export const MENU_KINDS = ['entry', 'url', 'auto', 'group'] as const;

export interface MenuItemAuto {
  entryType: CmsEntryType;
  group?: string | undefined;
  featured?: boolean | undefined;
  limit: number;
  sort?: 'order' | 'title' | undefined;
}
export interface MenuItem {
  id: string;
  kind: (typeof MENU_KINDS)[number];
  /** Required for url and group; an entry item defaults to the entry's title. */
  label?: string | undefined;
  entryId?: string | undefined;
  /** Absolute URL or site path. */
  url?: string | undefined;
  auto?: MenuItemAuto | undefined;
  description?: string | undefined;
  icon?: IconName | undefined;
  children?: MenuItem[] | undefined;
}

const menuItemIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,32}$/, 'Invalid menu item id');
const menuItemAutoSchema = z.object({
  entryType: cmsEntryTypeSchema,
  group: keySchema.optional(),
  featured: z.boolean().optional(),
  limit: z.number().int().min(1).max(50),
  sort: z.enum(['order', 'title']).optional(),
});

export const menuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z
    .object({
      id: menuItemIdSchema,
      kind: z.enum(MENU_KINDS),
      label: z.string().trim().min(1).max(80).optional(),
      entryId: idSchema.optional(),
      url: hrefSchema.optional(),
      auto: menuItemAutoSchema.optional(),
      description: z.string().trim().max(160).optional(),
      icon: iconNameSchema.optional(),
      children: z.array(menuItemSchema).max(40).optional(),
    })
    .superRefine((item, ctx) => {
      if (item.kind === 'entry' && !item.entryId) ctx.addIssue({ code: 'custom', path: ['entryId'], message: 'Entry item needs an entry' });
      if (item.kind === 'url' && !item.url) ctx.addIssue({ code: 'custom', path: ['url'], message: 'URL item needs a url' });
      if (item.kind === 'auto' && !item.auto) ctx.addIssue({ code: 'custom', path: ['auto'], message: 'Auto item needs a list rule' });
      if ((item.kind === 'url' || item.kind === 'group') && !item.label) {
        ctx.addIssue({ code: 'custom', path: ['label'], message: 'Label is required' });
      }
    }),
);

function menuDepth(items: readonly MenuItem[]): number {
  let max = 0;
  for (const item of items) max = Math.max(max, 1 + (item.children ? menuDepth(item.children) : 0));
  return max;
}

export const menuItemsSchema = z
  .array(menuItemSchema)
  .max(60)
  .superRefine((items, ctx) => {
    if (menuDepth(items) > MENU_MAX_DEPTH) ctx.addIssue({ code: 'custom', message: `Menus can be at most ${MENU_MAX_DEPTH} levels deep` });
    const ids = new Set<string>();
    const walk = (list: readonly MenuItem[]): void => {
      for (const item of list) {
        if (ids.has(item.id)) ctx.addIssue({ code: 'custom', message: `Duplicate menu item id "${item.id}"` });
        ids.add(item.id);
        if (item.children) walk(item.children);
      }
    };
    walk(items);
  });

export interface MenuItemResolved {
  id: string;
  label: string;
  /** Site path (with locale prefix when needed) or external URL. */
  href: string;
  description?: string | undefined;
  icon?: string | undefined;
  external?: boolean | undefined;
  /** Groups, columns and auto lists expanded. */
  children?: MenuItemResolved[] | undefined;
}
export const menuItemResolvedSchema: z.ZodType<MenuItemResolved> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    href: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    external: z.boolean().optional(),
    children: z.array(menuItemResolvedSchema).optional(),
  }),
);

// ═══════════════════════════════════════════════════════════════════════════
// 10. Settings (API-CONTRACT 5.3)
// ═══════════════════════════════════════════════════════════════════════════

export const SETTING_KEYS = ['site', 'entity', 'pricing', 'seo', 'analytics', 'industry-groups'] as const;
export const settingKeySchema = z.enum(SETTING_KEYS);
export type SettingKey = z.infer<typeof settingKeySchema>;

export const SOCIAL_NETWORKS = ['facebook', 'instagram', 'linkedin', 'youtube', 'x', 'tiktok', 'playstore', 'appstore', 'other'] as const;

export const siteSettingsSchema = z.object({
  name: shortText(60),
  baseUrl: httpUrlSchema,
  appUrl: httpUrlSchema,
  signupUrl: httpUrlSchema,
  /** Site path of the demo page, e.g. "/demo". */
  demoPath: sitePathSchema,
  locales: z.array(localeSchema).min(1),
  /** `number` is international digits without "+", e.g. "92300…". */
  whatsapp: z.object({ number: z.string().regex(/^[1-9][0-9]{7,14}$/, 'Digits only, with country code'), message: z.string().max(500) }).nullable(),
  logoMediaId: idSchema.optional(),
  defaultOgMediaId: idSchema.optional(),
  /** Only `verified` links are used in sameAs and the footer. */
  social: z.array(z.object({ network: z.enum(SOCIAL_NETWORKS), url: httpUrlSchema, verified: z.boolean() })).max(20).default([]),
  footerNote: z.string().trim().max(300).optional(),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const officeSchema = z.object({
  label: shortText(80),
  street: shortText(200),
  city: shortText(80),
  region: shortText(80),
  postalCode: z.string().trim().max(20).optional(),
  country: z.literal('PK'),
  phone: z.string().trim().max(30).optional(),
  isHq: z.boolean(),
});
export type Office = z.infer<typeof officeSchema>;

export const entitySettingsSchema = z.object({
  brandName: shortText(60),
  legalName: z.string().trim().max(120).optional(),
  /** "Nafaa (nafaa.pk), Pakistani POS and business software; not NAFA Funds". */
  disambiguatingDescription: shortText(300),
  description: shortText(1000),
  /** YYYY, YYYY-MM or YYYY-MM-DD. */
  foundingDate: z.string().regex(/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/).optional(),
  /** PERSON entry ids. */
  founderIds: z.array(idSchema).max(10).default([]),
  /** Only real offices. */
  offices: z.array(officeSchema).max(20).default([]),
  contact: z.object({ email: z.email().optional(), phone: z.string().trim().max(30).optional() }).default({}),
  /** Exact statements used through `{{fact:compliance.<key>}}`. */
  compliance: z.record(keySchema, z.object({ text: shortText(200), evidenceRef: shortText(500) })).default({}),
  platforms: z.array(shortText(60)).max(20).default([]),
  languages: z.array(shortText(40)).max(20).default([]),
  sameAs: z.array(httpUrlSchema).max(30).default([]),
  wikidataId: z.string().regex(WIKIDATA_ID_PATTERN).optional(),
});
export type EntitySettings = z.infer<typeof entitySettingsSchema>;

export const pricingSettingsSchema = z.object({
  plans: z
    .record(
      planSlugSchema,
      z.object({
        tagline: z.string().trim().max(120).optional(),
        highlight: z.boolean().optional(),
        ctaLabel: z.string().trim().max(40).optional(),
        ctaHref: hrefSchema.optional(),
      }),
    )
    .default({}),
  featureLabels: z.partialRecord(planFeatureKeySchema, shortText(80)).default({}),
  notes: inlineMdSchema.optional(),
});
export type PricingSettings = z.infer<typeof pricingSettingsSchema>;

/**
 * Keys of `seo.titlePatterns`: an entry type, or "<TYPE>:<variant>" where the
 * variant comes from `titlePatternVariant` ("PAGE:home", "SERVICE:worldwide").
 */
export type TitlePatternKey = CmsEntryType | `${CmsEntryType}:${string}`;
export const TITLE_PATTERN_KEY_PATTERN = new RegExp(`^(?:${CMS_ENTRY_TYPES.join('|')})(?::[a-z0-9-]+)?$`);
export function isTitlePatternKey(key: string): key is TitlePatternKey {
  return TITLE_PATTERN_KEY_PATTERN.test(key);
}
/** `{title}`, `{year}`, `{minPrice}`, `{city}`, `{authority}`, `{data.<field>}`. */
export const TITLE_PATTERN_PLACEHOLDER_REGEX = /\{([a-zA-Z]+(?:\.[a-zA-Z]+)?)\}/g;
export const TITLE_PATTERN_PLACEHOLDERS = ['title', 'year', 'minPrice', 'city', 'authority'] as const;

export const qualityGateSchema = z.object({
  minWords: z.number().int().min(0).max(20_000),
  minFaqs: z.number().int().min(0).max(20).optional(),
  similarityMax: z.number().min(0).max(1).optional(),
});

const seoSettingsObject = z.object({
  /** "%s | Nafaa". */
  titleTemplate: z.string().trim().min(3).max(60).refine((v) => v.includes('%s'), 'Template must contain %s'),
  titlePatterns: z.record(z.string().regex(TITLE_PATTERN_KEY_PATTERN, 'Key: an entry type or TYPE:<variant>'), z.string().trim().min(1).max(120)).default({}),
  qualityGates: z.partialRecord(cmsEntryTypeSchema, qualityGateSchema).default({}),
  officialDomains: z.array(z.string().regex(/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/, 'Domain like fbr.gov.pk')).max(100).default([]),
  /** IndexNow key (8-128 chars of a-z, A-Z, 0-9, -). */
  indexNowKey: z.string().regex(/^[A-Za-z0-9-]{8,128}$/).optional(),
});
export const seoSettingsSchema = seoSettingsObject;
export type SeoSettings = Omit<z.infer<typeof seoSettingsObject>, 'titlePatterns'> & {
  titlePatterns: Partial<Record<TitlePatternKey, string>>;
};

export const analyticsSettingsSchema = z.object({
  gtmId: z.string().regex(/^GTM-[A-Z0-9]{4,12}$/, 'GTM id like GTM-XXXXXXX').optional(),
  clarityId: z.string().regex(/^[a-z0-9]{6,20}$/).optional(),
  /** Share of sessions recorded by Clarity, 0-1 (0.1 = 10%). */
  claritySample: z.number().min(0).max(1).default(0.1),
  /** Allows `platform.*` stats metrics (owner decision O9). */
  allowPlatformStats: z.boolean().default(false),
});
export type AnalyticsSettings = z.infer<typeof analyticsSettingsSchema>;

export const industryGroupsSchema = z
  .array(z.object({ key: keySchema, label: shortText(60), sortOrder: z.number().int() }))
  .max(40)
  .superRefine((list, ctx) => {
    const keys = new Set<string>();
    list.forEach((g, i) => {
      if (keys.has(g.key)) ctx.addIssue({ code: 'custom', path: [i, 'key'], message: `Duplicate group "${g.key}"` });
      keys.add(g.key);
    });
  });
export type IndustryGroups = z.infer<typeof industryGroupsSchema>;

export const SETTINGS_SCHEMAS = {
  site: siteSettingsSchema,
  entity: entitySettingsSchema,
  pricing: pricingSettingsSchema,
  seo: seoSettingsSchema,
  analytics: analyticsSettingsSchema,
  'industry-groups': industryGroupsSchema,
} as const satisfies Record<SettingKey, z.ZodType>;

export interface SettingsBundle {
  site: SiteSettings | null;
  entity: EntitySettings | null;
  pricing: PricingSettings | null;
  seo: SeoSettings | null;
  analytics: AnalyticsSettings | null;
  industryGroups: IndustryGroups | null;
}

/**
 * Default title patterns (ARCH 8). The home pattern does not say "Free Plan":
 * the Rs 0 plan is a 7-day free trial (owner decision O1).
 */
export const DEFAULT_TITLE_PATTERNS: Partial<Record<TitlePatternKey, string>> = {
  'PAGE:home': 'Nafaa: POS & Business Software for Pakistan',
  'PAGE:pricing': 'POS Software Price in Pakistan: Plans from {minPrice}',
  PAGE: '{title}',
  PRODUCT: '{title} Software in Pakistan: {data.benefit}',
  INTEGRATION: '{title} Software in Pakistan: {data.benefit}',
  INDUSTRY: '{title} Software in Pakistan: POS, Stock & Khata',
  SOLUTION: '{title} Software in Pakistan: {data.outcome}',
  SERVICE: '{title} in Pakistan',
  'SERVICE:worldwide': '{title} for Businesses Worldwide',
  CITY: 'POS Software in {title}: Billing, Stock & {data.authority} Tax',
  CITY_INDUSTRY: '{title}',
  COMPLIANCE: '{data.authority} POS Integration: Who Must Comply & How ({year})',
  BEST_OF: 'Best {data.category} Software in Pakistan ({year}): {data.count} Compared',
  COMPARE: 'Nafaa vs {data.competitorName}: Features, Price & Which to Choose',
  ALTERNATIVE: 'Best {data.competitorName} Alternative in Pakistan ({year})',
  BLOG_POST: '{title}',
  BLOG_CATEGORY: '{title}',
  GUIDE: '{title}',
  CASE_STUDY: '{title}',
  TEMPLATE: '{title}',
  CHANGELOG: '{title}',
  GLOSSARY_TERM: 'What is {data.term}? Meaning in Urdu & Business Use',
  TOOL: '{title} Pakistan: Free {data.kind} Calculator',
  PERSON: '{title}, {data.role} at Nafaa',
  DOC: '{title} | Nafaa API Docs',
};
/** @deprecated Use the `SERVICE:worldwide` key of DEFAULT_TITLE_PATTERNS. */
export const SERVICE_WORLDWIDE_TITLE_PATTERN = '{title} for Businesses Worldwide';

export const DEFAULT_OFFICIAL_DOMAINS = ['fbr.gov.pk', 'pra.punjab.gov.pk', 'srb.gos.pk', 'kpra.kp.gov.pk', 'bra.gob.pk'] as const;

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  titleTemplate: '%s | Nafaa',
  titlePatterns: DEFAULT_TITLE_PATTERNS,
  qualityGates: DEFAULT_QUALITY_GATES,
  officialDomains: [...DEFAULT_OFFICIAL_DOMAINS],
};
export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettings = { claritySample: 0.1, allowPlatformStats: false };

/** Title pattern variant of an entry: the PAGE template, or "worldwide" for a worldwide SERVICE. */
export function titlePatternVariant(type: CmsEntryType, data: unknown): string | undefined {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  if (type === 'PAGE') return typeof d.template === 'string' ? d.template : 'default';
  if (type === 'SERVICE' && d.areaServed === 'worldwide') return 'worldwide';
  return undefined;
}

/**
 * Picks the title pattern for an entry: "<TYPE>:<variant>" first (settings,
 * then defaults), then the type. `variant` is the PAGE template or a value
 * from `titlePatternVariant`.
 */
export function titlePatternFor(
  patterns: Partial<Record<TitlePatternKey, string>>,
  type: CmsEntryType,
  variant?: string,
): string {
  if (variant) {
    const key = `${type}:${variant}` as TitlePatternKey;
    const specific = patterns[key] ?? DEFAULT_TITLE_PATTERNS[key];
    if (specific) return specific;
  }
  return patterns[type] ?? DEFAULT_TITLE_PATTERNS[type] ?? '{title}';
}

/** True when a pattern already holds the brand, so the site skips the "| Nafaa" template. */
export function patternIncludesBrand(pattern: string, brandName = 'Nafaa'): boolean {
  return pattern.toLowerCase().includes(brandName.toLowerCase());
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. Public read API DTOs (API-CONTRACT 2)
// ═══════════════════════════════════════════════════════════════════════════

export const publicMediaSchema = z.object({
  id: z.string(),
  kind: cmsMediaKindSchema,
  publicId: z.string(),
  url: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  /** Alt in the requested locale, falling back to en. */
  alt: z.string(),
  caption: z.string().optional(),
  credit: z.string().optional(),
  sourceUrl: z.string().optional(),
  blurDataUrl: z.string().optional(),
  dominantColor: z.string().optional(),
  /** Focal point as a 0-1 fraction of width and height. */
  focalX: z.number().optional(),
  focalY: z.number().optional(),
  mimeType: z.string(),
  bytes: z.number().int(),
});
export type PublicMedia = z.infer<typeof publicMediaSchema>;

export const entryCardSchema = z.object({
  id: z.string(),
  type: cmsEntryTypeSchema,
  locale: z.string(),
  path: z.string(),
  url: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  image: publicMediaSchema.nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
  group: z.string().optional(),
  shortName: z.string().optional(),
  /** Feature status for PRODUCT, SOLUTION, SERVICE, INTEGRATION; absent elsewhere. */
  status: featureStatusSchema.optional(),
  contentUpdatedAt: z.string().nullable(),
});
export type EntryCard = z.infer<typeof entryCardSchema>;

export const personCardSchema = entryCardSchema.extend({
  role: z.string().optional(),
  photo: publicMediaSchema.nullable(),
  sameAs: z.array(z.string()),
});
export type PersonCard = z.infer<typeof personCardSchema>;

export const publicRobotsSchema = z.object({ index: z.boolean(), follow: z.boolean(), reason: robotsReasonSchema.optional() });
export type PublicRobots = z.infer<typeof publicRobotsSchema>;

export const publicSeoSchema = z.object({
  /** Final <title> text without the "| Nafaa" suffix; the site applies the template. */
  title: z.string(),
  /** True for Home and Compare patterns, so the site uses `absolute`. */
  titleIncludesBrand: z.boolean(),
  description: z.string(),
  /** Absolute. */
  canonical: z.string(),
  robots: publicRobotsSchema,
  /** null → the site generates the OG card. */
  ogImage: publicMediaSchema.nullable(),
  /** Extra JSON-LD nodes. */
  schemaExtra: z.array(z.record(z.string(), z.unknown())),
});
export type PublicSeo = z.infer<typeof publicSeoSchema>;

export const publicFaqSchema = z.object({
  id: z.string(),
  question: z.string(),
  /** Markdown, tokens resolved. */
  answer: z.string(),
  topic: z.string().nullable(),
});
export type PublicFaq = z.infer<typeof publicFaqSchema>;

export const breadcrumbSchema = z.object({ name: z.string(), path: z.string(), url: z.string() });
export type Breadcrumb = z.infer<typeof breadcrumbSchema>;

export const alternateSchema = z.object({ locale: z.string(), path: z.string(), url: z.string() });

export const publicEntrySchema = z.object({
  id: z.string(),
  type: cmsEntryTypeSchema,
  locale: z.string(),
  path: z.string(),
  url: z.string(),
  preview: z.literal(true).optional(),
  title: z.string(),
  summary: z.string().nullable(),
  /** Tokens and entry: links resolved; hidden blocks removed. */
  blocks: z.array(blockSchema),
  /** Tokens resolved. */
  data: entryDataSchema,
  seo: publicSeoSchema,
  image: publicMediaSchema.nullable(),
  author: personCardSchema.nullable(),
  reviewer: personCardSchema.nullable(),
  factCheckedAt: z.string().nullable(),
  /** firstPublishedAt. */
  datePublished: z.string().nullable(),
  /** contentUpdatedAt ?? publishedAt. */
  dateModified: z.string().nullable(),
  /** Home first, this page last. */
  breadcrumbs: z.array(breadcrumbSchema),
  parent: entryCardSchema.nullable(),
  /** DOC tree and PAGE children only; empty otherwise. */
  children: z.array(entryCardSchema),
  /** TAG relations grouped by target type. */
  tags: z.partialRecord(cmsEntryTypeSchema, z.array(entryCardSchema)),
  /** RELATED relations in order. */
  related: z.array(entryCardSchema),
  /** CmsEntryFaq order. */
  faqs: z.array(publicFaqSchema),
  /** Published translations, including self. */
  alternates: z.array(alternateSchema),
  /** Every media id referenced by blocks or data. */
  media: z.record(z.string(), publicMediaSchema),
  quality: z.object({ wordCount: z.number().int(), gate: z.number().int().nullable(), passed: z.boolean() }),
});
export type PublicEntry = z.infer<typeof publicEntrySchema>;

export const publicLayoutSchema = z.object({
  locale: z.string(),
  menus: z.object({
    header: z.array(menuItemResolvedSchema),
    footer: z.array(menuItemResolvedSchema),
    legal: z.array(menuItemResolvedSchema),
    mobile: z.array(menuItemResolvedSchema),
  }),
  site: siteSettingsSchema,
  updatedAt: z.string(),
});
export type PublicLayout = z.infer<typeof publicLayoutSchema>;

export const publicPlanSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  priceMonthly: z.number(),
  priceQuarterly: z.number(),
  priceYearly: z.number(),
  currency: z.literal('PKR'),
  trialDays: z.number().int(),
  sortOrder: z.number().int(),
  limits: z.object({ maxProducts: z.number().int(), maxUsers: z.number().int(), maxShops: z.number().int(), maxSalesPerMonth: z.number().int() }),
  /** Labels from settings `pricing.featureLabels`. */
  features: z.array(z.object({ key: planFeatureKeySchema, label: z.string(), included: z.boolean() })),
  display: z.object({
    tagline: z.string().optional(),
    highlight: z.boolean(),
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
  }),
});
export type PublicPlan = z.infer<typeof publicPlanSchema>;

export const publicEntitySchema = entitySettingsSchema.extend({
  counts: z.object({
    industries: z.number().int(),
    cities: z.number().int(),
    integrationsLive: z.number().int(),
    glossaryTerms: z.number().int(),
    posts: z.number().int(),
  }),
  plans: z.array(z.object({ slug: z.string(), name: z.string(), priceMonthly: z.number() })),
  minPaidMonthly: z.number().nullable(),
  generatedAt: z.string(),
});
export type PublicEntity = z.infer<typeof publicEntitySchema>;

export const publicTestimonialSchema = z.object({
  id: z.string(),
  quote: z.string(),
  personName: z.string(),
  personRole: z.string().nullable(),
  photo: publicMediaSchema.nullable(),
  sourceType: z.string(),
  sourceUrl: z.string().nullable(),
  collectedAt: z.string().nullable(),
  customer: z.object({
    name: z.string(),
    city: z.string().nullable(),
    industry: z.string().nullable(),
    logo: publicMediaSchema.nullable(),
    caseStudyPath: z.string().nullable(),
  }),
});
export type PublicTestimonial = z.infer<typeof publicTestimonialSchema>;

export const publicCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: publicMediaSchema,
  website: z.string().nullable(),
  city: z.string().nullable(),
  industry: z.string().nullable(),
});
export type PublicCustomer = z.infer<typeof publicCustomerSchema>;

export const publicRedirectSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string().nullable(),
  status: redirectStatusSchema,
  pattern: z.boolean(),
});
export type PublicRedirect = z.infer<typeof publicRedirectSchema>;

export const sitemapItemSchema = z.object({
  url: z.string(),
  lastmod: z.string(),
  images: z.array(z.object({ url: z.string(), title: z.string().optional() })),
  alternates: z.array(z.object({ hreflang: z.string(), url: z.string() })),
});
export type SitemapItem = z.infer<typeof sitemapItemSchema>;

export const llmsPayloadSchema = z.object({
  entity: publicEntitySchema,
  sections: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      items: z.array(z.object({ title: z.string(), url: z.string(), summary: z.string().nullable() })),
    }),
  ),
  topFaqs: z.array(publicFaqSchema),
  /** Money pages, for llms-full.txt. */
  full: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      summary: z.string().nullable(),
      keyFacts: z.array(z.object({ label: z.string(), value: z.string() })),
      faqs: z.array(publicFaqSchema),
    }),
  ),
  generatedAt: z.string(),
});
export type LlmsPayload = z.infer<typeof llmsPayloadSchema>;

// ─── Endpoint responses ───

export const publicEntriesResponseSchema = z.object({ items: z.array(entryCardSchema), nextCursor: z.string().nullable() });
export type PublicEntriesResponse = z.infer<typeof publicEntriesResponseSchema>;

export const publicPathsResponseSchema = z.object({
  items: z.array(z.object({ type: cmsEntryTypeSchema, path: z.string(), locale: z.string(), updatedAt: z.string() })),
});
export type PublicPathsResponse = z.infer<typeof publicPathsResponseSchema>;

export const publicFaqsResponseSchema = z.object({
  topics: z.array(z.object({ key: z.string(), label: z.string(), faqs: z.array(publicFaqSchema) })),
});
export type PublicFaqsResponse = z.infer<typeof publicFaqsResponseSchema>;

export const statValueSchema = z.object({ value: z.number(), formatted: z.string(), asOf: z.string() });
export type StatValue = z.infer<typeof statValueSchema>;
/** Only the requested (and allowed) metrics are present. */
export const publicStatsResponseSchema = z.partialRecord(statMetricSchema, statValueSchema);
export type PublicStatsResponse = z.infer<typeof publicStatsResponseSchema>;

export const publicRedirectsResponseSchema = z.object({ rules: z.array(publicRedirectSchema), updatedAt: z.string() });
export type PublicRedirectsResponse = z.infer<typeof publicRedirectsResponseSchema>;

export const publicSitemapResponseSchema = z.object({ items: z.array(sitemapItemSchema) });
export type PublicSitemapResponse = z.infer<typeof publicSitemapResponseSchema>;

export const searchIndexResponseSchema = z.object({
  items: z.array(z.object({ title: z.string(), path: z.string(), type: cmsEntryTypeSchema, summary: z.string().optional() })),
});
export type SearchIndexResponse = z.infer<typeof searchIndexResponseSchema>;

/** GET /public/site/preview without `path`. */
export const previewValidationSchema = z.object({
  valid: z.literal(true),
  entryId: z.string(),
  path: z.string(),
  expiresAt: z.string(),
});
export type PreviewValidation = z.infer<typeof previewValidationSchema>;

// ─── Public query schemas (query strings arrive as strings) ───

const commaList = <T extends z.ZodType<unknown, string>>(item: T, max: number) =>
  z
    .string()
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(item).max(max));

export const publicEntryQuerySchema = z.object({ path: sitePathSchema, locale: localeSchema.default(DEFAULT_LOCALE) });
export const publicEntriesQuerySchema = z.object({
  type: cmsEntryTypeSchema,
  locale: localeSchema.default(DEFAULT_LOCALE),
  tag: idSchema.optional(),
  group: keySchema.optional(),
  featured: z.stringbool().optional(),
  parentId: idSchema.optional(),
  /** Comma list of feature statuses, e.g. "coming,beta" (roadmap). */
  status: commaList(featureStatusSchema, 3).optional(),
  sort: entrySortSchema.default('order'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().max(200).optional(),
});
export const publicPathsQuerySchema = z.object({ type: cmsEntryTypeSchema.optional(), locale: localeSchema.default(DEFAULT_LOCALE) });
export const publicLocaleQuerySchema = z.object({ locale: localeSchema.default(DEFAULT_LOCALE) });
export const publicFaqsQuerySchema = z.object({ locale: localeSchema.default(DEFAULT_LOCALE), topic: keySchema.optional() });
export const publicTestimonialsQuerySchema = z.object({
  locale: localeSchema.default(DEFAULT_LOCALE),
  ids: commaList(idSchema, BLOCK_LIMITS.pickIdsMax).optional(),
  industry: idSchema.optional(),
  city: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(BLOCK_LIMITS.testimonialLimitMax).optional(),
});
export const publicCustomersQuerySchema = z.object({
  ids: commaList(idSchema, BLOCK_LIMITS.pickIdsMax).optional(),
  industry: idSchema.optional(),
  city: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(BLOCK_LIMITS.logoLimitMax).optional(),
});
export const publicStatsQuerySchema = z.object({ metrics: commaList(statMetricSchema, STAT_METRICS.length) });
export const publicSitemapQuerySchema = z.object({ section: sitemapSectionSchema, locale: localeSchema.default(DEFAULT_LOCALE) });
export const publicPreviewQuerySchema = z.object({ token: z.string().min(10).max(4096), path: sitePathSchema.optional() });
export const redirectHitBodySchema = z.object({ id: idSchema });

// ═══════════════════════════════════════════════════════════════════════════
// 12. Cache tags, public endpoints, revalidation, preview (API-CONTRACT 2.2, 6, 7)
// ═══════════════════════════════════════════════════════════════════════════

export const cacheTags = {
  all: 'all',
  settings: 'settings',
  plans: 'plans',
  customers: 'customers',
  redirects: 'redirects',
  sitemap: 'sitemap',
  llms: 'llms',
  page: (locale: string, path: string) => `page:${locale}:${path}`,
  type: (locale: string, type: CmsEntryType) => `type:${locale}:${type}`,
  layout: (locale: string) => `layout:${locale}`,
  faq: (locale: string) => `faq:${locale}`,
} as const;

/** GET endpoints under /public/site (paths relative to the API base URL). */
export const PUBLIC_SITE_ENDPOINTS = {
  entry: '/public/site/entry',
  entries: '/public/site/entries',
  paths: '/public/site/paths',
  layout: '/public/site/layout',
  entity: '/public/site/entity',
  plans: '/public/site/plans',
  faqs: '/public/site/faqs',
  testimonials: '/public/site/testimonials',
  customers: '/public/site/customers',
  stats: '/public/site/stats',
  redirects: '/public/site/redirects',
  redirectHit: '/public/site/redirects/hit',
  sitemap: '/public/site/sitemap',
  llms: '/public/site/llms',
  searchIndex: '/public/site/search-index',
  preview: '/public/site/preview',
} as const;
export type PublicSiteEndpoint = keyof typeof PUBLIC_SITE_ENDPOINTS;

export interface FetchCachePolicy { tags: string[]; revalidate: number }

/**
 * Tags and fallback revalidate time the site attaches to each fetch
 * (API-CONTRACT 2.2). Returns null for preview (fetch with `cache: 'no-store'`)
 * and for the hit POST.
 */
export function publicFetchCache(
  endpoint: PublicSiteEndpoint,
  params: { locale?: string; path?: string; type?: CmsEntryType } = {},
): FetchCachePolicy | null {
  const locale = params.locale ?? DEFAULT_LOCALE;
  const policy = (tags: string[], revalidate: number): FetchCachePolicy => ({ tags: [cacheTags.all, ...tags], revalidate });
  switch (endpoint) {
    case 'entry':
      return policy([cacheTags.page(locale, params.path ?? '/')], 86400);
    case 'entries':
      return policy(params.type ? [cacheTags.type(locale, params.type)] : [], 86400);
    case 'paths':
    case 'sitemap':
    case 'searchIndex':
      return policy([cacheTags.sitemap], 86400);
    case 'layout':
      return policy([cacheTags.layout(locale)], 86400);
    case 'entity':
      return policy([cacheTags.settings, cacheTags.plans], 3600);
    case 'plans':
      return policy([cacheTags.plans], 3600);
    case 'faqs':
      return policy([cacheTags.faq(locale)], 86400);
    case 'testimonials':
    case 'customers':
      return policy([cacheTags.customers], 86400);
    case 'stats':
      return policy(
        [cacheTags.plans, cacheTags.type(locale, 'INDUSTRY'), cacheTags.type(locale, 'CITY'), cacheTags.type(locale, 'INTEGRATION')],
        3600,
      );
    case 'redirects':
      return policy([cacheTags.redirects], 3600);
    case 'llms':
      return policy([cacheTags.llms, cacheTags.plans, cacheTags.settings], 86400);
    case 'preview':
    case 'redirectHit':
      return null;
  }
}

export const REVALIDATE_REASONS = [
  'publish', 'unpublish', 'schedule', 'faq', 'menu', 'settings', 'redirects', 'media', 'plans', 'customers', 'manual',
] as const;
export type RevalidateReason = (typeof REVALIDATE_REASONS)[number];

export const REVALIDATION = {
  path: '/api/revalidate',
  timestampHeader: 'X-Nafaa-Timestamp',
  signatureHeader: 'X-Nafaa-Signature',
  signaturePrefix: 'sha256=',
  /** Allowed clock skew in seconds. */
  maxSkewSeconds: 300,
  maxTagLength: 256,
  /** Above this many tags the site revalidates `all` only. */
  maxTags: 200,
  timeoutMs: 5000,
  retryDelaysMs: [1000, 5000, 30000],
} as const;

export const revalidateRequestSchema = z.object({
  tags: z.array(z.string().min(1).max(REVALIDATION.maxTagLength)).min(1),
  reason: z.enum(REVALIDATE_REASONS),
  entryId: z.string().optional(),
  revisionId: z.string().optional(),
});
export type RevalidateRequest = z.infer<typeof revalidateRequestSchema>;
export interface RevalidateResponse { ok: true; revalidated: number; at: string }

/** The exact string signed with HMAC-SHA256: `${timestamp}.${rawBody}`. */
export function revalidationSigningInput(timestamp: number | string, rawBody: string): string {
  return `${timestamp}.${rawBody}`;
}

export const PREVIEW = {
  cookieName: 'nafaa_preview',
  tokenScope: 'cms-preview',
  defaultHours: 168,
  minHours: 1,
  maxHours: 336,
  sitePreviewPath: '/api/preview',
  siteExitPath: '/api/exit-preview',
} as const;
export interface PreviewTokenClaims { sub: string; scope: typeof PREVIEW.tokenScope; exp: number }

// ═══════════════════════════════════════════════════════════════════════════
// 13. Admin API (API-CONTRACT 8): issues, entries, revisions, FAQs, media,
//     redirects, menus, settings, customers, dashboard, config
// ═══════════════════════════════════════════════════════════════════════════

export const CMS_PERMISSIONS = {
  CMS_VIEW: 'marketing.cms.view',
  CMS_EDIT: 'marketing.cms.edit',
  CMS_PUBLISH: 'marketing.cms.publish',
  CMS_REDIRECTS: 'marketing.cms.redirects',
  CMS_SETTINGS: 'marketing.cms.settings',
} as const;
export type CmsPermission = (typeof CMS_PERMISSIONS)[keyof typeof CMS_PERMISSIONS];

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}
export const paginationQueryShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(30),
};
export const paginationQuerySchema = z.object(paginationQueryShape);

// ─── Issues ───

export const ISSUE_CODES = [
  'MISSING_TITLE', 'MISSING_SUMMARY', 'MISSING_DATA', 'INVALID_BLOCK', 'BLOCK_NOT_ALLOWED', 'HERO_NOT_FIRST',
  'HEADING_LEVEL', 'UNKNOWN_TOKEN', 'UNKNOWN_ICON', 'BROKEN_LINK', 'DUPLICATE_TITLE', 'DUPLICATE_PATH',
  'TITLE_LENGTH', 'DESCRIPTION_LENGTH', 'FOCUS_KEYWORD', 'WORDS_BELOW_GATE', 'SIMILARITY', 'FAQ_COUNT',
  'FAQ_ANSWER_LENGTH', 'SUMMARY_LENGTH', 'FEW_INTERNAL_LINKS', 'REQUIRED_LINK', 'ORPHAN', 'NO_SOURCE',
  'NOT_FACT_CHECKED', 'COMPETITOR_UNDATED', 'NO_CONSENT', 'TYPED_PRICE', 'STALE', 'NO_OG_IMAGE', 'MEDIA_ALT',
  'INVALID_DATA', 'MEDIA_MISSING',
] as const;
export const issueCodeSchema = z.enum(ISSUE_CODES);
export type IssueCode = z.infer<typeof issueCodeSchema>;

/** Codes that block publish. Everything else is a warning (gate and similarity force noindex). */
export const HARD_ERROR_CODES = [
  'MISSING_TITLE', 'MISSING_SUMMARY', 'MISSING_DATA', 'INVALID_BLOCK', 'BLOCK_NOT_ALLOWED', 'HERO_NOT_FIRST',
  'HEADING_LEVEL', 'UNKNOWN_TOKEN', 'UNKNOWN_ICON', 'BROKEN_LINK', 'DUPLICATE_TITLE', 'DUPLICATE_PATH',
  'NO_SOURCE', 'NOT_FACT_CHECKED', 'COMPETITOR_UNDATED', 'NO_CONSENT', 'INVALID_DATA', 'MEDIA_MISSING',
] as const satisfies readonly IssueCode[];
/** Warnings that force noindex instead of blocking. */
export const NOINDEX_ISSUE_CODES = ['WORDS_BELOW_GATE', 'SIMILARITY'] as const satisfies readonly IssueCode[];

export function isHardError(code: IssueCode): boolean {
  return (HARD_ERROR_CODES as readonly string[]).includes(code);
}

export const ISSUE_SEVERITIES = ['error', 'warning', 'pass'] as const;
export const issueSchema = z.object({
  code: issueCodeSchema,
  severity: z.enum(ISSUE_SEVERITIES),
  /** e.g. "seoTitle", "blocks[3].caption", "data.wikidataId". */
  field: z.string().optional(),
  blockId: z.string().optional(),
  /** Roman Urdu with English terms; the admin shows it as is. */
  message: z.string(),
});
export type Issue = z.infer<typeof issueSchema>;

export interface SeoReport {
  score: number;
  issues: Issue[];
  finalTitle: string;
  finalDescription: string;
  robots: PublicRobots;
  gate: { words: number; required: number | null; similarity?: number };
}

/** Formats a zod issue path the way `Issue.field` expects: `blocks[3].caption`. */
export function formatIssuePath(path: readonly PropertyKey[], prefix?: string): string {
  let out = prefix ?? '';
  for (const part of path) {
    if (typeof part === 'number') out += `[${part}]`;
    else out += out === '' ? String(part) : `.${String(part)}`;
  }
  return out;
}

function valueAtPath(root: unknown, path: readonly PropertyKey[]): unknown {
  let cur: unknown = root;
  for (const key of path) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<PropertyKey, unknown>)[key];
  }
  return cur;
}

/**
 * Turns a failed parse of `blocks` or `data` into publish issues.
 * - `blocks`: INVALID_BLOCK, or UNKNOWN_ICON when the bad value is an icon.
 * - `data`: MISSING_DATA when the value is absent or empty, INVALID_DATA when
 *   it is present but wrong (needs `input`, the parsed value; without it
 *   every data issue is MISSING_DATA), or UNKNOWN_ICON for icon fields.
 */
export function zodErrorToIssues(
  error: z.ZodError,
  target: 'blocks' | 'data',
  blocks?: readonly { id?: unknown }[],
  input?: unknown,
): Issue[] {
  return error.issues.map((zi) => {
    const last = zi.path[zi.path.length - 1];
    const isIcon = last === 'icon';
    const field = formatIssuePath(zi.path, target);
    let dataCode: IssueCode = 'MISSING_DATA';
    if (input !== undefined) {
      const v = valueAtPath(input, zi.path);
      const absent = v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
      if (!absent) dataCode = 'INVALID_DATA';
    }
    let blockId: string | undefined;
    if (target === 'blocks' && typeof zi.path[0] === 'number' && blocks) {
      const id = blocks[zi.path[0]]?.id;
      if (typeof id === 'string') blockId = id;
    }
    const code: IssueCode = isIcon ? 'UNKNOWN_ICON' : target === 'blocks' ? 'INVALID_BLOCK' : dataCode;
    const label = target === 'blocks' ? 'Block' : 'Data';
    return {
      code,
      severity: 'error' as const,
      field,
      ...(blockId ? { blockId } : {}),
      message: `${label} theek nahi (${field}): ${zi.message}`,
    };
  });
}

/**
 * Structural block checks shared by the admin and the API: blocks allowed for
 * the type, hero first and single, at most one faq block.
 */
export function blockStructureIssues(entryType: CmsEntryType, blocks: readonly { id: string; type: string; hidden?: boolean | undefined }[]): Issue[] {
  const issues: Issue[] = [];
  const allowed = ALLOWED_BLOCKS[entryType] as readonly string[];
  let heroCount = 0;
  let faqCount = 0;
  blocks.forEach((block, i) => {
    if (block.hidden) return;
    if (!allowed.includes(block.type)) {
      issues.push({ code: 'BLOCK_NOT_ALLOWED', severity: 'error', field: `blocks[${i}]`, blockId: block.id, message: `"${block.type}" block ${ENTRY_TYPE_META[entryType].label} par allowed nahi` });
    }
    if (block.type === 'hero') {
      heroCount += 1;
      const firstVisible = blocks.findIndex((b) => !b.hidden);
      if (i !== firstVisible || heroCount > 1) {
        issues.push({ code: 'HERO_NOT_FIRST', severity: 'error', field: `blocks[${i}]`, blockId: block.id, message: 'Hero sirf ek ho sakta hai aur sab se pehle hona chahiye' });
      }
    }
    if (block.type === 'faq') {
      faqCount += 1;
      if (faqCount > 1) {
        issues.push({ code: 'INVALID_BLOCK', severity: 'error', field: `blocks[${i}]`, blockId: block.id, message: 'FAQ block sirf ek ho sakta hai' });
      }
    }
  });
  return issues;
}

// ─── Entries ───

export interface AdminEntryRef { id: string; type: CmsEntryType; title: string; path: string; status: CmsStatus }

export interface AdminEntry {
  id: string; type: CmsEntryType; locale: string; translationKey: string | null;
  slug: string; path: string; parentId: string | null; status: CmsStatus;
  title: string; summary: string | null;
  /** Draft blocks; may be incomplete (see draftBlockSchema). */
  blocks: DraftBlock[];
  /** Draft data; may be incomplete (see DRAFT_ENTRY_DATA_SCHEMAS). */
  data: DraftEntryData;
  relations: DraftRelation[];
  faqIds: string[]; imageId: string | null;
  seoTitle: string | null; seoDescription: string | null; focusKeyword: string | null;
  canonicalUrl: string | null; noindex: boolean; nofollow: boolean; ogImageId: string | null; schemaExtra: Record<string, unknown>[] | null;
  seoScore: number | null; wordCount: number;
  authorId: string | null; reviewerId: string | null; factCheckedAt: string | null; factCheckedById: string | null;
  publishedPath: string | null; publishedAt: string | null; firstPublishedAt: string | null;
  contentUpdatedAt: string | null; publishAt: string | null; hasUnpublishedChanges: boolean;
  sortOrder: number; featured: boolean; version: number;
  createdById: string | null; updatedById: string | null; createdAt: string; updatedAt: string;
  /** Every entry id used in relations, blocks, data and links. */
  refs: Record<string, AdminEntryRef>;
  mediaRefs: Record<string, PublicMedia>;
  /** Absolute, when published. */
  liveUrl: string | null;
}

export interface AdminEntryListItem {
  id: string; type: CmsEntryType; locale: string; title: string; path: string; status: CmsStatus;
  hasUnpublishedChanges: boolean; noindexReason: RobotsReason | null;
  seoScore: number | null; wordCount: number; publishAt: string | null; publishedAt: string | null;
  updatedAt: string; authorName: string | null;
}

export const adminEntriesQuerySchema = z.object({
  type: cmsEntryTypeSchema.optional(),
  status: cmsStatusSchema.optional(),
  locale: localeSchema.optional(),
  q: z.string().trim().max(200).optional(),
  tag: idSchema.optional(),
  group: keySchema.optional(),
  gate: z.enum(['below', 'passed']).optional(),
  sort: z.enum(['updated', 'title', 'score']).default('updated'),
  ...paginationQueryShape,
});
export type AdminEntriesQuery = z.infer<typeof adminEntriesQuerySchema>;

export const entryLookupQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  types: commaList(cmsEntryTypeSchema, CMS_ENTRY_TYPES.length).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  locale: localeSchema.optional(),
});
export type EntryLookupItem = AdminEntryRef;

export const titleSchema = shortText(200);
export const summarySchema = z.string().trim().max(1_000);

export const createEntryBodySchema = z.object({
  type: cmsEntryTypeSchema,
  locale: localeSchema.optional(),
  title: titleSchema,
  /** Auto from the title when absent. */
  slug: slugSchema.optional(),
  parentId: idSchema.nullable().optional(),
  /** Draft data; validated against DRAFT_ENTRY_DATA_SCHEMAS[type] by the API. */
  data: z.record(z.string(), z.unknown()).optional(),
  translationKey: z.string().max(64).optional(),
});
export type CreateEntryBody = z.infer<typeof createEntryBodySchema>;

/** PATCH /entries/:id. Any subset of the editable fields plus the version it started from. */
export const patchEntryBodySchema = z.object({
  version: z.number().int().min(1),
  title: titleSchema.optional(),
  summary: summarySchema.nullable().optional(),
  slug: slugSchema.optional(),
  parentId: idSchema.nullable().optional(),
  translationKey: z.string().max(64).nullable().optional(),
  blocks: draftBlocksSchema.optional(),
  /** Validated against DRAFT_ENTRY_DATA_SCHEMAS[type] by the API. */
  data: z.record(z.string(), z.unknown()).optional(),
  relations: draftRelationsSchema.optional(),
  faqIds: z.array(idSchema).max(30).optional(),
  imageId: idSchema.nullable().optional(),
  seoTitle: z.string().trim().max(120).nullable().optional(),
  seoDescription: z.string().trim().max(320).nullable().optional(),
  focusKeyword: z.string().trim().max(80).nullable().optional(),
  canonicalUrl: httpUrlSchema.nullable().optional(),
  noindex: z.boolean().optional(),
  nofollow: z.boolean().optional(),
  ogImageId: idSchema.nullable().optional(),
  schemaExtra: z.array(z.record(z.string(), z.unknown())).max(10).nullable().optional(),
  authorId: idSchema.nullable().optional(),
  reviewerId: idSchema.nullable().optional(),
  sortOrder: z.number().int().optional(),
  featured: z.boolean().optional(),
});
export type PatchEntryBody = z.infer<typeof patchEntryBodySchema>;

const noteSchema = z.string().trim().max(500);

export const publishEntryBodySchema = z.object({
  version: z.number().int().min(1),
  note: noteSchema.optional(),
  /** Moves contentUpdatedAt to now. */
  contentUpdated: z.boolean().optional(),
  publishFaqs: z.boolean().optional(),
});
export type PublishEntryBody = z.infer<typeof publishEntryBodySchema>;

export const scheduleEntryBodySchema = z.object({
  version: z.number().int().min(1),
  /** Future UTC instant; the admin enters and shows Asia/Karachi. */
  publishAt: isoDateTimeSchema,
  note: noteSchema.optional(),
  contentUpdated: z.boolean().optional(),
});
export type ScheduleEntryBody = z.infer<typeof scheduleEntryBodySchema>;

/** A site path or an `entry:<id>` link. */
export const redirectTargetSchema = z.string().trim().refine((v) => SITE_PATH_PATTERN.test(v) || ENTRY_LINK_PATTERN.test(v), 'Path like /x or entry:<id>');

export const unpublishEntryBodySchema = z.object({
  redirectTo: redirectTargetSchema.optional(),
  statusCode: redirectStatusSchema.optional(),
  note: noteSchema.optional(),
});
export type UnpublishEntryBody = z.infer<typeof unpublishEntryBodySchema>;

export const archiveEntryBodySchema = z.object({ redirectTo: redirectTargetSchema.optional(), note: noteSchema.optional() });
export type ArchiveEntryBody = z.infer<typeof archiveEntryBodySchema>;

export const duplicateEntryBodySchema = z.object({ title: titleSchema.optional(), slug: slugSchema.optional() });
export type DuplicateEntryBody = z.infer<typeof duplicateEntryBodySchema>;

export const translateEntryBodySchema = z.object({ locale: localeSchema });
export type TranslateEntryBody = z.infer<typeof translateEntryBodySchema>;

export const previewLinkBodySchema = z.object({
  expiresInHours: z.number().int().min(PREVIEW.minHours).max(PREVIEW.maxHours).optional(),
});
export type PreviewLinkBody = z.infer<typeof previewLinkBodySchema>;
export interface PreviewLinkResponse { url: string; expiresAt: string }

export const factCheckBodySchema = z.object({ note: noteSchema.optional() });
export type FactCheckBody = z.infer<typeof factCheckBodySchema>;

export const bulkEntriesBodySchema = z.object({
  ids: z.array(idSchema).min(1).max(200),
  action: z.enum(['publish', 'unpublish', 'archive']),
});
export type BulkEntriesBody = z.infer<typeof bulkEntriesBodySchema>;
export interface BulkEntriesResponse { results: { id: string; ok: boolean; issues?: Issue[] }[] }

export interface RevalidationResult { ok: boolean; error?: string }

export interface PatchEntryResponse { entry: AdminEntry; seo: SeoReport }
export interface ValidateEntryResponse { seo: SeoReport; canPublish: boolean }
export interface PublishEntryResponse { entry: AdminEntry; revisionId: string; revalidation: RevalidationResult; redirectCreated?: PublicRedirect }
export interface ScheduleEntryResponse { entry: AdminEntry; revisionId: string }
export interface UnpublishEntryResponse { entry: AdminEntry; revalidation: RevalidationResult; redirectCreated?: PublicRedirect }
export interface EntryResponse { entry: AdminEntry }
export interface InboundLinksResponse { from: { id: string; type: CmsEntryType; title: string; path: string; kind: CmsRelationKind }[] }
export interface LinkSuggestion { id: string; type: CmsEntryType; title: string; path: string; reason: string }

/** 409 on a stale `version`. */
export interface EntryConflictError { statusCode: 409; message: string; current: AdminEntry }
/** 422 when publish or validation checks fail. */
export interface ChecksFailedError { statusCode: 422; message: string; issues: Issue[] }

// ─── Snapshots (CmsRevision.snapshot and CmsEntry.published) ───

/** Editable draft fields copied into every revision snapshot; restore copies them back. */
export const DRAFT_SNAPSHOT_FIELDS = [
  'title', 'summary', 'slug', 'parentId', 'translationKey', 'blocks', 'data', 'relations', 'faqIds', 'imageId',
  'seoTitle', 'seoDescription', 'focusKeyword', 'canonicalUrl', 'noindex', 'nofollow', 'ogImageId', 'schemaExtra',
  'authorId', 'reviewerId', 'sortOrder', 'featured',
] as const;
export type DraftSnapshotField = (typeof DRAFT_SNAPSHOT_FIELDS)[number];

/** `CmsRevision.snapshot` for entries: the draft fields, plus the live snapshot on PUBLISH. */
export interface DraftSnapshot {
  title: string; summary: string | null; slug: string; parentId: string | null; translationKey: string | null;
  blocks: DraftBlock[]; data: Record<string, unknown>; relations: DraftRelation[]; faqIds: string[]; imageId: string | null;
  seoTitle: string | null; seoDescription: string | null; focusKeyword: string | null; canonicalUrl: string | null;
  noindex: boolean; nofollow: boolean; ogImageId: string | null; schemaExtra: Record<string, unknown>[] | null;
  authorId: string | null; reviewerId: string | null; sortOrder: number; featured: boolean;
}
export interface EntryRevisionSnapshot extends DraftSnapshot { published?: PublishedSnapshot }

export const PUBLISHED_SNAPSHOT_FORMAT = 1;

/**
 * `CmsEntry.published`: the frozen live version, written only by publishing.
 * The public API builds `PublicEntry` from it:
 * - `blocks`, `data`, `summary`, `seo.title` and `seo.description` still hold
 *   `{{tokens}}` and `entry:` links; resolve them at read time
 *   (CmsContentService.resolve, mode `published`), so a plan price change or
 *   a slug change shows without republishing.
 * - `seo.canonicalUrl` null means self (`SITE_URL + locale prefix + path`).
 * - `robots` already merges editor noindex, the quality gate, similarity and
 *   feature status `coming`; the site adds `SITE_INDEXABLE`.
 * - `mediaIds` and `referencedIds` list what the entry points at, so the
 *   public API can load media and cards in one query each.
 */
export const publishedSnapshotSchema = z.object({
  format: z.literal(PUBLISHED_SNAPSHOT_FORMAT),
  id: z.string(),
  type: cmsEntryTypeSchema,
  locale: z.string(),
  path: z.string(),
  slug: z.string(),
  parentId: z.string().nullable(),
  translationKey: z.string().nullable(),
  template: z.enum(SITE_TEMPLATES),
  title: z.string(),
  summary: z.string().nullable(),
  /** Visible blocks only, publish shape. */
  blocks: z.array(blockSchema),
  data: entryDataSchema,
  relations: z.array(draftRelationSchema),
  faqIds: z.array(z.string()),
  imageId: z.string().nullable(),
  authorId: z.string().nullable(),
  reviewerId: z.string().nullable(),
  factCheckedAt: z.string().nullable(),
  featureStatus: featureStatusSchema.nullable(),
  seo: z.object({
    title: z.string(),
    titleIncludesBrand: z.boolean(),
    description: z.string(),
    canonicalUrl: z.string().nullable(),
    robots: publicRobotsSchema,
    ogImageId: z.string().nullable(),
    schemaExtra: z.array(z.record(z.string(), z.unknown())),
    focusKeyword: z.string().nullable(),
  }),
  quality: z.object({ wordCount: z.number().int(), gate: z.number().int().nullable(), passed: z.boolean(), similarity: z.number().optional() }),
  mediaIds: z.array(z.string()),
  referencedIds: z.array(z.string()),
  /** Hash of the draft fields this snapshot came from (drives hasUnpublishedChanges). */
  draftHash: z.string(),
  sortOrder: z.number().int(),
  featured: z.boolean(),
  publishedAt: z.string(),
  firstPublishedAt: z.string(),
  contentUpdatedAt: z.string().nullable(),
  /** The PUBLISH revision; null in preview builds. */
  revisionId: z.string().nullable(),
});
export type PublishedSnapshot = z.infer<typeof publishedSnapshotSchema>;

// ─── Revisions ───

export interface RevisionListItem {
  id: string; version: number; action: RevisionAction; note: string | null;
  createdById: string | null; createdByName: string | null; createdAt: string;
  revalidatedAt: string | null; revalidateError: string | null;
}
export interface RevisionDetail extends RevisionListItem {
  entryId: string | null; subject: RevisionSubject; subjectKey: string | null; snapshot: Record<string, unknown>;
}
export interface RevisionDiff {
  fields: { field: string; before: unknown; after: unknown }[];
  blocks: { id: string; change: 'added' | 'removed' | 'changed' | 'moved'; before?: unknown; after?: unknown }[];
}
export const historyQuerySchema = z.object({ subject: z.enum(['MENU', 'SETTING', 'FAQ']), key: z.string().max(100) });

// ─── FAQs ───

export interface AdminFaq {
  id: string; locale: string; translationKey: string | null; topic: string | null;
  question: string; answer: string; status: CmsStatus;
  publishedQuestion: string | null; publishedAnswer: string | null; publishedAt: string | null;
  hasUnpublishedChanges: boolean; sourceNote: string | null; sortOrder: number;
  createdById: string | null; updatedById: string | null; createdAt: string; updatedAt: string;
  usedOn: { id: string; title: string; path: string }[];
}
export const faqsQuerySchema = z.object({
  locale: localeSchema.optional(),
  topic: keySchema.optional(),
  status: cmsStatusSchema.optional(),
  q: z.string().trim().max(200).optional(),
  ...paginationQueryShape,
});
export const createFaqBodySchema = z.object({
  locale: localeSchema.optional(),
  topic: keySchema.nullable().optional(),
  question: shortText(300),
  /** Markdown, 40-80 words recommended, direct answer first. */
  answer: z.string().trim().min(1).max(5_000),
  sourceNote: z.string().trim().max(500).nullable().optional(),
});
export type CreateFaqBody = z.infer<typeof createFaqBodySchema>;
export const patchFaqBodySchema = createFaqBodySchema.partial();
export type PatchFaqBody = z.infer<typeof patchFaqBodySchema>;
export interface FaqMutationResponse { faq: AdminFaq; revalidation: RevalidationResult }
export interface FaqTopic { key: string; label: string; count: number }

// ─── Media ───

export const MEDIA_LIMITS = {
  imageMaxBytes: 10 * 1024 * 1024,
  documentMaxBytes: 25 * 1024 * 1024,
  altMin: 5,
  altMax: 250,
} as const;
export const altTextSchema = z.string().trim().min(MEDIA_LIMITS.altMin).max(MEDIA_LIMITS.altMax);

export interface AdminMedia extends PublicMedia {
  tags: string[]; folder: string | null; checksum: string | null; createdAt: string;
  altTranslations: Record<string, string> | null; fileName: string;
}
export const mediaQuerySchema = z.object({
  kind: cmsMediaKindSchema.optional(),
  tag: z.string().max(80).optional(),
  q: z.string().trim().max(200).optional(),
  unused: z.stringbool().optional(),
  ...paginationQueryShape,
});
/** Tags like "industry:pharmacy", "feature:khata". */
export const mediaTagSchema = z.string().regex(/^[a-z0-9][a-z0-9:_-]{0,63}$/, 'Tag: a-z, 0-9, : _ -');
/** Multipart text fields of POST /media (the file is the `file` part). */
export const mediaUploadFieldsSchema = z.object({
  alt: altTextSchema,
  kind: cmsMediaKindSchema.optional(),
  caption: z.string().trim().max(300).optional(),
  credit: z.string().trim().max(200).optional(),
  sourceUrl: httpUrlSchema.optional(),
  tags: commaList(mediaTagSchema, 30).optional(),
  folder: z.string().regex(/^[a-z0-9][a-z0-9/_-]{0,63}$/).optional(),
});
export type MediaUploadFields = z.infer<typeof mediaUploadFieldsSchema>;
export const patchMediaBodySchema = z.object({
  alt: altTextSchema.optional(),
  altTranslations: z.record(localeSchema, z.string().trim().max(MEDIA_LIMITS.altMax)).optional(),
  caption: z.string().trim().max(300).nullable().optional(),
  credit: z.string().trim().max(200).nullable().optional(),
  sourceUrl: httpUrlSchema.nullable().optional(),
  tags: z.array(mediaTagSchema).max(30).optional(),
  /** 0-1 fraction of width / height. */
  focalX: z.number().min(0).max(1).nullable().optional(),
  focalY: z.number().min(0).max(1).nullable().optional(),
  kind: cmsMediaKindSchema.optional(),
});
export type PatchMediaBody = z.infer<typeof patchMediaBodySchema>;
export interface MediaDuplicateError { statusCode: 409; message: string; duplicateOf: AdminMedia }
export interface MediaUsage {
  entries: { id: string; title: string; path: string; where: string }[];
  customers: { id: string; name: string; where: string }[];
  settings: string[];
}

// ─── Redirects ───

/** fromPath: a site path (with /ur prefix when relevant); `:name` segments and a trailing `*` when isPattern. */
export const REDIRECT_FROM_PATTERN = /^\/[^\s?#*]*\*?$/;
export const REDIRECT_WARNINGS = ['chain', 'loop', 'target_unpublished', 'target_404'] as const;
export type RedirectWarning = (typeof REDIRECT_WARNINGS)[number];

export interface AdminRedirect {
  id: string; fromPath: string; toPath: string | null; statusCode: RedirectStatus;
  isPattern: boolean; isActive: boolean; source: CmsRedirectSource; entryId: string | null;
  hits: number; lastHitAt: string | null; note: string | null;
  createdById: string | null; createdAt: string; updatedAt: string;
  warnings: RedirectWarning[];
}
export const redirectsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  source: cmsRedirectSourceSchema.optional(),
  active: z.stringbool().optional(),
  pattern: z.stringbool().optional(),
  ...paginationQueryShape,
});
const redirectFieldsShape = {
  fromPath: z.string().trim().max(512).regex(REDIRECT_FROM_PATTERN, 'From: a path like /old/page or /lahore/:industry'),
  /** Site path (may use :name from fromPath) or absolute URL; empty for 410. */
  toPath: z.string().trim().max(2048).nullable().optional(),
  statusCode: redirectStatusSchema,
  isPattern: z.boolean().optional(),
  note: noteSchema.nullable().optional(),
  entryId: idSchema.nullable().optional(),
};
function refineRedirectTarget(value: { statusCode?: RedirectStatus | undefined; toPath?: string | null | undefined; entryId?: string | null | undefined }, ctx: z.RefinementCtx): void {
  if (value.statusCode === 410 && value.toPath) ctx.addIssue({ code: 'custom', path: ['toPath'], message: '410 has no target' });
  if ((value.statusCode === 301 || value.statusCode === 302) && !value.toPath && !value.entryId) {
    ctx.addIssue({ code: 'custom', path: ['toPath'], message: 'A 301/302 needs a target path or entry' });
  }
}
export const createRedirectBodySchema = z.object(redirectFieldsShape).superRefine(refineRedirectTarget);
export type CreateRedirectBody = z.infer<typeof createRedirectBodySchema>;
export const patchRedirectBodySchema = z
  .object({ ...redirectFieldsShape, isActive: z.boolean() })
  .partial()
  .superRefine(refineRedirectTarget);
export type PatchRedirectBody = z.infer<typeof patchRedirectBodySchema>;
export const redirectImportRowSchema = z.object({
  from: z.string().trim().min(1).max(512),
  to: z.string().trim().max(2048).optional(),
  status: z.coerce.number().pipe(redirectStatusSchema).default(301),
  note: z.string().max(500).optional(),
});
export const redirectImportBodySchema = z.object({ rows: z.array(redirectImportRowSchema).min(1).max(5_000), dryRun: z.boolean().optional() });
export type RedirectImportBody = z.infer<typeof redirectImportBodySchema>;
export interface RedirectImportResult { created: number; updated: number; skipped: number; errors: { row: number; message: string }[] }
export const redirectTestQuerySchema = z.object({ path: z.string().trim().min(1).max(2048) });
export interface RedirectTestResult { matched: AdminRedirect | null; finalPath: string | null; hops: string[]; servesEntry: { id: string; title: string } | null }

// ─── Menus ───

export interface AdminMenu { key: MenuKey; locale: string; title: string; items: MenuItem[]; updatedAt: string }
export interface AdminMenuDetail extends AdminMenu { resolved: MenuItemResolved[] }
export const putMenuBodySchema = z.object({ locale: localeSchema.optional(), title: shortText(80), items: menuItemsSchema });
export type PutMenuBody = z.infer<typeof putMenuBodySchema>;

// ─── Settings ───

/** PUT /settings/:key body; `value` is checked with SETTINGS_SCHEMAS[key]. */
export const putSettingBodySchema = z.object({ locale: localeSchema.optional(), value: z.unknown() });
export type PutSettingBody = z.infer<typeof putSettingBodySchema>;
export interface PutSettingResponse { key: SettingKey; value: unknown; updatedAt: string }
export interface LlmsPreviewResponse { llmsTxt: string; organizationJsonLd: Record<string, unknown> }

// ─── Customers and testimonials ───

export interface AdminCustomer {
  id: string; name: string; slug: string; logoId: string | null; logo: PublicMedia | null;
  cityEntryId: string | null; industryEntryId: string | null; website: string | null; tenantId: string | null;
  consentScope: ConsentScope[]; consentAt: string | null; consentEvidence: string | null;
  verifiedById: string | null; verifiedAt: string | null; isPublic: boolean; sortOrder: number; notes: string | null;
  createdById: string | null; createdAt: string; updatedAt: string;
  testimonialsCount: number;
}
export const customersQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  public: z.stringbool().optional(),
  ...paginationQueryShape,
});
export const createCustomerBodySchema = z.object({
  name: shortText(120),
  slug: z.string().min(SLUG_MIN).max(SLUG_MAX).regex(SLUG_PATTERN).optional(),
  logoId: idSchema.nullable().optional(),
  cityEntryId: idSchema.nullable().optional(),
  industryEntryId: idSchema.nullable().optional(),
  website: httpUrlSchema.nullable().optional(),
  tenantId: z.string().max(64).nullable().optional(),
  notes: z.string().max(5_000).nullable().optional(),
});
export type CreateCustomerBody = z.infer<typeof createCustomerBodySchema>;
export const patchCustomerBodySchema = createCustomerBodySchema.partial();
export type PatchCustomerBody = z.infer<typeof patchCustomerBodySchema>;
export const customerConsentBodySchema = z.object({
  scope: z.array(consentScopeSchema).min(1).refine((list) => new Set(list).size === list.length, 'Each scope once'),
  consentAt: isoDateTimeSchema,
  /** How consent was given and where the proof is kept. */
  evidence: z.string().trim().min(10).max(5_000),
});
export type CustomerConsentBody = z.infer<typeof customerConsentBodySchema>;
export const customerVisibilityBodySchema = z.object({ isPublic: z.boolean() });
export type CustomerVisibilityBody = z.infer<typeof customerVisibilityBodySchema>;

export interface AdminTestimonial {
  id: string; customerId: string; locale: string; personName: string; personRole: string | null;
  quote: string; photoId: string | null; photo: PublicMedia | null;
  sourceType: TestimonialSourceType; sourceUrl: string | null; collectedAt: string | null;
  status: CmsStatus; sortOrder: number; createdById: string | null; createdAt: string; updatedAt: string;
  customer: { id: string; name: string; isPublic: boolean; consentScope: ConsentScope[] };
}
export const testimonialsQuerySchema = z.object({
  customerId: idSchema.optional(),
  status: cmsStatusSchema.optional(),
  ...paginationQueryShape,
});
export const createTestimonialBodySchema = z.object({
  customerId: idSchema,
  locale: localeSchema.optional(),
  personName: shortText(120),
  personRole: z.string().trim().max(120).nullable().optional(),
  quote: z.string().trim().min(1).max(1_500),
  photoId: idSchema.nullable().optional(),
  sourceType: testimonialSourceTypeSchema,
  sourceUrl: httpUrlSchema.nullable().optional(),
  collectedAt: dateOrDateTimeSchema.nullable().optional(),
});
export type CreateTestimonialBody = z.infer<typeof createTestimonialBodySchema>;
export const patchTestimonialBodySchema = createTestimonialBodySchema.partial();
export type PatchTestimonialBody = z.infer<typeof patchTestimonialBodySchema>;

// ─── Dashboard and config ───

export interface CmsDashboard {
  byType: { type: CmsEntryType; draft: number; scheduled: number; published: number; noindex: number }[];
  scheduled: { id: string; title: string; publishAt: string }[];
  lastRevalidation: { at: string; ok: boolean; error?: string } | null;
}
export interface CmsHealthReport { items: { entryId: string; title: string; path: string; issues: Issue[] }[] }

export interface CmsConfigType {
  type: CmsEntryType;
  label: string;
  pathPattern: string;
  allowedBlocks: readonly BlockType[];
  requiredData: readonly string[];
  starterBlocks: readonly BlockType[];
}
export interface CmsConfigDiagramKind {
  kind: DiagramKind;
  /** True for flow, hub and timeline (editors fill nodes); false for bespoke kinds. */
  dataDriven: boolean;
  /** Bespoke kinds only: label keys with their default text. */
  labelKeys?: Readonly<Record<string, string>>;
}
/** GET /admin/marketing/cms/config. */
export interface CmsConfig {
  types: CmsConfigType[];
  icons: readonly string[];
  diagramKinds: CmsConfigDiagramKind[];
  /** `example` is rendered by the API from live data. */
  tokens: { token: string; example: string }[];
  locales: string[];
  siteUrl: string;
}

/** The static part of GET /config; the API adds token examples, locales and siteUrl. */
export function buildStaticCmsConfig(): Pick<CmsConfig, 'types' | 'icons' | 'diagramKinds'> {
  return {
    types: CMS_ENTRY_TYPES.map((type) => ({
      type,
      label: ENTRY_TYPE_META[type].label,
      pathPattern: ENTRY_TYPE_META[type].pathPattern,
      allowedBlocks: ALLOWED_BLOCKS[type],
      requiredData: REQUIRED_DATA_FIELDS[type],
      starterBlocks: STARTER_BLOCKS[type],
    })),
    icons: ALLOWED_ICONS,
    diagramKinds: [
      ...BESPOKE_DIAGRAM_KINDS.map((kind) => ({ kind, dataDriven: false, labelKeys: DIAGRAM_LABEL_KEYS[kind] })),
      ...DATA_DIAGRAM_KINDS.map((kind) => ({ kind, dataDriven: true })),
    ],
  };
}
