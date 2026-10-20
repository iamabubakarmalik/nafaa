/**
 * Development fixtures for the S5 templates (blog, guides, glossary, tools,
 * templates, team, changelog, developer docs and their hubs).
 *
 * Text is taken from the fact-checked seed (apps/api/prisma/seed-marketing-cms:
 * glossary definitions, the khata and gold posts, blog categories), from the
 * real public API v1 code (apps/api/src/integrations/public-api) and from
 * FBR's POS booklet (cited in components/islands/tools/facts.ts). The one
 * PERSON is an obvious placeholder: authors are real people the owner names
 * (O4). Nothing here is ever served in production.
 */
import type { Block, PublicMedia } from '@/lib/cms/contract/cms-contract';
import { bid, type FixtureSpec } from './build';

const md = (markdown: string): Block => ({ id: bid(), type: 'richText', markdown });

const FBR_BOOKLET = {
  title: 'POS Booklet (Sales Tax Act 1990, Sales Tax Rules 2006, Income Tax Ordinance 2001)',
  url: 'https://download1.fbr.gov.pk/Docs/202551615541769POSBooklet.pdf',
  publisher: 'Federal Board of Revenue',
  accessedAt: '2026-10-20',
};

// ─── Hubs (PAGE entries at the type roots) ───

const hubs: FixtureSpec[] = [
  {
    type: 'PAGE',
    path: '/blog',
    title: 'Blog',
    summary: 'Practical writing for shopkeepers in Pakistan: billing, stock, khata, FBR rules and running a growing business.',
    data: { type: 'PAGE', template: 'hub', hubOf: 'BLOG_POST' },
  },
  {
    type: 'PAGE',
    path: '/guides',
    title: 'Guides',
    summary: 'Long-form guides that cover one topic end to end, from FBR POS integration to pricing and margins, with every rule linked to its source.',
    data: { type: 'PAGE', template: 'hub', hubOf: 'GUIDE' },
  },
  {
    type: 'PAGE',
    path: '/glossary',
    title: 'Retail and business glossary',
    summary: 'Plain-language meanings of the words Pakistani shops use every day, from khata and udhaar to SKU, FIFO and Tier-1 retailer, in English and Roman Urdu.',
    data: { type: 'PAGE', template: 'hub', hubOf: 'GLOSSARY_TERM' },
  },
  {
    type: 'PAGE',
    path: '/tools',
    title: 'Free business tools',
    summary: 'Free calculators for shops in Pakistan: GST, profit margin, gold price, POS cost, a printable invoice and an FBR Tier-1 checker. No sign-up needed.',
    data: { type: 'PAGE', template: 'hub', hubOf: 'TOOL' },
  },
  {
    type: 'PAGE',
    path: '/templates',
    title: 'Free templates',
    summary: 'Free sheets and forms for running a shop: download, print or open them in Excel or Google Sheets.',
    data: { type: 'PAGE', template: 'hub', hubOf: 'TEMPLATE' },
  },
  {
    type: 'PAGE',
    path: '/team',
    title: 'Team',
    summary: 'The people who write, review and build Nafaa.',
    data: { type: 'PAGE', template: 'hub', hubOf: 'PERSON' },
  },
  {
    type: 'PAGE',
    path: '/changelog',
    title: 'Changelog',
    summary: 'What changed in Nafaa, newest first: new features, improvements and fixes.',
    data: { type: 'PAGE', template: 'hub', hubOf: 'CHANGELOG' },
  },
  {
    type: 'PAGE',
    path: '/customers',
    title: 'Customer stories',
    summary: 'How real shops run on Nafaa, told with their permission.',
    data: { type: 'PAGE', template: 'hub', hubOf: 'CASE_STUDY' },
  },
];

// ─── People ───

const people: FixtureSpec[] = [
  {
    type: 'PERSON',
    path: '/team/sample-author',
    title: 'Sample Author',
    summary: 'Placeholder author used only in local development. Real author pages come from PERSON entries the owner adds.',
    data: { type: 'PERSON', name: 'Sample Author', role: 'Editor', sameAs: [], knowsAbout: ['Retail operations', 'FBR POS integration', 'Inventory'] },
    blocks: [md('This profile is a development fixture. In production each author is a real person with a short bio, the topics they cover and links to their public profiles.')],
  },
];

// ─── Blog ───

const categories: FixtureSpec[] = [
  { type: 'BLOG_CATEGORY', path: '/blog/category/guides', title: 'How-to guides', summary: 'Step-by-step guides for running a shop in Pakistan: khata, stock, billing and setting up Nafaa.', data: { type: 'BLOG_CATEGORY', icon: 'book-open' }, sortOrder: 1 },
  { type: 'BLOG_CATEGORY', path: '/blog/category/industry', title: 'Industry guides', summary: 'Practical notes for specific businesses: kiryana, pharmacy, restaurant, jewellery and more.', data: { type: 'BLOG_CATEGORY', icon: 'store' }, sortOrder: 2 },
  { type: 'BLOG_CATEGORY', path: '/blog/category/compliance', title: 'FBR and tax', summary: 'FBR POS integration, provincial sales tax and other rules shops must follow, with official sources.', data: { type: 'BLOG_CATEGORY', icon: 'landmark' }, sortOrder: 3 },
  { type: 'BLOG_CATEGORY', path: '/blog/category/business', title: 'Running a business', summary: 'Customers, staff, seasons and growth for small and mid-size shops.', data: { type: 'BLOG_CATEGORY', icon: 'trending-up' }, sortOrder: 4 },
];

