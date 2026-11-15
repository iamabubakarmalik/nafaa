/**
 * Changelog entries for work shipped between 13 Oct and 15 Nov 2026. The two
 * earlier entries (new-design, shopify-app-install) live in
 * main-pages/hubs.ts next to the /changelog hub.
 *
 * Source: commit messages in `git log` only. Dates are the production
 * deploy dates from the deploy record: 13 Oct (three deploys), 14 Oct,
 * 19 Oct (99612d42), 20 Oct (0ada4b2d), 21 Oct (new site) and 26 Oct
 * (45d75a3f). Work committed earlier than its deploy carries the deploy date.
 */

import { richText, withIds } from '../../lib/blocks';
import type { EntryRef, SeedEntry } from '../../lib/types';

type Kind = 'new' | 'improved' | 'fixed';

interface ChangeSpec {
  slug: string;
  title: string;
  date: string;
  kind: Kind;
  /** One or two sentences; also the SEO description unless `seoDescription` is set. */
  summary: string;
  /** Meta description (120-160 characters) when the summary is longer. */
  seoDescription?: string;
  /** Pages this change affects (shown as related links). */
  related?: EntryRef[];
  markdown: string;
  commits: string[];
  evidence: string[];
  /** Overrides the default fact-check note. */
  note?: string;
}

const W = 'apps/web/src';

function change(c: ChangeSpec): SeedEntry {
  const key = `CHANGELOG:${c.slug}`;
  return {
    type: 'CHANGELOG',
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    data: { date: c.date, kind: c.kind },
    blocks: withIds(key, [richText(c.markdown)]),
    seoTitle: c.title,
    seoDescription: c.seoDescription ?? c.summary,
    relations: (c.related ?? []).map((ref) => ({ ref, kind: 'RELATED' as const })),
    focusKeyword: `nafaa ${c.title.toLowerCase().split(' ').slice(0, 2).join(' ')}`,
    origin: `new (changelog from commits ${c.commits.join(', ')}; 26 Oct 2026)`,
    evidence: c.evidence,
    factCheck: { checkedOn: '2026-10-26', note: c.note ?? `Written from the commit messages of ${c.commits.join(', ')}; date is the production deploy date.` },
    dropped: [],
    needsOwner: [],
  };
}

