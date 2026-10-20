/**
 * Development fixtures: PAGE entries (home, pricing, hubs, roadmap, company
 * and legal pages). Copy is layout copy built only from facts that already
 * exist elsewhere in the fixtures or settings; the Phase 4 writer (W1)
 * writes the real pages in the CMS seed. The legal page is a labelled
 * placeholder, never policy text.
 */
import type { CmsEntryType, PageTemplate } from '@/lib/cms/contract/cms-contract';
import type { FixtureSpec } from './build';
import { answer, cta, ctaBand, diagram, faq, features, grid, hero, ids, pricing, rich } from './blocks';

function page(path: string, title: string, template: PageTemplate, summary: string, blocks: FixtureSpec['blocks'], extra: Partial<FixtureSpec> = {}, hubOf?: CmsEntryType): FixtureSpec {
  return { type: 'PAGE', path, title, summary, data: { type: 'PAGE', template, ...(hubOf ? { hubOf } : {}) }, blocks, ...extra };
}

const h = ids('page-home');
const home = page(
  '/',
  'Nafaa',
  'home',
  'Nafaa is POS, stock and khata software for shops and businesses in Pakistan. Bill at the counter, keep stock in every unit and every customer’s udhaar in a digital khata, on the phone, tablet or computer you already have, and keep selling when the internet drops.',
  [
    hero(h, 'Bill at the counter, keep stock in every unit and every customer’s udhaar in a digital khata, on the phone or computer you already have. Nafaa keeps selling when the internet drops.', {
      heading: 'The counter, stock and khata for every shop in Pakistan',
      eyebrow: 'POS & business software',
      layout: 'split',
      badges: ['{{fact:compliance.fbrPra}}', 'Works offline', 'English & Roman Urdu'],
    }),
    answer(
      h,
      [
        ['What it is', 'POS billing, stock and digital khata in one app'],
        ['Who it is for', 'Kiryana, pharmacy, bakery, restaurant, mobile, garments and more'],
        ['Runs on', 'A web browser on a phone, tablet or computer'],
        ['Without internet', 'Sales are saved on the device and synced later'],
        ['Price', 'Paid plans from {{price:min.monthly}} a month, 7-day free trial first'],
        ['Tax', '{{fact:compliance.fbrPra}}'],
      ],
      'Nafaa dukaan ka POS, stock aur khata ek app me hai. Phone, tablet ya computer par chalta hai, aur internet na ho to bhi bill bante rehte hain.',
      'Nafaa in short',
    ),
    features(
      h,
      'What Nafaa does',
      [
        { icon: 'receipt', title: 'Billing counter', body: 'Barcode, quick keys and units, with offline billing built in.', href: '/product/pos' },
        { icon: 'boxes', title: 'Stock in every unit', body: 'Excel import with a dry run, damage, low stock and transfers.', href: '/product/inventory' },
        { icon: 'notebook-pen', title: 'Digital khata', body: 'Every customer’s udhaar, with WhatsApp reminders in one tap.', href: '/product/khata' },
        { icon: 'building-2', title: 'More than one shop', body: 'Separate counters and stock, with transfers between shops.', href: '/product/multi-shop' },
        { icon: 'layout-grid', title: 'Made for your trade', body: 'IMEI for phones, batches for medicine, KOT for kitchens.', href: '/industries' },
        { icon: 'sparkles', title: 'AI assistant', body: 'Ask about your business in plain language.', href: '/product/ai-assistant', status: 'coming' },
      ],
      { intro: 'One account for the counter, the stock room and the udhaar register.', columns: 3 },
    ),
    grid(h, 'INDUSTRY', { heading: 'Built for the way your shop works', intro: 'Each trade gets the screens it needs, on top of the same counter, stock and khata.', filter: { featured: true }, limit: 8 }),
    diagram(h, 'A sale made offline waits on the device, then syncs to the Nafaa cloud and the other branch when the internet returns.', { kind: 'offline-sync' }, 'Keeps selling when the internet drops'),
    diagram(h, 'A POS sale goes from Nafaa to FBR or PRA, comes back with a fiscal number and prints as a QR code on the receipt.', { kind: 'fbr-invoice' }, 'Tax invoices from the same counter'),
    pricing(h, { heading: 'Simple plans, straight from our price list' }),
    { id: h(), type: 'testimonial', mode: 'auto', limit: 3 },
    faq(h, 'Questions shop owners ask first'),
    ctaBand(h, 'Start with the free trial today', 'No card needed. Bring your product list from Excel and start billing.'),
  ],
  { faqKeys: ['devices', 'offline', 'pricing', 'khata-reminders', 'kiryana-import', 'billing-periods'] },
);

