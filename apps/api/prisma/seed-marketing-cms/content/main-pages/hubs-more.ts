/**
 * Hub PAGE entries for the comparison and rules sections: /compare, /best,
 * /alternatives and /compliance, plus the FAQs they use.
 *
 * /compare, /best and /compliance render through their own routes
 * (CompareIndex, ComplianceIndex), which add the section directory after
 * these blocks. /alternatives is served by the catch-all route with the hub
 * template, so it carries its own entryGrid. Without these entries the
 * routes fall back to a noindex directory.
 *
 * The pages these hubs list are fact-check types (COMPARE, ALTERNATIVE,
 * BEST_OF, COMPLIANCE): they publish only after the owner's stamp, and the
 * directories show published entries only. The hub copy therefore names
 * topics rather than linking to pages that may not be live yet.
 */

import type { DraftBlock } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import type { SeedEntry, SeedFaq } from '../../lib/types';
import { page, prose } from './_build';

type Block = Omit<DraftBlock, 'id'>;

const CHECKED_ON = '2026-10-26';
const ORIGIN = 'new (hubs pass, 26 Oct 2026)';

/** page() stamps the D2 origin and date; these hubs were written on CHECKED_ON. */
function hub(entry: SeedEntry, note: string): SeedEntry {
  return { ...entry, origin: ORIGIN, factCheck: { checkedOn: CHECKED_ON, note } };
}

function grid(entryType: string, heading: string, intro: string): Block {
  return { type: 'entryGrid', heading, intro, entryType, sort: 'order', limit: 60, layout: 'cards' } as Block;
}

// ─── /compare ───

const compareHub = hub(
  page({
    type: 'PAGE',
    slug: 'compare',
    title: 'Compare Nafaa',
    summary:
      'Nafaa next to the tools Pakistani businesses actually weigh it against: khata apps, other POS systems, inventory and ERP suites, accounting software, Excel and the paper register. Each comparison uses the other product\'s own website, gives the date we checked it, and says when the other tool is the better choice.',
    data: { template: 'hub' },
    seoTitle: 'Compare Nafaa: Khata Apps, POS, ERP and Accounting Tools',
    seoDescription:
      'Fair comparisons of Nafaa with khata apps, POS systems, ERP and accounting software used in Pakistan, from each vendor\'s own site, with dates and sources.',
    focusKeyword: 'nafaa vs',
    hero: {
      eyebrow: 'Compare',
      heading: 'Nafaa compared with the tools you are considering',
      sub: 'Side-by-side comparisons written from each product\'s own pages, with the date we checked them and an honest answer about when the other tool fits you better.',
      layout: 'centered',
    },
    answer: {
      facts: [
        ['Compared with', 'Khata apps, POS systems, inventory and ERP suites, accounting software, Excel and paper'],
        ['Sources', 'The other product\'s own website, docs or app store listing, with the date checked'],
        ['Fairness', 'Every page says when the other tool is the better choice'],
        ['Who writes them', 'The Nafaa team. Nafaa is our product.'],
      ],
      romanUrdu: 'Nafaa ka doosre software se seedha muqabla: khata apps, POS, ERP aur accounting. Har baat us company ki apni website se, tareekh ke saath, aur ye bhi likha hai ke kab doosra software behtar hai.',
    },
    body: [
      prose(`## How these comparisons are written

We make Nafaa, so we hold these pages to a strict rule: every fact about another product comes from that product's own website, documentation or app store listing, and each page lists those sources with the date we checked them. Prices appear only when the vendor publishes them, in the vendor's currency and with the date. Where something is not stated on the vendor's pages, we say so instead of guessing.

Each comparison also has a section on when the other tool is the better choice. A free khata app is right for some businesses, a full ERP for others, and accounting software sits better with many accountants than any POS. Nafaa is built for businesses where the counter is the centre of the day: billing, stock, udhaar and cash together.

## What you will find here

- **Khata and bookkeeping apps** such as DigiKhata and Udhaar Book, for shops deciding between a ledger app and a POS with a khata built in.
- **Other POS systems** used in Pakistan and abroad, including restaurant systems and free POS apps.
- **Inventory and ERP suites** such as Odoo and Zoho Inventory, for businesses deciding how much system they need.
- **Accounting software** such as Tally and QuickBooks, with how Nafaa sends them a daily summary so you can use both.
- **Excel and the paper register,** which are still the most common tools of all.

**Alternative pages** take the other angle: what to use instead of a tool you have outgrown, and how to move. If you are still working out what to look for, start with the [buyer's guides](/best). Software changes often; if you spot something out of date, tell us on WhatsApp and we will correct it.`),
    ],
    faqKeys: ['hub-compare-sources', 'hub-compare-better'],
    cta: { heading: 'See it on your own counter', body: 'Start the 7 din Free Trial and bill a real day before you decide.' },
    relations: [
      { ref: 'PAGE:best', kind: 'RELATED' },
      { ref: 'PAGE:alternatives', kind: 'RELATED' },
      { ref: 'PAGE:product', kind: 'RELATED' },
      { ref: 'PAGE:pricing', kind: 'RELATED' },
    ],
    sortOrder: 24,
    evidence: ['apps/site/src/templates/compare/CompareIndex.tsx', 'apps/api/prisma/seed-marketing-cms/content/compare/_compare.ts'],
    needsOwner: ['The directory on /compare lists compare and alternative pages only after each gets its fact-check stamp.'],
  }),
  'Hub copy describes how compare pages are sourced (content/compare/_compare.ts: vendor site, CHECKED_ON, sources on each table). No competitor facts on the hub itself.',
);

