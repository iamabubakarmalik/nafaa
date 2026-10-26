/**
 * Mingora city hub (26 Oct 2026). The main city of Swat and Malakand
 * Division, on the Swat River, living on trade and tourism. No shop counts,
 * no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichMingora = cityHub({
  slug: 'mingora',
  seoDescription: 'POS, stock and khata software for Mingora hotels, restaurants, wholesalers supplying Swat and shawl shops, with trade credit and room bills in one app.',
  name: 'Mingora',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Mingora hotels and guest houses, restaurants, wholesalers supplying Swat\'s valleys, cloth and shawl shops, and grocers. It runs on the phone or computer you own, bills without internet, and keeps trade credit and room bills in one app.',
  hero: {
    sub: 'Mingora is where Swat comes to shop and where tourists stop on the way to the upper valley. Nafaa runs both trades: rooms and tables in the season, cartons and credit to valley shopkeepers all year.',
    media: { id: SHOT.tablesTablet, url: 'app.nafaa.pk/restaurant/tables' },
    badges: ['Rooms and tables', 'Valley shop khata', 'Bills offline'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; offline billing built in'],
    ['Good fit', 'Hotels and guest houses, restaurants, wholesalers, cloth and shawl shops, grocers'],
    ['Seasons', 'Summer tourists and winter snow trips, tracked in sales reports'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Mingora ke hotels, restaurants, wholesale dealers aur kapre ki dukaanon ke liye Nafaa: room, table, carton aur khata ek app me. Internet na ho to bhi bill bante hain.',
  trades: `## How Mingora trades, and where Nafaa fits

Mingora is the capital of Swat District, on the Swat River, and the largest city of Malakand Division and of northern Khyber Pakhtunkhwa. Most of its income comes from trade and tourism. Shopkeepers from the upper valleys buy their stock here, and visitors heading to the ski slopes and resorts of the upper valley pass through on their way.

- **Wholesalers and distributors** supply grocers in the valleys by the carton and the bag, with a shopkeeper rate and a khata with a credit limit for each.
- **Hotels and guest houses** keep a room board, bookings, housekeeping and seasonal rates, with meals and extras posted to the room bill.
- **Restaurants** serving families and tourists run tables, kitchen tickets and takeaway, with split bills and wallet payments.
- **Cloth, shawl and handicraft shops** keep stock by design, size and colour and sell to both locals and visitors.
- **Grocers, bakeries and pharmacies** across the city sell from barcodes and keep regular families on khata.`,
  markets: [
    { name: 'City centre bazaars', note: 'The main shopping streets of Mingora, with cloth, shoes, utensils, general goods and wholesale counters.' },
    { name: 'Wholesale grocery trade', note: 'Dealers who supply shops in the upper valleys by the carton and the bag.' },
    { name: 'Saidu Sharif', note: 'The neighbouring administrative town with offices, hospitals and the shops and food outlets that serve them.' },
  ],
  areas: [
    { name: 'Roads to the upper valley', note: 'Hotels, guest houses and restaurants serving travellers heading north.' },
    { name: 'Residential neighbourhoods', note: 'Kiryana stores, bakeries and tailors selling to families on khata.' },
    { name: 'Riverside areas', note: 'Hotels and eateries along the Swat River, busiest in the summer season.' },
  ],
  local: `## Working conditions in Mingora

**Two seasons.** Summer brings the most tourists and winter brings snow trips; in between, trade is mostly local. Sales reports by month and by product show how each season went last year, so hotels and restaurants can plan stock and staff.

**Weather and connectivity.** Storms, snow and floods in the valley can cut power and internet for long stretches, and PESCO load-shedding adds to it. Nafaa keeps billing on the device and sends sales once the connection is back, so a guest can still check out and a dealer can still bill.

**Credit for valley shopkeepers.** Shopkeepers from the upper valley come down to buy and pay on their next trip. Each has a khata with a limit, and you can see at a glance who has been waiting longest. A one-tap WhatsApp reminder goes from your own number.

**Language.** Pashto is the language of Mingora, with Urdu widely understood. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'Tables and orders on a tablet',
    body: 'A Mingora restaurant sees every table\'s status, adds dishes from a tablet and sends them to the kitchen as tickets. The bill can be split and paid by cash or wallet.',
    id: SHOT.tablesTablet,
    url: 'app.nafaa.pk/restaurant/tables',
    frame: 'tablet',
    layout: 'split-right',
  },
  table: {
    heading: 'Mingora businesses through the year',
    caption: 'When common Mingora businesses are busiest and what to set up in Nafaa.',
    columns: [
      { key: 'busy', label: 'Busiest' },
      { key: 'setup', label: 'Set up in Nafaa' },
    ],
    rows: [
      ['Hotel or guest house', 'Summer and snow season', 'Room types, seasonal rates, room bills'],
      ['Restaurant', 'Summer evenings, holidays', 'Tables, kitchen tickets, split bills'],
      ['Wholesaler', 'Before the season and before winter', 'Carton units, shopkeeper rate, credit limits'],
      ['Cloth and shawl shop', 'Eid and the tourist season', 'Designs by size and colour'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Mingora',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick hotel, restaurant, kiryana or garments.'],
      ['Set up rooms, menu or stock', 'Add room types and rates, your menu, or your product list.'],
      ['Add valley shopkeepers', 'Wholesalers add each buyer with their balance and a limit.'],
      ['Prepare before the season', 'Load seasonal rates and stock before the first visitors arrive.'],
    ],
  },
  questions: `## Questions from Mingora businesses

### Can a hotel and its restaurant use one account?
Yes. Rooms, bookings and the restaurant run in the same account, and meals can be posted to the room bill.

### What if a flood or storm cuts the internet for days?
The counter keeps billing on the device and uploads the sales when the connection is restored.

### Can shopkeepers from the valleys buy on credit?
Yes. Each has a khata with a limit, and every bill and payment is recorded against it.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Mingora; we help at your own counter.',
  pricingHeading: 'Plans for Mingora businesses',
  cta: { heading: 'Start billing in Mingora today', body: 'Try it free on your own phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'restaurant-split', 'mp-wholesale-prices', 'mp-khata-limit', 'devices', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:hotel', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/hotel', 'apps/web/src/industries/restaurant', 'apps/web/src/industries/garments'],
  sources: [wikipedia('Mingora', CHECKED), wikipedia('Swat District', CHECKED), wikipedia('Peshawar Electric Supply Company', CHECKED)],
  factCheckNote:
    'Capital of Swat District on the Swat River, largest city of Malakand Division, and income from trade and tourism are from the Mingora Wikipedia article; Saidu Sharif as the neighbouring town and seasonal tourism are public knowledge; PESCO serves Swat. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
