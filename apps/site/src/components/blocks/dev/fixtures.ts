/**
 * Typed fixtures for the /_dev/blocks gallery. DEV ONLY.
 *
 * - Imported only by the gallery (components/blocks/dev, app/_dev/blocks),
 *   which is noindex and 404s in production builds. No public page or
 *   template imports this file.
 * - Every value conforms to the CMS contract; the gallery validates them
 *   with the contract's zod schemas on each render.
 * - All text here is sample copy for layout review. Names, quotes, numbers
 *   and notes are not facts about Nafaa or anyone else, and none of it may
 *   be copied into CMS content.
 */
import type {
  Block,
  EntryCard,
  PublicCustomer,
  PublicEntry,
  PublicFaq,
  PublicMedia,
  PublicPlan,
  PublicStatsResponse,
  PublicTestimonial,
  SiteSettings,
} from '@/lib/cms/contract/cms-contract';
import type { IndustryGroupLabel } from '../types';

const NOW = '2026-10-20T09:00:00.000Z';
const SITE = 'http://localhost:3200';

// ─── Sample images (inline SVG, never uploaded) ──────────────────────────

function svgUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** A neutral, clearly-sample app screen: sidebar, header, product tiles, cart. */
function sampleScreen(width: number, height: number, label: string, accent = '#047857'): string {
  const side = Math.round(width * 0.17);
  const cart = Math.round(width * 0.27);
  const top = 64;
  const gridW = width - side - cart - 48;
  const cols = 4;
  const tile = Math.floor((gridW - (cols - 1) * 14) / cols);
  const tiles: string[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < cols; c++) {
      const x = side + 24 + c * (tile + 14);
      const y = top + 84 + r * (tile * 0.78 + 14);
      tiles.push(
        `<rect x="${x}" y="${y}" width="${tile}" height="${Math.round(tile * 0.78)}" rx="12" fill="#fff" stroke="#e2e8f0"/>` +
          `<rect x="${x + 14}" y="${y + 14}" width="${Math.round(tile * 0.32)}" height="${Math.round(tile * 0.32)}" rx="8" fill="${accent}" opacity="0.12"/>` +
          `<rect x="${x + 14}" y="${y + Math.round(tile * 0.5)}" width="${Math.round(tile * 0.62)}" height="9" rx="4.5" fill="#cbd5e1"/>` +
          `<rect x="${x + 14}" y="${y + Math.round(tile * 0.5) + 18}" width="${Math.round(tile * 0.36)}" height="9" rx="4.5" fill="${accent}" opacity="0.55"/>`,
      );
    }
  }
  const lines = Array.from({ length: 5 }, (_, i) => {
    const y = top + 70 + i * 52;
    const x = width - cart + 20;
    return `<rect x="${x}" y="${y}" width="${cart - 120}" height="10" rx="5" fill="#cbd5e1"/><rect x="${width - 82}" y="${y}" width="56" height="10" rx="5" fill="#94a3b8"/>`;
  }).join('');
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<rect width="${width}" height="${height}" fill="#f8fafc"/>` +
      `<rect width="${side}" height="${height}" fill="#0f172a"/>` +
      `<rect x="20" y="22" width="${side - 40}" height="22" rx="6" fill="${accent}"/>` +
      Array.from({ length: 7 }, (_, i) => `<rect x="20" y="${84 + i * 40}" width="${side - 56 - (i % 3) * 14}" height="10" rx="5" fill="#334155"/>`).join('') +
      `<rect x="${side}" width="${width - side}" height="${top}" fill="#fff"/><rect x="${side}" y="${top - 1}" width="${width - side}" height="1" fill="#e2e8f0"/>` +
      `<rect x="${side + 24}" y="20" width="${Math.round(gridW * 0.55)}" height="24" rx="12" fill="#f1f5f9"/>` +
      `<rect x="${side + 24}" y="${top + 28}" width="160" height="14" rx="7" fill="#334155"/>` +
      tiles.join('') +
      `<rect x="${width - cart}" y="${top}" width="${cart}" height="${height - top}" fill="#fff"/><rect x="${width - cart}" y="${top}" width="1" height="${height - top}" fill="#e2e8f0"/>` +
      `<rect x="${width - cart + 20}" y="${top + 28}" width="110" height="14" rx="7" fill="#334155"/>` +
      lines +
      `<rect x="${width - cart + 20}" y="${height - 92}" width="${cart - 40}" height="52" rx="12" fill="${accent}"/>` +
      `<text x="${side + 24}" y="${height - 22}" font-family="ui-sans-serif,system-ui" font-size="14" fill="#94a3b8">${label}</text>` +
      `</svg>`,
  );
}

function samplePhone(width: number, height: number, label: string): string {
  const rows = Array.from({ length: 6 }, (_, i) => {
    const y = 150 + i * 92;
    return (
      `<rect x="24" y="${y}" width="${width - 48}" height="76" rx="16" fill="#fff" stroke="#e2e8f0"/>` +
      `<circle cx="64" cy="${y + 38}" r="18" fill="#047857" opacity="0.12"/>` +
      `<rect x="96" y="${y + 24}" width="${width - 230}" height="10" rx="5" fill="#cbd5e1"/>` +
      `<rect x="96" y="${y + 44}" width="${width - 290}" height="9" rx="4.5" fill="#e2e8f0"/>` +
      `<rect x="${width - 112}" y="${y + 30}" width="64" height="14" rx="7" fill="${i % 3 === 0 ? '#b45309' : '#047857'}" opacity="0.7"/>`
    );
  }).join('');
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<rect width="${width}" height="${height}" fill="#f8fafc"/>` +
      `<rect width="${width}" height="120" fill="#047857"/>` +
      `<rect x="24" y="52" width="150" height="16" rx="8" fill="#fff" opacity="0.9"/>` +
      `<rect x="24" y="80" width="96" height="10" rx="5" fill="#fff" opacity="0.6"/>` +
      rows +
      `<text x="24" y="${height - 28}" font-family="ui-sans-serif,system-ui" font-size="14" fill="#94a3b8">${label}</text>` +
      `</svg>`,
  );
}

