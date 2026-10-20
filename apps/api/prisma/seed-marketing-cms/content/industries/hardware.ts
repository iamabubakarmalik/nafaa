/** Industry: Hardware & Building Materials (/industries/hardware). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "hardware",
  title: "Hardware & Building Materials",
  shortName: "Hardware",
  shopNoun: "hardware and building material shops",
  romanUrduName: "Hardware / building material",
  group: "specialty",
  icon: "hammer",
  color: "#57534e",
  appIndustryKey: "hardware",
  businessType: "HARDWARE",
  featured: true,
  sortOrder: 11,
  summary:
    "Nafaa runs hardware and building material shops: items by size and shade, retail, contractor and bulk rates, quotations that turn into bills, delivery challans, contractor sites with their own khata, brands, and reorder rules that flag what to buy before it runs out.",
  builtFor: "Hardware, paint, sanitary and building material shops",
  romanUrdu:
    "Hardware aur building material ke liye: size aur shade, retail, thekedar aur bulk rate, quotation se bill, delivery challan, thekedar ka khata aur reorder.",
  features: [
    { icon: "file-text", title: "Quotations to bills", body: "Send a quotation and turn it into a bill when accepted." },
    { icon: "truck", title: "Delivery challans", body: "Delivery challans for goods sent to a site." },
    { icon: "hand-coins", title: "Contractor khata", body: "A khata for each contractor and site." },
    { icon: "building", title: "Sites and projects", body: "Keep what went to each site or project." },
    { icon: "tags", title: "Three rates", body: "Retail, contractor and bulk rates on the same item." },
    { icon: "package-search", title: "Reorder rules", body: "Set a minimum and see what to buy before it runs out." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/hardware/HardwarePack.tsx"],
  dropped: [
  ],
});
