# nafaa.pk marketing site: redesign and SEO/AEO plan

Date: 20 Oct 2026. Inputs: `technical.md`, `performance.md`, `content.md`, `market.md` in this folder, plus a check of `apps/marketing` (Next 15.5, React 19, Tailwind 3, standalone pnpm workspace, deployed on Vercel). Nothing in the repo was changed.

Goal: nafaa.pk becomes the most useful, fastest and most trusted site for "business software in Pakistan" queries, in Google and in AI assistants. Targets: Lighthouse mobile Performance 95-100 and A11y/Best Practices/SEO 100 on every template. Every page gets a unique title, description, canonical, one H1, schema and internal links. No invented numbers anywhere.

No one can promise that ChatGPT or Gemini will always recommend Nafaa. This plan raises the odds and measures them every month (section 6.3).

---

## 1. Why traffic most likely dropped (ranked)

| # | Cause | Evidence | Where |
|---|---|---|---|
| 1 | **Scaled or doorway content.** 372 city×industry pages make up 73% of the sitemap. They are about 98% identical once the city name is swapped, and they carry invented local numbers. Google's scaled-content policy (March 2024) and the helpful-content signal both work site-wide, so these pages can pull down every other page. | 5-gram Jaccard similarity is 0.98 for `/X/kiryana` across 12 cities. "8,420+ businesses in Karachi" comes from `cities.ts activeShops`. Per-page shop counts come from `seed = citySlug.length*7 + ...`. | `src/app/[city]/[industry]/page.tsx`, `src/lib/data/cities.ts` |
| 2 | **26 key pages tell Google the homepage is their canonical.** They also share its title and description, so `/pricing`, `/industries`, `/marketplace`, `/blog`, `/contact`, `/glossary` and the tool pages get folded into `/` and can't rank. | `<link rel="canonical" href="https://nafaa.pk">` appears on all 26. 17 of them are `'use client'` pages that can't export metadata. | `src/app/layout.tsx` → `buildMetadata()`, `src/lib/seo/metadata.ts:85` |
| 3 | **Fake structured data.** Every page claims an `AggregateRating` of 4.9 from 2,847 reviews, with no reviews shown. There is also a fake `LocalBusiness` per city (Karachi placed in Punjab, `@id` pointing at a 404). This is a manual-action risk ("spammy structured markup"). | Source shown in the next column. | `src/lib/seo/jsonld.ts:65,160`, `knowledge-graph.json`, `CityIndustrySchemas` |
| 4 | **`robots.txt` blocks `/_next/` for Googlebot.** Google renders the pages without CSS or JS. The homepage has 116 elements that stay at `opacity:0` until JS runs, so Google may treat that content as hidden. | `User-Agent: * Disallow: /_next/`. Googlebot has no group of its own, so the `*` rule applies to it. | `src/app/robots.ts` |
| 5 | **Soft 404s and a broken blog.** Any unknown URL returns 200. The sitemap lists 8 blog URLs that return "Post not found". The 12 real posts aren't in the sitemap, and 9 of them say "Full article coming soon". | `/foo/bar` → 200. Two blog data files share no slugs. `/industries/carpet-shop` is linked sitewide but doesn't exist. | `src/app/loading.tsx`, `src/lib/data/blog.ts` vs `blog/posts.ts` |
| 6 | **Very slow on mobile.** Home scores 27-31, other pages 31-63. LCP is 10.6-13.5 s and TBT 1.2-3 s. Most Pakistani visitors use low-end Android phones, so this hurts both Core Web Vitals and conversions. | Root Suspense hides all content until a late script runs. framer-motion holds content at `opacity:0`. 100 of 114 components are client components. GA loads twice, and two pixels load with placeholder IDs. | `performance.md` |
| 7 | **Facts that contradict each other weaken trust with Google and AI tools.** | The site says 18, 24 and 31 industries in different places; 12 vs 47 cities; Rs 2,500/5,500 on the site vs Rs 1,500/3,500 in the app; and "Certified FBR partner", which is unverified. | `llms.txt/route.ts`, `stats.ts`, `plans.ts` |

The timing fits the **13 Oct deploy** (canonical inheritance and root `loading.tsx`) on top of the long-standing doorway pages. To confirm this, the owner must open Search Console and check **Manual actions**, **Page indexing** (look for "Alternate page with proper canonical" and "Duplicate, Google chose different canonical") and the **Performance** report, comparing the 28 days before and after 13 Oct and whether earlier core updates line up. Also export 16 months of Queries and Pages before anything is removed. Section 8 uses that export.

---

## 2. New site architecture

