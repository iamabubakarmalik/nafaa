/**
 * SOLUTION pages (/solutions/<slug>): Nafaa set up for a kind of business.
 * Every claim is backed by the files in `evidence` (checked 20 Oct 2026).
 * Not-built parts carry the "Coming soon" badge and point to the roadmap.
 */

import type { SeedEntry } from '../../lib/types';
import { SHOT, callout, diagram, features, page, pricing, prose, shot, steps } from './_build';

const singleShop = page({
  type: 'SOLUTION',
  slug: 'single-shop',
  title: 'Retail & Shops',
  summary:
    'Nafaa for a single shop puts the whole business on the device you already own: a fast counter that works offline, stock in every unit, a digital khata with WhatsApp reminders, and a daily profit report, from a 7-day free trial.',
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
      ['In the box', 'POS, inventory, khata, reports, staff, WhatsApp receipts'],
      ['Devices', 'Phone, tablet or computer; scanner and printer optional'],
      ['Price', 'Paid plans from {{price:min.monthly}} a month after the free trial'],
    ],
    romanUrdu:
      'Ek dukaan ke liye poora system: bill, stock, udhaar aur munafa ek app me. Jo phone ya computer hai usi par chalta hai, aur bijli ya internet jaye to bhi bill bante rehte hain.',
  },
  body: [
    steps('A day in the shop with Nafaa', [
      ['Open', 'Count the opening cash and check the low-stock list over chai.', SHOT.lowStock],
      ['Sell', 'Scan or tap, take cash, wallet or udhaar, and print or WhatsApp the receipt.', SHOT.posPhone],
      ['Collect', 'Send udhaar reminders from the khata during the quiet hour.'],
      ['Close', 'Count the drawer and read today\'s profit after cost and expenses.'],
    ]),
    features('Everything a shop needs, nothing it does not', [
      ['scan-barcode', 'Fast counter', 'Barcode, quick keys and units, with split payments and returns.', undefined],
      ['wifi-off', 'Works offline', 'Bills keep going without internet and sync later.'],
      ['boxes', 'Stock in every unit', 'Cartons in, pieces out, with low-stock alerts.'],
      ['notebook-pen', 'Digital khata', 'Udhaar from the counter, credit limits and WhatsApp reminders.'],
      ['chart-column', 'Daily profit', 'Profit after cost and expenses, by product and for the day.'],
      ['receipt-text', 'Tax invoices', 'Optional FBR/PRA integration, only if your business needs it.'],
    ]),
    shot({
      heading: 'The counter your staff learn in one morning',
      body: 'Large tiles, clear prices and stock on every item. The bill is always on screen, and every way to pay is one tap away.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
    }),
    pricing('Start free, then pick a plan'),
  ],
  faqKeys: ['devices', 'offline', 'khata-reminders', 'pricing', 'every-business'],
  cta: { heading: 'Open your shop on Nafaa today', body: 'Seven days free. No card. Your first bill in minutes.' },
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:mobile-shop', kind: 'TAG' },
  ],
  sortOrder: 1,
  featured: true,
  evidence: ['apps/web/src/modules/pos', 'apps/web/src/modules/inventory', 'apps/web/src/modules/customers/directory/KhataBookPage.tsx', 'apps/web/src/modules/finance/profit-report', 'apps/web/src/industries', 'apps/api/src/integrations/fbr'],
});

