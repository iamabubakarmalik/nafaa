/**
 * Development fixtures: PRODUCT, SOLUTION, SERVICE and INTEGRATION entries.
 *
 * Every product claim maps to a seed FAQ or an industry feature that cites an
 * app file (see faqs.ts and industries.ts), or to a Plan feature flag in the
 * Plan seed. Not-built features are `coming` and say so (owner rule). Service
 * pages describe a process, not results. This is placeholder copy for layout
 * work; the Phase 4 writers replace it in the CMS seed.
 */
import type { FixtureSpec } from './build';
import { answer, cta, diagram, faq, features, grid, hero, ids, pricing, rich, steps } from './blocks';

const pos = ids('prd-pos');
const inv = ids('prd-inventory');
const kh = ids('prd-khata');
const ms = ids('prd-multi-shop');
const ai = ids('prd-ai');

export const productFixtures: FixtureSpec[] = [
  {
    type: 'PRODUCT',
    path: '/product/pos',
    title: 'POS',
    summary:
      'Nafaa POS is the billing counter for shops in Pakistan. Scan a barcode or tap a quick key, sell in more than one unit, take cash, card or wallet payments, and keep billing when the internet drops: offline sales are saved on the device and sent when the connection returns.',
    featured: true,
    sortOrder: 1,
    data: { type: 'PRODUCT', icon: 'receipt', shortName: 'POS', benefit: 'Billing That Works Offline', status: 'live', planFeature: 'featurePos', appRoute: '/pos' },
    blocks: [
      hero(pos, 'Scan, sell and print at the counter, on the phone, tablet or computer you already have. When the internet drops, the counter keeps going and sends the sales later.', {
        heading: 'POS billing that keeps working offline',
        eyebrow: 'Point of sale',
        media: { kind: 'diagram', diagram: { kind: 'offline-sync' } },
      }),
      answer(pos, [
        ['Runs on', 'A web browser on a phone, tablet or computer'],
        ['Without internet', 'Sales are saved on the device and sent when the connection returns'],
        ['Hardware', 'A barcode scanner and receipt printer are optional'],
        ['Price', 'Paid plans from {{price:min.monthly}} a month'],
      ]),
      steps(pos, 'How the counter works', [
        ['Find the item', 'Scan the barcode, search by name or tap a quick key for loose items.'],
        ['Pick the unit', 'Sell by piece, dozen or carton; each unit has its own price.'],
        ['Take payment', 'Cash, card or wallet, or put the bill on the customer’s khata.'],
        ['Keep going offline', 'If the internet drops, the sale is saved on the device and synced later.'],
      ]),
      features(pos, 'What the counter does', [
        { icon: 'scan-barcode', title: 'Barcode and quick keys', body: 'Scanner, name search or a quick key for loose items.' },
        { icon: 'layers', title: 'More than one unit', body: 'Piece, dozen or carton, each at its own price.' },
        { icon: 'wifi-off', title: 'Offline billing', body: 'Sales wait on the device and sync when you are back online.' },
        { icon: 'rotate-ccw', title: 'Returns', body: 'Take a return at the counter.' },
        { icon: 'badge-percent', title: 'Discounts', body: 'Discounts on the bill, within the limits you set.' },
        { icon: 'message-circle', title: 'WhatsApp receipts', body: 'Send the receipt on WhatsApp on plans that include it.' },
      ]),
      grid(pos, 'INDUSTRY', { heading: 'Counters set up for your trade', filter: { featured: true }, limit: 6 }),
      pricing(pos, { compact: true }),
      faq(pos),
    ],
    faqKeys: ['devices', 'offline', 'kiryana-units', 'pricing'],
    related: ['/product/inventory', '/product/khata', '/industries/kiryana', '/industries/restaurant'],
  },
  {
    type: 'PRODUCT',
    path: '/product/inventory',
    title: 'Inventory',
    summary:
      'Nafaa keeps your stock in every unit you sell, from Excel import to the counter. Bring products in with a dry-run check, sell by piece, dozen or carton, record damaged or expired stock, see what is running low, and move stock between shops on plans with more than one shop.',
    featured: true,
    sortOrder: 2,
    data: { type: 'PRODUCT', icon: 'boxes', shortName: 'Inventory', benefit: 'Stock You Can Trust', status: 'live', appRoute: '/inventory' },
    blocks: [
      hero(inv, 'Import your list from Excel, sell it in any unit and always know what is on the shelf, what is damaged and what to reorder.', { eyebrow: 'Stock', heading: 'Inventory in every unit you sell' }),
      answer(inv, [
        ['Import', 'Excel template with a dry run that flags duplicates and bad prices'],
        ['Units', 'Piece, dozen, carton and more, each with its own price'],
        ['Losses', 'Damaged and expired stock is recorded, not hidden'],
        ['Branches', 'Stock transfer between shops on plans with more than one shop'],
      ]),
      steps(inv, 'From spreadsheet to shelf', [
        ['Download the template', 'Pick the template made for your business.'],
        ['Check in a dry run', 'Every line is checked before anything is saved.'],
        ['Import in chunks', 'Lines that need fixing download as Excel with the reason.'],
      ]),
      features(inv, 'What stock looks like in Nafaa', [
        { icon: 'file-spreadsheet', title: 'Excel import', body: 'Template, column match, dry run and an error file.' },
        { icon: 'layers', title: 'Multiple units', body: 'One product, many units, each priced.' },
        { icon: 'triangle-alert', title: 'Damage and low stock', body: 'Record losses and see what is running low.' },
        { icon: 'calendar-clock', title: 'Batch and expiry', body: 'Batches with expiry dates for pharmacies.' },
        { icon: 'arrow-left-right', title: 'Stock transfer', body: 'Move stock between your shops.' },
        { icon: 'barcode', title: 'IMEI stock', body: 'Phones kept by IMEI for mobile shops.' },
      ]),
      faq(inv),
    ],
    faqKeys: ['kiryana-import', 'kiryana-units', 'pharmacy-expiry'],
    related: ['/product/pos', '/product/multi-shop', '/industries/pharmacy'],
  },
  {
    type: 'PRODUCT',
    path: '/product/khata',
    title: 'Digital Khata',
    summary:
      "Nafaa's digital khata replaces the paper udhaar register. Every customer's udhaar, payments and old-register balances sit in one place, and a WhatsApp reminder with their balance goes out in one tap from your own WhatsApp, with wording that gets firmer as the udhaar gets older.",
    featured: true,
    sortOrder: 3,
    data: { type: 'PRODUCT', icon: 'notebook-pen', shortName: 'Khata', benefit: 'Udhaar With WhatsApp Reminders', status: 'live', planFeature: 'featureKhata' },
    blocks: [
      hero(kh, 'Udhaar, payments and balances for every customer, with a WhatsApp reminder one tap away.', {
        heading: 'The digital khata for udhaar',
        eyebrow: 'Udhaar khata',
        media: { kind: 'diagram', diagram: { kind: 'khata-cycle' } },
      }),
      answer(
        kh,
        [
          ['Keeps', 'Udhaar, payments and balances brought over from the old register'],
          ['Reminders', 'WhatsApp, sent one by one from your own number'],
          ['Tone', 'Firmer as the udhaar gets older'],
        ],
        'Kaghaz ka register band: har gahak ka udhaar, payment aur purana balance ek jagah, aur WhatsApp par yaad-dihani ek tap me.',
      ),
      features(kh, 'Why shops move the register to Nafaa', [
        { icon: 'notebook-pen', title: 'One page per customer', body: 'Every udhaar sale and payment on the customer’s page.' },
        { icon: 'message-circle', title: 'WhatsApp reminders', body: 'The balance goes in the message; you press send.' },
        { icon: 'book-open', title: 'Old register balances', body: 'Bring opening balances over from the paper register.' },
      ]),
      faq(kh),
    ],
    faqKeys: ['khata-reminders', 'devices', 'pricing'],
    related: ['/product/pos', '/industries/kiryana', '/industries/mobile-shop'],
  },
  {
    type: 'PRODUCT',
    path: '/product/multi-shop',
    title: 'Multi-Shop',
    summary:
      'Nafaa Multi-Shop runs more than one shop or branch from one account. Each shop has its own counter and stock, and you can transfer stock between them. The number of shops depends on the plan; the pricing page shows the limit for each.',
    sortOrder: 4,
    data: { type: 'PRODUCT', icon: 'building-2', shortName: 'Multi-Shop', benefit: 'Every Branch in One Account', status: 'live', planFeature: 'featureMultiShop' },
    blocks: [
      hero(ms, 'Run every branch from one account: separate counters and stock, with transfers between shops.', {
        heading: 'One account for every branch',
        eyebrow: 'Branches',
        media: { kind: 'diagram', diagram: { kind: 'multi-branch' } },
      }),
      answer(ms, [
        ['Shops', 'The limit per plan is on the pricing page'],
        ['Stock', 'Each shop keeps its own stock'],
        ['Transfers', 'Move stock between shops'],
      ]),
      features(ms, 'One account, many counters', [
        { icon: 'building-2', title: 'Branch counters', body: 'Every branch bills on its own counter.' },
        { icon: 'arrow-left-right', title: 'Stock transfer', body: 'Send stock from one shop to another.' },
        { icon: 'wifi-off', title: 'Offline per branch', body: 'Each counter keeps billing when its internet drops.' },
      ]),
      pricing(ms, { compact: true }),
      faq(ms),
    ],
    faqKeys: ['plan-limits', 'offline'],
    related: ['/product/inventory', '/solutions/multi-branch'],
  },
  {
    type: 'PRODUCT',
    path: '/product/ai-assistant',
    title: 'AI Assistant',
    summary:
      'The Nafaa AI assistant is planned and not built yet. The idea is to let shop owners ask about their sales, stock and khata in plain language. It is listed on the roadmap as coming soon and is not part of any plan today.',
    sortOrder: 9,
    data: { type: 'PRODUCT', icon: 'sparkles', shortName: 'AI Assistant', benefit: 'Ask About Your Business', status: 'coming' },
    blocks: [
      hero(ai, 'Planned: ask about your sales, stock and khata in plain language. Not available yet.', {
        eyebrow: 'Coming soon',
        primaryCta: cta('See the roadmap', '/roadmap'),
        secondaryCta: cta('Ask us on WhatsApp', 'whatsapp', 'secondary'),
      }),
      faq(ai),
    ],
    faqKeys: ['roadmap-status', 'roadmap-request'],
  },
];

