/**
 * Lahore pair pages. Built where the Walled City of Lahore Authority's bazaar
 * directory or Wikipedia names a market for the trade:
 * - kiryana: Akbari Mandi, Papper Mandi, Shah Alam Market
 * - garments: Azam Cloth Market, Pakistan Cloth Market, Kinaari and Gumti
 *   bazaars, Anarkali, Ichhra, Liberty
 * - electronics: Hall Road and Hafeez Center
 * - mobile-shop: the phone side of Hall Road (IMEI, PTA, used sets, qist)
 * - restaurant: Fort Road and Gawalmandi food streets, MM Alam Road, Anarkali
 * - hardware: Loha Market, Kasera Bazaar, Brandreth Road
 * - shoe: Moti Bazar, Sheikhupurian Bazar, Wacho Wali Bazaar
 * - jewelry: Sarafa (Sooha) Bazar
 * - optical: Ainak Market
 * Skipped: pharmacy and bakery (no public, Lahore-specific market material
 * that would make the page more than a copy of the industry page).
 */

import { type PairCopy, WCLA_BAZAARS, pair, src, wiki } from './_build';

const BRANDRETH_THESIS = src(
  'Relocation of Brandreth Road market (architecture thesis, 2020)',
  'https://escholar.umt.edu.pk/items/d2658e62-2413-40b9-a8a7-73550aa61bee',
  'University of Management and Technology, Lahore',
);

