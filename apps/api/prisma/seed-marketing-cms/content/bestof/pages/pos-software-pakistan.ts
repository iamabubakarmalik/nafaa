/**
 * POS software in Pakistan: how to choose. Four options with facts from each
 * vendor's own site (Loyverse, Odoo, Corn POS), read on CHECKED_ON, plus
 * Nafaa from the code. The page says when another product fits better.
 */
import { hero } from '../../../lib/blocks';
import { SHOT, prose, shot } from '../../main-pages/_build';
import { quickPick, src, type BestOfSpec } from '../_bestof';

const LOYVERSE = src('Loyverse: free POS system (features and platforms)', 'https://loyverse.com/', 'Loyverse');
const LOYVERSE_PRICING = src('Loyverse pricing (free features and paid add-ons)', 'https://loyverse.com/pricing', 'Loyverse');
const ODOO_POS = src('Odoo Point of Sale for shops', 'https://www.odoo.com/app/point-of-sale-shop', 'Odoo');
const ODOO_PRICING = src('Odoo pricing', 'https://www.odoo.com/pricing', 'Odoo');
const ODOO_APPS = src('Odoo Apps store: third-party Pakistan POS module listing', 'https://apps.odoo.com/apps/modules/17.0/fbr_pos', 'Odoo');
const CORN = src('Corn POS home page (features, platforms, location)', 'https://www.cornpos.com/', 'Corn POS');

const SUMMARY =
  'Choosing POS software in Pakistan comes down to a few questions: will it keep billing when the internet or power fails, can it sell by carton and by piece, does it keep udhaar, and what does it really cost. This guide compares four options on those points, using each vendor\'s own site, and says when each one fits.';