const mb = ids('sol-multi-branch');
const os = ids('sol-online');

export const solutionFixtures: FixtureSpec[] = [
  {
    type: 'SOLUTION',
    path: '/solutions/multi-branch',
    title: 'Multi-Branch Retail',
    summary:
      'For shop owners with more than one branch: run every counter from one Nafaa account, keep stock per shop, and transfer stock between branches. Each branch keeps billing offline when its internet drops.',
    featured: true,
    sortOrder: 1,
    data: { type: 'SOLUTION', icon: 'network', shortName: 'Multi-branch', outcome: 'Every Branch in One View', segment: 'Growing retailers', status: 'live' },
    blocks: [
      hero(mb, 'Separate counters, separate stock, one account, with stock transfers between branches.', {
        eyebrow: 'For growing retailers',
      }),
      answer(mb, [
        ['Who it is for', 'Retailers with two or more shops'],
        ['Stock', 'Per shop, with transfers between them'],
        ['Internet', 'Each counter keeps billing offline'],
        ['Plans', 'Shop limits are listed on the pricing page'],
      ]),
      features(mb, 'What you get', [
        { icon: 'building-2', title: 'A counter per branch', body: 'Every branch bills on its own.', href: '/product/pos' },
        { icon: 'arrow-left-right', title: 'Stock transfers', body: 'Move stock where it sells.', href: '/product/inventory' },
        { icon: 'wifi-off', title: 'Offline at every branch', body: 'A branch keeps billing when its internet drops.', href: '/product/pos' },
      ]),
      diagram(mb, 'Head office stock moving to three branches, each with its own counter.', { kind: 'multi-branch' }, 'How it scales'),
      faq(mb),
    ],
    faqKeys: ['plan-limits', 'offline'],
    related: ['/product/multi-shop', '/product/inventory', '/industries/kiryana', '/services/data-migration'],
  },
  {
    type: 'SOLUTION',
    path: '/solutions/online-and-in-store',
    title: 'Online and In-Store Selling',
    summary:
      'For shops that also sell online: connect a Shopify store to Nafaa so the shop and the store work from the same business. The Shopify connection is in beta, and other channels are on the roadmap.',
    sortOrder: 2,
    data: { type: 'SOLUTION', icon: 'globe', shortName: 'Online + store', outcome: 'One Shop, Two Counters', status: 'beta' },
    blocks: [
      hero(os, 'Your counter and your Shopify store, working from one Nafaa account. In beta.', { eyebrow: 'Beta' }),
      diagram(os, 'Nafaa in the middle of the shop counter and the online store.', { kind: 'store-sync' }, 'How it fits together'),
      faq(os),
    ],
    faqKeys: ['roadmap-status'],
    related: ['/integrations/shopify', '/product/inventory'],
  },
];

