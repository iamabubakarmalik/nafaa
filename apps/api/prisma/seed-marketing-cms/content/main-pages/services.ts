/**
 * SERVICE pages (/services/<slug>). Worldwide build services end in the
 * "Quote lein" form (owner decision); Pakistan setup services end in the same
 * form with PKR first. Pages describe the process and what is delivered,
 * never results, prices or client names.
 */

import type { SeedEntry } from '../../lib/types';
import { SHOT, diagram, features, leadForm, page, prose, shot, steps } from './_build';

const QUOTE = { label: 'Quote lein', href: '#quote', trackAs: 'hero_quote' };
const WHATSAPP = { label: 'Chat on WhatsApp', href: 'whatsapp', trackAs: 'whatsapp' };
const PROCESS = diagram('Every project runs through five stages: discover, design, build, launch and support.', { kind: 'service-process' }, 'How every project runs', 'muted');
const SERVICE_FAQ = ['mp-services-price', 'services-worldwide'];
const BUILD_STACK = 'We build with the same tools that run Nafaa itself: React and Next.js on the web, React Native for Android and iOS, Electron for desktop and NestJS with PostgreSQL behind them.';

function quote(subject: string) {
  return leadForm('Quote lein', 'Tell us what you want to build. We reply with questions, a plan and a fixed price in PKR or USD, usually within one working day.', { form: 'quote', formType: 'SALES', subjectPrefix: subject });
}

const customSoftware = page({
  type: 'SERVICE',
  slug: 'custom-software',
  title: 'Custom Software Development',
  summary:
    'Nafaa\'s engineering team builds custom software for businesses in Pakistan and worldwide: ERP modules, internal tools, dashboards, customer and dealer portals, and integrations with Nafaa or any other system, delivered in visible stages for one fixed quote in PKR or USD.',
  data: { icon: 'code-xml', shortName: 'Custom software', areaServed: 'worldwide', pricingModel: 'Fixed quote per agreed scope, in PKR or USD', timeline: 'Agreed in the plan, delivered in stages' },
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
      ['Questions and a plan', 'A short call, then a written scope: screens, data, integrations and stages.'],
      ['One fixed quote', 'One price for the agreed scope, in PKR or USD. Changes are quoted before they start.'],
      ['Build in stages', 'You see working software at each stage, not just at the end.'],
      ['Launch and support', 'We go live with you, train your team and stay on for support.'],
    ]),
    prose(`## Why work with the Nafaa team

${BUILD_STACK} The same engineers handle tax integrations, offline sync, payment gateways and courier APIs every day in Nafaa, so your project starts with patterns that are already proven in production.

We work in English or Urdu, over calls, email and WhatsApp, with clients in Pakistan and abroad.`),
    quote('Custom software'),
  ],
  faqKeys: [...SERVICE_FAQ, 'mp-enterprise-api'],
  cta: { heading: 'Have an idea? Get a plan and a price.', primary: QUOTE, secondary: WHATSAPP },
  relations: [{ ref: 'SOLUTION:enterprise', kind: 'TAG' }, { ref: 'SOLUTION:manufacturing', kind: 'TAG' }, { ref: 'SERVICE:mobile-apps', kind: 'RELATED' }, { ref: 'SERVICE:websites', kind: 'RELATED' }],
  sortOrder: 1,
  featured: true,
  evidence: ['apps/web', 'apps/api', 'apps/mobile/package.json', 'apps/desktop/package.json', 'apps/api/src/integrations'],
});

const websites = page({
  type: 'SERVICE',
  slug: 'websites',
  title: 'Website Design & Development',
  summary:
    'Nafaa designs and builds fast, modern websites for businesses in Pakistan and worldwide: company sites, landing pages and content sites with light and dark themes, search-friendly structure and an editor your team can use, for a fixed quote in PKR or USD.',
  data: { icon: 'globe', shortName: 'Websites', areaServed: 'worldwide', pricingModel: 'Fixed quote per site, in PKR or USD', timeline: 'Agreed in the plan' },
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
    PROCESS,
    steps('How a website project runs', [
      ['Brief', 'Your business, audience, pages and examples you like.'],
      ['Design', 'Page designs for desktop and mobile, reviewed with you.'],
      ['Build', 'We build, connect forms and analytics, and load your content.'],
      ['Launch', 'Domain, hosting and go-live, then training for your team.'],
    ]),
    prose(`## Built like the site you are reading

This site is a good example of our work: a design system, light and dark themes, pages driven by a content editor, structured data for search and AI answers, and screenshots captured from real software. ${BUILD_STACK}`),
    quote('Website'),
  ],
  faqKeys: SERVICE_FAQ,
  cta: { heading: 'Get a website plan and a fixed price', primary: QUOTE, secondary: WHATSAPP },
  relations: [{ ref: 'SERVICE:online-store-setup', kind: 'RELATED' }, { ref: 'SERVICE:custom-software', kind: 'RELATED' }],
  sortOrder: 2,
  evidence: ['apps/site'],
});

