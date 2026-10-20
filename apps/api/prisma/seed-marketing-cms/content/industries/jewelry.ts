/** Industry: Jewellery & Sonar (/industries/jewelry). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "jewelry",
  title: "Jewellery & Sonar",
  shortName: "Jewellery",
  shopNoun: "jewellery shops",
  romanUrduName: "Sonar / zewar ki dukaan",
  group: "specialty",
  icon: "gem",
  color: "#854d0e",
  appIndustryKey: "jewelry",
  businessType: "JEWELRY",
  featured: true,
  sortOrder: 14,
  summary:
    "Nafaa runs jewellery shops: set today's gold and silver rate, keep each piece with its metal and stones, sell at the counter, take custom orders, buy back old gold, handle repairs, track work given to karigars, and keep metal stock by weight.",
  builtFor: "Jewellers, sonars and gold and silver shops",
  romanUrdu:
    "Sonar ke liye Nafaa: aaj ka rate, har zewar ka metal aur nageena, custom order, purana sona, repair, karigar ka kaam aur metal ka stock.",
  features: [
    { icon: "coins", title: "Today's rate", body: "Set the gold and silver rate for the day." },
    { icon: "gem", title: "Pieces with metal and stones", body: "Each piece with its metal, weight and stones." },
    { icon: "clipboard-list", title: "Custom orders", body: "Take and follow custom orders." },
    { icon: "repeat", title: "Old gold", body: "Buy back or exchange old gold." },
    { icon: "hammer", title: "Karigar work", body: "Track work and metal given to karigars." },
    { icon: "wrench", title: "Repairs", body: "Take in and return repairs." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/jewelry/JewelryPack.tsx"],
  dropped: [
  ],
});
