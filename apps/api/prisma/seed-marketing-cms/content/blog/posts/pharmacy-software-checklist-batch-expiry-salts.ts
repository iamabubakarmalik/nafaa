/**
 * Buyer checklist for pharmacy software: batch, expiry, salts and substitutes,
 * controlled-drug and prescription records, loose sale, and speed.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { mdTable, sourcesBlock, srcChecked, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  srcChecked('Drug Regulatory Authority of Pakistan', 'https://dra.gov.pk/', 'DRAP', '2026-11-15'),
  srcChecked('Shelf life', 'https://en.wikipedia.org/wiki/Shelf_life', 'Wikipedia', '2026-11-15'),
];

const spec: PostSpec = {
  slug: 'pharmacy-software-checklist-batch-expiry-salts',
  title: 'Pharmacy Software Checklist: Batch, Expiry and Salts',
  summary:
    'Pharmacy software should track every batch with its expiry date, search medicines by brand and by salt, handle loose strips and packs, keep prescription and controlled-drug records and bill fast at the counter. This checklist shows what to test in a trial and which questions to ask a vendor before you buy.',
  category: 'industry',
  cover: PHOTO.pharmacySoftwareChecklistBatchExpirySalts,
  tags: ['INDUSTRY:pharmacy', 'GLOSSARY_TERM:batch-tracking', 'GLOSSARY_TERM:expiry-management'],
  related: [
    'INDUSTRY:pharmacy',
    'BLOG_POST:pharmacy-expiry-management',
    'BLOG_POST:drap-compliance-pharmacy',
    'BLOG_POST:how-to-start-a-pharmacy-pakistan',
    'GLOSSARY_TERM:generic-name',
    'GLOSSARY_TERM:fefo',
    'PAGE:medical-store-software',
  ],
  isNew: true,
  seoTitle: 'Pharmacy Software Checklist for Pakistan: Batch, Expiry',
  seoDescription:
    'What to check in medical store software: batch and expiry tracking, salt search, loose strips, prescriptions, controlled drugs and counter speed.',
  focusKeyword: 'pharmacy software checklist',
  sources: SOURCES,
  blocks: [
    prose(`A pharmacy is the shop where a software mistake can cost the most. An expired strip sold by accident, a wrong substitute suggested at a busy hour or a controlled medicine with no record is not only a loss; it is a risk to a customer and to your licence. That is why pharmacy software cannot be a general billing tool with a medicine list pasted in.

This checklist is for pharmacy owners and managers choosing or switching software. It is written so you can take it into a demo or a trial and tick items off. It does not give legal advice. For what the law and the regulator require, read the official pages of the [Drug Regulatory Authority of Pakistan](https://dra.gov.pk/) (opened on 15 November 2026) and our related post on pharmacy rules under the Related reading list, and ask your own adviser.

## 1. Batch and expiry: the first thing to test

Medicines are bought in batches, and each batch has its own expiry. The same brand may sit on your shelf as three batches with three dates. If the software only has "quantity in stock", it cannot tell you which strips are about to expire, and it cannot make the cashier sell the oldest first.

What to check:

- **Batch number and expiry date at purchase.** Entered when you receive stock, ideally by scanning or quickly typing, not by a long form.
- **Stock by batch.** You can open a product and see each batch with its quantity and expiry.
- **Oldest-first selling.** The counter suggests or picks the batch that expires first. This is the idea of [FEFO](/glossary/fefo), first expiry first out. See also [batch tracking](/glossary/batch-tracking).
- **A warning at billing** when a batch is expired, and a block, not just a warning, if you choose.
- **An expiring list** by month, so you can return to the company or discount before it is too late. Our guide on [expiry management](/blog/pharmacy-expiry-management) covers the routine.
- **Expiry-wise stock value,** so you know how much money is sitting in short-dated stock.

Test it: receive the same medicine in two batches with different expiry dates, sell one strip, and see which batch the system takes.

## 2. Salt and brand search

Pakistani pharmacists think in two languages at once: the brand the customer asks for and the salt the doctor wrote. When the brand is out, the question is "what else has the same salt?".

Check:

- **Search by brand, by salt and by company,** with spelling mistakes tolerated.
- **A salt (generic name) on every medicine,** so you can list all brands that share one. See the glossary on [generic name](/glossary/generic-name).
- **A substitutes view** at the counter, showing in-stock alternatives with their price and expiry.
- **Strength and pack size in the name,** so 500 mg and 250 mg are not confused.

If you start with an empty product list, ask whether the vendor has a ready medicine and salt list you can start from, and how it is kept up to date. Typing 10,000 medicines by hand is not a realistic plan.

## 3. Packs, strips and loose sale

Medicines are sold by the box, the strip and sometimes the single tablet or one measure of syrup. Your software should know the relationships: one box has so many strips, one strip has so many tablets. A [loose sale](/glossary/loose-sale) of three tablets should reduce stock by three, not by one box, and the price should follow.

Test: sell one strip from a box and see the stock become "box minus a fraction", correctly shown.

## 4. Prescriptions and controlled medicines

Some medicines are sold only against a prescription, and some need a register. Your software should help you keep these records without slowing the counter.

- **Prescription records** with patient, doctor and medicines.
- **A controlled-medicines log** that keeps the entries you would otherwise write by hand.
- **A doctor list,** if you want to track which doctors' prescriptions you fill.
- **Temperature log** if you keep cold-chain items, such as insulin or certain injections.

Do not assume what the law requires of your category of pharmacy. Ask your regulator or adviser, then check that the software can record that. What a vendor must never do is claim that its software makes you compliant; software only helps you keep the records. Anyone who says more is selling, not informing.`),
    shot({
      heading: 'An expiry list you can act on',
      body: 'The expiry screen shows which batches expire soon, how many strips are left and what value is at risk, so you can return, discount or move stock before it becomes a loss.',
      id: SHOT.pharmacyExpiry,
      url: 'app.nafaa.pk/pharmacy/expiring',
      layout: 'full',
      caption: 'Expiry list from a demo pharmacy.',
    }),
    prose(`## 5. Speed at the counter

A pharmacy counter is fast and noisy. A cashier may serve a customer with a prescription, answer a phone call and look for a substitute at the same time. What to check:

- **Type three letters and see the right product** at the top.
- **Barcode scan** for packed medicines, and a quick key for items you sell often.
- **Customer lookup** for regular patients and their khata.
- **Hold a bill** while a customer looks for another medicine, and recall it. See [hold and recall bills](/help/pos-counter/hold-and-recall-bills).
- **Discount limits** so a cashier cannot give any discount without approval.
- **Receipts with the batch and expiry** if you want customers to see them.

## 6. Purchasing, returns and suppliers

Pharmacies buy from distributors on credit, with discounts and schemes that change every week. Check that the system handles purchase entry with batch and expiry, supplier ledgers, purchase returns for expired or damaged stock and a reorder list that suggests quantities from what you actually sell. The [low stock alert](/help/products-and-stock/low-stock-alerts) and [purchase orders](/help/products-and-stock/purchase-orders-and-grn) articles describe how this works in Nafaa.

## 7. Udhaar and regular customers

Many pharmacies have patients on monthly credit: an elderly customer who pays on the first of the month, a family on a standing account. The software should have a proper [khata](/product/khata) with a balance per customer, a limit, a record of every payment and a reminder. See the pharmacy khata page below for how this looks.

## 8. Reports a pharmacist actually reads

- Expiring and expired stock, by month.
- Fast and slow movers by salt and by brand.
- Profit by product and by company.
- Stock value now.
- Supplier dues.
- Sales by cashier.

## 9. Offline and backup

A pharmacy open late at night cannot stop when the internet stops. Test billing with the Wi-Fi off. Ask where the data is stored and how you can take a copy out.

## A trial script for your counter

Run this with real data before you decide.`),
    steps(
      'Pharmacy trial in one hour',
      [
        ['Add three medicines with salt and strength', 'Two brands share one salt.'],
        ['Receive one medicine in two batches', 'Different expiry dates.'],
        ['Sell one strip and one loose tablet', 'Check the stock and which batch was used.'],
        ['Search by salt', 'See the in-stock substitutes at once.'],
        ['Make a prescription bill and a khata bill', 'Check the record and the balance.'],
        ['Open the expiring list', 'See the near-expiry batch with its value.'],
        ['Turn off the internet and bill again', 'It must still work.'],
      ],
      'If one step is awkward, it will be worse at 8 pm on a busy day.',
      true,
    ),
    mdTable(
      'Quick checklist to carry into a demo',
      'Tick each line. Three or more blanks is a good reason to look further.',
      [
        { key: 'why', label: 'Why it matters' },
      ],
      [
        ['Batch and expiry on every purchase', 'Basis of everything else'],
        ['Oldest-first selling', 'Fewer expired strips'],
        ['Salt and substitutes at the counter', 'Faster answers to customers'],
        ['Strips and loose tablets', 'Correct stock and price'],
        ['Prescription and controlled records', 'Your own record-keeping'],
        ['Khata with limits', 'Monthly patients, safely'],
        ['Expiry and stock value reports', 'Return before it is a loss'],
        ['Offline billing', 'A pharmacy never closes for the internet'],
      ],
    ),
    shot({
      heading: 'Monthly patients on khata',
      body: 'Each patient has a balance, a limit and a record of payments. Reminders can go by WhatsApp with the amount.',
      id: SHOT.pharmacyKhata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
      caption: 'Khata page from a demo pharmacy.',
    }),
    prose(`## How Nafaa's pharmacy pack covers this

Nafaa has a pharmacy pack with batch tracking and expiry on stock, an expiring list, a salts screen to look medicines up by salt, a prescriptions section, a controlled-medicines log and a temperature log, along with the ordinary POS, khata, purchasing and reports. The help article on [pharmacy batch and expiry](/help/by-business-type/pharmacy-batch-and-expiry) explains the daily use, and the [pharmacy industry page](/industries/pharmacy) lists the features. Nafaa does not claim that using it makes a pharmacy compliant; it helps you keep records, and you stay responsible for what your licence requires. If you have a long medicine list to bring over, ask us about starting from a ready medicine and salt list, and see [pricing](/pricing) for the plans.`),
    tip('Take your five hardest products to the demo: a medicine with three batches, one with a common salt and one sold loose. If the software handles those, the easy ones are fine.', 'Bring the hard cases'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Batch and expiry', 'Salt and brand search', 'Loose sale', 'Prescriptions and controlled', 'Speed', 'Purchasing', 'Udhaar', 'Reports', 'Offline', 'Trial script'],
  dropped: [],
  needsOwner: ['Confirm whether a ready medicine and salt list is offered to every new pharmacy account before this post says so more strongly.'],
  evidence: [
    'apps/web/src/industries/pharmacy/pages/ExpiringPage.tsx',
    'apps/web/src/industries/pharmacy/pages/SaltsPage.tsx',
    'apps/web/src/industries/pharmacy/pages/PrescriptionsPage.tsx',
    'apps/web/src/industries/pharmacy/pages/ControlledLogPage.tsx',
    'apps/web/src/industries/pharmacy/pages/TemperatureLogPage.tsx',
    'apps/web/src/industries/pharmacy/products/PharmacyProductEditor.tsx',
  ],
  factNote: 'No legal requirement is stated beyond pointing to the DRAP site (opened 2026-11-15). Pharmacy screens checked in apps/web/src/industries/pharmacy.',
};

export default spec;