const KHATA_BODY = `A paper khata works until the day it does not. Pages tear, ink fades, a register gets wet in the rain or lost in a move, and finding one customer's balance means flipping through months of entries. Most of all, a paper register cannot remind anyone: the shopkeeper has to remember who owes what and then make an awkward phone call.

## What a digital khata does differently

In Nafaa the khata sits next to the counter, so an udhaar sale goes onto the customer's account the moment the bill is made. Each customer has one running balance with every sale on credit and every payment against it.

- **Old balances come with you.** When you switch, you enter each customer's balance from the old register once, and the khata carries it forward.
- **Payments in parts.** A customer can pay some today and the rest later; the balance updates on its own.
- **Reminders on WhatsApp.** From the khata you send a customer a WhatsApp message with their balance in one tap. Reminders go one by one from your own WhatsApp, and the wording gets firmer as the udhaar gets older.
- **One balance across counters.** Every counter and staff member sees the same balance, so it is the same wherever the customer buys.

## How to switch in one sitting

1. Sign up for Nafaa and open the khata.
2. Add your regular customers with their WhatsApp numbers.
3. Enter each customer's current balance from the paper register.
4. From the next sale on, put udhaar on the customer's account at the counter.
5. Keep the paper register for a few weeks as a backup, then retire it.`;

const GOLD_BODY = `Gold jewellery in Pakistan is priced from three parts: the gold itself, the making charge (mazdoori) and the wastage allowance. Tax is added on top where it applies. Getting each part right, and showing it clearly on the bill, is what keeps a customer coming back.

## Karat and purity

Purity is measured in karats. Pure gold is 24 karat; lower karats are alloys with other metals.

| Karat | Gold content |
|-------|--------------|
| 24K | 99.9% |
| 22K | 91.67% |
| 21K | 87.5% |
| 18K | 75% |

When a customer asks for 22K jewellery, 22 parts in 24 of its weight are gold.

## The daily rate

The gold rate moves with the international price and the rupee. Jewellers set the day's rate per tola (11.66 grams) or per 10 grams for each karat and price every sale from it.

## Making charges

Making charges pay for the work. They are set either as a percentage of the gold value or as a fixed amount per tola or per gram, and handmade or detailed pieces cost more to make than machine-made ones.

## Wastage

Wastage covers the gold lost while making a piece. It is usually added as a percentage of the weight, so the customer pays for slightly more gold than the finished weight.

## Putting it together

1. Gold value = weight × today's rate for that karat.
2. Wastage = gold value × wastage percentage (or extra weight × rate).
3. Making = a percentage of the gold value, or a rate per tola or gram.
4. Add tax where it applies, then total.

In Nafaa a jeweller sets today's gold and silver rate once, and each piece carries its metal, weight and stones, so the counter prices from the current rate.`;

const posts: FixtureSpec[] = [
  {
    type: 'BLOG_POST',
    path: '/blog/digital-khata-vs-paper-ledger',
    title: 'Digital Khata vs Paper Register: What Changes for Your Shop',
    summary: 'Why paper khata registers lose money and time, what a digital khata does differently, and how to move your old balances into Nafaa in one sitting.',
    data: { type: 'BLOG_POST', toc: true, readingMinutes: 3 },
    blocks: [md(KHATA_BODY), { id: bid(), type: 'cta', heading: 'Move your khata in one sitting', body: 'Add your customers and their balances once; every udhaar sale after that goes on their account.', primaryCta: { label: 'See plans', href: '/pricing' } }],
    tags: ['/blog/category/guides', '/glossary/khata', '/glossary/udhaar'],
    related: ['/blog/gold-rate-pricing-jewelry-shops', '/guides/fbr-pos-integration'],
    author: '/team/sample-author',
    published: '2026-10-06T09:00:00.000Z',
    updated: '2026-10-18T09:00:00.000Z',
  },
  {
    type: 'BLOG_POST',
    path: '/blog/gold-rate-pricing-jewelry-shops',
    title: 'How Jewellery Shops Price Gold in Pakistan',
    summary: 'Karat and purity, the daily rate, making charges and wastage: how a jewellery bill is built, and how to show each part clearly to the customer.',
    data: { type: 'BLOG_POST', toc: true, readingMinutes: 3 },
    blocks: [md(GOLD_BODY), { id: bid(), type: 'callout', tone: 'tip', title: 'Try it with your own numbers', body: 'The [gold price calculator](/tools/gold-rate-calculator) builds the same bill from today\'s rate, the weight in tola, masha and ratti, wastage and making.' }],
    tags: ['/blog/category/industry'],
    related: ['/blog/digital-khata-vs-paper-ledger'],
    author: '/team/sample-author',
    published: '2026-10-02T09:00:00.000Z',
    updated: '2026-10-15T09:00:00.000Z',
  },
  {
    type: 'BLOG_POST',
    path: '/blog/fbr-e-invoicing-complete-guide-2026',
    title: 'FBR POS Integration and E-Invoicing: A Guide for Shops',
    summary: 'What FBR POS integration asks of retailers, who it applies to and how to get set up, with each rule linked to the FBR notice it comes from.',
    data: { type: 'BLOG_POST', toc: true, readingMinutes: 2 },
    blocks: [
      md(`This guide explains what FBR POS integration asks of retailers, who it applies to, and how a shop gets set up. Rules and thresholds change through SROs and Finance Acts, so every rule here links to the official text it comes from.

## Who has to integrate

Section 3(9A) of the Sales Tax Act, 1990 requires Tier-1 retailers to integrate their outlets with FBR's computerised system for real-time reporting of sales. Who counts as Tier-1 is set by section 2(43A); the [FBR Tier-1 checker](/tools/fbr-tier-1-checker) walks through each category.

## What happens without integration

If a Tier-1 retailer does not integrate an outlet during a tax period, the adjustable input tax for that whole period is reduced by 60% (section 8B(6)).`),
      { id: bid(), type: 'sources', items: [FBR_BOOKLET] },
    ],
    tags: ['/blog/category/compliance', '/glossary/fbr-pos', '/glossary/tier-1-retailer'],
    related: ['/guides/fbr-pos-integration'],
    published: '2026-09-28T09:00:00.000Z',
    updated: '2026-10-12T09:00:00.000Z',
  },
];

