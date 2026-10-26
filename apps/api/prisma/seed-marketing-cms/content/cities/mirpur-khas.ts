/**
 * Mirpur Khas city hub (26 Oct 2026). The "City of Mangoes" with its annual
 * mango festival, sugar, ginning and oil mills, and the road to Umerkot and
 * Thar. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichMirpurKhas = cityHub({
  slug: 'mirpur-khas',
  seoDescription: 'POS, stock and khata software for Mirpur Khas mango and produce traders, agri dealers and wholesalers supplying Thar, with offline billing and farmer credit.',
  name: 'Mirpur Khas',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Mirpur Khas mango and produce traders, agri dealers, grocers and wholesalers supplying Thar, and bazaar shops. It runs on the phone or computer you own, bills offline through HESCO outages, and keeps trade and farmer credit in one khata.',
  hero: {
    sub: 'Mirpur Khas sends its mangoes across the country every summer and supplies the towns of Thar all year. Nafaa keeps the crate counts, buyer accounts and bazaar bills of that trade in one app.',
    media: { id: SHOT.pos, url: 'app.nafaa.pk/pos' },
    badges: ['Crate and peti units', 'Trade buyer khata', 'Bills offline'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; offline billing built in'],
    ['Good fit', 'Mango and produce traders, agri dealers, wholesalers, grocers, cloth shops'],
    ['Season', 'Summer mango trade and the sowing seasons, tracked by product and month'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Mirpur Khas ke aam aur sabzi ke traders, agri dealers aur Thar ko maal bhejne wale wholesale dealers ke liye Nafaa: peti aur crate me bill, kharidar ka khata aur stock ek app me.',
  trades: `## How Mirpur Khas trades, and where Nafaa fits

Mirpur Khas is called the City of Mangoes. Hundreds of varieties grow in its orchards, the Sindhri being the best known, and the city has held an annual mango festival since 1955. The district's fertile land also grows wheat, onions, sugarcane, cotton and chillies, and the city has sugar mills, cotton ginning and edible oil mills. The N120 highway links it to Umerkot and the Thar desert, so many shopkeepers from Thar buy their stock here.

- **Mango traders and commission agents** buy from orchards and sell by the peti, crate and truck to buyers from Karachi, Punjab and abroad, mostly on account during the season.
- **Vegetable and chilli traders** sell onions, chillies and other produce by the bag and the kilo.
- **Agri dealers** carry orchard owners and farmers on credit for fertiliser, sprays and seed until the crop is sold.
- **Grocery wholesalers** supply shops in Umerkot and the Thar towns by the carton, with a shopkeeper rate and a limit for each buyer.
- **Cloth shops, grocers and pharmacies** in the city's bazaars use the barcode counter, stock and khata.`,
  markets: [
    { name: 'Mango trade', note: 'Orchard owners, commission agents and traders who pack and send mangoes by the crate and truck every summer, with the annual festival showing the varieties.' },
    { name: 'Produce and grain markets', note: 'Onions, chillies, wheat and other crops from the district traded in bulk.' },
    { name: 'City centre bazaars', note: 'Cloth, shoes, utensils and general goods in the main shopping streets.' },
  ],
  areas: [
    { name: 'Umerkot road', note: 'Wholesalers, transporters and dealers serving the towns of Thar along the N120.' },
    { name: 'Mill areas', note: 'Sugar, ginning and oil mills with the suppliers and shops around them.' },
    { name: 'Residential neighbourhoods', note: 'Kiryana stores, milk shops and tailors that sell to families on khata.' },
  ],
  local: `## Working conditions in Mirpur Khas

**A short, intense season.** The mango season brings a rush of buyers, crates and trucks in a few weeks. Traders bill many buyers a day, often on credit. A counter that bills without internet and a khata that totals each buyer's account keep the season's books straight.

**Power.** Mirpur Khas is supplied by HESCO, and load-shedding is long in many areas, especially in summer. Nafaa keeps billing on the device and sends sales once the connection is back.

**Supplying Thar.** Shopkeepers from the desert towns come in every few weeks and pay part of what they owe each trip. The khata shows each one's balance and its age, and a WhatsApp reminder goes from your number before their next visit.

**Languages.** Sindhi and Urdu are both widely spoken, along with Punjabi and other languages. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'A quick counter for busy season days',
    body: 'Pick a product, choose the peti or crate, enter the quantity and the buyer, and the bill goes to cash, wallet or the buyer\'s khata.',
    id: SHOT.pos,
    url: 'app.nafaa.pk/pos',
    layout: 'split-right',
  },
  table: {
    heading: 'The Mirpur Khas year',
    caption: 'How the district\'s crops shape trade through the year, and what to watch in Nafaa.',
    columns: [
      { key: 'busy', label: 'Who is busy' },
      { key: 'watch', label: 'What to watch' },
    ],
    rows: [
      ['Mango season (summer)', 'Mango traders, transporters', 'Buyer accounts, crate and peti units'],
      ['Sowing seasons', 'Agri dealers', 'Seed and fertiliser stock, farmer credit'],
      ['Cane crushing season', 'Shops near the sugar mills', 'Daily sales, khata from mill families'],
      ['All year', 'Wholesalers supplying Thar', 'Shopkeeper limits, balance age'],
    ],
  },
  steps: {
    heading: 'Getting ready before the mango season',
    intro: 'Set this up a few weeks before the first crates arrive.',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick your trade.'],
      ['Add products and units', 'Each variety with its peti, crate and kilo prices.'],
      ['Add regular buyers', 'Enter each buyer with any balance from last season and a limit.'],
      ['Bill and settle daily', 'Bill every sale on Nafaa and check each buyer\'s total at the end of the day.'],
    ],
  },
  questions: `## Questions from Mirpur Khas businesses

### Can I keep each mango variety with its own crate price?
Yes. Add each variety as a product with its own units and prices.

### Can shopkeepers from Thar pay part of their balance each visit?
Yes. Every payment is recorded against their khata, and the remaining balance and its age stay visible.

### What happens during long power cuts?
The counter keeps billing on the device and syncs later.`,
  support:
    'Setup, opening balances and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Mirpur Khas; we help at your own counter.',
  pricingHeading: 'Plans for Mirpur Khas businesses',
  cta: { heading: 'Start billing in Mirpur Khas today', body: 'Try it free on your own phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'kiryana-units', 'mp-wholesale-prices', 'mp-khata-limit', 'khata-reminders', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/agri', 'apps/web/src/modules/inventory/product-units', 'apps/web/src/modules/pos/engine/PosScreen.tsx'],
  sources: [wikipedia('Mirpur Khas', CHECKED), wikipedia('Sindhri', CHECKED), wikipedia('Hyderabad Electric Supply Company', CHECKED)],
  factCheckNote:
    'City of Mangoes, the festival since 1955, the Sindhri, the crop mix, the mills, the N120 link to Umerkot and the language mix are from the Mirpur Khas Wikipedia article; HESCO serves the district. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
