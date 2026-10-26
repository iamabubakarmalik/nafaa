/** Industry: Garments & Boutique (/industries/garments). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "garments",
  title: "Garments & Boutique",
  shortName: "Garments",
  shopNoun: "garment shops and boutiques",
  romanUrduName: "Kapre ki dukaan / boutique",
  group: "retail",
  icon: "shirt",
  color: "#db2777",
  appIndustryKey: "garments",
  businessType: "CLOTHING",
  featured: true,
  sortOrder: 6,
  summary:
    "Nafaa runs garment shops and boutiques that sell ready-made and custom-stitched clothes: stock by size and colour, tailoring (silai) orders, alterations, saved customer measurements, items put on hold, qist plans, exchanges, collections and size charts, alongside the counter, khata and reports.",
  builtFor: "Garment shops, boutiques and tailors",
  romanUrdu:
    "Garments aur boutique ke liye: size aur rang ke hisaab se stock, silai order, alteration, gahak ka naap, hold, qist plan, exchange aur size chart.",
  features: [
    { icon: "shirt", title: "Size and colour", body: "A size × colour grid makes every variant with its own barcode; empty sizes show in red." },
    { icon: "scissors", title: "Silai orders", body: "Stitching orders with the customer's naap, karigar, design pictures, trial date and advance." },
    { icon: "clipboard-list", title: "Measurements", body: "Save each customer's measurements, several per customer, and reuse them on the next order." },
    { icon: "wrench", title: "Alterations", body: "Fitting jobs for clothes bought here or elsewhere, with a token, due date and WhatsApp update." },
    { icon: "repeat", title: "Exchanges", body: "Pieces from an earlier bill pay toward new ones, so only the difference changes hands." },
    { icon: "tag", title: "Hold and qist", body: "Hold a piece for a customer with a deposit, or sell it on a qist plan paid over weeks or months." },
    { icon: "layers", title: "Collections and Sale", body: "Group stock into Summer Lawn, Eid or Winter, and put a percent Sale on a whole collection." },
    { icon: "table", title: "Size charts", body: "Chest, length and waist tables per garment type, ready to show a customer." },
  ],
  faqKeys: ["garments-variants","garments-measurements","garments-layaway","pricing"],
  evidence: [
    "apps/web/src/industries/garments/GarmentsPack.tsx",
    "apps/web/src/industries/garments/components/MeasurementModal.tsx",
    "apps/web/src/industries/garments/pages/GarmentProductWizardPage.tsx",
    "apps/web/src/industries/garments/pages/GarmentProductsPage.tsx",
    "apps/web/src/industries/garments/pages/NewTailoringOrderPage.tsx",
    "apps/web/src/industries/garments/pages/TailoringPage.tsx",
    "apps/web/src/industries/garments/pages/AlterationsPage.tsx",
    "apps/web/src/industries/garments/pages/MeasurementsPage.tsx",
    "apps/web/src/industries/garments/pages/ExchangePage.tsx",
    "apps/web/src/industries/garments/pages/ReservationsPage.tsx",
    "apps/web/src/industries/garments/pages/LayawayPage.tsx",
    "apps/web/src/industries/garments/pages/CollectionsPage.tsx",
    "apps/web/src/industries/garments/pages/SizeChartsPage.tsx",
    "apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx",
  ],
  dropped: [
    "Automatic reminders on layaway plans (not checked).",
    "\"Unlimited\" variants wording.",
  ],
  heroOverride: {
    heading: "Ready-made stock and silai orders in one app",
    sub: "Keep every size and colour on its own barcode, take stitching orders with the customer's naap and an advance, follow each suit from karigar to trial to delivery, and run Eid and season sales without a calculator.",
    badges: ["Size × colour stock", "Silai with naap", "Qist and hold"],
    media: { mediaId: SHOT.garmentsProducts, url: "app.nafaa.pk/garments/products" },
  },
  deepBlocks: [
    steps("A day at the boutique", [
      ["Opening", "Check the stitching orders due today and those at trial, and the size reorder list for sizes and colours running out in this branch."],
      ["A walk-in customer", "Scan the piece. If her size is out, the product shows which other branch has it, and stock can be sent across."],
      ["A silai order", "Pick the customer's saved naap, add each suit with whose fabric it is and the stitching rate, set the karigar and the promised day, and take the advance."],
      ["After Eid", "A customer brings back a kurta in the wrong size. Open the old bill, take it back, add the new size, and settle only the difference."],
      ["Closing", "See money still to collect on silai, alterations and qist plans, and count the galla."],
    ]),
    shot({
      heading: "Every branch's stock in one place",
      body: "Boutiques with more than one outlet see sale, stock and expenses side by side, and move pieces between branches by size and colour, so a customer is not turned away for a size that sits in the other shop.",
      id: SHOT.branches,
      url: "app.nafaa.pk/branches",
      layout: "full",
      caption: "Shared branches screen, shown with a demo store's data.",
      callouts: [
        { x: 34.5, y: 19.5, label: "Sale, profit and average bill" },
        { x: 57, y: 31, label: "Expenses and returns per branch" },
        { x: 35.6, y: 75, label: "Branches compared side by side" },
      ],
    }),
    shot({
      heading: "Which pieces earn after cost",
      body: "Sale prices hide the real story. The profit report shows what each article earned after its cost, so you know which designs to reorder and which to put in the next Sale.",
      id: SHOT.garmentsProfit,
      url: "app.nafaa.pk/profit-report",
      layout: "split-right",
      callouts: [
        { x: 32.5, y: 48.3, label: "By product, category, brand or supplier" },
        { x: 84.5, y: 58.4, label: "Profit and margin on every article" },
      ],
    }),
    table("Order book or Nafaa?", "How the main jobs of a garment shop compare in an order book and in Nafaa.", [
      { key: "paper", label: "Order book and slips" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Customer measurements", "In a notebook, taken again each time", "Saved per customer, reused on every order"],
      ["Silai progress", "Asked of the karigar over the phone", "Each order's step: karigar, trial, ready, delivered"],
      ["Sizes", "Counted on the rack", "Stock per size and colour, with empty sizes in red"],
      ["Exchanges", "A new bill and an argument about the difference", "Old pieces pay toward new ones on one screen"],
      ["Season sale", "Prices cut by hand on each tag", "A percent off a whole collection in one step"],
    ]),
    prose(`## What to look for in garment shop software

Clothes are sold in sizes and colours, change with every season, and in Pakistan a large share of the business is still stitched to order. Software made for a grocery counter treats a kurta in five sizes as five unrelated products. Before you choose, check that it can:

- **Keep stock by size and colour.** One article, many variants, each with its own barcode and its own count.
- **Take stitching orders properly.** The customer's naap, whose fabric it is, the rate, the karigar, trial and delivery dates, and the advance, in one record.
- **Remember measurements.** A regular customer should never be measured twice for the same kameez.
- **Handle exchanges, holds and qist.** These are daily events in a boutique, especially around Eid and wedding season.
- **Run season collections.** Summer lawn, Eid and winter stock should be easy to group, report on and put on Sale.
- **Show stock across branches** if you have more than one outlet.

Nafaa covers each of these in the garments setup, together with the counter, khata, purchasing and reports every Nafaa shop uses.`),
    pricing("Plans for one boutique or several outlets"),
  ],
});

/** Internal links: the products a garment shop uses, related trades and terms. */
export default {
  ...entry,
  seoDescription: 'Software for garment shops and boutiques: stock by size and colour, silai and alteration orders, saved measurements, items on hold, qist plans and exchanges.',
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:multi-shop', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:online-store', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'INDUSTRY:shoe', kind: 'RELATED' },
    { ref: 'INDUSTRY:cosmetics', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:layaway', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sku', kind: 'RELATED' },
    { ref: 'BLOG_POST:garment-shop-seasonal-stock-planning', kind: 'RELATED' },
  ],
} satisfies typeof entry;