// ─── Guides (pillars) ───

const guides: FixtureSpec[] = [
  {
    type: 'GUIDE',
    path: '/guides/fbr-pos-integration',
    title: 'FBR POS Integration: Who Must Integrate and What It Involves',
    summary: 'A Tier-1 retailer must link each outlet\'s POS with FBR for real-time reporting of sales. This guide covers who is Tier-1, what happens without integration, and the tax credit for POS machines, with the law text for each point.',
    data: { type: 'GUIDE', toc: true, readingMinutes: 4 },
    blocks: [
      md(`Section 3(9A) of the Sales Tax Act, 1990 requires every Tier-1 retailer to integrate its retail outlets with FBR's computerised system, so that each sale is reported as it happens. This guide sets out who that covers and what follows, using the text FBR publishes in its POS booklet.

## Who is a Tier-1 retailer

Under section 2(43A), a retailer is Tier-1 if it falls in any one of these categories:

- **(a)** a unit of a national or international chain of stores;
- **(b)** a retailer in an air-conditioned shopping mall, plaza or centre, excluding kiosks;
- **(c)** a retailer whose total electricity bill for the last twelve consecutive months is more than Rs 1,200,000;
- **(d)** a wholesaler-cum-retailer that imports consumer goods in bulk and sells both wholesale to retailers and retail to the public;
- **(f)** a retailer with a card machine from a bank or an SBP-authorised payment provider for debit or credit card payments;
- **(g)** a retailer whose advance tax deductible under sections 236G or 236H of the Income Tax Ordinance in the last twelve months crossed the threshold FBR notifies;
- **(h)** any other person or class FBR prescribes.

Clause (e) is shown as deleted in the booklet. One category is enough.

## What happens without integration

- The adjustable input tax for a tax period in which an outlet was not integrated is reduced by 60% (section 8B(6)).
- FBR can direct gas and electricity companies to disconnect notified Tier-1 retailers who do not integrate (section 14AB).

## Tax credit for POS machines

Section 64D of the Income Tax Ordinance gives an integrated person a tax credit for the amount invested in a POS machine: the lesser of the actual cost or Rs 150,000 per machine.`),
      {
        id: bid(),
        type: 'steps',
        heading: 'Getting ready to integrate',
        items: [
          { title: 'Check whether you are Tier-1', body: 'Go through each category above, or use the [Tier-1 checker](/tools/fbr-tier-1-checker).' },
          { title: 'Have your registration ready', body: 'Integration is for registered persons; keep your NTN and sales tax registration details at hand.' },
          { title: 'Use POS software that can report to FBR', body: 'Each sale is reported from the counter and the invoice carries the FBR invoice number and QR code.' },
        ],
      },
      { id: bid(), type: 'sources', items: [FBR_BOOKLET] },
    ],
    faqs: [
      { q: 'Does one category make a shop Tier-1?', a: 'Yes. Section 2(43A) says a retailer falling in any one or more of the categories is a Tier-1 retailer.' },
      { q: 'What does a Tier-1 retailer lose without integration?', a: 'For a tax period in which an outlet is not integrated, the adjustable input tax for the whole period is reduced by 60% (section 8B(6) of the Sales Tax Act).' },
    ],
    tags: ['/glossary/tier-1-retailer', '/glossary/fbr-pos'],
    related: ['/blog/fbr-e-invoicing-complete-guide-2026', '/tools/fbr-tier-1-checker', '/tools/gst-calculator'],
    author: '/team/sample-author',
    reviewer: '/team/sample-author',
    published: '2026-10-08T09:00:00.000Z',
    updated: '2026-10-19T09:00:00.000Z',
    sortOrder: 1,
  },
  {
    type: 'GUIDE',
    path: '/guides/profit-margin-and-markup',
    title: 'Profit Margin and Markup: How to Price Stock Without Losing Money',
    summary: 'Margin is profit as a share of the selling price; markup is profit as a share of cost. Mixing them up is the most common pricing mistake in a shop. This guide shows the formulas and how to set prices from either one.',
    data: { type: 'GUIDE', toc: true, readingMinutes: 3 },
    blocks: [
      md(`Margin and markup both describe profit, but against different bases. Margin compares profit with the selling price; markup compares it with the cost. A shop that adds 25% to cost and thinks it earns a 25% margin is wrong: the margin is 20%.

## The formulas

| Measure | Formula |
|---|---|
| Profit | Selling price − cost |
| Margin | Profit ÷ selling price × 100 |
| Markup | Profit ÷ cost × 100 |

## Setting a price from a target margin

Price = cost ÷ (1 − margin ÷ 100). For an item that costs Rs 800 and a 20% target margin: 800 ÷ 0.8 = Rs 1,000.

## Setting a price from a markup

Price = cost × (1 + markup ÷ 100). The same Rs 800 item with a 25% markup also sells for Rs 1,000, which is why a 25% markup and a 20% margin are the same price.

## Include every cost

Cost should include freight, loading and anything else paid to get the stock onto the shelf. Leaving these out makes every margin look better than it is.`),
      { id: bid(), type: 'callout', tone: 'tip', title: 'Check your own numbers', body: 'The [profit margin calculator](/tools/profit-margin-calculator) works out margin and markup from cost and price, or the price for a target margin.' },
    ],
    related: ['/tools/profit-margin-calculator', '/glossary/sku'],
    author: '/team/sample-author',
    published: '2026-10-04T09:00:00.000Z',
    updated: '2026-10-14T09:00:00.000Z',
    sortOrder: 2,
  },
];

