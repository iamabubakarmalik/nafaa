/** Industry: Carpet & Flooring (/industries/carpet). Imported from apps/marketing and checked against the carpet pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "carpet",
  title: "Carpet & Flooring",
  shortName: "Carpet",
  shopNoun: "carpet and flooring shops",
  romanUrduName: "Carpet / qaleen ki dukaan",
  group: "specialty",
  icon: "layers",
  color: "#9f1239",
  appIndustryKey: "carpet",
  businessType: "CARPET",
  sortOrder: 8,
  summary:
    "Nafaa handles carpet, flooring and matting shops that sell by the roll: keep each roll's length in stock, cut pieces to size with a length-by-width calculator, price by square foot, keep the leftover cut pieces as stock, and import rolls in bulk from a spreadsheet.",
  builtFor: "Carpet, rug, flooring and matting shops",
  romanUrdu:
    "Carpet aur flooring ki dukaan ke liye: roll ki lambai ka stock, size ke mutabiq kaat, sq ft rate, bache hue tukron ka stock, aur rolls ka bulk import.",
  features: [
    { icon: "layers", title: "Every roll on record", body: "Each roll with its design, width, the length and square feet left, rate and rack, plus every cut taken from it." },
    { icon: "calculator", title: "Cut window at the counter", body: "Pick a roll, enter the width and length the customer takes; square feet, rate and total are worked out as you type." },
    { icon: "tag", title: "Sell by area or length", body: "Price by square foot, square metre, square gaz, running foot or metre." },
    { icon: "scissors", title: "Remnant pieces as stock", body: "The strip left beside a cut, returns and old offcuts are kept as pieces you can sell whole." },
    { icon: "triangle-alert", title: "Short and damaged rolls", body: "Tabs for rolls in stock, running low, reserved, finished and damaged, with a reason on every change." },
    { icon: "truck", title: "Buy by the roll", body: "A purchase adds each roll with its size, cost and rate per square foot; rugs and underlay are bought by quantity." },
    { icon: "upload", title: "Roll import", body: "Start with an Excel or CSV file of your rolls; only rows that pass the check are added as opening stock." },
    { icon: "wifi-off", title: "Cuts made offline", body: "Bill without internet; the roll is cut from stock once the bill reaches the server, and pending cuts settle in one tap." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/carpet/CarpetPack.tsx",
    "apps/web/src/industries/carpet/pos/config.ts",
    "apps/web/src/industries/carpet/pos/CutModal.tsx",
    "apps/web/src/industries/carpet/pos/PendingCuts.tsx",
    "apps/web/src/industries/carpet/pages/CarpetRollsPage.tsx",
    "apps/web/src/industries/carpet/pages/CarpetRollDetailPage.tsx",
    "apps/web/src/industries/carpet/pages/CarpetCutPiecesPage.tsx",
    "apps/web/src/industries/carpet/pages/CarpetPurchaseEditor.tsx",
    "apps/web/src/industries/carpet/pages/CarpetBulkImportPage.tsx",
    "apps/web/src/industries/carpet/components/CarpetReturnOptionsDialog.tsx",
    "apps/web/src/industries/carpet/lib/meta.ts",
  ],
  dropped: [],
  heroOverride: {
    heading: "Roll stock you can trust, cut by cut",
    sub: "Cut carpet to the customer's size at the counter, price it by the square foot, keep every leftover strip as stock, and always know how many feet are left on each roll.",
    badges: ["Sq ft pricing", "Remnants kept", "Works offline"],
    media: { mediaId: SHOT.inventory, url: "app.nafaa.pk/products" },
  },
  deepBlocks: [
    steps("How a carpet sale works in Nafaa", [
      ["Measure", "The customer's room is 12 ft by 14 ft. Tap the carpet at the counter and the cut window opens."],
      ["Pick the roll", "Choose the roll; full width is filled in. Enter the length and see square feet, rate and total at once."],
      ["Bill it", "Each cut is its own bill line naming the roll and size. Add underlay, gripper or fitting as normal items."],
      ["Stock follows", "After the bill is saved the roll is cut, its length drops, and the strip left beside the cut becomes a piece you can sell later."],
    ]),
    shot({
      heading: "Roll goods and rugs on one products page",
      body: "Roll goods show their rolls, square feet and remnant pieces under the name, and a banner totals the roll stock. Rugs, dari and underlay sit beside them as normal items with price, cost and stock.",
      id: SHOT.inventory,
      url: "app.nafaa.pk/products",
      layout: "full",
      caption: "The shared products page, shown with demo shop data.",
      callouts: [
        { x: 26, y: 19, label: "Stock value at cost" },
        { x: 40, y: 33, label: "Items running low" },
        { x: 30, y: 80, label: "Price, cost and margin per item" },
      ],
    }),
    shot({
      heading: "Which designs actually earn",
      body: "Profit by product shows sale, cost and margin for each design over any period, so you know which rolls to buy again and which to clear.",
      id: SHOT.profitByProduct,
      url: "app.nafaa.pk/reports/profit",
      layout: "split-left",
      caption: "The shared profit report, shown with demo shop data.",
      callouts: [
        { x: 52, y: 21, label: "Gross profit and margin" },
        { x: 86, y: 62, label: "Profit per item" },
      ],
    }),
    table("Measuring tape and register, or Nafaa?", "How the everyday jobs of a carpet shop compare on paper and on Nafaa.", [
      { key: "paper", label: "Tape and register" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Length left on a roll", "Unroll and measure", "Shown on the roll, updated with every cut"],
      ["Working out the price", "Calculator, feet and inches by hand", "Square feet and total worked out in the cut window"],
      ["Leftover strips", "Rolled up and forgotten in the godown", "Kept as pieces with size, price and place"],
      ["Damaged or short rolls", "Found when a customer is waiting", "Marked with a reason and listed in their own tab"],
      ["A returned cut", "Mixed back into stock somehow", "Comes back as a piece of the returned size, good or damaged"],
    ]),
    prose(`## What to look for in carpet shop software

A carpet shop does not sell items, it sells area. One roll becomes dozens of bills of different sizes, and the money is lost in the gaps: a few feet wasted here, a strip never sold there, a roll that turned out shorter than the register said. Ordinary POS software that counts pieces cannot see any of this. Before you choose, check that it can:

- **Keep stock as rolls, not a number.** Each roll's width and length left, with every cut recorded against a bill.
- **Price the way you sell.** Square feet, square metres, square gaz or running length, with feet-and-inch sizes that customers actually give.
- **Treat remnants as stock.** The strip beside a cut and the returned piece are money; they should be searchable and sellable.
- **Record changes with a reason.** Adjustments, damage and finished rolls should leave a trail, so the owner can see where the feet went.
- **Bill offline.** Markets lose power and signal; the counter has to keep cutting and settle the stock later.
- **Start quickly.** Bringing in existing rolls from a spreadsheet saves days of typing.

Nafaa covers each of these on a phone or computer, alongside the customer khata for contractors and regular buyers.`),
    pricing("Plans for one shop or several"),
  ],
  writerNotes: "Screenshots are the shared products and profit screens with demo data; no carpet-specific screenshots exist yet.",
});

/** Internal links: the products carpet shops use, the matching solution and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:furniture', kind: 'RELATED' },
    { ref: 'INDUSTRY:hardware', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sku', kind: 'RELATED' },
  ],
} satisfies typeof entry;
