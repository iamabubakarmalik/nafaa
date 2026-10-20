/** Industry: Agri & Feed Store (/industries/agri). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "agri",
  title: "Agri & Feed Store",
  shortName: "Agri",
  shopNoun: "agri, seed and feed stores",
  romanUrduName: "Beej, khaad aur feed ki dukaan",
  group: "specialty",
  icon: "wheat",
  color: "#4d7c0f",
  appIndustryKey: "agri",
  businessType: "AGRI",
  sortOrder: 19,
  summary:
    "Nafaa runs agri stores that sell seeds, fertiliser, pesticides and animal feed: keep farmer accounts with credit, take bulk orders, record crop advisories, plan stock by season, and track government subsidy claims, alongside the counter, stock and khata. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Seed, fertiliser, pesticide and feed stores",
  romanUrdu:
    "Agri store ke liye: kisanon ka khata, bulk order, fasal ki salah, season ka plan, aur government subsidy ke claims.",
  features: [
    { icon: "users", title: "Farmers", body: "Each farmer's account and credit." },
    { icon: "boxes", title: "Bulk orders", body: "Large orders by season." },
    { icon: "sprout", title: "Crop advisory", body: "Record advice given for crops." },
    { icon: "calendar", title: "Seasonal plans", body: "Plan stock for each season." },
    { icon: "landmark", title: "Subsidy claims", body: "Track government subsidy claims." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/agri/AgriPack.tsx"],
  dropped: [
  ],
});
