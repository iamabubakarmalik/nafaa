# Marketing CMS: API contract

Date: 20 Oct 2026. Companion to `ARCH.md`. The API agents (A0-A2, A4), admin agents (M1, M2) and site agents (S1-S5) all build against this file. The zod source of truth is `packages/cms-contract/src/cms-contract.ts` (agent F1), which encodes sections 3-5 exactly. If code and this file disagree, raise it; don't fork either one.

Schema: `apps/api/prisma/schema.prisma` → section "MARKETING CMS" (models `CmsEntry`, `CmsRevision`, `CmsEntryRelation`, `CmsFaq`, `CmsEntryFaq`, `CmsMedia`, `CmsRedirect`, `CmsMenu`, `CmsSetting`, `CmsCustomer`, `CmsTestimonial`).

---

## 1. Conventions

- **Base URL:** `https://api.nafaa.pk/api` (global prefix `api`). Local: `http://localhost:4000/api`.
- **Format:** JSON in and out. Dates are ISO 8601 UTC strings. The admin shows Asia/Karachi. Ids are cuid strings.
- **Locale:** `locale` query or body field, `"en"` by default. Allowed values come from settings `site.locales` (`["en"]` at launch, `"ur"` later).
- **Paths:** `path` never includes the locale prefix. `url` is absolute and includes it (`https://nafaa.pk/ur/...` for `ur`).
- **Pagination** (admin lists): query `page` (1+) and `limit` (1-200, default 30). Response shape from the existing helper:
  ```ts
  interface Paginated<T> { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } }
  ```
- **Errors:** NestJS default `{ statusCode, message, error }`. Two extra shapes:
  - `409 Conflict` (stale `version`): `{ statusCode: 409, message: 'Entry changed since you opened it', current: AdminEntry }`
  - `422 Unprocessable Entity` (publish or validation checks): `{ statusCode: 422, message: 'Publish checks failed', issues: Issue[] }`
- **Public endpoints** (`/public/site/*`):
  - `@Public()` and `@SkipThrottle()`. GET only, except `redirects/hit`.
  - They return published data only. Response header `Cache-Control: public, max-age=60` plus an `ETag`. The service keeps an in-memory LRU (60 s), flushed on any publish.
- **Admin endpoints** (`/admin/marketing/cms/*`):
  - `@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)` with `@RequireMarketingPermissions(...)`. This is the same pattern as `admin-marketing/seo/seo.controller.ts`.
  - The admin app sends `Authorization: Bearer <accessToken>` from `useAuthStore` (`apps/admin/src/api/client.ts`). `SUPER_ADMIN` passes every check.
- **Permissions:** `CMS_VIEW = 'marketing.cms.view'`, `CMS_EDIT = 'marketing.cms.edit'`, `CMS_PUBLISH = 'marketing.cms.publish'`, `CMS_REDIRECTS = 'marketing.cms.redirects'`, `CMS_SETTINGS = 'marketing.cms.settings'`.

---

## 2. Public read API

### 2.1 Endpoints

| Method + path | Query | Returns |
|---|---|---|
| `GET /public/site/entry` | `path` (required), `locale` | `PublicEntry`, or 404 when nothing is published at that path |
| `GET /public/site/entries` | `type` (required), `locale`, `tag` (entry id), `group`, `featured` (bool), `parentId`, `sort` (`order` default \| `recent` \| `title`), `limit` (≤ 200, default 50), `cursor` | `{ items: EntryCard[]; nextCursor: string \| null }` |
| `GET /public/site/paths` | `type` (optional, all when absent), `locale` | `{ items: { type: CmsEntryType; path: string; locale: string; updatedAt: string }[] }`, used by `generateStaticParams` |
| `GET /public/site/layout` | `locale` | `PublicLayout` (menus with resolved links + site settings) |
| `GET /public/site/entity` | `locale` | `PublicEntity` (entity facts + computed counts + plan summary) |
| `GET /public/site/plans` | — | `PublicPlan[]` (active, public `Plan` rows + CMS pricing display) |
| `GET /public/site/faqs` | `locale`, `topic` | `{ topics: { key: string; label: string; faqs: PublicFaq[] }[] }`, used by the `/faq` hub |
| `GET /public/site/testimonials` | `locale`, `ids` (comma list), `industry` (entry id), `city` (entry id), `limit` | `PublicTestimonial[]` (consented only; may be empty) |
| `GET /public/site/customers` | `ids`, `industry`, `city`, `limit` | `PublicCustomer[]` (LOGO consent only) |
| `GET /public/site/stats` | `metrics` (comma list of `StatMetric`) | `Record<StatMetric, { value: number; formatted: string; asOf: string }>` |
| `GET /public/site/redirects` | — | `{ rules: PublicRedirect[]; updatedAt: string }` (all active rules) |
| `POST /public/site/redirects/hit` | body `{ id: string }` | `204`. Throttled normally (60/min/IP) |
| `GET /public/site/sitemap` | `section` (see ARCH 9), `locale` | `{ items: SitemapItem[] }` |
| `GET /public/site/llms` | `locale` | `LlmsPayload` |
| `GET /public/site/search-index` | `locale` | `{ items: { title: string; path: string; type: CmsEntryType; summary?: string }[] }` (CommandSearch island, loaded on click) |
| `GET /public/site/preview` | `token` (required), `path` (optional) | Without `path`: `{ valid: true; entryId: string; path: string; expiresAt: string }`. With `path`: the draft as a `PublicEntry` (with `preview: true`) when the token's entry has that path, or else the published entry. 401 for a bad or expired token. Never cached (`Cache-Control: no-store`) |

### 2.2 Site cache tags per fetch
The site attaches these tags (`fetch(..., { next: { tags, revalidate } })`). It always adds `all`.

| Endpoint | Tags | `revalidate` fallback |
|---|---|---|
| `entry?path=P` | `page:<locale>:<P>` | 86400 |
| `entries?type=T` | `type:<locale>:<T>` | 86400 |
| `paths` | `sitemap` | 86400 |
| `layout` | `layout:<locale>` | 86400 |
| `entity` | `settings`, `plans` | 3600 |
| `plans` | `plans` | 3600 |
| `faqs` | `faq:<locale>` | 86400 |
| `testimonials`, `customers` | `customers` | 86400 |
| `stats` | `plans`, `type:<locale>:INDUSTRY`, `type:<locale>:CITY`, `type:<locale>:INTEGRATION` | 3600 |
| `redirects` | `redirects` | 3600 |
| `sitemap` | `sitemap` | 86400 |
| `llms` | `llms`, `plans`, `settings` | 86400 |
| `search-index` | `sitemap` | 86400 |
| `preview` | none (`cache: 'no-store'`) | — |