// ─── Glossary (definitions from the seed, fact-checked 20 Oct 2026) ───

interface TermSpec {
  slug: string;
  term: string;
  definition: string;
  romanUrdu: string;
  example?: string;
  aka?: string[];
  related?: string[];
}

const TERMS: TermSpec[] = [
  { slug: 'pos', term: 'POS (Point of Sale)', definition: 'The point of sale is where a sale is completed: items are scanned or picked, payment is taken and a receipt is given.', romanUrdu: 'POS woh jagah ya system hai jahan sale mukammal hoti hai: cheezein scan hoti hain, payment li jati hai aur raseed di jati hai.', example: 'A kiryana store scans a packet of biscuits, takes payment and prints the bill.', aka: ['point of sale', 'billing system', 'counter software'], related: ['khata', 'fbr-pos'] },
  { slug: 'khata', term: 'Khata', definition: 'A khata is a ledger, traditionally a paper register, that records what each customer owes a shop on credit and what they have paid back.', romanUrdu: 'Khata woh register hai jis me dukandar likhta hai ke kis gahak ne kitna udhaar liya aur kitna wapas kiya.', example: 'A shopkeeper writes the amount against a regular customer who will pay at the end of the month.', aka: ['ledger', 'udhaar register', 'digital khata'], related: ['udhaar'] },
  { slug: 'udhaar', term: 'Udhaar', definition: 'Udhaar is credit given to a customer: goods are taken now and paid for later.', romanUrdu: 'Udhaar ka matlab hai saman abhi le lena aur paise baad me dena.', aka: ['udhar', 'credit sale', 'buy now pay later'], related: ['khata'] },
  { slug: 'fbr-pos', term: 'FBR POS Integration', definition: "FBR POS integration is the live link between a retailer's point of sale and the Federal Board of Revenue, so that each sale invoice is reported to FBR and carries an FBR invoice number and QR code.", romanUrdu: 'FBR POS integration ka matlab hai dukaan ka POS FBR se juda ho, taake har bill FBR ko jaye aur us par FBR invoice number aur QR code ho.', aka: ['FBR POS', 'FBR integration', 'POS integration'], related: ['tier-1-retailer', 'pos'] },
  { slug: 'tier-1-retailer', term: 'Tier-1 Retailer', definition: 'Tier-1 retailer is the sales tax category for larger retailers, such as chain-store outlets and shops in air-conditioned malls, that must integrate their POS with FBR.', romanUrdu: 'Tier-1 retailer badi dukaanon ki sales tax category hai, jaise chain stores aur AC malls ki dukaanein, jin ke liye POS ko FBR se jodna zaroori hai.', aka: ['tier 1', 'tier-I retailer'], related: ['fbr-pos', 'ntn'] },
  { slug: 'ntn', term: 'NTN (National Tax Number)', definition: "The National Tax Number is a taxpayer's identification number with FBR, obtained through FBR's IRIS portal.", romanUrdu: 'NTN FBR ke saath taxpayer ki pehchan ka number hai, jo IRIS portal se milta hai.', aka: ['national tax number', 'tax number'], related: ['strn'] },
  { slug: 'strn', term: 'STRN (Sales Tax Registration Number)', definition: 'The Sales Tax Registration Number identifies a business registered with FBR for sales tax.', romanUrdu: 'STRN us business ka number hai jo FBR ke paas sales tax ke liye registered ho.', aka: ['sales tax registration number', 'sales tax number'], related: ['ntn'] },
  { slug: 'raast', term: 'Raast', definition: "Raast is the State Bank of Pakistan's instant payment system for real-time transfers between bank and wallet accounts, using a Raast ID such as a mobile number.", romanUrdu: 'Raast State Bank ka instant payment system hai jis se bank aur wallet accounts me foran paise jaate hain, mobile number jaisi Raast ID se.', aka: ['Raast ID', 'SBP Raast'] },
  { slug: 'imei', term: 'IMEI', definition: 'An IMEI is the 15-digit number that identifies a mobile phone handset.', romanUrdu: 'IMEI 15 hindson ka number hai jo har mobile phone ki alag pehchan hai.', example: 'A mobile shop records the IMEI of each phone it buys and sells.', aka: ['IMEI number'], related: ['pta-approved'] },
  { slug: 'pta-approved', term: 'PTA Approved', definition: 'A PTA-approved phone is a handset registered with the Pakistan Telecommunication Authority, so it keeps working on Pakistani mobile networks.', romanUrdu: 'PTA approved phone woh hai jo PTA ke paas registered ho, is liye Pakistan ke mobile networks par chalta rehta hai.', aka: ['PTA registered', 'PTA approved phone'], related: ['imei'] },
  { slug: 'sku', term: 'SKU (Stock Keeping Unit)', definition: 'An SKU is a code for one exact product variant in stock, so each size, colour or pack size is counted separately.', romanUrdu: 'SKU har product ki har qism ka alag code hai, taake har size, rang ya pack alag gina jaye.', example: 'A kurta in medium green and the same kurta in large green are two SKUs.', aka: ['stock keeping unit', 'item code'], related: ['fifo'] },
  { slug: 'fifo', term: 'FIFO (First In, First Out)', definition: 'FIFO is the stock rule that the oldest stock is sold first.', romanUrdu: 'FIFO ka matlab hai jo maal pehle aaya woh pehle bike.', example: 'Pharmacies and bakeries use FIFO so that older stock is sold before it expires.', aka: ['first in first out'], related: ['batch-tracking'] },
  { slug: 'batch-tracking', term: 'Batch Tracking', definition: 'Batch tracking records each purchase lot separately with its own expiry date.', romanUrdu: 'Batch tracking me har khareed ka lot apni expiry date ke saath alag rakha jata hai.', example: 'A pharmacy holds two batches of the same syrup that expire in different months.', aka: ['lot tracking', 'batch and expiry'], related: ['fifo'] },
  { slug: 'kot', term: 'KOT (Kitchen Order Ticket)', definition: 'A KOT is the ticket, printed or on a screen, that tells the kitchen what to cook for an order.', romanUrdu: 'KOT woh parchi ya screen hai jo kitchen ko batati hai ke order me kya pakana hai.', example: 'A restaurant sends tandoor items to the tandoor station and drinks to the bar.', aka: ['kitchen order ticket', 'kitchen ticket'] },
  { slug: 'cod', term: 'COD (Cash on Delivery)', definition: 'Cash on delivery means the customer pays when the order is delivered, not when it is placed.', romanUrdu: 'COD ka matlab hai gahak order milne par paise deta hai, order dete waqt nahi.', aka: ['cash on delivery'] },
  { slug: 'gmv', term: 'GMV (Gross Merchandise Value)', definition: 'GMV is the total value of goods sold through a platform before fees, returns and discounts are taken off.', romanUrdu: 'GMV platform par bikne wale saman ki kul qeemat hai, fees aur returns katne se pehle.', aka: ['gross merchandise value'] },
  { slug: 'layaway', term: 'Layaway', definition: 'Layaway is reserving an item and paying for it in parts; the customer takes it home once it is fully paid.', romanUrdu: 'Layaway me gahak cheez rakhwa leta hai aur qiston me paise deta hai; poore paise dene par le jata hai.', example: 'A bridal dress is held while the customer pays over three months.', aka: ['qist plan', 'reservation'] },
  { slug: 'escrow', term: 'Escrow', definition: 'Escrow is when a neutral party holds a payment until both buyer and seller have done their part.', romanUrdu: 'Escrow me ek beech ka fareeq paise tab tak rakhta hai jab tak khareedar aur bechne wala dono apna kaam poora na kar dein.', aka: ['escrow payment'] },
];

