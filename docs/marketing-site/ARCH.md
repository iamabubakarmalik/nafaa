# nafaa.pk rebuild: architecture

Date: 20 Oct 2026. Inputs: `PLAN.md` (the SEO, content and phase plan), `technical.md`, `content.md`, `performance.md`, `market.md`, and a read of `apps/api`, `apps/admin`, `apps/web/src/design-system` and `apps/marketing`.

Companion files:
- `API-CONTRACT.md`: every endpoint, payload, block and tag. API, admin and site agents build against it.
- Schema: `apps/api/prisma/schema.prisma` (section "MARKETING CMS") and `apps/api/prisma/migrations/20261024100000_marketing_cms/migration.sql`.

This document replaces PLAN.md where they differ. PLAN.md assumed MDX files in `apps/marketing`. The owner now wants everything edited in `apps/admin`, so content lives in the database and the site reads it through the API. PLAN's SEO rules, URL map, location strategy and AEO list still apply unless this file says otherwise.

---

## 0. Decisions at a glance

| # | Decision | Why |
|---|---|---|
| D1 | New Next.js 15 App Router app at `apps/site`. `apps/marketing` is not touched until launch. | The live site keeps running. web/main deploys do not touch it. Cutover is one Vercel setting. |
| D2 | `apps/site` is a standalone pnpm project (own `pnpm-workspace.yaml` and lockfile), like `apps/marketing`. | The Vercel project installs only the site's dependencies, not expo/electron. Shared code comes in through sync scripts (D9). |
| D3 | All content lives in Postgres, in 11 `Cms*` tables. It is read through `GET /api/public/site/*` and edited through `/api/admin/marketing/cms/*`. | The owner edits everything in the admin panel with no code. |
| D4 | One generic `CmsEntry` model with a `type` enum (22 types). Industries, cities, posts, terms, people and docs are rows. | A new industry, city or post is a new row and needs no code. A new page type needs a template anyway, so it is an enum value plus a template. |
| D5 | Draft and live are kept apart. Entry columns hold the draft, `published` (JSON) holds the live snapshot, and the relation and FAQ tables are a published index rebuilt on publish. | The public API reads only published data. Editors can work on a live page without leaking drafts. |
| D6 | FAQs are a separate model (`CmsFaq` + `CmsEntryFaq`). The glossary is an entry type (`GLOSSARY_TERM`). | A FAQ has no URL and is reused on many pages; one edit has to update every page and its FAQPage schema. A glossary term has its own URL, SEO fields, schema and links, which is exactly what an entry is. |
| D7 | ISR plus on-demand revalidation. The API calls a signed `POST /api/revalidate` on the site after every publish, with precise cache tags. | Content changes go live in seconds with no redeploy, and pages stay static and fast. |
| D8 | Rich text is stored as Markdown (GFM) and rendered on the server through a fixed, sanitised pipeline. Components go in typed blocks between text blocks, not inside MDX. | Compiling MDX from a database means running stored code on every render. Blocks give editors the same layouts safely and stay typed. |
| D9 | One shared contract file (`packages/cms-contract/src/cms-contract.ts`, zod 4) holds block, data, menu and settings schemas. A sync script copies it into the API, admin and site. | The three apps validate the same shapes. A copy avoids changing how the API compiles (NodeNext, CommonJS dist). |
| D10 | Prices are never stored in the CMS. Pricing blocks, schema `offers` and `{{price:...}}` text tokens all read the `Plan` table. | "Never typed twice." Changing a plan in Admin → Plans updates the site through the `plans` tag. |
| D11 | Numbers on the site are either computed by the API (`stats` block metrics, `{{count:...}}` tokens) or written in text with a source. The `stats` block accepts no typed numbers at all. | No invented counts. |
| D12 | Customers, logos and testimonials need recorded consent in `CmsCustomer` (scope, date, evidence). The API refuses to publish without it, and the blocks render nothing when there is nothing real. | "Real only." |
| D13 | Thin-page protection lives in the API: per-type word gates, a 5-gram similarity check between city hubs, and required data per type. A page below the gate can be published but is forced to `noindex` and kept out of the sitemap. | Stops the 372-doorway-page problem coming back as new cities and industries are added. |
| D14 | Redirects are rows in `CmsRedirect`. The site loads the whole table (cached under the `redirects` tag) and checks it only when a path is not found. | No middleware cost on normal pages, and new redirects work with no redeploy. |
| D15 | No animation library. Reveal uses CSS scroll-driven animations (zero JS). Looping diagram motion is CSS keyframes paused until a 1 KB IntersectionObserver island marks the element in view. `prefers-reduced-motion` turns all of it off. | Lighthouse 95-100 on low-end Android, and the first viewport is never hidden. |
| D16 | Images live on Cloudinary (the API already has `CloudinaryService`). `next/image` uses a Cloudinary loader (`f_auto,q_auto,w_*`), so visitors get AVIF/WebP and blur placeholders are stored in the DB. | No Vercel image-optimisation cost, the right format per browser, and no layout shift. |
| D17 | CMS access reuses the marketing admin guards: `JwtAuthGuard` + `MarketingAdminGuard` + `MarketingPermissionsGuard`, with 5 new `marketing.cms.*` permissions. | It is the guard the admin panel's marketing area already uses. Only `SUPER_ADMIN` can log in to apps/admin today, so in practice only platform admins reach it. |
| D18 | Light theme at launch. Dark "ink" sections are used for contrast bands, and tokens are ready for a dark theme later. | Fewer bytes and one theme to QA. See owner decision O8. |

---

## 1. Constraints carried from the owner and memory

- nafaa has live production users. The migration is additive only (new enums and tables). Nobody runs `prisma migrate deploy`, `db push`, `diff` or `reset`, and nobody runs the seed against prod, without the owner's go-ahead.
- `apps/marketing` stays live and unchanged until cutover. Phase 0 hotfixes from PLAN can still ship on it.
- Code comments and file headers are in plain professional English. UI text in the admin is simple Roman Urdu with business terms in English (Sale, Profit, Discount; never "chhoot"). Site body copy is English, with Roman Urdu summary boxes and FAQ items on money pages (PLAN 3.1).
- Owner facts: plans are Rs 0 / 1,500 / 3,500 / 9,500 (they match the `Plan` seed). The compliance wording is exactly "FBR & PRA approved POS integrator". No made-up ratings, counts or customers.
- The server runs in UTC. Scheduled-publish times are entered and shown in Asia/Karachi and stored in UTC (`business-time.helper` rule).

---

## 2. Topology and deployment

```
                    ┌─────────────────── apps/admin (Vite, admin.nafaa.pk) ───────────────────┐
                    │ Marketing → Website: entries, blocks, SEO, media, menus, redirects, ... │
                    └───────────────┬─────────────────────────────────────────────────────────┘
                                    │ Bearer JWT (SUPER_ADMIN or MarketingAdmin)
                                    ▼
┌──────────── apps/api (NestJS, api.nafaa.pk/api) ────────────┐        ┌── Cloudinary ──┐
│ /admin/marketing/cms/*   CRUD, publish, schedule, preview   │──────▶ │ nafaa/site/*   │
│ /public/site/*           published read API (no auth)       │        └───────▲────────┘
│ /public/marketing/*      existing tracking + lead forms     │                │ f_auto,w_*
│ Postgres: Cms* tables, Plan                                 │                │
└──────────┬──────────────────────────────────────▲───────────┘                │
           │ POST /api/revalidate (HMAC)           │ fetch (ISR data cache, tags)
           ▼                                       │                           │
┌──────────────────────── apps/site (Next 15, Vercel) ────────────────────────┴───────┐
│ Static/ISR pages, sitemap index, llms.txt, OG images, preview (draft mode)          │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Vercel**
- **Before launch:** a new Vercel project `nafaa-site` with root `apps/site`, deployed to a staging domain (for example `site-staging.nafaa.pk` or the `*.vercel.app` URL). It is noindexed by `SITE_INDEXABLE=false`, which makes robots.txt disallow everything and adds `X-Robots-Tag: noindex`. It points at the staging API first, then at the prod API (read-only public endpoints) once the CMS has content.
- **At launch:** in the existing marketing Vercel project (the one that serves `nafaa.pk`), change Root Directory from `apps/marketing` to `apps/site`, add the env vars below, set `SITE_INDEXABLE=true` and redeploy. Domains, certificates and analytics stay. Rollback is Vercel instant rollback to the last `apps/marketing` deployment.
- **Before launch, import redirects:** PLAN section 5 and section 8 plus PLAN Phase 0 A3 go into `CmsRedirect` through the seed. F4 (Phase 6) checks them against the GSC page export.
- **Before cutover, confirm the branch:** check which git branch the marketing Vercel project builds from (PLAN Phase 0). `apps/site` must be on that branch at cutover.

**Environment variables**

| Var | Where | Purpose |
|---|---|---|
| `CMS_API_URL` | site | `https://api.nafaa.pk/api`, used server-side only |
| `NEXT_PUBLIC_API_URL` | site | Same base, used by the analytics and lead-form islands |
| `SITE_URL` | site | `https://nafaa.pk`, `metadataBase` and absolute URLs |
| `SITE_INDEXABLE` | site | `false` on staging |
| `SITE_REVALIDATE_SECRET` | site + api | HMAC secret for `/api/revalidate` |
| `CLOUDINARY_CLOUD_NAME` | site | Image loader |
| `SITE_REVALIDATE_URLS` | api | Comma list, for example `https://nafaa.pk/api/revalidate,https://site-staging.nafaa.pk/api/revalidate` |
| `SITE_PUBLIC_URL` | api | Used to build absolute URLs in responses, preview links and IndexNow |
| `CMS_PREVIEW_SECRET` | api | Signs preview tokens |
| `CLOUDINARY_*` | api | Already present |

---

## 3. Folder structure and ownership map

