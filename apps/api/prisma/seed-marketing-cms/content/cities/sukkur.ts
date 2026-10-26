/**
 * Sukkur city hub (26 Oct 2026). A river city on the Indus with the Sukkur
 * Barrage, the date trade of upper Sindh, Rohri across the river and an
 * agro-industrial estate. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichSukkur = cityHub({
  slug: 'sukkur',
  seoDescription: 'POS, stock and khata software for Sukkur date and grain traders, agri dealers and wholesalers serving upper Sindh, with trade and farmer credit in one khata.',
  name: 'Sukkur',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Sukkur date and grain traders, agri dealers, wholesalers serving upper Sindh, restaurants and grocers. It runs on the phone or computer at your counter, bills through outages without internet, and keeps trade and farmer credit in one khata.',
  hero: {
    sub: 'Sukkur trades what northern Sindh grows: dates, rice, wheat and cotton, plus the goods that go back out to every town on the Indus. Nafaa keeps the bills, stock and credit of that trade in one app.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    badges: ['Bag and kilo units', 'Trade khata', 'Bills in the heat and the outages'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; the counter works offline'],
    ['Good fit', 'Date and grain traders, agri dealers, wholesalers, restaurants, grocers, pharmacies'],
    ['Credit', 'A khata per buyer, retailer or farmer, with a limit and reminders'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Sukkur ke khajoor aur ghalla traders, agri dealers aur wholesale walon ke liye Nafaa: bori aur kilo me bill, dukaandaron ka khata aur stock ek app me. Bijli jaye to bhi counter chalta hai.',
  trades: `## How Sukkur trades, and where Nafaa fits

Sukkur stands on the Indus where the Sukkur Barrage, completed in 1932, sends water into canals that irrigate much of Sindh. The farms of northern Sindh grow rice, wheat, cotton and vegetables, and the area is known for its dates. Sukkur is where much of that produce is traded and processed, and where shopkeepers from smaller towns come to buy their stock. Its industrial estate is mostly agro-based: cotton ginning, flour, edible oil, ghee and food factories.

- **Date traders** buy from growers and processors and sell by the kilo, the box and the bag, retail and to traders from other cities, often on account.
- **Grain and rice dealers** sell by the sack and the kilo with wholesale rates and keep each buyer's balance.
- **General wholesalers** supply kiryana stores in smaller towns by the carton and dozen, with a credit limit for each retailer.
- **Agri dealers** carry farmers on credit for seed, fertiliser and sprays until the rice or wheat crop is sold.
- **Restaurants, bakeries, grocers and pharmacies** in the city and in Rohri use the same counter, stock and khata.`,
  markets: [
    { name: 'Old city bazaars', note: 'Dense lanes of cloth, utensils, general goods and wholesale counters in the older part of the city near the river.' },
    { name: 'Date trade', note: 'Dates from the farms and processing units of upper Sindh are sorted, packed and sold here to buyers from across the country.' },
    { name: 'Grain market', note: 'Rice, wheat and other produce change hands by the sack between farmers, commission agents and mills.' },
    { name: 'SITE Sukkur', note: 'The industrial estate set up in 1963, with ginning, flour, oil, ghee and food plants and the dealers around them.' },
  ],
  areas: [
    { name: 'Rohri', note: 'The town across the Indus, a major railway junction with its own bazaar, grain trade and food outlets.' },
    { name: 'Military Road', note: 'A main commercial road with showrooms, clinics, pharmacies, bakeries and restaurants.' },
    { name: 'New Sukkur', note: 'Residential areas with kiryana stores, milk shops and neighbourhood markets that sell on khata.' },
  ],
  local: `## Working conditions in Sukkur

**Heat and power.** Sukkur has some of the hottest summers in Pakistan, and SEPCO load-shedding is long in many areas. A browser counter that waits for the internet is little use when the router has been off for hours. Nafaa keeps billing on the device and uploads sales once the connection is back.

**A trading hub for small towns.** Retailers from towns across upper Sindh buy here and pay over time. Each one gets a khata with a credit limit; the counter stops a bill that would cross it until a manager approves. One tap sends a WhatsApp balance reminder from your own number before their next trip.

**Floods and roads.** When the river rises or roads close, deliveries and payments slow down. Nafaa's khata shows balances by age, so you can see which accounts are waiting since the last disruption and plan who to follow up.

**Language.** Sindhi is the main language of Sukkur, with Urdu, Saraiki and Punjabi also spoken in the markets. Nafaa screens show in Urdu or English; support is in Urdu or English.`,
  shot: {
    heading: 'Products with the units you trade in',
    body: 'A date or grain trader keeps each product with its bag, box and kilo prices, retail and wholesale. Stock stays in one count whichever unit is sold.',
    id: SHOT.inventory,
    url: 'app.nafaa.pk/products',
    layout: 'split-right',
  },
  table: {
    heading: 'Sukkur traders and how they sell',
    caption: 'Units, buyers and credit for common Sukkur businesses, as set up in Nafaa.',
    columns: [
      { key: 'units', label: 'Sells in' },
      { key: 'buyers', label: 'Main buyers' },
      { key: 'credit', label: 'Credit' },
    ],
    rows: [
      ['Date trader', 'Kilo, box, bag', 'Traders from other cities, walk-ins', 'Account per trader'],
      ['Grain dealer', 'Sack and kilo', 'Mills, retailers', 'Limits per buyer'],
      ['General wholesaler', 'Carton, dozen, piece', 'Shops in nearby towns', 'Khata with WhatsApp reminders'],
      ['Agri dealer', 'Bag, bottle, packet', 'Farmers', 'Until the crop is sold'],
      ['Grocery store', 'Piece and kilo', 'Households', 'Monthly khata'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Sukkur',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick your trade.'],
      ['Set up units and two prices', 'Add bags, boxes or cartons with retail and wholesale rates.'],
      ['Add your retailers and farmers', 'Enter each with their current balance and a credit limit.'],
      ['Keep billing through outages', 'Bill on battery when the power goes; check the sync list when it returns.'],
    ],
  },
  questions: `## Questions from Sukkur businesses

### Can shopkeepers from other towns buy on account?
Yes. Each retailer has a khata with a limit, and every bill and payment stays in one ledger.

### Can I keep a wholesale and a retail rate for dates?
Yes. Each product has a retail and a wholesale price, and each unit can have its own.

### What happens to bills during a long power cut?
The counter keeps billing on the device and sends the sales when the connection returns.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Sukkur; we help at your own counter.',
  pricingHeading: 'Plans for Sukkur businesses',
  cta: { heading: 'Start billing in Sukkur today', body: 'Try it free on the device you already have. Help on WhatsApp.' },
  faqKeys: ['offline', 'mp-wholesale-prices', 'mp-khata-limit', 'kiryana-units', 'mp-fbr-who', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/agri', 'apps/web/src/modules/inventory/product-units', 'apps/web/src/modules/customers/khata/api/customer-ledger.api.ts'],
  sources: [wikipedia('Sukkur', CHECKED), wikipedia('Sukkur Barrage', CHECKED), wikipedia('Sukkur Electric Supply Company', CHECKED)],
  factCheckNote:
    'Sukkur Barrage (1932), the agro-based SITE Sukkur (1963), dates and the crop mix are from the Sukkur Wikipedia article; SEPCO is the utility; Rohri as a railway junction is public knowledge. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
