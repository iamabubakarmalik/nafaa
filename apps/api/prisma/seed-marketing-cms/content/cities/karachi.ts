/**
 * Karachi city hub, deep copy (26 Oct 2026). Port-city trade: commodity
 * wholesale around Jodia Bazaar, the Saddar electronics and mobile markets,
 * clothing on Tariq Road and in Bohri Bazaar, and restaurants from Burns Road
 * to Clifton. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichKarachi = cityHub({
  slug: 'karachi',
  seoDescription: 'POS, stock and khata software for Karachi shops, wholesalers and restaurants. Billing keeps going through K-Electric outages and credit stays in one khata.',
  name: 'Karachi',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Karachi shops, wholesalers and restaurants. It bills on the phone or computer at your counter, keeps working through K-Electric outages and weak signal, and keeps trade credit and customer udhaar in one digital khata.',
  hero: {
    sub: 'From commodity dealers near Jodia Bazaar to mobile counters in Saddar and cafés in Clifton: one app for bills, cartons, IMEI stock and udhaar, built to keep billing when the power or the signal goes.',
    media: { id: SHOT.pos, url: 'app.nafaa.pk/pos' },
    badges: ['Bills during outages', 'Carton and wholesale rates', 'JazzCash and Easypaisa QR'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; the counter keeps billing offline'],
    ['Good fit', 'Wholesale dealers, kiryana stores, mobile and electronics shops, clothing shops, restaurants'],
    ['Payments', 'Cash, card, JazzCash, Easypaisa, bank transfer and khata, also split on one bill'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Karachi ke wholesale dealers, dukaanon aur restaurants ke liye Nafaa: bill, carton stock aur khata ek app me. K-Electric ki bijli jaye ya signal kamzor ho, counter chalta rehta hai.',
  trades: `## How Karachi trades, and where Nafaa fits

Karachi is Pakistan's largest city and its main port, so a large share of the country's imported goods, from spices and dry fruit to mobile phones and electrical items, passes through its wholesale markets before it reaches shops upcountry. That shapes how many businesses here sell: in bulk, on credit, to traders who come back every week.

- **Commodity and kiryana wholesalers** in the Jodia Bazaar belt sell by the bag, carton and kilogram. Nafaa keeps a retail and a wholesale price on each product, a price for each unit, and a khata with a credit limit for every trade buyer.
- **Mobile and electronics counters** in Saddar record each handset by IMEI, note its PTA status, take used phones in trade and sell on qist, using the mobile shop screens.
- **Clothing and fabric shops** on Tariq Road, in Bohri Bazaar and in Hyderi Market keep stock by size and colour, take stitching orders and hold items for customers who pay in parts.
- **Restaurants and food streets** such as Burns Road and the Clifton strips run tables, kitchen tickets and riders from one screen, with Foodpanda and website orders next to dine-in.
- **Neighbourhood stores and pharmacies** in Gulshan, North Nazimabad and the DHA phases sell from barcodes, keep regulars on khata and send balances on WhatsApp.`,
  markets: [
    { name: 'Jodia Bazaar', area: 'Old City', note: 'One of the country\'s largest wholesale markets for spices, dry fruit, pulses, rice, sugar and other commodities, where goods move by the bag and the truckload and most trade buyers run an account.' },
    { name: 'Saddar electronics and mobile markets', area: 'Saddar', note: 'Plazas around Abdullah Haroon Road and Regal Chowk packed with mobile phone, accessory, computer and electronics dealers selling both retail and to smaller shops.' },
    { name: 'Bohri Bazaar and Zainab Market', area: 'Saddar', note: 'Narrow lanes of fabric, ready-made clothing, linen and household shops that are busiest before Eid and the wedding season.' },
    { name: 'Tariq Road', area: 'PECHS', note: 'A long shopping street of clothing, shoe, jewellery and cosmetics outlets, many of them branded stores with card and wallet payments.' },
    { name: 'Hyderi Market', area: 'North Nazimabad', note: 'A neighbourhood bazaar for clothing, footwear, bangles and eateries that draws families from across District Central.' },
    { name: 'Urdu Bazaar and Paper Market', note: 'The book, stationery and printing trade, where publishers and wholesalers supply schools and smaller bookshops.' },
    { name: 'Burns Road', area: 'Saddar', note: 'An old food street known for nihari, haleem, rabri and other Karachi dishes, with late-night crowds and fast takeaway turnover.' },
  ],
  areas: [
    { name: 'Clifton and DHA', note: 'Cafés, restaurants, supermarkets, salons and boutiques along the main avenues and commercial lanes, with a lot of delivery and card payment.' },
    { name: 'Gulshan-e-Iqbal and Gulistan-e-Jauhar', note: 'Dense residential blocks with bakeries, kiryana stores, pharmacies and mobile shops on almost every main road.' },
    { name: 'North Nazimabad and Federal B Area', note: 'Established markets and family businesses, many of them selling to the same customers on khata for years.' },
    { name: 'Korangi and SITE', note: 'The main industrial areas, where factory outlets, distributors and suppliers sell to trade customers in bulk.' },
  ],
  local: `## Working conditions in Karachi

**Power.** Karachi is supplied by K-Electric, and load-shedding still runs by feeder, longer in some neighbourhoods than others. Nafaa runs in the browser and keeps the counter billing when the router goes off with the power. Sales wait on the device and send themselves to your account when the connection returns, so the evening report still adds up.

**Signal in old markets.** Mobile data drops inside the tall plazas of Saddar and the crowded lanes of the old city. Because billing does not wait for the internet, a dealer can keep cutting bills from a phone on a weak 4G signal and let the sync catch up later.

**Many languages at the counter.** Urdu is the common language of Karachi's markets, with Sindhi, Pashto, Punjabi, Gujarati, Memoni and Balochi spoken by traders and customers too. Nafaa's screens switch between Urdu and English, so a cashier who reads either can run the counter, and your support chat can be in Urdu or English.

**Payments.** Karachi customers pay in cash, by card and more and more by mobile wallet. The counter shows a JazzCash, Easypaisa or Raast QR, and one bill can be split between cash, wallet and the customer's khata.`,
  shot: {
    heading: 'Wholesale and retail on the same counter',
    body: 'A Jodia Bazaar dealer can sell a carton to a trader at the wholesale rate and a single packet to a walk-in at the retail rate, from the same product list. The khata records what each trade buyer owes and stops a bill that would cross their credit limit until a manager approves it.',
    id: SHOT.khata,
    url: 'app.nafaa.pk/customers/khata',
    layout: 'split-left',
  },
  table: {
    heading: 'Karachi trades and the Nafaa setup that suits them',
    caption: 'What to switch on first for common Karachi businesses. Every plan includes the counter, stock and khata.',
    columns: [
      { key: 'where', label: 'Typical location' },
      { key: 'first', label: 'Set up first' },
      { key: 'then', label: 'Add later' },
    ],
    rows: [
      ['Commodity wholesaler', 'Jodia Bazaar, Boulton Market', 'Units by bag and carton, wholesale price, trade khata', 'Credit limits, supplier bills'],
      ['Mobile phone dealer', 'Saddar plazas', 'IMEI stock, PTA status, warranty', 'Used phone buying, qist plans'],
      ['Fabric and clothing shop', 'Bohri Bazaar, Tariq Road', 'Size and colour variants, barcodes', 'Stitching orders, layaway'],
      ['Restaurant or takeaway', 'Burns Road, Clifton', 'Tables, kitchen tickets, menu', 'Riders, Foodpanda orders'],
      ['Neighbourhood store', 'Gulshan, North Nazimabad', 'Barcode billing, khata', 'WhatsApp reminders, low-stock list'],
    ],
  },
  steps: {
    heading: 'Moving a Karachi business onto Nafaa',
    intro: 'Most of the work is getting your product list and old balances in; the rest takes an afternoon.',
    items: [
      ['Open a free trial at the counter', 'Sign up on the phone or computer you bill from. Pick your trade so the right screens open.'],
      ['Bring in stock and trade balances', 'Send your product list as an Excel file, or photos of the register, on WhatsApp. Opening balances for each trade buyer go into the khata.'],
      ['Set units and two price lists', 'Add the carton, bag or dozen for each product with its own price, plus a wholesale rate where you sell to shops.'],
      ['Run a day, then add the team', 'Bill for a day yourself, check the closing report, then give cashiers their own logins with only the rights they need.'],
    ],
  },
  questions: `## Questions from Karachi businesses

### Do I need anything special for K-Electric outages?
No extra software. Keep the billing device charged or on a UPS, as you would for a light. If the router goes down, the counter keeps billing and syncs when it comes back. A laptop or a phone on mobile data is enough.

### Can traders from other cities buy on account?
Yes. Add each upcountry buyer as a khata customer with a credit limit. Their balance, every bill and every payment stay in one ledger, and one tap sends them a WhatsApp reminder of the balance before their next visit.

### Do Karachi restaurants need SRB integration?
Restaurants in Sindh deal with the Sindh Revenue Board for sales tax on services, and [sales tax on services](/glossary/sales-tax-on-services) explains how SRB and the other provincial authorities tax them. Nafaa has an optional tax integration; whether your restaurant must use one depends on your registration, so confirm with your tax adviser first.`,
  support:
    'Setup, data import and training happen remotely on WhatsApp and video calls, in Urdu or English. There is no Nafaa office in Karachi; the team works with you from your own counter.',
  pricingHeading: 'Plans for Karachi businesses',
  cta: {
    heading: 'Start billing in Karachi today',
    body: 'Try it free on the phone or computer at your counter. Setup help on WhatsApp.',
  },
  faqKeys: ['offline', 'mp-wholesale-prices', 'mp-khata-limit', 'mobile-imei', 'mp-pos-payments', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:mobile-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
    { ref: 'PRODUCT:offline-pos', kind: 'RELATED' },
    { ref: 'COMPLIANCE:srb-sindh', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/mobile',
    'apps/web/src/industries/garments',
    'apps/web/src/industries/restaurant',
    'apps/web/src/modules/pos/components/PosUnitPickerModal.tsx',
    'apps/web/src/modules/customers/khata/api/customer-ledger.api.ts',
    'apps/web/src/app/shell/navigation/nav-config.ts',
  ],
  sources: [
    wikipedia('Karachi', CHECKED),
    wikipedia('Jodia Bazaar', CHECKED),
    wikipedia('K-Electric', CHECKED),
    wikipedia('Burnes Road', CHECKED),
  ],
  factCheckNote:
    'City facts (largest city, main port, K-Electric as the utility, languages spoken) and market notes are general public knowledge, see the Wikipedia sources. No customer, office or shop-count claims. Product claims checked in apps/web (offline queue, khata credit limit, wallet QR, IMEI, units, online channels). No SRB rate is stated.',
});
