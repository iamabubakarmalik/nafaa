/**
 * Gujrat city hub (26 Oct 2026). Part of Punjab's industrial "Golden
 * Triangle" with Sialkot and Gujranwala, known for electric fans and
 * furniture, between the Jhelum and Chenab rivers. No shop counts, no named
 * customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichGujrat = cityHub({
  slug: 'gujrat',
  name: 'Gujrat',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Gujrat fan and appliance dealers, furniture showrooms, building material shops, grocers and restaurants. It runs on the phone or computer you already have, records serial numbers, custom orders and qist, and keeps billing through outages.',
  hero: {
    sub: 'Gujrat makes fans and furniture for the whole country. Nafaa runs the showrooms and dealers that sell them, the shops that supply the city\'s new houses, and the counters on its busy bazaars.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    badges: ['Custom furniture orders', 'Serials and qist', 'Bills offline'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; offline billing built in'],
    ['Good fit', 'Fan and appliance dealers, furniture showrooms, hardware shops, grocers, restaurants'],
    ['Orders', 'Custom furniture against a deposit; appliances on qist with a guarantor'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Gujrat ke pankhon aur appliance dealers, furniture showrooms aur hardware dukaanon ke liye Nafaa: serial number, order par furniture, qist aur khata ek app me.',
  trades: `## How Gujrat trades, and where Nafaa fits

Gujrat lies between the Jhelum and Chenab rivers and, with Sialkot and Gujranwala, forms what is often called the Golden Triangle of Punjab: a cluster of industrial, export-minded cities. Gujrat is known across Pakistan for its electric fans and its furniture, much of it made in family workshops. It also has a large overseas community, and money sent home from abroad pays for much of the house building in and around the city.

Nafaa does not plan workshop or factory production. It runs the selling side and the shops around it:

- **Fan and appliance dealers** keep each unit by serial number with its warranty, sell on qist with a guarantor and take old units in trade before summer.
- **Furniture showrooms with workshops** take custom orders against a deposit, track each karigar's workload, and handle large deliveries with assembly, alongside ready stock on the showroom floor.
- **Hardware, sanitary and paint shops** supply the city's house building with items by size and shade, contractor rates, quotations and delivery challans.
- **Grocers, bakeries and pharmacies** in the city's colonies and bazaars use the barcode counter, stock and khata.
- **Restaurants** on the main roads run tables, kitchen tickets and delivery.`,
  markets: [
    { name: 'Fan showrooms and dealers', note: 'Showrooms and wholesale dealers selling locally made ceiling, pedestal and exhaust fans to retailers and households.' },
    { name: 'Furniture showrooms', note: 'Showrooms and workshops selling ready and made-to-order beds, dining sets and sofas to buyers from many cities.' },
    { name: 'City centre bazaars', note: 'Cloth, shoes, utensils, jewellery and general goods in the older shopping streets.' },
  ],
  areas: [
    { name: 'GT Road', note: 'The main commercial artery, lined with showrooms, dealers, restaurants and fuel stops.' },
    { name: 'University area', note: 'Food outlets, stationery and photocopy shops near the University of Gujrat.' },
    { name: 'New housing schemes', note: 'Building material dealers, supermarkets and pharmacies serving fast-growing residential areas.' },
  ],
  local: `## Working conditions in Gujrat

**Power.** Gujrat is supplied by GEPCO, and load-shedding still interrupts shops and showrooms. Nafaa keeps the counter billing on the device during a cut and sends the sales once the internet returns.

**Seasonal fan trade.** Fan and cooler sales climb before summer, and many buyers pay in instalments. Nafaa splits each qist plan into monthly due dates, keeps the guarantor with the plan and records each payment, so the showroom's khata shows what is still owed.

**Custom orders that take weeks.** A furniture order can sit in the workshop for weeks. Nafaa records the design, the deposit and the promised date, and the remaining balance appears on the bill at delivery.

**Language.** Punjabi is the everyday language of Gujrat's markets, with Urdu used in writing. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'Stock, serials and orders in one list',
    body: 'A fan dealer sees each model with its serial-numbered units in stock. A furniture showroom sees ready pieces next to custom orders still in the workshop.',
    id: SHOT.inventory,
    url: 'app.nafaa.pk/products',
    layout: 'split-left',
  },
  table: {
    heading: 'Gujrat trades and the Nafaa screens that fit',
    caption: 'Which Nafaa industry screens suit common Gujrat businesses. Every plan includes the counter, stock and khata.',
    columns: [
      { key: 'screens', label: 'Nafaa screens' },
      { key: 'paid', label: 'How customers pay' },
    ],
    rows: [
      ['Fan and appliance dealer', 'Appliances: serials, warranty, trade-ins', 'Cash, wallet or qist'],
      ['Furniture showroom', 'Furniture: custom orders, karigar work, deliveries', 'Deposit, then balance at delivery'],
      ['Hardware and sanitary shop', 'Hardware: sizes, shades, quotations, challans', 'Contractor khata per site'],
      ['Grocery store', 'Barcode counter, low-stock list', 'Cash, wallet, monthly khata'],
    ],
  },
  steps: {
    heading: 'Setting up a Gujrat showroom',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick appliances, furniture or hardware.'],
      ['Load stock', 'Import models from Excel; add serial numbers as units arrive.'],
      ['Move open orders and qist across', 'Enter custom orders with deposits, and running instalment plans with what is left.'],
      ['Train the sales staff', 'A short video call in Urdu or English for salesmen and cashiers.'],
    ],
  },
  questions: `## Questions from Gujrat businesses

### Can a furniture showroom track custom orders?
Yes. The furniture screens record each order with its deposit, the karigar working on it and the delivery.

### Can I sell fans on instalments?
Yes. The appliance screens split the balance into monthly due dates and keep the guarantor with the plan.

### Does Nafaa plan my fan or furniture production?
No. It covers selling, purchasing, stock and khata. Bills of materials and work orders are on the roadmap.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Gujrat; we help at your own counter.',
  pricingHeading: 'Plans for Gujrat businesses',
  cta: { heading: 'Start billing in Gujrat today', body: 'Try it free on your own phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'mp-manufacturing-scope', 'mp-inventory-import', 'mp-khata-limit', 'mp-pos-payments', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:appliances', kind: 'TAG' },
    { ref: 'INDUSTRY:furniture', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'SOLUTION:manufacturing', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/appliances', 'apps/web/src/industries/appliances/api/qist.api.ts', 'apps/web/src/industries/furniture', 'apps/web/src/industries/hardware'],
  sources: [wikipedia('Gujrat, Pakistan', CHECKED), wikipedia('University of Gujrat', CHECKED), wikipedia('Gujranwala Electric Power Company', CHECKED)],
  factCheckNote:
    'Location between the Jhelum and Chenab and the Golden Triangle description are from the Gujrat Wikipedia article; the fan and furniture industries and the large overseas community are widely reported general knowledge; GEPCO serves Gujrat. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web (appliance qist and serials, furniture orders, hardware).',
  needsOwner: ['Add a public source (e.g. a chamber of commerce or trade body page) for the fan and furniture industries if the owner wants one cited on the page.'],
});
