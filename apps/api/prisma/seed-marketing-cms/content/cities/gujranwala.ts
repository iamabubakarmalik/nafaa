/**
 * Gujranwala city hub, deep copy (26 Oct 2026). An industrial city on the
 * GT Road known for fans, sanitary fittings, cutlery and metal goods, with a
 * rice-growing belt around it and a strong food culture. No office or HQ is
 * named (owner decision O4 is still open). No shop counts, no named customers.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichGujranwala = cityHub({
  slug: 'gujranwala',
  seoDescription: 'POS, stock and khata software for Gujranwala appliance showrooms, hardware dealers and rice traders, with serial numbers, warranties and qist plans.',
  name: 'Gujranwala',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Gujranwala appliance and fan showrooms, sanitary and hardware dealers, rice traders, restaurants and grocers. It runs on the phone or computer you have, keeps serial numbers, warranties and qist plans, and keeps billing through GEPCO outages.',
  hero: {
    sub: 'For the showrooms and dealers along the GT Road: fans and appliances by serial number, sanitary fittings by size and shade, contractor rates, instalments and rice by the bag, from one app.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    badges: ['Serial and warranty', 'Qist plans', 'Contractor rates'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; billing continues offline'],
    ['Good fit', 'Appliance and fan showrooms, hardware and sanitary dealers, rice traders, restaurants, grocers'],
    ['Instalments', 'Qist plans with a guarantor, and a khata for every customer'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Gujranwala ke appliance showrooms, sanitary dealers aur chawal ke traders ke liye Nafaa: serial number, warranty, qist aur contractor rate ek app me. Bijli jaye to bhi bill bante hain.',
  trades: `## How Gujranwala trades, and where Nafaa fits

Gujranwala sits on the Grand Trunk Road between Lahore and the cities of the north, and is one of Punjab's main industrial centres. It is known for electric fans, sanitary fittings, cutlery, metal goods and other engineering work, much of it made in small and medium workshops. The farmland around the city is part of Punjab's rice belt. The city is also famous for its food, from early-morning breakfasts to late-night grills.

Nafaa does not plan factory production. It covers the selling side: showrooms, dealers, retail counters and the stock and credit behind them.

- **Appliance and fan showrooms** record each unit by serial number with its warranty, sell on qist with a guarantor, take old appliances in trade and handle installations and brand warranty claims.
- **Hardware and sanitary dealers** keep fittings by size and shade, give retail, contractor and bulk rates, turn quotations into bills and send delivery challans to sites.
- **Rice and grain traders** sell by the bag and kilogram with wholesale rates and keep each buyer's balance and limit.
- **Restaurants and food outlets** run tables, kitchen tickets and delivery from one screen.
- **Kiryana stores and pharmacies** in the city's colonies sell from barcodes and keep households on khata.`,
  markets: [
    { name: 'GT Road showrooms', note: 'A long stretch of fan, appliance, furniture and sanitary showrooms, many of them selling goods made in and around the city.' },
    { name: 'Old city bazaars', note: 'Dense markets inside the old city for cloth, utensils, general goods and wholesale trade.' },
    { name: 'Grain and rice markets', note: 'Wholesale markets where rice and other produce from the surrounding district are traded by the bag and truckload.' },
    { name: 'Hardware and sanitary markets', note: 'Clusters of shops selling pipes, fittings, taps, tiles and tools to contractors and homeowners.' },
  ],
  areas: [
    { name: 'Satellite Town', note: 'Residential and commercial blocks with restaurants, bakeries, pharmacies and general stores.' },
    { name: 'Model Town', note: 'Neighbourhood markets with grocers, clothing shops and salons that know their regular customers.' },
    { name: 'DC Road and Sialkot Road', note: 'Commercial roads with showrooms, banks, hardware dealers and food outlets.' },
    { name: 'Industrial areas', note: 'Workshops and factories with the suppliers, dealers and transporters that serve them.' },
  ],
  local: `## Working conditions in Gujranwala

**Power.** Gujranwala's electricity comes from GEPCO, and load-shedding is part of the working day in many areas, especially in summer. Nafaa does not need the internet to bill. Sales are kept on the device and sent to your account when the connection is back.

**Selling on instalments.** Fans, coolers, washing machines and refrigerators are often sold on qist, especially before summer. Nafaa splits the balance into monthly due dates, keeps the guarantor on the plan and records each payment against it, so the showroom no longer needs a separate qist register.

**Contractors and sites.** Sanitary and hardware dealers sell to contractors who run several sites at once. Each site can have its own khata under the contractor, with challans for every delivery, so the bill at the end of the job matches what was sent.

**Language.** Punjabi is the everyday language of Gujranwala's markets, with Urdu used for writing. Nafaa screens show in Urdu or English, and support chats are in Urdu or English.`,
  shot: {
    heading: 'Every fan and appliance by serial number',
    body: 'A showroom enters each unit with its serial number and warranty. At sale, the serial goes on the bill, so a warranty claim months later starts from the right unit, customer and date.',
    id: SHOT.inventory,
    url: 'app.nafaa.pk/products',
    layout: 'split-right',
  },
  table: {
    heading: 'Gujranwala trades and the Nafaa screens that fit',
    caption: 'Which Nafaa industry screens suit common Gujranwala businesses. Every plan includes the counter, stock and khata.',
    columns: [
      { key: 'screens', label: 'Nafaa screens' },
      { key: 'credit', label: 'Credit and payment' },
    ],
    rows: [
      ['Fan and appliance showroom', 'Appliances: serials, warranty, installation', 'Qist with guarantor, trade-ins'],
      ['Sanitary and hardware dealer', 'Hardware: sizes, shades, quotations, challans', 'Contractor and site khata'],
      ['Rice trader', 'Kiryana units: bag and kilogram', 'Wholesale rates, buyer credit limits'],
      ['Restaurant', 'Tables, kitchen tickets, riders', 'Split bills, wallet QR'],
      ['Grocery store', 'Barcode counter, low-stock list', 'Household khata, WhatsApp reminders'],
    ],
  },
  steps: {
    heading: 'Setting up a Gujranwala showroom or dealer',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and choose appliances, hardware or kiryana.'],
      ['Load stock with serials or sizes', 'Import your list from Excel; showrooms add serial numbers as units arrive.'],
      ['Move running qist and khata across', 'Enter each customer\'s remaining instalments and each contractor\'s balance.'],
      ['Train the counter staff', 'A short video call for salesmen and cashiers, in Urdu or English.'],
    ],
  },
  questions: `## Questions from Gujranwala businesses

### Can I sell fans and appliances on qist?
Yes. The appliance screens take a down payment, split the rest into monthly due dates, and keep the guarantor's details with the plan.

### Can a contractor have separate accounts for each site?
Yes. Hardware dealers can keep sites under a contractor, each with its own khata and delivery challans.

### Does Nafaa run my workshop or factory production?
No. Nafaa covers selling, purchasing, stock and khata. Bills of materials and work orders for general manufacturing are on the roadmap.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English, at your own counter.',
  pricingHeading: 'Plans for Gujranwala businesses',
  cta: {
    heading: 'Start billing in Gujranwala today',
    body: 'Try it free on the device you already use. Help on WhatsApp.',
  },
  faqKeys: ['offline', 'mp-wholesale-prices', 'mp-khata-limit', 'mp-manufacturing-scope', 'mp-inventory-import', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:appliances', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
    { ref: 'SOLUTION:manufacturing', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/appliances',
    'apps/web/src/industries/hardware',
    'apps/web/src/industries/restaurant',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
  ],
  sources: [wikipedia('Gujranwala', CHECKED), wikipedia('Gujranwala Electric Power Company', CHECKED)],
  factCheckNote:
    'Gujranwala\'s GT Road location, engineering industries (fans, sanitary fittings, cutlery, metal goods), rice belt and GEPCO as the utility are public facts (Wikipedia). No office or HQ named (O4 open). No customer or shop-count claims. Product claims checked in apps/web (appliance serials, qist, trade-ins; hardware contractor sites and challans).',
});
