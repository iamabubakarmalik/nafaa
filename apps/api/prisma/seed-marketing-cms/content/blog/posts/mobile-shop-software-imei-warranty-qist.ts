/**
 * Buyer checklist for mobile phone shop software: IMEI stock, warranty and
 * repairs, qist (installment) plans, used phones and trade-in, accessories.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { mdTable, sourcesBlock, srcChecked, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  srcChecked('International Mobile Equipment Identity', 'https://en.wikipedia.org/wiki/International_Mobile_Equipment_Identity', 'Wikipedia', '2026-11-15'),
  srcChecked('Pakistan Telecommunication Authority', 'https://www.pta.gov.pk/', 'PTA', '2026-11-15'),
];

const spec: PostSpec = {
  slug: 'mobile-shop-software-imei-warranty-qist',
  title: 'Mobile Shop Software: IMEI, Warranty and Qist',
  summary:
    'Mobile shop software must track every handset by IMEI, record warranty and repairs, manage qist (installment) plans with due dates and handle used phones and trade-ins, alongside fast accessory billing. This guide lists what to check and how to test each point before you choose a system.',
  category: 'industry',
  cover: PHOTO.mobileShopSoftwareImeiWarrantyQist,
  tags: ['INDUSTRY:mobile-shop', 'GLOSSARY_TERM:imei', 'GLOSSARY_TERM:qist'],
  related: [
    'INDUSTRY:mobile-shop',
    'BLOG_POST:mobile-shop-imei-records',
    'BLOG_POST:check-pta-imei-status-mobile-shop',
    'GLOSSARY_TERM:trade-in',
    'GLOSSARY_TERM:warranty',
    'GLOSSARY_TERM:pta-approved',
    'PAGE:mobile-shop-software',
  ],
  isNew: true,
  seoTitle: 'Mobile Shop Software: IMEI, Warranty, Qist Checklist',
  seoDescription:
    'What to check in mobile shop software in Pakistan: IMEI stock, warranty and repairs, qist plans, used phones and trade-in, and fast accessory billing.',
  focusKeyword: 'mobile shop software',
  sources: SOURCES,
  blocks: [
    prose(`A mobile shop has two businesses in one box. One is a handset business: few items, high value, each with its own IMEI, warranty and sometimes a qist plan. The other is an accessory business: hundreds of covers, chargers and cables, low value and fast. Software that does only one of these will give you a good counter and a bad ledger, or the other way round.

This article is for owners of mobile phone shops choosing software. It follows the life of a handset: buying, stocking, selling on cash or qist, warranty and repair, and trade-in. It does not cover the rules for phone registration; for those, the official site of the [Pakistan Telecommunication Authority](https://www.pta.gov.pk/) (opened 15 November 2026) and our post on [checking PTA IMEI status](/blog/check-pta-imei-status-mobile-shop) are the place to start.

## 1. IMEI: every handset is its own stock line

An [IMEI](https://en.wikipedia.org/wiki/International_Mobile_Equipment_Identity) is the identity number of a handset. Ordinary stock counting says "five of this model", but two phones of the same model can have different IMEIs, different purchase dates, different suppliers and different warranty periods. For a phone that costs this much, "five" is not an answer.

What to check:

- **IMEI at purchase.** Each handset's IMEI is entered or scanned when it comes in, with the supplier and the cost.
- **IMEI at sale.** The cashier picks or scans the IMEI of the actual handset, and it is printed on the bill.
- **Stock by IMEI.** You can search an IMEI and see where that handset is: in stock, sold to whom, returned, in repair.
- **Duplicate protection.** The system refuses to enter the same IMEI twice, and warns if a sold IMEI comes back.
- **Dual-SIM phones** with both IMEIs stored, because customers and the network may quote either.
- **A bulk entry method,** such as scanning or pasting a list, for a box of 20 phones.

Test it: receive three phones of one model, sell one by its IMEI and search the IMEI later. You should see the customer, the date and the price.

Our post on [IMEI records in a mobile shop](/blog/mobile-shop-imei-records) explains why this matters for disputes.

## 2. Warranty and claims

Warranty on a phone usually has two layers: the company's or distributor's, and yours as the shop. Your customers do not care about the difference; they come to you. What you need is a record.

- **Warranty period on the bill,** with the start date and end date, per IMEI.
- **Lookup by IMEI or phone number,** so the person at the counter finds the sale in seconds.
- **A claim record** that links the complaint to the original sale and tracks whether it went to the distributor and what came back.
- **Warranty status on the repair screen,** so the technician knows if the job is free or paid.

See the glossary on [warranty](/glossary/warranty).

## 3. Repair tickets

If your shop repairs phones, a paper slip is not enough. Check for:

- **A repair ticket** with the customer, the phone, the fault, an estimate and an advance.
- **Status** from received to ready to delivered, with a message to the customer.
- **Parts used,** so stock goes down and the cost is on the job.
- **A delivery step** that collects the balance and closes the ticket.
- **A slip to print** for the customer, with a number to quote.

## 4. Qist: installment plans

Selling a phone on installments is common, and it is the source of the hardest bookkeeping in the shop. The risk is not the first payment; it is the fifth month, when nobody remembers who owes what. See the glossary on [qist](/glossary/qist).

A proper installment system should:

- **Create a plan** with the price, advance, number of installments and the due dates.
- **Show every plan's status:** paid, due, late, finished.
- **Record each payment** against a plan with a receipt.
- **List who is due this week,** with a phone number, and send a WhatsApp reminder.
- **Link the plan to the IMEI and the customer,** with their identity details as you keep them.
- **Show the plan's balance in the customer's account,** so you do not give credit to someone already late.

Be careful with anyone who says a plan "removes the risk". It does not. It gives you the data to decide who to refuse and when to follow up. Whether a particular qist arrangement is lawful, and how, is something to settle with your own adviser.`),
    shot({
      heading: 'Handsets by IMEI',
      body: 'The IMEI inventory lists every handset with its IMEI, cost, status and where it is. A search on one number answers who bought it and when.',
      id: SHOT.mobileImei,
      url: 'app.nafaa.pk/imei-inventory',
      layout: 'full',
      caption: 'IMEI inventory from a demo mobile shop.',
    }),
    prose(`## 5. Used phones and trade-in

Many shops take an old phone against a new one. This is a place where records matter: the old phone needs its own IMEI, a condition, a price paid and a way to be resold. Check that the system can:

- **Take a used phone as part-payment** in a new sale, reducing the amount due.
- **Create a stock line for the used phone** with its IMEI, cost and condition.
- **Report profit on used phones** separately, since the margin and risk are different.
- **Keep seller details** for the person you bought it from.

See [trade-in](/glossary/trade-in).

## 6. Accessories: the fast part

Covers, glass protectors, chargers and cables are your daily volume. For these, the counter needs speed.

- **Barcode scan** and quick keys for your top 20 accessories.
- **Variants,** like a cover model for several phone models.
- **Low stock alerts** for fast movers. See [low stock alerts](/help/products-and-stock/low-stock-alerts).
- **Bundles,** such as a phone with a cover and a protector at one price.

## 7. Credit and recharge-type cash flow

Some shops also sell load, take bill payments or deal in wallets. Software for a phone shop is not a payment provider, and it should not pretend to be. What it should do is record those cash flows so your day's cash closes: expenses, other income and the wallet balances you hold. See [daily cash closing](/blog/daily-cash-closing-routine).

## 8. Reports a phone shop needs

- Stock by IMEI and by model, with the cost value.
- Profit by model and by brand.
- Installments due and late.
- Repairs open, and how long they have waited.
- Used phones in stock and their margin.
- Sales by staff member.

## 9. Offline and security

Phone shops hold valuable stock. Check that every cashier has a login, that deleting or changing a bill needs approval and that the system keeps a record of who did what. Test billing with the internet off. See [offline POS](/blog/offline-pos-internet-outage-lost-sales) and [staff control at the counter](/blog/staff-permissions-checklist-pos-software).

## A trial script for a mobile shop`),
    steps(
      'Mobile shop trial in one hour',
      [
        ['Receive three phones with IMEIs', 'Scan or type; add the supplier and cost.'],
        ['Sell one on cash by IMEI', 'Check the bill shows the IMEI and warranty.'],
        ['Sell one on a qist plan', 'Set an advance, installments and due dates.'],
        ['Record the first installment', 'Check the plan balance and the receipt.'],
        ['Take a used phone as trade-in', 'It becomes a stock line with its own IMEI.'],
        ['Open a repair ticket', 'Check the status, parts and delivery step.'],
        ['Search an IMEI', 'See where the phone is and who has it.'],
      ],
      'Each of these should take a minute or two, not ten.',
      true,
    ),
    mdTable(
      'Mobile shop checklist',
      'Ask the vendor to show each line live.',
      [
        { key: 'see', label: 'What to see' },
      ],
      [
        ['IMEI at purchase and sale', 'Printed on the bill'],
        ['Duplicate IMEI protection', 'The system refuses a second entry'],
        ['Warranty by IMEI', 'Start, end and claims'],
        ['Qist plan with due dates', 'Status and who is due this week'],
        ['Trade-in of a used phone', 'Own IMEI and cost'],
        ['Repair ticket', 'Estimate, parts, delivery'],
        ['Accessory quick keys', 'Fast billing at the rush hour'],
        ['Discount and void approval', 'Manager PIN'],
      ],
    ),
    prose(`## How Nafaa's mobile pack covers this

Nafaa's mobile shop pack has an IMEI inventory, installment (qist) plans with payments, used phones and trade-in, and repair tickets, together with the ordinary POS, khata, staff controls and reports. Warranty claims and serial-number tracking are covered in the electronics pack, and the help article on [mobile IMEI tracking](/help/by-business-type/mobile-imei-tracking) explains the daily use. See the [mobile shop industry page](/industries/mobile-shop), try the trial script above with real phones and see [pricing](/pricing) for the plans.`),
    tip('Enter your five most valuable phones by IMEI on the first day and check each one against the box. If the number on screen and the number on the box agree for all five, you have the habit right.', 'Start with the expensive ones'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['IMEI', 'Warranty', 'Repairs', 'Qist', 'Used phones', 'Accessories', 'Cash flow', 'Reports', 'Security', 'Trial script'],
  dropped: [],
  needsOwner: ['Confirm whether warranty claims for phones are in the mobile pack or only the electronics pack before stating more.'],
  evidence: [
    'apps/web/src/industries/mobile/pages/GlobalImeiInventoryPage.tsx',
    'apps/web/src/industries/mobile/pages/EmiPlansPage.tsx',
    'apps/web/src/industries/mobile/pages/EmiPlanDetailPage.tsx',
    'apps/web/src/industries/mobile/pages/UsedPhonesPage.tsx',
    'apps/web/src/industries/mobile/pages/RepairTicketsPage.tsx',
    'apps/web/src/industries/mobile/components/ImeiPickerModal.tsx',
  ],
  factNote: 'Mobile shop features checked in apps/web/src/industries/mobile. No registration rule is stated; PTA homepage and Wikipedia opened 2026-11-15.',
};

export default spec;