const retailChains = page({
  type: 'SOLUTION',
  slug: 'retail-chains',
  title: 'Retail Chains',
  summary:
    'Nafaa for retail chains runs every branch from one account: each branch has its own counter, stock and cash, head office compares sales and profit across branches, stock moves by transfer, staff only reach their own branches, and every refund and discount is on the record.',
  data: { icon: 'building-2', shortName: 'Retail chains', outcome: 'Every Branch Under Control', segment: 'Multi-branch retail', status: 'live' },
  seoTitle: 'Retail Chain Software in Pakistan: Every Branch Under Control',
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
      ['Head office', 'Sales, profit, staff and customers compared side by side'],
      ['Control', 'Roles per branch, manager PIN, activity and audit logs'],
      ['Reports', 'Branch P&L, stock value and staff sales, per branch or combined'],
    ],
    romanUrdu: 'Kai branches ek account se: har branch ka apna counter aur stock, aur head office me sab ki bikri aur munafa saath saath. Stock transfer, staff ki ijazat aur har discount ka record.',
  },
  body: [
    diagram('Head office sees every branch; stock moves between branches with a record on both sides.', { kind: 'multi-branch' }, 'One account, every branch'),
    features('Built for owners of many shops', [
      ['layout-dashboard', 'Branch analytics', 'Today and trend, branch by branch, on one screen.'],
      ['chart-line', 'Branch P&L', 'Profit and loss for each branch and for the chain.'],
      ['arrow-left-right', 'Stock transfers', 'Send and receive stock with confirmation.'],
      ['users', 'Staff by branch', 'People only open the branches they work in.'],
      ['eye', 'Audit and activity', 'Refunds, voids, discounts and price changes with names and times.'],
      ['file-spreadsheet', 'Exports and accounting', 'Excel exports and journals for QuickBooks, Xero, Zoho Books or Tally.'],
    ]),
    shot({ heading: 'Compare every branch in one view', body: 'Sales, bills and trend for each branch, so the weak one stands out early.', id: SHOT.branchesDark, url: 'app.nafaa.pk/branches', layout: 'full' }),
    steps('How chains roll out Nafaa', [
      ['Start with one branch', 'Import products and customers once; they are shared by every branch.'],
      ['Add branches', 'Each gets its own receipt header, stock and cash register.'],
      ['Set roles', 'Managers, cashiers and stock staff get only the access they need.'],
      ['Run from head office', 'Watch every branch live and move stock where it sells.'],
    ]),
    pricing('Plans by number of shops'),
  ],
  faqKeys: ['mp-branches-transfer', 'mp-staff-permissions', 'mp-reports-export', 'offline', 'pricing'],
  cta: { heading: 'Bring every branch into one view', body: 'Book a demo and we will set it up with your branch structure.', primary: { label: 'Book a demo', href: 'demo', trackAs: 'cta_demo' }, secondary: { label: 'Ask on WhatsApp', href: 'whatsapp', trackAs: 'whatsapp' } },
  relations: [
    { ref: 'PRODUCT:multi-shop', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:shoe', kind: 'TAG' },
  ],
  sortOrder: 2,
  featured: true,
  evidence: ['apps/web/src/modules/multi-branch', 'apps/web/src/modules/inventory/transfers', 'apps/web/src/modules/reports/audit', 'apps/web/src/modules/reports/activity-log', 'apps/api/src/integrations/accounting', 'apps/api/src/integrations/tax-authority'],
});

