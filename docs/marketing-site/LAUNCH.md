# nafaa.pk launch runbook: apps/marketing → apps/site

The steps below are in order. Each step says who does it. Nothing here runs by
itself: the lead runs the commands after the owner approves, and the owner
makes the Vercel and Railway changes.

- **Prod API:** `https://api.nafaa.pk/api`
- **Site:** `https://nafaa.pk`, the existing Vercel project that builds `apps/marketing` today.
- **Rollback:** at any point, see section 10. The old site stays deployable until the end.

Rules carried over from the deploy checklist: take a backup first, no live data
is ever deleted, migrations are scanned and applied before the code is
pushed, and nothing touches prod without the owner's go-ahead.

---

## 0. Before the day (lead, local)

1. Confirm the branch. The marketing Vercel project and Railway both build from `main`. `design/overhaul` has to be merged into `main` with `apps/site`, the API CMS module (`apps/api/src/admin-marketing/cms`) and the admin CMS screens. Main is not a fast-forward of the branch (see the deploy memory), so merge, don't fast-forward.
2. Typecheck and build in a clean worktree: `apps/api` (`pnpm build`), `apps/admin`, and `apps/site` (section 7.3 has the site build check).
3. Refresh the seed from local and review the diff in git:
   ```bash
   cd apps/api
   pnpm seed:cms:media-export -- --verify      # media/manifest.json, checks every file's SHA-1
   pnpm seed:cms:export-entries                # admin-written entries (developer docs) → content/exported/entries.json
   pnpm seed:cms                               # dry run against local: 0 errors expected
   pnpm seed:cms:check-redirects -- --probe=http://localhost:3200 --sample=4
   ```
   Last local result (21 Oct 2026): 508 of 508 old URLs resolved; a probe of 127 of them on the dev site all answered 200 or a redirect.
4. Owner work in the content that blocks publishing (section 11): legal text review, compare pages fact check, analytics ids.

## 1. Production database backup (lead)

Same procedure as earlier deploys (Postgres 18, pg_dump from Docker):

```bash
cd ~/nafaa-backups
railway run --service Postgres -- sh -c \
  'docker run --rm -v "$PWD":/out postgres:18 pg_dump "$DATABASE_PUBLIC_URL" -Fc -f /out/nafaa-prod-$(date +%Y%m%d-%H%M%S).dump'
psql "$DATABASE_PUBLIC_URL" -f ~/nafaa-backups/counts.sql > counts-before.txt   # row counts, read-only
```

Check that the dump file is not empty before going on.

## 2. Migration `20261024100000_marketing_cms` (lead)

The migration is additive: 5 enums and 11 new `Cms*` tables, with no change to
existing tables and no data written. It was scanned for DROP, DELETE,
TRUNCATE and column changes, and none were found. Railway's start command
runs `prisma migrate deploy`, so it would also apply on deploy. Apply it
first, by hand:

```bash
cd apps/api
# BOTH variables must point at prod (local .env DIRECT_URL is localhost).
railway run --service Postgres -- sh -c \
  'DATABASE_URL="$DATABASE_PUBLIC_URL" DIRECT_URL="$DATABASE_PUBLIC_URL" pnpm prisma migrate status'
# Expect: exactly one pending migration, 20261024100000_marketing_cms.
railway run --service Postgres -- sh -c \
  'DATABASE_URL="$DATABASE_PUBLIC_URL" DIRECT_URL="$DATABASE_PUBLIC_URL" pnpm prisma migrate deploy'
```

Then compare row counts with `counts-before.txt`. They should match, apart from live sales.

## 3. Railway env vars on "nafaa backend" (owner clicks, lead gives values)

| Variable | Value | Why |
|---|---|---|
| `SITE_PUBLIC_URL` | `https://nafaa.pk` | Absolute URLs, preview links, IndexNow host |
| `SITE_REVALIDATE_URLS` | `https://nafaa.pk/api/revalidate` | Where publish sends the signed revalidation (comma list; add a staging URL if one exists) |
| `SITE_REVALIDATE_SECRET` | new random value: `openssl rand -hex 32` | HMAC; the same value goes on Vercel |
| `CMS_PREVIEW_SECRET` | new random value: `openssl rand -hex 32` | Signs preview tokens. Without it, preview links fail in production |
| `SITE_INDEXABLE` | `true` | Turns on IndexNow pings (they also need `seo.indexNowKey`, which the seed sets) |
| `SITE_PREVIEW_URL` | optional | Only when previews should open on a staging site instead of `SITE_PUBLIC_URL` |

