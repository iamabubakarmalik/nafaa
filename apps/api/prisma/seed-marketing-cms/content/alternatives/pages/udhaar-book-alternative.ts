/**
 * Udhaar Book alternative. Facts from udhaar.pk (home and Sale POS pages)
 * and the App Store listing that announces the Rupin name, read on
 * CHECKED_ON. Written for shops weighing a counter POS against a free khata
 * and payments app.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { disclosure } from '../../compare/_compare';
import { altTable, src, type AlternativeSpec } from '../_alternative';

const UB_HOME = src('Udhaar Book home page (features, payments, earn money)', 'https://udhaar.pk/', 'Udhaar Book');
const UB_POS = src('Udhaar Book Sale POS page', 'https://udhaar.pk/sale-pos/', 'Udhaar Book');
const UB_IOS = src('Rupin (formerly Udhaar Book) on the App Store', 'https://apps.apple.com/us/app/rupin-formerly-udhaar-book/id1542333203', 'Apple App Store');
const SOURCES = [UB_HOME, UB_POS, UB_IOS];

const SUMMARY =
  'Udhaar Book, now called Rupin on the App Store, is a free khata, cash book and payments app. Shops look for an alternative when the counter, stock and udhaar must run as one system, with staff limits and a galla that balances. This page covers the trade-off, how to switch and when to stay.';

const spec: AlternativeSpec = {
  slug: 'udhaar-book-alternative',
  title: 'Udhaar Book Alternative for Shops',
  competitorName: 'Udhaar Book',
  competitorUrl: 'https://udhaar.pk/',
  verdict:
    'Keep Udhaar Book (Rupin) if you want a free khata with a built-in wallet and extra income from load and bill payments. Choose a counter POS such as Nafaa when billing speed, stock accuracy, staff limits and a balanced galla matter more.',
  summary: SUMMARY,
  seoTitle: 'Udhaar Book Alternative: Khata Inside a Shop POS',
  seoDescription:
    'Udhaar Book (now Rupin) alternative for busy shops: a POS where udhaar, stock and the galla come from the bill. When to switch, what to check, how to move.',
  focusKeyword: 'udhaar book alternative',
  blocks: [
    hero(SUMMARY, { eyebrow: 'Alternatives', heading: 'An Udhaar Book alternative for shops' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Stay on Udhaar Book for a free khata and wallet; move to a POS with a khata when the counter, stock and staff need one system.' },
        { label: 'Name change', value: 'The App Store listing says "Udhaar Book is now Rupin"; records stay the same' },
        { label: 'Main difference', value: 'A khata app records money; a POS records the sale, the stock and the money in one step' },
        { label: 'What you give up', value: 'The free price, the in-app wallet and commission from load and bill payments' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Udhaar Book (ab Rupin) muft khata aur wallet ke liye acha hai. Jab counter, Stock, staff aur galla ek hi system me chahiye hon, to aisa POS lein jisme khata bill ke saath chale.',
      'Do you need an Udhaar Book alternative?',
    ),
    disclosure('Udhaar Book and Rupin', 'udhaar.pk and the App Store listing'),
    prose(`## What Udhaar Book does well

Udhaar Book's website describes a credit book with free reminders and invoices, a cash book, a staff book for attendance and salaries, a stock book with barcodes and expiry dates, and a Sale POS where you can add several items, apply item Discounts and choose cash or udhaar. It lets you request payments by bank transfer or wallet, and earn commission on mobile load (up to 2%), utility bill payments and vouchers (4%). The site calls it "100% free". The App Store listing now presents the app as **Rupin**, with a business wallet that receives JazzCash, Easypaisa, Raast and bank transfers.

## Where shops start to need more

A khata and payments app is designed around money coming in and going out. A busy shop is designed around the counter. The gaps show up in the same places:

- **The galla.** At closing, you want to know what should be in the drawer, compare it with the count, and see who was on the counter. That needs shifts and an expected amount.
- **Staff limits.** A cashier should not be able to give any Discount or any amount of credit. Limits need roles and a manager PIN.
- **Stock you can trust.** Purchases from suppliers, returns, transfers between branches and stock counts all have to move the same numbers.
- **Speed at the counter.** Keyboard shortcuts, quick keys for loose items and a scanner that never waits for the screen.
- **Billing through power cuts.** The counter must keep going without internet.`),
    altTable(
      'Udhaar Book and Nafaa for a shop counter',
      'Udhaar Book details are from udhaar.pk and the App Store listing, checked 26 October 2026. Nafaa details are from the product as it is today.',
      'Udhaar Book (Rupin)',
      [
        ['Main purpose', 'Running the counter, stock and khata together', 'Khata, cash book and business wallet'],
        ['Sale screen', 'Barcode, quick keys, keyboard shortcuts, receipt printer and cash drawer', 'Sale POS with several items, item Discounts, cash or udhaar'],
        ['Cash drawer and shifts', 'Opening float, cash in and out, closing count against expected', 'Cash book of inflows and outflows'],
        ['Staff limits', 'Roles for Discount, refund and seeing Cost; manager PIN for overrides', 'Staff attendance, overtime, advances and salaries'],
        ['Supplier purchases', 'Purchase orders, receiving, supplier balances', 'Supplier entries in the credit book'],
        ['Receiving money', 'Your own JazzCash, Easypaisa or Raast QR with the amount; money goes straight to you', 'In-app wallet for JazzCash, Easypaisa, Raast and bank transfer'],
        ['Price', 'From {{price:min.monthly}} a month after a 7-day free trial', 'Described as "100% free"; Free on the App Store'],
      ],
      SOURCES,
    ),
    diagram(
      'One bill at the counter updates the stock, the customer khata and the cash drawer together, and the day report reads from all three.',
      {
        kind: 'flow',
        nodes: [
          { id: 'bill', label: 'Bill at the counter', icon: 'receipt' },
          { id: 'stock', label: 'Stock goes down', icon: 'boxes' },
          { id: 'khata', label: 'Udhaar posts to the khata', icon: 'notebook-pen' },
          { id: 'cash', label: 'Cash or wallet recorded', icon: 'wallet' },
          { id: 'report', label: 'Day report', icon: 'chart-column' },
        ],
        edges: [
          { from: 'bill', to: 'stock' },
          { from: 'bill', to: 'khata' },
          { from: 'bill', to: 'cash' },
          { from: 'stock', to: 'report' },
          { from: 'khata', to: 'report' },
          { from: 'cash', to: 'report' },
        ],
        animate: true,
      },
      'One bill, every record',
    ),
    prose(`## When to stay on Udhaar Book

- **You want a free tool** and your sales are few enough to enter by hand.
- **You want the wallet.** If you like receiving all payments into one business account inside the app, Rupin offers that. Nafaa leaves the money in your own JazzCash, Easypaisa or bank account.
- **Load and bill payments are part of your income.** Nafaa does not sell them.

## When Nafaa is the better alternative

If your shop has a counter with a queue, staff who bill when you are not there, stock that has to match the shelf, or more than one branch, Nafaa puts the bill at the centre and builds the [khata](/product/khata), [stock](/product/inventory) and [cash register](/product/payments) around it. See the full [Nafaa vs Udhaar Book](/compare/nafaa-vs-udhaar-book) comparison.`),
    shot({
      heading: 'Staff work within the limits you set',
      body: 'Roles decide who can give a Discount, refund a bill, give credit over the limit or see Cost and Profit, so the counter runs the same when you are away.',
      id: SHOT.staff,
      url: 'app.nafaa.pk/staff',
      layout: 'split-right',
      callouts: [
        { x: 22, y: 19, label: 'Who is at work' },
        { x: 32, y: 48, label: 'Roles and permissions' },
      ],
    }),
    steps(
      'Switching from Udhaar Book',
      [
        ['Note every balance', 'Write down what each customer and supplier owes on the day you switch.'],
        ['Enter opening balances', 'Add each customer in Nafaa with today\'s balance and a credit limit.'],
        ['Import your products', 'Upload your stock list from Excel with cost, price and quantity.'],
        ['Set up staff roles', 'Give cashiers a login with the limits you want.'],
        ['Run one week on Nafaa', 'Bill everything at the counter and close the galla each night.'],
      ],
      undefined,
      true,
    ),
  ],
  faqs: [
    [
      'Is Udhaar Book now called Rupin?',
      'The App Store listing for the iPhone app is titled "Rupin (formerly Udhaar Book)" and says "Udhaar Book is now Rupin", with accounts and records staying the same. The udhaar.pk website still describes the Udhaar Book features. Check the current app in your store before deciding.',
    ],
    [
      'Can I keep using my JazzCash or Easypaisa account with Nafaa?',
      'Yes. You add your own receive QR once, and Nafaa shows it with the bill amount at checkout and on the customer display. The money goes straight to your account and Nafaa takes no fee. The cashier records the payment as JazzCash or Easypaisa, so the closing report shows the split.',
    ],
    [
      'Will my customers notice the change?',
      'Mostly in a good way. They get a printed or WhatsApp receipt for each bill, and udhaar reminders show the amount due. Their balance continues from the opening balance you enter on the first day, so nobody has to start again or argue about the old amount.',
    ],
  ],
  relations: [
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-udhaar-book', kind: 'RELATED' },
    { ref: 'BEST_OF:khata-apps-compared', kind: 'RELATED' },
    { ref: 'ALTERNATIVE:digikhata-alternative', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/offlineKhataActions.ts',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/finance/cash-register',
    'apps/web/src/modules/hr/staff/components/RolesPanel.tsx',
    'apps/web/src/modules/purchasing/suppliers/pages/SupplierDetailPage.tsx',
    'apps/web/src/core/payments/PayQrPage.tsx',
    'apps/web/src/core/hardware/CustomerDisplayPage.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
  ],
  factNote:
    'Udhaar Book facts read on 2026-10-26: udhaar.pk (credit book with free reminders and invoices, cash book, staff payroll, stock book, IBFT/wallet payment requests, easyload up to 2%, bill payments, vouchers 4%, "100% free"), udhaar.pk/sale-pos (multiple items, item discounts, udhaar or cash) and the App Store listing "Rupin (formerly Udhaar Book)" (Free; wallet with JazzCash, Easypaisa, Raast, IBFT).',
  needsOwner: [
    'Verify: the Rupin rename and whether the Android app carries the same name.',
    'Verify: Udhaar Book commission figures (load up to 2%, vouchers 4%).',
  ],
};

export default spec;
