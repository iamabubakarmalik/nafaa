/**
 * Nafaa vs QuickBooks (QuickBooks Online). QuickBooks facts from
 * quickbooks.intuit.com (country selector and US pricing page), read on
 * CHECKED_ON. Anything about use from Pakistan is left to the owner.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { compareTable, src, type CompareSpec } from '../_compare';

const QB_GLOBAL = src('QuickBooks: choose your country and language', 'https://quickbooks.intuit.com/global/', 'Intuit QuickBooks');
const QB_PRICING = src('QuickBooks Online pricing (US site)', 'https://quickbooks.intuit.com/pricing/', 'Intuit QuickBooks');
const SOURCES = [QB_GLOBAL, QB_PRICING];

const SUMMARY =
  'Nafaa is built around a Pakistani shop counter: POS billing, stock, khata, wallet payments and reports in rupees. QuickBooks Online is cloud accounting software from Intuit. This page compares them on what a business in Pakistan does every day, says when QuickBooks is the better choice, and shows how to use both.';

const spec: CompareSpec = {
  slug: 'nafaa-vs-quickbooks',
  title: 'Nafaa vs QuickBooks',
  competitorName: 'QuickBooks',
  competitorUrl: 'https://quickbooks.intuit.com/',
  verdict:
    'Nafaa runs the counter, stock and khata for a business in Pakistan; QuickBooks Online is accounting software. If you need both, Nafaa can send a daily summary journal to QuickBooks Online.',
  summary: SUMMARY,
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compare', heading: 'Nafaa vs QuickBooks for a business in Pakistan' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Nafaa for the counter, stock and udhaar; QuickBooks Online for accounting books, if it fits your country and your accountant.' },
        { label: 'Choose Nafaa if', value: 'You bill walk-in customers, sell from stock, give udhaar and take JazzCash, Easypaisa and cash.' },
        { label: 'Choose QuickBooks if', value: 'You mainly send invoices, pay bills and reconcile bank accounts, and your accountant works in QuickBooks.' },
        { label: 'Use both', value: 'Nafaa sends one balanced summary journal a day to QuickBooks Online, so the accountant gets clean totals.' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, with a free trial first' },
      ],
      undefined,
      'Which one should you choose?',
    ),
    compareTable(
      'Nafaa and QuickBooks Online side by side',
      'QuickBooks details are from Intuit\'s own country selector and US pricing page, checked on the date shown. Nafaa details are from the product as it is today.',
      'QuickBooks Online',
      [
        ['What it is built for', 'Running a counter: billing, stock, khata, staff and reports', 'Cloud accounting: invoices, bills, expenses, reports'],
        ['Country sites', 'Built for Pakistan, priced in rupees', 'Country selector lists regional sites (for example UAE, UK, US); Pakistan has no regional site link'],
        ['Pricing shown', 'From {{price:min.monthly}} a month after a free trial', 'US pricing page shows plans in US dollars'],
        ['Users', 'Staff logins with roles and permissions (plan limits apply)', 'US plans: Simple Start 1 user, Essentials 3, Plus 5, Advanced 25'],
        ['Inventory', 'Stock on every plan, per branch, with variants, units and stock counts', 'US pricing page lists inventory tracking on Plus and Advanced'],
        ['Counter billing (POS)', 'Barcode, quick keys, receipt printers, scales and cash drawer', 'Products menu links to a mobile point of sale; check availability for your country'],
        ['Local payments', 'Cash, card, JazzCash, Easypaisa, bank transfer and udhaar as separate methods', 'Not listed for Pakistan on the pages checked'],
        ['Customer udhaar (khata)', 'Khata with credit limits, ageing and WhatsApp reminders', 'Customer invoices and receivables'],
        ['Pakistan tax', 'Optional FBR/PRA POS integration', 'Not listed on the pages checked'],
        ['Working together', 'Sends a daily summary journal to QuickBooks Online', 'Connected from Nafaa with your QuickBooks sign-in'],
      ],
      SOURCES,
    ),
    prose(`## Two different tools

**QuickBooks Online** is Intuit's cloud accounting software. On its US pricing page, the plans step up by users and features: Simple Start for one user, Essentials for three, Plus for five with inventory tracking and project profitability, and Advanced for twenty-five. Prices there are in US dollars. Intuit's country selector lists regional QuickBooks sites for a number of countries, including the UAE and the UK; when we checked, Pakistan was listed without a regional site of its own.

**Nafaa** is software for running the counter and the stock of a business in Pakistan. It was built for walk-in customers, mixed payments (cash, card, JazzCash, Easypaisa and udhaar on one bill), loose goods by weight, staff who bill all day, and an owner who wants the day's sale and profit on the phone. Prices are in rupees.

The two overlap less than people think. QuickBooks is where an accountant keeps the books. Nafaa is where the business makes its sales.

## When QuickBooks is the better choice

- **Invoicing businesses.** If you send invoices to companies, track bills and reconcile bank feeds, and rarely serve walk-in customers, QuickBooks is closer to your day.
- **Your accountant works in QuickBooks.** Moving the books to another system has a real cost.
- **You report to an overseas parent or investor** who expects QuickBooks reports.
- **You operate in a country QuickBooks serves directly,** with local tax features and support.

## When Nafaa is the better choice

- **You have a counter with a queue.** Fast billing with barcode, search and quick keys, receipt printing and a cash drawer.
- **You sell from stock on every plan.** Stock goes down with each sale, per branch, with sizes, colours, units and batches.
- **Udhaar is part of trade.** The khata is inside the counter, with credit limits and WhatsApp reminders.
- **Local payments matter.** JazzCash and Easypaisa are their own payment methods, so the galla and the wallets reconcile separately.
- **You want rupee pricing and local support.** No currency conversion on your software bill.
- **You need FBR or PRA integration** at the counter, which Nafaa offers as an option.`),
    shot({
      heading: 'Built around how Pakistan pays',
      body: 'Cash, card, JazzCash, Easypaisa and udhaar sit at the bottom of the bill. The day book and the journal sent to your accountant see the same split.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'split-right',
      callouts: [
        { x: 86, y: 93, label: 'Payment methods' },
        { x: 85, y: 79, label: 'Bill total' },
      ],
    }),
    prose(`## Using Nafaa and QuickBooks together

If you already keep your books in QuickBooks Online, you do not have to choose. Nafaa's accounting settings connect to QuickBooks Online and send one summary journal per day, always balanced: sales by payment method, udhaar given and received back, discounts, refunds and expenses, with cost of goods sold and stock as an option. You map each line to an account in your QuickBooks chart of accounts once. If a day fails to send, you can resend it, and a day that was already sent is not sent twice.

Your accountant sees daily totals instead of every bill, and the counter keeps working in rupees with local payment methods.`),
    steps(
      'Connect Nafaa to QuickBooks Online',
      [
        ['Set up Nafaa first', 'Add products and staff, and bill a few test sales so there is a day to send.'],
        ['Connect QuickBooks Online', 'From Nafaa\'s accounting settings, sign in to QuickBooks and allow access.'],
        ['Map the accounts', 'Choose the QuickBooks account for sales, discounts, returns, each payment method, udhaar and expenses.'],
        ['Send one day and check it', 'Send yesterday\'s journal and compare it with Nafaa\'s day report.'],
        ['Let it run', 'Each day\'s journal can then be sent as routine, and the history shows what was sent.'],
      ],
      undefined,
      true,
    ),
    prose(`## Questions to ask before you decide

- Do most of your sales happen at a counter, or by invoice?
- Do you need inventory on your starting plan?
- Which payment methods do your customers use?
- Where is your accountant, and which software do they use?
- Is QuickBooks offered with support and billing in your country? Check Intuit's country page before you buy.

If the counter is the heart of your business, start with Nafaa. If the books are, and QuickBooks fits your country, it is a sound choice, and the two can work side by side.`),
  ],
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:payments', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-tally', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-excel', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/integrations/accounting/AccountingPage.tsx',
    'apps/api/src/integrations/accounting/quickbooks.adapter.ts',
    'apps/api/src/integrations/accounting/daily-journal.ts',
    'apps/api/src/integrations/accounting/accounting.service.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/core/hardware/devices.ts',
    'apps/web/src/modules/inventory/stock-adjustments/components/StockCountPanel.tsx',
    'apps/api/src/integrations/fbr/fbr.service.ts',
  ],
  factNote:
    'QuickBooks facts read on 2026-10-26: quickbooks.intuit.com/global (regional sites listed for UAE, UK, US and others; Pakistan entry has no regional link) and quickbooks.intuit.com/pricing (US: Simple Start 1 user, Essentials 3, Plus 5 with inventory tracking, Advanced 25; prices in US dollars; "Mobile point of sale" link). Nafaa QuickBooks journal checked in apps/api/src/integrations/accounting.',
  topics: ['Built for', 'Country sites', 'Pricing', 'Users', 'Inventory', 'POS', 'Local payments', 'Khata', 'Tax', 'Working together'],
  dropped: ['"Certified integration" for FBR.', '"Urdu + English, 24/7" support.', 'All QuickBooks cells from the old page (no dated source).', '"Nafaa Bazaar built-in" (O14 pending).'],
  needsOwner: [
    'Verify before publishing: whether QuickBooks Online can be bought and billed from Pakistan (the country selector showed no Pakistan regional site on 2026-10-26).',
    'Verify: US plan user counts (Simple Start 1, Essentials 3, Plus 5, Advanced 25) and that inventory tracking is listed only on Plus and Advanced.',
    'Verify: QuickBooks "Mobile point of sale" availability outside the US.',
    'Verify: QuickBooks does not list JazzCash/Easypaisa or Pakistan FBR features (stated as "not listed on the pages checked").',
    'Confirm the QuickBooks Online connection is live on production (QBO_CLIENT_ID / QBO_CLIENT_SECRET set, Intuit app approved) before this page goes out.',
  ],
};

export default spec;
