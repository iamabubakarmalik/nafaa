/**
 * Blog posts and categories imported from apps/marketing blog/posts.ts (12
 * posts). Three posts had real bodies; they keep only what could be checked
 * (product behaviour against the code, plain trade knowledge) and lose every
 * invented number, survey, customer and rate. The other nine stay drafts with
 * their outline in hidden writer notes for W12. The fake authors (Fatima Khan,
 * Ahmed Malik, Hassan Raza, Zara Ahmed, Bilal Sheikh) are dropped; posts get a
 * real PERSON author once the owner names one (O4).
 * The 8 old slugs from blog.ts become redirects (content/redirects.ts).
 */

import { richText, withIds, writerNotes } from '../../lib/blocks';
import type { IconName } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import type { EntryRef, SeedEntry } from '../../lib/types';

const CHECKED_ON = '2026-10-20';
const ORIGIN = 'apps/marketing/src/lib/data/blog/posts.ts';
const FAKE_AUTHOR = 'Fake author persona from blog/types.ts (no such person on record).';

// ─── Categories ───

interface CategorySpec { slug: string; title: string; summary: string; icon: IconName }
const CATEGORIES: CategorySpec[] = [
  { slug: 'guides', title: 'How-to guides', summary: 'Step-by-step guides for running a shop in Pakistan: khata, stock, billing and setting up Nafaa.', icon: 'book-open' },
  { slug: 'industry', title: 'Industry guides', summary: 'Practical notes for specific businesses: kiryana, pharmacy, restaurant, jewellery and more.', icon: 'store' },
  { slug: 'compliance', title: 'FBR and tax', summary: 'FBR POS integration, provincial sales tax and other rules shops must follow, with official sources.', icon: 'landmark' },
  { slug: 'business', title: 'Running a business', summary: 'Customers, staff, seasons and growth for small and mid-size shops.', icon: 'trending-up' },
  { slug: 'product', title: 'Product news', summary: 'What is new in Nafaa, and what is coming next.', icon: 'sparkles' },
];

export const blogCategories: SeedEntry[] = CATEGORIES.map((c, i) => ({
  type: 'BLOG_CATEGORY',
  slug: c.slug,
  title: c.title,
  summary: c.summary,
  data: { icon: c.icon },
  blocks: withIds(`BLOG_CATEGORY:${c.slug}`, [richText(c.summary)]),
  sortOrder: i + 1,
  origin: `apps/marketing/src/lib/data/blog/types.ts#blogCategories.${c.slug}`,
  evidence: [],
  factCheck: { checkedOn: CHECKED_ON, note: 'Category labels rewritten; no claims.' },
  dropped: ['Emoji and colour.'],
  needsOwner: [],
}));

// ─── Posts ───

interface PostSpec {
  slug: string;
  title: string;
  summary?: string;
  category: string;
  tags?: EntryRef[];
  body?: string;
  outline: string[];
  dropped: string[];
  needsOwner?: string[];
  noindex?: boolean;
  evidence?: string[];
}

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

/** The assistant is not built: every sentence is a plan, and the status is stated first. */
const AI_ASSISTANT_BODY = `**Status: Coming soon (Jald aa raha hai).** The AI assistant is not part of Nafaa today. Nothing described here is in the app yet, and the plan may change before it ships.

**Roman Urdu:** Nafaa AI assistant abhi app me nahi hai, jald aa raha hai. Aap apni sale, stock aur khata ke baare me seedha sawal poochh sakenge, English ya Roman Urdu me.

## What we are building

The idea is simple: ask a question about your business and get the answer from your own Nafaa data, without opening several reports. For example:

- Which items sold the most this week?
- Which customers have udhaar older than a month?
- Which stock is running low before the weekend?

## Questions in Roman Urdu

Most people who use Nafaa type in Roman Urdu, so the assistant is planned to understand a question like "is hafte sab se zyada kya bika?" as well as the same question in English.

## What it will not do

- It is not planned to change prices, stock or bills by itself. Any change would need a person to confirm it.
- It is planned to read only your own business data, within the permissions of the account that asks.

## When it arrives

There is no launch date yet. Progress is tracked on the [roadmap](/roadmap). When the assistant ships, this post will be updated and the "Coming soon" label removed.

## What you can use today

The data the assistant will read already lives in Nafaa: the counter (POS), stock, khata and reports. Setting those up now means the assistant will have your history to work with when it arrives.`;

