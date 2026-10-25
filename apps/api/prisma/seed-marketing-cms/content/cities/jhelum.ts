/**
 * Jhelum city hub (26 Oct 2026). The "City of Soldiers" on the Jhelum River
 * and the GT Road, near Rohtas Fort and Mangla Dam, with tobacco, wood,
 * marble, glass and flour industries and an old city of narrow bazaars.
 * No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichJhelum = cityHub({
  slug: 'jhelum',
  name: 'Jhelum',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Jhelum bazaar shops, wood and marble dealers, building material suppliers, grocers and GT Road restaurants. It runs on the phone or computer you already have, bills without internet, and keeps contractor and family credit in a digital khata.',
  hero: {
    sub: 'Jhelum sits where the GT Road crosses the river, with an old city of narrow bazaars and new houses going up around it. Nafaa runs its counters: building materials by size, wood and marble by the foot, and families on khata.',
    media: { id: SHOT.pos, url: 'app.nafaa.pk/pos' },
    badges: ['Contractor and site khata', 'Quotations to bills', 'Bills offline'],
  },
  facts: [
    ['Runs on', 'The phone, tablet or computer you already have; offline billing included'],
    ['Good fit', 'Hardware and building material shops, wood and marble dealers, grocers, restaurants, garment shops'],
    ['Credit', 'Contractors by site, families by month, each with a limit'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Jhelum ke hardware, lakri aur marble dealers, kiryana stores aur GT Road ke restaurants ke liye Nafaa: bill, stock, contractor ka khata aur quotation ek app me.',
  trades: `## How Jhelum trades, and where Nafaa fits

Jhelum stands on the west bank of the Jhelum River where the Grand Trunk Road crosses it. It is often called the City of Soldiers, because so many men from the district have served in the army, and the Sher Shah Suri-era Rohtas Fort and the Mangla Dam are both nearby. The city has a tobacco factory and wood, marble, glass and flour mills, and its old city is a maze of narrow streets and bazaars. Many families have relatives working abroad, and new houses keep going up around the city.

- **Hardware and building material shops** keep items by size and shade, give contractor and bulk rates, turn quotations into bills and send delivery challans to each site.
- **Wood and marble dealers** sell by the piece and the foot, and keep contractor accounts with credit limits.
- **Grocers and general stores** in the old city and the cantonment sell from barcodes and keep families on monthly khata.
- **Garment and shoe shops** keep stock by size and colour for the Eid and wedding rush.
- **Restaurants and food stops** on the GT Road run tables, kitchen tickets and takeaway for travellers.`,
  markets: [
    { name: 'Old city bazaars', note: 'Narrow streets of cloth, utensils, jewellery and general goods shops in the historic core of the city.' },
    { name: 'GT Road', note: 'Restaurants, fuel stops, showrooms and building material dealers along the Grand Trunk Road and near the river bridge.' },
    { name: 'Wood and marble trade', note: 'Dealers and mills selling timber, marble and stone to builders and contractors.' },
  ],
  areas: [
    { name: 'Jhelum Cantonment', note: 'Planned markets with general stores, bakeries and clothing outlets serving families and staff.' },
    { name: 'New housing areas', note: 'Fast-growing residential areas with hardware dealers, pharmacies and grocers.' },
    { name: 'Roads to Rohtas Fort and Mangla', note: 'Food stops and small shops serving visitors to the fort and the dam.' },
  ],
  local: `## Working conditions in Jhelum

**House building.** Much of the local spending goes into new houses, often paid for from abroad. Hardware, wood and marble dealers sell to contractors who run several sites at once. Each site can have its own khata under the contractor, with challans for every delivery, so the final account matches what was sent.

**Quotations first.** Builders and families usually ask for a quotation before ordering. Nafaa turns an accepted quotation into a bill without retyping it.

**Power.** Jhelum is supplied by IESCO, and outages still interrupt work. The counter keeps billing on the device without internet and syncs later.

**Language.** Punjabi and Urdu are spoken across Jhelum, with Pashto among some traders. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'A counter for sizes, shades and contractor rates',
    body: 'Pick the item, the size and the shade, and the counter uses the retail, contractor or bulk rate for that customer. The bill can go to the contractor\'s site khata.',
    id: SHOT.pos,
    url: 'app.nafaa.pk/pos',
    layout: 'split-left',
  },
  table: {
    heading: 'Building-trade sellers in Jhelum',
    caption: 'How the businesses that supply Jhelum\'s house building set up Nafaa.',
    columns: [
      { key: 'sells', label: 'Sells by' },
      { key: 'buyers', label: 'Main buyers' },
      { key: 'nafaa', label: 'Nafaa setup' },
    ],
    rows: [
      ['Hardware shop', 'Piece, size, shade', 'Contractors, homeowners', 'Contractor rates, site khata, challans'],
      ['Wood dealer', 'Piece and foot', 'Carpenters, contractors', 'Units, quotations, credit limits'],
      ['Marble dealer', 'Piece and foot', 'Contractors, homeowners', 'Units, quotations, delivery challans'],
      ['Paint and sanitary shop', 'Size and shade', 'Contractors, painters', 'Shades as variants, contractor khata'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Jhelum',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick hardware, kiryana or garments.'],
      ['Load items with sizes and rates', 'Import from Excel, with retail, contractor and bulk rates.'],
      ['Add contractors and their sites', 'Enter each contractor, their sites and opening balances.'],
      ['Send your first quotation', 'Make a quotation and turn it into a bill when the customer confirms.'],
    ],
  },
  questions: `## Questions from Jhelum businesses

### Can I give a contractor a separate account for each site?
Yes. The hardware screens keep sites under each contractor, each with its own khata and challans.

### Can a quotation become a bill?
Yes. An accepted quotation turns into a bill without typing it again.

### Can I keep retail, contractor and bulk rates?
Yes. Each item can carry those rates, and the counter uses the right one for the customer.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Jhelum; we help at your own counter.',
  pricingHeading: 'Plans for Jhelum businesses',
  cta: { heading: 'Start billing in Jhelum today', body: 'Try it free on your phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'mp-wholesale-prices', 'mp-khata-limit', 'mp-inventory-import', 'devices', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
  ],
  evidence: ['apps/web/src/industries/hardware', 'apps/web/src/industries/garments', 'apps/web/src/industries/restaurant'],
  sources: [wikipedia('Jhelum', CHECKED), wikipedia('Rohtas Fort', CHECKED), wikipedia('Mangla Dam', CHECKED), wikipedia('Islamabad Electric Supply Company', CHECKED)],
  factCheckNote:
    'River and GT Road location, the City of Soldiers nickname, Rohtas Fort, Mangla Dam, the industries and the old city bazaars are from the Jhelum Wikipedia article; the overseas community is widely reported general knowledge; IESCO serves Jhelum. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web (hardware contractor sites, rates, quotations, challans).',
});
