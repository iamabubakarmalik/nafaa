/**
 * Sialkot pair page: sports goods shops. Sialkot is a sports-goods export
 * city; this page is written for the shops that sell kit, bats, balls and
 * team orders, and says plainly that Nafaa is shop software, not factory or
 * export production software. Facts from Wikipedia; no firms or customers
 * are claimed as users.
 */

import { type PairCopy, pair, wiki } from './_build';

const sports: PairCopy = {
  city: 'sialkot',
  cityName: 'Sialkot',
  industry: 'sports',
  title: 'Sports shop POS in Sialkot',
  summary:
    'Nafaa is POS for Sialkot sports shops: team and school kit orders with each player\'s name, number and size, the advance on the team\'s khata, a team rate at quantity, kits and shoes in sizes, and a repair desk for bats, rackets and balls. It is shop software for the counter, and works offline.',
  seoDescription: 'Sports shop POS for Sialkot: team kit orders with names and numbers, team rates, sizes, repair desk and khata for clubs and schools. Works offline.',
  focusKeyword: 'sports shop pos sialkot',
  sub: 'In a city that makes sports goods for the world, the local shop still sells to clubs, schools and walk-in players: kit orders, team rates, sizes and repairs in one app.',
  badges: ['Team orders', 'Team rate', 'Repair desk'],
  facts: [
    ['Built for', 'Sports shops, kit suppliers to clubs and schools, factory outlet counters'],
    ['Orders', 'Kit lines with sizes and printing, plus each player\'s name and number'],
    ['Not for', 'Factory production, export documents or buyer compliance'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Sialkot ki sports dukaan ke liye: school aur club ki kit ka order har khilari ke naam, number aur size ke saath, team ka advance khata me, team rate, aur bat ya racket ki repair ka record. Ye dukaan ka software hai, factory ka nahi.',
  local: `## Sialkot, the sports-goods city

Few cities are as closely tied to one trade. [Sialkot](https://en.wikipedia.org/wiki/Sialkot) has been called the football manufacturing capital of the world and is credited with producing over 70% of the world's footballs. Its sports-goods makers grew from supplying British troops before independence, helped by nearby timber, and have since made goods for global brands. Balls for the 2014, 2018 and 2022 FIFA World Cups were made by [Forward Sports](https://en.wikipedia.org/wiki/Forward_Sports), a Sialkot company.

The industry is not in one district. Wikipedia notes that the sporting-goods firms are spread throughout the city rather than clustered in a single zone, with factories along the main roads, and that most of the output is made for export. Exporters use the [Sialkot Dry Port](https://en.wikipedia.org/wiki/Sialkot_Dry_Port) for quick access to customs. Along with Gujranwala and Gujrat, the city is part of the industrial "Golden Triangle" of northern Punjab.

This page is about a different part of that economy: the local shops. Sialkot's own clubs, schools, colleges and street teams need kits, balls, bats, gloves and shoes like any other city, and they buy them from shops that also stock local brands and surplus from nearby makers. Those shops take orders for whole teams, sell single items to walk-in players and repair what gets broken during the season.

To be clear about scope: Nafaa runs the shop. It does not plan factory production, track export orders or produce shipping documents.`,
  shotA: {
    heading: 'Repairs booked with an estimate and an advance',
    body: 'A bat handle to replace, a racket to restring or a ball to stitch is booked against the customer\'s phone with the work, the charge, any advance and photos at intake. The list shows what is pending, ready or late.',
  },
  work: `## How a Sialkot sports shop runs a season

**A school orders kits.** The sports teacher wants 15 kits. Add the shirt and shorts lines with sizes, the rate and the printing per piece, then each player's name, number and size. Print the order for the printer who does the names.

**Team rate.** Set a team rate with a minimum quantity. When a counter line reaches that quantity, it moves to the team rate by itself, so the cashier does not need to ask the owner.

**The advance.** The school pays part up front. The advance goes on the school's khata, and nothing leaves stock until the order is delivered.

**Delivery.** When the kits are ready, deliver the order. The bill is made at that moment, stock goes down, and the advance is already counted. Whatever is unpaid stays on the khata with a WhatsApp reminder when it is due.

**Walk-in players.** Kits and shoes are sold by size, each size with its own barcode and stock. Bats, balls and gloves carry their sport, type and age group, with Sale, New and Pro marks and a brand list for filters and reports.`,
  table: {
    heading: 'Team and shop jobs in Sialkot',
    caption: 'The work a local sports shop does, and where Nafaa keeps it.',
    columns: ['On paper', 'In Nafaa'],
    rows: [
      ['Player names and numbers', 'A handwritten list for the printer', 'On the order with sizes, printed from there'],
      ['School pays in parts', 'A receipt slip', 'Advance on the team\'s khata, counted at delivery'],
      ['Price for a full team', 'Worked out each time', 'Team rate applied by itself at the quantity'],
      ['Kits and shoes by size', 'Boxes counted to find a medium', 'Stock per size, each with a barcode'],
      ['Bat and racket repairs', 'Paper tag, advance remembered', 'Job with estimate, advance, photos and status'],
    ],
  },
  shotB: {
    heading: 'Every club and school on its khata',
    body: 'Teams pay over the season. Every advance and delivery bill lands on the team\'s khata, so you can see which club still owes for last season\'s kits and remind them politely on WhatsApp.',
  },
  steps: {
    heading: 'Setting up a Sialkot sports shop on Nafaa',
    items: [
      ['Add your stock', 'Kits and shoes with sizes, then bats, balls and gloves with brands.'],
      ['Set team rates', 'Choose the minimum quantity and the rate for each kit item.'],
      ['Enter open team orders', 'Add pending school and club orders with their advances.'],
      ['Open the repair desk', 'Set the repair services you offer and their usual charges.'],
    ],
  },
  questions: `## Questions from Sialkot shops

### We are a factory. Can we use Nafaa?
For your factory outlet or retail counter, yes: billing, stock, khata and team orders. For production planning, export orders, buyer audits and shipping documents, Nafaa is not the right tool, and we would rather say so now.

### Can I sell to another shop at a wholesale rate?
Yes. Use team rates for quantity sales, and keep each trade buyer on the khata with what they owe.

### Can I print kits with names before the bill is made?
Yes. The order holds the names and sizes and can be printed for the printer. The bill is only made when the order is delivered.

### Can I sell single footballs and full match-ball sets?
Yes. A ball can be sold singly or in a set at its own price, and team orders can carry the balls along with the kits for one delivery and one bill.

### Does it work when the internet is down?
Yes. The counter bills without internet and syncs later. See the [sports shop page](/industries/sports), [Sialkot](/pos-software/sialkot) for the other trades on the same account, and the [Gujranwala hardware page](/pos-software/gujranwala/hardware) for a neighbouring industrial city.`,
  cta: {
    heading: 'Run your Sialkot sports shop from one screen',
    body: 'Free trial on the phone or computer at your counter. Setup help on WhatsApp.',
  },
  siblings: ['gujranwala/hardware', 'gujranwala/appliances', 'lahore/shoe'],
  faqKeys: ['devices', 'offline', 'khata-reminders', 'pricing'],
  sources: [wiki('Sialkot'), wiki('Forward Sports'), wiki('Sialkot Dry Port')],
  factNote:
    'Sialkot as "football manufacturing capital of the world", over 70% of footballs, origin in supplying British troops with nearby timber, firms spread throughout the city along main roads, mostly export, Golden Triangle with Gujranwala and Gujrat, and the Dry Port, from Wikipedia (Sialkot; Sialkot Dry Port). Forward Sports making the 2014, 2018 and 2022 World Cup balls from Wikipedia (Forward Sports). Opened 26 Oct 2026. Forward Sports is cited as a public fact only, not as a Nafaa user. Product claims checked against the sports pack (team orders, team rate, repairs, sizes, brands).',
};

export const sialkotPairs: PairCopy[] = [sports];
export const sialkot = sialkotPairs.map(pair);