const kiryana: PairCopy = {
  city: 'lahore',
  cityName: 'Lahore',
  industry: 'kiryana',
  title: 'Kiryana POS software in Lahore',
  summary:
    'Nafaa is POS, stock and khata software for Lahore kiryana and general stores. Goods bought by the bori and carton in the old city sell by the kilo, packet or piece, each with its own price; every regular family keeps a khata with WhatsApp reminders; and the counter keeps billing through load-shedding.',
  seoDescription: 'Kiryana POS for Lahore general stores: wholesale and retail prices, kilo and bori units, digital khata with WhatsApp reminders, billing through load-shedding.',
  focusKeyword: 'kiryana pos lahore',
  sub: 'For the general store that restocks daal, chawal and masala from the walled city\'s wholesale lanes and sells them by the pao and the kilo in Samanabad, Shadbagh or Township.',
  badges: ['Wholesale and retail rate', 'Pao, kilo and bori', 'Khata with reminders'],
  facts: [
    ['Built for', 'Kiryana, general stores and small grocery marts across Lahore'],
    ['Units', 'Bori, carton, dozen, kilo or piece on the same product'],
    ['Khata', 'Running balance per family, reminders on WhatsApp'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Lahore ki kiryana dukaan ke liye: Akbari Mandi se bori aur carton me maal aaye, counter par pao, kilo ya packet me bike. Har ghar ka udhaar khata me, aur bijli jaye to bhi bill bante rahen.',
  local: `## Where a Lahore general store gets its stock

Much of Lahore's dry grocery still passes through the walled city. Akbari Mandi was set up as a grain market in the time of Emperor Akbar and is still trading; the Walled City of Lahore Authority describes it today as the wholesale market for grains, spices, herbs and chemicals. A short walk away, Papper Mandi deals in herbs, perfumes, murabba and the plastic bottles many shops pack them in, and Shah Alam Market supplies cosmetics, accessories and small household goods that fill the front shelves of a neighbourhood store.

From there the chain is simple and old. A store owner or his supplier buys rice, pulses, sugar and spices by the bori, a carton of soap or a tin of ghee, and the shop breaks it into the small amounts its customers ask for: a pao of red chilli, half a kilo of moong, one sachet of shampoo. Prices in the wholesale lanes move with the season, and a margin that looked fine in Ramazan can be gone by winter if nobody checks what the last bori actually cost.

Most of the trade outside the old city is on trust. A store in Mozang or Shadbagh knows its families by name, gives goods through the month and collects when salaries arrive. Load-shedding from the LESCO grid is part of the routine in many areas, so the counter has to keep working on a charged phone or laptop when the lights go.`,
  shotA: {
    heading: 'A counter for loose and packed goods',
    body: 'Scan packed items with a barcode reader, tap a quick key for loose sugar or eggs, and choose the unit at the counter. The bill shows stock left on each item and takes cash, JazzCash, Easypaisa or udhaar.',
  },
  work: `## A week in a Lahore kiryana, step by step

**After the mandi trip.** Enter the wholesaler's bill as a purchase. The bori of basmati, the masala packs and the soap cartons go into stock at the price you paid, and if you settled part of the bill, the rest stays on the supplier's account. Next week you can see whether chana daal went up again.

**Pricing.** Each product keeps a retail price and, if you sell to small hotels or other shops, a wholesale price too. The cashier picks the wholesale rate for that customer and the normal rate for everyone else, so nobody has to remember two price lists.

**Through the day.** Children come with a list and the family's name. Each item goes on that family's khata, and the balance updates on the bill. If the lights go, the bill is still made on the device and synced later.

**Damage and expiry.** A burst packet of daal or a jar past its date is written off as damage, so it leaves stock and shows as a cost instead of quietly disappearing.

**Month end.** Sort the khata by amount and age, and send each family its balance on WhatsApp, one message at a time.`,
  table: {
    heading: 'What changes for a Lahore kiryana',
    caption: 'Jobs that take time in a busy store, and how they run in Nafaa.',
    columns: ['Done by hand', 'In Nafaa'],
    rows: [
      ['Wholesale rate for a hotel, retail for a family', 'Two price lists in the owner\'s head', 'Wholesale and retail price on the product'],
      ['Bori bought, pao sold', 'Margin guessed at the counter', 'Each unit priced, profit per product'],
      ['Supplier balance from the mandi', 'Slip in a drawer', 'Purchase bill with the amount still owed'],
      ['Damaged and expired goods', 'Thrown away, never counted', 'Written off as damage, seen as cost'],
      ['Load-shedding at peak time', 'Calculator and memory', 'Bills on the device, synced later'],
    ],
  },
  shotB: {
    heading: 'The udhaar register in one place',
    body: 'Each family\'s udhaar, payments and old register balance sit on one khata. The list shows who owes most and for how long, and a WhatsApp reminder goes out from the same screen.',
  },
  steps: {
    heading: 'Moving a Lahore general store onto Nafaa',
    items: [
      ['Import your item list', 'Fill the Excel template or send photos of your register; check it in a dry run, then import.'],
      ['Add units and two rates', 'Set bori, carton, kilo or piece, with a wholesale rate where you need one.'],
      ['Copy the khata balances', 'Each regular family is added once with the balance from the paper register.'],
      ['Set quick keys', 'Loose sugar, eggs, bread and daal become one tap each.'],
    ],
  },
  questions: `## Questions from Lahore store owners

### I sell to small hotels at a lower rate. Can the counter handle that?
Yes. A product can carry a wholesale price beside its retail price, and the cashier chooses it for that customer. Units such as bori and kilo can also carry their own prices.

### Can I see which items earn the most after the last price change?
Yes. Profit by product uses the cost from your latest purchase bills, so when the mandi rate for a spice rises you see the margin drop.

### Do I need PRA or FBR integration?
Most neighbourhood stores do not. Optional FBR/PRA integration is there for a business that is required to report; the [PRA page](/compliance/pra-punjab) explains who that is.

### I have two stores, one in the old city and one in a society. Can I see both?
Yes. Each branch has its own counter and stock, and the owner sees both from one account. The [Lahore page](/pos-software/lahore) covers the other trades in the city.`,
  cta: {
    heading: 'Bring your Lahore store\'s register onto one screen',
    body: 'Try it free on the phone or computer at your counter. Send your item list on WhatsApp and we set it up with you.',
  },
  siblings: ['lahore/garments', 'karachi/kiryana', 'rawalpindi/kiryana'],
  related: ['COMPLIANCE:pra-punjab'],
  faqKeys: ['kiryana-units', 'kiryana-import', 'khata-reminders', 'offline', 'pricing'],
  sources: [WCLA_BAZAARS, wiki('Walled City of Lahore'), wiki('Lahore Electric Supply Company')],
  factNote:
    'Akbari Mandi founded under Akbar and still a grain market (Wikipedia: Walled City of Lahore); Akbari Mandi (grains, spices, herbs, chemicals), Papper Mandi (herbs, perfumes, murabba, plastic bottles) and Shah Alam Market (accessories, cosmetics, electronic goods) from the Walled City of Lahore Authority bazaar page, opened 26 Oct 2026. LESCO as the grid from Wikipedia. Localities named are public areas; no shops or customers. Wholesale price: apps/web/src/modules/inventory/products/pages/ProductFormPage.tsx and core/lib/offline/offlineSales.ts (useWholesale).',
};

const garments: PairCopy = {
  city: 'lahore',
  cityName: 'Lahore',
  industry: 'garments',
  title: 'Clothing shop POS in Lahore',
  summary:
    'Nafaa is POS for Lahore clothing, fabric and boutique shops: every article by size and colour with its own barcode, silai orders with saved measurements, exchanges on the original bill, and Sale on a whole collection. It suits a shop that buys from Azam Cloth Market and sells in Anarkali, Ichhra or Liberty.',
  seoDescription: 'POS for Lahore clothing shops: size and colour barcodes, silai orders with measurements, exchanges, layaway for bridal wear and Eid collections across branches.',
  focusKeyword: 'clothing shop pos lahore',
  sub: 'Fabric from the walled city\'s wholesale lanes, embroidered suits for wedding season, ready-made stock for Eid: one app for the counter, the tailor and every branch.',
  badges: ['Size and colour barcodes', 'Silai with naap', 'Wedding-season holds'],
  facts: [
    ['Built for', 'Fabric shops, ready-made stores, boutiques and tailors'],
    ['Stock', 'Size × colour grid, transfers between branches'],
    ['Orders', 'Silai, alterations, holds with deposit and qist'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Lahore ki kapre ki dukaan ke liye: Azam Cloth Market se than aur suit aayen, har size aur rang ka barcode bane, silai ka order naap ke saath, aur shaadi ke joray par advance aur qist ka hisaab.',
  local: `## Lahore's cloth trade, from wholesale to boutique

The Walled City of Lahore Authority describes Azam Cloth Market, inside Delhi Gate, as the largest wholesale cloth market in Asia, supplying cloth beyond Pakistan as well. Around it sit markets that do one job each: Pakistan Cloth Market sells clothing at retail, Kinaari Bazar is known for embroidered cloth for weddings and festivals, and Gumti Bazar for embroidered clothing and bridal dresses on rent.

Outside the walls, [Anarkali Bazaar](https://en.wikipedia.org/wiki/Anarkali_Bazaar) is one of the oldest surviving markets in the subcontinent; its shops sell textiles, garments and jewellery, and New Anarkali is known for handicraft and embroidery. [Ichhra Bazaar](https://en.wikipedia.org/wiki/Ichhra) is counted among the city's most economical markets, with traditional dresses supplied from across Punjab. Liberty Market and Main Boulevard Gulberg are where many branded and designer outlets sit.

A Lahore clothing business usually touches several of these. It buys unstitched suits and than cloth in the old city, sells some as fabric, sends some to its tailors, and keeps ready-made pieces in a range of sizes at a second shop in a society or a mall. The calendar is set by Eid and by the winter wedding season, when bridal and formal orders come with deposits, trial dates and balances to collect.

That is a lot of paper: order books, measurement cards, deposit slips and exchange chits, often kept by different people.

Payment habits add to it. Wholesale buyers in the old city still settle much of their trade in cash and on running accounts with their suppliers, while a boutique in DHA or Gulberg takes cards and wallet transfers for the same kind of suit. A business with both kinds of shop needs one place where every sale, deposit and balance lands, whatever way it was paid.`,
  shotA: {
    heading: 'Old-city shop and society branch, side by side',
    body: 'Sale, profit, average bill, expenses and returns per branch on one dashboard. When the Gulberg branch runs out of a size the old-city shop still has, transfer the pieces and both stocks update.',
  },
  work: `## How a Lahore clothing business runs on Nafaa

**A new lot arrives.** Build the article once: brand, collection and the size and colour grid. Every variant gets its own barcode to print, and empty sizes show in red, so you see the gaps before a customer asks.

**Wedding season.** A customer chooses an embroidered suit for a mehndi. Hold it with a deposit, or put it on a qist plan with weekly or monthly payments. The piece stays off the shelf and the balance stays on her account.

**Silai and alterations.** Her measurements are saved once and reused, several sets per customer if the family orders together. The order carries the design pictures, the karigar, the trial date and the advance. Alterations get a token and a due date, and the customer hears on WhatsApp when it is ready.

**Eid.** Group stock into a collection such as Eid or Winter and put a percent Sale on the whole collection at once, instead of re-tagging every piece.

**After the rush.** Exchanges come back against the original bill; the returned piece pays toward the new one and only the difference changes hands. Size charts for chest, length and waist are ready to show a customer who is unsure.`,
  table: {
    heading: 'Lahore clothing shops and where to begin',
    caption: 'The first screens to set up, depending on what the shop sells.',
    columns: ['Set up first', 'Add later'],
    rows: [
      ['Fabric and unstitched suits', 'Articles by design and colour, barcodes', 'Collections with a Sale'],
      ['Embroidered and bridal wear', 'Holds with deposit, qist plans', 'Profit by collection'],
      ['Ready-made shop with branches', 'Size × colour grid, transfers', 'Exchange rules per role'],
      ['Boutique with in-house tailors', 'Silai orders with measurements', 'Alterations with WhatsApp updates'],
      ['Tailor counter', 'Alteration tokens and due dates', 'Saved measurements per family'],
    ],
  },
  shotB: {
    heading: 'Which articles carried the season',
    body: 'Profit and margin on every article, by product, category, brand or supplier. Before the next trip to the wholesale market you can see which designs sold through and which are still folded on the shelf.',
  },
  steps: {
    heading: 'Setting up a Lahore clothing shop',
    items: [
      ['Start the free trial', 'Sign up on the computer or phone at the counter.'],
      ['Enter current stock by article', 'Use the size and colour grid, then print the labels.'],
      ['Add pending orders', 'Every open silai order with its measurements, trial date and advance.'],
      ['Decide the exchange window', 'Set the days allowed and which roles may approve a late one.'],
    ],
  },
  questions: `## Questions from Lahore clothing shops

### Can I hold a bridal outfit until the family pays the rest?
Yes. Put it on hold with a deposit, or on a qist plan. It stays reserved and the balance shows on the customer's account until it is paid.

### One family orders five suits for a wedding. Do I enter the measurements five times?
No. A customer can have several saved measurement sets, one per person, and each order picks the right one.

### My tailors work in a separate workshop. Can I still track the orders?
Yes. Each silai order lists the karigar and the due date and moves through its stages wherever the stitching is done.

### Can I sell the same lawn print as fabric and as a stitched suit?
Yes. Keep the unstitched suit as one product and the stitched piece as another with its own sizes and price, so stock and profit stay separate for each.

### Where can I read about planning stock for the season?
See [seasonal stock planning for garment shops](/blog/garment-shop-seasonal-stock-planning) and the [clothing shop page](/industries/garments).`,
  cta: {
    heading: 'Get your Lahore shop ready for wedding season',
    body: 'Free trial on the device you already have, with setup help on WhatsApp in Urdu or English.',
  },
  siblings: ['lahore/shoe', 'karachi/garments', 'faisalabad/garments'],
  related: ['BLOG_POST:garment-shop-seasonal-stock-planning'],
  faqKeys: ['garments-variants', 'garments-measurements', 'garments-layaway', 'pricing'],
  sources: [WCLA_BAZAARS, wiki('Anarkali Bazaar'), wiki('Ichhra'), wiki('Shopping in Lahore')],
  factNote:
    'Azam Cloth Market (inside Delhi Gate, largest wholesale cloth market in Asia per the Authority), Pakistan Cloth Market (retail clothing), Kinaari Bazar (embroidered cloth for weddings and festivals) and Gumti Bazar (embroidered clothing, bridal dress rentals) from the Walled City of Lahore Authority bazaar page; Anarkali (oldest surviving markets, textiles, garments, jewellery, New Anarkali handicraft and embroidery), Ichhra (economical market, traditional dresses from across Punjab) and Liberty / Main Boulevard Gulberg (Shopping in Lahore) from Wikipedia; all opened 26 Oct 2026. The Authority\'s shop count is not repeated. No shops named.',
};

const electronics: PairCopy = {
  city: 'lahore',
  cityName: 'Lahore',
  industry: 'electronics',
  title: 'Electronics shop POS in Lahore',
  summary:
    'Nafaa is POS for Lahore electronics dealers: every TV, laptop, UPS or camera kit kept by serial number, the exact unit scanned onto the bill, warranty claims opened from the serial, and bundle prices with the profit worked out. It fits a Hall Road counter, a Hafeez Center shop or a dealer with both.',
  seoDescription: 'Electronics POS for Lahore dealers on Hall Road and in Hafeez Center: serial numbers, warranty claims, bundles, condition grading and trade-ins.',
  focusKeyword: 'electronics shop pos lahore',
  sub: 'UPS units, solar inverters, CCTV kits, LED TVs and laptops: track each costly unit by serial from the importer\'s bill to the customer, and answer warranty questions in seconds.',
  badges: ['Serial per unit', 'Warranty claims', 'Bundles with profit'],
  facts: [
    ['Built for', 'Electronics, computer, CCTV, UPS and solar equipment dealers'],
    ['Units', 'Serial number, purchase cost, buyer and warranty on each one'],
    ['After sale', 'Warranty check and claims from the serial'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Lahore ki electronics dukaan ke liye: har UPS, TV aur laptop ka serial number, bill par wahi unit, warranty claim serial se, aur bundle ka munafa saath saath.',
  local: `## Hall Road and the Lahore electronics trade

[Hall Road](https://en.wikipedia.org/wiki/Hall_Road,_Lahore) runs near the Mall and takes its name from four large halls the British built along it. Today those buildings are the hub of Lahore's digital electronics and home appliances: TVs, audio equipment, computers and laptops, video games and phones. It is also one of the largest markets for imported electronics in the city, from CCTV camera accessories, loudspeakers and magnets to wires and cables, UPS units, generators and solar equipment. The road is one-way and usually packed, and it has seen fires in 2012, 2018 and 2021.

The city's shopping guides list Hafeez Center in Gulberg alongside Hall Road as Lahore's main electronics markets, with computer and accessory counters on floor after floor.

Much of the stock in these markets is imported or arrives through distributors, and the same product can reach a shop through several routes at different costs. A large share of the business is trade: installers buying CCTV kits for a building, solar contractors buying inverters and batteries, smaller shops in other cities restocking. Retail customers come too, often after comparing prices along the whole road.

For a dealer, the costly part is after the sale. A UPS that fails in the summer, a camera that stops recording, a laptop with a dead port: the customer comes back with a warranty card, and the shop has to find which unit it was, when it was sold and what it cost.

Load-shedding hits these markets like everywhere else in the city, and many counters are themselves powered by the UPS units they sell. A shop system has to keep working through a cut and catch up afterwards, without losing the bills made in between.`,
  shotA: {
    heading: 'Warranty claims from the serial number',
    body: 'Open a claim from the serial, tie it to the customer and the original bill, and follow it through repair or the company. Close it as repaired, replaced, refunded or rejected, and the open-claims list stays short.',
  },
  work: `## How a Hall Road dealer uses Nafaa

**Receiving stock.** Enter the importer's or distributor's bill with every serial number. Each unit gets its own row with its purchase cost, so two identical inverters bought a month apart keep their real costs.

**Selling the exact unit.** At the counter, scan the serial and that unit goes on the bill. Its warranty starts on the bill date and the record shows who bought it. Specs, warranty terms and what comes in the box sit on the product, ready to read out to a customer.

**Condition.** Not everything is new. Mark a unit as brand new, open box, refurbished, used, damaged or for parts, so a returned display unit is not sold at the full price by mistake.

**Bundles.** A CCTV kit with four cameras, a recorder and cable, or a laptop with a bag and mouse, gets one deal price. The screen shows the saving against the full price, the profit and how many bundles your stock can make.

**Trade-ins.** A customer upgrading his old UPS can sell it to you against the new one; it enters stock at the price you paid.`,
  table: {
    heading: 'Electronics counter jobs in Lahore',
    caption: 'Where a register falls short for a serial-number business.',
    columns: ['Register and warranty cards', 'In Nafaa'],
    rows: [
      ['Which unit did this customer buy?', 'Search the carbon copies', 'Scan the serial: bill, date, buyer'],
      ['Cost of one unit', 'Average of the last few bills', 'Purchase cost per serial'],
      ['Warranty claim', 'Card stapled to a slip', 'Claim tied to serial and customer'],
      ['CCTV or solar kit price', 'Worked out on a calculator', 'Bundle with saving and profit'],
      ['Open-box display units', 'Remembered by the salesman', 'Condition grade on the unit'],
    ],
  },
  shotB: {
    heading: 'Bundles that move more than one item',
    body: 'Set a bundle price for items sold together and see the saving against the full price, the stock of each item and the profit before you offer it to an installer.',
  },
  steps: {
    heading: 'Starting an electronics shop on Nafaa',
    items: [
      ['Add your product types', 'TVs, UPS, inverters, cameras, laptops, each with its specs and warranty terms.'],
      ['Enter stock by serial', 'Scan or paste the serials of units already on the shelf.'],
      ['Build your common kits', 'Make bundles for the combinations installers ask for.'],
      ['Move open claims', 'Add warranty units already out for repair with their serials.'],
    ],
  },
  questions: `## Questions from Lahore electronics dealers

### Do I have to enter serials for cheap items like cables?
No. Serials are for costly units. Cables, connectors and small accessories are sold as normal products with barcodes and counted stock.

### A customer comes back without his bill. Can I still check the warranty?
Yes. Scan or type the serial and the record shows the bill, the date, the buyer and the warranty left.

### I sell to installers on credit. Where does that go?
On the customer's khata. Each installer has a balance, and reminders go on WhatsApp from the same screen.

### Can I tell an imported unit from a local one?
Each product carries its own specs, warranty terms and box contents, and every unit has its purchase bill. Put the source or warranty type in the product details and it shows on the record and at the counter.

### Is there a page for mobile dealers on Hall Road?
Yes. Phones by IMEI, PTA status, used sets and qist are covered on [mobile shop software in Lahore](/pos-software/lahore/mobile-shop).`,
  cta: {
    heading: 'Put every serial in your Lahore shop on record',
    body: 'Start free on the computer at your counter. Setup help on WhatsApp.',
  },
  siblings: ['lahore/mobile-shop', 'faisalabad/electronics', 'peshawar/electronics'],
  faqKeys: ['devices', 'offline', 'khata-reminders', 'pricing'],
  sources: [wiki('Hall Road, Lahore'), wiki('Shopping in Lahore')],
  factNote:
    'Hall Road facts (four British-built halls, hub of digital electronics and appliances, imported CCTV accessories, loudspeakers, wires and cables, UPS, generators and solar equipment, one-way traffic, fires in 2012, 2018 and 2021) from Wikipedia "Hall Road, Lahore"; Hafeez Center in Gulberg listed under Electronics in Wikipedia "Shopping in Lahore"; opened 26 Oct 2026. Trade customers (installers, solar contractors) described as typical buyers, not counted. Product claims checked against the electronics pack (serials, claims, bundles, condition grades, trade-in).',
};

const mobile: PairCopy = {
  city: 'lahore',
  cityName: 'Lahore',
  industry: 'mobile-shop',
  title: 'Mobile shop software in Lahore',
  summary:
    'Nafaa is software for Lahore mobile phone shops: every handset kept by IMEI with its PTA status, used phones bought or traded in with the seller\'s CNIC, repair job cards with the lock code and advance, and qist plans with WhatsApp reminders. It suits a Hall Road phone counter or a shop in a neighbourhood market.',
  seoDescription: 'Mobile shop software for Lahore: IMEI and PTA status per phone, used phones with CNIC, repair job cards, qist plans and branch transfers. Works offline.',
  focusKeyword: 'mobile shop software lahore',
  sub: 'New sets from the distributor, used sets from customers, broken screens in the repair tray and buyers on qist: each one on record by IMEI.',
  badges: ['IMEI and PTA status', 'Used sets with CNIC', 'Repairs and qist'],
  facts: [
    ['Built for', 'Phone dealers, used-phone counters, accessory and repair shops'],
    ['Each handset', 'IMEI, PTA status, cost and days on the shelf'],
    ['Customers', 'Qist plans, khata and repair history by phone number'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Lahore ki mobile dukaan ke liye: har set ka IMEI aur PTA status, purana set lene par CNIC record, repair ka job card aur qist ki yaad dihani WhatsApp par.',
  local: `## Selling phones in Lahore

Hall Road is where much of Lahore buys its phones. Its Wikipedia entry lists mobile phones among the digital goods the road is now known for, next to laptops and televisions, and the city's shopping lists put Hafeez Center in Gulberg in the same group of electronics markets. Beyond those two, nearly every commercial street in Johar Town, Model Town or Shahdara has its own phone counter selling accessories, top-ups and repairs.

A Lahore phone shop deals in three kinds of stock at once. Sealed sets come from distributors with a box and a warranty. Used sets come from customers who want cash or an upgrade. And phones arrive for repair that are not stock at all but still sit in the drawer for days. Mixing these up is how a shop loses money, or sells a set it should never have bought.

PTA status matters to every buyer, because a set that is not approved for use on Pakistani networks is worth far less. Customers ask before they ask the price, and a shop needs the answer on the screen.

Many phones here are sold on instalments. A shop selling sets on qist every week ends up with a long list of due dates to chase, and a notebook does not remind anyone.

Money comes in many ways too. A customer may pay part in cash, part by JazzCash or Easypaisa, and leave a balance on khata, all on the same bill. Each of those has to show up at closing, or the drawer and the report will not agree.`,
  shotA: {
    heading: 'Qist and udhaar on one khata',
    body: 'Every customer with a phone on qist shows the amount still due and how long each payment has waited. Record a payment or send a WhatsApp reminder from the same line.',
  },
  work: `## A day behind a Lahore phone counter

**Morning stock.** The distributor drops off new sets. Enter them with their IMEIs, storage, RAM and colour, and the PTA status of each. Accessories such as covers, chargers and handsfree go in as normal products with barcodes.

**A customer sells his old phone.** Scan the IMEI first. If the set was sold or repaired at your shop before, you see when and to whom. Then buy it for cash, take it as a trade-in against a new set, or keep it to sell on his behalf, with his CNIC saved on the record.

**Repairs.** A cracked screen comes in. The job card records the IMEI, the lock code, the SIM and memory card left with the phone, the fault, the estimate and the advance, and prints for the customer. When the technician finishes, the customer is told on WhatsApp.

**Qist.** A student buys a phone on six monthly instalments. The plan shows each due date; the list of late and due-this-week payments is the first thing you check every morning.

**Closing.** Profit per IMEI, per model and on repair work, after the day's expenses.`,
  table: {
    heading: 'Phone shop risks in Lahore, handled',
    caption: 'The questions a Lahore phone counter faces every day, and where the answer lives.',
    columns: ['On paper', 'In Nafaa'],
    rows: [
      ['Is this set PTA approved?', 'Ask the person who bought it', 'PTA status saved with the IMEI'],
      ['Who sold us this used phone?', 'A name in a notebook', 'Seller\'s CNIC on the record'],
      ['Was this phone here before?', 'Nobody remembers', 'IMEI check: sales and repairs'],
      ['Qist due this week', 'Pages flipped every morning', 'Late and due lists, one-tap reminder'],
      ['Phone left for repair', 'A tag with a number', 'Job card with lock code, fault and advance'],
    ],
  },
  shotB: {
    heading: 'Profit on sets, accessories and repairs',
    body: 'Gross and net profit after expenses, the profit on each IMEI and the margin on every model. A used set bought cheap and sold well shows exactly what it earned.',
  },
  steps: {
    heading: 'Starting a Lahore phone shop on Nafaa',
    items: [
      ['Enter the sets on the shelf', 'Scan or paste IMEIs and mark the PTA status of each.'],
      ['Add accessories', 'Covers, chargers, cables and handsfree with barcodes.'],
      ['Copy running qist plans', 'Each customer with the balance and next due date.'],
      ['Test the job card', 'Print a repair slip on your printer before the first repair comes in.'],
    ],
  },
  questions: `## Questions from Lahore phone dealers

### Can I move a handset from my Hall Road counter to my other shop?
Yes. Transfer it by IMEI between branches and both stocks update. The IMEI keeps its history wherever it goes.

### Do I need a computer, or does it run on my phone?
It runs in the browser on any phone or computer and keeps billing without internet.

### Can staff buy used phones without me?
Only if their role allows it. Staff roles decide who can buy used sets, give discounts or make refunds.

### A customer stopped paying his qist. What do I see?
The plan shows the missed instalments as late, with how long each has waited. Send a reminder on WhatsApp, and his IMEI record still shows which phone he bought and on which bill.

### Can I sell top-ups and small accessories quickly?
Put fast sellers such as chargers, covers and handsfree on quick keys, so a busy counter adds them to the bill with one tap.

### Is there a separate page for TVs, UPS and laptops?
Yes, see [electronics shop POS in Lahore](/pos-software/lahore/electronics). For record-keeping tips read [IMEI records for mobile shops](/blog/mobile-shop-imei-records).`,
  cta: {
    heading: 'Keep every handset in your Lahore shop on record',
    body: 'Free trial on the phone you already carry. Setup help on WhatsApp.',
  },
  siblings: ['lahore/electronics', 'karachi/mobile-shop', 'faisalabad/mobile-shop'],
  related: ['BLOG_POST:mobile-shop-imei-records'],
  faqKeys: ['mobile-imei', 'mobile-used', 'khata-reminders', 'pricing'],
  sources: [wiki('Hall Road, Lahore'), wiki('Shopping in Lahore')],
  factNote:
    'Mobile phones among Hall Road\'s goods from Wikipedia "Hall Road, Lahore"; Hafeez Center listed with Hall Road under Electronics in Wikipedia "Shopping in Lahore"; opened 26 Oct 2026. PTA approval described in general terms only. Localities named are public areas. No shops, counts or customers. Product claims checked against the mobile pack (IMEI inventory, PTA status badge, used phones, repair tickets, EMI plans, transfers).',
};

const restaurant: PairCopy = {
  city: 'lahore',
  cityName: 'Lahore',
  industry: 'restaurant',
  title: 'Restaurant POS software in Lahore',
  summary:
    'Nafaa is restaurant POS for Lahore: tables, takeaway and delivery on one screen, kitchen tickets for the tawa, tandoor and karahi, add-ons on the bill, and plate costs at today\'s prices. It suits a food-street place near the fort, a breakfast counter in Anarkali or a café on MM Alam Road.',
  seoDescription: 'Restaurant POS for Lahore food streets and cafés: tables, kitchen tickets per station, delivery riders, happy hours and plate costs. Works without internet.',
  focusKeyword: 'restaurant pos lahore',
  sub: 'Halwa puri at dawn, karahi at midnight, a café crowd in Gulberg in between: one app for the floor, the kitchen and the delivery desk.',
  badges: ['Tickets per station', 'Breakfast to late night', 'Plate costs'],
  facts: [
    ['Built for', 'Food-street restaurants, breakfast counters, cafés, BBQ and karahi places'],
    ['Kitchen', 'Tickets per station on a printer or kitchen screen'],
    ['Floor', 'Tables by section with timers and running bills'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Lahore ke restaurant ke liye: subah halwa puri se raat ki karahi tak, table, parcel aur delivery ek screen par, aur har station ki KOT alag.',
  local: `## Where Lahore eats

Lahore's food runs on streets as much as halls. [Fort Road Food Street](https://en.wikipedia.org/wiki/Fort_Road_Food_Street), between Fort Road and the Hazoori Bagh gateway, was rebuilt and opened in 2012 as a tourist attraction serving Lahori cuisine with views of the Badshahi Mosque. [Gawalmandi](https://en.wikipedia.org/wiki/Gawalmandi), which takes its name from the milkmen's market it once was, has its own well-known food street. In [Anarkali](https://en.wikipedia.org/wiki/Anarkali_Bazaar), the old bazaar is noted for traditional food, and New Anarkali for its halwa puri, nihari and siri paye.

On the other side of the city, MM Alam Road in Gulberg is listed among Lahore's main food destinations, along with the restaurants of Fortress Stadium and the DHA commercial blocks. These are cafés and sit-down restaurants with longer menus, card payments and delivery to the housing societies around them.

Two very different kitchens, then. A breakfast counter in the old city sells a few dishes in huge numbers between sunrise and noon, mostly takeaway and mostly cash. A Gulberg restaurant seats families for an hour, takes card and wallet payments, and has riders waiting at the door for parcels. Many places in Lahore do a bit of both, and the busiest nights come with Ramazan sehri and iftar, weekends and cricket matches.

What they share is a kitchen with separate stations and a cashier who has to know, at closing, where every rupee went.

Payment is split along the same lines. Old-city counters still run mostly on cash, while cafés in Gulberg see cards and wallet transfers on most bills, and regular office orders are often settled weekly on khata. The cash register at closing has to add all of those up against what is actually in the drawer.`,
  shotA: {
    heading: 'Kitchen tickets the cooks can read',
    body: 'Tickets move from new to cooking to ready, turning amber after 10 minutes and red after 20. Each one shows whether the order is dine-in, takeaway or delivery, and the cook marks it ready with one tap.',
  },
  work: `## A day in a Lahore restaurant

**Breakfast service.** For a fast counter, switch to quick counter mode: take the order with a token, send it to the kitchen and take payment at once. The halwa puri, chana and lassi go to their own stations, and the token number is called when the tray is ready.

**Lunch and dinner.** Waiters take orders at tables grouped by section: family hall, roof, outside seating. Each table shows when it was seated and its running bill. Add-ons such as extra naan, less chilli or a bigger plate are priced on the bill and printed on the ticket.

**Delivery.** Parcels move from waiting for a rider to delivered, and the cash each rider still has to hand over is listed, so the evening count has no surprises.

**Happy hours.** Set a price cut by time and day, such as chai cheaper between three and six on weekdays, and it applies by itself.

**Costing.** Recipes are costed at today's rates for meat, ghee and flour, so you see the plate cost and food cost percent of every dish, and which ones need a new price.`,
  table: {
    heading: 'Lahore restaurant formats and the screens they use',
    caption: 'Which part of Nafaa each kind of Lahore restaurant leans on.',
    columns: ['Start with', 'Then add'],
    rows: [
      ['Old-city breakfast counter', 'Quick counter mode with tokens', 'Recipe cost for puri and chana'],
      ['Food-street karahi and BBQ', 'Tickets for grill, karahi and tandoor', 'Split and merged bills'],
      ['Gulberg café', 'Tables with add-ons', 'Happy hours'],
      ['Family restaurant with delivery', 'Riders and cash in hand', 'Food cost per dish'],
      ['Cloud kitchen', 'Delivery stages', 'Plates the stock still covers'],
    ],
  },
  shotB: {
    heading: 'What every plate costs today',
    body: 'Plate cost and food cost percent for each dish, the dishes that need attention, and how many plates the stock still covers before the next market run.',
  },
  steps: {
    heading: 'Opening on Nafaa in Lahore',
    items: [
      ['Share your menu', 'Send the menu card photo or a spreadsheet on WhatsApp.'],
      ['Name your stations', 'Tawa, tandoor, karahi, grill, drinks: each gets a printer or kitchen screen.'],
      ['Draw your floor', 'Sections and tables, plus takeaway and delivery.'],
      ['Brief the staff', 'A short video call with cashiers and waiters before service.'],
    ],
  },
  questions: `## Questions from Lahore restaurant owners

### We open at 5 a.m. for breakfast and close after midnight. How do the days add up?
You set the hour your business day starts, so late-night sales stay with the evening they belong to in the dashboard and sales history.

### Can a table of friends pay separately?
Yes. Split the bill, merge or move tables, and take part payments by cash, card, wallet or khata.

### Our nihari runs out by noon. Can I see how many plates are left?
Yes. With the recipe set up, the menu shows how many plates the stock still covers, so you know when to stop taking orders or start the next pot.

### Can riders take orders on their phones?
Riders and waiters can use the app on their own phones in the browser. What each person can do, such as cancel an item or give a discount, depends on the role you give them.

### Do I need PRA integration?
Only if your restaurant is registered for it. Optional FBR/PRA integration is available; the [PRA page](/compliance/pra-punjab) explains the provincial rules for restaurant services.

### Where can I learn how kitchen tickets work?
Read the [KOT system guide](/blog/restaurant-kot-system-guide) and see the [restaurant page](/industries/restaurant).`,
  cta: {
    heading: 'Run your Lahore kitchen from one screen',
    body: 'Start free with your own menu. Setup help on WhatsApp, in Urdu or English.',
  },
  siblings: ['karachi/restaurant', 'islamabad/restaurant', 'peshawar/restaurant'],
  related: ['COMPLIANCE:pra-punjab', 'BLOG_POST:restaurant-kot-system-guide'],
  faqKeys: ['restaurant-stations', 'restaurant-split', 'offline', 'pricing'],
  sources: [wiki('Fort Road Food Street'), wiki('Gawalmandi'), wiki('Anarkali Bazaar'), wiki('M. M. Alam Road'), wiki('Shopping in Lahore')],
  factNote:
    'Fort Road Food Street (between Fort Road and Hazoori Bagh gateway, reopened 2012, views of Badshahi Mosque), Gawalmandi (milkmen\'s market name, food street), Anarkali (traditional food; halwa puri, nihari, siri paye in New Anarkali) and the food list in "Shopping in Lahore" (MM Alam Road, Fortress Stadium, DHA H and Y blocks) from Wikipedia, opened 26 Oct 2026. No restaurants named. Product claims checked against the restaurant pack; business-day start hour in core/lib/business-day.ts.',
};

const hardware: PairCopy = {
  city: 'lahore',
  cityName: 'Lahore',
  industry: 'hardware',
  title: 'Hardware store POS in Lahore',
  summary:
    'Nafaa is POS for Lahore hardware, sanitary and machinery stores: quotations that become bills, retail, contractor and bulk rates on one item, delivery challans to building sites, and contractor khata with credit limits. It fits a shop in the old city\'s iron lanes, on Brandreth Road or in a growing housing society.',
  seoDescription: 'Hardware store POS for Lahore: quotations to bills, contractor and bulk rates, site delivery challans, contractor credit limits and reorder lists by supplier.',
  focusKeyword: 'hardware store pos lahore',
  sub: 'Locks, wire, pipe, motors and generators: quote the contractor, deliver to the site in trips, and keep his udhaar inside a limit you set.',
  badges: ['Quotations to bills', 'Contractor khata', 'Site challans'],
  facts: [
    ['Built for', 'Hardware, sanitary, electrical, paint and machinery shops'],
    ['Rates', 'Retail, contractor and bulk on the same item'],
    ['Credit', 'Contractor udhaar with age, limit and terms'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Lahore ki hardware dukaan ke liye: thekedar ko quotation do, manzoor ho to bill banao, site par maal trip me bhejo, aur har thekedar ka udhaar limit ke andar rakho.',
  local: `## Lahore's iron, tools and machinery lanes

The walled city has supplied Lahore's builders and households for generations. The Walled City of Lahore Authority lists Loha Market for iron household items such as locks, keys and wires, and Kasera Bazaar for household utensils and crockery. Just outside, Brandreth Road is known across Punjab for machinery: a 2020 architecture thesis at the University of Management and Technology describes it as the place people come from other cities to buy generators, heavy-duty motors and machinery tools, and argues the congested area needs a new site.

Most hardware shops in Lahore's newer areas buy from these wholesale streets or from company dealers, and sell to two very different customers. One is the household buying a tap washer or a padlock, who pays cash and leaves. The other is the contractor or plumber building a house in a new society, who asks for a price on a long list, takes the goods to the site over several weeks, and pays when the client pays him.

That second customer is where both the profit and the risk sit. A quotation agreed in spring can be billed at the wrong rate in summer, a challan for a site can go missing, and a contractor can be carrying more udhaar than the shop ever meant to give him.

Stock is the other headache: pipes by size, paint by shade, cement by brand, and hundreds of small parts that are only noticed when they run out.

Payment habits follow the customer. Households pay cash or by wallet at the counter. Contractors pay in parts, by cheque or bank transfer, often weeks after the goods have gone to the site, and sometimes only when their own client releases a payment.`,
  shotA: {
    heading: 'Reorder before the cement runs out',
    body: 'Items at or below their reorder point, how much to order and which supplier to order from. Turn the list into a purchase order and print it per supplier.',
  },
  work: `## A Lahore hardware shop on Nafaa

**The quotation.** A contractor sends a list for a house: GI pipe by size, fittings, wire, switches and paint. Make a quotation at his contractor rate, with how long it stays valid and the terms. Revise it as he changes the list, send it on WhatsApp, and when he accepts it becomes a bill without retyping.

**Three rates.** Each item can carry a retail, contractor and bulk rate, and quantity rates apply by themselves. The walk-in customer and the contractor see different prices without the cashier having to choose.

**Site deliveries.** Goods for a site go out in one trip or several. Each delivery challan records the vehicle, the trip and what actually arrived, and the project shows what was quoted, billed and delivered, and what is still to send. Delivery and labour are added to the bill as separate charges.

**Contractor khata.** Each contractor has a credit limit and terms such as days, a guarantor or a cheque. The list shows his udhaar and how old it is, so you decide before the next delivery, not after.

**Brands.** Keep the dealer's phone on each brand, so reordering a shade of paint or a brand of cement is one call.`,
  table: {
    heading: 'Hardware jobs in a Lahore shop',
    caption: 'The paperwork behind a contractor sale, and where it goes in Nafaa.',
    columns: ['Estimate pad and challan book', 'In Nafaa'],
    rows: [
      ['Quoting a long list', 'Written twice: estimate, then bill', 'Quotation becomes the bill'],
      ['Contractor rate', 'Remembered by the owner', 'Contractor rate on the item'],
      ['Goods sent to a site', 'Carbon-copy challans', 'Challan per trip, tied to the project'],
      ['Contractor udhaar', 'One running total', 'Age, limit and terms per contractor'],
      ['Small parts running out', 'Noticed when a customer asks', 'Reorder list per supplier'],
    ],
  },
  shotB: {
    heading: 'Contractor udhaar you can collect',
    body: 'Total contractor udhaar, how old each amount is, and the limit and days allowed for each contractor. Record a payment the moment it comes in.',
  },
  steps: {
    heading: 'Setting up a Lahore hardware store',
    items: [
      ['Import your items', 'Sizes, shades and brands from an Excel sheet.'],
      ['Set your three rates', 'Retail, contractor and bulk, with quantity rates where you use them.'],
      ['Add contractors with limits', 'Each one with his current balance, credit limit and terms.'],
      ['Set reorder points', 'For the items you cannot afford to run out of.'],
    ],
  },
  questions: `## Questions from Lahore hardware stores

### Can one contractor have several sites open at once?
Yes. Each site is a project with its own quotations, bills and challans, while his khata shows the total he owes.

### I sell motors and generators too. Can I keep their serial numbers?
Machinery can be kept as normal items with barcodes. If you sell mostly serial-numbered equipment, the [electronics setup](/pos-software/lahore/electronics) suits it better.

### How do I keep track of thousands of small parts?
Read [managing inventory with many SKUs](/blog/hardware-store-inventory-many-skus). In short: group items, set reorder points on fast movers, and count by section.

### Will it work during load-shedding?
Yes. Bills are made on the device without internet and sync later.

### A contractor wants to return unused fittings. How is that handled?
Take the items back against his earlier bill. Stock goes up, and the amount comes off his khata or is paid back, so the project still shows what was really used.

### Can I send a quotation on WhatsApp?
Yes. Share it from the quotation screen. If the contractor asks for changes, revise it and the new version replaces the old one before it becomes a bill.`,
  cta: {
    heading: 'Quote, deliver and collect from one screen',
    body: 'Start the free trial on your shop computer. Setup help on WhatsApp.',
  },
  siblings: ['gujranwala/hardware', 'lahore/kiryana', 'lahore/electronics'],
  related: ['BLOG_POST:hardware-store-inventory-many-skus'],
  faqKeys: ['devices', 'offline', 'khata-reminders', 'pricing'],
  sources: [WCLA_BAZAARS, BRANDRETH_THESIS],
  factNote:
    'Loha Market (iron household items: locks, keys, wires) and Kasera Bazaar (household utensils and crockery) from the Walled City of Lahore Authority bazaar page; Brandreth Road as a market people come to from other cities for generators, heavy-duty motors and machinery tools, and the congestion argument, from the 2020 UMT architecture thesis record; both opened 26 Oct 2026. Contractor and household customers described in general terms. No shops named. Product claims checked against the hardware pack.',
};

const shoe: PairCopy = {
  city: 'lahore',
  cityName: 'Lahore',
  industry: 'shoe',
  title: 'Shoe shop POS in Lahore',
  summary:
    'Nafaa is POS for Lahore shoe shops: a size and colour grid for every article with its own barcodes, a reorder list by size, exchanges on the earlier bill, and size requests that tell the customer on WhatsApp when her size is back. It suits a shop restocking from Moti Bazar or selling khussas from the old city.',
  seoDescription: 'Shoe shop POS for Lahore: size × colour barcodes, size reorder lists, exchanges, size requests on WhatsApp and stock across branches. Works without internet.',
  focusKeyword: 'shoe shop pos lahore',
  sub: 'Cartons of new articles from the wholesale market, khussas for wedding season, school shoes in August: know which size is finished before the customer does.',
  badges: ['Size × colour grid', 'Size reorder', 'WhatsApp size requests'],
  facts: [
    ['Built for', 'Shoe shops, khussa and chappal sellers, and branded outlets'],
    ['Stock', 'Every size and colour as its own variant and barcode'],
    ['Customers', 'Exchanges on the old bill, size requests by phone'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Lahore ki joote ki dukaan ke liye: har article ka size aur rang ka grid, kaunsa size khatam ho raha hai woh list, purane bill par exchange, aur size wapas aaye to gahak ko WhatsApp.',
  local: `## Shoes in the walled city

Lahore has whole bazaars for footwear. The Walled City of Lahore Authority lists Moti Bazar as the walled city\'s wholesale shoe market, where retailers from the city and beyond buy cartons of new articles. Sheikhupurian Bazar is known for leather khussas and Kolhapuri chappals, and Wacho Wali Bazaar for silver and shoe-related goods. Anarkali and the commercial streets of every society then sell the finished pairs to customers.

For a retailer, the chain looks like this. An article is bought by the carton in a run of sizes, say 39 to 44 in black and brown. A few sizes sell out in a week, the rest sit. Khussas peak in the wedding season and around Eid, school shoes in the weeks before term, sandals as soon as it turns hot. A shop that reorders whole cartons instead of the missing sizes ends the season with a shelf of 39s and 44s.

The other daily job is the exchange. A pair bought for a wedding comes back the next day a size too small, sometimes with a different family member, sometimes without the bill.

None of this is hard with three articles. With three hundred articles in a dozen sizes and two colours each, a paper stock book cannot keep up.

Customers pay in cash at most old-city counters, while branded outlets in the malls see more cards and wallet payments. Either way the pair, the size and the money have to meet on the same bill.`,
  shotA: {
    heading: 'Reorder by size, not by carton',
    body: 'The size reorder list looks at stock left and the last 30 days of sales for every size and colour, and lists what to order article by article. Sizes that sell but are already finished are flagged first.',
  },
  work: `## A Lahore shoe shop on Nafaa

**New article.** Enter the brand, article code, type (Gents, Ladies or Bachay) and season, tick sizes 39 to 44 in two colours, and twelve variants are made, each with a barcode to print. Keep the MRP; any price below it is marked Sale, and new arrivals carry a New mark.

**At the counter.** A customer wants a size 42. The article shows pairs per size in this shop and in your other branches, so you can promise one from the other shop instead of saying no.

**Nothing in her size.** Write a size request with her phone number. When size 42 arrives, the request says so and the message goes to her on WhatsApp. Close it as bought or not.

**The exchange.** Pick the earlier bill, take back the 41 and give the 42. Only the difference changes hands, and stock stays right. Past your exchange days, the owner's or a manager's PIN is asked.

**Size charts.** Standard PK/UK, EU, US and cm charts for gents, ladies and kids, plus your own for brands that run small, so a customer ordering khussas for the whole family can check before buying.`,
  table: {
    heading: 'A Lahore shoe shop, before and after',
    caption: 'Where a stock book loses track of sizes.',
    columns: ['With boxes and a notebook', 'In Nafaa'],
    rows: [
      ['Which sizes are finished?', 'Open every box', 'Pairs per size, empty sizes in red'],
      ['Reordering from wholesale', 'Whole cartons again', 'Missing sizes listed per article'],
      ['Size not in stock', 'Customer leaves', 'Size request and WhatsApp message'],
      ['Wedding-week exchange', 'New bill and a calculator', 'Old pair back, difference only'],
      ['Sale prices', 'Stickers over the MRP', 'MRP kept, Sale marked'],
    ],
  },
  shotB: {
    heading: 'Size requests that bring customers back',
    body: 'Each request shows what the customer wanted and when she asked. When that size comes in, the request is flagged and the WhatsApp message is one tap away.',
  },
  steps: {
    heading: 'Setting up a Lahore shoe shop',
    items: [
      ['Add your articles', 'Use the size × colour grid for each one and print barcodes.'],
      ['Count by size once', 'Enter pairs per size for current stock.'],
      ['Set exchange days', 'Choose how long exchanges are allowed and who can approve later ones.'],
      ['Add your size charts', 'Use the standard charts or add your own for brands that run small.'],
    ],
  },
  questions: `## Questions from Lahore shoe sellers

### Can I keep handmade khussas that have no article code?
Yes. Give each design your own code and sizes; the barcode is printed from Nafaa.

### I have a shop in the old city and one in a society. Can a customer collect from the other branch?
Yes. Stock per size is visible for every branch, and pairs can be transferred between them.

### How does the reorder list know what sells?
It uses the last 30 days of sales for each size and colour along with the stock left.

### Can I mark old stock for a clearance sale?
Yes. Lower the price below the MRP and the article shows as Sale at the counter, while the MRP stays on record.

### Can a customer try a pair at home and return it?
Record the sale as usual. If she brings it back within your exchange days, take it back on the original bill and give another size or a refund, depending on what your staff role allows.

### Do I need a barcode printer?
It helps once you have many articles. Nafaa prints barcode labels for every size and colour; without a printer you can still search by article code at the counter.

### Is there a guide for size-heavy stock?
The [clothing size inventory guide](/blog/clothing-size-inventory-guide) applies to shoes too. See also the [shoe shop page](/industries/shoe).`,
  cta: {
    heading: 'Stop losing sales to a missing size',
    body: 'Free trial on the device at your counter. Setup help on WhatsApp.',
  },
  siblings: ['lahore/garments', 'multan/shoe', 'peshawar/shoe'],
  related: ['BLOG_POST:clothing-size-inventory-guide'],
  faqKeys: ['devices', 'offline', 'pricing'],
  sources: [WCLA_BAZAARS],
  factNote:
    'Moti Bazar (wholesale shoe market), Sheikhupurian Bazar (leather khussas and Kolhapuri chappals) and Wacho Wali Bazaar (silver and shoe-related items) from the Walled City of Lahore Authority bazaar page, opened 26 Oct 2026; the shop count is the Authority\'s figure. Seasonal demand described in general terms. No shops named. Product claims checked against the shoe pack (wizard, exchanges, size charts, transfers).',
};

const jewelry: PairCopy = {
  city: 'lahore',
  cityName: 'Lahore',
  industry: 'jewelry',
  title: 'Jewellery shop software in Lahore',
  summary:
    'Nafaa is software for Lahore jewellers: today\'s gold rate per tola or gram with other karats worked out, pieces priced by weight with banwai and stones, old gold valued with a CNIC slip, custom orders with the karigar and advance, and metal stock by karat. It suits a counter in the old city\'s gold bazaar or a society showroom.',
  seoDescription: 'Jewellery software for Lahore: daily gold rate per tola, pricing by weight with banwai, old gold slips with CNIC, karigar accounts and custom orders.',
  focusKeyword: 'jewellery shop software lahore',
  sub: 'Set the rate once in the morning and every piece prices itself by weight and karat; old gold, karigar gold and custom orders all stay in balance.',
  badges: ['Daily rate per tola', 'Old gold with CNIC', 'Karigar accounts'],
  facts: [
    ['Built for', 'Gold and silver jewellers, from bazaar counters to showrooms'],
    ['Pricing', 'Weight, karat, banwai, polish and stones at today\'s rate'],
    ['Workshop', 'Gold given to karigars, returns and wastage'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Lahore ke jeweller ke liye: subah ka tola rate ek baar likho, har zevar wazan aur karat se khud price ho. Purana sona CNIC ke saath, karigar ka sona aur mazdoori ka hisaab saaf.',
  local: `## The gold trade in old Lahore

The Walled City of Lahore Authority describes Sarafa Bazar, also called Sooha Bazar, as the market that caters to every part of gold trading, buying and selling, close to Rang Mahal chowk. Nearby, Wacho Wali Bazaar deals in silver among other goods, and Anarkali has long had jewellery shops among its cloth and garment stalls.

The way gold is sold here has its own vocabulary. Prices follow the day's rate per tola. A piece is priced from its net weight at that rate for its karat, plus banwai for the making, and less kaat when old gold is bought back. Families bring old jewellery to exchange for new designs before weddings, and a large share of a jeweller's year is custom work: sets made to order by karigars who take gold out of the safe and return finished pieces with some wastage.

That makes a jeweller's records unusually exact. A gram missing between the safe and the workshop is real money, and a customer who returns months later expects the same weight and karat on the slip.

Many old-city jewellers still keep this in registers and on slips written by hand. The arithmetic is done on a calculator for every customer, and the rate has to be changed on every price tag when gold moves.

Payments are large and often mixed: part in cash, part by bank transfer, part in old gold, and sometimes a balance that the family clears after the wedding. Each part has to be counted against the right bill, and the old gold has to reach the safe at its tested weight and karat.`,
  shotA: {
    heading: 'A counter priced by weight',
    body: 'Every piece is priced at today\'s rate for its karat, with banwai, polish, hallmark charges and stones added. The cashier can change the rate or the banwai while bargaining, and the bill shows each part.',
  },
  work: `## A Lahore jeweller's day on Nafaa

**Morning rate.** Type the 24K rate per tola or per gram. The 22K, 21K and 18K rates follow from their purity, and you can change any of them. Every piece in stock is now priced at that rate.

**Pieces.** Each piece keeps its karat, gross weight, stone weight and net weight, banwai, kaat, polish and hallmark charges, and its stones. Nothing is priced from memory.

**Old gold.** A customer brings her mother's set to exchange. Weigh it, test the karat, take off the stones and value it at the buying rate less kaat. The slip prints with her CNIC, and the value can go against the new bill.

**Custom orders.** A bridal set is ordered with an advance in cash or in old gold. The order names the karigar, the due date and the money still to come.

**Karigar accounts.** Gold given to each karigar, what came back with the wastage allowed, and the labour owed, so the safe and the workshop always agree.

**Metal stock.** Kachcha sona and chandi by karat, valued at today's rate, with every movement in and out of the safe.`,
  table: {
    heading: 'Gold counter records in Lahore',
    caption: 'Where hand-written slips leave room for mistakes.',
    columns: ['Register and slips', 'In Nafaa'],
    rows: [
      ['Price when the rate changes', 'Recalculated piece by piece', 'Every piece follows today\'s rate'],
      ['Old gold bought back', 'Slip written by hand', 'Weight, karat, kaat and CNIC on a printed slip'],
      ['Gold with the karigar', 'A notebook per karigar', 'Given, returned and wastage per karigar'],
      ['Custom bridal order', 'Order book and receipt', 'Advance in cash or gold, due date, balance'],
      ['Repairs', 'Piece in an envelope', 'Weight, karat, charge and promised day'],
    ],
  },
  shotB: {
    heading: 'Custom orders with the karigar and the balance',
    body: 'Made-to-order pieces with the advance taken in cash or old gold, the karigar working on them, the due date and the money still to come, on one list.',
  },
  steps: {
    heading: 'Setting up a Lahore jewellery shop',
    items: [
      ['Set today\'s rate', 'Enter the 24K rate and check the other karats.'],
      ['Enter your pieces', 'Karat, weights, banwai and stones for what is in the showcase.'],
      ['Open karigar accounts', 'Gold currently with each karigar and labour owed.'],
      ['Add open orders and repairs', 'With advances already taken and promised dates.'],
    ],
  },
  questions: `## Questions from Lahore jewellers

### Can I sell silver as well as gold?
Yes. Metal stock is kept by metal and karat, and silver pieces are priced from their own rate.

### Can a salesman change the price while bargaining?
He can change the rate or the banwai on the bill if his role allows it. Roles decide who may change prices.

### Does the old gold slip show the customer's details?
Yes. The slip carries the weight, karat, deductions and the customer's CNIC.

### Can I take a repair without mixing it with my stock?
Yes. A repair records the customer's piece with its weight and karat, the promised day, the charge and any advance, apart from the pieces you sell, so the showcase count stays clean.

### Can I see the value of my stock at today's rate?
Yes. Metal stock is valued at the rate you set this morning, by karat, so a rise in the gold rate shows straight away in what the safe is worth.

### Where can I read about gold-rate pricing?
See [gold rate pricing for jewellery shops](/blog/gold-rate-pricing-jewelry-shops) and the [jewellery page](/industries/jewelry).`,
  cta: {
    heading: 'Price every piece from today\'s rate',
    body: 'Start the free trial on your shop computer or phone. Setup help on WhatsApp.',
  },
  siblings: ['lahore/garments', 'lahore/optical', 'karachi/garments'],
  related: ['BLOG_POST:gold-rate-pricing-jewelry-shops'],
  faqKeys: ['devices', 'offline', 'pricing'],
  sources: [WCLA_BAZAARS, wiki('Anarkali Bazaar')],
  factNote:
    'Sarafa Bazar (also called Sooha Bazar; all aspects of gold trading, buying and selling; near Rang Mahal chowk) and Wacho Wali Bazaar (silver and shoe-related items) from the Walled City of Lahore Authority bazaar page; jewellery among Anarkali\'s goods from Wikipedia; opened 26 Oct 2026. Trade terms (tola, banwai, kaat) are general usage. No jewellers named. Product claims checked against the jewelry pack (metal rates, pieces, old gold, custom orders, karigar accounts, repairs, metal stock).',
};

const optical: PairCopy = {
  city: 'lahore',
  cityName: 'Lahore',
  industry: 'optical',
  title: 'Optical shop software in Lahore',
  summary:
    'Nafaa is software for Lahore opticians: eye test bookings, prescriptions with SPH, CYL, axis, ADD and PD, glasses orders sent to the lab and tracked back, and frames and contact lenses in stock. It suits an optician buying frames from the old city\'s Ainak Market or a clinic-style shop in a society.',
  seoDescription: 'Optical shop software for Lahore: eye test bookings, nuskha with SPH, CYL and PD, glasses orders tracked to the lab, frames and contact lens stock.',
  focusKeyword: 'optical shop software lahore',
  sub: 'From the eye test to the lab and back to the counter: every nuskha, frame and lens order with its advance and pickup date.',
  badges: ['Nuskha records', 'Lab tracking', 'Frames and lenses'],
  facts: [
    ['Built for', 'Opticians, eye clinics with a counter, and sunglass shops'],
    ['Records', 'Prescriptions for both eyes with PD and fitting height'],
    ['Orders', 'Frame, lens type, index, coating, lab and pickup date'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Lahore ke optician ke liye: eye test ki booking, nuskha SPH, CYL aur PD ke saath, ainak ka order lab tak aur wapas, aur frames aur lens ka stock.',
  local: `## Where Lahore's opticians buy

The Walled City of Lahore Authority lists Ainak Market among the old city's specialist bazaars, selling sunglasses, eyeglass frames and lenses. Like the other trade bazaars inside the walls, it supplies shops across the city as well as walk-in customers looking for a cheaper frame.

An optician in Lahore usually sits between three parties. The customer comes for a test or with a nuskha from a doctor. The frames come from wholesalers, including those in the old city. And the lenses are cut and fitted by a lab, sometimes in the shop's back room, more often elsewhere in the city. The order goes out, waits a few days and comes back, and the customer is promised a date in between.

Most of the trouble happens in that gap. A nuskha copied wrongly onto the lab slip, a frame sent with the wrong order, a customer who calls three times asking if the glasses are ready, or a pair that was ready a week ago and never collected.

Opticians also live on repeat visits. Prescriptions change, contact lenses run out, and a customer whose last test was two years ago is a sale waiting to happen if someone reminds him.

Payment usually comes in two parts. The customer leaves an advance when the order is made and pays the balance when he collects the glasses, by cash, card or wallet. A shop with dozens of open orders needs to know, every evening, how much is held as advance and how much is still to come.`,
  shotA: {
    heading: 'Prescriptions the way a lab reads them',
    body: 'Power for both eyes with SPH, CYL, axis, ADD and PD, fitting height and contact lens fit, entered once and checked before the order is made. The customer\'s earlier prescriptions stay on his record.',
  },
  work: `## A Lahore optician's day on Nafaa

**Eye tests.** Book a test in a free slot with the optometrist on duty and take the fee. Today's queue, follow-ups and no-shows are on one list, and each doctor's days, hours, tests done and fees billed are kept on his record.

**The order.** After the test, make the glasses order: the nuskha, a frame from stock or the customer's own, lens type, index and coating, the lab, the pickup date and the advance.

**Three slips.** The customer gets his nuskha and an order slip showing the advance. The lab gets its own slip with the power and lens details but no prices.

**Lab tracking.** Each order moves from sent to lab, back from lab, ready and handed over. Labs are compared on turnaround and late orders, so you know which one to send urgent work to.

**Repairs and call-backs.** A broken hinge or a loose screw goes on the same order desk with the charge and date. A call-back list shows prescriptions close to their end, with a WhatsApp link to invite the customer for a new test.

**Stock.** Frames by brand, model, colour and size; contact lenses and solutions in batches, with the earliest expiry sold first.`,
  table: {
    heading: 'Optical shop records in Lahore',
    caption: 'What usually lives on paper at an optician, and where Nafaa keeps it.',
    columns: ['Paper', 'In Nafaa'],
    rows: [
      ['Customer\'s nuskha', 'Card in a drawer', 'Prescription history per customer'],
      ['Order to the lab', 'Hand-copied slip', 'Printed lab slip without prices'],
      ['Is it ready?', 'Phone the lab', 'Order status from sent to handed over'],
      ['Contact lens expiry', 'Checked when a box is opened', 'Batches, earliest expiry first'],
      ['Customers due a new test', 'Not tracked', 'Call-back list with WhatsApp link'],
    ],
  },
  shotB: {
    heading: 'Eye test bookings and the day\'s queue',
    body: 'Free slots per optometrist, the fee taken, and the day\'s queue with follow-ups and no-shows, so the front desk knows who is next.',
  },
  steps: {
    heading: 'Setting up a Lahore optical shop',
    items: [
      ['Add your optometrists', 'Their days, hours and test fee.'],
      ['Enter frames and lenses', 'Frames by brand and size; contact lenses with batches and expiry.'],
      ['List your labs', 'So every order can be sent and tracked.'],
      ['Move open orders', 'Glasses already at the lab, with advances and pickup dates.'],
    ],
  },
  questions: `## Questions from Lahore opticians

### Can a customer bring his own frame?
Yes. The order can use a frame from your stock or the customer's own, and the slip says which.

### I send work to two different labs. Can I compare them?
Yes. Each order records its lab, and labs are compared on turnaround and late orders.

### Can I sell sunglasses without a prescription?
Yes. Frames and sunglasses sell at the counter like any other product with a barcode.

### A customer lost his nuskha. Can I find his last prescription?
Yes. Search by his name or phone and his earlier prescriptions are on his record, with the date and the optometrist who wrote them.

### Can the advance be paid by wallet or card?
Yes. The advance and the balance can each be taken by cash, card, JazzCash or Easypaisa, and the order slip shows what has been paid and what is still due on collection.

### What if the lab sends the wrong power back?
Check the glasses against the nuskha on the order before handing them over. If they are wrong, send the order back to the lab; its status shows it is out again, and the late-order count for that lab goes up.

### Does it work without internet?
Yes. The counter keeps billing without internet and syncs later. See the [optical page](/industries/optical) for the full list of screens.`,
  cta: {
    heading: 'Keep every nuskha and lab order in one place',
    body: 'Free trial on the computer at your front desk. Setup help on WhatsApp.',
  },
  siblings: ['lahore/jewelry', 'lahore/mobile-shop', 'lahore/shoe'],
  faqKeys: ['devices', 'offline', 'khata-reminders', 'pricing'],
  sources: [WCLA_BAZAARS],
  factNote:
    'Ainak Market (sunglasses, eyeglass frames and lenses) from the Walled City of Lahore Authority bazaar page, opened 26 Oct 2026. The optician-wholesaler-lab chain is described in general terms. No shops, labs or doctors named. Product claims checked against the optical pack (eye tests, prescriptions, lens orders, lab tracking, three slips, call-backs, optometrists, frames and contact lenses).',
};

export const lahorePairs: PairCopy[] = [kiryana, garments, electronics, mobile, restaurant, hardware, shoe, jewelry, optical];
export const lahore = lahorePairs.map(pair);
