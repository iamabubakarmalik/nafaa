/**
 * Bahawalpur city hub, deep copy (26 Oct 2026). A former princely-state
 * capital with old-city bazaars, a large university, the Cholistan desert
 * and its livestock to the south, and cotton and wheat farms around it. No
 * shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichBahawalpur = cityHub({
  slug: 'bahawalpur',
  name: 'Bahawalpur',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Bahawalpur agri dealers, dairy and meat shops, cloth and shoe sellers, grocers and student-area cafés. It runs on the phone or computer you have, keeps billing through MEPCO outages, and keeps farmer and household credit in a digital khata.',
  hero: {
    sub: 'For the old-city bazaars, the agri dealers serving cotton and wheat farms, the milk and meat trade fed by Cholistan\'s herds, and the cafés around the university: one app for bills, stock and khata.',
    media: { id: SHOT.khataPhone, url: 'app.nafaa.pk/customers/khata', },
    badges: ['Farmer and household khata', 'Milk and meat by weight', 'Works offline'],
  },
  facts: [
    ['Runs on', 'A phone, tablet or computer with a browser; bills continue offline'],
    ['Good fit', 'Agri dealers, dairy and milk shops, butchers, cloth and shoe shops, grocers, cafés'],
    ['Credit', 'Every customer or farmer has a khata with a limit and WhatsApp reminders'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Bahawalpur ke agri dealers, doodh aur gosht walon, kapre ki dukaanon aur cafés ke liye Nafaa: bill, stock aur kisaan ka udhaar ek app me. Bijli jaye to bhi counter chalta hai.',
  trades: `## How Bahawalpur trades, and where Nafaa fits

Bahawalpur was the capital of a princely state until 1955, and its palaces, the Noor Mahal among them, still stand near the old city. Today it is a divisional headquarters and a market town for a wide farming area. Canals from the Sutlej water cotton, wheat and sugarcane to the north, while the Cholistan desert to the south supports herds of cattle, goats, sheep and camels. The Islamia University brings a large student population, and with it cafés, stationery shops and hostels.

- **Agri dealers** sell seed, fertiliser, pesticide and animal feed, keep farmer accounts on credit until harvest and plan stock for the sowing season.
- **Dairy and milk shops** record milk bought from gawalas, deliver to homes on routes, send a monthly bill to each household and sell loose milk and dahi at the counter.
- **Butchers** set the day's rate, sell by weight and supply hotels and restaurants on account, with extra orders around Eid ul Adha.
- **Cloth, shoe and garment shops** in the old bazaars keep stock by size and colour and take stitching orders.
- **Cafés, bookshops and stationers** near the university bill quickly, keep textbooks by grade and stock up before each semester.
- **Kiryana stores** across Model Town and Satellite Town sell from barcodes and keep households on khata.`,
  markets: [
    { name: 'Shahi Bazaar', area: 'Old City', note: 'The main bazaar of the walled city, with cloth, garments, shoes, utensils and jewellery shops.' },
    { name: 'Farid Gate', area: 'Old City', note: 'A historic gateway and the busy shopping streets around it, with clothing, general goods and food shops.' },
    { name: 'Grain market', note: 'Where wheat, cotton and other produce from the surrounding farms are sold to traders and mills.' },
    { name: 'Livestock and milk trade', note: 'Animals and milk from the Cholistan area and nearby villages come into the city\'s cattle markets and dairy shops.' },
  ],
  areas: [
    { name: 'Model Town A and B', note: 'Residential areas with supermarkets, bakeries, pharmacies and clinics.' },
    { name: 'Satellite Town', note: 'A large residential area with kiryana stores, milk shops and neighbourhood markets that sell on khata.' },
    { name: 'University area', note: 'Cafés, photocopy and stationery shops, bookshops and fast food serving students.' },
    { name: 'Cantonment', note: 'Planned markets with general stores, clothing outlets and food businesses.' },
  ],
  local: `## Working conditions in Bahawalpur

**Heat and power.** Summers in Bahawalpur are very hot, and MEPCO load-shedding is common in many areas. Nafaa keeps the counter billing on the device during outages and sends the sales to your account when the internet returns.

**Credit that follows the crop.** Farmers and many households pay after the cotton and wheat harvests. Nafaa's khata keeps each customer's bills and payments with a credit limit and shows how long each balance has been waiting. One tap sends a WhatsApp reminder from your own number.

**Monthly milk bills.** Milk shops that deliver to homes keep each household on a route, record what was delivered each day and bill once a month, instead of a separate notebook for every street.

**Language.** Saraiki is the main language of Bahawalpur, with Punjabi and Urdu also widely spoken. Nafaa screens show in Urdu or English; support chats are in Urdu or English.`,
  shot: {
    heading: 'Udhaar on the phone in your pocket',
    body: 'An agri dealer or milk shop opens the khata on the phone, sees each customer\'s balance and its age, and sends a reminder on WhatsApp. Payments received at the shop or the farm are recorded on the spot.',
    id: SHOT.khataPhone,
    url: 'app.nafaa.pk/customers/khata',
    frame: 'phone',
    layout: 'split-right',
  },
  table: {
    heading: 'Bahawalpur trades and the Nafaa setup that suits them',
    caption: 'Where common Bahawalpur businesses start in Nafaa. The counter, stock and khata are in every plan.',
    columns: [
      { key: 'start', label: 'Start with' },
      { key: 'later', label: 'Add later' },
    ],
    rows: [
      ['Agri dealer', 'Farmer khata, bags and bottles as units', 'Seasonal stock plan, bulk orders'],
      ['Milk shop', 'Gawala purchases, home delivery routes', 'Monthly bills, quality tests'],
      ['Butcher', 'Daily rate, sale by weight', 'Hotel accounts, Eid ul Adha orders'],
      ['Cloth or shoe shop', 'Sizes and colours, barcodes', 'Stitching orders, exchanges'],
      ['Café near the university', 'Quick menu, counter billing', 'Tables, delivery orders'],
    ],
  },
  steps: {
    heading: 'Getting a Bahawalpur business on Nafaa',
    items: [
      ['Sign up for the free trial', 'Use the phone or computer at your counter and pick your trade.'],
      ['Enter who owes you', 'Add each farmer, household or hotel with their balance and a credit limit.'],
      ['Add what you sell', 'Products with their units, sizes or daily rates; import a list from Excel if you have one.'],
      ['Run the first week', 'Bill every sale on Nafaa and send the first reminders before the month closes.'],
    ],
  },
  questions: `## Questions from Bahawalpur businesses

### Can my milk shop bill households once a month?
Yes. The dairy screens keep delivery customers on routes, record each day's delivery and make a monthly bill for each household.

### Can a butcher change the rate every day?
Yes. Set the day's rate in the morning and the counter prices each sale by weight.

### Will it work during load-shedding?
Yes. The counter bills without internet and syncs later.`,
  support:
    'Setup, opening balances and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Bahawalpur; we help at your own counter.',
  pricingHeading: 'Plans for Bahawalpur businesses',
  cta: {
    heading: 'Start billing in Bahawalpur today',
    body: 'Try it free on your own phone or computer. Help on WhatsApp.',
  },
  faqKeys: ['offline', 'khata-reminders', 'mp-khata-limit', 'devices', 'kiryana-import', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:dairy', kind: 'TAG' },
    { ref: 'INDUSTRY:meat', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:bookstore', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/agri',
    'apps/web/src/industries/dairy',
    'apps/web/src/industries/meat',
    'apps/web/src/industries/garments',
    'apps/web/src/industries/bookstore',
  ],
  sources: [wikipedia('Bahawalpur', CHECKED), wikipedia('Bahawalpur (princely state)', CHECKED), wikipedia('Cholistan Desert', CHECKED), wikipedia('Multan Electric Power Company', CHECKED)],
  factCheckNote:
    'Princely-state history (acceded 1947, merged 1955), Noor Mahal, Cholistan, the farm economy, Islamia University, Saraiki as the main language and MEPCO as the utility are public facts (Wikipedia). Market notes describe what each place is known for; no customer, office or shop-count claims. Product claims checked in apps/web (agri, dairy routes and monthly bills, meat rate and weight, garments, bookstore).',
});
