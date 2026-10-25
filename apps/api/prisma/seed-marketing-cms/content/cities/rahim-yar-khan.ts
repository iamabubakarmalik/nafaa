/**
 * Rahim Yar Khan city hub (26 Oct 2026). A South Punjab farm and agro-
 * industry city (sugarcane, cotton, wheat, rice, mangoes) with an
 * international airport. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichRahimYarKhan = cityHub({
  slug: 'rahim-yar-khan',
  name: 'Rahim Yar Khan',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Rahim Yar Khan agri dealers, fruit and grain traders, grocers, clothing shops and restaurants. It runs on the phone or computer at your counter, keeps billing through outages without internet, and keeps farmer and customer credit in a digital khata.',
  hero: {
    sub: 'Sugarcane, cotton, wheat and mangoes drive trade in Rahim Yar Khan. Nafaa keeps the agri dealer\'s farmer accounts, the trader\'s units and the bazaar shop\'s khata in one app that keeps working through the heat and the outages.',
    media: { id: SHOT.reports, url: 'app.nafaa.pk/reports' },
    badges: ['Season-wise reports', 'Farmer khata', 'Bills offline'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; the counter works offline'],
    ['Good fit', 'Agri dealers, fruit and grain traders, grocers, clothing and shoe shops, restaurants'],
    ['Credit', 'A khata per farmer or customer, with limits and WhatsApp reminders'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Rahim Yar Khan ke agri dealers, aam aur ghalla traders aur bazaar ki dukaanon ke liye Nafaa: bill, stock aur fasal tak ka udhaar ek app me. Garmi aur bijli ke jaane me bhi counter chalta hai.',
  trades: `## How Rahim Yar Khan trades, and where Nafaa fits

Rahim Yar Khan is one of the main farming and agro-industrial centres of southern Punjab. Most of the district works in agriculture: sugarcane, wheat, cotton and rice are the main crops, and its mangoes are well known. Sugar mills, ginning factories and other agro-based industry sit around the city, and Shaikh Zayed International Airport connects it to Karachi, Lahore and Islamabad.

- **Agri dealers** sell seed, fertiliser and sprays to sugarcane, cotton and wheat farmers, carry them on credit between crops, and plan stock for each sowing season.
- **Fruit traders** buy and sell mangoes by the crate and box in summer, with wholesale rates for buyers from other cities.
- **Grain dealers** trade wheat and rice by the sack with mills and retailers, on account.
- **Clothing and shoe shops** keep stock by size and colour and plan for the Eid rush.
- **Grocers, bakeries and restaurants** in the city's bazaars and colonies use the same counter, stock and khata.`,
  markets: [
    { name: 'City centre bazaars', note: 'The main shopping streets with cloth, shoes, utensils, general goods and wholesale grocers.' },
    { name: 'Grain market', note: 'Wheat, rice and other produce bought and sold by the sack between farmers, commission agents and mills.' },
    { name: 'Fruit market', note: 'Mangoes and other fruit from the district\'s orchards traded by the crate, busiest in the summer season.' },
  ],
  areas: [
    { name: 'Residential colonies', note: 'Kiryana stores, milk shops, bakeries and pharmacies that sell to families on monthly khata.' },
    { name: 'Roads to the sugar mills', note: 'Agri dealers, workshops and transport businesses that serve the cane and cotton trade.' },
    { name: 'Pattan Minara', note: 'An ancient tower about 8 km east of the city centre, one of the district\'s historic sites.' },
  ],
  local: `## Working conditions in Rahim Yar Khan

**Heat and outages.** Summers in Rahim Yar Khan are long and very hot, and MEPCO load-shedding is common. When the power goes, the router goes too. Nafaa keeps the counter billing on the device and sends the sales once the internet is back.

**Credit tied to cane and cotton.** Farmers settle with dealers after the cane is delivered to the mill or the cotton is sold. The khata keeps each farmer's bills and payments with a limit and shows which balances have been open for a full season.

**Seasonal stock.** Sowing time for wheat, cotton and cane each brings a rush for particular seed, fertiliser and sprays. Product-wise sales reports by month show what moved last year, so you can order before the rush.

**Language.** Punjabi and Saraiki are the main languages of Rahim Yar Khan, with Urdu also widely used. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'What sold last season, by product and month',
    body: 'Sales and profit reports by product and by period show which seed, fertiliser or spray moved in each season, and which items are tying up cash on the shelf.',
    id: SHOT.reports,
    url: 'app.nafaa.pk/reports',
    layout: 'split-left',
  },
  table: {
    heading: 'Crops and trade in Rahim Yar Khan',
    caption: 'How each main crop shapes trade, and what to track in Nafaa.',
    columns: [
      { key: 'traders', label: 'Who trades it' },
      { key: 'track', label: 'Track in Nafaa' },
    ],
    rows: [
      ['Sugarcane', 'Agri dealers, transporters', 'Farmer khata until mill payment'],
      ['Cotton', 'Agri dealers, ginners, traders', 'Spray and seed stock, buyer accounts'],
      ['Wheat and rice', 'Grain dealers, mills', 'Sack and kilo units, wholesale rates'],
      ['Mangoes', 'Fruit traders', 'Crate and box units, buyers from other cities'],
    ],
  },
  steps: {
    heading: 'Getting started in Rahim Yar Khan',
    items: [
      ['Start the free trial', 'Sign up on your phone or computer and pick your trade.'],
      ['Bring in farmer and customer balances', 'Add each one with what they owe today and a credit limit.'],
      ['Add stock before the season', 'Load seed, fertiliser and spray stock, or crates and sacks, with their prices.'],
      ['Review the month', 'Check sales by product at month end and plan the next order.'],
    ],
  },
  questions: `## Questions from Rahim Yar Khan businesses

### Can I keep farmers on credit until the mill pays them?
Yes. Each farmer has a khata with a limit, and you can see how long each balance has been open.

### Can I sell mangoes by the crate and by the box?
Yes. Add both units to one product, each with its own price.

### Will it work during long power cuts?
Yes. The counter bills without internet and syncs later.`,
  support:
    'Setup, opening balances and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Rahim Yar Khan; we help at your own counter.',
  pricingHeading: 'Plans for Rahim Yar Khan businesses',
  cta: { heading: 'Start billing in Rahim Yar Khan today', body: 'Try it free on your phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'mp-khata-limit', 'kiryana-units', 'mp-reports-export', 'khata-reminders', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:shoe', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/agri', 'apps/web/src/modules/reports', 'apps/web/src/modules/inventory/product-units'],
  sources: [wikipedia('Rahim Yar Khan', CHECKED), wikipedia('Shaikh Zayed International Airport', CHECKED), wikipedia('Multan Electric Power Company', CHECKED)],
  factCheckNote:
    'Agriculture and agro-industry, crop mix, mangoes, Pattan Minara, the airport and the language mix are from the Rahim Yar Khan Wikipedia article; MEPCO serves the district. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
