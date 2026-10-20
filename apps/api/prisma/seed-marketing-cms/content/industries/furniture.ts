/** Industry: Furniture Shop (/industries/furniture). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "furniture",
  title: "Furniture Shop",
  shortName: "Furniture",
  shopNoun: "furniture showrooms and workshops",
  romanUrduName: "Furniture ki dukaan",
  group: "specialty",
  icon: "armchair",
  color: "#78350f",
  appIndustryKey: "furniture",
  businessType: "FURNITURE",
  sortOrder: 24,
  summary:
    "Nafaa runs furniture showrooms with their own workshops: custom orders against a deposit, karigar workload, and large deliveries with assembly, together with ready stock at the showroom counter, a khata for customers who pay in parts, and reports. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Furniture showrooms and workshops",
  romanUrdu:
    "Furniture ke liye: deposit ke saath custom order, karigar ka kaam, badi delivery aur assembly, aur showroom ka stock.",
  features: [
    { icon: "clipboard-list", title: "Custom orders", body: "Orders against a deposit." },
    { icon: "hammer", title: "Karigar workload", body: "What each karigar is working on." },
    { icon: "truck", title: "Deliveries", body: "Large deliveries with assembly." },
    { icon: "armchair", title: "Showroom stock", body: "Ready pieces sold at the counter." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/furniture/FurniturePack.tsx"],
  dropped: [
  ],
});
