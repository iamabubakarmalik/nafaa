/**
 * Drug laws for pharmacies and medical stores: what the Drugs Act, 1976
 * prohibits at the counter, who licenses the shop (Punjab's Centralized Drug
 * Sale Licensing as the worked example) and the records that follow.
 * Sources: the Drugs Act and DRAP Act copies on dra.gov.pk, Punjab's CDSL
 * page, checklist and Form 8(A), read on CHECKED_ON. dra.gov.pk's home page
 * returned 503 on that date, so only its PDF files are cited.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { CHECKED_ON_TEXT, checkRules, src, type ComplianceSpec } from '../_compliance';

const DRUGS_ACT = src('The Drugs Act, 1976 (as amended by Ordinance CXXVIII of 2002)', 'https://www.dra.gov.pk/wp-content/uploads/2022/10/Drugs-Act-1976.pdf', 'Drug Regulatory Authority of Pakistan');
const DRAP_ACT = src('Drug Regulatory Authority of Pakistan Act, 2012 (as amended till February 2022)', 'https://www.dra.gov.pk/wp-content/uploads/2022/10/DRAP-2012-_As-Amended-till-Feb-2022.pdf', 'Drug Regulatory Authority of Pakistan');
const CDSL = src('Centralized Drug Sale Licensing (CDSL), Punjab', 'https://pshealthpunjab.gov.pk/Unit/CDSL', 'Primary & Secondary Healthcare Department, Punjab');
const FORM_8A = src('Form No. 8(A): application for a licence to sell drugs by way of pharmacy', 'https://cdsl.pshealthpunjab.gov.pk/Reports/5.%20FORM%20NO%208-A%20(Pharmacy).pdf', 'Chief Drugs Controller, Punjab');
const CHECKLIST = src('Checklist for a new drug sale licence (CDSL)', 'https://cdsl.pshealthpunjab.gov.pk/Reports/1.%20Check%20List%20for%20New%20DSL.pdf', 'Chief Drugs Controller, Punjab');
const PMU = src('PMU Provincial DRAP: licensing, inspections and pharmacy management in Punjab', 'https://mss.pshealthpunjab.gov.pk/PublicHome/PmuProvincialDrap', 'Primary & Secondary Healthcare Department, Punjab');

const SUMMARY =
  'Pharmacies and medical stores in Pakistan work under the Drugs Act, 1976, which DRAP coordinates and enforces, and under a drug sale licence issued by the province. This page lists what the Act forbids at the counter, how licensing works in Punjab, the records that protect your licence, the penalties in the Act and how Nafaa keeps those records.';

const spec: ComplianceSpec = {
  slug: 'drap-pharmacy',
  title: 'Drug Laws for Pharmacies: DRAP, the Drugs Act and Licensing',
  authority: 'DRAP',
  summary: SUMMARY,
  sroRefs: [
    'The Drugs Act, 1976 (XXXI of 1976): s. 23 prohibitions, s. 27 penalties',
    'Drug Regulatory Authority of Pakistan Act, 2012 (XXI of 2012)',
    'Punjab drug sale licence: Form 8(A) pharmacy, 8(B) medical store, 8(C) distribution',
  ],
  penaltySummary:
    'Drugs Act, 1976, s. 27 (copy on DRAP\'s site): selling a spurious or unregistered drug, 3 to 10 years in prison and a fine of up to one lakh rupees; selling counterfeit drugs or giving a false warranty, up to 7 years, a fine of up to one lakh rupees, or both; obstructing an inspector, up to 1 year; any other contravention, up to 5 years, a fine of up to fifty thousand rupees, or both.',
  seoTitle: 'Drug Laws for Pharmacies in Pakistan: DRAP, Licence, Records',
  seoDescription:
    'DRAP and the Drugs Act, 1976 for pharmacies: what is forbidden at the counter, drug sale licences, the records that protect your licence and the penalties.',
  focusKeyword: 'drap rules for pharmacy',
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compliance · DRAP', heading: 'Drug laws for pharmacies and medical stores' }),
    answerBox(
      [
        { label: 'Federal law', value: 'The Drugs Act, 1976. DRAP was set up by the DRAP Act, 2012 to coordinate and enforce it' },
        { label: 'Shop licence', value: 'Issued by your province. In Punjab, applications go online through Centralized Drug Sale Licensing (CDSL)' },
        { label: 'At the counter', value: 'No expired, unregistered, spurious, substandard or misbranded drugs, and nothing sold without a supplier warranty showing name and batch number' },
        { label: 'Who must be there', value: 'In Punjab a pharmacy sells under the personal supervision of a qualified person registered with a pharmacy council' },
        { label: 'Checked', value: `Against the Acts on dra.gov.pk and Punjab's CDSL documents on ${CHECKED_ON_TEXT}` },
      ],
      'Pharmacy ke liye do qanoon: federal Drugs Act 1976 (DRAP) aur subay ka drug sale licence. Expired, ghair registered ya nakli dawa bechna mana hai, aur har dawa ka batch number wala warranty bill supplier se hona chahiye.',
      'Pharmacy rules at a glance',
    ),
    checkRules(
      'Drug laws are federal and provincial, and provinces amend their rules and fees. The Act copy on DRAP\'s site shows amendments up to 2002 and may not include later changes in force in your province. Confirm with your provincial drug control office before you act. This page is not legal advice.',
    ),
    prose(`## Who does what

The **Drugs Act, 1976** regulates "the import, export, manufacture, storage, distribution and sale of drugs" across Pakistan. The **Drug Regulatory Authority of Pakistan (DRAP)** was established by the DRAP Act, 2012 "to provide for effective co-ordination and enforcement of The Drugs Act, 1976" and to bring harmony to inter-provincial trade in therapeutic goods. DRAP registers medicines and issues recall alerts.

The shop itself is licensed by the **province**. In Punjab, the Primary & Secondary Healthcare Department runs [Centralized Drug Sale Licensing](https://pshealthpunjab.gov.pk/Unit/CDSL). Since 9 November 2021, new licences, renewals and changes of title, address or qualified person are applied for online instead of at the District Quality Control Board's office. Punjab's [provincial DRAP unit](https://mss.pshealthpunjab.gov.pk/PublicHome/PmuProvincialDrap) lists licensing, inspections, sampling and testing among its functions. Sindh, Khyber Pakhtunkhwa and Balochistan run their own drug control offices.

## What section 23 forbids at the counter

Section 23 of the Drugs Act lists what no one may sell. For a pharmacy or medical store the important lines are:

| Section 23(1) | You may not sell |
|---|---|
| (a)(i) to (v) | A spurious, counterfeit, misbranded, adulterated or substandard drug |
| (a)(vi) | Any drug after its expiry date |
| (a)(vii) | A drug that is not registered, or not in line with its registration |
| (c) | Any drug except under, and in line with, a licence |
| (i) | Any drug without a warranty in the prescribed form, bearing the drug's name and batch number, from the licensed manufacturer, importer or their agent |
| (j) | A drug with an incorrect batch number |

Two of these are record-keeping problems more than anything else. Expired stock on the shelf breaks (a)(vi), and a purchase without a proper warranty invoice showing batch numbers breaks (i). Both are avoided by receiving stock properly.`),
    steps(
      'Getting a drug sale licence in Punjab',
      [
        ['Pick the licence', 'Form 8(A) for a pharmacy, 8(B) for a medical store, 8(C) for distribution.'],
        ['Line up the qualified person', 'Form 8(A) says sales will be under the personal supervision of a person registered under section 24(1)(a) of the Pharmacy Act, 1967, with their pharmacy council certificate.'],
        ['Prepare the premises papers', 'A plan of the premises showing covered area, signboard, air conditioning and refrigeration, plus the rent deed or ownership document and a location map.'],
        ['Sign the affidavits', 'Proprietor and qualified person each swear to follow the Drugs Act and its rules and not to stock expired, spurious, substandard, unregistered, misbranded or counterfeit drugs.'],
        ['Apply online and pay the fee', 'Submit through the CDSL portal with the fee challan. The checklist lists the fee for each form; confirm the current amount there.'],
        ['Inspection', 'The application is checked and the premises are inspected before the licence is issued.'],
      ],
      'From Punjab\'s CDSL checklist and Form 8(A). Other provinces use their own forms.',
      true,
    ),
    prose(`## Records that protect your licence

The law and the licence affidavits point to the same handful of records:

- **Purchase invoices with warranty and batch.** Every purchase from a licensed supplier, with the name and batch number on the warranty, as section 23(1)(i) requires.
- **Batch and expiry by item.** What you hold, from which batch, expiring when, so nothing past its date reaches the shelf.
- **Expired and returned stock.** What was taken off sale and where it went.
- **Prescriptions and controlled medicines.** Sales of prescription-only and controlled medicines, written at the time of sale.
- **Cold storage.** Fridge temperatures for medicines that need it; the licence plan already shows the refrigeration.

## Penalties in the Act

Section 27 of the Drugs Act, as published on DRAP's site, sets the penalties:

- Selling a spurious or unregistered drug: imprisonment of not less than three and up to ten years, and a fine of up to one lakh rupees (s. 27(1)).
- Selling a counterfeit drug, giving a false warranty or selling under a name other than the registered name: up to seven years, a fine of up to one lakh rupees, or both (s. 27(2)).
- Obstructing a drug inspector: up to one year, a fine of up to ten thousand rupees, or both (s. 27(3)).
- Any other breach of the Act or its rules, such as selling without a licence or after expiry: up to five years, a fine of up to fifty thousand rupees, or both (s. 27(4)).

Section 28 raises the penalties for a repeat offence. Because the Act has been amended over the years, confirm the current amounts with your drug control office.`),
    shot({
      heading: 'Expiry by batch in Nafaa',
      body: 'Stock is received with batch and expiry, and the expiry list shows what is close to its date so you can return or clear it before it breaks section 23.',
      id: SHOT.pharmacyExpiry,
      url: 'app.nafaa.pk/pharmacy/expiring',
      layout: 'split-right',
    }),
    prose(`## How Nafaa helps

Software does not get you a licence, but it can make the records above part of normal work. Nafaa's [pharmacy setup](/industries/pharmacy) does the following:

- **Batch and expiry on receiving.** Purchases are entered with batch number and expiry, so a recall naming one batch is a search, not a shelf-by-shelf hunt.
- **Expiry list.** Items close to expiry are listed early, so they can be sold first or returned to the supplier.
- **Medicine details.** Each medicine carries its formula (salt), schedule and whether it needs a prescription, and substitutes with the same salt are one search away.
- **Controlled medicines.** Selling a controlled medicine asks for a register entry before the bill completes, and the narcotic register keeps those entries together.
- **Prescriptions and doctors** are saved for repeat patients.
- **Cold-chain log** for fridge temperatures.
- **Strips and loose tablets** are sold from the same stock as the box, so loose sales still reduce the right batch.

Our pharmacy checklist on the blog covers the daily routine in more detail, and [how to start a pharmacy](/blog/how-to-start-a-pharmacy-pakistan) covers the business side.`),
  ],
  faqs: [
    [
      'Does DRAP issue the licence for my pharmacy?',
      'No. DRAP coordinates and enforces the Drugs Act and registers medicines, but the drug sale licence for a pharmacy or medical store comes from your province. In Punjab you apply online through Centralized Drug Sale Licensing, using Form 8(A) for a pharmacy or 8(B) for a medical store. Other provinces have their own drug control offices.',
    ],
    [
      'Why does the supplier\'s invoice matter so much?',
      'Section 23(1)(i) of the Drugs Act forbids selling any drug without a warranty in the prescribed form showing the drug\'s name and batch number, from a licensed manufacturer, importer or their agent. Keep those invoices, and record batch numbers when you receive stock, so you can prove where each pack came from and answer recalls quickly.',
    ],
    [
      'Can I sell medicine that expired last week if the customer agrees?',
      'No. Section 23(1)(a)(vi) forbids selling any drug after its expiry date, and the Punjab licence affidavit also commits the proprietor and qualified person not to stock expired drugs. Separate expired stock, label it, and return or dispose of it as your supplier and drug office require.',
    ],
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:drap', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:batch-tracking', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:expiry-management', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:controlled-drugs-register', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:prescription', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:fefo', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'RELATED' },
    { ref: 'BLOG_POST:drap-compliance-pharmacy', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-start-a-pharmacy-pakistan', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
  ],
  sources: [DRUGS_ACT, DRAP_ACT, CDSL, FORM_8A, CHECKLIST, PMU],
  evidence: [
    'apps/web/src/industries/pharmacy/PharmacyPack.tsx',
    'apps/web/src/industries/pharmacy/products/PharmacyProductEditor.tsx',
    'apps/web/src/industries/pharmacy/api/controlled-log.api.ts',
    'apps/web/src/industries/pharmacy/api/expiry.api.ts',
    'apps/web/src/industries/pharmacy/api/temperature.api.ts',
    'apps/web/src/industries/pharmacy/api/prescriptions.api.ts',
    'apps/web/src/industries/pharmacy/api/substitutes.api.ts',
    'apps/web/src/modules/pos/hooks/usePosBatches.ts',
  ],
  factNote:
    'Drugs Act 1976 preamble, s. 23(1) and s. 27 read in the copy on dra.gov.pk (amended to 2002); DRAP Act 2012 preamble from dra.gov.pk PDF; Punjab CDSL online since 9 Nov 2021 from pshealthpunjab.gov.pk/Unit/CDSL; Form 8(A) and the new-licence checklist from cdsl.pshealthpunjab.gov.pk; all on 2026-10-26. dra.gov.pk home and recall pages returned 503 and are not cited. Pharmacy features checked in apps/web/src/industries/pharmacy.',
  needsOwner: [
    'A pharmacist or the provincial drug office to review the page before publishing (Act copy is from 2002; Punjab may have amended section 27 for its area).',
    'Add dra.gov.pk and pshealthpunjab.gov.pk to settings seo.officialDomains, or the API\'s NO_SOURCE check fails this page.',
    
  ],
};

export default spec;