### 2.3 Response types

```ts
type CmsEntryType =
  | 'PAGE' | 'PRODUCT' | 'INDUSTRY' | 'SOLUTION' | 'SERVICE' | 'INTEGRATION' | 'COMPLIANCE'
  | 'CITY' | 'CITY_INDUSTRY' | 'BEST_OF' | 'COMPARE' | 'ALTERNATIVE' | 'BLOG_POST'
  | 'BLOG_CATEGORY' | 'GUIDE' | 'GLOSSARY_TERM' | 'TOOL' | 'TEMPLATE' | 'CASE_STUDY'
  | 'PERSON' | 'DOC' | 'CHANGELOG';
type CmsStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
type CmsRelationKind = 'TAG' | 'RELATED' | 'MENTIONS';
type CmsMediaKind = 'IMAGE' | 'SCREENSHOT' | 'LOGO' | 'ILLUSTRATION' | 'VIDEO' | 'DOCUMENT';

interface PublicMedia {
  id: string; kind: CmsMediaKind; publicId: string; url: string;
  width: number | null; height: number | null; alt: string;      // alt in the requested locale, falling back to en
  caption?: string; credit?: string; sourceUrl?: string;
  blurDataUrl?: string; dominantColor?: string; focalX?: number; focalY?: number;
  mimeType: string; bytes: number;
}

interface EntryCard {
  id: string; type: CmsEntryType; locale: string; path: string; url: string;
  title: string; summary: string | null;
  image: PublicMedia | null;
  // Display fields copied from data, when the type has them:
  icon?: string; color?: string; group?: string; shortName?: string; status?: string;
  contentUpdatedAt: string | null;
}

interface PersonCard extends EntryCard { role?: string; photo: PublicMedia | null; sameAs: string[] }

interface PublicSeo {
  title: string;               // final <title> text WITHOUT the "| Nafaa" suffix; site applies the template
  titleIncludesBrand: boolean; // true for Home and Compare patterns, so the site uses `absolute`
  description: string;
  canonical: string;           // absolute
  robots: { index: boolean; follow: boolean; reason?: 'editor' | 'quality_gate' | 'planned' | 'similarity' | 'site_not_indexable' };
  ogImage: PublicMedia | null; // null → site generates the OG card
  schemaExtra: object[];       // extra JSON-LD nodes
}

interface PublicFaq { id: string; question: string; answer: string /* markdown, tokens resolved */ ; topic: string | null }

interface PublicEntry {
  id: string; type: CmsEntryType; locale: string; path: string; url: string;
  preview?: true;
  title: string; summary: string | null;
  blocks: Block[];                         // section 4; tokens and entry: links resolved
  data: EntryData;                         // section 5, by type; tokens resolved
  seo: PublicSeo;
  image: PublicMedia | null;
  author: PersonCard | null; reviewer: PersonCard | null;
  factCheckedAt: string | null;
  datePublished: string | null;            // firstPublishedAt
  dateModified: string | null;             // contentUpdatedAt ?? publishedAt
  breadcrumbs: { name: string; path: string; url: string }[];  // Home first, this page last
  parent: EntryCard | null;
  children: EntryCard[];                   // DOC tree and PAGE children only; empty otherwise
  tags: Partial<Record<CmsEntryType, EntryCard[]>>;           // TAG relations grouped by target type
  related: EntryCard[];                    // RELATED relations in order
  faqs: PublicFaq[];                       // CmsEntryFaq order
  alternates: { locale: string; path: string; url: string }[]; // published translations, incl. self
  media: Record<string, PublicMedia>;      // every media id referenced by blocks or data
  quality: { wordCount: number; gate: number | null; passed: boolean };
}

interface MenuItemResolved {
  id: string; label: string; href: string;      // absolute path on site, or external URL
  description?: string; icon?: string; external?: boolean;
  children?: MenuItemResolved[];                // groups / columns / auto lists expanded
}

interface PublicLayout {
  locale: string;
  menus: { header: MenuItemResolved[]; footer: MenuItemResolved[]; legal: MenuItemResolved[]; mobile: MenuItemResolved[] };
  site: SiteSettings;                           // section 5.3
  updatedAt: string;
}

interface PublicPlan {
  id: string; slug: string; name: string; description: string | null;
  priceMonthly: number; priceQuarterly: number; priceYearly: number; currency: 'PKR';
  trialDays: number; sortOrder: number;
  limits: { maxProducts: number; maxUsers: number; maxShops: number; maxSalesPerMonth: number };
  features: { key: PlanFeatureKey; label: string; included: boolean }[];   // labels from settings.pricing
  display: { tagline?: string; highlight: boolean; ctaLabel?: string; ctaHref?: string };
}
type PlanFeatureKey =
  | 'featurePos' | 'featureBarcodeScanner' | 'featureMultiShop' | 'featureReports' | 'featureProfitReport'
  | 'featureLoyalty' | 'featureDiscounts' | 'featureKhata' | 'featureExports' | 'featureBackup'
  | 'featureNotifications' | 'featureCashRegister' | 'featureStockTransfer' | 'featureReturns'
  | 'featureSupport24x7' | 'featureWhatsappReceipt' | 'featureCustomBranding';

interface PublicEntity extends EntitySettings {          // section 5.3
  counts: { industries: number; cities: number; integrationsLive: number; glossaryTerms: number; posts: number };
  plans: { slug: string; name: string; priceMonthly: number }[];
  minPaidMonthly: number | null;
  generatedAt: string;
}

interface PublicTestimonial {
  id: string; quote: string; personName: string; personRole: string | null;
  photo: PublicMedia | null; sourceType: string; sourceUrl: string | null; collectedAt: string | null;
  customer: { name: string; city: string | null; industry: string | null; logo: PublicMedia | null; caseStudyPath: string | null };
}
interface PublicCustomer { id: string; name: string; logo: PublicMedia; website: string | null; city: string | null; industry: string | null }

interface PublicRedirect { id: string; from: string; to: string | null; status: 301 | 302 | 410; pattern: boolean }

interface SitemapItem { url: string; lastmod: string; images: { url: string; title?: string }[]; alternates: { hreflang: string; url: string }[] }

interface LlmsPayload {
  entity: PublicEntity;
  sections: { key: string; title: string; items: { title: string; url: string; summary: string | null }[] }[];
  topFaqs: PublicFaq[];
  full: { url: string; title: string; summary: string | null; keyFacts: { label: string; value: string }[]; faqs: PublicFaq[] }[]; // money pages, for llms-full.txt
  generatedAt: string;
}
```

