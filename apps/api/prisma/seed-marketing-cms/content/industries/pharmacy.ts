/** Industry: Pharmacy & Medical Store (/industries/pharmacy). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "pharmacy",
  title: "Pharmacy & Medical Store",
  shortName: "Pharmacy",
  shopNoun: "pharmacies and medical stores",
  romanUrduName: "Pharmacy / medical store",
  group: "health",
  icon: "pill",
  color: "#166534",
  colorNote: "App identity #16a34a is 3.30:1 with white text; seeded #166534 instead (Phase 1 issue 7); green-700 is taken by the Sports identity.",
  appIndustryKey: "pharmacy",
  businessType: "PHARMACY",
  featured: true,
  sortOrder: 4,
  summary:
    "Nafaa is software for pharmacies and medical stores in Pakistan: search medicines by salt or formula and find substitutes, track batches and expiry, keep prescriptions and doctors, record controlled and narcotic sales in a register with patient and doctor details, and log fridge temperatures for the cold chain.",
  builtFor: "Pharmacies, medical stores and chemists",
  romanUrdu:
    "Pharmacy ke liye Nafaa: salt ya formula se dawa dhoondein aur substitute dekhein, batch aur expiry ka hisaab, nuskhe aur doctors, narcotic register me mareez aur doctor ki tafseel, aur fridge ka temperature log.",
  features: [
    { icon: "search", title: "Salt and formula search", body: "Find a medicine by brand or salt and see other brands with the same salt." },
    { icon: "calendar-clock", title: "Batch and expiry", body: "Stock by batch with expiry dates; items inside 30 and 90 days are flagged." },
    { icon: "file-text", title: "Prescriptions", body: "Record, check and dispense prescriptions, in full or in part." },
    { icon: "stethoscope", title: "Doctors", body: "Keep the doctors whose prescriptions you fill." },
    { icon: "shield-check", title: "Narcotic register", body: "Controlled, narcotic and psychotropic sales go into a register with the patient and doctor." },
    { icon: "refrigerator", title: "Cold chain log", body: "Record fridge temperatures for medicines kept at 2-8°C." },
  ],
  faqKeys: ["pharmacy-salt","pharmacy-expiry","pharmacy-register","offline","pricing"],
  evidence: ["apps/web/src/industries/pharmacy/PharmacyPack.tsx","apps/web/src/industries/pharmacy/lib/meta.ts","apps/web/src/industries/pharmacy/pages/ExpiringPage.tsx","apps/web/src/industries/pharmacy/api/substitutes.api.ts"],
  dropped: [
    "\"DRAP-compliant\", \"fully DRAP compliant\" and \"always inspection-ready\" (no DRAP approval on record).",
    "\"Pakistan's most trusted pharmacy platform\" claim.",
    "Doctor commission management (not found in the pharmacy pack).",
    "Alerts at 30, 60 and 90 days (the app flags 30 and 90 day windows).",
  ],
  needsOwner: ["Any DRAP claim needs a written official source (compliance writer W6)."],
});
