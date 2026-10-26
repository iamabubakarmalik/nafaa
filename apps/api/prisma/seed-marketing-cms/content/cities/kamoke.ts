/**
 * Kamoke city hub (26 Oct 2026). A GT Road town between Lahore and
 * Gujranwala, known for one of the largest rice markets in the region.
 * No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichKamoke = cityHub({
  slug: 'kamoke',
  seoDescription: 'POS, stock and khata software for Kamoke rice and paddy traders, commission agents and agri dealers. Sell by the sack or kilo and keep every account in a khata.',
  name: 'Kamoke',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Kamoke rice and paddy traders, commission agents, agri dealers, grocers and roadside food businesses. It runs on the phone or computer you own, sells by the sack and the kilo, and keeps every buyer\'s and farmer\'s account in a digital khata.',
  hero: {
    sub: 'Kamoke\'s rice market is one of the largest in the region. Nafaa keeps the sacks, rates and buyer accounts of the rice trade, and the counters of the GT Road town around it, in one app.',
    media: { id: SHOT.khata, url: 'app.nafaa.pk/customers/khata' },
    badges: ['Sack and kilo units', 'Buyer and farmer accounts', 'Bills offline'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; the counter works offline'],
    ['Good fit', 'Rice and paddy traders, agri dealers, grocers, restaurants and food stops'],
    ['Credit', 'Buyers and farmers on khata with limits'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Kamoke ki chawal mandi ke traders, agri dealers aur GT Road ki dukaanon ke liye Nafaa: bori aur kilo me bill, kharidar aur kisaan ka khata, sab ek app me.',
  trades: `## How Kamoke trades, and where Nafaa fits

Kamoke sits on the Grand Trunk Road between Lahore and Gujranwala, in the heart of Punjab's rice-growing belt. It is best known for its rice market, one of the largest in the subcontinent, where paddy and rice from the surrounding districts are bought and sold. Rice mills, traders, commission agents and transporters make up much of the town's business, and the GT Road brings a steady flow of travellers to its food stops.

- **Rice traders and commission agents** buy paddy from farmers and sell rice by the sack and the kilo to mills, wholesalers and retailers, with a running account for each.
- **Agri dealers** sell seed, fertiliser and sprays to rice farmers on credit until the paddy is sold.
- **Grocery wholesalers and kiryana stores** sell by piece, dozen and carton, with a shopkeeper rate and a household khata.
- **Restaurants and food stops** on the GT Road bill quickly at the counter and take wallet payments.`,
  markets: [
    { name: 'Rice market', note: 'One of the largest rice markets in the region, where paddy and rice are traded between farmers, commission agents, mills and buyers.' },
    { name: 'GT Road bazaar', note: 'Shops, dealers and food stops along the Grand Trunk Road through the town.' },
    { name: 'Town centre', note: 'Cloth, utensils and general goods shops serving Kamoke and nearby villages.' },
  ],
  areas: [
    { name: 'Rice mill belt', note: 'Mills, godowns and transport businesses around the town that process and move the crop.' },
    { name: 'Residential neighbourhoods', note: 'Kiryana stores, milk shops and tailors selling to families on khata.' },
    { name: 'Villages around Kamoke', note: 'Rice farmers who come into town to sell paddy and buy inputs on account.' },
  ],
  local: `## Working conditions in Kamoke

**Harvest rush.** When the paddy harvest comes in, the market handles a large volume in a few weeks. Traders bill many sales a day, with buyers and sellers settling later. Nafaa bills without waiting for the internet and keeps each account's total up to date.

**Two-way accounts.** A commission agent may owe a farmer for paddy and be owed by a mill for rice. Nafaa keeps supplier balances in purchasing and buyer balances in the khata, so both sides are visible.

**Power.** Kamoke is supplied by GEPCO, and outages still interrupt shops. A phone or laptop on battery keeps billing, and sales sync once the connection returns.

**Language.** Punjabi is the language of the Kamoke market, with Urdu used in writing. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'Every buyer\'s account, totalled',
    body: 'A rice trader sees each buyer\'s bills and payments and the balance due. Farmers who sold paddy on credit are tracked as suppliers, so what you owe and what you are owed are both clear.',
    id: SHOT.khata,
    url: 'app.nafaa.pk/customers/khata',
    layout: 'split-right',
  },
  table: {
    heading: 'Who trades in the Kamoke rice market',
    caption: 'The main players in the rice trade and how each can keep its records in Nafaa.',
    columns: [
      { key: 'does', label: 'What they do' },
      { key: 'nafaa', label: 'In Nafaa' },
    ],
    rows: [
      ['Farmer', 'Sells paddy, buys inputs', 'Supplier for paddy, customer for inputs'],
      ['Commission agent', 'Arranges sales between farmers and mills', 'Purchases and sales by sack, both balances'],
      ['Rice trader', 'Sells rice to wholesalers and retailers', 'Sack and kilo units, wholesale rate, buyer khata'],
      ['Agri dealer', 'Sells seed, fertiliser and sprays', 'Farmer khata until the paddy is sold'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Kamoke',
    intro: 'Set up before the paddy harvest so the first busy weeks go on Nafaa.',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer.'],
      ['Add rice varieties and units', 'Each variety with sack and kilo prices, retail and wholesale.'],
      ['Enter buyers and farmers', 'Buyers in the khata, farmers you buy from as suppliers, with opening balances.'],
      ['Bill through the harvest', 'Record every purchase and sale, and check balances each evening.'],
    ],
  },
  questions: `## Questions from Kamoke businesses

### Can I record paddy bought from farmers and rice sold to buyers?
Yes. Purchases from farmers go into purchasing with their supplier balance; sales to buyers go into the khata.

### Can I sell rice by the sack and the kilo?
Yes. Add both units to each variety, each with its own price.

### Will the counter keep working if the internet drops during the rush?
Yes. Bills are saved on the device and sync when the connection returns.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Kamoke; we help at your own counter.',
  pricingHeading: 'Plans for Kamoke businesses',
  cta: { heading: 'Start billing in Kamoke today', body: 'Try it free on your own phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'kiryana-units', 'mp-wholesale-prices', 'mp-khata-limit', 'devices', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/agri', 'apps/web/src/modules/purchasing/suppliers', 'apps/web/src/modules/inventory/product-units'],
  sources: [wikipedia('Kamoke', CHECKED), wikipedia('Gujranwala Electric Power Company', CHECKED)],
  factCheckNote:
    'Kamoke\'s rice market described as one of the largest in the subcontinent is from the Kamoke Wikipedia article; GT Road location and GEPCO service are public knowledge. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web (units, purchasing and suppliers, khata).',
});
