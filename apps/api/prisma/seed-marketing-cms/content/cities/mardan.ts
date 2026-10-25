/**
 * Mardan city hub (26 Oct 2026). Khyber Pakhtunkhwa's second-largest city,
 * the Yousafzai heartland, near Takht-i-Bahi, with sugar, textile and edible
 * oil mills and young universities. No shop counts, no named customers, no
 * office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichMardan = cityHub({
  slug: 'mardan',
  name: 'Mardan',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Mardan grocers and wholesalers, agri dealers, cloth and shoe shops, restaurants and pharmacies. It runs on the phone or computer you own, keeps billing through PESCO outages, and keeps every household\'s and trader\'s credit in a digital khata.',
  hero: {
    sub: 'Mardan is a market city for a farming district and a fast-growing student town. Nafaa runs its counters: wholesale by the carton, households on khata, cloth by size and colour, and karahi by the kilo.',
    media: { id: SHOT.pos, url: 'app.nafaa.pk/pos' },
    badges: ['Carton and wholesale rates', 'Household khata', 'Offline billing'],
  },
  facts: [
    ['Runs on', 'The phone, tablet or computer you already have; the counter works offline'],
    ['Good fit', 'Grocers and wholesalers, agri dealers, cloth and shoe shops, restaurants, pharmacies'],
    ['Credit', 'Each household or trader has a khata with a limit'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Mardan ke wholesale dealers, kiryana stores, agri dealers aur restaurants ke liye Nafaa: carton aur piece me bill, ghar walon ka khata aur stock ek app me. Bijli jaye to bhi bill bante hain.',
  trades: `## How Mardan trades, and where Nafaa fits

Mardan is the second-largest city in Khyber Pakhtunkhwa and the traditional centre of the Yousafzai Pashtuns. The ruins of Takht-i-Bahi, a UNESCO World Heritage Site, lie close by. The district is farming country, and the city has textile and edible oil mills and one of the largest sugar mills in South Asia. Since 2009 it has gained a general university, a women's university, an engineering university and a medical college, which have added students, hostels and food outlets to the city.

- **Grocery wholesalers and kiryana stores** sell by piece, dozen and carton, keep a separate rate for shopkeepers, and carry households and smaller shops on khata.
- **Agri dealers** sell seed, fertiliser, sprays and feed to sugarcane, wheat and vegetable farmers on credit until harvest.
- **Cloth and shoe shops** keep stock by size and colour, and get their biggest rush before the two Eids.
- **Restaurants and takeaways** serve karahi, tikka and chapli kebab, billed by the plate or by weight, with tables and kitchen tickets.
- **Pharmacies and clinics** near the medical college and hospitals track batches and expiry dates and keep patient visits.
- **Bookshops and stationers** near the universities keep textbooks and course material by class and semester.`,
  markets: [
    { name: 'Main city bazaars', note: 'The central shopping streets of the old city, with cloth, shoes, utensils, general goods and wholesale grocers.' },
    { name: 'Grain and vegetable markets', note: 'Wholesale markets where produce from the surrounding farms is sold to shops and traders.' },
    { name: 'University area', note: 'Hostels, food outlets, photocopy and stationery shops serving the city\'s universities and colleges.' },
  ],
  areas: [
    { name: 'Mardan Cantonment', note: 'Planned markets with general stores, bakeries and clothing outlets.' },
    { name: 'Roads towards Takht-i-Bahi and Rashakai', note: 'Growing commercial strips with dealers, workshops and food stops; an economic zone is planned at nearby Rashakai.' },
    { name: 'Residential mohallas', note: 'Kiryana stores, milk shops and tailors that serve the same families on monthly khata.' },
  ],
  local: `## Working conditions in Mardan

**Outages.** Mardan is supplied by PESCO, and load-shedding runs for long hours on many feeders. Nafaa keeps billing on the device without internet; sales wait there and go to your account once the connection is back.

**Household and shop credit.** Families in Mardan's mohallas and small shops in nearby villages often buy on account and pay monthly or after the harvest. The khata keeps every bill and payment per customer, sets a limit, and shows which balances are getting old. A one-tap WhatsApp reminder goes from your own number.

**Eid and wedding peaks.** Cloth, shoe and sweet shops do much of their year before the two Eids and in the wedding season. Product-wise reports from last season help you order the right sizes and quantities.

**Language.** Pashto is the language of almost everyone in Mardan. Nafaa screens are in Urdu or English, so a cashier who reads either can bill; support chats are in Urdu or English.`,
  shot: {
    heading: 'A fast counter for busy bazaar days',
    body: 'Quick keys for the items you sell most, barcode scanning for packed goods and a unit picker for cartons and dozens keep the line moving. Every sale lands in stock and in the day\'s report.',
    id: SHOT.pos,
    url: 'app.nafaa.pk/pos',
    layout: 'split-left',
  },
  table: {
    heading: 'Mardan businesses and what they set up first',
    caption: 'Starting points for common Mardan businesses. Every plan includes the counter, stock and khata.',
    columns: [
      { key: 'first', label: 'Set up first' },
      { key: 'why', label: 'Why it matters here' },
    ],
    rows: [
      ['Grocery wholesaler', 'Carton and dozen units, shopkeeper rate', 'Village shops buy in bulk on account'],
      ['Agri dealer', 'Farmer khata, seasonal stock', 'Payments come after the sugarcane and wheat crops'],
      ['Cloth or shoe shop', 'Sizes and colours', 'Eid demand by size'],
      ['Restaurant', 'Menu by plate and by weight, tables', 'Karahi and tikka sold by the kilo'],
      ['Pharmacy', 'Batches and expiry', 'Many brands of the same medicine'],
    ],
  },
  steps: {
    heading: 'Getting a Mardan business started',
    items: [
      ['Start the free trial', 'Sign up on your phone or computer and pick your trade.'],
      ['Add products and rates', 'Import your list from Excel or add items with their units, retail and wholesale prices.'],
      ['Enter customers who owe you', 'Add each family or shop with their current balance and a limit.'],
      ['Bill and close the day', 'Run a day on Nafaa and match the closing report with your cash.'],
    ],
  },
  questions: `## Questions from Mardan businesses

### Can I sell to village shopkeepers at a wholesale rate?
Yes. Each product has a retail and a wholesale price, and each unit can have its own.

### Will the counter stop when PESCO cuts the power?
No. It keeps billing on battery without internet and syncs later.

### Can a restaurant sell karahi by the kilo?
Yes. The counter takes the weight and prices it at the rate you set.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Mardan; we help at your own counter.',
  pricingHeading: 'Plans for Mardan businesses',
  cta: { heading: 'Start billing in Mardan today', body: 'Try it free on your own phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'mp-wholesale-prices', 'kiryana-units', 'mp-khata-limit', 'restaurant-stations', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:shoe', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/agri', 'apps/web/src/industries/restaurant', 'apps/web/src/industries/pharmacy', 'apps/web/src/modules/pos/components/PosTiles.tsx', 'apps/web/src/modules/pos/components/PosUnitPickerModal.tsx', 'apps/web/src/modules/pos/components/PosWeighModal.tsx'],
  sources: [wikipedia('Mardan', CHECKED), wikipedia('Takht-i-Bahi', CHECKED), wikipedia('Peshawar Electric Supply Company', CHECKED)],
  factCheckNote:
    'Second-largest KP city, Yousafzai centre, Takht-i-Bahi, sugar, textile and edible oil mills, the universities since 2009, the planned Rashakai zone and Pashto as the main language are from the Mardan Wikipedia article; PESCO serves Mardan. Market names kept general. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
