/** Industry: Shoe & Footwear Store (/industries/shoe). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "shoe",
  title: "Shoe & Footwear Store",
  shortName: "Shoe store",
  shopNoun: "shoe and footwear stores",
  romanUrduName: "Jooton ki dukaan",
  group: "retail",
  icon: "footprints",
  color: "#c2410c",
  appIndustryKey: "shoe",
  businessType: "SHOE",
  sortOrder: 29,
  summary:
    "Nafaa runs shoe stores: every pair by size and colour with its own barcode, brands and seasons, size-wise reorder, exchanges, a list of sizes customers asked for that were out of stock, and size charts, together with the counter, stock and khata.",
  builtFor: "Shoe and footwear stores",
  romanUrdu:
    "Jooton ki dukaan ke liye: size aur rang ke pair aur har pair ka barcode, brands aur season, exchange, size farmaish aur size chart.",
  features: [
    { icon: "footprints", title: "Size and colour", body: "A size × colour grid makes every pair its own variant with its own barcode; empty sizes show in red." },
    { icon: "tags", title: "Articles, brands and seasons", body: "Brand, article code, shoe type, Gents, Ladies or Bachay, and season on every article." },
    { icon: "percent", title: "MRP and Sale marks", body: "Keep the MRP; a price below it is marked Sale, and new arrivals are marked New." },
    { icon: "package-search", title: "Size reorder", body: "A list of the sizes and colours running out in this branch, and a warning for sizes that sell but are finished." },
    { icon: "repeat", title: "Exchanges", body: "The old pair comes back on the original bill and the new size goes out at once; only the difference changes hands." },
    { icon: "list-checks", title: "Size requests", body: "Note a size a customer asked for; when it is back in stock the request says so and the customer is told on WhatsApp." },
    { icon: "table", title: "Size charts", body: "Standard PK/UK, EU, US and cm charts for gents, ladies and kids, plus your own for brands that run small." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: [
    "apps/web/src/industries/shoe/ShoePack.tsx",
    "apps/web/src/industries/shoe/pages/ShoeProductWizardPage.tsx",
    "apps/web/src/industries/shoe/pages/ShoeProductsPage.tsx",
    "apps/web/src/industries/shoe/pages/ShoeProductDetailPage.tsx",
    "apps/web/src/industries/shoe/pages/ShoeExchangesPage.tsx",
    "apps/web/src/industries/shoe/pages/ShoeTryOnPage.tsx",
    "apps/web/src/industries/shoe/pages/ShoeSizeChartsPage.tsx",
    "apps/web/src/industries/shoe/pages/ShoeBrandsPage.tsx",
    "apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx",
  ],
  dropped: [
    "Box or rack location per size (a feature toggle mentions it, but no screen records it).",
  ],
  writerNotes: "Multi-region size charts are now checked: ShoeSizeChartsPage has PK/UK, EU, US and cm charts for gents, ladies and kids.",
  heroOverride: {
    heading: "Every pair, every size, every colour on its own barcode",
    sub: "Build an article's size grid in one go, see which sizes are finished before customers walk out, swap sizes on the old bill, and tell customers on WhatsApp when the size they asked for is back.",
    badges: ["Size × colour grid", "Size requests", "Exchanges"],
    media: { mediaId: SHOT.shoeProducts, url: "app.nafaa.pk/products" },
  },
  deepBlocks: [
    steps("A day at the shoe store", [
      ["New article arrives", "Enter the brand, article code, type and season, then tick sizes 39 to 44 in black and brown. Twelve variants are made, each with its own barcode to print."],
      ["A customer wants size 42", "The article shows pairs per size in this branch and in every other branch. If none is left, note a size request with her number."],
      ["Back in stock", "When size 42 comes in, the request shows it. Send her a WhatsApp message and close the request as bought or not."],
      ["An exchange after Eid", "Pick the earlier bill, take back the 41, give the 42. Past your exchange days, the owner's or a manager's PIN is asked."],
      ["Closing", "Open the size reorder list for sizes running out, and count the galla."],
    ]),
    shot({
      heading: "Reorder by size, not by article",
      body: "A shoe shop rarely runs out of an article; it runs out of size 9. The size reorder view looks at the stock left and the last 30 days of sales for every size and lists what to order, article by article, ready to turn into a purchase.",
      id: SHOT.shoeSizeReorder,
      url: "app.nafaa.pk/products",
      layout: "full",
      callouts: [
        { x: 33, y: 50.8, label: "What to order, counted by size" },
        { x: 27, y: 58.4, label: "Size, pairs left, sold and to order" },
        { x: 85, y: 55.3, label: "Pairs sold in the last 30 days" },
        { x: 93.3, y: 49.3, label: "Turn it into a purchase" },
      ],
    }),
    shot({
      heading: "Customers waiting for a size",
      body: "When size 40 is not in stock, write the request with the customer's phone instead of losing the sale. The list shows what each customer wants, flags the request when that size arrives, and sends the message on WhatsApp.",
      id: SHOT.shoeSizeRequests,
      url: "app.nafaa.pk/shoe/try-on",
      layout: "split-right",
      callouts: [
        { x: 20, y: 19.5, label: "Open size requests" },
        { x: 56, y: 54.4, label: "Article, size and colour wanted" },
        { x: 49.4, y: 58.7, label: "Flag when the size arrives" },
        { x: 75.6, y: 56.7, label: "Tell the customer on WhatsApp" },
      ],
    }),
    table("Stock register or Nafaa?", "How the main jobs of a shoe store compare in a register and in Nafaa.", [
      { key: "paper", label: "Stock register" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Sizes", "Boxes counted in the godown", "Pairs per size and colour, empty sizes in red"],
      ["Barcodes", "Article code written on the box", "A barcode for every size and colour"],
      ["Exchanges", "A new bill and a calculator", "Old pair back, new pair out, difference only"],
      ["Out-of-stock sizes", "The customer leaves and is forgotten", "A size request and a WhatsApp message when it is back"],
      ["Sale prices", "Stickers over the MRP", "MRP kept, Sale marked when the price is lower"],
    ]),
    prose(`## What to look for in shoe store software

A shoe store's stock is one article multiplied by every size and colour, and the most common lost sale is "we don't have your size". Software that treats each pair as an unrelated product makes both problems worse. Before you choose, check that it can:

- **Build a size and colour grid.** One article, all its sizes and colours, each with its own barcode and stock, made in one step.
- **Show which sizes are finished.** Especially sizes that sell well, before the customer finds out.
- **Handle exchanges easily.** Swapping a size is a daily job; it should take one screen and settle only the difference.
- **Remember size requests.** A customer who asked for size 42 is a sale waiting for stock.
- **Keep MRP and sale prices.** Footwear is often sold below MRP; both prices should stay on record.
- **Convert sizes.** PK/UK, EU, US and kids' sizes differ, and some brands run small.

Nafaa covers each of these in the shoe store setup, together with the counter, purchasing, khata and reports every Nafaa shop uses.`),
    pricing("Plans for one store or several branches"),
  ],
});

/** Internal links: the products a shoe store uses, related trades and terms. */
export default {
  ...entry,
  seoDescription: 'Shoe store software: every pair by size and colour with its own barcode, brands and seasons, size-wise reorder, exchanges and sizes customers asked for.',
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:multi-shop', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'RELATED' },
    { ref: 'INDUSTRY:sports', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sku', kind: 'RELATED' },
  ],
} satisfies typeof entry;
