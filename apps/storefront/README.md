# Nafaa Stores storefront (`apps/storefront`)

The customer-facing online store for Nafaa merchants: one Next.js (App Router)
app serves every shop, chosen by the request host. Data comes from the Nafaa
API public storefront routes (`/api/storefront/v1`, contract in
`~/nafaa-backups/wip/website-builder-contract.md`, section 1).

## Run locally (port 3300)

```bash
cd apps/storefront
pnpm install            # standalone project, uses apps/storefront/pnpm-lock.yaml
cp .env.example .env.local
pnpm dev                # http://localhost:3300
```

Pick a shop with `?store=<slug>` once (remembered in a cookie), or open
`http://<slug>.localhost:3300`. Draft preview from the theme editor:
`?store=<slug>&preview=<token>` (`?preview=0` leaves preview).

Without a running API set `STOREFRONT_MOCK=1`: four demo shops, one per
theme: `libaas` (fashion), `volt` (electronics), `bazaar` (grocery), `glow`
(beauty). Carts, checkout and orders work in memory (coupon `WELCOME10`,
login code `123456`).

## Environment

| Name | Where | Purpose |
| --- | --- | --- |
| `NAFAA_API_URL` | server | API base incl. `/api`, e.g. `https://api.nafaa.pk/api` |
| `STORE_ROOT_DOMAIN` | server + middleware | shops live at `<slug>.<root>`, e.g. `stores.nafaa.pk` (later `nafaa.store`) |
| `STOREFRONT_REVALIDATE_SECRET` | server | HMAC secret shared with the API for `POST /api/revalidate` |
| `STORE_EDITOR_ORIGINS` | build | origins allowed to show the store in an iframe (theme editor); default `https://app.nafaa.pk https://*.nafaa.pk http://localhost:5173` |
| `STOREFRONT_MOCK` | server | `1` = demo data, no API |
| `STORE_DEV_DEFAULT` | middleware | slug used on bare localhost when no `?store=` |

API side (`apps/api`): `STOREFRONT_URL` (this app's URL), the same
`STOREFRONT_REVALIDATE_SECRET`, `STORE_ROOT_DOMAIN`, and `VERCEL_TOKEN`,
`VERCEL_STOREFRONT_PROJECT_ID`, `VERCEL_TEAM_ID` for custom domains.

## How it works

- `src/middleware.ts` maps host → shop and rewrites every page to
  `/s/<site>/<lang>/<path>` (`lib/site.ts`). `/ur/...` is Urdu (RTL). The API's
  `resolve` answer (`redirectTo`) drives 308s to the primary domain.
- `lib/api.ts` is the only file that knows API paths and shapes. Reads are
  cached with tags `store:<id>`, `store:<id>:products`, … and refreshed by the
  API's signed webhook (`app/api/revalidate`).
- The browser never calls the API directly: `app/api/sf/[action]` bridges
  cart, checkout, search, login, newsletter, events and reports, with the cart
  token in the `nafaa_cart` cookie and the login in httpOnly `nafaa_customer`.
- Pages render the shop's theme document: `components/sections/Sections.tsx`
  maps every section type of the API theme schema
  (`apps/api/src/integrations/stores/theme/section-schema.ts`) to a component.
  Colours, fonts, corners, spacing, button and card style come from
  `ThemeDoc.tokens` (`lib/theme/tokens.ts`); `colorScheme` and `padding` work
  on every section.
- Theme editor bridge (`components/layout/PreviewBridge.tsx`, preview only):
  the editor posts `{type:'nafaa:refresh'}`, `{type:'nafaa:select', sectionId}`
  or `{type:'nafaa:hover', sectionId}`; the store answers `nafaa:ready` and
  `nafaa:clicked`.
- SEO: per-page metadata with canonical on the primary host, en/ur
  alternates, Open Graph, JSON-LD (Product + Offers with availability,
  BreadcrumbList, Organization, FAQPage, BlogPosting), `sitemap.xml`,
  `robots.txt` (noindex unless LIVE). Shopify-style URLs
  (`/products/<h>`, `/collections/<h>`, `/pages/<h>`, `/blogs/<b>/<p>`,
  `/policies/<kind>`); unknown paths look up imported redirects.

## Deploy on Vercel

1. New Vercel project from this repo, **Root Directory `apps/storefront`**,
   framework Next.js. `vercel.json` sets install/build (own lockfile, so no
   expo/electron install).
2. Env vars from the table (Production + Preview). Do not set
   `STOREFRONT_MOCK` in production.
3. Domains: add `stores.nafaa.pk` and the wildcard `*.stores.nafaa.pk`
   (a wildcard needs the domain's nameservers on Vercel, or a wildcard CNAME to
   `cname.vercel-dns.com` with Vercel's DNS verification). Merchant custom
   domains are added to this same project by the API (Vercel Domains API).
4. Give the API the project id (`VERCEL_STOREFRONT_PROJECT_ID`), a token and
   `STOREFRONT_URL=https://stores.nafaa.pk` so preview links and revalidation
   work.
5. Point the theme editor iframe at `https://<slug>.stores.nafaa.pk/?preview=<token>`
   (the API's `POST /stores/:id/preview-token` already returns that URL).

Note: on Vercel, on-demand ISR caches each shop page after the first visit.
Self-hosted `next start` renders those pages per request (Next matches ISR
routes on the pre-rewrite path there), while API reads stay cached by tag.
