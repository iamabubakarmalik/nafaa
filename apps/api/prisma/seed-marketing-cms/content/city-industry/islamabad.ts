/**
 * Islamabad pair pages, written from the city's planned sector layout and its
 * public commercial areas:
 * - kiryana: markaz shopping in each sector (Jinnah Super in F-7, the
 *   Karachi Company centre in G-9) and the twin-city link with Rawalpindi
 * - restaurant: Kohsar Market, Jinnah Super, Blue Area and Saidpur village
 * Skipped: mobile-shop, electronics, hardware, bakery and pharmacy (no public
 * source gives Islamabad a market of its own for them), and garments (a
 * page about malls and markaz boutiques would repeat the Rawalpindi one).
 */

import { type PairCopy, pair, wiki } from './_build';

const kiryana: PairCopy = {
  city: 'islamabad',
  cityName: 'Islamabad',
  industry: 'kiryana',
  title: 'Grocery store POS software in Islamabad',
  summary:
    'Nafaa is POS, stock and khata software for Islamabad grocery and general stores, from a markaz supermarket to a corner shop in a sub-sector market. It scans barcodes fast at the till, keeps monthly accounts for households on khata, takes card and wallet payments, and runs several branches from one account.',
  seoDescription: 'Grocery POS for Islamabad: fast barcode billing, monthly household khata, card and wallet payments, and branches in different sectors on one account.',
  focusKeyword: 'grocery pos islamabad',
  sub: 'For the markaz store in F-7 or G-9 and the small shop in a sub-sector market: barcode billing, monthly accounts for nearby households and stock across branches.',
  badges: ['Fast barcode billing', 'Monthly household accounts', 'Branches by sector'],
  facts: [
    ['Built for', 'Grocery stores, general stores and small supermarkets in Islamabad\'s sectors'],
    ['Counter', 'Barcode scanner, name search and quick keys for loose items'],
    ['Accounts', 'Monthly khata per household with WhatsApp reminders'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Islamabad ke markaz aur sector ki dukaan ke liye: barcode se tez bill, aas paas ke gharon ka mahana khata, card aur wallet se payment, aur alag sectors ki branches ek hi account me.',
  local: `## Shopping by sector

Islamabad was planned in squares. The urban part of the city is divided into [sectors](https://en.wikipedia.org/wiki/Sectors_of_Islamabad) named with a letter and a number: letters run from north to south and numbers from east to west, so E-7, F-8 or G-11 tells you exactly where a place is. Each sector has its own commercial centre, the markaz, and smaller markets inside its sub-sectors, so most households buy their groceries within walking or short driving distance of home.

Some of those centres are known across the city. The F-7 markaz, Jinnah Super, is one of Islamabad\'s most recognised shopping areas, with shops, restaurants, bookstores and banks around it. The Karachi Company shopping centre in G-9 is listed among the city\'s important places. Newer sectors further west and south have their own markaz areas still filling up with shops.

That layout shapes the grocery trade. A store usually serves the same few streets, so its regular customers are households it sees several times a week. Many families settle a monthly account rather than paying for every packet. At the same time, a markaz supermarket gets passing trade from offices and visitors who pay by card or by wallet and expect a quick, printed bill.

Supply comes largely from across the city line. Islamabad was built as the seat of government, and Rawalpindi is described as the centre of commercial activity for the twin cities; its old wholesale bazaars are a short drive away, and distributors serve both cities.

Both cities share one power company, IESCO, and a counter that can bill without power or internet keeps the evening queue moving when supply drops.`,
  shotA: {
    heading: 'A quick till for a markaz store',
    body: 'Scan a barcode, search by name or tap a quick key for loose items like bread and eggs. The same bill takes cash, card, JazzCash, Easypaisa or the customer\'s monthly account.',
  },
  work: `## How an Islamabad grocery store runs on Nafaa

**Setting up the shelves.** A supermarket carries hundreds of branded products with barcodes. Download the import template, fill it from your supplier lists or old software, upload it and check the dry run before anything is saved. Items without barcodes go on quick keys.

**The till.** The cashier scans, the total shows, and the customer pays by whatever method suits them. Combos let you sell a bundle, such as a breakfast pack, at one price, and products can be sold by the piece or by the carton for a customer stocking up.

**Monthly accounts.** A household on monthly khata takes what it needs through the month. Each bill adds to its balance, payments reduce it, and on the first of the month every account gets its total on WhatsApp in one tap per customer.

**Stock and branches.** The low-stock list shows what is running out and how much usually sells, ready for the distributor\'s next visit. Damaged and expired goods are written off so the count stays true. A second store in another sector has its own stock and counter, and the owner sees sales, cash and accounts for both from one login.

Optional FBR/PRA integration is available for a store that is required to report; most neighbourhood shops do not need it.`,
  table: {
    heading: 'Two kinds of Islamabad grocery store',
    caption: 'What a markaz supermarket and a sub-sector shop each set up first.',
    columns: ['Markaz supermarket', 'Sub-sector shop'],
    rows: [
      ['Counter', 'Barcode scanner on every till', 'Phone or laptop with quick keys'],
      ['Customers', 'Walk-in shoppers paying by card or wallet', 'Regular households on monthly khata'],
      ['Stock setup', 'Excel import of the full range', 'Main items first, the rest as they sell'],
      ['Staff', 'Several cashiers with their own roles', 'Owner and one helper'],
      ['Growth', 'A second branch in another sector', 'Home delivery to nearby streets'],
    ],
  },
  shotB: {
    heading: 'Every household\'s monthly account',
    body: 'The khata lists what each family owes and for how long. Old balances go in once from your register; after that every bill and payment updates them, and reminders go out on WhatsApp.',
  },
  steps: {
    heading: 'Opening an Islamabad store on Nafaa',
    items: [
      ['Import your products', 'Use the Excel template; the dry run shows mistakes before saving.'],
      ['Connect a barcode scanner', 'A standard USB barcode scanner works with the browser till.'],
      ['Add monthly customers', 'Each household once, with its current balance.'],
      ['Add cashiers', 'Give each one a role so discounts and refunds stay with the owner.'],
    ],
  },
  questions: `## Questions from Islamabad grocers

### Can I run a till on a laptop and another on a tablet?
Yes. Nafaa runs in the browser on any phone, tablet or computer, and several tills can bill at once from the same stock.

### Customers ask for a proper printed bill. Can I give one?
Yes. Bills print on a thermal receipt printer with your shop name, the items, the payment method and any balance on the customer\'s account.

### Most of my customers live in the same street. Can I deliver to them?
Yes. Take the order on the phone or WhatsApp, bill it to the household\'s account or as cash on delivery, and the stock and balance update together.

### What happens when IESCO cuts power?
Billing continues on the device without internet and syncs when the connection is back. A small UPS for the till and printer is enough.

### I also buy from Rawalpindi wholesalers. Can I track what I owe them?
Yes. Each supplier has an account; purchases add to it and payments reduce it. The [Rawalpindi kiryana page](/pos-software/rawalpindi/kiryana) describes the wholesale bazaars there, and [Islamabad](/pos-software/islamabad) lists other trades in the city.`,
  cta: {
    heading: 'Bring your Islamabad store onto one screen',
    body: 'Free trial on the device at your counter. Send your product list on WhatsApp and we help you import it.',
  },
  siblings: ['islamabad/restaurant', 'rawalpindi/kiryana', 'lahore/kiryana'],
  faqKeys: ['kiryana-import', 'kiryana-units', 'khata-reminders', 'offline', 'pricing'],
  sources: [wiki('Sectors of Islamabad'), wiki('Islamabad'), wiki('Islamabad Electric Supply Company')],
  factNote:
    'Sector naming (letters north to south, numbers east to west) and Jinnah Super as the F-7 markaz, "one of the most recognized and iconic shopping areas", from Wikipedia\'s Sectors of Islamabad; the Karachi Company shopping centre in G-9 and "Islamabad is the hub of governmental activities while Rawalpindi is the centre of ... commercial ... activities" from Wikipedia\'s Islamabad; IESCO from Wikipedia. Opened 26 Oct 2026. Monthly accounts and card use are described as common patterns, without figures. No shops named. Product claims checked against the retail pack, import, quick keys, combos, khata and branches.',
};

const restaurant: PairCopy = {
  city: 'islamabad',
  cityName: 'Islamabad',
  industry: 'restaurant',
  title: 'Restaurant POS software in Islamabad',
  summary:
    'Nafaa is restaurant POS for Islamabad cafés and restaurants: tables and takeaway on one screen, kitchen tickets per station, card and wallet payments with split bills, weekday happy hours, and food cost at today\'s prices. It suits a café in Kohsar Market, a family place in a markaz or a lunch counter in Blue Area.',
  seoDescription: 'Restaurant POS for Islamabad cafés and restaurants: tables, kitchen tickets, split bills, happy hours, delivery riders and food cost. Works offline.',
  focusKeyword: 'restaurant pos islamabad',
  sub: 'Office lunches in Blue Area, coffee in F-6, weekend families at Saidpur: one app for tables, the kitchen, delivery and the day\'s cash.',
  badges: ['Split bills and cards', 'Happy hours', 'Kitchen tickets'],
  facts: [
    ['Built for', 'Cafés, family restaurants, fast food counters and cloud kitchens'],
    ['Floor', 'Tables by section with timers and running bills'],
    ['Payments', 'Cash, card, wallet, split and part payments'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Islamabad ke café aur restaurant ke liye: table aur parcel ek screen par, har station ki KOT, card aur wallet se bill baantna, aur dopahar ki happy hour khud lag jaye.',
  local: `## Where Islamabad eats out

Islamabad\'s restaurants follow its plan. Every sector has a markaz, and the busiest ones have become food destinations. [Kohsar Market](https://en.wikipedia.org/wiki/Kohsar_Market), a small upscale commercial area in the north-east of sector F-6, is known for its cafés and European restaurants. Jinnah Super in F-7 mixes restaurants and casual dining with shops, banks and bookstores. Along Jinnah Avenue, [Blue Area](https://en.wikipedia.org/wiki/Blue_Area) is the city\'s central business district, a two-kilometre corridor of offices where lunch is short and busy.

At the edge of the Margalla Hills, [Saidpur](https://en.wikipedia.org/wiki/Saidpur,_Islamabad) is a Mughal-era village in a ravine near the Daman-e-Koh viewpoint that now serves as a tourist spot, and visitors come to eat there as well as to look around.

These places work to different rhythms. A Blue Area counter does most of its trade in a two-hour lunch window, much of it takeaway and office orders. A Kohsar café has customers who sit for an hour over coffee and pay by card, often asking to split the bill. A restaurant at a tourist spot like Saidpur sees visitors in waves, with quiet hours between them. Many restaurants also send food to homes across the sectors through their own riders and the food apps.

What they share is the need to keep the kitchen, the floor and the till in step. Optional FBR integration is available for a restaurant that is registered and required to report; the rest of Nafaa works the same without it.`,
  shotA: {
    heading: 'A kitchen screen for every station',
    body: 'Each menu category goes to its station on a printer or a kitchen screen. Tickets move from new to cooking to ready and turn amber after ten minutes and red after twenty, so slow orders stand out.',
  },
  work: `## Running an Islamabad restaurant through the week

**Weekday lunch.** For a Blue Area counter, quick counter mode takes the order with a token, sends it to the kitchen and takes payment at once. Office orders that come by phone go in the same way, as takeaway or delivery.

**Afternoon.** Set happy hours by time, day, dish or order type, such as tea and coffee at a lower price between three and six on weekdays. The price changes by itself and goes back when the hour ends, so cashiers do not need to remember it.

**Evening tables.** Waiters see every table by section: free, seated with its timer and running bill, bill printed, needs cleaning or reserved. Add-ons like extra cheese or less spice are priced on the bill and printed on the kitchen ticket. A group can split the bill, move to a bigger table or merge two tables, and each person can pay by card, wallet or cash.

**Delivery.** Orders move from waiting for a rider to delivered, and each rider\'s cash in hand shows, so the handover at closing is quick.

**Busy days.** On a full weekend or holiday, the dashboard shows sales as they happen and the recipes page shows how many plates the stock still covers, so you know before the evening whether the kitchen will run out of a dish.`,
  table: {
    heading: 'Three Islamabad restaurant types and what they use most',
    caption: 'Where each kind of place usually starts in Nafaa.',
    columns: ['Main need', 'Screens to set up first'],
    rows: [
      ['Blue Area lunch counter', 'Speed in a short rush', 'Quick counter mode with tokens'],
      ['Kohsar or markaz café', 'Card payments and split bills', 'Tables, split and part payment, happy hours'],
      ['Restaurant at a tourist spot', 'Visitors arriving in waves', 'Tables by section, kitchen display'],
      ['Cloud kitchen in the sectors', 'Delivery across the city', 'Riders, delivery stages, recipes'],
      ['Restaurant with a bakery counter', 'Two counters, one kitchen', 'Stations per category, food cost'],
    ],
  },
  shotB: {
    heading: 'Food cost at today\'s prices',
    body: 'Each dish shows its plate cost, food cost percent and how many plates the stock still covers. When meat or dairy prices change, the menu shows which dishes need a new price.',
  },
  steps: {
    heading: 'Opening on Nafaa in Islamabad',
    items: [
      ['Send your menu', 'A photo of the menu or a spreadsheet on WhatsApp is enough to begin.'],
      ['Set stations and printers', 'Kitchen, grill, bar or coffee: each gets a printer or a screen.'],
      ['Lay out the floor', 'Sections, tables, and the takeaway and delivery counters.'],
      ['Train the team', 'A short call with cashiers and waiters before the next lunch rush.'],
    ],
  },
  questions: `## Questions from Islamabad restaurant owners

### Our customers pay by card and wallet more than cash. Is that a problem?
No. Each payment is recorded by method, and the cash register shows the cash expected in the drawer and the card, wallet and bank amounts separately, so the count only has to match the cash.

### Can a table of six pay separately?
Yes. Split the bill by item or amount and take each part by a different method.

### We have one restaurant in F-7 and a café in another sector. Can I see both?
Yes. Each branch has its own tables, staff and cash register, and the owner sees both from one account.

### Can I stop a waiter from cancelling items after the kitchen has started?
Yes. Once dishes have gone to the kitchen, cancelling them needs the void permission or the owner\'s or manager\'s PIN, and the kitchen receives a cancel ticket so nothing is cooked for nobody. Staff without that permission can still add items and take payment as usual.

### What if the internet goes during lunch?
Orders and bills keep working on the device and sync when the connection returns.

### Is there a guide on kitchen tickets?
See our [KOT system guide](/blog/restaurant-kot-system-guide), the [restaurant page](/industries/restaurant) and [Islamabad](/pos-software/islamabad) for other trades in the city.`,
  cta: {
    heading: 'Run your Islamabad restaurant from one screen',
    body: 'Start free with your own menu and devices. Setup help on WhatsApp in Urdu or English.',
  },
  siblings: ['islamabad/kiryana', 'karachi/restaurant', 'lahore/restaurant'],
  related: ['BLOG_POST:restaurant-kot-system-guide'],
  faqKeys: ['restaurant-stations', 'restaurant-split', 'offline', 'pricing'],
  sources: [wiki('Kohsar Market'), wiki('Sectors of Islamabad'), wiki('Blue Area'), wiki('Saidpur, Islamabad')],
  factNote:
    'Kohsar Market (small upscale area in the north-east of F-6, known for cafés and European restaurants), Jinnah Super in F-7 (shops, restaurants, casual dining; from Sectors of Islamabad), Blue Area (central business district, 2 km along Jinnah Avenue) and Saidpur (Mughal-era village in a Margalla Hills ravine near Daman-e-Koh, tourist spot) from Wikipedia, opened 26 Oct 2026. Lunch-rush and visitor patterns are general descriptions, not claims about named places. FBR named once, neutrally. Product claims checked against the restaurant pack, quick counter mode, happy hours and cash register.',
};

export const islamabadPairs: PairCopy[] = [kiryana, restaurant];
export const islamabad = islamabadPairs.map(pair);
