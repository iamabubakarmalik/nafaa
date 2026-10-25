/**
 * Changelog entries for work shipped between 13 and 26 Oct 2026. The two
 * earlier entries (new-design, shopify-app-install) live in
 * main-pages/hubs.ts next to the /changelog hub.
 *
 * Source: commit messages in `git log` only. Dates are the production
 * deploy dates from the deploy record: 13 Oct (three deploys), 14 Oct,
 * 19 Oct (99612d42), 20 Oct (0ada4b2d), 21 Oct (new site) and 26 Oct
 * (45d75a3f). Work committed earlier than its deploy carries the deploy date.
 */

import { richText, withIds } from '../../lib/blocks';
import type { SeedEntry } from '../../lib/types';

type Kind = 'new' | 'improved' | 'fixed';

interface ChangeSpec {
  slug: string;
  title: string;
  date: string;
  kind: Kind;
  /** One or two sentences; also the SEO description (cut at 155 characters). */
  summary: string;
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
    seoDescription: c.summary.slice(0, 155),
    focusKeyword: `nafaa ${c.title.toLowerCase().split(' ').slice(0, 2).join(' ')}`,
    origin: `new (changelog from commits ${c.commits.join(', ')}; 26 Oct 2026)`,
    evidence: c.evidence,
    factCheck: { checkedOn: '2026-10-26', note: c.note ?? `Written from the commit messages of ${c.commits.join(', ')}; date is the production deploy date.` },
    dropped: [],
    needsOwner: [],
  };
}

const CHANGES: ChangeSpec[] = [
  {
    slug: 'keyboard-first-pos-counter',
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
