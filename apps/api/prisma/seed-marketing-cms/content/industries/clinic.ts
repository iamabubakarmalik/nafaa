/** Industry: Clinic & Doctor (/industries/clinic). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "clinic",
  title: "Clinic & Doctor",
  shortName: "Clinic",
  shopNoun: "clinics and doctors",
  romanUrduName: "Clinic",
  group: "health",
  icon: "stethoscope",
  color: "#0f766e",
  colorNote: "App identity #0d9488 is 3.74:1 with white text; seeded #0f766e instead (Phase 1 issue 7).",
  appIndustryKey: "clinic",
  businessType: "CLINIC",
  sortOrder: 17,
  summary:
    "Nafaa runs clinics: reception gives tokens and shows the live line, each visit carries its prescription and lab orders, patient records stay in one place, doctor fees close with the day, and vaccinations are tracked, all in the same app as billing.",
  builtFor: "Clinics, doctors and small medical practices",
  romanUrdu:
    "Clinic ke liye Nafaa: reception par token aur live line, har visit ka nuskha aur lab, mareez ka record, doctor ki fees aur din ka hisaab, aur vaccines.",
  features: [
    { icon: "ticket", title: "Tokens and live line", body: "Reception gives tokens; everyone sees the line." },
    { icon: "file-text", title: "Prescriptions", body: "Each visit's prescription." },
    { icon: "clipboard-list", title: "Lab orders", body: "Lab orders from the visit." },
    { icon: "users", title: "Patient records", body: "Every patient's visits in one place." },
    { icon: "banknote", title: "Doctor fees", body: "Fees by doctor, closed with the day." },
    { icon: "syringe", title: "Vaccinations", body: "Vaccinations and what is due." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/clinic/ClinicPack.tsx"],
  dropped: [
  ],
  needsOwner: ["\"Panels\" screen exists in the clinic pack; describe it only after the owner confirms what it is for."],
});