**Visibility rules (A2 must enforce):**
- Entries need `publishedPath` not null and status `PUBLISHED`.
- Cards inside responses only point to published entries.
- FAQs need status `PUBLISHED`; the response uses `publishedQuestion` and `publishedAnswer`.
- Testimonials need status `PUBLISHED`, and the customer needs `isPublic` and a `QUOTE` consent.
- Customers need `isPublic` and a `LOGO` consent.
- Media is returned only when it is referenced by something public.
- Plans need `isActive && isPublic`.

---

## 3. Text conventions inside content

### 3.1 Tokens
Allowed in `summary`, any Markdown, any block string field and FAQ answers. The API resolves them in every public response, and the admin shows them raw with a preview.

| Token | Value |
|---|---|
| `{{price:<planSlug>.<monthly\|quarterly\|yearly>}}` | Formatted PKR from `Plan`, e.g. `Rs 1,500` |
| `{{price:min.monthly}}` | Lowest non-zero public monthly price |
| `{{count:industries\|cities\|integrations\|glossary\|posts}}` | Computed count of published entries |
| `{{fact:<path>}}` | A value from settings `entity`, e.g. `{{fact:compliance.fbrPra}}` → "FBR & PRA approved POS integrator" |
| `{{year}}` | Current year (Asia/Karachi) |

An unknown token is a publish error (`UNKNOWN_TOKEN`).

### 3.2 Internal links
- **Format:** links to entries are stored as `entry:<id>` or `entry:<id>#<anchor>`, in Markdown hrefs and in every `href` field (CTA, menu, card).
- **Resolution:** public responses rewrite them to the current published path. A link to an unpublished entry is a publish error (`BROKEN_LINK`).
- **Indexing:** links are indexed as `MENTIONS` on publish.

Special `href` keywords for CTAs: `signup` (site settings `signupUrl`), `demo` (`demoPath`) and `whatsapp` (a WhatsApp deep link with the default message).

### 3.3 Markdown
- GFM: paragraphs, H2/H3, lists, tables, blockquote, code, links and images.
- Images are written `![alt](media:<id>)`; the alt comes from the media row when empty.
- H1 and skipped heading levels are rejected (`HEADING_LEVEL`). Raw HTML is stripped on the site (rehype-sanitize).

---

## 4. Blocks

Every block has these base fields:

```ts
interface BlockBase {
  id: string;            // nanoid(10), stable across edits (anchors, diffs)
  type: BlockType;
  anchor?: string;       // a-z0-9-, unique per entry
  theme?: 'default' | 'muted' | 'ink';
  hidden?: boolean;      // kept in the draft, not rendered or published
}
type Cta = { label: string; href: string; variant?: 'primary' | 'secondary' | 'ghost'; trackAs?: string };
type IconName = string;  // must be in ALLOWED_ICONS (contract file; ~150 lucide names)
type Md = string;        // Markdown (3.3)
type InlineMd = string;  // Markdown, inline only (bold, italic, links, tokens)
```

| # | `type` | Props (besides `BlockBase`) | Rules |
|---|---|---|---|
| 4.1 | `hero` | `{ eyebrow?: string; heading?: string; sub: InlineMd; primaryCta: Cta; secondaryCta?: Cta; media?: { kind: 'screenshot'; mediaId: string; frame: Frame; url?: string } \| { kind: 'diagram'; diagram: DiagramSpec } \| { kind: 'image'; mediaId: string }; badges?: InlineMd[]; layout: 'split' \| 'centered' }` | At most one, and it must be first. `heading` defaults to the entry title and is the H1. `sub` is 25-60 words (warning) |
| 4.2 | `answerBox` | `{ heading?: string; answer?: InlineMd; facts: { label: string; value: InlineMd }[]; romanUrdu?: string }` | `answer` defaults to the entry summary (40-60 words, warning). 2-8 facts. `romanUrdu` ≤ 60 words |
| 4.3 | `featuresGrid` | `{ heading: string; intro?: InlineMd; columns: 2 \| 3 \| 4; items: { icon: IconName; title: string; body: InlineMd; href?: string }[] }` | 3-12 items |
| 4.4 | `diagram` | `{ heading?: string; caption: string; diagram: DiagramSpec }` | `caption` is required (figcaption + SVG `<desc>`) |
| 4.5 | `screenshot` | `{ heading?: string; body?: Md; mediaId: string; frame: Frame; url?: string; callouts?: { x: number; y: number; label: string }[]; layout: 'full' \| 'split-left' \| 'split-right'; caption?: string }` | `x` and `y` are 0-100 (%). ≤ 6 callouts. The media must be IMAGE or SCREENSHOT |
| 4.6 | `faq` | `{ heading?: string }` | At most one. Renders the entry's FAQs; with none it renders nothing (warning on money types) |
| 4.7 | `comparisonTable` | `{ heading: string; caption: string; columns: { key: string; label: string; highlight?: boolean }[]; rows: { label: string; cells: Record<string, { value: 'yes' \| 'no' \| 'partial' \| string; note?: string }> }[]; sources?: Source[]; checkedAt?: string }` | 2-6 columns. `checkedAt` and ≥ 1 source are required when any column is a competitor (on types COMPARE, ALTERNATIVE, BEST_OF) |
| 4.8 | `cta` | `{ heading: string; body?: InlineMd; primaryCta: Cta; secondaryCta?: Cta }` | — |
| 4.9 | `richText` | `{ markdown: Md }` | 3.3 rules |
| 4.10 | `steps` | `{ heading: string; intro?: InlineMd; items: { title: string; body: Md; mediaId?: string }[]; howTo?: boolean }` | 2-10 items. `howTo: true` emits HowTo schema |
| 4.11 | `stats` | `{ heading?: string; items: { metric: StatMetric; label: string; suffix?: string }[] }` | Values come only from `/public/site/stats`. There is no free number field |
| 4.12 | `testimonial` | `{ heading?: string; mode: 'pick' \| 'auto'; ids?: string[]; filter?: { industryId?: string; cityId?: string }; limit?: number }` | Renders nothing when there are no consented quotes |
| 4.13 | `logoCloud` | `{ heading?: string; mode: 'pick' \| 'auto'; ids?: string[]; filter?: { industryId?: string; cityId?: string }; limit?: number }` | Same rule as `testimonial` |
| 4.14 | `pricingTable` | `{ heading?: string; planSlugs?: string[]; showToggle: boolean; highlightPlan?: string; featureKeys?: PlanFeatureKey[]; compact?: boolean }` | Prices only from `Plan` |
| 4.15 | `codeSample` | `{ heading?: string; tabs: { label: string; language: 'bash' \| 'http' \| 'json' \| 'js' \| 'ts' \| 'python' \| 'php'; code: string }[]; caption?: string }` | 1-6 tabs. Highlighted on the server |
| 4.16 | `cityFacts` | `{ show: ('tax' \| 'markets' \| 'areas' \| 'support' \| 'nearby')[]; heading?: string }` | Only on CITY / CITY_INDUSTRY. Renders from the entry's `data` (5.1) |
| 4.17 | `entryGrid` | `{ heading?: string; intro?: InlineMd; entryType: CmsEntryType; filter?: { tagId?: string; group?: string; featured?: boolean; parentId?: string }; sort?: 'order' \| 'recent' \| 'title'; limit?: number; layout: 'cards' \| 'list' \| 'grouped' }` | `grouped` groups by `data.group` (industry groups setting) |
| 4.18 | `relatedLinks` | `{ heading?: string; source: 'related' \| 'tags'; tagType?: CmsEntryType; limit?: number }` | — |
| 4.19 | `sources` | `{ heading?: string; items: Source[] }` | `Source = { title: string; url: string; publisher: string; accessedAt: string }`. URLs on the official-domain list render followed |
| 4.20 | `callout` | `{ tone: 'info' \| 'tip' \| 'warning'; title?: string; body: Md }` | — |
| 4.21 | `leadForm` | `{ heading: string; intro?: InlineMd; form: 'contact' \| 'demo'; formType?: 'SALES' \| 'ENTERPRISE' \| 'PARTNERSHIP' \| 'GENERAL'; subjectPrefix?: string; successMessage: string }` | Posts to the existing `/public/marketing/contact-form` or `/demo-booking` |
| 4.22 | `tool` | `{ toolKey: ToolKey }` | `ToolKey = 'gst-calculator' \| 'profit-margin-calculator' \| 'pos-cost-calculator' \| 'invoice-generator' \| 'gold-rate-calculator' \| 'fbr-tier-1-checker'` |

