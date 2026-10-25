/**
 * SERVICE pages (/services/<slug>). Worldwide build services end in the
 * "Quote lein" form (owner decision: quote form plus WhatsApp, budgets in PKR
 * or USD, no price list); Pakistan setup services end in the same form.
 * Pages describe the process and what is delivered, never results, prices,
 * client names or a portfolio. Timelines are not given as numbers: each page
 * explains what sets the timeline, and the written plan fixes it.
 */

import type { SeedEntry } from '../../lib/types';
import { SHOT, diagram, features, leadForm, page, prose, shot, steps, table } from './_build';

const QUOTE = { label: 'Quote lein', href: '#quote', trackAs: 'hero_quote' };
const WHATSAPP = { label: 'Chat on WhatsApp', href: 'whatsapp', trackAs: 'whatsapp' };
const PROCESS = diagram('Every project runs through five stages: discover, design, build, launch and support.', { kind: 'service-process' }, 'How every project runs', 'muted');
const SERVICE_FAQ = ['mp-services-price', 'services-worldwide'];
const BUILD_STACK = 'We build with the same tools that run Nafaa itself: React and Next.js on the web, React Native for Android and iOS, Electron for desktop and NestJS with PostgreSQL behind them.';
const WORLDWIDE = `## Working with us from outside Pakistan

Clients abroad work with us the same way as clients in Pakistan. Everything is in English, over video calls, email and WhatsApp. Quotes can be in US dollars, and calls are set at a time that suits both sides; the team works on Pakistan time (UTC+5). You see working software at the end of every stage, so distance never means waiting until the end to find out what was built.`;

function quote(subject: string, intro = 'Tell us what you want to build. We reply with questions, a plan and a fixed price in PKR or USD, usually within one working day.') {
  return leadForm('Quote lein', intro, { form: 'quote', formType: 'SALES', subjectPrefix: subject });
}

// ─── Custom software ───

const customSoftware = page({
  type: 'SERVICE',
  slug: 'custom-software',
  title: 'Custom Software Development',
  summary:
    'Nafaa\'s engineering team builds custom software for businesses in Pakistan and worldwide: ERP modules, internal tools, dashboards, customer and dealer portals, and integrations with Nafaa or any other system, delivered in visible stages for one fixed quote in PKR or USD.',
  data: { icon: 'code-xml', shortName: 'Custom software', areaServed: 'worldwide', pricingModel: 'Fixed quote per agreed scope, in PKR or USD', timeline: 'Set in the written plan, delivered in stages' },
  seoTitle: 'Custom Software Development for Businesses Worldwide',
  seoDescription:
    'ERP modules, internal tools, portals and integrations built by the team behind Nafaa. Fixed quote in PKR or USD, delivered in stages. Get a quote.',
  focusKeyword: 'custom software development',
  hero: {
    eyebrow: 'Custom software',
    heading: 'Software shaped around how your business really works',
    sub: 'When off-the-shelf tools stop fitting, our team builds the system you need: ERP modules, internal tools, portals and integrations, from the same engineers who build Nafaa. One fixed quote, in PKR or USD.',
    primary: QUOTE,
    secondary: WHATSAPP,
    badges: ['Pakistan and worldwide', 'Fixed quote in PKR or USD', 'Built in visible stages'],
  },
  body: [
    features('What we build', [
      ['layout-dashboard', 'Dashboards and portals', 'Owner dashboards, customer and dealer portals, and reporting tools.'],
      ['workflow', 'ERP modules', 'Production, approvals, field work or any process your team runs on paper or Excel today.'],
      ['plug-zap', 'Integrations', 'Connect Nafaa, accounting, payment gateways, couriers or your own systems.'],
      ['database', 'Data and automation', 'Imports, clean-ups, scheduled jobs and reports that run themselves.'],
      ['smartphone', 'Apps for your team', 'Phone apps for field staff, riders or warehouses.'],
      ['shield-check', 'Security from day one', 'Roles, audit logs and encrypted secrets, as in Nafaa itself.'],
    ]),
    PROCESS,
    steps('From first message to launch', [
      ['Tell us what you need', 'Fill in the quote form or send a WhatsApp message. A rough idea is enough.'],
      ['Questions and a plan', 'A short call, then a written scope: screens, users, data, integrations and stages.'],
      ['One fixed quote', 'One price for the agreed scope, in PKR or USD. Changes are quoted before they start.'],
      ['Build in stages', 'You try working software at the end of each stage, not only at the end.'],
      ['Launch and support', 'We go live with you, train your team and stay on for support.'],
    ]),
    table('What sets the price and the timeline', 'We do not publish a price list, because two projects with the same name can differ tenfold in size. These are the things the written plan measures.', [
      { key: 'why', label: 'Why it matters', highlight: true },
      { key: 'example', label: 'For example' },
    ], [
      ['Screens and user types', 'Each kind of user needs its own screens and permissions', 'A dealer portal adds dealer logins next to your staff'],
      ['Integrations', 'Every outside system adds connection and testing work', 'Posting sales to your accounting software'],
      ['Existing data', 'Old records must be cleaned and moved in before go-live', 'Years of orders kept in Excel'],
      ['Platforms', 'Web only, or also Android, iOS or a desktop app', 'An owner dashboard on the web and a rider app on phones'],
      ['Offline work', 'Screens that must work without internet need local storage and sync', 'Field staff taking orders where there is no signal'],
    ]),
    prose(`## Why work with the Nafaa team

${BUILD_STACK} The same engineers handle tax integrations, offline sync, payment gateways and courier APIs every day in Nafaa, so your project starts with patterns that already run in production.

Many projects start as an extension of Nafaa itself: a dealer portal on top of Nafaa stock, a report your board asks for, or a connection between Nafaa and a system you already use. The [developer API](/developers) and webhooks make that possible without touching your daily counter work. Projects with no link to Nafaa are just as welcome.

${WORLDWIDE}`),
    quote('Custom software'),
  ],
  faqKeys: [...SERVICE_FAQ, 'svc-custom-existing', 'svc-custom-first-stage', 'mp-enterprise-api'],
  cta: { heading: 'Have an idea? Get a plan and a price.', primary: QUOTE, secondary: WHATSAPP },
  relations: [
    { ref: 'SOLUTION:enterprise', kind: 'TAG' },
    { ref: 'SOLUTION:manufacturing', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'TAG' },
    { ref: 'SERVICE:mobile-apps', kind: 'RELATED' },
    { ref: 'SERVICE:websites', kind: 'RELATED' },
    { ref: 'SERVICE:data-migration', kind: 'RELATED' },
  ],
  sortOrder: 1,
  featured: true,
  evidence: ['apps/web', 'apps/api', 'apps/mobile/package.json', 'apps/desktop/package.json', 'apps/api/src/integrations', 'apps/api/src/integrations/public-api'],
  needsOwner: ['Payment methods for clients outside Pakistan, and who owns the source code after delivery: not stated on the page until confirmed.'],
});

