/** Industry: Electronics & Gadgets (/industries/electronics). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "electronics",
  title: "Electronics & Gadgets",
  shortName: "Electronics",
  shopNoun: "electronics and gadget shops",
  romanUrduName: "Electronics ki dukaan",
  group: "retail",
  icon: "plug",
  color: "#2563eb",
  appIndustryKey: "electronics",
  businessType: "ELECTRONICS",
  sortOrder: 22,
  summary:
    "Nafaa runs electronics and gadget shops: serial and IMEI tracking, warranty claims, brands, technical specs on products, bundles, and condition grading for used or open-box items, together with the counter, stock and khata used by every Nafaa shop. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Electronics, gadget and accessory shops",
  romanUrdu:
    "Electronics ki dukaan ke liye: serial aur IMEI, warranty claim, brands, specs, bundles, aur condition grading.",
  features: [
    { icon: "barcode", title: "Serial and IMEI", body: "Track each unit by serial or IMEI." },
    { icon: "shield-check", title: "Warranty claims", body: "Record and follow warranty claims." },
    { icon: "package", title: "Bundles", body: "Sell items together as a bundle." },
    { icon: "cpu", title: "Specs", body: "Technical specs on each product." },
    { icon: "tags", title: "Brands", body: "Stock by brand." },
    { icon: "circle-check", title: "Condition grading", body: "Grade used or open-box items." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/electronics/ElectronicsPack.tsx"],
  dropped: [
  ],
});
