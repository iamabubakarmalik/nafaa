/**
 * Dera Ghazi Khan city hub (26 Oct 2026). A Saraiki-speaking city on the
 * west bank of the Indus at the foot of the Koh-e-Suleman, a gateway to
 * Fort Munro and Balochistan, with very hot summers and a farming and
 * livestock economy. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichDeraGhaziKhan = cityHub({
  slug: 'dera-ghazi-khan',
  seoDescription: 'POS, stock and khata software for Dera Ghazi Khan grocers, wholesalers, feed dealers, butchers and sweet shops. Billing keeps going without internet in outages.',
  name: 'Dera Ghazi Khan',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Dera Ghazi Khan grocers and wholesalers, agri and feed dealers, butchers, sweet shops and restaurants. It runs on the phone or computer you have, keeps billing in the heat and the outages without internet, and keeps customer credit in a digital khata.',
  hero: {
    sub: 'Between the Indus and the Koh-e-Suleman, Dera Ghazi Khan supplies farms, herders and travellers on the road to Fort Munro. Nafaa keeps its bazaar counters, feed and seed accounts and meat rates in one app.',
    media: { id: SHOT.posPhone, url: 'app.nafaa.pk/pos' },
    badges: ['Phone is enough', 'Meat and sweets by weight', 'Offline billing'],
  },
  facts: [
    ['Runs on', 'A phone, tablet or computer with a browser; the counter works offline'],
    ['Good fit', 'Grocers and wholesalers, agri and feed dealers, butchers, sweet shops, restaurants'],
    ['Credit', 'Khata for households, farmers and village shops, with limits'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Dera Ghazi Khan ke kiryana aur wholesale dealers, agri aur feed walon, qasai aur mithai ki dukaanon ke liye Nafaa: bill, stock aur khata ek app me, sirf phone par bhi.',
  trades: `## How Dera Ghazi Khan trades, and where Nafaa fits

Dera Ghazi Khan lies on the west bank of the Indus, with the bare ranges of the Koh-e-Suleman rising to its west and the hill station of Fort Munro on the road that climbs towards Balochistan. Its summers are among the hottest in Pakistan and windstorms are common. The city is the market for farming villages along the river and for herders from the hills, and travellers heading west stop here for supplies.

- **Grocery wholesalers** supply village shops and the hill towns by the carton and the bag, with a shopkeeper rate and a credit limit for each buyer.
- **Agri and feed dealers** sell seed, fertiliser, sprays and animal feed to farmers and herders, on credit until the crop or the animals are sold.
- **Butchers and meat suppliers** set the day's rate, sell by weight and take large orders for Eid ul Adha and weddings.
- **Sweet shops** sell sohan halwa and other mithai by weight, take bulk orders with an advance and track raw-material costs.
- **Restaurants and tea stalls** serving travellers bill fast at the counter and keep a simple menu.
- **Pharmacies and clinics** track medicine batches and expiry dates and keep patient visits.`,
  markets: [
    { name: 'City centre bazaars', note: 'The main shopping streets with cloth, shoes, utensils, general goods and wholesale grocers.' },
    { name: 'Grain and livestock trade', note: 'Wheat, cotton and animals from the river villages and the hills bought and sold by traders and commission agents.' },
    { name: 'Road towards Fort Munro', note: 'Food stops, fuel stations and small shops serving travellers heading to the hill station and on to Balochistan.' },
  ],
  areas: [
    { name: 'Residential blocks', note: 'Kiryana stores, milk shops and bakeries that sell to families on monthly khata.' },
    { name: 'University and college areas', note: 'Stationery shops, photocopy centres and food outlets serving students.' },
    { name: 'Sakhi Sarwar', note: 'The shrine town in the foothills, crowded during its spring fair, with stalls and food sellers.' },
  ],
  local: `## Working conditions in Dera Ghazi Khan

**Extreme heat and power cuts.** Summer highs above 40°C and MEPCO load-shedding are part of normal life. Phones and laptops on battery keep running when desktops and routers do not. Nafaa bills on the device without internet and sends the sales once the connection returns.

**Weak signal outside the city.** Shops and dealers who travel to villages or the hill roads often lose mobile data. Bills made offline are kept on the phone and uploaded later.

**Credit for villages and herders.** Many buyers come to the city a few times a season and pay when they sell crops or animals. Each one has a khata with a limit, and you can see at a glance who has been waiting longest.

**Language.** Saraiki is the main language of Dera Ghazi Khan, with Urdu and Balochi also spoken. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'A full counter on one phone',
    body: 'Search or scan an item, pick the unit or weigh it, take cash, wallet or khata, and the bill is done. The same phone holds the stock list and every customer\'s balance.',
    id: SHOT.posPhone,
    url: 'app.nafaa.pk/pos',
    frame: 'phone',
    layout: 'split-right',
  },
  table: {
    heading: 'Dera Ghazi Khan trades and who they sell to',
    caption: 'Common Dera Ghazi Khan businesses, their buyers and the Nafaa features they rely on.',
    columns: [
      { key: 'buyers', label: 'Main buyers' },
      { key: 'features', label: 'Features they rely on' },
    ],
    rows: [
      ['Grocery wholesaler', 'Village shops, hill towns', 'Carton units, shopkeeper rate, credit limits'],
      ['Agri and feed dealer', 'Farmers and herders', 'Bag units, seasonal stock, farmer khata'],
      ['Butcher', 'Households, hotels', 'Daily rate, weight sale, Eid orders'],
      ['Sweet shop', 'Families, travellers, weddings', 'Weight sale, bulk orders with advance'],
      ['Roadside restaurant', 'Travellers', 'Quick counter, wallet QR'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Dera Ghazi Khan',
    items: [
      ['Sign up on your phone', 'Open the free trial on the phone you use at the counter and pick your trade.'],
      ['Add stock and rates', 'Add items with units and prices, or set the day\'s rate if you sell by weight.'],
      ['Enter regular buyers', 'Add village shops, farmers and households with their balances and limits.'],
      ['Bill offline when needed', 'Keep selling during power cuts and let the sales sync later.'],
    ],
  },
  questions: `## Questions from Dera Ghazi Khan businesses

### Can I run my shop on a phone alone?
Yes. Billing, stock and khata all work on a phone browser. A printer or scale can be added later.

### Can I sell sohan halwa and meat by weight?
Yes. Set the rate and the counter prices each sale by its weight.

### What if the signal is weak outside the city?
Bills are saved on the phone and upload when the signal returns.`,
  support:
    'Setup, opening balances and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Dera Ghazi Khan; we help at your own counter.',
  pricingHeading: 'Plans for Dera Ghazi Khan businesses',
  cta: { heading: 'Start billing in Dera Ghazi Khan today', body: 'Try it free on your own phone. Help on WhatsApp.' },
  faqKeys: ['devices', 'offline', 'mp-wholesale-prices', 'bakery-bulk', 'mp-khata-limit', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:meat', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/agri', 'apps/web/src/industries/meat', 'apps/web/src/industries/bakery', 'apps/web/src/modules/pos/components/PosWeighModal.tsx'],
  sources: [wikipedia('Dera Ghazi Khan', CHECKED), wikipedia('Fort Munro', CHECKED), wikipedia('Sakhi Sarwar', CHECKED), wikipedia('Multan Electric Power Company', CHECKED)],
  factCheckNote:
    'Indus west-bank location, Koh-e-Suleman, Fort Munro, summer heat and windstorms, Sakhi Sarwar fair, sohan halwa and the language mix are from the Dera Ghazi Khan Wikipedia article; MEPCO serves the district. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