// ─── Websites ───

const websites = page({
  type: 'SERVICE',
  slug: 'websites',
  title: 'Website Design & Development',
  summary:
    'Nafaa designs and builds fast, modern websites for businesses in Pakistan and worldwide: company sites, landing pages and content sites with light and dark themes, search-friendly structure and an editor your team can use, for a fixed quote in PKR or USD.',
  data: { icon: 'globe', shortName: 'Websites', areaServed: 'worldwide', pricingModel: 'Fixed quote per site, in PKR or USD', timeline: 'Set in the written plan' },
  seoTitle: 'Website Design and Development for Businesses Worldwide',
  seoDescription:
    'Fast, modern company websites with SEO structure, light and dark themes and an easy editor, built by the Nafaa team. Fixed quote in PKR or USD.',
  focusKeyword: 'website development company',
  hero: {
    eyebrow: 'Websites',
    heading: 'A website that loads fast and looks like you mean business',
    sub: 'Company sites, landing pages and content sites designed and built by the team behind Nafaa: fast on any phone, easy for search engines to read, and simple for your team to update.',
    primary: QUOTE,
    secondary: WHATSAPP,
    badges: ['Fast on mobile', 'Search-friendly', 'Easy to edit'],
  },
  body: [
    features('What every site gets', [
      ['zap', 'Fast everywhere', 'Built for slow mobile connections, with images served in modern formats.'],
      ['search', 'Search-friendly', 'Clean structure, metadata and schema so search engines understand the site.'],
      ['notebook-pen', 'Editable by you', 'Pages and posts your team can update without a developer.'],
      ['eye', 'Light and dark', 'Designs that look right in both themes and on every screen size.'],
      ['languages', 'English and Urdu', 'Bilingual sites with right-to-left Urdu where you need it.'],
      ['chart-line', 'Analytics', 'Visitor and lead tracking set up from day one.'],
    ]),
    steps('How a website project runs', [
      ['Brief', 'Your business, audience, pages and a few sites you like.'],
      ['Site map and content plan', 'Every page listed with its purpose, so nothing is designed twice.'],
      ['Design', 'Page designs for desktop and mobile, reviewed with you.'],
      ['Build', 'We build, connect forms and analytics, and load your content.'],
      ['Launch', 'Domain connected, site live, then a session to show your team the editor.'],
    ]),
    PROCESS,
    table('What you get at launch', 'Every website project ends with these in place. The written plan lists anything extra your site needs.', [
      { key: 'what', label: 'What it means for you', highlight: true },
      { key: 'stage', label: 'Stage' },
    ], [
      ['The live site', 'Every agreed page, on your domain, on desktop and mobile', 'Launch'],
      ['A content editor', 'Your team changes text, images and posts without a developer', 'Build'],
      ['Search basics', 'Page titles, descriptions, structured data and a sitemap in place', 'Build'],
      ['Contact forms', 'Leads reach you by email, with WhatsApp links where you want them', 'Build'],
      ['Analytics', 'Visitor and form tracking working from the first day', 'Build'],
      ['A handover session', 'A walkthrough of the editor for the people who will use it', 'Launch'],
    ]),
    prose(`## Built like the site you are reading

This site is our own work: a design system, light and dark themes, pages driven by a content editor, structured data for search and AI answers, and screenshots captured from real software. ${BUILD_STACK}

## A site that sells, not only a brochure

If you sell products, a website can do more than describe them. We can connect it to [Nafaa](/product/online-store) so orders from the site land next to your counter sales and use the same stock, or build a full [online store](/services/online-store-setup). If you only need a company site, that is what we build, without extras you will not use.

${WORLDWIDE}`),
    quote('Website'),
  ],
  faqKeys: [...SERVICE_FAQ, 'svc-web-edit', 'svc-web-domain'],
  cta: { heading: 'Get a website plan and a fixed price', primary: QUOTE, secondary: WHATSAPP },
  relations: [
    { ref: 'SERVICE:online-store-setup', kind: 'RELATED' },
    { ref: 'SERVICE:custom-software', kind: 'RELATED' },
    { ref: 'SOLUTION:ecommerce', kind: 'TAG' },
  ],
  sortOrder: 2,
  evidence: ['apps/site', 'apps/site/src/components/islands/LeadForm.tsx', 'apps/api/src/admin-marketing/cms'],
});

