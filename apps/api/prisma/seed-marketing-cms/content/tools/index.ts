/**
 * Free tools: the /tools hub page and one TOOL entry per calculator island
 * (apps/site/src/components/islands/tools). Registered in content/index.ts.
 */

import type { SeedEntry, SeedFaq } from '../../lib/types';
import { page, prose } from '../main-pages/_build';
import { CHECKED_ON, toolEntry, toolFaqs, type ToolSpec } from './_tool';
import { khataAgeing, receiptMaker, zakat } from './money';
import { breakEven, discount, gst, profitMargin } from './pricing';
import { barcode, foodCost, reorderLevel } from './stock';

const specs: ToolSpec[] = [profitMargin, gst, discount, breakEven, reorderLevel, barcode, foodCost, khataAgeing, zakat, receiptMaker];

const hubFaqs: SeedFaq[] = [
  {
    key: 'tools-hub-free',
    topic: 'tools',
    question: 'Are these tools really free?',
    answer:
      'Yes. Every calculator and generator on this page is free to use without an account, as often as you like. They run in your browser, so the numbers, names and amounts you type are not sent to Nafaa or stored on a server. A few tools remember your shop details on your own device so you do not retype them.',
    sourceNote: 'Islands are client components with no network calls; localStorage only in ReceiptMaker and InvoiceGenerator.',
    origin: 'new (free tools pass, 26 Oct 2026)',
    evidence: ['apps/site/src/components/islands/tools/ReceiptMaker.tsx', 'apps/site/src/components/islands/tools/kit.tsx'],
  },
  {
    key: 'tools-hub-accuracy',
    topic: 'tools',
    question: 'Where do the rates and rules in the tools come from?',
    answer:
      'Most tools are plain arithmetic, and each page shows the formula it uses. Where a tool depends on an outside fact, such as the standard sales tax rate or the zakat nisab, the page names its official or public source with the date it was checked. Metal rates are never assumed: you type the day\'s rate yourself.',
    sourceNote: 'facts.ts holds every sourced value with its URL and checked date; each TOOL entry lists its sources.',
    origin: 'new (free tools pass, 26 Oct 2026)',
    evidence: ['apps/site/src/components/islands/tools/facts.ts'],
  },
];

const hub: SeedEntry = {
  ...page({
    type: 'PAGE',
    slug: 'tools',
    relations: [
      { ref: 'PAGE:templates', kind: 'RELATED' },
      { ref: 'PAGE:guides', kind: 'RELATED' },
      { ref: 'BLOG_POST:how-to-calculate-profit-margin', kind: 'RELATED' },
      { ref: 'PRODUCT:reports', kind: 'RELATED' },
    ],
    title: 'Free Business Tools',
    summary:
      'Free calculators and generators for shops, restaurants and small businesses in Pakistan: profit margin, GST, discount, break-even, reorder level, food cost, udhaar ageing and zakat, plus a barcode generator and a receipt maker. No sign-up, amounts in rupees, and everything runs in your browser.',
    data: { template: 'hub' },
    seoTitle: 'Free Business Calculators & Tools for Pakistani Shops',
    seoDescription: 'Free tools for Pakistani shops: profit margin, GST, discount, break-even, reorder level, food cost, udhaar ageing and zakat calculators, barcodes and receipts.',
    focusKeyword: 'free business tools pakistan',
    hero: { eyebrow: 'Free tools', heading: 'Free business tools', sub: 'Calculators and generators for the questions a shop owner answers every week, in rupees, with the formula shown. No sign-up.', layout: 'centered' },
    answer: {
      facts: [
        ['Pricing', 'Profit margin, discount, GST and break-even calculators'],
        ['Stock and kitchen', 'Reorder level, food cost and barcode generator'],
        ['Money', 'Udhaar ageing, zakat on business stock and a printable receipt maker'],
        ['Privacy', 'Runs in your browser; what you type is not sent or stored'],
      ],
      romanUrdu: 'Dukaan ke rozana hisaab ke free tools: Profit, Discount, tax, Stock order, khata aur Zakat. Koi sign-up nahi, sab rupay me, aur aap ka data aap ke browser me hi rehta hai.',
    },
    body: [
      prose(`## How these tools are built

Each tool answers one question with the formula on the page, a worked example in rupees and the questions people ask about it. Where a rule or rate comes from outside, such as the standard sales tax rate or the zakat nisab, the source and the date it was checked are shown under the result. Nothing is stored on a server.

When the same sums have to be done for every product and every bill, a calculator stops being enough. [Nafaa](/product/pos) does them as you sell: margin per product in the [reports](/product/reports), reorder quantities on the [low stock list](/product/inventory), udhaar age bands in the [khata book](/product/khata) and recipe costs for [restaurants](/industries/restaurant). For printable sheets to use alongside, see the free [templates](/templates).`),
    ],
    faqKeys: hubFaqs.map((f) => f.key),
    cta: { heading: 'Do these sums automatically', body: 'Start the 7 din Free Trial and let every bill update your profit, stock and khata.' },
    sortOrder: 21,
    evidence: ['apps/site/src/templates/article/HubTemplates.tsx', 'apps/site/src/components/islands/tools/ToolIsland.tsx'],
  }),
  origin: 'new (free tools pass, 26 Oct 2026)',
  factCheck: { checkedOn: CHECKED_ON, note: 'Hub copy describes the tool islands (apps/site/src/components/islands/tools). Product links checked against the cited modules in each TOOL entry.' },
};

export const toolEntries: SeedEntry[] = [hub, ...specs.map(toolEntry)];
export const toolsFaqs: SeedFaq[] = [...hubFaqs, ...specs.flatMap(toolFaqs)];
