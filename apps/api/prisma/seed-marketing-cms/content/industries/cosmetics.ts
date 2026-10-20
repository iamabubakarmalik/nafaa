/** Industry: Cosmetics & Beauty Shop (/industries/cosmetics). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
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
    { icon: "tags", title: "Brands and shades", body: "Stock by brand and shade." },
    { icon: "calendar-clock", title: "Expiry", body: "Batch expiry for every item." },
    { icon: "eye", title: "Testers", body: "Keep tester records." },
    { icon: "gift", title: "Deals and gift sets", body: "Combos and gift sets with their own price." },
    { icon: "star", title: "Loyalty", body: "Points for regular customers." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/cosmetics/CosmeticsPack.tsx"],
  dropped: [
  ],
});
