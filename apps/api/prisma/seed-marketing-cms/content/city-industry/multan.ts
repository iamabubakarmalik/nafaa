/**
 * Multan pair pages: sweets and bakery shops (Multani sohan halwa, gift and
 * bulk orders, recipe cost on ghee, sugar and dry fruit) and shoe shops
 * (handmade Multani khussa next to factory footwear, Hussain Agahi as one of
 * the city's main markets). Facts come from Wikipedia, Dawn and APP; no
 * shops or customers are named.
 */

import { type PairCopy, pair, src, wiki } from './_build';

const bakery: PairCopy = {
  city: 'multan',
  cityName: 'Multan',
  industry: 'bakery',
  title: 'Bakery and sweets POS in Multan',
  summary:
    'Nafaa is POS for Multan bakeries and sweet shops: sell sohan halwa and mithai by the kilo, box or piece, take gift and wedding orders with an advance, plan each day\'s batches, and see recipe cost move with ghee, sugar and dry-fruit prices. Billing keeps running without internet.',
  seoDescription: 'Bakery and sweets POS for Multan: sohan halwa by kilo or box, gift and wedding orders with advance, daily baking plan, recipe cost and waste. Works offline.',
  focusKeyword: 'bakery pos multan',
  sub: 'For the mithai and bakery counter that sells sohan halwa by the kilo to walk-ins, packs boxes for visitors to carry home, and takes wedding orders weeks ahead.',
  badges: ['Sold by kilo or box', 'Gift and wedding orders', 'Recipe cost'],
  facts: [
    ['Built for', 'Sweet shops, halwa makers, bakeries and cake counters'],
    ['Selling', 'By the kilo, box, dozen or piece, each with its own rate'],
    ['Orders', 'Gift, office and wedding orders with event date and advance'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Multan ki mithai aur bakery ki dukaan ke liye: sohan halwa kilo ya dabbe me, shaadi aur tohfe ke order advance ke saath, roz ka banane ka plan, aur ghee, cheeni ya meve ka rate badle to har cheez ki Cost bhi saath badle.',
  local: `## Sweets that leave Multan in tins

Multan's best-known sweet travels. [Sohan halwa](https://en.wikipedia.org/wiki/Sohan_halwa) is a dense halwa made with milk, sugar and ghee and finished with almonds, pistachios and cardamom, and its Multani variety is among the most popular in Pakistani and especially Saraiki cooking. Traditional confectioners have produced it commercially for decades, usually as brittle discs or bite-size squares packed in decorated tin cylinders.

That packaging tells you how the trade works. A large share of what a Multan sweet shop sells is bought to be carried somewhere else: by families visiting relatives in Lahore or Karachi, by people travelling abroad, by offices sending boxes at the end of the year, and by wedding hosts who want a tin on every table. The same shop also sells fresh mithai, nimko and bakery items by weight across the counter, to people from the neighbourhood who come every few days.

So one counter handles three kinds of sale at once. Walk-in customers buy by the kilo or half kilo. Visitors buy ready boxes and tins in fixed sizes. Event customers place an order days or weeks in advance, pay part of it up front and expect a set quantity on a set date.

Behind the counter, the main costs are ghee, sugar, milk and dry fruit, and all four change price through the year. A rate that made sense in winter can leave little margin by the next wedding season if nobody recalculates it.`,
  shotA: {
    heading: 'Order advances on the customer\'s khata',
    body: 'A wedding host who pays half up front has that advance recorded against his name the day it comes in. The khata shows what is still to collect on every order, and a WhatsApp reminder goes out before the delivery date.',
  },
  work: `## A working week at a Multan sweet shop

**Every morning.** Open the day's plan. It adds the orders due today to the counter sale you usually make on that weekday, then takes off what is already fresh on the shelf, and tells the karigars how much halwa, barfi and cake to make. Goods sold by weight can be planned in decimals, such as 12.5 kg.

**At the counter.** One product can carry more than one unit and rate: per kilo for loose sale, per box of a fixed weight, per tin for gift packs. The cashier picks the unit and the bill uses that unit's price, so nobody works out half-kilo rates in their head.

**A wedding booking.** Record the event date, the number of guests, what goes in each box, delivery and setup, and the advance. A booked order with no advance is flagged, which is the one most likely to be cancelled late.

**Buying supplies.** Ghee, sugar, flour, milk powder and dry fruit are kept as raw materials, apart from the sweets you sell. Record goods received, waste and counts, and print a shopping list for the supplier when something runs low.

**Closing.** Record what was sold off cheap at the end of the day and what was thrown away, with the reason and its cost. Over a month that list shows which items you make too much of.`,
  table: {
    heading: 'Selling sweets in Multan: register or Nafaa',
    caption: 'The jobs a Multan sweet and bakery counter does every week.',
    columns: ['With a register', 'With Nafaa'],
    rows: [
      ['Halwa sold loose and in tins', 'One price list, worked out by weight', 'Kilo, box and tin as units with their own rates'],
      ['Wedding and office orders', 'A diary page with the advance noted', 'Order with date, guests, delivery and advance'],
      ['Ghee and sugar price rise', 'Margin noticed at month end', 'Recipe cost at today\'s rates, low margins flagged'],
      ['How much to make today', 'The karigar\'s guess', 'Orders due plus usual sale, less fresh stock'],
      ['Unsold and thrown away', 'Not written down', 'Waste recorded with reason and cost'],
    ],
  },
  shotB: {
    heading: 'See which sweets really earn',
    body: 'Profit by product and category, with recipe cost next to real profit. When dry fruit goes up, the items that earn under 20% are marked, so you can change a box price before the season instead of after it.',
  },
  steps: {
    heading: 'Setting up a Multan sweet shop on Nafaa',
    items: [
      ['List what you sell', 'Send the item list with prices per kilo, box and tin on WhatsApp, or in Excel.'],
      ['Enter recipes', 'Add the ghee, sugar, milk and dry fruit in each item so its cost is worked out.'],
      ['Add open orders', 'Enter bookings already taken, with their dates and advances.'],
      ['Print a test slip', 'Check the order slip for the customer and the kitchen on your printer.'],
    ],
  },
  questions: `## Questions from Multan sweet and bakery shops

### Can I sell the same halwa by the kilo and in a fixed tin?
Yes. Add the tin and the box as extra units of the item, each with its own price. Stock is kept in one place and goes down by the right weight.

### A customer wants 300 boxes for a wedding next month. How do I keep track?
Make it a bulk order with the event date, guest count, contents, delivery and setup. Take the advance on the order; it sits on the customer's khata until the final bill.

### We also bake cakes. Is that a separate system?
No. Custom cake orders sit next to mithai orders: size, flavour, cream, eggless or sugar-free, design photos and the message, with a slip for the customer and one for the kitchen.

### Does it keep working during load-shedding?
Yes. Bills are made on the device without internet and sync later. See the [bakery page](/industries/bakery), the guide to [reducing bakery wastage](/blog/reduce-bakery-wastage) and [Multan](/pos-software/multan) for the other trades the same account covers.`,
  cta: {
    heading: 'Run your Multan sweet shop from one screen',
    body: 'Start free on the phone or computer at your counter. Setup help on WhatsApp, in Urdu or English.',
  },
  siblings: ['multan/shoe', 'lahore/restaurant', 'peshawar/restaurant'],
  related: ['BLOG_POST:reduce-bakery-wastage'],
  faqKeys: ['bakery-bulk', 'bakery-costing', 'offline', 'pricing'],
  sources: [wiki('Sohan halwa'), wiki('Multan')],
  factNote:
    'Sohan halwa (ingredients, Multani variety popular in Pakistani and Saraiki cuisine, commercial production by traditional confectioners, discs or squares in tin cylinders) from Wikipedia, opened 26 Oct 2026. Gift, travel and wedding buying described as common practice, not as a measured share. No shops named. Product claims checked against the bakery pack: units with per-kg rates and decimal quantities (industries/bakery/components/meta.ts, BakeryProductEditor.tsx), production plan, raw materials, freshness and bulk orders.',
};

const shoe: PairCopy = {
  city: 'multan',
  cityName: 'Multan',
  industry: 'shoe',
  title: 'Shoe and khussa shop POS in Multan',
  summary:
    'Nafaa is POS for Multan shoe and khussa shops: every article by size and colour with its own barcode, handmade khussas kept by design and embroidery, a size reorder list before Eid and wedding season, exchanges on the old bill, and size requests answered on WhatsApp. It keeps billing without internet.',
  seoDescription: 'POS for Multan shoe and khussa shops: sizes and designs with barcodes, size reorder before Eid, exchanges, size requests on WhatsApp. Works offline.',
  focusKeyword: 'shoe shop pos multan',
  sub: 'Handmade Multani khussas next to factory shoes and sandals: every pair by size and design, every exchange on the old bill, every missing size noted with a phone number.',
  badges: ['Size and design grid', 'Size requests', 'Exchanges'],
  facts: [
    ['Built for', 'Khussa makers\' outlets, family shoe shops and footwear counters in the bazaars'],
    ['Stock', 'Size and colour or design per article, each with a barcode'],
    ['After the sale', 'Exchanges on the original bill and size requests on WhatsApp'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Multan ki joote aur khussay ki dukaan ke liye: har article ka size aur design alag barcode ke saath, Eid se pehle kaun se size khatam ho rahe hain, purane bill par exchange, aur jo size nahi mila us ka number likh kar WhatsApp par khabar.',
  local: `## Khussas and shoes in Multan

Multan gives its name to one of the best-known kinds of traditional footwear in the country. The [Multani khussa](https://en.wikipedia.org/wiki/Khussa_(footwear)) is handmade by local artisans, mostly from vegetable-tanned leather. Its upper is cut from one piece of leather or cloth and embroidered or decorated with brass nails, shells, mirrors, bells or beads, and the sole is stitched on with cotton thread. Sindhi, Multani and Punjabi khussas are all popular across Sindh and southern Punjab.

For a shop, handmade stock behaves differently from factory stock. Two pairs of the same design are rarely identical; colours and embroidery vary from batch to batch, and the maker may deliver twenty pairs this week and none the next. A shop that also sells factory sandals and school shoes has to keep both kinds straight on the same shelf.

Shoe trade in the city runs through its old bazaars. Hussain Agahi is regularly listed among Multan's main markets: Dawn reported in 2003 that it closed with the others during a traders' strike, and in a recent drive the district administration cleared encroachments from Hussain Agahi and Gardezi Market.

The busy weeks are predictable. Before both Eids and through the wedding season, khussas sell in pairs for the whole family, and the sizes customers want most are the first to run out.`,
  shotA: {
    heading: 'Sizes running out, before customers walk out',
    body: 'The size reorder list looks at the stock left and the last 30 days of sales for each size and colour, and warns about sizes that sell but are already finished. Turn it into an order for the maker or the factory.',
  },
  work: `## How a Multan shoe counter runs through the year

**When a batch arrives.** Enter the article once with its brand or maker, article code and type, then tick the sizes and colours or designs that came in. Every combination becomes its own variant with its own barcode to print and stick on the box.

**Gents, ladies and children.** Mark each article as Gents, Ladies or Bachay, with the season it belongs to. With sizes and types on record, a cashier checks the screen for a girl's size 2 khussa instead of opening every box.

**MRP and Sale.** Factory shoes often come with a printed MRP. Keep it, and when you sell below it the item is marked Sale; new arrivals are marked New.

**The customer who wants a size you don't have.** Write a size request with her phone number. When the size arrives, the request shows it, and she gets a WhatsApp message.

**After Eid.** A pair bought for a child comes back a size too small. Pick the original bill, take back the old pair and give the new one; only the difference changes hands. Past your exchange days, the owner's or a manager's PIN is asked.`,
  table: {
    heading: 'Khussa and shoe jobs in Multan',
    caption: 'Where a paper system loses sales, and what the app keeps instead.',
    columns: ['Without a system', 'In Nafaa'],
    rows: [
      ['Handmade designs in many sizes', 'Boxes opened one by one', 'Pairs per size and design, empty sizes in red'],
      ['Eid and wedding season stock', 'Ordered from memory', 'Size reorder list from real sales'],
      ['Size not available', 'Customer leaves and is forgotten', 'Size request and a WhatsApp message later'],
      ['Exchange after Eid', 'New bill and a calculator', 'Old pair back on the original bill, difference only'],
      ['Factory shoes with MRP', 'Stickers over the price', 'MRP kept, Sale marked when lower'],
    ],
  },
  shotB: {
    heading: 'A list of every size customers asked for',
    body: 'Each request shows what the customer wants, the size and the date. When stock comes in the request is flagged, and you close it as bought or not after the message goes out.',
  },
  steps: {
    heading: 'Moving a Multan shoe shop onto Nafaa',
    items: [
      ['Add your main articles', 'Use the size grid for each design and print barcode labels.'],
      ['Set your size charts', 'Standard PK/UK, EU and US charts are there; add your own for makers whose sizes run small.'],
      ['Choose exchange rules', 'Set the exchange days and who may approve a late exchange.'],
      ['Train the counter', 'A short call on WhatsApp for the staff before the Eid rush.'],
    ],
  },
  questions: `## Questions from Multan shoe shops

### Every handmade pair is a little different. Can I still use barcodes?
Yes. Keep each design as an article and each size as a variant with its own barcode. If two batches differ in colour or embroidery, add them as separate colours or designs.

### I have a second shop in another bazaar. Can I check sizes there?
Yes. An article shows pairs per size in this branch and in every other branch, and you can move pairs between branches.

### Can I see which designs carried the season?
Yes. The profit report breaks sales down by product, category, brand or supplier, so after Eid you can see which khussa designs and which factory articles earned, and which only sat in their boxes. That list is a better guide for the next order to the maker than memory.

### Do I need tax integration?
Most small shoe shops do not. Optional FBR/PRA integration is there for a business that is required to report.

### Where can I read more?
See the [shoe shop page](/industries/shoe), [Multan](/pos-software/multan) for the other trades the same account covers, and the [Peshawar shoe page](/pos-software/peshawar/shoe) for another city's footwear trade.`,
  cta: {
    heading: 'Get your Multan shoe shop ready for the next Eid',
    body: 'Free trial on the device you already have, with setup help on WhatsApp.',
  },
  siblings: ['multan/bakery', 'lahore/shoe', 'peshawar/shoe'],
  faqKeys: ['offline', 'khata-reminders', 'pricing'],
  sources: [
    wiki('Khussa (footwear)'),
    src('Traders go on strike against US attacks (9 Apr 2003)', 'https://www.dawn.com/news/93066', 'Dawn'),
    src('Commissioner orders removal of encroachments from markets', 'https://www.app.com.pk/domestic/commissioner-orders-removal-of-encroachments-from-markets/', 'Associated Press of Pakistan'),
  ],
  factNote:
    'Multani khussa (handmade, vegetable-tanned leather, one-piece embroidered upper, cotton-thread sole, varieties popular in Sindh and southern Punjab) from Wikipedia. Hussain Agahi named only as one of Multan\'s main markets: Dawn 9 Apr 2003 (closed during traders\' strike) and APP (encroachments cleared from Hussain Agahi and Gardezi Market; year not printed on the page, so the copy says "a recent drive"). URLs checked 26 Oct 2026. No claim about what Hussain Agahi sells. Product claims checked against the shoe pack (size grid, size reorder, size requests, exchanges with PIN, size charts, transfers).',
};

export const multanPairs: PairCopy[] = [bakery, shoe];
export const multan = multanPairs.map(pair);
