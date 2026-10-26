/**
 * Khata apps compared: Nafaa's digital khata, DigiKhata and Udhaar Book,
 * with the paper register as the baseline. Competitor facts from their own
 * home pages (digikhata.pk, udhaar.pk), read on CHECKED_ON. Self-described
 * rankings and user counts on those sites are not repeated.
 */
import { hero } from '../../../lib/blocks';
import { SHOT, diagram, prose, shot } from '../../main-pages/_build';
import { quickPick, src, type BestOfSpec } from '../_bestof';

const DIGIKHATA = src('DigiKhata home page (features, apps, company)', 'https://digikhata.pk/', 'DigiKhata');
const UDHAAR = src('Udhaar Book home page (features, apps, payments)', 'https://udhaar.pk/', 'Udhaar Book');
const LEDGER = src('Ledger (general reference)', 'https://en.wikipedia.org/wiki/Ledger', 'Wikipedia');

const SUMMARY =
  'A khata app replaces the paper udhaar register with balances that add themselves up, reminders and a backup. This page compares Nafaa\'s digital khata with DigiKhata and Udhaar Book, using each app\'s own website, and keeps the paper register in the comparison because for some shops it is still enough.';

const spec: BestOfSpec = {
  slug: 'khata-apps-compared',
  title: 'Khata Apps Compared: Digital Udhaar Registers in Pakistan',
  category: 'Khata',
  summary: SUMMARY,
  seoTitle: 'Khata Apps Compared (2026): Nafaa, DigiKhata, Udhaar Book',
  seoDescription:
    'Nafaa\'s digital khata, DigiKhata and Udhaar Book compared from each app\'s own website, with the paper register kept in for shops where it is still enough.',
  focusKeyword: 'khata app pakistan',
  methodology: `**What we compared.** How udhaar gets into the khata (typed separately or straight from the bill), reminders, statements a customer can check, stock and billing, staff access, devices, backup and price.

**Where the facts come from.** DigiKhata and Udhaar Book are described only from their own home pages, opened on 26 October 2026. We left out rankings and user counts the sites state about themselves, because we cannot check them. If a site does not mention a feature, we say "not stated".

**Order.** Nafaa is ours and is listed first; the others follow alphabetically, with the paper register last as the baseline. The order is not a ranking, and nobody paid to be listed.`,
  items: [
    {
      name: 'Nafaa Digital Khata',
      isNafaa: true,
      strengths: [
        'Udhaar goes on the khata straight from the bill at the counter, so nothing is typed twice',
        'Balances grouped by age (under 7, 7 to 30, 30 to 90, over 90 days) so slow payers stand out',
        'One-tap WhatsApp reminder with the balance, firmer as the udhaar gets older',
        'Credit limit per customer; going over needs the manager PIN',
        'Payments and khata entries can be taken without internet and sync later',
        'Supplier balances next to customer balances',
      ],
      weaknesses: [
        'Part of a paid POS plan after a 7-day free trial, not a free standalone khata app',
        'No loans, mobile top-up or bill payment services inside the app',
      ],
      bestFor: 'Shops where udhaar comes from the counter every day and the owner wants the khata, stock and sales to agree.',
    },
    {
      name: 'DigiKhata',
      isNafaa: false,
      url: 'https://digikhata.pk/',
      strengths: [
        'Party ledger for customers, suppliers and bank balances',
        'SMS and WhatsApp reminders with templates you can change, and automated collection runs',
        'Stock book, bill book for invoices, cash and expense books, and a staff book for attendance and salary',
        'Automatic backup, several businesses in one account, staff access levels and PIN or fingerprint lock',
        'Android, iOS and a Windows desktop download; site in English and Urdu',
      ],
      weaknesses: [
        'Price of the app is not stated on its home page',
        'Use without internet is not stated on its home page',
      ],
      bestFor: 'Owners who want a dedicated khata app with reminders, plus card and QR payment add-ons from the same company.',
    },
    {
      name: 'Udhaar Book',
      isNafaa: false,
      url: 'https://udhaar.pk/',
      price: 'Described as free on its site',
      priceSource: UDHAAR,
      strengths: [
        'Cash book and udhaar tracking with free reminders and invoices',
        'Payment requests by bank transfer (IBFT) or mobile wallet',
        'Staff attendance and payroll, and inventory with low-stock alerts',
        'Android, iOS and a web version',
      ],
      weaknesses: [
        'Stock Book, Invoice Book and Sale POS are listed by name only; details are not on its home page',
        'Use without internet is not stated on its home page',
      ],
      bestFor: 'Small shops that want a free khata on the phone, with payment requests and extra income from top-ups and bill payments.',
    },
    {
      name: 'Paper register',
      isNafaa: false,
      strengths: [
        'Costs almost nothing and needs no battery, signal or training',
        'Customers can watch the entry being written',
        'Nothing to log in to and nothing to update',
      ],
      weaknesses: [
        'Cannot add up, search, remind or show how old a balance is',
        'One copy: lost, wet or torn pages take the record with them',
        'No record of who wrote or changed an entry',
      ],
      bestFor: 'A one-person shop with a handful of trusted credit customers who settle every month.',
    },
  ],
  blocks: [
    hero(SUMMARY, { eyebrow: 'Buyer\'s guide · Khata', heading: 'Khata apps compared: which digital udhaar register fits your shop' }),
    prose(`Udhaar is how a lot of Pakistani retail works. Regular customers buy through the month and settle when salaries come in; contractors take material on credit until the client pays them. The khata is where that trust is written down, and a [digital khata](/glossary/khata) does the adding, remembering and reminding that a paper register cannot.

This page is written by Nafaa, and Nafaa is on the list. The other apps are described only from their own websites. There is one real difference to understand before the list: some khata apps are separate notebooks you fill in, while in Nafaa the khata is written by the billing counter itself.`),
    quickPick(
      'Quick comparison',
      'From each app\'s own home page on 26 October 2026. "Not stated" means we did not find it there.',
      [
        { key: 'nafaa', label: 'Nafaa', highlight: true },
        { key: 'digikhata', label: 'DigiKhata' },
        { key: 'udhaar', label: 'Udhaar Book' },
        { key: 'paper', label: 'Paper register' },
      ],
      [
        ['How udhaar is entered', 'From the bill at the counter', 'Entered in the app', 'Entered in the app', 'Written by hand'],
        ['Reminders', 'WhatsApp, by age of balance', 'SMS and WhatsApp, templates', 'Free reminders', 'Phone call or visit'],
        ['Stock and billing', 'Full POS and inventory', 'Stock book and bill book', 'Listed by name', 'None'],
        ['Without internet', 'Yes, syncs later', 'Not stated', 'Not stated', 'Always'],
        ['Devices', 'Browser on any device; Windows app', 'Android, iOS, Windows', 'Android, iOS, web', 'Pen and paper'],
        ['Price', 'Paid plans after a free trial', 'Not stated', 'Described as free', 'Cost of the register'],
      ],
      [DIGIKHATA, UDHAAR, LEDGER],
    ),
    diagram(
      'In Nafaa the bill writes the khata: the unpaid part lands on the customer\'s account, reminders go out on WhatsApp, and payments clear the oldest udhaar first.',
      { kind: 'khata-cycle', animate: true },
      'How udhaar moves when the khata is part of billing',
    ),
    prose(`## What to look for in a khata app

**Where entries come from.** A khata you fill in separately is only as good as the cashier's memory on a busy evening. If udhaar is common in your shop, an app connected to billing removes the most common mistake: the sale that never reached the khata.

**Age, not just amount.** A balance of a few thousand rupees owed since last week is normal. The same balance owed since Eid is a problem. Look for balances grouped by age, so you know whom to call first. Our post on [reducing udhaar](/blog/how-to-reduce-udhaar) explains how to use that.

**Reminders that keep the customer.** A polite WhatsApp message with the exact balance usually works better than a phone call. Check that you can change the wording and that the app fills in the name and amount. See [WhatsApp messages for shops](/blog/whatsapp-customer-retention) for examples.

**A statement the customer can read.** Most disputes end when the customer sees each bill and payment with its date. Make sure the app can print or share one.

**Limits and control.** If staff can give unlimited credit, someone eventually will. A credit limit the counter respects, and a record of who gave which udhaar, protect you.

**Backup and leaving.** Ask what happens if the phone is lost and how to export your balances. Your customers' balances are your money.`),
    shot({
      heading: 'Who owes what, and since when',
      body: 'Nafaa\'s khata opens on the total to collect, splits it by age and puts a payment button and a WhatsApp reminder next to each customer.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'split-right',
    }),
    prose(`## Which one fits which shop

- **Udhaar comes through the counter every day** (kiryana, pharmacy, hardware, dairy): Nafaa, because the bill writes the khata and stock moves with it. See [Digital Khata](/product/khata).
- **You want a separate khata app with reminders and payment add-ons:** DigiKhata covers ledgers for customers, suppliers and banks, with stock and bill books alongside.
- **You want to start free on your phone:** Udhaar Book describes itself as free and adds payment requests and top-up selling.
- **You have a few credit customers who always pay on time:** the paper register is fine. Read [digital khata vs paper](/blog/digital-khata-vs-paper-ledger) and our [paper khata alternative](/alternatives/paper-khata-register) page for the point where it stops being enough.

For the whole subject, from credit policy to recovering old balances, read our [guide to managing udhaar and khata](/guides/managing-udhaar-and-khata).`),
  ],
  faqs: [
    [
      'Are free khata apps safe to use?',
      'Check three things before you trust any app with your customers\' balances: where the data is backed up, whether you can export it, and who in your shop can see or change entries. A free app may earn money in other ways, such as payments, top-ups or loans; read what it offers so you know why it is free.',
    ],
    [
      'Can I move my paper khata into an app without copying every page?',
      'Yes. Enter each customer\'s current balance as an opening balance, and keep the old register for reference. In Nafaa this is the old-register entry on each customer. From that day on, new udhaar and payments are recorded in the app.',
    ],
    [
      'Do customers get messages from the app or from my number?',
      'It depends on the app. Some send SMS from their own service. Nafaa opens your own WhatsApp with the message already written, and you press send, so the reminder comes from the shop the customer already knows. No WhatsApp Business API is needed.',
    ],
  ],
  relations: [
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:udhaar', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:accounts-receivable', kind: 'TAG' },
    { ref: 'BLOG_POST:digital-khata-vs-paper-ledger', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-reduce-udhaar', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-paper-register', kind: 'RELATED' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'RELATED' },
  ],
  sources: [DIGIKHATA, UDHAAR, LEDGER],
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/customers/directory/offlineKhataActions.ts',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/web/src/core/security/ManagerPin.tsx',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/purchasing/suppliers/components/SupplierMoneyModal.tsx',
    'apps/web/src/core/lib/whatsapp/templates.ts',
  ],
  factNote:
    'DigiKhata (digikhata.pk: ledgers, SMS/WhatsApp reminders, stock/bill/cash/staff books, backup, Android/iOS/Windows, DigiPOS/DigiQR add-ons, no price stated) and Udhaar Book (udhaar.pk: khata, free reminders and invoices, IBFT/wallet payment requests, payroll, inventory alerts, "100% free", Android/iOS/web) read on 2026-10-26. Self-described rankings and user counts left out. Nafaa claims checked in the evidence files.',
  needsOwner: [
    'Both competitor home pages are marketing pages; re-check them on the day of publishing.',
  ],
};

export default spec;
