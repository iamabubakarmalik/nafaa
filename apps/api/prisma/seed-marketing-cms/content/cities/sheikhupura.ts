/**
 * Sheikhupura city hub (26 Oct 2026). An industrial satellite of Lahore
 * founded under Jahangir, with Hiran Minar, factories along the roads out of
 * town and a rice-growing hinterland. No shop counts, no named customers, no
 * office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichSheikhupura = cityHub({
  slug: 'sheikhupura',
  seoDescription: 'POS, stock and khata software for Sheikhupura distributors, hardware and building material shops, rice dealers and grocers, with offline billing during outages.',
  name: 'Sheikhupura',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Sheikhupura distributors and suppliers, hardware and building material shops, rice dealers, grocers and restaurants. It runs on the phone or computer you already use, bills offline during outages, and keeps trade and customer credit in one khata.',
  hero: {
    sub: 'Sheikhupura works next to Lahore and supplies it: factories, distributors, hardware dealers and rice traders on one side, fast-growing housing and the shops that serve it on the other. Nafaa runs both kinds of counter.',
    media: { id: SHOT.branches, url: 'app.nafaa.pk/branches' },
    badges: ['Branches in two cities', 'Contractor rates', 'Offline billing'],
  },
  facts: [
    ['Runs on', 'The phone, tablet or computer you already use; offline billing included'],
    ['Good fit', 'Distributors, hardware and building material shops, rice dealers, grocers, restaurants'],
    ['Branches', 'A Sheikhupura shop and a Lahore shop in one account'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Sheikhupura ke distributors, hardware dealers, chawal ke traders aur dukaanon ke liye Nafaa: bill, stock aur khata ek app me, aur Lahore wali branch bhi saath.',
  trades: `## How Sheikhupura trades, and where Nafaa fits

Sheikhupura was founded in 1607 by the Mughal emperor Jahangir, who also built the Hiran Minar nearby, still the city's best-known landmark. Today it is an industrial centre and a satellite of Lahore, about 38 kilometres to the north-west, with factories along its main roads, two industrial parks under development, and farmland around it that is part of Punjab's rice belt. New housing schemes keep growing, and with them come supermarkets, pharmacies and food outlets.

- **Distributors and suppliers** deliver to factories and shops on account. Nafaa keeps carton and dozen prices, a wholesale rate, a khata with a credit limit for every buyer, and supplier bills on the buying side.
- **Hardware and building material shops** serving the construction in new schemes keep items by size and shade, give contractor and bulk rates, turn quotations into bills and send delivery challans to sites.
- **Rice and grain dealers** sell by the sack and the kilo to retailers and households.
- **Grocers and pharmacies** in the new schemes scan barcodes, keep families on khata and watch medicine expiry.
- **Restaurants and food outlets** along the main roads run tables, kitchen tickets and takeaway.
- **Owners with a branch in Lahore** see both shops in one account and move stock between them.`,
  markets: [
    { name: 'City centre bazaars', note: 'The older shopping streets with cloth, shoes, utensils, general goods and wholesale grocers.' },
    { name: 'Lahore Road and Sargodha Road', note: 'Industrial and commercial roads lined with factories, distributors, hardware dealers and food stops.' },
    { name: 'Grain and rice trade', note: 'Rice and wheat from the surrounding district bought and sold by the sack between farmers, dealers and mills.' },
  ],
  areas: [
    { name: 'New housing schemes', note: 'Growing residential areas with supermarkets, pharmacies, salons and bakeries opening first branches.' },
    { name: 'Industrial zones', note: 'Factories and the suppliers, transporters and workshops that serve them; two industrial parks are under development.' },
    { name: 'Hiran Minar area', note: 'The Mughal-era monument and its surroundings, a weekend stop with food stalls and small shops.' },
  ],
  local: `## Working conditions in Sheikhupura

**Business with Lahore.** Many Sheikhupura owners buy in Lahore, sell in both cities or run a branch in each. One Nafaa account holds every branch with its own stock and staff; a stock transfer moves goods from one to the other, and the receiving branch confirms what arrived.

**Power.** Sheikhupura is supplied by LESCO, and load-shedding still interrupts factories and shops. The counter keeps billing on the device during a cut and sends the sales once the connection is back.

**Trade credit.** Factory buyers and contractors usually pay on terms. The khata keeps each buyer's bills and payments together, sets a limit, and groups balances by age so overdue accounts stand out.

**Language.** Punjabi is spoken by most people in Sheikhupura, with Urdu used in writing. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'Sheikhupura and Lahore branches side by side',
    body: 'An owner with a shop in each city sees sale, profit, cash and stock for both on one screen, and opens either one for detail.',
    id: SHOT.branches,
    url: 'app.nafaa.pk/branches',
    layout: 'full',
  },
  table: {
    heading: 'Sheikhupura businesses that sell to other businesses',
    caption: 'How common B2B sellers in Sheikhupura set up Nafaa. Every plan includes the counter, stock and khata.',
    columns: [
      { key: 'buyers', label: 'Main buyers' },
      { key: 'nafaa', label: 'Nafaa setup' },
    ],
    rows: [
      ['Distributor', 'Shops and factories', 'Carton units, wholesale rate, credit limits'],
      ['Hardware dealer', 'Contractors and homeowners', 'Contractor rates, site khata, challans'],
      ['Rice dealer', 'Retailers and households', 'Sack and kilo units, buyer accounts'],
      ['Packaging or parts supplier', 'Factories', 'Quotations, purchases, supplier payables'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Sheikhupura',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick your trade.'],
      ['Load products and rates', 'Import your list from Excel with units, retail and wholesale prices.'],
      ['Add buyers and suppliers', 'Enter opening balances and credit limits for each buyer, and what you owe each supplier.'],
      ['Add the Lahore branch', 'If you have one, create it, assign its staff and enter its stock.'],
    ],
  },
  questions: `## Questions from Sheikhupura businesses

### I have a shop here and one in Lahore. Can I manage both?
Yes. Both branches sit in one account with their own stock and staff, and stock moves between them with a transfer.

### Can contractors have an account for each site?
Yes. Hardware dealers keep sites under each contractor with their own khata and delivery challans.

### Can I keep a wholesale price for shops?
Yes. Each product has a retail and a wholesale price, and each unit has its own.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Sheikhupura; we help at your own counter.',
  pricingHeading: 'Plans for Sheikhupura businesses',
  cta: { heading: 'Start billing in Sheikhupura today', body: 'Try it free on the device you already use. Help on WhatsApp.' },
  faqKeys: ['mp-branches-transfer', 'mp-wholesale-prices', 'mp-khata-limit', 'mp-inventory-import', 'offline', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
    { ref: 'PRODUCT:multi-shop', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/hardware', 'apps/web/src/modules/purchasing', 'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx'],
  sources: [wikipedia('Sheikhupura', CHECKED), wikipedia('Hiran Minar', CHECKED), wikipedia('Lahore Electric Supply Company', CHECKED)],
  factCheckNote:
    'Founding by Jahangir in 1607, Hiran Minar, distance from Lahore, industrial-centre role, the two industrial parks and Punjabi as the main language are from the Sheikhupura Wikipedia article; LESCO serves Sheikhupura. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