const CHANGES: ChangeSpec[] = [
  // ─── Late October and November 2026 (added 15 Nov 2026, round 7) ───
  {
    slug: 'live-support-chat',
    related: ['PAGE:contact', 'PAGE:help', 'PAGE:mobile-app'],
    title: 'Live support chat inside Nafaa',
    date: '2026-11-15',
    kind: 'new',
    summary: 'Chat with the Nafaa team from inside the app: Nafaa AI answers common questions first, and a person from our team takes over when you ask.',
    seoDescription: 'Nafaa Support chat inside the web and mobile app: Nafaa AI answers common questions first, then our team takes over, with screenshots, files and voice notes.',
    markdown: `## What changed

Help is now one tap away inside Nafaa. Open **Nafaa Support** from the app and write to us the way you would on WhatsApp:

- Messages show when they are delivered and read, and you can see when our team is typing.
- Send screenshots, files and voice notes.
- **Nafaa AI** answers common questions straight away, in your language. Ask to talk to the support team and a person takes over.
- On a computer, our team can call you and, with your permission, see your screen to guide you step by step.
- Replies reach you as a notification even when the app is closed.

## On the phone

The chat, photos and files work in the Nafaa POS mobile app now. Voice notes and calls on the phone come with the next app update in the stores.`,
    commits: ['804a6105'],
    evidence: [`${W}/modules/support/components/SupportChat.tsx`, `${W}/modules/support/lib/call.ts`, 'apps/api/src/modules/support/support-ai.service.ts', 'apps/mobile/src/modules/support'],
  },
  {
    slug: 'nafaa-stores-website-builder',
    related: ['PRODUCT:online-store', 'SOLUTION:ecommerce'],
    title: 'Nafaa Stores: build your own store website',
    date: '2026-11-13',
    kind: 'new',
    summary: 'Shops can now build their own online store website in Nafaa, with themes, a theme editor, checkout, a free store address, their own domain and a move from Shopify.',
    seoDescription: 'Nafaa Stores is live: build a store website from your Nafaa products with themes, checkout, a free stores.nafaa.pk address, your own domain and a Shopify move.',
    markdown: `## What changed

**Nafaa Stores** turns the products, prices and stock already in Nafaa into a store website:

- Four themes made for clothing and shoes, electronics, grocery and pharmacy, and beauty, with a theme editor and live preview.
- Collections, pages, menus, a blog, policies, shipping zones and rates.
- Checkout with cash-on-delivery and the payment accounts you connect, an advance on risky COD orders and a WhatsApp confirm step.
- A free address on stores.nafaa.pk, or your own domain with the DNS records shown on screen.
- Move from Shopify: collections, pages, blog posts, menus, redirects, policies and customers, plus a Shopify theme import as a starting draft.
- Fill the store's Urdu text with Nafaa AI.

Website orders arrive in the same order desk as every other channel, with couriers, COD checks and dispatch. A column in Products & stock shows what is on the website.`,
    commits: ['e13df49c', '76833646', '6d49b6ea', '9ca13e71'],
    evidence: ['apps/api/src/integrations/stores/stores.service.ts', 'apps/api/src/integrations/stores/theme/presets.ts', 'apps/api/src/integrations/stores/store-domains.service.ts', 'apps/api/src/integrations/stores/store-shopify-import.service.ts', `${W}/integrations/stores/pages/ThemeEditorPage.tsx`],
  },
  {
    slug: 'plans-free-plan-and-add-ons',
    related: ['PAGE:pricing'],
    title: 'New plans: a Free plan and add-ons',
    date: '2026-11-12',
    kind: 'new',
    summary: 'Plans now come with a clear feature list, a Free plan for very small shops, and add-ons that switch on only the parts a business uses, such as an online store, channels or distribution.',
    seoDescription: 'Nafaa plans now have feature lists, a Free plan for very small shops, optional add-ons for online selling, distribution and more, and one-time setup help.',
    markdown: `## What changed

- **Free plan.** Very small shops can keep using Nafaa for free with one shop, one user and small limits.
- **Feature lists.** Each plan lists what it includes, and the [pricing page](/pricing) compares them side by side.
- **Add-ons.** Shopify, WooCommerce, Daraz, your own store website, courier booking, distribution (by the number of bookers), extra shops and users, and Nafaa AI Plus are switched on only when you need them. An add-on appears in the menu only after you turn it on.
- **Setup help.** Assisted setup online, or Full activation with our team at your shop, as one-time options.
- **Clear dates.** The billing page shows the exact date and time your plan ends, with reminders before it does. If a plan ends, the app pauses until renewal; nothing is deleted.`,
    commits: ['40e9da39', 'e0bbeefd', '01977c2c', 'b1ed2b1d'],
    evidence: ['apps/api/src/modules/billing/entitlements/feature-catalog.ts', 'apps/api/src/modules/billing/pricing/billing-lifecycle.service.ts', `${W}/modules/billing/pricing/components/PlanGate.tsx`, `${W}/modules/billing/pricing/components/AddOnSheet.tsx`],
  },
  {
    slug: 'channel-price-safety',
    related: ['PRODUCT:online-store', 'PRODUCT:inventory'],
    title: 'Price safety for online channels',
    date: '2026-11-10',
    kind: 'improved',
    summary: 'A price push that would cut or raise a channel price by a large amount now waits for your OK, and product links between Nafaa and your channels are checked for mistakes.',
    seoDescription: 'Large price changes to Shopify, WooCommerce and Daraz now wait for your OK, suspect product links are flagged, and each product form has one category field.',
    markdown: `## What changed

- **Price guard.** A price push to Shopify, WooCommerce or Daraz is held when it would drop the channel price by 40% or more, raise it by 150% or more, or differ by 40% on the first push. You confirm or decline it.
- **Safer linking.** Products are only linked automatically when their names share real words or their SKU or barcode match exactly. Links that look wrong are listed so you can unlink them or keep them.
- **One category field** on every product form, in every industry, with a quick "+ new category".`,
    commits: ['5d73c32b'],
    evidence: [`${W}/integrations/online-orders/pages/OnlineProductsPage.tsx`],
  },
  {
    slug: 'product-library',
    related: ['PRODUCT:product-library', 'INDUSTRY:pharmacy', 'INDUSTRY:kiryana'],
    title: 'Product library: ready product lists for every trade',
    date: '2026-11-10',
    kind: 'new',
    summary: 'Start from a ready product list: more than 21,000 medicines from the DRAP price index for pharmacies, grocery items with barcodes, and starter lists for 23 other trades.',
    seoDescription: 'New product library in Nafaa: DRAP medicines with salts and MRP, grocery items with barcodes and starter lists for 23 trades, plus a Same formula button.',
    markdown: `## What changed

The new **product library** replaces typing products one by one:

- **Pharmacy:** 21,785 medicines from the DRAP Pharmaceutical Product Price Index, with salts and strength, form, pack, company, registration number and MRP. Cost is worked out from a margin you set.
- **Grocery:** 1,720 items, 1,069 with barcodes.
- **Starter lists** for 23 other trades, with estimated prices marked as such.

Search, tick what you sell, choose the branch and opening stock, and the products are created in the background. Items you already have are not created twice.

## Same formula at the pharmacy counter

Every medicine line on a pharmacy bill now has a **Same formula** button. It shows the other medicines you stock with the same salts and strength, with their prices, so you can swap or add a substitute in one tap.`,
    commits: ['d4501321', '8a0eb1e9'],
    evidence: ['apps/api/src/modules/inventory/products/library/library-data.ts', `${W}/modules/inventory/products/library/ProductLibrary.tsx`, 'apps/api/src/industries/pharmacy/common/strength.ts'],
  },
  {
    slug: 'two-way-channel-sync-and-growth-tools',
    related: ['PRODUCT:online-store', 'SOLUTION:ecommerce'],
    title: 'Two-way channel sync and online growth tools',
    date: '2026-11-09',
    kind: 'new',
    summary: 'Choose where each price is changed, sync names, descriptions, pictures and stock both ways with your website, and use new tools to win back buyers and confirm orders.',
    seoDescription: 'Nafaa now syncs price, name, description, pictures and stock both ways with your website, and adds a confirmation call queue, coupons, product radar and more.',
    markdown: `## What changed

**Channel sync.** For each channel, choose where prices are changed: in Nafaa, on the website, or whichever changed last. A website price change made after Nafaa's push is held for you to pick instead of being overwritten. A "sync everything" preset keeps price, name, description and pictures in step both ways, imports new website products and takes hand-edited website stock in as an adjustment.

**Growth tools** in the online store workspace:

- A **call center** queue for confirming new orders, with callbacks and a call log.
- **Abandoned carts** and coupon automation with personal codes.
- **Product radar:** items rising and falling, and products bought together.
- **Reviews**, **loyalty** for online buyers and an order tracking page for buyers.
- **International pricing** for a custom storefront, with country prices and exchange rates.`,
    commits: ['080f8bd2', 'd4501321'],
    evidence: [`${W}/integrations/online-orders/pages/CallCenterPage.tsx`, `${W}/integrations/online-orders/pages/ProductRadarPage.tsx`, `${W}/integrations/online-orders/pages/ConversionPage.tsx`, `${W}/integrations/online-orders/pages/InternationalPage.tsx`],
  },
  {
    slug: 'online-order-desk-and-dispatch',
    related: ['PRODUCT:online-store', 'SOLUTION:ecommerce', 'PAGE:mobile-app'],
    title: 'New online order desk, dispatch and courier tools',
    date: '2026-11-09',
    kind: 'new',
    summary: 'A new online store workspace: an orders board, add and fully edit orders, scan-to-pack dispatch, a live parcel map, a courier scorecard, automation rules and more couriers.',
    seoDescription: 'New Nafaa online order desk: orders board, add and edit orders, scan-to-pack dispatch, parcel map, courier scorecard, automation rules and more couriers.',
    markdown: `## What changed

- **Orders board** for every channel, with **add order** for WhatsApp, Instagram and phone orders, and **full order edit**.
- **Dispatch:** scan items while packing, scan parcels out, print labels and invoices in bulk, and scan returns back into stock.
- **Parcel map** of Pakistan showing every parcel by city, with lists of stuck, failed and returning parcels.
- **Courier scorecard:** delivery rate, returns, days to deliver and COD payment delay per courier and city; the best courier per city can go into auto-booking.
- **Automation:** "if this, then that" rules on orders and stock, plus ready-made recipes.
- **More couriers**, including InstaWorld and ShipNOC booking, and tracking for Tranzo, Swyft, BarqRaftar, Pakistan Post and others.
- **Products & stock** redesigned, with suppliers per product, a category tree, better packs and units, and selling when out of stock (backorder) per product and channel.

The online store workspace is in the Nafaa POS mobile app too.`,
    commits: ['5f87d973', '8e83595f', '85084db5', 'b304805f', '45c4e60e', '55631b60'],
    evidence: [`${W}/integrations/online-orders/pages/OnlineOrdersPage.tsx`, `${W}/integrations/online-orders/pages/AddOrderPage.tsx`, `${W}/integrations/online-orders/pages/DispatchScanPage.tsx`, `${W}/integrations/online-orders/pages/TrackingMapPage.tsx`, `${W}/integrations/online-orders/pages/CourierScorePage.tsx`, `${W}/integrations/online-orders/pages/AutomationPage.tsx`, 'apps/api/src/integrations/online-orders/couriers.ts'],
  },
  {
    slug: 'nafaa-pos-on-the-app-store',
    related: ['PAGE:mobile-app'],
    title: 'Nafaa POS is on the App Store',
    date: '2026-11-09',
    kind: 'new',
    summary: 'The Nafaa POS app is now on the App Store for iPhone and iPad. Sign in with your Nafaa account, including Sign in with Apple.',
    seoDescription: 'Nafaa POS is now on the App Store for iPhone and iPad: billing, stock, khata and reports, working offline. Sign in with your existing Nafaa account.',
    markdown: `## What changed

Nafaa POS 2.0 is live on the [App Store](https://apps.apple.com/pk/app/nafaa-pos-business-manager/id6769007778) for iPhone and iPad, with the same offline engine, counter, stock, khata, reports, alerts and three languages as the Android app.

On iPhone and iPad the app is for signing in to an existing Nafaa account. Create your account at nafaa.pk or in the Android app, then sign in on the iPhone with the same login or with Sign in with Apple. See the [mobile app](/mobile-app) page.`,
    commits: ['a9dc75fd', 'aac73f5d'],
    evidence: ['apps/mobile/app.json', 'apps/mobile/src/modules/auth/components/AppleButton.tsx'],
  },
  {
    slug: 'nafaa-pos-mobile-app-2',
    related: ['PAGE:mobile-app', 'PRODUCT:offline-pos'],
    title: 'Nafaa POS 2.0 mobile app on Google Play',
    date: '2026-11-04',
    kind: 'new',
    summary: 'The Nafaa POS app is rebuilt from the ground up and live on Google Play: a new design, full offline billing that syncs by itself, three languages and push alerts.',
    seoDescription: 'Nafaa POS 2.0 is on Google Play: rebuilt app with offline billing that syncs by itself, khata, stock, reports, push alerts and English, Urdu and Roman Urdu.',
    markdown: `## What changed

Nafaa POS 2.0 is a new app, built again from the start:

- **Offline engine.** Products, stock, customers and the last 30 days of bills live on the phone. Bills, new customers and khata payments made offline are sent by themselves later, never twice.
- **New design** with light and dark mode, and a Home with today's sale, profit and a daily target.
- **Every business type:** screens for 30 trades, plus the order booker and delivery screens for distributors.
- **Alerts:** new sales, payments, low stock, online orders and more as push notifications, with a choice per person, quiet hours and alert tones.
- **English, Urdu and Roman Urdu.**
- **Nafaa AI** inside the app.

Get it on [Google Play](https://play.google.com/store/apps/details?id=com.nafaa.app). See the [mobile app](/mobile-app) page for details.`,
    commits: ['61acd6ba', 'aac73f5d', '42e868cd', 'f713ecb5', '991877a6'],
    evidence: ['apps/mobile/src/core/offline/README.md', 'apps/mobile/src/modules/notifications/api/notifications.ts', 'apps/mobile/app.json'],
  },
  {
    slug: 'three-languages',
    related: ['PAGE:languages', 'PRODUCT:ai-assistant'],
    title: 'Nafaa in English, Urdu and Roman Urdu',
    date: '2026-11-02',
    kind: 'new',
    summary: 'The whole Nafaa app now works in English, Urdu (right to left) and Roman Urdu. Each person picks their own language; new accounts start in English.',
    seoDescription: 'The whole Nafaa app now works in English, Urdu (right to left) and Roman Urdu. Each person picks their own language from login, profile menu or Settings.',
    markdown: `## What changed

- Every screen of the web app, and messages from the server, are now in **English, Urdu and Roman Urdu**, in simple words.
- **Urdu** turns the whole screen right to left, with an Urdu font made for screens; Nastaliq styles can be chosen under Appearance.
- **Each person chooses** their language on the login page, at sign-up, from the profile menu or in Settings.
- New accounts start in English. Existing users stay on Roman Urdu until they switch, so no one's screen changed overnight.

See [Nafaa in three languages](/languages).`,
    commits: ['afc5f974', 'cb824e15', 'fe626f0b'],
    evidence: [`${W}/core/i18n/locales.ts`, `${W}/core/i18n/components/LanguagePicker.tsx`, `${W}/design-system/tokens/typography.ts`],
  },
  {
    slug: 'wholesale-and-distribution',
    related: ['SOLUTION:wholesale-distribution', 'PAGE:mobile-app'],
    title: 'Wholesale and distribution, with the order booker app',
    date: '2026-10-30',
    kind: 'new',
    summary: 'Distributors can now run the full cycle in Nafaa: order booker and delivery apps, routes, price lists, schemes, load sheets, settlement, recoveries, vans, returns, claims and the trade network.',
    seoDescription: 'Nafaa distribution: order booker app that works offline, routes, price lists, schemes, load sheets, delivery, settlement, recoveries, vans, claims and targets.',
    markdown: `## What changed

- **Order booker app** that works offline, with GPS check-in at each shop.
- **Office:** price lists per customer group, schemes, routes, orders approved into invoices, load sheets, delivery, the evening settlement and recoveries checked by the office.
- **Credit control:** limit and overdue warnings at booking, and a manager PIN when invoicing over the limit.
- **More:** van sales, market returns, principal claims, targets, post-dated cheques and the daily sales report.
- **Trade network:** distributors and retailers on Nafaa can link, order from each other, and share one account between them with payments confirmed on both sides.
- **Sign-up** now asks how you sell (retail, wholesale, distribution, e-commerce) and shows the trades that fit.

See [wholesale and distribution](/solutions/wholesale-distribution).`,
    commits: ['5223deb9', 'a45f2f5f'],
    evidence: [`${W}/modules/distribution/pages/OrdersPage.tsx`, `${W}/modules/distribution/pages/SettlePage.tsx`, `${W}/modules/trade-network/pages/NetworkPage.tsx`, 'apps/mobile/app/(distribution)/booker'],
  },
  {
    slug: 'profit-on-payment-and-other-income',
    related: ['PRODUCT:reports', 'PRODUCT:khata'],
    title: 'Profit on khata payments, other income and stock loss',
    date: '2026-10-29',
    kind: 'improved',
    summary: 'Profit on khata sales can now be counted when the money comes in, other income adds to net profit, and stock adjustments show as a loss or a gain in profit and loss.',
    seoDescription: 'Nafaa now counts profit on khata sales when payment comes in, adds other income to net profit, and shows stock loss and gain separately in profit and loss.',
    markdown: `## What changed

- **Profit on payment.** For sales on khata, profit can be counted as the money comes in (the new default) instead of on the day of the bill. Both figures show on the dashboard, day report, profit and loss, profit report and customer profile.
- **Other income** such as incentives, scheme claims and commission, settled in cash, to an account or against a supplier, now adds to net profit.
- **Stock gain and loss.** Each stock adjustment reason is a loss, a gain or neither, and profit and loss shows them separately.
- **Day report** expected cash now handles the khata part of refunds and khata collected in cash correctly.
- **Manufacturing** (off by default): recipes and production with cost from raw materials.`,
    commits: ['8171624a'],
    evidence: [`${W}/modules/finance`, `${W}/modules/reports`],
  },
  {
    slug: 'online-products-hub-and-order-profit',
    related: ['PRODUCT:online-store'],
    title: 'Online products hub, channel prices and order profit',
    date: '2026-10-29',
    kind: 'new',
    summary: 'One place to link products to every channel with its own price, plus true profit per order, COD statement matching, courier rules, scan-to-pack and risk checks.',
    seoDescription: 'Nafaa online products hub with channel prices, plus true profit per order, COD statement matching, courier auto-booking rules, scan-to-pack and fake-order risk.',
    markdown: `## What changed

- **Online products:** link products to Shopify, WooCommerce, Daraz and your website in one place, with a price per channel (a rule or a single product override) and stock push per channel.
- **True profit per order:** courier charge, COD fee, gateway fee, packaging and returns taken off each order.
- **COD statement matching:** upload a courier's statement and match it to your orders.
- **Courier rules** for auto-booking, **scan-to-pack**, **return scan** and **risk checks** for fake orders.
- **Growth tools:** a price calculator, landed cost and ad spend against sales.`,
    commits: ['4c0f6d63', '115622bd'],
    evidence: [`${W}/integrations/online-orders/pages/OnlineProductsPage.tsx`, `${W}/integrations/online-orders/pages/OrderCostsPage.tsx`, `${W}/integrations/online-orders/pages/CodReconcilePage.tsx`, `${W}/integrations/online-orders/pages/CourierRulesPage.tsx`],
  },
  {
    slug: 'keyboard-first-pos-counter',
    related: ['PRODUCT:pos', 'SERVICE:training'],
    title: 'Keyboard-first POS counter and four layouts',
    date: '2026-10-26',
    kind: 'new',
    summary: 'The POS counter now works fully from the keyboard, has a compact cart, and offers four layouts with feature toggles that each shop can set as defaults.',
    markdown: `## What changed

The counter can now take a whole sale without the mouse:

- Type to search, set quantity with \`qty*\`, then add the item.
- **F2** customer, **F3** bill lines, **F4** discount, **F6** hold or resume, **F7** combos, **F8** payment method, **F10** quick keys, **F12** cash and print.
- **Ctrl+Enter** goes to checkout, **Ctrl+P** reprints the last bill and **Alt+R** repeats the last bill.
- Press **?** for the full list of keys.

The cart is more compact, with the totals always in view, and the receiver, udhaar, discount and delivery shown as small chips, so more items fit on screen.

## Layouts and toggles

Choose one of four layouts: **Classic**, **Express** (large search with a bill table, for barcode and keyboard use), **Cart-focus** and **Touch**. The owner sets the layout and which parts of the counter show as shop defaults; each person can pick their own layout on their computer.

## Keys that moved

If your staff used the old keys: F2 now opens the customer (it was camera scan), F6 holds the bill (it was voice), F8 opens the payment method (it was combos), F9 opens the More menu (it was the payments screen), and combos moved to F7.`,
    commits: ['45d75a3f'],
    evidence: [`${W}/modules/pos/components/PosShortcutsOverlay.tsx`, `${W}/modules/pos/lib/posCounterConfig.ts`, `${W}/modules/pos/components/PosLayoutPreview.tsx`],
  },
  {
    slug: 'keyboard-shortcuts-across-the-app',
    related: ['PRODUCT:pos', 'PRODUCT:inventory'],
    title: 'Keyboard shortcuts across the whole Nafaa app',
    date: '2026-10-26',
    kind: 'improved',
    summary: 'Lists, menus, dialogs and forms now work from the keyboard across the app: Ctrl+S saves, G-key shortcuts jump between pages, / searches and ? shows every key.',
    markdown: `## What changed

Keyboard use is no longer limited to the counter:

- Move through lists, menus and dialogs with the arrow keys, Enter and Esc.
- **Ctrl+S** saves forms.
- **G** followed by a letter jumps to a page.
- **/** puts the cursor in search.
- **?** opens an overlay with the keys for the page you are on.

Skip links and a clear focus ring show where the keyboard is at all times.

## Why

Clients told us that reaching for the mouse slows down busy staff. Most daily work in Nafaa can now be done from the keyboard alone.`,
    commits: ['45d75a3f'],
    evidence: [`${W}/app/shell/keyboard/useGlobalKeys.ts`, `${W}/app/shell/keyboard/ShortcutsHelp.tsx`, `${W}/core/lib/shortcuts.ts`],
  },
  {
    slug: 'bulk-import-create-edit',
    related: ['PRODUCT:inventory', 'SERVICE:data-migration', 'TEMPLATE:product-import-template'],
    title: 'Product import rebuilt, plus bulk create and edit',
    date: '2026-10-26',
    kind: 'improved',
    summary: 'Product import reads more files correctly and shows an editable sheet before saving. New bulk create and bulk edit pages change many products at once.',
    markdown: `## What changed

**Import**

- Finds the header row by itself and understands column names in English, Urdu and Roman Urdu.
- Reads numbers written in common local formats.
- Shows the data in an editable sheet before anything is saved, with paste from Excel and undo.
- Phones can be imported with an IMEI column.
- Import history lets you open an earlier import, edit it, fix rows and import again.

**Products that already exist**

For each existing product you can set stock to the file's figure, add the file's figure to current stock, or skip it. Re-importing now sets stock to the file value by default; before, existing products were skipped. Every stock change is posted as a stock adjustment, so it shows in the product's history.

**Bulk create and bulk edit**

Two new pages add many products at once, or change prices, stock and other fields for many products in one sheet.

## Permissions

Changing stock through import or bulk edit needs the stock adjustments permission.`,
    commits: ['45d75a3f'],
    evidence: [`${W}/modules/inventory/products/pages/ProductBulkImportPage.tsx`, `${W}/modules/inventory/products/pages/ProductBulkEditPage.tsx`, `${W}/modules/inventory/products/import/ImportHistory.tsx`],
  },
  {
    slug: 'new-nafaa-website',
    related: ['PAGE:industries', 'PAGE:pricing'],
    title: 'A new nafaa.pk website',
    date: '2026-10-21',
    kind: 'new',
    summary: 'nafaa.pk has a new website with real app screenshots, a page for each business type, new pricing and FAQ, and a WhatsApp button on every page.',
    markdown: `## What changed

The public website at nafaa.pk was rebuilt from scratch:

- A new homepage that shows the app on desktop and phone, with a short product tour and an AI assistant demo.
- Pages for products, solutions and business types, with real screenshots from the app.
- New pricing and FAQ pages.
- A WhatsApp button on every page.
- The new Nafaa logo.

## Old links

Links to the old site keep working: every old address was checked and leads to the right new page. The legal pages carried over from the old site.`,
    commits: ['5cff11a7', 'f3a07bc5', 'afdd2fa6'],
    evidence: ['apps/site/src/templates/home', 'apps/api/prisma/seed-marketing-cms/content/redirects.ts'],
  },
  {
    slug: 'industry-tools-round-two',
    related: ['PAGE:industries', 'INDUSTRY:gym', 'INDUSTRY:hotel', 'CHANGELOG:industry-tools-round-one'],
    seoDescription: 'Gym, hotel, dairy, meat, optical, bookstore, toy, shoe, sports, florist, pet, agri, carpet, gaming, furniture and other businesses got deeper tools in Nafaa.',
    title: 'Industry tools for gym, hotel, dairy and more',
    date: '2026-10-20',
    kind: 'new',
    summary: 'Gym, hotel, dairy, meat, services, appliances, optical, bookstore, toy, shoe, sports, florist, pet, agri, carpet, gaming and furniture businesses got deeper tools.',
    markdown: `## What changed

- **Gym:** member form with joining bill and khata, renewals, freeze and check-in desk, PT sessions and packages with trainer commission, a locker register with monthly rent, and paid class bookings.
- **Hotel:** room board, bookings with advances, CNIC check-in, folio charges, room change, check-out through the shared checkout and a night audit to close the day.
- **Dairy:** gawala collections with fat % and khata, gawala payments and statements, delivery customers with monthly bills, and production with yield.
- **Meat:** mandi purchase, slaughter and cutting with the cost spread across cuts, daily rates, and orders with advances.
- **Services:** job intake with advance, technicians and commission, parts from stock, warranty and AMC.
- **Appliances:** serials and warranty from the bill date, qist with a guarantor, trade-ins, delivery, installation and service requests.
- **Optical, bookstore, toy store, shoe, sports, florist, pet shop, agri, carpet, gaming and furniture:** their own tools, such as eye tests and lens orders, ISBN and school lists, size grids and team orders, bouquets and wedding advances, grooming, farmer credit by crop season, and roll cutting for carpets.

## Across the app

Native browser pop-ups were replaced with in-app confirm dialogs, more pages moved to the standard layout, and about 160 wording fixes use the same plain words everywhere (Sale, Profit, Cost, Discount).`,
    commits: ['cfed037d', 'f72e7672', 'da52cb73', 'd50388b0', '0ada4b2d'],
    evidence: [`${W}/industries/gym`, `${W}/industries/hotel`, `${W}/industries/dairy`, `${W}/industries/meat`, `${W}/industries/services-biz`, `${W}/industries/appliances`, `${W}/industries/optical`, `${W}/industries/carpet`],
  },
  {
    slug: 'industry-tools-round-one',
    related: ['PAGE:industries', 'INDUSTRY:restaurant', 'INDUSTRY:pharmacy', 'CHANGELOG:new-nafaa-website'],
    seoDescription: 'Restaurant, retail, electronics, pharmacy, mobile, garments, bakery, hardware, salon, clinic, jewellery and auto parts tools were rebuilt on the shared POS.',
    title: 'Industry tools for restaurants, pharmacies and more',
    date: '2026-10-19',
    kind: 'new',
    summary: 'Restaurant, retail, electronics, pharmacy, mobile, garments, bakery, hardware, salon, clinic, jewellery and auto parts businesses got rebuilt tools on the shared POS.',
    markdown: `## What changed

- **Restaurant and cafe:** live table floor with timers and running bills, one order screen for dine-in, takeaway and counter, KOT per station with only new items sent, move, merge and split tables, delivery board with rider cash, recipes that follow purchase rates, and day close by waiter, table and type.
- **Pharmacy:** loose tablets and batches sold earliest expiry first, a narcotic register on the bill line, substitutes by formula, and expiry returns or write-off.
- **Mobile:** IMEI step in the product editor, used phones, repairs and qist plans.
- **Garments:** size and colour grid, unstitched cloth by the metre, tailoring, alterations, holds and qist.
- **Retail and electronics:** scale labels at the counter, warranty claims and trade-ins.
- **Bakery, hardware, salon, clinic, jewellery and auto parts:** cake and bulk order advances, quotations and delivery challans, appointments and staff commission, clinic reception and prescriptions, gold rates and karigars, and workshop jobs.

All of these now bill through the shared POS and checkout, with the same counter rules everywhere.`,
    commits: ['6279cf9e', 'a9739f47', 'd414ee17', 'cb1d7bcf', '99612d42'],
    evidence: [`${W}/industries/restaurant/pages/TablesLayoutPage.tsx`, `${W}/industries/pharmacy/pages/ControlledLogPage.tsx`, `${W}/industries/mobile/pages/EmiPlansPage.tsx`, `${W}/industries/garments/pages/LayawayPage.tsx`, `${W}/industries/hardware/pages/QuotationsPage.tsx`],
  },
  {
    slug: 'split-payments-and-trade-in',
    related: ['PRODUCT:payments', 'PRODUCT:khata'],
    title: 'Split payments, khata payment method and trade-in',
    date: '2026-10-19',
    kind: 'new',
    summary: 'One bill can now be paid by several methods, khata payments record how they were paid, and trade-ins count as a payment instead of a discount.',
    markdown: `## What changed

- **Split payments:** a bill can be paid part by cash, card, bank, wallet or khata. Change comes only from cash, and receipts list each part.
- **Khata payments** now ask how the customer paid (cash, bank or wallet). Older entries count as cash.
- **Trade-in** is a payment method, used for old gold in jewellery and exchange phones in mobile shops. Profit stays correct and the discount PIN no longer appears for a trade-in.

Drawer cash, bank and wallet balances, the day book, reports, dashboards, accounting export and offline bills all read the new payment parts. Existing bills were carried over with one payment each.`,
    commits: ['6f5c91a8'],
    evidence: [`${W}/modules/pos/components/PosSplitTender.tsx`, `${W}/modules/finance/money`],
  },
  {
    slug: 'batches-follow-real-stock',
    related: ['PRODUCT:inventory', 'GLOSSARY_TERM:batch-tracking'],
    title: 'Batches and expiry now follow real stock',
    date: '2026-10-19',
    kind: 'improved',
    summary: 'Batches now belong to a branch and move with every sale, return, transfer, count and write-off, so expiry lists match the stock on the shelf.',
    markdown: `## What changed

- Each batch belongs to a branch. Existing batches were placed in the branch that holds the stock.
- Sales take stock from the batch with the earliest expiry first. A named batch can still be picked, and expired batches are used last but never block a sale.
- Returns and voids put stock back into its batch.
- Receiving a purchase creates or tops up batches at landed cost, and purchase returns take from them.
- Adjustments, damage, stock counts and transfers move batches too.

Expiry lists, the pharmacy dashboard, low stock, the stock report and the catalog now read batches per branch.`,
    commits: ['f58e42c5'],
    evidence: [`${W}/modules/pos/components/PosBatchPicker.tsx`, 'apps/api/src/modules/purchasing/purchases/purchases.service.ts'],
  },
  {
    slug: 'settings-sidebar-shared-products',
    related: ['PRODUCT:inventory', 'PAGE:product', 'CHANGELOG:new-design'],
    title: 'Settings in one sidebar and shared product pages',
    date: '2026-10-19',
    kind: 'improved',
    summary: 'Settings moved into one sidebar with a page for each section. Every industry now shares the same product detail page, product editor and bulk import.',
    markdown: `## What changed

**Settings**

- One left sidebar with groups you can open and close. Each former tab is now its own page, and old links still work.
- The Settings home shows a setup health list.

**Products**

- A shared product detail page shows stock, sales, purchases, batches and variants.
- The editor never deletes saved packs, variants or batches. Stock is read-only when editing, so it only changes through purchases, sales and adjustments.
- One bulk import works for every industry, and opening stock is recorded in the branch you choose.

**POS and payments**

Industry counters use the shared checkout with split payments, and batch-tracked lines show their batch and expiry.`,
    commits: ['a4a3d91f'],
    evidence: [`${W}/app/shell/navigation/nav-config.ts`, `${W}/modules/inventory/products/detail`],
  },
  {
    slug: 'product-delete-keeps-bills',
    related: ['PRODUCT:inventory', 'PRODUCT:reports'],
    title: 'Deleting a product never removes bills',
    date: '2026-10-14',
    kind: 'fixed',
    summary: 'Deleting a product that was ever sold or bought now switches it off instead, so bills and stock history stay complete. Only unused products are deleted.',
    markdown: `## What was wrong

Deleting products, one at a time with force or in bulk, could also remove bill lines that contained them, and a bill left with no lines.

## What changed

A product that was ever sold or bought is now switched off instead of deleted, whatever option is chosen. Only products with no sales or purchases are actually deleted. The old tool that removed bills with no lines was taken out.`,
    commits: ['d33c16ab'],
    note: 'Written from the commit message of d33c16ab (committed 14 Oct 14:24). The deploy record says it was deployed after the 14 Oct incident but gives no time; it was live by the 19 Oct deploy at the latest.',
    evidence: [`${W}/modules/inventory/products/list/ProductsPage.tsx`],
  },
  {
    slug: 'staff-approval-pin',
    related: ['PRODUCT:staff', 'BLOG_POST:staff-theft-prevention-counter'],
    title: 'Staff approval PIN and discount above the limit',
    date: '2026-10-13',
    kind: 'new',
    summary: 'Owners can give a trusted staff member their own approval PIN, and a separate permission lets chosen cashiers give a hand discount above the limit.',
    markdown: `## What changed

- **Staff approval PIN:** the owner can set a personal PIN for a staff member on their profile. Where the owner's PIN was asked (discount above the limit, credit over the limit, void, refund, booking advance refund), that person's PIN now also approves, but only if they hold the permission for that action. Every approval and wrong PIN is logged.
- **Discount above the limit:** a new per-person permission lets a trusted cashier give hand discounts above the shop's limit without a PIN. Credit limits still apply, and everyone else keeps the shop rule.`,
    commits: ['0b6127df', '7b51b000'],
    evidence: [`${W}/core/security/ManagerPin.tsx`, `${W}/modules/hr/staff/components/ProfileTabs.tsx`, `${W}/core/lib/permissions.ts`],
  },
  {
    slug: 'shorter-sign-up',
    related: ['PAGE:pricing', 'PAGE:demo'],
    title: 'Shorter sign-up and five-step onboarding',
    date: '2026-10-13',
    kind: 'improved',
    summary: 'Sign-up now asks for the business type up front, and onboarding went from eight steps to five, with only the business step required.',
    markdown: `## What changed

- The business type is picked at sign-up.
- Onboarding has five steps instead of eight, and only the business step is required; the rest can be done later.
- The verify page no longer asks for a second code.

The same release rebuilt branches, notifications, billing, profile, help, backup, hardware, printing, payment QR, appearance and the customer display on the new layout, and rebuilt the bakery tools (cake orders, baking plan, raw materials, freshness and waste, bulk orders).`,
    commits: ['986ce19a'],
    evidence: [`${W}/modules/onboarding`, 'apps/web/src/core/hardware/CustomerDisplayPage.tsx'],
  },
  {
    slug: 'offline-bills-safe-on-logout',
    related: ['PRODUCT:offline-pos', 'BLOG_POST:load-shedding-proof-billing'],
    title: 'Offline bills are no longer lost on logout',
    date: '2026-10-13',
    kind: 'fixed',
    summary: 'Logging out, or a session expiring, could clear bills made offline that had not been sent yet. Now only bills already synced are cleared.',
    markdown: `## What was wrong

Every logout, including a session expiring, cleared the device's offline data. Bills made offline and not yet sent to the server could be lost.

## What changed

Logout now removes only rows that were already synced. Unsent bills stay on the device and sync for the business that made them, even if another business signs in on the same computer.`,
    commits: ['498dfedf'],
    evidence: [`${W}/core/lib/offline/offlineSales.ts`, `${W}/core/lib/offline/syncEngine.ts`],
  },
  {
    slug: 'reports-centre-and-cash',
    related: ['PRODUCT:reports', 'BLOG_POST:daily-cash-closing-routine'],
    seoDescription: 'A shared reports centre with profit by product, stock, profit and loss and shop accounts, plus a rebuilt cash register with shifts and a Z report.',
    title: 'Reports centre, shop accounts and cash register',
    date: '2026-10-13',
    kind: 'new',
    summary: 'A shared reports centre, profit by product, a stock report, profit and loss, shop accounts with real balances, and a rebuilt cash register with shifts and a Z report.',
    markdown: `## What changed

- **Reports centre:** sales, items, customers, purchasing, expenses, profit, tax and returns for any period, compared with the previous one, with print and CSV.
- **Profit by product:** cost saved on each bill line at the time of sale, discounts and returns taken off, and net profit after expenses and write-offs.
- **Stock report:** value by branch, category and supplier, dead and fast stock, and stock on a past date.
- **Profit and loss** with monthly columns and break-even, a day book with a Z report, a staff and counters report and a customers report.
- **Shop accounts:** safe, bank and wallet accounts with real balances, transfers between accounts and the drawer, and a statement.
- **Cash register:** shift open and close with note counting, X and Z reports, and cash in and out with a reason.
- **Returns** were rebuilt so goods cannot be returned twice, and the drawer counts only cash actually handed back.`,
    commits: ['1c1952f9', '2512fb04', '90c7f82c', '5ea91017', '1f34ceca'],
    evidence: [`${W}/modules/reports/center`, `${W}/modules/finance/profit-report`, `${W}/modules/inventory/stock-report`, `${W}/modules/reports/pnl`, `${W}/modules/finance/money`, `${W}/modules/finance/cash-register/pages/CashRegisterPage.tsx`, `${W}/modules/sales/returns/pages/ReturnsPage.tsx`],
  },
  {
    slug: 'stock-tools-every-industry',
    related: ['PRODUCT:inventory', 'PAGE:industries', 'CHANGELOG:industry-tools-round-one', 'CHANGELOG:industry-tools-round-two', 'CHANGELOG:product-delete-keeps-bills', 'CHANGELOG:bulk-import-create-edit'],
    seoDescription: 'Low stock and reorder, transfers, stock counts, damage and wastage, barcode labels, combos, multi-units and quick keys now work alike in every industry.',
    title: 'Shared stock tools for every business type',
    date: '2026-10-13',
    kind: 'new',
    summary: 'Low stock and reorder, transfers, adjustments with stock count, damage and wastage, barcode labels, combos, multi-units and quick keys now work the same for every industry.',
    markdown: `## What changed

Stock tools that used to exist only for some industries are now shared by all:

- **Low stock and reorder:** days of cover per branch, suggested order quantities, and purchase orders by supplier or WhatsApp.
- **Transfers** between branches with partial receive and delivery challan print.
- **Adjustments** with a stock count, and a **stock movements** ledger.
- **Damage and wastage:** staff report, a manager approves.
- **Barcode labels** with saved designs, A4 sticker sheets and roll sizes.
- **Combos** with cost and margin, **multi-units** with pack prices, and **quick keys** with a grid editor.
- A shared **catalog** you can share with customers on WhatsApp or print as a rate list.

Old industry-only pages were removed and their links now open the shared pages.`,
    commits: ['24bf8332', 'b5615713', 'fc6f2f82', 'b14f1f9b', 'a1674aa4'],
    evidence: [`${W}/modules/inventory/low-stock/pages/LowStockPage.tsx`, `${W}/modules/inventory/transfers/pages/TransfersPage.tsx`, `${W}/modules/inventory/damage/pages/DamagePage.tsx`, `${W}/modules/inventory/barcodes/components/LabelDesigner.tsx`, `${W}/modules/inventory/combos/pages/CombosPage.tsx`, `${W}/modules/pos/quick-keys/QuickKeysPage.tsx`],
  },
];

export const changelogEntries: SeedEntry[] = CHANGES.map(change);
