/**
 * FBR POS integration and digital invoicing for shops. Every rule links to
 * the FBR page or SRO it comes from; no rates, thresholds or penalty amounts
 * are stated that were not read on fbr.gov.pk.
 */
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { CHECKED_ON, FAKE_AUTHOR, checkRules, sourcesBlock, src, type PostSpec } from '../_post';

const SOURCES = [
  src('POS Legal Provisions (SROs, Sales Tax Rules Chapter XIV, POS booklet)', 'https://fbr.gov.pk/pos-legal-provisions/163085/163086', 'Federal Board of Revenue'),
  src('Sales Tax General Orders: Tier-1 Retailers, Integration with FBR\'s POS System', 'https://fbr.gov.pk/sales-tax-general-order-tier-1/163085/173442', 'Federal Board of Revenue'),
  src('Sales Tax Rules 2006, Chapter XIV (S.R.O. 69(I)/2025)', 'https://download1.fbr.gov.pk/Docs/2025571554338577ChapterXIV.pdf', 'Federal Board of Revenue'),
  src('Point of Sale (POS) Booklet (Legal Provision)', 'https://download1.fbr.gov.pk/Docs/202551615541769POSBooklet.pdf', 'Federal Board of Revenue'),
  src('POS Invoice Verification', 'https://fbr.gov.pk/pos-invoice-verification/163085/163142', 'Federal Board of Revenue'),
  src('Digital Invoicing Legal Provisions (Digital Invoicing Rules, Registered Persons Required to Integrate)', 'https://fbr.gov.pk/di-legal-provisions/173967/173968', 'Federal Board of Revenue'),
  src('IRIS taxpayer portal', 'https://iris.fbr.gov.pk/public/txplogin.xhtml', 'Federal Board of Revenue'),
];

