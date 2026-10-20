/**
 * Best-of, compare and alternative fixtures. Verdicts and summaries are the
 * seed's wording (content/compare). Competitor rows state only general,
 * checkable properties of the product type (a spreadsheet, a paper
 * register), never a price, a rating or a count; the sources point at the
 * vendor's own page with the fixture date. Real pages get their facts from
 * W9/W10 with dated vendor sources.
 */
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { FIXTURE_DATE, card, entry } from './factory';
import { DEMO, SAMPLE, SEED_FAQS, SIGNUP } from './shared';

const EXCEL = { name: 'Microsoft Excel', url: 'https://www.microsoft.com/en-us/microsoft-365/excel', publisher: 'Microsoft' };
const excelSource = { title: 'Microsoft Excel product page', url: EXCEL.url, publisher: EXCEL.publisher, accessedAt: FIXTURE_DATE };

const COMPARE_ROWS = [
  { label: 'Bill a customer at the counter', nafaa: 'yes', other: 'partial', otherNote: 'Possible with a hand-built sheet' },
  { label: 'Stock goes down on each sale', nafaa: 'yes', other: 'no', otherNote: 'Updated by hand or with formulas' },
  { label: 'Barcode scanner', nafaa: 'yes', other: 'partial', otherNote: 'A scanner types into a cell' },
  { label: 'Keeps billing without internet', nafaa: 'yes', other: 'yes', otherNote: 'The desktop app works offline' },
  { label: 'Udhaar reminders on WhatsApp', nafaa: 'yes', other: 'no' },
  { label: 'Free-form layouts, formulas and charts', nafaa: 'partial', nafaaNote: 'Built-in reports and exports', other: 'yes' },
] as const;

function compareTable(competitorLabel: string) {
  return {
    type: 'comparisonTable' as const,
    heading: `Nafaa and ${competitorLabel}, feature by feature`,
    caption: `What Nafaa and ${competitorLabel} do for a shop counter, checked on the vendor's page.`,
    columns: [
      { key: 'nafaa', label: 'Nafaa', highlight: true },
      { key: 'other', label: competitorLabel },
    ],
    rows: COMPARE_ROWS.map((row) => ({
      label: row.label,
      cells: {
        nafaa: { value: row.nafaa, ...('nafaaNote' in row ? { note: row.nafaaNote } : {}) },
        other: { value: row.other, ...('otherNote' in row ? { note: row.otherNote } : {}) },
      },
    })),
    sources: [excelSource],
    checkedAt: FIXTURE_DATE,
  };
}

const VERDICT = 'Excel is a good spreadsheet; once more than one person bills or counts stock, a POS that updates stock on every sale saves the copying and checking.';
const SUMMARY =
  'Many shops start with a spreadsheet. This page compares running a shop in Excel with Nafaa: billing at the counter, stock that updates on each sale, khata reminders, backups and several users, and shows how to bring your Excel list into Nafaa.';

function compareBlocks(competitorLabel: string, eyebrow: string) {
  return [
    { type: 'hero' as const, eyebrow, sub: SUMMARY, primaryCta: SIGNUP, secondaryCta: DEMO, layout: 'centered' as const },
    compareTable(competitorLabel),
    {
      type: 'richText' as const,
      markdown:
        `## Where ${competitorLabel} is better\n\n${competitorLabel} lets you lay out any sheet you like, with formulas and charts. If you mostly plan, budget or analyse numbers, a spreadsheet is the right tool, and many shops keep one next to their POS.\n\n` +
        `- Any layout, any formula\n- Works for planning and budgets, not only sales\n- Many people already know it`,
    },
    {
      type: 'richText' as const,
      markdown:
        `## Where Nafaa is better\n\nAt the counter, Nafaa does the bookkeeping as you sell: the bill, the stock, the khata and the reports all update from one sale. ` +
        `Several staff can bill at once, and the counter keeps going when the internet drops.\n\n- Stock goes down on every sale\n- Udhaar reminders on WhatsApp in one tap\n- Barcode counter with piece, dozen and carton units`,
    },
    {
      type: 'steps' as const,
      heading: 'Moving from Excel to Nafaa',
      items: [
        { title: 'Download the template', body: 'In Nafaa, open the product import and download the Excel template.' },
        { title: 'Paste your list', body: 'Copy your products, prices and stock into the template columns.' },
        { title: 'Check, then import', body: 'Upload the file, look over the dry run, then import.' },
      ],
    },
    { type: 'faq' as const },
    { type: 'relatedLinks' as const, source: 'related' as const, heading: 'Keep reading' },
  ];
}

