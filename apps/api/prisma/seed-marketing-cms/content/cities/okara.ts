/**
 * Okara city hub (26 Oct 2026). A farm and textile-mill city between Lahore
 * and Sahiwal, with military dairy farms and well-known cattle and buffalo
 * breeds. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichOkara = cityHub({
  slug: 'okara',
  name: 'Okara',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Okara agri and feed dealers, cloth shops near the mills, milk sellers, grocers and bakeries. It runs on the phone or computer you own, keeps billing through LESCO outages without internet, and keeps every customer\'s udhaar in a digital khata.',
  hero: {
    sub: 'Okara runs on cotton, cattle and the mills in between. Nafaa keeps the bazaar counter, the feed dealer\'s farmer accounts and the milk seller\'s monthly bills in one app on the phone you already carry.',
    media: { id: SHOT.dashboardPhone, url: 'app.nafaa.pk/dashboard' },
    badges: ['Feed and fertiliser credit', 'Monthly milk bills', 'Works offline'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; offline billing included'],
    ['Good fit', 'Agri and feed dealers, cloth and garment shops, milk sellers, grocers, bakeries'],
    ['Credit', 'Khata per farmer or household, with limits and WhatsApp reminders'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Okara ke agri aur feed dealers, kapre ki dukaanon, doodh walon aur kiryana stores ke liye Nafaa: bill, stock aur udhaar ek app me, jo bijli jaane par bhi chalta hai.',
  trades: `## How Okara trades, and where Nafaa fits

Okara sits on the road between Lahore and Sahiwal, in a district known for its farm economy and its cotton and textile mills. The area is rich in livestock: the Sahiwal cattle breed and the Nili-Ravi buffalo are both associated with it, and the military dairy farms near the city are known for their cheese. Shops in the city serve farmers, mill workers and the families of a growing town.

- **Feed and agri dealers** sell cattle feed, seed, fertiliser and sprays by the bag. Farmers and dairy owners buy on account and pay when milk money or the crop comes in.
- **Cloth and garment shops** near the mills and in the city's bazaars keep stock by size and colour and take stitching orders before Eid.
- **Milk sellers and small dairies** buy from gawalas and deliver to homes, with a bill for each household at month end.
- **Kiryana stores and bakeries** sell from barcodes, keep families on khata and send reminders on WhatsApp.
- **Vet and pet stores** sell animal medicine and supplements next to feed.`,
  markets: [
    { name: 'City centre bazaars', note: 'Cloth, shoes, utensils and general goods in the older shopping streets of the city.' },
    { name: 'Grain market', note: 'Wheat, cotton and other crops from the district traded by the sack between farmers, agents and mills.' },
    { name: 'Cattle trade', note: 'Animals bought and sold by farmers and dealers, busiest before Eid ul Adha.' },
  ],
  areas: [
    { name: 'Mill areas', note: 'Textile and cotton mills with the shops, food stalls and suppliers that serve their workers.' },
    { name: 'Residential colonies', note: 'Kiryana stores, milk shops and tailors that sell to families on monthly khata.' },
    { name: 'Roads to Depalpur and Renala Khurd', note: 'Agri dealers, workshops and roadside shops serving the farming towns of the district.' },
  ],
  local: `## Working conditions in Okara

**Power.** Okara is supplied by LESCO, and load-shedding still interrupts the day, especially in the hot months from May to July. Nafaa keeps billing on the device without internet and sends the sales once the connection returns.

**Milk money and crop money.** Dairy farmers are paid for milk every few weeks; crop farmers after harvest. Feed and agri dealers carry both. The khata keeps each farmer's bills and payments, sets a limit, and shows how old each balance is so follow-ups go to the right people.

**Mill pay days.** Shops near the mills see spending rise around pay days and slow at month end. Daily sales reports show the pattern, which helps with stock and staff.

**Language.** Punjabi is the everyday language in Okara, with Urdu used in writing. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'Today\'s sales and dues on your phone',
    body: 'An Okara shop owner checks the day\'s sale, cash and outstanding khata from the phone, even when away from the counter.',
    id: SHOT.dashboardPhone,
    url: 'app.nafaa.pk/dashboard',
    frame: 'phone',
    layout: 'split-left',
  },
  table: {
    heading: 'Okara trades and their customers\' pay cycles',
    caption: 'When customers of common Okara businesses usually pay, and how Nafaa keeps track.',
    columns: [
      { key: 'customers', label: 'Main customers' },
      { key: 'paycycle', label: 'When they pay' },
      { key: 'nafaa', label: 'In Nafaa' },
    ],
    rows: [
      ['Feed dealer', 'Dairy farmers', 'When milk payments come in', 'Farmer khata with limits'],
      ['Agri dealer', 'Crop farmers', 'After harvest', 'Seasonal stock, balance age'],
      ['Shop near the mills', 'Mill workers', 'Around pay day', 'Daily sales report, khata'],
      ['Milk seller', 'Households', 'Month end', 'Delivery routes, monthly bills'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Okara',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick agri, dairy, garments or kiryana.'],
      ['Enter who owes you', 'Add each farmer or household with their balance and a limit.'],
      ['Add stock with units', 'Bags for feed and fertiliser, litres for milk, sizes for clothing.'],
      ['Check the first week\'s report', 'Compare daily sales and khata balances with your register before you retire it.'],
    ],
  },
  questions: `## Questions from Okara businesses

### Can a feed dealer give dairy farmers credit until milk payments come in?
Yes. Each farmer has a khata with a limit, and every bill and payment is recorded against it.

### Can I see my shop's sales from my phone?
Yes. The dashboard shows today's sale, cash and khata on any phone with a browser.

### Will billing stop during load-shedding?
No. The counter bills without internet and syncs later.`,
  support:
    'Setup, opening balances and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Okara; we help at your own counter.',
  pricingHeading: 'Plans for Okara businesses',
  cta: { heading: 'Start billing in Okara today', body: 'Try it free on your own phone. Help on WhatsApp.' },
  faqKeys: ['offline', 'mp-khata-limit', 'khata-reminders', 'garments-variants', 'devices', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:dairy', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:petshop', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/agri', 'apps/web/src/industries/dairy', 'apps/web/src/industries/garments', 'apps/web/src/modules/dashboard'],
  sources: [wikipedia('Okara, Pakistan', CHECKED), wikipedia('Nili-Ravi', CHECKED), wikipedia('Lahore Electric Supply Company', CHECKED)],
  factCheckNote:
    'Farm economy, cotton and textile mills, military dairy farms, the Sahiwal and Nili-Ravi breeds and the climate are from the Okara Wikipedia article; LESCO serves Okara. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
