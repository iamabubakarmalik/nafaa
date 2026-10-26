/**
 * Faisalabad city hub, deep copy (26 Oct 2026). Textile city: the yarn and
 * cloth trade around the Clock Tower bazaars, power looms and mills on the
 * edges, and a large farming hinterland. States plainly that Nafaa does not
 * run mill production. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichFaisalabad = cityHub({
  slug: 'faisalabad',
  seoDescription: 'POS, stock and khata software for Faisalabad cloth and yarn dealers, garment shops and agri stores. Sell by metre, bag or piece through FESCO load-shedding.',
  name: 'Faisalabad',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Faisalabad cloth and yarn dealers, garment shops, agri stores and grocers. It runs on the phone or computer you have, sells by metre, bag or piece, keeps trade credit in a digital khata and keeps billing through FESCO load-shedding.',
  hero: {
    sub: 'For the city around the Clock Tower: cloth sold by the metre, yarn by the bag, fertiliser on crop credit and groceries on khata, all billed from one app that does not stop when the power does.',
    media: { id: SHOT.khata, url: 'app.nafaa.pk/customers/khata' },
    badges: ['Trade khata with limits', 'Units and wholesale rates', 'Bills during load-shedding'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; the counter works offline'],
    ['Good fit', 'Cloth and yarn dealers, garment shops, agri stores, grocers, hardware shops'],
    ['Not for', 'Running mill or loom production; Nafaa covers the selling, buying and stock side'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Faisalabad ke kapra aur dhaga dealers, garment shops aur agri stores ke liye Nafaa: metre, bori ya piece me bill, trade ka khata aur stock ek app me. Bijli jaye to bhi counter chalta rehta hai.',
  trades: `## How Faisalabad trades, and where Nafaa fits

Faisalabad is often called the Manchester of Pakistan. Spinning and weaving mills, power looms, dyeing and processing units sit around the city, and their output moves through cloth and yarn markets to shops across the country. The city is also the trading centre of one of Punjab's most productive farming districts, and home to the University of Agriculture, so seed, fertiliser and pesticide dealers are a big part of local trade.

Nafaa does not plan mill or loom production. It handles what happens at the counter and the warehouse door: selling, buying from suppliers, stock and the credit that runs through both.

- **Cloth and fabric dealers** sell by the metre and the than, keep a wholesale rate for shopkeepers and a retail rate for walk-ins, and track each trade buyer's balance.
- **Yarn dealers** buy and sell by the bag, record supplier bills and payments, and see what every buyer owes at a glance.
- **Garment and boutique shops** keep stock by size and colour and take stitching orders with saved measurements.
- **Agri stores** keep farmer accounts with credit until the harvest, take bulk orders and plan stock by season.
- **Kiryana and hardware shops** in the city's colonies use the same counter, khata and low-stock list.`,
  markets: [
    { name: 'Clock Tower bazaars', area: 'City centre', note: 'Eight bazaars radiate from the Ghanta Ghar in a pattern modelled on the Union Jack, including Kachehri, Rail, Karkhana, Montgomery, Jhang, Bhowana, Aminpur and Chiniot Bazaars, crowded with cloth, garment, utensil and general goods shops.' },
    { name: 'Yarn Market', note: 'The centre of the yarn trade, where dealers buy from spinning mills and sell to weavers, often on credit and by the bag.' },
    { name: 'Cloth markets around the Clock Tower', note: 'Wholesale fabric shops supplying lawn, cotton and blended cloth to retailers and tailors from across Punjab.' },
    { name: 'Grain market', note: 'The wholesale market for wheat, rice and other produce brought in from the surrounding farmland.' },
  ],
  areas: [
    { name: 'D Ground and Peoples Colony', note: 'The main modern shopping area, with branded clothing outlets, restaurants, cafés and bakeries.' },
    { name: 'Susan Road and Madina Town', note: 'Residential and commercial blocks with supermarkets, pharmacies, salons and food outlets.' },
    { name: 'Satiana Road', note: 'A long commercial road with showrooms, hardware and building material shops, and fast-growing housing schemes nearby.' },
    { name: 'Industrial estates on Sargodha and Jaranwala roads', note: 'Mills, looms and processing units, along with the suppliers, workshops and dealers that serve them.' },
  ],
  local: `## Working conditions in Faisalabad

**Load-shedding.** Faisalabad's power comes from FESCO, and outages are a regular part of the working day, especially in summer. A counter that needs a live connection loses sales every time the router goes off. Nafaa keeps billing on the device and sends the sales to your account when the internet is back.

**Credit runs everything.** Much of the cloth and yarn trade is done on account, with payments coming in weeks after the goods go out. Nafaa's khata keeps each buyer's bills and payments together, sets a credit limit per buyer, and groups what is owed by age so you can see which balances are new and which have been waiting for months.

**Seasons.** Cloth sales peak before the two Eids and the wedding season; agri stores are busiest at sowing time for wheat and cotton. Reports by day and by product show what moved in last year's season, which helps when you order for the next one.

**Language.** Punjabi is the everyday language of Faisalabad's markets, with Urdu used for writing and billing. Nafaa screens can be shown in Urdu or English.`,
  shot: {
    heading: 'What every trade buyer owes, by age',
    body: 'A cloth or yarn dealer sees each buyer\'s balance with the bills and payments behind it, sorted by how long it has been waiting. When a new bill would cross a buyer\'s credit limit, the counter stops it until a manager approves.',
    id: SHOT.khata,
    url: 'app.nafaa.pk/customers/khata',
    layout: 'split-left',
  },
  table: {
    heading: 'Selling units in Faisalabad trades',
    caption: 'Each product can have several units with their own prices. Examples of how Faisalabad businesses set them up.',
    columns: [
      { key: 'units', label: 'Units used' },
      { key: 'prices', label: 'Prices kept' },
    ],
    rows: [
      ['Cloth dealer', 'Metre and full than', 'Retail and wholesale per unit'],
      ['Yarn dealer', 'Bag and kilogram', 'Retail and wholesale per bag'],
      ['Agri store', 'Bag, bottle and packet', 'Counter price; farmer credit in the khata'],
      ['Kiryana store', 'Piece, dozen and carton', 'Retail price and shopkeeper price'],
      ['Garment shop', 'Piece by size and colour', 'Fixed price, with discounts tracked'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Faisalabad',
    items: [
      ['Open a free trial', 'Sign up on the device you already use and pick your trade: cloth, garments, agri, kiryana or hardware.'],
      ['Set your units and rates', 'Add products with the units you sell in, each with its own retail and wholesale price.'],
      ['Bring your buyers across', 'Enter each trade buyer with their opening balance and a credit limit, or send the list on WhatsApp for help.'],
      ['Record supplier bills', 'Enter what you buy from mills and suppliers so stock and payables stay right from the first week.'],
    ],
  },
  questions: `## Questions from Faisalabad businesses

### Can Nafaa run my power loom or mill production?
No. Nafaa does not plan looms, spinning or processing. It covers your sales counter, purchases, stock and khata. Bills of materials and work orders for general manufacturing are on the roadmap.

### Can I sell cloth by the metre and by the full than?
Yes. Add both as units of the same product, each with its own price, and the stock count stays in one place.

### Can farmers buy on credit until harvest?
Yes. Keep each farmer as a khata customer with a limit; payments after the harvest clear the balance bill by bill.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Faisalabad; we help you at your own counter.',
  pricingHeading: 'Plans for Faisalabad businesses',
  cta: {
    heading: 'Start billing in Faisalabad today',
    body: 'Try it free on your own phone or computer. Setup help on WhatsApp.',
  },
  faqKeys: ['offline', 'mp-wholesale-prices', 'mp-khata-limit', 'mp-manufacturing-scope', 'kiryana-units', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
    { ref: 'SOLUTION:manufacturing', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/garments',
    'apps/web/src/industries/agri',
    'apps/web/src/modules/inventory/product-units',
    'apps/web/src/modules/purchasing',
    'apps/web/src/modules/customers/khata/api/customer-ledger.api.ts',
  ],
  sources: [wikipedia('Faisalabad', CHECKED), wikipedia('Clock Tower, Faisalabad', CHECKED), wikipedia('Faisalabad Electric Supply Company', CHECKED), wikipedia('University of Agriculture, Faisalabad', CHECKED)],
  factCheckNote:
    'Textile and farming economy, the eight Clock Tower bazaars and FESCO as the utility are public facts (Wikipedia). Market and area notes describe what each place is known for; no customer, office or shop-count claims. Manufacturing scope matches the mp-manufacturing-scope FAQ. Product claims checked in apps/web (units, khata limit and ageing, agri pack, purchasing).',
});
