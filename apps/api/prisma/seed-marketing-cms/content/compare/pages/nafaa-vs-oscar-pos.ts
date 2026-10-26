/**
 * Nafaa vs Oscar POS. Oscar facts from oscar.pk (home page and FAQ, grocery
 * and retail solution pages, payments page, accounting feature page), read
 * on CHECKED_ON. Oscar does not publish POS subscription prices; the card
 * payment rates on its payments page are quoted with the date.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { compareTable, disclosure, src, type CompareSpec } from '../_compare';

const OSCAR_HOME = src('Oscar POS home page and FAQ (business types, demo, support, branches)', 'https://oscar.pk/', 'Oscar');
const OSCAR_GROCERY = src('Oscar POS for grocery (billing, inventory, tax, offline, payments)', 'https://oscar.pk/solutions/grocery', 'Oscar');
const OSCAR_RETAIL = src('Oscar POS for retail', 'https://oscar.pk/solutions/retail-solution', 'Oscar');
const OSCAR_PAY = src('Oscar payments (Oscar Wallet and card rates)', 'https://oscar.pk/payments', 'Oscar');
const OSCAR_ACCT = src('Oscar accounting solution', 'https://oscar.pk/features/accounting-solution', 'Oscar');
const SOURCES = [OSCAR_HOME, OSCAR_GROCERY, OSCAR_RETAIL, OSCAR_PAY, OSCAR_ACCT];

const SUMMARY =
  'Oscar is a Pakistani POS for restaurants, retail, grocery, salons, pharmacies and more, with its own card device, a wallet, online ordering and accounting. Nafaa is a POS for the same kinds of business, with udhaar and offline billing at its core. This page compares the two from their own pages and says where Oscar fits better.';

const spec: CompareSpec = {
  slug: 'nafaa-vs-oscar-pos',
  title: 'Nafaa vs Oscar POS',
  seoTitle: 'Nafaa vs Oscar POS: Retail and Restaurant POS Compared',
  seoDescription:
    'Nafaa vs Oscar POS for Pakistani shops and restaurants: billing, stock, payments, accounting, offline use and how pricing works, from each product\'s own pages.',
  competitorName: 'Oscar POS',
  competitorUrl: 'https://oscar.pk/',
  verdict:
    'Oscar suits a business that wants card payments, a wallet, POS and accounting from one vendor, set up through a guided demo, and that is growing into chains or franchises. Nafaa suits owners who want to sign up and start the same day, with published rupee prices, a built-in khata and a counter that keeps billing offline.',
  summary: SUMMARY,
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compare', heading: 'Nafaa vs Oscar POS' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Oscar for POS plus card acceptance and accounting from one vendor; Nafaa for a self-serve counter with khata and published rupee prices.' },
        { label: 'Choose Oscar if', value: 'You want an in-house card machine and wallet, balance sheet reporting, and a guided setup by Oscar\'s team.' },
        { label: 'Choose Nafaa if', value: 'You want to see the price first, start on your own phone or PC today, and keep udhaar at the counter.' },
        { label: 'Oscar card rates', value: 'No monthly fee, 2.6% plus half a rupee per transaction, one-time device cost (oscar.pk/payments, 26 Oct 2026)' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Oscar me POS ke saath card machine, wallet aur accounting ek hi company se milte hain. Nafaa me qeemat pehle se likhi hai, aaj hi khud shuru kar sakte hain, aur khata counter ke andar hai.',
      'Which one should you choose?',
    ),
    disclosure('Oscar POS', 'oscar.pk (home, FAQ, grocery, retail, payments and accounting pages)'),
    prose(`## What each one is

**Oscar** describes itself as "the easiest way to run your business" and lists solutions for restaurants, cafes, bakeries, franchises, retail, grocery, clothing, pharmacies, salons, gyms, petrol pumps and more. Its grocery page lists barcode scanning, PLU and weight-based billing, expiry, SKU and batch tracking, loyalty, "FBR digital invoicing" and "SRB POS integration", full offline POS with automatic sync, and JazzCash and Easypaisa integration. Oscar also sells payments: an Oscar Wallet and a card device, priced on its payments page at a one-time device cost, no monthly fee, 2.6% per transaction and a fee of half a rupee per transaction. Its accounting module lists daily journal entries, a general ledger, receivables and payables, profit and loss, balance sheet and cash flow, and "Oscar AI" for reporting. The FAQ says you start by requesting a free demo, and that onboarding support is free with ongoing support plans available.

**Nafaa** is a self-serve POS for the same range of businesses. You sign up, add products or import them from Excel, and bill on the phone, tablet or computer you already have. Every bill updates stock, the customer's khata and the cash drawer, and staff roles control Discounts, refunds and who sees Cost and Profit. A restaurant pack, a pharmacy pack and other industry packs add the screens each trade needs.`),
    compareTable(
      'Nafaa and Oscar POS side by side',
      'Oscar details are from oscar.pk, checked on the date shown. Nafaa details are from the product as it is today.',
      'Oscar POS',
      [
        ['Getting started', 'Sign up and start the 7-day trial yourself', 'Request a free demo; the team sets up the account'],
        ['Published POS price', 'From {{price:min.monthly}} a month, in rupees', 'No POS subscription price published on the pages checked'],
        ['Card payments', 'Records card payments made on your bank\'s machine', 'Own card device: no monthly fee, 2.6% plus half a rupee per transaction'],
        ['Wallets and QR', 'Shows your own Raast, JazzCash or Easypaisa QR with the bill amount; no Nafaa fee', 'QR payments, JazzCash and Easypaisa integration, Oscar Wallet'],
        ['Grocery billing', 'Barcode, quick keys, weighing scale, loose items, batches and expiry', 'Barcode, PLU and weight-based billing, expiry, SKU and batch tracking'],
        ['Customer udhaar', 'Khata from the bill, credit limits, WhatsApp reminders', 'Accounts receivable and reminders for unpaid bills'],
        ['Accounting', 'Profit, expenses and cash reports; daily journal to QuickBooks, Xero, Zoho Books or Tally', 'Journal, general ledger, P&L, balance sheet, cash flow'],
        ['Without internet', 'Counter keeps billing; sales sync later', 'Full offline POS with automatic sync'],
        ['Branches', 'Each branch with its own stock; head office sees all', 'Multi-branch pricing, inventory and reports from one dashboard'],
        ['Tax authority integration', 'Optional FBR/PRA integration', 'FBR digital invoicing and SRB POS integration listed'],
      ],
      SOURCES,
    ),
    prose(`## When Oscar is the better choice

- **You want card acceptance from your POS vendor.** Oscar sells its own card device with published rates. Nafaa records card payments but does not provide a card machine or process cards.
- **You want full accounting inside the POS.** Oscar lists a general ledger and balance sheet. Nafaa gives you sales, expense, cash and Profit reports, and sends a daily summary to your accountant's software rather than keeping a full ledger itself.
- **You prefer a guided setup.** Oscar's process starts with a demo and its team configures the account. Some owners would rather have that than set up on their own.
- **You are growing into a chain or franchise** and want Oscar's account team alongside the software.

## When Nafaa is the better choice

- **You want to know the price before talking to sales.** Nafaa's plans are on the [pricing page](/pricing), in rupees.
- **You want to start today.** Sign up, import your products and bill within the hour, on hardware you already own.
- **Udhaar is central to your trade.** Nafaa's [khata](/product/khata) is built into the bill: credit limits, balances by age and WhatsApp reminders.
- **Your accountant already uses QuickBooks, Xero, Zoho Books or Tally.** Nafaa sends them one balanced journal a day, so you keep their books where they are. See [Reports](/product/reports).
- **You keep your own wallet and bank accounts.** Nafaa's payment QR uses your own Raast, JazzCash or Easypaisa account, so money goes straight to you and Nafaa takes no fee. See [Payments](/product/payments).`),
    shot({
      heading: 'Stock you can see at a glance',
      body: 'Stock value, low stock and margin on every item, updated by each sale, purchase and return.',
      id: SHOT.inventory,
      url: 'app.nafaa.pk/products',
      layout: 'split-right',
      callouts: [
        { x: 34.5, y: 19.5, label: 'Stock value and what it will sell for' },
        { x: 50, y: 33, label: 'Low stock flagged before it runs out' },
        { x: 22, y: 81, label: 'Cost, price and margin on every item' },
      ],
    }),
    prose(`## Working out the real cost

Because Oscar does not publish its POS subscription price, compare on a full quote. Ask for the monthly or yearly software fee per counter and per branch, the cost of the card device, the card rate of 2.6% plus half a rupee per transaction against your bank's rate, any setup or training fee, and what the ongoing support plan costs after onboarding. For Nafaa, the plan price on the pricing page covers the software; hardware such as printers and scanners is your choice, and card payments go through your existing bank machine at your bank's rate.

A shop that takes 500,000 rupees a month on cards would pay about 13,000 rupees in percentage fees at 2.6%, before the per-transaction fee. If your bank's machine is cheaper, that difference matters more than the software fee.`),
    steps(
      'How to compare them fairly',
      [
        ['Write down your counters, branches and card volume', 'These decide most of the cost on either side.'],
        ['Ask Oscar for a written quote', 'Software, device, card rate, setup and ongoing support.'],
        ['Start a Nafaa trial', 'Import a product list and bill a real hour at the counter.'],
        ['Test without internet', 'Turn off Wi-Fi mid-sale in both and check what keeps working.'],
        ['Check udhaar and staff limits', 'Give a test customer credit and see how each tracks it; try a Discount as a cashier.'],
      ],
      undefined,
      true,
    ),
  ],
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:payments', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'INDUSTRY:kiryana', kind: 'RELATED' },
    { ref: 'BEST_OF:pos-software-pakistan', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-cornpos', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-quickbooks', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/payments/PayQrPage.tsx',
    'apps/web/src/core/payments/emvQr.ts',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/integrations/accounting/AccountingPage.tsx',
    'apps/api/src/integrations/accounting/registry.ts',
    'apps/api/src/integrations/accounting/tally.ts',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/organization/shops/pages/ShopsOverviewPage.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/integrations/tax-authority',
    'apps/web/src/core/hardware/devices.ts',
  ],
  factNote:
    'Oscar facts read on 2026-10-26: oscar.pk home and FAQ (business types; free demo to activate; free onboarding support and ongoing support plans; multi-branch from one dashboard; support Mon-Fri 9-6), oscar.pk/solutions/grocery (barcode, PLU and weight-based billing, expiry, SKU and batch tracking, loyalty, FBR digital invoicing, SRB POS integration, full offline POS with automatic sync, JazzCash and Easypaisa integration), /solutions/retail-solution, /payments (Oscar Wallet; one-time device cost, monthly cost shown as zero, 2.6% per transaction, per-transaction fee of half a rupee) and /features/accounting-solution (journal, ledger, AR/AP, P&L, balance sheet, cash flow, Oscar AI). No POS subscription price published. The 13,000 rupee example is simple arithmetic on the published 2.6% rate.',
  topics: ['Getting started', 'Price', 'Card payments', 'Wallets and QR', 'Grocery billing', 'Udhaar', 'Accounting', 'Offline', 'Branches', 'Tax'],
  dropped: ['Customer results and testimonials on oscar.pk (for example sales increase percentages).', '"#1 Trusted Platform" claim.', 'The name "Oscar Enterprise": not found on oscar.pk; the product is called Oscar POS there.'],
  needsOwner: [
    'Fact-check stamp in the admin (NOT_FACT_CHECKED blocks publish until then).',
    'Verify: Oscar card rates on oscar.pk/payments (zero monthly cost, 2.6% plus half a rupee per transaction, one-time device cost).',
    'Verify: the brief said "Oscar POS (Oscar Enterprise)"; oscar.pk only uses "Oscar" and "Oscar POS". Confirm this is the product meant.',
    'Verify: Oscar does not publish a POS subscription price (none found on 2026-10-26; /pricing returned 404).',
  ],
};

export default spec;