```ts
type Frame = 'browser' | 'phone' | 'tablet' | 'desktop' | 'receipt' | 'none';
type DiagramSpec =
  | { kind: 'offline-sync' | 'fbr-invoice' | 'khata-cycle' | 'multi-branch' | 'order-to-cash' | 'store-sync' | 'api-webhooks' | 'service-process';
      labels?: Record<string, string>; animate?: boolean }                       // label keys listed per kind in the contract
  | { kind: 'flow'; nodes: { id: string; label: string; icon?: IconName; note?: string }[];   // 2-8 nodes
      edges: { from: string; to: string; label?: string }[]; animate?: boolean }
  | { kind: 'hub'; center: { label: string; icon?: IconName }; spokes: { label: string; icon?: IconName; href?: string }[]; animate?: boolean } // 3-8 spokes
  | { kind: 'timeline'; items: { date: string; label: string; note?: string }[]; animate?: boolean };                                    // 2-6
type StatMetric =
  | 'industries.count' | 'cities.count' | 'integrations.live.count' | 'glossary.count' | 'posts.count'
  | 'plans.count' | 'plans.minPaid.monthly'
  | 'platform.bills30d' | 'platform.activeShops30d';   // platform.* only when settings.analytics.allowPlatformStats
type BlockType = 'hero' | 'answerBox' | 'featuresGrid' | 'diagram' | 'screenshot' | 'faq' | 'comparisonTable' | 'cta'
  | 'richText' | 'steps' | 'stats' | 'testimonial' | 'logoCloud' | 'pricingTable' | 'codeSample' | 'cityFacts'
  | 'entryGrid' | 'relatedLinks' | 'sources' | 'callout' | 'leadForm' | 'tool';
type Block = /* discriminated union of the 22 shapes above */;
```

**Blocks allowed per type** (contract map; the admin palette shows only these):
- Every type allows `richText`, `callout`, `cta`, `relatedLinks`, `sources`, `screenshot`, `diagram`, `steps`.
- `hero`, `answerBox`, `featuresGrid`, `faq`, `comparisonTable`, `stats`, `testimonial`, `logoCloud` and `pricingTable` are allowed on PAGE, PRODUCT, INDUSTRY, SOLUTION, SERVICE, INTEGRATION, CITY, CITY_INDUSTRY, COMPLIANCE, COMPARE, ALTERNATIVE, BEST_OF and TOOL.
- `entryGrid` is allowed on PAGE, BLOG_CATEGORY, PERSON, CITY and INDUSTRY.
- `cityFacts` is allowed only on CITY and CITY_INDUSTRY.
- `codeSample` is allowed on DOC, BLOG_POST, GUIDE and SERVICE.
- `leadForm` is allowed on PAGE, SERVICE, SOLUTION and INDUSTRY.
- `tool` is allowed only on TOOL.

---

## 5. Entry data, menus, settings

### 5.1 `data` per entry type
Fields marked `*` are required at publish (`MISSING_DATA`).

```ts
type EntryData =
  | { type: 'PAGE'; template: 'home' | 'pricing' | 'hub' | 'default' | 'legal' | 'contact'; hubOf?: CmsEntryType }
  | { type: 'PRODUCT'; icon*: IconName; shortName*: string; benefit*: string; status: 'live' | 'beta'; planFeature?: PlanFeatureKey; appRoute?: string }
  | { type: 'INDUSTRY'; icon*: IconName; color*: string /* hex, ≥4.5:1 with white */; group*: string /* industry-groups key */;
      shortName*: string; shopNoun*: string /* "shops", "pharmacies" */; romanUrduName?: string; appIndustryKey?: string; signupParam?: string }
  | { type: 'SOLUTION'; icon*: IconName; shortName*: string; outcome*: string; segment?: string }
  | { type: 'SERVICE'; icon*: IconName; shortName*: string; areaServed*: 'PK' | 'worldwide'; pricingModel?: string; timeline?: string }
  | { type: 'INTEGRATION'; logoMediaId?: string; icon?: IconName; status*: 'live' | 'beta' | 'planned'; category*: string; vendorUrl?: string; verifiedAt?: string /* * when live */ }
  | { type: 'COMPLIANCE'; authority*: 'FBR' | 'PRA' | 'SRB' | 'KPRA' | 'BRA' | 'ICT' | 'DRAP' | 'OTHER'; sroRefs: string[]; effectiveDate?: string; penaltySummary?: string }
  | { type: 'CITY'; name*: string; province*: 'Punjab' | 'Sindh' | 'Khyber Pakhtunkhwa' | 'Balochistan' | 'Islamabad Capital Territory' | 'Gilgit-Baltistan' | 'Azad Kashmir';
      authority*: 'PRA' | 'SRB' | 'KPRA' | 'BRA' | 'ICT'; wikidataId*: string; geo?: { lat: number; lng: number };
      servicesTax?: { rate: string; appliesTo: string; source: Source };
      tier1Note?: string;
      markets: { name: string; area?: string; note: string }[];
      areas: { name: string; note: string }[];                    // H3s inside the hub, never URLs
      support: { onsite: boolean; note: string };
      nearbyCityIds: string[];                                     // CITY entry ids, 3 recommended
      staticMapMediaId?: string }
  | { type: 'CITY_INDUSTRY'; industryId*: string; evidence*: string /* case study id or "5+ real customers" note */ }
  | { type: 'BEST_OF'; category*: string; methodology*: Md;
      items*: { name: string; isNafaa: boolean; url?: string; price?: string; priceSource?: Source; strengths: string[]; weaknesses: string[]; bestFor: string }[] }
  | { type: 'COMPARE' | 'ALTERNATIVE'; competitorName*: string; competitorUrl*: string; verdict*: InlineMd; competitorPrice?: string; priceSource?: Source }
  | { type: 'BLOG_POST' | 'GUIDE'; toc: boolean; readingMinutes?: number /* computed */ }
  | { type: 'BLOG_CATEGORY'; icon?: IconName }
  | { type: 'GLOSSARY_TERM'; term*: string; definition*: string /* 1 sentence */; definitionRomanUrdu*: string; example?: Md; alsoKnownAs: string[] }
  | { type: 'TOOL'; toolKey*: ToolKey; kind*: string /* "GST", "Profit margin" */ }
  | { type: 'TEMPLATE'; fileMediaId*: string /* DOCUMENT */; format*: 'xlsx' | 'pdf' | 'docx' | 'csv' }
  | { type: 'CASE_STUDY'; customerId*: string /* CASE_STUDY consent */; results: { label: string; value: string; sourceNote: string }[] }
  | { type: 'PERSON'; name*: string; role*: string; photoMediaId?: string; sameAs: string[]; knowsAbout: string[] }
  | { type: 'DOC'; navTitle?: string; apiRef?: { method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; path: string } }
  | { type: 'CHANGELOG'; date*: string; version?: string; kind*: 'new' | 'improved' | 'fixed' };
```

