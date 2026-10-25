/**
 * Wah Cantt city hub (26 Oct 2026). A planned cantonment on the GT Road
 * built around the ordnance factories, with township markets, Mughal Gardens
 * Wah and one of the highest literacy rates in the country. No shop counts,
 * no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichWahCantt = cityHub({
  slug: 'wah-cantt',
  name: 'Wah Cantt',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Wah Cantt township stores, bookshops and stationers, pharmacies, bakeries, salons and restaurants. It runs on the phone or computer you already have, bills without internet when the connection drops, and keeps regular families on a digital khata.',
  hero: {
    sub: 'Wah Cantt is a planned town of townships, schools and salaried families. Nafaa runs the shops in its circular markets and along the GT Road: grocery counters, book and uniform rushes, medicine expiry and monthly khata.',
    media: { id: SHOT.lowStock, url: 'app.nafaa.pk/inventory/low-stock' },
    badges: ['Monthly family khata', 'School-season stock', 'Bills offline'],
  },
  facts: [
    ['Runs on', 'The phone, tablet or computer you already have; offline billing included'],
    ['Good fit', 'Township grocers, bookshops and stationers, pharmacies, bakeries, salons, restaurants'],
    ['Credit', 'Families on monthly khata, settled when salaries arrive'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Wah Cantt ki township markets ke kiryana stores, kitaabon aur stationery ki dukaanon, medical stores aur bakeries ke liye Nafaa: bill, stock aur mahine ka khata ek app me.',
  trades: `## How Wah Cantt trades, and where Nafaa fits

Wah Cantt grew around the ordnance workshops opened here in 1951, and it remains a planned cantonment town on the Grand Trunk Road, about 30 kilometres north-west of Islamabad and Rawalpindi. Its townships were built with markets at their centre, circular in design with a park in the middle and shops around it. The town is known for one of the highest literacy rates in Pakistan, for the Mughal Gardens at Wah where Jahangir is said to have given the place its name, and for one of the country's oldest cement plants, set up in 1921.

Most customers are salaried families, so trade follows the pay cycle and the school year.

- **Township grocers and general stores** sell from barcodes and keep families on a monthly khata that is cleared after pay day.
- **Bookshops and stationers** keep textbooks by class and board, build school book lists and stock up before each session.
- **Uniform and clothing shops** keep sizes and colours for each school.
- **Pharmacies** track batches and expiry, search by salt and suggest substitutes.
- **Bakeries, salons and restaurants** in the markets and along the GT Road use the bakery, salon and restaurant screens.`,
  markets: [
    { name: 'Township circular markets', note: 'The planned markets at the centre of the townships, with a park in the middle and grocers, bakeries, pharmacies and tailors around it.' },
    { name: 'GT Road commercial strip', note: 'Showrooms, restaurants, fuel stations and dealers along the Grand Trunk Road through the town.' },
    { name: 'Mughal Gardens Wah', note: 'The historic gardens and the food stalls and small shops that serve weekend visitors.' },
  ],
  areas: [
    { name: 'Lalarukh and the other townships', note: 'Residential townships, Lalarukh among them (still often called Basti), with their own markets, schools and clinics.' },
    { name: 'Taxila side', note: 'Neighbouring Taxila with its museum and archaeological sites, sharing trade and customers with Wah.' },
    { name: 'Factory areas', note: 'The ordnance and industrial areas whose staff make up a large share of local shoppers.' },
  ],
  local: `## Working conditions in Wah Cantt

**Pay-day trade.** Many families shop on account through the month and settle after salaries arrive. Nafaa's khata keeps each family's bills and payments, sets a limit, and sends a one-tap WhatsApp reminder from your number at month end.

**School seasons.** With so many schools, the start of each session brings a rush for books, stationery and uniforms. Product-wise sales reports from last year show what to stock and when, and the low-stock list flags sizes and titles that are running out.

**Power and internet.** Wah is supplied by IESCO. Outages are usually short, but internet faults still happen at busy times. Nafaa keeps billing on the device and syncs later.

**Language.** Urdu and Punjabi are spoken across the town, with Pashto and Hindko common among families from the north. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'See what is running out before the rush',
    body: 'The low-stock list shows every product, size or title below its reorder level, so a stationer or uniform shop orders before the new session starts.',
    id: SHOT.lowStock,
    url: 'app.nafaa.pk/inventory/low-stock',
    layout: 'split-left',
  },
  table: {
    heading: 'A Wah Cantt shop\'s month and year',
    caption: 'When common Wah Cantt businesses are busiest and what Nafaa helps with.',
    columns: [
      { key: 'when', label: 'Busiest' },
      { key: 'helps', label: 'What helps in Nafaa' },
    ],
    rows: [
      ['Township grocer', 'After pay day', 'Monthly khata, WhatsApp reminders'],
      ['Bookshop and stationer', 'Start of the school session', 'Textbooks by class, school book lists'],
      ['Uniform shop', 'Start of term', 'Sizes and colours, low-stock list'],
      ['Pharmacy', 'All year', 'Batches, expiry, salt search'],
      ['Restaurant on the GT Road', 'Evenings and weekends', 'Tables, kitchen tickets, wallet QR'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Wah Cantt',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick your trade.'],
      ['Bring the monthly khata across', 'Add each family with this month\'s balance and a limit.'],
      ['Load stock', 'Import products, titles or sizes from Excel.'],
      ['Close the first month', 'Send reminders after pay day and check who has settled.'],
    ],
  },
  questions: `## Questions from Wah Cantt businesses

### Can families settle their khata once a month?
Yes. Every bill is added to the family's khata, and payments after pay day clear it.

### Can a bookshop prepare lists for each school?
Yes. Keep textbooks by class and board and build school book lists so a whole list is billed at once.

### Do I need internet all the time?
No. The counter bills offline and syncs when the connection returns.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Wah Cantt; we help at your own counter.',
  pricingHeading: 'Plans for Wah Cantt businesses',
  cta: { heading: 'Start billing in Wah Cantt today', body: 'Try it free on your phone or computer. Help on WhatsApp.' },
  faqKeys: ['khata-reminders', 'mp-khata-limit', 'pharmacy-salt', 'garments-variants', 'offline', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:bookstore', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:salon', kind: 'TAG' },
  ],
  evidence: ['apps/web/src/industries/bookstore', 'apps/web/src/industries/pharmacy', 'apps/web/src/industries/garments', 'apps/web/src/modules/inventory/low-stock'],
  sources: [wikipedia('Wah Cantonment', CHECKED), wikipedia('Wah Gardens', CHECKED), wikipedia('Islamabad Electric Supply Company', CHECKED)],
  factCheckNote:
    'Ordnance workshops from 1951, GT Road location and distance from Islamabad-Rawalpindi, circular township markets, literacy rate, Mughal Gardens and the 1921 cement plant are from the Wah Cantonment Wikipedia article; IESCO serves the area. No customer, office or shop-count claims. Product claims checked in apps/web.',
});
