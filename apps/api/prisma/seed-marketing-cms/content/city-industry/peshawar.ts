/**
 * Peshawar pair pages: restaurants (Namak Mandi food street behind Qissa
 * Khwani, karahi and tikka by the kilo, chai and qehwa houses), electronics
 * (Karkhano market in Hayatabad, including its slowdown after 2021) and
 * shoe shops (the Peshawari chappal). Facts come from Wikipedia and Dawn;
 * no shops or customers are named.
 */

import { type PairCopy, pair, src, wiki } from './_build';

const restaurant: PairCopy = {
  city: 'peshawar',
  cityName: 'Peshawar',
  industry: 'restaurant',
  title: 'Restaurant POS software in Peshawar',
  summary:
    'Nafaa is restaurant POS for Peshawar: karahi and tikka in half-kilo and kilo sizes, tickets for the grill and the karahi stove, family sections and takeaway on one screen, plate cost at today\'s meat and ghee rates, and a counter that keeps billing through power cuts. It suits a Namak Mandi grill or a chai and qehwa house.',
  seoDescription: 'Restaurant POS for Peshawar: karahi and tikka by kilo size, kitchen tickets per station, takeaway and family halls, meat cost per plate. Works offline.',
  focusKeyword: 'restaurant pos peshawar',
  sub: 'For the karahi and tikka house that weighs the meat in front of the customer, cooks it on one stove and serves it on charpoys, and for the qehwa house next door.',
  badges: ['Half kilo and kilo sizes', 'Tickets per station', 'Meat cost per plate'],
  facts: [
    ['Built for', 'Karahi and BBQ houses, chapli kebab counters, tea and qehwa houses, family restaurants'],
    ['Kitchen', 'Grill, karahi and tandoor tickets on a printer or kitchen screen'],
    ['Costing', 'Recipe cost at today\'s meat, ghee and flour rates'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Peshawar ke restaurant ke liye: karahi aur tikka kilo ke hisaab se, grill aur karahi ki KOT alag, family hall aur parcel ek screen par, aur gosht ya ghee mehnga ho to har plate ki Cost foran nazar aaye.',
  local: `## Eating out in Peshawar

Peshawar's food is built around meat cooked simply and in front of the customer. In the old city, the Namak Mandi food street sits behind the historic [Qissa Khwani Bazaar](https://en.wikipedia.org/wiki/Qissa_Khwani_Bazaar). On the third day of Eid in 2023, [Dawn reported](https://www.dawn.com/news/1749117) crowds sitting on charpoys there for chapli kebab, barbecue, mutton karahi, pulao and paye, with kehwa to finish. Qissa Khwani itself, once called "the Piccadilly of Central Asia", is known for its chai and qehwa houses.

The way people order here shapes the counter. Karahi and tikka are commonly ordered by weight: a half kilo or a kilo of mutton, chosen and weighed, then cooked on a single stove for that table. The price depends on the weight, the kind of meat and the day's rate. A bill written by hand has to get all three right while the cook is already working.

The menu is short, but the cost is concentrated. Mutton, beef, chicken, ghee and flour make up most of what a Peshawar grill spends, and their prices move often. A place that sets its per-kilo price once a year can find its best-selling dish earning far less than it thinks.

Many places run two kinds of trade at once: a busy takeaway counter for kebabs and naan, and a seated area or family hall where a table stays for an hour. Restaurant services in Khyber Pakhtunkhwa come under the [KPRA](/compliance/kpra-khyber-pakhtunkhwa); integration in Nafaa is optional and only needed if your restaurant is registered for it.`,
  shotA: {
    heading: 'The karahi stove sees its own tickets',
    body: 'Each menu category goes to its station. The karahi cook sees only karahi orders, with the size and the minutes since the ticket came in; the grill gets the tikka and kebabs. A ticket over 20 minutes turns red.',
  },
  work: `## A night at a Peshawar karahi house

**Before the rush.** Update the day's meat rates. Each dish's recipe is costed from them, so mutton karahi per kilo shows its plate cost and food cost percent before you open.

**Taking the order.** A table orders one kilo of mutton karahi, half a kilo of tikka, naan and salad. The karahi goes on the bill in its size, kilo or half kilo, at that size's rate, and add-ons such as extra green chillies or less salt are printed on the ticket for the cook.

**Takeaway.** Chapli kebab and naan for collection are taken in quick counter mode: the order gets a token, goes to the kitchen and is paid at once, so the takeaway queue does not wait behind the tables.

**Paying.** Families often split the bill or pay part in cash and part by wallet. Split the bill, merge tables that joined, and record cash, card, JazzCash or Easypaisa on one receipt.

**Closing late.** Set your business day to start in the early morning, so sales after midnight count toward the night they belong to. Close the cash register against the cash in the drawer.`,
  table: {
    heading: 'Peshawar restaurant jobs and the screen that takes them',
    caption: 'What slows a busy Peshawar grill, and how Nafaa handles it.',
    columns: ['On paper', 'In Nafaa'],
    rows: [
      ['Karahi ordered by the kilo', 'Weight and rate written by hand', 'Half kilo and kilo as sizes with their own rates'],
      ['One stove per table\'s order', 'Shouted across the kitchen', 'Ticket printed at the karahi station'],
      ['Meat price goes up', 'Price list changed months later', 'Plate cost updates from the new rate'],
      ['Takeaway queue', 'Waits behind the tables', 'Quick counter with token and payment'],
      ['Family pays in parts', 'Long sums at the counter', 'Split bill, cash and wallet on one receipt'],
    ],
  },
  shotB: {
    heading: 'Know what each plate costs today',
    body: 'The menu lists plate cost, food cost percent and how many plates the stock still covers. Dishes whose cost has crept up are marked, so you can change the per-kilo rate before the weekend.',
  },
  steps: {
    heading: 'Opening on Nafaa in Peshawar',
    items: [
      ['Send your menu', 'A photo of the rate board or a list on WhatsApp is enough to start.'],
      ['Set up dish sizes', 'Karahi and tikka in half kilo and kilo sizes, each with its rate.'],
      ['Name your stations', 'Karahi, grill, tandoor and tea, each with a printer or a kitchen screen.'],
      ['Train the counter', 'A short call for the cashier and waiters, in plain Urdu.'],
    ],
  },
  questions: `## Questions from Peshawar restaurant owners

### Can the price change with the quantity the customer picks?
Yes. Give a dish sizes such as quarter, half kilo and kilo, each with its own rate, and the bill follows the size ordered. When meat rates change, update the size prices once.

### We serve tea and qehwa all day. Can I give a cheaper afternoon rate?
Yes. Happy hours cut prices by time, day, dish or order type, and the counter applies them by itself.

### Power goes several times a day. Will billing stop?
No. Orders and bills keep working on the device without internet and sync when it returns. Keep the device charged or on a UPS.

### Do you have a guide to kitchen tickets?
See the guide to a [KOT system for restaurants](/blog/restaurant-kot-system-guide), the [restaurant page](/industries/restaurant) and [Peshawar](/pos-software/peshawar) for the other trades the same account covers.`,
  cta: {
    heading: 'Bring your Peshawar kitchen onto one screen',
    body: 'Start free with your own menu and rates. Setup help on WhatsApp.',
  },
  siblings: ['peshawar/electronics', 'peshawar/shoe', 'karachi/restaurant'],
  related: ['COMPLIANCE:kpra-khyber-pakhtunkhwa', 'BLOG_POST:restaurant-kot-system-guide'],
  faqKeys: ['restaurant-stations', 'restaurant-split', 'offline', 'pricing'],
  sources: [
    src('Food lovers throng Peshawar\'s Namak Mandi on Eid (25 Apr 2023)', 'https://www.dawn.com/news/1749117', 'Dawn'),
    wiki('Qissa Khwani Bazaar'),
    wiki('Peshawar'),
  ],
  factNote:
    'Namak Mandi food street behind Qissa Khwani, charpoys, and the dishes (chapli kebab, barbecue, mutton karahi, pulao, paye with kehwa) from Dawn, 25 Apr 2023. Qissa Khwani as "the Piccadilly of Central Asia" and its chai and qehwa houses from Wikipedia. Ordering karahi by weight is a widely known local practice, stated without counts. KPRA named once. URLs checked 26 Oct 2026. Product claims checked against the restaurant pack (stations, KOT display, modifiers, quick counter mode, recipes, happy hours, split payments) and core/lib/business-day.ts.',
};

const electronics: PairCopy = {
  city: 'peshawar',
  cityName: 'Peshawar',
  industry: 'electronics',
  title: 'Electronics shop POS in Peshawar',
  summary:
    'Nafaa is POS for Peshawar electronics shops: every TV, laptop and console kept by serial number, the exact unit scanned onto the bill, warranty claims opened from the serial, bundles with the saving worked out, and used units taken in trade. It suits a counter in Karkhano or a shop in the city, and works offline.',
  seoDescription: 'Electronics POS for Peshawar shops: serial-number stock, warranty claims, bundles, condition grades and trade-ins. Runs on your own devices, also offline.',
  focusKeyword: 'electronics shop pos peshawar',
  sub: 'For the electronics counter where sealed, open-box and used units sit on the same shelf at different prices, and every customer wants to know the warranty.',
  badges: ['Serial-number stock', 'Warranty claims', 'Condition grades'],
  facts: [
    ['Built for', 'Electronics, computer, gaming and household-goods shops'],
    ['Units', 'Serial, cost, condition and warranty for every costly item'],
    ['After the sale', 'Warranty check and claims from the serial'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Peshawar ki electronics dukaan ke liye: har TV, laptop ya console ka serial number, bill par wohi unit jo bika, warranty claim serial se, aur naya, open box ya purana maal alag Condition ke saath.',
  local: `## Electronics in Peshawar and the Karkhano market

The largest business area on Peshawar's western edge is [Karkhano](https://en.wikipedia.org/wiki/Karkhano), a market in Hayatabad close to the Khyber District and the road to Afghanistan. Set up in 1985, it grew into rows of shopping plazas selling electronics, shoes, clothing, household goods, cosmetics, toys, watches and video games. Prices there have been lower than in other commercial parts of the city, and buyers from Punjab have long come to buy goods to sell back home. In tax year 2018 the market was reported as the country's fourth-highest tax contributor.

Trade there has also changed. Wikipedia's article records a sharp fall in visitors after August 2021: higher transport costs, tighter border controls and weaker buying power left about half of the shops empty. Shops that remain have to keep tighter control of cash, stock and slow-moving items than they did in busier years.

What sits on an electronics shelf in Peshawar is mixed. A sealed TV from a distributor, an open-box console, a used laptop bought from a customer and a refurbished phone can all be on display at once. Each has a different cost and a different promise to the buyer, and the shop has to remember which unit carried which warranty if it comes back.

Customers from out of town make this harder. A buyer who drove in from another city and returns a month later with a fault expects you to find his bill quickly.`,
  shotA: {
    heading: 'Warranty claims from the serial number',
    body: 'Open a claim by scanning the unit\'s serial: the customer, the bill and the warranty left come up at once. Send it to repair or to the company, and close it as repaired, replaced, refunded or rejected.',
  },
  work: `## A week at a Peshawar electronics counter

**Stock in.** Enter each costly unit with its serial, the purchase bill and its cost. Add the specs that fit the product type, the warranty terms and what came in the box.

**Grading.** Mark each unit as brand new, open box, refurbished, used, damaged or for parts. The grade shows on the counter, so the cashier never sells a used laptop at the sealed price.

**At the counter.** Scan the serial and that exact unit goes on the bill, linked to the customer. Its warranty starts on the bill date.

**Trade-ins.** A customer brings an old console against a new one. Take it in at the price you agree; it enters stock at that cost and can be sold on later with its own grade.

**Bundles.** Put a TV with a soundbar, or a laptop with a bag and mouse, into a bundle at a deal price. The screen works out the saving for the customer and your profit as you set the price.

**Slow weeks.** Look at units that have sat longest and at the profit on each. In a market where footfall has fallen, knowing what is tying up cash matters more than ever.`,
  table: {
    heading: 'Electronics jobs in Peshawar: register or Nafaa',
    caption: 'What a register leaves to memory, and what the app keeps on record.',
    columns: ['With a register', 'With Nafaa'],
    rows: [
      ['Which unit went to which buyer', 'Serial copied by hand, if at all', 'Serial scanned on the bill, linked to the customer'],
      ['Warranty question months later', 'Customer looks for the card', 'Serial lookup shows bill and warranty left'],
      ['New, open box and used on one shelf', 'Price written on a sticker', 'Condition grade on every unit'],
      ['Buying a used unit in trade', 'Cash out, no record', 'Trade-in enters stock at the price paid'],
      ['Deal on two items', 'Discount worked out at the counter', 'Bundle with saving and profit shown'],
    ],
  },
  shotB: {
    heading: 'Bundles that move more than one item',
    body: 'Set a bundle price against the full price, see the stock of each item in it and how many bundles you can make, and the profit on each sale before you print the offer.',
  },
  steps: {
    heading: 'Setting up a Peshawar electronics shop',
    items: [
      ['Enter costly units first', 'TVs, laptops, consoles and appliances with serials and cost.'],
      ['Grade what is on display', 'New, open box, refurbished or used, so prices stay honest.'],
      ['Add accessories as normal items', 'Cables, mice and covers with barcodes, no serial needed.'],
      ['Print a test warranty slip', 'Check the receipt and warranty text on your printer.'],
    ],
  },
  questions: `## Questions from Peshawar electronics shops

### Do cheap accessories need serial numbers too?
No. Only costly units need a serial. Cables, chargers and covers are sold like any other item with a barcode.

### A buyer from Punjab returns with a fault. How do I find his bill?
Scan or type the serial. The unit shows who bought it, on which bill and how much warranty is left, and you can open a claim from there.

### Can I see what each unit cost me?
Yes. Every serial keeps its purchase bill and cost, and the profit report shows profit by product, brand and supplier.

### Can I keep cheaper used stock apart from new stock in reports?
Yes. The condition grade stays on every unit, so used, refurbished and open-box units are easy to tell apart from new stock when you review what sold and what is still sitting on the shelf.

### Do I need tax integration?
Most shops do not. Optional FBR/KPRA integration is there for a business that is required to report. See the [electronics page](/industries/electronics) and [Peshawar](/pos-software/peshawar) for the other trades on the same account.`,
  cta: {
    heading: 'Put every unit in your Peshawar shop on record',
    body: 'Free trial on the device you already use. Setup help on WhatsApp.',
  },
  siblings: ['peshawar/restaurant', 'lahore/electronics', 'faisalabad/electronics'],
  faqKeys: ['offline', 'khata-reminders', 'pricing'],
  sources: [wiki('Karkhano'), wiki('Peshawar')],
  factNote:
    'Karkhano (Hayatabad, near Khyber District, established 1985, goods sold, lower prices, buyers from Punjab, fourth-highest tax contributor in tax year 2018, fall in footfall after 2021 with about half the shops abandoned) from Wikipedia, opened 26 Oct 2026. Contraband mentioned in the source is not repeated; the copy says goods neutrally. No shops named. Product claims checked against the electronics pack (serials, warranty claims, bundles, condition grading in constants.ts, trade-in modal).',
};

const shoe: PairCopy = {
  city: 'peshawar',
  cityName: 'Peshawar',
  industry: 'shoe',
  title: 'Chappal and shoe shop POS in Peshawar',
  summary:
    'Nafaa is POS for Peshawar shoe and chappal shops: every article by size and colour with a barcode, the sizes that sell out first listed before Eid, exchanges taken on the original bill, and a WhatsApp message when a missing size is back. It fits a Peshawari chappal maker\'s counter or a family shoe store, and works offline.',
  seoDescription: 'POS for Peshawar shoe and chappal shops: sizes and colours with barcodes, size reorder before Eid, exchanges, WhatsApp size requests. Works offline.',
  focusKeyword: 'shoe shop pos peshawar',
  sub: 'Peshawari chappals in every size from boys to men, factory shoes beside them, and the Eid rush when size 9 runs out first.',
  badges: ['Size and colour', 'Size reorder', 'WhatsApp size requests'],
  facts: [
    ['Built for', 'Chappal makers\' counters, shoe stores and footwear wholesalers'],
    ['Stock', 'Every size and colour of an article as its own barcode'],
    ['Restocking', 'Size reorder list from the last 30 days of sales'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Peshawar ki chappal aur joote ki dukaan ke liye: har size aur rang ka alag barcode, Eid se pehle khatam hone wale size ki list, purane bill par exchange, aur size wapas aaye to gahak ko WhatsApp.',
  local: `## The Peshawari chappal and the shops that sell it

Peshawar gave its name to one of the most widely worn sandals in Pakistan. The [Peshawari chappal](https://en.wikipedia.org/wiki/Kheri_(footwear)), also called the kheri, is a traditional leather sandal worn by men with shalwar kameez, casually or for formal occasions, and it goes by many local names in different towns. It is a men's shoe first, so a chappal counter sells mostly in men's and boys' sizes, in a handful of leathers and colours.

That narrow range is exactly what makes stock difficult. A chappal shop rarely runs out of a design; it runs out of the two or three sizes most men wear, in the colour they want, right before Eid. Larger and smaller sizes sit on the shelf for months. Without counting every box, the owner learns about the gap when a customer is already walking away.

Many chappal sellers make their own stock or buy from small workshops, so a new batch arrives in uneven quantities: plenty in one size, a few in another. The shop needs to see the batch by size the moment it comes in.

Around both Eids, fathers buy matching pairs for sons, and the weeks after bring exchanges for pairs that pinch. A shop that also sells factory shoes has printed MRPs to keep track of as well.`,
  shotA: {
    heading: 'Which sizes to make or order next',
    body: 'The size reorder view checks the stock left against the last 30 days of sales for every size and colour, lists what to order article by article, and warns about sizes that sell but are already finished.',
  },
  work: `## How a Peshawar chappal counter runs

**A batch from the workshop.** Enter the article with its maker, article code and type, then tick the sizes and colours that came in, for example sizes 39 to 45 in brown and black. Each pair becomes a variant with its own barcode label.

**Men and boys.** Mark each article as Gents or Bachay, with its season. With sizes and types on record, the cashier checks the screen instead of digging through the stack.

**At the counter.** Scan the barcode and the right size and colour go on the bill. Payment can be cash, card or a wallet such as JazzCash or Easypaisa.

**The size you don't have.** Note a size request with the customer's phone number. When that size comes back from the workshop, the request is flagged and he gets a WhatsApp message.

**After Eid.** A boy's pair comes back a size small. Pick the original bill, take the pair back and give the next size. Only the difference changes hands, and past your exchange days the owner's or a manager's PIN is asked.

**Evening.** Open the size reorder list, decide what to ask the workshop for, and count the galla.`,
  table: {
    heading: 'Chappal shop jobs in Peshawar',
    caption: 'Where sales are lost on paper, and what Nafaa keeps instead.',
    columns: ['On paper', 'In Nafaa'],
    rows: [
      ['A batch in uneven sizes', 'Counted once, then forgotten', 'Pairs per size and colour, empty sizes in red'],
      ['Before Eid', 'Order the usual quantities', 'Size reorder list from real sales'],
      ['Customer\'s size finished', 'He goes to the next shop', 'Size request, WhatsApp when it is back'],
      ['Exchange after Eid', 'New bill and a calculator', 'Old pair back on the original bill'],
      ['Two counters in the bazaar', 'Phone the other shop', 'Stock per size in every branch'],
    ],
  },
  shotB: {
    heading: 'Every size a customer asked for',
    body: 'The request list shows each customer, the article, the size and the date. When stock arrives the request says so; close it as bought or not once the message has gone.',
  },
  steps: {
    heading: 'Moving a Peshawar chappal shop onto Nafaa',
    items: [
      ['Add your best-selling designs', 'Use the size grid and print barcode labels for the boxes.'],
      ['Check the size charts', 'Standard PK/UK, EU and US charts are there; add your own if your sizes run large.'],
      ['Set exchange days', 'Choose how long exchanges are allowed and who may approve a late one.'],
      ['Start billing', 'Scan and sell from the first day; the reorder list fills as sales come in.'],
    ],
  },
  questions: `## Questions from Peshawar shoe shops

### We make our own chappals. Can I record what the workshop sends?
Yes. Enter each batch as a purchase from your workshop as the supplier, with sizes and colours. Stock and cost go up by the right pairs.

### Can I keep the MRP on factory shoes?
Yes. The MRP stays on the article; when you sell below it, the item is marked Sale, and new arrivals are marked New.

### Can customers try a pair and come back later?
Yes. Note the size and article they liked as a size request with their phone number, even if the size is in stock elsewhere, and send them a message when it is ready at your counter. Requests that end in a sale are closed as bought, so you can see how many requests turned into sales.

### I sell from two places in the bazaar. Can I move pairs?
Yes. Each branch has its own stock per size, and pairs can be transferred between branches.

### Where can I read more?
See the [shoe shop page](/industries/shoe), [Peshawar](/pos-software/peshawar) for the other trades on the same account, and the [Multan khussa page](/pos-software/multan/shoe) for another footwear tradition.`,
  cta: {
    heading: 'Get your Peshawar shoe shop ready for Eid',
    body: 'Free trial on the phone or computer you already have. Setup help on WhatsApp.',
  },
  siblings: ['peshawar/restaurant', 'multan/shoe', 'lahore/shoe'],
  faqKeys: ['offline', 'khata-reminders', 'pricing'],
  sources: [wiki('Kheri (footwear)'), wiki('Peshawar')],
  factNote:
    'Peshawari chappal / kheri (traditional leather sandal, worn by men with shalwar kameez casually or formally, many local names) from Wikipedia, opened 26 Oct 2026. Workshop supply and Eid buying patterns described in general terms, without counts. No shops named. Product claims checked against the shoe pack (size grid, size reorder, size requests, exchanges with PIN, size charts, MRP and Sale marks) and inventory transfers.',
};

export const peshawarPairs: PairCopy[] = [restaurant, electronics, shoe];
export const peshawar = peshawarPairs.map(pair);
