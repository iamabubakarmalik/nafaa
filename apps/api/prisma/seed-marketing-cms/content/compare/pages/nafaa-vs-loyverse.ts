/**
 * Nafaa vs Loyverse. Loyverse facts from loyverse.com (home page and FAQ)
 * and loyverse.com/pricing, read on CHECKED_ON. Add-on prices are quoted in
 * US dollars as published, with the date.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { compareTable, disclosure, src, type CompareSpec } from '../_compare';

const LV_HOME = src('Loyverse home page and FAQ (devices, offline, payments, support)', 'https://loyverse.com/', 'Loyverse');
const LV_PRICING = src('Loyverse pricing (free tools and paid add-ons)', 'https://loyverse.com/pricing', 'Loyverse');
const SOURCES = [LV_HOME, LV_PRICING];

const SUMMARY =
  'Loyverse is a free POS used worldwide, with paid add-ons for longer sales history, employee management and advanced inventory. Nafaa is a paid POS built for Pakistan, with khata, JazzCash and Easypaisa, rupee pricing and purchasing in the product. This page compares them for a Pakistani shop and says plainly when Loyverse is the better choice.';

const spec: CompareSpec = {
  slug: 'nafaa-vs-loyverse',
  title: 'Nafaa vs Loyverse',
  seoTitle: 'Nafaa vs Loyverse: Free POS or Pakistan-Built POS?',
  seoDescription:
    'Nafaa vs Loyverse for shops and cafes in Pakistan: free POS with paid add-ons against a rupee-priced POS with khata, wallets and purchasing. Sources dated.',
  competitorName: 'Loyverse',
  competitorUrl: 'https://loyverse.com/',
  verdict:
    'Loyverse is hard to beat on price: the POS, essential inventory, loyalty, kitchen and customer displays are free. Nafaa costs money but is built around how Pakistani shops trade, with udhaar on the bill, JazzCash and Easypaisa as their own payment methods, purchasing and supplier balances, and support in Urdu.',
  summary: SUMMARY,
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compare', heading: 'Nafaa vs Loyverse for a shop in Pakistan' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Loyverse if free matters most and your needs are simple; Nafaa if udhaar, wallets, purchasing and local support matter.' },
        { label: 'Choose Loyverse if', value: 'You run a small cafe or shop, sell for cash and card, and want a free POS on an Android or iOS tablet.' },
        { label: 'Choose Nafaa if', value: 'Customers buy on khata, pay by JazzCash or Easypaisa, and you buy from suppliers on credit.' },
        { label: 'Loyverse price', value: 'Free; add-ons from US$5 a month per store (loyverse.com/pricing, 26 Oct 2026)' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Loyverse muft hai aur saada dukaan ya cafe ke liye kaafi ho sakta hai. Nafaa paid hai, magar udhaar, JazzCash, Easypaisa, supplier ka hisaab aur Urdu support Pakistan ki dukaan ke hisaab se bana hai.',
      'Which one should you choose?',
    ),
    disclosure('Loyverse', 'loyverse.com and its pricing page'),
    prose(`## What each one is

**Loyverse** calls itself a "point of sale and commerce platform for small businesses worldwide". Its pricing page lists free tools: the POS on a phone, tablet or supported POS device, sales analytics for the last 31 days, essential inventory with low-stock alerts, a loyalty program, a customer display, a kitchen display, multi-store management and integrations. Paid add-ons cover what goes beyond that: unlimited sales history at US$5 a month per store (or US$50 a year), employee management priced per employee, and advanced inventory with purchase orders and stock transfers at US$25 a month (US$250 a year). Each add-on has a 14-day free trial, and paid add-ons include 24/7 live chat support. The POS runs on iOS and Android, keeps recording sales offline, and the Back Office works in any browser.

**Nafaa** is built for businesses in Pakistan. The bill takes cash, card, JazzCash, Easypaisa, bank transfer and udhaar, alone or split. Udhaar goes to the customer's khata with credit limits and WhatsApp reminders. Purchases from suppliers add stock and track what you owe them. Staff roles, the cash drawer, expenses, branches and Profit reports are part of the product, priced in rupees.`),
    compareTable(
      'Nafaa and Loyverse side by side',
      'Loyverse details are from loyverse.com and loyverse.com/pricing, checked on the date shown. Nafaa details are from the product as it is today.',
      'Loyverse',
      [
        ['Price', 'From {{price:min.monthly}} a month in rupees, after a 7-day free trial', 'Free; paid add-ons in US dollars, prices exclude taxes'],
        ['Sales history', 'Reports over any date range you choose', 'Free: last 31 days; unlimited history US$5 a month per store'],
        ['Purchasing', 'Purchase orders, supplier records and supplier balances', 'Purchase orders and transfers in the Advanced inventory add-on, US$25 a month'],
        ['Staff controls', 'Roles for Discounts, refunds and seeing Cost; attendance and payroll', 'Employee management add-on, priced per employee'],
        ['Customer udhaar', 'Khata from the bill, credit limits, WhatsApp reminders', 'Not described on the pages checked'],
        ['Local payments', 'JazzCash, Easypaisa and bank transfer as separate methods; your own payment QR', 'Integrated payment providers listed for 30+ countries'],
        ['Without internet', 'Counter keeps billing; sales sync later', 'Keeps recording sales offline; syncs when back online'],
        ['Devices', 'Browser on any phone, tablet or computer; Windows app', 'iOS and Android phones and tablets, compatible Android POS devices'],
        ['Kitchen and customer display', 'Kitchen ticket screen (restaurant pack); customer display', 'Free kitchen display and customer display apps'],
        ['Support', 'WhatsApp and video calls, in Urdu or English', '24/7 live chat; help center in 17 languages'],
      ],
      SOURCES,
    ),
    prose(`## When Loyverse is the better choice

- **Budget is tight and needs are simple.** A tea stall, small cafe or kiosk that sells for cash and does not give credit can run on Loyverse for free.
- **You already have an Android or iOS tablet** and want native apps for the POS, kitchen display and customer display at no cost.
- **You sell in several countries** or need the app in languages other than English and Urdu. Loyverse lists over 30 languages.
- **You want to try before paying anything at all.** Loyverse needs no card to start, and its add-ons have 14-day trials. Nafaa has a 7-day free trial, then a paid plan.

## When Nafaa is the better choice

- **Credit is part of your trade.** Most kiryana, hardware, pharmacy and wholesale shops in Pakistan give udhaar. In Nafaa it is a payment method on the bill and a [khata](/product/khata) with limits and reminders.
- **Customers pay by wallet.** JazzCash and Easypaisa are their own payment methods, so the drawer and the wallet balances reconcile separately at closing. See [Payments](/product/payments).
- **You buy on credit from suppliers.** Purchases, supplier balances and payments are in [Purchasing](/product/purchasing), not an add-on.
- **You want full sales history without an add-on,** and Profit by product, by day and by branch.
- **You want to pay in rupees** with local support on WhatsApp in Urdu, rather than in US dollars per store and per employee.`),
    shot({
      heading: 'Every way Pakistan pays, on one bill',
      body: 'Cash, card, JazzCash, Easypaisa and udhaar at the bottom of the bill, with split payments when the customer pays two ways.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'split-right',
      callouts: [
        { x: 85, y: 79, label: 'Bill total' },
        { x: 80, y: 94, label: 'Card, JazzCash, Easypaisa, udhaar' },
      ],
    }),
    prose(`## What "free" costs as you grow

Loyverse's free tier covers a lot, and for many small businesses it is enough. As a shop grows, the add-ons it is most likely to need are history beyond 31 days, employee controls and purchase orders. At the published prices, one store with all three would pay US$5 plus US$25 a month, plus the per-employee charge, in US dollars and before tax. Compare that total with a Nafaa plan in rupees, and remember the exchange rate moves.

The other cost is time. If you keep udhaar in a notebook or a separate app beside a free POS, someone has to enter every credit sale twice and match the two at month end. That is the work Nafaa removes.`),
    steps(
      'Trying both in a week',
      [
        ['Get your product list', 'Put your items in a spreadsheet with name, price, cost and stock, from your current POS or by hand.'],
        ['Import into Nafaa', 'Upload the file; each line is checked before saving.'],
        ['Add your udhaar customers', 'Enter what each one owes today as an opening balance.'],
        ['Bill a full day', 'Use cash, wallets and udhaar as customers pay, then do the closing count.'],
        ['Compare the evening', 'Check how long closing took and whether the drawer, wallets and khata matched.'],
      ],
      undefined,
      true,
    ),
  ],
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:payments', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing', kind: 'RELATED' },
    { ref: 'BEST_OF:pos-software-pakistan', kind: 'RELATED' },
    { ref: 'ALTERNATIVE:loyverse-alternative-pakistan', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-odoo', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/payments/PayQrPage.tsx',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/purchasing/suppliers/pages/SupplierDetailPage.tsx',
    'apps/web/src/modules/purchasing/purchases',
    'apps/web/src/modules/hr/staff/components/RolesPanel.tsx',
    'apps/web/src/modules/hr/attendance/pages/AttendancePage.tsx',
    'apps/web/src/modules/finance/profit-report',
    'apps/web/src/modules/reports/pnl/pages/ProfitLossPage.tsx',
    'apps/web/src/industries/restaurant/pages/KotDisplayPage.tsx',
    'apps/web/src/core/hardware/CustomerDisplayPage.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
  ],
  factNote:
    'Loyverse facts read on 2026-10-26: loyverse.com/pricing (free: POS, 31-day analytics, essential inventory, loyalty, customer display, kitchen display, multi-store, integrations; add-ons: unlimited sales history US$5/month per store or US$50/year, employee management per employee, advanced inventory US$25/month or US$250/year; 14-day trials; 24/7 live chat; prices exclude taxes; no credit card to start) and loyverse.com (iOS and Android, compatible Android POS devices, offline sales sync, integrated payments in 30+ countries, 30+ languages, help center in 17 languages). Employee add-on price was not readable in the page text, so it is described as "per employee".',
  topics: ['Price', 'Sales history', 'Purchasing', 'Staff', 'Udhaar', 'Local payments', 'Offline', 'Devices', 'Displays', 'Support'],
  dropped: ['"170+ countries" usage figure from loyverse.com.'],
  needsOwner: [
    'Fact-check stamp in the admin (NOT_FACT_CHECKED blocks publish until then).',
    'Verify: Loyverse add-on prices (US$5/month per store, US$25/month advanced inventory and whether that is per store) and the employee management price.',
    'Verify: whether Loyverse offers customer credit or store credit (not described on the pages checked).',
    'Confirm Nafaa support channels (WhatsApp and video calls, Urdu or English) as stated on the page.',
  ],
};

export default spec;
