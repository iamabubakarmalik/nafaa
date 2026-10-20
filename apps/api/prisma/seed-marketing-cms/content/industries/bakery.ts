/** Industry: Bakery & Sweets (/industries/bakery). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "bakery",
  title: "Bakery & Sweets",
  shortName: "Bakery",
  shopNoun: "bakeries and sweet shops",
  romanUrduName: "Bakery / mithai ki dukaan",
  group: "food",
  icon: "cake-slice",
  color: "#be185d",
  appIndustryKey: "bakery",
  businessType: "BAKERY",
  featured: true,
  sortOrder: 2,
  summary:
    "Nafaa runs bakeries and sweet shops: take custom cake orders with an advance, plan the day's baking, keep raw materials with their cost, see each recipe's live cost, track freshness and waste, and manage wedding and event bulk orders, alongside the normal counter, stock and khata.",
  builtFor: "Bakeries, cake shops and sweet (mithai) shops",
  romanUrdu:
    "Bakery ke liye Nafaa: cake order advance ke saath, roz ki baking ka plan, raw material aur recipe ki cost, freshness aur waste ka hisaab, aur shaadi ya event ke bulk order.",
  features: [
    { icon: "cake-slice", title: "Custom cake orders", body: "Size, flavour, message and delivery date on one order, with the advance recorded." },
    { icon: "calendar", title: "Daily baking", body: "Plan and record each day's baking batches." },
    { icon: "boxes", title: "Raw materials", body: "Ingredients are kept apart from products, with stock and cost per unit." },
    { icon: "calculator", title: "Recipe cost", body: "Add a recipe to a product and see its cost follow ingredient prices." },
    { icon: "clock", title: "Freshness and waste", body: "See items near the end of their shelf life and record what was wasted." },
    { icon: "users", title: "Bulk orders", body: "Wedding and event orders with an advance, and a warning when a confirmed order has no advance yet." },
  ],
  faqKeys: ["bakery-bulk","bakery-costing","offline","pricing"],
  evidence: ["apps/web/src/industries/bakery/BakeryPack.tsx","apps/web/src/industries/bakery/products/BakeryProductEditor.tsx","apps/web/src/industries/bakery/products/BakeryRawMaterials.tsx","apps/web/src/industries/bakery/components/bulk/BulkViews.tsx"],
  dropped: [
    "Foodpanda sync and \"Foodpanda integration included\".",
    "Photo cake print preview (not found in the app).",
    "\"Pakistan's most complete bakery platform\" claim.",
    "Key metrics (+42% revenue, -65% waste, 3 hours saved): no source.",
    "Production planning \"from historical sales\" (not checked).",
    "Testimonial t1 (no recorded consent).",
  ],
  needsOwner: ["Online orders (Foodpanda): apps/api/src/integrations/online-orders has Foodpanda code; confirm it is live before marketing it."],
});
