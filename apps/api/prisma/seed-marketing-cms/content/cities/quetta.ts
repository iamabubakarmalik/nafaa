/**
 * Quetta city hub, deep copy (26 Oct 2026). Liaquat and Kandahari bazaars,
 * the dry fruit and fruit trade from Balochistan's orchards, tea hotels and
 * sajji, and a cold winter that changes what sells. Network suspensions make
 * offline billing central. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichQuetta = cityHub({
  slug: 'quetta',
  name: 'Quetta',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Quetta dry fruit and fruit traders, tea hotels and restaurants, garment and blanket sellers, and grocers. It bills on the phone or computer you own without needing the internet, and keeps trade credit in a digital khata.',
  hero: {
    sub: 'For Liaquat Bazaar shops, Kandahari Bazaar dry fruit dealers and the city\'s tea hotels: a counter that keeps billing when mobile data is cut or the power fails, with stock and credit kept in one place.',
    media: { id: SHOT.posPhone, url: 'app.nafaa.pk/pos' },
    badges: ['Bills with no network', 'Sell by the kilo', 'Trade credit khata'],
  },
  facts: [
    ['Runs on', 'A phone, tablet or computer; billing does not need a connection'],
    ['Good fit', 'Dry fruit and fruit traders, tea hotels, restaurants, garment and blanket shops, grocers'],
    ['Seasons', 'Winter stock and summer fruit tracked by product and month'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Quetta ke dry fruit dealers, chai hotels aur dukaanon ke liye Nafaa: internet band ho to bhi bill bante hain, aur stock aur udhaar ek app me rehta hai.',
  trades: `## How Quetta trades, and where Nafaa fits

Quetta is the capital of Balochistan and its main market town, set in a valley ringed by mountains. Orchards in the surrounding districts grow apples, grapes, pomegranates, apricots and almonds, and the city's markets trade that fruit fresh and dried along with goods that come in from Afghanistan and Iran. Inside the city, tea hotels and sajji restaurants feed traders and travellers from early morning to late at night.

- **Dry fruit and fruit traders** in Kandahari Bazaar and the fruit market sell by the kilo, the box and the bag, with retail and wholesale rates and credit for buyers from other cities.
- **Tea hotels and restaurants** bill quickly at the counter or run tables with kitchen tickets, and keep recipes for what goes into each dish and each cup.
- **Garment, shawl and blanket shops** keep stock by size and colour and plan for the winter rush, when warm clothing sells fastest.
- **Kiryana stores and wholesalers** sell by piece and carton, keep households on khata and order from suppliers before roads close in bad weather.
- **Mobile and electronics shops** record each phone by IMEI and take used phones in trade.`,
  markets: [
    { name: 'Liaquat Bazaar', area: 'City centre', note: 'The main shopping street of Quetta, with clothing, shoes, electronics, cosmetics and general goods shops.' },
    { name: 'Kandahari Bazaar', area: 'City centre', note: 'Known for dry fruit, carpets, handicrafts and goods from Afghanistan, sold retail and to traders.' },
    { name: 'Jinnah Road', note: 'A central commercial road with showrooms, pharmacies, bookshops, bakeries and restaurants.' },
    { name: 'Fruit and vegetable market', note: 'Where orchard produce from across the province is bought by the crate and truckload for shops in Quetta and other cities.' },
  ],
  areas: [
    { name: 'Satellite Town', note: 'A large residential area with general stores, bakeries, pharmacies and neighbourhood markets.' },
    { name: 'Quetta Cantonment', note: 'Planned markets with clothing, grocery and food outlets serving families and offices.' },
    { name: 'Samungli Road and Airport Road', note: 'Growing commercial roads with restaurants, sajji houses and showrooms.' },
    { name: 'Hazara Town and Mari Abad', note: 'Residential neighbourhoods with their own grocery, tailoring and food businesses.' },
  ],
  local: `## Working conditions in Quetta

**Network suspensions.** Mobile internet in Quetta and other parts of Balochistan has been suspended at times for security reasons, sometimes for days. A cloud counter that needs a connection stops then. Nafaa keeps billing on the device; sales wait there and go to your account when the connection is back, with a list of what is still waiting to send.

**Power and gas.** Electricity comes from QESCO and outages are common, and winter gas pressure is often low. A phone or a laptop on battery keeps the counter going.

**A real winter.** Quetta is one of the coldest large cities in Pakistan. What sells changes with the season: shawls, blankets and dry fruit in winter, fresh fruit in summer and autumn. Product-wise sales reports by month show what moved last season, so you can order for the next.

**Languages.** Pashto, Balochi, Brahui, Hazaragi and Urdu are all spoken in Quetta's markets. Nafaa screens show in Urdu or English, and support chats are in Urdu or English.`,
  shot: {
    heading: 'See what is still waiting to sync',
    body: 'When the network is down, every bill is saved on the device. A small list shows the sales waiting to send, and they upload on their own once mobile data or the shop\'s internet comes back.',
    id: SHOT.pos,
    url: 'app.nafaa.pk/pos',
    layout: 'split-right',
  },
  table: {
    heading: 'Quetta trades through the year',
    caption: 'When common Quetta businesses are busiest and what Nafaa keeps track of for them.',
    columns: [
      { key: 'season', label: 'Busiest' },
      { key: 'tracks', label: 'Nafaa keeps' },
    ],
    rows: [
      ['Dry fruit dealer', 'Autumn and winter', 'Kilo and bag rates, trade buyer khata'],
      ['Fresh fruit trader', 'Summer and autumn harvest', 'Crate and box units, buyer balances'],
      ['Shawl and blanket shop', 'Winter', 'Stock by size and colour, reorder list'],
      ['Tea hotel or sajji house', 'All year, late nights', 'Fast counter bills, tables, recipes'],
      ['Kiryana store', 'Before roads close in bad weather', 'Supplier orders, low-stock list, khata'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Quetta',
    items: [
      ['Sign up while you have a connection', 'Create the account and pick your trade. After that, the counter can bill offline.'],
      ['Add products with their units', 'Kilo, box and bag for dry fruit and fruit, piece and carton for groceries, sizes for clothing.'],
      ['Enter trade buyers and balances', 'Add regular buyers with what they owe today and a credit limit.'],
      ['Bill, then check the sync list', 'Run a day; if the network was down, check that the waiting sales uploaded before you close.'],
    ],
  },
  questions: `## Questions from Quetta businesses

### What happens to my bills if mobile internet is shut down for days?
The counter keeps billing and saves each sale on the device. When the connection returns, the sales upload by themselves. Reports for other devices and branches update after that.

### Can I sell dry fruit by the kilo and by the bag?
Yes. Add both units to the product with their own prices, retail and wholesale.

### Do I need a computer?
No. A phone with a browser is enough to start. A printer or scale can be added later.`,
  support:
    'Setup, data import and training happen remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Quetta; we help at your own counter.',
  pricingHeading: 'Plans for Quetta businesses',
  cta: {
    heading: 'Start billing in Quetta today',
    body: 'Try it free on your own phone or computer. Setup help on WhatsApp.',
  },
  faqKeys: ['offline', 'devices', 'mp-wholesale-prices', 'kiryana-units', 'mobile-used', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:mobile-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:carpet', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos', kind: 'RELATED' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx',
    'apps/web/src/modules/pos/components/PosWeighModal.tsx',
    'apps/web/src/industries/restaurant',
    'apps/web/src/industries/garments',
    'apps/web/src/industries/mobile',
  ],
  sources: [wikipedia('Quetta', CHECKED), wikipedia('Quetta Electric Supply Company', CHECKED)],
  factCheckNote:
    'Quetta geography, orchards, climate, languages and QESCO as the utility are public facts (Wikipedia); mobile internet suspensions in Quetta and Balochistan have been widely reported. Market notes describe what each place is known for; no customer, office or shop-count claims. Product claims checked in apps/web (offline queue and pending list, weight sale, units).',
});