const glossary: FixtureSpec[] = TERMS.map((t, i) => ({
  type: 'GLOSSARY_TERM',
  path: `/glossary/${t.slug}`,
  title: t.term,
  summary: t.definition,
  data: {
    type: 'GLOSSARY_TERM',
    term: t.term,
    definition: t.definition,
    definitionRomanUrdu: t.romanUrdu,
    ...(t.example ? { example: t.example } : {}),
    alsoKnownAs: t.aka ?? [],
  },
  related: (t.related ?? []).map((slug) => `/glossary/${slug}`),
  sortOrder: i + 1,
}));
// Cross-links from terms to the guides and tools that explain them.
for (const spec of glossary) {
  if (spec.path === '/glossary/tier-1-retailer' || spec.path === '/glossary/fbr-pos') spec.related = [...(spec.related ?? []), '/guides/fbr-pos-integration', '/tools/fbr-tier-1-checker'];
  if (spec.path === '/glossary/khata') spec.related = [...(spec.related ?? []), '/blog/digital-khata-vs-paper-ledger'];
}

// ─── Tools ───

const tools: FixtureSpec[] = [
  {
    type: 'TOOL',
    path: '/tools/gst-calculator',
    title: 'GST Calculator',
    summary: 'Add 18% sales tax to a price or take it out of a tax-inclusive price, with the formula and the FBR source for the rate. Other rates can be typed in.',
    data: { type: 'TOOL', toolKey: 'gst-calculator', kind: 'GST' },
    blocks: [
      { id: bid(), type: 'tool', toolKey: 'gst-calculator' },
      md(`## How it's calculated

- **Adding GST:** GST = price × rate ÷ 100, and the price with tax = price + GST.
- **Removing GST:** price before tax = price with tax ÷ (1 + rate ÷ 100).

At 18%, a Rs 1,000 price becomes Rs 1,180 with tax, and a Rs 1,180 tax-inclusive price has Rs 180 of tax in it.`),
    ],
    faqs: [
      { q: 'Why can I not just take 18% off a tax-inclusive price?', a: 'Because the tax was charged on the price before tax, not on the total. Taking 18% off Rs 1,180 gives Rs 967.60, but the price before tax was Rs 1,000. Divide by 1.18 instead.' },
      { q: 'Does this work for services?', a: 'Yes, if you type the rate that applies. Services are taxed by the provinces at their own rates, so pick "Other rate" and enter it.' },
    ],
    related: ['/tools/profit-margin-calculator', '/guides/fbr-pos-integration'],
    sortOrder: 1,
  },
  {
    type: 'TOOL',
    path: '/tools/profit-margin-calculator',
    title: 'Profit Margin Calculator',
    summary: 'Work out profit, margin and markup from cost and selling price, or the price to set for a target margin or markup. Plain arithmetic, nothing stored.',
    data: { type: 'TOOL', toolKey: 'profit-margin-calculator', kind: 'Profit margin' },
    blocks: [{ id: bid(), type: 'tool', toolKey: 'profit-margin-calculator' }, md('## How it\'s calculated\n\nMargin = profit ÷ selling price × 100. Markup = profit ÷ cost × 100. Price for a target margin = cost ÷ (1 − margin ÷ 100).')],
    faqs: [{ q: 'Is a 25% markup the same as a 25% margin?', a: 'No. A 25% markup on a Rs 800 cost gives a Rs 1,000 price, and Rs 200 profit on Rs 1,000 is a 20% margin.' }],
    related: ['/guides/profit-margin-and-markup', '/tools/gst-calculator'],
    sortOrder: 2,
  },
  {
    type: 'TOOL',
    path: '/tools/gold-rate-calculator',
    title: 'Gold Price Calculator',
    summary: 'Price a gold piece from today\'s rate, its karat and weight in tola, masha and ratti or grams, plus wastage, making charges and tax.',
    data: { type: 'TOOL', toolKey: 'gold-rate-calculator', kind: 'Gold price' },
    blocks: [{ id: bid(), type: 'tool', toolKey: 'gold-rate-calculator' }, md('## How it\'s calculated\n\nGold value = weight in tola × today\'s rate for the karat. A 22K rate is 22/24 of the 24K rate. Wastage and making are added on the gold value, then tax where it applies. 1 tola = 11.6638 g = 12 masha, and 1 masha = 8 ratti.')],
    related: ['/blog/gold-rate-pricing-jewelry-shops'],
    sortOrder: 3,
  },
  {
    type: 'TOOL',
    path: '/tools/pos-cost-calculator',
    title: 'POS Cost Calculator',
    summary: 'Add up what a POS really costs over one to three years: the Nafaa plan from today\'s prices, the hardware you are quoted and other running costs.',
    data: { type: 'TOOL', toolKey: 'pos-cost-calculator', kind: 'POS cost' },
    blocks: [{ id: bid(), type: 'tool', toolKey: 'pos-cost-calculator' }],
    related: ['/tools/fbr-tier-1-checker'],
    sortOrder: 4,
  },
  {
    type: 'TOOL',
    path: '/tools/invoice-generator',
    title: 'Invoice Generator',
    summary: 'Make a clean, printable invoice in the browser: your business, the customer, items, discount and tax. Print it or save it as PDF. Nothing is uploaded.',
    data: { type: 'TOOL', toolKey: 'invoice-generator', kind: 'Invoice' },
    blocks: [{ id: bid(), type: 'tool', toolKey: 'invoice-generator' }],
    related: ['/tools/gst-calculator'],
    sortOrder: 5,
  },
  {
    type: 'TOOL',
    path: '/tools/fbr-tier-1-checker',
    title: 'FBR Tier-1 Checker',
    summary: 'Answer six questions taken from section 2(43A) of the Sales Tax Act to see whether your shop is a Tier-1 retailer that must integrate its POS with FBR.',
    data: { type: 'TOOL', toolKey: 'fbr-tier-1-checker', kind: 'Tier-1' },
    blocks: [{ id: bid(), type: 'tool', toolKey: 'fbr-tier-1-checker' }, { id: bid(), type: 'sources', items: [FBR_BOOKLET] }],
    faqs: [{ q: 'What if I answer "not sure"?', a: 'The checker lists the categories you were not sure about. If any of them applies, you are Tier-1; your electricity bills, card machine agreement and supplier invoices show most of them.' }],
    related: ['/guides/fbr-pos-integration', '/glossary/tier-1-retailer'],
    sortOrder: 6,
  },
];

