/** Industry: Carpet & Flooring (/industries/carpet). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "carpet",
  title: "Carpet & Flooring",
  shortName: "Carpet",
  shopNoun: "carpet and flooring shops",
  romanUrduName: "Carpet / qaleen ki dukaan",
  group: "specialty",
  icon: "layers",
  color: "#9f1239",
  appIndustryKey: "carpet",
  businessType: "CARPET",
  sortOrder: 8,
  summary:
    "Nafaa handles carpet, flooring and matting shops that sell by the roll: keep each roll's length in stock, cut pieces to size with a length-by-width calculator, price by square foot, keep the leftover cut pieces as stock, and import rolls in bulk from a spreadsheet.",
  builtFor: "Carpet, rug, flooring and matting shops",
  romanUrdu:
    "Carpet aur flooring ki dukaan ke liye: roll ki lambai ka stock, size ke mutabiq kaat, sq ft rate, bache hue tukron ka stock, aur rolls ka bulk import.",
  features: [
    { icon: "layers", title: "Roll stock", body: "Each roll with its remaining length." },
    { icon: "calculator", title: "Length × width", body: "Work out the area and price of a cut piece." },
    { icon: "tag", title: "Square-foot pricing", body: "Price carpets by the square foot." },
    { icon: "boxes", title: "Cut pieces", body: "Leftover pieces stay in stock and can be sold." },
    { icon: "upload", title: "Roll import", body: "Add many rolls at once from a spreadsheet." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/carpet/CarpetPack.tsx"],
  dropped: [
  ],
});
