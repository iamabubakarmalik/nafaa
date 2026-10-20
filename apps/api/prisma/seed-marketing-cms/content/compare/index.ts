/**
 * Compare pages imported from apps/marketing compare.ts (4 pages).
 * Kept: slug (URL continuity), competitor name and the list of comparison
 * topics as writer notes. Dropped: every competitor cell (none had a dated
 * source), "Certified partner", "English only", "60+ reports", "24/7 support"
 * and the other unsourced claims. W10 re-verifies competitor facts with dated
 * vendor sources before these pages get a comparison table (COMPARE needs
 * fact-check and checkedAt to publish).
 */

import { answerBox, hero, withIds, writerNotes } from '../../lib/blocks';
import type { SeedEntry } from '../../lib/types';

const CHECKED_ON = '2026-10-20';
const ORIGIN = 'apps/marketing/src/lib/data/compare.ts';

interface CompareSpec {
  slug: string;
  title: string;
  competitorName: string;
  competitorUrl?: string;
  verdict: string;
  summary: string;
  topics: string[];
  dropped: string[];
  needsOwner?: string[];
}

const PAGES: CompareSpec[] = [
  {
    slug: 'nafaa-vs-tally',
    title: 'Nafaa vs Tally',
    competitorName: 'Tally',
    competitorUrl: 'https://tallysolutions.com/',
    verdict: 'Pick Nafaa if your day is spent billing customers at a counter; pick an accounting package like Tally if you mainly keep books for an accountant.',
    summary:
      'Nafaa is a counter-first POS with stock, khata and reports for Pakistani shops. Tally is accounting software. This page compares how each handles billing, stock, udhaar and tax for a shop, with every competitor detail dated and sourced, so you can choose for your own shop.',
    topics: ['Point of sale', 'Mobile access', 'Offline billing', 'Language', 'Payments (JazzCash, Easypaisa, Raast)', 'Khata', 'FBR integration', 'Setup time', 'Price to start'],
    dropped: ['All "Them" cells (no dated source).', '"Certified partner" for FBR.', '"Setup 5 minutes" vs "Days + training".', '"Marketplace built-in" (O14 pending).', '"AI" claim (assistant is not built; may only appear as "Coming soon").'],
  },
  {
    slug: 'nafaa-vs-excel',
    title: 'Nafaa vs Excel',
    competitorName: 'Microsoft Excel',
    competitorUrl: 'https://www.microsoft.com/en-us/microsoft-365/excel',
    verdict: 'Excel is a good spreadsheet; once more than one person bills or counts stock, a POS that updates stock on every sale saves the copying and checking.',
    summary:
      'Many shops start with a spreadsheet. This page compares running a shop in Excel with Nafaa: billing at the counter, stock that updates on each sale, khata reminders, backups and several users, and shows how to bring your Excel list into Nafaa.',
    topics: ['Several users', 'Backups', 'Barcode scanning', 'Receipts', 'Stock on sale', 'Khata reminders', 'Mobile access', 'Reports', 'Import from Excel'],
    dropped: ['"60+ live reports" (count not checked).', '"Daily, encrypted cloud" backup (not checked).', '"Unlimited, role-based" users (plan limits apply; plan features are not final).', '"Data loss risk near zero".'],
  },
  {
    slug: 'nafaa-vs-quickbooks',
    title: 'Nafaa vs QuickBooks',
    competitorName: 'QuickBooks',
    competitorUrl: 'https://quickbooks.intuit.com/',
    verdict: 'Nafaa is built around a Pakistani shop counter, khata and PKR pricing; QuickBooks is accounting software. Compare on what your business does every day.',
    summary:
      'This page compares Nafaa and QuickBooks for a business in Pakistan: counter billing, stock, udhaar, local payments, tax integration, language and pricing in rupees, with every QuickBooks detail taken from its own site and dated, so the choice is easy to check.',
    topics: ['Built for Pakistan', 'Language', 'Local payments', 'FBR integration', 'Khata', 'Offline mode', 'POS counter', 'Support', 'Pricing currency'],
    dropped: ['"Certified integration" for FBR.', '"Urdu + English, 24/7" support.', 'All QuickBooks cells (no dated source).', '"Nafaa Bazaar built-in" (O14 pending).'],
  },
  {
    slug: 'nafaa-vs-paper-register',
    title: 'Nafaa vs Paper Register',
    competitorName: 'Paper register (khata book)',
    verdict: 'A paper register costs nothing to start but cannot search, remind or back itself up; a digital khata does those for you.',
    summary:
      'Most shops in Pakistan still keep a paper khata. This page compares the paper register with Nafaa honestly: what paper does well, where it loses money and time, and how to move your old balances into a digital khata in one sitting.',
    topics: ['Daily time', 'Khata safety', 'Udhaar reminders', 'Profit visibility', 'Searching old records', 'Several staff', 'Cost', 'Tax', 'Load-shedding'],
    dropped: ['"95% with reminders" vs "~60% from memory" recovery.', '"15 minutes" vs "4+ hours" daily time.', '"Rs 2,000+ books" cost line.', '"Encrypted cloud backup" (not checked).'],
    needsOwner: ['COMPARE needs a competitorUrl to publish; a paper register has none. Decide: make this a GUIDE, or let the API accept no URL for this case.'],
  },
];

function page(p: CompareSpec, index: number): SeedEntry {
  const key = `COMPARE:${p.slug}`;
  return {
    type: 'COMPARE',
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    data: {
      competitorName: p.competitorName,
      ...(p.competitorUrl ? { competitorUrl: p.competitorUrl } : {}),
      verdict: p.verdict,
    },
    blocks: withIds(key, [
      hero(p.summary, { eyebrow: 'Compare' }),
      answerBox(
        [
          { label: 'Short answer', value: p.verdict },
          { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, with a free trial first' },
        ],
        undefined,
        'Which one should you choose?',
      ),
      writerNotes(
        [
          `Comparison topics from the old page: ${p.topics.join(', ')}.`,
          'Every competitor cell needs the vendor page and a check date (COMPETITOR_UNDATED). Nafaa cells need a file in apps/web/src or apps/api/src.',
          'Run fact-check in the admin before publishing (NOT_FACT_CHECKED blocks publish).',
        ].join('\n\n'),
      ),
    ]),
    sortOrder: index + 1,
    origin: `${ORIGIN}#${p.slug}`,
    evidence: [],
    factCheck: { checkedOn: CHECKED_ON, note: 'Structure only. No competitor fact was kept; none had a dated source.' },
    dropped: p.dropped,
    needsOwner: p.needsOwner ?? [],
  };
}

export const compare: SeedEntry[] = PAGES.map(page);