// ─── Templates (downloads) ───

const CASH_SHEET_CSV = 'Date,Opening cash,Cash sales,Cash received (udhaar),Cash paid out,Expected cash,Counted cash,Difference\n,,,,,,,\n';
const cashSheet: PublicMedia = {
  id: 'fixture__media-cash-sheet',
  kind: 'DOCUMENT',
  publicId: 'fixture/daily-cash-sheet',
  url: `data:text/csv;charset=utf-8,${encodeURIComponent(CASH_SHEET_CSV)}`,
  width: null,
  height: null,
  alt: 'Daily cash sheet (CSV)',
  mimeType: 'text/csv',
  bytes: CASH_SHEET_CSV.length,
};

const templates: FixtureSpec[] = [
  {
    type: 'TEMPLATE',
    path: '/templates/daily-cash-sheet',
    title: 'Daily Cash Sheet for Shops',
    summary: 'A one-page sheet to close the counter each day: opening cash, cash sales, udhaar received, cash paid out, and the difference between expected and counted cash.',
    data: { type: 'TEMPLATE', fileMediaId: cashSheet.id, format: 'csv' },
    media: [cashSheet],
    blocks: [
      md(`## How to use it

1. Write the opening cash at the start of the day.
2. At closing, add cash sales and udhaar payments received, and subtract cash paid out. That is the expected cash.
3. Count the drawer and write the counted cash. The difference column shows any shortage or excess.

Open the file in Excel or Google Sheets, or print it and fill it by hand.`),
    ],
    related: ['/blog/digital-khata-vs-paper-ledger'],
  },
];