const cs = ids('svc-custom');
const dm = ids('svc-migration');

export const serviceFixtures: FixtureSpec[] = [
  {
    type: 'SERVICE',
    path: '/services/custom-software',
    title: 'Custom Software Development',
    summary:
      'We design and build custom software, web apps and integrations for businesses in Pakistan and abroad. Tell us what you need in the Quote lein form; we reply with questions, a plan and a fixed quote in PKR or USD before any work starts.',
    featured: true,
    sortOrder: 1,
    data: {
      type: 'SERVICE',
      icon: 'code-xml',
      shortName: 'Custom software',
      areaServed: 'worldwide',
      pricingModel: 'Fixed quote per project, in PKR or USD',
      status: 'live',
    },
    blocks: [
      hero(cs, 'Web apps, internal tools and integrations, built by the team that builds Nafaa. Get a quote in PKR or USD.', {
        eyebrow: 'Worldwide',
        primaryCta: cta('Quote lein', '#quote'),
        secondaryCta: cta('Chat on WhatsApp', 'whatsapp', 'secondary'),
      }),
      rich(
        cs,
        '## What we build\n\n- **Web apps and dashboards** for teams that have outgrown spreadsheets.\n- **Integrations** between your systems and Nafaa, using the same building blocks Nafaa runs on.\n- **Internal tools** for orders, stock and approvals.\n\nWe work in English or Urdu, over calls and WhatsApp.',
      ),
      diagram(cs, 'Five stages of a project: discover, design, build, launch and support.', { kind: 'service-process' }, 'How a project runs'),
      steps(cs, 'From first message to launch', [
        ['Tell us what you need', 'Fill the quote form or send a WhatsApp message.'],
        ['Questions and a plan', 'We ask what we need to know and write down the scope.'],
        ['Fixed quote', 'You get one price for the agreed scope, in PKR or USD.'],
        ['Build and launch', 'We build in stages you can see, then launch and support it.'],
      ]),
      rich(cs, '## How pricing works\n\nEvery project gets a fixed quote for an agreed scope, in PKR or USD. If the scope changes, we quote the change before doing it.'),
      faq(cs),
      {
        id: cs(),
        type: 'leadForm',
        anchor: 'quote',
        heading: 'Quote lein',
        intro: 'Tell us about the project. We reply on email or WhatsApp.',
        form: 'quote',
        formType: 'SALES',
        subjectPrefix: 'Custom software',
        successMessage: 'Shukriya! We have your request and will reply soon.',
        currencies: ['PKR', 'USD'],
        whatsapp: true,
      },
    ],
    faqKeys: [],
    related: ['/services/data-migration', '/solutions/multi-branch', '/integrations/shopify'],
  },
  {
    type: 'SERVICE',
    path: '/services/data-migration',
    title: 'Data Migration to Nafaa',
    summary:
      'We help you move products, customers and khata balances from Excel, a paper register or another system into Nafaa. Products go through the same Excel import with a dry-run check, and old udhaar comes in as opening balances, so the counter starts with your real numbers.',
    sortOrder: 2,
    data: { type: 'SERVICE', icon: 'database', shortName: 'Data migration', areaServed: 'PK', pricingModel: 'Quoted per job', status: 'live' },
    blocks: [
      hero(dm, 'Products, customers and old udhaar balances, moved into Nafaa and checked before you start selling.', {
        eyebrow: 'Setup service',
        primaryCta: cta('Quote lein', '#quote'),
      }),
      steps(dm, 'How the move works', [
        ['Send us your data', 'Excel files, an export from your old system or photos of the register.'],
        ['Dry run', 'We run the Excel import check and fix every flagged line with you.'],
        ['Import and balances', 'Products are imported and old udhaar comes in as opening balances.'],
      ]),
      faq(dm),
      { id: dm(), type: 'leadForm', anchor: 'quote', heading: 'Quote lein', form: 'quote', formType: 'SALES', subjectPrefix: 'Data migration', successMessage: 'Shukriya! We will reply soon.', currencies: ['PKR'], whatsapp: true },
    ],
    faqKeys: ['kiryana-import', 'khata-reminders'],
    related: ['/product/inventory', '/product/khata', '/services/custom-software'],
  },
];

