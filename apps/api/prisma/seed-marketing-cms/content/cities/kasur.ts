/**
 * Kasur city hub (26 Oct 2026). Bulleh Shah's city near the Ganda Singh
 * Wala border, a national centre of leather tanning and hide trading, close
 * to Lahore. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichKasur = cityHub({
  slug: 'kasur',
  seoDescription: 'POS, stock and khata software for Kasur leather traders, shoe and garment shops, sweet shops and grocers, with offline billing and supplier credit in one place.',
  name: 'Kasur',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Kasur leather and hide traders, shoe and garment shops, sweet and food outlets, grocers and pharmacies. It runs on the phone or computer at your counter, keeps billing without internet, and keeps trade credit with suppliers and buyers in one place.',
  hero: {
    sub: 'Kasur trades hides and leather for the whole country, and feeds the visitors who come for Bulleh Shah\'s shrine and the border ceremony. Nafaa runs the counters, stock and credit behind both.',
    media: { id: SHOT.khata, url: 'app.nafaa.pk/customers/khata' },
    badges: ['Buyer and supplier accounts', 'Sizes and colours', 'Bills offline'],
  },
  facts: [
    ['Runs on', 'The phone, tablet or computer you already have; offline billing included'],
    ['Good fit', 'Hide and leather traders, shoe and garment shops, sweet and food outlets, grocers, pharmacies'],
    ['Credit', 'What buyers owe you and what you owe suppliers, side by side'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Kasur ke chamre aur khaal ke traders, joote aur kapre ki dukaanon aur khane ki jagahon ke liye Nafaa: bill, stock, kharidar aur supplier ka hisaab ek app me.',
  trades: `## How Kasur trades, and where Nafaa fits

Kasur is an old city a short drive south of Lahore, close to the Ganda Singh Wala border crossing and its flag-lowering ceremony. It is the resting place of the Sufi poet Bulleh Shah, whose shrine draws visitors all year. Since independence Kasur has grown into one of the country's main centres of leather tanning, and one of its biggest markets for collecting and trading hides.

Nafaa does not run a tannery's processing. It covers the buying, selling, stock and credit around it, and the shops of the city:

- **Hide and leather traders** buy from collectors and sell to tanneries and manufacturers, by the piece, the lot and the weight. Nafaa keeps purchase bills and supplier balances on one side and buyer khata with limits on the other.
- **Shoe and leather goods shops** keep every pair or item by size and colour with its own barcode, and see which sizes customers asked for that were out of stock.
- **Garment shops** keep designs by size and colour and take stitching orders.
- **Sweet shops and food outlets** serving shrine visitors and day-trippers bill quickly, sell by weight and take bulk orders for weddings with an advance.
- **Grocers and pharmacies** sell from barcodes, keep households on khata and watch expiry dates.`,
  markets: [
    { name: 'Hide and leather trade', note: 'Collectors, dealers and tanneries that make Kasur one of the country\'s main markets for hides and finished leather.' },
    { name: 'City centre bazaars', note: 'Cloth, shoes, utensils, sweets and general goods in the older shopping streets.' },
    { name: 'Shrine area', note: 'Food stalls, sweet shops and small traders around Bulleh Shah\'s shrine, busiest during the annual urs.' },
  ],
  areas: [
    { name: 'Tannery areas', note: 'Clusters of tanneries and the suppliers, chemical dealers and transporters who serve them.' },
    { name: 'Lahore road', note: 'Commercial roadside with dealers, workshops, restaurants and fuel stops linking Kasur to Lahore.' },
    { name: 'Residential neighbourhoods', note: 'Kiryana stores, milk shops and tailors that sell to families on khata.' },
  ],
  local: `## Working conditions in Kasur

**Both sides of the trade.** A hide trader buys on credit from collectors and sells on credit to tanneries. Nafaa keeps supplier bills and payments on one side and buyer balances on the other, so you can see at any moment what you owe and what you are owed.

**Power.** Kasur is supplied by LESCO and load-shedding still interrupts shops. The counter keeps billing on the device without a connection and sends sales once the internet is back.

**Visitor peaks.** The urs at Bulleh Shah's shrine and holiday weekends bring crowds to the city. A fast counter with quick keys for best-sellers and wallet QR payments keeps the line short.

**Language.** Punjabi is the language of Kasur's markets, with Urdu used in writing. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'What you owe and what you are owed',
    body: 'A Kasur trader sees each buyer\'s balance in the khata and each supplier\'s payable in purchasing. Payments on either side update the balance at once.',
    id: SHOT.khata,
    url: 'app.nafaa.pk/customers/khata',
    layout: 'split-right',
  },
  table: {
    heading: 'Kasur businesses and their trade credit',
    caption: 'How credit flows for common Kasur businesses, and where Nafaa records it.',
    columns: [
      { key: 'buys', label: 'Buys from' },
      { key: 'sells', label: 'Sells to' },
      { key: 'nafaa', label: 'Recorded in' },
    ],
    rows: [
      ['Hide trader', 'Collectors and butchers', 'Tanneries and manufacturers', 'Purchases, supplier balances, buyer khata'],
      ['Shoe shop', 'Makers and wholesalers', 'Walk-in customers', 'Purchases, size-wise stock'],
      ['Sweet shop', 'Milk, sugar and ghee suppliers', 'Visitors, weddings', 'Recipe costs, bulk orders'],
      ['Grocery store', 'Distributors', 'Households', 'Supplier bills, household khata'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Kasur',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick your trade.'],
      ['Add suppliers and buyers', 'Enter what you owe each supplier and what each buyer owes you.'],
      ['Add stock', 'Products with units, sizes and colours; import from Excel if you have a list.'],
      ['Record the first week fully', 'Enter every purchase and sale so both balances are right from the start.'],
    ],
  },
  questions: `## Questions from Kasur businesses

### Can I track what I owe suppliers as well as what buyers owe me?
Yes. Purchases and supplier payments sit in purchasing, buyer balances in the khata, both in one account.

### Does Nafaa run a tannery's processing?
No. It covers buying, selling, stock and credit, not processing steps.

### Can a shoe shop see which sizes are missing?
Yes. Stock is kept by size and colour, and the shop can record sizes customers asked for that were out of stock.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Kasur; we help at your own counter.',
  pricingHeading: 'Plans for Kasur businesses',
  cta: { heading: 'Start billing in Kasur today', body: 'Try it free on your phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'mp-khata-limit', 'mp-manufacturing-scope', 'mp-inventory-import', 'bakery-bulk', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:shoe', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'RELATED' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/shoe', 'apps/web/src/industries/garments', 'apps/web/src/industries/bakery', 'apps/web/src/modules/purchasing/suppliers'],
  sources: [wikipedia('Kasur', CHECKED), wikipedia('Bulleh Shah', CHECKED), wikipedia('Ganda Singh Wala', CHECKED), wikipedia('Lahore Electric Supply Company', CHECKED)],
  factCheckNote:
    'Bulleh Shah\'s shrine, the Ganda Singh Wala border ceremony, and Kasur as a main centre of leather tanning and hide trading are from the Kasur Wikipedia article; LESCO serves Kasur. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web (shoe sizes and missed-size list, purchasing and suppliers, bakery).',
});
