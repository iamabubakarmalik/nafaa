/**
 * Peshawar city hub, deep copy (26 Oct 2026). Old-city bazaars (Qissa
 * Khwani, Andar Shehr), Namak Mandi's meat restaurants, the Karkhano goods
 * markets, and the dry fruit and carpet trade with Afghanistan. No shop
 * counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichPeshawar = cityHub({
  slug: 'peshawar',
  name: 'Peshawar',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Peshawar restaurants, meat shops, jewellers, dry fruit and carpet dealers, and electronics traders. It runs on the phone or computer at the counter, keeps billing when the power or network fails, and keeps trade credit in a digital khata.',
  hero: {
    sub: 'From the karahi houses of Namak Mandi to the gold lanes of Andar Shehr and the goods markets on Jamrud Road: billing, weight-based sales, gold rates and trade credit for Peshawar businesses.',
    media: { id: SHOT.tables, url: 'app.nafaa.pk/restaurant/tables' },
    badges: ['Sell by weight', 'Daily gold rate', 'Bills without internet'],
  },
  facts: [
    ['Runs on', 'The phone, tablet or computer you have; the counter works offline'],
    ['Good fit', 'Restaurants, butchers, jewellers, dry fruit and carpet dealers, electronics and mobile shops'],
    ['Weights and rates', 'Sell by the kilo at today\'s rate; set the gold rate each morning'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Peshawar ke restaurants, qasai, sunar aur dry fruit dealers ke liye Nafaa: kilo ke hisaab se bill, aaj ka rate, aur trade ka khata ek app me. Bijli ya network jaye to bhi bill bante hain.',
  trades: `## How Peshawar trades, and where Nafaa fits

Peshawar is one of the oldest living cities in South Asia and has been a trading post on the route to Afghanistan and Central Asia for centuries. That history still shows in its bazaars: dry fruit, carpets, gemstones and imported goods change hands next to everyday grocery and clothing trade, and much of the selling happens between traders who know each other well.

- **Restaurants and tikka houses** around Namak Mandi and University Road run tables, kitchen tickets and takeaway, and price meat dishes by weight where the customer chooses the cut.
- **Butchers and meat suppliers** set the day's rate, sell by weight, record animals bought from the mandi and supply restaurants on account.
- **Jewellers** in Andar Shehr set the gold and silver rate each morning, keep each piece with its weight and stones, buy back old gold and track karigar work.
- **Dry fruit dealers** sell by the kilo and the bag, keep wholesale and retail rates, and run trade credit with buyers from other cities.
- **Carpet and rug sellers** keep each roll's length in stock and price cut pieces by the square foot.
- **Electronics and mobile traders** record serial numbers and IMEIs, warranty claims and used-item condition.`,
  markets: [
    { name: 'Qissa Khwani Bazaar', area: 'Old City', note: 'The storytellers\' bazaar, a historic market street with dry fruit, tea, sweets, cloth and general goods shops.' },
    { name: 'Andar Shehr', area: 'Old City', note: 'The jewellery bazaar of the walled city, where gold and silver are priced by the day\'s rate and sold by weight.' },
    { name: 'Namak Mandi', area: 'Old City', note: 'Known across the country for lamb karahi, tikka and other meat dishes cooked to order, often sold by the kilo.' },
    { name: 'Karkhano Market', area: 'Jamrud Road', note: 'Large markets near the city\'s western edge selling electronics, cloth, crockery and imported goods, retail and wholesale.' },
    { name: 'Chowk Yadgar', area: 'Old City', note: 'A central square surrounded by cloth, footwear and general goods shops and the city\'s money changers.' },
  ],
  areas: [
    { name: 'Saddar', note: 'The cantonment shopping district with clothing, shoes, bakeries, pharmacies and restaurants.' },
    { name: 'University Town', note: 'Cafés, restaurants, bookshops and salons serving students, families and offices.' },
    { name: 'Hayatabad', note: 'A large planned township with supermarkets, pharmacies and food outlets, and an industrial estate on its edge.' },
    { name: 'Gulbahar', note: 'Older residential blocks with kiryana stores, tailors and neighbourhood markets that sell on khata.' },
  ],
  local: `## Working conditions in Peshawar

**Power and network.** Peshawar's electricity comes from PESCO, and load-shedding in many feeders is long, while mobile data in the old city is patchy and has at times been suspended across the city. Nafaa does not wait for the internet to bill. Sales stay on the device and go to your account when the connection returns.

**Weight and rate selling.** Meat, dry fruit and gold all sell by weight at a rate that changes. The counter asks for the weight and works out the price at the rate you set for the day, so cashiers do not calculate by hand.

**Language.** Pashto is the main language of Peshawar, Hindko is spoken in the old city, and Urdu is used for writing and in most offices. Nafaa screens show in Urdu or English, and the support team works in Urdu or English.

**Trade with other cities.** Dry fruit, carpet and goods dealers here sell to buyers from across the country, often on account. Each buyer gets a khata with a credit limit, and the balance can be sent as a WhatsApp reminder in one tap before their next order.`,
  shot: {
    heading: 'Tables and kitchen tickets for busy evenings',
    body: 'A Peshawar restaurant opens a table, adds karahi by weight, tikka and naan, and the order goes to the kitchen as a ticket. The bill can be split between friends and paid by cash or wallet.',
    id: SHOT.tables,
    url: 'app.nafaa.pk/restaurant/tables',
    layout: 'split-left',
  },
  table: {
    heading: 'Selling by weight and rate in Peshawar',
    caption: 'Trades that price by weight or by a daily rate, and how Nafaa handles each.',
    columns: [
      { key: 'how', label: 'How it is priced' },
      { key: 'nafaa', label: 'In Nafaa' },
    ],
    rows: [
      ['Butcher', 'Per kilo at today\'s rate', 'Set the rate; the weight sets the price'],
      ['Jeweller', 'Gold rate by weight, plus making', 'Daily gold and silver rate, piece weights'],
      ['Dry fruit dealer', 'Per kilo, retail and wholesale', 'Weight sale with two price levels'],
      ['Carpet seller', 'Per square foot', 'Roll length in stock, size calculator'],
      ['Restaurant', 'Karahi by the kilo, other dishes fixed', 'Menu items by weight or by plate'],
    ],
  },
  steps: {
    heading: 'Starting with Nafaa in Peshawar',
    items: [
      ['Open a free trial', 'Sign up on your phone or computer and choose your trade.'],
      ['Set today\'s rates', 'Butchers set the meat rate, jewellers the gold rate, dry fruit dealers the rate per kilo.'],
      ['Add trade buyers', 'Enter regular buyers with their opening balance and a credit limit.'],
      ['Connect a scale or printer when ready', 'Start with the phone alone; add a receipt printer or scale later.'],
    ],
  },
  questions: `## Questions from Peshawar businesses

### Can I bill when mobile internet is suspended?
Yes. Billing does not need a connection. Sales wait on the device and sync when the internet is restored.

### Does Nafaa handle the daily gold rate?
Yes. Set the gold and silver rate each morning, and pieces are priced by their weight at that rate.

### Can I sell meat and dry fruit by the kilo?
Yes. The counter takes the weight and prices it at the rate you set.`,
  support:
    'Setup, data import and training are done remotely on WhatsApp and video calls, in Urdu or English. Nafaa has no office in Peshawar; we work with you at your own counter.',
  pricingHeading: 'Plans for Peshawar businesses',
  cta: {
    heading: 'Start billing in Peshawar today',
    body: 'Try it free on the device you already have. Help on WhatsApp.',
  },
  faqKeys: ['offline', 'restaurant-split', 'mp-wholesale-prices', 'mp-pos-hardware', 'mobile-imei', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:meat', kind: 'TAG' },
    { ref: 'INDUSTRY:jewelry', kind: 'TAG' },
    { ref: 'INDUSTRY:carpet', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/restaurant',
    'apps/web/src/industries/meat',
    'apps/web/src/industries/jewelry',
    'apps/web/src/industries/carpet',
    'apps/web/src/industries/electronics',
    'apps/web/src/modules/pos/components/PosWeighModal.tsx',
    'apps/web/src/core/hardware',
  ],
  sources: [wikipedia('Peshawar', CHECKED), wikipedia('Qissa Khwani Bazaar', CHECKED), wikipedia('Peshawar Electric Supply Company', CHECKED)],
  factCheckNote:
    'Peshawar history, bazaars, languages and PESCO as the utility are public facts (Wikipedia); mobile data suspensions in Peshawar have been widely reported. Market notes describe what each place is known for; no customer, office or shop-count claims. Product claims checked in apps/web (weight sale, meat and jewellery rates, carpet rolls, tables and KOT, IMEI).',
});