// ─── E-commerce store setup ───

const storeSetup = page({
  type: 'SERVICE',
  slug: 'online-store-setup',
  title: 'E-commerce Store Development',
  summary:
    'Nafaa builds online stores for businesses in Pakistan and worldwide: a custom store connected to Nafaa, or a Shopify or WooCommerce store, with products and stock linked to your Nafaa account, local payment and courier options, and a launch your team can run, for a fixed quote in PKR or USD.',
  data: { icon: 'shopping-cart', shortName: 'E-commerce stores', areaServed: 'worldwide', pricingModel: 'Fixed quote per store, in PKR or USD', timeline: 'Set in the written plan' },
  seoTitle: 'E-commerce Store Development, Connected to Your Stock',
  seoDescription:
    'Online stores built custom, on Shopify or on WooCommerce, connected to your stock, payments and couriers by the Nafaa team. Fixed quote in PKR or USD.',
  focusKeyword: 'ecommerce store development',
  hero: {
    eyebrow: 'E-commerce stores',
    heading: 'An online store that already knows your stock',
    sub: 'We design and launch your store, custom-built or on Shopify or WooCommerce, and connect it to your Nafaa account, so online orders land next to counter sales and every sale updates the same stock.',
    media: { id: SHOT.salesChannels, url: 'app.nafaa.pk/settings/channels' },
    primary: QUOTE,
    secondary: WHATSAPP,
    badges: ['Custom, Shopify or WooCommerce', 'Connected stock', 'Local payments and couriers'],
  },
  body: [
    table('Which kind of store fits you', 'All three connect to Nafaa, so orders and stock work the same way. The choice depends on how much control you want and who will run the store.', [
      { key: 'fit', label: 'Good fit when', highlight: true },
      { key: 'link', label: 'How it connects to Nafaa' },
    ], [
      ['Custom store', 'You want your own design and checkout, built around your products', 'Nafaa\'s website connection with an API key'],
      ['Shopify', 'You want hosted software with a large app store', 'Shopify app install from inside Nafaa'],
      ['WooCommerce', 'You already run WordPress or want full control of hosting', 'Approve the connection in WordPress'],
    ]),
    features('What we set up', [
      ['shopping-bag', 'The store', 'Design, product pages, checkout and policies on the platform that suits you.'],
      ['refresh-cw', 'Stock sync', 'Products and stock connected to Nafaa, so nothing is oversold.'],
      ['wallet', 'Payments', 'COD, and JazzCash or Easypaisa payment links from Nafaa where you want them.'],
      ['truck', 'Couriers', 'TCS, Leopards, M&P, PostEx, Trax or Call Courier booking from Nafaa.'],
      ['package-search', 'Google listings', 'Product feed for Google so shoppers can find you.'],
      ['store', 'Nafaa Bazaar', 'Optionally list the same products on the Nafaa marketplace.'],
    ]),
    shot({ heading: 'Every order lands in Nafaa', body: 'Once connected, orders from the new store arrive in the same list as every other channel, ready to accept, pack and book with a courier.', id: SHOT.onlineOrders, url: 'app.nafaa.pk/online-orders', layout: 'split-right' }),
    steps('From catalogue to first order', [
      ['Pick the platform', 'Custom, Shopify or WooCommerce, based on your products and plans.'],
      ['Design and catalogue', 'Store design, product photos and descriptions, with products taken from Nafaa.'],
      ['Connect', 'Stock, payments and couriers wired to your Nafaa account.'],
      ['Test orders', 'Orders placed end to end: accepted in Nafaa, booked with a courier, stock updated.'],
      ['Launch', 'Go live, then a walkthrough for the team who will handle orders.'],
    ]),
    PROCESS,
    prose(`## Why connect the store to Nafaa

Most online stores in Pakistan are run by a shop that also sells over the counter. When the store keeps its own stock count, someone has to update it by hand, and sooner or later a sold-out item is sold online. Connecting the store to Nafaa removes that job: the counter, the store and any marketplace read the same stock, and online orders arrive in one list with the buyer's history and a risk check for COD.

If you do not use Nafaa yet, start the [free trial](/product/online-store) alongside the build, so you can see the whole flow before choosing a plan. See the [e-commerce solution](/solutions/ecommerce) for how orders, couriers and COD money are handled day to day.

${WORLDWIDE}`),
    quote('E-commerce store'),
  ],
  faqKeys: [...SERVICE_FAQ, 'svc-store-existing', 'svc-store-outside-pk', 'mp-online-channels'],
  cta: { heading: 'Get your store plan and a fixed price', primary: QUOTE, secondary: WHATSAPP },
  relations: [
    { ref: 'SOLUTION:ecommerce', kind: 'TAG' },
    { ref: 'PRODUCT:online-store', kind: 'TAG' },
    { ref: 'PRODUCT:payments', kind: 'TAG' },
    { ref: 'SERVICE:websites', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cod', kind: 'RELATED' },
  ],
  sortOrder: 3,
  evidence: [
    'apps/web/src/integrations/online-orders/components/website/CustomConnect.tsx',
    'apps/web/src/integrations/online-orders/pages/ShopifyAppPage.tsx',
    'apps/web/src/integrations/online-orders/hooks/useWooConnect.ts',
    'apps/web/src/integrations/online-orders/components/PaymentLinkSection.tsx',
    'apps/api/src/integrations/online-orders/courier-api',
    'apps/api/src/integrations/google/feed.ts',
  ],
});

// ─── Mobile apps ───

const mobileApps = page({
  type: 'SERVICE',
  slug: 'mobile-apps',
  title: 'Mobile App Development',
  summary:
    'Nafaa builds Android and iOS apps for businesses in Pakistan and worldwide: customer apps, apps for field staff and riders, and companion apps for your systems, built with React Native and published to the stores, for a fixed quote in PKR or USD.',
  data: { icon: 'smartphone', shortName: 'Mobile apps', areaServed: 'worldwide', pricingModel: 'Fixed quote per app, in PKR or USD', timeline: 'Set in the written plan' },
  seoTitle: 'Mobile App Development for Android and iOS, Worldwide',
  seoDescription:
    'Android and iOS apps for customers, field staff and riders, built with React Native by the Nafaa team and published to the stores. Get a fixed quote.',
  focusKeyword: 'mobile app development',
  hero: {
    eyebrow: 'Mobile apps',
    heading: 'Android and iOS apps your customers and team will actually use',
    sub: 'Customer apps, field-staff and rider apps, and companions to your systems, built with React Native by the team that builds Nafaa, and published to Google Play and the App Store.',
    media: { id: SHOT.dashboardPhone, frame: 'phone' },
    layout: 'split',
    primary: QUOTE,
    secondary: WHATSAPP,
    badges: ['Android and iOS', 'Offline-ready', 'Store publishing'],
  },
  body: [
    features('Apps we build', [
      ['shopping-bag', 'Customer apps', 'Ordering, bookings, loyalty and accounts for your customers.'],
      ['navigation', 'Field and rider apps', 'Order taking, deliveries and visits with location and photos.'],
      ['layout-dashboard', 'Owner apps', 'Dashboards and approvals for managers on the move.'],
      ['wifi-off', 'Offline-ready', 'Apps that keep working on weak signal and sync later.'],
      ['bell-ring', 'Notifications', 'Push messages for orders, reminders and alerts.'],
      ['upload', 'Store publishing', 'We publish to Google Play and the App Store with you.'],
    ]),
    table('Decisions we make with you before building', 'An app is cheaper to change on paper than in code. The scoping stage settles these questions first.', [
      { key: 'why', label: 'What it changes', highlight: true },
      { key: 'ask', label: 'We ask' },
    ], [
      ['Who uses it', 'Each kind of user needs its own sign-in and screens', 'Customers, staff or both?'],
      ['What works offline', 'Offline screens store data on the phone and sync later', 'Where do your users lose signal?'],
      ['Which systems it talks to', 'Every connection adds build and testing work', 'Nafaa, your own backend, payments or maps?'],
      ['Android, iOS or both', 'One React Native codebase serves both; store rules differ', 'Which phones do your users carry?'],
      ['Who publishes', 'The app goes out under your own store accounts', 'Do you have developer accounts yet?'],
    ]),
    steps('How an app project runs', [
      ['Scope', 'Users, screens, data and what must work offline, written down and agreed.'],
      ['Design', 'Clickable designs for Android and iOS, reviewed with you.'],
      ['Build and test', 'Builds on real phones at every stage, including cheaper Android models.'],
      ['Publish', 'Store listings, review and release, then support after launch.'],
    ]),
    PROCESS,
    prose(`## Built by a team that ships on phones every day

Nafaa itself runs on the phones Pakistani shops already have, from new iPhones to budget Android sets on weak mobile data. That shapes how we build apps: screens that stay fast on modest hardware, data that survives a dropped connection, and text that reads well in English or Urdu. ${BUILD_STACK}

If your app needs business data such as products, stock, customers or orders, it can read it from Nafaa through the [developer API](/developers), so the app and your counter always agree.

${WORLDWIDE}`),
    quote('Mobile app'),
  ],
  faqKeys: [...SERVICE_FAQ, 'svc-app-offline', 'svc-app-both-stores'],
  cta: { heading: 'Get your app plan and a fixed price', primary: QUOTE, secondary: WHATSAPP },
  relations: [
    { ref: 'SERVICE:custom-software', kind: 'RELATED' },
    { ref: 'SERVICE:websites', kind: 'RELATED' },
    { ref: 'SOLUTION:enterprise', kind: 'TAG' },
  ],
  sortOrder: 4,
  evidence: ['apps/mobile/package.json', 'apps/web/src/core/lib/offline', 'apps/api/src/integrations/public-api'],
});

// ─── Data migration ───

const dataMigration = page({
  type: 'SERVICE',
  slug: 'data-migration',
  title: 'Data Migration to Nafaa',
  summary:
    'Our team moves your business into Nafaa from Excel, a paper register or another POS: products with prices, cost, barcodes and stock, customers with their old udhaar as opening khata balances, and suppliers with what you owe them, all cleaned and checked with you before go-live.',
  data: { icon: 'database', shortName: 'Data migration', areaServed: 'PK', pricingModel: 'Quote based on the size and source of your data', timeline: 'Set in the plan, based on how much data there is' },
  seoTitle: 'Data Migration to Nafaa POS in Pakistan',
  seoDescription:
    'Move products, stock, customers, khata balances and suppliers into Nafaa from Excel or old software, checked with you before go-live. Get a quote.',
  focusKeyword: 'pos data migration',
  hero: {
    eyebrow: 'Data migration',
    heading: 'Switch to Nafaa without typing a single product',
    sub: 'Send us your Excel files, old POS export or even photos of the register. We clean the data, bring it into Nafaa and check it with you before the first bill.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    primary: QUOTE,
    secondary: WHATSAPP,
    badges: ['Excel or old POS', 'Khata balances', 'Checked before go-live'],
  },
  body: [
    steps('How a migration runs', [
      ['Send your data', 'Excel, CSV, an old POS export or photos of the register, on WhatsApp or email.'],
      ['We clean it', 'Duplicates, missing prices, mixed units and spelling are fixed or flagged for you.'],
      ['Dry run', 'Nafaa\'s product import shows every row it would add or change before anything is saved.'],
      ['Balances in', 'Each customer\'s old udhaar and each supplier\'s old balance are entered as opening balances.'],
      ['Check and go live', 'We compare totals with you, then you start billing.'],
    ]),
    table('What we move, and how it goes in', 'Each kind of record goes in through the same screens and tools the app uses, so what you see afterwards is what Nafaa really holds.', [
      { key: 'from', label: 'From' },
      { key: 'how', label: 'How it goes in', highlight: true },
    ], [
      ['Products, prices and cost', 'Excel, CSV or old POS export', 'Product import with a dry run'],
      ['Barcodes and units', 'Same file, or scanned from the shelf', 'Product import; carton and piece units set per product'],
      ['Opening stock', 'Last stock count or old system', 'Product import, or a stock count after go-live'],
      ['Customers and udhaar', 'Register, Excel or old system', 'Customer records with an opening khata balance'],
      ['Suppliers and payables', 'Register or Excel', 'Supplier records with the balance owed from before'],
    ]),
    features('What we look after', [
      ['tags', 'Categories and brands', 'So the counter and reports are organised from day one.'],
      ['layers', 'Units and packs', 'Carton, dozen and piece set up with their own prices.'],
      ['building-2', 'Branches', 'Stock split by branch for multi-branch businesses.'],
      ['list-checks', 'A check with you', 'Totals and samples reviewed together before go-live.'],
    ]),
    shot({ heading: 'Old udhaar, carried over', body: 'Every customer\'s balance from the old register goes in as their opening khata, so reminders and ageing work from the first day.', id: SHOT.khata, url: 'app.nafaa.pk/khata', layout: 'split-left' }),
    prose(`## Getting your data ready

You do not need to tidy anything before you send it. It helps, though, if you can share:

- **The most recent product list** from your old software or Excel, with sale price and cost if you have them.
- **A recent stock count**, even a rough one. Stock can be corrected with a count after go-live.
- **The udhaar register** or its photos, with each customer's name, phone and balance.
- **What you owe each supplier**, from your purchase register or the supplier's own statement.

Keep using your old system while we work. Go-live is a day you choose, usually the start of a business day, so the first bill in Nafaa follows straight on from the last one in the old system. If you would rather do it yourself, the [inventory](/product/inventory) import and the [khata](/product/khata) opening balance are open to every account; this service is for when you want it done for you.`),
    quote('Data migration', 'Tell us where your data is today and roughly how many products, customers and branches you have. We reply with a plan and a price.'),
  ],
  faqKeys: ['mp-migration-what', 'mp-inventory-import', 'svc-migration-old-pos', 'svc-migration-keep-selling', 'mp-services-price'],
  cta: { heading: 'Get a migration plan and a price', primary: QUOTE, secondary: WHATSAPP },
  relations: [
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'SOLUTION:enterprise', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'SERVICE:training', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-excel', kind: 'RELATED' },
  ],
  sortOrder: 5,
  evidence: [
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/customers/directory/CustomerProfilePage.tsx',
    'apps/web/src/modules/purchasing/suppliers/pages/SupplierFormPage.tsx',
    'apps/web/src/modules/inventory/stock-adjustments/pages/StockAdjustmentsPage.tsx',
  ],
});

// ─── FBR / PRA setup ───

const fbrSetup = page({
  type: 'SERVICE',
  slug: 'fbr-integration-setup',
  title: 'FBR & PRA Integration Setup',
  summary:
    'Our team sets up FBR, PRA, SRB or KPRA invoicing in Nafaa with you: checking your registration details and POS ID, connecting the sandbox, testing invoices and receipts, and switching to live, so fiscal invoices print from the first real bill.',
  data: { icon: 'shield-check', shortName: 'FBR setup', areaServed: 'PK', pricingModel: 'Quote per business or branch', timeline: 'Set in the plan; depends on your registration details being ready' },
  seoTitle: 'FBR & PRA POS Integration Setup Service in Pakistan',
  seoDescription:
    'We set up FBR, PRA, SRB or KPRA invoicing in Nafaa: POS ID, sandbox tests, receipts with fiscal number and QR, then live. FBR & PRA approved integrator.',
  focusKeyword: 'fbr pos integration setup',
  hero: {
    eyebrow: 'FBR integration setup',
    heading: 'Fiscal invoices working from your first real bill',
    sub: 'Nafaa is an FBR & PRA approved POS integrator. Our team connects your POS ID, tests invoices in the sandbox, checks the receipt, then switches you to live, branch by branch.',
    media: { id: SHOT.taxSetup, url: 'app.nafaa.pk/settings/tax' },
    primary: QUOTE,
    secondary: WHATSAPP,
    badges: ['FBR & PRA approved POS integrator', 'SRB and KPRA too'],
  },
  body: [
    steps('How we set it up', [
      ['Check your details', 'NTN, POS ID and which authority applies to each branch.'],
      ['Connect the sandbox', 'Credentials entered and tested against the authority\'s sandbox.'],
      ['Test bills', 'Sales and returns reported, receipts checked for the fiscal number and QR.'],
      ['Go live', 'Switch to live and watch the first real invoices go through.'],
      ['Hand over', 'Your team learns what the receipt badge means and what to do if a bill is still queued.'],
    ]),
    table('Which authority, for what', 'The tax authority depends on what you sell and where. Check your own obligations with your tax adviser; we set up whichever applies to each branch.', [
      { key: 'covers', label: 'Covers', highlight: true },
      { key: 'where', label: 'Where' },
    ], [
      ['FBR', 'Federal sales tax on goods, including integrated Tier-1 retailers', 'All of Pakistan'],
      ['PRA', 'Provincial sales tax on services, such as restaurants', 'Punjab'],
      ['SRB', 'Provincial sales tax on services', 'Sindh'],
      ['KPRA', 'Provincial sales tax on services', 'Khyber Pakhtunkhwa'],
    ]),
    features('What is included', [
      ['landmark', 'Every authority', 'FBR, PRA, SRB or KPRA, for each branch.'],
      ['qr-code', 'Receipt check', 'Fiscal number and verification QR on the printed receipt.'],
      ['rotate-ccw', 'Returns', 'Returns reported against the original invoice.'],
      ['refresh-cw', 'Retry checks', 'We show your team how the queue and retries work offline.'],
      ['file-spreadsheet', 'Tax reports', 'Where to find sales tax summaries for your return.'],
      ['graduation-cap', 'Team training', 'Cashiers and managers know what to do when something fails.'],
    ]),
    prose(`## Before we start

Have these ready and the setup goes quickly:

- **Your NTN** and, for provincial authorities, your registration with PRA, SRB or KPRA.
- **Your POS registration** with the authority, which gives the POS ID for each counter or branch.
- **A list of branches** with their addresses, so each one is linked to the right authority.

If you are not sure whether your business must integrate at all, read the official guidance first: [FBR](https://www.fbr.gov.pk), [Punjab Revenue Authority](https://pra.punjab.gov.pk), [Sindh Revenue Board](https://srb.gos.pk) and [Khyber Pakhtunkhwa Revenue Authority](https://kpra.kp.gov.pk). Our [FBR integration](/product/fbr) page explains how invoices are reported, and what happens when the internet drops: bills are queued and sent when the connection returns.`),
    quote('FBR integration setup', 'Tell us your business type, city and number of branches, and which authority you report to if you know it. We reply with a plan and a price.'),
  ],
  faqKeys: ['mp-fbr-who', 'mp-fbr-offline', 'svc-fbr-ready', 'svc-fbr-branches', 'mp-services-price'],
  cta: { heading: 'Get compliant with our team', primary: QUOTE, secondary: WHATSAPP },
  relations: [
    { ref: 'PRODUCT:fbr', kind: 'TAG' },
    { ref: 'SOLUTION:restaurants', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:fbr-pos', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:ntn', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:tier-1-retailer', kind: 'RELATED' },
    { ref: 'BLOG_POST:fbr-e-invoicing-complete-guide-2026', kind: 'RELATED' },
  ],
  sortOrder: 6,
  evidence: ['apps/api/src/integrations/fbr', 'apps/api/src/integrations/tax-authority/adapters.ts', 'apps/web/src/integrations/fbr', 'apps/web/src/integrations/tax-authority/TaxAuthorityReceiptBadge.tsx'],
  needsOwner: ['Authority table is general public knowledge (FBR goods, provincial authorities services); confirm wording with the compliance pages before publishing.'],
});

// ─── Hardware ───

const hardware = page({
  type: 'SERVICE',
  slug: 'hardware',
  title: 'POS Hardware',
  summary:
    'Nafaa helps you choose and set up counter hardware that works with the app: barcode scanners, 58 or 80 mm thermal receipt printers, label printers, cash drawers, weighing scales and a customer display, on Windows, Android or in the browser, with setup and testing on your own devices.',
  data: { icon: 'printer', shortName: 'Hardware', areaServed: 'PK', pricingModel: 'Advice is free; setup quoted per site', timeline: 'Scheduled with you' },
  seoTitle: 'POS Hardware in Pakistan: Printers, Scanners, Cash Drawers',
  seoDescription:
    'Barcode scanners, 58/80 mm receipt printers, label printers, cash drawers and scales that work with Nafaa, with setup and testing by our team.',
  focusKeyword: 'pos hardware pakistan',
  hero: {
    eyebrow: 'POS hardware',
    heading: 'The right printer and scanner, set up the first time',
    sub: 'You do not need special hardware to start Nafaa. When you are ready, we help you pick a scanner, receipt printer, label printer and cash drawer that work with your device, and set them up with you.',
    media: { id: SHOT.receipt, frame: 'receipt' },
    layout: 'split',
    primary: { label: 'Ask for advice', href: '#quote', trackAs: 'hero_quote' },
    secondary: WHATSAPP,
    badges: ['Works with phone, tablet or PC', 'Setup and testing'],
  },
  body: [
    features('What works with Nafaa', [
      ['scan-barcode', 'Barcode scanners', 'USB or Bluetooth scanners that type like a keyboard; no drivers needed.'],
      ['printer', 'Receipt printers', '58 mm and 80 mm thermal printers over USB, serial or Bluetooth, or through the Windows app.'],
      ['barcode', 'Label printers', 'Shelf and product labels on a thermal roll or A4 sticker sheets.'],
      ['banknote', 'Cash drawers', 'Opened by the receipt printer or the Windows app when a cash bill prints.'],
      ['gauge', 'Weighing scales', 'A connected scale reads the weight straight into the bill.'],
      ['monitor', 'Customer display', 'A second screen that shows the customer the live bill and the change.'],
    ]),
    table('58 mm or 80 mm receipts?', 'Both work with Nafaa. The choice depends on your counter and what the receipt has to carry.', [
      { key: 'mm58', label: '58 mm' },
      { key: 'mm80', label: '80 mm', highlight: true },
    ], [
      ['Good for', 'Small counters, mobile billing, short bills', 'Busy counters, long bills, restaurants'],
      ['Connection', 'Often Bluetooth, from a phone or tablet', 'USB or network, from a computer'],
      ['Receipt', 'Narrow; fewer words per line', 'Room for logo, item details and QR codes'],
      ['Cash drawer', 'Usually not', 'Most models can open one'],
    ]),
    steps('How we help', [
      ['Tell us your counter', 'Device, space, how many bills a day and what you print.'],
      ['Get a recommendation', 'Hardware that fits your counter, budget and device.'],
      ['Set up and test', 'Each device is connected and tested from Nafaa\'s hardware settings, with you.'],
      ['Print the first bill', 'Receipt layout checked with your logo and details.'],
    ]),
    prose(`## Buy only what your counter needs

Start with nothing: Nafaa bills from the screen and sends receipts on WhatsApp. Then add hardware in the order that saves the most time. For most shops that is a barcode scanner first, a receipt printer second and a cash drawer third. Label printers matter when you sell loose or unbranded items, and scales matter for meat, sabzi, sweets and anything sold by weight.

Each counter keeps its own devices, so a second counter can use different hardware. Every device has setup steps and a test button in Settings, and nothing changes until you pick it. The [POS](/product/pos) page shows the counter these devices plug into, and the [offline POS](/product/offline-pos) page explains how printing keeps working without internet.`),
    PROCESS,
    quote('POS hardware', 'Tell us your device, how busy the counter is and what you want to print. We reply with a recommendation and, if you want setup, a price.'),
  ],
  faqKeys: ['mp-pos-hardware', 'devices', 'svc-hw-phone-print', 'svc-hw-scale'],
  cta: { heading: 'Ask us what to buy before you buy it', primary: { label: 'Ask for advice', href: '#quote', trackAs: 'cta_quote' }, secondary: WHATSAPP },
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:restaurants', kind: 'TAG' },
    { ref: 'INDUSTRY:meat', kind: 'TAG' },
  ],
  sortOrder: 7,
  evidence: [
    'apps/web/src/core/hardware/HardwarePage.tsx',
    'apps/web/src/core/hardware/devices.ts',
    'apps/web/src/core/hardware/settings.ts',
    'apps/web/src/core/hardware/ScaleChip.tsx',
    'apps/web/src/core/hardware/CustomerDisplayPage.tsx',
    'apps/web/src/modules/inventory/barcodes/pages/BarcodeLabelsPage.tsx',
    'apps/desktop/src/main/cashDrawer.ts',
    'apps/desktop/src/main/labelPrinter.ts',
  ],
  needsOwner: ['Whether Nafaa sells hardware directly, and at what prices; the page only offers advice and setup.'],
});

// ─── Training ───

const training = page({
  type: 'SERVICE',
  slug: 'training',
  title: 'Training',
  summary:
    'Nafaa trains your team to run the business on the app: cashiers on the counter, managers on stock, khata and reports, and owners on profit and control, online over video call and WhatsApp or on site by arrangement, in Urdu or English.',
  data: { icon: 'graduation-cap', shortName: 'Training', areaServed: 'PK', pricingModel: 'Quote per session or team', timeline: 'Scheduled with you' },
  seoTitle: 'Nafaa POS Training for Cashiers, Managers and Owners',
  seoDescription:
    'Training for cashiers, managers and owners on Nafaa POS, stock, khata and reports, online or on site by arrangement, in Urdu or English. Get a quote.',
  focusKeyword: 'pos training',
  hero: {
    eyebrow: 'Training',
    heading: 'A confident team from the first day',
    sub: 'Short, practical sessions in Urdu or English: cashiers learn the counter, managers learn stock and khata, and owners learn the reports that matter. Online, or on site by arrangement.',
    media: { id: SHOT.dashboard, url: 'app.nafaa.pk/dashboard' },
    primary: QUOTE,
    secondary: WHATSAPP,
    badges: ['Urdu or English', 'Online or on site'],
  },
  body: [
    table('Sessions by role, and what each person can do afterwards', 'Each person learns the screens of their own job, practised on your own products and customers.', [
      { key: 'learn', label: 'Covers' },
      { key: 'after', label: 'Afterwards they can', highlight: true },
    ], [
      ['Cashiers', 'Billing, units, payments, returns, offline billing', 'Bill fast, take any payment, handle a return without help'],
      ['Stock staff', 'Purchases, low stock, damage, transfers, counts', 'Receive a delivery, record damage and correct stock'],
      ['Khata and collection', 'Udhaar, credit limits, reminders', 'Collect payments and send reminders the right way'],
      ['Managers', 'Cash register, day book, staff and counter rules', 'Close the day, approve with a PIN and read the audit screen'],
      ['Owners', 'Profit by product, P&L, branches, exports', 'Read the numbers that matter and find any bill or change'],
    ]),
    features('Topics we can add', [
      ['shield-check', 'Counter rules', 'Permissions, manager PIN, discount limits and the activity log.'],
      ['receipt-text', 'Tax invoices', 'If you use them: how they print and what to do when one is queued.'],
      ['shopping-bag', 'Online orders', 'Accepting orders, booking couriers and settling COD.'],
      ['users', 'Staff tools', 'Attendance, payroll and commission, where you use them.'],
    ]),
    steps('How training is planned', [
      ['Tell us your team', 'Roles, branches and how they work today.'],
      ['Get a plan', 'Sessions by role, online or on site.'],
      ['Train on your data', 'Practice on your own products and customers, not a demo shop.'],
      ['Follow up', 'A check-in after the first week to answer the questions real work raises.'],
    ]),
    shot({ heading: 'Every person with their own login', body: 'Training ends with each person signed in with their own login and permissions, so the activity log knows who did what from the first bill.', id: SHOT.staff, url: 'app.nafaa.pk/staff', layout: 'split-right' }),
    prose(`## Help that stays after the session

Training is one part of learning the app. Every Nafaa screen has a built-in guide (press G) that explains the screen in plain words, and the help center covers common tasks step by step. Questions after training go to the same WhatsApp support every account has.

Training works best right after setup. If your products and customers are still in an old system, combine it with [data migration](/services/data-migration), so people practise on their real data. Owners of several branches often train one branch first and let its team help the next. See the [staff and permissions](/product/staff) page for how access is set per person.`),
    PROCESS,
    quote('Training', 'Tell us how many people need training, their roles and branches, and whether you prefer online or on site. We reply with a plan and a price.'),
  ],
  faqKeys: ['mp-services-price', 'devices', 'svc-train-online', 'svc-train-new-staff'],
  cta: { heading: 'Plan training for your team', primary: QUOTE, secondary: WHATSAPP },
  relations: [
    { ref: 'SERVICE:data-migration', kind: 'RELATED' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'SOLUTION:restaurants', kind: 'TAG' },
  ],
  sortOrder: 8,
  evidence: ['apps/web/src/modules', 'apps/web/src/core/components/PageGuide.tsx', 'apps/web/src/modules/help', 'apps/web/src/modules/hr', 'apps/web/src/modules/reports/audit/pages/AuditPage.tsx'],
  needsOwner: ['On-site training coverage (cities) and pricing.'],
});

export const services: SeedEntry[] = [customSoftware, websites, storeSetup, mobileApps, dataMigration, fbrSetup, hardware, training];
