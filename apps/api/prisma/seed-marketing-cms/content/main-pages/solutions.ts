/**
 * SOLUTION pages (/solutions/<slug>): Nafaa set up for a way of running a
 * business. Every claim is backed by the files in `evidence` (checked 26 Oct
 * 2026). Parts that are not built carry the "Coming soon" badge and point to
 * the roadmap. Which plan includes branches, transfers or other features is
 * never stated here: the pricing block reads it from the Plan table.
 *
 * Each page has its own order of sections so the seven pages do not read as
 * one template with the nouns swapped.
 */

import type { SeedEntry } from '../../lib/types';
import { SHOT, callout, diagram, features, leadForm, page, pricing, prose, shot, steps, table } from './_build';

const DEMO = { label: 'Book a demo', href: 'demo', trackAs: 'cta_demo' };
const WHATSAPP = { label: 'Ask on WhatsApp', href: 'whatsapp', trackAs: 'whatsapp' };

// ─── Single shop ───

const singleShop = page({
  type: 'SOLUTION',
  slug: 'single-shop',
  title: 'Retail & Shops',
  summary:
    'Nafaa for a single shop puts the whole business on the device you already own: a fast counter that works offline, stock in every unit, a digital khata with WhatsApp reminders, the cash drawer, expenses and a daily profit report, from a 7-day free trial.',
  data: { icon: 'store', shortName: 'Retail & shops', outcome: 'Run the Whole Shop From One App', segment: 'Single shop', status: 'live' },
  seoTitle: 'Shop Management Software in Pakistan: POS, Stock & Khata',
  seoDescription:
    'Everything a shop needs in one app: offline POS, stock, digital khata, WhatsApp receipts, staff roles and profit reports. Start a 7-day free trial.',
  focusKeyword: 'shop management software',
  hero: {
    eyebrow: 'For retail & shops',
    heading: 'Your whole shop in one app, from the first bill',
    sub: 'Billing, stock, udhaar and profit, on the phone or computer you already have. Set up in an afternoon, keep selling through load-shedding, and see what you really earned before you lock up.',
    media: { id: SHOT.dashboard, url: 'app.nafaa.pk/dashboard' },
    badges: ['Offline billing', 'Digital khata', 'Daily profit'],
  },
  answer: {
    facts: [
      ['Who it is for', 'Kiryana, pharmacy, garments, mobile, hardware, cosmetics and every other shop'],
      ['In the box', 'POS, inventory, khata, cash register, expenses, reports, staff, WhatsApp receipts'],
      ['Devices', 'Phone, tablet or computer; scanner and printer optional'],
      ['Price', 'Paid plans from {{price:min.monthly}} a month after the free trial'],
    ],
    romanUrdu:
      'Ek dukaan ke liye poora system: bill, stock, udhaar aur munafa ek app me. Jo phone ya computer hai usi par chalta hai, aur bijli ya internet jaye to bhi bill bante rehte hain.',
  },
  body: [
    steps('A day in the shop with Nafaa', [
      ['Open', 'Open the cash shift with the float in the drawer, and check the low-stock list over chai.', SHOT.lowStock],
      ['Sell', 'Scan or tap, take cash, wallet or udhaar, and print or WhatsApp the receipt.', SHOT.posPhone],
      ['Collect', 'Send udhaar reminders from the khata during the quiet hour.'],
      ['Close', 'Count the drawer note by note, then read today\'s profit after cost and expenses.'],
    ]),
    shot({
      heading: 'The counter your staff learn in one morning',
      body: 'Large tiles, clear prices and the stock left on every item. The bill stays on screen, and every way to pay is one tap away. Keyboard users can bill without touching the mouse.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      callouts: [
        { x: 40, y: 26, label: 'Categories for quick finding' },
        { x: 30, y: 47, label: 'Stock left on each item' },
        { x: 85, y: 93, label: 'Cash, wallet, card or udhaar' },
      ],
    }),
    features('Everything a shop needs, nothing it does not', [
      ['scan-barcode', 'Fast counter', 'Barcode, quick keys and units, with split payments and returns.'],
      ['wifi-off', 'Works offline', 'Bills keep going without internet and sync later.'],
      ['boxes', 'Stock in every unit', 'Cartons in, pieces out, with low-stock alerts and damage records.'],
      ['notebook-pen', 'Digital khata', 'Udhaar from the counter, credit limits and WhatsApp reminders.'],
      ['banknote', 'Cash drawer and expenses', 'Open and close the galla with a count, and record every expense.'],
      ['chart-column', 'Daily profit', 'Profit after cost and expenses, by product and for the day.'],
    ]),
    shot({
      heading: 'Udhaar you can see at a glance',
      body: 'Every udhaar bill lands in the customer\'s khata. The top line shows what the whole market owes you, the cards split it by age, and one tap sends a polite WhatsApp reminder with the exact balance.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'split-left',
      callouts: [
        { x: 24, y: 19, label: 'Total receivable' },
        { x: 62, y: 30, label: 'Udhaar by age' },
        { x: 87, y: 55, label: 'Take a payment' },
      ],
    }),
    table('Who uses which screen', 'In a single shop the same app serves everyone, and each person only sees the screens their job needs.', [
      { key: 'screen', label: 'Main screen', highlight: true },
      { key: 'job', label: 'What they do there' },
    ], [
      ['Cashier', 'POS counter', 'Bills, returns, udhaar sales and the receipt'],
      ['Helper or stock boy', 'Products and purchases', 'Receive stock, record damage, check what is low'],
      ['Manager', 'Khata and cash register', 'Collect udhaar, open and close the drawer'],
      ['Owner', 'Dashboard and profit report', 'Today\'s sale, profit, expenses and who sold what'],
    ]),
    prose(`## Choosing software for one shop

A single shop does not need an ERP. It needs a counter that never slows down, a stock list that stays right, and a clear answer to "did we make money today?". When you compare apps, check these points before price:

- **It runs on what you have.** A shop should not have to buy a computer to start. Nafaa runs on an Android phone, a tablet or any laptop, and the Windows app adds silent printing and the cash drawer.
- **It keeps billing when the internet drops.** Load-shedding and weak signal are normal. Bills made offline are saved on the device and sent later.
- **Udhaar is part of the sale.** If the khata is a separate notebook, it will drift from the bills. In Nafaa the udhaar is written from the counter, with a credit limit per customer.
- **Profit, not only sale.** The day's takings say little. Nafaa subtracts the cost of what was sold and the day's expenses.
- **The owner stays in control.** Refunds need a manager PIN by default, discounts have a limit, and the activity log shows who changed what.

Start with the [POS](/product/pos), [inventory](/product/inventory) and [khata](/product/khata). When the shop grows, a second branch or an [online store](/product/online-store) is added to the same account, so nothing has to move.`),
    callout('tip', 'Bring your old register with you: products can be imported from Excel with a check before anything is saved, and each customer\'s old udhaar is added as their opening khata balance. Our team can also do it for you through [data migration](/services/data-migration).', 'Moving from a register or Excel'),
    callout('info', 'Some features, such as the profit report, exports and WhatsApp receipts, depend on the plan. The plan table below shows what each plan includes.', 'What each plan includes'),
    pricing('Start free, then pick a plan'),
  ],
  faqKeys: ['devices', 'offline', 'khata-reminders', 'sol-shop-first-bill', 'sol-shop-cashier-control', 'pricing'],
  cta: { heading: 'Open your shop on Nafaa today', body: 'Seven days free. No card. Your first bill in minutes.' },
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:mobile-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:cosmetics', kind: 'TAG' },
    { ref: 'SERVICE:data-migration', kind: 'TAG' },
    { ref: 'SERVICE:hardware', kind: 'TAG' },
    { ref: 'COMPARE:nafaa-vs-paper-register', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-start-kiryana-store-pakistan', kind: 'RELATED' },
    { ref: 'GUIDE:running-a-retail-shop-pakistan', kind: 'RELATED' },
  ],
  sortOrder: 1,
  featured: true,
  evidence: [
    'apps/web/src/modules/pos',
    'apps/web/src/modules/inventory/low-stock',
    'apps/web/src/modules/inventory/damage/pages/DamagePage.tsx',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/CustomerProfilePage.tsx',
    'apps/web/src/modules/finance/cash-register/pages/CashRegisterPage.tsx',
    'apps/web/src/modules/finance/expenses/pages/ExpensesPage.tsx',
    'apps/web/src/modules/finance/profit-report',
    'apps/web/src/modules/hr/staff/components/PermissionPicker.tsx',
    'apps/web/src/core/security/ManagerPin.tsx',
    'apps/web/src/modules/reports/activity-log/pages/ActivityLogPage.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/desktop/src/main/cashDrawer.ts',
  ],
});

