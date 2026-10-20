/** Industry: Sports Goods Shop (/industries/sports). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "sports",
  title: "Sports Goods Shop",
  shortName: "Sports",
  shopNoun: "sports goods shops",
  romanUrduName: "Sports ka saman",
  group: "lifestyle",
  icon: "trophy",
  color: "#15803d",
  appIndustryKey: "sports",
  businessType: "SPORTS",
  sortOrder: 30,
  summary:
    "Nafaa runs sports goods shops that sell cricket, football and gym equipment: team orders with printing and an advance, bat and racket repairs, and brand records, alongside the counter, stock, khata and reports that every Nafaa shop uses. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Sports goods shops",
  romanUrdu:
    "Sports ki dukaan ke liye: cricket, football aur gym ka saman, printing aur advance ke saath team order, aur bat aur racket ki repair.",
  features: [
    { icon: "users", title: "Team orders", body: "Team orders with printing and an advance." },
    { icon: "wrench", title: "Repairs", body: "Bat and racket repairs." },
    { icon: "tags", title: "Brands", body: "Stock by brand." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/sports/SportsPack.tsx"],
  dropped: [
    "\"Sialkot exports\" feature (not in the app).",
    "Jersey name and number customisation (not checked).",
  ],
});