const ecommerce = page({
  type: 'SOLUTION',
  slug: 'ecommerce',
  title: 'E-commerce Sellers',
  summary:
    'Nafaa for e-commerce sellers runs your own online store and the Nafaa Bazaar marketplace from the same stock as your shop: orders from your website, Shopify, WooCommerce and Daraz in one list, courier booking with TCS, Leopards, PostEx and more, COD risk checks and payment links.',
  data: { icon: 'shopping-bag', shortName: 'E-commerce', outcome: 'Online Store and Marketplace, One Stock', segment: 'Online sellers', status: 'live' },
  seoTitle: 'E-commerce Software for Pakistani Sellers: One Stock Online',
  seoDescription:
    'Your online store, Shopify, WooCommerce, Daraz and Nafaa Bazaar on one stock, with courier booking, COD checks and payment links. 7-day free trial.',
  focusKeyword: 'ecommerce software pakistan',
  hero: {
    eyebrow: 'For e-commerce sellers',
    heading: 'Sell everywhere online and ship from one stock',
    sub: 'Your own store, Shopify, WooCommerce, Daraz and Nafaa Bazaar, all feeding one order list and one stock. Book the courier from the order, catch risky COD buyers before you ship, and see the profit on every parcel.',
    media: { id: SHOT.onlineOrders, url: 'app.nafaa.pk/online-orders' },
    badges: ['Own store + marketplace', '6 couriers', 'COD risk check'],
  },
  answer: {
    facts: [
      ['Sell on', 'Your website on Nafaa, Shopify, WooCommerce, Daraz and Nafaa Bazaar'],
      ['Ship with', 'TCS, Leopards, M&P, PostEx, Trax and CallCourier'],
      ['Get paid', 'COD tracking, plus JazzCash and Easypaisa payment links'],
      ['Stock', 'One stock with your shop or warehouse; channels update on every sale'],
    ],
    romanUrdu: 'Apni website, Shopify, WooCommerce, Daraz aur Nafaa Bazaar sab ek stock se. Courier ki booking order se hi, COD wale mushkil customers ki pehchaan pehle, aur payment links bhi.',
  },
  body: [
    diagram('Orders from every channel come into Nafaa; stock changes flow back out to each channel.', { kind: 'store-sync' }, 'One stock, every channel'),
    features('From the click to the cash', [
      ['globe', 'Your own store', 'A website on Nafaa, or connect the Shopify or WooCommerce store you already run.'],
      ['store', 'Nafaa Bazaar', 'List products on the Nafaa marketplace to reach new buyers.'],
      ['truck', 'Courier booking', 'Book and track TCS, Leopards, M&P, PostEx, Trax and CallCourier parcels.'],
      ['shield', 'COD risk check', 'See a buyer\'s past orders and refusals before you ship.'],
      ['link', 'Payment links', 'Collect JazzCash or Easypaisa before dispatch.'],
      ['package-search', 'Google product feed', 'Share your catalogue with Google so shoppers find it.'],
    ]),
    shot({ heading: 'Connect your channels once', body: 'Match your products once; after that prices and stock flow to every channel by themselves.', id: SHOT.salesChannels, url: 'app.nafaa.pk/channels', layout: 'split-right' }),
    shot({ heading: 'Never miss an order in a busy hour', body: 'New online orders pop up over the counter screen with Accept and View, so the shop team handles them between walk-in customers.', id: SHOT.posOnlineAlert, url: 'app.nafaa.pk/pos', layout: 'split-left' }),
    steps('How an online order flows', [
      ['Order lands', 'From any channel, into one list, with the buyer\'s history next to it.'],
      ['Pack from one stock', 'The same shelf the shop sells from, so nothing is oversold.'],
      ['Ship', 'Book the courier, print the label, track the parcel.'],
      ['Settle', 'Mark COD collected when the courier pays; profit shows per order.'],
    ]),
  ],
  faqKeys: ['mp-ecommerce-stock', 'mp-ecommerce-cod', 'mp-online-channels', 'mp-bazaar-what', 'sell-online'],
  cta: { heading: 'Put every online order on one screen', body: 'Connect your store and list on Nafaa Bazaar in the free trial.' },
  relations: [
    { ref: 'PRODUCT:online-store', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:payments', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:cosmetics', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'TAG' },
    { ref: 'INDUSTRY:shoe', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:cod', kind: 'RELATED' },
  ],
  sortOrder: 3,
  featured: true,
  evidence: [
    'apps/api/src/integrations/online-orders',
    'apps/api/src/integrations/channels/custom-website',
    'apps/api/src/integrations/online-orders/courier-api',
    'apps/api/src/integrations/online-orders/customer-risk.ts',
    'apps/api/src/integrations/online-orders/payment-links.service.ts',
    'apps/api/src/integrations/google/feed.ts',
    'apps/api/src/marketplace/publishing',
  ],
});

const restaurants = page({
  type: 'SOLUTION',
  slug: 'restaurants',
  title: 'Restaurants & Cafés',
  summary:
    'Nafaa for restaurants and cafés runs dine-in, takeaway and delivery from one system: a table layout with running bills, kitchen order tickets sent to each station, a menu with modifiers and recipes that take ingredients out of stock, riders for delivery and Foodpanda orders.',
  data: { icon: 'utensils-crossed', shortName: 'Restaurants', outcome: 'Tables, Kitchen and Delivery in One System', segment: 'Food service', status: 'live' },
  seoTitle: 'Restaurant POS Software in Pakistan: Tables, KOT & Delivery',
  seoDescription:
    'Table layout, KOT to kitchen stations, menu modifiers, recipes, riders, Foodpanda orders and split bills. Restaurant POS by Nafaa. Free trial.',
  focusKeyword: 'restaurant pos software pakistan',
  hero: {
    eyebrow: 'For restaurants & cafés',
    heading: 'Tables, kitchen and delivery moving in one rhythm',
    sub: 'Waiters take orders at the table, tickets fly to the right kitchen station, and the counter sees every running bill. Delivery riders and Foodpanda orders fit into the same flow.',
    media: { id: SHOT.tables, url: 'app.nafaa.pk/restaurant/tables' },
    badges: ['Table layout', 'KOT by station', 'Delivery & Foodpanda'],
  },
  answer: {
    facts: [
      ['Service', 'Dine-in, takeaway and delivery'],
      ['Kitchen', 'KOT to each station, on screen or printed, new to cooking to ready'],
      ['Menu', 'Modifiers, deals, happy hours and recipes that use ingredient stock'],
      ['Delivery', 'Riders, delivery charges and Foodpanda orders in the same list'],
    ],
    romanUrdu: 'Restaurant ke liye: tables par running bill, kitchen ke har station ko KOT, menu me modifiers aur recipes, delivery riders aur Foodpanda orders, sab ek system me.',
  },
  body: [
    shot({
      heading: 'The whole floor at a glance',
      body: 'Tables by section, with free, occupied, cleaning and reserved at a glance. Tap a table to see its running bill, guests and kitchen status.',
      id: SHOT.tables,
      url: 'app.nafaa.pk/restaurant/tables',
      layout: 'full',
    }),
    shot({ heading: 'A kitchen that keeps up', body: 'Tickets move from new to cooking to ready on the kitchen display, so the counter knows the moment food is up.', id: SHOT.kot, url: 'app.nafaa.pk/restaurant/kot', layout: 'split-right' }),
    shot({ heading: 'Waiters carry the menu', body: 'On a tablet, waiters open a table, add dishes with modifiers and send the order without walking to the counter.', id: SHOT.tablesTablet, frame: 'tablet', layout: 'split-left' }),
    features('Built for service, not just billing', [
      ['layout-grid', 'Table layout', 'Sections and tables that match your floor, with running bills.'],
      ['chef-hat', 'Kitchen stations', 'Send each item to its station: grill, tandoor, drinks, desserts.'],
      ['list-checks', 'Modifiers and deals', 'Extra cheese, less spicy, family deals and happy hours.'],
      ['package', 'Recipes and food cost', 'Plate cost at today\'s rates, food cost %, and how many plates your stock still covers.'],
      ['bike', 'Delivery and riders', 'Assign riders and track delivery orders, including Foodpanda.'],
      ['wallet', 'Split payment', 'One table\'s bill across cash, card and wallets, or part on the khata.'],
    ]),
    pricing('Plans for one outlet or many'),
  ],
  faqKeys: ['mp-restaurant-kot', 'restaurant-stations', 'restaurant-split', 'mp-fbr-who', 'offline'],
  cta: { heading: 'Run a calmer rush hour', body: 'Set up your floor and menu in the free trial, or book a demo with our team.' },
  relations: [
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:hotel', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:fbr', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:kot', kind: 'RELATED' },
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
    'apps/web/src/industries/restaurant/pages/HappyHoursPage.tsx',
    'apps/api/src/integrations/online-orders/foodpanda.service.ts',
    'apps/api/src/integrations/tax-authority/adapters.ts',
  ],
});

const wholesale = page({
  type: 'SOLUTION',
  slug: 'wholesale-distribution',
  title: 'Wholesale & Distribution',
  summary:
    'Nafaa for wholesalers and distributors handles trade the way it is done in Pakistan: carton and piece prices, separate wholesale prices, credit limits and khata for every trade customer, supplier accounts and purchasing, stock across godowns and branches, and A4 invoices.',
  data: { icon: 'truck', shortName: 'Wholesale', outcome: 'Carton Prices, Credit and Stock Under Control', segment: 'Wholesale and distribution', status: 'live' },
  seoTitle: 'Wholesale and Distribution Software in Pakistan',
  seoDescription:
    'Carton and wholesale prices, trade customer credit limits, supplier accounts, stock across godowns and A4 invoices. Nafaa for wholesalers. Free trial.',
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
      ['Buying', 'Supplier accounts, purchase bills and payables'],
      ['Stock', 'Across godowns and branches, with transfers'],
    ],
    romanUrdu: 'Wholesale ke liye: carton aur piece ki alag qeemat, wholesale rate, har dukaandar ka khata aur credit limit, supplier ka hisaab, aur godown se branch tak stock.',
  },
  body: [
    diagram('A trade order moves from the order to the godown, out for dispatch, onto the invoice and into collection on the khata.', {
      kind: 'order-to-cash',
      labels: { booker: 'Trade order', warehouse: 'Godown stock', dispatch: 'Dispatch', invoice: 'A4 invoice', collection: 'Khata collection' },
    }, 'From order to collection'),
    features('Wholesale, the way it is really done', [
      ['layers', 'Carton and piece', 'Buy and sell in cartons, dozens or pieces, each with its own price.'],
      ['tags', 'Wholesale price', 'A separate wholesale price per product and unit.'],
      ['notebook-pen', 'Trade khata', 'Every shopkeeper\'s balance, payments and ageing.'],
      ['shield', 'Credit limits', 'Stop new credit at the limit unless a manager approves.'],
      ['clipboard-list', 'Supplier accounts', 'Purchase bills, payables and payments to suppliers.'],
      ['warehouse', 'Godowns and branches', 'Stock in each location with transfers between them.'],
    ]),
    shot({ heading: 'Know who owes what, and since when', body: 'The khata groups every trade customer\'s balance by age, so collection rounds start with the right shops.', id: SHOT.khata, url: 'app.nafaa.pk/khata', layout: 'split-right' }),
    callout('info', 'Order booking by field staff on their own phones and a buyer ordering portal are being built. See the [roadmap](/roadmap) for progress, or ask our team about a custom setup.', 'Coming soon: field order booking'),
    pricing('Plans for one godown or many'),
  ],
  faqKeys: ['mp-wholesale-prices', 'mp-khata-limit', 'mp-branches-transfer', 'mp-reports-export', 'pricing'],
  cta: { heading: 'Bring your trade book online', body: 'Book a demo and we will map your price lists and trade customers with you.', primary: { label: 'Book a demo', href: 'demo', trackAs: 'cta_demo' }, secondary: { label: 'Ask on WhatsApp', href: 'whatsapp', trackAs: 'whatsapp' } },
  relations: [
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:autoparts', kind: 'TAG' },
  ],
  sortOrder: 5,
  evidence: ['apps/web/src/modules/pos/lib/posUnits.ts', 'apps/web/src/modules/pos/engine/usePosEngine.ts', 'apps/web/src/core/lib/offline/offlineKhata.ts', 'apps/web/src/modules/purchasing', 'apps/web/src/modules/inventory/transfers', 'apps/web/src/core/print/types.ts'],
  needsOwner: ['Field order booking (order booker app) and a B2B buyer portal: the API has b2b-wholesale endpoints (apps/api/src/modules/b2b-wholesale) but no screen in apps/web, so they are shown as coming soon.'],
});