const p = ids('page-pricing');
const pricingPage = page(
  '/pricing',
  'Pricing',
  'pricing',
  'Nafaa plans in Pakistan start with a 7-day free trial, then paid plans from {{price:min.monthly}} a month. Every price and limit on this page comes straight from our plan settings, so it is always current. Pay monthly, quarterly or yearly.',
  [
    hero(p, 'Start with the 7-day free trial, then pick the plan that fits your shop. Prices and limits come straight from our plan settings.', {
      heading: 'Plans and pricing',
      eyebrow: 'Pricing',
      layout: 'centered',
    }),
    pricing(p, { highlightPlan: 'pro', heading: 'Choose your plan' }),
    faq(p),
  ],
  { faqKeys: ['pricing', 'plan-limits', 'billing-periods', 'devices', 'offline'] },
);

function hub(path: string, title: string, type: CmsEntryType, summary: string, sub: string, gridHeading: string, layout: 'cards' | 'grouped' = 'cards', faqKeys: string[] = []): FixtureSpec {
  const id = ids(`hub-${path.slice(1)}`);
  return page(
    path,
    title,
    'hub',
    summary,
    [
      hero(id, sub, { layout: 'centered', eyebrow: title }),
      grid(id, type, { layout, limit: 60, heading: gridHeading }),
      ...(faqKeys.length ? [faq(id)] : []),
      ctaBand(id, 'Not sure where to start?', 'Tell us about your business on WhatsApp and we will point you to the right setup.', cta('Talk to us on WhatsApp', 'whatsapp'), cta('Start free trial', 'signup', 'secondary')),
    ],
    { faqKeys },
    type,
  );
}

const hubs: FixtureSpec[] = [
  hub('/product', 'Product', 'PRODUCT', 'Everything Nafaa does, in one place: the billing counter, stock, digital khata, multiple shops and what is coming next. Each product page shows how it works, who it is for and what is live today.', 'The counter, the stock room and the udhaar register, in one account.', 'Everything in Nafaa'),
  hub('/industries', 'Industries', 'INDUSTRY', 'Nafaa has screens made for each trade on top of the same counter, stock and khata: kiryana and grocery, pharmacy, bakery, restaurant, mobile phone shops, garments, hardware, jewellery and more.', 'Pick your trade to see the screens made for it.', 'Industries by type of business', 'grouped', ['devices']),
  hub('/solutions', 'Solutions', 'SOLUTION', 'Nafaa setups for the way a business is run: several branches, selling online and in store, and more. Each solution page shows the products it uses and what is live today.', 'Setups for how your business is run, not just what it sells.', 'All solutions'),
  hub('/services', 'Services', 'SERVICE', 'Services from the Nafaa team for businesses in Pakistan and abroad: custom software and data migration. Every project starts with a Quote lein request and a fixed quote in PKR or USD.', 'Custom work and setup help from the team that builds Nafaa.', 'All services'),
  hub('/integrations', 'Integrations', 'INTEGRATION', 'Connections between Nafaa and other services. Each one is marked live, beta or coming soon, so you always know what works today and what is still planned.', 'What Nafaa connects to today, and what is next.', 'All integrations'),
];

const r = ids('page-roadmap');
const roadmap = page(
  '/roadmap',
  'Roadmap',
  'roadmap',
  'The Nafaa roadmap lists what is in beta and what is coming soon. Beta features work in the app and are being improved with early users; coming-soon features are planned and not built yet, and we never sell them as available.',
  [
    hero(r, 'What is in beta, what is coming next, and how to ask for what your shop needs.', { heading: 'Roadmap', eyebrow: 'Building in the open', layout: 'centered', primaryCta: cta('Ask for a feature', 'whatsapp'), secondaryCta: cta('See live features', '/product', 'secondary') }),
    answer(r, [
      ['Live', 'Works in the app today, no badge'],
      ['Beta', 'Works in the app, being improved with early users'],
      ['Coming soon', 'Planned, not built yet; never sold as available'],
    ], 'Live: aaj kaam karta hai. Beta: kaam karta hai, behtar ho raha hai. Jald aa raha hai: abhi bana nahi.', 'How to read this page'),
    grid(r, 'PRODUCT', { heading: 'Product', filter: { status: ['beta', 'coming'] }, layout: 'list' }),
    grid(r, 'INTEGRATION', { heading: 'Integrations', filter: { status: ['beta', 'coming'] }, layout: 'list' }),
    grid(r, 'SOLUTION', { heading: 'Solutions', filter: { status: ['beta', 'coming'] }, layout: 'list' }),
    ctaBand(r, 'Need something that is not here?', 'Tell us how your shop works today and what you need.', cta('Message us on WhatsApp', 'whatsapp'), cta('Contact us', '/contact', 'secondary')),
    faq(r),
  ],
  { faqKeys: ['roadmap-status', 'roadmap-request'] },
);