const spec: BestOfSpec = {
  slug: 'pos-software-pakistan',
  title: 'POS Software in Pakistan: How to Choose in 2026',
  category: 'POS',
  summary: SUMMARY,
  seoTitle: 'POS Software in Pakistan (2026): How to Choose, 4 Compared',
  seoDescription:
    'How to choose POS software in Pakistan: offline billing, carton and piece sales, udhaar and real cost, with four options compared from their own websites.',
  focusKeyword: 'pos software pakistan',
  methodology: `**What we compared.** Each product was judged on the questions a Pakistani shop owner asks before buying: does billing continue offline, can one product be sold in more than one unit, is there a khata for udhaar, which local payment methods fit, which devices it runs on, how prices are published and what it takes to set up.

**Where the facts come from.** Facts about other products come only from their own websites, opened on 26 October 2026 and linked on this page. If a site does not mention something, we write "not stated on its site" rather than guess. Facts about Nafaa come from the product itself.

**Order.** Nafaa is our product, so we list it first and say so; you can skip it if you want an outside view. The others follow in alphabetical order. The order is not a score.

**What we did not do.** We did not run speed tests, read user reviews or accept payment from anyone on this list.`,
  items: [
    {
      name: 'Nafaa',
      isNafaa: true,
      strengths: [
        'Keeps billing when the internet drops; sales are saved on the device and sync later',
        'Sells one product by carton, dozen, piece or weight, each with its own price',
        'Khata from the counter: udhaar goes on the customer\'s account, with credit limits and WhatsApp reminders',
        'Cash, card, JazzCash, Easypaisa, bank transfer and khata, split across one bill',
        'Runs in any browser on a phone, tablet or computer, plus a Windows desktop app',
        'Optional FBR/PRA integration',
      ],
      weaknesses: [
        'Paid after a 7-day free trial; plans have limits on products, users, shops and monthly sales',
        'Built for Pakistan: prices in rupees and local payment methods, so less suited to shops abroad',
        'Hardware such as scanners, printers and cash drawers is bought separately',
      ],
      bestFor: 'Pakistani shops that sell on udhaar, sell in several units and need billing to continue through internet cuts.',
    },
    {
      name: 'Corn POS',
      isNafaa: false,
      url: 'https://www.cornpos.com/',
      strengths: [
        'Based in Lahore, with phone and WhatsApp support advertised on its site',
        'Restaurant focus: table-side ordering app, kitchen display and a rider app for delivery',
        'Site advertises an offline mode, with data kept on a live server and a local server',
        'Site lists setups for grocery, meat shops, garment stores and houseware too',
        'Site says it can be integrated with Pakistan\'s tax authorities',
      ],
      weaknesses: [
        'No prices on its home page; you ask for a quote or start a trial',
        'Khata or udhaar features are not stated on its home page',
      ],
      bestFor: 'Restaurants and cafés in Pakistan that want table ordering, a kitchen display and delivery riders from one local vendor.',
    },
    {
      name: 'Loyverse',
      isNafaa: false,
      url: 'https://loyverse.com/',
      price: 'POS free; paid add-ons in US dollars',
      priceSource: LOYVERSE_PRICING,
      strengths: [
        'Point of sale, essential inventory, loyalty and multi-store management listed as free',
        'Keeps recording sales without internet and syncs when back online',
        'Runs on iOS and Android phones and tablets; back office in a web browser',
        'Customer display and kitchen display apps',
      ],
      weaknesses: [
        'Sales history beyond 31 days, employee management and advanced inventory are paid add-ons priced in dollars',
        'Khata or udhaar accounts, Urdu and Pakistani wallets are not stated on its site',
      ],
      bestFor: 'A small shop or café that wants to start free on phones it already owns and can live without a khata.',
    },
    {
      name: 'Odoo Point of Sale',
      isNafaa: false,
      url: 'https://www.odoo.com/app/point-of-sale-shop',
      price: 'First app free with unlimited users; more apps paid',
      priceSource: ODOO_PRICING,
      strengths: [
        'Works online and offline; offline payments sync when reconnected',
        'Runs on tablets, laptops, desktops and industrial machines, with barcode scanners and scales',
        'Part of a larger suite: inventory, accounting, e-commerce and more in one system',
        'Open source',
      ],
      weaknesses: [
        'The free tier covers one app; POS with inventory and accounting means paying for more apps',
        'A full suite takes more setup than a POS made for shops; Pakistan-specific add-ons are third-party modules in Odoo\'s app store',
      ],
      bestFor: 'Larger businesses that want POS, warehouse, accounting and online store in one system and have someone to set it up.',
    },
  ],
  blocks: [
    hero(SUMMARY, { eyebrow: 'Buyer\'s guide · POS', heading: 'POS software in Pakistan: how to choose in 2026' }),
    prose(`A POS (point of sale) system is the software at your counter: it makes the bill, takes payment, reduces stock and records the sale. In Pakistan the right choice depends less on features lists and more on a few local realities. Load-shedding and patchy internet, products sold by the carton and by the piece, regular customers on udhaar, and payments split between cash and JazzCash or Easypaisa all decide whether a system works on a busy evening.

This page is written by Nafaa, and Nafaa is on the list. We have tried to be fair: other products are described only from their own websites, and each entry says who it suits. If another product fits your shop better, use it.`),
    quickPick(
      'Quick comparison',
      'From each vendor\'s own site on 26 October 2026. "Not stated" means we could not find it on the vendor\'s site, not that the feature is missing.',
      [
        { key: 'nafaa', label: 'Nafaa', highlight: true },
        { key: 'corn', label: 'Corn POS' },
        { key: 'loyverse', label: 'Loyverse' },
        { key: 'odoo', label: 'Odoo POS' },
      ],
      [
        ['Billing without internet', 'Yes', 'Offline mode advertised', 'Yes', 'Yes'],
        ['Runs on', 'Browser on phone, tablet or PC; Windows app', 'Browser, Android, iPad, desktop', 'iOS and Android; back office in browser', 'Tablets, laptops, desktops'],
        ['Khata / udhaar accounts', 'Yes, with reminders', 'Not stated', 'Not stated', 'Not stated'],
        ['Main focus', 'Shops and other businesses', 'Restaurants', 'Small retail and food', 'Full business suite'],
        ['Published prices', 'Pricing page in rupees', 'Not on home page', 'Free core; add-ons in dollars', 'First app free; pricing page'],
        ['Based in Pakistan', 'Yes', 'Yes (Lahore)', 'Not stated', 'Not stated'],
      ],
      [LOYVERSE, LOYVERSE_PRICING, ODOO_POS, ODOO_PRICING, ODOO_APPS, CORN],
    ),
    prose(`## How to choose: seven questions

**1. What happens when the internet goes?** Ask the vendor to switch off the Wi-Fi during the demo and make five bills. They should save, print and later sync without anyone retyping them. Also ask what happens on a second counter while the first is offline.

**2. Can it sell the way you sell?** A kiryana store sells cooking oil by the bottle and by the carton, rice by the kilo and soap by the dozen. A pharmacy sells strips and boxes. If the software only knows one unit per product, stock will never match. Read our guide to [units and loose sale](/glossary/loose-sale) if this is new to you.

**3. Is the khata part of billing?** If udhaar is written in a separate app or register, entries get missed on busy days. The best setup puts the unpaid part of a bill straight onto the customer's account, with a limit the cashier cannot quietly pass. See [Digital Khata](/product/khata).

**4. Which payments does it record?** Most Pakistani counters take cash plus at least one wallet. Check that one bill can be split across cash, card and JazzCash or Easypaisa, and that the day-end report shows each separately.

**5. What will it really cost?** Add the subscription for the number of counters and users you need, hardware, setup and training. Free tiers are useful, but check which features sit behind paid add-ons and in which currency they are billed.

**6. Who can do what?** A cashier should not be able to delete a bill or give a big discount without the owner knowing. Look for roles, a manager PIN and an activity log. Our guide to [preventing theft at the counter](/blog/staff-theft-prevention-counter) explains why.

**7. Can you leave?** Ask how to export products, customers and sales to Excel. A vendor that makes leaving hard is one to avoid. Tax reporting is a separate question that applies only to some businesses; our [compliance pages](/compliance/fbr-pos-integration) explain who it covers.`),
    shot({
      heading: 'What a Pakistani counter needs on one screen',
      body: 'Nafaa\'s counter: search or scan, pick the unit, split payment across cash and wallets, and put the rest on khata.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'split-right',
    }),
    prose(`## Which one fits which shop

- **A kiryana, general store, pharmacy or hardware shop that sells on udhaar:** Nafaa, because the khata, units and offline billing are built in. Our [kiryana guide](/blog/best-pos-kiryana-2026) goes deeper for grocery stores.
- **A café or small food outlet that wants to start free:** Loyverse lets you start on the phones you already own, as long as you do not need a khata.
- **A restaurant with tables, a kitchen and delivery riders that wants a local vendor:** Corn POS is restaurant-first. Compare it with Nafaa's [restaurant setup](/industries/restaurant) on table service and kitchen tickets.
- **A company that wants POS, warehouse and accounting in one system and has an IT person:** Odoo covers more ground, at the cost of more setup.

Whichever you choose, try it with your own products for a week before you commit. Our [cost and setup guide for retail shops](/guides/running-a-retail-shop-pakistan) covers the rest of the shop.`),
  ],
  faqs: [
    [
      'Is free POS software good enough for a Pakistani shop?',
      'It can be for a small shop. Check three things before relying on it: whether billing works offline, whether the features you need (sales history, staff, inventory) are free or paid add-ons, and whether it keeps udhaar. Free tools often leave out a khata, so you may still need a register next to it.',
    ],
    [
      'Do I need special hardware to start?',
      'Usually not. Most modern POS software, Nafaa included, runs on a phone, tablet or computer you already have. A barcode scanner and a thermal receipt printer make a busy counter faster, and a cash drawer helps with cash control, but you can add them later.',
    ],
    [
      'How long does it take to move from a register or Excel?',
      'Most of the work is the product list. If your products are already in a spreadsheet, a good POS imports them in one go; Nafaa imports Excel and CSV files and checks each line before saving. Customer balances from a paper khata can be entered as opening balances, without copying old pages.',
    ],
  ],
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:pos', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:offline-pos', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:cloud-pos', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'BLOG_POST:best-pos-kiryana-2026', kind: 'RELATED' },
    { ref: 'BLOG_POST:choosing-a-pos-printer', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-excel', kind: 'RELATED' },
    { ref: 'INDUSTRY:kiryana', kind: 'RELATED' },
  ],
  sources: [LOYVERSE, LOYVERSE_PRICING, ODOO_POS, ODOO_PRICING, ODOO_APPS, CORN],
  evidence: [
    'apps/web/src/modules/pos/engine/PosScreen.tsx',
    'apps/web/src/modules/pos/lib/posUnits.ts',
    'apps/web/src/modules/pos/components/PosSplitTender.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/core/security/ManagerPin.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/reports/activity-log/pages/ActivityLogPage.tsx',
    'apps/desktop/src/main/cashDrawer.ts',
  ],
  factNote:
    'Loyverse home and pricing (free features; add-ons for unlimited history, employees and advanced inventory in USD), Odoo POS page (offline, devices, first app free) and pricing page, and Corn POS home page (Lahore address, restaurant apps, offline mode, tax authority claim, no prices) all read on 2026-10-26. Nafaa claims checked in the files listed in evidence.',
  needsOwner: [
    'Re-check the Loyverse add-on list and the Odoo free-app wording before publishing; both change.',
    'Decide whether BLOG_POST:best-pos-kiryana-2026 stays or 301s here (its needsOwner already flags the overlap).',
  ],
};

export default spec;
