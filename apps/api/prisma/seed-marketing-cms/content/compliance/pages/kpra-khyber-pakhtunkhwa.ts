/**
 * KPRA (Khyber Pakhtunkhwa Revenue Authority): RIMS invoice reporting for
 * restaurants and e-invoicing under the KP Sales Tax on Services Act, 2022.
 * Sources: the Act as updated by KPRA for the KP Finance Act 2024 (section 64
 * and section 53 serial 4A), the KP Sales Tax on Services Regulations 2024
 * (Gazette, 3 January 2025) and KPRA's RIMS API documentation, read on
 * CHECKED_ON. No rates are stated.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { CHECKED_ON_TEXT, TAX_EVIDENCE, checkRules, src, type ComplianceSpec } from '../_compliance';

const ACT = src('Khyber Pakhtunkhwa Sales Tax on Services Act, 2022 (updated for the KP Finance Act, 2024)', 'https://kpra.gov.pk/wp-content/uploads/2024/07/KP-STS-ACT-2022-Updated-2024.pdf', 'Khyber Pakhtunkhwa Revenue Authority');
const REGS = src('Khyber Pakhtunkhwa Sales Tax on Services Regulations, 2024 (Gazette, 3 January 2025)', 'https://kpra.gov.pk/wp-content/uploads/2025/02/KP-STS-regulations-2024.pdf', 'Khyber Pakhtunkhwa Revenue Authority');
const RIMS_DOCS = src('RIMS API Documentation: KPRA POS Registration Portal', 'https://posregistration.kpra.gov.pk/docs', 'Khyber Pakhtunkhwa Revenue Authority');
const RIMS = src('KPRA RIMS', 'https://rims.kpra.gov.pk/', 'Khyber Pakhtunkhwa Revenue Authority');
const KPRA = src('Khyber Pakhtunkhwa Revenue Authority', 'https://kpra.gov.pk/', 'Khyber Pakhtunkhwa Revenue Authority');

const SUMMARY =
  'The Khyber Pakhtunkhwa Revenue Authority collects sales tax on services in KP and receives restaurant bills through its RIMS system. This page explains what the 2022 Act and the 2024 regulations require, how a restaurant gets a POS ID and key, the per-invoice penalty in the Act and how Nafaa sends bills to KPRA.';

const spec: ComplianceSpec = {
  slug: 'kpra-khyber-pakhtunkhwa',
  title: 'KPRA (Khyber Pakhtunkhwa) RIMS and POS Integration',
  authority: 'KPRA',
  summary: SUMMARY,
  sroRefs: [
    'Khyber Pakhtunkhwa Sales Tax on Services Act, 2022 (Act XIX of 2022), s. 64 and s. 53',
    'Khyber Pakhtunkhwa Sales Tax on Services Regulations, 2024 (KPRA Regulation No. III of 2024)',
    'KPRA RIMS API documentation (POS Registration Portal)',
  ],
  penaltySummary:
    'Section 53, serial 4A of the KP Sales Tax on Services Act, 2022 (as updated for the KP Finance Act, 2024): a person integrated through RIMS or IMRS who issues invoices outside the e-invoicing system or fails to upload them in real time pays 100,000 rupees or 5% of the tax involved, whichever is higher, for each instance.',
  seoTitle: 'KPRA POS Integration (KP): RIMS, Registration and Penalties',
  seoDescription:
    'KPRA rules for restaurants in Khyber Pakhtunkhwa: what the Act and 2024 regulations require, getting a POS ID and key, penalties and how Nafaa sends bills.',
  focusKeyword: 'kpra pos integration',
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compliance · KPRA', heading: 'KPRA in Khyber Pakhtunkhwa: RIMS and e-invoicing' }),
    answerBox(
      [
        { label: 'Who', value: 'Service providers in KP, and in practice restaurants first: RIMS is KPRA\'s restaurant invoice system' },
        { label: 'Law', value: 'Section 64 of the KP Sales Tax on Services Act, 2022 lets KPRA make electronic invoicing compulsory from a date it specifies' },
        { label: 'Credentials', value: 'KPRA issues a POS ID and key against the restaurant\'s NTN' },
        { label: 'Penalty', value: '100,000 rupees or 5% of the tax involved, whichever is higher, for each invoice kept out of RIMS (section 53, serial 4A)' },
        { label: 'Checked', value: `Against the Act, the 2024 regulations and KPRA's RIMS documentation on ${CHECKED_ON_TEXT}` },
      ],
      'KP me restaurant ke bill KPRA ke RIMS system ko jate hain. KPRA restaurant ke NTN par POS ID aur key deta hai. Har bill real time me upload na ho to har bill par jurmana hai.',
      'KPRA at a glance',
    ),
    checkRules(
      'KPRA rates are in the Second Schedule to the Act and change with each KP Finance Act, so this page does not quote them. The Act copy on KPRA\'s site shows the 2024 Finance Act changes; check for later amendments and KPRA notifications, or ask your adviser.',
    ),
    prose(`## The law behind RIMS

Section 64 of the Khyber Pakhtunkhwa Sales Tax on Services Act, 2022 is the basis for electronic invoicing in KP. It works in three steps:

1. The Management Committee may notify persons or services whose transactions are to be monitored "through electronic or other means".
2. The Policy Board may set up an electronic system that captures invoices and sends them to KPRA in real time.
3. From a date the Management Committee specifies, service providers "shall compulsorily use such electronic means or systems, including fiscal cash registers, for issuance of tax invoice under the e-invoicing system".

RIMS is that system for restaurants. The Act calls it the Restaurant Invoice Management System, alongside an Invoice Management and Reporting System (IMRS) and "any other prescribed system". Restaurants in Peshawar, Abbottabad, Mardan, Mingora and Dera Ismail Khan are the first to meet it.

## What the 2024 regulations add

The KP Sales Tax on Services Regulations, 2024 (published in the KP Gazette on 3 January 2025) set day-to-day rules for service providers:

- **Invoices.** Regulation 33 asks for serially numbered sales tax invoices showing your name, address and KNTN; the customer's name and NTN, KNTN or CNIC; serial number and date; the service and its tariff heading; the value before tax, the rate, the tax and the total. A computerised system may print them.
- **Records.** Besides invoices and purchase records, a service provider keeps the daily POS closing report of every cash register at every branch and outlet in KP.
- **Restaurants and caterers.** Tax for a period is paid by the 15th of the following month, and the return is filed within three days of that due date.
- **Outlets.** A restaurant, hotel or marriage hall with more than one outlet in KP gives KPRA the complete list of outlets.

A proviso in the restaurant part of the regulations disapplies one invoicing provision for restaurants whose RIMS or IMRS is linked, or required to be linked, with KPRA. Ask your adviser how it applies to you.`),
    diagram(
      'Each bill is sent to KPRA\'s RIMS with the POS ID and key. KPRA records it, and the QR code on the receipt points to that invoice.',
      { kind: 'fbr-invoice', animate: true, labels: { authority: 'KPRA RIMS', fiscal: 'KPRA record' } },
      'How a bill reaches KPRA',
    ),
    prose(`## How the connection works

KPRA's [RIMS API documentation](https://posregistration.kpra.gov.pk/docs) describes the technical side:

- **Credentials.** "Contact KPRA to register your business and receive POS ID and key against your restaurant NTN."
- **Two ways to connect.** KPRA recommends its RIMS Windows utility, which runs on the restaurant's PC, keeps invoices in a queue when the internet is down and forwards them later. Software can also call KPRA's live API directly for each invoice, which needs a connection at the moment of sale.
- **What each invoice carries.** NTN, POS ID, key, invoice number, amount before tax, tax rate, tax amount, total and date and time. Invoice numbers must be unique for each POS ID.
- **QR code.** The receipt's QR code is built from the POS ID and invoice number.
- **Cancellations.** A bill that is cancelled or reduced after sending is reported through a credit note linked to the original invoice; the original is never edited.

KPRA does not offer a separate test server for this API, so the first live bills deserve a careful check.`),
    steps(
      'Getting a restaurant onto RIMS',
      [
        ['Register with KPRA', 'Have your KNTN and NTN ready; RIMS credentials are issued against the restaurant\'s NTN.'],
        ['Get the POS ID and key', 'Register the POS on KPRA\'s POS Registration Portal, or contact KPRA, for each branch\'s POS ID and key.'],
        ['Connect your billing', 'Use KPRA\'s Windows utility, or software that sends invoices to KPRA\'s API directly.'],
        ['Print the QR', 'Add the QR code built from the POS ID and invoice number to every receipt.'],
        ['Check the first day', 'There is no test server, so open the first bills in KPRA\'s records and in your software to confirm they arrived.'],
      ],
      undefined,
      true,
    ),
    shot({
      heading: 'KPRA settings in Nafaa',
      body: 'Pick KPRA and enter each branch\'s POS ID, NTN and key. KPRA has no sandbox, so the branch goes straight to live; check the first bills under Invoices.',
      id: SHOT.taxSetup,
      url: 'app.nafaa.pk/settings/tax',
      layout: 'split-right',
    }),
    prose(`## How Nafaa handles KPRA

Nafaa sends each bill to KPRA's RIMS API directly, so no extra Windows utility is needed. In the tax settings you choose KPRA and enter the POS ID, NTN and key for each branch. Because KPRA has no test server, Nafaa switches the branch straight to live and reminds you to look at the first bill under Invoices.

The QR code on the receipt links to KPRA's record of that invoice. If the internet is down, the counter keeps billing and Nafaa sends the waiting bills on its own when it can, which matters because the Act counts each invoice not uploaded in real time as a separate default. Rejected bills show KPRA's reason, and you can resend one or all of them. Cancelled and returned bills go to KPRA as credit notes against the original invoice. The monthly report gives sales, output tax and credit notes by rate and branch for your KPRA return, and the day book gives the daily closing figures the regulations ask you to keep.

See the [restaurant POS](/industries/restaurant) page for tables and kitchen tickets, and [Peshawar](/pos-software/peshawar) for local details.`),
  ],
  faqs: [
    [
      'Is RIMS only for restaurants?',
      'RIMS is KPRA\'s restaurant invoice system, and its API documentation is written for restaurants. The Act lets KPRA notify other services for electronic monitoring and names an Invoice Management and Reporting System (IMRS) too. If you run another service business in KP, check KPRA\'s notifications or ask your adviser whether a system has been prescribed for you.',
    ],
    [
      'What if our internet is down when a bill is made?',
      'The Act penalises invoices not uploaded on a real-time basis, so bills should reach KPRA as soon as possible. KPRA\'s own Windows utility queues bills offline and forwards them later. Nafaa does the same from its side: the counter keeps billing, waiting bills are sent automatically, and the tax screen shows anything still pending.',
    ],
    [
      'Can we test KPRA integration first?',
      'KPRA does not provide a separate test server for RIMS, so there is no sandbox stage. Enter the details carefully, make one real bill, and confirm it was accepted before the rush starts. In Nafaa that bill appears under Invoices with KPRA\'s response.',
    ],
  ],
  relations: [
    { ref: 'CITY:peshawar', kind: 'TAG' },
    { ref: 'CITY:abbottabad', kind: 'TAG' },
    { ref: 'CITY:mardan', kind: 'TAG' },
    { ref: 'CITY:mingora', kind: 'TAG' },
    { ref: 'CITY:dera-ismail-khan', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:sales-tax-on-services', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:e-invoicing', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:z-report', kind: 'TAG' },
    { ref: 'PRODUCT:fbr', kind: 'RELATED' },
    { ref: 'SERVICE:fbr-integration-setup', kind: 'RELATED' },
    { ref: 'INDUSTRY:restaurant', kind: 'RELATED' },
  ],
  sources: [ACT, REGS, RIMS_DOCS, RIMS, KPRA],
  evidence: [...TAX_EVIDENCE, 'apps/web/src/modules/reports/day-book/DayBookPage.tsx'],
  factNote:
    'Section 64 and section 53 serial 4A read in the KP STS Act 2022 PDF updated for the KP Finance Act 2024 (kpra.gov.pk); regulation 33 records (daily POS closing report) and restaurant payment/return dates read in the KP STS Regulations 2024 Gazette PDF; integration details from KPRA RIMS API docs (posregistration.kpra.gov.pk/docs); all on 2026-10-26. No rates stated. Nafaa KPRA behaviour (live only, QR link, credit notes) from adapters.ts, tax-authority.service.ts and SettingsView.tsx.',
  needsOwner: [
    'Add kpra.gov.pk to settings seo.officialDomains: the default list has kpra.kp.gov.pk, so the API\'s NO_SOURCE check will fail this page until then.',
    'Tax adviser to confirm section 53 serial 4A as quoted is current after the KP Finance Act 2025/2026.',
  ],
};

export default spec;
