/**
 * Sargodha city hub (26 Oct 2026). Kinnow and citrus country, a city of
 * named bazaars each known for its own goods, and a PAF base. No shop counts,
 * no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichSargodha = cityHub({
  slug: 'sargodha',
  name: 'Sargodha',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Sargodha fruit traders, agri dealers, jewellers, cloth and shoe shops, bakeries and grocers. It runs on the phone or computer you own, bills through power cuts without internet, and keeps every buyer\'s and customer\'s credit in a digital khata.',
  hero: {
    sub: 'From the kinnow trade in the fruit mandi to the jewellers of Sarafa Bazaar and the bakeries of Kachehri Bazaar: one app for bills, stock and udhaar, built for Sargodha\'s bazaars.',
    media: { id: SHOT.pos, url: 'app.nafaa.pk/pos' },
    badges: ['Crate and box units', 'Buyer credit khata', 'Bills offline'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; offline billing built in'],
    ['Good fit', 'Fruit traders, agri dealers, jewellers, cloth and shoe shops, bakeries, grocers'],
    ['Season', 'Kinnow-season stock and buyer balances tracked by day and by product'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Sargodha ke kinnow traders, agri dealers, sunar aur bazaar ki dukaanon ke liye Nafaa: peti aur crate me bill, kharidar ka khata aur stock ek app me. Bijli jaye to bhi bill bante hain.',
  trades: `## How Sargodha trades, and where Nafaa fits

Sargodha is the centre of Pakistan's citrus belt. The district grows more kinnow than anywhere else in the country, and in winter the fruit market, the grading and waxing plants and the transporters work around the clock to send it to other cities and abroad. Wheat, sugarcane, rice and vegetables come in from the same farms. The city itself is laid out in blocks, and its old trading core is a set of bazaars that each specialise: one for cloth, one for gold, one for books, one for crockery.

- **Fruit traders and commission agents** buy and sell kinnow by the crate and the box during the season. Nafaa keeps each unit with its own price and each buyer's balance in the khata.
- **Agri dealers** sell seed, fertiliser, sprays and feed to citrus and wheat farmers, carry them on credit between crops, and plan stock for each season.
- **Jewellers** in Sarafa Bazaar set the gold rate each morning, price pieces by weight, buy back old gold and track karigar work.
- **Cloth, garment and shoe shops** in Amin, Rail and Kachehri Bazaars keep stock by size and colour.
- **Bakeries and sweet shops** record raw-material costs and take orders for weddings with an advance.
- **Bookshops and stationers** in Urdu Bazaar keep textbooks by grade for the city's schools and the University of Sargodha.`,
  markets: [
    { name: 'Fruit Mandi', note: 'The wholesale fruit market, busiest in the kinnow season when growers, commission agents and buyers trade by the crate and the truck.' },
    { name: 'Kachehri Bazaar', note: 'Bakeries, street food, shoe and garment shops and general stores near the courts.' },
    { name: 'Sarafa Bazaar', note: 'The gold and jewellery bazaar, where prices follow the daily gold rate.' },
    { name: 'Amin Bazaar and Rail Bazaar', note: 'Fabric, boutiques, garments and electrical appliance shops.' },
    { name: 'Urdu Bazaar', note: 'Books, stationery and school supplies.' },
    { name: 'Karkhana Bazaar and Bans Bazaar', note: 'Crockery and cutlery in one, milk and dairy products in the other.' },
  ],
  areas: [
    { name: 'Satellite Town', note: 'A residential area whose main bazaar has hospitals, clinics and pharmacies.' },
    { name: 'University Road', note: 'Cafés, photocopy and stationery shops, hostels and food outlets around the university.' },
    { name: 'Blocks of the old city', note: 'The grid of numbered blocks with kiryana stores, milk shops and tailors that sell on khata.' },
  ],
  local: `## Working conditions in Sargodha

**A winter rush.** From roughly December to March the kinnow trade sets the pace for much of the city. Commission agents and traders bill many buyers a day, often on account. A counter that keeps working without the internet, and a khata that shows each buyer's total at once, keeps the evening settlement short.

**Power.** Sargodha's electricity comes from FESCO and load-shedding is common, especially in summer. Nafaa keeps billing on the device during a cut and sends the sales to your account when the connection returns.

**Credit between crops.** Agri dealers and many bazaar shops carry farmers until the next harvest. Each customer can have a limit, and the khata groups balances by age so you know which are from this season and which are older.

**Language.** Punjabi is the everyday language of Sargodha's bazaars, with Urdu used in writing. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'Every buyer\'s balance at a glance',
    body: 'A fruit trader or agri dealer opens the khata and sees what each buyer owes, the bills behind it and how old it is. A WhatsApp reminder goes from your own number in one tap.',
    id: SHOT.khata,
    url: 'app.nafaa.pk/customers/khata',
    layout: 'split-left',
  },
  table: {
    heading: 'Sargodha bazaars and the Nafaa screens that suit them',
    caption: 'Matching the city\'s specialist bazaars to Nafaa. Every plan includes the counter, stock and khata.',
    columns: [
      { key: 'bazaar', label: 'Where you find it' },
      { key: 'screens', label: 'Nafaa screens' },
    ],
    rows: [
      ['Fruit trader', 'Fruit Mandi', 'Crate and box units, buyer khata'],
      ['Jeweller', 'Sarafa Bazaar', 'Daily gold rate, weights, buy-back'],
      ['Cloth or garment shop', 'Amin and Rail Bazaars', 'Sizes and colours, stitching orders'],
      ['Bookshop', 'Urdu Bazaar', 'Titles by ISBN, textbooks by grade'],
      ['Milk shop', 'Bans Bazaar', 'Gawala purchases, monthly home bills'],
      ['Crockery shop', 'Karkhana Bazaar', 'Sets and pieces as units, low-stock list'],
    ],
  },
  steps: {
    heading: 'Getting started in Sargodha',
    intro: 'If you trade kinnow, set this up before the season starts.',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and choose your trade.'],
      ['Add products and units', 'Add the crate, box or bag you sell in, each with its price.'],
      ['Enter regular buyers', 'Add each buyer or farmer with their balance and a credit limit.'],
      ['Bill through the first week', 'Check the daily report each evening against your cash and the khata.'],
    ],
  },
  questions: `## Questions from Sargodha businesses

### Can I sell kinnow by the crate and the box?
Yes. Add both as units of one product, each with its own price, and the stock stays in one count.

### Can I see what each buyer owes at the end of the season?
Yes. The khata shows every buyer's balance with its bills and payments, and how long it has been waiting.

### Does Nafaa work for a jewellery shop in Sarafa Bazaar?
Yes. Set the gold rate each morning and the counter prices each piece by weight.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Sargodha; we help at your own counter.',
  pricingHeading: 'Plans for Sargodha businesses',
  cta: { heading: 'Start billing in Sargodha today', body: 'Try it free on your phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'kiryana-units', 'mp-khata-limit', 'khata-reminders', 'devices', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:jewelry', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:bookstore', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:dairy', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/agri',
    'apps/web/src/industries/jewelry',
    'apps/web/src/industries/garments',
    'apps/web/src/industries/bookstore',
    'apps/web/src/industries/dairy',
    'apps/web/src/modules/inventory/product-units',
  ],
  sources: [wikipedia('Sargodha', CHECKED), wikipedia('Faisalabad Electric Supply Company', CHECKED)],
  factCheckNote:
    'Citrus and kinnow economy, the specialist bazaars (Sarafa, Urdu, Kachehri, Amin, Rail, Karkhana, Bans, Fruit Mandi) and the University of Sargodha are from the Sargodha Wikipedia article; FESCO serves Sargodha. Kinnow season timing is general knowledge. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