const POSTS: PostSpec[] = [
  {
    slug: 'fbr-e-invoicing-complete-guide-2026',
    title: 'FBR POS Integration and E-Invoicing: A Guide for Shops',
    summary: 'What FBR POS integration asks of retailers, who it applies to and how to get set up, with each rule linked to the FBR notice it comes from.',
    category: 'compliance',
    tags: ['GLOSSARY_TERM:fbr-pos', 'GLOSSARY_TERM:tier-1-retailer'],
    body: `This guide explains what FBR POS integration asks of retailers, who it applies to, and how a shop gets set up. Rules and thresholds change through SROs and Finance Acts, so every rule in this guide links to the official notice it comes from.\n\nNafaa is an {{fact:compliance.fbrPra}}.`,
    outline: ['What FBR POS integration is', 'Who must integrate (Tier-1 definition, with SRO)', 'What changed recently (dated)', 'How to set it up: NTN/STRN, IRIS, POS registration', 'Penalties (cite the section)', 'How Nafaa handles it (from apps/api tax module)'],
    dropped: [
      '"SRO 428(I)/2021" reference and "185,000 retail outlets" (not verified).',
      'Threshold table by turnover and deadlines for 2026 (invented).',
      'Tier-1 list items "3+ branches", "imports PKR 5M+", "electricity bill > PKR 100K/month" (not verified).',
      '"15-day sandbox testing" step and the penalty amounts (not cited).',
      '"One of only 7 FBR-approved POS providers", "every sale reported within 15 seconds", "zero configuration", "12,000+ businesses".',
      FAKE_AUTHOR,
    ],
    needsOwner: ['O2: evidence for "FBR & PRA approved POS integrator" before this post is published.'],
    evidence: ['apps/api/src/integrations/fbr/fbr.module.ts', 'apps/web/src/modules/tax/TaxPage.tsx'],
  },
  {
    slug: 'digital-khata-vs-paper-ledger',
    title: 'Digital Khata vs Paper Register: What Changes for Your Shop',
    summary: 'Why paper khata registers lose money and time, what a digital khata does differently, and how to move your old balances into Nafaa in one sitting.',
    category: 'guides',
    tags: ['INDUSTRY:kiryana', 'GLOSSARY_TERM:khata', 'GLOSSARY_TERM:udhaar'],
    body: KHATA_BODY,
    outline: ['Why paper ledgers fail', 'What a digital khata does differently', 'WhatsApp reminders', 'How to switch in one sitting'],
    dropped: [
      '"Real data from 8,000+ shops" and the "2026 survey of 3,200 shopkeepers" with its percentages (invented).',
      '"Recovers 3-5x more", "23% to 71%" and "PKR 47,000/month" recovery figures.',
      'Automatic rule-based reminders ("if udhar > PKR 5,000 and > 15 days"): the app sends reminders one by one.',
      'Photo evidence on udhaar entries (not found in the khata).',
      'Reminder message templates (the app has its own wording in directory/messages.ts).',
      '"Free trial (30 days)" (the trial length comes from the Plan table).',
      '"8,200 kiryana shops switched in 2026".',
      FAKE_AUTHOR,
    ],
    evidence: ['apps/web/src/modules/customers/directory/KhataBookPage.tsx', 'apps/web/src/modules/customers/directory/messages.ts', 'apps/web/src/modules/multi-branch'],
  },
  {
    slug: 'gold-rate-pricing-jewelry-shops',
    title: 'How Jewellery Shops Price Gold in Pakistan',
    summary: 'Karat and purity, the daily rate, making charges and wastage: how a jewellery bill is built, and how to show each part clearly to the customer.',
    category: 'industry',
    tags: ['INDUSTRY:jewelry'],
    body: GOLD_BODY,
    outline: ['Karat and purity', 'The daily rate', 'Making charges', 'Wastage', 'Tax on gold (needs FBR source)', 'Worked example (use {{year}} and a dated rate source)'],
    dropped: [
      '"The formula used by Zeenat Jewellers and other top brands" (named business, no consent).',
      'Indicative tola rates for August 2026 and the worked example built on them.',
      'Making-charge and wastage percentage tables (no source).',
      'GST rates on gold and making charges (not cited).',
      '"Nafaa\'s live gold API" (the app uses a daily rate set by the jeweller).',
      '"Rates change hourly" and the list of "official sources".',
      FAKE_AUTHOR,
    ],
    evidence: ['apps/web/src/industries/jewelry/JewelryPack.tsx'],
  },
  { slug: 'how-to-start-kiryana-store-pakistan', title: 'How to Start a Kiryana Store in Pakistan', category: 'guides', tags: ['INDUSTRY:kiryana'], outline: ['Choosing the location', 'How much capital (sourced ranges only)', 'First stock and suppliers', 'Setting up a digital khata', 'The first 90 days'], dropped: ['"12,000+ Nafaa kiryana partners".', FAKE_AUTHOR] },
  { slug: 'best-pos-kiryana-2026', title: 'Best POS Software for Kiryana Stores in Pakistan', category: 'industry', tags: ['INDUSTRY:kiryana'], outline: ['Selection criteria', 'Systems compared (dated vendor prices)', 'Which fits which shop', 'Pricing'], dropped: ['"We compared 8 POS systems" (no comparison on record).', FAKE_AUTHOR], needsOwner: ['Overlaps /best/pos-software-pakistan (W9). Decide: keep as a post or 301 to the best-of page.'] },
  { slug: 'drap-compliance-pharmacy', title: 'DRAP Rules for Pharmacies in Pakistan: A Checklist', category: 'compliance', tags: ['INDUSTRY:pharmacy', 'GLOSSARY_TERM:drap'], outline: ['What DRAP regulates (and what provinces license)', 'Records a pharmacy keeps', 'Batch and expiry', 'Controlled medicines register', 'Inspections'], dropped: ['"7 core requirements" and the penalty structure (not cited).', FAKE_AUTHOR] },
  { slug: 'restaurant-kot-system-guide', title: 'Kitchen Order Tickets (KOT): How They Work in a Restaurant', category: 'industry', tags: ['INDUSTRY:restaurant', 'GLOSSARY_TERM:kot'], outline: ['What a KOT is', 'Stations and printers', 'Kitchen screen lanes', 'Workflow from order to table'], dropped: ['"Reduce order errors by 87%" and "real data from Karachi\'s top restaurants".', FAKE_AUTHOR], evidence: ['apps/web/src/industries/restaurant/pages/StationsPage.tsx'] },
  { slug: 'multi-shop-management-guide', title: 'Running More Than One Shop in Pakistan', category: 'business', outline: ['When to open the second shop', 'Central or separate control', 'Staff and managers', 'Stock transfers between shops', 'One report for all shops'], dropped: ['"Malik General Store\'s 3-branch model" (named business, no consent).', '"2 to 20 locations playbook" and multi-shop ROI figures.', FAKE_AUTHOR] },
  { slug: 'whatsapp-customer-retention', title: 'WhatsApp Messages for Shops: Templates That Bring Customers Back', category: 'business', outline: ['Why WhatsApp', 'Templates by situation', 'When to send', 'Staying polite and within WhatsApp rules'], dropped: ['"Proven" templates claim.', FAKE_AUTHOR] },
  { slug: 'sales-tax-guide-punjab-2026', title: 'Sales Tax in Punjab: A Guide for Retailers', category: 'compliance', tags: ['CITY:lahore'], outline: ['PRA overview', 'Registration', 'Current rates (dated PRA source)', 'Filing schedule', 'Common mistakes'], dropped: ['"POS software handles it automatically" (not checked for PRA).', FAKE_AUTHOR] },
  { slug: 'ramadan-eid-retail-strategy', title: 'Ramadan and Eid Planning for Retail Shops', category: 'business', outline: ['Stock planning', 'Staff for late nights', 'Chand Raat rush', 'WhatsApp and SMS offers'], dropped: ['"How to 3x your sales" title.', FAKE_AUTHOR] },
  {
    slug: 'nafaa-ai-assistant-launch',
    title: 'Nafaa AI Assistant: Coming Soon',
    summary:
      'Nafaa is building an AI business assistant that will answer questions about your own sales, stock and khata in English or Roman Urdu. It is not in the app yet. This post explains what is planned, what it will not do, and where to follow progress on the roadmap.',
    category: 'product',
    body: AI_ASSISTANT_BODY,
    outline: ['What the assistant will answer', 'Roman Urdu questions', 'When it arrives (roadmap)', 'Status badge: Coming soon / Jald aa raha hai'],
    dropped: ['"Launch" framing, "free for all Nafaa users", "Urdu voice input" and example answers: the assistant is not built (apps/web/src/modules/ai-assistant has only an empty index).', FAKE_AUTHOR],
    needsOwner: ['Owner rule: a feature that is not built may only be marketed with a "Coming soon" badge and on the roadmap page. Keep noindex until it ships.'],
    noindex: true,
    evidence: ['apps/web/src/modules/ai-assistant/index.ts'],
  },
];