const storeSetup = page({
  type: 'SERVICE',
  slug: 'online-store-setup',
  title: 'E-commerce Store Development',
  summary:
    'Nafaa builds online stores for businesses in Pakistan and worldwide: a store on Nafaa or Shopify or WooCommerce, products and stock connected to your Nafaa account, local payment and courier options, and a launch your team can run, for a fixed quote in PKR or USD.',
  data: { icon: 'shopping-cart', shortName: 'E-commerce stores', areaServed: 'worldwide', pricingModel: 'Fixed quote per store, in PKR or USD', timeline: 'Agreed in the plan' },
  seoTitle: 'E-commerce Store Development, Connected to Your Stock',
  seoDescription:
    'Online stores on Nafaa, Shopify or WooCommerce, connected to your stock, payments and couriers, built by the Nafaa team. Fixed quote in PKR or USD.',
  focusKeyword: 'ecommerce store development',
  hero: {
    eyebrow: 'E-commerce stores',
    heading: 'An online store that already knows your stock',
    sub: 'We design and launch your store on Nafaa, Shopify or WooCommerce and connect it to your Nafaa account, so online orders land next to counter sales and every sale updates the same stock.',
    media: { id: SHOT.salesChannels, url: 'app.nafaa.pk/channels' },
    primary: QUOTE,
    secondary: WHATSAPP,
    badges: ['Nafaa, Shopify or WooCommerce', 'Connected stock', 'Local payments and couriers'],
  },
  body: [
    features('What we set up', [
      ['shopping-bag', 'The store', 'Design, product pages, checkout and policies on the platform that suits you.'],
      ['refresh-cw', 'Stock sync', 'Products and stock connected to Nafaa, so nothing is oversold.'],
      ['wallet', 'Payments', 'COD, cards and JazzCash or Easypaisa links where available.'],
      ['truck', 'Couriers', 'TCS, Leopards, M&P, PostEx, Trax or CallCourier booking from Nafaa.'],
      ['package-search', 'Google listings', 'Product feed for Google so shoppers can find you.'],
      ['store', 'Nafaa Bazaar', 'Optionally list the same products on the Nafaa marketplace.'],
    ]),
    shot({ heading: 'Every order lands in Nafaa', body: 'Once connected, orders from the new store arrive in the same list as every other channel.', id: SHOT.onlineOrders, url: 'app.nafaa.pk/online-orders', layout: 'split-right' }),
    PROCESS,
    steps('From catalogue to first order', [
      ['Pick the platform', 'Nafaa, Shopify or WooCommerce, based on your products and plans.'],
      ['Design and catalogue', 'Store design, product photos and descriptions loaded from Nafaa.'],
      ['Connect', 'Stock, payments and couriers wired to your Nafaa account.'],
      ['Launch', 'Test orders, go live, and a walkthrough for your team.'],
    ]),
    quote('E-commerce store'),
  ],
  faqKeys: [...SERVICE_FAQ, 'mp-online-channels'],
  cta: { heading: 'Get your store plan and a fixed price', primary: QUOTE, secondary: WHATSAPP },
  relations: [{ ref: 'SOLUTION:ecommerce', kind: 'TAG' }, { ref: 'PRODUCT:online-store', kind: 'TAG' }, { ref: 'SERVICE:websites', kind: 'RELATED' }],
  sortOrder: 3,
  evidence: ['apps/api/src/integrations/online-orders', 'apps/api/src/integrations/channels/custom-website', 'apps/api/src/integrations/online-orders/courier-api', 'apps/api/src/integrations/google/feed.ts'],
});

const mobileApps = page({
  type: 'SERVICE',
  slug: 'mobile-apps',
  title: 'Mobile App Development',
  summary:
    'Nafaa builds Android and iOS apps for businesses in Pakistan and worldwide: customer apps, apps for field staff and riders, and companion apps for your systems, built with React Native and published to the stores, for a fixed quote in PKR or USD.',
  data: { icon: 'smartphone', shortName: 'Mobile apps', areaServed: 'worldwide', pricingModel: 'Fixed quote per app, in PKR or USD', timeline: 'Agreed in the plan' },
  seoTitle: 'Mobile App Development for Android and iOS, Worldwide',
  seoDescription:
    'Android and iOS apps for customers, field staff and riders, built with React Native by the Nafaa team and published to the stores. Get a fixed quote.',
  focusKeyword: 'mobile app development',
  hero: {
    eyebrow: 'Mobile apps',
    heading: 'Android and iOS apps your customers and team will actually use',
    sub: 'Customer apps, field-staff and rider apps, and companions to your systems, built with React Native by the team that ships Nafaa on phones every day, and published to Google Play and the App Store.',
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
    PROCESS,
    steps('How an app project runs', [
      ['Scope', 'Users, screens, data and what must work offline.'],
      ['Design', 'Clickable designs for Android and iOS, reviewed with you.'],
      ['Build and test', 'Builds on real phones at every stage.'],
      ['Publish', 'Store listings, release and support after launch.'],
    ]),
    quote('Mobile app'),
  ],
  faqKeys: SERVICE_FAQ,
  cta: { heading: 'Get your app plan and a fixed price', primary: QUOTE, secondary: WHATSAPP },
  relations: [{ ref: 'SERVICE:custom-software', kind: 'RELATED' }],
  sortOrder: 4,
  evidence: ['apps/mobile/package.json', 'apps/web/src/core/lib/offline'],
});

