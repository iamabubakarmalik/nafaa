/**
 * PRA (Punjab Revenue Authority): sales tax on services and e-IMS POS
 * integration. Rules come from PRA's restaurant services chapter (Chapter
 * XIII, published on reg.pra.punjab.gov.pk) and the PRAL POS Component and
 * e-IMS user manual (version 1.0, January 2026), read on CHECKED_ON. No tax
 * rates are stated: the current rates are in the Act's schedules and change
 * with each Punjab Finance Act.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { CHECKED_ON_TEXT, TAX_EVIDENCE, checkRules, src, type ComplianceSpec } from '../_compliance';

const PRA = src('Punjab Revenue Authority (home, notifications, e-IMS guide)', 'https://pra.punjab.gov.pk/', 'Punjab Revenue Authority');
const MANUAL = src('POS Component and e-IMS User Manual, version 1.0 (PRAL, January 2026)', 'https://e.pra.punjab.gov.pk/templates/POS_COMPONENT_and_eIMS_User_Manual.pdf', 'Punjab Revenue Authority / PRAL');
const EIMS = src('PRA e-IMS services (electronic invoice monitoring)', 'https://e.pra.punjab.gov.pk/public/eims.xhtml', 'Punjab Revenue Authority');
const REG = src('PRA registration portal (POS Client Registration)', 'https://reg.pra.punjab.gov.pk/', 'Punjab Revenue Authority');
const RULES = src('Chapter XIII: Restaurant Services (rules 65 to 74)', 'https://reg.pra.punjab.gov.pk/ptms/SOP/Download/Rules/Restaurant%20services%20Rules%2009-10-2012.pdf', 'Punjab Revenue Authority');

const SUMMARY =
  'The Punjab Revenue Authority collects sales tax on services in Punjab, and its e-IMS system receives each invoice from a registered POS as it is made. This page covers who registers, the restaurant rules on invoices and menus, how to connect a counter to e-IMS, the penalties PRA publishes and how Nafaa reports bills.';

const spec: ComplianceSpec = {
  slug: 'pra-punjab',
  title: 'PRA (Punjab) POS Integration and E-Invoicing',
  authority: 'PRA',
  summary: SUMMARY,
  sroRefs: [
    'Punjab Sales Tax on Services Act, 2012',
    'PRA rules, Chapter XIII: Restaurant Services (rules 65 to 74)',
    'PRA POS Component and e-IMS User Manual, v1.0 (January 2026)',
  ],
  penaltySummary:
    'From PRA\'s restaurant rules: refusing a customer a tax invoice attracts a penalty of 50,000 rupees on the customer\'s complaint (rule 69(4)); using another billing mode where PRA has provided an electronic cash register, at least 100,000 rupees per violation (rule 72(2)); premises of non-corporate restaurants can be sealed after notice (rule 74).',
  seoTitle: 'PRA POS Integration (Punjab): e-IMS, Registration and Rules',
  seoDescription:
    'PRA rules for sales tax on services in Punjab: who registers, restaurant invoice rules, connecting a counter to e-IMS, penalties and how Nafaa reports bills.',
  focusKeyword: 'pra pos integration',
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compliance · PRA', heading: 'PRA in Punjab: registration, e-IMS and invoices' }),
    answerBox(
      [
        { label: 'Who', value: 'Businesses in Punjab that provide taxable services, such as restaurants, cafés, hotels, salons and couriers' },
        { label: 'Registration', value: 'With PRA online. A restaurant already registered with FBR e-enrols, and its number is prefixed with "P" (rule 65)' },
        { label: 'E-invoicing', value: 'Each branch\'s POS is registered on the PRA portal and connected to e-IMS, which issues a PRA invoice number for each sale' },
        { label: 'Returns', value: 'Monthly, with payment, by the 15th of the following month (rule 73)' },
        { label: 'Checked', value: `Against PRA's restaurant rules and the PRAL e-IMS manual on ${CHECKED_ON_TEXT}` },
      ],
      'Punjab me restaurant, cafe, salon jaisi services ka sales tax PRA leta hai. Har branch ka POS PRA portal par register hota hai aur har bill e-IMS ko jata hai, bill par PRA number aur QR chhapta hai.',
      'PRA at a glance',
    ),
    checkRules(
      'PRA rates and the list of services that must use e-IMS are set by the Punjab Finance Act and PRA notifications, and they change. This page does not quote rates. Check the current schedule and notifications on pra.punjab.gov.pk, or ask your tax adviser.',
    ),
    prose(`## Who deals with PRA

PRA administers the Punjab Sales Tax on Services Act, 2012. Sales tax on goods is federal and goes to [FBR](/compliance/fbr-pos-integration); sales tax on **services** provided in Punjab goes to PRA. For a shopkeeper selling goods this usually means FBR, if anyone. For a restaurant, café, hotel, salon, gym, courier or other service business in Lahore, Faisalabad, Rawalpindi, Multan or anywhere else in Punjab, it means PRA.

PRA's restaurant chapter shows how wide "restaurant" is. Rule 66 covers all eatables and drinkables sold by a restaurant or café, coffee house, food parlour, ice-cream parlour, and marriage halls and lawns that also serve walk-in customers. Charges for private dining rooms and decoration at events count towards the taxable value, and rule 67 includes the service charge.

## What PRA's restaurant rules require

These come from Chapter XIII (rules 65 to 74) as published on PRA's registration site. They were written in 2012, so confirm with your adviser that nothing has replaced them.

| Rule | What it asks |
|---|---|
| 65 | Register with PRA, whatever the number of outlets. A restaurant registered with FBR only e-enrols, and its number gets a "P" prefix |
| 68 | Print prices on the menu, show that they are subject to Punjab sales tax, send PRA a signed copy within one month and any price change within fifteen days |
| 69 | Issue serially numbered invoices showing the Punjab sales tax separately and your PRA registration number. Computer-generated invoices are allowed |
| 70 | Give PRA the list of all your outlets; non-corporate restaurants display the registration certificate near the cash counter |
| 73 | File the monthly return and pay by the 15th of the following month |

A customer has the right to ask for a tax invoice, and to have their name, CNIC or NTN written on it (rule 69(3)).`),
    diagram(
      'A sale at a registered counter is sent to PRA\'s e-IMS, which returns a PRA invoice number. The number and QR code print on the customer\'s bill.',
      { kind: 'fbr-invoice', animate: true, labels: { authority: 'PRA e-IMS', fiscal: 'PRA invoice number' } },
      'How a bill reaches PRA',
    ),
    prose(`## How e-IMS works

PRA's Electronic Invoice Monitoring System (e-IMS) is documented by PRAL (Pakistan Revenue Automation). PRAL's [POS Component and e-IMS User Manual](https://e.pra.punjab.gov.pk/templates/POS_COMPONENT_and_eIMS_User_Manual.pdf) (version 1.0, January 2026) describes it as connecting a business's point of sale "directly to the PRA's Electronic Invoice Monitoring System", so that every sale and invoice is reported to PRA in real time. It also says that, as part of regulatory requirements, businesses must register the POS systems used at each branch through the PRA portal.

Registration happens on [reg.pra.punjab.gov.pk](https://reg.pra.punjab.gov.pk/) under **Registration → POS Client Registration**, in four parts:

- **Business information:** brand name, whether the software is cloud-based or client-server, and who the software vendor is.
- **Contact information:** a general and a technical contact.
- **Branch information:** city, address and sector. The manual's sector list for branches is restaurants, hotel, courier and beauty parlour, with a yes/no for franchise.
- **POS details:** each counter at each branch.

PRA then issues test POS IDs for a sandbox and, after testing, live POS IDs. Customers can check a PRA invoice through PRA's [e-IMS services](https://e.pra.punjab.gov.pk/public/eims.xhtml).`),
    steps(
      'Connecting a counter to PRA',
      [
        ['Register or e-enrol with PRA', 'Get your PRA registration. If you already have an FBR registration, e-enrol instead.'],
        ['Register each POS', 'On the PRA portal: Registration, then POS Client Registration. Add the business, contacts, every branch and every counter.'],
        ['Get POS IDs and the token', 'The POS details give you the POS ID and token your software sends with each bill. Generate test POS IDs first.'],
        ['Test on the sandbox', 'Send test bills, returns and discounts. Never send a test bill on live: it becomes a real tax invoice.'],
        ['Go live', 'Switch to the live POS ID, then check the first day\'s bills all came back with a PRA number.'],
      ],
      'The order PRAL\'s manual follows. Keep your PRA login safe; the POS details are tied to it.',
      true,
    ),
    prose(`## Penalties PRA publishes

The restaurant chapter sets three that apply at the counter:

- **No invoice for a customer.** Refusing to give a customer a tax invoice attracts a penalty of 50,000 rupees through adjudication, on the customer's complaint (rule 69(4)).
- **Billing around a PRA device.** Where PRA has given a restaurant an electronic cash register, using any other way of billing carries a penalty of not less than 100,000 rupees for every violation (rule 72(2)).
- **Sealing.** The premises of a non-corporate restaurant that evades or does not pay Punjab sales tax can be sealed, after notice and a reasonable time to comply; tampering with the device is treated the same way (rule 74).

Other offences and penalties are in the Punjab Sales Tax on Services Act, 2012; ask your adviser for the current section.`),
    shot({
      heading: 'PRA settings in Nafaa',
      body: 'Pick PRA, enter each branch\'s POS ID and token, add the PCT code from your registration, send a sandbox test bill and then switch to live.',
      id: SHOT.taxSetup,
      url: 'app.nafaa.pk/settings/tax',
      layout: 'split-left',
    }),
    prose(`## How Nafaa handles PRA

Nafaa is an {{fact:compliance.fbrPra}}, and reports to PRA through the same e-IMS interface PRAL documents. On the PRA portal choose **cloud-based** as the POS type. In Nafaa's tax settings you enter each branch's POS ID and token and the PCT code from your registration, test on the sandbox, and switch to live. Before going live, PRA has to allow Nafaa's server to send bills; Nafaa support gives you the address to share.

From then on every bill at that branch goes to PRA as it is made, and the PRA invoice number and QR code print on the receipt. A dropped connection never stops the counter: bills wait in a queue and are sent automatically, and anything PRA rejects is listed with its reason so you can fix and resend it. Returns go to PRA as credit notes against the original bill. At month end the report gives sales, output tax, credit notes and net tax by rate and branch, ready for your PRA return.

For restaurants, see how this fits with tables and kitchen tickets on the [restaurant POS](/industries/restaurant) page. For the wider picture of Punjab sales tax, read our [sales tax guide for Punjab](/blog/sales-tax-guide-punjab-2026).`),
  ],
  faqs: [
    [
      'Does a kiryana or clothing shop in Punjab need PRA integration?',
      'Usually not. PRA collects sales tax on services, and a shop that only sells goods deals with FBR, and only if it is a Tier-1 retailer. If the same business also provides a service, such as a café counter or a salon, that part may need PRA registration. Ask your adviser how to split it.',
    ],
    [
      'We already have FBR registration. Do we register again with PRA?',
      'PRA\'s restaurant rules say a restaurant already registered with FBR does not take a separate registration. It e-enrols with PRA through the PRA website, and its FBR registration number is used with a "P" in front. POS registration for e-IMS is still done separately for each branch and counter.',
    ],
    [
      'Can we test PRA integration before going live?',
      'Yes. PRAL\'s manual describes a sandbox for testing and a production environment for live sales, and the PRA portal can generate test POS IDs. Nafaa sends a sample bill on the sandbox only, because a bill sent on live is a real tax invoice.',
    ],
  ],
  relations: [
    { ref: 'CITY:lahore', kind: 'TAG' },
    { ref: 'CITY:faisalabad', kind: 'TAG' },
    { ref: 'CITY:rawalpindi', kind: 'TAG' },
    { ref: 'CITY:multan', kind: 'TAG' },
    { ref: 'CITY:gujranwala', kind: 'TAG' },
    { ref: 'CITY:sialkot', kind: 'TAG' },
    { ref: 'CITY:bahawalpur', kind: 'TAG' },
    { ref: 'CITY:sargodha', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:sales-tax-on-services', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:e-invoicing', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:service-charge', kind: 'TAG' },
    { ref: 'PRODUCT:fbr', kind: 'RELATED' },
    { ref: 'SERVICE:fbr-integration-setup', kind: 'RELATED' },
    { ref: 'BLOG_POST:sales-tax-guide-punjab-2026', kind: 'RELATED' },
    { ref: 'INDUSTRY:restaurant', kind: 'RELATED' },
    { ref: 'INDUSTRY:salon', kind: 'RELATED' },
  ],
  sources: [RULES, MANUAL, REG, EIMS, PRA],
  evidence: TAX_EVIDENCE,
  factNote:
    'Rules 65-74 read in PRA\'s Chapter XIII Restaurant Services PDF (reg.pra.punjab.gov.pk) and the e-IMS registration steps in the PRAL POS Component manual v1.0 (e.pra.punjab.gov.pk), both on 2026-10-26. No rates stated. Nafaa PRA steps (POS ID, token, PCT code, sandbox, server whitelisting) from apps/web/src/modules/tax/components/SettingsView.tsx.',
  needsOwner: [
    'O2: approval evidence behind "FBR & PRA approved POS integrator".',
    'Tax adviser to confirm the 2012 restaurant rules (65-74) are still in force as quoted, and which services PRA has notified for e-IMS.',
  ],
};

export default spec;