These are already set and stay as they are: `CLOUDINARY_*` (media uploads), `JWT_*`, `DATABASE_URL`. CORS already allows `https://nafaa.pk`, `www` and `*.vercel.app`.

## 4. Deploy the API and admin (lead, after the owner approves)

Push `main` and wait for Railway "nafaa backend" to show SUCCESS, and for the admin deploy to finish. Then check:

```bash
curl -s https://api.nafaa.pk/api/public/site/paths | head -c 200     # {"success":true,"data":{"items":[]}} on an empty CMS
```

## 5. Admin for the seed (owner)

The seed logs in through `POST /api/admin/auth/login`, which only accepts a `SUPER_ADMIN` user. Confirm that the owner's admin account signs in at admin.nafaa.pk. No new account is needed.

Auth for the scripts, first match wins:

1. `--email=<admin email>`: recommended. The script asks for the password (hidden on a terminal, or one line on stdin). It keeps the password in memory only and logs in again by itself when the 15-minute access token expires.
2. `CMS_SEED_TOKEN=<access token>`: paste a token from a logged-in admin tab. In the browser console on admin.nafaa.pk, run `JSON.parse(localStorage['nafaa-admin-auth']).state.accessToken`. It expires after `JWT_ACCESS_EXPIRES_IN` (15 minutes), so use it only for short runs.

Never put a password or token in a file or in shell history. Prefix the command with a space, or use `--email`.

## 6. Seed, media, menus and settings, then publish (lead, owner watching)

Every script is a dry run unless `--apply` is passed. Run each dry run first and read the plan.

```bash
cd apps/api
export CMS_API_URL=https://api.nafaa.pk/api
ADMIN=owner@example.com    # the owner's admin email

# 6.1 Plan against prod (nothing is written)
pnpm seed:cms -- --email=$ADMIN --report

# 6.2 Media first: uploads the 31 screenshots from media/manifest.json, tagged seed:<key>
pnpm seed:cms -- --email=$ADMIN --apply --only=media

# 6.3 Everything else as drafts: settings, FAQs, entries, redirects, menus
pnpm seed:cms -- --email=$ADMIN --apply

# 6.4 Publish (validates each entry first; skips stubs; retries relation order)
pnpm seed:cms:publish -- --email=$ADMIN
pnpm seed:cms:publish -- --email=$ADMIN --apply --note="Launch"
```

Expected on an empty prod CMS: media 31 uploaded; settings 6, FAQs 44, entries 142 created; redirects about 127 created; menus 3 created. Publish skips the 8 blog stubs. The 4 compare pages stay blocked until the owner fact-checks them; until then they 302 to `/compare`.

Each step can run again safely. Media is matched by tag or checksum, entries by path, FAQs by question, settings and menus by key, and redirects by `from`.

To overwrite instead of skipping:
- `--overwrite-settings` (all) or `--overwrite-settings=analytics,seo`
- `--overwrite-menus` (all) or `--overwrite-menus=header`. This replaces the old `push-menus.ts`.
- `--overwrite=/pricing,/industries/kiryana` for entries

Fill in settings `analytics` (GTM, Clarity) in Admin → Website → Settings, or leave it empty. The site falls back to the old Vercel variables (section 7.2).

Check after this step:
```bash
curl -s https://api.nafaa.pk/api/public/site/paths | grep -o '"path"' | wc -l      # about 134 published paths
pnpm seed:cms:check-redirects -- --api=https://api.nafaa.pk/api                    # 508 of 508 resolved
```

## 7. Vercel (owner clicks)

### 7.1 Optional but recommended: staging first

