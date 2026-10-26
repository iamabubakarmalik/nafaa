/** Industry: Kiryana & Grocery Store (/industries/kiryana). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "kiryana",
  title: "Kiryana & Grocery Store",
  shortName: "Kiryana",
  shopNoun: "kiryana and grocery stores",
  romanUrduName: "Kiryana / general store",
  group: "retail",
  icon: "store",
  color: "#065f46",
  colorNote: "App identity #059669 is 3.77:1 with white text; seeded #065f46 instead (Phase 1 issue 7); emerald-700 is taken by the General store identity.",
  appIndustryKey: "retail",
  businessType: "GROCERY",
  featured: true,
  sortOrder: 1,
  summary:
    "Nafaa is POS and khata software for kiryana and grocery stores in Pakistan. Scan barcodes at the counter, sell by piece, dozen or carton, keep every customer's udhaar in a digital khata with WhatsApp reminders, import products from Excel, and keep billing when the internet drops.",
  builtFor: "Kiryana, grocery and general stores, from one counter to several branches",
  romanUrdu:
    "Nafaa kiryana aur grocery store ke liye POS aur khata app hai. Barcode se bill banayein, piece, darjan ya carton me bechein, udhaar digital khata me rakhein aur WhatsApp par yaad-dihani bhejein. Internet na ho to bhi counter chalta rehta hai.",
  features: [
    { icon: "scan-barcode", title: "Barcode counter", body: "Scan with a barcode scanner, search by name, or tap a quick key for loose items." },
    { icon: "layers", title: "Piece, dozen and carton", body: "Sell one product in more than one unit, each with its own price." },
    { icon: "notebook-pen", title: "Digital khata", body: "Udhaar, payments and old-register balances per customer, with WhatsApp reminders sent one by one." },
    { icon: "file-spreadsheet", title: "Import from Excel", body: "Download a template, upload your list, check it in a dry run, then import." },
    { icon: "gift", title: "Combos and deals", body: "Bundle items into a combo with its own price." },
    { icon: "triangle-alert", title: "Damage and low stock", body: "Record broken or expired stock and see what is running low." },
  ],
  faqKeys: ["devices","kiryana-units","kiryana-import","khata-reminders","offline","pricing"],
  evidence: ["apps/web/src/industries/retail/RetailPack.tsx","apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx","apps/web/src/modules/pos/quick-keys","apps/api/src/modules/inventory/products/import/product-import.service.ts"],
  dropped: [
    "\"95% udhaar recovery\" and other uncounted results.",
    "\"#1 kiryana store software in Pakistan\" claim.",
    "Voice input and \"every screen in proper Urdu\" (not found in the app).",
    "Key metrics (3 seconds per sale, 4 hours saved daily, zero lost records): no measurement behind them.",
    "Testimonial t5 (no recorded consent).",
  ],
  needsOwner: ["Separate wholesale and retail price lists for the same product: confirm before claiming."],
  heroOverride: {
    heading: "The kiryana counter, the khata and the stock in one app",
    sub: "Bill faster with barcodes and quick keys, sell atta by the kilo and oil by the carton, keep every customer's udhaar in a digital khata, and keep selling when the internet drops.",
    badges: ["Udhaar on WhatsApp", "Piece, dozen, carton", "Works offline"],
    media: { mediaId: SHOT.dashboard, url: "app.nafaa.pk/dashboard" },
  },
  deepBlocks: [
    shot({
      heading: "A counter built for a busy kiryana",
      body: "Daal, chawal, chai and soap sit in big tiles by category, with the stock left on every tile. Loose items get quick keys, packed items scan, and the bill stays on the right with every way to pay.",
      id: SHOT.pos,
      url: "app.nafaa.pk/pos",
      layout: "full",
      callouts: [
        { x: 40, y: 26, label: "Categories like Atta, Rice & Daal" },
        { x: 30, y: 47, label: "Stock left on each item" },
        { x: 85, y: 93, label: "Cash, JazzCash, Easypaisa or udhaar" },
      ],
    }),
    steps("A day at the kiryana counter", [
      ["Morning", "Open the low-stock list and call the supplier before the rush starts.", SHOT.lowStock],
      ["Rush hour", "Scan packed items, tap quick keys for loose ones, and print or WhatsApp the bill."],
      ["Udhaar customers", "Put the bill on the customer's khata; the counter stops at their credit limit unless you approve it."],
      ["Closing", "Count the galla, read today's profit and send a few udhaar reminders on WhatsApp."],
    ]),
    shot({
      heading: "The udhaar register, finally under control",
      body: "Every udhaar bill lands in the customer's khata from the counter. See total receivable by age, and send a polite WhatsApp reminder with the exact balance in one tap.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "split-right",
    }),
    table("Paper register or Nafaa?", "How the everyday jobs of a kiryana store compare on a paper register and on Nafaa.", [
      { key: "paper", label: "Paper register" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Writing the bill", "By hand, totals on a calculator", "Scan or tap; totals and receipt by themselves"],
      ["Udhaar", "Pages that get lost or wet", "Digital khata per customer with ageing"],
      ["Reminders", "Phone calls and awkward talks", "One-tap WhatsApp message with the balance"],
      ["Stock", "Guessing from the shelf", "Live stock in every unit with low-stock alerts"],
      ["Profit", "Known at the end of the month, roughly", "Profit after cost and expenses, every day"],
    ]),
    prose(`## What to look for in kiryana software

A kiryana store sells hundreds of small items to the same neighbourhood every day, so the software has to be fast, forgiving and honest about money. Before you choose, check that it can:

- **Sell in more than one unit.** Cooking oil by the bottle and the carton, eggs by the piece and the dozen, each with its own price.
- **Keep udhaar properly.** A khata per customer, balances brought over from the old register, and reminders that do not embarrass anyone.
- **Keep billing without internet.** Load-shedding and weak signal should never stop the counter.
- **Show real profit.** Sales minus cost and expenses, not just the day's takings.
- **Grow with you.** A second counter or a second branch should not mean new software.

Nafaa does all of this on the phone or computer you already have, in English or Roman Urdu.`),
    prose(`## Moving your store onto Nafaa

Most stores make the switch over a quiet afternoon, without closing the counter.

1. **Products first.** Download the Excel template, paste your item list with cost, sale price and opening stock, and run the dry run. Before anything is saved it flags rows with no price or a price below cost, and matches items already in the shop by SKU or barcode so they are not added twice.
2. **Units next.** For items you sell loose or in bulk, add the extra units: a carton of 12 oil bottles, a dozen eggs, a sack of rice. Each unit keeps its own price.
3. **Old udhaar.** Add each regular customer once with the balance from the paper register. From then on every udhaar bill and payment updates that balance by itself.
4. **Quick keys.** Put the loose items you sell all day, like eggs, bread and loose sugar, on quick keys so they take one tap at the counter.

Keep the paper register for a week if it makes you comfortable. Once the khata balances match, it can go on the shelf.`),
    pricing("Plans for one counter or many"),
  ],
  writerNotes: "Owner decision O11 (pending): slug stays /industries/kiryana; use \"grocery\" in the copy.",
});

/** Internal links (D2): the products kiryana stores use, the matching solution and related trades. */
export default {
  ...entry,
  seoDescription: 'POS and khata software for kiryana and grocery stores: barcode billing, sale by piece or carton, udhaar with WhatsApp reminders, and billing without internet.',
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'TAG' },
    { ref: 'CITY:lahore', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'RELATED' },
    { ref: 'INDUSTRY:dairy', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'RELATED' },
    { ref: 'BLOG_POST:digital-khata-vs-paper-ledger', kind: 'RELATED' },
    { ref: 'PAGE:kiryana-store-software', kind: 'RELATED' },
    { ref: 'CITY_INDUSTRY:islamabad/kiryana', kind: 'RELATED' },
    { ref: 'CITY_INDUSTRY:karachi/kiryana', kind: 'RELATED' },
    { ref: 'CITY_INDUSTRY:lahore/kiryana', kind: 'RELATED' },
    { ref: 'CITY_INDUSTRY:rawalpindi/kiryana', kind: 'RELATED' },
  ],
} satisfies typeof entry;
