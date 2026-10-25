/**
 * Abbottabad city hub (26 Oct 2026). A hill city of schools, colleges and
 * the military academy at Kakul, and a stop for tourists heading to the
 * Galyat and the north. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichAbbottabad = cityHub({
  slug: 'abbottabad',
  name: 'Abbottabad',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Abbottabad hotels and guest houses, restaurants, bookshops, uniform and clothing shops, pharmacies and grocers. It runs on the phone or computer you already have, bills without internet, and handles both the tourist season and the school year.',
  hero: {
    sub: 'Abbottabad serves two crowds: students and families all year, and travellers heading to Nathia Gali and the north every summer. Nafaa runs the rooms, tables, book lists and counters for both.',
    media: { id: SHOT.dashboard, url: 'app.nafaa.pk/dashboard' },
    badges: ['Rooms and bookings', 'School book lists', 'Bills offline'],
  },
  facts: [
    ['Runs on', 'A phone, tablet or computer with a browser; billing continues offline'],
    ['Good fit', 'Hotels and guest houses, restaurants, bookshops, uniform shops, pharmacies, grocers'],
    ['Seasons', 'Summer tourists and the school session, both tracked in sales reports'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Abbottabad ke hotels, restaurants, kitaabon aur uniform ki dukaanon ke liye Nafaa: room booking, bill, stock aur khata ek app me. Internet na ho to bhi bill bante hain.',
  trades: `## How Abbottabad trades, and where Nafaa fits

Abbottabad sits in the Orash Valley at about 1,250 metres, in the hills of the Hazara region. It is best known as a city of education: Ayub Medical College, a COMSATS campus, several well-known schools, and the Pakistan Military Academy at nearby Kakul. It is also the market town for its district and a stop for travellers heading to the Galyat, Nathia Gali and Ayubia, and further north on the Karakoram Highway.

- **Hotels and guest houses** keep a room board, bookings, housekeeping and weekend and seasonal rates, with food and extras posted to the room bill.
- **Restaurants and cafés** serving families and travellers run tables, kitchen tickets and takeaway, with a menu that can change by season.
- **Bookshops and stationers** keep titles by ISBN and textbooks by class and board, and prepare school book lists before each session.
- **Uniform and clothing shops** keep every uniform by size and colour, grouped by school, and handle the rush when term starts.
- **Pharmacies and clinics** around the medical college and hospitals track medicine batches, expiry dates and patient visits.
- **Grocers and bakeries** across Jinnahabad, Mandian and the cantonment sell on barcode and keep regular families on khata.`,
  markets: [
    { name: 'Main bazaar and Cantonment markets', note: 'The older shopping streets of the city, with clothing, shoes, general goods, bakeries and pharmacies.' },
    { name: 'Mansehra Road', note: 'A busy commercial road with hospitals, the medical college, pharmacies, food outlets and showrooms.' },
    { name: 'Nathia Gali road', note: 'Hotels, guest houses, restaurants and roadside shops serving travellers to the Galyat in the summer months.' },
  ],
  areas: [
    { name: 'Jinnahabad', note: 'A residential area with grocers, bakeries, salons and neighbourhood stores.' },
    { name: 'Mandian', note: 'A large residential and commercial area with clinics, pharmacies and general stores.' },
    { name: 'Kakul', note: 'The area around the Pakistan Military Academy, with shops and services for cadets, staff and families.' },
  ],
  local: `## Working conditions in Abbottabad

**Two peaks a year.** Summer brings travellers and full hotels; the start of each school session brings a rush for books, stationery and uniforms. Nafaa's sales reports by day and by product show what moved last year in each peak, so you can stock up in time.

**Weather and power.** Hill weather brings storms and snow that knock out power lines and internet, and PESCO load-shedding adds to it. Nafaa keeps the counter billing on the device and sends sales when the connection returns, so a guest checking out during a storm still gets a bill.

**Language.** Hindko is the most common mother tongue in Abbottabad, with Pashto and Urdu widely spoken, and English used in schools and hotels. Nafaa screens switch between Urdu and English, and support is in Urdu or English.

**Payments.** Travellers often pay by card or mobile wallet. The counter shows a JazzCash, Easypaisa or Raast QR for the exact amount, and one bill can be split across methods.`,
  shot: {
    heading: 'Rooms, guests and extras on one board',
    body: 'A guest house sees which rooms are free, booked or being cleaned. Meals and extras go to the room bill, and checkout prints one bill with everything on it.',
    id: SHOT.dashboard,
    url: 'app.nafaa.pk/dashboard',
    layout: 'split-right',
  },
  table: {
    heading: 'Abbottabad businesses and their busy seasons',
    caption: 'When common Abbottabad businesses are busiest and which Nafaa screens matter most then.',
    columns: [
      { key: 'peak', label: 'Busiest' },
      { key: 'screens', label: 'Screens that matter' },
    ],
    rows: [
      ['Hotel or guest house', 'Summer and long weekends', 'Room board, bookings, seasonal rates'],
      ['Restaurant', 'Summer evenings, holidays', 'Tables, kitchen tickets, split bills'],
      ['Bookshop', 'Start of the school session', 'Textbooks by class, school book lists'],
      ['Uniform shop', 'Start of term', 'Sizes and colours per school, reorder list'],
      ['Pharmacy', 'All year', 'Batches, expiry, salt search'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Abbottabad',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick hotel, restaurant, bookstore, garments or pharmacy.'],
      ['Set up rooms, menu or stock', 'Hotels add room types and rates; shops import their product list from Excel.'],
      ['Prepare for the next peak', 'Load the season\'s stock or rates before summer or the new term.'],
      ['Train the staff', 'A short video call for reception, cashiers and managers, in Urdu or English.'],
    ],
  },
  questions: `## Questions from Abbottabad businesses

### Can a guest house use Nafaa for rooms and the restaurant?
Yes. The hotel screens handle rooms, bookings and housekeeping, and meals and extras are posted to the room bill.

### Can a bookshop prepare book lists for each school?
Yes. Keep textbooks by class and board and build school book lists so a parent's whole list is billed at once.

### What happens if snow cuts the internet?
The counter keeps billing on the device and syncs once the connection is back.`,
  support:
    'Setup, data import and training happen remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Abbottabad; we help at your own counter.',
  pricingHeading: 'Plans for Abbottabad businesses',
  cta: { heading: 'Start billing in Abbottabad today', body: 'Try it free on the device you already use. Help on WhatsApp.' },
  faqKeys: ['offline', 'mp-pos-payments', 'pharmacy-expiry', 'garments-variants', 'devices', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:hotel', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:bookstore', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:clinic', kind: 'TAG' },
  ],
  evidence: ['apps/web/src/industries/hotel', 'apps/web/src/industries/restaurant', 'apps/web/src/industries/bookstore', 'apps/web/src/industries/garments', 'apps/web/src/industries/pharmacy'],
  sources: [wikipedia('Abbottabad', CHECKED), wikipedia('Pakistan Military Academy', CHECKED), wikipedia('Peshawar Electric Supply Company', CHECKED)],
  factCheckNote:
    'Orash Valley altitude, education institutions, PMA Kakul, tourism and transit role, the Galyat, and Hindko as the main mother tongue are from the Abbottabad Wikipedia article; PESCO serves Abbottabad. Market notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web (hotel rooms and folio, bookstore lists, garments variants, pharmacy).',
});
