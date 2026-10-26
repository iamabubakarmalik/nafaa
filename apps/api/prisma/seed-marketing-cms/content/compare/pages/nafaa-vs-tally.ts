/**
 * Nafaa vs Tally (TallyPrime). Tally facts from tallysolutions.com and
 * help.tallysolutions.com, read on CHECKED_ON. Pakistan availability and
 * pricing could not be confirmed on Tally's site and are left to the owner.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { compareTable, src, type CompareSpec } from '../_compare';

const TALLY = src('TallyPrime product page (features, editions, licences)', 'https://tallysolutions.com/tally-prime/', 'Tally Solutions');
const TALLY_IMPORT = src('Import Data into TallyPrime (help)', 'https://help.tallysolutions.com/import-data-in-tally/', 'Tally Solutions');
const SOURCES = [TALLY, TALLY_IMPORT];

const SUMMARY =
  'Nafaa is counter-first software for Pakistani businesses: POS billing, stock, khata and reports. TallyPrime is business management software built around accounting, inventory and tax filing. This page compares them fairly, says when Tally is the better choice, and shows how the two can work together.';

const spec: CompareSpec = {
  slug: 'nafaa-vs-tally',
  seoDescription: 'Nafaa vs TallyPrime for Pakistani businesses: counter billing, stock and khata against accounting-first software, when Tally fits better, and using both.',
  title: 'Nafaa vs Tally',
  competitorName: 'Tally',
  competitorUrl: 'https://tallysolutions.com/',
  verdict:
    'Pick Nafaa if your day is spent billing customers at a counter; pick TallyPrime if your main need is keeping full accounting books. Many businesses use both: Nafaa at the counter, Tally for the accountant.',
  summary: SUMMARY,
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compare', heading: 'Nafaa vs Tally: counter software or accounting software?' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Nafaa for running the counter, stock and udhaar; TallyPrime for full bookkeeping and accounts.' },
        { label: 'Choose Nafaa if', value: 'You bill customers all day, sell from stock, give udhaar and want sales, stock and profit on your phone.' },
        { label: 'Choose Tally if', value: 'Your accountant keeps full books, you need ledgers, vouchers and financial statements, and billing is a small part of the day.' },
        { label: 'Use both', value: 'Nafaa prepares a daily voucher file that TallyPrime can import, so the counter and the books agree.' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, with a free trial first' },
      ],
      undefined,
      'Which one should you choose?',
    ),
    compareTable(
      'Nafaa and TallyPrime side by side',
      'Tally details are from Tally\'s own product and help pages, checked on the date shown. Nafaa details are from the product as it is today.',
      'TallyPrime',
      [
        ['What it is built for', 'Running a shop or business counter: billing, stock, khata, staff and reports', 'Business management with accounting, inventory, tax filing and reports'],
        ['Counter billing (POS)', 'Barcode, search and quick keys; cash, card, JazzCash, Easypaisa and udhaar on one screen', 'Point of sale is not described on the TallyPrime product page'],
        ['Accounting books', 'Sales, expenses and profit reports; full double-entry books are left to your accountant\'s software', '"Accurate accounting and bookkeeping"'],
        ['Inventory', 'Stock per branch with variants, units, batches, transfers and stock counts', '"Complete inventory control and tracking"'],
        ['Customer udhaar (khata)', 'Khata with credit limits, ageing and WhatsApp reminders', 'Not described as a khata on the product page'],
        ['Tax features', 'Optional FBR/PRA POS integration', 'Page lists GST, e-invoicing, e-way bills and TDS/TCS, which are Indian tax systems'],
        ['Where it runs', 'In the browser on a phone, tablet or computer; offline billing syncs later', 'Installed on a PC; a hosted Cloud Access option is offered'],
        ['Several users', 'Staff logins with roles and permissions (plan limits apply)', 'Gold licence: "unlimited users on the same LAN environment"'],
        ['Pricing shown', 'From {{price:min.monthly}} a month after a free trial', 'Listed in Indian rupees on tallysolutions.com, monthly or lifetime licences'],
        ['Working together', 'Daily voucher file for import into TallyPrime', 'Imports transactions from XML (and JSON in newer releases)'],
      ],
      SOURCES,
    ),
    prose(`## Two different jobs

Nafaa and TallyPrime are often mentioned together, but they solve different problems.

**TallyPrime** is accounting-led. Tally's own product page describes it as business management software for managing books, inventory, tax filing and reports, with editions for a single PC (Silver) and for several users on the same network (Gold), and a hosted Cloud Access option. Its tax features, as listed on that page, are built for India: GST returns, e-invoicing, e-way bills and TDS/TCS. It is strong at what an accountant needs: ledgers, vouchers, financial statements and audit trails.

**Nafaa** is counter-led. It is built for the person standing behind the counter with a queue in front of them: scan, bill, take cash or JazzCash or put it on udhaar, print or WhatsApp the receipt, and move on. Stock goes down with every sale, the khata updates, and the owner sees the day's sale, profit and cash on the phone.

The question is not which is better software. It is which job you need done every day.

## When Tally is the better choice

Be honest with yourself about what your business does. TallyPrime is likely the better fit if:

- **You need full accounts.** Ledgers, journal vouchers, balance sheets and financial statements prepared in-house are Tally's home ground. Nafaa gives you sales, expense and profit reports, not a full set of books.
- **Your accountant already uses it.** If your accountant knows Tally and keeps your books in it, changing that has real cost.
- **Billing is a small part of the day.** A trading office that issues a few invoices a day and spends most of its time on payments, receipts and reconciliation does not need a fast counter.
- **You work in India.** The tax features on Tally's product page are for Indian GST and related systems.

## When Nafaa is the better choice

- **You serve customers at a counter.** Billing speed, barcode scanning, quick keys, loose goods by weight and a receipt in seconds matter more than ledger structure.
- **Udhaar is part of your trade.** A khata with limits, ageing and WhatsApp reminders is built into the counter.
- **You want to see the shop from anywhere.** Nafaa runs in the browser on a phone, tablet or computer, and billing continues offline when the internet drops.
- **Your staff need simple screens.** Cashiers learn a counter faster than an accounting package, and roles limit what each person can do.
- **You have branches.** Each shop has its own stock and cash, transfers are tracked, and the owner sees all shops together.`),
    shot({
      heading: 'The counter Tally users add alongside',
      body: 'Products on the left, the bill on the right and every payment method one tap away. Each sale moves stock, the khata and the reports at once.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      callouts: [
        { x: 40, y: 26, label: 'Categories and quick keys' },
        { x: 30, y: 47, label: 'Stock left on every tile' },
        { x: 85, y: 93, label: 'Card, JazzCash, Easypaisa, udhaar' },
      ],
    }),
    prose(`## Using Nafaa and Tally together

Many businesses do not choose. They run Nafaa at the counter and keep TallyPrime for the books. Nafaa's accounting settings include a Tally connection that prepares a file of the day's vouchers: sales by payment method, udhaar given, discounts, refunds, udhaar received back and expenses, with cost of goods as an option. You map each item to the ledger names your accountant already uses, and the accountant imports the file into TallyPrime through its import option. Each voucher carries a fixed ID, so importing the same day again updates it instead of creating a duplicate.

The accountant gets a clean daily summary instead of hundreds of bills, and the counter stays fast.`),
    steps(
      'Set up Nafaa with Tally in an afternoon',
      [
        ['Start a Nafaa trial', 'Add your products, or import them from an Excel list, and bill a few test sales.'],
        ['Ask your accountant for ledger names', 'Sales, discounts, returns, cash, bank, wallets, debtors and expense ledgers as they are named in Tally.'],
        ['Map the ledgers in Nafaa', 'Enter those names once in Nafaa\'s Tally settings. Choose whether to include cost of goods and expenses.'],
        ['Export and import one day', 'Download the day\'s file and let your accountant import it into TallyPrime. Check the day book against Nafaa\'s day report.'],
        ['Make it a routine', 'Export daily or weekly. The counter keeps billing; the books stay current.'],
      ],
      undefined,
      true,
    ),
    prose(`## Questions to ask before you decide

- Who uses the software most: a cashier or an accountant?
- How many bills do you make on a busy day?
- Do you give udhaar, and do you chase it?
- Do you need to see sales from outside the shop?
- Do you need full books in-house, or does an accountant handle them?

If the answers point to the counter, start with Nafaa and keep Tally for the books if you already use it. If they point to accounts, Tally may be all you need.`),
  ],
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-quickbooks', kind: 'RELATED' },
    { ref: 'BLOG_POST:best-pos-kiryana-2026', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/integrations/accounting/TallyCard.tsx',
    'apps/web/src/integrations/accounting/AccountingPage.tsx',
    'apps/api/src/integrations/accounting/tally.ts',
    'apps/api/src/integrations/accounting/tally.service.ts',
    'apps/web/src/modules/pos/components/PosCartPanel.tsx',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/modules/pos/hooks/usePosBatches.ts',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx',
    'apps/web/src/modules/hr/staff/components/RolesPanel.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
  ],
  factNote:
    'Tally facts read on tallysolutions.com/tally-prime (description, Silver/Gold editions, "unlimited users on the same LAN environment", Cloud Access, India tax features, INR pricing; POS not mentioned) and help.tallysolutions.com (XML/JSON import) on 2026-10-26. Nafaa Tally export checked in apps/api/src/integrations/accounting/tally.ts.',
  topics: ['What it is built for', 'POS', 'Accounting', 'Inventory', 'Khata', 'Tax', 'Where it runs', 'Users', 'Pricing', 'Working together'],
  dropped: ['All "Them" cells from the old page (no dated source).', '"Certified partner" for FBR.', '"Setup 5 minutes" vs "Days + training".', '"Marketplace built-in" (O14 pending).'],
  needsOwner: [
    'Verify before publishing: TallyPrime availability, sellers and pricing in Pakistan (tallysolutions.com shows INR pricing and no Pakistan partner was found on 2026-10-26).',
    'Verify: TallyPrime has no built-in counter POS (the product page does not mention one; Tally may offer POS features elsewhere).',
    'Verify: Gold licence wording "unlimited users on the same LAN environment" and the Cloud Access option are still current.',
    'Verify: TallyPrime import of XML/JSON transactions (help.tallysolutions.com/import-data-in-tally).',
    'Confirm the Nafaa Tally export (Settings → Accounting → Tally) is enabled on production for all plans that this page targets.',
  ],
};

export default spec;
