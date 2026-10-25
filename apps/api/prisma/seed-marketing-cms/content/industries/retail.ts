/** Industry: General Retail Shop (/industries/retail). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "retail",
  title: "General Retail Shop",
  shortName: "Retail",
  shopNoun: "retail shops",
  romanUrduName: "Koi bhi dukaan",
  group: "retail",
  icon: "shopping-bag",
  color: "#047857",
  appIndustryKey: "standard",
  businessType: "GENERAL",
  sortOrder: 28,
  summary:
    "Nafaa works for any shop that does not fit a specific industry: a fast counter with quick keys and barcodes, combos, stock with low-stock and damage records, bulk import from Excel, a digital khata for udhaar, and reports on sales and profit, all in one app.",
  builtFor: "Any shop that sells goods over a counter",
  romanUrdu:
    "Agar aap ki dukaan kisi khaas industry me nahi aati to bhi Nafaa chalta hai: tez counter, quick keys, barcode, combo, stock, khata aur reports.",
  features: [
    { icon: "zap", title: "Quick keys", body: "One tap for the items you sell most, arranged the way your counter works." },
    { icon: "scan-barcode", title: "Barcodes and labels", body: "Scan items at the counter, and print your own barcode stickers on a thermal roll or an A4 sheet for goods that arrive without one." },
    { icon: "layers", title: "More than one unit", body: "Sell the same item by piece, pack, dozen, carton, kilo, litre or metre, each with its own price." },
    { icon: "gift", title: "Combos", body: "Bundle items into a deal with its own price; stock goes out item by item." },
    { icon: "triangle-alert", title: "Damage and low stock", body: "Staff report broken or expired goods for a manager to approve, and the low-stock list shows what to order and from whom." },
    { icon: "file-spreadsheet", title: "Excel import and bulk edit", body: "Bring your product list in from a spreadsheet, and change prices for many items at once." },
    { icon: "notebook-pen", title: "Khata", body: "Udhaar per customer with WhatsApp reminders." },
    { icon: "rotate-ccw", title: "Returns", body: "Take goods back against the original bill, so stock and cash stay right." },
    { icon: "chart-column", title: "Reports", body: "Sales, profit by product and the day book, from the same bills the counter makes." },
  ],
  faqKeys: ["devices","khata-reminders","offline","pricing"],
  evidence: [
    "apps/web/src/industries/retail/RetailPack.tsx",
    "apps/web/src/modules/pos/quick-keys",
    "apps/web/src/modules/inventory/barcodes/pages/BarcodeLabelsPage.tsx",
    "apps/web/src/modules/inventory/product-units",
    "apps/web/src/modules/inventory/combos",
    "apps/web/src/modules/inventory/damage/pages/DamagePage.tsx",
    "apps/web/src/modules/inventory/low-stock/pages/LowStockPage.tsx",
    "apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx",
    "apps/web/src/modules/inventory/products/pages/ProductBulkEditPage.tsx",
    "apps/web/src/modules/sales/returns",
    "apps/web/src/modules/finance/cash-register/pages/CashRegisterPage.tsx",
    "apps/web/src/modules/purchasing/purchases",
  ],
  dropped: [
    "\"Fastest general retail POS in Pakistan, 3 sec checkout\" (unmeasured).",
    "\"Auto reorder\" (the general setup shows low stock; it does not place orders).",
  ],
  heroOverride: {
    heading: "One app for the counter, the shelves and the khata of any shop",
    sub: "Stationery, crockery, household goods, gifts or a bit of everything: bill with barcodes and quick keys, print your own labels, keep stock in every unit you sell, and see what each day really earned.",
    badges: ["Barcode labels", "Piece, pack, carton", "Works offline"],
    media: { mediaId: SHOT.dashboard, url: "app.nafaa.pk/dashboard" },
  },
  deepBlocks: [
    shot({
      heading: "Every product with its cost, price and stock",
      body: "A general shop carries hundreds of small lines from many suppliers. The products page shows each one with stock, cost, price and margin, flags what is running low, and tells you how much money sits on the shelves.",
      id: SHOT.inventory,
      url: "app.nafaa.pk/products",
      layout: "full",
      caption: "Shown with a demo store's data.",
      callouts: [
        { x: 34.5, y: 19.5, label: "Stock value and what it will sell for" },
        { x: 50, y: 33, label: "Low stock flagged before it runs out" },
        { x: 22, y: 81, label: "Cost, price and margin on every item" },
      ],
    }),
    steps("A day at a general shop", [
      ["Opening", "Open the galla with the cash in the drawer, and look at the dashboard for yesterday's sale and today's jobs.", SHOT.dashboard],
      ["New stock arrives", "Enter the supplier's bill as a purchase, so stock and cost update together, and print barcode stickers for anything without a code."],
      ["At the counter", "Scan, tap a quick key or search by name. Sell a single pen or a whole box, take cash, JazzCash, Easypaisa or put it on the customer's khata."],
      ["A customer comes back", "Return or swap the item against the original bill; the piece goes back on the shelf and the money is settled."],
      ["Closing", "Count the galla note by note, check the day's profit, and send the low-stock list to your supplier on WhatsApp."],
    ]),
    shot({
      heading: "Know what to reorder before the shelf is empty",
      body: "The low-stock list works out how many days each item will last at its recent selling rate, suggests how much to order and from which supplier, and turns the lines into a purchase order.",
      id: SHOT.lowStock,
      url: "app.nafaa.pk/inventory/low-stock",
      layout: "split-right",
      caption: "Shown with a demo store's data.",
      callouts: [
        { x: 61, y: 61, label: "How many days the stock will last" },
        { x: 71, y: 61, label: "How much to order" },
        { x: 92, y: 12, label: "Turn the list into a purchase order" },
      ],
    }),
    table("Register and memory, or Nafaa?", "How the everyday jobs of a general shop compare when they live in a register and in the owner's head, and when they live in Nafaa.", [
      { key: "paper", label: "Register and memory" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Prices", "Remembered, or written on a sheet near the counter", "On every item, changed for many items at once"],
      ["Goods without a barcode", "Typed or guessed each time", "Your own printed stickers, scanned like any other item"],
      ["Selling by unit", "Mental maths for a dozen or a carton", "Each unit has its own price; stock follows"],
      ["Reordering", "Noticed when a customer asks and it is gone", "Low-stock list with days left and a purchase order"],
      ["Broken goods", "Thrown away and forgotten", "Recorded, approved and shown as a loss"],
      ["End of day", "Cash counted, profit unknown", "Galla count, sale and profit after cost"],
    ]),
    prose(`## What to look for in software for a general shop

A general shop is harder to run on software than a specialist one, because it sells a little of everything. One customer wants a single eraser, the next wants a carton of tissue boxes, and half the stock comes from small suppliers who never print barcodes. Check that the software can:

- **Handle goods without barcodes.** You should be able to print your own labels, and use quick keys or name search for loose items.
- **Sell in the unit the customer asks for.** Piece, pack, dozen, carton, metre or kilo, each with its own price and the stock kept in one place.
- **Load your catalogue quickly.** Typing a thousand items by hand is where most shops give up. An Excel import with a check before saving matters more than any other feature in the first week.
- **Tell you what to reorder.** Not just "low stock", but how fast each item sells and how much to buy.
- **Keep udhaar and returns honest.** Credit sales on a proper khata, and returns tied to the original bill.
- **Keep working when the internet does not.** Load-shedding should not stop the counter.

Nafaa covers each of these in the same app, on the phone or computer you already have. If your trade later needs its own tools, such as IMEI for phones or sizes for garments, the matching industry setup adds them without moving to new software.`),
    pricing("Plans for one counter or many"),
  ],
});

/** Internal links: the products a general shop uses, the matching solutions and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'RELATED' },
    { ref: 'INDUSTRY:hardware', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sku', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-paper-register', kind: 'RELATED' },
  ],
} satisfies typeof entry;
