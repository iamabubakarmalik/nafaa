/**
 * Hub PAGE entries owned by the main templates (D2): /product, /solutions,
 * /services, /industries, /integrations, /roadmap, /blog, /glossary and
 * /changelog, plus the AI assistant product page
 * (PRODUCT:ai-assistant) and the changelog entries that can be shown from
 * known release dates.
 *
 * Hubs list their children with entryGrid blocks, so a newly published
 * product, solution, service or industry appears without editing the hub.
 * The integrations hub lists connections by category from the app's own
 * catalogue (apps/api/src/integrations/core/integration.service.ts
 * getAvailableIntegrations, tax-authority adapters, accounting adapters).
 */

import type { DraftBlock } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { withIds } from '../../lib/blocks';
import type { SeedEntry } from '../../lib/types';
import { SHOT, callout, diagram, features, leadForm, page, prose, shot, steps, table } from './_build';

type Block = Omit<DraftBlock, 'id'>;

const QUOTE = { label: 'Quote lein', href: '#quote', trackAs: 'hero_quote' };
const WHATSAPP = { label: 'Chat on WhatsApp', href: 'whatsapp', trackAs: 'whatsapp' };

function grid(entryType: string, heading: string, intro: string, layout: 'cards' | 'grouped' | 'list' = 'cards', extra: Record<string, unknown> = {}): Block {
  return { type: 'entryGrid', heading, intro, entryType, sort: 'order', limit: 60, layout, ...extra } as Block;
}

// ─── /product ───

