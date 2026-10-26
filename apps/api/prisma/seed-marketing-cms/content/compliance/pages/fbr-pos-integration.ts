/**
 * FBR POS integration for Tier-1 retailers. Every rule comes from FBR's own
 * POS Booklet (Sales Tax Act and Income Tax Ordinance extracts) and the POS
 * Legal Provisions page, read on CHECKED_ON. Penalty amounts are quoted from
 * the booklet; nothing is stated from memory.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { CHECKED_ON_TEXT, TAX_EVIDENCE, checkRules, src, type ComplianceSpec } from '../_compliance';

const BOOKLET = src('Point of Sale (POS) Booklet: legal provisions in the Sales Tax Act, Sales Tax Rules and Income Tax Ordinance', 'https://download1.fbr.gov.pk/Docs/202551615541769POSBooklet.pdf', 'Federal Board of Revenue');
const LEGAL = src('POS Legal Provisions (SROs, Sales Tax Rules Chapter XIV, POS booklet)', 'https://fbr.gov.pk/pos-legal-provisions/163085/163086', 'Federal Board of Revenue');
const CH14 = src('Sales Tax Rules 2006, Chapter XIV (S.R.O. 69(I)/2025)', 'https://download1.fbr.gov.pk/Docs/2025571554338577ChapterXIV.pdf', 'Federal Board of Revenue');
const GENERAL_ORDERS = src('Sales Tax General Orders: Tier-1 retailers, integration with FBR\'s POS system', 'https://fbr.gov.pk/sales-tax-general-order-tier-1/163085/173442', 'Federal Board of Revenue');
const VERIFY = src('POS Invoice Verification', 'https://fbr.gov.pk/pos-invoice-verification/163085/163142', 'Federal Board of Revenue');
const IRIS = src('IRIS taxpayer portal', 'https://iris.fbr.gov.pk/public/txplogin.xhtml', 'Federal Board of Revenue');
const DI = src('Digital Invoicing Legal Provisions', 'https://fbr.gov.pk/di-legal-provisions/173967/173968', 'Federal Board of Revenue');

const SUMMARY =
  'FBR POS integration requires Tier-1 retailers to connect every sales counter to FBR, so each invoice is reported as it is made and carries an FBR invoice number and QR code. This page explains who counts as Tier-1, how to register, what the law says happens if you do not integrate, and how Nafaa reports invoices.';

const spec: ComplianceSpec = {
  slug: 'fbr-pos-integration',
  title: 'FBR POS Integration for Tier-1 Retailers',
  authority: 'FBR',
  summary: SUMMARY,
  sroRefs: [
    'Sales Tax Act 1990, s. 2(43A) and s. 3(9A)',
    'Sales Tax Rules 2006, Chapter XIV (S.R.O. 69(I)/2025)',
    'S.R.O. 1279(I)/2021: service charge per POS invoice',
    'S.R.O. 252(I)/2022 and S.R.O. 164(I)/2025: sealing procedure',
    'Income Tax Ordinance 2001, s. 64D: tax credit for POS machines',
  ],
  penaltySummary:
    'Sales Tax Act s. 33, serial 25A: 500,000 rupees for the first default, then 1, 2 and 3 million rupees for later defaults, and sealing of the premises. Serial 24: 500,000 rupees or 200% of the tax involved, whichever is higher, for sales kept outside the system. Source: FBR POS Booklet.',
  seoTitle: 'FBR POS Integration for Tier-1 Retailers: Who and How',
  seoDescription:
    'FBR POS integration for Tier-1 retailers: who must connect, how to register, what happens if you do not, and how Nafaa reports each invoice to FBR.',
  focusKeyword: 'fbr pos integration',
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compliance · FBR', heading: 'FBR POS integration: who must comply and how to set it up' }),
    answerBox(
      [
        { label: 'Who', value: 'Tier-1 retailers as defined in section 2(43A) of the Sales Tax Act, 1990, such as chain outlets and shops in air-conditioned malls' },
        { label: 'What', value: 'Every retail outlet integrated with FBR\'s computerized system for real-time reporting of sales (section 3(9A))' },
        { label: 'Procedure', value: 'Chapter XIV of the Sales Tax Rules, 2006 (S.R.O. 69(I)/2025)' },
        { label: 'If you do not', value: 'Escalating penalties under section 33, possible sealing, and a 60% cut in adjustable input tax for the period' },
        { label: 'Checked', value: `Against FBR's POS Booklet and POS Legal Provisions page on ${CHECKED_ON_TEXT}` },
      ],
      'FBR POS sirf Tier-1 retailer ke liye hai: chain store, AC mall ki dukaan, ya woh retailer jo qanoon ki shart poori kare. Har counter FBR se jurta hai aur har bill par FBR number aur QR chhapta hai.',
      'FBR POS integration at a glance',
    ),
    checkRules(
      'Tier-1 conditions, thresholds and penalties change through Finance Acts and SROs. Read the current FBR notice linked below, or ask your tax adviser, before you act. Everything on this page is quoted from FBR documents as they stood on the check date.',
    ),
    prose(`## Who counts as a Tier-1 retailer

FBR's POS Booklet reproduces the definition from section 2(43A) of the Sales Tax Act, 1990. A retailer is Tier-1 if it falls in **any one** of these categories:

| Category in section 2(43A) | In plain words |
|---|---|
| (a) | A unit of a national or international chain of stores |
| (b) | A retailer in an air-conditioned shopping mall, plaza or centre (kiosks excluded) |
| (c) | A retailer whose electricity bills over the last twelve consecutive months add up to more than 1.2 million rupees |
| (d) | A wholesaler-cum-retailer that imports consumer goods in bulk and sells both to retailers and to the public |
| (f) | A retailer that has a card payment terminal from a bank or another digital payment provider authorised by the State Bank |
| (g) | A retailer whose withholding tax under sections 236G or 236H passed a threshold notified by FBR |
| (h) | Any other person or class of persons FBR prescribes |

Category (f) surprises many shopkeepers: as the booklet reads, accepting cards through a bank terminal is enough on its own. FBR also publishes Sales Tax General Orders that name retailers and give integration dates; check the [Tier-1 general orders](https://fbr.gov.pk/sales-tax-general-order-tier-1/163085/173442) page for your name.

FBR POS integration is about sales tax on goods. Restaurants, salons and other service businesses report provincial sales tax to [PRA](/compliance/pra-punjab), [SRB](/compliance/srb-sindh) or [KPRA](/compliance/kpra-khyber-pakhtunkhwa) instead. Invoices between registered businesses fall under FBR's separate [digital invoicing](https://fbr.gov.pk/di-legal-provisions/173967/173968) rules.`),
    diagram(
      'At an integrated counter each sale is reported to FBR, which returns an invoice number. The number and a QR code print on the receipt, and the customer can verify it with FBR.',
      { kind: 'fbr-invoice', animate: true, labels: { authority: 'FBR' } },
      'What happens to each sale',
    ),
    prose(`## What integration means at the counter

Section 3(9A) says Tier-1 retailers "shall integrate their retail outlets with Board's computerized system for real-time reporting of sales", from the date and in the manner FBR prescribes. Chapter XIV of the Sales Tax Rules sets that manner. In practice:

- **Every counter that sells is registered and connected.** One integrated counter and one manual counter is not integration.
- **Every receipt carries FBR's invoice number and QR code.** Customers can check a receipt through FBR's [POS invoice verification](https://fbr.gov.pk/pos-invoice-verification/163085/163142) service, and FBR runs a prize scheme for verified invoices.
- **A small service charge per invoice.** FBR's legal provisions page lists S.R.O. 1279(I)/2021, a service charge of one rupee on each invoice issued through an integrated POS.
- **Sales outside the system are an offence.** Section 33 treats an invoice without the prescribed number or QR code, or a duplicate or fake one, as a separate offence from not integrating at all.

## What the law says if you do not integrate

All of the following are quoted in FBR's POS Booklet:

- **Input tax cut.** Under section 8B(6), a Tier-1 retailer that does not integrate in a tax period loses 60% of its adjustable input tax for the whole period.
- **Penalties for not integrating** (section 33, serial 25A): 500,000 rupees for the first default, 1 million for the second, 2 million for the third and 3 million for the fourth, each after fifteen days of the previous order. The premises can also be sealed. If the retailer integrates before the second penalty is imposed, the Commissioner waives the first.
- **Penalties for sales kept outside the system** (serial 24): 500,000 rupees or 200% of the tax involved, whichever is higher, with possible prosecution and sealing.
- **Utilities.** Section 14AB lets FBR direct gas and electricity companies to disconnect notified Tier-1 retailers that are registered but not integrated.

There is help on cost too. Section 64D of the Income Tax Ordinance gives a tax credit for a point of sale machine bought to integrate: the amount actually invested or 150,000 rupees per machine, whichever is less.`),
    steps(
      'How to get integrated',
      [
        ['Register for sales tax', 'You need an NTN and sales tax registration (STRN). Both are done on FBR\'s IRIS portal.'],
        ['Register outlets and counters', 'Each outlet and each POS counter is registered with FBR, which issues the POS ID and security token your software sends with every invoice.'],
        ['Choose software that can report', 'Your POS must send each invoice in FBR\'s format and print the FBR number and QR code on the receipt.'],
        ['Test in the sandbox', 'Run sales, returns and discounts through FBR\'s test environment before going live. A test sent on live becomes a real tax invoice.'],
        ['Go live and watch rejections', 'Each sale should come back with an FBR number. Check every day that nothing is stuck or rejected.'],
      ],
      'The usual order. Your adviser confirms the details for your business.',
      true,
    ),
    shot({
      heading: 'FBR settings in Nafaa',
      body: 'Choose FBR, enter the POS ID and token for each branch, send a test bill on the sandbox, then switch to live. Each branch reports to one authority only.',
      id: SHOT.taxSetup,
      url: 'app.nafaa.pk/settings/tax',
      layout: 'split-right',
    }),
    prose(`## How Nafaa handles it

Nafaa is an {{fact:compliance.fbrPra}}. Once a branch is set to FBR:

- Each bill made at that branch's counter is sent to FBR, and the FBR invoice number and QR code print on the receipt.
- If the internet or FBR's server is down, the bill is still made. Nafaa keeps it in a queue and sends it again on its own, waiting longer between attempts, and the same bill is never sent twice.
- Rejected bills are listed with FBR's reason. Usually it is a wrong POS ID, token or PCT code; fix it and resend one bill or all failed bills at once.
- A return is sent as a credit note against the original invoice.
- The monthly report gives the figures for your return (sales, output tax, credit notes and net tax by rate and branch) as an A4 print or CSV for your accountant. Only bills FBR accepted are counted, so clear failed bills before you file.

If you would rather not do the setup yourself, Nafaa offers [FBR and PRA integration setup](/services/fbr-integration-setup) as a service. The [FBR & PRA invoicing](/product/fbr) page shows the feature in more detail, and our [guide to FBR POS integration and e-invoicing](/blog/fbr-e-invoicing-complete-guide-2026) explains the background.`),
  ],
  faqs: [
    [
      'My shop is small and not in a mall. Do I need FBR POS integration?',
      'Only if you fall in one of the Tier-1 categories in section 2(43A). Check three things: whether you are part of a chain, whether your electricity bills over the last twelve months passed the limit in the Act, and whether you accept cards through a bank terminal, which is a category of its own. Also search FBR\'s Tier-1 general orders for your name.',
    ],
    [
      'I already report to PRA for my restaurant. Do I also need FBR POS?',
      'Usually not for the restaurant itself. PRA, SRB and KPRA collect sales tax on services, while FBR POS covers Tier-1 retailers selling goods. A business that does both, for example a bakery café with a retail counter in a mall, should ask its adviser which authority each counter reports to. In Nafaa, each branch reports to one authority.',
    ],
    [
      'What happens to FBR reporting when the internet goes down?',
      'The rules expect every sale to be reported, but a dropped connection should not stop the counter. Nafaa makes the bill, keeps it in a queue and sends it to FBR automatically when the connection returns. The tax screen shows which bills are still waiting so you can make sure all of them are accepted before filing your return.',
    ],
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:tier-1-retailer', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:fbr-pos', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:ntn', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:strn', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:sales-tax-invoice', kind: 'TAG' },
    { ref: 'PRODUCT:fbr', kind: 'RELATED' },
    { ref: 'SERVICE:fbr-integration-setup', kind: 'RELATED' },
    { ref: 'BLOG_POST:fbr-e-invoicing-complete-guide-2026', kind: 'RELATED' },
    { ref: 'SOLUTION:retail-chains', kind: 'RELATED' },
  ],
  sources: [BOOKLET, LEGAL, CH14, GENERAL_ORDERS, VERIFY, IRIS, DI],
  evidence: [...TAX_EVIDENCE, 'apps/api/src/integrations/fbr/fbr.service.ts'],
  factNote:
    'Tier-1 categories (s. 2(43A)), s. 3(9A), s. 8B(6), s. 14AB, s. 33 serials 24 and 25A, and ITO s. 64D read in FBR\'s POS Booklet (download1.fbr.gov.pk) on 2026-10-26; S.R.O. 1279(I)/2021 service charge from the POS Legal Provisions page. Nafaa behaviour checked in apps/api/src/integrations/tax-authority and apps/web/src/modules/tax.',
  needsOwner: [
    'O2: approval letter or licence number behind "FBR & PRA approved POS integrator" (the {{fact:compliance.fbrPra}} token).',
    'Tax adviser to confirm the Tier-1 table and penalty amounts against the Act as amended by the latest Finance Act (the booklet may lag).',
  ],
};

export default spec;
