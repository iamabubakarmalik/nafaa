/**
 * DigiKhata alternative. DigiKhata facts from digikhata.pk and its Google
 * Play listing, read on CHECKED_ON. The page is for shops that have outgrown
 * a ledger app, and says when staying on DigiKhata is the right call.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { disclosure } from '../../compare/_compare';
import { altTable, src, type AlternativeSpec } from '../_alternative';

const DK_HOME = src('DigiKhata home page (features, apps, payments)', 'https://digikhata.pk/', 'DigiKhata');
const DK_PLAY = src('DigiKhata on Google Play (features, offline access, in-app purchases)', 'https://play.google.com/store/apps/details?id=com.androidapp.digikhata&hl=en&gl=US', 'Google Play');
const SOURCES = [DK_HOME, DK_PLAY];

const SUMMARY =
  'DigiKhata is a free ledger and khata app that many Pakistani businesses start with. Shops look for an alternative when the counter gets busy and entering every udhaar, sale and stock change by hand stops keeping up. This page covers the signs, what to look for, where Nafaa fits and when DigiKhata is still right.';

const spec: AlternativeSpec = {
  slug: 'digikhata-alternative',
  title: 'DigiKhata Alternative for Busy Shops',
  competitorName: 'DigiKhata',
  competitorUrl: 'https://digikhata.pk/',
  verdict:
    'If your business is mostly ledger entries, DigiKhata remains a good free choice. If you bill a queue of customers every day, a POS where udhaar, stock and cash come from the bill itself, such as Nafaa, saves the double entry.',
  summary: SUMMARY,
  seoTitle: 'DigiKhata Alternative: POS With Khata Built In (2026)',
  seoDescription:
    'Looking for a DigiKhata alternative? When a ledger app stops being enough for a busy shop, what to look for in a POS with khata, and how to switch.',
  focusKeyword: 'digikhata alternative',
  blocks: [
    hero(SUMMARY, { eyebrow: 'Alternatives', heading: 'A DigiKhata alternative for shops with a busy counter' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Stay on DigiKhata for ledger work; move to a POS with a built-in khata when the counter gets busy.' },
        { label: 'Main difference', value: 'DigiKhata records entries you type; a POS records udhaar, stock and cash from the bill itself' },
        { label: 'What you keep', value: 'Customer balances move over as opening balances; reminders continue on WhatsApp' },
        { label: 'What you give up', value: 'A free app, card tap on the phone and DigiKhata\'s loans' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Agar kaam zyada tar khata likhne ka hai to DigiKhata theek hai. Jab counter par rush ho aur har udhaar, sale aur Stock alag se likhna mushkil ho jaye, to aisa POS lein jisme khata bill ke andar ho.',
      'Do you need a DigiKhata alternative?',
    ),
    disclosure('DigiKhata', 'its own website and Google Play listing'),
    prose(`## Why shops look for an alternative

DigiKhata is a set of digital "books": a Party Ledger for customers and suppliers, a Cash Book, a Stock Book, a Staff Book, a Bill Book for invoices and an Expense Book, with SMS and WhatsApp reminders. Its website also offers card payments on the phone, a QR for receiving payments and small business loans. For a business that records a few entries a day, that is a lot of value in a free app.

The trouble starts when the counter gets busy. In a ledger app, the sale and the udhaar are separate steps. The cashier bills the customer on a calculator or another machine, and then someone opens the app to write the udhaar. Stock is updated separately again. On a quiet day that is fine. On a Saturday with a queue, entries get skipped, amounts are rounded, and the khata stops matching what customers really took.

## Signs you have outgrown a ledger app

- **Udhaar is entered at the end of the day** from memory or a paper slip, not when the customer leaves.
- **Customers dispute balances** because the khata shows an amount but not the items behind it.
- **Stock never matches the shelf,** because sales are not taken off stock automatically.
- **The galla is short and nobody knows why.** There is no expected amount to compare the count with.
- **Staff give Discounts or credit freely,** because the app does not stop them.
- **You opened a second counter or branch** and need both to work on one set of stock.`),
    altTable(
      'DigiKhata and Nafaa for a busy shop',
      'DigiKhata details are from digikhata.pk and its Google Play listing, checked 26 October 2026. Nafaa details are from the product as it is today.',
      'DigiKhata',
      [
        ['How a sale is recorded', 'Billed at the counter with barcode or quick keys', 'Invoice in the Bill Book, or a cash book entry'],
        ['How udhaar is recorded', 'Chosen as the payment on the bill, with the items listed', 'Entry in the Party Ledger'],
        ['Stock after a sale', 'Reduced by the bill', 'Stock Book with stock levels and low-stock warnings'],
        ['Stopping too much credit', 'Credit limit per customer; over the limit needs a manager PIN', 'Not described on the pages checked'],
        ['Closing the galla', 'Expected cash per shift against the counted amount', 'Cash Book with cash in hand'],
        ['Reminders', 'WhatsApp reminders sorted by how old the balance is', 'SMS and WhatsApp reminders with templates'],
        ['Price', 'From {{price:min.monthly}} a month after a 7-day free trial', 'Free to download with in-app purchases'],
      ],
      SOURCES,
    ),
    prose(`## What to look for in a replacement

1. **Udhaar from the bill.** The single most useful change. When udhaar is a payment method at the counter, the khata always matches the sale, items included.
2. **Credit limits that hold.** A limit should stop the bill, not just show a warning, unless the owner approves.
3. **Fast billing.** Barcode scanning, quick keys for loose items like sugar and daal, and printing in one step.
4. **Offline billing.** Power and internet go; the counter should not.
5. **Opening balances.** You must be able to start the new khata from today's balances without re-entering history.
6. **Reminders by age.** The oldest balances need chasing first.

Nafaa does all six. It is not free, and it does not lend money or take card payments itself. For a full side-by-side, see [Nafaa vs DigiKhata](/compare/nafaa-vs-digikhata).

## When to stay on DigiKhata

If you are a supplier, contractor, tailor or service business with a handful of large entries a day, a ledger app is the right tool and DigiKhata is free. Stay with it if you rely on its card tap or loans, or need Pashto or Persian, which DigiKhata's App Store listing offers.`),
    shot({
      heading: 'A khata that matches the counter',
      body: 'Every udhaar comes from a bill, so the balance, the items and the date are always together. Old balances are grouped by age for reminders.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/customers/khata',
      layout: 'split-right',
      callouts: [
        { x: 25, y: 19, label: 'Total to collect' },
        { x: 58, y: 30, label: 'Balances by age' },
        { x: 90, y: 55, label: 'Payment or reminder' },
      ],
    }),
    steps(
      'Switching from DigiKhata',
      [
        ['Download each balance', 'Save the party ledger reports as PDF so you have a record of every balance on the day you switch.'],
        ['Add customers with opening balances', 'Enter each customer and what they owe today. Set credit limits for regulars.'],
        ['Import products', 'Upload your product list from Excel with cost, price and stock.'],
        ['Bill everything in Nafaa', 'From day one, every sale and udhaar goes through the counter.'],
        ['Keep DigiKhata for look-ups', 'Leave the old app installed for a month to answer questions about old entries.'],
      ],
      undefined,
      true,
    ),
  ],
  faqs: [
    [
      'Can I move my DigiKhata balances to Nafaa?',
      'Yes. Enter each customer in Nafaa with the balance they owe on the day you switch, as an opening balance. Keep DigiKhata\'s PDF ledger reports as your record of the history. From then on, every new udhaar is recorded from the bill in Nafaa.',
    ],
    [
      'Is there a free DigiKhata alternative?',
      'Nafaa is not free; paid plans start at {{price:min.monthly}} a month after a 7-day free trial. If you need a free tool and your work is mostly ledger entries, DigiKhata itself or a paper register may suit you better. See our [khata apps comparison](/best/khata-apps-compared).',
    ],
    [
      'Does Nafaa send udhaar reminders like DigiKhata?',
      'Yes. The khata groups balances by age and sends WhatsApp reminders with the amount due, starting with the oldest. The difference is that each balance comes straight from the bills, so the customer can see which items and dates the amount is for, which settles most arguments.',
    ],
  ],
  relations: [
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'COMPARE:nafaa-vs-digikhata', kind: 'RELATED' },
    { ref: 'BEST_OF:khata-apps-compared', kind: 'RELATED' },
    { ref: 'ALTERNATIVE:udhaar-book-alternative', kind: 'RELATED' },
    { ref: 'ALTERNATIVE:paper-khata-register', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:udhaar', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/CustomerProfilePage.tsx',
    'apps/web/src/modules/customers/directory/offlineKhataActions.ts',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/modules/finance/cash-register',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
  ],
  factNote:
    'DigiKhata facts read on 2026-10-26 on digikhata.pk (Party Ledger, Cash Book, Stock Book, Staff Book, Bill Book, Expense Book; SMS/WhatsApp reminders with templates; card payments on the phone after KYC; DigiQR; loans) and the Google Play listing (in-app purchases; offline ledger access; PDF reports). Pashto and Persian from the App Store listing (apps.apple.com/pk/app/digikhata-business-accounting/id1571599845). Nafaa credit limit with manager PIN override in usePosEngine.ts.',
  needsOwner: [
    'Verify: DigiKhata features as listed on digikhata.pk on 2026-10-26.',
    'Verify: DigiKhata credit limits are "not described on the pages checked"; re-check the current app before publishing.',
  ],
};

export default spec;
