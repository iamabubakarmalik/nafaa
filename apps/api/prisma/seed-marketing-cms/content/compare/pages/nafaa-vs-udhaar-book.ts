/**
 * Nafaa vs Udhaar Book (now Rupin). Facts from udhaar.pk (home, Sale POS,
 * Stock Book pages), the App Store listing that announces the Rupin name,
 * and rupin.pk, all read on CHECKED_ON.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { compareTable, disclosure, src, type CompareSpec } from '../_compare';

const UB_HOME = src('Udhaar Book home page (features, payments, earn money)', 'https://udhaar.pk/', 'Udhaar Book');
const UB_POS = src('Udhaar Book Sale POS page', 'https://udhaar.pk/sale-pos/', 'Udhaar Book');
const UB_STOCK = src('Udhaar Book Stock Book page (inventory, platforms)', 'https://udhaar.pk/stock-book/', 'Udhaar Book');
const UB_IOS = src('Rupin (formerly Udhaar Book) on the App Store', 'https://apps.apple.com/us/app/rupin-formerly-udhaar-book/id1542333203', 'Apple App Store');
const RUPIN = src('Rupin home page', 'https://rupin.pk/', 'Rupin');
const SOURCES = [UB_HOME, UB_POS, UB_STOCK, UB_IOS, RUPIN];

const SUMMARY =
  'Udhaar Book, which its App Store listing says is now called Rupin, is a free khata, cash book and payments app with a business wallet, mobile load and bill payments. Nafaa is a POS-first system for running a counter, stock and udhaar together. This page compares them and says when Udhaar Book is the better pick.';

const spec: CompareSpec = {
  slug: 'nafaa-vs-udhaar-book',
  title: 'Nafaa vs Udhaar Book',
  seoTitle: 'Nafaa vs Udhaar Book (Rupin): Which Fits Your Shop?',
  seoDescription:
    'Nafaa vs Udhaar Book, now Rupin: a free khata and payments app against a counter POS with stock and udhaar. Fair comparison with sources, checked Oct 2026.',
  competitorName: 'Udhaar Book',
  competitorUrl: 'https://udhaar.pk/',
  verdict:
    'Udhaar Book (Rupin) fits a business that wants a free khata with a wallet for receiving and sending money, plus extra income from mobile load and bill payments. Nafaa fits a shop whose day runs through a busy counter, where every bill should move stock, khata and cash together.',
  summary: SUMMARY,
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compare', heading: 'Nafaa vs Udhaar Book (now Rupin)' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Udhaar Book for a free khata and a business wallet; Nafaa for a fast counter where udhaar, stock and cash stay in step.' },
        { label: 'Choose Udhaar Book if', value: 'You want to start free, collect money by wallet or bank transfer into one app, and sell load or bill payments.' },
        { label: 'Choose Nafaa if', value: 'You bill many customers a day with a scanner and printer, and need stock, staff controls and branch reports.' },
        { label: 'Name change', value: 'The App Store listing reads "Udhaar Book is now Rupin"; accounts and records stay the same.' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Udhaar Book (ab Rupin) muft khata aur paise lene dene ke liye acha hai. Agar counter par roz bohat bill bante hain aur Stock, udhaar aur galla ek saath chalna chahiye, to Nafaa behtar hai.',
      'Which one should you choose?',
    ),
    disclosure('Udhaar Book and Rupin', 'udhaar.pk, rupin.pk and the App Store listing'),
    prose(`## What each one is

**Udhaar Book** started as a digital khata. Its website, udhaar.pk, describes a credit book with free reminders and invoices, a cash book, a staff book for attendance, overtime, advances and salaries, a stock book, an invoice book and a Sale POS. It also lets you request money by bank transfer (IBFT) or wallet, and earn commission by selling mobile load (up to 2%), paying customers' utility bills and selling vouchers (4%). The site calls the app "100% free".

The App Store listing now reads **"Udhaar Book is now Rupin"** and says accounts and records stay the same. Under the new name the app adds a business wallet that receives payments through JazzCash, Easypaisa, Raast and bank transfer, which the listing says "operates under the State Bank of Pakistan's EMI regulatory framework". It also lists GST and sales tax invoices, a POS that prints receipts, inventory with warehouses, and payroll.

**Nafaa** is built the other way round. The bill at the counter comes first. Scanning items, choosing how the customer pays and printing the receipt also reduces stock, posts any udhaar to the khata and records the money in the right drawer or account. Purchasing, suppliers, staff roles, expenses, branches and reports all read from those bills.`),
    compareTable(
      'Nafaa and Udhaar Book side by side',
      'Udhaar Book and Rupin details are from udhaar.pk, rupin.pk and the App Store listing, checked on the date shown. Nafaa details are from the product as it is today.',
      'Udhaar Book (Rupin)',
      [
        ['Starting point', 'The bill at the counter, with stock, khata and cash updated from it', 'The khata and cash book, now with a business wallet'],
        ['Point of sale', 'Barcode, search and quick keys; receipt printer, cash drawer and customer display', 'Sale POS: several items per sale, item Discounts, cash or udhaar, shareable receipts'],
        ['Stock', 'Per branch, with variants, units, batches, transfers and stock counts', 'Stock Book with units, barcodes, expiry dates, low-stock alerts; auto update on sale'],
        ['Udhaar reminders', 'WhatsApp reminders from the khata, sorted by age of balance', 'Free automatic reminders with the customer ledger'],
        ['Receiving money', 'Records cash, card, wallets and bank; shows your own Raast, JazzCash or Easypaisa QR with the amount', 'Wallet receives JazzCash, Easypaisa, Raast and IBFT; payment links'],
        ['Extra services', 'Not offered', 'Mobile load, bill payments and vouchers with commission'],
        ['Staff', 'Logins with roles and permissions; attendance and payroll', 'Attendance, overtime, advances and salaries'],
        ['Without internet', 'Counter keeps billing; sales sync later', 'Not stated on the pages checked'],
        ['Devices', 'Browser on any phone, tablet or computer; Windows app', 'Android, iOS and a web version'],
        ['Price', 'Paid plans from {{price:min.monthly}} a month after a 7-day free trial', 'Described as "100% free"; the App Store lists it as Free'],
      ],
      SOURCES,
    ),
    prose(`## When Udhaar Book is the better choice

- **Cost is the deciding factor.** Udhaar Book describes itself as free. Nafaa is paid after the trial.
- **You want one place to receive money.** The Rupin wallet takes JazzCash, Easypaisa, Raast and bank transfers into a business account. Nafaa shows your own QR on the bill and records the payment, but the money goes to your existing wallet or bank, not to a Nafaa account.
- **You sell mobile load and bill payments.** These earn commission inside the Udhaar Book app. Nafaa does not offer them.
- **Most of your work is recording entries, not billing a queue.** A supplier, a tailor or a small distributor may never need a scanner and printer.

## When Nafaa is the better choice

- **Your counter is busy.** Nafaa is built for speed: keyboard shortcuts, barcode scanning, quick keys for loose items, and a big button that takes cash and prints in one step. See [POS](/product/pos).
- **Udhaar should come from the bill.** Pick udhaar as the payment and the customer's khata shows exactly which items were taken. A credit limit stops a bill that would go past the agreed amount unless a manager approves it with a PIN.
- **You want the galla to balance.** Opening float, cash taken out for expenses, and a closing count against the expected amount, for each counter and shift.
- **Staff need limits.** Roles control who can give a Discount, make a refund, or see Cost and Profit. See [Staff](/product/staff).
- **Power and internet cut out.** The counter keeps billing and syncs later. See [Offline POS](/product/offline-pos).
- **You have, or plan, a second branch.** Each branch keeps its own stock, and head office sees them side by side. See [Multi-Branch](/product/multi-shop).`),
    shot({
      heading: 'Built for the counter first',
      body: 'Items, the bill total and every payment method on one screen, so the cashier can serve the next customer quickly.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'split-right',
      callouts: [
        { x: 85, y: 79, label: 'Bill total' },
        { x: 80, y: 94, label: 'Cash, card, wallets and udhaar' },
      ],
    }),
    prose(`## Using both

Some shops keep a payments app and run the counter on Nafaa. That works: the customer pays into your wallet as usual, and the cashier records the payment as JazzCash, Easypaisa or bank transfer on the bill, so Nafaa's day book shows the split and the wallet balance can be matched at closing. What you should avoid is keeping udhaar in two places. Pick one khata and use it for every customer, or balances will drift apart.

## The change of name

The App Store listing for the iPhone app is titled "Rupin (formerly Udhaar Book)". Rupin's own website, rupin.pk, presents business banking, payments, invoices, expenses, staff and stock. The udhaar.pk website still describes the Udhaar Book features. If you are choosing today, look at both sites and the current app to see what is offered under the Rupin name.`),
    steps(
      'Moving your khata to Nafaa',
      [
        ['Write down each balance', 'From Udhaar Book, note what each customer and supplier owes today.'],
        ['Add customers with opening balances', 'Enter them in Nafaa so the new khata starts where the old one ended. Set a credit limit for regulars.'],
        ['Import products', 'Upload your product list from Excel with cost, price and stock.'],
        ['Run the counter for a week', 'Bill every sale in Nafaa and check the closing count each night.'],
        ['Remind by age', 'Start with the oldest balances; the khata sorts them for you.'],
      ],
      undefined,
      true,
    ),
    prose(`## Before you decide

Count the bills on a busy day, check whether you need a scanner and printer, and decide whether you want a wallet inside the app or prefer to keep your own JazzCash, Easypaisa and bank accounts. If the counter matters most, [try Nafaa](/pricing) on a real day. For more options, see [Khata apps compared](/best/khata-apps-compared) and [Nafaa vs DigiKhata](/compare/nafaa-vs-digikhata).`),
  ],
  relations: [
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:payments', kind: 'RELATED' },
    { ref: 'BEST_OF:khata-apps-compared', kind: 'RELATED' },
    { ref: 'ALTERNATIVE:udhaar-book-alternative', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-digikhata', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:udhaar', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/CustomerProfilePage.tsx',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/payments/PayQrPage.tsx',
    'apps/web/src/modules/finance/cash-register',
    'apps/web/src/modules/hr/staff/components/RolesPanel.tsx',
    'apps/web/src/modules/hr/attendance/pages/AttendancePage.tsx',
    'apps/web/src/modules/hr/payroll/pages/PayrollPage.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/organization/shops/pages/ShopsOverviewPage.tsx',
  ],
  factNote:
    'Udhaar Book facts read on 2026-10-26: udhaar.pk (credit book with free reminders, cash book, staff payroll, inventory, IBFT/wallet payment requests, easyload up to 2%, bill payments, vouchers 4%, "100% free"), udhaar.pk/sale-pos (multi-item sales, item discounts, udhaar or cash, shareable receipts), udhaar.pk/stock-book (units, barcodes, expiry dates, auto update on sale; Android, iOS and web version), App Store listing "Rupin (formerly Udhaar Book)" (Free; "Udhaar Book is now Rupin"; wallet with JazzCash, Easypaisa, Raast, IBFT; "operates under the State Bank of Pakistan\'s EMI regulatory framework"; GST and sales tax invoices; POS prints receipts; warehouses; payroll) and rupin.pk. Offline use not stated on those pages.',
  topics: ['Starting point', 'POS', 'Stock', 'Reminders', 'Receiving money', 'Extra services', 'Staff', 'Offline', 'Devices', 'Price'],
  dropped: ['User counts and "#1 ranked" claims from the vendor site.', 'Customer names shown on rupin.pk.'],
  needsOwner: [
    'Fact-check stamp in the admin (NOT_FACT_CHECKED blocks publish until then).',
    'Verify: the rename to Rupin (App Store title "Rupin (formerly Udhaar Book)") and whether the Android app has the same name; decide whether the page title should say "Udhaar Book (Rupin)".',
    'Verify: commission figures (easyload up to 2%, vouchers 4%) on udhaar.pk.',
    'Verify: whether Udhaar Book/Rupin works offline (not stated on the pages checked, so the table says so).',
    'Verify: Rupin wallet EMI statement as quoted from the App Store listing.',
  ],
};

export default spec;