// ─── Changelog ───

const changelog: FixtureSpec[] = [
  {
    type: 'CHANGELOG',
    path: '/changelog/shopify-app-install',
    title: 'Install Nafaa from the Shopify app flow',
    summary: 'Shopify stores can now connect to Nafaa through the Shopify app install flow.',
    data: { type: 'CHANGELOG', date: '2026-10-14', kind: 'new' },
    blocks: [md('Shopify store owners can now connect their store to Nafaa through the Shopify app install flow.')],
  },
  {
    type: 'CHANGELOG',
    path: '/changelog/refund-pin-at-counter',
    title: 'Refunds at the counter ask for a PIN',
    summary: 'Counter rules now apply at checkout: refunds ask for a PIN by default.',
    data: { type: 'CHANGELOG', date: '2026-10-13', kind: 'improved' },
    blocks: [md('Refunds at the counter now ask for a PIN by default, and shop owners can change the rule in settings.')],
  },
];

// ─── Developer docs (public API v1, from apps/api/src/integrations/public-api) ───

const docs: FixtureSpec[] = [
  {
    type: 'DOC',
    path: '/developers',
    title: 'Nafaa API',
    summary: 'Read products, stock, customers, sales and online orders from your Nafaa business, create customers, and get webhooks when something happens. REST over HTTPS with JSON, authenticated with an API key.',
    data: { type: 'DOC', navTitle: 'Overview' },
    blocks: [
      md(`The Nafaa API is a REST API at \`https://api.nafaa.pk/api/v1\`. Every request is authenticated with an API key from **Settings → Developer** in the Nafaa app, sent as a bearer token. Responses are JSON.

## What you can do

- Read **products** (by id, SKU or barcode), **stock**, **customers**, **sales** and **online orders**.
- Create a **customer** (with a write key; the same phone number returns the existing customer).
- Subscribe to **webhooks** such as \`sale.created\` or \`stock.low\`, which Zapier and Make can use as REST hooks.

## Your first request

\`GET /v1/me\` tells you which business a key belongs to, so it is the quickest way to test a key.`),
      {
        id: bid(),
        type: 'codeSample',
        heading: 'Test your key',
        tabs: [
          { label: 'curl', language: 'bash', code: 'curl https://api.nafaa.pk/api/v1/me \\\n  -H "Authorization: Bearer nfk_your_key"' },
          { label: 'JavaScript', language: 'js', code: "const res = await fetch('https://api.nafaa.pk/api/v1/me', {\n  headers: { Authorization: `Bearer ${process.env.NAFAA_API_KEY}` },\n});\nconsole.log(await res.json());" },
          { label: 'Python', language: 'python', code: "import os, requests\n\nres = requests.get(\n    'https://api.nafaa.pk/api/v1/me',\n    headers={'Authorization': f\"Bearer {os.environ['NAFAA_API_KEY']}\"},\n)\nprint(res.json())" },
        ],
      },
      md(`## Pagination

List endpoints take \`limit\` (1 to 100, default 50) and \`page\` (from 1), and return \`{ data, page, limit, hasMore }\`. Keep asking for the next page while \`hasMore\` is true. Use \`updated_since\` to fetch only what changed.

## Limits

Each key can make 120 requests a minute.`),
    ],
    sortOrder: 0,
  },
  {
    type: 'DOC',
    path: '/developers/authentication',
    title: 'Authentication',
    summary: 'Create an API key in Settings → Developer and send it as a bearer token. Read keys can list data; write keys can also create customers.',
    data: { type: 'DOC', navTitle: 'Authentication' },
    blocks: [
      md(`Create a key in the Nafaa app under **Settings → Developer**. Keys start with \`nfk_\`. Store them in a secret manager or environment variable, never in a browser app.

Send the key in the \`Authorization\` header on every request:

\`\`\`http
GET /api/v1/products HTTP/1.1
Host: api.nafaa.pk
Authorization: Bearer nfk_your_key
\`\`\`

A missing or wrong key returns \`401\` with \`error: "invalid_key"\`. Creating customers needs a key with write scope.`),
    ],
    sortOrder: 1,
  },
  {
    type: 'DOC',
    path: '/developers/products',
    title: 'List products',
    summary: 'GET /v1/products returns your products page by page; GET /v1/products/{id} finds one product by id, SKU or barcode.',
    data: { type: 'DOC', navTitle: 'Products', apiRef: { method: 'GET', path: '/v1/products' } },
    blocks: [
      md('Returns products in pages. Filter with `search`, or use `updated_since` to sync only what changed since your last run.'),
      {
        id: bid(),
        type: 'codeSample',
        tabs: [
          { label: 'curl', language: 'bash', code: 'curl "https://api.nafaa.pk/api/v1/products?limit=50&page=1" \\\n  -H "Authorization: Bearer nfk_your_key"' },
          { label: 'Response', language: 'json', code: '{\n  "data": [ /* products */ ],\n  "page": 1,\n  "limit": 50,\n  "hasMore": true\n}' },
        ],
      },
    ],
    sortOrder: 2,
  },
  {
    type: 'DOC',
    path: '/developers/webhooks',
    title: 'Webhooks',
    summary: 'Subscribe a URL to events such as sale.created, customer.created, online order updates and stock.low. Each delivery is signed so you can verify it came from Nafaa.',
    data: { type: 'DOC', navTitle: 'Webhooks', apiRef: { method: 'POST', path: '/v1/webhooks' } },
    blocks: [
      md(`Subscribe with \`POST /v1/webhooks\` and a body of \`{ "url": "https://example.com/hooks/nafaa", "events": ["sale.created"] }\`. \`GET /v1/webhooks/events\` lists every event, and \`DELETE /v1/webhooks/{id}\` unsubscribes.

## Events

\`sale.created\`, \`customer.created\`, \`online_order.created\`, \`online_order.accepted\`, \`online_order.dispatched\`, \`online_order.delivered\`, \`online_order.cancelled\`, \`online_order.returned\` and \`stock.low\`.

## Verifying a delivery

Each request carries \`X-Nafaa-Event\`, \`X-Nafaa-Delivery\` (the event id; ignore repeats), \`X-Nafaa-Timestamp\` and \`X-Nafaa-Signature: t=<timestamp>,v1=<hex>\`. The signature is an HMAC-SHA256 of \`<timestamp>.<raw body>\` with your webhook secret.`),
      {
        id: bid(),
        type: 'codeSample',
        heading: 'Verify the signature',
        tabs: [
          {
            label: 'Node.js',
            language: 'js',
            code: "import crypto from 'node:crypto';\n\nexport function verify(rawBody, header, secret) {\n  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));\n  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');\n  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));\n}",
          },
          {
            label: 'Python',
            language: 'python',
            code: "import hmac, hashlib\n\ndef verify(raw_body: bytes, header: str, secret: str) -> bool:\n    parts = dict(p.split('=', 1) for p in header.split(','))\n    signed = parts['t'].encode() + b'.' + raw_body\n    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()\n    return hmac.compare_digest(expected, parts['v1'])",
          },
        ],
      },
    ],
    sortOrder: 3,
  },
];

export const FIXTURE_SPECS: FixtureSpec[] = [...hubs, ...people, ...categories, ...posts, ...guides, ...glossary, ...tools, ...templates, ...changelog, ...docs];
