/**
 * Multan city hub, deep copy (26 Oct 2026). Old-city bazaars around Hussain
 * Agahi and Ghanta Ghar, Multani crafts (khussa, blue pottery), sohan halwa,
 * and the cotton and mango economy of South Punjab. No shop counts, no named
 * customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichMultan = cityHub({
  slug: 'multan',
  name: 'Multan',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Multan shops, sweet makers, khussa sellers, agri dealers and restaurants. It runs on the phone or computer at your counter, keeps billing through MEPCO outages, and keeps farmer and customer credit in a digital khata.',
  hero: {
    sub: 'From Hussain Agahi Bazaar to the fertiliser dealers on the city\'s edge: bills, stock by size, harvest-time credit and festival orders for Multan businesses, on the device you already own.',
    media: { id: SHOT.posPhone, url: 'app.nafaa.pk/pos' },
    badges: ['Farmer credit khata', 'Shoe sizes and colours', 'Works through outages'],
  },
  facts: [
    ['Runs on', 'A phone, tablet or computer with a browser; bills continue offline'],
    ['Good fit', 'Agri dealers, sweet shops, khussa and shoe shops, garment shops, kiryana stores, restaurants'],
    ['Credit', 'Each farmer or customer has a khata with a limit and WhatsApp reminders'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Multan ki dukaanon, mithai walon, khussa shops aur agri dealers ke liye Nafaa: bill, stock aur fasal tak ka udhaar ek app me. Bijli jaye to bhi counter chalta hai.',
  trades: `## How Multan trades, and where Nafaa fits

Multan is one of the oldest cities in the subcontinent and the main trading city of South Punjab. Its walled city, the shrines of Bahauddin Zakariya and Shah Rukn-e-Alam, and its crafts draw visitors all year, while the farmland around it grows cotton, wheat and the mangoes the city is known for. Trade here moves with the crop: when the harvest money arrives, khata balances are cleared and shops restock.

- **Agri dealers** sell seed, fertiliser, pesticide and feed, keep farmer accounts on credit until harvest, and plan stock for the sowing season with the agri screens.
- **Sweet shops and bakeries** that make sohan halwa and other mithai record raw materials with their cost, see each recipe's live cost and take bulk orders for weddings and Eid.
- **Khussa and shoe shops** keep every pair by size and colour with its own barcode, and see which sizes customers asked for when they were out of stock.
- **Garment and fabric shops** in the old bazaars keep designs by size and colour and take stitching orders with saved measurements.
- **Restaurants and kiryana stores** across Gulgasht, Cantt and the newer colonies use the restaurant and grocery screens on the same counter.`,
  markets: [
    { name: 'Hussain Agahi Bazaar', area: 'Old City', note: 'The best-known bazaar of the walled city, with cloth, garments, shoes, bangles, crockery and household goods in narrow, crowded lanes.' },
    { name: 'Ghanta Ghar area', area: 'Old City', note: 'The streets around the clock tower, with general stores, sweet shops, crafts and small wholesale counters.' },
    { name: 'Bohar Gate and Haram Gate', area: 'Old City', note: 'Gateways of the old city lined with shops selling khussa, embroidered goods, dry fruit and everyday items.' },
    { name: 'Fruit and grain mandis', note: 'Wholesale markets where mangoes, other fruit, wheat and produce from the surrounding district are bought and sold in bulk.' },
  ],
  areas: [
    { name: 'Gulgasht Colony', note: 'A busy residential and commercial area with restaurants, bakeries, supermarkets, pharmacies and mobile shops.' },
    { name: 'Multan Cantt', note: 'Planned markets with clothing outlets, cafés, general stores and service businesses.' },
    { name: 'Bosan Road', note: 'A long commercial road near the university with food outlets, stationery shops, salons and showrooms.' },
    { name: 'Shah Rukn-e-Alam Colony', note: 'A large residential area served by kiryana stores, pharmacies and neighbourhood markets that sell on khata.' },
  ],
  local: `## Working conditions in Multan

**Heat and outages.** Multan's summers are among the hottest in Pakistan, and MEPCO load-shedding is part of daily life in many neighbourhoods. When the power goes, the router usually goes with it. Nafaa keeps the counter billing on the device and sends the sales to your account when the connection is back, so the day's report stays complete.

**Harvest credit.** Farmers and many town customers settle accounts after the wheat and cotton harvests. Nafaa's khata keeps every customer's bills and payments together with a credit limit, and groups balances by age so you can see who has been waiting since the last harvest. A one-tap WhatsApp reminder goes from your own number.

**Festival peaks.** Sweet shops and khussa sellers do a large share of their year before Eid, weddings and the urs at the city's shrines. Bulk orders with an advance, and reports by product and by day, help plan what to make and stock.

**Language.** Saraiki is the main spoken language of Multan, with Punjabi and Urdu also common. Nafaa screens show in Urdu or English; support chats are in Urdu or English.`,
  shot: {
    heading: 'Bulk mithai orders with an advance',
    body: 'A Multan sweet shop records a wedding order with the date, quantity and advance paid, and the remaining balance shows on the customer\'s bill on the day of delivery. The recipe cost updates as sugar, ghee and milk prices change.',
    id: SHOT.dashboard,
    url: 'app.nafaa.pk/dashboard',
    layout: 'split-right',
  },
  table: {
    heading: 'Multan\'s year and what to prepare in Nafaa',
    caption: 'How the busy seasons of common Multan trades map to Nafaa features. Every plan includes the counter, stock and khata.',
    columns: [
      { key: 'peak', label: 'Busy time' },
      { key: 'prepare', label: 'What to prepare' },
    ],
    rows: [
      ['Agri dealer', 'Sowing of wheat and cotton', 'Seasonal stock plan, farmer credit limits'],
      ['Sweet shop', 'Eid, weddings, urs', 'Bulk orders with advances, recipe costs'],
      ['Khussa and shoe shop', 'Eid and wedding season', 'Size-wise stock and reorder list'],
      ['Garment shop', 'Before both Eids', 'Designs by size and colour, stitching orders'],
      ['Kiryana store', 'After harvest payments', 'Khata reminders and opening balances'],
    ],
  },
  steps: {
    heading: 'Getting a Multan shop started',
    items: [
      ['Sign up for the free trial', 'Use the phone or computer at your counter and choose your trade so the right screens open.'],
      ['Copy your register into the khata', 'Add each regular customer or farmer with their current balance and a credit limit.'],
      ['Add products with sizes or recipes', 'Shoe shops add sizes and colours; sweet shops add raw materials and recipes; agri dealers add bags and bottles.'],
      ['Bill and check the evening report', 'Run a day on Nafaa and match the closing cash with your drawer.'],
    ],
  },
  questions: `## Questions from Multan businesses

### Will billing stop during load-shedding?
No. The counter bills without internet. Keep the device charged or on a UPS, and the sales sync when the connection is back.

### Can farmers pay after the harvest?
Yes. Keep each farmer in the khata with a credit limit; the balance and its age show on their account until they pay.

### Can my sweet shop see what each item costs to make?
Yes. Add raw materials with their cost and build recipes; the cost of each item updates when ingredient prices change.`,
  support:
    'Setup, opening balances and training happen remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Multan; we help at your own counter.',
  pricingHeading: 'Plans for Multan businesses',
  cta: {
    heading: 'Start billing in Multan today',
    body: 'Try it free on your phone or computer. Help with setup on WhatsApp.',
  },
  faqKeys: ['offline', 'khata-reminders', 'bakery-costing', 'bakery-bulk', 'mp-khata-limit', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:shoe', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/agri',
    'apps/web/src/industries/bakery',
    'apps/web/src/industries/shoe',
    'apps/web/src/industries/garments',
    'apps/web/src/modules/customers/directory/messages.ts',
  ],
  sources: [wikipedia('Multan', CHECKED), wikipedia('Multan Electric Power Company', CHECKED), wikipedia('Sohan halwa', CHECKED)],
  factCheckNote:
    'Multan history, shrines, crafts, mango and cotton economy, Saraiki as the main language and MEPCO as the utility are public facts (Wikipedia). Market and area notes describe what each place is known for; no customer, office or shop-count claims. Product claims checked in apps/web (agri, bakery recipes and bulk orders, shoe sizes, khata).',
});