Create a second Vercel project from the same repo with Root Directory `apps/site`. Set the env vars below, but with `SITE_INDEXABLE=false`. Open its `*.vercel.app` URL, run the smoke checks in section 8 there, then delete it or keep it as staging. If you keep it, add its `/api/revalidate` URL to `SITE_REVALIDATE_URLS`.

### 7.2 The production project (the one serving nafaa.pk)

1. Settings → General → **Root Directory**: change `apps/marketing` to `apps/site`. Keep "Include files outside the root directory" at its default. Framework preset: Next.js. Install and build commands come from `apps/site/vercel.json` (`pnpm install --frozen-lockfile`, `pnpm build`), so leave the overrides off.
2. Settings → Environment Variables (Production). **Add these new variables:**

   | Variable | Value |
   |---|---|
   | `CMS_API_URL` | `https://api.nafaa.pk/api` |
   | `SITE_URL` | `https://nafaa.pk` |
   | `SITE_INDEXABLE` | `true` |
   | `SITE_REVALIDATE_SECRET` | same value as on Railway |
   | `INDEXNOW_KEY` | `nafaa-2026-indexnow` (must equal settings `seo.indexNowKey`; the old site used this key) |
   | `CLOUDINARY_CLOUD_NAME` | optional; the cloud name is read from each image URL when this is unset |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1` (optional: builds with the exact pnpm in `packageManager`, `pnpm@11.0.8`) |

   **Keep these existing variables unchanged.** `apps/site` reads the same names:
   `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` (fallback for `SITE_URL`), `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_CLARITY_ID`, `NEXT_PUBLIC_GOOGLE_VERIFICATION`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_CONV_SIGNUP` / `_LEAD` / `_DEMO` / `_PURCHASE`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID`, `NEXT_PUBLIC_LINKEDIN_PARTNER_ID`, `NEXT_PUBLIC_HOTJAR_ID`, `NEXT_PUBLIC_WHATSAPP`.
   `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PINTEREST_TAG_ID` and `NEXT_PUBLIC_SNAP_PIXEL_ID` are no longer read and do no harm.

   If settings `analytics.gtmId` or `analytics.clarityId` is filled in the CMS, it wins over the env var.
3. Deployments → **Redeploy** the latest `main` deployment, without the build cache. The build reads the prod API, so step 6 has to be finished first.
4. Before promoting, note the id of the current production deployment (the last `apps/marketing` build). Section 10 uses it.

### 7.3 Build check the lead already ran

A clean copy of `apps/site` was built with `pnpm install --frozen-lockfile` and `pnpm build`, with `SITE_INDEXABLE=true` and `CMS_API_URL` pointed at the local API. See the launch report for the result.

## 8. Smoke checks (lead, right after the deploy)

```bash
S=https://nafaa.pk
for p in / /pricing /product/pos /industries/kiryana /pos-software/lahore /blog /developers /privacy /terms /contact /demo; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' $S$p)" $p; done                 # all 200
curl -s $S/robots.txt                                    # Allow, Sitemap: https://nafaa.pk/sitemap.xml (no Disallow: /)
curl -sI $S/ | grep -i x-robots-tag                      # no "noindex" header
curl -s $S/sitemap.xml | head                            # sitemap index with children under /sitemaps/
curl -s $S/llms.txt | head -5 ; curl -sI $S/llms-full.txt | head -1
curl -s $S/nafaa-2026-indexnow.txt                       # prints the key
curl -s $S/ | grep -o '<meta name="google-site-verification"[^>]*>'   # Search Console tag present
for p in /lahore/kiryana /karachi /integrations/shopify /signup /posts/digital-khata-vs-paper-ledger /security /feed.xml; do
  printf '%s\n' "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' $S$p) $p"; done  # 308/307 to the right page