// ─── Retail chains ───

const retailChains = page({
  type: 'SOLUTION',
  slug: 'retail-chains',
  title: 'Retail Chains',
  summary:
    'Nafaa for retail chains runs every branch from one account: each branch has its own counter, stock and cash, head office compares sales and profit across branches, stock moves by transfer with a check on arrival, staff only reach their own branches, and every refund and discount is on the record.',
  data: { icon: 'building-2', shortName: 'Retail chains', outcome: 'Every Branch Under Control', segment: 'Multi-branch retail', status: 'live' },
  seoTitle: 'Retail Chain Software in Pakistan: All Branches in One View',
  seoDescription:
    'Run many branches from one Nafaa account: branch P&L, stock transfers, staff by branch and a full audit log. Built for growing retail chains.',
  focusKeyword: 'retail chain software',
  hero: {
    eyebrow: 'For retail chains',
    heading: 'Grow from one shop to many without losing control',
    sub: 'Every branch bills, stocks and closes its own day, and you see all of them at once. Move stock where it sells, compare branch profit, and know who gave which discount, from anywhere.',
    media: { id: SHOT.branches, url: 'app.nafaa.pk/branches' },
    badges: ['Branch P&L', 'Stock transfers', 'Audit log'],
  },
  answer: {
    facts: [
      ['Branches', 'Each with its own counter, stock, cash register and day book'],
      ['Head office', 'Sales, profit, stock value and staff compared side by side'],
      ['Control', 'Permissions per person and branch, manager PIN, audit and activity logs'],
      ['Reports', 'Branch P&L, stock value and staff sales, per branch or combined'],
    ],
    romanUrdu: 'Kai branches ek account se: har branch ka apna counter aur stock, aur head office me sab ki bikri aur munafa saath saath. Stock transfer, staff ki ijazat aur har discount ka record.',
  },
  body: [
    diagram('Head office sees every branch; stock moves between branches with a record on both sides.', { kind: 'multi-branch' }, 'One account, every branch'),
    shot({
      heading: 'Every branch, live, on one screen',
      body: 'Today\'s sale across all branches, the cash sitting in each drawer, the stock value at cost and who is on duty. Each card shows one branch with its own sale, drawer and items running low.',
      id: SHOT.branchList,
      url: 'app.nafaa.pk/settings/branches',
      layout: 'full',
      callouts: [
        { x: 25, y: 27, label: 'Sale of all branches today' },
        { x: 45, y: 27, label: 'Cash in every drawer' },
        { x: 32, y: 63, label: 'One card per branch' },
        { x: 50, y: 89, label: 'Items running low' },
      ],
    }),
    features('Built for owners of many shops', [
      ['layout-dashboard', 'Branch analytics', 'Sales, profit and bills per branch against the previous period.'],
      ['chart-line', 'Branch P&L', 'One statement with a column per branch: who earns, who spends.'],
      ['arrow-left-right', 'Stock transfers', 'Send stock, then receive it with a count; short lines are flagged.'],
      ['users', 'Staff by branch', 'People only open the branches they work in.'],
      ['eye', 'Nigrani (audit)', 'Voids, refunds, big discounts, drawer shorts and stock write-offs in one place.'],
      ['file-spreadsheet', 'Exports and accounting', 'Excel exports and daily journals for QuickBooks, Xero or Zoho Books.'],
    ]),
    table('Separate software per branch, or one account?', 'Many chains start with a different system, or a different copy, in each branch. This is what changes when every branch runs on one Nafaa account.', [
      { key: 'separate', label: 'Separate per branch' },
      { key: 'nafaa', label: 'One Nafaa account', highlight: true },
    ], [
      ['Product list', 'Typed again in every branch, prices drift', 'One list for the chain, stock kept per branch'],
      ['Moving stock', 'A phone call and a paper slip', 'A transfer that is sent, tracked and received with a count'],
      ['Seeing the day', 'Each manager sends figures on WhatsApp at night', 'Every branch live on the head-office screen'],
      ['Comparing profit', 'Spreadsheets at month end', 'Branch P&L for any period, side by side'],
      ['Staff access', 'Shared passwords per shop', 'A login per person, limited to their branches'],
    ]),
    steps('How chains roll out Nafaa', [
      ['Start with one branch', 'Import products and customers once; every branch uses the same list.'],
      ['Add branches', 'Each gets its own address and phone on receipts, its own stock and cash register.'],
      ['Set people up', 'Managers, cashiers and stock staff get only the permissions and branches they need.'],
      ['Run from head office', 'Watch every branch live and move stock where it sells.'],
    ]),
    shot({ heading: 'Compare branches over any period', body: 'Sales, net profit and bills for each branch against the previous period, with the share of sales, the daily trend and busy hours, so the weak branch stands out early.', id: SHOT.branchesDark, url: 'app.nafaa.pk/branches', layout: 'split-left' }),
    prose(`## Where chains lose money, and the screen that catches it

Most losses in a chain are small and spread across branches, which is why they go unnoticed. Nafaa puts each one on a screen that head office can check in minutes:

- **Stock that disappears between branches.** A transfer is received with a count at the other end. Lines that arrive short are marked, with their value in rupees, on the [transfers](/product/multi-shop) screen.
- **Cash that does not match.** Every branch opens and closes its drawer with a count. Shorts and overs are recorded per shift and per person.
- **Discounts and refunds.** Refunds need a manager PIN by default and hand discounts have a limit. Nigrani, the audit screen, lists voids, refunds, large discounts and sales below cost by branch and staff member.
- **Dead stock in the wrong branch.** The stock report shows what is slow or dead in each branch, so it can be moved to where it sells instead of being marked down.

The [staff and permissions](/product/staff) page explains how access is set for each person.`),
    callout('info', 'Branches and stock transfers are plan features. The plan table below shows which plans include them and how many shops each plan allows.', 'Which plan do I need?'),
    pricing('Plans by number of shops'),
  ],
  faqKeys: ['mp-branches-transfer', 'mp-staff-permissions', 'sol-chain-day-close', 'sol-chain-shared-list', 'mp-reports-export', 'offline'],
  cta: { heading: 'Bring every branch into one view', body: 'Book a demo and we will set it up with your branch structure.', primary: DEMO, secondary: WHATSAPP },
  relations: [
    { ref: 'PRODUCT:multi-shop', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:shoe', kind: 'TAG' },
    { ref: 'SERVICE:data-migration', kind: 'TAG' },
    { ref: 'SERVICE:training', kind: 'TAG' },
    { ref: 'BLOG_POST:multi-shop-management-guide', kind: 'RELATED' },
    { ref: 'BLOG_POST:opening-a-second-branch', kind: 'RELATED' },
  ],
  sortOrder: 2,
  featured: true,
  evidence: [
    'apps/web/src/modules/organization/shops/pages/ShopsPage.tsx',
    'apps/web/src/modules/organization/shops/pages/ShopsOverviewPage.tsx',
    'apps/web/src/modules/reports/pnl/components/BranchView.tsx',
    'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx',
    'apps/web/src/modules/inventory/transfers/components/ReceiveModal.tsx',
    'apps/web/src/modules/inventory/stock-report/pages/StockReportPage.tsx',
    'apps/web/src/modules/finance/cash-register/pages/CashRegisterPage.tsx',
    'apps/web/src/modules/reports/audit/pages/AuditPage.tsx',
    'apps/web/src/modules/reports/activity-log/pages/ActivityLogPage.tsx',
    'apps/web/src/modules/reports/day-book/DayBookPage.tsx',
    'apps/web/src/core/receipt/print.ts',
    'apps/web/src/modules/billing/plans/api',
    'apps/api/src/integrations/accounting',
  ],
});

// ─── E-commerce ───

const ecommerce = page({
  type: 'SOLUTION',
  slug: 'ecommerce',
  title: 'E-commerce Sellers',
  summary:
    'Nafaa for e-commerce sellers runs your online orders and the Nafaa Bazaar marketplace from the same stock as your shop: orders from your website, Shopify, WooCommerce and Daraz in one list, courier booking with TCS, Leopards, PostEx and more, COD tracking, risk checks and payment links.',
  data: { icon: 'shopping-bag', shortName: 'E-commerce', outcome: 'Online Store and Marketplace, One Stock', segment: 'Online sellers', status: 'live' },
  seoTitle: 'E-commerce Software for Pakistani Sellers: One Stock Online',
  seoDescription:
    'Your website, Shopify, WooCommerce, Daraz and Nafaa Bazaar on one stock, with courier booking, COD tracking, risk checks and payment links. Free trial.',
  focusKeyword: 'ecommerce software pakistan',
  hero: {
    eyebrow: 'For e-commerce sellers',
    heading: 'Sell everywhere online and ship from one stock',
    sub: 'Your own website, Shopify, WooCommerce, Daraz and Nafaa Bazaar, all feeding one order list and one stock. Book the courier from the order, catch risky COD buyers before you ship, and see where the courier money is.',
    media: { id: SHOT.onlineOrders, url: 'app.nafaa.pk/online-orders' },
    badges: ['Website + marketplace', '6 couriers', 'COD tracking'],
  },
  answer: {
    facts: [
      ['Sell on', 'Your website, Shopify, WooCommerce, Daraz, a Nafaa order link and Nafaa Bazaar'],
      ['Ship with', 'TCS, Leopards, M&P, PostEx, Trax and Call Courier'],
      ['Get paid', 'COD tracking by courier, plus JazzCash and Easypaisa payment links'],
      ['Stock', 'One stock with your shop or warehouse; channels update on every sale'],
    ],
    romanUrdu: 'Apni website, Shopify, WooCommerce, Daraz aur Nafaa Bazaar sab ek stock se. Courier ki booking order se hi, COD ka paisa kis courier ke paas hai yeh saaf, aur mushkil customers ki pehchaan pehle.',
  },
  body: [
    diagram('Orders from every channel come into Nafaa; stock changes flow back out to each channel.', { kind: 'store-sync' }, 'One stock, every channel'),
    shot({
      heading: 'Every online order in one list',
      body: 'New orders wait for Accept with the buyer, city, items and how long the order has been waiting. Accepting makes the bill and the receipt and takes the items out of stock.',
      id: SHOT.onlineOrders,
      url: 'app.nafaa.pk/online-orders',
      layout: 'full',
      callouts: [
        { x: 25, y: 30, label: 'New orders to accept' },
        { x: 59, y: 30, label: 'COD money still due' },
        { x: 63, y: 54, label: 'How long it has waited' },
        { x: 92, y: 58, label: 'Accept: bill and stock in one tap' },
      ],
    }),
    features('From the click to the cash', [
      ['globe', 'Your channels', 'Connect a WooCommerce or Shopify store, or your own website with ready code.'],
      ['link', 'Order link', 'A Nafaa order page to share on Instagram, WhatsApp or your site.'],
      ['truck', 'Courier booking', 'Book and track TCS, Leopards, M&P, PostEx, Trax and Call Courier parcels.'],
      ['shield', 'Risk check and block list', 'See a buyer\'s past orders and returns; numbers you block are never auto-accepted.'],
      ['wallet', 'COD and payment links', 'Track COD by courier, or collect JazzCash or Easypaisa before dispatch.'],
      ['package-search', 'Google product feed', 'Share your catalogue with Google so shoppers find it.'],
    ]),
    shot({ heading: 'Connect your channels once', body: 'WooCommerce connects with an approval in WordPress and Shopify through its app install. After that, prices and stock flow to every channel by themselves.', id: SHOT.salesChannels, url: 'app.nafaa.pk/settings/channels', layout: 'split-right' }),
    steps('How an online order flows', [
      ['Order lands', 'From any channel, into one list, with the buyer\'s history next to it.'],
      ['Pack from one stock', 'The same shelf the shop sells from, so nothing is oversold.'],
      ['Ship', 'Book the courier, print the label and invoice, and share tracking with the buyer.'],
      ['Settle', 'Mark COD collected from the courier\'s settlement sheet; the money lands in the day book.'],
    ]),
    table('COD problems, and what Nafaa does about them', 'Cash on delivery is how most Pakistani shoppers pay. These are the problems sellers raise most, and the screen in Nafaa that handles each.', [
      { key: 'nafaa', label: 'What Nafaa does', highlight: true },
      { key: 'screen', label: 'Where' },
    ], [
      ['Fake or prank orders', 'Orders from blocked numbers are flagged and never accepted automatically', 'Block list'],
      ['Buyers who refuse parcels', 'A risk badge from the buyer\'s past orders and returns, before you ship', 'The order itself'],
      ['Money stuck with couriers', 'Shows what is on the road, collected but not paid in, and settled', 'COD screen'],
      ['Parcels that come back', 'Returns (RTO) listed by courier, with the return rate', 'COD screen and online sales report'],
      ['Buyers who never order again', 'Grouped as repeat, quiet or new, with a ready WhatsApp message', 'Online customers'],
    ]),
    shot({ heading: 'Never miss an order in a busy hour', body: 'New online orders pop up over the counter screen with Accept and View, so the shop team handles them between walk-in customers.', id: SHOT.posOnlineAlert, url: 'app.nafaa.pk/pos', layout: 'split-left' }),
    prose(`## Selling online from a shop in Pakistan

Most online sellers here are also shopkeepers. The same rack serves walk-in buyers, Instagram DMs, a website and Daraz, and the trouble starts when each of them keeps its own stock count. Nafaa keeps one count. A piece sold at the counter is gone from the website, and a Daraz order takes the item off the shop's stock the moment it is accepted.

The second trouble is money. With COD, a sale is not money until the courier pays. Nafaa tracks each parcel from booking to settlement, so you can see which courier is holding how much and for how long. The [online sales report](/product/reports) breaks sales down by channel, city and courier, with the return rate next to each.

Want to reach buyers beyond your own followers? List the same products on [Nafaa Bazaar](/marketplace), the Nafaa marketplace, without keeping a second catalogue.`),
    features('Coming soon', [
      ['store', 'Facebook Shop', 'Sync products and orders with a Facebook shop.', 'coming'],
      ['camera', 'Instagram Shop', 'Tag products from your Nafaa catalogue in Instagram posts.', 'coming'],
      ['smartphone', 'TikTok Shop', 'TikTok Shop orders in the same online orders list.', 'coming'],
    ], 'Until these ship, the Nafaa order link works on any social profile. See the [roadmap](/roadmap).'),
    pricing('Plans for online and in-store selling'),
  ],
  faqKeys: ['mp-ecommerce-stock', 'mp-ecommerce-cod', 'sol-ecom-no-website', 'sol-ecom-courier-money', 'mp-online-channels', 'mp-bazaar-what'],
  cta: { heading: 'Put every online order on one screen', body: 'Connect your store and list on Nafaa Bazaar in the free trial.' },
  relations: [
    { ref: 'PRODUCT:online-store', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:payments', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:cosmetics', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'TAG' },
    { ref: 'INDUSTRY:shoe', kind: 'TAG' },
    { ref: 'SERVICE:online-store-setup', kind: 'TAG' },
    { ref: 'SERVICE:websites', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:cod', kind: 'RELATED' },
    { ref: 'BLOG_POST:whatsapp-customer-retention', kind: 'RELATED' },
    { ref: 'GUIDE:start-selling-online-pakistan', kind: 'RELATED' },
    { ref: 'BLOG_POST:selling-online-pakistan', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:dropshipping', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:gmv', kind: 'RELATED' },
  ],
  sortOrder: 3,
  featured: true,
  evidence: [
    'apps/web/src/integrations/online-orders/pages/OnlineOrdersPage.tsx',
    'apps/web/src/integrations/online-orders/pages/ChannelsListPage.tsx',
    'apps/web/src/integrations/online-orders/public/PublicOrderPage.tsx',
    'apps/web/src/integrations/online-orders/public/PublicTrackPage.tsx',
    'apps/web/src/integrations/online-orders/pages/CodPage.tsx',
    'apps/web/src/integrations/online-orders/pages/BlocklistPage.tsx',
    'apps/web/src/integrations/online-orders/components/RiskBadge.tsx',
    'apps/web/src/integrations/online-orders/pages/OnlineCustomersPage.tsx',
    'apps/web/src/integrations/online-orders/pages/OnlineReportsPage.tsx',
    'apps/web/src/integrations/online-orders/components/PaymentLinkSection.tsx',
    'apps/web/src/integrations/online-orders/components/daraz/Daraz.tsx',
    'apps/web/src/integrations/channels/social/facebook-shop/index.ts',
    'apps/api/src/integrations/online-orders/courier-api',
    'apps/api/src/integrations/google/feed.ts',
    'apps/api/src/marketplace/publishing',
  ],
  needsOwner: ['Facebook, Instagram and TikTok shops are placeholders in apps/web (channels/social "coming soon"); shown as coming soon.'],
});

// ─── Restaurants ───

const restaurants = page({
  type: 'SOLUTION',
  slug: 'restaurants',
  title: 'Restaurants & Cafés',
  summary:
    'Nafaa for restaurants and cafés runs dine-in, takeaway and delivery from one system: a table layout with running bills, kitchen order tickets sent to each station, a menu with add-ons, happy hours and recipes that cost every plate, riders with their cash, and Foodpanda orders.',
  data: { icon: 'utensils-crossed', shortName: 'Restaurants', outcome: 'Tables, Kitchen and Delivery in One System', segment: 'Food service', status: 'live' },
  seoTitle: 'Restaurant POS Software in Pakistan: Tables, KOT & Delivery',
  seoDescription:
    'Table layout, KOT to kitchen stations, add-ons, recipes and food cost, riders, Foodpanda orders and split bills. Restaurant POS by Nafaa. Free trial.',
  focusKeyword: 'restaurant pos software pakistan',
  hero: {
    eyebrow: 'For restaurants & cafés',
    heading: 'Tables, kitchen and delivery moving in one rhythm',
    sub: 'Waiters take orders at the table, tickets go to the right kitchen station, and the counter sees every running bill. Delivery riders and Foodpanda orders fit into the same flow.',
    media: { id: SHOT.tables, url: 'app.nafaa.pk/restaurant/tables' },
    badges: ['Table layout', 'KOT by station', 'Delivery & Foodpanda'],
  },
  answer: {
    facts: [
      ['Service', 'Dine-in, takeaway and delivery'],
      ['Kitchen', 'KOT to each station, on screen or printed, from new to cooking to ready'],
      ['Menu', 'Add-ons, happy hours and recipes with plate cost and food cost %'],
      ['Delivery', 'Riders, the cash each one holds, and Foodpanda orders in the same list'],
    ],
    romanUrdu: 'Restaurant ke liye: tables par chalta bill, kitchen ke har station ko KOT, menu me add-ons aur recipes ki costing, delivery riders ka cash aur Foodpanda orders, sab ek system me.',
  },
  body: [
    shot({
      heading: 'The whole floor at a glance',
      body: 'Tables by section, each one free, seated, waiting for payment, being cleaned or reserved. A seated table shows guests, the waiter, the time since seating, the running bill and how many dishes are still cooking.',
      id: SHOT.tables,
      url: 'app.nafaa.pk/restaurant/tables',
      layout: 'full',
      callouts: [
        { x: 25, y: 19, label: 'Running bills on the floor' },
        { x: 31, y: 39, label: 'Sections: family, hall, rooftop' },
        { x: 24, y: 55, label: 'Guests, time and running bill' },
        { x: 65, y: 92, label: 'Reserved for a booking' },
      ],
    }),
    shot({ heading: 'A kitchen that keeps up', body: 'Tickets move from new to cooking to ready on the kitchen display, so the counter knows the moment food is up. Each station sees only the dishes it makes.', id: SHOT.kot, url: 'app.nafaa.pk/restaurant/kot', layout: 'split-right' }),
    features('Built for service, not just billing', [
      ['layout-grid', 'Table layout', 'Sections and tables that match your floor; move, reserve or mark clean.'],
      ['chef-hat', 'Kitchen stations', 'Each menu category goes to its station: grill, tandoor, karahi, drinks.'],
      ['list-checks', 'Add-ons', 'Extra cheese, no onion, spice level and sizes, with rules per dish.'],
      ['clock', 'Happy hours', 'Automatic price cuts by time, day, dish or order type, within your discount limit.'],
      ['bike', 'Delivery and riders', 'Assign riders, follow each order and take their cash at the counter.'],
      ['wallet', 'Split payment', 'One table\'s bill across cash, card and wallets, or part on the khata.'],
    ]),
    steps('A dinner-rush order, start to finish', [
      ['Seat and order', 'The waiter opens the table on a tablet and adds dishes with their add-ons.'],
      ['Kitchen', 'Each dish goes to its station as a KOT; the screen shows what is cooking and what is ready.'],
      ['Serve', 'The table card shows dishes ready to serve, and the running bill keeps growing with every round.'],
      ['Pay and clear', 'Print the bill, split it if needed, take payment and mark the table for cleaning.'],
    ]),
    shot({ heading: 'Waiters carry the menu', body: 'On a tablet, waiters open a table, add dishes with add-ons and send the order without walking to the counter.', id: SHOT.tablesTablet, frame: 'tablet', layout: 'split-left' }),
    table('Dine-in, takeaway and delivery in one system', 'Each kind of order follows its own path, and all of them end in the same day book.', [
      { key: 'dine', label: 'Dine-in' },
      { key: 'take', label: 'Takeaway' },
      { key: 'deliver', label: 'Delivery', highlight: true },
    ], [
      ['Order taken by', 'Waiter at the table', 'Counter', 'Counter, phone or Foodpanda'],
      ['Kitchen', 'KOT by station', 'KOT by station', 'KOT by station'],
      ['Bill', 'Running bill, printed at the end', 'Paid at the counter', 'Bill goes with the rider'],
      ['Money', 'Cash, card, wallet or split', 'Cash, card or wallet', 'Rider hands over the cash at the counter'],
    ]),
    prose(`## Food cost decides restaurant profit

A busy restaurant can still lose money if plate costs creep up while menu prices stay the same. The Nafaa recipes screen lists what goes into each dish and prices it at today's ingredient rates, so you see the plate cost and food cost percentage of every item on the menu.

It also answers two questions every kitchen asks during service. How many more plates can we make from the stock in this branch, and which ingredient runs out first? When a dish cannot be made, take it off the menu from the same screen. The ingredients view compares what sales used against what was bought, with days left at the current rate, so the next purchase is based on real use.

For bakeries and sweet shops, the [bakery](/industries/bakery) setup adds baking plans and bulk orders on top. Cafés and hotels use the same tables and kitchen screens; see [restaurant](/industries/restaurant) and [hotel](/industries/hotel).`),
    shot({ heading: 'The owner\'s view of the day', body: 'Today\'s sale, open orders, tables in use and the kitchen queue on one dashboard, on the counter computer or the owner\'s phone.', id: SHOT.restaurantDashboard, url: 'app.nafaa.pk/dashboard', layout: 'split-right' }),
    pricing('Plans for one outlet or many'),
  ],
  faqKeys: ['mp-restaurant-kot', 'restaurant-stations', 'restaurant-split', 'sol-rest-happy-hours', 'sol-rest-rider-cash', 'offline'],
  cta: { heading: 'Run a calmer rush hour', body: 'Set up your floor and menu in the free trial, or book a demo with our team.' },
  relations: [
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:hotel', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:payments', kind: 'TAG' },
    { ref: 'SERVICE:hardware', kind: 'TAG' },
    { ref: 'SERVICE:training', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:kot', kind: 'RELATED' },
    { ref: 'BLOG_POST:restaurant-kot-system-guide', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:kitchen-display-system', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:modifiers', kind: 'RELATED' },
  ],
  sortOrder: 4,
  featured: true,
  evidence: [
    'apps/web/src/industries/restaurant/pages/TablesLayoutPage.tsx',
    'apps/web/src/industries/restaurant/pages/KotDisplayPage.tsx',
    'apps/web/src/industries/restaurant/pages/StationsPage.tsx',
    'apps/web/src/industries/restaurant/pages/ModifiersPage.tsx',
    'apps/web/src/industries/restaurant/pages/RecipesPage.tsx',
    'apps/web/src/industries/restaurant/pages/RidersPage.tsx',
    'apps/web/src/industries/restaurant/pages/DeliveryTrackingPage.tsx',
    'apps/web/src/industries/restaurant/pages/HappyHoursPage.tsx',
    'apps/web/src/industries/restaurant/pages/RestaurantOrdersPage.tsx',
    'apps/web/src/modules/pos/components/PosSplitTender.tsx',
    'apps/api/src/integrations/online-orders/foodpanda.service.ts',
  ],
});

// ─── Wholesale and distribution ───

const wholesale = page({
  type: 'SOLUTION',
  slug: 'wholesale-distribution',
  title: 'Wholesale & Distribution',
  summary:
    'Nafaa for wholesalers and distributors handles trade the way it is done in Pakistan: carton and piece prices, a separate wholesale price, khata and credit limits for every trade customer, supplier accounts and purchase orders, stock across godowns and branches, A4 invoices and price lists you can send on WhatsApp.',
  data: { icon: 'truck', shortName: 'Wholesale', outcome: 'Carton Prices, Credit and Stock Under Control', segment: 'Wholesale and distribution', status: 'live' },
  seoTitle: 'Wholesale and Distribution Software in Pakistan',
  seoDescription:
    'Carton and wholesale prices, trade customer credit limits, supplier accounts, stock across godowns, A4 invoices and price lists. Nafaa for wholesalers.',
  focusKeyword: 'wholesale software pakistan',
  hero: {
    eyebrow: 'For wholesale & distribution',
    heading: 'Trade on credit without losing track of a single carton',
    sub: 'Sell by carton or piece at retail or wholesale price, keep every trade customer\'s khata and credit limit, buy from suppliers on account, and see stock across godowns and branches.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    badges: ['Wholesale prices', 'Credit limits', 'Supplier accounts'],
  },
  answer: {
    facts: [
      ['Prices', 'Retail and wholesale price per product, and per unit (piece, dozen, carton)'],
      ['Credit', 'Khata and credit limit for every trade customer'],
      ['Buying', 'Purchase orders, purchase bills, supplier accounts and payables'],
      ['Stock', 'Across godowns and branches, with transfers'],
    ],
    romanUrdu: 'Wholesale ke liye: carton aur piece ki alag qeemat, wholesale rate, har dukaandar ka khata aur credit limit, supplier ka hisaab, aur godown se branch tak stock.',
  },
  body: [
    diagram('A credit sale is checked against the customer\'s limit at the counter. Within the limit it goes straight on the khata; over it, a manager approves with a PIN or the sale is paid another way.', {
      kind: 'flow',
      nodes: [
        { id: 'bill', label: 'Trade bill', icon: 'receipt', note: 'Wholesale price, any unit' },
        { id: 'check', label: 'Credit check', icon: 'shield', note: 'Balance against the limit' },
        { id: 'pin', label: 'Manager PIN', icon: 'key-round', note: 'Only when over the limit' },
        { id: 'khata', label: 'On the khata', icon: 'notebook-pen', note: 'Ageing starts' },
        { id: 'recover', label: 'Recovery', icon: 'hand-coins', note: 'Payment clears it' },
      ],
      edges: [
        { from: 'bill', to: 'check' },
        { from: 'check', to: 'khata', label: 'Within limit' },
        { from: 'check', to: 'pin', label: 'Over limit' },
        { from: 'pin', to: 'khata', label: 'Approved' },
        { from: 'khata', to: 'recover' },
      ],
      animate: true,
    }, 'Credit control at the counter'),
    features('Wholesale, the way it is really done', [
      ['layers', 'Carton and piece', 'Buy and sell in cartons, dozens or pieces, each with its own price.'],
      ['tags', 'Wholesale price', 'A separate wholesale price per product and unit, picked at the counter.'],
      ['notebook-pen', 'Trade khata', 'Every shopkeeper\'s balance, payments and how old the udhaar is.'],
      ['shield', 'Credit limits', 'New credit stops at the limit unless a manager approves with a PIN.'],
      ['clipboard-list', 'Suppliers and purchase orders', 'Orders, part deliveries, purchase bills and what you owe each supplier.'],
      ['warehouse', 'Godowns and branches', 'Stock in each location, with transfers checked on arrival.'],
    ]),
    shot({
      heading: 'Know who owes what, and since when',
      body: 'The khata groups every trade customer\'s balance by age, so collection rounds start with the right shops. Reminders go on WhatsApp with the exact balance.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'split-right',
      callouts: [
        { x: 24, y: 19, label: 'Total the market owes you' },
        { x: 62, y: 30, label: '7, 30, 90 days and older' },
        { x: 63, y: 12, label: 'WhatsApp reminders' },
      ],
    }),
    table('A retail sale and a trade sale, side by side', 'The same counter handles both. What changes is the price, the paper and where the money goes.', [
      { key: 'retail', label: 'Retail customer' },
      { key: 'trade', label: 'Trade customer', highlight: true },
    ], [
      ['Price', 'Retail price of the unit', 'Wholesale price of the unit'],
      ['Unit', 'Usually pieces', 'Cartons, dozens or pieces'],
      ['Payment', 'Cash, card or wallet', 'Often on the khata, up to the credit limit'],
      ['Paper', 'Thermal receipt or WhatsApp', 'A4 invoice with your letterhead'],
      ['Follow-up', 'None', 'Ageing, reminders and payments on the khata'],
    ]),
    steps('A trade day in Nafaa', [
      ['Morning orders', 'Shopkeepers call or message their orders; each becomes a bill at wholesale rates.'],
      ['Dispatch from the godown', 'Stock leaves the godown it was billed from, and the A4 invoice goes with the goods.'],
      ['Buy to refill', 'Raise a purchase order; receive part or all of it and the supplier\'s balance updates.'],
      ['Evening recovery', 'Payments from the collection round go on each khata, and the day book closes.'],
    ]),
    shot({ heading: 'Margins at wholesale rates', body: 'Profit by product shows sale, cost and margin for every item, so thin-margin lines are visible before they eat the month.', id: SHOT.profitByProduct, url: 'app.nafaa.pk/reports/profit', layout: 'split-left' }),
    prose(`## What to check before choosing wholesale software

Wholesale runs on thin margins and long credit, so small mistakes add up fast. Before you choose a system, ask:

- **Can one product have more than one unit and price?** A carton of 24 and a single piece must each have a retail and a wholesale price, and stock must stay right whichever one is sold.
- **Is credit controlled at the counter?** A limit that only shows in a report is too late. In Nafaa the counter stops at the limit unless a manager approves.
- **Does it handle the supplier side?** Purchase orders, deliveries that arrive in parts, supplier returns and what you owe, by age. The supplier page also shows how each supplier's rates have moved.
- **Can you send a price list?** The catalog screen prints a price list or photo catalog and shares it on WhatsApp, showing sale prices only, never cost.
- **Will it grow to a second godown?** Stock per location and transfers between them should be part of the same account.

Hardware and building-material dealers also get quotations and contractor accounts in the [hardware](/industries/hardware) setup. See [purchasing](/product/purchasing) and the [khata](/product/khata) for the details.`),
    callout('info', 'Order booking by field staff on their own phones and a buyer ordering portal are being built. See the [roadmap](/roadmap) for progress, or ask our team about a [custom setup](/services/custom-software).', 'Coming soon: field order booking'),
    pricing('Plans for one godown or many'),
  ],
  faqKeys: ['mp-wholesale-prices', 'mp-khata-limit', 'sol-wholesale-price-list', 'sol-wholesale-supplier-rates', 'mp-branches-transfer', 'mp-reports-export'],
  cta: { heading: 'Bring your trade book online', body: 'Book a demo and we will map your price lists and trade customers with you.', primary: DEMO, secondary: WHATSAPP },
  relations: [
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:multi-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:autoparts', kind: 'TAG' },
    { ref: 'SERVICE:data-migration', kind: 'TAG' },
    { ref: 'SERVICE:custom-software', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:udhaar', kind: 'RELATED' },
    { ref: 'BLOG_POST:wholesale-vs-retail-pricing', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:consignment', kind: 'RELATED' },
  ],
  sortOrder: 5,
  evidence: [
    'apps/web/src/modules/pos/lib/posUnits.ts',
    'apps/web/src/modules/pos/hooks/useSharedPosCart.ts',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/purchasing/purchases/pages/PurchasesListPage.tsx',
    'apps/web/src/modules/purchasing/suppliers/pages/SupplierDetailPage.tsx',
    'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx',
    'apps/web/src/modules/catalog/pages/CatalogPage.tsx',
    'apps/web/src/core/receipt/types.ts',
    'apps/web/src/industries/hardware/pages/NewQuotationPage.tsx',
  ],
  needsOwner: ['Field order booking (order booker app) and a B2B buyer portal: the API has b2b-wholesale endpoints (apps/api/src/modules/b2b-wholesale) but no screen in apps/web, so they are shown as coming soon.'],
});

// ─── Manufacturing ───

const manufacturing = page({
  type: 'SOLUTION',
  slug: 'manufacturing',
  title: 'Manufacturing',
  summary:
    'Nafaa for manufacturers and food producers covers raw materials, recipes with costing and daily production plans, milk-to-product production for dairies, made-to-order jobs with karigars for furniture, purchasing from suppliers, finished stock across godowns and branches, and sales through the counter, trade khata and online. General bills of materials and work orders are coming soon.',
  data: { icon: 'factory', shortName: 'Manufacturing', outcome: 'From Raw Material to Sale in One System', segment: 'Production', status: 'live' },
  seoTitle: 'Manufacturing and Production Software for Pakistani SMEs',
  seoDescription:
    'Raw materials, recipe costing, production plans, made-to-order jobs, purchasing and finished stock with sales in one system. BOM and work orders coming soon.',
  focusKeyword: 'manufacturing software pakistan',
  hero: {
    eyebrow: 'For manufacturing',
    heading: 'From raw material to sale, in one connected system',
    sub: 'Buy raw materials on account, cost every recipe, plan today\'s production, and sell the finished goods from the counter, to trade customers or online, with stock and profit you can trust.',
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'buy', label: 'Raw materials', icon: 'truck' },
        { id: 'recipe', label: 'Recipe & cost', icon: 'calculator' },
        { id: 'plan', label: 'Production plan', icon: 'factory' },
        { id: 'stock', label: 'Finished stock', icon: 'boxes' },
        { id: 'sell', label: 'Sale', icon: 'receipt' },
      ],
      edges: [
        { from: 'buy', to: 'recipe' },
        { from: 'recipe', to: 'plan' },
        { from: 'plan', to: 'stock' },
        { from: 'stock', to: 'sell' },
      ],
    },
    layout: 'split',
    badges: ['Recipe costing', 'Production plans', 'BOM coming soon'],
  },
  answer: {
    facts: [
      ['Works today', 'Raw materials, recipe costing and production for bakeries, dairies and kitchens; made-to-order jobs for furniture'],
      ['For any factory', 'Purchasing, supplier accounts, finished stock, sales, khata and reports'],
      ['Coming soon', 'Bills of materials for any product, work orders and machine tracking'],
      ['Custom', 'Our team builds production modules around your process'],
    ],
    romanUrdu: 'Factory aur food production ke liye: kacha maal, recipe ki costing, roz ka production plan, supplier ka hisaab aur tayyar maal ki bikri. Har product ka BOM aur work orders jald aa rahe hain.',
  },
  body: [
    steps('How production runs in Nafaa today', [
      ['Buy raw materials', 'Purchase bills add flour, milk, wood or any material to stock at its cost.'],
      ['Cost the recipe', 'Each recipe lists what goes in, and Nafaa works out the cost per piece at today\'s rates.'],
      ['Plan production', 'Plan what to make today from orders due and the expected counter sale.'],
      ['Sell and see profit', 'Finished goods sell at the counter, on khata or online, with real margins.'],
    ]),
    table('What production screens exist today, by trade', 'Production in Nafaa is built trade by trade. This is what each setup includes now; everything else is on the roadmap.', [
      { key: 'make', label: 'Making', highlight: true },
      { key: 'cost', label: 'Cost and loss' },
    ], [
      ['[Bakery and sweets](/industries/bakery)', 'Baking plans with "made" and "failed", plus bulk orders for weddings and offices', 'Raw materials, shopping list and recipe costing at today\'s rates'],
      ['[Dairy](/industries/dairy)', 'Milk turned into dahi, makhan, lassi or khoya', 'At the milk\'s cost; day-end spoilage recorded as a loss'],
      ['[Furniture](/industries/furniture)', 'Custom orders from quotation to advance, karigar, ready and delivery', 'Karigar pay from the drawer saved as an expense'],
      ['[Restaurant kitchens](/industries/restaurant)', 'Recipes per dish, and how many plates the stock still covers', 'Plate cost and food cost percentage'],
      ['Any other factory', 'Production screens built on request', 'Purchasing, supplier accounts, finished stock, sales and reports'],
    ]),
    features('What you get', [
      ['package', 'Raw material stock', 'Ingredients and materials with their own units, waste and movements.'],
      ['calculator', 'Recipe costing', 'Cost per item from its recipe, updated when material prices change.'],
      ['factory', 'Production plans', 'Daily plans with suggestions, and analytics of planned, made and failed.'],
      ['clipboard-list', 'Purchasing', 'Purchase orders, supplier accounts, purchase bills and payables.'],
      ['git-branch', 'Bills of materials', 'Multi-level BOMs for any product, not only food.', 'coming'],
      ['clipboard-check', 'Work orders', 'Issue materials to a job and record output and wastage.', 'coming'],
    ]),
    callout('tip', 'Today the production screens are built for food producers and made-to-order furniture. Factories in other trades use Nafaa for purchasing, stock, sales and khata, and our team can [build the production module](/services/custom-software) your process needs.', 'Where Nafaa fits today'),
    shot({ heading: 'Profit per finished item', body: 'Once recipes carry their cost, profit by product shows the real margin of every item you make, not only what it sold for.', id: SHOT.profitByProduct, url: 'app.nafaa.pk/reports/profit', layout: 'split-right' }),
    prose(`## Built from the counter up

Most manufacturing software starts at the factory floor and treats sales as an afterthought. Small Pakistani manufacturers usually sell from their own outlet, to trade customers on credit and more and more online. Nafaa starts from that reality: the same account that plans production also runs the counter, the trade khata and the online orders, so the cost of every recipe flows straight into the profit on every sale.

## Getting costing right

Costing goes wrong in two places: the material price used is old, and waste is never counted. In Nafaa the recipe is priced at the rate of the latest purchase, so when flour or milk goes up, the cost per piece moves the same day. Waste, spoilage and failed batches are recorded against stock, and the profit report shows them as a loss instead of hiding them in a lower stock count.

Supplier accounts sit next to production. A [purchase](/product/purchasing) raises what you owe the supplier, and finished goods sold on credit go on the customer's [khata](/product/khata), so cash flow is visible from both sides.`),
    pricing('Plans for one unit or many'),
  ],
  faqKeys: ['mp-manufacturing-scope', 'bakery-costing', 'sol-mfg-dairy', 'sol-mfg-made-to-order', 'mp-wholesale-prices'],
  cta: { heading: 'Talk to us about your production line', body: 'Tell us how you make and sell; we will show what works today and what we can build.', primary: DEMO, secondary: WHATSAPP },
  relations: [
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:dairy', kind: 'TAG' },
    { ref: 'INDUSTRY:furniture', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'SERVICE:custom-software', kind: 'TAG' },
    { ref: 'SERVICE:data-migration', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:work-order', kind: 'RELATED' },
  ],
  sortOrder: 6,
  evidence: [
    'apps/web/src/industries/bakery/pages/IngredientsPage.tsx',
    'apps/web/src/industries/bakery/pages/ProductionPage.tsx',
    'apps/web/src/industries/bakery/pages/BakeryBulkOrdersPage.tsx',
    'apps/web/src/industries/bakery/components/raw/RecipeCosting.tsx',
    'apps/web/src/industries/bakery/components/production/PlanBuilder.tsx',
    'apps/web/src/industries/bakery/components/production/ProductionAnalytics.tsx',
    'apps/web/src/industries/dairy/pages/ProductionPage.tsx',
    'apps/web/src/industries/furniture/pages/CustomOrdersPage.tsx',
    'apps/web/src/industries/furniture/pages/CarpentersPage.tsx',
    'apps/web/src/industries/restaurant/pages/RecipesPage.tsx',
    'apps/web/src/modules/purchasing',
  ],
  needsOwner: ['General manufacturing (multi-level BOM, work orders, machine tracking) is not in apps/web; shown as coming soon. Confirm roadmap wording.'],
});

// ─── Enterprise ───

const enterprise = page({
  type: 'SOLUTION',
  slug: 'enterprise',
  title: 'Enterprise',
  summary:
    'Nafaa for enterprises connects many branches, teams and systems: permissions per person and branch, audit and activity logs, the Nafaa API and webhooks, daily accounting journals to QuickBooks, Xero or Zoho Books, owner-only backups, and custom modules and data migration from our own team.',
  data: { icon: 'landmark', shortName: 'Enterprise', outcome: 'Branches, Systems and Teams Connected', segment: 'Enterprise', status: 'live' },
  seoTitle: 'Enterprise POS and Business Software in Pakistan',
  seoDescription:
    'Branches, permissions, audit logs, API and webhooks and accounting sync, with custom modules and migration by the Nafaa team. Talk to us.',
  focusKeyword: 'enterprise pos software pakistan',
  hero: {
    eyebrow: 'For enterprise',
    heading: 'A business platform that fits into your company',
    sub: 'Run every branch on Nafaa and connect it to the systems you already have: accounting through daily journals, your own apps through the API and webhooks, and online channels through ready connections. Our team builds the rest.',
    diagram: {
      kind: 'hub',
      center: { label: 'Nafaa', icon: 'layers' },
      spokes: [
        { label: 'Branches', icon: 'building-2' },
        { label: 'API & webhooks', icon: 'webhook' },
        { label: 'Accounting', icon: 'file-spreadsheet' },
        { label: 'Staff & permissions', icon: 'users' },
        { label: 'Online channels', icon: 'globe' },
        { label: 'Nafaa Bazaar', icon: 'store' },
      ],
    },
    layout: 'split',
    primary: { label: 'Talk to sales', href: '#quote', trackAs: 'hero_demo' },
    secondary: { label: 'Read the API docs', href: '/developers', trackAs: 'hero_docs' },
    badges: ['API & webhooks', 'Accounting sync', 'Audit logs'],
  },
  answer: {
    facts: [
      ['Scale', 'Many branches and teams in one account'],
      ['Control', 'Permissions per person and branch, manager PIN, audit and activity logs'],
      ['Connect', 'REST API, webhooks, QuickBooks, Xero, Zoho Books, Tally export'],
      ['Our team', 'Custom modules, integrations, data migration and training'],
    ],
    romanUrdu: 'Bari companies ke liye: bohat si branches, har shakhs ki alag ijazat, audit log, API aur webhooks, accounting software se roz ka hisaab, aur hamari team se custom modules aur data migration.',
  },
  body: [
    features('Enterprise needs, covered', [
      ['building-2', 'Many branches', 'Branch analytics, branch P&L and transfers across the company.'],
      ['user-cog', 'Permissions', 'Role presets, then each person\'s own list of permissions and branches.'],
      ['eye', 'Audit trail', 'Nigrani for risky actions and an activity log of who changed what.'],
      ['braces', 'API and webhooks', 'Read products, stock, customers, sales and orders; get events as they happen.'],
      ['file-spreadsheet', 'Accounting sync', 'Daily journals to QuickBooks, Xero or Zoho Books, or a Tally export.'],
      ['code-xml', 'Custom modules', 'Our team builds the screens and connectors your process needs.'],
    ]),
    diagram('Every way business data leaves Nafaa for your other systems, each one controlled by permissions and recorded.', {
      kind: 'hub',
      center: { label: 'Your Nafaa data', icon: 'database' },
      spokes: [
        { label: 'REST API', icon: 'braces', href: '/developers' },
        { label: 'Signed webhooks', icon: 'webhook' },
        { label: 'Accounting journals', icon: 'file-spreadsheet' },
        { label: 'Tally voucher file', icon: 'book-open' },
        { label: 'Excel exports', icon: 'download' },
        { label: 'Owner backup', icon: 'lock' },
      ],
      animate: true,
    }, 'Where your data can go', 'muted'),
    table('Controls that IT and finance ask about', 'What Nafaa does today for access, audit and data. Each line is a screen in the app.', [
      { key: 'nafaa', label: 'In Nafaa', highlight: true },
      { key: 'where', label: 'Where' },
    ], [
      ['Access', 'A login per person; role presets fill the permissions once, then each person keeps their own list, limited to their branches', 'Staff, roles and permissions'],
      ['Sensitive actions', 'Refunds need a manager PIN by default; hand discounts have a limit; voids and price changes are logged', 'Counter settings'],
      ['Audit', 'Voids, refunds, large discounts, sales below cost, drawer shorts, write-offs and failed or new-device logins', 'Nigrani'],
      ['Change history', 'Who changed what and when, filterable and exportable to CSV', 'Activity log'],
      ['Data out', 'Excel exports with a download history, and an owner-only backup of all records as one file', 'Exports and backup'],
      ['Finance', 'Daily journals to QuickBooks, Xero or Zoho Books, and a Tally export', 'Accounting'],
    ]),
    shot({ heading: 'One view across the company', body: 'Head office compares every branch for any period, while each branch runs its own day.', id: SHOT.branches, url: 'app.nafaa.pk/branches', layout: 'split-right' }),
    steps('How an enterprise rollout runs', [
      ['Discovery', 'We map your branches, roles, price lists and the systems Nafaa must talk to.'],
      ['Migration', 'Products, customers, balances and suppliers are imported and checked with you.'],
      ['Integration', 'Accounting and your own systems are connected through the API and webhooks.'],
      ['Training and go-live', 'Teams are trained branch by branch, then each branch goes live.'],
    ]),
    shot({ heading: 'Settings in one place', body: 'Business details, users, counter rules, tax and a setup health check, so head office can see what each part of the account is set to.', id: SHOT.settings, url: 'app.nafaa.pk/settings', layout: 'split-left' }),
    prose(`## When a ready product is not enough

Large businesses rarely fit any software exactly. Nafaa covers the daily work of every branch, and the gaps are closed in one of three ways:

1. **Configuration.** Permissions, counter rules, receipt layouts, price units and industry screens are settings, not code.
2. **Integration.** The [developer API](/developers) and signed webhooks let your own systems read Nafaa data and react to sales and orders. Accounting connects through daily journals.
3. **Custom modules.** When a process is specific to your company, the Nafaa engineering team builds it as a [custom software](/services/custom-software) project, with a written scope and one fixed quote.

Every rollout includes [data migration](/services/data-migration) and [training](/services/training) by role, so teams start on day one with their own products, customers and balances already in place.`),
    leadForm('Talk to our team', 'Tell us about your branches, teams and the systems Nafaa must connect to. We reply with questions and a rollout plan, usually within one working day.', { form: 'contact', formType: 'ENTERPRISE', subjectPrefix: 'Enterprise' }),
  ],
  faqKeys: ['mp-enterprise-api', 'mp-staff-permissions', 'sol-ent-data-out', 'sol-ent-accounting', 'mp-migration-what', 'mp-reports-export'],
  cta: { heading: 'Plan your rollout with our team', body: 'Tell us about your branches and systems. We will reply with a plan.', primary: { label: 'Talk to sales', href: 'demo', trackAs: 'cta_demo' }, secondary: WHATSAPP },
  relations: [
    { ref: 'PRODUCT:multi-shop', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'PRODUCT:online-store', kind: 'TAG' },
    { ref: 'SERVICE:custom-software', kind: 'TAG' },
    { ref: 'SERVICE:data-migration', kind: 'TAG' },
    { ref: 'SERVICE:training', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'COMPARE:nafaa-vs-quickbooks', kind: 'RELATED' },
  ],
  sortOrder: 7,
  evidence: [
    'apps/web/src/modules/organization/shops/pages/ShopsOverviewPage.tsx',
    'apps/web/src/modules/hr/staff/components/RolesPanel.tsx',
    'apps/web/src/modules/hr/staff/components/PermissionPicker.tsx',
    'apps/web/src/core/security/ManagerPin.tsx',
    'apps/web/src/modules/reports/audit/pages/AuditPage.tsx',
    'apps/web/src/modules/reports/activity-log/pages/ActivityLogPage.tsx',
    'apps/web/src/modules/reports/exports/pages/ExportsPage.tsx',
    'apps/web/src/modules/backup/pages/BackupPage.tsx',
    'apps/web/src/integrations/accounting/AccountingPage.tsx',
    'apps/web/src/integrations/developer/DeveloperPage.tsx',
    'apps/api/src/integrations/public-api',
    'apps/api/src/integrations/accounting',
  ],
});

export const solutions: SeedEntry[] = [singleShop, retailChains, ecommerce, restaurants, wholesale, manufacturing, enterprise];
