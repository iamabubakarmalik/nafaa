/**
 * Faisalabad pair pages, written from the public record of the Clock Tower's
 * eight bazaars, each known for its own goods:
 * - garments: Montgomery Bazaar (yarn, raw cloth), Rail Bazaar (gold, cloth),
 *   Chiniot Bazaar (cloth, blankets, curtains) and the city's textile trade
 * - mobile-shop: Katchery Bazaar (mobile phones and accessories)
 * - pharmacy: Chiniot Bazaar (allopathic and homoeopathic medicine stores)
 *   and Kharkhana Bazaar (herbal medicines)
 * - electronics: Bhawana Bazaar (electrical and electronic goods)
 * Skipped: kiryana (Jhang Bazaar sells fish, meat, vegetables and fruit, not
 * packaged groceries), restaurant, hardware and bakery (no public source for
 * a distinct local market).
 */

import { type PairCopy, pair, wiki } from './_build';

const BAZAARS = wiki('Faisalabad');
const CLOCK_TOWER = wiki('Clock Tower, Faisalabad');
const FESCO = wiki('Faisalabad Electric Supply Company');

const garments: PairCopy = {
  city: 'faisalabad',
  cityName: 'Faisalabad',
  industry: 'garments',
  title: 'Clothing and fabric shop POS in Faisalabad',
  summary:
    'Nafaa is POS for Faisalabad cloth, fabric and clothing shops: suits and fabric by design and colour, ready-made stock by size, stitching orders with saved measurements, and stock across branches. It fits a shop in the Clock Tower bazaars that buys from the city\'s mills and wholesalers and sells to families and tailors.',
  seoDescription: 'POS for Faisalabad cloth and clothing shops: fabric by design, sizes and colours, silai orders, wholesale buyers on khata and branch stock. Works offline.',
  focusKeyword: 'cloth shop pos faisalabad',
  sub: 'In the city of textile mills, a cloth shop sells lawn by the suit, fabric by the metre and ready pieces by size. Nafaa keeps all three straight.',
  badges: ['Fabric by design and colour', 'Wholesale buyers on khata', 'Silai orders'],
  facts: [
    ['Built for', 'Cloth and fabric shops, unstitched suit sellers, ready-made and tailoring shops'],
    ['Stock', 'Designs, colours and sizes, each with its own barcode'],
    ['Buyers', 'Walk-in families, tailors and smaller shops on khata'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Faisalabad ki kapre ki dukaan ke liye: suit design aur rang ke hisaab se, kapra meter me, ready-made size me, tailor aur choti dukaanon ka udhaar khata me, aur silai ka order naap ke saath.',
  local: `## Cloth in the Manchester of Pakistan

[Faisalabad](https://en.wikipedia.org/wiki/Faisalabad), founded as Lyallpur in the 1890s, is called the Manchester of Pakistan because of its textile industry, and Wikipedia describes it as the centre of the country\'s textile trade. Mills and power looms around the city turn out cotton and silk cloth, hosiery and clothing, and much of it passes through the city\'s own markets before it reaches shops elsewhere in Punjab.

The heart of that trade is the old city around the [Clock Tower](https://en.wikipedia.org/wiki/Clock_Tower,_Faisalabad), built in 1905. Eight roads run out from it in the pattern of the Union Jack, and each grew into a bazaar of its own, joined by a ring road called Gol Bazaar. Several of them are cloth markets. Montgomery Bazaar, also called Sutar Mandi, is known for yarn and raw cloth. Rail Bazaar is a gold and cloth market. Chiniot Bazaar sells cloth, blankets, sofa cloth and curtains alongside its medicine stores.

A Faisalabad cloth shop therefore sits close to its source. It can buy directly from mills and wholesalers a few streets away, which keeps prices tight and means new designs arrive quickly. It sells to several kinds of buyer: families choosing a suit for a wedding, tailors buying fabric for their customers, and smaller shops from nearby towns buying a few thans at a time on credit.

Margins in a market this close to the mills are thin, so knowing the cost and profit of each design matters more than in a city where cloth comes from far away. Faisalabad\'s power comes from FESCO, and outages still reach the bazaars, so the counter has to keep billing without power or internet.`,
  shotA: {
    heading: 'Stock in every branch, side by side',
    body: 'A shop in the Clock Tower bazaars and a second one in a newer market show their sale, profit, average bill, expenses and returns next to each other. Move a design from one branch to the other when it sells out in one.',
  },
  work: `## How a Faisalabad cloth shop runs on Nafaa

**A new lot from the mill.** Enter the design once and add its colours; each one gets a barcode label. Unstitched suits are sold by the suit, each design and colour with its own price and stock. Ready-made pieces use the size and colour grid, and an empty size shows in red.

**Buyers on credit.** A tailor or a shop from a nearby town takes fabric now and pays later. Bill it to his khata; his balance, its age and a WhatsApp reminder are one tap away. You see who owes for last month before you give the next lot.

**Stitching.** Families often buy fabric and stitching together. Save each customer\'s measurements, several sets if needed, and attach design photos, the karigar, the trial date and the advance to the silai order.

**Seasons and Sale.** Group stock into collections such as Summer Lawn, Eid or Winter, and put a percent Sale on a whole collection when the season ends. A piece can be held for a customer with a deposit or sold on a qist plan.

**Returns and exchanges.** A returned suit comes back on the original bill and pays toward the new one, so only the difference changes hands and the stock count stays right.`,
  table: {
    heading: 'Faisalabad cloth trade and the Nafaa screen for it',
    caption: 'Common jobs in a cloth shop near the mills.',
    columns: ['Done by hand', 'Done in Nafaa'],
    rows: [
      ['New designs every week', 'Codes written on the than', 'Design and colour with printed barcodes'],
      ['Which colours of a design are left', 'Walk to the back and count', 'Stock per design and colour in each branch'],
      ['Tailors and town shops on credit', 'A khata register per buyer', 'Khata with age of each balance, WhatsApp reminder'],
      ['Thin margins near the mills', 'Profit seen at year end', 'Profit by design, supplier and collection'],
      ['End-of-season stock', 'Marked down one piece at a time', 'Percent Sale on a whole collection'],
    ],
  },
  shotB: {
    heading: 'Which designs earned after cost',
    body: 'Profit by product, category, brand or supplier shows which mill\'s designs sold with a margin and which only moved at a loss, so the next order goes where the profit was.',
  },
  steps: {
    heading: 'Setting up a Faisalabad cloth shop',
    items: [
      ['Start the trial', 'Sign up on the phone or computer at the counter; no card needed.'],
      ['Add designs and colours', 'Print barcode labels for each colour of each design.'],
      ['Enter credit buyers', 'Each tailor and shop with what they owe today.'],
      ['Move open silai orders', 'Each pending order with its measurements, trial date and advance.'],
    ],
  },
  questions: `## Questions from Faisalabad cloth traders

### My brother runs our second shop in another market. Can I see his stock and sales?
Yes. Each branch has its own stock and counter, and the owner sees sales, profit, expenses and returns for both, side by side. A design that sells out in one shop can be moved from the other.

### Some buyers come from Jhang or Toba Tek Singh once a month. Can I see what each one owes?
Yes. Each buyer has a khata with every bill and payment, how old the balance is, and a WhatsApp reminder you can send in one tap.

### Can I see which supplier\'s designs make money?
Yes. The profit report groups sales by supplier, brand, category or product, after cost.

### What happens during an outage?
Bills are made on the device without internet and sync when the connection returns.

### Where can I compare with other cities?
See the [Lahore clothing page](/pos-software/lahore/garments) for a wholesale cloth market city, the [garments page](/industries/garments), and [Faisalabad](/pos-software/faisalabad) for other trades here.`,
  cta: {
    heading: 'Know the profit on every design',
    body: 'Free trial on the device at your counter, with setup help on WhatsApp.',
  },
  siblings: ['faisalabad/pharmacy', 'lahore/garments', 'karachi/garments'],
  faqKeys: ['garments-variants', 'garments-measurements', 'khata-reminders', 'pricing'],
  sources: [BAZAARS, CLOCK_TOWER, FESCO],
  factNote:
    'Faisalabad (founded as Lyallpur in the 1890s; "Manchester of Pakistan"; centre of the textile industry; cotton and silk textiles, hosiery, clothing), the eight bazaars around the Clock Tower in the Union Jack pattern joined by Gol Bazaar, Montgomery Bazaar (Sutar Mandi, yarn and raw cloth), Rail Bazaar (gold and cloth) and Chiniot Bazaar (cloth, blankets, sofa cloth, curtains) from Wikipedia\'s Faisalabad; Clock Tower built 1905 from its article; FESCO from Wikipedia. Opened 26 Oct 2026. Jhang and Toba Tek Singh are named only as nearby towns in a question. No shops named. Product claims checked against the garments pack.',
};

const mobile: PairCopy = {
  city: 'faisalabad',
  cityName: 'Faisalabad',
  industry: 'mobile-shop',
  title: 'Mobile shop software in Faisalabad',
  summary:
    'Nafaa is POS for Faisalabad mobile and accessory shops: handsets by IMEI with storage, RAM and colour, chargers and covers by barcode, repair job cards, trade-ins and qist plans. It suits a counter in Katchery Bazaar, the city\'s mobile phone and accessories market, or a shop elsewhere in the city.',
  seoDescription: 'Mobile shop software for Faisalabad: IMEI stock, accessories by barcode, repairs, trade-ins and qist plans, for Katchery Bazaar and city shops.',
  focusKeyword: 'mobile shop software faisalabad',
  sub: 'Katchery Bazaar is where Faisalabad buys its phones and accessories. Nafaa keeps the handsets by IMEI and the hundreds of small items by barcode.',
  badges: ['Accessories by barcode', 'IMEI stock', 'Repairs and qist'],
  facts: [
    ['Built for', 'Phone dealers, accessory shops and repair counters'],
    ['Handsets', 'IMEI, variant, PTA status and days on the shelf'],
    ['Accessories', 'Covers, chargers and cables sold by barcode or name'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Faisalabad ki mobile aur accessories ki dukaan ke liye: har phone IMEI ke saath, cover, charger aur cable barcode se, repair ka job card, purane phone ka trade-in aur qist ka hisaab.',
  local: `## Katchery Bazaar and the phone trade

Of the eight bazaars that run out from Faisalabad\'s [Clock Tower](https://en.wikipedia.org/wiki/Clock_Tower,_Faisalabad), one has become the city\'s phone market. Katchery Bazaar, named for the court (katchery) at its end, is known for mobile phones and accessories, according to the city\'s Wikipedia article. Like the other seven bazaars, it is joined to its neighbours by the circular Gol Bazaar, so customers walk from one shop to the next comparing prices.

A shop in a market like this has two very different kinds of stock. The phones are few but costly, and each one is different: its IMEI, its variant, its PTA status, what it cost and what it can sell for. The accessories are cheap but many: covers for dozens of models, chargers, cables, handsfree, screen protectors and memory cards. Losing track of either costs money, but in different ways. A missing phone is a large loss at once; small accessories leak margin slowly when nobody knows what was sold at what price.

Repairs bring customers back to the same counter, and many buyers ask to pay for a new phone in parts. Old phones come in too, either sold for cash or offered against a new one.

Faisalabad\'s power supply, from FESCO, still has outages, and the busiest evening hours are when a shop can least afford a counter that stops.`,
  shotA: {
    heading: 'Instalments and udhaar, with how long they have waited',
    body: 'Every customer on qist shows what is still to collect and how many days each amount has been pending. A WhatsApp reminder is one tap, and the payment lands on the same account.',
  },
  work: `## A day at a Katchery Bazaar counter

**Phones in.** Paste or scan the IMEIs of a delivery in one go, with storage, RAM and colour as variants, and note each set\'s PTA status. The IMEI list shows how long each phone has been on the shelf, so slow models get attention early.

**Accessories in.** Covers, chargers and cables are ordinary products with barcodes. Scan them at the counter, or search by name and model. The low-stock list shows which ones are running out before the next order.

**Old phones.** Before buying or accepting a trade-in, scan its IMEI: if your shop sold or repaired it, the history shows. Buy it for cash, take it against a new phone at the agreed value, or keep it to sell for its owner, with the seller\'s CNIC on the record.

**Repairs.** Each job card records the IMEI, the lock code, the SIM and memory card left, the fault, the estimate and the advance, and prints for the customer.

**Qist.** Split a phone into monthly instalments; the plan lists what is due this week and what is late.

**Closing.** The profit report shows margin per IMEI and per model, and on accessories and repairs, after the day\'s expenses.`,
  table: {
    heading: 'Phones and accessories need different control',
    caption: 'How Nafaa handles the two halves of a Faisalabad phone shop.',
    columns: ['Handsets', 'Accessories'],
    rows: [
      ['How each item is tracked', 'By IMEI, one row per phone', 'By product and barcode, counted in stock'],
      ['What goes wrong without a system', 'A set missing or sold below cost', 'Small items sold at the wrong price'],
      ['What to watch', 'Days on the shelf per IMEI', 'Low-stock list per item'],
      ['After the sale', 'Warranty lookup and repairs by IMEI', 'Exchange on the original bill'],
      ['Profit view', 'Profit per IMEI and per model', 'Profit per product and category'],
    ],
  },
  shotB: {
    heading: 'Where the margin comes from',
    body: 'Gross and net profit after expenses, profit per IMEI and margin on every model, with accessories and repairs in the same report, so you see which half of the shop pays the rent.',
  },
  steps: {
    heading: 'Starting a Faisalabad phone shop on Nafaa',
    items: [
      ['Enter phones on the shelf', 'Scan or paste IMEIs with variant and PTA status.'],
      ['Import accessories', 'Fill the Excel template with covers, chargers and cables, then check the dry run.'],
      ['Move open qist plans', 'Each customer with the balance and the next due date.'],
      ['Print a repair job card', 'Check the slip on your printer before the first repair.'],
    ],
  },
  questions: `## Questions from Faisalabad phone dealers

### I sell accessories wholesale to smaller shops too. Can they buy on credit?
Yes. Each shop can be a customer with a khata. Bills add to the balance, payments reduce it, and a reminder goes on WhatsApp.

### Can my helper sell accessories but not buy used phones?
Yes. Buying phones and taking trade-ins needs the permission to manage IMEI stock, so a helper can run the counter without it.

### Does it work on a phone?
Yes. It runs in the browser on any phone, tablet or computer, and keeps billing without internet.

### A customer says his phone was bought from my shop. How do I check?
Scan the IMEI. If your shop sold it, the bill, the date, the customer and the warranty left all show, and any repair done at your counter is listed under the same IMEI. If it was never sold by you, that is clear at once too, before you agree to a warranty repair.

### Can I see which accessories actually sell?
Yes. The profit report lists every product and category with its quantity, sale and margin, so covers for models nobody uses any more stand out, and the next order goes to what customers ask for.

### Where can I read more?
See [IMEI records for mobile shops](/blog/mobile-shop-imei-records), the [mobile shop page](/industries/mobile-shop) and [Faisalabad](/pos-software/faisalabad).`,
  cta: {
    heading: 'Keep every phone and every cover on record',
    body: 'Free trial on the phone you already use. Setup help on WhatsApp.',
  },
  siblings: ['faisalabad/electronics', 'rawalpindi/mobile-shop', 'lahore/mobile-shop'],
  related: ['BLOG_POST:mobile-shop-imei-records'],
  faqKeys: ['mobile-imei', 'mobile-used', 'kiryana-import', 'pricing'],
  sources: [BAZAARS, CLOCK_TOWER, FESCO],
  factNote:
    'Katchery Bazaar ("named for the court (Katchery), is known for its mobile phone and accessory market") and the eight bazaars joined by Gol Bazaar from Wikipedia\'s Faisalabad; FESCO from Wikipedia. Opened 26 Oct 2026. No shops named. Product claims checked against the mobile pack (IMEI stock, PTA status, used phones, repairs, EMI plans), the import page and the IMEI permission in UsedPhonesPage.tsx.',
};

const pharmacy: PairCopy = {
  city: 'faisalabad',
  cityName: 'Faisalabad',
  industry: 'pharmacy',
  title: 'Pharmacy software in Faisalabad',
  summary:
    'Nafaa is pharmacy software for Faisalabad medical stores: medicines found by brand or salt with substitutes, stock by batch and expiry, the narcotic register, fridge temperature logs and prescriptions. It suits a store in Chiniot Bazaar, the old city\'s medicine market, or a pharmacy in a newer part of the city.',
  seoDescription: 'Pharmacy software for Faisalabad medical stores: salt search and substitutes, batch and expiry, narcotic register, cold chain log and prescriptions.',
  focusKeyword: 'pharmacy software faisalabad',
  sub: 'Find a medicine by its salt, sell a strip or a box, keep batches and expiry in view and the narcotic register in order, at the speed of a busy counter.',
  badges: ['Salt search and substitutes', 'Batch and expiry', 'Narcotic register'],
  facts: [
    ['Built for', 'Medical stores, pharmacies and stores with allopathic and homoeopathic sections'],
    ['Counter', 'Brand or salt search, loose tablets, strips and boxes'],
    ['Records', 'Batch and expiry, narcotic register, fridge temperatures'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Faisalabad ke medical store ke liye: dawai brand ya salt se dhoondo, goli, patta ya dabba becho, batch aur expiry nazar me rahe, narcotic register aur fridge ka temperature bhi likha rahe.',
  local: `## Faisalabad's medicine markets

Faisalabad\'s old city has a medicine market of its own. Of the eight bazaars that run out from the [Clock Tower](https://en.wikipedia.org/wiki/Clock_Tower,_Faisalabad), Chiniot Bazaar is known for allopathic and homoeopathic medicine stores, alongside its cloth and blanket shops and its poultry-feed wholesalers. Karkhana Bazaar, another of the eight, is known for herbal medicines. Both are joined to the rest of the old city by the circular Gol Bazaar, according to the city\'s [Wikipedia article](https://en.wikipedia.org/wiki/Faisalabad).

That puts Faisalabad\'s medical stores in an unusual mix. A store in the old city may stock branded allopathic medicine, a shelf of homoeopathic remedies and herbal products side by side, and serve both walk-in patients and smaller stores from the surrounding towns that buy in quantity. Stores in newer parts of the city serve the families around them, many of whom come back every month for the same prescription.

The work is the same everywhere. A patient asks for a brand that is out of stock and needs a substitute with the same salt. A strip is opened and sold tablet by tablet. Boxes reach their expiry date at the back of the shelf. Controlled medicines need a register with the patient and the doctor, and insulin and vaccines need a fridge kept between two and eight degrees.

Pharmacies are licensed and inspected under drug laws; our [DRAP page](/compliance/drap-pharmacy) explains the federal side. Power for the city comes from FESCO, and a counter that can bill through an outage matters when a patient is waiting.`,
  shotA: {
    heading: 'What is running out and what to order',
    body: 'The low-stock view shows medicines expiring in the next 30 days, how many days the current stock will last at the usual rate of sale, and what to order with its cost.',
  },
  work: `## A day at a Faisalabad medical store

**At the counter.** A patient asks for a brand you do not have. Search by the salt and Nafaa lists the other brands with the same salt, their price and how many are on your shelf. Sell a loose tablet, a strip or a box from the same medicine, each at its own price.

**Prescriptions.** Record the prescription with the doctor\'s name, dispense it in full or in part, and refill it next month without typing it again. If you have recorded that two salts clash, a prescription with both shows a warning before it is given. The doctors\' list shows whose prescriptions you fill and how many.

**Controlled medicines.** Narcotic and psychotropic sales go into the register with the patient and the doctor as they are billed, so the register is never written up at the end of the week.

**The fridge.** Record the fridge temperature twice a day. Readings outside two to eight degrees are marked, and the log is ready if an inspector asks.

**Expiry.** Stock is kept by batch with its expiry date. Items inside 30 and 90 days are flagged with the money at stake, and a near-expiry batch can go back to the distributor it came from or be written off.

**Regular patients.** Families who pay monthly keep a khata, with reminders on WhatsApp.`,
  table: {
    heading: 'Registers a Faisalabad pharmacy keeps, on paper and in Nafaa',
    caption: 'The records a medical store keeps, and where each one lives in the app.',
    columns: ['On paper', 'In Nafaa'],
    rows: [
      ['Substitute for an out-of-stock brand', 'Asked from memory or a book', 'Salt search with price and shelf stock'],
      ['Expiry', 'Found when a box is picked', 'Batches flagged at 30 and 90 days with money at stake'],
      ['Narcotic register', 'Written up later by hand', 'Filled as the sale is billed'],
      ['Fridge temperature', 'A sheet on the fridge door', 'Twice-daily log, out-of-range readings marked'],
      ['Monthly patients', 'Names in the back of a register', 'Khata with WhatsApp reminders'],
    ],
  },
  shotB: {
    heading: 'Udhaar for regular patients',
    body: 'The khata shows the total still to collect and each family\'s balance. Record a payment or send a reminder on WhatsApp from the same screen.',
  },
  steps: {
    heading: 'Setting up a Faisalabad pharmacy',
    items: [
      ['Import your medicines', 'Brand, salt, pack sizes and prices from Excel, checked in a dry run.'],
      ['Enter batches and expiry', 'Start with what is on the shelf now; new purchases add their own batches.'],
      ['Mark controlled items', 'So their sales go into the narcotic register by themselves.'],
      ['Add regular patients', 'Each family once, with any balance they owe.'],
    ],
  },
  questions: `## Questions from Faisalabad medical stores

### I keep homoeopathic and herbal products as well. Can they go in the same stock?
Yes. They are products like any other, with their own categories, so they sell from the same counter and show separately in reports.

### Smaller stores from nearby towns buy from me in quantity. Can they have credit?
Yes. Each store can be a customer with a khata, so bills and payments stay on its account with reminders on WhatsApp.

### Can I sell one tablet from a strip?
Yes. A medicine can be sold by the tablet, the strip or the box, each with its own price, and stock is counted correctly.

### What happens during an outage?
Billing continues on the device without internet and syncs when the connection is back.

### Can I return a near-expiry batch to the distributor?
Yes. Pick the batch from the expiring list and send it back to the distributor it came from, or write it off if he will not take it. Either way the stock and the money at stake update, so the expiring list stays honest and you can see how much expiry cost you this month.

### Where can I read more?
See the [pharmacy page](/industries/pharmacy), our guide to [pharmacy expiry management](/blog/pharmacy-expiry-management) and [Faisalabad](/pos-software/faisalabad).`,
  cta: {
    heading: 'Keep every batch and register in order',
    body: 'Free trial on the computer or phone at your counter. Send your medicine list on WhatsApp and we help you import it.',
  },
  siblings: ['faisalabad/garments', 'faisalabad/electronics', 'karachi/kiryana'],
  related: ['COMPLIANCE:drap-pharmacy', 'BLOG_POST:pharmacy-expiry-management'],
  faqKeys: ['pharmacy-salt', 'pharmacy-expiry', 'pharmacy-register', 'offline', 'pricing'],
  sources: [BAZAARS, CLOCK_TOWER, FESCO],
  factNote:
    'Chiniot Bazaar ("allopathic and homoeopathic medicinal stores, cloth, blankets, sofa cloth, and curtains"; poultry feed wholesale) and Karkhana (Kharkhana) Bazaar ("herbal medicines") from Wikipedia\'s Faisalabad; Clock Tower and Gol Bazaar from the same article and the Clock Tower article; FESCO from Wikipedia. Opened 26 Oct 2026. Drug licensing is mentioned only generally, with a link to our DRAP page. No stores named. Product claims checked against the pharmacy pack (salts, substitutes, expiring, controlled log, temperature log, prescriptions, doctors).',
};

const electronics: PairCopy = {
  city: 'faisalabad',
  cityName: 'Faisalabad',
  industry: 'electronics',
  title: 'Electronics shop software in Faisalabad',
  summary:
    'Nafaa is POS for Faisalabad electronics and electrical shops: each costly unit kept by serial number with its warranty, claims opened from the serial, bundles priced with their saving and profit, and trade-ins of used units. It suits a shop in Bhawana Bazaar, the old city\'s electrical and electronics market.',
  seoDescription: 'Electronics shop software for Faisalabad: serial numbers and warranty, claims, bundles, trade-ins and condition grading, for Bhawana Bazaar and city shops.',
  focusKeyword: 'electronics shop software faisalabad',
  sub: 'From switches and wire by the coil to LEDs and laptops by serial number: one counter for the small parts and the big-ticket units of an electrical shop.',
  badges: ['Serial and warranty', 'Warranty claims', 'Bundles and trade-ins'],
  facts: [
    ['Built for', 'Electronics, electrical goods and computer shops'],
    ['Costly units', 'Serial number, cost, buyer and warranty for each'],
    ['After sale', 'Warranty lookups and claims from the serial'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Faisalabad ki electronics aur bijli ke saman ki dukaan ke liye: mehngi cheez serial number aur warranty ke saath, claim serial se khule, bundle ka munafa saamne, aur purana saman trade-in me.',
  local: `## Bhawana Bazaar and Faisalabad's electrical trade

Faisalabad\'s old city is laid out around the [Clock Tower](https://en.wikipedia.org/wiki/Clock_Tower,_Faisalabad), with eight bazaars running out from it and a circular Gol Bazaar joining them. Each bazaar became known for its own goods, and for electrical and electronic goods the name is Bhawana Bazaar, according to the city\'s [Wikipedia article](https://en.wikipedia.org/wiki/Faisalabad).

An electrical shop in a bazaar like this sells two kinds of goods at once. Switches, sockets, wire, bulbs, fans\' spare parts and fittings sell in quantity at low prices, often to electricians who come back every few days. Televisions, LEDs, laptops, inverters and other costly units sell one at a time, each with a serial number, a warranty and a customer who will come back if it fails.

Faisalabad is also a manufacturing city, and many buyers are small businesses, workshops and contractors who buy on account and settle later. An electrician wiring a new house takes material over several days and pays when the owner pays him.

What goes wrong without records is predictable: a unit comes back under warranty and nobody can find when or to whom it was sold; a bundle offered to win a sale turns out to have made a loss; a trade-in sits in the back room at a value nobody remembers. FESCO outages add to it, because the counter has to keep billing when the power drops.`,
  shotA: {
    heading: 'Warranty claims from the serial number',
    body: 'Claims still open, units in repair, and each claim tied to its customer and serial. Close a claim as repaired, replaced, refunded or rejected, and the history stays with the unit.',
  },
  work: `## A day at a Bhawana Bazaar counter

**Stock in.** Each costly unit gets its own row with its serial or IMEI, the purchase bill and its cost. Small items like switches and wire are ordinary products counted in stock. Specs that fit the product type, the warranty terms and what comes in the box are saved on the product.

**Selling the exact unit.** Scan the serial at the counter and that exact unit goes on the bill, linked to the customer. Condition grading marks a unit as brand new, open box, refurbished, used, damaged or for parts, so the price and the warranty match what the customer is getting.

**Bundles.** Put a television with a soundbar, or a laptop with a bag and a mouse, at one deal price. The bundle shows the saving against the full price, the profit, and how many you can make from stock.

**A unit comes back.** Search the serial: the sale, the buyer and the warranty left show at once. Open a claim, send the unit to repair or to the company, and close it when it is done.

**Trade-ins.** Buy a customer\'s old unit against a new purchase. It enters stock at the price you paid and can be sold on.

**Electricians and contractors.** Material taken on account goes on their khata, with the age of each balance and a WhatsApp reminder.`,
  table: {
    heading: 'Small parts and big units in one Faisalabad shop',
    caption: 'How the two sides of an electrical and electronics shop are kept.',
    columns: ['Small parts and fittings', 'Costly units'],
    rows: [
      ['How stock is counted', 'By quantity per product', 'One row per serial number'],
      ['Typical buyer', 'Electricians and contractors on khata', 'Families and businesses, often once'],
      ['After the sale', 'Exchange on the original bill', 'Warranty lookup and claims by serial'],
      ['Selling more', 'Combos at one price', 'Bundles with saving and profit worked out'],
      ['Used goods', 'Rarely', 'Trade-in at the price paid, graded by condition'],
    ],
  },
  shotB: {
    heading: 'Bundles that still make a profit',
    body: 'The bundle price sits next to the full price, with the saving, the profit and how many bundles your stock can make, so a deal to close a sale never turns into a loss.',
  },
  steps: {
    heading: 'Setting up a Faisalabad electronics shop',
    items: [
      ['Import small items', 'Switches, wire and fittings from Excel, checked in a dry run.'],
      ['Enter costly units by serial', 'Scan or paste serials with their cost and warranty terms.'],
      ['Add electricians on account', 'Each one once, with what he owes today.'],
      ['Build your first bundle', 'Pick the items, set the deal price and check the profit.'],
    ],
  },
  questions: `## Questions from Faisalabad electronics shops

### A customer lost his warranty card. Can I still check?
Yes. Search the serial number. The sale date, the customer and the warranty left show, so the card is not needed.

### Two salesmen bill at the same time. Will the stock get confused?
No. Each one bills from his own phone or computer against the same stock, so a unit sold on one device is gone from the others, and the owner sees every bill as it is made.

### Can I sell a used laptop and mark it as used?
Yes. Condition grading marks it as used, refurbished or open box, and it can be bought in as a trade-in at the price you paid.

### What happens during load-shedding?
Bills are made on the device without internet and sync when the connection returns.

### Can I see which units have been in stock too long?
Yes. Every serial has its own row with the purchase bill and the date it came in, so a television or laptop that has sat for months is easy to find before its model is replaced. The profit report then shows which brands and categories actually earn after cost, and which only take up shelf space and cash.

### Where can I read more?
See the [electronics page](/industries/electronics), the [Faisalabad mobile shop page](/pos-software/faisalabad/mobile-shop) for the phone side of the bazaar, and [Faisalabad](/pos-software/faisalabad).`,
  cta: {
    heading: 'Put every serial number on record',
    body: 'Free trial on the device at your counter, with setup help on WhatsApp.',
  },
  siblings: ['faisalabad/mobile-shop', 'lahore/electronics', 'peshawar/electronics'],
  faqKeys: ['devices', 'offline', 'khata-reminders', 'pricing'],
  sources: [BAZAARS, CLOCK_TOWER, FESCO],
  factNote:
    'Bhawana Bazaar ("supplies electrical and electronic goods") and the eight bazaars joined by Gol Bazaar from Wikipedia\'s Faisalabad; Clock Tower from its article; FESCO from Wikipedia. Opened 26 Oct 2026. Buyer types (electricians, contractors) are a general description of the trade, not a claim about any shop. Product claims checked against the electronics pack (serial tracking, warranty claims, bundles, trade-in, condition grading, specs) and retail combos.',
};

export const faisalabadPairs: PairCopy[] = [garments, mobile, pharmacy, electronics];
export const faisalabad = faisalabadPairs.map(pair);