const sh = ids('int-shopify');
const fp = ids('int-foodpanda');

export const integrationFixtures: FixtureSpec[] = [
  {
    type: 'INTEGRATION',
    path: '/integrations/shopify',
    title: 'Shopify',
    summary:
      'Connect a Shopify store to your Nafaa account. The connection is in beta: the install flow works and is being tested with early users before it is listed in the Shopify App Store.',
    featured: true,
    sortOrder: 1,
    data: { type: 'INTEGRATION', icon: 'shopping-bag', status: 'beta', category: 'Online store', vendorUrl: 'https://www.shopify.com' },
    blocks: [
      hero(sh, 'Your Shopify store and your counter on one Nafaa account. In beta.', {
        eyebrow: 'Integration · Online store',
        primaryCta: cta('Ask to join the beta', 'whatsapp'),
        secondaryCta: cta('See the roadmap', '/roadmap', 'secondary'),
      }),
      faq(sh),
    ],
    faqKeys: ['roadmap-status', 'roadmap-request'],
    related: ['/solutions/online-and-in-store', '/product/inventory'],
  },
  {
    type: 'INTEGRATION',
    path: '/integrations/foodpanda',
    title: 'Foodpanda',
    summary: 'A Foodpanda connection for restaurants is planned and not built yet. It is on the roadmap as coming soon.',
    sortOrder: 2,
    data: { type: 'INTEGRATION', icon: 'utensils-crossed', status: 'coming', category: 'Food delivery' },
    blocks: [
      hero(fp, 'Planned for restaurants. Not available yet.', {
        eyebrow: 'Coming soon',
        primaryCta: cta('See the roadmap', '/roadmap'),
        secondaryCta: cta('Ask us on WhatsApp', 'whatsapp', 'secondary'),
      }),
    ],
    related: ['/industries/restaurant'],
  },
];