function post(p: PostSpec, index: number): SeedEntry {
  const key = `BLOG_POST:${p.slug}`;
  const notes = `Outline from the old post: ${p.outline.join(' · ')}.\n\nEvery number needs a source with a date. No fake authors, customers or surveys.`;
  return {
    type: 'BLOG_POST',
    slug: p.slug,
    title: p.title,
    ...(p.summary ? { summary: p.summary } : {}),
    data: { toc: true },
    blocks: withIds(key, [...(p.body ? [richText(p.body)] : []), writerNotes(notes)]),
    relations: [
      { ref: `BLOG_CATEGORY:${p.category}`, kind: 'TAG' },
      ...(p.tags ?? []).map((ref) => ({ ref, kind: 'TAG' as const })),
    ],
    ...(p.noindex ? { noindex: true } : {}),
    sortOrder: index + 1,
    origin: `${ORIGIN}#${p.slug}`,
    evidence: p.evidence ?? [],
    factCheck: {
      checkedOn: CHECKED_ON,
      note: p.body ? 'Body rewritten: product statements checked against the code; general trade facts only; every number from the old post removed.' : 'Stub: title and outline only.',
    },
    dropped: p.dropped,
    needsOwner: ['Author: a real PERSON entry (O4).', ...(p.needsOwner ?? [])],
  };
}

export const blogPosts: SeedEntry[] = POSTS.map(post);
