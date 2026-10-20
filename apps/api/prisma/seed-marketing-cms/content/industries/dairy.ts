/** Industry: Dairy & Milk Shop (/industries/dairy). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "dairy",
  title: "Dairy & Milk Shop",
  shortName: "Dairy",
  shopNoun: "dairy and milk shops",
  romanUrduName: "Doodh ki dukaan",
  group: "food",
  icon: "milk",
  color: "#075985",
  colorNote: "App identity #0284c7 is 4.10:1 with white text; seeded #075985 instead (Phase 1 issue 7); sky-700 is taken by the Services identity.",
  appIndustryKey: "dairy",
  businessType: "DAIRY",
  sortOrder: 13,
  summary:
    "Nafaa runs dairy and milk shops: record milk bought from gawalas, deliver to homes on routes, send a monthly bill to each delivery customer, make dahi and makhan and record spoiled stock, run quality tests, and sell loose milk at the counter.",
  builtFor: "Dairy shops, milk shops and home milk delivery",
  romanUrdu:
    "Doodh ki dukaan ke liye: gawalon se doodh ki entry, routes par ghar delivery, mahine ka bill, dahi aur makhan, kharab maal ka hisaab, aur counter par khula doodh.",
  features: [
    { icon: "milk", title: "Milk from gawalas", body: "Record each gawala's milk and what you owe." },
    { icon: "truck", title: "Home delivery routes", body: "Daily deliveries by route." },
    { icon: "receipt", title: "Monthly bills", body: "One bill a month for each delivery customer." },
    { icon: "factory", title: "Dahi and makhan", body: "Record what you make and what spoils." },
    { icon: "clipboard-check", title: "Quality tests", body: "Record milk quality tests." },
    { icon: "shopping-basket", title: "Counter sales", body: "Sell loose milk and dairy items at the counter." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/dairy/DairyPack.tsx"],
  dropped: [
  ],
});
