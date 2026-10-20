/** Industry: Gaming Shop & Cyber Cafe (/industries/gaming). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "gaming",
  title: "Gaming Shop & Cyber Cafe",
  shortName: "Gaming",
  shopNoun: "gaming shops and cyber cafes",
  romanUrduName: "Gaming zone / cyber cafe",
  group: "lifestyle",
  icon: "gamepad-2",
  color: "#7c3aed",
  appIndustryKey: "gaming",
  businessType: "GAMING",
  sortOrder: 25,
  summary:
    "Nafaa runs gaming shops and cyber cafes: live billing for PC and console stations, console rentals, PSN, Xbox and PUBG top-ups, tournaments, and sales of consoles, games and PC parts at the counter, with stock and khata in the same app.",
  builtFor: "Gaming shops, gaming zones and cyber cafes",
  romanUrdu:
    "Gaming zone aur cyber cafe ke liye: stations ki live billing, console rental, top-ups, tournaments, aur consoles aur games ki sale.",
  features: [
    { icon: "timer", title: "Cafe live", body: "Live billing per station." },
    { icon: "monitor", title: "Stations", body: "PC and console stations." },
    { icon: "repeat", title: "Rentals", body: "Console rentals." },
    { icon: "credit-card", title: "Digital top-ups", body: "PSN, Xbox and PUBG top-ups." },
    { icon: "trophy", title: "Tournaments", body: "Run tournaments and entries." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/gaming/GamingPack.tsx"],
  dropped: [
  ],
});