// ─── /alternatives ───

const alternativesHub = hub(
  page({
    type: 'PAGE',
    slug: 'alternatives',
    title: 'Alternatives',
    summary:
      'What to use instead of a tool your business has outgrown: the paper khata register, Excel, an installed desktop POS, a ledger app, a free POS or accounting software at the counter. Each page explains the signs, what to look for, when to stay where you are, and how to move.',
    data: { template: 'hub' },
    seoTitle: 'Alternatives to Khata Apps, Excel, Tally and Desktop POS',
    seoDescription:
      'Outgrown your khata app, Excel sheet, Tally billing or old desktop POS? What to look for in an alternative, when to stay, and how Pakistani shops switch.',
    focusKeyword: 'pos alternative pakistan',
    hero: {
      eyebrow: 'Alternatives',
      heading: 'When your current tool stops keeping up',
      sub: 'Practical pages for owners who feel the limits of a register, a spreadsheet, a ledger app or old software, with the signs, the options and the steps to switch.',
      layout: 'centered',
    },
    answer: {
      facts: [
        ['Covers', 'Paper khata, Excel, desktop POS, ledger apps, free POS apps, accounting software at the counter'],
        ['Each page', 'Signs you have outgrown it, what to look for, when to stay, how to switch'],
        ['Sources', 'The maker\'s own pages or a public reference, with the date checked'],
      ],
      romanUrdu: 'Jab register, Excel, purana software ya khata app kaam se peeche reh jaye: kya nishaniyan hain, naye system me kya dekhna hai, kab purana hi theek hai, aur kaise badlein.',
    },
    body: [
      prose(`## Outgrowing a tool is normal

Most businesses start with what is at hand: a register for udhaar, an Excel sheet for stock, a free app on the phone, or the billing screen in the accountant's software. These are sensible starting points. They start to hurt when the counter gets busy, when staff bill while you are away, when stock never matches the shelf, or when a second branch opens.

Each page in this section looks at one starting point and answers four questions. What are the signs you have outgrown it? What should a replacement do? When is staying where you are the better choice? And how do you switch without losing balances or history? Where a page names another company's product, the facts come from that company's own pages, with the date we checked them.

## Moving without losing anything

The steps are similar whichever tool you leave. Write down every customer and supplier balance on the day you switch and enter them as opening balances. Import products from a spreadsheet. Run the new system next to the old one for a few days, count stock once, then keep the old tool for look-ups. Our [data migration service](/services/data-migration) can do the typing for large lists.

For head-to-head comparisons with named products, see [Compare](/compare).`),
      grid('ALTERNATIVE', 'All alternative pages', 'Pick the tool you use today.'),
    ],
    faqKeys: ['hub-alternatives-balances', 'hub-alternatives-stay'],
    cta: { heading: 'Try the switch on a real day', body: 'Start the 7 din Free Trial, add your balances and bill alongside your old tool.' },
    relations: [
      { ref: 'PAGE:compare', kind: 'RELATED' },
      { ref: 'PAGE:best', kind: 'RELATED' },
      { ref: 'SERVICE:data-migration', kind: 'RELATED' },
      { ref: 'PRODUCT:khata', kind: 'RELATED' },
    ],
    sortOrder: 25,
    evidence: [
      'apps/site/src/templates/hub/HubTemplate.tsx',
      'apps/web/src/modules/customers/directory/offlineKhataActions.ts',
      'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    ],
    needsOwner: ['The ALTERNATIVE grid shows pages only after each gets its fact-check stamp.'],
  }),
  'Switching steps checked against the app: customer opening balances (offlineKhataActions.ts, customer-ledger opening-balance endpoint) and product import (ProductBulkImportPage.tsx).',
);

// ─── /best ───

const bestHub = hub(
  page({
    type: 'PAGE',
    slug: 'best',
    title: 'How to Choose',
    summary:
      'Buyer\'s guides for Pakistani businesses choosing POS software, inventory software or a khata app. Each guide explains what matters for a shop here, compares several options from each vendor\'s own site with the date checked, and says which kind of business each option fits.',
    data: { template: 'hub' },
    seoTitle: 'How to Choose POS, Inventory and Khata Software in Pakistan',
    seoDescription:
      'Buyer\'s guides for Pakistani shops: how to choose POS software, inventory software and khata apps, with options compared from each vendor\'s own site.',
    focusKeyword: 'best pos software pakistan',
    hero: {
      eyebrow: 'Buyer\'s guides',
      heading: 'How to choose software for your business',
      sub: 'Guides that start from what a Pakistani shop needs, then compare the options fairly, including when Nafaa is not the right fit.',
      layout: 'centered',
    },
    answer: {
      facts: [
        ['Guides', 'POS software, inventory software, khata apps'],
        ['Each guide', 'What to check, options compared, which business each one suits'],
        ['Sources', 'Each vendor\'s own website, with the date checked'],
        ['Disclosure', 'Written by the Nafaa team; Nafaa is one of the options'],
      ],
      romanUrdu: 'POS, Stock aur khata software chunne ke guide: Pakistan ki dukaan ke liye kya zaroori hai, kaun sa option kis karobar ke liye theek hai, har company ki apni website se.',
    },
    body: [
      prose(`## Start with your questions, not a list of features

Software lists look alike. What separates them for a business in Pakistan is a short set of questions. Will the counter keep billing when the power or internet goes? Can it sell by carton and by piece, and by weight? Does it keep udhaar, with limits and reminders? Does it take JazzCash, Easypaisa and bank transfers as their own payment methods? What does it cost in a year, in rupees, including add-ons, devices and setup? And who answers when something goes wrong at nine at night?

The guides here are built around those questions. Each one explains why the question matters, compares several options on it using each vendor's own website, and gives the date we checked. We name the kind of business each option suits, and that includes saying when a free app, a paper register or a larger system is the better choice than Nafaa.

## The guides

- **POS software in Pakistan:** offline billing, retail and wholesale units, udhaar, payments and the real yearly cost.
- **Inventory software:** whether stock moves on its own with every sale, purchase, return and transfer, from Excel up to full business suites.
- **Khata apps compared:** digital udhaar registers against each other and against the paper register.

## Next steps

When you have a shortlist, the [comparison pages](/compare) put Nafaa side by side with one product at a time. To understand the terms used, see the [glossary](/glossary). For the jobs themselves, such as running a retail shop or managing udhaar, see the [guides](/guides).`),
    ],
    faqKeys: ['hub-best-fair', 'hub-best-start'],
    cta: { heading: 'Test your shortlist on a real day', body: 'Start the 7 din Free Trial and bill your own products before you decide.' },
    relations: [
      { ref: 'BEST_OF:pos-software-pakistan', kind: 'RELATED' },
      { ref: 'BEST_OF:inventory-software-pakistan', kind: 'RELATED' },
      { ref: 'BEST_OF:khata-apps-compared', kind: 'RELATED' },
      { ref: 'PAGE:compare', kind: 'RELATED' },
      { ref: 'PAGE:guides', kind: 'RELATED' },
    ],
    sortOrder: 26,
    evidence: ['apps/site/src/templates/compare/CompareIndex.tsx', 'apps/api/prisma/seed-marketing-cms/content/bestof/index.ts'],
    needsOwner: ['The /best directory lists best-of pages only after each gets its fact-check stamp.'],
  }),
  'Hub copy summarises the three BEST_OF entries in content/bestof/pages (pos-software-pakistan, inventory-software-pakistan, khata-apps-compared); no vendor facts on the hub itself.',
);

// ─── /compliance ───

const complianceHub = hub(
  page({
    type: 'PAGE',
    slug: 'compliance',
    title: 'Tax and Compliance',
    summary:
      'Plain guides to the rules that reach the shop counter in Pakistan: FBR POS integration for Tier-1 retailers, provincial sales tax on services with PRA, SRB and KPRA, and drug sale rules for pharmacies. Each page cites the law or the authority\'s own site and says what Nafaa does about it.',
    data: { template: 'hub' },
    seoTitle: 'POS Tax Compliance in Pakistan: FBR, PRA, SRB, KPRA, DRAP',
    seoDescription:
      'Who must connect a POS to FBR, PRA, SRB or KPRA, what bills must show, the penalties the law sets, and pharmacy rules under DRAP, with official sources.',
    focusKeyword: 'fbr pos integration',
    hero: {
      eyebrow: 'Tax and compliance',
      heading: 'The rules that reach your counter',
      sub: 'Which authority applies to you, who must connect a POS, what each bill must show and what the law says happens if you do not, explained from official sources.',
      layout: 'centered',
    },
    answer: {
      facts: [
        ['Goods', 'Sales tax on goods is federal, collected by FBR'],
        ['Services', 'Provincial: PRA in Punjab, SRB in Sindh, KPRA in Khyber Pakhtunkhwa'],
        ['Pharmacies', 'Drugs Act, 1976, coordinated by DRAP, plus a provincial drug sale licence'],
        ['In Nafaa', 'Optional FBR and provincial integration, switched on only when it applies to you'],
      ],
      romanUrdu: 'Counter tak pohanchne wale qanoon asaan zubaan me: FBR, PRA, SRB, KPRA aur pharmacy ke liye DRAP. Kis ko POS jorna hai, bill par kya likha ho, aur Nafaa kya karta hai.',
    },
    body: [
      prose(`## Which authority applies to you

Pakistan splits sales tax between the federation and the provinces. Sales tax on goods is federal and collected by FBR, and the Sales Tax Rules require Tier-1 retailers to report every sale in real time through an integrated POS. Sales tax on services, such as restaurant bills, is collected by the province: the Punjab Revenue Authority, the Sindh Revenue Board and the Khyber Pakhtunkhwa Revenue Authority each run their own system for receiving invoices from registered businesses. Pharmacies and medical stores also work under the Drugs Act, 1976, which DRAP coordinates, and under a drug sale licence from the province.

## What each page covers

Every page in this section answers the same practical questions for one authority: who must register or integrate, what each bill must show, how to get connected, and the penalties the law or the authority publishes. Each one cites the Act, the rules or the authority's own website, with the date we checked. Rules change with each Finance Act, so the pages also tell you where to confirm your own status.

## How Nafaa fits

FBR and provincial integration in Nafaa is optional. If the law does not apply to you, nothing changes at your counter. If it does, you enter the credentials the authority gives you once, and each bill is reported as it is made, with the invoice number and QR code printed on the receipt. See [FBR & PRA in Nafaa](/product/fbr). These pages explain the rules in general and are not tax advice; check your case with your tax adviser.`),
    ],
    faqKeys: ['hub-compliance-who', 'hub-compliance-advice'],
    cta: { heading: 'Get your counter ready', body: 'Start the 7 din Free Trial, or ask us on WhatsApp about connecting to your authority.' },
    relations: [
      { ref: 'COMPLIANCE:fbr-pos-integration', kind: 'RELATED' },
      { ref: 'COMPLIANCE:pra-punjab', kind: 'RELATED' },
      { ref: 'COMPLIANCE:srb-sindh', kind: 'RELATED' },
      { ref: 'COMPLIANCE:kpra-khyber-pakhtunkhwa', kind: 'RELATED' },
      { ref: 'COMPLIANCE:drap-pharmacy', kind: 'RELATED' },
      { ref: 'PRODUCT:fbr', kind: 'RELATED' },
      { ref: 'SERVICE:fbr-integration-setup', kind: 'RELATED' },
    ],
    sortOrder: 27,
    evidence: [
      'apps/site/src/templates/compliance/ComplianceIndex.tsx',
      'apps/web/src/integrations/fbr',
      'apps/web/src/integrations/tax-authority',
      'apps/api/src/integrations/fbr/fbr.service.ts',
    ],
    needsOwner: ['The /compliance directory lists compliance pages only after each gets its fact-check stamp.'],
  }),
  'Authorities and laws as cited on the COMPLIANCE pages (content/compliance/pages: Sales Tax Rules Chapter XIV-AA for Tier-1, PRA, SRB, KPRA, Drugs Act 1976/DRAP), and the hub-cities-tax FAQ. Nafaa integration from apps/web/src/integrations/fbr and tax-authority.',
);

export const moreHubs: SeedEntry[] = [compareHub, alternativesHub, bestHub, complianceHub];

// ─── FAQs used by these hubs ───

function faq(key: string, topic: string, question: string, answer: string, sourceNote: string, evidence: string[]): SeedFaq {
  return { key, topic, question, answer, sourceNote, origin: ORIGIN, evidence };
}

export const moreHubFaqs: SeedFaq[] = [
  faq(
    'hub-compare-sources',
    'buying',
    'Where do the facts about other products come from?',
    'Only from the other company\'s own website, documentation or app store listing. Each comparison lists those sources with the date we checked them, and quotes prices only when the vendor publishes them. Where a vendor\'s pages do not say something, the comparison says "not stated" rather than guessing.',
    'Rule in content/compare/_compare.ts and content/alternatives/_alternative.ts: sources with accessedAt on every comparison table.',
    ['apps/api/prisma/seed-marketing-cms/content/compare/_compare.ts'],
  ),
  faq(
    'hub-compare-better',
    'buying',
    'Do you ever say another product is better?',
    'Yes. Every comparison has a section on when the other tool is the better choice, for example a free app for a business that only records udhaar, or an ERP for a manufacturer. Nafaa is built for businesses where the counter is the centre of the day, and we say so when that is not you.',
    'Each COMPARE page has a "When X is the better choice" section.',
    ['apps/api/prisma/seed-marketing-cms/content/compare/pages'],
  ),
  faq(
    'hub-alternatives-balances',
    'buying',
    'Will I lose my udhaar balances if I switch?',
    'No. On the day you switch, enter each customer\'s balance in Nafaa as an opening balance, and each supplier\'s balance in purchasing. Keep your old register, app or file for the history. From then on, every new udhaar is recorded from the bill.',
    'Customer opening balance: customer-ledger opening-balance endpoint; supplier opening balance in supplier ledger API.',
    ['apps/web/src/modules/customers/directory/offlineKhataActions.ts', 'apps/web/src/modules/purchasing/suppliers/api/supplier-ledger.api.ts'],
  ),
  faq(
    'hub-alternatives-stay',
    'buying',
    'When should I not switch?',
    'If your current tool keeps up with your day, your balances match and nobody else needs to see the figures, there is little reason to change. Each alternative page lists the cases where staying put is the better choice, such as a few large entries a day or a counter that never gets busy.',
    'Each ALTERNATIVE page has a "when to stay" section.',
    ['apps/api/prisma/seed-marketing-cms/content/alternatives/pages'],
  ),
  faq(
    'hub-best-fair',
    'buying',
    'Are the buyer\'s guides fair if Nafaa wrote them?',
    'We make Nafaa, and the guides say so. To keep them fair, every fact about another product comes from that product\'s own website with the date checked, prices are quoted only when published, and each guide names the kind of business each option suits, including when Nafaa is not the right fit.',
    'BEST_OF pages carry sources with accessedAt on each comparison table (content/bestof/_bestof.ts).',
    ['apps/api/prisma/seed-marketing-cms/content/bestof/_bestof.ts'],
  ),
  faq(
    'hub-best-start',
    'buying',
    'Which guide should I read first?',
    'If you bill customers at a counter, start with the POS software guide. If your main worry is stock that never matches the shelf, read the inventory guide. If you mainly need to track udhaar, the khata apps comparison is the quickest read.',
    'Three BEST_OF entries in content/bestof/pages.',
    ['apps/api/prisma/seed-marketing-cms/content/bestof/index.ts'],
  ),
  faq(
    'hub-compliance-who',
    'compliance',
    'Does every shop have to connect its POS to FBR?',
    'No. The FBR requirement applies to Tier-1 retailers as defined in the Sales Tax Act, and the provincial authorities set their own rules for services such as restaurants. Many small shops are not covered. The compliance pages explain who is, and where to confirm your own status.',
    'Tier-1 definition and Chapter XIV-AA as cited on COMPLIANCE:fbr-pos-integration and PRODUCT:fbr.',
    ['apps/web/src/integrations/fbr'],
  ),
  faq(
    'hub-compliance-advice',
    'compliance',
    'Is this tax advice?',
    'No. These pages explain the rules in general, from the law and the authorities\' own sites, with the date we checked. Rates, thresholds and deadlines change with Finance Acts and notifications, so confirm your own case with the authority or your tax adviser before acting.',
    'General disclaimer used on compliance pages.',
    ['apps/site/src/templates/compliance/ComplianceTemplate.tsx'],
  ),
];
