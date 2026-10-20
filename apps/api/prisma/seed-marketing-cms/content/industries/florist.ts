/** Industry: Florist & Flower Shop (/industries/florist). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "florist",
  title: "Florist & Flower Shop",
  shortName: "Florist",
  shopNoun: "florists and flower shops",
  romanUrduName: "Phoolon ki dukaan",
  group: "lifestyle",
  icon: "flower-2",
  color: "#e11d48",
  appIndustryKey: "florist",
  businessType: "FLORIST",
  sortOrder: 23,
  summary:
    "Nafaa runs florists and flower shops: bouquet and occasion orders, today's delivery list, wedding decoration contracts, regular flower subscriptions, and freshness tracking so ageing stock is sold or written off in time, with the counter and khata built in. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Florists, flower shops and event decorators",
  romanUrdu:
    "Phoolon ki dukaan ke liye: bouquet aur mauqe ke order, aaj ki delivery, shaadi ke contract, subscriptions, aur phoolon ki freshness.",
  features: [
    { icon: "flower-2", title: "Orders", body: "Bouquet and occasion orders." },
    { icon: "truck", title: "Today's deliveries", body: "Everything to deliver today in one list." },
    { icon: "handshake", title: "Wedding contracts", body: "Shaadi decoration contracts." },
    { icon: "repeat", title: "Subscriptions", body: "Regular flower deliveries." },
    { icon: "clock", title: "Freshness", body: "See ageing stock in time." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/florist/FloristPack.tsx"],
  dropped: [
  ],
});