function sampleLogo(text: string): string {
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="48" viewBox="0 0 200 48">` +
      `<rect x="2" y="10" width="28" height="28" rx="8" fill="#0f172a"/>` +
      `<text x="40" y="31" font-family="ui-sans-serif,system-ui" font-weight="700" font-size="18" fill="#0f172a">${text}</text>` +
      `</svg>`,
  );
}

function media(id: string, kind: PublicMedia['kind'], url: string, width: number, height: number, alt: string): PublicMedia {
  return { id, kind, publicId: `dev/${id}`, url, width, height, alt, mimeType: 'image/svg+xml', bytes: url.length };
}

export const FIXTURE_MEDIA: Record<string, PublicMedia> = {
  devPosScreen: media('devPosScreen', 'SCREENSHOT', sampleScreen(1600, 1000, 'Sample screen (fixture)'), 1600, 1000, 'Sample POS screen used to review the layout'),
  devStockScreen: media('devStockScreen', 'SCREENSHOT', sampleScreen(1600, 1000, 'Sample stock screen (fixture)', '#0369a1'), 1600, 1000, 'Sample stock screen used to review the layout'),
  devPhoneScreen: media('devPhoneScreen', 'SCREENSHOT', samplePhone(780, 1640, 'Sample khata list (fixture)'), 780, 1640, 'Sample khata list on a phone, for layout review'),
};

const LOGOS: PublicMedia[] = ['Sample A', 'Sample B', 'Sample C', 'Sample D', 'Sample E'].map((name, i) =>
  media(`devLogo${i}`, 'LOGO', sampleLogo(name), 200, 48, `${name} logo (fixture)`),
);

// ─── Cards ───────────────────────────────────────────────────────────────

function card(partial: Partial<EntryCard> & Pick<EntryCard, 'id' | 'type' | 'path' | 'title'>): EntryCard {
  return {
    locale: 'en',
    url: `${SITE}${partial.path}`,
    summary: null,
    image: null,
    contentUpdatedAt: NOW,
    ...partial,
  };
}

export const FIXTURE_GROUPS: IndustryGroupLabel[] = [
  { key: 'food', label: 'Food and grocery', sortOrder: 1 },
  { key: 'health', label: 'Health and beauty', sortOrder: 2 },
  { key: 'fashion', label: 'Fashion and electronics', sortOrder: 3 },
];

export const FIXTURE_CARDS: EntryCard[] = [
  card({ id: 'dev-ind-grocery', type: 'INDUSTRY', path: '/industries/kiryana', title: 'Grocery and kiryana', shortName: 'Grocery', icon: 'shopping-basket', color: '#047857', group: 'food', summary: 'Sample summary: fast billing, stock by barcode and khata for regular customers.' }),
  card({ id: 'dev-ind-bakery', type: 'INDUSTRY', path: '/industries/bakery', title: 'Bakery', icon: 'croissant', color: '#b45309', group: 'food', summary: 'Sample summary: daily production, weighed items and counter sales.' }),
  card({ id: 'dev-ind-restaurant', type: 'INDUSTRY', path: '/industries/restaurant', title: 'Restaurant', icon: 'utensils-crossed', color: '#b91c1c', group: 'food', summary: 'Sample summary: tables, kitchen tickets and takeaway.' }),
  card({ id: 'dev-ind-pharmacy', type: 'INDUSTRY', path: '/industries/pharmacy', title: 'Pharmacy', icon: 'pill', color: '#0369a1', group: 'health', summary: 'Sample summary: batches, expiry dates and medicine search.' }),
  card({ id: 'dev-ind-cosmetics', type: 'INDUSTRY', path: '/industries/cosmetics', title: 'Cosmetics', icon: 'sparkles', color: '#be185d', group: 'health', summary: 'Sample summary: variants, shades and loyalty.' }),
  card({ id: 'dev-ind-mobile', type: 'INDUSTRY', path: '/industries/mobile-shop', title: 'Mobile shop', icon: 'smartphone', color: '#4338ca', group: 'fashion', summary: 'Sample summary: IMEI tracking, repairs and accessories.' }),
  card({ id: 'dev-ind-garments', type: 'INDUSTRY', path: '/industries/garments', title: 'Garments', icon: 'shirt', color: '#7c3aed', group: 'fashion', summary: 'Sample summary: sizes, colours and seasonal stock.' }),
  card({ id: 'dev-prod-pos', type: 'PRODUCT', path: '/product/pos', title: 'POS billing', icon: 'scan-barcode', status: 'live', summary: 'Sample summary for a live product card.' }),
  card({ id: 'dev-prod-loyalty', type: 'PRODUCT', path: '/product/loyalty', title: 'Loyalty points', icon: 'gift', status: 'beta', summary: 'Sample summary for a beta product card.' }),
  card({ id: 'dev-prod-delivery', type: 'PRODUCT', path: '/product/delivery', title: 'Delivery tracking', icon: 'truck', status: 'coming', summary: 'Sample summary for a coming-soon product card.' }),
  card({ id: 'dev-int-shopify', type: 'INTEGRATION', path: '/integrations/shopify', title: 'Shopify', icon: 'store', status: 'beta', summary: 'Sample summary for an integration card.' }),
  card({ id: 'dev-int-woo', type: 'INTEGRATION', path: '/integrations/woocommerce', title: 'WooCommerce', icon: 'plug', status: 'coming', summary: 'Sample summary for a planned integration.' }),
  card({ id: 'dev-city-isb', type: 'CITY', path: '/pos-software/islamabad', title: 'POS software in Islamabad', shortName: 'Islamabad', icon: 'map-pin', summary: 'Sample city card.' }),
  card({ id: 'dev-city-rwp', type: 'CITY', path: '/pos-software/rawalpindi', title: 'POS software in Rawalpindi', shortName: 'Rawalpindi', icon: 'map-pin', summary: 'Sample city card.' }),
  card({ id: 'dev-city-fsd', type: 'CITY', path: '/pos-software/faisalabad', title: 'POS software in Faisalabad', shortName: 'Faisalabad', icon: 'map-pin', summary: 'Sample city card.' }),
  card({ id: 'dev-post-1', type: 'BLOG_POST', path: '/blog/sample-post', title: 'Sample post title for a related card', summary: 'Sample excerpt that runs to two lines so the card height can be checked.' }),
  card({ id: 'dev-glossary-1', type: 'GLOSSARY_TERM', path: '/glossary/khata', title: 'Khata', summary: 'Sample definition for a glossary card.' }),
];

// ─── Proof (sample only) ─────────────────────────────────────────────────

export const FIXTURE_TESTIMONIALS: PublicTestimonial[] = [
  {
    id: 'dev-t1',
    quote: 'Sample quote for layout review. A real quote appears here only with the customer’s recorded QUOTE consent.',
    personName: 'Sample Person',
    personRole: 'Owner',
    photo: null,
    sourceType: 'DIRECT',
    sourceUrl: null,
    collectedAt: '2026-09-01',
    customer: { name: 'Sample Store', city: 'Sample City', industry: 'Grocery', logo: LOGOS[0] ?? null, caseStudyPath: null },
  },
  {
    id: 'dev-t2',
    quote: 'A second sample quote, a little longer, to check how two cards of different lengths line up next to each other.',
    personName: 'Second Sample',
    personRole: 'Manager',
    photo: null,
    sourceType: 'GOOGLE',
    sourceUrl: 'https://example.com/review',
    collectedAt: '2026-08-12',
    customer: { name: '', city: 'Sample City', industry: 'Pharmacy', logo: null, caseStudyPath: null },
  },
  {
    id: 'dev-t3',
    quote: 'Third sample quote. Short.',
    personName: 'Third Sample',
    personRole: null,
    photo: null,
    sourceType: 'DIRECT',
    sourceUrl: null,
    collectedAt: null,
    customer: { name: 'Sample Bakery', city: null, industry: 'Bakery', logo: null, caseStudyPath: '/customers/sample' },
  },
];

export const FIXTURE_CUSTOMERS: PublicCustomer[] = LOGOS.map((logo, i) => ({
  id: `dev-c${i}`,
  name: `Sample customer ${i + 1}`,
  logo,
  website: null,
  city: null,
  industry: null,
}));

/** Sample numbers for the stats layout only; the real block shows API counts. */
export const FIXTURE_STATS: PublicStatsResponse = {
  'industries.count': { value: 31, formatted: '31', asOf: NOW },
  'cities.count': { value: 12, formatted: '12', asOf: NOW },
  'integrations.live.count': { value: 4, formatted: '4', asOf: NOW },
  'glossary.count': { value: 120, formatted: '120', asOf: NOW },
  'plans.count': { value: 4, formatted: '4', asOf: NOW },
};

/** Used only when the local API has no public plans. Sample names make it obvious. */
export const FIXTURE_PLANS: PublicPlan[] = [
  {
    id: 'dev-plan-trial',
    slug: 'sample-trial',
    name: 'Sample trial',
    description: 'Fixture plan (the API returned no plans).',
    priceMonthly: 0,
    priceQuarterly: 0,
    priceYearly: 0,
    currency: 'PKR',
    trialDays: 7,
    sortOrder: 1,
    limits: { maxProducts: 30, maxUsers: 2, maxShops: 1, maxSalesPerMonth: 100 },
    features: [],
    display: { highlight: false },
  },
  {
    id: 'dev-plan-paid',
    slug: 'sample-paid',
    name: 'Sample paid',
    description: 'Fixture plan (the API returned no plans).',
    priceMonthly: 1000,
    priceQuarterly: 2700,
    priceYearly: 10000,
    currency: 'PKR',
    trialDays: 7,
    sortOrder: 2,
    limits: { maxProducts: 500, maxUsers: 3, maxShops: 1, maxSalesPerMonth: 2000 },
    features: [],
    display: { highlight: true },
  },
];

export const FIXTURE_SITE: SiteSettings = {
  name: 'Nafaa',
  baseUrl: SITE,
  appUrl: 'http://localhost:5173',
  signupUrl: 'http://localhost:5173/signup',
  demoPath: '/demo',
  locales: ['en'],
  whatsapp: { number: '920000000000', message: 'Sample WhatsApp message (fixture)' },
  social: [],
};

// ─── FAQs ────────────────────────────────────────────────────────────────

export const FIXTURE_FAQS: PublicFaq[] = [
  {
    id: 'dev-faq-1',
    question: 'Sample question: does the answer support **Markdown**?',
    answer: 'Yes. Answers render the same subset as rich text: **bold**, *italic*, [internal links](/pricing) and lists:\n\n- first point\n- second point',
    topic: 'sample',
  },
  { id: 'dev-faq-2', question: 'Sample question two, a longer one that wraps onto a second line on phones to check spacing?', answer: 'A one-paragraph sample answer for layout review.', topic: 'sample' },
  { id: 'dev-faq-3', question: 'Sample question three?', answer: 'Sample answer with an official link: [FBR](https://fbr.gov.pk).', topic: 'sample' },
  { id: 'dev-faq-4', question: 'Kya yeh Roman Urdu sawal bhi theek dikhta hai?', answer: 'Ji haan, yeh sample jawab hai. Lambi lines bhi aaram se wrap hoti hain.', topic: 'sample' },
];

// ─── Blocks: one or more variants of every type ─────────────────────────

const RICH_TEXT = `## Sample section heading

Rich text renders on the server with **bold**, *italic*, ~~strikethrough~~, \`inline code\`, an [internal link](/pricing), an [official source](https://fbr.gov.pk) and an autolink https://example.com/path.

### A third-level heading

1. Ordered item one
2. Ordered item two
   - Nested bullet
   - Another nested bullet
3. Ordered item three

- [x] A finished task item
- [ ] An open task item

> A blockquote for a short, quotable line.

| Plan feature | Sample A | Sample B |
| :--- | :---: | ---: |
| Offline billing | Yes | Yes |
| Branches | 1 | 3 |

![Sample screenshot inside rich text](media:devStockScreen "Caption from the Markdown title")

\`\`\`bash
curl -s https://api.nafaa.pk/api/v1/products \\
  -H "Authorization: Bearer $NAFAA_KEY"
\`\`\`

<script>alert('raw HTML stays text')</script>

---

A last paragraph after a rule.`;

export const FIXTURE_BLOCKS: { label: string; note?: string; block: Block }[] = [
  {
    label: 'hero · split + browser screenshot',
    block: {
      id: 'devHero01',
      type: 'hero',
      eyebrow: 'Sample eyebrow',
      heading: 'Sample hero heading that runs to two lines',
      sub: 'A sample sub line of about thirty words. It says what the page is about, in **plain words**, so people and answer engines get the point in one read without scrolling.',
      primaryCta: { label: 'Start free trial', href: 'https://app.nafaa.pk/signup', trackAs: 'dev_hero_primary' },
      secondaryCta: { label: 'Book a demo', href: '/demo', variant: 'secondary' },
      media: { kind: 'screenshot', mediaId: 'devPosScreen', frame: 'browser', url: 'app.nafaa.pk/pos' },
      badges: ['FBR & PRA approved POS integrator', 'Works offline', 'Sample badge'],
      layout: 'split',
    },
  },
  {
    label: 'hero · centered + diagram',
    block: {
      id: 'devHero02',
      type: 'hero',
      heading: 'Centered hero with a diagram',
      sub: 'Sample sub text for the centered layout. The diagram below may animate; the heading and this text never do.',
      primaryCta: { label: 'Get started', href: '/pricing' },
      media: { kind: 'diagram', diagram: { kind: 'offline-sync' } },
      layout: 'centered',
    },
  },
  {
    label: 'answerBox · with Roman Urdu summary',
    block: {
      id: 'devAnswer1',
      type: 'answerBox',
      answer: 'Sample short answer of forty to sixty words. It answers the page question first, in one paragraph, with the **key term** in bold, so a reader or an answer engine can quote it as it stands without reading the rest of the page.',
      facts: [
        { label: 'Sample fact', value: 'Value with a [link](/pricing)' },
        { label: 'Works offline', value: 'Yes (sample)' },
        { label: 'Price', value: 'From the Plan table (sample)' },
        { label: 'Setup', value: 'Sample value' },
      ],
      romanUrdu: 'Yeh Roman Urdu ka sample khulasa hai. Aasan alfaaz, business terms English mein: Sale, Profit, Expense.',
    },
  },
  {
    label: 'featuresGrid · 3 columns with status badges',
    block: {
      id: 'devFeat001',
      type: 'featuresGrid',
      heading: 'Sample features heading',
      intro: 'An optional intro line. Items without a status are live; **beta** and **coming** show badges.',
      columns: 3,
      items: [
        { icon: 'scan-barcode', title: 'Live feature', body: 'Sample body text for a live feature card.', href: '/product/pos' },
        { icon: 'wifi-off', title: 'Another live feature', body: 'Sample body with a little more text so the card grows to two or three lines.' },
        { icon: 'gift', title: 'Beta feature', body: 'Sample body for a beta feature.', status: 'beta' },
        { icon: 'truck', title: 'Coming feature', body: 'Sample body for a feature that is not built yet.', status: 'coming', href: '/roadmap' },
        { icon: 'chart-line', title: 'Fifth feature', body: 'Sample body text.' },
        { icon: 'users', title: 'Sixth feature', body: 'Sample body text.' },
      ],
    },
  },
  {
    label: 'featuresGrid · 4 columns, muted',
    block: {
      id: 'devFeat002',
      type: 'featuresGrid',
      theme: 'muted',
      heading: 'Four columns on a muted band',
      columns: 4,
      items: [
        { icon: 'receipt', title: 'Receipts', body: 'Sample body.' },
        { icon: 'boxes', title: 'Stock', body: 'Sample body.' },
        { icon: 'notebook-pen', title: 'Khata', body: 'Sample body.' },
        { icon: 'chart-pie', title: 'Reports', body: 'Sample body.' },
      ],
    },
  },
  {
    label: 'diagram · bespoke fbr-invoice',
    block: { id: 'devDiag001', type: 'diagram', heading: 'Sample diagram heading', caption: 'Sample caption: a sale goes to the tax authority and the fiscal number prints on the receipt.', diagram: { kind: 'fbr-invoice' } },
  },
  {
    label: 'diagram · data-driven flow on ink',
    block: {
      id: 'devDiag002',
      type: 'diagram',
      theme: 'ink',
      heading: 'A flow on an ink band',
      caption: 'Sample caption for a data-driven flow.',
      diagram: {
        kind: 'flow',
        nodes: [
          { id: 'order', label: 'Order', icon: 'clipboard-list' },
          { id: 'pack', label: 'Pack', icon: 'package' },
          { id: 'ship', label: 'Dispatch', icon: 'truck' },
          { id: 'pay', label: 'Collect', icon: 'wallet' },
        ],
        edges: [
          { from: 'order', to: 'pack' },
          { from: 'pack', to: 'ship' },
          { from: 'ship', to: 'pay' },
        ],
      },
    },
  },
  {
    label: 'screenshot · split-right with callouts',
    block: {
      id: 'devShot001',
      type: 'screenshot',
      heading: 'Sample screenshot heading',
      body: 'Sample body Markdown next to the screenshot. Callout numbers match the legend under the image.\n\n- Point one\n- Point two',
      mediaId: 'devPosScreen',
      frame: 'browser',
      url: 'app.nafaa.pk/pos',
      callouts: [
        { x: 30, y: 30, label: 'Sample callout: product search' },
        { x: 50, y: 55, label: 'Sample callout: product tiles' },
        { x: 85, y: 88, label: 'Sample callout: pay button' },
      ],
      layout: 'split-right',
      caption: 'Sample caption under the frame.',
    },
  },
  {
    label: 'screenshot · phone, split-left',
    block: {
      id: 'devShot002',
      type: 'screenshot',
      theme: 'muted',
      heading: 'Phone frame on the left',
      body: 'Sample body text for a phone screenshot.',
      mediaId: 'devPhoneScreen',
      frame: 'phone',
      layout: 'split-left',
    },
  },
  {
    label: 'screenshot · full width desktop frame',
    block: { id: 'devShot003', type: 'screenshot', mediaId: 'devStockScreen', frame: 'desktop', layout: 'full', caption: 'Sample full-width screenshot in the Windows frame.' },
  },
  {
    label: 'steps · text only',
    block: {
      id: 'devSteps01',
      type: 'steps',
      heading: 'Sample steps heading',
      intro: 'Sample intro for the steps.',
      howTo: true,
      items: [
        { title: 'Sample step one', body: 'Body Markdown for step one, with **bold** text.' },
        { title: 'Sample step two', body: 'Body for step two.' },
        { title: 'Sample step three', body: 'Body for step three, longer so it wraps onto a second line in the column.' },
      ],
    },
  },
  {
    label: 'steps · with screenshots',
    block: {
      id: 'devSteps02',
      type: 'steps',
      heading: 'Steps with screenshots alternate',
      items: [
        { title: 'Sample step with a screen', body: 'Sample body text.', mediaId: 'devPosScreen' },
        { title: 'Second step with a screen', body: 'Sample body text.', mediaId: 'devStockScreen' },
      ],
    },
  },
  {
    label: 'comparisonTable · highlight + sources',
    block: {
      id: 'devComp001',
      type: 'comparisonTable',
      heading: 'Sample comparison heading',
      caption: 'Sample caption: what each sample option includes.',
      columns: [
        { key: 'nafaa', label: 'Nafaa', highlight: true },
        { key: 'a', label: 'Sample A' },
        { key: 'b', label: 'Sample B' },
      ],
      rows: [
        { label: 'Works offline', cells: { nafaa: { value: 'yes' }, a: { value: 'partial', note: 'Sample note' }, b: { value: 'no' } } },
        { label: 'Urdu interface', cells: { nafaa: { value: 'yes' }, a: { value: 'no' }, b: { value: 'no' } } },
        { label: 'Sample text cell', cells: { nafaa: { value: 'From the Plan table' }, a: { value: 'Sample' }, b: { value: 'Sample' } } },
      ],
      sources: [{ title: 'Sample source page', url: 'https://example.com/pricing', publisher: 'Example', accessedAt: '2026-10-01' }],
      checkedAt: '2026-10-01',
    },
  },
  { label: 'pricingTable · from the Plan table', note: 'Real plans when the API returns them.', block: { id: 'devPrice01', type: 'pricingTable', showToggle: true } },
  {
    label: 'pricingTable · compact, highlighted plan',
    block: { id: 'devPrice02', type: 'pricingTable', heading: 'Compact variant', showToggle: false, compact: true, highlightPlan: 'pro' },
  },
  {
    label: 'stats · computed metrics only',
    note: 'Live API values; zero values are hidden, fixtures fill in only when nothing is left.',
    block: {
      id: 'devStats01',
      type: 'stats',
      heading: 'Sample stats heading',
      items: [
        { metric: 'industries.count', label: 'Industries' },
        { metric: 'cities.count', label: 'Cities' },
        { metric: 'plans.count', label: 'Plans' },
        { metric: 'glossary.count', label: 'Glossary terms', suffix: '+' },
      ],
    },
  },
  { label: 'testimonial · auto', note: 'Renders nothing without consented quotes.', block: { id: 'devTesti01', type: 'testimonial', mode: 'auto', limit: 3 } },
  { label: 'logoCloud · auto', note: 'Renders nothing without LOGO consent.', block: { id: 'devLogos01', type: 'logoCloud', mode: 'auto' } },
  {
    label: 'codeSample · tabs',
    block: {
      id: 'devCode001',
      type: 'codeSample',
      heading: 'Sample code heading',
      caption: 'Sample caption under the code.',
      tabs: [
        { label: 'cURL', language: 'bash', code: 'curl -X POST https://api.nafaa.pk/api/v1/sales \\\n  -H "Authorization: Bearer $NAFAA_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"items":[{"sku":"SAMPLE-1","qty":2}]}\'' },
        { label: 'Node.js', language: 'js', code: "// Sample request (fixture)\nconst res = await fetch('https://api.nafaa.pk/api/v1/sales', {\n  method: 'POST',\n  headers: { Authorization: `Bearer ${process.env.NAFAA_KEY}` },\n  body: JSON.stringify({ items: [{ sku: 'SAMPLE-1', qty: 2 }] }),\n});\nconsole.log(res.status, true, null, 42);" },
        { label: 'Python', language: 'python', code: '# Sample request (fixture)\nimport requests\n\ndef create_sale(key: str):\n    return requests.post("https://api.nafaa.pk/api/v1/sales", headers={"Authorization": f"Bearer {key}"}, json={"items": []})' },
        { label: 'Response', language: 'json', code: '{\n  "id": "sale_sample",\n  "total": 1200,\n  "paid": true,\n  "items": [{ "sku": "SAMPLE-1", "qty": 2 }],\n  "note": null\n}' },
        { label: 'HTTP', language: 'http', code: 'POST /api/v1/sales HTTP/1.1\nHost: api.nafaa.pk\nAuthorization: Bearer sample\nContent-Type: application/json\n\n{"items": []}' },
        { label: 'PHP', language: 'php', code: "<?php\n// Sample request (fixture)\n$key = getenv('NAFAA_KEY');\n$res = file_get_contents('https://api.nafaa.pk/api/v1/products');\necho $res;" },
      ],
    },
  },
  {
    label: 'cityFacts · all sections',
    note: 'Rendered with the sample CITY entry below.',
    block: { id: 'devCity001', type: 'cityFacts', show: ['tax', 'markets', 'areas', 'support', 'nearby'] },
  },
  {
    label: 'entryGrid · cards (industries)',
    block: { id: 'devGrid001', type: 'entryGrid', heading: 'Sample industries grid', intro: 'Cards from the entries list, with industry colours.', entryType: 'INDUSTRY', layout: 'cards', limit: 6 },
  },
  {
    label: 'entryGrid · grouped',
    block: { id: 'devGrid002', type: 'entryGrid', theme: 'muted', heading: 'Grouped by industry group', entryType: 'INDUSTRY', layout: 'grouped' },
  },
  {
    label: 'entryGrid · list, roadmap filter (beta + coming)',
    block: { id: 'devGrid003', type: 'entryGrid', heading: 'On the roadmap', intro: 'PRODUCT entries with status beta or coming.', entryType: 'PRODUCT', layout: 'list', filter: { status: ['beta', 'coming'] } },
  },
  { label: 'relatedLinks · related', block: { id: 'devRelat01', type: 'relatedLinks', source: 'related' } },
  { label: 'richText · full Markdown subset', block: { id: 'devRich001', type: 'richText', markdown: RICH_TEXT } },
  { label: 'callout · info', block: { id: 'devCall001', type: 'callout', tone: 'info', title: 'Sample info title', body: 'Sample info body with a [link](/pricing).' } },
  { label: 'callout · tip', block: { id: 'devCall002', type: 'callout', tone: 'tip', body: 'Sample tip without a title.' } },
  { label: 'callout · warning', block: { id: 'devCall003', type: 'callout', tone: 'warning', title: 'Sample warning', body: 'Sample warning body.\n\n- with a list\n- of two items' } },
  {
    label: 'sources',
    block: {
      id: 'devSrc0001',
      type: 'sources',
      items: [
        { title: 'Sample official page', url: 'https://fbr.gov.pk', publisher: 'FBR', accessedAt: '2026-10-01' },
        { title: 'Sample other page', url: 'https://example.com/article', publisher: 'Example', accessedAt: '2026-09-20T10:00:00Z' },
      ],
    },
  },
  { label: 'faq · the entry FAQs', block: { id: 'devFaq0001', type: 'faq' } },
  {
    label: 'cta · default band',
    block: { id: 'devCta0001', type: 'cta', heading: 'Sample call to action heading', body: 'Sample supporting line for the CTA band.', primaryCta: { label: 'Start free trial', href: 'https://app.nafaa.pk/signup' }, secondaryCta: { label: 'Talk to sales', href: '/contact' } },
  },
  {
    label: 'cta · on an ink section',
    block: { id: 'devCta0002', type: 'cta', theme: 'ink', heading: 'CTA directly on an ink band', primaryCta: { label: 'Get started', href: '/pricing' } },
  },
  {
    label: 'leadForm · contact',
    block: { id: 'devLead001', type: 'leadForm', heading: 'Sample contact form', intro: 'Sample intro. The form posts to /public/marketing/contact-form.', form: 'contact', formType: 'GENERAL', successMessage: 'Thanks, sample success message.', whatsapp: true },
  },
  {
    label: 'leadForm · demo',
    block: { id: 'devLead002', type: 'leadForm', theme: 'muted', heading: 'Sample demo form', form: 'demo', successMessage: 'Sample demo success message.' },
  },
  {
    label: 'leadForm · quote ("Quote lein")',
    block: { id: 'devLead003', type: 'leadForm', heading: 'Sample quote form', intro: 'Worldwide services: budget in PKR or USD.', form: 'quote', subjectPrefix: 'Custom software quote', currencies: ['USD', 'PKR'], successMessage: 'Sample quote success message.', whatsapp: true },
  },
  { label: 'tool', note: 'Renders through the Tool template (S5); the gallery passes a stand-in.', block: { id: 'devTool001', type: 'tool', toolKey: 'gst-calculator' } },
];

// ─── Entries ─────────────────────────────────────────────────────────────

const SEO = (title: string) => ({
  title,
  titleIncludesBrand: false,
  description: 'Sample description for the dev gallery.',
  canonical: `${SITE}/_dev/blocks`,
  robots: { index: false, follow: false, reason: 'editor' as const },
  ogImage: null,
  schemaExtra: [],
});

export const FIXTURE_ENTRY: PublicEntry = {
  id: 'dev-entry-page',
  type: 'PAGE',
  locale: 'en',
  path: '/sample-page',
  url: `${SITE}/sample-page`,
  title: 'Sample page title',
  summary: 'Sample entry summary used as the default short answer when the answer box has none.',
  blocks: FIXTURE_BLOCKS.map((item) => item.block),
  data: { type: 'PAGE', template: 'default' },
  seo: SEO('Sample page title'),
  image: null,
  author: null,
  reviewer: null,
  factCheckedAt: null,
  datePublished: NOW,
  dateModified: NOW,
  breadcrumbs: [
    { name: 'Home', path: '/', url: `${SITE}/` },
    { name: 'Sample page title', path: '/sample-page', url: `${SITE}/sample-page` },
  ],
  parent: null,
  children: [],
  tags: { INDUSTRY: FIXTURE_CARDS.filter((c) => c.type === 'INDUSTRY').slice(0, 3) },
  related: [FIXTURE_CARDS[7], FIXTURE_CARDS[15], FIXTURE_CARDS[16]].filter((c): c is EntryCard => Boolean(c)),
  faqs: FIXTURE_FAQS,
  alternates: [{ locale: 'en', path: '/sample-page', url: `${SITE}/sample-page` }],
  media: FIXTURE_MEDIA,
  quality: { wordCount: 0, gate: null, passed: false },
};

export const FIXTURE_CITY: PublicEntry = {
  ...FIXTURE_ENTRY,
  id: 'dev-entry-city',
  type: 'CITY',
  path: '/pos-software/sample-city',
  url: `${SITE}/pos-software/sample-city`,
  title: 'POS software in Sample City',
  blocks: [],
  data: {
    type: 'CITY',
    name: 'Sample City',
    province: 'Punjab',
    authority: 'PRA',
    wikidataId: 'Q11739',
    servicesTax: {
      rate: 'Sample rate',
      appliesTo: 'Sample text: which services the provincial sales tax applies to.',
      source: { title: 'Sample official source', url: 'https://pra.punjab.gov.pk', publisher: 'PRA', accessedAt: '2026-10-01' },
    },
    tier1Note: 'Sample note on which retailers must integrate their POS with FBR.',
    markets: [
      { name: 'Sample market one', area: 'Sample area', note: 'Sample note about the kind of shops in this market.' },
      { name: 'Sample market two', area: 'Another area', note: 'Sample note, a little longer, to check how cards of different heights line up.' },
      { name: 'Sample market three', note: 'Sample note without an area.' },
    ],
    areas: [
      { name: 'Sample area A', note: 'Sample note for an area heading (H3).' },
      { name: 'Sample area B', note: 'Sample note for another area.' },
      { name: 'Sample area C', note: 'Sample note.' },
      { name: 'Sample area D', note: 'Sample note.' },
    ],
    support: { onsite: true, note: 'Sample support note for this city.' },
    nearbyCityIds: ['dev-city-isb', 'dev-city-rwp', 'dev-city-fsd'],
  },
  seo: SEO('POS software in Sample City'),
};