const productHub = page({
  type: 'PAGE',
  slug: 'product',
  title: 'Product',
  summary:
    'Nafaa is one account for the whole business: the POS counter, stock, digital khata, purchasing, staff, reports, several branches and online orders from your own store or the Nafaa marketplace. Every product page shows how it works in the real app and is marked live, beta or coming soon.',
  data: { template: 'hub', hubOf: 'PRODUCT' },
  seoTitle: 'Nafaa Product: POS, Inventory, Khata and Online Orders',
  seoDescription:
    'Everything in Nafaa in one place: POS billing, stock, digital khata, purchasing, staff, reports, branches and online orders.',
  focusKeyword: 'business software pakistan',
  hero: {
    eyebrow: 'The Nafaa platform',
    heading: 'One account for the counter, the stock room and the books',
    sub: 'Billing, stock, khata, purchasing, staff, reports and online orders share one set of data, so a sale at the counter updates everything else on its own. Start with what you need today and switch on the rest as you grow.',
    media: { id: SHOT.dashboard, url: 'app.nafaa.pk/dashboard' },
    badges: ['Keeps billing offline', 'English and Roman Urdu', 'WhatsApp built in'],
  },
  answer: {
    heading: 'Nafaa in one minute',
    facts: [
      ['Sell', 'POS counter on any phone, tablet or computer, also without internet'],
      ['Stock', 'Products, units, batches, low-stock alerts, purchasing and suppliers'],
      ['Money', 'Khata, expenses, cash register, profit and loss, accounting export'],
      ['Grow', 'Several branches, staff roles, your own online store and Nafaa Bazaar'],
      ['Price', '7 din Free Trial, then plans from {{price:min.monthly}} a month'],
    ],
    romanUrdu:
      'Nafaa ek hi account me bill, stock, khata, kharidari, staff, reports aur online orders chalata hai. Counter par sale hoti hai to stock aur hisaab khud update ho jata hai.',
  },
  body: [
    grid('PRODUCT', 'Everything in Nafaa', 'Each product works on its own and better together. Coming-soon items carry a badge and are never sold as available.'),
    diagram(
      'Every part of Nafaa reads and writes the same data: a sale at the counter moves stock, the khata, the cash register and the reports at once.',
      {
        kind: 'hub',
        center: { label: 'Your Nafaa account', icon: 'layers' },
        spokes: [
          { label: 'POS counter', icon: 'scan-barcode', href: '/product/pos' },
          { label: 'Stock', icon: 'boxes', href: '/product/inventory' },
          { label: 'Khata', icon: 'notebook-pen', href: '/product/khata' },
          { label: 'Online orders', icon: 'shopping-bag', href: '/product/online-store' },
          { label: 'Reports', icon: 'chart-column', href: '/product/reports' },
          { label: 'Payments', icon: 'wallet', href: '/product/payments' },
          { label: 'Staff', icon: 'users', href: '/product/staff' },
          { label: 'Branches', icon: 'building-2', href: '/product/multi-shop' },
        ],
        animate: true,
      },
      'One set of data, every part of the business',
      'muted',
    ),
    shot({
      heading: 'The whole business on the phone in your pocket',
      body: 'The dashboard, the counter and the khata run in the browser on Android and iPhone, so the owner sees today\'s sales from anywhere and a small shop can start with nothing else.',
      id: SHOT.dashboardPhone,
      frame: 'phone',
      layout: 'split-left',
    }),
    features('Built for how business works in Pakistan', [
      ['wifi-off', 'Load-shedding proof', 'The counter keeps billing without internet and syncs when the connection returns.'],
      ['languages', 'English and Roman Urdu', 'Screens and receipts in the words your team already uses.'],
      ['wallet', 'Every way Pakistan pays', 'Cash, card, JazzCash, Easypaisa, bank transfer and khata, split in one bill.'],
      ['receipt-text', 'Tax invoices', 'Optional FBR/PRA integration, only if your business needs it.'],
      ['message-circle', 'WhatsApp built in', 'Receipts and khata reminders go out on WhatsApp.'],
      ['lock', 'Counter rules', 'Manager PIN for refunds and big discounts, with every sensitive action logged.'],
    ]),
    steps('Start in four steps', [
      ['Sign up and pick your trade', 'The screens your trade needs switch on over the same core.'],
      ['Add products', 'By hand, by scanning barcodes, or from Excel with a check before anything is saved.'],
      ['Make the first bill', 'On the phone or computer you have; a printer and scanner are optional.'],
      ['Add the rest when you need it', 'Khata, purchasing, staff, branches and online orders are already in the same account.'],
    ]),
    table('Which part of Nafaa does what', 'Each part has its own page with real screens. They all read and write the same data.', [
      { key: 'job', label: 'The job it does', highlight: true },
      { key: 'who', label: 'Used most by' },
    ], [
      ['[POS counter](/product/pos)', 'Bills with barcodes, quick keys, units, returns and split payments, online or offline', 'Cashiers'],
      ['[Inventory](/product/inventory)', 'Products, units, stock counts, damage, low stock and the stock report', 'Stock staff'],
      ['[Khata](/product/khata)', 'Udhaar per customer, credit limits, ageing and WhatsApp reminders', 'Owner and collection staff'],
      ['[Purchasing](/product/purchasing)', 'Purchase orders, purchase bills, suppliers and what you owe them', 'Whoever buys stock'],
      ['[Reports](/product/reports)', 'Day book, profit by product, P&L, staff, customers and audit', 'Owner and managers'],
      ['[Staff](/product/staff)', 'Logins, permissions, attendance, payroll and commission', 'Owner'],
      ['[Branches](/product/multi-shop)', 'Many shops on one account, with transfers and branch P&L', 'Head office'],
      ['[Online orders](/product/online-store)', 'Website, Shopify, WooCommerce, Daraz and Foodpanda orders on one stock', 'The online team'],
    ]),
    prose(`## Why one account beats several apps

Many businesses run billing in one app, udhaar in a notebook, stock in Excel and online orders in WhatsApp chats. Each one is fine on its own, and together they never agree. In Nafaa a sale is written once: the counter takes the payment, stock goes down in the unit sold, the khata moves if it was on credit, the cash register knows what is in the drawer, and the reports change at the same moment. When a branch, an online store or a new staff member is added, they join the same data instead of starting a new copy.

That is also why the [AI assistant](/product/ai-assistant) can answer questions across the whole business: everything it reads lives in the same place. See [pricing](/pricing) for the plans, or [solutions](/solutions) for how different kinds of business put the parts together.`),
    callout('info', 'New: the [Nafaa AI assistant](/product/ai-assistant) answers questions about your own sales, stock and khata in plain English or Roman Urdu.', 'New'),
  ],
  faqKeys: ['every-business', 'hub-product-one-price', 'devices', 'offline', 'pricing'],
  cta: { heading: 'Open your Nafaa account today', body: '7 din Free Trial on the device you already have. No card needed.' },
  sortOrder: 1,
  evidence: ['apps/web/src/modules', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/api/src/integrations/tax-authority/adapters.ts', 'apps/web/src/core/security/ManagerPin.tsx', 'apps/web/src/modules/ai-assistant/index.ts', 'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx', 'apps/web/src/modules/hr'],
});

// ─── /solutions ───

const solutionsHub = page({
  type: 'PAGE',
  slug: 'solutions',
  title: 'Solutions',
  summary:
    'Nafaa setups for the way a business is run, not only what it sells: a single shop, retail chains with many branches, e-commerce sellers with their own store and the Nafaa marketplace, restaurants, wholesale and distribution, manufacturing and enterprises that need their systems connected.',
  data: { template: 'hub', hubOf: 'SOLUTION' },
  seoTitle: 'Business Software Solutions: Retail, Online, Restaurants',
  seoDescription:
    'Business software setups for shops, retail chains, online sellers, restaurants, wholesale, manufacturing and enterprises in Pakistan, on one Nafaa account.',
  focusKeyword: 'business management software pakistan',
  hero: {
    eyebrow: 'Solutions',
    heading: 'Complete business software for every way you sell',
    sub: 'From one counter to a chain of branches, from a shop window to an online store, from a kitchen to a factory floor: Nafaa brings sales, stock, money and people into one system that grows with you.',
    media: { id: SHOT.branches, url: 'app.nafaa.pk/branches' },
    badges: ['Shops to enterprises', 'Online and in store', 'One stock, one set of books'],
  },
  answer: {
    heading: 'Which setup fits you',
    facts: [
      ['One shop', 'Counter, stock and khata in one app'],
      ['Many branches', 'Head-office view, stock transfers and branch P&L'],
      ['Selling online', 'Your own store, Shopify, WooCommerce, Daraz and Nafaa Bazaar from one stock'],
      ['Food service', 'Tables, kitchen tickets, takeaway and delivery'],
      ['Trade and production', 'Carton prices, trade khata, raw materials and costing'],
    ],
    romanUrdu:
      'Aik dukaan ho, kai branches, online store, restaurant, wholesale ya factory: Nafaa sab ke liye ek hi system hai jisme sale, stock, paisa aur staff ek jagah hain.',
  },
  body: [
    grid('SOLUTION', 'Pick the way you run your business', 'Each solution shows the products it uses, real screens and how teams roll it out.'),
    table(
      'Solutions at a glance',
      'Every solution runs on the same Nafaa account, so you can add another way of selling later without moving your data.',
      [
        { key: 'who', label: 'Best for' },
        { key: 'core', label: 'Core of the setup', highlight: true },
      ],
      [
        ['[Retail & shops](/solutions/single-shop)', 'Kiryana, pharmacy, garments, mobile and every single-counter shop', 'POS, stock, khata, reports'],
        ['[Retail chains](/solutions/retail-chains)', 'Two or more branches under one owner', 'Branches, stock transfers, staff roles, branch P&L'],
        ['[E-commerce](/solutions/ecommerce)', 'Sellers with an online store, social or marketplace orders', 'Online orders, channels, couriers, Nafaa Bazaar'],
        ['[Restaurants](/solutions/restaurants)', 'Restaurants, cafés, bakeries and cloud kitchens', 'Tables, kitchen tickets, menu, delivery'],
        ['[Wholesale & distribution](/solutions/wholesale-distribution)', 'Wholesalers, distributors and dealers', 'Carton prices, trade khata, A4 invoices'],
        ['[Manufacturing](/solutions/manufacturing)', 'Small and mid-size production units', 'Raw materials, production, costing, sales'],
        ['[Enterprise](/solutions/enterprise)', 'Groups with many teams, systems and branches', 'API, webhooks, accounting, custom modules'],
      ],
    ),
    diagram('Orders from every channel arrive in one list; stock changes flow back out to every channel.', { kind: 'store-sync' }, 'In store and online, from one stock', 'muted'),
    shot({
      heading: 'Online orders land next to the counter',
      body: 'When a website order arrives, it pops up over the POS screen with Accept and View, so the same team serves walk-in and online customers from the same shelf.',
      id: SHOT.posOnlineAlert,
      url: 'app.nafaa.pk/pos',
      layout: 'split-right',
    }),
    steps('How to pick your setup', [
      ['Start from how you sell', 'One counter, several branches, online, food service, trade on credit or production.'],
      ['Open the matching solution', 'Each page shows the screens, the daily flow and how teams roll it out.'],
      ['Try it on the free trial', 'Every solution runs on the same account, so nothing is locked in.'],
      ['Add the next one later', 'A second branch or an online store joins the same data when you grow.'],
    ]),
    prose(`## Most businesses use more than one

The solutions are not separate products. A restaurant with delivery also sells online; a wholesaler often has a retail counter at the front; a chain of shops may produce some of what it sells. Because every solution runs on one Nafaa account, you combine them instead of choosing one. A kiryana store can start as a [single shop](/solutions/single-shop), add a second branch as a [retail chain](/solutions/retail-chains), then open an [online store](/solutions/ecommerce), without moving a single record.

If your business does not fit any of these, start from your trade on the [industries](/industries) page, or tell us how you work and our team will suggest the right setup. For anything the app does not cover, the [services](/services) team builds it.`),
  ],
  faqKeys: ['every-business', 'hub-solutions-combine', 'sell-online', 'mp-branches-transfer', 'mp-enterprise-api'],
  cta: { heading: 'Tell us how your business runs', body: 'We will suggest the right setup and show it on a call, or start the 7 din Free Trial now.', primary: { label: 'Book a demo', href: 'demo', trackAs: 'cta_demo' }, secondary: WHATSAPP },
  sortOrder: 2,
  evidence: ['apps/web/src/modules/organization/shops', 'apps/api/src/integrations/core/integration.service.ts', 'apps/api/src/modules/b2b-wholesale', 'apps/web/src/modules/bookings', 'apps/api/src/integrations/public-api'],
});

// ─── /services ───

const servicesHub = page({
  type: 'PAGE',
  slug: 'services',
  title: 'Services',
  summary:
    'Services from the team that builds Nafaa, for businesses in Pakistan and worldwide: custom software, websites, e-commerce stores and mobile apps, plus Nafaa setup help such as data migration, hardware and training. Every project starts with a Quote lein request and a fixed quote in PKR or USD.',
  data: { template: 'hub', hubOf: 'SERVICE' },
  seoTitle: 'Software Development Services: Websites, Stores, Apps',
  seoDescription:
    'Custom software, websites, e-commerce stores and mobile apps from the Nafaa team, for clients in Pakistan and worldwide. Fixed quote in PKR or USD.',
  focusKeyword: 'software development services',
  hero: {
    eyebrow: 'Software services',
    heading: 'We build the software your business runs on',
    sub: 'The engineers behind Nafaa build custom software, websites, online stores and mobile apps for clients in Pakistan and abroad, and help Nafaa customers move in, set up and train their teams. Tell us what you need and get one fixed quote.',
    primary: QUOTE,
    secondary: WHATSAPP,
    badges: ['Pakistan and worldwide', 'Fixed quote in PKR or USD', 'Delivered in visible stages'],
  },
  answer: {
    heading: 'How our services work',
    facts: [
      ['Where', 'Pakistan and worldwide, over calls, email and WhatsApp'],
      ['What', 'Custom software, websites, e-commerce stores, mobile apps and Nafaa setup'],
      ['Price', 'One fixed quote for the agreed scope, in PKR or USD'],
      ['Process', 'Discover, design, build, launch and support, in visible stages'],
    ],
    romanUrdu:
      'Nafaa ki team Pakistan aur bahar ke clients ke liye custom software, website, online store aur mobile app banati hai. Form bharein, "Quote lein" aur PKR ya USD me ek fixed qeemat payein.',
  },
  body: [
    grid('SERVICE', 'What we can do for you', 'Build services are open to any business, worldwide. Setup services help Nafaa customers in Pakistan get running fast.'),
    diagram('Every project runs through five stages: discover, design, build, launch and support.', { kind: 'service-process' }, 'How every project runs', 'muted'),
    features('Why teams choose the Nafaa team', [
      ['code-xml', 'Proven in production', 'We build with the stack that runs Nafaa: React and Next.js, React Native, Electron, NestJS and PostgreSQL.'],
      ['plug-zap', 'Integrations are our daily work', 'Tax authorities, payment gateways, couriers, accounting and marketplaces.'],
      ['calendar-check', 'Visible stages', 'You see working software at each stage, not only at the end.'],
      ['handshake', 'One fixed quote', 'One price for the agreed scope; changes are quoted before they start.'],
      ['languages', 'English or Urdu', 'Calls, documents and training in the language your team prefers.'],
      ['shield-check', 'Security from day one', 'Roles, audit logs and encrypted secrets, as in Nafaa itself.'],
    ]),
    table('Build services and setup services', 'Two kinds of work, one process. Every request starts with the same short form.', [
      { key: 'build', label: 'Build services', highlight: true },
      { key: 'setup', label: 'Setup services' },
    ], [
      ['What', '[Custom software](/services/custom-software), [websites](/services/websites), [e-commerce stores](/services/online-store-setup), [mobile apps](/services/mobile-apps)', '[Data migration](/services/data-migration), [FBR setup](/services/fbr-integration-setup), [hardware](/services/hardware), [training](/services/training)'],
      ['For', 'Any business, with or without Nafaa', 'Businesses moving to or running on Nafaa'],
      ['Where', 'Pakistan and worldwide', 'Pakistan'],
      ['Quote', 'Fixed, in PKR or USD', 'Fixed, in PKR'],
      ['Ends with', 'Launch, training and support', 'Your team running on Nafaa'],
    ]),
    prose(`## What every project includes

Every project, large or small, gets the same basics: a written scope before work starts, one fixed price for that scope, working results at the end of each stage, and a handover to the people who will use what we built. Changes are welcome, and each one is quoted before it starts, so the price never moves without your say.

We do not publish a price list, because the same name can cover very different projects. A short message with a rough idea is enough to get a real number. You do not need a service to use Nafaa itself: the app is self-serve with the [free trial](/pricing), and services are there when you want the work done for you.`),
    leadForm('Quote lein', 'Tell us what you want to build or set up. We reply with questions, a plan and a fixed price in PKR or USD, usually within one working day.', { form: 'quote', formType: 'SALES', subjectPrefix: 'Services' }),
  ],
  faqKeys: ['mp-services-price', 'services-worldwide', 'hub-services-need', 'mp-migration-what'],
  cta: { heading: 'Have a project in mind?', body: 'A rough idea is enough to start. We will help shape it.', primary: QUOTE, secondary: WHATSAPP },
  sortOrder: 3,
  evidence: ['apps/web', 'apps/api', 'apps/mobile/package.json', 'apps/desktop/package.json', 'apps/api/src/integrations'],
  needsOwner: ['Reply time "usually within one working day" is the team\'s target; confirm.'],
});

// ─── /industries ───

const industriesHub = page({
  type: 'PAGE',
  slug: 'industries',
  title: 'Industries',
  summary:
    'Nafaa has screens made for each trade on top of the same counter, stock and khata: kiryana and grocery, pharmacy, bakery, restaurant, mobile phone shops, garments, hardware, jewellery, salons, clinics and more. Pick your trade to see the features, real screens and questions that matter to it.',
  data: { template: 'hub', hubOf: 'INDUSTRY' },
  seoTitle: 'POS Software by Industry: Kiryana, Pharmacy, Restaurant',
  seoDescription:
    'Nafaa screens for 30+ trades in Pakistan: kiryana, pharmacy, bakery, restaurant, mobile, garments, hardware, jewellery, salon, clinic and more.',
  focusKeyword: 'pos software for shops pakistan',
  hero: {
    eyebrow: 'Industries',
    heading: 'Made for your trade, built on one strong core',
    sub: 'A pharmacy needs batches and expiry, a mobile shop needs IMEI, a restaurant needs tables and a kitchen. Nafaa turns on the screens your trade needs on top of the same counter, stock and khata.',
    diagram: {
      kind: 'hub',
      center: { label: 'Nafaa core', icon: 'layers' },
      spokes: [
        { label: 'Kiryana', icon: 'shopping-basket', href: '/industries/kiryana' },
        { label: 'Pharmacy', icon: 'pill', href: '/industries/pharmacy' },
        { label: 'Restaurant', icon: 'utensils-crossed', href: '/industries/restaurant' },
        { label: 'Bakery', icon: 'cake-slice', href: '/industries/bakery' },
        { label: 'Mobile shop', icon: 'smartphone', href: '/industries/mobile-shop' },
        { label: 'Garments', icon: 'shirt', href: '/industries/garments' },
        { label: 'Hardware', icon: 'hammer', href: '/industries/hardware' },
        { label: 'Salon', icon: 'scissors', href: '/industries/salon' },
      ],
      animate: true,
    },
    badges: ['Screens for each trade', 'Same counter, stock and khata', 'Switch on what you need'],
  },
  answer: {
    heading: 'How industry screens work',
    facts: [
      ['Core', 'POS, stock, khata, reports and staff, the same for every trade'],
      ['On top', 'Trade screens such as batches and expiry, IMEI, tables and KOT, sizes and colours'],
      ['Switching', 'Pick your trade at signup; change it later in settings'],
    ],
    romanUrdu:
      'Har karobar ka core ek hai: counter, stock aur khata. Uske upar aapke karobar ki khaas screens khulti hain, jaise pharmacy me batch aur expiry, mobile shop me IMEI, restaurant me table aur kitchen.',
  },
  body: [
    grid('INDUSTRY', 'Find your trade', 'Grouped by kind of business. Each page shows the features made for that trade and the real screens.', 'grouped'),
    features('What every trade gets', [
      ['scan-barcode', 'A fast counter', 'Barcodes, quick keys, units and split payments.'],
      ['boxes', 'Stock you can trust', 'Low-stock alerts, purchasing and stock counts.'],
      ['notebook-pen', 'Digital khata', 'Udhaar with WhatsApp reminders and statements.'],
      ['chart-column', 'Real profit', 'Profit by product and a clear profit and loss.'],
      ['users', 'Staff and roles', 'Each person sees only what their job needs.'],
      ['wallet', 'Every way to pay', 'Cash, card, JazzCash, Easypaisa and khata in one bill.'],
    ], undefined, 'muted'),
    shot({
      heading: 'Same app, your screens',
      body: 'A restaurant opens on its table plan, a grocery opens on its counter. The menu, words and shortcuts follow the trade you chose.',
      id: SHOT.tables,
      url: 'app.nafaa.pk/tables',
      layout: 'split-right',
    }),
    table('What a few trades add on top of the core', 'Examples of the screens that switch on for a trade. Each trade page lists everything for that trade, with real screens.', [
      { key: 'stock', label: 'Products and stock', highlight: true },
      { key: 'service', label: 'Customers and service' },
    ], [
      ['[Pharmacy](/industries/pharmacy)', 'Expiring stock, salts and a controlled-medicine log', 'Prescriptions and doctors'],
      ['[Mobile shop](/industries/mobile-shop)', 'IMEI stock and used phones', 'Repair tickets and instalment plans'],
      ['[Restaurant](/industries/restaurant)', 'Recipes, add-ons and kitchen stations', 'Tables, kitchen tickets, riders and happy hours'],
      ['[Garments](/industries/garments)', 'Size charts and collections', 'Tailoring, alterations, exchanges and layaway'],
      ['[Jewellery](/industries/jewelry)', 'Metal rates and metal stock', 'Karigars, custom orders, repairs and exchanges'],
      ['[Salon](/industries/salon)', 'Services, packages and memberships', 'Appointments, calendar, gift vouchers and commission'],
      ['[Clinic](/industries/clinic)', 'Services and panels', 'Patients, queue, prescriptions and lab orders'],
      ['[Bakery](/industries/bakery)', 'Raw materials, recipe costing and baking plans', 'Cake orders and bulk orders'],
    ]),
    prose(`## Why one core matters

Trade software is often built from scratch for one kind of shop, so the khata, the reports and the counter behave differently in each. Nafaa does the opposite. The counter, stock, khata, cash register, staff and reports are the same for every trade and are improved for everyone at once; the trade screens sit on top. A pharmacy and a garments shop close their day with the same day book, and an owner with both kinds of shop reads them in one account.

If you run more than one kind of business, or your trade is not listed, the [general retail](/industries/retail) setup covers any shop that sells products, and [services businesses](/industries/services-biz) covers jobs and appointments. Our team can also [build what is missing](/services/custom-software).`),
  ],
  faqKeys: ['every-business', 'hub-industries-change', 'devices', 'kiryana-import'],
  cta: { heading: 'Do not see your trade?', body: 'The core works for any business that sells. Tell us how yours works and we will show you the right setup.', primary: { label: 'Start 7 din Free Trial', href: 'signup', trackAs: 'cta_signup' }, secondary: WHATSAPP },
  sortOrder: 4,
  evidence: ['apps/web/src/modules', 'apps/web/src/industries/pharmacy/pages', 'apps/web/src/industries/mobile/pages', 'apps/web/src/industries/restaurant/pages', 'apps/web/src/industries/garments/pages', 'apps/web/src/industries/jewelry/pages', 'apps/web/src/industries/salon/pages', 'apps/web/src/industries/clinic/pages', 'apps/web/src/industries/bakery/pages', 'apps/api/prisma/seed-marketing-cms/content/industries'],
});

// ─── /integrations ───

const integrationsHub = page({
  type: 'PAGE',
  slug: 'integrations',
  title: 'Integrations',
  summary:
    'Nafaa connects to the services Pakistani businesses already use: Shopify, WooCommerce, Daraz and Foodpanda orders; PostEx, Leopards, Trax, TCS, M&P and Call Courier; JazzCash and Easypaisa; QuickBooks, Xero, Zoho Books and Tally; WhatsApp; Google product feeds; and a REST API with webhooks for anything else.',
  data: { template: 'hub', hubOf: 'INTEGRATION' },
  seoTitle: 'Nafaa Integrations: Shopify, Daraz, Couriers, JazzCash',
  seoDescription:
    'Connect Nafaa to Shopify, WooCommerce, Daraz, Foodpanda, PostEx, TCS, Leopards, JazzCash, Easypaisa, QuickBooks, Xero, WhatsApp and more.',
  focusKeyword: 'pos integrations pakistan',
  hero: {
    eyebrow: 'Integrations',
    heading: 'Connect Nafaa to everything you already use',
    sub: 'Bring online orders into the same stock, book couriers, take wallet payments and post the day to your accounting software, all from inside Nafaa. For anything else there is an open API with webhooks.',
    diagram: {
      kind: 'hub',
      center: { label: 'Nafaa', icon: 'plug-zap' },
      spokes: [
        { label: 'Shopify & WooCommerce', icon: 'shopping-bag' },
        { label: 'Daraz & Foodpanda', icon: 'store' },
        { label: 'Couriers', icon: 'truck' },
        { label: 'JazzCash & Easypaisa', icon: 'wallet' },
        { label: 'Google product feed', icon: 'package-search' },
        { label: 'QuickBooks, Xero, Zoho', icon: 'file-spreadsheet' },
        { label: 'WhatsApp', icon: 'message-circle', href: '/product/whatsapp-sms' },
        { label: 'API & webhooks', icon: 'webhook', href: '/developers' },
      ],
      animate: true,
    },
    primary: { label: 'Start 7 din Free Trial', href: 'signup', trackAs: 'hero_signup' },
    secondary: { label: 'Read the API docs', href: '/developers', trackAs: 'hero_docs' },
    badges: ['Connect from inside the app', 'One stock for every channel', 'Open REST API'],
  },
  answer: {
    heading: 'Integrations in short',
    facts: [
      ['Sales channels', 'Shopify, WooCommerce, Daraz, Foodpanda and your own website'],
      ['Couriers', 'PostEx, Leopards, Trax, TCS, M&P and Call Courier'],
      ['Payments', 'JazzCash and Easypaisa, alongside cash, card and bank transfer'],
      ['Developers', 'REST API with signed webhooks'],
      ['Accounting', 'QuickBooks, Xero and Zoho Books journals, Tally export'],
    ],
    romanUrdu:
      'Nafaa Shopify, WooCommerce, Daraz, Foodpanda, couriers, JazzCash, Easypaisa, QuickBooks, Xero aur WhatsApp se jurta hai. Baqi har cheez ke liye API aur webhooks hain.',
  },
  body: [
    features('Sales channels', [
      ['shopping-bag', 'Shopify', 'Products, stock and orders sync with your Shopify store.', undefined, '/product/online-store'],
      ['globe', 'WooCommerce / WordPress', 'Connect with your site URL and approve in WordPress; orders, stock and products sync.', undefined, '/product/online-store'],
      ['store', 'Daraz', 'Daraz orders, stock and shipping labels inside Nafaa.', undefined, '/solutions/ecommerce'],
      ['utensils-crossed', 'Foodpanda', 'Accept, reject and mark Foodpanda orders ready from Nafaa.', undefined, '/solutions/restaurants'],
      ['code-xml', 'Your own website', 'Send orders from any website with ready code and a key.', undefined, '/developers'],
      ['shopping-basket', 'Nafaa Bazaar', 'List products on the Nafaa marketplace from the same stock.', undefined, '/marketplace'],
    ], 'Orders from every channel land in one list and are packed from the same stock the shop sells from.'),
    features('Couriers', [
      ['truck', 'PostEx', 'Booking, labels, tracking and COD settlement.'],
      ['truck', 'Leopards', 'Booking, labels, tracking and returns.'],
      ['truck', 'Trax (Sonic)', 'Booking, labels, tracking and COD settlement.'],
      ['package', 'TCS', 'Booking, labels, tracking and COD settlement through TCS Envio.'],
      ['package', 'M&P', 'Booking, tracking and returns.'],
      ['package', 'Call Courier', 'Booking and tracking.'],
    ], 'Connect your courier account once, then book and track parcels from the order screen.', 'muted'),
    features('Payments, tax and accounting', [
      ['wallet', 'JazzCash & Easypaisa', 'Take wallet payments at the counter and send payment links for online orders.', undefined, '/product/payments'],
      ['file-spreadsheet', 'QuickBooks, Xero & Zoho Books', 'Post each day\'s sales, payments and expenses as one journal.'],
      ['book-open', 'Tally', 'Export your books in a format Tally imports.'],
      ['receipt-text', 'Tax invoices (optional)', 'FBR/PRA integration for businesses that need it, with the invoice number and QR on the receipt.', undefined, '/product/fbr'],
      ['message-circle', 'WhatsApp', 'Receipts, khata reminders and order updates.', undefined, '/product/whatsapp-sms'],
      ['package-search', 'Google product feed', 'Share your catalogue and shop stock with Google so shoppers find it.'],
    ]),
    shot({
      heading: 'Connect once, then forget about it',
      body: 'Each channel shows whether it is connected, when it last synced and any order that needs attention, so problems are visible before a customer calls.',
      id: SHOT.salesChannels,
      url: 'app.nafaa.pk/channels',
      layout: 'split-right',
    }),
    diagram('Your systems call the Nafaa API; Nafaa sends signed webhooks when sales, stock or orders change.', { kind: 'api-webhooks' }, 'Build your own connection', 'muted'),
    steps('Connect a channel in four steps', [
      ['Open Settings, then Integrations', 'Sales channels, Foodpanda, online payments, couriers, Google, accounting and the API each have their own page.'],
      ['Connect', 'Approve in WordPress, install the Shopify app, or enter the keys your courier or wallet gives you.'],
      ['Match products', 'Link the channel\'s products to yours once; new ones follow by themselves.'],
      ['Watch it run', 'Each connection shows its status, the last sync and anything that needs attention.'],
    ]),
    prose(`## Need a connection that is not listed?

The [Nafaa developer API](/developers) covers products, stock, customers, sales and orders, with signed webhooks when something changes. If you would rather not build it yourself, our team can build the connection for you as a [custom software project](/services/custom-software) with one fixed quote.`),
  ],
  faqKeys: ['sell-online', 'mp-online-channels', 'hub-integrations-safe', 'mp-enterprise-api', 'mp-ecommerce-cod'],
  cta: { heading: 'Bring all your channels into one place', body: 'Start the 7 din Free Trial and connect your first channel today.', secondary: { label: 'Read the API docs', href: '/developers', trackAs: 'cta_docs' } },
  sortOrder: 5,
  evidence: [
    'apps/api/src/integrations/core/integration.service.ts',
    'apps/api/src/integrations/online-orders/shopify.service.ts',
    'apps/api/src/integrations/tax-authority/adapters.ts',
    'apps/api/src/integrations/accounting/quickbooks.adapter.ts',
    'apps/api/src/integrations/accounting/xero.adapter.ts',
    'apps/api/src/integrations/accounting/zoho.adapter.ts',
    'apps/api/src/integrations/accounting/tally.ts',
    'apps/api/src/integrations/google/feed.ts',
    'apps/api/src/integrations/payments/jazzcash',
    'apps/api/src/integrations/payments/easypaisa',
    'apps/api/src/integrations/whatsapp/whatsapp.service.ts',
    'apps/api/src/integrations/public-api/webhooks.service.ts',
  ],
  needsOwner: ['NayaPay and Raast appear in the app catalogue with credential fields only; left off this page until they are confirmed live.'],
});

// ─── /roadmap ───

const roadmapPage = page({
  type: 'PAGE',
  slug: 'roadmap',
  title: 'Roadmap',
  summary:
    'The Nafaa roadmap lists what shipped recently, what is in beta and what is coming soon. Beta features work in the app and are being improved with early users; coming-soon features are planned and not built yet, and we never sell them as available.',
  data: { template: 'roadmap' },
  seoTitle: 'Nafaa Roadmap: What Is in Beta and What Is Coming Soon',
  seoDescription:
    'What Nafaa shipped recently and what it is building next. Beta features work today; coming-soon features are planned and never sold as available.',
  focusKeyword: 'nafaa roadmap',
  hero: {
    eyebrow: 'Building in the open',
    heading: 'What we are building next',
    sub: 'See what is in beta, what is coming soon, and tell us what your business needs. Nothing on this page is sold as available until it is live in the app.',
    primary: { label: 'Ask for a feature', href: 'whatsapp', trackAs: 'hero_whatsapp' },
    secondary: { label: 'See live features', href: '/product', trackAs: 'hero_product' },
  },
  answer: {
    heading: 'How to read this page',
    facts: [
      ['Live', 'Works in the app today; no badge anywhere on the site'],
      ['Beta', 'Works in the app and is being improved with early users'],
      ['Coming soon', 'Planned and not built yet; never sold as available'],
    ],
    romanUrdu: 'Live: aaj kaam karta hai. Beta: kaam karta hai, behtar ho raha hai. Jald aa raha hai: abhi bana nahi, sirf mansooba hai.',
  },
  body: [
    diagram(
      'Recent releases and what comes next. Dates are the day a change went live; planned items have no date until they ship.',
      {
        kind: 'timeline',
        items: [
          { date: '13 Oct 2026', label: 'New app design', note: 'Cleaner sidebar, top bar and settings, in light and dark.' },
          { date: '14 Oct 2026', label: 'Shopify app install', note: 'Connect a Shopify store through the Shopify install flow.' },
          { date: 'New', label: 'AI business assistant', note: 'Ask about your own sales, stock and khata in plain English or Roman Urdu.' },
        ],
        animate: true,
      },
      'Shipped and next',
      'muted',
    ),
    { type: 'entryGrid', heading: 'Product', entryType: 'PRODUCT', filter: { status: ['beta', 'coming'] }, sort: 'order', limit: 60, layout: 'list' } as Block,
    { type: 'entryGrid', heading: 'Solutions', entryType: 'SOLUTION', filter: { status: ['beta', 'coming'] }, sort: 'order', limit: 60, layout: 'list' } as Block,
    { type: 'entryGrid', heading: 'Integrations', entryType: 'INTEGRATION', filter: { status: ['beta', 'coming'] }, sort: 'order', limit: 60, layout: 'list' } as Block,
  ],
  faqKeys: ['hub-roadmap-dates', 'every-business', 'devices'],
  cta: { heading: 'Need something that is not here?', body: 'Tell us how your business works today and what you need next.', primary: { label: 'Message us on WhatsApp', href: 'whatsapp', trackAs: 'cta_whatsapp' }, secondary: { label: 'Contact us', href: '/contact', trackAs: 'cta_contact' } },
  sortOrder: 6,
  evidence: ['apps/web/src/modules/ai-assistant/index.ts'],
});

// ─── PRODUCT:ai-assistant ───
// Shown as available on the owner's instruction (21 Oct 2026: the feature is about to ship).

const aiAssistant = page({
  type: 'PRODUCT',
  slug: 'ai-assistant',
  title: 'AI Business Assistant',
  summary:
    'The Nafaa AI business assistant answers questions about your own sales, stock and khata in plain English or Roman Urdu. Ask in your own words and get a short answer from your Nafaa data, with the numbers behind it. It only reads the business data your account is allowed to see.',
  data: { icon: 'sparkles', shortName: 'AI assistant', benefit: 'Ask Your Business in Plain Words', status: 'live' },
  seoTitle: 'Nafaa AI Assistant: Ask Your Business in Plain Words',
  seoDescription: 'The Nafaa AI business assistant answers questions about your sales, stock and khata in English or Roman Urdu, from your own business data.',
  focusKeyword: 'ai business assistant',
  hero: {
    eyebrow: 'New in Nafaa',
    heading: 'Ask your business a question, in your own words',
    sub: 'The Nafaa AI assistant answers questions about your own sales, stock and khata. Type in English or Roman Urdu and get a short answer with the numbers behind it, without opening several reports.',
    primary: { label: 'Start 7-day free trial', href: 'signup', trackAs: 'hero_trial' },
    secondary: { label: 'Book a demo', href: 'demo', trackAs: 'hero_demo' },
    badges: ['English and Roman Urdu', 'Reads only your own data', 'Answers with the numbers'],
  },
  answer: {
    heading: 'In short',
    facts: [
      ['What it does', 'Answers questions about your sales, stock and khata from your own Nafaa data'],
      ['Languages', 'English and Roman Urdu'],
      ['Data access', 'Only the business data the asking account is allowed to see'],
    ],
    romanUrdu: 'Nafaa AI assistant se apni sale, stock aur khata ke baare me apne alfaaz me sawal poochein, English ya Roman Urdu me, aur seedha jawab payein.',
  },
  body: [
    features('What it does', [
      ['message-square', 'Plain-word questions', 'Ask "Which products made the most profit this month?" and get the answer with the numbers.'],
      ['chart-line', 'Explain changes', 'See why today\'s sales are up or down against last week.'],
      ['boxes', 'Stock nudges', 'Know what to reorder before it runs out.'],
    ]),
    prose(`## Questions owners ask every day

Most owners want the same few answers before they open the shop and after they close it. The assistant gives them in one line, from the same numbers the app already keeps:

- "Aaj ki sale kitni hui, aur kal se zyada hai ya kam?"
- "Which products made the most profit this month?"
- "Kis gahak ka udhaar ek mahine se purana hai?"
- "What should I reorder before the weekend?"
- "Which branch sold the most yesterday?"

Each answer shows the numbers behind it, so you can check them, and links to the screen where the full detail lives.

## Where the answers come from

The assistant reads what already runs on Nafaa: bills from the [POS counter](/product/pos), stock and purchases from [inventory](/product/inventory), udhaar and payments from the [digital khata](/product/khata), and the figures in [reports](/product/reports). It does not guess. If a number is not in your Nafaa data, it says so instead of making one up. The more of your business runs on Nafaa, the more it can answer.

## English or Roman Urdu, your choice

Most people who use Nafaa type in Roman Urdu, and many switch between the two in one sentence. The assistant understands both, so a question like "is hafte sab se zyada kya bika?" works as well as "what sold the most this week?". Terms such as [khata](/glossary/khata) and [udhaar](/glossary/udhaar) mean what they mean in your shop.

## Your data stays yours

The assistant reads only your own business data, within the permissions of the account that asks. A cashier who cannot see profit in the app cannot ask the assistant for it either. It does not change prices, stock or bills by itself; any change still needs a person to make it in the app. The [reports](/product/reports) are always there when you want the full detail: profit by product, profit and loss and stock in one place.

## Made for every kind of business

A [kiryana store](/industries/kiryana) asks which items are running low. A [pharmacy](/industries/pharmacy) asks which batches expire soon. A [restaurant](/industries/restaurant) asks which dishes sold most at lunch. A [garments shop](/industries/garments) asks which sizes are moving. A [bakery](/industries/bakery) asks what sold out before evening, and a [mobile shop](/industries/mobile-shop) asks which models earn the most. The questions change; the answers come from the same counter, stock and khata.

## Getting started

Open the assistant from inside Nafaa and type your first question. There is nothing to set up: it already knows your products, customers and branches because they live in the same account. Start with yesterday's sale, then ask about udhaar and low stock, and you will see within a minute what it can do for your business.`),
  ],
  cta: { heading: 'Ask your first question', body: 'Start the 7-day free trial and ask about your own business in plain words.', primary: { label: 'Start free trial', href: 'signup', trackAs: 'cta_trial' }, secondary: { label: 'Message us on WhatsApp', href: 'whatsapp', trackAs: 'cta_whatsapp' } },
  sortOrder: 99,
  evidence: ['apps/web/src/modules/ai-assistant/index.ts'],
  needsOwner: ['Marketed as available on the owner\'s instruction (21 Oct 2026). Confirm plan availability before launch.'],
});

// ─── Content hubs (rendered by the article hub templates) ───

function contentHub(slug: string, title: string, summary: string, seo: [string, string, string], hero: { eyebrow: string; heading: string; sub: string }, answer: { facts: [string, string][]; romanUrdu: string }, faqKeys: string[], cta: { heading: string; body: string }): SeedEntry {
  return page({
    type: 'PAGE',
    slug,
    title,
    summary,
    data: { template: 'hub' },
    seoTitle: seo[0],
    seoDescription: seo[1],
    focusKeyword: seo[2],
    hero: { ...hero, layout: 'centered' },
    answer,
    body: [],
    faqKeys,
    cta,
    sortOrder: 20,
    evidence: ['apps/site/src/templates/article/HubTemplates.tsx'],
  });
}

const blogHub = contentHub(
  'blog',
  'Blog',
  'Practical writing for business owners in Pakistan: billing, stock, khata, selling online and running a growing business, plus Nafaa product news. Posts are checked against the app and official sources before they go live.',
  ['Nafaa Blog: Guides for Shops and Businesses in Pakistan', 'Practical guides on billing, stock, khata, selling online and growing a business in Pakistan, plus Nafaa product news and how-tos.', 'business tips pakistan'],
  { eyebrow: 'Blog', heading: 'Blog', sub: 'Practical writing for business owners in Pakistan: billing, stock, khata, tax rules, selling online and growing a business.' },
  { facts: [['Topics', 'How-to guides, industry guides, running a business, product news'], ['Checked', 'Claims checked against the app and official sources']], romanUrdu: 'Dukaan aur karobar chalane ke asaan guides: bill, stock, khata, FBR/PRA, online sale aur Nafaa ki nayi cheezein.' },
  [],
  { heading: 'Put these ideas to work', body: 'Start the 7 din Free Trial and run your business on Nafaa.' },
);

const glossaryHub = contentHub(
  'glossary',
  'Glossary',
  'Business and retail words explained simply, in English with the Roman Urdu meaning: khata, udhaar, POS, SKU, batch, margin, COD and more, each with an example from a Pakistani business and how Nafaa handles it.',
  ['Business Glossary: POS, Khata and Tax Terms in Urdu', 'Simple meanings of POS, khata, udhaar, SKU, batch, COD and other business words, in English and Roman Urdu with examples.', 'business terms in urdu'],
  { eyebrow: 'Glossary', heading: 'Glossary', sub: 'Business words explained simply, in English with the Roman Urdu meaning and an example from a real shop.' },
  { facts: [['Each term', 'Meaning, Roman Urdu, an example and how Nafaa handles it'], ['Languages', 'English with Roman Urdu']], romanUrdu: 'Karobar ke alfaaz asaan zubaan me: khata, udhaar, POS, SKU aur bohat kuch, misaal ke saath.' },
  [],
  { heading: 'See these ideas in the app', body: 'Every term here has a screen in Nafaa. Try it with the 7 din Free Trial.' },
);

const changelogHub = contentHub(
  'changelog',
  'Changelog',
  'What changed in Nafaa, newest first: new features, improvements and fixes in the app, the desktop app and the developer API. Each entry has the date it went live.',
  ['Nafaa Changelog: New Features, Improvements and Fixes', 'What changed in Nafaa, newest first: new features, improvements and fixes in the app, desktop app and developer API.', 'nafaa changelog'],
  { eyebrow: 'Changelog', heading: 'Changelog', sub: 'What changed in Nafaa, newest first: new features, improvements and fixes.' },
  { facts: [['Kinds', 'New, improved and fixed'], ['Dates', 'The day each change went live']], romanUrdu: 'Nafaa me kya naya aaya, kya behtar hua aur kya theek hua, tareekh ke saath.' },
  [],
  { heading: 'Try the latest Nafaa', body: 'Every change here is live for every account.' },
);

// ─── Changelog entries (known release dates only) ───

function change(slug: string, title: string, date: string, kind: 'new' | 'improved' | 'fixed', summary: string, markdown: string, evidence: string[]): SeedEntry {
  const key = `CHANGELOG:${slug}`;
  return {
    type: 'CHANGELOG',
    slug,
    title,
    summary,
    data: { date, kind },
    blocks: withIds(key, [{ type: 'richText', markdown } as Block]),
    seoTitle: title,
    seoDescription: summary.slice(0, 155),
    focusKeyword: title.toLowerCase().split(' ').slice(0, 3).join(' '),
    origin: 'new (D2 main templates pass, 20 Oct 2026)',
    evidence,
    factCheck: { checkedOn: '2026-10-20', note: 'Release dates from the production deploy record.' },
    dropped: [],
    needsOwner: [],
  };
}

const changes: SeedEntry[] = [
  change(
    'shopify-app-install',
    'Connect Shopify from the Shopify app install',
    '2026-10-14',
    'new',
    'Shopify store owners can now connect their store to Nafaa through the Shopify app install flow, instead of pasting a webhook URL and access token by hand.',
    `## What changed

Shopify stores can now connect to Nafaa through the Shopify app install flow. Approve the install in Shopify and products, stock and orders start syncing with your Nafaa account.

## Who it is for

Anyone who sells on Shopify and runs a shop, warehouse or counter on Nafaa. See [Integrations](/integrations) for every channel Nafaa connects to.`,
    ['apps/api/src/integrations/online-orders/shopify.service.ts'],
  ),
  change(
    'new-design',
    'A new look across the Nafaa app',
    '2026-10-13',
    'improved',
    'The Nafaa app has a new design: a cleaner sidebar and top bar, easier settings and the same screens in light and dark, in English and Roman Urdu.',
    `## What changed

The whole Nafaa app moved to a new design: a cleaner sidebar and top bar, reorganised settings and consistent screens in light and dark mode. Your data, shortcuts and permissions did not change.

## Why

Busy counters need screens that are quick to read. The new design gives more room to the bill and the products, with clearer words in English and Roman Urdu.`,
    ['apps/web/src/design-system'],
  ),
];

export const hubs: SeedEntry[] = [productHub, solutionsHub, servicesHub, industriesHub, integrationsHub, roadmapPage, aiAssistant, blogHub, glossaryHub, changelogHub, ...changes];