const dataMigration = page({
  type: 'SERVICE',
  slug: 'data-migration',
  title: 'Data Migration to Nafaa',
  summary:
    'Our team moves your business into Nafaa from Excel, a paper register or another POS: products with prices, cost, barcodes and stock, customers with their khata balances, and suppliers with what you owe them, all cleaned and checked with you before go-live.',
  data: { icon: 'database', shortName: 'Data migration', areaServed: 'PK', pricingModel: 'Quote based on the size and source of your data', timeline: 'Usually days, agreed in the plan' },
  seoTitle: 'Data Migration to Nafaa POS in Pakistan',
  seoDescription:
    'Move products, stock, customers, khata balances and suppliers into Nafaa from Excel or old software, checked with you before go-live. Get a quote.',
  focusKeyword: 'pos data migration',
  hero: {
    eyebrow: 'Data migration',
    heading: 'Switch to Nafaa without typing a single product',
    sub: 'Send us your Excel files, old POS export or even photos of the register. We clean the data, import it with the same tools the app uses, and check it with you before the first bill.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    primary: QUOTE,
    secondary: WHATSAPP,
    badges: ['Excel or old POS', 'Khata balances', 'Checked before go-live'],
  },
  body: [
    features('What we move', [
      ['boxes', 'Products and stock', 'Names, units, prices, cost, barcodes and opening stock.'],
      ['notebook-pen', 'Khata balances', 'Each customer\'s udhaar brought over from the register.'],
      ['truck', 'Suppliers', 'Supplier details and what you owe them.'],
      ['tags', 'Categories and brands', 'So the counter and reports are organised from day one.'],
      ['building-2', 'Branches', 'Stock split by branch for multi-branch businesses.'],
      ['list-checks', 'A check with you', 'Totals and samples reviewed together before go-live.'],
    ]),
    steps('How a migration runs', [
      ['Send your data', 'Excel, CSV, an old POS export or photos of the register.'],
      ['We clean it', 'Duplicates, missing prices and units are fixed and flagged.'],
      ['Dry run', 'Nafaa\'s import shows every row before anything is saved.'],
      ['Check and go live', 'We compare totals with you, then you start billing.'],
    ]),
    quote('Data migration'),
  ],
  faqKeys: ['mp-migration-what', 'mp-inventory-import', 'mp-services-price'],
  cta: { heading: 'Get a migration plan and a price', primary: QUOTE, secondary: WHATSAPP },
  relations: [{ ref: 'PRODUCT:inventory', kind: 'TAG' }, { ref: 'PRODUCT:khata', kind: 'TAG' }, { ref: 'SOLUTION:enterprise', kind: 'TAG' }],
  sortOrder: 5,
  evidence: ['apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx', 'apps/web/src/modules/customers', 'apps/web/src/modules/purchasing/suppliers'],
});

const fbrSetup = page({
  type: 'SERVICE',
  slug: 'fbr-integration-setup',
  title: 'FBR & PRA Integration Setup',
  summary:
    'Our team sets up FBR, PRA, SRB or KPRA invoicing in Nafaa with you: checking your registration details and POS ID, connecting the sandbox, testing invoices and receipts, and switching to live, so fiscal invoices print from the first real bill.',
  data: { icon: 'shield-check', shortName: 'FBR setup', areaServed: 'PK', pricingModel: 'Quote per business or branch', timeline: 'Agreed in the plan' },
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
    ]),
    features('What is included', [
      ['landmark', 'Every authority', 'FBR, PRA, SRB or KPRA, for each branch.'],
      ['qr-code', 'Receipt check', 'Fiscal number and verification QR on the printed receipt.'],
      ['rotate-ccw', 'Returns', 'Returns reported against the original invoice.'],
      ['refresh-cw', 'Retry checks', 'We show your team how the queue and retries work offline.'],
      ['file-spreadsheet', 'Tax reports', 'Where to find sales tax summaries for your return.'],
      ['graduation-cap', 'Team training', 'Cashiers and managers know what to do when something fails.'],
    ]),
    quote('FBR integration setup'),
  ],
  faqKeys: ['mp-fbr-who', 'mp-fbr-offline', 'mp-services-price'],
  cta: { heading: 'Get compliant with our team', primary: QUOTE, secondary: WHATSAPP },
  relations: [{ ref: 'PRODUCT:fbr', kind: 'TAG' }, { ref: 'GLOSSARY_TERM:fbr-pos', kind: 'RELATED' }],
  sortOrder: 6,
  evidence: ['apps/api/src/integrations/fbr', 'apps/api/src/integrations/tax-authority', 'apps/web/src/integrations/fbr'],
});

