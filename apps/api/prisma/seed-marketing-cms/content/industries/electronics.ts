/** Industry: Electronics & Gadgets (/industries/electronics). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "electronics",
  title: "Electronics & Gadgets",
  shortName: "Electronics",
  shopNoun: "electronics and gadget shops",
  romanUrduName: "Electronics ki dukaan",
  group: "retail",
  icon: "plug",
  color: "#2563eb",
  appIndustryKey: "electronics",
  businessType: "ELECTRONICS",
  sortOrder: 22,
  summary:
    "Nafaa runs electronics and gadget shops: serial and IMEI tracking, warranty claims, brands, technical specs on products, bundles, and condition grading for used or open-box items, together with the counter, stock and khata used by every Nafaa shop. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Electronics, gadget and accessory shops",
  romanUrdu:
    "Electronics ki dukaan ke liye: serial aur IMEI, warranty claim, brands, specs, bundles, aur condition grading.",
  features: [
    { icon: "barcode", title: "Serial and IMEI", body: "Every costly unit has its own row: purchase bill and cost, who bought it, on which bill, and its warranty." },
    { icon: "scan-barcode", title: "Sell the exact unit", body: "Scan a serial or IMEI at the counter and that unit goes on the bill." },
    { icon: "search", title: "Warranty check", body: "Answer \"is this still under warranty?\" at the counter from the serial number." },
    { icon: "shield-check", title: "Warranty claims", body: "Open a claim from the serial, send it to repair or the company, and close it as repaired, replaced, refunded or rejected." },
    { icon: "package", title: "Bundles", body: "TV with soundbar, laptop with bag and mouse: a deal price with the saving and profit worked out live." },
    { icon: "cpu", title: "Specs and box contents", body: "Specs that fit the product type, warranty terms and what comes in the box." },
    { icon: "circle-check", title: "Condition grading", body: "Brand new, open box, refurbished, used, damaged or for parts." },
    { icon: "arrow-left-right", title: "Trade-in", body: "Buy a customer's used unit against a new purchase; it enters stock at the price paid." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: [
    "apps/web/src/industries/electronics/ElectronicsPack.tsx",
    "apps/web/src/industries/electronics/pages/SerialTrackingPage.tsx",
    "apps/web/src/industries/electronics/pos/config.ts",
    "apps/web/src/industries/electronics/pages/WarrantyClaimsPage.tsx",
    "apps/web/src/industries/electronics/pages/ElectronicsBundlesPage.tsx",
    "apps/web/src/industries/electronics/pages/BundleFormPage.tsx",
    "apps/web/src/industries/electronics/pages/ElectronicsPurchasesPage.tsx",
    "apps/web/src/industries/electronics/products/ElectronicsProductEditor.tsx",
    "apps/web/src/industries/electronics/constants.ts",
    "apps/web/src/industries/electronics/components/TradeInModal.tsx",
  ],
  dropped: [
  ],
  heroOverride: {
    heading: "Every serial number, every warranty, every bundle",
    sub: "Keep TVs, laptops and appliances by serial or IMEI from the supplier's bill to the customer's, answer warranty questions in seconds, run claims to the company, and sell bundles with the profit worked out.",
    badges: ["Serial and IMEI", "Warranty claims", "Bundles"],
    media: { mediaId: SHOT.electronicsSerials, url: "app.nafaa.pk/electronics/serials" },
  },
  deepBlocks: [
    steps("A day at the electronics shop", [
      ["Stock arrives", "Enter the supplier's bill. Serial products are marked on the bill and each unit's serial is scanned or pasted against it."],
      ["A customer buys a TV", "Scan the serial on the box; that unit goes on the bill with its warranty. Offer the TV and soundbar bundle and see the saving at once."],
      ["A trade-in", "The customer's old LED is bought at an agreed price. It enters stock as a used unit and the cash leaves the drawer."],
      ["A faulty laptop comes back", "Search its serial: sold here, three months ago, under warranty. Open a claim and send it to the company."],
      ["Closing", "Check claims open for more than a week (they turn red) and units whose warranty ends in 30 days, then count the galla."],
    ]),
    shot({
      heading: "Warranty claims from the serial number",
      body: "When a speaker or a smartwatch comes back, search its serial number to find the bill and the warranty left, and open a claim. Each claim shows whether it is new, in repair or with the brand, and is closed with a repair, a replacement or a refund.",
      id: SHOT.electronicsClaims,
      url: "app.nafaa.pk/electronics/warranty-claims",
      layout: "full",
      callouts: [
        { x: 20, y: 19.5, label: "Claims still open" },
        { x: 37.5, y: 30.6, label: "Units in repair" },
        { x: 40.6, y: 56.5, label: "Claim tied to the customer and serial" },
        { x: 91.9, y: 55.3, label: "Close it: repair, replace or refund" },
      ],
    }),
    shot({
      heading: "Bundles that sell more than one item",
      body: "Put a router, mouse and keyboard together at one price. Each bundle shows its price against the full price, the saving for the customer, your profit on it, the stock of every item and how many bundles that stock can make. Bundles show on the counter as one tap.",
      id: SHOT.electronicsBundles,
      url: "app.nafaa.pk/electronics/bundles",
      layout: "split-right",
      callouts: [
        { x: 39.5, y: 53.8, label: "Bundle price against the full price" },
        { x: 41.8, y: 58.4, label: "Stock of each item" },
        { x: 31, y: 68, label: "Saving, profit and how many you can make" },
      ],
    }),
    table("Warranty cards or Nafaa?", "How the main jobs of an electronics shop compare on paper and in Nafaa.", [
      { key: "paper", label: "Warranty cards and a register" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Which unit was sold", "Model on the bill, serial rarely", "Serial or IMEI on every bill"],
      ["Warranty question", "Find the customer's card, if they kept it", "Search the serial at the counter"],
      ["Claims to the company", "A list on the wall", "Each claim's stage, with old claims in red"],
      ["Bundles", "Price agreed at the counter, profit unknown", "Deal price with saving and profit shown"],
      ["Used and open-box", "Mixed in with new stock", "Graded by condition on each product"],
    ]),
    prose(`## What to look for in electronics shop software

Electronics are high-value items with serial numbers, warranties and small margins. One wrong unit sold or one lost warranty claim can wipe out a week's profit. Before you choose, check that the software can:

- **Track units, not just quantities.** Every TV, laptop and camera by its serial or IMEI, from purchase to sale.
- **Answer warranty questions quickly.** The serial should tell you when and to whom it was sold and how long the warranty runs.
- **Run warranty claims.** From the customer's complaint to the company's answer, with costs and replacements recorded.
- **Sell bundles honestly.** A deal price is only good if you can see what it does to your profit.
- **Separate new, open-box and used stock.** Condition affects price and what you promise the customer.
- **Hold specs on the product.** Customers compare RAM, screen size and wattage; staff should not have to guess.

Nafaa covers each of these in the electronics setup, alongside the counter, purchasing, khata and reports every Nafaa shop uses. Mobile phone shops have their own setup with PTA status, repairs and qist plans.`),
    pricing("Plans for one shop or several branches"),
  ],
});

/** Internal links: the products an electronics shop uses, related trades and terms. */
export default {
  ...entry,
  seoDescription: 'Software for electronics and gadget shops: serial and IMEI tracking, warranty claims, product specs, bundles and condition grades for used or open-box items.',
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:mobile-shop', kind: 'RELATED' },
    { ref: 'INDUSTRY:appliances', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:imei', kind: 'RELATED' },
  ],
} satisfies typeof entry;