export const COMPARE_FIXTURES: PublicEntry[] = [
  entry({
    type: 'COMPARE',
    path: '/compare/nafaa-vs-excel',
    title: 'Nafaa vs Excel',
    seoTitle: 'Nafaa vs Excel: Features, Price & Which to Choose',
    titleIncludesBrand: true,
    summary: SUMMARY,
    gate: 900,
    forcePassed: true,
    factChecked: true,
    data: { type: 'COMPARE', competitorName: EXCEL.name, competitorUrl: EXCEL.url, verdict: VERDICT },
    blocks: compareBlocks('Excel', 'Compare'),
    faqs: [
      { id: 'fixture__faq-excel-import', topic: 'switching', question: 'Can I add my products from Excel?', answer: 'Yes. Download the template, fill in your products, upload it, check the dry run and then import.' },
      SEED_FAQS.offline,
      SEED_FAQS.pricing,
    ],
    related: [
      card({ type: 'COMPARE', path: '/compare/nafaa-vs-paper-register', title: 'Nafaa vs Paper Register' }),
      card({ type: 'BEST_OF', path: '/best/pos-software-pakistan', title: 'Best POS Software in Pakistan' }),
    ],
  }),
  entry({
    type: 'COMPARE',
    path: '/compare/nafaa-vs-paper-register',
    title: 'Nafaa vs Paper Register',
    seoTitle: 'Nafaa vs Paper Register: Features, Price & Which to Choose',
    titleIncludesBrand: true,
    summary:
      'Most shops in Pakistan still keep a paper khata. This page compares the paper register with Nafaa honestly: what paper does well, where it loses money and time, and how to move your old balances into a digital khata in one sitting.',
    gate: 900,
    data: {
      type: 'COMPARE',
      competitorName: 'Paper register (khata book)',
      competitorUrl: 'https://nafaa.pk/glossary/khata',
      verdict: 'A paper register costs nothing to start but cannot search, remind or back itself up; a digital khata does those for you.',
    },
    blocks: [
      { type: 'hero', eyebrow: 'Compare', sub: `${SAMPLE} Paper register against a digital khata, for a shop deciding whether to switch.`, primaryCta: SIGNUP, secondaryCta: DEMO, layout: 'centered' },
      { type: 'faq' },
    ],
    faqs: [SEED_FAQS.khata],
  }),
  entry({
    type: 'ALTERNATIVE',
    path: '/alternatives/excel',
    title: 'Excel alternative for shops',
    seoTitle: 'Best Microsoft Excel Alternative in Pakistan (2026)',
    summary: `${SAMPLE} For a shop that has outgrown its spreadsheet: what to look for in a POS instead of Excel, and where Nafaa fits.`,
    gate: 800,
    forcePassed: true,
    data: { type: 'ALTERNATIVE', competitorName: EXCEL.name, competitorUrl: EXCEL.url, verdict: VERDICT },
    blocks: compareBlocks('Excel', 'Alternative'),
    faqs: [SEED_FAQS.devices, SEED_FAQS.pricing],
  }),
];

export const BEST_FIXTURES: PublicEntry[] = [
  entry({
    type: 'BEST_OF',
    path: '/best/pos-software-pakistan',
    title: 'Best POS Software in Pakistan',
    seoTitle: 'Best POS Software in Pakistan (2026): 3 Compared',
    summary: `${SAMPLE} The ways a Pakistani shop can run its counter, from a paper register to a POS, compared on billing, stock, khata, offline use and price, with dated prices and the method behind the order.`,
    gate: 1200,
    forcePassed: true,
    factChecked: true,
    data: {
      type: 'BEST_OF',
      category: 'POS',
      methodology:
        `${SAMPLE} The writer lists the tests run on each product (a day of sales, an offline hour, a khata reminder), who ran them and when. ` +
        'Prices are taken from each vendor\'s own page and dated. Nafaa is included and marked as our product.',
      items: [
        {
          name: 'Nafaa',
          isNafaa: true,
          url: 'https://nafaa.pk/',
          strengths: ['Keeps billing without internet and syncs later', 'Digital khata with WhatsApp reminders', 'Barcode counter with piece, dozen and carton units'],
          weaknesses: ['Needs a phone, tablet or computer at the counter'],
          bestFor: 'Shops that bill all day and give udhaar',
        },
        {
          name: 'Microsoft Excel',
          isNafaa: false,
          url: EXCEL.url,
          strengths: ['Any layout, formulas and charts', 'Many people already know it'],
          weaknesses: ['Stock does not go down on its own when you sell', 'No udhaar reminders'],
          bestFor: 'Planning, budgets and one-person record keeping',
        },
        {
          name: 'Paper register',
          isNafaa: false,
          strengths: ['Costs almost nothing to start', 'No device or electricity needed'],
          weaknesses: ['Cannot search old records quickly', 'No backup if the register is lost'],
          bestFor: 'Very small shops with a handful of udhaar customers',
        },
      ],
    },
    blocks: [
      { type: 'hero', eyebrow: 'Best of 2026', sub: `${SAMPLE} A short, honest list of ways to run a Pakistani shop counter, with what each is best for.`, primaryCta: SIGNUP, secondaryCta: DEMO, layout: 'centered' },
      {
        type: 'comparisonTable',
        heading: 'Quick pick',
        caption: 'The short version: which option fits which shop.',
        columns: [
          { key: 'nafaa', label: 'Nafaa', highlight: true },
          { key: 'excel', label: 'Excel' },
          { key: 'paper', label: 'Paper register' },
        ],
        rows: [
          { label: 'Stock goes down on each sale', cells: { nafaa: { value: 'yes' }, excel: { value: 'no' }, paper: { value: 'no' } } },
          { label: 'Udhaar reminders', cells: { nafaa: { value: 'yes' }, excel: { value: 'no' }, paper: { value: 'no' } } },
          { label: 'Works without internet', cells: { nafaa: { value: 'yes' }, excel: { value: 'yes' }, paper: { value: 'yes' } } },
        ],
        sources: [excelSource],
        checkedAt: FIXTURE_DATE,
      },
      {
        type: 'richText',
        markdown: `## How to choose\n\n${SAMPLE} Three questions decide it: how many people bill, whether you give udhaar, and whether stock has to be right at the end of the day.`,
      },
      { type: 'faq' },
    ],
    faqs: [SEED_FAQS.devices, SEED_FAQS.offline, SEED_FAQS.pricing],
  }),
];