const a = ids('page-about');
const about = page(
  '/about',
  'About Nafaa',
  'default',
  'Nafaa (nafaa.pk) is Pakistani POS and business software: billing, stock and digital khata for shops, with screens for each trade and a counter that keeps working without internet. It is not NAFA Funds.',
  [
    hero(a, 'POS, stock and khata software made in Pakistan, for shops in Pakistan.', { heading: 'About Nafaa', eyebrow: 'Company', layout: 'centered', primaryCta: cta('Contact us', '/contact'), secondaryCta: cta('See pricing', '/pricing', 'secondary') }),
    rich(
      a,
      '## What Nafaa is\n\n{{fact:description}}\n\n## How this site works\n\n- **Prices** come straight from our plan settings, so they are the same here and in the app.\n- **Features** are marked live, beta or coming soon. Nothing that is not built is shown as available.\n- **No made-up numbers.** We do not publish ratings, customer counts or results we cannot show.\n\n## Talk to us\n\nThe [contact page](/contact) has our email, phone and WhatsApp.',
    ),
  ],
);

const c = ids('page-contact');
const contact = page(
  '/contact',
  'Contact',
  'contact',
  'Contact Nafaa by WhatsApp, email or phone, or send a message with the form. Tell us about your shop and what you need, and the team replies on the channel you prefer.',
  [
    hero(c, 'WhatsApp is the quickest way to reach us. Email and the form work too.', { heading: 'Contact Nafaa', eyebrow: 'Contact', layout: 'centered', primaryCta: cta('Chat on WhatsApp', 'whatsapp'), secondaryCta: cta('Book a demo', 'demo', 'secondary') }),
    { id: c(), type: 'leadForm', heading: 'Send us a message', form: 'contact', formType: 'GENERAL', successMessage: 'Shukriya! We have your message and will reply soon.', whatsapp: true },
  ],
);

const d = ids('page-demo');
const demo = page(
  '/demo',
  'Book a demo',
  'contact',
  'Book a Nafaa demo: pick a day and time, tell us about your shop, and we show you the counter, stock and khata for your trade.',
  [
    hero(d, 'Pick a time and tell us about your shop. We show you the screens for your trade.', { heading: 'Book a demo', eyebrow: 'Demo', layout: 'centered', primaryCta: cta('Start free trial instead', 'signup'), secondaryCta: cta('Chat on WhatsApp', 'whatsapp', 'secondary') }),
    { id: d(), type: 'leadForm', heading: 'Book your demo', form: 'demo', successMessage: 'Shukriya! We will confirm your demo time soon.', whatsapp: true },
  ],
);

const l = ids('page-privacy');
const privacy = page(
  '/privacy',
  'Privacy policy',
  'legal',
  'Placeholder for the Nafaa privacy policy, used to lay out legal pages in development. The real policy text is written and approved by the owner.',
  [
    rich(
      l,
      '## About this page\n\nThis is development placeholder text that shows how a legal page is laid out: headings, lists, a table of contents and the updated date. It is not a policy.\n\n## Section heading\n\nLegal pages use H2 and H3 headings only. Each H2 appears in the table of contents.\n\n### A sub-section\n\n- List items read like this.\n- Links look like [this one](/contact).\n\n## Contact\n\nQuestions about a policy go to the email on the [contact page](/contact).',
    ),
  ],
);

const f = ids('page-faq');
const faqHub = page(
  '/faq',
  'Frequently asked questions',
  'hub',
  'Answers to what shop owners ask most about Nafaa: getting started, pricing, the khata and each trade. Every answer starts with the short answer, and prices come straight from our plan settings.',
  [hero(f, 'Short, straight answers about Nafaa, grouped by topic.', { heading: 'Frequently asked questions', eyebrow: 'Help', layout: 'centered', primaryCta: cta('Ask on WhatsApp', 'whatsapp'), secondaryCta: cta('Contact us', '/contact', 'secondary') })],
);

export const pageFixtures: FixtureSpec[] = [home, pricingPage, ...hubs, roadmap, about, contact, demo, privacy, faqHub];
