/** Industry: Pet Shop & Vet Store (/industries/petshop). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "petshop",
  title: "Pet Shop & Vet Store",
  shortName: "Pet shop",
  shopNoun: "pet shops and vet stores",
  romanUrduName: "Pet shop",
  group: "lifestyle",
  icon: "paw-print",
  color: "#b45309",
  appIndustryKey: "petshop",
  businessType: "PETSHOP",
  sortOrder: 27,
  summary:
    "Nafaa runs pet shops and vet stores: pet food, accessories, aquarium items and vet medicine at the counter, live animals with health records, and grooming appointments with groomers, with the stock, khata and reports that every Nafaa shop uses. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Pet shops, aquarium shops and vet stores",
  romanUrdu:
    "Pet shop ke liye: khana, accessories, aquarium aur dawaiyan, zinda janwar aur unki sehat ka record, aur grooming.",
  features: [
    { icon: "paw-print", title: "Live animals", body: "Animals with health records." },
    { icon: "scissors", title: "Grooming", body: "Grooming appointments." },
    { icon: "users", title: "Groomers", body: "Who grooms what." },
    { icon: "package", title: "Food and accessories", body: "Pet food, accessories and vet medicine at the counter." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/petshop/PetshopPack.tsx"],
  dropped: [
  ],
});
