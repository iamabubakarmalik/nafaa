/** Industry: Toy Store (/industries/toystore). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "toystore",
  title: "Toy Store",
  shortName: "Toys",
  shopNoun: "toy stores",
  romanUrduName: "Khilonon ki dukaan",
  group: "lifestyle",
  icon: "toy-brick",
  color: "#9333ea",
  appIndustryKey: "toystore",
  businessType: "TOYSTORE",
  sortOrder: 31,
  summary:
    "Nafaa runs toy stores: filter toys by age, review safety certification, build gift packs, help parents with a gift finder, and keep children's birthdays for reminders, while the counter, stock and khata work the same as in every Nafaa shop.",
  builtFor: "Toy stores and gift shops",
  romanUrdu:
    "Khilonon ki dukaan ke liye: umar ke hisaab se khilone, safety review, gift packs, gift finder aur bachon ki saalgirah.",
  features: [
    { icon: "baby", title: "Age groups", body: "Filter toys by age." },
    { icon: "shield-check", title: "Safety review", body: "Review safety certification." },
    { icon: "gift", title: "Gift packs", body: "Build gift packs." },
    { icon: "search", title: "Gift finder", body: "Help parents pick a gift." },
    { icon: "calendar", title: "Birthdays", body: "Keep children's birthdays." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/toystore/ToystorePack.tsx"],
  dropped: [
  ],
});
