/**
 * Sialkot city hub, deep copy (26 Oct 2026). An export city (sports goods,
 * surgical instruments, leather gloves and garments, musical instruments)
 * with a privately funded airport and an early dry port. The page is plain
 * that Nafaa does not run export production or shipping documents; it covers
 * the shops, suppliers and factory outlets. No shop counts, no named
 * customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichSialkot = cityHub({
  slug: 'sialkot',
  name: 'Sialkot',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Sialkot sports goods shops, factory outlets, suppliers to the export industry, restaurants and grocers. It runs on the phone or computer you already have, tracks purchases and stock, and keeps supplier and customer credit in one khata.',
  hero: {
    sub: 'Sialkot makes footballs, cricket gear and surgical instruments for the world. Nafaa runs the counters around that trade: sports shops, factory outlets, packaging and hardware suppliers, and the cafés and stores that serve the city.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    badges: ['Team orders with advance', 'Purchases and suppliers', 'Bills without internet'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; offline billing included'],
    ['Good fit', 'Sports goods shops, factory outlets, hardware and packaging suppliers, restaurants, grocers'],
    ['Not for', 'Export production planning or shipping documents'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Sialkot ki sports shops, factory outlets aur suppliers ke liye Nafaa: team orders, khareed, stock aur khata ek app me. Export ki production ya shipping papers Nafaa nahi banata.',
  trades: `## How Sialkot trades, and where Nafaa fits

Sialkot is one of Pakistan's best-known export cities. Its workshops and factories make hand-stitched and machine-made footballs, cricket bats and gear, gloves, surgical and dental instruments, leather garments and musical instruments, and sell most of it abroad. The city's business community is also known for building things together: Sialkot International Airport was developed with funding from local businesses, and the Sialkot Dry Port was among the first in the country.

Export production planning, costing in foreign currency and shipping papers are not what Nafaa does. Nafaa runs the local trade that surrounds the export industry:

- **Sports goods shops** sell cricket, football and gym equipment over the counter, take team orders with printing and an advance, repair bats and rackets and keep brand records.
- **Factory outlets** sell surplus and seconds to local buyers from a barcode counter with stock by size and colour.
- **Hardware, tools and packaging suppliers** sell to workshops on account, with contractor and bulk rates, quotations and delivery challans.
- **Purchasing teams** at small units record supplier bills, bring the goods into stock and track what is owed to each supplier.
- **Restaurants, bakeries and grocers** in Cantt and along Paris Road and Kashmir Road use the restaurant, bakery and kiryana screens.`,
  markets: [
    { name: 'Trunk Bazaar', area: 'Old City', note: 'One of the main bazaars of the old city, with cloth, utensils, general goods and household shops.' },
    { name: 'Sialkot Cantt Saddar', area: 'Cantonment', note: 'A shopping area with clothing, shoes, bakeries, pharmacies and restaurants serving the cantonment and nearby colonies.' },
    { name: 'Sports goods shops and outlets', note: 'Shops across the city that sell cricket, football, boxing and gym equipment, some of it from local makers, retail and to teams.' },
    { name: 'Kashmir Road and Paris Road', note: 'Commercial roads lined with showrooms, banks, cafés and the offices of export firms.' },
  ],
  areas: [
    { name: 'Cantonment', note: 'Planned markets with cafés, supermarkets, salons and clothing outlets.' },
    { name: 'Model Town and Defence Road', note: 'Residential areas with general stores, pharmacies and food outlets.' },
    { name: 'Small Industrial Estate', note: 'Workshops and units making sports goods, instruments and leather products, with suppliers nearby.' },
    { name: 'Ugoki and Sambrial road towns', note: 'Growing towns on the city\'s edge with workshops, dealers and neighbourhood shops.' },
  ],
  local: `## Working conditions in Sialkot

**Power.** Sialkot's supply comes from GEPCO, and outages still interrupt shops during the day. Nafaa's counter does not need a connection to bill; sales wait on the device and send themselves when the internet is back.

**Credit between businesses.** Much of the local trade is between businesses: suppliers selling thread, leather, packaging and tools to workshops, and workshops paying monthly. Nafaa keeps a khata for every customer and a payable for every supplier, with bills, payments and balances side by side.

**Team and club orders.** Sports shops take orders from schools, clubs and local teams for kits and gear with names and numbers printed. Nafaa records each team order with its advance, so the balance is clear when the order is picked up.

**Language.** Punjabi is the everyday language of Sialkot's markets, with Urdu used in writing and English common in export offices. Nafaa screens show in Urdu or English, and support chats are in Urdu or English.`,
  shot: {
    heading: 'Purchases and supplier balances in one place',
    body: 'A Sialkot supplier or outlet records each purchase bill, receives the goods into stock and sees what it owes each supplier. The same app shows what its own customers owe, so cash planning is in one view.',
    id: SHOT.reports,
    url: 'app.nafaa.pk/reports',
    layout: 'split-left',
  },
  table: {
    heading: 'What Nafaa covers for Sialkot businesses, and what it does not',
    caption: 'An honest split for businesses around the export trade.',
    columns: [
      { key: 'covered', label: 'Covered by Nafaa' },
      { key: 'notcovered', label: 'Not covered' },
    ],
    rows: [
      ['Sports goods shop', 'Counter, stock, team orders, repairs', 'Making the goods'],
      ['Factory outlet', 'Barcode counter, sizes and colours, khata', 'Production planning'],
      ['Supplier to workshops', 'Quotations, challans, trade khata', 'Export shipping papers'],
      ['Small manufacturing unit', 'Purchases, supplier payables, stock', 'Bills of materials, work orders (on the roadmap)'],
      ['Restaurant or café', 'Tables, kitchen tickets, delivery', 'Nothing major for a local restaurant'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Sialkot',
    items: [
      ['Open a free trial', 'Sign up on the device you already have and pick sports, hardware, retail or restaurant.'],
      ['Add your suppliers and buyers', 'Enter each supplier and each regular buyer with their opening balance.'],
      ['Load stock', 'Import products from Excel with sizes, colours and units.'],
      ['Record the first week of purchases', 'Enter supplier bills as goods arrive, so stock and payables are right from the start.'],
    ],
  },
  questions: `## Questions from Sialkot businesses

### Can Nafaa manage my export orders and shipping documents?
No. Nafaa does not handle export production planning, foreign-currency costing or shipping documents. It runs local sales, purchases, stock and khata.

### Can my sports shop take team orders with an advance?
Yes. The sports screens record team orders with printing details and the advance paid, and the balance shows on the final bill.

### Can I track what I owe each supplier?
Yes. Record purchase bills and payments against each supplier, and see their balance at any time.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Sialkot; we help at your own counter.',
  pricingHeading: 'Plans for Sialkot businesses',
  cta: {
    heading: 'Start billing in Sialkot today',
    body: 'Try it free on your own phone or computer. Help on WhatsApp.',
  },
  faqKeys: ['offline', 'mp-manufacturing-scope', 'mp-wholesale-prices', 'mp-inventory-import', 'mp-staff-permissions', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:sports', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'SOLUTION:manufacturing', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/sports',
    'apps/web/src/industries/hardware',
    'apps/web/src/industries/retail',
    'apps/web/src/modules/purchasing',
  ],
  sources: [
    wikipedia('Sialkot', CHECKED),
    wikipedia('Sialkot International Airport', CHECKED),
    wikipedia('Sialkot Dry Port', CHECKED),
    wikipedia('Gujranwala Electric Power Company', CHECKED),
  ],
  factCheckNote:
    'Sialkot\'s export industries, the business-funded airport, the dry port and GEPCO as the utility are public facts (Wikipedia). No customer, office or shop-count claims. Not-covered items match the mp-manufacturing-scope FAQ. Product claims checked in apps/web (sports team orders and repairs, hardware challans, purchasing).',
});
