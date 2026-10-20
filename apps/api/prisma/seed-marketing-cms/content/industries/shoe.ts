/** Industry: Shoe & Footwear Store (/industries/shoe). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
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
    { icon: "footprints", title: "Size and colour", body: "Every pair with its own barcode." },
    { icon: "repeat", title: "Exchanges", body: "Exchange pairs at the counter." },
    { icon: "list-checks", title: "Size requests", body: "Sizes customers asked for that were out of stock." },
    { icon: "table", title: "Size charts", body: "Size charts by brand." },
    { icon: "tags", title: "Brands and seasons", body: "Stock by brand and season." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/shoe/ShoePack.tsx"],
  dropped: [
    "Multi-region (UK/US/EU) size chart claim (not checked).",
  ],
});
