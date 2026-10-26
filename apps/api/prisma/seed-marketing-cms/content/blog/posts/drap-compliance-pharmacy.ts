/**
 * Compliance checklist for pharmacies and medical stores: what DRAP does,
 * what the province licenses, and the records a pharmacy keeps. No penalty
 * amounts or licence fees are stated; sources are DRAP and the Punjab
 * health department.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { CHECKED_ON, FAKE_AUTHOR, checkRules, sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Drug Regulatory Authority of Pakistan (DRAP)', 'https://www.dra.gov.pk/', 'Drug Regulatory Authority of Pakistan'),
  src('DRAP recall alerts', 'https://dra.gov.pk/tag/recall', 'Drug Regulatory Authority of Pakistan'),
  src('PMU Provincial DRAP: licensing, inspections and pharmacy management in Punjab', 'https://mss.pshealthpunjab.gov.pk/PublicHome/PmuProvincialDrap', 'Primary & Secondary Healthcare Department, Punjab'),
];

const spec: PostSpec = {
  slug: 'drap-compliance-pharmacy',
  seoDescription: 'What DRAP regulates, what your province licenses, and the records a pharmacy keeps every day: purchases, batches, expiry, prescriptions and controlled drugs.',
  title: 'DRAP Rules for Pharmacies in Pakistan: A Practical Checklist',
  summary:
    'What DRAP regulates, what your province licenses and inspects, and the day-to-day records a pharmacy or medical store keeps: purchases, batches and expiry, prescriptions, controlled medicines, storage and recalls.',
  category: 'compliance',
  cover: PHOTO.drapCompliancePharmacy,
  tags: ['INDUSTRY:pharmacy', 'GLOSSARY_TERM:drap', 'GLOSSARY_TERM:batch-tracking'],
  related: ['PRODUCT:inventory', 'BLOG_POST:how-to-start-a-pharmacy-pakistan', 'GLOSSARY_TERM:fifo', 'COMPLIANCE:drap-pharmacy'],
  blocks: [
    prose(`Running a pharmacy in Pakistan means answering to two levels of government. The federal regulator, DRAP, decides which medicines may be sold and how they are made, priced and recalled. Your province licenses your premises, sets the qualified-person rules and sends the inspector. Most of the day-to-day work of staying compliant is not legal at all: it is keeping clean records of what you bought, what you sold and what you threw away.

This checklist is written for owners and pharmacists of retail pharmacies and medical stores. It is not legal advice, and it does not quote fees or penalties. Where a rule matters, it points to the authority to check with.`),
    checkRules(`Drug laws and rules are federal and provincial, and both change. Confirm licence requirements with your provincial drug control office and read DRAP notices on dra.gov.pk before you rely on this checklist. Checked on ${CHECKED_ON}.`),
    prose(`## Who does what

**DRAP (Drug Regulatory Authority of Pakistan)** was set up under the DRAP Act, 2012 and works with the Drugs Act, 1976. The glossary entry on [DRAP](/glossary/drap) gives the short version of what it does. Its work that touches a pharmacy counter includes:

- Registration of medicines: only registered products may be sold.
- Pricing of medicines: the price printed on the pack is set under the federal pricing rules, and you should not sell above it.
- Recalls and alerts: DRAP publishes [recall alerts](https://dra.gov.pk/tag/recall) for products found substandard, misbranded or otherwise unsafe, and tells pharmacies what to do with remaining stock.

**Your province** handles the shop itself. In Punjab, for example, the health department's [provincial DRAP unit](https://mss.pshealthpunjab.gov.pk/PublicHome/PmuProvincialDrap) lists sale and distribution licensing, inspections, sampling and testing, and the issuance and cancellation of licences for pharmacies, medical stores and distributors among its functions. Other provinces have their own drug control offices with similar roles.

Provinces issue different kinds of drug sale licence (for example, for a pharmacy or a medical store), each with its own requirement for a qualified person on the premises. Which licence you need, and who must be present when you are open, is a question for your provincial office.

## The records that keep you safe

Inspectors look at paper and stock, not intentions. These are the records most pharmacies keep:

| Record | What it shows |
|---|---|
| Purchase invoices | Every medicine came from a licensed supplier, with batch and expiry |
| Batch and expiry by item | What you hold, from which batch, expiring when |
| Prescriptions | Prescription-only medicines were sold against a prescription |
| Controlled medicines register | Each sale of a controlled or narcotic medicine, with the patient and prescriber |
| Expired and returned stock | What was removed from sale and where it went |
| Storage log | Fridge temperatures for medicines that need cold storage |`),
    steps(
      'A daily and monthly routine',
      [
        ['Receive stock with batch and expiry', 'Check each delivery against the invoice. Record batch number and expiry for every line, not just the product name.'],
        ['Sell the oldest batch first', 'Put near-expiry stock in front (first expiry, first out) so it sells before it expires.'],
        ['Ask for the prescription', 'For prescription-only medicines, see the prescription and keep a record. For controlled medicines, write the register entry at the time of sale.'],
        ['Log the fridge', 'Note the temperature at opening and closing for insulin, vaccines and other cold-chain items.'],
        ['Check expiry every month', 'Pull everything expiring in the coming months, return what the supplier will take back, and quarantine what is already expired.'],
        ['Read recall alerts', 'When DRAP or your province issues an alert, check your stock for the named batch, stop sale and return it as instructed.'],
      ],
      undefined,
      true,
    ),
    prose(`## Where pharmacies usually slip

- **Batch numbers missing from purchases.** Without them, you cannot answer a recall alert quickly. You end up pulling every pack of a product instead of the one batch named.
- **Loose strips with no trail.** When you sell by the strip or tablet, the pack's batch still needs to be traceable.
- **Expired stock on the shelf.** One expired pack found on the shelf during an inspection is hard to explain. A monthly expiry sweep prevents it.
- **Register written later.** Controlled-medicine entries made at the end of the day from memory are the ones that do not match.
- **Selling above the printed price.** Charge what the pack says.
- **Unlicensed supply.** Cheaper stock from an unlicensed source is a risk to patients and to your licence.

## How software helps

A pharmacy POS will not get you a licence, but it makes the records above a by-product of normal work. In Nafaa's pharmacy setup:

- Each medicine carries its formula (salt), schedule and whether it needs a prescription. Substitutes with the same salt are one search away.
- Stock is received with batch and expiry, and the expiry screen lists what is close to expiring so you can act early.
- At the counter, a controlled medicine prompts a register entry before the sale is completed, and the narcotic register keeps those entries in one place.
- Prescriptions and doctors are saved, so repeat patients are quicker to serve.
- A cold-chain log records fridge temperatures.
- Strips, boxes and loose tablets are sold from the same stock, so a loose sale still reduces the right item.`),
    shot({
      heading: 'Batches close to expiry, in one list',
      body: 'The expiry screen groups batches due in the next 30 and 90 days, with batch number, expiry date, stock and value, so the monthly sweep starts from a list instead of the shelf.',
      id: SHOT.pharmacyExpiry,
      url: 'app.nafaa.pk/pharmacy/expiring',
      layout: 'full',
      caption: 'Pharmacy expiry list in Nafaa (demo data): batches due in 30 and 90 days with batch number, expiry date, stock and value.',
    }),
    tip('When a recall alert names a batch, search your stock by that batch number first. If your purchases were entered with batches, you will know in seconds whether you hold any.', 'Make recalls a five-minute job'),
    prose(`## Before an inspection

Keep licences and the qualified person's documents displayed or at hand, the controlled register up to date, expired stock separated and labelled, and the last few months of purchase invoices filed. If your records live in software, make sure whoever is on duty knows how to open the batch, expiry and register screens.`),
    sourcesBlock(SOURCES),
  ],
  outline: ['Who does what (DRAP vs province)', 'Records', 'Routine', 'Where pharmacies slip', 'How software helps', 'Before an inspection'],
  dropped: ['"7 core requirements" and the penalty structure (not cited).', FAKE_AUTHOR],
  needsOwner: ['A pharmacist or provincial drug office to review the checklist (licence types, register rules) before publishing.'],
  evidence: [
    'apps/web/src/industries/pharmacy/PharmacyPack.tsx',
    'apps/web/src/industries/pharmacy/products/PharmacyProductEditor.tsx',
    'apps/web/src/industries/pharmacy/api/controlled-log.api.ts',
    'apps/web/src/industries/pharmacy/api/expiry.api.ts',
    'apps/web/src/industries/pharmacy/api/temperature.api.ts',
    'apps/web/src/industries/pharmacy/api/prescriptions.api.ts',
    'apps/web/src/industries/pharmacy/api/substitutes.api.ts',
  ],
  sources: SOURCES,
  factNote:
    'DRAP recall pages and the Punjab PMU Provincial DRAP page (functions: licensing, inspections, pharmacy management) found on 2026-10-26; dra.gov.pk home returned 503 on that date, so the link is given without quoting it. DRAP Act 2012 and Drugs Act 1976 named as the governing laws. No fees, penalties or licence categories stated as fact.',
};

export default spec;