const manufacturing = page({
  type: 'SOLUTION',
  slug: 'manufacturing',
  title: 'Manufacturing',
  summary:
    'Nafaa for manufacturers and food producers covers raw materials, recipes with costing and daily production plans, purchasing from suppliers, finished-goods stock across godowns and branches, and sales through the counter, trade khata and online. General bills of materials and work orders are coming soon.',
  data: { icon: 'factory', shortName: 'Manufacturing', outcome: 'From Raw Material to Sale in One System', segment: 'Production', status: 'live' },
  seoTitle: 'Manufacturing and Production Software for Pakistani SMEs',
  seoDescription:
    'Raw materials, recipe costing, production plans, purchasing and finished stock with sales in one system. Bills of materials and work orders coming soon.',
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
      ['Works today', 'Raw materials, recipes with costing, daily production plans (food production)'],
      ['For any factory', 'Purchasing, supplier accounts, finished stock, sales and reports'],
      ['Coming soon', 'Bills of materials for any product, work orders and machine tracking'],
      ['Custom', 'Our team builds production modules around your process'],
    ],
    romanUrdu: 'Factory aur food production ke liye: kacha maal, recipe ki costing, roz ka production plan, supplier ka hisaab aur tayyar maal ki bikri. Har product ka BOM aur work orders jald aa rahe hain.',
  },
  body: [
    steps('How production runs in Nafaa today', [
      ['Buy raw materials', 'Purchase bills add ingredients and materials to stock at their cost.'],
      ['Cost the recipe', 'Each recipe lists what goes in, and Nafaa works out the cost per piece.'],
      ['Plan production', 'Plan what to make today; suggestions start from what sold before.'],
      ['Sell and see profit', 'Finished goods sell at the counter, on khata or online, with real margins.'],
    ]),
    features('What you get', [
      ['package', 'Raw material stock', 'Ingredients and materials with their own units and movements.'],
      ['calculator', 'Recipe costing', 'Cost per item from its recipe, updated when material prices change.'],
      ['factory', 'Production plans', 'Daily plans with suggestions, and production analytics.'],
      ['clipboard-list', 'Purchasing', 'Supplier accounts, purchase bills and payables.'],
      ['git-branch', 'Bills of materials', 'Multi-level BOMs for any product, not only food.', 'coming'],
      ['clipboard-check', 'Work orders', 'Issue materials to a job and record output and wastage.', 'coming'],
    ]),
    callout('tip', 'Today the production screens are built for food production (bakeries, sweets, kitchens). Factories in other trades use Nafaa for purchasing, stock, sales and khata, and our team can [build the production module](/services/custom-software) your process needs.', 'Where Nafaa fits today'),
    prose(`## Built from the counter up

Most manufacturing software starts at the factory floor and treats sales as an afterthought. Small Pakistani manufacturers usually sell from their own outlet, to trade customers on credit and increasingly online. Nafaa starts from that reality: the same account that plans production also runs the counter, the trade khata and the online store, so the cost of every recipe flows straight into the profit on every sale.`),
  ],
  faqKeys: ['mp-manufacturing-scope', 'bakery-costing', 'mp-wholesale-prices', 'pricing'],
  cta: { heading: 'Talk to us about your production line', body: 'Tell us how you make and sell; we will show what works today and what we can build.', primary: { label: 'Book a demo', href: 'demo', trackAs: 'cta_demo' }, secondary: { label: 'Ask on WhatsApp', href: 'whatsapp', trackAs: 'whatsapp' } },
  relations: [
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:dairy', kind: 'TAG' },
    { ref: 'INDUSTRY:furniture', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
  ],
  sortOrder: 6,
  evidence: [
    'apps/web/src/industries/bakery/pages/IngredientsPage.tsx',
    'apps/web/src/industries/bakery/pages/ProductionPage.tsx',
    'apps/web/src/industries/bakery/components/raw/RecipeCosting.tsx',
    'apps/web/src/industries/bakery/components/production/PlanBuilder.tsx',
    'apps/web/src/industries/bakery/components/production/SuggestPanel.tsx',
    'apps/web/src/industries/bakery/components/production/ProductionAnalytics.tsx',
    'apps/web/src/modules/purchasing',
  ],
  needsOwner: ['General manufacturing (multi-level BOM, work orders, machine tracking) is not in apps/web; shown as coming soon. Confirm roadmap wording.'],
});