Relations in the draft (`CmsEntry.relations`): `{ entryId: string; kind: 'TAG' | 'RELATED'; sortOrder: number }[]`. `MENTIONS` is never stored in the draft; it is computed at publish.

### 5.2 Menus (`CmsMenu.items`)

```ts
type MenuItem = {
  id: string;
  kind: 'entry' | 'url' | 'auto' | 'group';
  label?: string;                     // required for url/group; entry defaults to the entry's title
  entryId?: string;                   // kind=entry
  url?: string;                       // kind=url, absolute or site path
  auto?: { entryType: CmsEntryType; group?: string; featured?: boolean; limit: number; sort?: 'order' | 'title' };  // kind=auto
  description?: string; icon?: IconName;
  children?: MenuItem[];              // depth ≤ 3
};
```
Keys: `header`, `footer`, `legal`, `mobile`. An entry item whose entry is not published is dropped from the public layout, and the admin shows a warning.

### 5.3 Settings (`CmsSetting.value` by key)

```ts
// key "site"
interface SiteSettings {
  name: string; baseUrl: string; appUrl: string; signupUrl: string; demoPath: string;
  locales: string[];                                  // ["en"]
  whatsapp: { number: string; message: string } | null;
  logoMediaId?: string; defaultOgMediaId?: string;
  social: { network: 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'x' | 'tiktok' | 'playstore' | 'appstore' | 'other'; url: string; verified: boolean }[];
  footerNote?: string;
}
// key "entity"
interface EntitySettings {
  brandName: string; legalName?: string;
  disambiguatingDescription: string;                  // "Nafaa (nafaa.pk), Pakistani POS and business software; not NAFA Funds"
  description: string;
  foundingDate?: string; founderIds: string[];        // PERSON entry ids
  offices: { label: string; street: string; city: string; region: string; postalCode?: string; country: 'PK'; phone?: string; isHq: boolean }[];  // only real offices
  contact: { email?: string; phone?: string };
  compliance: Record<string, { text: string; evidenceRef: string }>;   // e.g. fbrPra: { text: "FBR & PRA approved POS integrator", evidenceRef: "..." }
  platforms: string[]; languages: string[];
  sameAs: string[]; wikidataId?: string;
}
// key "pricing"
interface PricingSettings {
  plans: Record<string /* plan slug */, { tagline?: string; highlight?: boolean; ctaLabel?: string; ctaHref?: string }>;
  featureLabels: Partial<Record<PlanFeatureKey, string>>;
  notes?: InlineMd;
}
// key "seo"
interface SeoSettings {
  titleTemplate: string;                              // "%s | Nafaa"
  titlePatterns: Partial<Record<CmsEntryType | `PAGE:${string}`, string>>;
  qualityGates: Partial<Record<CmsEntryType, { minWords: number; minFaqs?: number; similarityMax?: number }>>;
  officialDomains: string[];                          // fbr.gov.pk, pra.punjab.gov.pk, srb.gos.pk, kpra.kp.gov.pk, ...
  indexNowKey?: string;
}
// key "analytics"
interface AnalyticsSettings { gtmId?: string; clarityId?: string; claritySample: number; allowPlatformStats: boolean }
// key "industry-groups"
type IndustryGroups = { key: string; label: string; sortOrder: number }[];
```

---

## 6. Revalidation call (API → site)

```
POST {each URL in SITE_REVALIDATE_URLS}          e.g. https://nafaa.pk/api/revalidate
Content-Type: application/json
X-Nafaa-Timestamp: 1760950000                      (unix seconds)
X-Nafaa-Signature: sha256=<hex HMAC_SHA256(SITE_REVALIDATE_SECRET, `${timestamp}.${rawBody}`)>

{ "tags": ["page:en:/industries/pharmacy", "type:en:INDUSTRY", "sitemap", "llms"],
  "reason": "publish",           // publish | unpublish | schedule | faq | menu | settings | redirects | media | plans | customers | manual
  "entryId": "clx...",           // optional
  "revisionId": "clx..." }       // optional
```

**Site handler** (`apps/site/src/app/api/revalidate/route.ts`):
1. Read the raw body.
2. Reject with 401 when the timestamp is more than 300 s from now, or the signature doesn't match (`crypto.timingSafeEqual`).
3. Reject with 400 when `tags` is not a non-empty array of strings ≤ 256 chars.
4. Call `revalidateTag(tag)` for each tag, deduplicated. More than 200 tags → `revalidateTag('all')` only.
5. Respond `200 { ok: true, revalidated: number, at: ISO }`.

**API side** (`SiteRevalidationService`):
- 5 s timeout per call. On failure, retries after 1 s, 5 s and 30 s in the background.
- The result goes on the related `CmsRevision` (`revalidatedAt` or `revalidateError`).
- The publish endpoint waits for the first attempt only (≤ 5 s) and returns `revalidation: { ok: boolean; error?: string }`.

