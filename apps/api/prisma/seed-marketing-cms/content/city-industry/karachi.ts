/**
 * Karachi pair pages: kiryana (Jodia Bazaar and Empress Market), restaurants
 * (Burnes Road and the city's food streets) and clothing (Saddar's old
 * bazaars, the Mithadar and Kharadar textile markets, Tariq Road).
 * Mobile and electronics stay as one page (mobile shops on Abdullah Haroon
 * Road); a separate electronics page would repeat it.
 */

import { type PairCopy, pair, src, wiki } from './_build';

const kiryana: PairCopy = {
  city: 'karachi',
  cityName: 'Karachi',
  industry: 'kiryana',
  title: 'Kiryana POS software in Karachi',
  summary:
    'Nafaa is POS, stock and khata software for Karachi kiryana and grocery stores. It sells by the piece, dozen or bag, keeps each regular customer\'s udhaar with WhatsApp reminders, shows what to reorder before the next trip to Jodia Bazaar, and keeps billing when the internet or power goes.',
  seoDescription: 'Kiryana POS for Karachi grocery stores: sell by piece or bag, digital khata with WhatsApp reminders, reorder lists for Jodia Bazaar trips, offline billing.',
  focusKeyword: 'kiryana pos karachi',
  sub: 'For the general store that buys flour, rice and sugar by the bag from Jodia Bazaar and sells it by the kilo to the same families every week, mostly on khata.',
  badges: ['Bag, kilo and piece', 'Khata for regulars', 'Bills without internet'],
  facts: [
    ['Built for', 'Kiryana and general stores, from a single counter in Korangi to a mini-mart in Gulshan'],
    ['Buying side', 'Supplier bills, purchase prices per bag and a reorder list'],
    ['Payments', 'Cash, JazzCash, Easypaisa, card and udhaar on one bill'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Karachi ki kiryana dukaan ke liye: Jodia Bazaar se bori me maal aaye, counter par kilo ya packet me bike, aur har gahak ka udhaar khata me rahe. Bijli ya internet chala jaye to bhi bill bante rahenge.',
  local: `## How groceries move through Karachi

Most of what a Karachi general store sells starts in the old city. [Jodia Bazaar](https://en.wikipedia.org/wiki/Jodia_Bazaar) is the wholesale market for flour, wheat, rice, sugar and pulses, and some of the country's largest sugar merchants trade there. Next to it, Mithadar and Kharadar form the original core of Karachi, and in Saddar the [Empress Market](https://en.wikipedia.org/wiki/Empress_Market) sells condiments, fruit, vegetables and meat under its clock tower.

A neighbourhood store in Lyari, Korangi or Orangi Town buys from that chain in sacks and cartons, often through a distributor who visits weekly, and then sells the same goods in small amounts: a kilo of atta, half a kilo of daal, a single sachet of shampoo. Buying and selling happen in different units, so the shop has to know what one bag of rice cost it and what the kilo earns.

The customers are mostly regulars. Families pay at the end of the month, and a shop can carry dozens of running khata accounts at a time. When a regular moves to another area or simply forgets, a paper register gives no warning.

Karachi's power supply comes from K-Electric, and outages differ by area and feeder. A counter that needs a live connection to make a bill stops selling exactly when the street is busiest.

Payments have changed too. Many customers now settle part of the month by JazzCash or Easypaisa and the rest in cash, so the khata has to show both against one name.`,
  shotA: {
    heading: 'A counter that sells by the kilo and the bag',
    body: 'One product can carry more than one unit, each with its own price: a 50 kg bag for the bulk buyer and a kilo for everyone else. Loose items you sell all day sit on quick keys, and the bill takes cash, a wallet payment or udhaar.',
  },
  work: `## A day at a Karachi general store

**Morning.** The distributor's man comes in with the week's cooking oil and tea. Enter his bill as a purchase: stock goes up and the supplier's balance shows what you still owe him. If you paid half, the other half stays on his account until his next visit.

**Midday.** Mothers send children with a list and no money. Each item goes on the family's khata with one tap, and the running total shows on the screen, so there is no argument at month end about what was taken.

**Evening.** The low-stock list shows what is running out, with how much you normally sell. Before the next Jodia Bazaar trip, the list becomes the shopping list, so you do not come back with sugar you already had and no rice.

**Month end.** Open the khata list sorted by amount and age, and send each family a WhatsApp reminder with the balance. Payments that arrive by JazzCash or Easypaisa are recorded against the same name.`,
  table: {
    heading: 'Paper register or Nafaa at a Karachi kiryana',
    caption: 'What changes in the jobs a general store does every day.',
    columns: ['With a register', 'With Nafaa'],
    rows: [
      ['Buying by the bag, selling by the kilo', 'Profit per kilo worked out in the head', 'Each unit has its own price; profit shows per product'],
      ['Distributor bills', 'Kept in a drawer until he asks', 'Entered as a purchase with the balance owed'],
      ['Monthly khata', 'Totals added up on the last day', 'Running balance per family, reminders on WhatsApp'],
      ['Restocking from wholesale', 'Walk the shelves before leaving', 'Low-stock list with usual sales'],
      ['Power or internet cut', 'Calculator and memory', 'Bills keep going and sync later'],
    ],
  },
  shotB: {
    heading: 'Every family\'s khata on one screen',
    body: 'The khata shows what each customer owes and for how long. Old balances from your paper register go in once; after that every udhaar bill and payment updates them, and a reminder goes out on WhatsApp in one tap.',
  },
  steps: {
    heading: 'Moving a Karachi kiryana onto Nafaa',
    items: [
      ['List your products', 'Send your item list in Excel or as photos on WhatsApp; it is imported with a dry run first.'],
      ['Add the units you sell in', 'Bag, carton, dozen, kilo or piece, each with its own price.'],
      ['Copy the khata once', 'Enter each regular family with the balance from the register.'],
      ['Put loose items on quick keys', 'Eggs, bread, loose sugar and daal become one tap each.'],
    ],
  },
  questions: `## Questions from Karachi store owners

### Can I keep separate prices for a wholesale buyer and a walk-in customer?
Yes. A product can have more than one unit and price, so a restaurant that takes a full bag pays the bag rate while the counter customer pays per kilo.

### Our area has long outages. Will the counter stop?
No. Bills are made on the device without internet and sync when the connection returns. Keep the phone or laptop charged, or on a UPS, and the counter keeps running.

### Do I need tax integration?
Most neighbourhood stores do not. Optional FBR integration is there for a store that is required to report, and [sales tax on services](/glossary/sales-tax-on-services) explains the provincial side, which the Sindh Revenue Board runs.

### I have a second shop in another area. Can I see both?
Yes. Each branch has its own stock and counter, and the owner sees sales, cash and khata for both from one account. See [Karachi](/pos-software/karachi) for the other trades the same account covers.`,
  cta: {
    heading: 'Run your Karachi store from one screen',
    body: 'Try it free on the phone or computer already at your counter. Send your item list on WhatsApp and we set it up with you.',
  },
  siblings: ['karachi/garments', 'karachi/restaurant', 'lahore/kiryana'],
  related: ['COMPLIANCE:srb-sindh'],
  faqKeys: ['kiryana-units', 'kiryana-import', 'offline', 'khata-reminders', 'pricing'],
  sources: [wiki('Jodia Bazaar'), wiki('Empress Market'), wiki('Mithadar'), wiki('K-Electric')],
  factNote:
    'Jodia Bazaar (wholesale flour, wheat, rice, sugar, legumes; sugar merchants), Empress Market (condiments, fruit, vegetables, meat; Saddar) and Mithadar/Kharadar as the old core from their Wikipedia articles, opened 26 Oct 2026. K-Electric as the city\'s supplier from Wikipedia. Areas named (Lyari, Korangi, Orangi Town, Gulshan) are public localities; no shop or customer claims. Product claims checked against the retail pack, quick keys, low-stock and import pages.',
};

const restaurant: PairCopy = {
  city: 'karachi',
  cityName: 'Karachi',
  industry: 'restaurant',
  title: 'Restaurant POS software in Karachi',
  summary:
    'Nafaa is restaurant POS for Karachi: tables and takeaway on one screen, kitchen tickets for the grill, tandoor and karahi, riders with the cash they still hold, and plate costs at today\'s prices. It suits a Burnes Road counter or a sit-down place in Clifton, and keeps taking orders without internet.',
  seoDescription: 'Restaurant POS for Karachi: tables, kitchen tickets per station, delivery riders, plate cost and late-night shifts. Works offline and on your own devices.',
  focusKeyword: 'restaurant pos karachi',
  sub: 'From a nihari counter on Burnes Road to a family hall on a food street in Bahadurabad: orders, kitchen tickets, riders and the night\'s cash in one app.',
  badges: ['Kitchen tickets per station', 'Riders and cash', 'Late-night shifts'],
  facts: [
    ['Built for', 'Dine-in halls, takeaway counters, BBQ and karahi places, cafés and cloud kitchens'],
    ['Kitchen', 'Tickets per station on a printer or kitchen screen'],
    ['Delivery', 'Riders, order stages and the cash each rider still holds'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Karachi ke restaurant ke liye: table, parcel aur delivery ek screen par, har station ki KOT alag, rider ke paas kitna cash hai woh bhi saamne. Raat der tak shift chale to bhi hisaab saaf.',
  local: `## Eating out in Karachi

Karachi eats late and eats on the street. [Burnes Road](https://en.wikipedia.org/wiki/Burnes_Road), officially Muhammad Bin Qasim Road, is known across the city for restaurants and food vendors, many of them founded in the 1940s. The city's published list of food streets runs from Hussainabad, Sharafabad, Bahadurabad and Dhoraji to Boat Basin and the DHA food streets, alongside planned spots like Port Grand.

These places are rarely quiet in the same way. A Burnes Road counter may serve hundreds of plates of one dish to walk-in customers, while a family restaurant in Clifton seats tables for an hour and sends parcels to apartments across the area. Many do both, plus delivery through riders and food apps.

The kitchen is split by station. Grills, tandoors and karahi stoves each have their own cook, and a single order often touches all three. When a ticket is written once and shouted across the kitchen, items get missed and plates leave in the wrong order.

Payment habits differ by place. A food-street counter is mostly cash, a café in DHA takes cards and wallets, and delivery customers often pay the rider in cash at the door, which then sits with the rider until the shift ends.

Restaurant services in Sindh are taxed by the Sindh Revenue Board (see [sales tax on services](/glossary/sales-tax-on-services)); integration in Nafaa is optional and only needed if your restaurant is registered for it.`,
  shotA: {
    heading: 'One kitchen screen for the grill, tandoor and karahi',
    body: 'Each menu category goes to its own station. Cooks see new, cooking and ready tickets with the minutes since they came in, so a karahi waiting twenty minutes stands out before the customer complains.',
  },
  work: `## A night at a Karachi restaurant

**Before opening.** Check the menu prices and today\'s specials. Recipes are costed at today\'s ingredient rates, so when chicken or ghee prices change the food-cost percent moves with them.

**Rush hour.** Waiters take orders at the table on a phone, and the tickets print at the right station. Takeaway customers get a token, pay at the counter and wait for their number. Add-ons such as extra raita or less spice are priced on the bill and printed on the ticket.

**Delivery.** Orders move from waiting for a rider to out for delivery to delivered. Each rider\'s cash in hand is listed, so at the end of the shift you know who has to hand over how much.

**After midnight.** Many Karachi places close well after midnight. Set the business day to start at, say, 4 a.m., and sales made at 1:30 a.m. count toward the night they belong to. Close the cash register against the cash actually in the drawer.`,
  table: {
    heading: 'Karachi restaurant jobs and how Nafaa handles them',
    caption: 'The work that slows a busy Karachi kitchen, with the screen that takes it over.',
    columns: ['Without a system', 'In Nafaa'],
    rows: [
      ['One order for three stations', 'One slip, shouted across', 'Separate tickets per station'],
      ['Takeaway rush', 'Names written on bags', 'Token number on the bill and the ticket'],
      ['Riders\' cash', 'Counted at closing from memory', 'Cash in hand per rider, live'],
      ['Food cost when prices change', 'Noticed weeks later in the profit', 'Plate cost at today\'s rates'],
      ['Happy-hour chai', 'Cashier remembers the discount', 'Price cut by time and day, applied by itself'],
    ],
  },
  shotB: {
    heading: 'Know which plates earn',
    body: 'The menu shows each dish\'s plate cost, food cost percent and how many plates the stock still covers, so you can see which items need a new price before a busy weekend.',
  },
  steps: {
    heading: 'Opening on Nafaa in Karachi',
    items: [
      ['Send your menu', 'A photo of the menu card or a spreadsheet on WhatsApp is enough to start.'],
      ['Set your stations', 'Grill, tandoor, karahi, drinks: each gets a printer or a kitchen screen.'],
      ['Lay out the floor', 'Add sections and tables, and the takeaway and delivery counters.'],
      ['Train the shift', 'A short call for cashiers and waiters before the evening rush.'],
    ],
  },
  questions: `## Questions from Karachi restaurant owners

### We run until 3 a.m. Which day do late sales go to?
You choose the hour your business day starts. With a 4 a.m. start, everything sold after midnight stays with that night in the dashboard and the sales history.

### Can waiters take orders on their own phones?
Yes. The app runs in the browser on any phone, and staff roles decide who can give a discount or cancel an item.

### What happens when the internet drops during the rush?
Orders and bills keep working on the device and sync when the connection returns, so the counter does not stop mid-rush.

### Can I split a bill between friends?
Yes. Split, merge or move tables, and take part of the payment by cash, card or wallet.

### We have one kitchen and two counters, dine-in and parcel. Is that one setup?
Yes. Both counters send tickets to the same stations, and the kitchen screen marks each ticket as dine-in, takeaway or delivery so the cooks know how to pack it. Parcel orders get a token number that is printed on both the bill and the kitchen ticket, which matters on a crowded pavement where names get mixed up. More on station tickets in our [KOT guide](/blog/restaurant-kot-system-guide).`,
  cta: {
    heading: 'Bring your Karachi kitchen onto one screen',
    body: 'Start free with your own menu. Setup help on WhatsApp, in Urdu or English.',
  },
  siblings: ['karachi/kiryana', 'lahore/restaurant', 'peshawar/restaurant'],
  related: ['COMPLIANCE:srb-sindh'],
  faqKeys: ['restaurant-stations', 'restaurant-split', 'offline', 'pricing'],
  sources: [wiki('Burnes Road'), wiki('List of tourist attractions in Karachi'), wiki('Boat Basin')],
  factNote:
    'Burnes Road (food street, restaurants founded in the 1940s, official name) from Wikipedia; the food-street names (Hussainabad, Sharafabad, Bahadurabad, Dhoraji, Boat Basin, DHA, Port Grand) from the "Food Streets" section of Wikipedia\'s List of tourist attractions in Karachi, opened 26 Oct 2026. SRB named once as the Sindh authority for restaurant services. No restaurants or customers named. Product claims checked against the restaurant pack; business-day start hour in apps/web/src/core/lib/business-day.ts.',
};

const garments: PairCopy = {
  city: 'karachi',
  cityName: 'Karachi',
  industry: 'garments',
  title: 'Clothing shop POS in Karachi',
  summary:
    'Nafaa is POS for Karachi clothing and fabric shops: stock by size and colour with barcodes, stitching orders with measurements, exchanges on the old bill, and Eid collections with their own Sale. It fits a Zainab Market stall, a Tariq Road showroom or a shop that buys cloth in Mithadar and Kharadar.',
  seoDescription: 'POS for Karachi clothing shops: sizes and colours with barcodes, silai orders and measurements, exchanges, Eid collections and branches. Works offline.',
  focusKeyword: 'clothing shop pos karachi',
  sub: 'Cloth bought in the old city\'s textile markets, sold ready-made or stitched to order, with the Eid rush on top: stock, silai and exchanges in one app.',
  badges: ['Size and colour', 'Silai orders', 'Eid collections'],
  facts: [
    ['Built for', 'Ready-made, unstitched fabric, boutique and tailoring shops'],
    ['Stock', 'Every size and colour as its own barcode, across branches'],
    ['Orders', 'Silai and alterations with measurements and an advance'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Karachi ki kapre ki dukaan ke liye: har size aur rang ka alag stock, silai ka order naap ke saath, purane bill par exchange, aur Eid ki collection par Sale. Do branch hon to dono ek jagah nazar aayen.',
  local: `## Where Karachi buys and sells clothes

The cloth trade in Karachi is older than most of the city. [Mithadar](https://en.wikipedia.org/wiki/Mithadar) and Kharadar, the original core of Karachi, are known for their many textile markets, which run on into [Boulton Market](https://en.wikipedia.org/wiki/Boulton_Market), a nineteenth-century wholesale market surrounded by retail streets.

In Saddar, [Zainab Market](https://en.wikipedia.org/wiki/Zainab_Market) is a three-level British-era building selling ceremonial clothes, leather goods, traditional jewellery and crafts, and [Bohri Bazaar](https://en.wikipedia.org/wiki/Bohri_Bazaar), is one of the oldest marketplaces in the city and was once its most famous place to shop. Tariq Road in PECHS is listed among the city's most popular bazaars and is where many brand outlets and boutiques sit.

A typical shop works both ends of that chain. It buys unstitched suits and cloth from the wholesale streets, sells some as fabric, stitches some to order, and stocks ready-made pieces in a spread of sizes. Around Eid the shop may sell more in two weeks than in the two months before, and every customer wants a size that is just out.

Exchanges after Eid, layaway for wedding outfits and stitching promised by a date are where paper slips get lost.

Payment is mixed. Wholesale buyers from smaller towns often take goods on credit and settle on their next visit, while walk-in customers pay in cash, by card or with a wallet transfer at the counter. Wedding customers commonly pay in two or three parts before they collect.`,
  shotA: {
    heading: 'Every branch\'s stock and sale in one place',
    body: 'A shop on Tariq Road and a second one in a mall show side by side: sale, profit, average bill, expenses and returns. Move pieces between branches when one runs out of a size the other still has.',
  },
  work: `## Running a Karachi clothing shop through the season

**New stock.** When a lot arrives from the wholesale market, build the article once: tick the sizes and colours and every variant gets its own barcode. Prices can be set per collection, such as Summer Lawn or Eid.

**Silai.** A customer brings fabric for stitching. Take her measurements once and save them; the next order reuses them. The order carries the design pictures, the karigar, the trial date and the advance, and she gets a WhatsApp update when it is ready.

**The Eid rush.** Put a percent Sale on a whole collection in one step. Pieces held for a customer with a deposit stay off the shelf until she collects them or the hold ends.

**After Eid.** Exchanges come back on the original bill. The returned piece pays toward the new one and only the difference changes hands, so stock and cash both stay correct.`,
  table: {
    heading: 'Common Karachi clothing shops and where to start',
    caption: 'The first screens to set up, by kind of shop.',
    columns: ['Set up first', 'Add later'],
    rows: [
      ['Unstitched fabric shop', 'Suits by design and colour, barcodes', 'Collections and Sale for Eid'],
      ['Ready-made shop', 'Size and colour grid, exchanges', 'Branch transfers'],
      ['Boutique with stitching', 'Silai orders, measurements', 'Hold with deposit, qist plans'],
      ['Tailor shop', 'Alterations with token and due date', 'WhatsApp ready updates'],
      ['Ceremonial and bridal wear', 'Hold and qist with deposit', 'Profit by collection'],
    ],
  },
  shotB: {
    heading: 'Which pieces earn after cost',
    body: 'Profit by product, category, brand or supplier shows which articles carried the season and which only filled the shelf, so the next wholesale order follows what sold.',
  },
  steps: {
    heading: 'Setting up a Karachi clothing shop',
    items: [
      ['Start the trial', 'Sign up on the phone or computer at the counter.'],
      ['Add articles with sizes', 'Use the size and colour grid, then print barcode labels.'],
      ['Move open silai orders', 'Add each pending order with its measurements and advance.'],
      ['Set exchange rules', 'Choose the exchange days and who may approve a late exchange.'],
    ],
  },
  questions: `## Questions from Karachi clothing shops

### Can I sell fabric by the suit and also by the metre?
Yes. A product can be sold in more than one unit with its own price, and ready-made pieces use sizes and colours instead.

### How do I handle a customer who pays for a bridal outfit in parts?
Hold the piece with a deposit, or put it on a qist plan with weekly or monthly payments. The balance stays on her account until it is paid.

### Our shop and our tailor are in different places. Does that matter?
No. Silai orders list the karigar and the due date, and the order moves from cutting to ready wherever the work is done.

### Can staff give discounts on their own?
Only if their role allows it. Staff roles control discounts, exchanges and refunds. See [Karachi](/pos-software/karachi) for other trades on the same account.

### A shopkeeper from Hyderabad buys from us on credit. Where does that go?
On his own khata. Each bill on credit adds to his balance, each payment reduces it, and a WhatsApp reminder shows him the amount before his next trip to Karachi.

### How long does it take to put a full season of stock in?
It depends on the number of articles, not pieces. One article with six sizes and four colours is entered once and makes all 24 variants with their barcodes, so most of the work is printing labels. If your list is already in Excel, send it to us and we import it with you on a call.`,
  cta: {
    heading: 'Get your Karachi shop ready before the next Eid',
    body: 'Free trial on your own device, with setup help on WhatsApp.',
  },
  siblings: ['karachi/kiryana', 'lahore/garments', 'faisalabad/garments'],
  faqKeys: ['garments-variants', 'garments-measurements', 'garments-layaway', 'pricing'],
  sources: [wiki('Mithadar'), wiki('Boulton Market'), wiki('Zainab Market'), wiki('Bohri Bazaar'), wiki('Bazaars in Karachi')],
  factNote:
    'Mithadar/Kharadar textile markets and Boulton Market (19th-century wholesale market in Saddar), Zainab Market (three levels, ceremonial clothes, leather goods), Bohri Bazaar (one of the oldest marketplaces, once the most famous) and Tariq Road as a popular bazaar, all from Wikipedia, opened 26 Oct 2026. "Brand outlets and boutiques" on Tariq Road is general description, not a count. No shops named. Product claims checked against the garments pack.',
};

const mobile: PairCopy = {
  city: 'karachi',
  cityName: 'Karachi',
  industry: 'mobile-shop',
  title: 'Mobile shop software in Karachi',
  summary:
    'Nafaa is POS for Karachi mobile shops: every phone kept by IMEI from purchase to sale, used phones bought with the seller\'s CNIC, repair job cards, and qist plans with WhatsApp reminders. It suits a counter in Saddar\'s electronics market or a shop in a neighbourhood mall.',
  seoDescription: 'Mobile shop software for Karachi: IMEI stock, used phones with CNIC, repair job cards, qist plans and khata. Works on your own phone, even offline.',
  focusKeyword: 'mobile shop software karachi',
  sub: 'New and used phones, accessories and repairs on one counter: every handset by IMEI, every seller by CNIC, every qist with its due date.',
  badges: ['IMEI stock', 'Used phones with CNIC', 'Qist plans'],
  facts: [
    ['Built for', 'Mobile dealers, used-phone counters, accessory and repair shops'],
    ['Phones', 'IMEI, PTA status and days on the shelf for each handset'],
    ['After sale', 'Repair job cards, warranty check and qist plans'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Karachi ki mobile dukaan ke liye: har phone IMEI ke saath, purana phone bechne wale ka CNIC record, repair ka job card aur qist ki yaad dihani WhatsApp par.',
  local: `## The phone trade in Karachi

Saddar is Karachi\'s old commercial district, and its main shopping streets include Abdullah Haroon Road and Zaibunnisa Street. As far back as 2001, Dawn described the electronics market on Abdullah Haroon Road as a major centre of the city\'s mobile phone trade, with new and used handsets side by side. The area is still where many dealers buy stock and many customers come to compare prices.

That mix of new and used phones is what makes a Karachi phone counter hard to keep straight. The same model may come in sealed from a distributor, as a trade-in from a customer upgrading, or as a used set bought for cash from someone who needs money today. Each one has a different cost, a different warranty and a different risk.

The same Dawn report was about stolen handsets reaching second-hand markets. A shop protects itself by recording who sold it every used phone, with the seller\'s CNIC and the IMEI, and by checking an IMEI against its own history before buying.

Many customers here buy on instalments, and repairs bring people back through the door. Both depend on the shop remembering dates and amounts.

Payment at a phone counter is rarely one method. A customer may hand over an old set, pay part in cash and send the rest by JazzCash or Easypaisa, or leave a balance on qist. Each part has to land on the same bill so the shop knows what it was really paid for the handset.`,
  shotA: {
    heading: 'Qist and udhaar on one khata',
    body: 'Every phone on qist shows the amount still to collect and how long each payment has been pending. A reminder goes out on WhatsApp in one tap, and the payment is recorded against the same customer.',
  },
  work: `## A day at a Karachi mobile counter

**Stock in.** Phones from the distributor are entered with their IMEIs in one go, along with storage, RAM and colour. Record the PTA status of each one, so the sale history shows it under every bill.

**A used phone walks in.** Scan its IMEI first: if it was sold or repaired at your shop, you see to whom and when. Buy it for cash or take it against a new phone, with the seller\'s CNIC saved on the record.

**Repairs.** A broken screen gets a printed job card with the IMEI, the lock code, what was left with the phone, the fault, the estimate and the advance. The customer is told on WhatsApp when it is ready.

**Closing.** The profit report shows the margin on every IMEI, on accessories and on repair work, after the day\'s expenses.`,
  table: {
    heading: 'Risks at a Karachi phone counter and how Nafaa covers them',
    caption: 'Where a register leaves gaps, and what the app records instead.',
    columns: ['With a register', 'In Nafaa'],
    rows: [
      ['Buying a used phone', 'Name and number, if written', 'Seller\'s CNIC and IMEI on the record'],
      ['Has this phone been here before?', 'Ask around the shop', 'IMEI check shows sales and repairs'],
      ['Qist payments', 'A notebook per customer', 'Plans with due dates and late list'],
      ['Repair jobs', 'A paper slip in the drawer', 'Job card with fault, advance and status'],
      ['Profit on a single set', 'Guessed from the price', 'Profit per IMEI'],
    ],
  },
  shotB: {
    heading: 'Profit on phones, accessories and repairs',
    body: 'Gross and net profit after expenses, profit per IMEI and margin on every model. Covers and chargers are sold like any other item and show in the same report.',
  },
  steps: {
    heading: 'Starting a Karachi phone shop on Nafaa',
    items: [
      ['Enter phones in stock', 'Paste or scan the IMEIs of what is on the shelf.'],
      ['Add accessories', 'Covers, chargers and cables as normal products with barcodes.'],
      ['Move open qist plans', 'Add each customer with the balance and the next due date.'],
      ['Print a test job card', 'Check the repair slip on your printer before the first repair.'],
    ],
  },
  questions: `## Questions from Karachi phone dealers

### Can I keep a phone that a customer asked me to sell for him?
Yes. A used phone can be bought for cash, taken as a trade-in, or kept to sell for its owner, with his details on the record.

### Two shops, one in Saddar and one in our area. Can stock move between them?
Yes. Transfer a handset by IMEI from one branch to the other, and both branches\' stock updates.

### Does it work on my phone?
Yes. Nafaa runs in the browser on any phone or computer, and keeps billing without internet.

### A customer brings back a phone under warranty. How do I check it?
Scan or type the IMEI. The record shows the bill it was sold on, the customer, and how much warranty is left, and a repair job card can be opened from there.

### Can a salesman buy a used phone without me?
Only if his role allows it. Buying a used phone needs the permission to manage IMEI stock, which is separate from selling, so you can keep it with yourself or a trusted manager while the rest of the staff sell from stock.

### Where can I read more about IMEI records?
See our guide to [IMEI records for mobile shops](/blog/mobile-shop-imei-records) and the [mobile shop page](/industries/mobile-shop).`,
  cta: {
    heading: 'Put every handset in your Karachi shop on record',
    body: 'Free trial on the phone you already use. Setup help on WhatsApp.',
  },
  siblings: ['karachi/garments', 'lahore/mobile-shop', 'rawalpindi/mobile-shop'],
  related: ['BLOG_POST:mobile-shop-imei-records'],
  faqKeys: ['mobile-imei', 'mobile-used', 'offline', 'pricing'],
  sources: [
    wiki('Saddar'),
    wiki('Bazaars in Karachi'),
    src('Incidence of hand phone theft rising in city (10 Dec 2001)', 'https://www.dawn.com/news/9974', 'Dawn'),
  ],
  factNote:
    'Saddar as the old commercial district and Abdullah Haroon Road and Zaibunnisa Street as its main shopping streets from Wikipedia (Saddar; Bazaars in Karachi). Abdullah Haroon Road electronics market as "a major centre of the trade in mobile phones" with new and used sets, and the stolen-handset concern, from Dawn, 10 Dec 2001 (dated in the copy). URLs checked 26 Oct 2026. No shops named.',
};

export const karachiPairs: PairCopy[] = [kiryana, restaurant, garments, mobile];
export const karachi = karachiPairs.map(pair);
