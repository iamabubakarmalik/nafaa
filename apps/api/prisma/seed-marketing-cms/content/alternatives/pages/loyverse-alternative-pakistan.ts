/**
 * Loyverse alternative in Pakistan. Loyverse facts from loyverse.com and
 * loyverse.com/pricing, read on CHECKED_ON. Written for Pakistani shops and
 * cafes using the free Loyverse POS that need udhaar, local wallets or
 * purchasing.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { disclosure } from '../../compare/_compare';
import { altTable, src, type AlternativeSpec } from '../_alternative';

const LV_HOME = src('Loyverse home page and FAQ (devices, offline, payments, support)', 'https://loyverse.com/', 'Loyverse');
const LV_PRICING = src('Loyverse pricing (free tools and paid add-ons)', 'https://loyverse.com/pricing', 'Loyverse');
const SOURCES = [LV_HOME, LV_PRICING];

const SUMMARY =
  'Loyverse is a free POS that many cafes and small shops in Pakistan try first. Shops look for an alternative when they need what a Pakistani counter uses daily: udhaar on a khata, JazzCash and Easypaisa, supplier credit, and rupee pricing. This page covers when to switch, what to check and when to stay.';

const spec: AlternativeSpec = {
  slug: 'loyverse-alternative-pakistan',
  title: 'Loyverse Alternative in Pakistan',
  competitorName: 'Loyverse',
  competitorUrl: 'https://loyverse.com/',
  verdict:
    'For a cash-and-card cafe or kiosk, Loyverse\'s free tier is a sensible choice. For a Pakistani shop that gives udhaar, takes wallets, buys from suppliers on credit and wants support in Urdu, a POS built for Pakistan, such as Nafaa, fits better.',
  summary: SUMMARY,
  seoTitle: 'Loyverse Alternative in Pakistan: POS With Khata and Wallets',
  seoDescription:
    'A Loyverse alternative for Pakistani shops: udhaar khata, JazzCash and Easypaisa, supplier purchases and rupee pricing. When to switch and when to stay.',
  focusKeyword: 'loyverse alternative pakistan',
  blocks: [
    hero(SUMMARY, { eyebrow: 'Alternatives', heading: 'A Loyverse alternative built for Pakistan' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Stay on Loyverse if free matters most and you sell for cash and card; switch when udhaar, wallets and supplier credit become daily work.' },
        { label: 'Loyverse price', value: 'Free; add-ons from US$5 a month per store (loyverse.com/pricing, 26 Oct 2026)' },
        { label: 'What changes', value: 'Udhaar on the bill, JazzCash and Easypaisa as methods, supplier balances, rupee pricing' },
        { label: 'What you give up', value: 'A free POS and Loyverse\'s native iOS and Android apps' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Agar sirf cash aur card par bechte hain to muft Loyverse theek hai. Jab udhaar, JazzCash, Easypaisa aur supplier ka udhaar roz ka kaam ban jaye, to Pakistan ke liye bana POS behtar hai.',
      'Do you need a Loyverse alternative?',
    ),
    disclosure('Loyverse', 'loyverse.com and its pricing page'),
    prose(`## Why Pakistani shops look beyond Loyverse

Loyverse is a well-made free POS. Its pricing page lists the POS, essential inventory with low-stock alerts, a loyalty program, kitchen and customer displays, multi-store management and integrations at no cost, with sales analytics for the last 31 days. It runs on iOS and Android, keeps recording sales offline, and its paid add-ons start with a 14-day trial.

The reasons shops in Pakistan move on are usually about how trade works here, not about quality:

- **Udhaar.** Kiryana, hardware, pharmacy and wholesale shops give credit every day. A POS without a khata means a second app or a notebook, and every credit sale entered twice.
- **Wallet payments.** Customers pay by JazzCash, Easypaisa and Raast. At closing, the owner needs the drawer and each wallet to match on their own.
- **Supplier credit.** Shops buy from the wholesale market on credit and pay over weeks. Purchase orders and stock transfers are in Loyverse's Advanced inventory add-on at US$25 a month; supplier balances are not described on the pages we checked.
- **History.** The free tier shows 31 days of sales analytics. Comparing this Eid with last Eid needs the US$5 a month history add-on.
- **Dollar pricing.** Add-ons are billed in US dollars per store, and the employee add-on per employee.`),
    altTable(
      'Loyverse and Nafaa for a Pakistani shop',
      'Loyverse details are from loyverse.com and loyverse.com/pricing, checked 26 October 2026. Nafaa details are from the product as it is today.',
      'Loyverse',
      [
        ['Price', 'From {{price:min.monthly}} a month in rupees', 'Free, with paid add-ons in US dollars'],
        ['Udhaar khata', 'From the bill, with credit limits and WhatsApp reminders', 'Not described on the pages checked'],
        ['JazzCash and Easypaisa', 'Their own payment methods; your own payment QR with the amount', 'Integrated payment providers listed for 30+ countries'],
        ['Supplier purchases', 'Purchase orders, receiving and supplier balances', 'Purchase orders in the Advanced inventory add-on (US$25 a month)'],
        ['Sales history', 'Reports over any date range', '31 days free; unlimited with a US$5 a month add-on per store'],
        ['Offline billing', 'Yes, syncs later', 'Yes, syncs to the Back Office when back online'],
        ['Apps', 'Browser on any device; Windows app', 'Native iOS and Android apps'],
      ],
      SOURCES,
    ),
    prose(`## When to stay on Loyverse

- **A cafe or kiosk that sells for cash and card** and gives no credit gets a lot from Loyverse for free.
- **You prefer native phone and tablet apps** for the POS, kitchen display and customer display.
- **You need a language other than English and Urdu.** Loyverse lists over 30.
- **You do not want any monthly bill at all.** Nafaa is paid after the 7-day trial.

## Where Nafaa fits

Nafaa was built for Pakistani counters. The [khata](/product/khata) is a payment method on the bill. JazzCash, Easypaisa, bank transfer and cash reconcile separately at closing ([Payments](/product/payments)). [Purchasing](/product/purchasing) tracks what you owe each supplier. Reports cover any period, Profit included. Plans are priced in rupees, and setup help is on WhatsApp in Urdu or English. For the full comparison, see [Nafaa vs Loyverse](/compare/nafaa-vs-loyverse).`),
    shot({
      heading: 'Reorder before the shelf runs empty',
      body: 'The low-stock list shows how many days each item will last and how much to order, and turns into a purchase order for the supplier. When the goods arrive, stock and the supplier\'s balance go up together.',
      id: SHOT.lowStock,
      url: 'app.nafaa.pk/inventory/low-stock',
      layout: 'split-right',
      callouts: [
        { x: 61, y: 61, label: 'How many days the stock will last' },
        { x: 71, y: 61, label: 'How much to order' },
        { x: 92, y: 12, label: 'Turn the list into a purchase order' },
      ],
    }),
    steps(
      'Switching from Loyverse',
      [
        ['Get your item list', 'Put products in a spreadsheet with name, barcode, cost, price and stock.'],
        ['Import into Nafaa', 'Upload the file; every line is checked before saving.'],
        ['Add udhaar customers and suppliers', 'Enter what customers owe you and what you owe suppliers as opening balances.'],
        ['Add your payment QR', 'Upload your JazzCash, Easypaisa or Raast receive QR once.'],
        ['Bill a full week', 'Close the galla and wallets each night and compare with the counts.'],
      ],
      undefined,
      true,
    ),
  ],
  faqs: [
    [
      'Is Loyverse available in Pakistan?',
      'Loyverse describes itself as a POS for small businesses worldwide, and you can sign up for free without a card. Some features, such as integrated card payments, depend on payment providers that are listed only for certain countries. Check the Loyverse site for what works in Pakistan.',
    ],
    [
      'Is there a free Loyverse alternative made for Pakistan?',
      'Nafaa is not free: paid plans start at {{price:min.monthly}} a month after a 7-day free trial. In return it includes the khata, wallet payment methods, purchasing and full sales history that a Pakistani shop would otherwise add separately, through add-ons, a second app or a notebook.',
    ],
    [
      'Can Nafaa run on the Android tablet I use for Loyverse?',
      'Yes. Nafaa runs in the browser on Android tablets and phones, and can be added to the home screen like an app. Bluetooth receipt printers connect from the browser on Android. For a main counter with a cash drawer, the Nafaa Windows app is also available.',
    ],
  ],
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-loyverse', kind: 'RELATED' },
    { ref: 'BEST_OF:pos-software-pakistan', kind: 'RELATED' },
    { ref: 'ALTERNATIVE:desktop-pos-alternative', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cloud-pos', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/offlineKhataActions.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/payments/PayQrPage.tsx',
    'apps/web/src/modules/purchasing/suppliers/pages/SupplierDetailPage.tsx',
    'apps/web/src/modules/purchasing/suppliers/api/supplier-ledger.api.ts',
    'apps/web/src/modules/reports/pnl/pages/ProfitLossPage.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/vite.config.ts',
    'apps/web/src/core/hardware/devices.ts',
  ],
  factNote:
    'Loyverse facts read on 2026-10-26: loyverse.com/pricing (free tools incl. 31-day analytics; add-ons: unlimited history US$5/month per store, employee management per employee, advanced inventory with purchase orders and transfers US$25/month; 14-day trials; no card to start) and loyverse.com (iOS and Android, offline sales sync, payment providers in 30+ countries, 30+ languages, "small businesses worldwide"). Nafaa PWA install from apps/web/vite.config.ts (VitePWA manifest); Bluetooth printing from the browser per the existing FAQ and core/hardware/devices.ts.',
  needsOwner: [
    'Verify: Loyverse add-on prices and the employee add-on price (not readable in page text on 2026-10-26).',
    'Verify: whether Loyverse supports customer credit or supplier balances in the current app (not described on the pages checked).',
  ],
};

export default spec;