const hardware = page({
  type: 'SERVICE',
  slug: 'hardware',
  title: 'POS Hardware',
  summary:
    'Nafaa helps you choose and set up counter hardware that works with the app: barcode scanners, 58 or 80 mm thermal receipt printers, label printers and cash drawers, on Windows, Android or in the browser, with setup and testing on your own devices.',
  data: { icon: 'printer', shortName: 'Hardware', areaServed: 'PK', pricingModel: 'Advice is free; setup quoted per site', timeline: 'Same week in most cases' },
  seoTitle: 'POS Hardware in Pakistan: Printers, Scanners, Cash Drawers',
  seoDescription:
    'Barcode scanners, 58/80 mm receipt printers, label printers and cash drawers that work with Nafaa, with setup and testing by our team. Ask for advice.',
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
      ['printer', 'Receipt printers', '58 mm and 80 mm thermal printers, from the browser or the Windows app.'],
      ['barcode', 'Label printers', 'Shelf and product labels printed from the desktop app.'],
      ['banknote', 'Cash drawers', 'Opened by the Windows app when a cash bill is printed.'],
      ['tablet', 'Tablets and phones', 'Android tablets and phones for counters and waiters.'],
      ['monitor', 'Computers', 'Any Windows PC or laptop running the browser or the desktop app.'],
    ]),
    steps('How we help', [
      ['Tell us your counter', 'Device, space, how many bills a day and what you print.'],
      ['Get a recommendation', 'Hardware that fits your counter and budget.'],
      ['Set up and test', 'We connect and test it with you, remotely or on site where available.'],
      ['Print the first bill', 'Receipt layout checked with your logo and details.'],
    ]),
    quote('POS hardware'),
  ],
  faqKeys: ['mp-pos-hardware', 'devices'],
  cta: { heading: 'Ask us what to buy before you buy it', primary: { label: 'Ask for advice', href: '#quote', trackAs: 'cta_quote' }, secondary: WHATSAPP },
  relations: [{ ref: 'PRODUCT:pos', kind: 'TAG' }],
  sortOrder: 7,
  evidence: ['apps/web/src/core/hardware', 'apps/web/src/core/print', 'apps/desktop/src/main/cashDrawer.ts', 'apps/desktop/src/main/labelPrinter.ts'],
  needsOwner: ['Whether Nafaa sells hardware directly, and at what prices; the page only offers advice and setup.'],
});

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
    features('Sessions by role', [
      ['scan-barcode', 'Cashiers', 'Billing, units, payments, returns and what to do when offline.'],
      ['boxes', 'Stock staff', 'Purchases, low stock, damage and transfers.'],
      ['notebook-pen', 'Khata and collection', 'Udhaar, credit limits and WhatsApp reminders.'],
      ['chart-column', 'Owners and managers', 'Daily profit, P&L, day book and staff reports.'],
      ['shield-check', 'Counter rules', 'Roles, manager PIN and the activity log.'],
      ['receipt-text', 'Tax invoices', 'If you use them: how they print and what to do when one fails.'],
    ]),
    steps('How training is planned', [
      ['Tell us your team', 'Roles, branches and how they work today.'],
      ['Get a plan', 'Sessions by role, online or on site.'],
      ['Train on your data', 'Practice on your own products and customers.'],
      ['Follow up', 'A check-in after the first week to answer questions.'],
    ]),
    quote('Training'),
  ],
  faqKeys: ['mp-services-price', 'devices'],
  cta: { heading: 'Plan training for your team', primary: QUOTE, secondary: WHATSAPP },
  relations: [{ ref: 'SERVICE:data-migration', kind: 'RELATED' }],
  sortOrder: 8,
  evidence: ['apps/web/src/modules', 'apps/web/src/modules/learn'],
  needsOwner: ['On-site training coverage (cities) and pricing.'],
});

export const services: SeedEntry[] = [customSoftware, websites, storeSetup, mobileApps, dataMigration, fbrSetup, hardware, training];