```
packages/cms-contract/                      Source of truth for shapes (zod 4, one file)
  src/cms-contract.ts
scripts/sync-cms-contract.mjs               Copies the contract into api/admin/site (+ --check for CI)

apps/api/src/admin-marketing/cms/
  cms.module.ts                             Registered in admin-marketing.module.ts
  contract/cms-contract.ts                  GENERATED copy, do not edit
  paths/        route map, path computation, slug rules, reserved slugs
  content/      token resolver ({{price:..}}), entry-link resolver (entry:<id>), word count, MENTIONS extraction
  entries/      admin CRUD, lookup/search, duplicate, translations
  publishing/   publish/unpublish/schedule/restore, snapshot, published index rebuild,
                auto-redirect on path change, scheduler (cron every minute)
  revisions/    list/get/diff/restore
  seo/          seo score, quality gates, similarity (5-gram), title uniqueness
  preview/      signed preview tokens
  revalidation/ site revalidation client (HMAC, retries), IndexNow ping
  public/       /public/site/* controller + service + in-memory LRU cache
  media/        upload (Cloudinary, blur, dimensions, checksum), update, usage, delete
  faqs/  redirects/  menus/  settings/  customers/ (customers + testimonials)  dashboard/ (health report)

apps/api/prisma/seed-marketing-cms/         Seed script + fact-checked content data files
  index.ts  lib/  content/<area>/*.ts

apps/admin/src/api/marketing/marketing-cms.api.ts
apps/admin/src/features/marketing/cms/
  contract/cms-contract.ts                  GENERATED copy
  routes.tsx                                All Website routes (wired into App.tsx)
  dashboard/ entries/ editor/ editor/panels/ blocks/ fields/
  media/ faqs/ menus/ redirects/ settings/ customers/

apps/site/
  package.json  pnpm-workspace.yaml  next.config.ts  tailwind.config.ts  postcss.config.mjs
  tsconfig.json  .env.example  lighthouserc.json  eslint.config.mjs
  scripts/      sync-tokens.mjs, capture/ (Playwright screenshots), check-budgets.mjs,
                seo-crawl.mjs, uniqueness.mjs
  public/       favicon set, logo.svg, IndexNow key is served by a route, not a file
  src/
    app/
      layout.tsx  page.tsx  not-found.tsx  error.tsx  robots.ts  opengraph-image.tsx
      [...slug]/page.tsx                     PAGE entries (about, contact, legal, marketplace, ...) + redirect fallback
      pricing/  product/  product/[slug]/  industries/  industries/[slug]/
      solutions/ solutions/[slug]/  services/ services/[slug]/  integrations/ integrations/[slug]/
      compliance/ compliance/[slug]/  pos-software/ pos-software/[city]/ pos-software/[city]/[industry]/
      best/ best/[slug]/  compare/ compare/[slug]/  alternatives/[slug]/
      blog/ blog/[slug]/ blog/category/[slug]/ blog/feed.xml/
      guides/ guides/[slug]/  glossary/ glossary/[slug]/  tools/[slug]/  templates/ templates/[slug]/
      customers/ customers/[slug]/  team/[slug]/  changelog/ changelog/[slug]/  developers/[[...slug]]/
      faq/                                   FAQ hub (all published FAQs by topic)
      sitemap.xml/route.ts  sitemaps/[file]/route.ts  llms.txt/route.ts  llms-full.txt/route.ts
      indexnow/[key]/route.ts                IndexNow key file; next.config rewrites /<key>.txt here
      api/revalidate/route.ts  api/preview/route.ts  api/exit-preview/route.ts
      _dev/sections/page.tsx                 Block gallery (404 in production)
    templates/    one folder per template (home, pricing, hub, product, industry, solution, service,
                  city, compliance, bestof, compare, article, glossary, person, docs, tool);
                  route files stay thin and call these
    components/
      ui/         primitives
      layout/     Header, MegaMenu, MobileNav (island), Footer, Breadcrumbs, PreviewBar
      blocks/     one file per block type + BlockRenderer.tsx registry + rich-text/
      diagrams/   SVG diagram components + registry
      frames/     BrowserFrame, PhoneFrame, TabletFrame, DesktopFrame, ReceiptFrame, Screenshot
      motion/     MotionObserver (island)
      islands/    PricingToggle, LeadForm, CodeCopy, ConsentBanner, Analytics, CommandSearch, tools/*
      seo/        JsonLd
    lib/
      cms/        contract/ (generated), client.ts (fetchers), tags.ts, redirects.ts, preview.ts
      seo/        metadata.ts, graph.ts (one @graph builder per template), breadcrumbs.ts
      llms/       render.ts
      media.ts    Cloudinary loader + <CmsImage>
      icons.ts    server-only lucide map
      analytics.ts
    styles/       tokens.css (GENERATED), globals.css, motion.css
```

Rule: an agent writes only inside the folders it owns (section 15). A GENERATED file is changed only by its sync script.

---

## 4. Design system