const enterprise = page({
  type: 'SOLUTION',
  slug: 'enterprise',
  title: 'Enterprise',
  summary:
    'Nafaa for enterprises connects many branches, teams and systems: roles and permissions per branch, audit and activity logs, the Nafaa API and webhooks, daily accounting journals to QuickBooks, Xero or Zoho Books, and custom modules and data migration from our own team.',
  data: { icon: 'landmark', shortName: 'Enterprise', outcome: 'Branches, Systems and Teams Connected', segment: 'Enterprise', status: 'live' },
  seoTitle: 'Enterprise POS and Business Software in Pakistan',
  seoDescription:
    'Branches, roles, audit logs, API and webhooks and accounting sync, with custom modules and migration by the Nafaa team. Talk to us.',
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
        { label: 'Staff & roles', icon: 'users' },
        { label: 'Online channels', icon: 'globe' },
        { label: 'Nafaa Bazaar', icon: 'store' },
      ],
    },
    layout: 'split',
    primary: { label: 'Talk to sales', href: 'demo', trackAs: 'hero_demo' },
    secondary: { label: 'Read the API docs', href: '/developers', trackAs: 'hero_docs' },
    badges: ['API & webhooks', 'Accounting sync', 'Audit logs'],
  },
  answer: {
    facts: [
      ['Scale', 'Many branches and teams in one account'],
      ['Control', 'Roles per branch, manager PIN, audit and activity logs'],
      ['Connect', 'REST API, webhooks, QuickBooks, Xero, Zoho Books, Tally export'],
      ['Our team', 'Custom modules, integrations, data migration and training'],
    ],
    romanUrdu: 'Bari companies ke liye: bohat si branches, har team ki alag ijazat, audit log, API aur webhooks, accounting software se roz ka hisaab, aur hamari team se custom modules aur data migration.',
  },
  body: [
    features('Enterprise needs, covered', [
      ['building-2', 'Many branches', 'Branch analytics, branch P&L and transfers across the company.'],
      ['user-cog', 'Roles and permissions', 'Access by role and by branch, for every person.'],
      ['eye', 'Audit trail', 'Activity and audit logs of sensitive actions with names and times.'],
      ['braces', 'API and webhooks', 'Read products, stock, customers, sales and orders; get events as they happen.'],
      ['file-spreadsheet', 'Accounting sync', 'Daily journals to QuickBooks, Xero or Zoho Books, or a Tally export.'],
      ['code-xml', 'Custom modules', 'Our team builds the screens and connectors your process needs.'],
    ]),
    diagram('Your apps call the Nafaa API; Nafaa calls your systems back with webhooks when sales and orders happen.', { kind: 'api-webhooks' }, 'Built to connect', 'muted'),
    shot({ heading: 'One view across the company', body: 'Head office compares every branch, while each branch runs its own day.', id: SHOT.branches, url: 'app.nafaa.pk/branches', layout: 'split-right' }),
    steps('How an enterprise rollout runs', [
      ['Discovery', 'We map your branches, roles, price lists and the systems Nafaa must talk to.'],
      ['Migration', 'Products, customers, balances and suppliers are imported and checked with you.'],
      ['Integration', 'Accounting, tax and your own systems are connected through the API and webhooks.'],
      ['Training and go-live', 'Teams are trained branch by branch, then each branch goes live.'],
    ]),
  ],
  faqKeys: ['mp-enterprise-api', 'mp-reports-export', 'mp-staff-permissions', 'mp-fbr-who', 'mp-migration-what'],
  cta: { heading: 'Plan your rollout with our team', body: 'Tell us about your branches and systems. We will reply with a plan.', primary: { label: 'Talk to sales', href: 'demo', trackAs: 'cta_demo' }, secondary: { label: 'Ask on WhatsApp', href: 'whatsapp', trackAs: 'whatsapp' } },
  relations: [
    { ref: 'PRODUCT:multi-shop', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'PRODUCT:fbr', kind: 'TAG' },
    { ref: 'SERVICE:custom-software', kind: 'TAG' },
    { ref: 'SERVICE:data-migration', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
  ],
  sortOrder: 7,
  evidence: ['apps/web/src/modules/multi-branch', 'apps/web/src/modules/reports/audit', 'apps/api/src/integrations/public-api', 'apps/api/src/integrations/accounting', 'apps/api/src/integrations/tax-authority', 'apps/web/src/integrations/developer/DeveloperPage.tsx'],
});

export const solutions: SeedEntry[] = [singleShop, retailChains, ecommerce, restaurants, wholesale, manufacturing, enterprise];
