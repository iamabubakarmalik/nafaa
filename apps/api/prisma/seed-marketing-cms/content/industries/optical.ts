/** Industry: Optical & Eyewear (/industries/optical). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "optical",
  title: "Optical & Eyewear",
  shortName: "Optical",
  shopNoun: "optical shops",
  romanUrduName: "Chashmon ki dukaan",
  group: "health",
  icon: "glasses",
  color: "#155e75",
  colorNote: "App identity #0891b2 is 3.68:1 with white text; seeded #155e75 instead (Phase 1 issue 7); cyan-700 is taken by the Home appliances identity.",
  appIndustryKey: "optical",
  businessType: "OPTICAL",
  sortOrder: 26,
  summary:
    "Nafaa runs optical shops: eye tests and prescriptions with SPH, CYL, axis, ADD and PD, glasses orders with an advance, lab tracking and pickup, repairs, optometrists, and stock of frames and contact lenses, alongside the counter and khata. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Optical shops and eyewear stores",
  romanUrdu:
    "Chashmon ki dukaan ke liye: eye test aur nuskha, advance ke saath chashma order, lab aur pickup, repair, aur frames aur lenses ka stock.",
  features: [
    { icon: "eye", title: "Eye tests", body: "Record eye tests." },
    { icon: "file-text", title: "Prescriptions", body: "SPH, CYL, axis, ADD and PD." },
    { icon: "glasses", title: "Glasses orders", body: "Orders with an advance, through the lab to pickup." },
    { icon: "wrench", title: "Repairs", body: "Take in and return repairs." },
    { icon: "users", title: "Optometrists", body: "Tests by optometrist." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/optical/OpticalPack.tsx"],
  dropped: [
  ],
});
