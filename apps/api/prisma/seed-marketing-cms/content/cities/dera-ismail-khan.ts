/**
 * Dera Ismail Khan city hub (26 Oct 2026). A Saraiki- and Pashto-speaking
 * trading city on the Indus at the Gomal junction, laid out around four
 * bazaars that meet at the Chowgalla. No shop counts, no named customers,
 * no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichDeraIsmailKhan = cityHub({
  slug: 'dera-ismail-khan',
  seoDescription: 'POS, stock and khata software for Dera Ismail Khan bazaar shops, grocery wholesalers, agri dealers and restaurants, with billing that keeps going offline.',
  name: 'Dera Ismail Khan',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Dera Ismail Khan bazaar shops, grocery wholesalers, agri dealers, cloth sellers and restaurants. It runs on the phone or computer you have, keeps billing without internet through outages, and keeps trade and household credit in a digital khata.',
  hero: {
    sub: 'DI Khan has traded between the Indus plains and the Gomal Pass for centuries, around four bazaars that meet at the Chowgalla. Nafaa runs its counters today: wholesale to nearby towns, farm credit and daily bazaar billing.',
    media: { id: SHOT.salesChannels, url: 'app.nafaa.pk/online-store/channels' },
    badges: ['Wholesale to nearby towns', 'Farm credit', 'Bills offline'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; offline billing built in'],
    ['Good fit', 'Grocery wholesalers, agri dealers, cloth and shoe shops, restaurants, pharmacies'],
    ['Credit', 'Shopkeepers, farmers and families on khata with limits'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'DI Khan ke bazaar ki dukaanon, wholesale dealers, agri dealers aur restaurants ke liye Nafaa: bill, stock aur khata ek app me. Bijli jaye to bhi counter chalta hai.',
  trades: `## How Dera Ismail Khan trades, and where Nafaa fits

Dera Ismail Khan stands on the west bank of the Indus where the Gomal River joins it, about 300 kilometres south of Peshawar and 230 kilometres north-west of Multan. The old town was laid out with four bazaars running in the four directions and meeting at the central Chowgalla, and it prospered on trade with Afghan caravans coming through the Gomal Pass. Today it is the market for a wide farming district and for the towns between the Indus and the hills.

- **Grocery wholesalers** supply shops in nearby towns by the carton and the bag, with a shopkeeper rate and a credit limit for each buyer.
- **Agri dealers** sell seed, fertiliser and sprays to farmers on credit until harvest and plan stock by season.
- **Cloth and shoe shops** in the four bazaars keep stock by size and colour and prepare for Eid.
- **Restaurants and food stalls** bill quickly at the counter and run tables and kitchen tickets.
- **Pharmacies and clinics** track medicine batches and expiry, and keep patient visits.
- **Kiryana stores** across the city sell from barcodes and keep families on khata.`,
  markets: [
    { name: 'The four bazaars and Chowgalla', area: 'Old city', note: 'Four bazaars laid out in the four directions that meet at the central Chowgalla, with cloth, shoes, utensils, sweets and general goods.' },
    { name: 'Wholesale grocery trade', note: 'Dealers who supply shopkeepers in the towns of the district by the carton and the bag.' },
    { name: 'Grain and produce trade', note: 'Wheat and other crops from the district bought and sold by farmers, agents and traders.' },
  ],
  areas: [
    { name: 'Cantonment', note: 'Planned markets with general stores, bakeries and clothing outlets.' },
    { name: 'University area', note: 'Food outlets, stationery and photocopy shops serving students.' },
    { name: 'Indus riverside', note: 'Roads along the river with food stops, dealers and transport businesses.' },
  ],
  local: `## Working conditions in Dera Ismail Khan

**Heat and outages.** Summers are very hot and load-shedding is long in many areas. Nafaa keeps billing on the device when the power and internet go, and sends the sales once the connection returns.

**Mobile data interruptions.** Mobile internet in parts of the district has been suspended at times for security reasons. Because billing does not need a connection, the counter keeps working, and a list shows the sales still waiting to upload.

**Credit for towns and farms.** Shopkeepers from nearby towns and farmers from the district buy on account. Each has a khata with a limit, and balances are grouped by age so you can see who to follow up first. A one-tap WhatsApp reminder goes from your own number.

**Languages.** Saraiki is the main language of Dera Ismail Khan, with Pashto and Urdu widely spoken. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'Online and phone orders next to the counter',
    body: 'Orders from your own website or a connected online store arrive next to counter sales, and stock updates for both. A DI Khan shop can take orders from customers in other towns without a second system.',
    id: SHOT.salesChannels,
    url: 'app.nafaa.pk/online-store/channels',
    layout: 'split-right',
  },
  table: {
    heading: 'Who buys from Dera Ismail Khan businesses',
    caption: 'The main buyers of common DI Khan businesses and how Nafaa keeps their accounts.',
    columns: [
      { key: 'buyers', label: 'Main buyers' },
      { key: 'nafaa', label: 'In Nafaa' },
    ],
    rows: [
      ['Grocery wholesaler', 'Shopkeepers from nearby towns', 'Carton units, shopkeeper rate, credit limits'],
      ['Agri dealer', 'Farmers', 'Bag units, seasonal stock, farmer khata'],
      ['Cloth shop', 'Families before Eid and weddings', 'Sizes and colours, stitching orders'],
      ['Pharmacy', 'Patients and clinics', 'Batches, expiry, salt search'],
      ['Kiryana store', 'Households', 'Barcode counter, monthly khata'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Dera Ismail Khan',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick your trade.'],
      ['Add products and rates', 'Import your list from Excel, with units and wholesale prices.'],
      ['Enter shopkeepers and farmers', 'Add each with their opening balance and a credit limit.'],
      ['Bill offline when needed', 'Keep selling during outages and check the sync list in the evening.'],
    ],
  },
  questions: `## Questions from Dera Ismail Khan businesses

### Can I keep billing if mobile internet is suspended?
Yes. The counter bills offline and uploads the sales when the connection is restored.

### Can shopkeepers from nearby towns buy on credit?
Yes. Each has a khata with a limit, and every bill and payment is recorded against it.

### Can I take orders online as well?
Yes. Website and connected online-store orders appear next to counter sales and share the same stock.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Dera Ismail Khan; we help at your own counter.',
  pricingHeading: 'Plans for Dera Ismail Khan businesses',
  cta: { heading: 'Start billing in Dera Ismail Khan today', body: 'Try it free on your own phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'mp-wholesale-prices', 'mp-khata-limit', 'mp-online-channels', 'pharmacy-expiry', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'PRODUCT:online-store', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/agri', 'apps/web/src/industries/pharmacy', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx', 'apps/web/src/app/shell/navigation/nav-config.ts'],
  sources: [wikipedia('Dera Ismail Khan', CHECKED), wikipedia('Gomal River', CHECKED), wikipedia('Peshawar Electric Supply Company', CHECKED)],
  factCheckNote:
    'Indus and Gomal junction, distances from Peshawar and Multan, the four bazaars meeting at the Chowgalla, the Gomal Pass trade and the language mix are from the Dera Ismail Khan Wikipedia article; mobile data suspensions in the district have been reported in the press. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
