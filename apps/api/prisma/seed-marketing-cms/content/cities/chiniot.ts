/**
 * Chiniot city hub (26 Oct 2026). A city on the Chenab known for carved
 * wooden furniture, Umar Hayat Mahal and its old mosques, with sugar mills
 * and farming around it. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichChiniot = cityHub({
  slug: 'chiniot',
  name: 'Chiniot',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Chiniot furniture showrooms and workshops, timber and hardware dealers, grocers and bakeries. It runs on the phone or computer you have, tracks custom orders with deposits and karigar work, and keeps billing through power cuts.',
  hero: {
    sub: 'Chiniot\'s carved furniture is sold across Pakistan. Nafaa runs the showroom side: made-to-order pieces against a deposit, karigar workloads, long-distance deliveries and customers who pay in parts.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    badges: ['Custom orders with deposit', 'Karigar workload', 'Deliveries'],
  },
  facts: [
    ['Runs on', 'Any phone, tablet or computer with a browser; offline billing included'],
    ['Good fit', 'Furniture showrooms and workshops, timber and hardware dealers, grocers, bakeries'],
    ['Orders', 'Custom pieces with deposit, karigar, due date and delivery'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Chiniot ke furniture showrooms aur karkhano ke liye Nafaa: order par bana furniture, advance, karigar ka kaam aur delivery ek app me, aur khata bhi saath.',
  trades: `## How Chiniot trades, and where Nafaa fits

Chiniot stands on the Chenab and has been a centre of woodwork for centuries; timber from Kashmir was once floated down the river to its workshops. Its craftsmen carve flowers and geometric patterns into beds, chairs, doors and chests, and Chinioti furniture is sold in showrooms across the country. The city is also known for its architecture, including the Umar Hayat Mahal and its old mosques, and for farming and sugar milling in the district around it.

Nafaa does not plan workshop production. It runs the showroom, the orders and the money around the furniture trade:

- **Furniture showrooms with workshops** take custom orders against a deposit, record the design and due date, track each karigar's workload, and deliver with assembly, alongside ready pieces sold off the floor.
- **Timber, plywood and hardware dealers** sell to workshops by size and piece, with contractor and bulk rates, quotations and delivery challans.
- **Polish, paint and fittings shops** keep items by shade and size and supply workshops on account.
- **Grocers, bakeries and pharmacies** in the city's bazaars use the barcode counter, stock and khata.`,
  markets: [
    { name: 'Furniture showrooms and workshops', note: 'Rows of showrooms and the workshops behind them, selling carved and modern furniture to buyers from across the country.' },
    { name: 'Timber and hardware trade', note: 'Dealers supplying wood, ply, fittings, polish and tools to the furniture workshops.' },
    { name: 'City centre bazaars', note: 'Cloth, utensils, sweets and general goods in the old shopping streets near the historic buildings.' },
  ],
  areas: [
    { name: 'Old city', note: 'Narrow streets around Umar Hayat Mahal and the old mosques, with small shops and workshops.' },
    { name: 'Faisalabad Road and Sargodha Road', note: 'Showrooms, dealers, a sugar mill and roadside businesses along the main roads.' },
    { name: 'Residential neighbourhoods', note: 'Kiryana stores, milk shops and tailors selling to families on khata.' },
  ],
  local: `## Working conditions in Chiniot

**Orders that take weeks.** A carved bed or dining set can take weeks in the workshop. Nafaa keeps every order with the design notes, the deposit, the karigar and the promised date, so the showroom can answer a customer's call without searching through a register.

**Buyers from other cities.** Many customers order from Lahore, Karachi or abroad and pay in parts. Each customer has a khata, every payment is recorded against the order, and the final balance shows on the delivery bill.

**Power.** Chiniot is supplied by FESCO, and load-shedding still interrupts work. The showroom counter keeps billing on the device without internet and syncs later.

**Language.** Punjabi is the everyday language of Chiniot's markets, with Urdu used in writing. Nafaa screens show in Urdu or English, and support is in Urdu or English.`,
  shot: {
    heading: 'Ready pieces and custom orders together',
    body: 'The showroom sees ready stock on the floor next to custom orders still in the workshop, each with its deposit, karigar and due date.',
    id: SHOT.inventory,
    url: 'app.nafaa.pk/products',
    layout: 'split-left',
  },
  table: {
    heading: 'A custom furniture order in Nafaa, step by step',
    caption: 'How a Chiniot showroom records an order from deposit to delivery.',
    columns: [
      { key: 'record', label: 'What Nafaa records' },
      { key: 'who', label: 'Who sees it' },
    ],
    rows: [
      ['Order taken', 'Design, size, wood, price, deposit, due date', 'Owner, sales staff'],
      ['Work assigned', 'Karigar and workload', 'Owner, workshop manager'],
      ['Customer pays more', 'Payment against the order in the khata', 'Owner, cashier'],
      ['Ready and delivered', 'Delivery details, final bill with balance', 'Owner, delivery team, customer'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Chiniot',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and pick furniture, hardware or kiryana.'],
      ['Add ready stock', 'List the pieces on your showroom floor with prices.'],
      ['Enter open orders', 'Add each custom order with its deposit, karigar and due date.'],
      ['Add your karigars', 'Record who works on what so you can see each one\'s workload.'],
    ],
  },
  questions: `## Questions from Chiniot businesses

### Can I track custom furniture orders with a deposit?
Yes. Each order keeps its design, deposit, karigar and due date, and the balance shows on the delivery bill.

### Can customers in other cities pay in parts?
Yes. Payments are recorded in their khata against the order until it is cleared.

### Does Nafaa plan workshop production?
No. It records orders, karigar workload, stock and payments. Bills of materials and work orders are on the roadmap.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Chiniot; we help at your own counter.',
  pricingHeading: 'Plans for Chiniot businesses',
  cta: { heading: 'Start billing in Chiniot today', body: 'Try it free on your phone or computer. Help on WhatsApp.' },
  faqKeys: ['offline', 'mp-manufacturing-scope', 'mp-khata-limit', 'mp-inventory-import', 'devices', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:furniture', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'SOLUTION:manufacturing', kind: 'RELATED' },
  ],
  evidence: ['apps/web/src/industries/furniture', 'apps/web/src/industries/hardware'],
  sources: [wikipedia('Chiniot', CHECKED), wikipedia('Omar Hayat Mahal', CHECKED), wikipedia('Faisalabad Electric Supply Company', CHECKED)],
  factCheckNote:
    'Chenab location, the woodwork tradition and Kashmir timber, carved furniture, Umar Hayat Mahal, mosques and sugar mills are from the Chiniot Wikipedia article; FESCO serves Chiniot. Market and area notes kept general. No customer, office or shop-count claims. Product claims checked in apps/web (furniture custom orders, karigar workload, deliveries).',
});
