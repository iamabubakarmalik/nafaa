/**
 * Nafaa vs DigiKhata. DigiKhata facts from digikhata.pk and its Google Play
 * and App Store listings, read on CHECKED_ON. No DigiKhata prices are
 * published on those pages, so none are quoted.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { compareTable, disclosure, src, type CompareSpec } from '../_compare';

const DK_HOME = src('DigiKhata home page (features, apps, payments, company)', 'https://digikhata.pk/', 'DigiKhata');
const DK_PLAY = src('DigiKhata on Google Play (features, offline access, in-app purchases)', 'https://play.google.com/store/apps/details?id=com.androidapp.digikhata&hl=en&gl=US', 'Google Play');
const DK_IOS = src('DigiKhata on the App Store (languages, free with in-app purchases)', 'https://apps.apple.com/pk/app/digikhata-business-accounting/id1571599845', 'Apple App Store');
const SOURCES = [DK_HOME, DK_PLAY, DK_IOS];

const SUMMARY =
  'DigiKhata is a free bookkeeping and khata app with ledgers, cash book, stock book, staff book, card acceptance on the phone and small business loans. Nafaa is a POS-first system where udhaar, stock and staff hang off the bill at the counter. This page compares them fairly and says when DigiKhata is the better choice.';

const spec: CompareSpec = {
  slug: 'nafaa-vs-digikhata',
  title: 'Nafaa vs DigiKhata',
  seoTitle: 'Nafaa vs DigiKhata: Khata App or Full POS? (2026)',
  seoDescription:
    'Nafaa vs DigiKhata for Pakistani shops: a free khata and bookkeeping app against a POS with stock and udhaar built in. When each fits, with sources.',
  competitorName: 'DigiKhata',
  competitorUrl: 'https://digikhata.pk/',
  verdict:
    'DigiKhata suits a business that mainly records udhaar, cash and expenses on a phone and wants a free app with card and QR acceptance. Nafaa suits a shop where most sales go through a counter with a queue, so the bill itself should update stock, khata and the cash drawer.',
  summary: SUMMARY,
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compare', heading: 'Nafaa vs DigiKhata for a Pakistani shop' }),
    answerBox(
      [
        { label: 'Short answer', value: 'DigiKhata for a free phone ledger; Nafaa when the counter, stock and udhaar must stay in step on every bill.' },
        { label: 'Choose DigiKhata if', value: 'You record entries by hand, sell little from a counter, and want card tap and QR on the same phone.' },
        { label: 'Choose Nafaa if', value: 'You bill many customers a day, sell from stock with barcodes, and want udhaar to come from the bill itself.' },
        { label: 'Both keep', value: 'Customer and supplier balances, reminders, staff records and stock levels' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Agar zyada kaam udhaar aur cash ka hisaab likhna hai to DigiKhata kaafi hai. Agar counter par roz bohat bill bante hain aur Stock, udhaar aur galla ek saath chalna chahiye, to Nafaa behtar hai.',
      'Which one should you choose?',
    ),
    disclosure('DigiKhata', 'its own website and its Google Play and App Store listings'),
    prose(`## Two different starting points

**DigiKhata** describes itself as a "super app for small businesses". Its website lists a set of "books": a Party Ledger for customers, suppliers and bank balances, a Staff Book for attendance and payroll, a Stock Book, a Cash Book, a Bill Book for invoices and an Expense Book. Around those it offers SMS and WhatsApp reminders with templates, access rights for staff, a PIN or fingerprint lock, and several businesses under one account. It also goes beyond record keeping: the phone can take card payments by NFC tap after KYC, a single DigiQR code takes payments from banking apps with a 0% transaction fee, and eligible businesses can apply for loans of up to 50,000 rupees. It runs on Android, iOS, the web and a Windows app, and the App Store listing says it works in English, Urdu, Persian and Pashto.

**Nafaa** starts from the bill. The cashier scans or searches items at the counter, the customer pays by cash, card, JazzCash, Easypaisa, bank transfer or udhaar, and that one action reduces stock, posts the udhaar to the customer's khata and records the money in the right drawer or account. Stock, purchasing, suppliers, staff, expenses and reports are built around those bills.

So the honest question is not which app is "better", but where your day begins: with a notebook of entries, or with a queue at the counter.`),
    compareTable(
      'Nafaa and DigiKhata side by side',
      'DigiKhata details are from its website and app store listings, checked on the date shown. Nafaa details are from the product as it is today.',
      'DigiKhata',
      [
        ['What it is built for', 'Running a counter: billing, stock, khata, staff and reports in one account', 'Bookkeeping "books": party ledger, cash, stock, staff, bills and expenses'],
        ['How udhaar gets recorded', 'Chosen as a payment method on the bill, so it lands in the khata with the items', 'Entered in the party ledger; invoices from the Bill Book'],
        ['Counter billing', 'Barcode, search and quick keys, receipt printer, cash drawer, customer display', 'Bill Book invoices; Play listing mentions adding stock items with a barcode scanner'],
        ['Stock', 'Every sale, purchase and return moves stock, per branch, with variants, units and batches', 'Stock Book with stock levels and low-stock warnings'],
        ['Reminders', 'WhatsApp reminders from the khata, sorted by how old the balance is', 'SMS and WhatsApp reminders with templates; Play listing says unlimited and free'],
        ['Taking payments', 'Records cash, card, wallets and bank; shows your own Raast, JazzCash or Easypaisa QR with the bill amount', 'Card tap on the phone after KYC; DigiQR with 0% transaction fee'],
        ['Without internet', 'Counter keeps billing; sales sync when the connection returns', 'Play listing: manage ledgers without internet, back up when online'],
        ['Devices', 'Browser on any phone, tablet or computer; Windows app for the main counter', 'Android, iOS, web and a Windows app'],
        ['Languages', 'English and Roman Urdu', 'English, Urdu, Persian and Pashto (App Store listing)'],
        ['Price', 'Paid plans from {{price:min.monthly}} a month after a 7-day free trial', 'Free to download with in-app purchases; paid prices not published on the pages checked'],
      ],
      SOURCES,
    ),
    prose(`## When DigiKhata is the better choice

- **You want to start free.** DigiKhata is free to download, and its listings describe free reminders and PDF reports. Nafaa is a paid product after the trial.
- **Your sales are few and large.** A wholesaler or contractor who writes ten invoices a day does not need a fast counter. A clean ledger with reminders may be all you need.
- **You want to take cards without a machine.** DigiKhata's card tap on the phone and its DigiQR are payment services. Nafaa records card and wallet payments and can show your own receive QR, but it does not process card payments itself.
- **You need Pashto or Persian,** or Urdu script rather than Roman Urdu.
- **You are interested in its loans.** DigiKhata offers financing to eligible businesses, based on their records. Nafaa does not lend money.
- **You run several separate small businesses** and want to switch between them on one phone.

## When Nafaa is the better choice

- **A queue forms at your counter.** Billing with a barcode scanner, quick keys for loose items, a receipt printer and a cash drawer is what Nafaa is built for. See [POS](/product/pos).
- **You want udhaar without double entry.** When udhaar is chosen as the payment method, the items, the amount and the customer are recorded together. A credit limit stops a bill that would take the customer past the agreed amount, unless a manager approves it with a PIN. See [Khata](/product/khata).
- **Stock must match the shelf.** Purchases from suppliers add stock, sales take it away, returns put it back and stock counts show the difference. Branches keep their own stock and can transfer between them. See [Inventory](/product/inventory).
- **You want the drawer to balance.** Each shift has an opening float, cash in and out, and a closing count against the expected amount.
- **Staff bill when you are away.** Roles decide who can give a Discount, refund, or see Cost and Profit.
- **The power or internet goes.** Bills keep going through on the device and sync later. See [Offline POS](/product/offline-pos).`),
    shot({
      heading: 'Udhaar that comes from the bill',
      body: 'The khata lists who owes what, how old each balance is, and lets you send a WhatsApp reminder or take a payment from the same screen.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/customers/khata',
      layout: 'split-right',
      callouts: [
        { x: 25, y: 19, label: 'Total to collect' },
        { x: 58, y: 30, label: 'Balances by age' },
        { x: 90, y: 55, label: 'Payment or reminder' },
      ],
    }),
    prose(`## A day in each

Picture a kiryana store in Faisalabad with one counter and around 150 bills a day. With a ledger app, the cashier rings up the sale on a calculator or a separate machine, and when a regular customer says "khate mein likh do", someone opens the app and adds the amount by hand. Stock is counted separately. At night the owner adds up the galla and compares it with memory.

With Nafaa, the same cashier scans the items, picks udhaar as the payment, and the customer's balance, the stock and the day's sale all change at once. At closing, the drawer count is checked against what the bills say, and the owner sees the day's sale, Profit and udhaar on the phone.

For a tailor, a contractor or a supplier with a handful of large entries a day, the first way is perfectly fine and costs nothing. For a busy counter, the second saves hours and catches mistakes.`),
    steps(
      'Moving from DigiKhata to Nafaa',
      [
        ['Download your balances', 'DigiKhata lets you download ledgers as PDF reports. Keep a copy of each customer and supplier balance.'],
        ['Add customers with opening balances', 'Enter each customer in Nafaa with the balance they owe today, so the khata starts where the old one ended.'],
        ['Import your products', 'Upload an Excel list of products with cost, price and stock; each line is checked before it is saved.'],
        ['Bill for a week', 'Run the counter on Nafaa and keep DigiKhata open for looking up old entries.'],
        ['Send the first reminders', 'Use the khata\'s age buckets to remind the oldest balances first.'],
      ],
      'If you have a large customer list, our data migration service can enter it for you.',
      true,
    ),
    prose(`## Questions to ask before you decide

- How many bills do you make on a busy day, and does a queue form?
- Do you sell from stock that must be counted, or mostly services and large orders?
- Who gives udhaar: only you, or your staff too?
- Do you need to take card payments on the phone, or just record them?
- Which language does your staff read most easily?

If the answers point to a ledger, start with DigiKhata; it is free and widely used. If they point to a counter, [start a Nafaa trial](/pricing) and bill a real day. For a wider view of khata apps, see [Khata apps compared](/best/khata-apps-compared).`),
  ],
  relations: [
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'BEST_OF:khata-apps-compared', kind: 'RELATED' },
    { ref: 'ALTERNATIVE:digikhata-alternative', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-udhaar-book', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/CustomerProfilePage.tsx',
    'apps/web/src/modules/customers/directory/components/KhataTools.tsx',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/core/payments/PayQrPage.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx',
    'apps/web/src/modules/finance/cash-register',
    'apps/web/src/modules/hr/staff/components/RolesPanel.tsx',
  ],
  factNote:
    'DigiKhata facts read on 2026-10-26: digikhata.pk (Party Ledger, Staff Book, Stock Book, Cash Book, Bill Book, Expense Book; automatic backup; multiple businesses; SMS/WhatsApp reminders; access management; PIN/biometric lock; NFC card payments after KYC; DigiQR 0% transaction fee; loans up to 50,000 rupees; Windows app download; Android/iOS/online), Google Play listing (offline ledger access, barcode scanner for stock, unlimited free SMS/WhatsApp reminders, in-app purchases) and App Store listing (Free, In-App Purchases; English, Urdu, Persian and Pashto). No prices published on those pages. Ratings and user reviews deliberately not used.',
  topics: ['Built for', 'Udhaar entry', 'Counter billing', 'Stock', 'Reminders', 'Payments', 'Offline', 'Devices', 'Languages', 'Price'],
  dropped: ['Download counts and app ratings (not a fair comparison point).', 'User reviews from the app stores.'],
  needsOwner: [
    'Fact-check stamp in the admin (NOT_FACT_CHECKED blocks publish until then).',
    'Verify: DigiKhata loan limit (50,000 rupees), 0% DigiQR fee and NFC card tap after KYC, all from digikhata.pk on 2026-10-26.',
    'Verify: App Store languages (English, Urdu, Persian, Pashto) and "Free, In-App Purchases".',
    'Verify: Play listing claims of offline ledger access and unlimited free SMS/WhatsApp reminders.',
    'Decide: whether to name the paid DigiKhata tier and its price if DigiKhata publishes one.',
  ],
};

export default spec;
