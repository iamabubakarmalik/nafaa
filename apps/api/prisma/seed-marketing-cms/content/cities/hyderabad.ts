/**
 * Hyderabad (Sindh) city hub, deep copy (26 Oct 2026). Shahi Bazaar, the
 * glass bangle trade, Resham Gali, and the farm economy of lower Sindh.
 * No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichHyderabad = cityHub({
  slug: 'hyderabad',
  seoDescription: 'POS, stock and khata software for Hyderabad bangle and cosmetics shops, cloth sellers, agri dealers and bakeries. Billing continues through HESCO outages.',
  name: 'Hyderabad',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Hyderabad bangle and cosmetics shops, cloth sellers, agri dealers, bakeries and grocers. It runs on the phone or computer you already have, keeps billing through HESCO outages, and keeps customer and farmer credit in a digital khata.',
  hero: {
    sub: 'From the bangle counters of the old city to the agri dealers serving lower Sindh\'s farms: billing, colourful stock, seasonal credit and online orders for Hyderabad businesses.',
    media: { id: SHOT.lowStock, url: 'app.nafaa.pk/inventory/low-stock' },
    badges: ['Shades and sizes in stock', 'Farmer credit khata', 'Bills during outages'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; offline billing included'],
    ['Good fit', 'Bangle and cosmetics shops, cloth sellers, agri dealers, bakeries, grocers, pharmacies'],
    ['Credit', 'Khata per customer or farmer, with limits and WhatsApp reminders'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Hyderabad ki churi aur cosmetics shops, kapre ki dukaanon aur agri dealers ke liye Nafaa: rang aur size ka stock, kisaan ka udhaar aur bill ek app me. Bijli jaye to bhi counter chalta hai.',
  trades: `## How Hyderabad trades, and where Nafaa fits

Hyderabad is Sindh's second-largest city and the market town for much of lower Sindh. The old city around Shahi Bazaar is crowded with cloth, bangle, jewellery and household shops, and the city has long been known for making glass bangles. Around it lie farms growing cotton, sugarcane, wheat, bananas and mangoes, so seed, fertiliser and pesticide dealers do a large trade with farmers who pay after the harvest.

- **Bangle, cosmetics and jewellery shops** keep many shades and sizes of the same item, sell sets and gift packs, and track the batch and expiry of skincare and makeup.
- **Cloth and garment shops** in Resham Gali and the old city keep stock by size and colour and take stitching orders with saved measurements.
- **Agri dealers** run farmer accounts on credit until harvest, take bulk orders and plan stock by the sowing season.
- **Bakeries and sweet shops** record raw materials and recipe costs and take custom orders with an advance.
- **Grocers and pharmacies** in Latifabad, Qasimabad and Hirabad sell from barcodes, keep households on khata and watch medicine expiry dates.`,
  markets: [
    { name: 'Shahi Bazaar', area: 'Old City', note: 'One of the longest bazaars in Pakistan, running through the old city with cloth, jewellery, bangles, shoes and household goods.' },
    { name: 'Resham Gali', area: 'Old City', note: 'A lane of fabric, embroidered cloth, laces and women\'s clothing shops off the main bazaar.' },
    { name: 'Bangle markets', area: 'Old City', note: 'Shops and workshops selling the glass bangles Hyderabad is known for, by the set and by the dozen, retail and to traders.' },
    { name: 'Grain and vegetable markets', note: 'Wholesale markets where produce from the surrounding districts is sold to shops and traders.' },
  ],
  areas: [
    { name: 'Latifabad', note: 'A large residential area with markets for groceries, clothing, mobile phones and food on its main roads.' },
    { name: 'Qasimabad', note: 'Restaurants, bakeries, pharmacies and supermarkets serving newer housing along the main roads.' },
    { name: 'Saddar and Hirabad', note: 'Older commercial districts with clothing outlets, bookshops, clinics and general stores.' },
    { name: 'Auto Bhan Road', note: 'A commercial road with restaurants, cafés, showrooms and service businesses.' },
  ],
  local: `## Working conditions in Hyderabad

**Power.** Hyderabad's electricity comes from HESCO, and outages are long in many neighbourhoods, especially in summer. Nafaa keeps the counter billing on the device and sends sales to your account when the internet returns, so a shop does not lose an evening's record to a power cut.

**Harvest-time credit.** Farmers and many town customers pay after the cotton, sugarcane and wheat crops come in. Each customer's khata has a credit limit and shows how long a balance has been waiting, and one tap sends a WhatsApp reminder from your own number.

**Many shades, one product.** Bangles, cosmetics and fabric come in dozens of colours and sizes. Keeping each shade as a variant of one product, with its own barcode and stock count, makes it easy to see which colours are running out before the wedding season.

**Language.** Sindhi and Urdu are both spoken widely in Hyderabad's markets. Nafaa screens show in Urdu or English, and support chats are in Urdu or English.`,
  shot: {
    heading: 'Know which shades are running out',
    body: 'The low-stock list shows every variant below its reorder level, so a bangle or cosmetics shop sees exactly which colours and sizes to buy before a busy week.',
    id: SHOT.lowStock,
    url: 'app.nafaa.pk/inventory/low-stock',
    layout: 'split-left',
  },
  table: {
    heading: 'Hyderabad trades and where to start in Nafaa',
    caption: 'The first things common Hyderabad businesses set up. The counter, stock and khata are in every plan.',
    columns: [
      { key: 'start', label: 'Start with' },
      { key: 'watch', label: 'Keep an eye on' },
    ],
    rows: [
      ['Bangle shop', 'Sets and dozens as units, colours as variants', 'Low-stock colours before weddings'],
      ['Cosmetics shop', 'Brands, shades, batches', 'Expiry dates on skincare and makeup'],
      ['Cloth shop', 'Designs by size and colour, stitching orders', 'Orders due for pickup'],
      ['Agri dealer', 'Farmer accounts, seasonal stock', 'Balances waiting since last harvest'],
      ['Pharmacy', 'Salt search, batches', 'Short-dated medicines'],
    ],
  },
  steps: {
    heading: 'Setting up a Hyderabad shop',
    items: [
      ['Start the free trial', 'Sign up on the phone or computer at your counter and choose your trade.'],
      ['Add products with variants', 'Enter each design or item once, then its colours and sizes, each with a barcode.'],
      ['Bring the khata across', 'Add regular customers and farmers with their current balances and credit limits.'],
      ['Bill and review the low-stock list', 'After the first few days, set reorder levels for your fastest colours and sizes.'],
    ],
  },
  questions: `## Questions from Hyderabad businesses

### Can I keep dozens of bangle colours without making dozens of products?
Yes. Add one product and list its colours and sizes as variants. Each has its own stock and barcode.

### Which authority handles sales tax on services in Hyderabad?
Services in Sindh fall under the Sindh Revenue Board. Nafaa has an optional tax integration; ask your tax adviser whether your business needs it.

### Can farmers pay after the harvest?
Yes. Keep them on the khata with a credit limit, and their balance shows its age until it is paid.`,
  support:
    'Setup, opening balances and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Hyderabad; we work with you at your own counter.',
  pricingHeading: 'Plans for Hyderabad businesses',
  cta: {
    heading: 'Start billing in Hyderabad today',
    body: 'Try it free on the device you already have. Help on WhatsApp.',
  },
  faqKeys: ['offline', 'garments-variants', 'pharmacy-expiry', 'khata-reminders', 'mp-fbr-who', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:cosmetics', kind: 'TAG' },
    { ref: 'INDUSTRY:jewelry', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/cosmetics',
    'apps/web/src/industries/garments',
    'apps/web/src/industries/agri',
    'apps/web/src/industries/bakery',
    'apps/web/src/industries/pharmacy',
    'apps/web/src/modules/inventory/low-stock',
  ],
  sources: [wikipedia('Hyderabad, Pakistan', CHECKED), wikipedia('Hyderabad Electric Supply Company', CHECKED)],
  factCheckNote:
    'Hyderabad as Sindh\'s second-largest city, Shahi Bazaar, the glass bangle trade, the farm economy of lower Sindh, languages and HESCO as the utility are public facts (Wikipedia). Market notes describe what each place is known for; no customer, office or shop-count claims. Product claims checked in apps/web (variants, low stock, cosmetics batches, agri, pharmacy expiry). No SRB rate is stated.',
});
