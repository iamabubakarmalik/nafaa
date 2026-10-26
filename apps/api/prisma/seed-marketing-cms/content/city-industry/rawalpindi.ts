/**
 * Rawalpindi pair pages, written from the public record of the city's old
 * bazaars and Saddar's trade roads:
 * - kiryana: Raja Bazaar (Masala Bazaar, Sabzi Mandi) and Narankari Bazaar
 * - garments: Moti Bazaar, Kapra Bazaar, Bank Road and Kashmir Road
 * - mobile-shop: the two mobile-phone markets on Bank Road, Saddar
 * - autoparts: the spare-parts shops on Adamjee Road and Kashmir Road
 * Skipped: restaurant, pharmacy, hardware, electronics and bakery, because no
 * public source ties a distinct market or trade pattern to Rawalpindi beyond
 * what the city hub already says.
 */

import { type PairCopy, pair, wiki } from './_build';

const kiryana: PairCopy = {
  city: 'rawalpindi',
  cityName: 'Rawalpindi',
  industry: 'kiryana',
  title: 'Kiryana POS software in Rawalpindi',
  summary:
    'Nafaa is POS, stock and khata software for Rawalpindi kiryana and general stores. It keeps carton and loose prices apart, records what the shop owes its Raja Bazaar wholesaler, keeps every household\'s udhaar with WhatsApp reminders, and lists what to buy before the next trip to the old city.',
  seoDescription: 'Kiryana POS for Rawalpindi general stores: carton and loose prices, supplier balances, khata with WhatsApp reminders and restock lists. Bills offline.',
  focusKeyword: 'kiryana pos rawalpindi',
  sub: 'For the store in Satellite Town or Dhok Hassu that restocks from Raja Bazaar and Narankari Bazaar, sells by the packet and keeps its neighbours on monthly khata.',
  badges: ['Carton and loose prices', 'Supplier balances', 'Monthly khata'],
  facts: [
    ['Built for', 'Kiryana, general stores and small marts across Rawalpindi and the cantonment areas'],
    ['Restocking', 'Low-stock list and supplier bills for wholesale trips'],
    ['Udhaar', 'Running balance per household, reminders on WhatsApp'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Pindi ki kiryana dukaan ke liye: Raja Bazaar se maal aaye, counter par packet ya kilo me bike, wholesaler ka baqaya bhi likha rahe aur mohalle walon ka udhaar khata me. Internet na ho to bhi bill bante rahenge.',
  local: `## Where Rawalpindi's general stores buy

The heart of old Rawalpindi is [Raja Bazaar](https://en.wikipedia.org/wiki/Raja_Bazaar), near Fawara Chowk. It is not one market but a cluster of them: a Masala Bazaar for spices, a Sabzi Mandi for vegetables, a Kapra Bazaar, a Sarafa Bazaar and more, with Trunk Bazaar, Liaquat Road, Moti Bazaar, Namak Mandi and Narankari Bazaar all meeting there. About half of its shops have been joined into small plazas and shared markets, which has made Raja Bazaar the largest wholesale market of the city, and buyers come to it from Azad Kashmir, Gilgit-Baltistan and Khyber Pakhtunkhwa as well as from Rawalpindi itself.

Next door, [Narankari Bazaar](https://en.wikipedia.org/wiki/Narankari_Bazaar) runs in front of the Sabzi Mandi and behind Namak Mandi and Ganj Mandi. It has more than a thousand shops selling food, dried fruit, candies and chocolates, stationery, cosmetics and daily-use products in local and imported packing. For a general store owner, this is where a carton of biscuits, a box of shampoo sachets and a sack of daal can all be bought in one morning.

That shapes how a neighbourhood store in Rawalpindi works. The owner buys in cartons, dozens and bags, often on part credit from a wholesaler he has known for years, and sells the same goods one packet or one kilo at a time to families who pay at month end. Before Eid and during Ramzan, that trip to the old city can come round more than once a week.

Rawalpindi and Islamabad share one power company, IESCO, and outages still interrupt the evening rush in many areas. A counter that needs a live connection to make a bill is the wrong tool for that.`,
  shotA: {
    heading: 'A counter for packets, cartons and loose goods',
    body: 'One product can carry more than one unit with its own price: the carton for a customer who takes twelve, the packet for everyone else. Loose sugar, eggs and bread sit on quick keys, and the bill takes cash, a wallet payment or udhaar.',
  },
  work: `## A week at a Rawalpindi general store

**The wholesale trip.** Before leaving for Raja Bazaar, open the low-stock list. It shows each item that is running out next to what you normally sell, so the list you carry matches the shelf and not your memory. When you come back, enter the wholesaler's bill as a purchase. Stock goes up, and if you paid only part of it, the rest stays on his account with the date.

**Counter days.** Children come with a slip from home and no cash. Each item goes on the family's khata in one tap, and the screen shows the running balance. Combos help with the things people buy together, such as a breakfast set of bread, eggs and butter at one price.

**Damage and returns.** A broken jar or a packet past its date is recorded as damage, so the stock count and the profit both stay true.

**Month end.** Sort the khata by amount and age, and send each household its balance on WhatsApp with one tap per customer. Payments that come by JazzCash or Easypaisa go against the same name. The supplier side is just as clear: you see what you still owe each wholesaler before the next trip.

Optional FBR/PRA integration is there for a store that is required to report; most neighbourhood stores never switch it on.`,
  table: {
    heading: 'Buying in the old city, selling in the mohalla',
    caption: 'How a Rawalpindi store\'s two sides look on paper and in Nafaa.',
    columns: ['On paper', 'In Nafaa'],
    rows: [
      ['What to buy at Raja Bazaar', 'A list written while walking the shelves', 'Low-stock list with usual sales per item'],
      ['Part payment to the wholesaler', 'A note in the back of the register', 'Supplier balance with the bill and date'],
      ['Carton bought, packet sold', 'Margin guessed per packet', 'Separate unit prices, profit per product'],
      ['Household udhaar', 'Totalled on the last day of the month', 'Running balance, WhatsApp reminder in one tap'],
      ['Load-shedding in the evening', 'Bills on a calculator', 'Bills on the device, synced later'],
    ],
  },
  shotB: {
    heading: 'Every household\'s udhaar, with its age',
    body: 'The khata lists who owes what and for how long. Enter the old balances from your register once; after that every udhaar bill and payment updates them, and you can remind a family politely on WhatsApp.',
  },
  steps: {
    heading: 'Moving a Rawalpindi store onto Nafaa',
    items: [
      ['Send your item list', 'An Excel sheet or photos of the shelves on WhatsApp. The import runs as a dry run first.'],
      ['Add cartons and loose units', 'Carton, dozen, kilo and packet, each with its own price.'],
      ['Copy your wholesalers', 'Add each supplier with what you owe him today.'],
      ['Copy the khata', 'Each regular household once, with the balance from the register.'],
    ],
  },
  questions: `## Questions from Rawalpindi store owners

### I buy from three wholesalers in Raja Bazaar. Can I see what I owe each?
Yes. Each supplier has his own account. Purchases and payments update it, so before the next trip you know who is waiting for money.

### Can my son run the counter while I am at the wholesale market?
Yes. Give him a cashier role. He can bill and take payments, while discounts, refunds and reports stay with the owner unless you allow them.

### The power goes in the evening. Will I lose sales?
No. Bills are made on the phone or computer without internet and sync when the connection is back. A charged phone or a small UPS keeps the counter running.

### I also have a shop across the road in Islamabad. Can both be on one account?
Yes. Each branch keeps its own stock and counter, and the owner sees both. The [Islamabad kiryana page](/pos-software/islamabad/kiryana) covers how sector markets there work, and [Rawalpindi](/pos-software/rawalpindi) lists the other trades in the city.`,
  cta: {
    heading: 'Run your Rawalpindi store from one screen',
    body: 'Free trial on the phone or computer at your counter. Send your item list on WhatsApp and we set it up with you.',
  },
  siblings: ['rawalpindi/garments', 'islamabad/kiryana', 'karachi/kiryana'],
  related: ['COMPLIANCE:pra-punjab'],
  faqKeys: ['kiryana-units', 'kiryana-import', 'khata-reminders', 'offline', 'pricing'],
  sources: [wiki('Raja Bazaar'), wiki('Narankari Bazaar'), wiki('Islamabad Electric Supply Company')],
  factNote:
    'Raja Bazaar (near Fawara Chowk; Masala Bazaar, Sabzi Mandi, Kapra and Sarafa bazaars inside it; roads meeting there; about half of shops turned into plazas making it the largest wholesale market of the city; buyers from AJK, GB and KP) and Narankari Bazaar (in front of Sabzi Mandi, behind Namak Mandi and Ganj Mandi; more than 1,000 shops; goods listed) from their Wikipedia articles, opened 26 Oct 2026. IESCO as the power company from Wikipedia. Satellite Town and Dhok Hassu are public localities; no shops or customers named. Product claims checked against the retail pack, quick keys, combos, damage and low-stock pages.',
};

const garments: PairCopy = {
  city: 'rawalpindi',
  cityName: 'Rawalpindi',
  industry: 'garments',
  title: 'Clothing shop POS in Rawalpindi',
  summary:
    'Nafaa is POS for Rawalpindi clothing, fabric and boutique shops: every size and colour with its own barcode, ladies\' stitching orders with saved measurements, exchanges on the original bill, and wedding outfits held on a deposit. It fits a Moti Bazaar shop, a Bank Road boutique or a Kashmir Road tailor.',
  seoDescription: 'POS for Rawalpindi clothing shops and boutiques: sizes and colours, silai orders with measurements, exchanges, holds on deposit and branch stock.',
  focusKeyword: 'clothing shop pos rawalpindi',
  sub: 'From the women\'s bazaar of the old city to the boutiques of Saddar: ready stock, unstitched suits and stitching orders in one app.',
  badges: ['Size and colour barcodes', 'Ladies\' silai orders', 'Hold on deposit'],
  facts: [
    ['Built for', 'Ready-made, unstitched fabric, bridal and boutique shops, and ladies\' tailors'],
    ['Stock', 'Each size and colour as its own variant and barcode'],
    ['Orders', 'Silai and alterations with measurements, trial date and advance'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Pindi ki kapre ki dukaan aur boutique ke liye: har size aur rang ka alag barcode, ladies silai ka order naap ke saath, purane bill par exchange aur shaadi ke jore par advance rakh kar hold.',
  local: `## Rawalpindi's clothing streets

Clothes in Rawalpindi are sold in two very different settings. In the old city, [Moti Bazaar](https://en.wikipedia.org/wiki/Moti_Bazaar) was founded in 1911 with about twenty shops; it now has more than 1,200, and for most of its history it was a bazaar for women only. It sits beside [Raja Bazaar](https://en.wikipedia.org/wiki/Raja_Bazaar), which has its own Kapra Bazaar for cloth among the smaller markets inside it. Here the trade is unstitched suits, lace, dupattas and everything a family needs before a wedding, sold over the counter in a crowd.

In the cantonment, [Saddar](https://en.wikipedia.org/wiki/Saddar,_Rawalpindi) is the principal commercial hub. Bank Road has markets for branded garments, boutiques and shops for ceremonial dresses, and Kashmir Road is known for branded clothing shops and for tailors who stitch ladies\' clothes. A customer may buy fabric in Moti Bazaar in the morning and hand it to a Kashmir Road tailor the same afternoon.

So a Rawalpindi shop often does three jobs at once. It sells ready pieces in many sizes, it sells unstitched fabric, and it takes stitching orders that come back days later for a trial. Wedding season adds holds: an outfit set aside with a deposit, paid off over weeks.

Each of those jobs has a paper slip, and slips are what go missing when the shop is busy before Eid or in the wedding months.`,
  shotA: {
    heading: 'Two branches, one view of stock',
    body: 'A shop in the old city and a boutique in Saddar show side by side: sale, profit, average bill, expenses and returns per branch. When one branch runs out of a size, move it from the other.',
  },
  work: `## How the work runs in a Rawalpindi shop

**New lot.** Build an article once with its size and colour grid. Every variant gets a barcode, and an empty size shows in red so you see the gap before a customer does. Group stock into collections such as Eid or Winter, and put a percent Sale on a whole collection when the season turns.

**Stitching.** A customer brings fabric for a suit. Her measurements are saved under her name, several sets if she orders for her daughters too, and reused on the next order. The silai order carries the design pictures, the karigar, the trial date and the advance. Size charts for each garment type are ready to show at the counter.

**Alterations.** A dress bought elsewhere comes in for fitting. It gets a token and a due date, and the customer hears on WhatsApp when it is ready.

**Weddings.** A bridal outfit can be held with a deposit or sold on a qist plan paid over weeks or months, and it stays off the shelf until it is paid or the hold ends.

**After Eid.** Exchanges come back on the original bill; the returned piece pays toward the new one and only the difference changes hands.`,
  table: {
    heading: 'Rawalpindi shops and the screens they start with',
    caption: 'Where to begin, by the kind of clothing business.',
    columns: ['Set up first', 'Add later'],
    rows: [
      ['Unstitched suit and lace shop', 'Articles by design and colour, barcodes', 'Eid and wedding collections with Sale'],
      ['Bank Road boutique', 'Size grid, exchanges', 'Branch transfers, profit by collection'],
      ['Ceremonial and bridal wear', 'Hold on deposit, qist plans', 'WhatsApp reminders on balances'],
      ['Ladies\' tailor', 'Silai orders with saved measurements', 'Alterations with token and due date'],
      ['Shop with its own karigar', 'Orders by karigar and trial date', 'Size charts per garment type'],
    ],
  },
  shotB: {
    heading: 'See which articles really earned',
    body: 'Profit by product, category, brand or supplier shows which designs carried the season. The next order from the wholesaler follows what sold, not what looked good on the hanger.',
  },
  steps: {
    heading: 'Setting up a Rawalpindi clothing shop',
    items: [
      ['Start the trial', 'Sign up on the phone or computer at the counter; no card needed.'],
      ['Add your articles', 'Use the size and colour grid and print barcode labels.'],
      ['Enter open silai orders', 'Each pending order with its measurements, trial date and advance.'],
      ['Set your exchange days', 'Choose how many days you allow and who can approve a late exchange.'],
    ],
  },
  questions: `## Questions from Rawalpindi clothing shops

### I sell unstitched suits and also stitch them. Is that one product or two?
The suit is one product. The stitching is a silai order linked to the customer, with its own charge and advance, so the fabric sale and the stitching both show correctly.

### A customer wants to keep a bridal dress for three weeks. How do I record it?
Hold it with her deposit. It stays out of the stock you can sell, and the balance sits on her account until she collects it.

### Can my salesmen give discounts during the wedding rush?
Only if their role allows it. Discounts, exchanges and refunds can be limited to the owner or a manager.

### A regular customer lost her measurement slip. Do I need to measure again?
No. Her measurements are saved under her name, with separate sets for anyone she orders for, so the next suit starts from the last naap. Change only what she asks to change, and the new set is kept for next time.

### What about the Eid rush, when three people are billing at once?
Each salesman can bill from his own phone at the same time. Stock is shared, so a size sold on one phone disappears from the others, and the owner sees every bill as it is made.

### Where can I compare this with other cities?
The [Faisalabad clothing page](/pos-software/faisalabad/garments) covers a cloth-market city, and [Rawalpindi](/pos-software/rawalpindi) lists the other trades here.`,
  cta: {
    heading: 'Get your Rawalpindi shop ready for wedding season',
    body: 'Free trial on the device you already have, with setup help on WhatsApp in Urdu or English.',
  },
  siblings: ['rawalpindi/kiryana', 'karachi/garments', 'faisalabad/garments'],
  faqKeys: ['garments-variants', 'garments-measurements', 'garments-layaway', 'pricing'],
  sources: [wiki('Moti Bazaar'), wiki('Raja Bazaar'), wiki('Saddar, Rawalpindi')],
  factNote:
    'Moti Bazaar (founded 1911, about 22 shops before 1947, now more than 1,200; formerly for women only) from Wikipedia. Kapra Bazaar inside Raja Bazaar from the Raja Bazaar article. Bank Road (branded garments, boutiques, ceremonial dresses) and Kashmir Road (branded garments, ladies\' tailors) from Wikipedia\'s Saddar, Rawalpindi. Opened 26 Oct 2026. The morning-fabric, afternoon-tailor example is illustrative, not a claim about any shop. Product claims checked against the garments pack.',
};

const mobile: PairCopy = {
  city: 'rawalpindi',
  cityName: 'Rawalpindi',
  industry: 'mobile-shop',
  title: 'Mobile shop software in Rawalpindi',
  summary:
    'Nafaa is POS for Rawalpindi mobile shops: phones kept by IMEI with their PTA status, trade-ins and used sets recorded with the seller\'s CNIC, repair job cards, and qist plans with WhatsApp reminders. It suits a counter in Saddar\'s Bank Road phone markets or a shop on a main road in the city.',
  seoDescription: 'Mobile shop software for Rawalpindi: IMEI stock with PTA status, used phones and trade-ins with CNIC, repair job cards and qist plans. Works offline.',
  focusKeyword: 'mobile shop software rawalpindi',
  sub: 'Dealers in Saddar\'s phone markets sell new sets, take old ones in exchange and fix screens at the same counter. Nafaa keeps each handset, buyer and payment on record.',
  badges: ['IMEI and PTA status', 'Trade-ins with CNIC', 'Repair job cards'],
  facts: [
    ['Built for', 'Phone dealers, used-phone counters, accessory and repair shops'],
    ['Each handset', 'IMEI, PTA status, cost and days on the shelf'],
    ['After the sale', 'Repairs, warranty lookups and qist collections'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Pindi ki mobile dukaan ke liye: har set IMEI aur PTA status ke saath, purana phone lene par CNIC ka record, repair ka job card aur qist wale gahakon ki yaad dihani WhatsApp par.',
  local: `## Rawalpindi's phone markets

[Saddar](https://en.wikipedia.org/wiki/Saddar,_Rawalpindi) is the principal commercial hub of Rawalpindi, lying between the Mall Road and the main railway line. Bank Road, named for the National Bank branch on it and lined with the branches of almost every bank, also has the Gakhar Plaza shopping centre, garment markets, and two big mobile-phone markets. Haider Road beside it carries much of the city\'s traffic towards Murree Road and on to Islamabad, which brings customers from both cities into Saddar.

A dealer in these markets rarely sells one kind of phone. Sealed sets come from distributors, customers upgrade and hand in their old phone as part of the price, and people short of cash sell a phone outright. Buyers often compare prices across several shops in the same plaza before deciding, so a dealer needs to know his own cost and margin on each set, not on the model in general.

PTA status is one of the first things a buyer asks about, especially on a used or imported set. A shop that has saved the status of each IMEI can answer at once instead of guessing from the box.

The other half of the business is after the sale. Screens crack, batteries swell and buyers on qist owe money every month. Each of those is a promise with a date, and a busy counter forgets dates.`,
  shotA: {
    heading: 'Qist and udhaar with their age',
    body: 'Every phone on instalments shows the amount still to collect and how long each payment has been pending. A WhatsApp reminder goes out in one tap and the payment lands on the same customer.',
  },
  work: `## A day at a Saddar phone counter

**New stock.** Paste or scan the IMEIs of a delivery in one go, with storage, RAM and colour as variants. Record each set\'s PTA status; it appears under every bill in the sales history.

**An exchange offer.** A customer wants a new phone and offers his old one. Scan the old IMEI first: if it was sold or repaired by you, its history shows. Take it as a trade-in at the agreed value against the new bill, with his CNIC saved. If he only wants you to sell it for him, keep it on his behalf instead.

**Repairs.** The job card records the IMEI, the lock code, the SIM and memory card left with the phone, the fault, the estimate and the advance. It prints for the customer, and he is told on WhatsApp when the phone is ready.

**Instalments.** Split a phone into monthly payments. The qist list shows what is late and what falls due this week, and each reminder is one tap.

**Closing.** Covers, chargers and handsfree are sold like any other barcode item. The profit report shows margin per IMEI, per model and on repair work, after expenses.`,
  table: {
    heading: 'Questions a Rawalpindi customer asks, and where the answer is',
    caption: 'What a dealer is asked at the counter, and the screen that answers it.',
    columns: ['Without records', 'In Nafaa'],
    rows: [
      ['"Is this set PTA approved?"', 'Check the box or the phone', 'PTA status saved on the IMEI'],
      ['"I bought it from you last year"', 'Search old receipts', 'IMEI check shows the sale and warranty left'],
      ['"How much is left on my qist?"', 'Find his page in the notebook', 'Plan with paid, due and late amounts'],
      ['"Is my screen fixed yet?"', 'Ask the technician', 'Job card status, WhatsApp when ready'],
      ['"What will you give for my old phone?"', 'A number from memory', 'Trade-in value against the new bill, CNIC saved'],
    ],
  },
  shotB: {
    heading: 'Margin on every set, accessory and repair',
    body: 'Gross and net profit after expenses, profit per IMEI and margin on each model show which sets are worth keeping on the shelf and which are tying up cash.',
  },
  steps: {
    heading: 'Starting a Rawalpindi phone shop on Nafaa',
    items: [
      ['Enter the phones on the shelf', 'Scan or paste IMEIs with variants and PTA status.'],
      ['Add accessories', 'Covers, chargers and cables as products with barcodes.'],
      ['Move open qist plans', 'Each customer with the balance and the next due date.'],
      ['Print a repair job card', 'Test the slip on your printer before the first repair comes in.'],
    ],
  },
  questions: `## Questions from Rawalpindi phone dealers

### I have a counter in Saddar and another shop near my home. Can phones move between them?
Yes. Transfer a handset by IMEI from one branch to the other; both stocks update and the phone keeps its history.

### Can I see how long a phone has been sitting unsold?
Yes. IMEI stock shows the days each set has been on the shelf, so slow models stand out before their price drops further.

### A customer says the phone I sold him has a fault. How do I check?
Scan the IMEI. The sale, the date, the customer and the warranty left all show, along with any earlier repair. If it is still under warranty, open a repair job card against the same IMEI so the history stays in one place.

### Can my staff buy used phones when I am not there?
Only staff with the permission to manage IMEI stock can buy a phone or take a trade-in. Give it to a trusted salesman, or keep it with the owner, and every record still carries the seller\'s details.

### Does it need a computer?
No. It runs in the browser on a phone, tablet or computer, and keeps billing without internet.

### Where can I read more?
See [IMEI records for mobile shops](/blog/mobile-shop-imei-records), the [mobile shop page](/industries/mobile-shop), and [Rawalpindi](/pos-software/rawalpindi) for other trades in the city.`,
  cta: {
    heading: 'Put every handset in your shop on record',
    body: 'Free trial on the phone you already use. Setup help on WhatsApp.',
  },
  siblings: ['rawalpindi/autoparts', 'karachi/mobile-shop', 'faisalabad/mobile-shop'],
  related: ['BLOG_POST:mobile-shop-imei-records'],
  faqKeys: ['mobile-imei', 'mobile-used', 'offline', 'pricing'],
  sources: [wiki('Saddar, Rawalpindi')],
  factNote:
    'Saddar as the principal commercial hub between the Mall Road and the railway; Bank Road (named for the National Bank, bank branches, Gakhar Plaza, garment markets, "two big mobile-phone markets") and Haider Road as the main thoroughfare linking to Murree Road and Islamabad, all from Wikipedia\'s Saddar, Rawalpindi, opened 26 Oct 2026. PTA status is mentioned only as something buyers ask about; no rule is stated. No shops named. Product claims checked against the mobile pack (IMEI stock, PTA status, used phones, repairs, EMI plans, transfers).',
};

const autoparts: PairCopy = {
  city: 'rawalpindi',
  cityName: 'Rawalpindi',
  industry: 'autoparts',
  title: 'Auto parts shop software in Rawalpindi',
  summary:
    'Nafaa is POS for Rawalpindi auto parts shops and workshops: parts found by make, model and year or by part number, genuine, local and used stock kept apart, workshop job cards with mechanics\' commission, and service reminders on WhatsApp. It fits a counter on Adamjee Road or Kashmir Road.',
  seoDescription: 'Auto parts POS for Rawalpindi shops and workshops: fitment by make and model, part numbers, genuine and used parts, job cards and service reminders.',
  focusKeyword: 'auto parts software rawalpindi',
  sub: 'Spare parts for almost every car and bike on the road, a mechanic out back and customers who want it fixed today: parts, jobs and reminders in one app.',
  badges: ['Fitment by make and model', 'Workshop job cards', 'Service reminders'],
  facts: [
    ['Built for', 'Spare-parts shops, workshops and parts counters with a garage'],
    ['Finding a part', 'By vehicle, part number or OEM number'],
    ['Workshop', 'Job cards, mechanics, commission and vehicle history'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Pindi ki spare parts dukaan aur workshop ke liye: gaari ka model likho aur sahi part mil jaye, genuine, local aur used alag, mechanic ka job card aur oil change ki yaad dihani WhatsApp par.',
  local: `## The spare-parts roads of Saddar

Rawalpindi\'s parts trade sits in the cantonment. In [Saddar](https://en.wikipedia.org/wiki/Saddar,_Rawalpindi), Adamjee Road starts at the five-road crossing, crosses Kashmir Road and runs towards the railway; beyond Kashmir Road it is lined with shops selling spare auto parts for almost every model running in Pakistan, and the old Chhota Bazar follows after them. Kashmir Road itself, which runs from the Mall Road to Murree Road, has its own market for automobile spare parts next to its clothing and tailoring shops.

A parts dealer here serves three kinds of buyer at once. Car and motorcycle owners come in with a broken part in a plastic bag. Mechanics from workshops across the city send a boy with a list and want it on their account. Other shops ring up for a part they do not have. Each of them describes the part differently: by the car and year, by a number on the old part, or just by what it does.

Most shops stock more than one grade of the same part. Genuine parts, local makes and used parts pulled from other vehicles sit on the same shelf at very different prices, and a customer who paid for genuine must not leave with local.

Many parts shops in the city also run a workshop or work closely with one. The vehicle stays for a day, labour and parts are added as the job goes on, and the bill has to include all of it when the owner comes to collect.`,
  shotA: {
    heading: 'Workshop jobs from intake to hand-over',
    body: 'Each job card holds the vehicle, the meter reading, the complaint, the mechanic, the promised time and the advance. Labour and parts are added as the work goes on, and the bill is ready when the owner arrives.',
  },
  work: `## A day at a Rawalpindi parts counter

**Finding the part.** A customer says "Corolla brake pads". Each part lists the vehicles it fits by make, model and year, so the search finds the right pads, and a part number or OEM number finds it too. Common Pakistani cars and bikes are added in one click; anything missing can be typed in.

**Grades.** The part card shows whether it is genuine, local or used, with its brand, condition and warranty. The price on the bill follows the grade the customer chose.

**The workshop.** A car comes in for a noise in the suspension. Open a job card, assign a mechanic and set the promised time. Parts taken from the counter go straight onto the job, and labour is added when it is done. Each mechanic\'s open jobs, labour for the month and commission due show on his page.

**Old parts back.** When a customer hands in the old part, it comes off the bill as a trade-in, then goes back to the supplier or to scrap.

**Bringing them back.** Every vehicle is kept by number plate with its owner, visits, spending and service history. Oil changes due by date or meter, and insurance, token tax and fitness renewals, are listed and sent on WhatsApp in one click.`,
  table: {
    heading: 'What changes at a Rawalpindi parts shop',
    caption: 'Everyday questions at the counter and in the workshop.',
    columns: ['Without a system', 'In Nafaa'],
    rows: [
      ['"Do you have this for a 2015 City?"', 'Ask the senior salesman', 'Search by make, model and year'],
      ['Genuine or local?', 'Told by the box, if it is still there', 'Grade, brand and warranty on the part card'],
      ['Car left for a day', 'A slip on the dashboard', 'Job card with mechanic, time and advance'],
      ['Mechanic\'s commission', 'Worked out at the end of the month', 'Labour and commission per mechanic'],
      ['Next oil change', 'Customer forgets, goes elsewhere', 'Reminder by date or meter on WhatsApp'],
    ],
  },
  shotB: {
    heading: 'Profit on parts and labour',
    body: 'Profit by product shows which parts and brands earn and which only sit on the shelf. Labour from the workshop shows next to it, so you see what each side of the business brings in.',
  },
  steps: {
    heading: 'Setting up a Rawalpindi parts shop',
    items: [
      ['Add your vehicles list', 'Pick the common Pakistani cars and bikes in one click.'],
      ['Enter parts with fitment', 'Part number, brand, grade and the vehicles each part fits.'],
      ['Add mechanics', 'Skills, rate and commission for each one.'],
      ['Open the first job card', 'Try it on a car in the workshop today.'],
    ],
  },
  questions: `## Questions from Rawalpindi parts dealers

### Mechanics take parts on credit. Can I keep their accounts?
Yes. Each mechanic or workshop can be a customer with a khata, so parts taken on credit and payments made later stay on his account, with reminders on WhatsApp.

### Can I find a part when the customer only has the old part number?
Yes. Search by the part number or an OEM or other number saved on the part card.

### Does it work without internet?
Yes. Bills are made on the device and sync when the connection returns.

### A workshop sends the same car every few months. Can I see what was done before?
Yes. Open the vehicle by its number plate. Every earlier job, the parts fitted, the mechanic who did the work and the money spent are listed, so the next diagnosis starts from the history instead of a guess.

### Can a salesman change a part\'s price at the counter?
Changing the price on a part card needs the permission to edit products, so salesmen bill at the listed price unless you allow more. A discount above the counter limit needs the discount-override permission.

### Is there more on this trade?
See the [auto parts page](/industries/autoparts), the [Rawalpindi mobile shop page](/pos-software/rawalpindi/mobile-shop) for the other Saddar trade, and [Rawalpindi](/pos-software/rawalpindi).`,
  cta: {
    heading: 'Find the right part faster',
    body: 'Free trial on your own phone or computer, with setup help on WhatsApp.',
  },
  siblings: ['rawalpindi/mobile-shop', 'rawalpindi/kiryana', 'gujranwala/hardware'],
  faqKeys: ['devices', 'offline', 'khata-reminders', 'pricing'],
  sources: [wiki('Saddar, Rawalpindi')],
  factNote:
    'Adamjee Road (from the five-road fuel station across Kashmir Road; beyond Kashmir Road "many shops selling spare auto parts for almost every model running in Pakistan"; Chhota Bazar after them) and Kashmir Road (Mall Road to Murree Road at Mareer Chowk; market for automobile spare parts) from Wikipedia\'s Saddar, Rawalpindi, opened 26 Oct 2026. Buyer types and grades are a general description of the trade, not a claim about any shop. Product claims checked against the auto parts pack (fitment editor, job cards, mechanics, vehicles, service reminders, core returns).',
};

export const rawalpindiPairs: PairCopy[] = [kiryana, garments, mobile, autoparts];
export const rawalpindi = rawalpindiPairs.map(pair);