const spec: PostSpec = {
  slug: 'fbr-e-invoicing-complete-guide-2026',
  title: 'FBR POS Integration and E-Invoicing: A Guide for Shops',
  summary:
    'What FBR POS integration asks of retailers, how it differs from FBR digital invoicing, who it applies to and how to get set up, with each rule linked to the FBR notice it comes from.',
  category: 'compliance',
  tags: ['GLOSSARY_TERM:fbr-pos', 'GLOSSARY_TERM:tier-1-retailer', 'GLOSSARY_TERM:ntn', 'GLOSSARY_TERM:strn'],
  related: ['PRODUCT:fbr', 'SERVICE:fbr-integration-setup', 'BLOG_POST:sales-tax-guide-punjab-2026'],
  blocks: [
    prose(`If you run a larger shop, a chain outlet or a store in a mall, you have probably heard that your billing has to be "connected to FBR". This guide explains what that means in practice: what FBR POS integration is, how it differs from the newer digital invoicing system, how to tell whether it applies to you, and what the setup involves.

Rules and lists change through SROs, general orders and each year's Finance Act. So this guide does not quote thresholds or penalty amounts from memory. Every rule below points to the FBR page or notice it comes from, and the sources are listed at the end.`),
    checkRules(`Tax law changes through Finance Acts and SROs. Before you act on anything here, open the FBR pages linked in this post and read the current notice, or ask your tax adviser. This post was checked against fbr.gov.pk on ${CHECKED_ON}.`),
    prose(`## Two systems, often confused

**POS integration** is for retailers. A retailer covered by the rules connects its point-of-sale software to FBR, so each sale is reported to FBR as it happens. The printed receipt then carries an FBR invoice number and a QR code, and a customer can check the invoice through FBR's [POS invoice verification](https://fbr.gov.pk/pos-invoice-verification/163085/163142) service.

**Digital invoicing** is a separate FBR system for sales tax invoices between registered businesses. FBR publishes its own legal provisions for it, including the Digital Invoicing Rules and a notification titled "Registered Persons Required to Integrate", plus a list of licensed integrators. See FBR's [Digital Invoicing Legal Provisions](https://fbr.gov.pk/di-legal-provisions/173967/173968) page.

Both are covered by Chapter XIV of the Sales Tax Rules, 2006, which FBR lists as "Procedure for Licensing, Issuance of Electronic Sales Tax Invoices and Integration of Registered Persons" (S.R.O. 69(I)/2025). A neighbourhood shop that sells to the public is usually asking about the first one, POS integration.`),
    diagram(
      'A sale at an integrated counter is reported to FBR, which returns a fiscal invoice number. The number and a QR code are printed on the customer\'s receipt.',
      { kind: 'fbr-invoice', animate: true, labels: { authority: 'FBR' } },
      'How an integrated sale works',
    ),
    prose(`## Who has to integrate

POS integration applies to **Tier-1 retailers**. The term is defined in the Sales Tax Act, 1990 (section 2(43A)), and the definition has been changed more than once by Finance Acts. In broad terms it covers retailers that are part of a national or international chain, retailers in air-conditioned shopping malls or plazas, and other retailers that meet conditions set in the law, such as conditions linked to shop size or the electricity bill. The exact conditions and amounts are in the current text of the Act and in FBR's POS booklet, so check them there rather than relying on a summary.

FBR also issues Sales Tax General Orders that name specific retailers and set integration dates; the list is on the [Tier-1 general orders](https://fbr.gov.pk/sales-tax-general-order-tier-1/163085/173442) page.

A useful way to think about it:

- If you are a single small shop outside a mall, not part of a chain, check the definition once and keep the answer on file.
- If you are a chain outlet, a mall shop, or a large store, assume it applies until a tax adviser confirms otherwise.
- If you sell mainly to other registered businesses, read the digital invoicing notices too.

## What FBR's POS pages list

FBR's [POS Legal Provisions](https://fbr.gov.pk/pos-legal-provisions/163085/163086) page collects the documents that govern integration. As listed on that page when we checked:

| Document | What it covers |
|---|---|
| Sales Tax Rules 2006, Chapter XIV (S.R.O. 69(I)/2025) | Licensing, electronic invoices and integration |
| S.R.O. 428(I)/2024 and S.R.O. 2071(I)/2025 | Notifications listed under POS legal provisions |
| Point of Sale (POS) Booklet | The legal provisions in one document |
| S.R.O. 1006(I)/2021 and FBR clarifications | The standardized tax invoice, including how discounts appear |
| S.R.O. 1279(I)/2021 | A service charge of one rupee per invoice issued through an integrated POS |
| S.R.O. 252(I)/2022 and S.R.O. 164(I)/2025 | Procedure for sealing and de-sealing premises of Tier-1 retailers |
| Prize scheme procedure (amended by S.R.O. 1513(I)/2024) | FBR's prize draw for invoices from integrated POS |

The sealing procedure is the reason integration is not optional for those it covers: FBR has a set process for acting against Tier-1 retailers who do not comply. Penalties are set in the Sales Tax Act; read the current section with your adviser.`),
    steps(
      'Getting set up, step by step',
      [
        ['Register for sales tax', 'You need an NTN and sales tax registration (STRN). Registration is done on FBR\'s IRIS portal.'],
        ['Register your outlets and counters', 'Each outlet and each POS counter is registered with FBR, which issues the identifiers your software sends with every invoice. Your IRIS profile is where this is managed.'],
        ['Choose software that can integrate', 'Your POS software must send each invoice to FBR in the format FBR publishes, and print the FBR invoice number and QR code on the receipt.'],
        ['Test before going live', 'FBR provides a test (sandbox) environment. Run real-looking bills, returns and discounts through it before switching to live.'],
        ['Go live and watch failures', 'Once live, every sale should come back with an FBR number. Check daily that no invoice is stuck, and fix any that FBR rejects.'],
      ],
      'The order below is the usual path. Your adviser or software provider will confirm the details for your case.',
      true,
    ),
    shot({
      heading: 'FBR and provincial tax settings in Nafaa',
      body: 'The tax screen holds the FBR POS connection and separate tabs for provincial authorities, so the counter does not change when integration is switched on.',
      id: SHOT.taxSetup,
      url: 'app.nafaa.pk/tax',
      layout: 'split-right',
    }),
    prose(`## How Nafaa handles it

Nafaa is an {{fact:compliance.fbrPra}}. In the tax settings you enter the details FBR gives you, test against FBR's sandbox, then switch to production. After that:

- Each bill made at the counter is sent to FBR, and the FBR invoice number and QR code are printed on the receipt.
- If FBR is slow or the internet drops, the bill is still made at the counter and the submission is retried automatically, with the waiting time growing between attempts.
- The tax screen shows how many invoices were submitted, rejected or are still pending, so a stuck invoice does not go unnoticed.

If you would rather have someone do the setup, Nafaa offers [FBR integration setup](/services/fbr-integration-setup) as a service.

## Common mistakes

- **Integrating one counter and not the others.** Every counter that makes sales needs to be registered and connected.
- **Ignoring rejected invoices.** A rejection usually means a wrong identifier or a field FBR did not accept. Fix it the same day.
- **Hand-written bills on busy days.** If the integrated counter is bypassed, the sale is not reported.
- **Relying on an old summary.** Thresholds and dates have changed several times. Read the current notice.`),
    sourcesBlock(SOURCES),
  ],
  outline: ['Two systems', 'Who must integrate (Tier-1, Act section 2(43A))', 'What FBR lists', 'Setup steps', 'How Nafaa handles it', 'Common mistakes'],
  dropped: [
    '"SRO 428(I)/2021" reference and "185,000 retail outlets" (not verified; FBR lists S.R.O. 428(I)/2024).',
    'Threshold table by turnover and deadlines for 2026 (invented).',
    'Tier-1 list items "3+ branches", "imports PKR 5M+", "electricity bill > PKR 100K/month" (not verified).',
    '"15-day sandbox testing" step and the penalty amounts (not cited).',
    '"One of only 7 FBR-approved POS providers", "every sale reported within 15 seconds", "zero configuration", "12,000+ businesses".',
    FAKE_AUTHOR,
  ],
  needsOwner: [
    'O2: evidence for "FBR & PRA approved POS integrator" before this post is published.',
    'Tax adviser to confirm the Tier-1 summary (section 2(43A) categories) against the current Act before publishing.',
  ],
  evidence: [
    'apps/api/src/integrations/fbr/fbr.service.ts',
    'apps/api/src/integrations/fbr/fbr-errors.ts',
    'apps/api/src/integrations/fbr/fbr.module.ts',
    'apps/web/src/modules/tax/TaxPage.tsx',
    'apps/web/src/modules/tax/components/SettingsView.tsx',
    'apps/web/src/core/receipt/print.ts',
  ],
  sources: SOURCES,
  factNote:
    'FBR document titles and SRO numbers read on fbr.gov.pk (POS Legal Provisions, Tier-1 general orders, Digital Invoicing Legal Provisions) on 2026-10-26. Tier-1 categories given in general terms only, pointing to section 2(43A) of the Sales Tax Act 1990. Nafaa behaviour checked in apps/api/src/integrations/fbr.',
};

export default spec;
