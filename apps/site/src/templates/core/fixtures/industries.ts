/**
 * Development fixtures: INDUSTRY entries. Names, summaries, Roman Urdu text,
 * colours and features are copied from the fact-checked CMS seed
 * (seed-marketing-cms/content/industries/*.ts), which cites the app files
 * behind each feature. The "How a day works" steps only re-order those same
 * features; nothing new is claimed.
 */
import type { IconName } from '@/lib/cms/contract/cms-contract';
import type { FixtureSpec } from './build';
import { answer, ctaBand, faq, features, hero, ids, pricing, steps } from './blocks';

interface IndustryInput {
  slug: string;
  title: string;
  shortName: string;
  shopNoun: string;
  romanUrduName: string;
  group: string;
  icon: IconName;
  color: string;
  sortOrder: number;
  summary: string;
  builtFor: string;
  romanUrdu: string;
  features: { icon: IconName; title: string; body: string }[];
  day: [string, string][];
  faqKeys: string[];
  products: string[];
  relatedIndustries: string[];
  solution?: string;
}

function industry(input: IndustryInput): FixtureSpec {
  const id = ids(`ind-${input.slug}`);
  return {
    type: 'INDUSTRY',
    path: `/industries/${input.slug}`,
    title: input.title,
    summary: input.summary,
    featured: true,
    sortOrder: input.sortOrder,
    data: {
      type: 'INDUSTRY',
      icon: input.icon,
      color: input.color,
      group: input.group,
      shortName: input.shortName,
      shopNoun: input.shopNoun,
      romanUrduName: input.romanUrduName,
    },
    blocks: [
      hero(id, input.summary, { eyebrow: `For ${input.shopNoun}` }),
      answer(
        id,
        [
          ['Built for', input.builtFor],
          ['Everyday tools', 'Counter (POS), stock, khata (udhaar) and reports in one app'],
          ['Without internet', 'The counter keeps billing offline and sends the sales when the connection returns'],
          ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
          ['Tax', '{{fact:compliance.fbrPra}}'],
        ],
        input.romanUrdu,
      ),
      features(id, `What Nafaa does for ${input.shopNoun}`, input.features),
      steps(id, `How a day works in your ${input.shortName.toLowerCase()} business`, input.day),
      pricing(id, { compact: true, heading: `Plans for ${input.shopNoun}` }),
      faq(id),
      ctaBand(id, `Try Nafaa in your ${input.shortName.toLowerCase()} business`, 'Start with the free trial. No card needed.'),
    ],
    faqKeys: input.faqKeys,
    tags: input.products.map((p) => `/product/${p}`),
    related: [
      ...input.relatedIndustries.map((s) => `/industries/${s}`),
      ...(input.solution ? [`/solutions/${input.solution}`] : []),
    ],
  };
}

