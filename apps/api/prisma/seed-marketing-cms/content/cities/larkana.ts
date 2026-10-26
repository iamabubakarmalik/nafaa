/**
 * Larkana city hub (26 Oct 2026). Rice country on the Ghar canal, close to
 * Mohenjo-daro, with a medical university and a rail link that carries farm
 * produce south. Market names are kept general where no public source names
 * them. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichLarkana = cityHub({
  slug: 'larkana',
  seoDescription: 'POS, stock and khata software for Larkana rice dealers, agri stores, pharmacies and grocers. Billing keeps running through long power cuts without internet.',
  name: 'Larkana',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Larkana rice dealers, agri stores, pharmacies, grocers and food outlets. It runs on the phone or computer you own, keeps billing through long power cuts without internet, and keeps farmer and customer credit in a digital khata.',
  hero: {
    sub: 'Larkana lives by rice. From paddy dealers and agri stores to the pharmacies around the medical university, Nafaa keeps bills, stock and credit in one app that works when the power does not.',
    media: { id: SHOT.khata, url: 'app.nafaa.pk/customers/khata' },
    badges: ['Paddy-season credit', 'Medicine expiry', 'Offline counter'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; offline billing built in'],
    ['Good fit', 'Rice and grain dealers, agri stores, pharmacies, grocers, bakeries, food outlets'],
    ['Credit', 'Farmers and households on khata with limits and WhatsApp reminders'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Larkana ke chawal ke dealers, agri stores aur medical stores ke liye Nafaa: bill, stock aur kisaan ka udhaar ek app me. Bijli lambi jaye to bhi counter chalta hai.',
  trades: `## How Larkana trades, and where Nafaa fits

Larkana sits on the Ghar canal in northern Sindh, a short drive from Mohenjo-daro, one of the best-preserved cities of the Indus Valley civilisation. The land around it is canal-irrigated and rice is its best-known crop, with wheat, peas, mustard and sunflower also grown. The railway carries farm produce from here towards Karachi, and the medical university and other colleges bring students and patients from across the region.

Trade follows the paddy year. Farmers buy seed, fertiliser and sprays on credit, sell their crop to dealers and mills after harvest, and then clear their balances in the bazaar.

- **Rice and grain dealers** buy paddy and sell rice and wheat by the sack and the kilo, with wholesale rates for shopkeepers and a khata for every regular buyer.
- **Agri stores** keep farmer accounts open through the season, take bulk orders before sowing and plan stock by crop.
- **Pharmacies near the hospitals** search by salt, offer substitutes when a brand is out, and track batches and expiry so short-dated stock is not missed.
- **Kiryana stores and milk shops** sell to households on monthly khata and send balance reminders on WhatsApp.
- **Bakeries and food outlets** serving students and visitors bill fast at the counter and take orders with an advance.`,
  markets: [
    { name: 'Rice and paddy trade', note: 'Dealers, commission agents and mills that buy the district\'s paddy after harvest and sell rice onward, much of it by rail and road to Karachi.' },
    { name: 'City centre bazaars', area: 'Near the railway station', note: 'The central shopping streets around the station, with cloth, utensils, general goods and wholesale counters.' },
    { name: 'Medical university area', note: 'Pharmacies, clinics, laboratories and food stalls serving the teaching hospitals and their patients.' },
  ],
  areas: [
    { name: 'University and college areas', note: 'Stationery and photocopy shops, hostels and cheap eateries serving students of the medical and general universities.' },
    { name: 'Residential neighbourhoods', note: 'Kiryana stores, milk shops and tailors that sell to the same families on khata month after month.' },
    { name: 'Roads towards Mohenjo-daro', note: 'Food stops and small shops that serve visitors to the archaeological site and the airport near it.' },
  ],
  local: `## Working conditions in Larkana

**Long outages.** Larkana is supplied by SEPCO, and many feeders see long hours of load-shedding, especially in the summer heat. Nafaa keeps billing on the device when the power and the router are off, and sends the sales to your account once the connection is back.

**Harvest-linked credit.** Much of the town's spending waits for the paddy money. The khata shows each farmer's and household's balance with its age, sets a limit per customer, and sends a polite WhatsApp reminder from your number when the crop is sold.

**Medicines that expire.** Pharmacies near the hospitals stock many brands of the same salt. Batch and expiry tracking shows which stock to sell or return first, and the salt search finds an alternative when a brand runs out.

**Language.** Sindhi is the mother tongue of nearly everyone in Larkana, with Urdu used in writing. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'Balances that wait for the harvest',
    body: 'An agri store or rice dealer sees every farmer\'s balance, the bills behind it and how many months it has been open. When the crop is sold, payments clear the balance bill by bill.',
    id: SHOT.khata,
    url: 'app.nafaa.pk/customers/khata',
    layout: 'split-left',
  },
  table: {
    heading: 'The paddy year for Larkana businesses',
    caption: 'How the rice season shapes trade, and what to keep track of in Nafaa at each stage.',
    columns: [
      { key: 'who', label: 'Who is busy' },
      { key: 'nafaa', label: 'What to watch in Nafaa' },
    ],
    rows: [
      ['Before sowing', 'Agri stores', 'Seed and fertiliser stock, new credit to farmers'],
      ['Growing season', 'Agri stores, kiryana', 'Spray stock, rising khata balances'],
      ['Harvest', 'Rice dealers and mills', 'Sack and kilo rates, buyer accounts'],
      ['After harvest', 'Every bazaar shop', 'Payments clearing old balances, reminders'],
    ],
  },
  steps: {
    heading: 'Setting up a Larkana shop',
    items: [
      ['Sign up for the free trial', 'Use your phone or computer and pick agri, kiryana, pharmacy or bakery.'],
      ['Enter the season\'s balances', 'Add each farmer or household with what they owe now and a credit limit.'],
      ['Add stock with units', 'Sacks, bags and bottles for agri and grain; batches and expiry for medicines.'],
      ['Bill offline if you need to', 'Keep selling through power cuts and check the sync list in the evening.'],
    ],
  },
  questions: `## Questions from Larkana businesses

### Can I give farmers credit until the rice harvest?
Yes. Each farmer has a khata with a limit, and the balance shows its age until the crop money comes in.

### Does Nafaa track medicine expiry for a pharmacy?
Yes. Medicines are kept by batch with expiry dates, and short-dated stock is easy to find.

### Do I need internet all day?
No. The counter bills without a connection and syncs later.`,
  support:
    'Setup, opening balances and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Larkana; we help at your own counter.',
  pricingHeading: 'Plans for Larkana businesses',
  cta: { heading: 'Start billing in Larkana today', body: 'Try it free on your own phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'pharmacy-expiry', 'pharmacy-salt', 'mp-khata-limit', 'khata-reminders', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:dairy', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/agri', 'apps/web/src/industries/pharmacy', 'apps/web/src/industries/bakery', 'apps/web/src/modules/inventory/product-units'],
  sources: [wikipedia('Larkana', CHECKED), wikipedia('Mohenjo-daro', CHECKED), wikipedia('Sukkur Electric Supply Company', CHECKED)],
  factCheckNote:
    'Ghar canal location, Mohenjo-daro, rice as the main crop, other crops, the railway link to Karachi, the medical university and Sindhi as the mother tongue are from the Larkana Wikipedia article; SEPCO serves Larkana. Market names kept general. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
