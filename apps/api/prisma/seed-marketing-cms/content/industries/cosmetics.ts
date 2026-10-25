/** Industry: Cosmetics & Beauty Shop (/industries/cosmetics). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "cosmetics",
  title: "Cosmetics & Beauty Shop",
  shortName: "Cosmetics",
  shopNoun: "cosmetics and beauty shops",
  romanUrduName: "Cosmetics ki dukaan",
  group: "lifestyle",
  icon: "sparkles",
  color: "#c026d3",
  appIndustryKey: "cosmetics",
  businessType: "COSMETICS",
  sortOrder: 21,
  summary:
    "Nafaa runs cosmetics and beauty shops that sell makeup, skincare, fragrance and haircare: brands and shades, batch expiry, tester records, deals and gift sets, and a loyalty programme for regular customers, with the counter, stock and khata built in. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Cosmetics, beauty and fragrance shops",
  romanUrdu:
    "Cosmetics ki dukaan ke liye: brands aur shades, batch expiry, testers, deals aur gift sets, aur loyalty.",
  features: [
    { icon: "palette", title: "Brands and shades", body: "Shades and sizes as variants with a colour swatch, and the brand under every name at the counter." },
    { icon: "calendar-clock", title: "Batch expiry", body: "Batches with expiry dates on each product; the counter sells the earliest expiry first." },
    { icon: "triangle-alert", title: "Expiry desk", body: "What has expired and what expires in 30 or 90 days, with the stock and its cost." },
    { icon: "trending-down", title: "Write-offs with approval", body: "Expired stock is written off through the damage record, approved by a manager, so the loss shows in reports." },
    { icon: "eye", title: "Testers", body: "Opening a lipstick or perfume as a tester takes it out of sellable stock and keeps its cost on record." },
    { icon: "gift", title: "Deals and gift sets", body: "Bundles with their own price, on their own tab at the counter." },
    { icon: "star", title: "Loyalty", body: "Points for regular customers, member levels, and what the programme costs and returns." },
    { icon: "tags", title: "Retail and wholesale price", body: "Two prices on each product for walk-in customers and parlours buying in bulk." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: [
    "apps/web/src/industries/cosmetics/CosmeticsPack.tsx",
    "apps/web/src/industries/cosmetics/pages/CosmeticsProductWizardPage.tsx",
    "apps/web/src/industries/cosmetics/pages/CosmeticsProductsPage.tsx",
    "apps/web/src/industries/cosmetics/pages/CosmeticsExpiryPage.tsx",
    "apps/web/src/industries/cosmetics/pages/CosmeticsTestersPage.tsx",
    "apps/web/src/industries/cosmetics/pos/config.ts",
    "apps/web/src/modules/inventory/damage/pages/DamagePage.tsx",
    "apps/web/src/modules/inventory/combos",
    "apps/web/src/modules/customers/loyalty/pages/LoyaltyPage.tsx",
  ],
  dropped: [
  ],
  heroOverride: {
    heading: "Shades, expiry dates and testers, all accounted for",
    sub: "Keep every lipstick shade and perfume size on its own stock, sell the oldest batch first, see what expires in the next 90 days, and record testers so the shelf and the books agree.",
    badges: ["Shades as variants", "Batch expiry", "Tester records"],
    media: { mediaId: SHOT.dashboard, url: "app.nafaa.pk/cosmetics/dashboard" },
  },
  deepBlocks: [
    steps("A day at the cosmetics shop", [
      ["New stock", "Enter the distributor's bill with each batch and its expiry. A foundation in six shades is one product with six variants, each with its swatch."],
      ["A customer tries a shade", "Open a new tester for the shade that ran out. It leaves sellable stock through the damage record, so its cost is not lost."],
      ["At the counter", "Scan or search by brand. The counter picks the batch that expires first, adds a gift set from the deals tab, and the customer earns loyalty points."],
      ["Weekly check", "Open the expiry desk: put a discount on what expires in 30 days, and send expired stock for a manager to approve as a write-off."],
      ["Closing", "See today's sale and profit, the parlours who owe on khata, and count the galla."],
    ]),
    shot({
      heading: "Running low or close to expiry",
      body: "The low-stock list shows items that are out or low, near-expiry stock, how many days each will last at its recent selling rate, and what to order from which distributor.",
      id: SHOT.lowStock,
      url: "app.nafaa.pk/inventory/low-stock",
      layout: "full",
      caption: "Shared low-stock screen, shown with a demo store's data.",
      callouts: [
        { x: 74, y: 30, label: "Stock expiring in the next 30 days" },
        { x: 61, y: 61, label: "How many days the stock will last" },
        { x: 85, y: 61, label: "Which distributor to order from" },
      ],
    }),
    shot({
      heading: "Which brands and products earn",
      body: "Imported fragrance and local skincare earn very different margins. The profit report shows what each product, category or brand earned after cost.",
      id: SHOT.profitByProduct,
      url: "app.nafaa.pk/reports/profit",
      layout: "split-right",
      caption: "Shared report, shown with a demo store's data.",
      callouts: [
        { x: 35, y: 48.4, label: "By product, category, brand or supplier" },
        { x: 85, y: 58.5, label: "Profit and margin on every product" },
      ],
    }),
    table("Shelf check or Nafaa?", "How the main jobs of a cosmetics shop compare by eye and in Nafaa.", [
      { key: "paper", label: "Shelf check and memory" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Shades", "Counted on the shelf", "Stock per shade, with a swatch"],
      ["Expiry", "Found when a customer complains", "Expiry desk for 30 and 90 days, earliest batch sold first"],
      ["Testers", "Opened and forgotten", "Recorded with their cost"],
      ["Expired stock", "Thrown away, never counted", "Written off with approval, shown as a loss"],
      ["Regular customers", "Known by face", "Loyalty points and member levels"],
    ]),
    prose(`## What to look for in cosmetics shop software

A cosmetics shop sells many small, similar items that differ by shade and size, carry expiry dates and are often opened as testers. Each of those quietly eats into profit if it is not recorded. Before you choose, check that the software can:

- **Keep shades and sizes as variants.** One lipstick in twelve shades should be one product with twelve stock counts, not twelve unrelated items.
- **Track batches and expiry.** And sell the earliest batch first, so stock does not expire at the back of the shelf.
- **Warn before things expire.** A 30 and 90 day view lets you discount in time instead of throwing away.
- **Record testers and write-offs.** Opened testers and expired goods are real costs; they belong in the loss report.
- **Run deals and gift sets.** Eid and wedding season gift boxes need their own price and stock.
- **Reward regular customers.** Loyalty points bring back the buyers who matter most.

Nafaa covers each of these in the cosmetics setup, together with the counter, purchasing, khata and reports every Nafaa shop uses.`),
    pricing("Plans for one shop or several branches"),
  ],
});

/** Internal links: the products a cosmetics shop uses, related trades and terms. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:loyalty', kind: 'TAG' },
    { ref: 'PRODUCT:online-store', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:salon', kind: 'RELATED' },
    { ref: 'INDUSTRY:pharmacy', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:batch-tracking', kind: 'RELATED' },
  ],
} satisfies typeof entry;