export const industryFixtures: FixtureSpec[] = [
  industry({
    slug: 'kiryana',
    title: 'Kiryana & Grocery Store',
    shortName: 'Kiryana',
    shopNoun: 'kiryana and grocery stores',
    romanUrduName: 'Kiryana / general store',
    group: 'retail',
    icon: 'store',
    color: '#065f46',
    sortOrder: 1,
    summary:
      "Nafaa is POS and khata software for kiryana and grocery stores in Pakistan. Scan barcodes at the counter, sell by piece, dozen or carton, keep every customer's udhaar in a digital khata with WhatsApp reminders, import products from Excel, and keep billing when the internet drops.",
    builtFor: 'Kiryana, grocery and general stores, from one counter to several branches',
    romanUrdu:
      'Nafaa kiryana aur grocery store ke liye POS aur khata app hai. Barcode se bill banayein, piece, darjan ya carton me bechein, udhaar digital khata me rakhein aur WhatsApp par yaad-dihani bhejein. Internet na ho to bhi counter chalta rehta hai.',
    features: [
      { icon: 'scan-barcode', title: 'Barcode counter', body: 'Scan with a barcode scanner, search by name, or tap a quick key for loose items.' },
      { icon: 'layers', title: 'Piece, dozen and carton', body: 'Sell one product in more than one unit, each with its own price.' },
      { icon: 'notebook-pen', title: 'Digital khata', body: 'Udhaar, payments and old-register balances per customer, with WhatsApp reminders sent one by one.' },
      { icon: 'file-spreadsheet', title: 'Import from Excel', body: 'Download a template, upload your list, check it in a dry run, then import.' },
      { icon: 'gift', title: 'Combos and deals', body: 'Bundle items into a combo with its own price.' },
      { icon: 'triangle-alert', title: 'Damage and low stock', body: 'Record broken or expired stock and see what is running low.' },
    ],
    day: [
      ['Bring your products in', 'Download the Excel template, paste your list and let the dry run flag duplicates and bad prices before anything is saved.'],
      ['Sell at the counter', 'Scan the barcode, search by name or tap a quick key. Sell the same item by piece, dozen or carton at its own price.'],
      ['Write udhaar in the khata', 'Put a sale on the customer’s khata and send a WhatsApp reminder with their balance when it is due.'],
      ['Check stock before you reorder', 'Record damaged or expired stock and see what is running low before you reorder.'],
    ],
    faqKeys: ['devices', 'kiryana-units', 'kiryana-import', 'khata-reminders', 'offline', 'pricing'],
    products: ['pos', 'inventory', 'khata'],
    relatedIndustries: ['pharmacy', 'bakery'],
    solution: 'multi-branch',
  }),
  industry({
    slug: 'bakery',
    title: 'Bakery & Sweets',
    shortName: 'Bakery',
    shopNoun: 'bakeries and sweet shops',
    romanUrduName: 'Bakery / mithai ki dukaan',
    group: 'food',
    icon: 'cake-slice',
    color: '#be185d',
    sortOrder: 2,
    summary:
      "Nafaa runs bakeries and sweet shops: take custom cake orders with an advance, plan the day's baking, keep raw materials with their cost, see each recipe's live cost, track freshness and waste, and manage wedding and event bulk orders, alongside the normal counter, stock and khata.",
    builtFor: 'Bakeries, cake shops and sweet (mithai) shops',
    romanUrdu:
      'Bakery ke liye Nafaa: cake order advance ke saath, roz ki baking ka plan, raw material aur recipe ki cost, freshness aur waste ka hisaab, aur shaadi ya event ke bulk order.',
    features: [
      { icon: 'cake-slice', title: 'Custom cake orders', body: 'Size, flavour, message and delivery date on one order, with the advance recorded.' },
      { icon: 'calendar', title: 'Daily baking', body: "Plan and record each day's baking batches." },
      { icon: 'boxes', title: 'Raw materials', body: 'Ingredients are kept apart from products, with stock and cost per unit.' },
      { icon: 'calculator', title: 'Recipe cost', body: 'Add a recipe to a product and see its cost follow ingredient prices.' },
      { icon: 'clock', title: 'Freshness and waste', body: 'See items near the end of their shelf life and record what was wasted.' },
      { icon: 'users', title: 'Bulk orders', body: 'Wedding and event orders with an advance, and a warning when a confirmed order has no advance yet.' },
    ],
    day: [
      ['Plan the baking', "Plan and record each day's baking batches."],
      ['Take cake orders', 'Record size, flavour, message, delivery date and the advance on one order.'],
      ['Sell and track freshness', 'Sell at the counter and see which items are close to the end of their shelf life.'],
      ['Record waste', 'Write off what was wasted so the recipe costs and margins stay honest.'],
    ],
    faqKeys: ['bakery-bulk', 'offline', 'pricing'],
    products: ['pos', 'inventory'],
    relatedIndustries: ['restaurant', 'kiryana'],
  }),
  industry({
    slug: 'restaurant',
    title: 'Restaurant & Cafe',
    shortName: 'Restaurant',
    shopNoun: 'restaurants and cafes',
    romanUrduName: 'Restaurant / cafe',
    group: 'food',
    icon: 'utensils-crossed',
    color: '#9a3412',
    sortOrder: 3,
    summary:
      "Nafaa runs dine-in, takeaway and delivery for restaurants and cafes: a table layout, kitchen order tickets (KOT) sent to each station's printer or screen, add-ons on dishes, recipes, riders for delivery, happy-hour prices, and bills paid by cash, card, wallet, split or khata.",
    builtFor: 'Restaurants, cafes, dhabas and takeaways',
    romanUrdu:
      'Restaurant aur cafe ke liye: tables, har station ko apna KOT, add-ons, recipes, delivery riders, happy hour, aur bill cash, card, wallet, split ya khata par.',
    features: [
      { icon: 'layout-grid', title: 'Tables', body: 'See every table on a layout and open its order.' },
      { icon: 'printer', title: 'KOT per station', body: 'Each menu category goes to its station (grill, tandoor, bar) on a printer or kitchen screen.' },
      { icon: 'monitor', title: 'Kitchen display', body: 'Tickets move from new to cooking to ready, with the minutes since each came in.' },
      { icon: 'sliders-horizontal', title: 'Add-ons', body: 'Options and add-ons on dishes, priced on the bill and printed on the KOT.' },
      { icon: 'truck', title: 'Delivery riders', body: 'Assign riders and follow delivery orders.' },
      { icon: 'split', title: 'Split and part payment', body: 'Pay by cash, card, wallet, split, part payment or khata.' },
    ],
    day: [
      ['Open a table', 'Pick the table on the layout and start its order, or start a takeaway or delivery order.'],
      ['Send it to the kitchen', 'Each dish prints its KOT at its own station, on a printer or a kitchen screen.'],
      ['Follow delivery', 'Assign a rider and follow the order until it is delivered.'],
      ['Settle the bill', 'Take cash, card or wallet, split it, take part now, or put it on the customer’s khata.'],
    ],
    faqKeys: ['restaurant-stations', 'offline', 'pricing'],
    products: ['pos', 'inventory'],
    relatedIndustries: ['bakery', 'kiryana'],
  }),
  industry({
    slug: 'pharmacy',
    title: 'Pharmacy & Medical Store',
    shortName: 'Pharmacy',
    shopNoun: 'pharmacies and medical stores',
    romanUrduName: 'Pharmacy / medical store',
    group: 'health',
    icon: 'pill',
    color: '#166534',
    sortOrder: 4,
    summary:
      'Nafaa is software for pharmacies and medical stores in Pakistan: search medicines by salt or formula and find substitutes, track batches and expiry, keep prescriptions and doctors, record controlled and narcotic sales in a register with patient and doctor details, and log fridge temperatures for the cold chain.',
    builtFor: 'Pharmacies, medical stores and chemists',
    romanUrdu:
      'Pharmacy ke liye Nafaa: salt ya formula se dawa dhoondein aur substitute dekhein, batch aur expiry ka hisaab, nuskhe aur doctors, narcotic register me mareez aur doctor ki tafseel, aur fridge ka temperature log.',
    features: [
      { icon: 'search', title: 'Salt and formula search', body: 'Find a medicine by brand or salt and see other brands with the same salt.' },
      { icon: 'calendar-clock', title: 'Batch and expiry', body: 'Stock by batch with expiry dates; items inside 30 and 90 days are flagged.' },
      { icon: 'file-text', title: 'Prescriptions', body: 'Record, check and dispense prescriptions, in full or in part.' },
      { icon: 'stethoscope', title: 'Doctors', body: 'Keep the doctors whose prescriptions you fill.' },
      { icon: 'shield-check', title: 'Narcotic register', body: 'Controlled, narcotic and psychotropic sales go into a register with the patient and doctor.' },
      { icon: 'refrigerator', title: 'Cold chain log', body: 'Record fridge temperatures for medicines kept at 2-8°C.' },
    ],
    day: [
      ['Find the medicine', 'Search by brand or salt; if a brand is out, the same-salt substitutes are one tap away.'],
      ['Sell from your batches', 'Stock is kept by batch, each with its own expiry date.'],
      ['Record controlled sales', 'For register medicines, the counter asks for the patient and doctor details and writes them on the bill line.'],
      ['Check expiry and the fridge', 'Review what expires inside 30 and 90 days and log the fridge temperature.'],
    ],
    faqKeys: ['pharmacy-salt', 'pharmacy-expiry', 'pharmacy-register', 'offline', 'pricing'],
    products: ['pos', 'inventory', 'khata'],
    relatedIndustries: ['kiryana', 'mobile-shop'],
  }),
  industry({
    slug: 'mobile-shop',
    title: 'Mobile Phone Shop',
    shortName: 'Mobile shop',
    shopNoun: 'mobile phone shops',
    romanUrduName: 'Mobile shop',
    group: 'retail',
    icon: 'smartphone',
    color: '#1d4ed8',
    sortOrder: 5,
    summary:
      "Nafaa runs mobile phone shops: keep stock by IMEI, record each phone's PTA status, buy used phones and take trade-ins, open repair job cards, and sell on instalments with a qist plan, while the counter, khata and reports work the same as in any shop.",
    builtFor: 'Mobile phone shops, accessory shops and repair counters',
    romanUrdu: 'Mobile shop ke liye Nafaa: IMEI ke hisaab se stock, har phone ka PTA status, used phone ki khareed aur trade-in, repair job card, aur qist plan.',
    features: [
      { icon: 'barcode', title: 'IMEI stock', body: 'Every phone is kept by its IMEI, from purchase to sale.' },
      { icon: 'shield-check', title: 'PTA status', body: 'Record the PTA status of each IMEI.' },
      { icon: 'arrow-left-right', title: 'Used phones and trade-in', body: 'Buy used phones and take them in part-exchange.' },
      { icon: 'wrench', title: 'Repair job cards', body: 'Open a repair ticket, follow it and hand the phone back.' },
      { icon: 'calendar', title: 'Qist plans', body: 'Sell on instalments and follow up what is due.' },
      { icon: 'notebook-pen', title: 'Khata', body: 'Udhaar and payments per customer, with WhatsApp reminders.' },
    ],
    day: [
      ['Receive stock by IMEI', 'Enter the IMEIs when stock arrives, with each phone’s PTA status.'],
      ['Sell with the IMEI on the bill', 'The handset’s IMEI goes on the bill, so you always know what is sold.'],
      ['Take a trade-in', 'Record the used phone against the new sale; it joins your stock with its IMEI and cost.'],
      ['Follow repairs and qist', 'Open job cards for repairs and follow up instalments that are due.'],
    ],
    faqKeys: ['mobile-imei', 'offline', 'pricing'],
    products: ['pos', 'inventory', 'khata'],
    relatedIndustries: ['garments', 'kiryana'],
  }),
  industry({
    slug: 'garments',
    title: 'Garments & Boutique',
    shortName: 'Garments',
    shopNoun: 'garment shops and boutiques',
    romanUrduName: 'Kapre ki dukaan / boutique',
    group: 'retail',
    icon: 'shirt',
    color: '#be185d',
    sortOrder: 6,
    summary:
      'Nafaa runs garment shops and boutiques that sell ready-made and custom-stitched clothes: stock by size and colour, tailoring (silai) orders, alterations, saved customer measurements, items put on hold, qist plans, exchanges, collections and size charts, alongside the counter, khata and reports.',
    builtFor: 'Garment shops, boutiques and tailors',
    romanUrdu: 'Garments aur boutique ke liye: size aur rang ke hisaab se stock, silai order, alteration, gahak ka naap, hold, qist plan, exchange aur size chart.',
    features: [
      { icon: 'shirt', title: 'Size and colour', body: 'Each size and colour is its own stock line.' },
      { icon: 'scissors', title: 'Silai orders', body: "Tailoring orders with the customer's measurements." },
      { icon: 'clipboard-list', title: 'Measurements', body: "Save each customer's measurements and reuse them on the next order." },
      { icon: 'repeat', title: 'Alterations and exchanges', body: 'Record alterations and exchange items at the counter.' },
      { icon: 'tag', title: 'Hold and qist', body: 'Hold an item for a customer or sell it on a qist plan.' },
      { icon: 'layers', title: 'Collections and size charts', body: 'Group stock by collection and keep size charts.' },
    ],
    day: [
      ['Stock by size and colour', 'Each size and colour is its own line, so the counter knows exactly what is on the shelf.'],
      ['Take a silai order', 'Open the customer’s saved measurements and start the stitching order.'],
      ['Exchange at the counter', 'A returned size goes back into stock as the new one goes out.'],
      ['Hold or sell on qist', 'Keep an item aside for a customer, or sell it on a qist plan.'],
    ],
    faqKeys: ['garments-variants', 'pricing'],
    products: ['pos', 'inventory'],
    relatedIndustries: ['mobile-shop', 'kiryana'],
  }),
  industry({
    slug: 'hardware',
    title: 'Hardware & Building Materials',
    shortName: 'Hardware',
    shopNoun: 'hardware and building material shops',
    romanUrduName: 'Hardware / building material',
    group: 'specialty',
    icon: 'hammer',
    color: '#57534e',
    sortOrder: 11,
    summary:
      'Nafaa runs hardware and building material shops: items by size and shade, retail, contractor and bulk rates, quotations that turn into bills, delivery challans, contractor sites with their own khata, brands, and reorder rules that flag what to buy before it runs out.',
    builtFor: 'Hardware, paint, sanitary and building material shops',
    romanUrdu: 'Hardware aur building material ke liye: size aur shade, retail, thekedar aur bulk rate, quotation se bill, delivery challan, thekedar ka khata aur reorder.',
    features: [
      { icon: 'file-text', title: 'Quotations to bills', body: 'Send a quotation and turn it into a bill when accepted.' },
      { icon: 'truck', title: 'Delivery challans', body: 'Delivery challans for goods sent to a site.' },
      { icon: 'hand-coins', title: 'Contractor khata', body: 'A khata for each contractor and site.' },
      { icon: 'building', title: 'Sites and projects', body: 'Keep what went to each site or project.' },
      { icon: 'tags', title: 'Three rates', body: 'Retail, contractor and bulk rates on the same item.' },
      { icon: 'package-search', title: 'Reorder rules', body: 'Set a minimum and see what to buy before it runs out.' },
    ],
    day: [
      ['Quote the contractor', 'Send a quotation at the contractor rate and turn it into a bill when it is accepted.'],
      ['Send goods to the site', 'Print a delivery challan for what goes to each site.'],
      ['Keep the contractor khata', 'Every site and contractor has its own khata.'],
      ['Reorder in time', 'Items below their minimum show up before they run out.'],
    ],
    faqKeys: ['offline', 'pricing'],
    products: ['pos', 'inventory', 'khata'],
    relatedIndustries: ['kiryana', 'jewelry'],
  }),
  industry({
    slug: 'jewelry',
    title: 'Jewellery & Sonar',
    shortName: 'Jewellery',
    shopNoun: 'jewellery shops',
    romanUrduName: 'Sonar / zewar ki dukaan',
    group: 'specialty',
    icon: 'gem',
    color: '#854d0e',
    sortOrder: 14,
    summary:
      "Nafaa runs jewellery shops: set today's gold and silver rate, keep each piece with its metal and stones, sell at the counter, take custom orders, buy back old gold, handle repairs, track work given to karigars, and keep metal stock by weight.",
    builtFor: 'Jewellers, sonars and gold and silver shops',
    romanUrdu: 'Sonar ke liye Nafaa: aaj ka rate, har zewar ka metal aur nageena, custom order, purana sona, repair, karigar ka kaam aur metal ka stock.',
    features: [
      { icon: 'coins', title: "Today's rate", body: 'Set the gold and silver rate for the day.' },
      { icon: 'gem', title: 'Pieces with metal and stones', body: 'Each piece with its metal, weight and stones.' },
      { icon: 'clipboard-list', title: 'Custom orders', body: 'Take and follow custom orders.' },
      { icon: 'repeat', title: 'Old gold', body: 'Buy back or exchange old gold.' },
      { icon: 'hammer', title: 'Karigar work', body: 'Track work and metal given to karigars.' },
      { icon: 'wrench', title: 'Repairs', body: 'Take in and return repairs.' },
    ],
    day: [
      ["Set today's rate", 'Set the gold and silver rate for the day before the counter opens.'],
      ['Sell a piece', 'Each piece carries its metal, weight and stones onto the bill.'],
      ['Take old gold', 'Buy back or exchange old gold against the new sale.'],
      ['Follow karigar work', 'See which work and metal are with which karigar.'],
    ],
    faqKeys: ['offline', 'pricing'],
    products: ['pos', 'inventory'],
    relatedIndustries: ['garments', 'hardware'],
  }),
];