**Tag fan-out rules:** see ARCH 7.4.

**IndexNow** (A1): after publish or unpublish of an indexable entry, the URL is queued and the queue is POSTed once a minute to `https://api.indexnow.org/indexnow` with `{ host, key, keyLocation, urlList }`. This is skipped when `seo.indexNowKey` is empty or the site is not indexable.

---

## 7. Preview flow

1. The admin calls `POST /admin/marketing/cms/entries/:id/preview-link`, body `{ expiresInHours?: number /* 1-336, default 168 */ }`. It returns `{ url: "<SITE_PUBLIC_URL>/api/preview?token=<jwt>&path=<entry draft path with locale prefix>", expiresAt }`.
2. The token is HS256 signed with `CMS_PREVIEW_SECRET`: `{ sub: entryId, scope: 'cms-preview', exp }`. It holds no user data.
3. The site's `GET /api/preview?token&path` calls `GET /public/site/preview?token=...`. When the token is valid it runs `draftMode().enable()`, sets the httpOnly cookie `nafaa_preview` (the token, SameSite=Lax, Secure) and redirects to `path`. When invalid it returns 401 with a plain message.
4. In draft mode the page fetches `GET /public/site/preview?token=<cookie>&path=<path>` with `cache: 'no-store'` and renders the result (draft for the token's entry, published for anything else) with the PreviewBar ("Preview: not live", an exit link and expiry).
5. `GET /api/exit-preview` disables draft mode, clears the cookie and redirects to the same path.

---

## 8. Admin API (`/admin/marketing/cms`)

Common admin shapes:

```ts
interface AdminEntry {
  id: string; type: CmsEntryType; locale: string; translationKey: string | null;
  slug: string; path: string; parentId: string | null; status: CmsStatus;
  title: string; summary: string | null; blocks: Block[]; data: EntryData;
  relations: { entryId: string; kind: 'TAG' | 'RELATED'; sortOrder: number }[];
  faqIds: string[]; imageId: string | null;
  seoTitle: string | null; seoDescription: string | null; focusKeyword: string | null;
  canonicalUrl: string | null; noindex: boolean; nofollow: boolean; ogImageId: string | null; schemaExtra: object[] | null;
  seoScore: number | null; wordCount: number;
  authorId: string | null; reviewerId: string | null; factCheckedAt: string | null; factCheckedById: string | null;
  publishedPath: string | null; publishedAt: string | null; firstPublishedAt: string | null;
  contentUpdatedAt: string | null; publishAt: string | null; hasUnpublishedChanges: boolean;
  sortOrder: number; featured: boolean; version: number;
  createdById: string | null; updatedById: string | null; createdAt: string; updatedAt: string;
  // Resolved for the editor:
  refs: Record<string, { id: string; type: CmsEntryType; title: string; path: string; status: CmsStatus }>;  // every entry id used in relations/blocks/data/links
  mediaRefs: Record<string, PublicMedia>;
  liveUrl: string | null;             // absolute, when published
}
interface AdminEntryListItem {
  id: string; type: CmsEntryType; locale: string; title: string; path: string; status: CmsStatus;
  hasUnpublishedChanges: boolean; noindexReason: PublicSeo['robots']['reason'] | null;
  seoScore: number | null; wordCount: number; publishAt: string | null; publishedAt: string | null;
  updatedAt: string; authorName: string | null;
}
interface Issue {
  code: IssueCode; severity: 'error' | 'warning' | 'pass';
  field?: string;                      // e.g. "seoTitle", "blocks[3].caption", "data.wikidataId"
  blockId?: string; message: string;   // Roman Urdu + English terms, shown as is in the admin
}
type IssueCode =
  | 'MISSING_TITLE' | 'MISSING_SUMMARY' | 'MISSING_DATA' | 'INVALID_BLOCK' | 'BLOCK_NOT_ALLOWED' | 'HERO_NOT_FIRST'
  | 'HEADING_LEVEL' | 'UNKNOWN_TOKEN' | 'UNKNOWN_ICON' | 'BROKEN_LINK' | 'DUPLICATE_TITLE' | 'DUPLICATE_PATH'
  | 'TITLE_LENGTH' | 'DESCRIPTION_LENGTH' | 'FOCUS_KEYWORD' | 'WORDS_BELOW_GATE' | 'SIMILARITY' | 'FAQ_COUNT'
  | 'FAQ_ANSWER_LENGTH' | 'SUMMARY_LENGTH' | 'FEW_INTERNAL_LINKS' | 'REQUIRED_LINK' | 'ORPHAN' | 'NO_SOURCE'
  | 'NOT_FACT_CHECKED' | 'COMPETITOR_UNDATED' | 'NO_CONSENT' | 'TYPED_PRICE' | 'STALE' | 'NO_OG_IMAGE' | 'MEDIA_ALT';
interface SeoReport { score: number; issues: Issue[]; finalTitle: string; finalDescription: string; robots: PublicSeo['robots']; gate: { words: number; required: number | null; similarity?: number } }
```

**Hard errors (block publish):**
- Content and structure: `MISSING_TITLE`, `MISSING_SUMMARY` (money types), `MISSING_DATA`, `INVALID_BLOCK`, `BLOCK_NOT_ALLOWED`, `HERO_NOT_FIRST`, `HEADING_LEVEL`.
- References: `UNKNOWN_TOKEN`, `UNKNOWN_ICON`, `BROKEN_LINK`.
- Uniqueness: `DUPLICATE_TITLE`, `DUPLICATE_PATH`.
- Proof: `NO_SOURCE` (COMPLIANCE), `NOT_FACT_CHECKED` (COMPLIANCE, COMPARE, ALTERNATIVE, BEST_OF), `COMPETITOR_UNDATED`, `NO_CONSENT`.

All other codes are warnings. `WORDS_BELOW_GATE` and `SIMILARITY` don't block publish; they force `noindex`.

### 8.1 Entries

| Method + path | Permission | Body / query | Returns |
|---|---|---|---|
| `GET /entries` | view | `type?`, `status?`, `locale?`, `q?` (title/path search), `tag?`, `group?`, `gate?` (`below` \| `passed`), `sort?` (`updated` \| `title` \| `score`), `page`, `limit` | `Paginated<AdminEntryListItem>` |
| `GET /entries/lookup` | view | `q`, `types?` (comma), `limit?` (≤ 20), `locale?` | `{ id; type; title; path; status }[]` (pickers) |
| `GET /entries/:id` | view | — | `AdminEntry` |
| `POST /entries` | edit | `{ type; locale?; title; slug?; parentId?; data?; translationKey? }` (slug auto from title) | `AdminEntry` (status DRAFT, blocks seeded from the type's starter layout) |
| `PATCH /entries/:id` | edit | `{ version: number; …any subset of the editable AdminEntry fields }` | `{ entry: AdminEntry; seo: SeoReport }`, or 409 |
| `POST /entries/:id/validate` | view | — | `{ seo: SeoReport; canPublish: boolean }` |
| `POST /entries/:id/publish` | publish | `{ version: number; note?: string; contentUpdated?: boolean /* moves contentUpdatedAt to now */; publishFaqs?: boolean }` | `{ entry: AdminEntry; revisionId; revalidation: { ok; error? }; redirectCreated?: PublicRedirect }`, or 422 |
| `POST /entries/:id/schedule` | publish | `{ version; publishAt: ISO (future); note?; contentUpdated? }` | `{ entry; revisionId }`, or 422 |
| `POST /entries/:id/cancel-schedule` | publish | — | `{ entry }` |
| `POST /entries/:id/unpublish` | publish | `{ redirectTo?: string /* path or entry:<id> */; statusCode?: 301 \| 302 \| 410; note? }` | `{ entry; revalidation; redirectCreated? }` |
| `POST /entries/:id/archive` | publish | `{ redirectTo?; note? }` (unpublishes first if live) | `{ entry }` |
| `POST /entries/:id/restore-archive` | edit | — | `{ entry }` (back to DRAFT) |
| `DELETE /entries/:id` | publish | — (only DRAFT or ARCHIVED that were never published) | `204`, or 409 when it was ever published |
| `POST /entries/:id/duplicate` | edit | `{ title?; slug? }` | `AdminEntry` (new draft) |
| `POST /entries/:id/translations` | edit | `{ locale }` | `AdminEntry` (new draft, same `translationKey`, blocks copied) |
| `POST /entries/:id/preview-link` | view | `{ expiresInHours? }` | `{ url; expiresAt }` |
| `POST /entries/:id/fact-check` | edit | `{ note?: string }` | `{ entry }` (sets `factCheckedAt` = now, `factCheckedById` = user) |
| `GET /entries/:id/inbound` | view | — | `{ from: { id; type; title; path; kind: CmsRelationKind }[] }` (published index) |
| `GET /entries/:id/suggestions` | view | — | `{ id; type; title; path; reason: string }[]` (link suggestions) |
| `POST /entries/bulk` | publish | `{ ids: string[]; action: 'publish' \| 'unpublish' \| 'archive' }` | `{ results: { id; ok; issues?: Issue[] }[] }` |

**Path and slug rules:**
- `slug` matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 2-80 chars. PAGE home and the DOC root use `""`.
- The API computes `path` (ARCH 5.2) and rejects reserved first segments for PAGE (`api`, `_next`, `ur`, `sitemaps`, `indexnow`, and every type prefix).
- Changing `slug` or `parentId` on a live entry changes only the draft path. The redirect is created at publish.

### 8.2 Revisions

| Method + path | Permission | Returns |
|---|---|---|
| `GET /entries/:id/revisions` | view | `{ id; version; action; note; createdById; createdByName; createdAt; revalidatedAt; revalidateError }[]` |
| `GET /revisions/:revisionId` | view | `{ …row; snapshot: object }` |
| `GET /entries/:id/revisions/:revisionId/diff` | view | `{ fields: { field; before; after }[]; blocks: { id; change: 'added' \| 'removed' \| 'changed' \| 'moved'; before?; after? }[] }` against the current draft |
| `POST /entries/:id/revisions/:revisionId/restore` | publish | `{ entry }` (copies into the draft; not published) |
| `GET /history` | view | query `subject` (`MENU` \| `SETTING` \| `FAQ`), `key` → revision rows for menus, settings and FAQs |

### 8.3 FAQs

| Method + path | Permission | Body / query | Returns |
|---|---|---|---|
| `GET /faqs` | view | `locale?`, `topic?`, `status?`, `q?`, `page`, `limit` | `Paginated<AdminFaq>` (`AdminFaq` = row + `usedOn: { id; title; path }[]`) |
| `POST /faqs` | edit | `{ locale?; topic?; question; answer; sourceNote? }` | `AdminFaq` |
| `PATCH /faqs/:id` | edit | any of the above | `AdminFaq` (`hasUnpublishedChanges` when live) |
| `POST /faqs/:id/publish` | publish | — | `{ faq; revalidation }` (copies to `publishedQuestion/Answer`; revalidates pages using it) |
| `POST /faqs/:id/unpublish` | publish | — | `{ faq; revalidation }` |
| `DELETE /faqs/:id` | publish | — | `204` (409 while attached to a live entry) |
| `GET /faqs/topics` | view | — | `{ key; label; count }[]` |

### 8.4 Media

| Method + path | Permission | Body / query | Returns |
|---|---|---|---|
| `GET /media` | view | `kind?`, `tag?`, `q?` (alt/file name), `unused?`, `page`, `limit` | `Paginated<AdminMedia>` (`AdminMedia` = `PublicMedia` + `tags`, `folder`, `checksum`, `createdAt`, `altTranslations`) |
| `POST /media` | edit | `multipart/form-data`: `file` (≤ 10 MB images, ≤ 25 MB DOCUMENT/VIDEO), `alt` (required, 5-250 chars), `kind?`, `caption?`, `credit?`, `sourceUrl?`, `tags?` (comma), `folder?` | `AdminMedia`, or `409 { duplicateOf: AdminMedia }` on a checksum match |
| `PATCH /media/:id` | edit | `{ alt?; altTranslations?; caption?; credit?; sourceUrl?; tags?; focalX?; focalY?; kind? }` (alt can't be emptied) | `AdminMedia` |
| `POST /media/:id/replace` | edit | multipart `file` | `AdminMedia` (same id, new file, new blur and dimensions) |
| `GET /media/:id/usage` | view | — | `{ entries: { id; title; path; where: string }[]; customers: …; settings: string[] }` |
| `DELETE /media/:id` | edit | — | `204`, or 409 while used (soft delete with `deletedAt`, then Cloudinary destroy after 30 days) |

### 8.5 Redirects

| Method + path | Permission | Body / query | Returns |
|---|---|---|---|
| `GET /redirects` | view | `q?`, `source?`, `active?`, `pattern?`, `page`, `limit` | `Paginated<AdminRedirect>` (row + `warnings: ('chain' \| 'loop' \| 'target_unpublished' \| 'target_404')[]`) |
| `POST /redirects` | redirects | `{ fromPath; toPath?; statusCode: 301 \| 302 \| 410; isPattern?; note?; entryId? }` | `AdminRedirect` (chains are flattened and loops rejected with 422) |
| `PATCH /redirects/:id` | redirects | same fields + `isActive` | `AdminRedirect` |
| `DELETE /redirects/:id` | redirects | — | `204` |
| `POST /redirects/import` | redirects | `multipart` CSV (`from,to,status,note`) or JSON `{ rows: … }`, `dryRun?: boolean` | `{ created; updated; skipped; errors: { row; message }[] }` |
| `GET /redirects/export` | view | — | CSV |
| `GET /redirects/test` | view | `path` | `{ matched: AdminRedirect \| null; finalPath: string \| null; hops: string[]; servesEntry: { id; title } \| null }` |

Pattern syntax: `:name` matches one segment, and `*` is allowed only at the end. `toPath` may use `:name`. Example: `/lahore/:industry` → `/pos-software/lahore`. Exact rules win over patterns, and longer patterns win over shorter ones.

### 8.6 Menus

| Method + path | Permission | Body | Returns |
|---|---|---|---|
| `GET /menus` | view | `locale?` | `{ key; locale; title; items: MenuItem[]; updatedAt }[]` |
| `GET /menus/:key` | view | `locale?` | one menu + `resolved: MenuItemResolved[]` (preview) |
| `PUT /menus/:key` | edit | `{ locale?; title; items: MenuItem[] }` | menu (writes a `MENU` revision, revalidates `layout:<locale>`) |

### 8.7 Settings

| Method + path | Permission | Body | Returns |
|---|---|---|---|
| `GET /settings` | view | `locale?` | `{ site; entity; pricing; seo; analytics; industryGroups }` |
| `PUT /settings/:key` | settings | `{ locale?; value }` validated by the contract for that key | `{ key; value; updatedAt }` (`SETTING` revision; revalidates `layout`/`settings`/`llms` as relevant) |
| `GET /settings/preview/llms` | view | — | `{ llmsTxt: string; organizationJsonLd: object }` (rendered by the API with the same template as the site) |

`PUT /settings/pricing` cannot change prices. Prices stay in Admin → Plans (`/admin/plans`, SuperAdminGuard). After `create`/`update`/`remove` there, `AdminPlansService` calls `SiteRevalidationService.revalidate({ tags: ['plans', 'llms'], reason: 'plans' })`.

### 8.8 Customers and testimonials

| Method + path | Permission | Body | Returns |
|---|---|---|---|
| `GET /customers` | view | `q?`, `public?`, `page`, `limit` | `Paginated<AdminCustomer>` (row + logo + `testimonialsCount`) |
| `POST /customers` | edit | `{ name; slug?; logoId?; cityEntryId?; industryEntryId?; website?; tenantId?; notes? }` | `AdminCustomer` |
| `PATCH /customers/:id` | edit | same | `AdminCustomer` |
| `POST /customers/:id/consent` | publish | `{ scope: ('LOGO' \| 'NAME' \| 'QUOTE' \| 'CASE_STUDY' \| 'PHOTO')[]; consentAt: ISO; evidence: string (≥ 10 chars) }` | `AdminCustomer` (sets `verifiedById`/`verifiedAt` = current admin) |
| `POST /customers/:id/visibility` | publish | `{ isPublic: boolean }` (true needs consent) | `AdminCustomer` (revalidates `customers`) |
| `DELETE /customers/:id` | publish | — | `204` (409 while a live CASE_STUDY uses it) |
| `GET /testimonials` | view | `customerId?`, `status?`, `page`, `limit` | `Paginated<AdminTestimonial>` |
| `POST /testimonials` | edit | `{ customerId; locale?; personName; personRole?; quote; photoId?; sourceType; sourceUrl?; collectedAt? }` | `AdminTestimonial` |
| `PATCH /testimonials/:id` | edit | same | `AdminTestimonial` |
| `POST /testimonials/:id/publish` | publish | — | 422 `NO_CONSENT` unless the customer has `QUOTE` consent and `isPublic` |
| `POST /testimonials/:id/unpublish` | publish | — | `AdminTestimonial` |
| `DELETE /testimonials/:id` | publish | — | `204` |

### 8.9 Dashboard and maintenance

| Method + path | Permission | Returns |
|---|---|---|
| `GET /dashboard` | view | `{ byType: { type; draft; scheduled; published; noindex }[]; scheduled: { id; title; publishAt }[]; lastRevalidation: { at; ok; error? } }` |
| `GET /dashboard/health` | view | `{ items: { entryId; title; path; issues: Issue[] }[] }` (below gate, missing meta, duplicate titles, orphans, stale, broken links, consent missing, revalidation failures) |
| `POST /revalidate-all` | publish | `{ ok; error? }` (sends `all`) |
| `GET /config` | view | `{ types: { type; label; pathPattern; allowedBlocks; requiredData: string[]; starterBlocks: BlockType[] }[]; icons: string[]; diagramKinds: …; tokens: { token; example }[]; locales: string[]; siteUrl: string }` (drives the admin palette and forms) |

---

## 9. Existing endpoints the site reuses (no change)

| Endpoint | Used by |
|---|---|
| `POST /public/marketing/pageview` (`TrackPageviewDto`) | Analytics island, every page load and client navigation |
| `POST /public/marketing/event` (`TrackEventDto`) | `cta_click`, `signup_clicked`, `demo_submit`, `whatsapp_click`, `pricing_toggle`, `tool_used`, `outbound_click`, `form_start` |
| `POST /public/marketing/contact-form` (`SubmitContactFormDto`) | `leadForm` with `form: 'contact'` (services, manufacturing, enterprise, contact page) |
| `POST /public/marketing/demo-booking` (`BookDemoDto`) | `leadForm` with `form: 'demo'`, `/demo` |
| `POST /public/marketing/newsletter/subscribe` | Footer newsletter (only if the owner wants one) |
| `GET /plans` | Not used by the site. `/public/site/plans` wraps the same data with display settings |

Storage keys stay the same as `apps/api/public/nafaa-tracker.js` (`nafaa_vid`, `nafaa_sid`), so visitors keep their ids across the old and new site.

---

## 10. Hand-off checklist per side

- **API (A0-A2):**
  - Implement sections 2, 6, 7 and 8 with exactly these paths, shapes and permission names.
  - Public responses never include draft columns.
  - Every public-data write calls `SiteRevalidationService` with the fan-out in ARCH 7.4.
- **Admin (M1, M2):**
  - Build only against section 8 plus `GET /config`. Validate forms with the generated contract.
  - Show `Issue.message` as is.
  - Times in Asia/Karachi.
- **Site (S1-S5):**
  - Fetch only section 2 endpoints with section 2.2 tags.
  - Render blocks from section 4.
  - Never compute paths, prices or counts locally. Use `path`/`url`, `/plans`, `/stats` and resolved tokens.