curl -s -o /dev/null -w '%{http_code}\n' $S/this-page-does-not-exist                    # 404
cd apps/api && pnpm seed:cms:check-redirects -- --api=https://api.nafaa.pk/api --probe=https://nafaa.pk --sample=5
```

In a browser:
- **Analytics:** open nafaa.pk in a private window with DevTools → Network.
  - Before any choice, `gtm.js?id=GTM-…` and `gtag/js?id=G-…` load once the page is idle, in consent mode. GA4 Realtime shows the visit after "Accept".
  - After "Accept", `clarity.ms/tag/…` loads (only in the sampled share of sessions; settings `analytics.claritySample`, default 10%), and so do any configured pixels (`fbevents.js`, TikTok, LinkedIn, Hotjar).
  - The first-party `POST /api/public/marketing/pageview` fires on every page.
- **Admin:** publish a small edit, for example a FAQ, and check the page updates within a few seconds. This is revalidation. Then open a preview link from the admin.
- **Old service worker:** returning visitors of the old site get `/sw.js`, which now removes the old caches and unregisters itself.

## 9. Post-launch (lead and owner)

1. **Search Console:** Sitemaps → submit `https://nafaa.pk/sitemap.xml`. Remove the old `sitemap-index.xml`, `sitemap-news.xml`, `sitemap-images.xml` and `sitemap-videos.xml` entries (they now redirect to `/sitemap.xml`). The verification meta tag keeps the property verified.
2. **Bing Webmaster:** submit the same sitemap.
3. **IndexNow:** publishing pings IndexNow by itself when `SITE_INDEXABLE=true` and `seo.indexNowKey` are set. For the first full ping, re-publish the hubs from the admin, or run:
   ```bash
   curl -s -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json' -d '{
     "host":"nafaa.pk","key":"nafaa-2026-indexnow","keyLocation":"https://nafaa.pk/nafaa-2026-indexnow.txt",
     "urlList":["https://nafaa.pk/","https://nafaa.pk/pricing","https://nafaa.pk/industries","https://nafaa.pk/product","https://nafaa.pk/solutions","https://nafaa.pk/blog"]}'
   ```
4. Request indexing for the hubs in GSC. Watch Pages → "Not found (404)" and "Page with redirect" daily for two weeks, and add any missing redirect in Admin → Website → Redirects.
5. Run the 28-day CWV and ranking watch (PLAN 7). Measure the onboarding drop-off again.

## 10. Rollback

- **Fast (no rebuild):** Vercel → Deployments → the last `apps/marketing` production deployment (noted in 7.2 step 4) → "Instant Rollback". nafaa.pk serves the old site again in seconds.
- **Lasting:** Settings → Root Directory back to `apps/marketing`, then redeploy. The old env vars were never removed, so the old site works as before. The new variables (`CMS_API_URL`, `SITE_*`, `INDEXNOW_KEY`) are ignored by the old site.
- **API:** the CMS tables and the API module can stay. They are additive and the app does not use them. Do not roll the migration back: it holds the content.
- **Revalidation noise:** if the old site is back for long, clear `SITE_REVALIDATE_URLS` on Railway so publishes stop calling `/api/revalidate`.

## 11. Open items before launch (owner)

1. **Legal pages.** `/privacy`, `/terms`, `/refund`, `/cookies`, `/account-deletion` and `/data-deletion` are copied word for word from the old site (`content/pages/legal.ts`), because app stores, Shopify and Meta link to them. The claims they repeat need a decision:
   - privacy: "ISO 27001 certified infrastructure, 256-bit encryption";
   - terms: "99.99% uptime, status at /status";
   - refund: the 30-day money-back guarantee;
   - cookies: lists GA4 and Vercel only, not GTM, Clarity or the pixels.
   The app's own policy (`apps/web/src/modules/legal/content.ts`) is a different text.
2. **Compare pages.** `nafaa-vs-excel`, `-tally`, `-quickbooks` and `-paper-register` need "fact checked" in the admin (and a `competitorUrl` decision for the paper register) before they can publish. Until then they 302 to `/compare`.
3. **Redirect choices to confirm** (in `redirectsNeedingOwner`): `/about`, `/careers` and `/founder-letter` → `/contact`; `/help` → `/faq`; `/api-docs`, `/api-explorer` and `/playground` → `/developers`; `/press` → `/changelog`; `/status` → `/changelog`.
4. **Analytics behaviour change.** The old site loaded Clarity and the ad pixels for every visitor. The new site loads them only after consent, and records Clarity for 10% of sessions (settings `analytics.claritySample`). Google tags load on idle in consent mode, as they did before. Set the sample to 1 in the admin to record every consenting session.
