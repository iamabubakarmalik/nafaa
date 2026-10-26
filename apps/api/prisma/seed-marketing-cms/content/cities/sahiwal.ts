/**
 * Sahiwal city hub (26 Oct 2026). A farm and livestock city that gave its
 * name to the Sahiwal cattle breed, with Harappa nearby and a crop mix of
 * wheat, cotton, potato and oilseeds. No shop counts, no named customers, no
 * office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichSahiwal = cityHub({
  slug: 'sahiwal',
  seoDescription: 'POS, stock and khata software for Sahiwal dairies and milk shops, feed and agri dealers, butchers and grocers, with farmer credit in a digital khata.',
  name: 'Sahiwal',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Sahiwal dairies and milk shops, feed and agri dealers, butchers, grocers and clothing shops. It runs on the phone or computer you have, bills without internet during outages, and keeps every customer\'s and farmer\'s credit in a digital khata.',
  hero: {
    sub: 'Sahiwal is cattle and crop country. Nafaa keeps the milk routes, feed sales, meat rates and the bazaar counters of the city in one app, with credit that waits for the harvest.',
    media: { id: SHOT.khataPhone, url: 'app.nafaa.pk/customers/khata' },
    badges: ['Milk routes and monthly bills', 'Feed and seed on credit', 'Works offline'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; bills continue offline'],
    ['Good fit', 'Dairies and milk shops, feed and agri dealers, butchers, grocers, clothing shops'],
    ['Credit', 'A khata per household or farmer, with limits and WhatsApp reminders'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Sahiwal ke doodh walon, feed aur agri dealers, qasai aur bazaar ki dukaanon ke liye Nafaa: doodh ki route, mahine ka bill, kisaan ka khata aur stock ek app me.',
  trades: `## How Sahiwal trades, and where Nafaa fits

Sahiwal gave its name to one of the best-known dairy cattle breeds of South Asia, and livestock is still central to the district's economy. The farms around the city grow wheat, cotton, tobacco, potatoes, pulses and oilseeds, and the ancient city of Harappa lies about 24 kilometres to the west. Much of the city's trade serves farmers and herders: feed, medicine and seed going out, and milk, grain and animals coming in.

- **Dairies and milk shops** buy milk from gawalas, deliver to homes on routes, make dahi and makhan, and send each household a monthly bill.
- **Feed, seed and fertiliser dealers** sell by the bag to farmers and herders on credit, and plan stock for the wheat and cotton seasons.
- **Butchers and meat suppliers** set the day's rate, sell by weight and handle large orders around Eid ul Adha.
- **Pet and vet stores** sell animal medicine, supplements and accessories alongside feed.
- **Kiryana stores, bakeries and clothing shops** in the city's bazaars and colonies use the same counter, stock and khata.`,
  markets: [
    { name: 'Grain market', note: 'Where wheat, cotton and other crops from the surrounding farms are sold to traders and mills by the sack.' },
    { name: 'Cattle market', note: 'Livestock trading for local and visiting buyers, busiest in the weeks before Eid ul Adha.' },
    { name: 'City centre bazaars', note: 'Cloth, shoes, utensils, general goods and wholesale grocers in the central shopping streets.' },
  ],
  areas: [
    { name: 'Residential colonies', note: 'Residential areas with milk shops, kiryana stores and bakeries that sell to families on monthly khata.' },
    { name: 'GT Road and Pakpattan Road', note: 'Commercial roads with feed and agri dealers, showrooms, workshops and food stops.' },
    { name: 'Villages around the city', note: 'Farmers and herders who come into Sahiwal to buy feed, seed and household goods on account.' },
  ],
  local: `## Working conditions in Sahiwal

**Milk is daily, payment is monthly.** Milk shops and dairies deliver every morning and collect once a month. Nafaa keeps each household on a delivery route, records what was dropped off each day, makes the monthly bill and adds unpaid amounts to the khata. Spoiled stock and quality tests can be recorded too.

**Power.** Sahiwal is supplied by MEPCO, and outages still interrupt shops in summer. Nafaa keeps billing on the device when the internet goes with the power, and sends the sales to your account once it returns.

**Farm credit.** Feed and seed dealers often wait until the wheat or cotton is sold to be paid. The khata keeps each farmer's bills and payments with a limit and shows how long each balance has been open.

**Language.** Punjabi is the language of nearly everyone in Sahiwal, with Urdu used in writing. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'The khata on your phone, at the farm or the counter',
    body: 'A feed dealer or milk seller opens a customer\'s account on the phone, sees what is owed and since when, records a payment on the spot and sends a WhatsApp reminder to anyone running late.',
    id: SHOT.khataPhone,
    url: 'app.nafaa.pk/customers/khata',
    frame: 'phone',
    layout: 'split-right',
  },
  table: {
    heading: 'Livestock and farm trades in Sahiwal',
    caption: 'How the businesses around Sahiwal\'s cattle and crops set up Nafaa. The counter, stock and khata are in every plan.',
    columns: [
      { key: 'sells', label: 'What they sell' },
      { key: 'nafaa', label: 'Nafaa setup' },
    ],
    rows: [
      ['Dairy or milk shop', 'Milk, dahi, makhan', 'Gawala purchases, delivery routes, monthly bills'],
      ['Feed dealer', 'Feed, bran, supplements by the bag', 'Bag units, farmer khata with limits'],
      ['Agri dealer', 'Seed, fertiliser, sprays', 'Seasonal stock, credit until harvest'],
      ['Butcher', 'Meat by weight', 'Daily rate, hotel accounts, Eid orders'],
      ['Vet and pet store', 'Animal medicine and accessories', 'Batches and expiry, animal health records'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Sahiwal',
    items: [
      ['Open a free trial', 'Sign up on your phone and pick dairy, agri, meat, pet shop or kiryana.'],
      ['Add customers and routes', 'Milk sellers add each household to a route; dealers add farmers with balances.'],
      ['Add stock and units', 'Bags, litres, kilos and pieces, each with its price.'],
      ['Close the first month', 'Generate the monthly bills and send reminders for anything left unpaid.'],
    ],
  },
  questions: `## Questions from Sahiwal businesses

### Can my milk shop bill each house once a month?
Yes. Daily deliveries are recorded against each household and the monthly bill is made from them.

### Can a feed dealer give credit until the crop is sold?
Yes. Each farmer has a khata with a limit, and the balance shows its age until it is paid.

### Does Nafaa work without internet?
Yes. The counter bills offline and syncs when the connection returns.`,
  support:
    'Setup, opening balances and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Sahiwal; we help at your own counter.',
  pricingHeading: 'Plans for Sahiwal businesses',
  cta: { heading: 'Start billing in Sahiwal today', body: 'Try it free on your own phone. Setup help on WhatsApp.' },
  faqKeys: ['offline', 'khata-reminders', 'mp-khata-limit', 'kiryana-units', 'devices', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:dairy', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:meat', kind: 'TAG' },
    { ref: 'INDUSTRY:petshop', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/dairy', 'apps/web/src/industries/agri', 'apps/web/src/industries/meat', 'apps/web/src/industries/petshop'],
  sources: [wikipedia('Sahiwal', CHECKED), wikipedia('Sahiwal cattle', CHECKED), wikipedia('Harappa', CHECKED), wikipedia('Multan Electric Power Company', CHECKED)],
  factCheckNote:
    'Crop mix, Harappa distance and Punjabi as the main language are from the Sahiwal Wikipedia article; the cattle breed is from the Sahiwal cattle article; MEPCO serves Sahiwal. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web (dairy routes and monthly bills, agri, meat, pet shop).',
});
