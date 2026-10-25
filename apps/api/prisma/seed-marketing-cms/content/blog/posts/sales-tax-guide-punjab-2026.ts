/**
 * Sales tax for businesses in Punjab: goods under FBR, services under PRA.
 * No rates are stated; every rule points to the PRA or FBR page it comes from.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { CHECKED_ON, FAKE_AUTHOR, checkRules, sourcesBlock, src, type PostSpec } from '../_post';

const SOURCES = [
  src('Punjab Revenue Authority (home, e-Registration, return filing and e-IMS links)', 'https://pra.punjab.gov.pk/', 'Punjab Revenue Authority'),
  src('PRA e-Registration user manual', 'https://www.pra.punjab.gov.pk/Downloads/PRA-Taxpayers-End-Registration-User-Manual-V0.1.pdf', 'Punjab Revenue Authority'),
  src('PRA IRIS e-portal (registration, returns, verification)', 'https://e.pra.punjab.gov.pk/', 'Punjab Revenue Authority'),
  src('PRA e-IMS services (electronic invoice monitoring)', 'https://e.pra.punjab.gov.pk/public/eims.xhtml', 'Punjab Revenue Authority'),
  src('POS Legal Provisions (federal sales tax on goods, Tier-1 retailers)', 'https://fbr.gov.pk/pos-legal-provisions/163085/163086', 'Federal Board of Revenue'),
  src('IRIS taxpayer portal', 'https://iris.fbr.gov.pk/public/txplogin.xhtml', 'Federal Board of Revenue'),
];

const spec: PostSpec = {
  slug: 'sales-tax-guide-punjab-2026',
  title: 'Sales Tax in Punjab: A Guide for Retailers and Service Businesses',
  summary:
    'In Punjab, sales tax on goods is federal and handled by FBR, while sales tax on services is collected by the Punjab Revenue Authority (PRA). This guide explains which one applies to your business, how registration and returns work, and where to find the current rates.',
  category: 'compliance',
  tags: ['CITY:lahore', 'GLOSSARY_TERM:ntn', 'GLOSSARY_TERM:strn'],
  related: ['PRODUCT:fbr', 'BLOG_POST:fbr-e-invoicing-complete-guide-2026', 'INDUSTRY:restaurant'],
  blocks: [
    prose(`Ask ten shopkeepers in Lahore who collects sales tax and you may get three answers: FBR, PRA, or "the government". The confusion is understandable, because in Punjab two different bodies collect sales tax on two different things. Getting this right is the first step, because it decides where you register, where you file and which rules apply to your counter.

This guide covers the split, the registration path, what returns involve, and the mistakes that cause the most trouble. It deliberately does not list tax rates: rates change with each budget and differ by service, so the only safe place to read them is the authority's own schedule.`),
    checkRules(`Rates, schedules and filing dates change with each Finance Act and provincial budget. Read the current schedule on pra.punjab.gov.pk (services) or fbr.gov.pk (goods) before you price, file or register, and ask a tax adviser for your case. Checked on ${CHECKED_ON}.`),
    prose(`## Goods or services: who collects what

**Sales tax on goods** is a federal tax under the Sales Tax Act, 1990, collected by the Federal Board of Revenue. A kiryana store, a garments shop, an electronics dealer or a pharmacy selling goods deals with FBR for sales tax, even though it is in Punjab. Larger retailers that count as Tier-1 also have to connect their POS to FBR (see our [FBR POS integration guide](/blog/fbr-e-invoicing-complete-guide-2026)).

**Sales tax on services** in Punjab is a provincial tax under the Punjab Sales Tax on Services Act, 2012, collected by the **Punjab Revenue Authority (PRA)**. Restaurants, caterers, salons, gyms, hotels, courier services, consultants and many other service providers deal with PRA.

| Your business | Mainly sells | Sales tax goes to |
|---|---|---|
| Kiryana, garments, hardware, pharmacy | Goods | FBR (federal) |
| Restaurant, café, caterer | Services (food service) | PRA |
| Salon, gym, spa | Services | PRA |
| Shop that also repairs or installs | Both | Possibly both; ask an adviser |

Some businesses do both. A mobile shop that sells phones (goods) and repairs them (a service), or a bakery that sells packed goods and runs a dine-in café, may have obligations on each side. This is where an adviser earns their fee.

## Registering with PRA

PRA registration is done online on PRA's e-portal. PRA publishes an [e-Registration user manual](https://www.pra.punjab.gov.pk/Downloads/PRA-Taxpayers-End-Registration-User-Manual-V0.1.pdf) that walks through the screens. Before you start, keep these ready:

- Your NTN from FBR (most PRA registrations start from it)
- CNIC of the owner or directors
- Business address and the nature of the service
- Bank account details of the business
- Utility bill or tenancy papers for the premises`),
    steps(
      'The usual path for a service business',
      [
        ['Get an NTN from FBR', 'Register on FBR\'s IRIS portal if you do not already have a National Tax Number.'],
        ['Register with PRA', 'Apply on PRA\'s e-portal using the e-Registration manual, and choose the service category that matches your business.'],
        ['Check your rate in the schedule', 'Read the current rate for your service category on PRA\'s site. Do not copy a rate from a competitor\'s bill.'],
        ['Set up invoicing', 'If PRA requires your category to report invoices electronically, connect your billing to PRA\'s e-IMS so each bill gets a PRA fiscal number.'],
        ['File returns on time', 'File on PRA\'s portal. The return filing manual and FAQs on the PRA site explain the form and the due dates.'],
      ],
      undefined,
      true,
    ),
    prose(`## Electronic invoices for restaurants and others

PRA runs an electronic invoice monitoring system (e-IMS). PRA's site links to [e-IMS services](https://e.pra.punjab.gov.pk/public/eims.xhtml) and a technical specification for the software that connects to it. Where your category is covered, each bill your counter prints is reported to PRA and carries a PRA fiscal number. PRA's official Android app, linked from its home page, lets taxpayers and customers use PRA services on the phone.

In practice this works much like FBR's POS integration: your billing software sends each invoice, receives a number back, and prints it on the receipt.`),
    shot({
      heading: 'PRA, SRB and KPRA sit next to FBR',
      body: 'Nafaa keeps each tax authority on its own tab in tax settings, so a restaurant in Lahore connects to PRA while a retailer connects to FBR.',
      id: SHOT.taxSetup,
      url: 'app.nafaa.pk/tax',
      layout: 'split-left',
    }),
    prose(`## How Nafaa fits in

Nafaa offers optional FBR/PRA integration. For a service business in Punjab, the PRA connection sends each bill to PRA's e-IMS, prints the fiscal number and QR code on the receipt, and handles returns as returns rather than negative sales. The same tax screen has tabs for Sindh (SRB) and Khyber Pakhtunkhwa (KPRA) if you have branches outside Punjab.

The software does not decide your rate or your category. You set the rate from PRA's schedule, and Nafaa applies it to every bill.

## Common mistakes

- **Registering with the wrong authority.** A restaurant registered only with FBR, or a shop selling goods registered only with PRA, is not covered for the tax it actually owes.
- **Copying a rate from someone else.** Rates differ by service and can depend on how the customer pays. Read your own category in the schedule.
- **Treating discounts loosely.** Tax is worked out on the amount the rules say, so a discount given "off the books" can leave the bill and the return out of step.
- **Missing a return because there were no sales.** Many authorities expect a return even for a quiet month. Check whether a nil return is required for you.
- **Mixing personal and business bank accounts.** It makes reconciling the return much harder.

## Where to read more

PRA's home page links to registration, return filing manuals, FAQs, taxpayer verification and e-IMS. For goods, start at FBR's POS legal provisions page. Both are listed below with the date we last checked them.`),
    sourcesBlock(SOURCES),
  ],
  outline: ['Goods vs services', 'Registering with PRA', 'Electronic invoices (e-IMS)', 'How Nafaa fits', 'Common mistakes'],
  dropped: ['"POS software handles it automatically" (not checked for PRA).', 'Rate table (no dated PRA source in the old post).', FAKE_AUTHOR],
  needsOwner: [
    'O2: evidence for "FBR & PRA approved POS integrator" if the post links to that claim.',
    'Tax adviser to confirm the goods/services split examples (mobile repair, bakery café) before publishing.',
  ],
  evidence: [
    'apps/api/src/integrations/tax-authority/adapters.ts',
    'apps/api/src/integrations/tax-authority/tax-setup.ts',
    'apps/web/src/modules/tax/components/SettingsView.tsx',
  ],
  sources: SOURCES,
  factNote:
    'PRA links (e-Registration manual, return filing manuals, e-IMS, IRIS portal, Android app) read on pra.punjab.gov.pk on 2026-10-26. The goods (FBR) vs services (PRA) split follows the Sales Tax Act 1990 and the Punjab Sales Tax on Services Act 2012. No rates or due dates are stated. Nafaa PRA/SRB/KPRA support checked in apps/api/src/integrations/tax-authority.',
};

export default spec;
