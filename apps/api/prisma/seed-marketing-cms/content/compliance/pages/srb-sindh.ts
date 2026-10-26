/**
 * SRB (Sindh Revenue Board): POS integration under the Sindh Sales Tax
 * Special Procedure (Online Integration of Business) Rules, 2022. Rules,
 * schedule, rate and penalties come from the consolidated rules PDF (updated
 * to 1 July 2024) and SRB's POS FAQ page, read on CHECKED_ON.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { CHECKED_ON_TEXT, TAX_EVIDENCE, checkRules, src, type ComplianceSpec } from '../_compliance';

const RULES = src(
  'Sindh Sales Tax Special Procedure (Online Integration of Business) Rules, 2022 (updated up to 1 July 2024)',
  'https://www.srb.gos.pk/srb/wp-content/uploads/2024/09/Sindh-Sales-Tax-Special-Procedure-Online-Integration-of-Business-Rules-2022-updated-upto-1st-July-2024-EOE.pdf',
  'Sindh Revenue Board',
);
const FAQ = src('SRB-POS Integration FAQs (who must integrate, rate, penalties)', 'https://www.srb.gos.pk/srb/faq/', 'Sindh Revenue Board');
const POS_PAGE = src('Point of Sale (PoS): SRB-POS system, notification, user guide and technical documents', 'https://www.srb.gos.pk/srb/point-of-sale-pos/', 'Sindh Revenue Board');
const REG = src('SRB POS Registration', 'https://pos.srb.gos.pk/PoSRegistration/', 'Sindh Revenue Board');
const VERIFY = src('SRB POS Invoice Verification', 'https://pos.srb.gos.pk/InvoiceVerification/', 'Sindh Revenue Board');
const GUIDE = src('POS Integration User Guide', 'https://www.srb.gos.pk/srb/wp-content/uploads/2020/07/POS-Integration-User-Guide.pdf', 'Sindh Revenue Board');

const SUMMARY =
  'The Sindh Revenue Board requires the restaurants listed in its 2022 online integration rules to connect every point of sale to SRB, so each bill gets an SRB invoice number and QR code. This page covers who must integrate, what the bill must show, how to register, the penalties SRB lists and how Nafaa reports bills.';

const spec: ComplianceSpec = {
  slug: 'srb-sindh',
  title: 'SRB (Sindh) POS Integration for Restaurants',
  authority: 'SRB',
  summary: SUMMARY,
  sroRefs: [
    'Sindh Sales Tax on Services Act, 2011',
    'Sindh Sales Tax Special Procedure (Online Integration of Business) Rules, 2022 (Notification SRB-3-4/03/2022)',
    'Amendments: SRB-3-4/32/2022 (10 Aug 2022), SRB-3-4/42/2023 (31 Jul 2023), SRB-3-4/29/2024 (29 Jun 2024)',
  ],
  effectiveDate: '2022-02-21',
  penaltySummary:
    'SRB\'s FAQ quotes section 43 of the Sindh Sales Tax on Services Act, 2011 for integrated persons who bypass the system: serial 2B, a penalty of 25,000 to 100,000 rupees and possible sealing after three consecutive defaults; serial 7B, up to 100,000 rupees or the tax involved, whichever is higher, and on conviction up to one year in prison, a fine of up to 100,000 rupees, or both.',
  seoTitle: 'SRB POS Integration (Sindh): Who Must Integrate and How',
  seoDescription:
    'SRB POS integration for Sindh restaurants: who must integrate, what each bill must show, how to register, the penalties and how Nafaa reports bills to SRB.',
  focusKeyword: 'srb pos integration',
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compliance · SRB', heading: 'SRB in Sindh: POS integration for restaurants' }),
    answerBox(
      [
        { label: 'Who', value: 'Six kinds of restaurant in the rules\' Schedule, including chains with more than one branch in Sindh, mall outlets and any restaurant with turnover above five million rupees a year' },
        { label: 'What', value: 'Every point of sale, including online orders, reports each sale to SRB in real time' },
        { label: 'Rate', value: 'SRB\'s FAQ gives 15% for SRB PoS integrated restaurants' },
        { label: 'Cost', value: 'One rupee per invoice as a service fee (rule 5); integration costs are borne by the business (rule 7)' },
        { label: 'Checked', value: `Against SRB's integration rules and POS FAQ on ${CHECKED_ON_TEXT}` },
      ],
      'Sindh me kai restaurants ke liye SRB-POS lazmi hai: ek se zyada branch, mall outlet, hotel ka restaurant, franchise, online order, ya saal ki sale paanch million se zyada. Har bill par SRB number aur QR chhapta hai.',
      'SRB POS integration at a glance',
    ),
    checkRules(
      'SRB has amended these rules several times, and rates change with the Sindh Finance Act. Read the current consolidated rules and SRB\'s notifications on srb.gos.pk, or ask your tax adviser, before you act.',
    ),
    prose(`## Who must integrate

The Sindh Sales Tax Special Procedure (Online Integration of Business) Rules, 2022 apply to the services in their Schedule. As updated to 1 July 2024, the Schedule lists services provided by:

1. Restaurants located in hotels
2. Restaurants that are franchisers or franchisees
3. Restaurants with more than one branch in Sindh
4. Restaurant outlets in air-conditioned shopping malls
5. Restaurants selling through an online marketplace platform
6. Restaurants whose turnover in the preceding twelve tax periods exceeded five million rupees

The rules also apply to an online marketplace that acts as a facilitator for these services. SRB's FAQ answers the question directly: it is "mandatory for all the restaurants" falling in the Schedule to integrate with the SRB PoS system. In Karachi, Hyderabad and the rest of Sindh, the turnover line alone brings in many single-branch restaurants.

SRB's own description of SRB-POS calls it an e-invoicing system "designed for the undocumented sectors (i.e Hospitality, Health and Beauty)", so watch for notifications that add other services.

## What every bill must show

Rule 6 lists what an integrated invoice carries. In short:

| Part of the bill | What it shows |
|---|---|
| Your business | Business or brand name, branch address and SNTN |
| The invoice | SRB PoS ID, a unique sequential invoice number, date and time; buyer\'s name, NTN and address on business-to-business bills |
| The money | Value of services, tax rate, tax charged, discounts, the one-rupee PoS service fee and the total |
| SRB's part | SRB invoice number, SRB PoS logo, a 7 x 7 mm QR code and a line telling the customer to verify the invoice through the eSRB app or SMS |

Rule 6(3) is blunt: an integrated restaurant issues only this invoice and "shall not issue any katcha or provisional invoice". SRB's FAQ adds that pre-payment or kutcha bills are not allowed through SRB-POS. Returns and exchanges go through credit notes against the original invoice.`),
    diagram(
      'Each bill goes to SRB as it is made. SRB returns its invoice number, which prints on the bill with a QR code the customer can verify.',
      { kind: 'fbr-invoice', animate: true, labels: { authority: 'SRB', fiscal: 'SRB invoice number' } },
      'How a bill reaches SRB',
    ),
    prose(`## Other obligations in the rules

- **Notify every establishment.** Use SRB's online form to list each branch and integrate each PoS (rule 7(2)).
- **No service without the PoS.** Nothing is provided from a notified establishment without being recorded on the integrated PoS (rule 7(4)).
- **Keep logs and backups.** The system keeps user, system and error logs and records every change or cancellation; data is backed up off-site.
- **Display it.** Each integrated outlet shows prominently that it is integrated with SRB and that its invoices can be verified (rule 7(4)(h)).
- **Bear the cost.** Integration costs, including ancillary costs, are borne by the registered person (rule 7(4)(g)).
- **Use a Sindh-based vendor.** Rule 8 says the PoS vendor must have a place of business in Sindh and must give SRB information when asked.
- **Return data fills itself.** Annexure-C of the monthly Sindh sales tax return is generated from the transmitted sales (rule 14). The FAQ says you cannot delete entries from it, but you can add sales that were missed.`),
    steps(
      'Registering with SRB-POS',
      [
        ['Have your SNTN', 'You need Sindh sales tax registration first.'],
        ['Sign up on SRB-POS', 'Register on the SRB POS Registration portal with your SNTN and verify your email.'],
        ['Add branches and counters', 'In the portal, set up each branch and create a PoS ID for every counter.'],
        ['Connect your software', 'Enter the PoS IDs and the SRB PoS user details in your billing software. SRB publishes integration guides for offline and cloud-based software.'],
        ['Test, then go live', 'Send test bills first. Once live, check that every bill comes back with an SRB number and that the QR verifies.'],
      ],
      'SRB\'s FAQ says no special hardware is needed: SRB-POS works with your existing billing software.',
      true,
    ),
    shot({
      heading: 'SRB settings in Nafaa',
      body: 'Pick SRB, enter the PoS ID for each counter with the SRB PoS user and password, test, then switch to live.',
      id: SHOT.taxSetup,
      url: 'app.nafaa.pk/settings/tax',
      layout: 'split-right',
    }),
    prose(`## How Nafaa handles SRB

Nafaa connects to SRB's PoS gateway. In the tax settings you choose SRB, add each counter's PoS ID with the SRB PoS user and password, send a test bill, then switch the branch to live. Every bill is then sent to SRB as it is made, and the SRB invoice number and QR code print on the receipt.

If the connection drops, the counter keeps billing; bills queue and are sent again automatically, and rejected ones are listed with SRB's reason so you can fix and resend them. Returns are sent as credit notes against the original bill. The monthly report shows sales, output tax and credit notes by rate and branch, which helps you check the auto-generated Annexure-C before filing.

Rule 6 is detailed, and rule 8 asks for a vendor with a place of business in Sindh. Before you sign with any vendor, us included, ask for a sample receipt and compare it line by line with the table above, and ask where the vendor is based. See the [restaurant POS](/industries/restaurant) page for tables, kitchen tickets and delivery orders, and [Karachi](/pos-software/karachi) for local details.`),
  ],
  faqs: [
    [
      'We have one restaurant in Karachi, not in a mall. Do we need SRB-POS?',
      'Possibly. Besides chains, mall outlets, hotel restaurants and franchises, the Schedule covers any restaurant whose turnover in the previous twelve tax periods exceeded five million rupees, and any restaurant selling through an online marketplace such as a food delivery app. If either applies, SRB says integration is mandatory.',
    ],
    [
      'Can we still give customers a handwritten or pre-bill?',
      'No. Rule 6(3) says an integrated restaurant issues only the prescribed invoice and no katcha or provisional invoice, and SRB\'s FAQ says pre-payment and kutcha bills are not allowed through SRB-POS. Print the integrated invoice for every order, including takeaway and delivery.',
    ],
    [
      'What does SRB charge for integration?',
      'SRB says its SRB-POS system has no cost implication and needs no special hardware. The rules add a service fee of one rupee on every invoice from an integrated PoS, deposited by the business and shown separately in the return, and the business pays its own software and setup costs.',
    ],
  ],
  relations: [
    { ref: 'CITY:karachi', kind: 'TAG' },
    { ref: 'CITY:hyderabad', kind: 'TAG' },
    { ref: 'CITY:sukkur', kind: 'TAG' },
    { ref: 'CITY:larkana', kind: 'TAG' },
    { ref: 'CITY:mirpur-khas', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:sales-tax-on-services', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:e-invoicing', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:credit-note', kind: 'TAG' },
    { ref: 'PRODUCT:fbr', kind: 'RELATED' },
    { ref: 'SERVICE:fbr-integration-setup', kind: 'RELATED' },
    { ref: 'INDUSTRY:restaurant', kind: 'RELATED' },
    { ref: 'SOLUTION:restaurants', kind: 'RELATED' },
  ],
  sources: [RULES, FAQ, POS_PAGE, REG, VERIFY, GUIDE],
  evidence: TAX_EVIDENCE,
  factNote:
    'Schedule, rules 3, 5, 6, 7, 8 and 14 read in SRB\'s consolidated rules PDF (updated to 1 July 2024); 15% rate and section 43 serials 2B/7B quoted from SRB\'s POS FAQ page; SRB-POS description from srb.gos.pk/srb/point-of-sale-pos; all on 2026-10-26. Nafaa SRB steps from SettingsView.tsx and the SRB adapter in adapters.ts.',
  needsOwner: [
    'Rule 8: does Nafaa (or a partner) have a place of business in Sindh? Until confirmed, the page only tells buyers to ask.',
    'Confirm Nafaa\'s SRB receipt shows every rule 6 particular (SRB logo, 7x7 mm QR, eSRB verification line, one-rupee PoS fee). If not, list the gaps for development before promoting SRB.',
    'The SRB FAQ rate (15%) can change with the Sindh Finance Act; re-check before publishing.',
  ],
};

export default spec;