### 4.1 Tokens shared with apps/web
- **Source:** `apps/web/src/design-system/styles/tokens.css` (brand scale as RGB channels, `--brand-50…950`, Inter/Noto Naskh/JetBrains stacks, surfaces).
- **Sync:** `apps/site/scripts/sync-tokens.mjs` copies the `:root` brand scale, font stacks and surface variables into `apps/site/src/styles/tokens.css`, with a GENERATED header. It drops the app-only parts (density, shell, dark, print). CI runs it with `--check`.
- **Tailwind 3.4.17** (the repo's version) maps colors to the variables the same way apps/web does: `brand-*` = `rgb(var(--brand-N) / <alpha-value>)`. Neutrals use Tailwind `slate`. `ink` = slate-950 for dark bands.
- **Contrast:** green text on white uses `brand-700` (#047857, about 5.5:1). `brand-600` is used only for fills with white text. No raw hex values and no inline `style` in components. An ESLint rule (`no-restricted-syntax` for `style=` and hex literals in `className`) enforces this.

### 4.2 Type, spacing, radius, elevation (site-only scale tokens in `globals.css`)

| Token | Size (clamp) | Line height | Weight / tracking | Use |
|---|---|---|---|---|
| `display` | `clamp(2.5rem, 1.6rem + 3.6vw, 4.5rem)` | 1.05 | 650 / -0.035em | Home hero only |
| `h1` | `clamp(2.125rem, 1.5rem + 2.5vw, 3.5rem)` | 1.1 | 650 / -0.03em | Page H1 |
| `h2` | `clamp(1.75rem, 1.35rem + 1.6vw, 2.5rem)` | 1.15 | 650 / -0.02em | Section titles |
| `h3` | `clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem)` | 1.3 | 600 / -0.01em | Cards, sub-sections |
| `body-lg` | `clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)` | 1.6 | 400 | Lead paragraphs, AnswerBox |
| `body` | `1rem` | 1.65 | 400 | Body |
| `small` | `0.875rem` | 1.5 | 400/500 | Captions, meta |
| `eyebrow` | `0.75rem`, uppercase | 1.4 | 600 / 0.08em | Section labels |

- **Font:** Inter variable through `next/font/google` (latin subset, `display: swap`, one preloaded file, `font-feature-settings: "cv11","ss01"`). Mono uses the system stack. Noto Naskh is loaded only under `/ur`.
- **Spacing:** Tailwind's 4 px scale, plus `--section-y: clamp(4rem, 3rem + 4vw, 8rem)` and `--gutter: clamp(1.25rem, 0.75rem + 2vw, 2rem)`. Container is `72rem` and prose is `68ch`.
- **Radius:** `sm` 6 px, `md` 10 px, `lg` 14 px, `xl` 20 px, `full`. Screenshot frames use `lg`.
- **Elevation:** 3 shadows (`e1` hairline + 1 px, `e2` card hover, `e3` floating frame), all low-alpha slate. Borders `slate-200`.
- **Icons:** lucide only. CMS stores icon names as strings. `lib/icons.ts` (server-only) maps a name to a lucide component from the `icons` export, so it costs no client JS. An unknown name falls back to `Circle` and the API rejects it at publish (the contract holds the allowed list).

### 4.3 Components (server components unless marked island)
- **Primitives (`components/ui`):** Container, Section (theme: default/muted/ink), Heading (level + visual size kept separate, so H-structure stays correct), Text, Eyebrow, Button/LinkButton (variants primary, secondary, ghost, on-ink), Badge, Card, LinkCard, Icon, Prose, Table, Kbd, Divider, Breadcrumbs, VisuallyHidden, Skeleton (for islands only).
- **Layout:** Header with server-rendered mega menus. It uses `<details>` plus CSS hover, and a 1 KB island adds keyboard support and close-on-outside-click. Also MobileNav (island; it reads link data already in the HTML), Footer (server sitemap from the `footer` menu), PreviewBar (draft mode only) and ConsentBanner (island).
- **Blocks:** one component per block type in API-CONTRACT section 4, rendered by `BlockRenderer`. Each block decides its own heading level from its position (the H1 belongs to the hero or the template).
- **Islands (all lazy, ≤ 10 KB of page JS on content pages):** MotionObserver, Analytics, ConsentBanner, MobileNav, MegaMenuKeys, PricingToggle, LeadForm, CodeCopy, CommandSearch (loads on click) and Tools (one island per calculator, ≤ 15 KB each).

### 4.4 Motion system
- **Tokens:** `--ease-out: cubic-bezier(.16,1,.3,1)`, `--ease-in-out: cubic-bezier(.65,0,.35,1)`, durations `--d-fast 150ms`, `--d-base 250ms`, `--d-slow 450ms`, `--d-draw 1200ms`.
- **Reveal (zero JS):**
  - Mechanism: elements with `data-reveal` (fade-up, fade, scale, stagger children) use `animation-timeline: view(); animation-range: entry 0% entry 60%`. The rule sits inside `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`.
  - Elements already on screen at load are past their range, so they render in the final state, and LCP is never delayed.
  - Browsers without scroll-driven animation show static content. Nothing in SSR HTML has `opacity:0`.
- **Looping motion (diagrams, flowing packets, typing cursor):**
  - CSS keyframes on `transform`, `opacity` and `stroke-dashoffset` only.
  - Default `animation-play-state: paused`. `MotionObserver` (one island, about 1 KB, mounted once in the root layout) watches `[data-animate]` and sets `data-inview` while the element is visible, which runs the animation. It pauses on `visibilitychange`.
  - At most 3 looping animations are visible at once (a design-review rule).
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` sets `animation: none` and `transition: none`. Diagrams then show their final, fully drawn state. This is tested in the `_dev` gallery.
- **Interactions:** CSS transitions only (hover lift on cards, link underline, button press). No scroll-jacking, parallax or cursor effects.
- **Hero rule:** the H1, the answer text and the hero screenshot never animate. Only a decorative diagram next to them may animate.

### 4.5 Diagrams (code-drawn, animated SVG)
- **Location:** `components/diagrams/`. Each diagram is a server component that returns inline SVG with a `viewBox`, `role="img"`, `<title>` and `<desc>` (from the block caption), and text labels as real `<text>` taken from block props, so labels are editable in Roman Urdu or English.
- **Drawing:** paths use `pathLength="1"` with `stroke-dasharray: 1; stroke-dashoffset: 1 → 0` for "draw on reveal". Moving packets are small circles with `offset-path: path(...)` and `offset-distance` keyframes. Colors come from tokens (brand, slate, accent per industry through a CSS variable set on the block).
- **Responsive:** each diagram has a horizontal layout (≥ 768 px) and a vertical one (`<svg>` swapped by a CSS media query), so labels stay readable on phones. There is no JS layout.
- **Registry (bespoke kinds, code):**
  - `offline-sync`: device, offline queue, cloud, other branch.
  - `fbr-invoice`: POS sale, Nafaa, FBR/PRA, fiscal number, QR on receipt.
  - `khata-cycle`: udhaar sale, WhatsApp reminder, payment, balance.
  - `multi-branch`: HQ stock and branches with transfers.
  - `order-to-cash`: order booker, warehouse, dispatch, invoice, collection.
  - `store-sync`: Shopify / online store / Nafaa Bazaar, stock, orders.
  - `api-webhooks`: your app, API v1, Nafaa, webhooks.
  - `service-process`: discover, design, build, launch, support.
- **Data-driven kinds (no code needed to make new ones):**
  - `flow`: 2-8 nodes plus edges, auto-laid out in a row or column.
  - `hub`: a centre node plus 3-8 spokes.
  - `timeline`: 2-6 dated steps.

  The editor fills nodes, edges, labels and icons in the admin.
- **Adding a bespoke kind:** this is a code change by design (a new component and a contract enum value). Editors pick and caption diagrams; they don't draw them.

### 4.6 Screenshot frames
- **Frames:** `BrowserFrame` (address bar showing `app.nafaa.pk/...`, traffic lights drawn in CSS), `PhoneFrame` (neutral Android shape), `TabletFrame`, `DesktopFrame` (Windows app chrome) and `ReceiptFrame` (80 mm thermal paper edge with a torn bottom, for the FBR receipt screenshot). All are CSS and SVG, with no frame images.
- **Callouts:** numbered markers placed by percentage coordinates from the block, plus an ordered legend list under the image (accessible, and still readable when the image is small).
- **Source of screenshots:** `apps/site/scripts/capture/` is a Playwright script.
  - It runs against the staging app with a seeded demo shop per industry (Grocery, Bakery, Pharmacy, Restaurant, Mobile, Garments, khata, reports, FBR receipt), with Roman Urdu UI where the app uses it.
  - It captures at 2x DPR into PNG, then uploads to the media library through `POST /admin/marketing/cms/media`.
  - Uploads use `kind=SCREENSHOT`, tags `industry:<key>` and `feature:<key>`, and alt text from a manifest file. A screenshot without alt text is not uploaded.
  - It re-runs after app UI changes, and the media `replace` endpoint keeps the same media id, so pages update without edits.

### 4.7 Image pipeline
- **Storage:** Cloudinary folder `nafaa/site/<kind>/`.
  - The original is stored without the incoming `quality/fetch_format` transformation that `CloudinaryService.uploadBuffer` applies today. The media service passes its own options, so screenshots stay lossless at the source.
  - At upload the API records width, height, bytes, SHA-1 checksum (duplicate guard), dominant color and `blurDataUrl`.
  - The blur placeholder is a 16 px `f_webp,q_30,e_blur:200` derivative fetched once and stored as base64. No `sharp` is needed in the API.
- **Delivery:** `<CmsImage>` wraps `next/image` with a custom loader that builds `https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_limit,w_<w>/<publicId>`.
  - `f_auto` serves AVIF or WebP by the `Accept` header.
  - `sizes` is a required prop (TypeScript). `placeholder="blur"` uses the DB value.
  - Hero images are `priority` with `fetchPriority="high"`, and everything else is lazy.
  - The SEO panel warns when the hero image's delivered width-1080 AVIF is over 60 KB.
- **Local assets:** logo and favicons sit in `public/`. Inline SVG is used for the logo in the header.
- **OG images:** each dynamic route has an `opengraph-image.tsx` (Node runtime, `next/og`). It renders a branded 1200×630 card with the logo, a type eyebrow ("Industry", "Compare", ...), the title, the industry color or icon, and an optional framed screenshot crop. When the entry has `ogImage`, the card shows that image full-bleed instead. The Inter 600 TTF is bundled in `src/assets/fonts`. OG images are cached with the page and revalidated by the same tags.
- **Branded imagery:** Nafaa-branded images are code-drawn diagrams, framed real screenshots, OG cards and a subtle brand grid pattern (CSS). No stock photos, and shop photos only when supplied by the owner with consent.

### 4.8 Performance budget (PLAN 3.3, unchanged except where noted)
- **First Load JS:** ≤ 110 KB gz on content pages and ≤ 150 KB on tool and pricing pages. Page-specific JS ≤ 10 KB.
- **HTML and DOM:** HTML ≤ 60 KB gz. DOM ≤ 1,000 nodes (home ≤ 1,200).
- **Third parties:** GTM only, after consent or after `load` + 3 s idle. The GTM id comes from CMS settings `analytics`. Clarity runs on a 10% sample, if used.
- **Rendering rules (CMS-driven):**
  - Every page route exports `revalidate = 86400` (a safety net; tags do the real work), and `dynamicParams = true` so new entries appear without a redeploy. `generateStaticParams` prebuilds all published paths.
  - Unknown paths call `notFound()`, and because there is no root `loading.tsx` and no Suspense above content, the status is a real 404.
  - Pages never call `cookies()` or `headers()`. Only `draftMode()` is used, which keeps them static.
- **Checks:** LH CI on one URL per template (section 15, Q1).

---

## 5. Content model

### 5.1 Models (11 tables, 5 enums)

| Model | Role |
|---|---|
| `CmsEntry` | Every page. Draft columns (title, summary, blocks, data, relations, faqIds, SEO fields) plus the live snapshot (`published`, `publishedPath`, `publishedAt`, `contentUpdatedAt`), scheduling (`publishAt`, `scheduledRevisionId`), people (`authorId` and `reviewerId` → PERSON entries), fact-check stamp, `parentId` tree, optimistic `version`. |
| `CmsRevision` | History. Entry revisions (`entryId`) plus menu, setting and FAQ history (`subject`/`subjectKey`). Records the revalidation result per change. |
| `CmsEntryRelation` | Published index of entry→entry links: `TAG` (subject tags, such as industry, city, product or category), `RELATED` (hand-picked cards) and `MENTIONS` (links found in text at publish). |
| `CmsFaq` | A reusable question and answer with its own draft/publish. |
| `CmsEntryFaq` | Published index of which FAQs each entry shows, in order. |
| `CmsMedia` | Media library with required alt text, dimensions, blur, focal point, tags and checksum. |
| `CmsRedirect` | 301 / 302 / 410 rules with patterns, a target entry and hit counts. |
| `CmsMenu` | Header, footer, legal and mobile menus as a JSON tree per locale. |
| `CmsSetting` | JSON documents per key and locale: `site`, `entity`, `pricing`, `seo`, `analytics`, `industry-groups`. |
| `CmsCustomer` | A real business, with consent scope, date, evidence, verifier and optional `tenantId`. |
| `CmsTestimonial` | A quote from a customer, with source and status. |

**Reused, not duplicated:**
- `Plan`: prices and plan features.
- `MarketingAdmin`: CMS roles.
- `MarketingLead`, `ContactFormSubmission`, `DemoBooking`, `NewsletterSubscriber`: forms post to the existing public endpoints.
- `MarketingPageView` and `MarketingEvent`: analytics.
- `SeoPage`: on publish, the API upserts one row per published path (title, description, canonical, word count, `hasStructuredData`), so the existing SEO screen and its GSC fields finally cover real pages.
- `BlogPostAnalytics`: on publish of BLOG_POST or GUIDE, the API upserts the slug, title, category, author and date. Today nothing writes this table.
- `CloudinaryService`: media upload.

**Not added:**
- No separate author table: authors are PERSON entries with URLs, so `/team/{slug}` and Person schema come for free.
- No area table: areas are never URLs (PLAN 5), so they live in the CITY entry's `data.areas`.
- No menu-item table: menus are small trees always read whole.

### 5.2 Entry types, routes and templates

| Type | Public path | Template | Notes |
|---|---|---|---|
| PAGE | `/` + parent chain + slug (home has slug `""`) | Home, Pricing, Hub, Default, Legal, Contact (by `data.template`) | Hubs (`/industries`, `/product`, `/blog`, ...) are PAGE entries; their lists come from `entryGrid` blocks |
| PRODUCT | `/product/{slug}` | Product | |
| INDUSTRY | `/industries/{slug}` | Industry | Keeps existing slugs (`kiryana`, `mobile-shop`, `carpet`, ...) |
| SOLUTION | `/solutions/{slug}` | Solution | |
| SERVICE | `/services/{slug}` | Service | `data.areaServed` PK or worldwide |
| INTEGRATION | `/integrations/{slug}` | Product (integration variant) | `data.status` live/beta/planned; planned is forced noindex |
| COMPLIANCE | `/compliance/{slug}` | Compliance | Needs ≥ 1 official source + fact-check stamp |
| CITY | `/pos-software/{slug}` | CityHub | Structured `data`: authority, tax, markets, areas, support, nearby, Wikidata |
| CITY_INDUSTRY | `/pos-software/{city}/{slug}` | CityHub (pair variant) | Parent is a CITY. Needs `data.evidence`. Launch with 0 |
| BEST_OF | `/best/{slug}` | BestOf | Needs methodology + dated competitor prices |
| COMPARE | `/compare/{slug}` | Compare | Competitor facts need `checkedAt` + source |
| ALTERNATIVE | `/alternatives/{slug}` | Compare (alternative variant) | |
| BLOG_POST | `/blog/{slug}` | Article | TOC, author, reviewer |
| BLOG_CATEGORY | `/blog/category/{slug}` | Hub (category) | noindex while it has < 3 posts |
| GUIDE | `/guides/{slug}` | Article (pillar) | |
| GLOSSARY_TERM | `/glossary/{slug}` | GlossaryTerm | DefinedTerm in DefinedTermSet |
| TOOL | `/tools/{slug}` | Tool | `data.toolKey` picks the island |
| TEMPLATE | `/templates/{slug}` | Article (download) | `data.fileMediaId` is a DOCUMENT |
| CASE_STUDY | `/customers/{slug}` | Article (case study) | Needs customer CASE_STUDY consent |
| PERSON | `/team/{slug}` | Person | Author/reviewer of other entries |
| DOC | `/developers/{parent chain}/{slug}` | Docs (sidebar tree from parents) | Root doc has slug `""` → `/developers` |
| CHANGELOG | `/changelog/{slug}` | Article (short) | Index is a PAGE at `/changelog` |

`/ur/...` is the same set with the `ur` locale (Phase 5). The path is stored without the locale prefix, and the API adds it.

### 5.3 Draft, publish, schedule, preview
1. **Save:** editors edit the draft (`PATCH`, autosave with a 2 s debounce, `version` check → 409 on conflict). Each save recomputes `path`, `wordCount` and `seoScore`, sets `hasUnpublishedChanges` when the entry is live, and writes at most one `SAVE` revision per editor per 10 minutes.
2. **Validate:** this is a dry run of the publish checks and returns issues (errors block, warnings don't).
3. **Publish:**
   - Runs the checks and freezes a snapshot (draft fields + resolved computed fields) into `published` and a `PUBLISH` revision.
   - Rebuilds `CmsEntryRelation` (TAG and RELATED from `relations`, MENTIONS from `entry:` links in blocks) and `CmsEntryFaq`.
   - If the path changed, creates a `SLUG_CHANGE` redirect old → new and repoints redirects that targeted the old path.
   - Upserts `SeoPage` (and `BlogPostAnalytics` for posts), then revalidates (section 7.4) and pings IndexNow when indexable.
4. **Schedule:** freezes the snapshot into a `SCHEDULE` revision, sets `status=SCHEDULED` and `publishAt`. A cron in `publishing/` runs every minute and publishes that revision. Editing the draft afterwards does not change what goes live; scheduling again replaces it.
5. **Unpublish/archive:** clears `published` and `publishedPath` and revalidates. The admin asks for a redirect target and suggests the parent hub.
6. **Restore:** copies a revision snapshot into the draft (it is not published until the editor publishes).
7. **Preview:** the admin asks the API for a signed preview link (default expiry 7 days; shareable with people who have no admin login). The site enables Draft Mode and renders the draft through the preview endpoint with `no-store`, under a visible "Preview" bar.

### 5.4 Relations and internal linking
- **Tags (TAG):** these say what an entry is about (a post about pharmacy and Lahore, an industry using the inventory product). They drive "posts about this industry" lists, hub filters, city hub industry lists and the revalidation fan-out.
- **Related (RELATED):** hand-picked cards shown in `relatedLinks` blocks. The SEO panel shows PLAN section 4's required-links checklist per type, for example: Industry needs 4-6 products, 2 related industries, 1 solution, 2-3 posts or guides, 1 compare/best page, and the compliance page.
- **Mentions (MENTIONS):** links in rich text are stored as `entry:<id>` (the editor's link picker inserts them) and resolved to the current path at read time, so slug changes never break links. At publish they are indexed for inbound-link counts. The dashboard lists indexable pages with fewer than 3 inbound links (orphans).
- **Breadcrumbs:** computed by the API from type and parent: Home › Hub › [parent] › page. Rendered as `<a>` links plus BreadcrumbList.

### 5.5 Quality gates (stop thin pages coming back)
- **Configurable gates:** they live in settings `seo.qualityGates`. Defaults (main-content words, which exclude nav, footer and FAQs shared with more than one entry):
  - INDUSTRY 700, CITY 700, CITY_INDUSTRY 900 + evidence.
  - PRODUCT 600, SOLUTION 600, SERVICE 500.
  - COMPLIANCE 900 + source + fact-check, COMPARE 900 + `checkedAt`, ALTERNATIVE 800, BEST_OF 1,200 + methodology.
  - BLOG_POST 800, GUIDE 1,500, GLOSSARY_TERM 120, CASE_STUDY 500, TOOL 300, TEMPLATE 200, PERSON 80.
- **Similarity:** for CITY and CITY_INDUSTRY, a 5-gram Jaccard similarity of main text against every other published entry of the same type must be < 0.50 (PLAN 5).
- **Below gate:** the entry can still be published (so editors can share a URL), but the snapshot gets `robots.index=false`, the sitemap leaves it out and the admin shows "Live, noindex: 412/700 words".
- **Hard errors that block publish:**
  - Missing title, or summary for money types.
  - Duplicate final title among indexable published entries.
  - Broken `entry:` links.
  - Unknown tokens or icons.
  - Required `data` fields missing (contract per type).
  - Testimonial/logo without consent.
  - A `stats` block with a non-computed value.

### 5.6 "Real only" rules enforced in code
- **Ratings:** no `AggregateRating` and no review schema anywhere. The schema builders have no input for it.
- **Numbers:** `stats` blocks accept only API-computed metrics (API-CONTRACT 4.13). The metric `platform.bills30d` is available only when settings `analytics.allowPlatformStats` is true (owner decision O9).
- **Customers:** customer logos need `LOGO` consent, names `NAME`, quotes `QUOTE` and case studies `CASE_STUDY`, each with a `consentAt` date and evidence text. `testimonial` and `logoCloud` blocks render nothing when there is nothing to show; they never fall back to placeholder content.
- **Prices:** only through the `pricingTable` block, `{{price:...}}` tokens and schema offers, all from `Plan`. A literal "Rs" amount typed next to a plan name raises a warning in the SEO panel.
- **Compliance claims:** exact wording comes from settings `entity.complianceStatements` (each with an evidence reference) and is inserted with `{{fact:compliance.fbrPra}}`.

---

## 6. Blocks
The full prop shapes are in API-CONTRACT section 4. Every block has `id`, `type` and optional `anchor`, `theme` (default/muted/ink) and `hidden`.

| Block | Renders | Schema it feeds |
|---|---|---|
| `hero` | H1 (entry title unless overridden), 40-60-word sub, 2 CTAs, media (framed screenshot, diagram or image), badges | — |
| `answerBox` | "Short answer" (entry summary), key facts list, Roman Urdu summary | Speakable not used; text is in HTML for AEO |
| `featuresGrid` | 3-12 icon features, optional links | SoftwareApplication `featureList` (Product) |
| `diagram` | Code-drawn animated SVG (bespoke or data-driven) | — |
| `screenshot` | Framed real screenshot with callouts, split or full | `image` on WebPage |
| `faq` | The entry's FAQs as `<details>` | FAQPage (exactly what is visible) |
| `comparisonTable` | `<table>` with `<caption>`, yes/no/partial cells, sources, checked date | — |
| `cta` | CTA band | — |
| `richText` | Markdown → HTML (H2/H3 only, tables, lists, links, images by media id) | Article body |
| `steps` | Numbered steps with optional screenshots | HowTo only when `howTo: true` |
| `stats` | Computed metrics only | — |
| `testimonial` | Consented quotes (picked or auto by tag) | — (no Review schema) |
| `logoCloud` | Consented customer logos | — |
| `pricingTable` | Plans from `Plan`, monthly/yearly toggle island | SoftwareApplication `offers` |
| `codeSample` | Tabbed code, highlighted on the server (shiki, no client JS) + copy island | — |
| `cityFacts` | The CITY entry's tax authority, rate with source, markets, areas (H3s), support, nearby cities | WebPage `about` Place (Wikidata `sameAs`) |
| `entryGrid` | Auto list of entries by type, tag, group or featured (hubs, "posts about X") | ItemList on hubs |
| `relatedLinks` | Resolved RELATED (or TAG) cards | — |
| `sources` | Outbound citations (official sources followed, same tab) | `citation` on Article |
| `callout` | Info/tip/warning box | — |
| `leadForm` | Contact or demo form island posting to the existing public endpoints | — |
| `tool` | A calculator island by `toolKey` | WebApplication on Tool template |

---

## 7. Data flow

### 7.1 Read path
- **Fetching:** `lib/cms/client.ts` (server-only) wraps `fetch(CMS_API_URL + path, { next: { tags, revalidate } })`. Each call declares its tags up front (API-CONTRACT 2.2). Templates fetch:
  - the entry by path (`page:<locale>:<path>`);
  - the layout (menus + site settings, `layout:<locale>`);
  - entity and pricing (`settings`, `plans`);
  - and, for query blocks only (`entryGrid`, `testimonial`, `logoCloud`, `pricingTable`, `stats`), the list endpoints with type tags.
- **What the entry response includes:** direct references come resolved (related cards, tags, author, reviewer, FAQs, media dictionary, breadcrumbs, alternates, tokens, `entry:` links). Query blocks are not pre-resolved, because they need their own type tags.
- **Build:** `generateStaticParams` calls `GET /public/site/paths?type=...`. The build fails if the API is unreachable, rather than shipping an empty site.

### 7.2 API side
- **Auth and throttling:** public GET endpoints are `@Public()` and `@SkipThrottle()`. The global throttler (60/min/IP) would otherwise break builds and ISR bursts.
- **Load:** an in-process LRU cache (60 s TTL, flushed on every publish/save of public data) protects the DB from crawler waves on ISR misses.
- **Visibility:** only `published` snapshots, published FAQs, consented customers, and active, public plans are ever returned.
- **Headers:** responses carry `Cache-Control: public, max-age=60` and an `ETag`.

### 7.3 Cache tags (site)
`all` is on every fetch. The other tags:
- `page:<locale>:<path>`
- `type:<locale>:<TYPE>`
- `layout:<locale>`
- `settings`
- `plans`
- `faq:<locale>`
- `customers`
- `redirects`
- `sitemap`
- `llms`

### 7.4 Revalidation
- **Trigger:** after any change to public data, the API's `SiteRevalidationService` sends a signed `POST <site>/api/revalidate` to each URL in `SITE_REVALIDATE_URLS` (HMAC-SHA256 over `timestamp.body`, ±5 min window; API-CONTRACT section 6).
- **Fan-out on entry publish/unpublish of X:**
  - `page:` for X's old and new paths;
  - `type:<locale>:<X.type>`;
  - `page:` for every entry with a published relation to X (they show X's card or link);
  - `page:` for entries authored or reviewed by X when X is a PERSON;
  - `layout:<locale>` when X appears in a menu;
  - plus `sitemap` and `llms`.

  If the fan-out passes 200 tags, the API sends `all`. `revalidateTag` only marks entries stale (each page regenerates on its next request), so `all` is safe.
- **Other changes:**

  | Change | Tags |
  |---|---|
  | FAQ publish | `page:` of entries in `CmsEntryFaq` + `faq:<locale>` + `llms` |
  | Menu or site settings | `layout:<locale>` |
  | Entity/pricing/seo settings | `settings` + `llms` |
  | Plans changed in Admin → Plans | `plans` + `llms` (one call added to `AdminPlansService.create/update/remove`) |
  | Media metadata | `all` (rare) |
  | Customers/testimonials | `customers` |
  | Redirects | `redirects` |

- **Delivery:** retries happen 3 times (1 s, 5 s, 30 s) in the background. The result is stored on the revision row (`revalidatedAt` / `revalidateError`), and the admin shows "Site updated" or "Site update failed: retry". The dashboard has a "Revalidate everything" button (`all`).
- **Safety net:** `revalidate = 86400` on every route.

### 7.5 Redirects on the site
- **Lookup:** every dynamic route, and the `[...slug]` catch-all, calls `resolveRedirect(path)` before `notFound()`. It runs against the whole table from `GET /public/site/redirects` (cached under the `redirects` tag; exact map plus compiled `:param` patterns).
- **Outcomes:** 301 → `permanentRedirect()` (HTTP 308, which Google treats the same as 301). 302 → `redirect()` (307). 410 → `notFound()`, served as a 404 with noindex.
- **Hit counter:** a hit fires a non-blocking `POST /public/site/redirects/hit` inside `after()`.
- **Limits:** a true 410 or 301 status would need middleware on every request, which costs latency on all pages, so it is not used. PLAN's existing `vercel.json`/`next.config` redirects are not carried over. They are imported into the DB instead.
- **Static checks:** loops and chains are rejected on save in the API (A → B → C is flattened to A → C).

### 7.6 Preview
- **Admin:** `POST /entries/:id/preview-link` returns `<site>/api/preview?token=...&path=...`.
- **Site:** the route checks the token with the API (`GET /public/site/preview?token=`), enables `draftMode()`, stores the token in an httpOnly cookie and redirects to the path.
- **Rendering:** in draft mode the page fetches `GET /public/site/preview?token=&path=` with `cache: 'no-store'`. Other pages render published content.
- **Exit:** `/api/exit-preview` clears the cookie and draft mode.

---

## 8. Templates and SEO spec (CMS-driven version of PLAN section 4)

**Global rules (enforced in `lib/seo/metadata.ts` and in the API's publish checks):**
- **Title:** final title = `entry.seoTitle`, or else the type pattern from settings `seo.titlePatterns`, filled from entry fields (`{title}`, `{data.shortName}`, `{city}`, `{authority}`, `{year}`, `{minPrice}` from Plan).
  - The layout template `%s | Nafaa` is applied except on Home and Compare, where the pattern already holds the brand.
  - Length 30-60, unique across indexable published entries, and the brand appears no more than once.
- **Description:** `seoDescription`, or else `summary` trimmed. Length 140-155 is checked as a warning.
- **Canonical and robots:** canonical is self (`SITE_URL + locale prefix + publishedPath`) unless `canonicalUrl` is set. The robots value comes from the snapshot, which merges the editor's noindex, the quality gate, the planned-integration rule and `SITE_INDEXABLE`. No `keywords` meta. hreflang only when a published translation exists (via `translationKey`).
- **Headings:** one H1 per page (hero or template). Blocks render H2. Rich text may only use H2/H3 (the API rejects H1 and skipped levels).
- **Schema:** one `@graph` per page from `lib/seo/graph.ts`.
  - `Organization` and `WebSite` come from settings `entity`/`site` (with `disambiguatingDescription`, `sameAs` restricted to social links marked verified, and `address` only when real).
  - `WebPage` (`url`, `breadcrumb`, `about`, `dateModified` = `contentUpdatedAt`, `datePublished` = `firstPublishedAt`), plus the template type below and `schemaExtra`.
  - Never `AggregateRating`, never `LocalBusiness` except real offices from `entity.offices`, and never `Product` with price 0.
- **FAQ:** visible `<details>` with 5-8 items on money types (a warning outside that range). FAQPage mirrors exactly the visible items.
- **Freshness:** visible "Updated {contentUpdatedAt}" on every type except PAGE (legal pages show it too). Sitemap `lastmod` uses the same date.
- **Outbound links:** `sources` blocks and Markdown links to the official-domain list in settings `seo.officialDomains` are rendered followed, in the same tab. Other external links get `rel="noopener"`, and `nofollow` only when the editor flags them.

| Template (types) | Default title pattern (`seo.titlePatterns`) | H1 / H2 structure (block order enforced as a warning) | Schema beyond base | Required internal links (publish checklist) |
|---|---|---|---|---|
| Home (PAGE `/`) | `Nafaa: POS & Business Software for Pakistan \| Free Plan` (the "Free" wording waits on O1) | hero (H1) → answerBox → featuresGrid "What Nafaa does" → entryGrid industries → diagram offline + FBR → pricingTable → testimonial/logoCloud (only if real) → faq | SoftwareApplication (offers from Plan), FAQPage | all hubs, top 8 industries, top 8 products, pricing, compliance hub; footer carries 12 city hubs |
| Pricing (PAGE `/pricing`) | `POS Software Price in Pakistan: Plans from {minPrice}` | hero → pricingTable → comparisonTable (plan features from Plan) → richText hardware costs → faq | SoftwareApplication + `offers` per plan (PKR) | product pages per plan feature, `/best/pos-software-pakistan`, `/services/hardware`, demo |
| Hub (PAGE hubs, BLOG_CATEGORY) | `{title}` (each hub sets its own) | hero → answerBox → entryGrid (grouped) → faq optional | CollectionPage + ItemList | every child; sibling hubs |
| Product (PRODUCT, INTEGRATION) | `{title} Software in Pakistan: {data.benefit}` | hero → answerBox → steps "How it works" (+ screenshots) → featuresGrid → entryGrid industries tagged → comparisonTable → pricingTable (compact) → faq | SoftwareApplication (`featureList`), HowTo when steps say so, FAQPage | product hub, 6 industries, 2-3 related products, glossary term, 1 guide, 1 compare page, pricing |
| Industry (INDUSTRY) | `{title} Software in Pakistan: POS, Stock & Khata` | hero → answerBox (+ Roman Urdu) → featuresGrid "Problems it solves" → screenshot(s) of the real flow → steps "How a day works" → pricingTable → richText buyer checklist → comparisonTable → testimonial (if real) → faq | SoftwareApplication (`applicationSubCategory` = title), FAQPage | industries hub, 4-6 products, 2 related industries, 1 solution, 2-3 posts/guides, 1 best/compare, relevant compliance page, city hubs where tagged |
| Solution (SOLUTION) | `{title} Software in Pakistan: {data.outcome}` | hero → answerBox → featuresGrid "What you get" → diagram "How it scales" → richText example → faq | SoftwareApplication, FAQPage | products, matching industries, services, pricing/enterprise contact |
| Service (SERVICE) | `{title} in Pakistan` (PK) or `{title} for Businesses Worldwide` (`areaServed` worldwide) | hero → richText "What we build" → diagram service-process → steps timeline → richText pricing model → entryGrid work examples (CASE_STUDY, if any) → faq → leadForm | Service (`provider` = Organization, `areaServed`), FAQPage | solutions, `/developers`, integrations, contact |
| CityHub (CITY, CITY_INDUSTRY) | `POS Software in {title}: Billing, Stock & {data.authority} Tax` | hero → answerBox → cityFacts tax ("Which tax rules apply in {city}") → richText "Popular business types" with links to national industry pages → cityFacts markets + areas (areas as H3) → cityFacts support → testimonial (only if real) → faq (city-specific) → relatedLinks nearby cities | WebPage `about` Place (Wikidata `sameAs`), SoftwareApplication `areaServed`, FAQPage | `/pos-software`, province compliance page, 4-6 national industry pages, 3 nearby cities, pricing |
| Compliance (COMPLIANCE) | `{data.authority} POS Integration: Who Must Comply & How ({year})` | hero → answerBox (who, deadline, penalty) → richText sections → steps → richText costs → richText "How Nafaa handles it" → faq → sources | Article (author, reviewer, `dateModified`), HowTo where steps are real, FAQPage | `/product/fbr`, city hubs in that province, related industries, tools |
| BestOf (BEST_OF) | `Best {data.category} Software in Pakistan ({year}): {data.count} Compared` (`count` is computed from items) | hero → richText methodology → comparisonTable quick pick → one H2 per item (from `data.items`) → richText how to choose → faq | Article + ItemList | compare pages, industry pages, pricing |
| Compare (COMPARE, ALTERNATIVE) | `Nafaa vs {data.competitorName}: Features, Price & Which to Choose` / `Best {data.competitorName} Alternative in Pakistan ({year})` | hero → answerBox verdict → comparisonTable → richText "Where {X} is better" → richText "Where Nafaa is better" → steps switching → faq | Article, FAQPage | `/compare`, best-of page, products, `/services/data-migration` |
| Article (BLOG_POST, GUIDE, CASE_STUDY, TEMPLATE, CHANGELOG) | `{title}` (≤ 60, query first) | One H1, TOC from H2s, money-page link in the first 150 words (warning if missing) | BlogPosting / Article (Person author with `sameAs`, `datePublished`/`dateModified`, `image`) | 1 money page, 2-3 glossary terms, 2 related posts, category |
| GlossaryTerm (GLOSSARY_TERM) | `What is {data.term}? Meaning in Urdu & Business Use` | H1 "What is {term}?" + 1-sentence definition → H2 Meaning (EN + Roman Urdu) → Example → How Nafaa handles it | DefinedTerm in DefinedTermSet `/glossary` | glossary hub, 1 product, 1 guide, 2 related terms |
| Tool (TOOL) | `{title} Pakistan: Free {data.kind} Calculator` | hero → tool island → richText "How it's calculated" (rates with source) → richText examples → faq | WebApplication (free), FAQPage | related compliance or product page |
| Person (PERSON) | `{title}, {data.role} at Nafaa` | H1 name → bio → entryGrid authored | Person (`sameAs`, `worksFor`, `knowsAbout`) | about, authored posts |
| Docs (DOC) | `{title} \| Nafaa API Docs` | sidebar tree, H1, richText + codeSample | TechArticle | parent, siblings, `/developers` |

Developer docs cover the real public API (`apps/api/src/integrations/public-api`: `/api/v1` products, stock, customers, sales, orders, webhooks, with keys from `/developer`). Scope needs owner confirmation (O7).

---

## 9. Sitemap index (from the DB)
- `/sitemap.xml` is a route handler that returns a `<sitemapindex>` of the sections that have URLs: `pages`, `products` (PRODUCT, INTEGRATION), `industries` (INDUSTRY, SOLUTION, SERVICE), `locations` (CITY, CITY_INDUSTRY), `compliance`, `compare` (BEST_OF, COMPARE, ALTERNATIVE), `content` (BLOG_POST, BLOG_CATEGORY, GUIDE, CHANGELOG, CASE_STUDY, TEMPLATE, TOOL), `glossary`, `people` and `developers`.
- `/sitemaps/<section>.xml` comes from `GET /public/site/sitemap?section=`. It lists only published, indexable entries whose canonical is self:
  - `<lastmod>` = `contentUpdatedAt ?? firstPublishedAt`.
  - `<image:image>` for the entry image.
  - `xhtml:link` alternates once `/ur` exists.
- No `changefreq`/`priority`, no non-HTML URLs, no news, video or image-only sitemaps.
- Caching: tag `sitemap`, revalidated on every publish. `robots.ts` lists only `/sitemap.xml`.
- `robots.txt` allows all crawlers, AI crawlers included (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended), and disallows `/api/`. `SITE_INDEXABLE=false` disallows everything.
- IndexNow: the key comes from settings `seo.indexNowKey` and is served at `/<key>.txt` through a rewrite to `app/indexnow/[key]/route.ts`. The API pings `api.indexnow.org` with changed URLs after publish (batched per minute).

## 10. llms.txt and llms-full.txt (from the DB)
- **Source:** `GET /public/site/llms` returns structured data: the entity (from settings, with computed counts), plans (from `Plan`), compliance statements, and published indexable entries grouped by type with title, URL and summary, plus the top FAQs. `app/llms.txt/route.ts` renders it in the llmstxt.org format:
  ```
  # Nafaa
  > Nafaa (nafaa.pk) is Pakistani POS and business software ... Not NAFA Funds.
  Key facts (generated {date}): plans {Rs 0 / 1,500 / 3,500 / 9,500 from Plan}; {N} industries; FBR & PRA approved POS integrator; platforms ...; languages ...; HQ ...
  ## Product        - [POS](https://nafaa.pk/product/pos): {summary}
  ## Industries ({N})
  ## Solutions / Services / Pricing / Compliance / Compare and best-of / Company
  ## Optional       blog, guides, glossary
  ```
- **llms-full.txt** adds each money page's answer box, key facts and FAQ Q&A as Markdown, capped at 500 KB.
- **Caching:** tags `llms` + `plans` + `settings`.
- Nothing in either file is typed by hand. Counts, prices and statements all come from the DB, so they cannot drift from the site.

## 11. Analytics (reuse what exists)
- **Endpoints:** the API already has public endpoints in `apps/api/src/admin-marketing/public-tracking`:
  - `POST /api/public/marketing/pageview`
  - `POST /api/public/marketing/event`
  - `POST /api/public/marketing/contact-form`
  - `POST /api/public/marketing/demo-booking`
  - `POST /api/public/marketing/newsletter/subscribe`
  - `POST /api/public/marketing/heatmap` (not used by the new site)

  CORS already allows `https://nafaa.pk`, `www` and `*.vercel.app`.
- **Analytics island (about 1.5 KB):** a rewrite of `apps/api/public/nafaa-tracker.js` as a module.
  - It keeps the same storage keys (`nafaa_vid` in localStorage, `nafaa_sid` in sessionStorage), so visitors carry over from the old site.
  - It sends a pageview on load and on client navigation with `fetch(..., { keepalive: true })`, with UTM parameters from the URL.
  - Event names: `cta_click` (label, location), `signup_clicked` (plan), `demo_submit`, `whatsapp_click`, `pricing_toggle`, `tool_used` (toolKey), `outbound_click` (domain), `form_start` (already used by the conversions funnel).
- **Admin reuse:** the existing admin screens (Traffic, Conversions, Blog analytics, SEO) read these tables, and the CMS publish step now fills `SeoPage` and `BlogPostAnalytics`.
- **Third-party:** GTM, with GA4 inside it, after consent or idle; the id comes from settings `analytics.gtmId`. Vercel Analytics and Speed Insights stay. The old `nafaa-tracker.js` script tag is not used.
- **Lead forms:** they post to the existing endpoints. Service pages use `formType: SALES` with the service in `subject`. Manufacturing and enterprise use `ENTERPRISE`.

---

## 12. Content seeding plan
- **Where:** `apps/api/prisma/seed-marketing-cms/`, run by `pnpm --filter @nafaa/api seed:cms` (a new script using `prisma/tsconfig.seed.json`, like `seed:emails`).
  - Dry run is the default. It prints what it would create, update, skip and drop.
  - `--apply` writes DRAFT entries only, so publishing always goes through the admin (bulk publish runs the gates and revalidation).
  - It is idempotent and upserts by (locale, path).
  - It never overwrites an entry edited in the admin (`updatedById` set) unless `--overwrite=<path>` is given.
  - It runs on local and staging first. Prod needs the owner's go-ahead (deploy checklist).
- **Content files:** `seed-marketing-cms/content/<area>/<slug>.ts`, typed with the shared contract. Each file has a `sources` list and a `factCheck` note (what was checked, where, on what date). Content agents write new copy here, so all copy is reviewed in git before it reaches the DB.

**What moves from `apps/marketing` (read-only source) and what is dropped:**

| Source | Becomes | Kept after fact-check | Dropped |
|---|---|---|---|
| `industries.ts` (31) + `industry-content.ts` (7 deep) | 31 INDUSTRY drafts | Slug (URL continuity), names, `group` from category, icon (lucide name from app `identities.ts`), color (app identity color), `appIndustryKey` mapping (kiryana → retail/standard, mobile-shop → mobile, ...), key features **verified against `apps/web` industry modules and `apps/api/src/industries/<key>`**. Deep copy for 7, converted to blocks | Emoji, gradients, aurora colors, "Only POS with…" signatures, "95% udhaar recovery", "+35% profit", unverified integrations (Foodpanda sync unless confirmed), Nastaliq strings. The 24 boilerplate pages become short drafts that stay below the gate (noindex) until written |
| `features.ts` + `feature-content.ts` (16, 6 deep) | PRODUCT drafts per PLAN 2.2 list | Verified features; deep copy for pos, inventory, khata, multi-shop, fbr | Boilerplate capabilities and FAQs from `content-defaults.ts`. ai-assistant, fraud-detection and api only if they ship (the `fraud-detection` module and `public-api` exist, so verify their UI) |
| `solutions.ts` (8) | 7 SOLUTION drafts (PLAN names) | Positioning | `coming-from-*` (become redirects to compare) |
| `integrations.ts` + content (20) | INTEGRATION drafts | `live` only where code exists and the owner confirms (Shopify confirmed; FBR/PRA tax authority module; check foodpanda channel, pay-qr, whatsapp) | "Self-healing", "Minutes to set up" boilerplate. Unverified ones become `planned` (noindex) |
| `cities.ts` (12) | 12 CITY drafts | Name, province, authority (PRA/SRB/KPRA/BRA/ICT), Wikidata id (looked up), markets and areas from PLAN 5 as writer notes | `activeShops`, `topIndustries`, every count |
| `blog/posts.ts` (12) | BLOG_POST drafts | 3 real posts (fbr-e-invoicing-complete-guide-2026, digital-khata-vs-paper-ledger, gold-rate-pricing-jewelry-shops) after fact-check and re-dating; author = a real PERSON | 9 stubs stay drafts. Fake personas (`hassan`, `zara`, ...). Claims such as "12,000+ kiryana partners" and "we compared 8 POS systems" |
| `blog.ts` (8 old slugs) | Redirects only | The 8 mappings in PLAN Phase 0 A3 | The content |
| `glossary.ts` (20) | GLOSSARY_TERM drafts | Terms with checked definitions + a Roman Urdu definition | AEO and GEO terms |
| `compare.ts` (4) | COMPARE drafts | Structure | "Certified partner", "Them: English only" and every competitor fact without a dated source (E2 re-verifies) |
| FAQs inside industry, feature and city content | `CmsFaq` drafts by topic, deduplicated | Questions that match real support questions; prices rewritten as `{{price:...}}` tokens | Answers with Rs 2,500/5,500/15,000, "2,847+ businesses" or any other count |
| `testimonials.ts`, `case-studies.ts` | Nothing | — | All of it (unverified). Real customers are added in the admin with consent |
| `stats.ts`, `plans.ts` | Nothing | — | Fake stats; prices come from `Plan` |
| PLAN 2.3 nav, footer | `CmsMenu` header, footer, legal | — | — |
| Owner facts | `CmsSetting` entity, site, pricing, seo, analytics, industry-groups | Exact compliance wording + evidence reference, HQ (when given), founder, platforms, verified social links | Dead profiles (`twitter.com/nafaapk`, `youtube.com/@nafaapk`) |
| PLAN 5 + 8, Phase 0 A3 | `CmsRedirect` (`source=IMPORT`) | 12 `/{city}` → `/pos-software/{city}`; 12 patterns `/{city}/:industry` → `/pos-software/{city}`; the merges list; 8 old blog slugs; `/industries/carpet-shop` → `/industries/carpet` | — |

**Fact-check rule for agents:**
- **Features:** every feature claim cites a file in `apps/web/src` or `apps/api/src` in the content file's `sources`.
- **Tax claims:** they cite fbr.gov.pk, pra.punjab.gov.pk, srb.gos.pk, kpra.kp.gov.pk, bra.gob.pk or the SRO with a check date.
- **Competitor prices:** they cite the vendor page with a check date.
- **Uncertain claims:** if a claim can't be verified, it is left out and listed in the seed report's "needs owner" section.

---

## 13. Admin CMS UI plan (apps/admin)
- **Location and navigation:** `apps/admin/src/features/marketing/cms/`. MarketingSidebar gets a new "Website" section with: Overview, Pages (all types), Industries, Cities, Products & integrations, Solutions & services, Blog & guides, Glossary, Compare & best-of, FAQs, Customers & testimonials, Team, Developer docs, Media, Menus, Redirects, Settings. Most of these are one `EntryListPage` filtered by type, with type-specific columns.
- **Stack:** the admin's own stack (React 19, React Query, react-hook-form + zod 4 from the generated contract, Tailwind, lucide, sonner). New dependencies:
  - `@tiptap/react` + `@tiptap/starter-kit` + `tiptap-markdown`, for the rich text editor that outputs Markdown;
  - `@dnd-kit/core` + `@dnd-kit/sortable`, for block and menu reordering.

  Admin UI labels are in simple Roman Urdu with English business and SEO terms (Publish, Draft, SEO, Redirect).

**Screens**
1. **Website overview:**
   - Counts by type and status, and the scheduled queue (PKT times).
   - A "needs attention" list from `GET /dashboard/health`: below quality gate, missing meta, duplicate titles, orphans (< 3 inbound links), stale (`contentUpdatedAt` > 12 months), broken `entry:` links, consent missing, last revalidation failures.
   - Buttons: "Revalidate everything", "Bulk publish ready drafts".
2. **Entry list:** title, path, type, status chip (Draft / Scheduled / Live / Live + changes / Live noindex / Archived), SEO score, words, updated, author. Filters: type, status, tag, group, gate state. Bulk publish, unpublish and archive. "New" opens a dialog: type, title, slug (auto), parent.
3. **Entry editor** (`/marketing/website/entries/:id`):
   - **Top bar:** status, "Saved" indicator (autosave), Preview (opens the preview drawer: site iframe in draft mode, refreshed after each save, plus "Copy share link"), Validate, Publish / Schedule (date-time picker in PKT) / Unpublish.
   - **Left:** block outline (drag to reorder, add from a palette grouped by purpose, duplicate, hide, delete).
   - **Centre:** the selected block's typed form (one form component per block type in `cms/blocks/`). Fields: MediaPicker (library + upload, alt enforced), EntryPicker (search across types), IconPicker (allowed lucide names), CtaField, MarkdownEditor (TipTap; H2/H3 only, link picker inserts `entry:<id>`, a token helper inserts `{{price:basic.monthly}}`), DiagramEditor (kind picker plus a node and edge table for flow/hub/timeline). There is no diagram preview inside the admin; the preview drawer shows the real site render.
   - **Right panel tabs:**
     - **Details:** slug and path preview, parent, type-specific `data` form from the contract (for example industry icon, color, group, app key), author, reviewer, fact-check stamp ("I checked this on {date}"), featured, sort order.
     - **SEO:** SERP preview (desktop and mobile, with pixel-width truncation); title and description counters; the final title after the pattern is applied; focus keyword checks (in title, H1, first 100 words, description, slug); score with issue list (errors, warnings, passes); canonical, noindex/nofollow; OG image picker with a 1200×630 preview of the generated card; the quality gate state; and a JSON-LD preview of the page `@graph` (read-only).
     - **Links:** tags (industry, city, product, category pickers), related cards (ordered), the PLAN required-links checklist for the type, the inbound links list (from the published index), and suggested links (entries sharing tags that aren't linked yet).
     - **FAQ:** attach existing FAQs (search by topic), reorder, create inline (it stays a draft until published in the FAQ screen or with "Publish FAQs with page").
     - **History:** revisions (who, when, action, note), a side-by-side diff of blocks and fields, restore to draft, and revalidation status per publish.
4. **Media library:**
   - Grid and list views, filters (kind, tag, unused), search, multi-upload with a drop zone.
   - The upload dialog requires alt text for every file before saving. Screenshots also ask for industry and feature tags.
   - A detail drawer shows alt (+ Urdu), caption, credit, source URL, focal point picker (click on the image), tags, dimensions and size, usage list (entries, customers, settings), "Replace file" (same id) and delete (blocked while in use).
5. **FAQs:** list by topic with status, the "Used on" count and pages, an editor with an answer word counter (40-80) and the direct-answer-first hint, publish/unpublish and history.
6. **Customers & testimonials:**
   - The customer form has a consent section: scope checkboxes, consent date, evidence text (where the proof is kept), verified by (auto, current admin) and an optional link to the app tenant (search by name). Publish/show is disabled until consent exists.
   - Testimonials are tied to a customer and to a source type and URL.
7. **Menus:** a tree editor for `header`, `footer`, `legal` and `mobile`. Item kinds: entry link (picker), URL, auto list (type + group/featured + limit, so new industries appear in the mega menu without edits), and column/group header. It includes a live preview of the mega menu.
8. **Redirects:**
   - A table with search and filters (source, active, pattern), add/edit, CSV import and export, and a "Test a URL" box that shows which rule fires and the final destination.
   - Hit counts and last hit.
   - Chain and loop warnings, and a "redirects to an unpublished page" warning.
9. **Settings** (separate tabs, each saved with history):
   - **Site:** name, URLs, signup and demo links, WhatsApp, default OG, social links with a "verified working" checkbox.
   - **Entity facts:** legal name, disambiguation, founding date, founders (PERSON pickers), offices (address only when real), contact, compliance statements with evidence reference, platforms, languages, sameAs, Wikidata. It shows a live preview of the generated llms.txt and Organization JSON-LD.
   - **Pricing display:** read-only plan list from `Plan` with a link to Admin → Plans; per-plan tagline, highlight and CTA; feature labels for Plan flags.
   - **SEO defaults:** title template, patterns per type, quality gates, official domains, IndexNow key.
   - **Analytics:** GTM id, Clarity id and sample, allow platform stats (off by default).
   - **Industry groups:** groups and their order.
10. **Developer docs:** a tree view of DOC entries (drag to re-parent) that opens the same editor.

- **Permissions** (new constants in `apps/api/src/admin-marketing/_shared/constants/marketing-permissions.constants.ts`; each does only what it says, per the explicit-permissions rule):
  - `marketing.cms.view`: read everything in Website.
  - `marketing.cms.edit`: create and edit drafts, upload and edit media, edit FAQs, customers and menus (drafts only where a draft exists).
  - `marketing.cms.publish`: publish, unpublish, schedule and restore (it does not imply edit).
  - `marketing.cms.redirects`: manage redirects.
  - `marketing.cms.settings`: site settings and entity facts. The name contains "settings", so the existing `MARKETING_MANAGER` filter excludes it, and only SUPER gets it by default.

  Role defaults:

  | Role | Gets |
  |---|---|
  | SUPER | all |
  | MARKETING_MANAGER | view, edit, publish, redirects |
  | CONTENT | view, edit |
  | ANALYST | view |
  | AGENT | none |

  Because `admin-auth.service` lets only `SUPER_ADMIN` log in to apps/admin, these roles only matter if the owner later opens admin login to marketing staff (O12). Deploy notes must list the new permissions (memory rule).

---

## 14. Testing and CI gates (site)
- **`scripts/check-budgets.mjs`:** parses `next build` output and fails over budget (4.8).
- **`lighthouserc.json`:** LH CI mobile on one URL per template against the preview deployment. Perf ≥ 95, A11y/BP/SEO = 100.
- **`scripts/seo-crawl.mjs`:** crawls the sitemap plus 30 junk URLs and asserts:
  - status codes;
  - self canonical;
  - unique titles 30-60;
  - one H1;
  - no `aggregateRating`;
  - JSON-LD parses;
  - every internal link returns 200;
  - FAQPage equals the visible FAQ.
- **`scripts/uniqueness.mjs`:** CITY similarity < 0.50, as a backstop to the API gate.
- **`sync-tokens.mjs --check`** and **`sync-cms-contract.mjs --check`.**
- **API:** unit tests for path computation, tokens, the quality gates, the publish index rebuild, redirect chain flattening and HMAC signing.

---

## 15. Build phases (at most 6 agents at a time; exact ownership)

**Rules for every agent:**
- Branch `site/rebuild` off `design/overhaul`; the owner decides on merges.
- Write only in owned folders. Shared files named below have exactly one owner.
- No `prisma migrate/diff/reset/db push/format`. `npx prisma validate`/`generate` are allowed.
- Follow API-CONTRACT.md exactly. If it is wrong, report it; don't fork it.
- English comments, Roman Urdu admin UI text, no invented facts.
- Deploys and prod seeding need the owner.

### Phase 1: foundations (5 agents)

| Agent | Owns | Builds |
|---|---|---|
| F1 Contract | `packages/cms-contract/**`, `scripts/sync-cms-contract.mjs`, the three generated `contract/` folders | zod 4 schemas and TS types for every block, entry `data` per type, menus, settings, public and admin DTOs, tokens grammar, allowed icon list, diagram kinds (API-CONTRACT sections 3-5). Sync script with `--check`. Adds `zod@^4` to `apps/api/package.json` and `apps/site/package.json` (only these dependency lines). **Finishes first; others start against API-CONTRACT.md and switch to the generated file when it lands.** |
| F2 Site scaffold + design system | `apps/site/*` root config files, `src/styles/**`, `src/components/ui/**`, `src/components/motion/**`, `src/app/_dev/**`, `scripts/sync-tokens.mjs` | Next 15.5 + React 19 + Tailwind 3.4.17 standalone app, tokens sync, type/space/radius scales, primitives, motion CSS + MotionObserver, ESLint rules, `_dev` gallery |
| F3 Diagrams + frames | `apps/site/src/components/diagrams/**`, `src/components/frames/**` | 8 bespoke + 3 data-driven diagrams (horizontal and vertical), reduced-motion states, all frames with callouts, gallery entries (it may add pages under `src/app/_dev/diagrams/**` only) |
| F4 Media + OG + capture | `apps/site/src/lib/media.ts`, `src/lib/og/**`, `src/assets/**`, `public/**`, `scripts/capture/**` | Cloudinary loader + `<CmsImage>`, OG card renderer used by all `opengraph-image.tsx`, favicon set, Playwright capture script + manifest format |
| A0 API permissions + module shell | `apps/api/src/admin-marketing/_shared/constants/marketing-permissions.constants.ts`, `apps/api/src/admin-marketing/admin-marketing.module.ts`, `apps/api/src/admin-marketing/cms/cms.module.ts`, `cms/paths/**`, `cms/content/**` | The 5 permissions and role defaults; empty module wiring that imports the submodules by their agreed names (section 3); path computation, slug rules, token resolver, entry-link resolver, word count (pure functions + tests); the `GET /admin/marketing/cms/config` endpoint (in `cms/paths/`) |

### Phase 2: CMS engine, admin, site data layer (6 agents)

| Agent | Owns | Builds |
|---|---|---|
| A1 API entries + publishing | `apps/api/src/admin-marketing/cms/{entries,publishing,revisions,seo,preview,revalidation}/**`, one call each in `apps/api/src/admin/plans/admin-plans.service.ts` (revalidate `plans`) | Admin entry CRUD, validate, publish/unpublish/schedule/restore, published index rebuild, auto-redirects, scheduler cron, SEO score, quality gates, similarity, title uniqueness, preview tokens, HMAC revalidation with retries, IndexNow, `SeoPage`/`BlogPostAnalytics` upserts |
| A2 API public + resources | `apps/api/src/admin-marketing/cms/{public,media,faqs,redirects,menus,settings,customers,dashboard}/**` | `/public/site/*` with LRU cache and `@SkipThrottle`, media upload/replace/usage, FAQs (draft/publish), redirects (patterns, chain flattening, CSV), menus, settings (with history), customers and testimonials (consent rules), health dashboard. It calls A1's `PublishingService`/`SiteRevalidationService` through their agreed interfaces |
| A3 Seed (import) | `apps/api/prisma/seed-marketing-cms/**`, the `seed:cms` line in `apps/api/package.json` | Runner (dry run, apply, overwrite), import of the sources in section 12 with fact-check and drop report, settings/menus/redirects seed, PERSON for the founder (owner to confirm) |
| M1 Admin editor | `apps/admin/src/features/marketing/cms/{routes.tsx,entries,editor,blocks,fields}/**`, `apps/admin/src/api/marketing/marketing-cms.api.ts`, the `/marketing/website` route lines in `apps/admin/src/App.tsx`, the "Website" section in `MarketingSidebar.tsx`, the tiptap/dnd-kit dependency lines in `apps/admin/package.json` | Entry list, create dialog, full editor with panels, block forms, pickers, SERP preview, revisions diff, preview drawer |
| M2 Admin resources | `apps/admin/src/features/marketing/cms/{dashboard,media,faqs,menus,redirects,settings,customers}/**` | Those screens. It exports page components by the agreed names and M1 wires them in `routes.tsx`. MediaPicker is built here (`media/MediaPicker.tsx`) and used by M1 |
| S1 Site data + shell + SEO platform | `apps/site/src/lib/{cms,seo,llms,analytics}/**`, `src/lib/icons.ts`, `src/components/{layout,seo}/**`, `src/components/islands/{Analytics,ConsentBanner,CommandSearch}*`, `src/app/{layout.tsx,not-found.tsx,error.tsx,robots.ts,opengraph-image.tsx,sitemap.xml,sitemaps,llms.txt,llms-full.txt,api,indexnow}/**`, `src/app/[...slug]/**` | Fetchers with tags, redirect resolver, preview flow, revalidate route (HMAC), metadata builder, `@graph` builders per template, breadcrumbs, header/mega menu/mobile nav/footer from menus, sitemap index, llms files, robots, analytics island, consent, catch-all PAGE route |

### Phase 3: blocks and templates (6 agents)

| Agent | Owns | Builds |
|---|---|---|
| S2 Blocks | `apps/site/src/components/blocks/**`, `src/components/islands/{PricingToggle,LeadForm,CodeCopy}*` | All 22 block renderers + `BlockRenderer`, rich text pipeline (remark-gfm → rehype-sanitize → rehype-slug, `entry:` links, tokens arrive resolved), shiki highlighting on the server |
| S3 Templates: core | `apps/site/src/app/{page.tsx,pricing,product,industries,solutions,services,integrations,faq}/**`, `src/templates/{home,pricing,hub,product,industry,solution,service}/**` | Templates + routes + `opengraph-image.tsx` for those types |
| S4 Templates: location + AEO | `apps/site/src/app/{pos-software,compliance,best,compare,alternatives}/**`, `src/templates/{city,compliance,bestof,compare}/**` | City hub (+ pair), compliance, best-of, compare/alternative |
| S5 Templates: content | `apps/site/src/app/{blog,guides,glossary,customers,team,changelog,templates,developers,tools}/**`, `src/templates/{article,glossary,person,docs,tool}/**`, `src/components/islands/tools/**` | Article family, RSS `blog/feed.xml`, glossary, person, docs with tree sidebar, tool template + the 6 calculator islands |
| Q1 CI + quality | `apps/site/{lighthouserc.json,scripts/check-budgets.mjs,scripts/seo-crawl.mjs,scripts/uniqueness.mjs}`, `.github/workflows/site-ci.yml` | Section 14 gates against the staging deployment |
| A4 API hardening | `apps/api/src/admin-marketing/cms/**/*.spec.ts` (new files only), `apps/api/test/cms/**` | Tests in section 14, a load test of the public endpoints, a security review of the public surface (only published data, no ids leaking drafts, preview token scope) |

### Phase 4: content I (6 agents; write `seed-marketing-cms/content/<area>/`, review in git, seed to staging, owner reviews in admin, then publishes)

| Agent | Owns `content/…` | Writes |
|---|---|---|
| W1 | `pages/`, `products/` (pos, offline-pos, inventory, khata, billing, fbr, payments) | Home, pricing copy (no prices), product hub, demo, contact, 7 products |
| W2 | `products/` (the other 9), `integrations/`, `pages/marketplace.ts` | 9 products, verified integrations only, marketplace (Nafaa Bazaar) |
| W3 | `industries/{kiryana,bakery,pharmacy,restaurant,mobile-shop,garments,hardware,jewelry}.ts` | 8 deep industry pages (1,500+ words) from real app flows |
| W4 | `industries/` (the other 23) + new `supermarket`, `wholesale-distribution` | ≥ 700 unique words each, or left below the gate (noindex) |
| W5 | `solutions/`, `services/`, `pages/{about,founder-letter,editorial-policy}.ts`, `people/` | 7 solutions (manufacturing as an honest lead page), 6+ services (custom software, websites, e-commerce, mobile apps, data migration, FBR setup, hardware, training) for PK and worldwide, company pages |
| W6 | `compliance/`, `faqs/` | Compliance hub + 10 pages with official sources and SROs, the FAQ library by topic |

### Phase 5: content II (6 agents)

| Agent | Owns `content/…` | Writes |
|---|---|---|
| W7 | `cities/{lahore,faisalabad,rawalpindi,multan,gujranwala,sialkot,bahawalpur}.ts` | City hubs ≥ 700 city-specific words |
| W8 | `cities/{karachi,hyderabad,islamabad,peshawar,quetta}.ts`, `pages/pos-software.ts` | City hubs + index page (static SVG map is a site component: W8 may add `apps/site/src/components/diagrams/PakistanMap.tsx` only) |
| W9 | `best/` | 8 best-of pages with methodology and dated prices |
| W10 | `compare/`, `alternatives/` | 14 compare + 5 alternatives, honest, dated |
| W11 | `glossary/` | 100+ terms (EN + Roman Urdu) |
| W12 | `blog/`, `guides/`, `docs/`, `changelog/` | Finish 9 stubs + 3 thin posts, 4 guide pillars, developer docs for API v1, real changelog entries |

### Phase 6: QA and cutover (4 agents)

| Agent | Owns | Builds |
|---|---|---|
| X1 | read-only + fixes routed to owners | Full crawl QA (section 14) on staging with real content |
| X2 | `apps/site/**` perf/a11y fixes (coordinated) | LH CI green on every template |
| X3 | `seed-marketing-cms/content/redirects.ts` | Verify every 301 against the GSC Pages export (owner provides), add missing ones |
| X4 | `nafaa-backups/marketing-audit/LAUNCH.md` (checklist only) | Cutover checklist: prod migration + seed with owner, settings filled, Vercel root switch, env vars, sitemap submit, IndexNow, rollback steps, 28-day watch |

PLAN Phase 5 (`/ur`) follows after launch: the `ur` locale entries with `translationKey`, Noto Naskh on `/ur` only, and hreflang from `alternates`.

---

## 16. Owner decisions needed

| # | Question | Blocks |
|---|---|---|
| O1 | The Rs 0 plan in the DB is "Free Trial": 7 days, 30 products, 100 sales/month. Is it a free plan or a trial? The home title says "Free Plan" only if it is free. | Home/pricing titles, schema, FAQ |
| O2 | Evidence for "FBR & PRA approved POS integrator": approval/licence numbers or letters to keep on file (and cite if public). SRB/KPRA status too. market.md notes that FBR's published DI integrator list (Apr 2025) did not include Nafaa, so the wording needs proof before launch. | Entity facts, compliance pages, llms.txt |
| O3 | Real customers who agree to be named (logo, quote, case study), with written consent. | Testimonial, logo and case-study blocks (they render nothing without it) |
| O4 | Real office address(es) and phone for NAP; founder name and founding year; team members who will be authors (with LinkedIn). | Organization schema, footer, Person pages |
| O5 | Which social, app-store (Android/iOS/Windows) and YouTube profiles really exist. | `sameAs`, footer |
| O6 | Services for clients worldwide: which services are offered today, pricing model (fixed/hourly, PKR/USD), who receives the leads. | Service pages, lead routing |
| O7 | Can the public API v1 (`/api/v1`, keys, webhooks) be documented publicly, and on which plan is it available? | Developer docs |
| O8 | Light only at launch (recommended), or dark mode too? | Design scope |
| O9 | May the site show aggregated real platform numbers (for example bills in the last 30 days)? Default is no. | `stats` metrics `platform.*` |
| O10 | Vercel: which project and branch serve nafaa.pk today; approval for a new staging project `nafaa-site`; the same Cloudinary account for site media? | Phase 1 deploys, cutover |
| O11 | Keep `/industries/kiryana` (URL continuity, recommended, with "grocery" in the copy) or move to a `grocery` slug with a 301? | Industry seed |
| O12 | Should marketing staff (non-SUPER_ADMIN) ever log in to the admin? That needs a change in `admin-auth.service`; until then only SUPER_ADMIN edits the site. | CMS roles |
| O13 | Go-ahead to run the `20261024100000_marketing_cms` migration and the CMS seed on prod (after staging), per the deploy checklist. | Phase 4 publishing on prod |
| O14 | Is Nafaa Bazaar live for buyers and sellers, and which integrations are live (list from section 12)? | Marketplace and integration pages |

## 17. Noticed while reading (outside this scope)
- `POST /api/plans/seed` is `@Public()`. It is harmless today because it skips when plans exist, but it should be admin-only.
- `BlogPostAnalytics` and `SeoPage` have admin screens but nothing writes to them. The CMS publish step will fill them (section 5.1).