### 2.1 Principles
- **Keep every URL that still serves the same intent.** Rename only when you must, and every move gets a 301.
- **One shared template per page type, with config per item** (this matches the web app's "shared page, industry config" rule). Templates must not share whole paragraphs of boilerplate text.
- **Only index a page that has unique substance.** Pages that aren't ready ship with `noindex` or aren't built at all.
- **Only claim what the product really does.** Writers check features against `apps/web` and `apps/api/src/modules`. Manufacturing has no module yet, so it is a lead-capture page.

### 2.2 Sitemap tree (about 330 indexable URLs at full build, down from 509, all unique)
```
/                                         Home
/pricing                                  (one price source, see open question Q1)
/product                                  hub (currently 301 → /product/pos; becomes a real hub)
  /product/pos  /product/offline-pos(new)  /product/inventory  /product/khata
  /product/billing(new)  /product/fbr  /product/online-store(new)  /product/staff
  /product/reports  /product/purchasing(new)  /product/multi-shop  /product/mobile-app
  /product/payments(new: JazzCash, Easypaisa, Raast, split)  /product/loyalty  /product/bookings
  /product/whatsapp-sms (from notifications)  /product/ai-assistant*  /product/api*      (*only if shipped)
/marketplace                              Nafaa Bazaar (sellers + buyers); keep URL
/integrations, /integrations/{slug}       live integrations only; planned = noindex "Coming" list
/industries                               hub, grouped: Retail · Food · Health · Services · Specialty
  /industries/{31 existing slugs}         + new: supermarket, wholesale-distribution, manufacturing(lead page)
/solutions                                hub
  /solutions/single-shop  /solutions/retail-chains  /solutions/wholesale-distribution
  /solutions/manufacturing  /solutions/ecommerce  /solutions/restaurants  /solutions/enterprise
/services                                 hub (new)
  /services/custom-software  /services/online-store-setup  /services/data-migration
  /services/fbr-integration-setup  /services/hardware  /services/training
/compliance                               hub (new; strongest asset for AI answers)
  /compliance/fbr-pos-integration  /compliance/tier-1-retailers  /compliance/pra-punjab
  /compliance/srb-sindh  /compliance/kpra-kp  /compliance/bra-balochistan  /compliance/ict-islamabad
  /compliance/sales-tax-rates-pakistan  /compliance/ntn-strn-registration  /compliance/drap-pharmacy
/pos-software                             city hub index + static Pakistan SVG map
  /pos-software/{city}                    12 at launch, max 20 (section 5)
  /pos-software/{city}/{industry}         only when gated (section 5), max 30
/best                                     "Best X software in Pakistan" (new)
  /best/pos-software-pakistan  /best/khata-app  /best/pharmacy-software  /best/restaurant-pos
  /best/billing-software  /best/inventory-software  /best/accounting-software  /best/ecommerce-platform
/compare, /compare/nafaa-vs-{tally,excel,quickbooks,paper-register,oscar,hysabone,easy-khata,
          digikhata,udhaar-book,vyapar,busy,zoho-books,shopify,odoo}
/alternatives/{easy-khata,udhaar-book,oscar-pos,hysabone,vyapar}-alternative
/blog, /blog/{slug}, /blog/category/{slug}
/guides, /guides/{pillar}                 how to start a kiryana store, sell online, switch from register...
/glossary, /glossary/{term}               100+ terms (EN + Roman Urdu definition)
/tools/{gst-calculator, profit-margin-calculator, pos-cost-calculator, invoice-generator,
        gold-rate-calculator, fbr-tier-1-checker}
/templates, /templates/{slug}             real downloadable XLSX/PDF files
/customers, /customers/{slug}             only verified, permitted case studies
/reviews                                  links to real third-party reviews (G2, Google, Play)
/about /founder-letter /team/{person} /editorial-policy /press /careers /partners /contact /demo
/download /security /changelog
/privacy /terms /refund /cookies /data-deletion /account-deletion   (index, low priority)
/ur/{top 10 pages}                        Phase 5, real Urdu with hreflang
noindex: /search /offline /register /status /roadmap /playground /quiz /academy (until real)
```

### 2.3 Navigation
- **Desktop header:** Product · Industries · Solutions · Services · Resources · Pricing, then the buttons **"Free shuru karein"** (app register) and **"Demo"**, plus a WhatsApp icon.
  - The mega menus are **server-rendered HTML** (`<details>`/CSS hover plus a tiny island for keyboard and close), so every link sits in the HTML.
  - Product menu: top 8 products plus "All features".
  - Industries menu: the 5 groups with the top 4 industries each, plus "All 31".
  - Solutions menu: 7 links.
  - Services menu: 6 links.
  - Resources menu: Blog, Guides, Compliance, Compare, Best-of, Glossary, Tools, Templates, Customers, Changelog.
- **Mobile:** a sticky slim header with the logo, a "Shuru karein" button and a menu button that opens a full-screen drawer. The drawer is a client island that loads its link data from HTML that is already in the page.
- **Footer (server):** a compact sitemap with columns Products · Top 12 industries · Solutions · Services · Cities (12) · Compliance · Compare/Best · Resources · Company. It also shows NAP (Gujranwala HQ address and phone, only if real), the 4 app-store and social links that exist, and the last-updated date.
- **Breadcrumbs** on every page except home. They are real `<a>` links that match the BreadcrumbList schema.

### 2.4 Page templates (13)
`Home`, `Hub` (product, industries, solutions, services, compliance, cities, best, compare, glossary), `Product`, `Industry`, `Solution`, `Service`, `CityHub`, `Compliance`, `BestOf`, `Compare`, `Article` (blog, guide), `GlossaryTerm`, `Tool`. Legal and company pages use `Article` with a simpler layout.

---

## 3. Design direction

### 3.1 Style
- **Product-led and calm.** Real app screenshots (Grocery POS, khata, stock, reports, FBR receipt) in simple device frames on a white or very light surface. No aurora gradients, noise, gradient text or emoji icons.
- **Pakistani context.** Use PKR prices, Roman Urdu UI in the screenshots, receipts with an FBR QR, the JazzCash and Easypaisa marks (with permission) and real shop photos (owner-supplied, or none at all; never stock photos of foreigners).
- **Brand.** Share tokens with the web app: `apps/web/src/design-system/styles/tokens.css` (brand `#10b981` scale) and Inter. Text-on-white green uses brand-700 (about `#047857`) to pass 4.5:1 contrast. A token sync script copies the values into `apps/marketing/src/styles/tokens.css`. The marketing workspace is standalone, so it doesn't import across apps.
- **Type scale.** 6 steps (display, h1, h2, h3, body-lg, body) built with `clamp()`, plus one spacing scale and one radius scale. No inline `style={{}}` and no raw hex values in components; a lint rule enforces both.
- **Icons:** lucide only, imported per icon.
- **Copy voice:** plain English body text, plus a 2-3 line **Roman Urdu summary** box and Roman Urdu FAQ items on money pages, in the app's simple wording (Sale, Profit, Discount; never "chhoot").

### 3.2 Components (server components unless marked island)
Primitives: Container, Section, Heading, Text, Button/LinkButton, Badge, Card, Icon, Prose, Table, Screenshot (`next/image`), Breadcrumbs.

Sections:
- **HeroProduct:** H1, a 40-60 word answer, 2 CTAs and a priority AVIF screenshot.
- **AnswerBox:** the "short answer" plus key facts. This is the main AEO block.
- **RomanUrduSummary**
- **ProofStrip:** real facts only, taken from `entity.ts`.
- **FeatureGrid**
- **ScreenshotSplit**
- **Steps**
- **ComparisonTable:** HTML `<table>` with a caption.
- **PricingTable:** monthly/yearly toggle as an island under 2 KB.
- **FAQ:** `<details>`, with matching FAQPage JSON-LD.
- **RelatedLinks:** typed hub/spoke blocks.
- **IndustryGrid**
- **CityList**
- **SourceList:** outbound citations.
- **LastUpdated**
- **AuthorBox**
- **CTA band**
- **LeadForm** (island): a server action posts to the API leads endpoint.

Islands loaded on interaction or idle: MobileNav, CommandSearch (opens on click), consent banner, calculators, PricingToggle, LeadForm.

**Removed:** Cursor, ScrollProgress, CulturalMoment, PrayerTimeBanner, AIAdvisor, ReferralWidget, PWAInstallPrompt, LiveActivityTicker, LiveNumbersBar, RotatingIndustry, PakistanMap animation, Aurora/Grid/Noise backgrounds, VoiceSearch, sonner and next-themes. The site ships in light mode only, unless the owner wants dark.

### 3.3 Performance budget (CI-enforced)
| Item | Budget |
|---|---|
| First Load JS (from `next build`) on content pages | ≤ 110 KB gz. The App Router baseline of React plus the Next runtime is about 100 KB, so page-specific JS must stay ≤ 10 KB. "<100 KB" is not reachable on App Router. |
| Tool and pricing pages | ≤ 150 KB gz |
| framer-motion | none anywhere. CSS keyframes plus a 1 KB IntersectionObserver for reveal below the fold, starting from visible, with `prefers-reduced-motion` respected |
| First viewport | no `opacity:0`, no Suspense boundary at the root, LCP element is the H1 or the priority hero image |
| HTML | ≤ 60 KB gz, DOM ≤ 1,000 nodes (home ≤ 1,200) |
| Images | `next/image` in AVIF/WebP with explicit `sizes`. Hero ≤ 60 KB and `priority`, everything else lazy. OG images from `opengraph-image.tsx` per template |
| Fonts | Inter variable through `next/font` (latin subset, `display: swap`) with only 1 preloaded file. System monospace. Noto Nastaliq/Naskh only on `/ur` routes |
| Third-party | none before consent or idle. GTM is the only Google loader (GA4 inside it), loaded after consent or after `load` + 3 s idle. Remove `<GoogleAnalytics>`, the Meta and TikTok placeholder env vars, and Clarity outside a 10% sample. Move `nafaa-tracker.js` to same-origin or drop it. Vercel Analytics and Speed Insights stay |
| Rendering | every marketing route is SSG (`dynamicParams = false`) and revalidates on deploy |
| Targets | LH mobile Perf ≥ 95 (aim for 100), A11y/BP/SEO = 100. CWV p75: LCP < 2.0 s, INP < 150 ms, CLS < 0.05 |

Gate: Lighthouse CI (`@lhci/cli`) runs on 1 URL per template, and `next build` output is checked against the budget. A PR fails if any template drops below 95 or goes over budget.

---

## 4. SEO spec per template

Global rules:
- **Titles:** the root layout title template is `%s | Nafaa`, and page titles never include "Nafaa" themselves, except home and compare pages. Titles are 50-60 characters with the primary query first.
- **Descriptions:** 140-155 characters, containing the query, the main benefit and a price or "free" plus a CTA.
- **Canonical:** self-referencing on every page, built from `metadataBase` plus the path. The root layout sets no canonical.
- **Removed:** the `keywords` meta tag, and hreflang until `/ur` exists.
- **One schema `@graph` per page:** `Organization` and `WebSite` (with `@id`s, defined once), plus `WebPage` (with `url`, `breadcrumb`, `about`, `dateModified`), plus the template-specific type. No `AggregateRating` until reviews are shown on the page; no `LocalBusiness` except for real offices; no `Product` with `price: 0`.
- **FAQ:** visible `<details>` with 5-8 real questions (from sales and WhatsApp), each answer 40-80 words, starting with the direct answer. The FAQPage schema mirrors exactly what is visible.
- **Outbound links:** official sources (fbr.gov.pk, IRIS, pra.punjab.gov.pk, srb.gos.pk, kpra.kp.gov.pk, DRAP, SBP Raast, PTA DIRBS), opened in the same tab, with no `nofollow` on official sources.
- **Freshness:** a visible "Updated {date}" plus `dateModified` from content frontmatter. The sitemap `lastmod` uses the same value.

| Template | Title pattern | H1 / H2 structure | Schema (beyond base) | Required internal links |
|---|---|---|---|---|
| Home | `Nafaa: POS & Business Software for Pakistan \| Free Plan` | H1 "POS, khata and inventory software for Pakistani businesses". H2s: What Nafaa does · Who it's for (industries) · Offline + FBR · Pricing · Customers · FAQ | SoftwareApplication (offers from `plans`), FAQPage | all 6 hubs, top 8 industries, top 8 products, pricing, 12 city hubs (footer), compliance hub |
| Pricing | `POS Software Price in Pakistan: Plans from Rs {x}` | H1 "Nafaa pricing". H2s: Plans · Compare plans (table) · What hardware costs · FAQ | SoftwareApplication + `offers` (PKR, per plan) | product pages per plan feature, `/best/pos-software-pakistan`, `/services/hardware`, demo |
| Product | `{Feature} Software in Pakistan: {benefit}` (for example `Offline POS Software for Pakistani Shops`) | H1 = feature + Pakistan. AnswerBox. H2s: How it works (steps + screenshots) · Key features · Industries that use it · Compared with alternatives · Pricing · FAQ | SoftwareApplication (`featureList`), HowTo only if real steps are shown, FAQPage | product hub, 6 industries, 2-3 related products, glossary term, 1 guide, 1 compare page, pricing |
| Industry | `{Industry} Software in Pakistan: POS, Stock & Khata` | H1 "{Industry} software for Pakistani {shops}". AnswerBox + Roman Urdu summary. H2s: Problems it solves · Features for {industry} (screenshots of the real flow) · How a day works · Price for a {industry} shop · Buyer checklist · Comparison table · Customers · FAQ | SoftwareApplication (`applicationSubCategory`), FAQPage | industries hub, 4-6 products, 2 related industries, 1 solution, 2-3 posts/guides, 1 best/compare page, relevant compliance page (pharmacy → DRAP, restaurant → PRA/SRB), city hubs where it's a top industry |
| Solution | `{Segment} Software in Pakistan: {outcome}` | H1, AnswerBox. H2s: Who it's for · What you get · How it scales · Case/example · FAQ | Service or SoftwareApplication, FAQPage | products, matching industries, services, pricing/enterprise contact |
| Service | `Custom POS & Business Software Development in Pakistan` (per service) | H1. H2s: What we build · Process & timeline · Pricing model · Work examples · FAQ | Service (`provider` = Organization, `areaServed` = PK), FAQPage | solutions, API/integrations, contact form |
| CityHub | `POS Software in {City}: Billing, Stock & {Authority} Tax` | H1 "POS and billing software for {City} businesses". H2s: Which tax rules apply in {City} ({authority}) · Popular business types in {City} · Markets and areas we serve · Setup, training and support in {City} · {City} customers (only if real) · FAQ | WebPage `about` City (`Place` with Wikidata `sameAs`), `areaServed` on SoftwareApplication, FAQPage. No LocalBusiness unless there is a real office | `/pos-software`, province compliance page, top 4-6 national industry pages, 3 nearby cities, pricing |
| Compliance | `{Authority} POS Integration: Who Must Comply & How (2026)` | H1. AnswerBox (who, deadline, penalty). H2s: Who must integrate · Thresholds and SRO · Step by step · Costs · How Nafaa handles it · FAQ. SourceList | Article (author + `dateModified`), HowTo where there are steps, FAQPage | `/product/fbr`, city hubs in that province, the related industry pages, tools (Tier-1 checker, GST calculator) |
| BestOf | `Best {Category} Software in Pakistan (2026): {N} Compared` | H1. Methodology · Quick pick table · one H2 per product (price, strengths, weaknesses, best for) · How to choose · FAQ | Article + ItemList | compare pages, industry pages, pricing |
| Compare | `Nafaa vs {X}: Features, Price & Which to Choose` | H1. Short verdict. H2s: Comparison table · Where {X} is better (honest) · Where Nafaa is better · Switching from {X} · FAQ | Article, FAQPage | `/compare`, best-of page, products, data-migration service |
| Article | `{Query-first headline}` ≤ 60 characters | One H1 (fixes the double H1). TOC. H2/H3 in question form. A money-page link in the first 150 words | Article/BlogPosting (Person author, `datePublished`/`Modified`, `image`) | 1 money page, 2-3 glossary terms, 2 related posts, category |
| GlossaryTerm | `What is {Term}? Meaning in Urdu & Business Use` | H1 "What is {term}?" with a 1-sentence definition. H2s: Meaning (EN + Roman Urdu) · Example · How Nafaa handles it | DefinedTerm in DefinedTermSet | glossary hub, 1 product, 1 guide, 2 related terms |
| Tool | `{Tool} Calculator Pakistan: Free {Tax/Margin} Calculator` | H1, the tool island, then H2s: How it's calculated (formula, rates with source) · Examples · FAQ | WebApplication (free), FAQPage | the related compliance or product page |

The titles above are patterns. Each page's final title goes through a CI check: length 30-60, unique across the site, and no repeated brand.

---

## 5. Location strategy (no thin content)

**Remove or redirect:**
- All 372 `/{city}/{industry}` pages:
  - **Phase 0:** set `noindex,follow` and take them out of the sitemap, so Google sees the noindex.
  - **Phase 3:** 301 them to `/pos-software/{city}`, using one rule per city in `redirects.ts`.
  - Exceptions: pairs with GSC impressions where a gated pair page exists 301 to that pair page. Pairs with real industry intent and no city content 301 to the city hub, which links to the industry page.
- `/{city}` (404 today) → 301 to `/pos-software/{city}` for the 12 slugs.
- The city entries in `sitemap-images.xml` and the per-city `LocalBusiness` schema are deleted.

**Phase 3 city hubs (12):** Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Gujranwala, Sialkot, Peshawar, Quetta, Hyderabad, Bahawalpur. These are the existing cities, so all the redirects have a target.

**Phase 6 additions (up to 8):** Sargodha, Sahiwal, Rahim Yar Khan, Sukkur, Abbottabad, Mardan, Gujrat, Sheikhupura. A city is added only once it passes the gate below.

**Required unique content per hub (gate: at least 700 words of city-specific text, excluding nav, footer and shared FAQ):**
1. **Tax rules for that city:**
   - The authority: PRA for Punjab cities, SRB for Karachi and Hyderabad, KPRA for Peshawar, BRA for Quetta, ICT/FBR for Islamabad.
   - The services sales-tax rate that applies to restaurants, salons and similar businesses, with a dated source link.
   - Whether FBR Tier-1 applies.
2. **The local business mix**, with named markets and areas. Examples: Lahore has Hall Road, Anarkali, Liberty, Shah Alam and Gulberg; Karachi has Saddar, Tariq Road, Jodia Bazaar, DHA and Gulshan; Sialkot has sports and surgical exporters; Faisalabad has cloth markets and Kapra Mandi; Gujranwala has appliances and the HQ; Rawalpindi has Raja Bazaar and Saddar. **Areas (DHA, Gulberg, Johar Town, Bahria and so on) are H3 sections or FAQ items inside the hub, never separate URLs.**
3. **Top 4-6 industries in that city.** Each gets a short paragraph specific to the city and links to the national `/industries/{slug}` page. The industry list comes from real knowledge (prod signups by city if the API has them), not from the fake `topIndustries`.
4. **Setup and support:** on-site in Gujranwala, Lahore and Islamabad only if true; remote and WhatsApp everywhere; local hardware dealers or courier, if known.
5. **Real customers in the city**, only with permission. If there are none, the section is left out. It is never invented.
6. **A city FAQ** of 5-6 questions that differ from city to city (for example "Do Karachi restaurants need SRB integration?").
7. **Nearby cities** (3 links), a static map image, and Wikidata `sameAs` for the city.

**CI uniqueness test:** any two hubs must have under 50% 5-gram similarity on main content, or the build fails.

**City×industry pages** (`/pos-software/{city}/{industry}`) exist only when there is a real local case study or at least 5 real customers of that industry in the city, plus GSC or keyword demand. The cap is 30. Launch with 0. The best early candidates, once they pass the gate: restaurant (Lahore, Karachi, Islamabad), pharmacy (Lahore, Karachi), mobile-shop (Lahore/Hall Road, Karachi/Saddar), garments (Faisalabad, Lahore).

**Off-site location work (owner):** a Google Business Profile for each real office, with consistent NAP everywhere. For "POS near me" searches this matters more than any page.

---

## 6. AEO / GEO plan

### 6.1 On-site build list
1. **`src/lib/entity.ts`, the single source of facts:**
   - Name and disambiguation ("Nafaa (nafaa.pk), Pakistani POS and business software; not NAFA Funds").
   - Founded year, founder, HQ address, and contact.
   - Real counts: 31 industries, the cities that have customers, and live integrations.
   - Plans and prices, platforms (Web, Android, iOS, Windows: verify), languages, and compliance status in exact wording.
   - Everything else is generated from this file: the about page, Organization/SoftwareApplication JSON-LD, `llms.txt`, `llms-full.txt`, `knowledge-graph.json`, `ai-plugin.json`, the press kit and the footer.
2. **Answer-first blocks** on every money page: an H1 that matches the query, a 40-60-word direct answer, a key-facts list (price, platforms, offline, FBR, Urdu), H2s phrased as questions, tables, and an FAQ. All of it in server HTML, with nothing hidden behind JS tabs.
3. **Compliance hub (10 pages)** with dated sources and SRO numbers. This is the page most likely to be cited for "do I need FBR POS".
4. **Best-of pages (8) and compare/alternatives pages (14 + 5):**
   - Fair, with a methodology section.
   - Competitor prices carry their source and a check date.
   - Include Nafaa's real weaknesses.
5. **Original data report:** quarterly "Pakistan Retail Pulse" (busiest hours, average basket, udhaar recovery days, by industry), built from aggregated prod data. It needs owner approval and anonymisation. It is published at `/reports/{quarter}` with a downloadable chart, and it is the hook for press pitches.
6. **Glossary (100+ terms)** in EN with a Roman Urdu definition. Each term is a DefinedTerm.
7. **Free tools (6)** and **real templates (10)**. These attract links and citations.
8. **E-E-A-T pages:** author pages (`/team/{person}`, real people with LinkedIn), `/editorial-policy`, an about page with team and office, verified `/customers/{slug}` pages, and a `/reviews` page that links out to third-party reviews.
9. **Urdu pages** for the top 10 (Phase 5) with correct hreflang. Roman Urdu summary boxes on money pages from Phase 2 onward.
10. **Crawler access:**
    - Keep AI crawlers allowed: GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended.
    - Unblock `/_next/` and the JSON files.
    - Add IndexNow (a key file plus a ping on deploy) for Bing, which ChatGPT Search draws on.
    - Keep `llms.txt` accurate. It is cheap, but not a lever.
11. **Monitoring:**
    - `scripts/ai-visibility/` holds 40 fixed prompts (EN plus Roman Urdu, for example "best POS software in Pakistan", "khata app for kiryana", "FBR integrated POS Lahore", "pharmacy software Karachi", "custom software company Gujranwala").
    - Run them monthly against the ChatGPT, Gemini and Perplexity APIs where possible, and manually otherwise.
    - Log mention, rank and cited URLs to a CSV.
    - Also count GPTBot, OAI-SearchBot and PerplexityBot hits in the Vercel logs.

### 6.2 Off-site list (owner; this matters more than on-site for AI)
1. **Week 1:** Google Search Console and Bing Webmaster Tools. Verify both, check manual actions, submit sitemaps, export 16 months of data, and enable IndexNow.
2. **Google Business Profile** for the Gujranwala HQ and any real Lahore or Islamabad office, then a review drive with active Grocery and Bakery shops (no incentives).
3. **Review sites:** Capterra/GetApp (one Gartner listing), G2, Trustpilot, SoftwareSuggest (already ranks for "best POS Pakistan"), GoodFirms, and Clutch (for custom software). Target 20-50 genuine reviews in 90 days.
4. **Directories:** Product Hunt launch, AlternativeTo (as an alternative to Vyapar, Khatabook and Easy Khata), Crunchbase, F6S, ensun, and a LinkedIn company page with the same facts.
5. **Wikidata item** with sources. No self-written Wikipedia page.
6. **Press:** pitch ProPakistani, TechJuice, Profit, MenaBytes and Business Recorder with the data report or the FBR explainer. Ask to be included in ProPakistani's billing-software list, as a labelled sponsored post if needed.
7. **YouTube (Urdu):** 10 tutorials of 2-5 minutes with chapters and full descriptions linking to the matching pages.
8. **Reddit, Quora and Facebook shop-owner groups:** disclosed, genuinely helpful answers only.
9. **Play Store ASO:** Urdu and English listing, keywords (POS, khata, udhaar, billing, stock), Urdu screenshots, and a push for ratings.
10. **Partner listings:** JazzCash, Easypaisa and Raast directories, printer dealers, chambers of commerce (Gujranwala, Lahore, Sialkot), and FBR/PRA vendor lists if Nafaa qualifies.
11. **Fix or remove dead social profiles** (`twitter.com/nafaapk` and `youtube.com/@nafaapk` return 404), and use identical NAP everywhere.

### 6.3 What we can promise
Nothing can guarantee that an assistant always recommends Nafaa. We measure the monthly mention rate across the 40 prompts. Success is going from about 0% today to being mentioned in more than 30% of the P1 prompts within 6 months, with nafaa.pk among the cited URLs.

---

## 7. Build phases (each phase runs at most 6 agents in parallel)

Rules for every agent:
- Work in `apps/marketing` on branch `marketing/redesign`, except Phase 0, which goes on its own hotfix branch.
- Use server components, the content in `content/` (MDX plus zod frontmatter), and the shared sections.
- Write no fabricated facts. Check every feature claim against `apps/web` and `apps/api`, and every tax claim against an official source.
- Write English code comments, and keep UI microcopy in simple Roman Urdu where it faces users.
- Deploying always needs the owner's approval.

### Phase 0: emergency SEO hotfix on the current site (1-2 days, ship before the redesign)
The redesign takes weeks, and these fixes stop the bleeding now. Before starting, confirm which git branch the Vercel production deployment of marketing builds from.

| Agent | Builds |
|---|---|
| A1 Metadata | Remove `canonical`/`languages` from the root `buildMetadata()`. Set the title template `%s \| Nafaa` and strip duplicate suffixes. Add a server `layout.tsx` exporting `metadata` (title, description, canonical) to each of the 17 client-page folders plus `/demo`. Remove the `keywords` meta. |
| A2 Status codes and robots | Delete `src/app/loading.tsx`. Set `dynamicParams = false` on 7 dynamic routes. Drop the global `X-Robots-Tag` from `vercel.json`. Fix `/industries/carpet-shop` → `carpet`. In `robots.ts`, remove `/_next/` and `*.json$` from the disallow list. Reconcile the `/signup` redirects. |
| A3 Sitemap and blog | Point every `blog.ts` consumer at `blog/posts.ts` and delete `blog.ts`. 301 the 8 old slugs (digital-khata-complete-guide → digital-khata-vs-paper-ledger, fbr-pos-integration-guide-pakistan → fbr-e-invoicing-complete-guide-2026, pharmacy-drap-compliance-guide → drap-compliance-pharmacy, kiryana-store-profit-guide → how-to-start-kiryana-store-pakistan, how-to-start-business-in-pakistan-2026 → how-to-start-kiryana-store-pakistan, sell-online-pakistan-marketplace-guide → /marketplace, restaurant-foodpanda-integration-profits → restaurant-kot-system-guide, nafaa-bazaar-launch-announcement → /marketplace). Noindex and unlist the 9 stub posts. Remove the 372 city pages, non-HTML URLs and noindex pages from the sitemap and add `noindex,follow` to the city pages. Delete the image, video and news sitemaps. Remove hreflang. |
| A4 Trust cleanup | Remove `aggregateRating` everywhere, the per-city `LocalBusiness`, `stats.ts`, LiveActivityTicker/LiveNumbersBar and invented counts on home and city pages, and the "Certified FBR partner" wording. Remove dead `sameAs` entries. Make `llms.txt` and `llms-full.txt` read from the data files (31 industries, 12 cities). |
| A5 Speed quick wins | Remove `<GoogleAnalytics>` (keep GTM) and load GTM `afterInteractive` → idle. Remove the Noto `@import`. Drop the Cursor, ScrollProgress, CulturalMoment and PrayerTimeBanner widgets. Change hero `initial` from opacity 0 to visible. Fix the `PakistanMap` `r` error. |
| A6 Verify | Crawl all sitemap URLs plus 30 junk URLs and assert: status, self-canonical, unique title, one H1, no `aggregateRating`. Lighthouse on 5 URLs. Produce the before/after table. |

The owner removes the `NEXT_PUBLIC_META_PIXEL_ID` and `NEXT_PUBLIC_TIKTOK_PIXEL_ID` placeholders on Vercel. After the deploy: resubmit sitemaps and request indexing for `/pricing`, `/industries`, `/marketplace` and `/blog`.

### Phase 1: foundation (new design system and platform)
| Agent | Builds |
|---|---|
| B1 Tokens and primitives | Token sync script (web `tokens.css` → marketing), Tailwind config rewrite, Inter variable via `next/font`, type, space and radius scales, primitives (section 3.2), lint rules (no inline styles, no hex). |
| B2 Shell | Server Header with HTML mega menus plus a keyboard island, MobileNav island, server Footer sitemap, Breadcrumbs, consent banner (CSS plus a 1 KB island), `Analytics.tsx` (GTM after consent or idle, Clarity sampled), WhatsApp link, and new `not-found.tsx` and `error.tsx`. |
| B3 SEO platform | `lib/seo/page-metadata.ts` (title/description/canonical/OG with length asserts), `lib/seo/graph.ts` (one `@graph` builder per template), `lib/entity.ts`, sitemap index split (pages, products, industries, locations, content) with real `lastmod`, `robots.ts`, generated `llms*.txt`, IndexNow ping script, `redirects.ts` (one map, imported in `next.config.ts`; `vercel.json` redirects deleted), and tests: canonical = self, unique titles, schema validates, no 200 on junk URLs. |
| B4 Content pipeline | `content/{blog,guides,glossary,compare,best,compliance,cities,customers,products,industries,solutions,services}` as MDX or TS config with zod schemas, a loader, MDX components (AnswerBox, ComparisonTable, FAQ, Screenshot, Steps, SourceList, Callout, RomanUrduSummary), TOC, reading time, and an authors registry. |
| B5 Sections | Every section in 3.2, each with a story page at `/_dev/sections` (noindex, excluded from the build in production). |
| B6 Assets and CI | A Playwright script that captures real app screens from a seeded demo shop (Grocery, Bakery, Pharmacy, Restaurant, Mobile, Garments, khata, reports, FBR receipt) into AVIF, plus `opengraph-image.tsx` per template, a favicon set, Lighthouse CI config with budgets, and a GitHub Action. |

### Phase 2: money pages
| Agent | Builds |
|---|---|
| C1 | Home, `/pricing` (after Q1 is answered), `/product` hub, `/demo`, `/contact` |
| C2 | Products: pos, offline-pos, inventory, khata, billing, fbr, payments |
| C3 | Products: online-store, staff, reports, purchasing, multi-shop, mobile-app, loyalty, bookings, whatsapp-sms. Integrations hub plus live integrations only. `/marketplace` (Bazaar sellers and buyers) |
| C4 | Industries hub plus the Industry template, then deep pages (1,500+ words) for kiryana, bakery, pharmacy, restaurant |
| C5 | Deep pages for mobile-shop, garments, hardware, jewelry, then the other 23 industries at ≥ 700 unique words each, written from the real app flows (`apps/web` industry modules). Any industry that can't reach the bar ships `noindex` until it does. Add supermarket. |
| C6 | Solutions (7, including wholesale-distribution on `b2b-wholesale`, ecommerce on Shopify app + online store + Bazaar, and manufacturing as an honest lead page), Services (6, with LeadForm), about, founder-letter, team, editorial policy |

### Phase 3: locations and compliance
| Agent | Builds |
|---|---|
| D1 | Compliance hub plus 10 pages, with official sources, SROs and dates |
| D2 | City hubs: Lahore, Faisalabad, Rawalpindi, Multan, Gujranwala, Sialkot, Bahawalpur |
| D3 | City hubs: Karachi, Hyderabad, Islamabad, Peshawar, Quetta, plus the `/pos-software` index with a static SVG map |
| D4 | Location redirects (372 + 12), the uniqueness test, and the city entries in footer and nav |

### Phase 4: AEO content and link assets
| Agent | Builds |
|---|---|
| E1 | Best-of pages (8) |
| E2 | Compare pages (14) and alternatives (5), with competitor prices verified and dated |
| E3 | Blog: finish the 9 stub posts plus the 3 thin ones (1,200+ words each), 4 guide pillars, categories, RSS |
| E4 | Glossary: 100 terms |
| E5 | Tools (6, each an island under 15 KB) and templates (10 real XLSX/PDF files) |
| E6 | Customers (verified only), `/reviews`, press kit, changelog with real dated entries |

### Phase 5: Urdu, QA and cutover
| Agent | Builds |
|---|---|
| F1 | `/ur/` for the top 10 pages via next-intl server-side, with Noto Naskh scoped to `/ur`, RTL and hreflang pairs |
| F2 | Performance and a11y pass on every template until LH CI is green (95+/100/100/100) |
| F3 | Full crawl QA: status codes, canonicals, title and description uniqueness and length, H1 count, broken links, orphan check (every indexable page has ≥ 3 inbound links), schema validation (Rich Results test on 1 URL per template) |
| F4 | Delete old components, routes and data files. Verify all 301s against the GSC page export. Staging stays `noindex` behind preview auth. |

After the owner approves the deploy: submit the sitemap index in GSC and Bing, ping IndexNow, request indexing for the hubs, and set the 28-day CWV and ranking watch.

### Phase 6: ongoing (monthly)
- Run the AI-visibility prompts.
- Publish 4 posts and 10 glossary terms.
- Refresh the top 20 pages each quarter.
- Add city hubs that pass the gate, and city×industry pairs once there is a real case study.
- Publish the manufacturing page as a full product page once the module ships.
- Publish the quarterly data report.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Removing 372 city pages loses long-tail traffic | Export GSC Pages first. Every removed URL gets a 301 to the closest equivalent (city hub). Phase 0 uses noindex rather than deletion, so pages stay crawlable until Phase 3 redirects them. |
| Renamed or merged URLs lose rankings | Keep URLs wherever the intent is the same (`/industries/kiryana`, `/product/fbr`, `/product/multi-shop`, `/marketplace`, `/compare/*`). Moves go in one `redirects.ts`, which F4 tests against the GSC export. Merges: `/enterprise` → `/solutions/enterprise`, `/partner-portal` → `/partners`, `/api-explorer` and `/api-docs` → `/developers` (or noindex if the API isn't public), `/recipes` → `/integrations`, `/roi-calculator` and `/cost-predictor` → `/tools/pos-cost-calculator`, `/fbr-wizard` → `/tools/fbr-tier-1-checker`, `/solutions/coming-from-tally` → `/compare/nafaa-vs-tally`, `/solutions/coming-from-excel` → `/compare/nafaa-vs-excel`, `/solutions/small-business` → `/solutions/single-shop`, `/solutions/multi-location` and `/solutions/franchise` → `/solutions/retail-chains`, `/solutions/online-first` → `/solutions/ecommerce`, `/solutions/wholesale` → `/solutions/wholesale-distribution`, `/product/analytics` → `/product/reports`, `/product/notifications` → `/product/whatsapp-sms`, `/product/marketplace-selling` → `/marketplace`, `/gdpr` → `/privacy`, `/guides` stays (as the pillar hub), `/help` → app docs or `/faq`. |
| Fixing canonicals causes short-term ranking swings | Expected and positive in the long run. Monitor GSC daily for 2 weeks. |
| A manual action is already in place | Check GSC first. If there is one, finish Phase 0 A4, then file a reconsideration request that lists the removed markup and pages. |
| Agent-written content invents features, numbers or competitor facts | Every page has a `sources` frontmatter field. A fact-check pass reads `apps/web` and `apps/api` for features and official sites for tax. Competitor prices carry a date. `entity.ts` is the only home for numbers. |
| Prices disagree between site, app and database | Open question Q1 blocks `/pricing`, home and schema until it is answered. |
| Lighthouse 100 is lost once GTM or Clarity loads | Load them only after consent or idle. LH CI runs without consent. Field INP is watched in Speed Insights. |
| Shared React baseline makes "<100 KB JS" impossible | Budget page-specific JS instead (≤ 10 KB on content pages). Lighthouse 95-100 is still reachable with a static, low-TBT page. |
| Thin pages come back over time (23 smaller industries, new cities) | Word-count and similarity gates in CI. Pages below the bar are `noindex` automatically. |
| Brand collision (NAFA Funds, Nafa apps, "Bazaar") | Always write "Nafaa (nafaa.pk)", use `disambiguatingDescription`, add a Wikidata item, and write "Nafaa Bazaar", never "Bazaar" alone. |
| The custom-software head term is very competitive | Position it as customisation and integrations on Nafaa, and rely on Clutch and GoodFirms profiles for that query. |
| Production deploy | Only with owner approval. Phase 0 is small and can be rolled back. The redesign cuts over once, after F3 passes, with Vercel instant rollback ready. |

## Open questions for the owner (needed before Phase 2)
1. **Real prices and plan names.** The site shows 0/2,500/5,500/15,000; the API seed has 0/1,500/3,500/9,500. Which is live in the DB?
2. Which customers can be named, with logos and quotes, and in which cities?
3. Real office addresses: Gujranwala HQ, and Lahore or Islamabad?
4. FBR and PRA status: approved integrator, or "integrates with"? Is there a document number?
5. Which social profiles, app-store listings (Android, iOS, Windows) and YouTube channel actually exist?
6. Are custom software, online-store setup, data migration, hardware and training actually offered today? Who handles those leads?
7. Is Nafaa Bazaar (`bazaar.nafaa.pk`) live for buyers and sellers?
8. Can we have GSC and Bing access (or exports), and approval to publish aggregated prod data?
