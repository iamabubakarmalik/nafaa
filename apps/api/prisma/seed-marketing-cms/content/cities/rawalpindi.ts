/**
 * Rawalpindi city hub, deep copy (26 Oct 2026). An old trading city: the
 * Raja Bazaar wholesale belt, Moti Bazaar for women's clothing, Saddar and
 * Commercial Market for retail, and Bahria Town for new branches. No shop
 * counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichRawalpindi = cityHub({
  slug: 'rawalpindi',
  seoDescription: 'POS, stock and khata software for Rawalpindi wholesalers, cloth and jewellery shops, grocers and restaurants that keeps billing when the signal is weak.',
  name: 'Rawalpindi',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Rawalpindi wholesalers, cloth and jewellery shops, grocers and restaurants. It runs on the phone or computer at the counter, keeps billing in crowded bazaars with weak signal, and keeps trade and household udhaar in a digital khata.',
  hero: {
    sub: 'Built for the way Pindi sells: Raja Bazaar dealers on account, Moti Bazaar boutiques with sizes and colours, Saddar counters on cash and wallet, and family businesses opening a second branch in Bahria Town.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    badges: ['Wholesale and retail rates', 'Size and colour stock', 'Bills without internet'],
  },
  facts: [
    ['Runs on', 'The phone, tablet or computer at your counter; billing continues offline'],
    ['Good fit', 'Wholesalers, cloth and garment shops, jewellers, grocers, hardware shops, restaurants'],
    ['Khata', 'Trade buyers and households on credit, with limits and WhatsApp reminders'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Pindi ke bazaaron ke liye Nafaa: Raja Bazaar ke dealer ho ya Moti Bazaar ki boutique, bill, stock aur udhaar ek app me. Rush me signal na ho to bhi counter chalta hai.',
  trades: `## How Rawalpindi trades, and where Nafaa fits

Rawalpindi is the older of the twin cities and its bazaars supply much of the Potohar region, the hill towns towards Murree and many Islamabad shops. Trade here is dense and personal: dealers in the old city have sold to the same retailers for decades, often on account, while the cantonment and the newer housing schemes bring supermarkets, cafés and branded outlets.

- **Wholesale and general goods dealers** around Raja Bazaar and Ganj Mandi sell grains, spices, cloth and household items by the bag, dozen and carton. Nafaa keeps a separate wholesale price, a price for each unit and a trade khata with a credit limit.
- **Women's clothing and fabric shops** in Moti Bazaar keep each design by size and colour, take stitching orders with saved measurements and hold pieces for customers who pay in parts.
- **Jewellers** set the day's gold rate, keep each piece with its weight and stones, buy back old gold and track work given to karigars.
- **Hardware and building material shops** serving the constant construction in the housing schemes keep items by size and shade, contractor rates, quotations and delivery challans.
- **Restaurants, bakeries and grocers** in Saddar, Satellite Town and Bahria Town use the restaurant, bakery and kiryana screens on the same counter software.`,
  markets: [
    { name: 'Raja Bazaar', area: 'Old City', note: 'The historic heart of Rawalpindi\'s trade, a crowded network of wholesale and retail lanes for cloth, general goods, utensils, dry fruit and household items.' },
    { name: 'Moti Bazaar', area: 'Old City', note: 'A narrow market known for women\'s clothing, fabric, laces, bangles and bridal shopping, busiest before Eid and weddings.' },
    { name: 'Ganj Mandi', area: 'Old City', note: 'A wholesale market for grains, pulses and spices that supplies kiryana stores across the city and nearby towns.' },
    { name: 'Saddar', area: 'Cantonment', note: 'The cantonment shopping district along Bank Road and Kashmir Road, with clothing, shoe, electronics and book shops, bakeries and restaurants.' },
    { name: 'Commercial Market', area: 'Satellite Town', note: 'A large neighbourhood market of clothing, mobile, grocery and food outlets that stays busy late into the night.' },
    { name: 'Sarafa Bazaar', area: 'Old City', note: 'The gold and jewellery lane near Raja Bazaar, where prices move with the daily bullion rate.' },
  ],
  areas: [
    { name: 'Satellite Town', note: 'Dense residential blocks around Commercial Market, with bakeries, pharmacies and kiryana stores that know their customers by name.' },
    { name: 'Bahria Town and DHA', note: 'Planned commercial areas where many old-city businesses open a second branch, alongside new cafés, salons and supermarkets.' },
    { name: 'Chaklala and Westridge', note: 'Cantonment neighbourhoods with general stores, tailors and food outlets serving families and offices.' },
    { name: 'Murree Road and Committee Chowk', note: 'The main commercial artery, lined with showrooms, hotels, restaurants and wholesale offices.' },
  ],
  local: `## Working conditions in Rawalpindi

**Crowds and signal.** On a busy day the old-city lanes are packed, and mobile data struggles between the tall, tightly built shops. Nafaa does not need the internet to bill. Sales are kept on the device and sent to your account once the signal comes back, so the dealer never stops a customer to wait for a page to load.

**Power.** Rawalpindi gets its electricity from IESCO, and outages still happen in parts of the old city and in summer peaks. A phone or a laptop on battery keeps the counter running through them.

**Languages.** Urdu is spoken across the city's markets, Punjabi and Pothwari are common among traders and customers, and many shopkeepers in the wholesale trade speak Pashto. Nafaa screens switch between Urdu and English, so staff can read them in the language they are comfortable with.

**Old registers and long relationships.** Many Pindi businesses keep years of udhaar in paper registers. Opening balances can be entered per customer when you start, and from then on every bill and payment adds to the same ledger. A one-tap WhatsApp message reminds a customer of what they owe, with wording that gets firmer as the balance ages.`,
  shot: {
    heading: 'Every design, size and colour in one list',
    body: 'A Moti Bazaar or Saddar clothing shop keeps each design with its sizes and colours under one product, each with its own barcode and stock count. The counter asks for the size, and the low-stock list shows which sizes to reorder before the season.',
    id: SHOT.inventory,
    url: 'app.nafaa.pk/products',
    layout: 'split-right',
  },
  table: {
    heading: 'Rawalpindi trades and what Nafaa records for them',
    caption: 'What each kind of Pindi business tracks in Nafaa, on top of the counter, stock and khata in every plan.',
    columns: [
      { key: 'records', label: 'What it records' },
      { key: 'khata', label: 'How credit works' },
    ],
    rows: [
      ['General goods wholesaler', 'Units by dozen and carton, wholesale rates', 'Trade buyers with credit limits'],
      ['Women\'s clothing shop', 'Designs by size and colour, stitching orders', 'Items held until the customer pays'],
      ['Jeweller', 'Gold rate, weight, stones, karigar work', 'Advances on custom orders'],
      ['Hardware shop', 'Sizes, shades, contractor rates, challans', 'A khata per contractor and site'],
      ['Bakery or sweet shop', 'Recipes with cost, custom cake orders', 'Advance taken on event orders'],
    ],
  },
  steps: {
    heading: 'Moving from the paper register in Rawalpindi',
    intro: 'Most Pindi businesses switch from a bahi khata or an old desktop program. This is the usual order.',
    items: [
      ['Start the free trial', 'Sign up on the device at your counter and pick your trade.'],
      ['Enter who owes what', 'Add each regular customer with the balance from your register. Send photos of the pages on WhatsApp if you want help.'],
      ['Load your stock', 'Import products from Excel or your old software, with units, wholesale rates and sizes where you use them.'],
      ['Bill and close the first day', 'Run a full day on Nafaa and compare the closing cash with your drawer before you put the register away.'],
    ],
  },
  questions: `## Questions from Rawalpindi businesses

### Can I keep separate rates for shopkeepers and walk-in customers?
Yes. Each product can carry a retail and a wholesale price, and each unit has its own price. The khata keeps every trade buyer's balance and limit.

### I have a shop in the old city and one in Bahria Town. Can stock move between them?
Yes. Create a transfer from one branch and the other branch confirms what arrived, so both stock counts stay right.

### Does it handle the gold rate for my jewellery counter?
Yes. The jewellery screens let you set the day's gold and silver rate and price each piece by its weight.`,
  support:
    'Setup, opening balances and staff training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Rawalpindi; we guide you at your own counter.',
  pricingHeading: 'Plans for Rawalpindi businesses',
  cta: {
    heading: 'Start billing in Rawalpindi today',
    body: 'Try it free on the device at your counter. Help with your old register on WhatsApp.',
  },
  faqKeys: ['devices', 'mp-wholesale-prices', 'khata-reminders', 'garments-variants', 'mp-migration-what', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:jewelry', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
    { ref: 'SERVICE:data-migration', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/garments',
    'apps/web/src/industries/jewelry',
    'apps/web/src/industries/hardware',
    'apps/web/src/industries/bakery',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
  ],
  sources: [wikipedia('Rawalpindi', CHECKED), wikipedia('Raja Bazaar', CHECKED), wikipedia('Islamabad Electric Supply Company', CHECKED)],
  factCheckNote:
    'Market and area notes describe what each place is publicly known for (Wikipedia and general knowledge); IESCO supplies Rawalpindi. No customer, office or shop-count claims. Product claims checked in apps/web (variants, jewellery rate, hardware contractor rates, transfers, khata reminders, bulk import).',
});
