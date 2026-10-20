/** Industry: Meat & Butcher Shop (/industries/meat). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "meat",
  title: "Meat & Butcher Shop",
  shortName: "Meat",
  shopNoun: "meat and butcher shops",
  romanUrduName: "Gosht ki dukaan",
  group: "food",
  icon: "beef",
  color: "#991b1b",
  appIndustryKey: "meat",
  businessType: "MEAT",
  sortOrder: 12,
  summary:
    "Nafaa runs meat and butcher shops: set today's rate, take orders by weight, keep live animals bought from the mandi, record halal slaughter and cutting, supply restaurants and hotels on account, and handle Qurbani and Aqeeqa orders, alongside the counter, stock and khata.",
  builtFor: "Butchers, meat shops and meat suppliers",
  romanUrdu:
    "Gosht ki dukaan ke liye: aaj ka rate, wazan wale order, mandi se zinda maal, halal zibah aur cutting, restaurant aur hotel ko supply, aur Qurbani aur Aqeeqa ke order.",
  features: [
    { icon: "tag", title: "Today's rate", body: "Set the day's rate once and the counter uses it." },
    { icon: "calculator", title: "Orders by weight", body: "Take and bill orders by weight." },
    { icon: "beef", title: "Live animals", body: "Animals bought from the mandi, kept until slaughter." },
    { icon: "shield-check", title: "Halal slaughter and cutting", body: "Record each slaughter and cutting job." },
    { icon: "building-2", title: "Restaurant supply", body: "Supply restaurants and hotels on account." },
    { icon: "calendar", title: "Qurbani and Aqeeqa", body: "Qurbani and Aqeeqa orders, when the shop turns them on." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/meat/MeatPack.tsx"],
  dropped: [
    "\"Halal certification\" wording (the app records halal slaughter; it does not certify).",
  ],
});
