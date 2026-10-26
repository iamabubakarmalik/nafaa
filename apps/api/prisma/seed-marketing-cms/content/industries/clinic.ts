/** Industry: Clinic & Doctor (/industries/clinic). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
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
    { icon: "ticket", title: "Reception and tokens", body: "Find or register the patient, pick the doctor and give a token; the fee can be taken at once." },
    { icon: "monitor", title: "Live line and waiting screen", body: "Waiting, with the doctor and done, emergencies on top; a large-type screen shows each doctor's current token." },
    { icon: "heart-pulse", title: "Visits", body: "Vitals, notes, diagnosis and follow-up date on each visit, with the patient's earlier visits beside it." },
    { icon: "file-text", title: "Prescriptions", body: "Written at the visit, reprinted on A4, and marked as given when medicine leaves the clinic counter." },
    { icon: "clipboard-list", title: "Lab orders", body: "Take the fee, mark the sample, enter results and print the report; walk-in lab patients need no visit." },
    { icon: "users", title: "Patient records", body: "Search by name, phone, MR number or CNIC; allergies, blood group, vitals trend and every visit in one record." },
    { icon: "banknote", title: "Doctor fees and day close", body: "First visit, follow-up and emergency fees per doctor, the doctor's share, and a day close per doctor." },
    { icon: "syringe", title: "Vaccinations", body: "Add a child's full Pakistan EPI schedule from the birth date; see overdue and due-this-week doses." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: [
    "apps/web/src/industries/clinic/ClinicPack.tsx",
    "apps/web/src/industries/clinic/pages/ClinicNewAppointmentPage.tsx",
    "apps/web/src/industries/clinic/pages/QueuePage.tsx",
    "apps/web/src/industries/clinic/pages/ClinicAppointmentDetailPage.tsx",
    "apps/web/src/industries/clinic/pages/ClinicAppointmentsPage.tsx",
    "apps/web/src/industries/clinic/pages/ClinicPrescriptionsPage.tsx",
    "apps/web/src/industries/clinic/pages/LabOrdersPage.tsx",
    "apps/web/src/industries/clinic/pages/PatientsPage.tsx",
    "apps/web/src/industries/clinic/pages/PatientDetailPage.tsx",
    "apps/web/src/industries/clinic/pages/DoctorsPage.tsx",
    "apps/web/src/industries/clinic/pages/VaccinationsPage.tsx",
  ],
  dropped: [
  ],
  needsOwner: ["\"Panels\" screen exists in the clinic pack; describe it only after the owner confirms what it is for."],
  heroOverride: {
    heading: "Reception, the doctor's room and the fee counter in one app",
    sub: "Give tokens at reception, show the line on a waiting-room screen, keep each visit's vitals, prescription and lab tests on the patient's record, and close every doctor's fees with the day.",
    badges: ["Tokens and live line", "Patient records", "Doctor day close"],
    media: { mediaId: SHOT.clinicAppointments, url: "app.nafaa.pk/clinic/appointments" },
  },
  deepBlocks: [
    steps("A day at the clinic", [
      ["Reception opens", "A patient gives a phone number. Reception finds the record or registers a new one, picks the doctor and gives a token. The fee follows the doctor: follow-up rate inside the follow-up days, emergency rate when ticked."],
      ["The waiting room", "The screen shows each doctor's current token in large type. Emergencies go to the top of the line."],
      ["In the doctor's room", "The doctor calls the next token, reads earlier visits and allergies, records vitals, diagnosis and the prescription, and orders lab tests."],
      ["Lab and follow-up", "The lab marks the sample, enters results and prints the report. Patients asked to come back appear on the follow-up list for one-click booking."],
      ["Day close", "Close each doctor's day: patients seen, fees and lab billed, cash against khata, and the doctor's share."],
    ]),
    shot({
      heading: "A record for every patient",
      body: "Each patient gets an MR number with phone, blood group, allergies and long-term conditions on one line, so reception and the doctor see the warnings before the visit. Visit count and any khata balance sit next to a button that gives the next token.",
      id: SHOT.clinicPatients,
      url: "app.nafaa.pk/clinic/patients",
      layout: "full",
      callouts: [
        { x: 20.6, y: 19.5, label: "Patients registered" },
        { x: 22.5, y: 58.6, label: "MR number on every record" },
        { x: 56, y: 57.5, label: "Blood group, allergies and conditions" },
        { x: 94.5, y: 57.5, label: "Give a token" },
      ],
    }),
    shot({
      heading: "Prescriptions written in the doctor's room",
      body: "The doctor writes the diagnosis and medicines with strength, dose and days during the visit. Every prescription is listed with the patient and doctor, prints for the patient, and is marked once the medicine has been given at the counter.",
      id: SHOT.clinicPrescriptions,
      url: "app.nafaa.pk/clinic/prescriptions",
      layout: "split-right",
      callouts: [
        { x: 48.8, y: 40.8, label: "Doctor and diagnosis" },
        { x: 63, y: 39.7, label: "Medicines with strength" },
        { x: 84.4, y: 40.8, label: "Print for the patient" },
        { x: 90.6, y: 44, label: "Mark as dispensed" },
      ],
    }),
    table("Token slips or Nafaa?", "How the main jobs of a clinic compare on paper and in Nafaa.", [
      { key: "paper", label: "Token slips and files" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Tokens", "Paper slips and a shouted number", "Token per doctor, shown on a waiting screen"],
      ["Patient history", "A file the patient forgets to bring", "Every visit, prescription and lab result on one record"],
      ["Fees", "Cash in a drawer, follow-ups argued over", "Fee by doctor with follow-up and emergency rates"],
      ["Doctor's share", "Counted from slips at night", "Day close per doctor from the bills"],
      ["Vaccines", "A card at the parents' home", "EPI schedule per child with overdue doses listed"],
    ]),
    prose(`## What to look for in clinic software

A small clinic needs three things to run smoothly: a calm waiting room, a doctor who sees the patient's history, and fees that add up at the end of the day. Hospital systems are too heavy for that, and shop software does not understand visits. Before you choose, check that it can:

- **Run tokens and the line.** Reception should give a token in seconds and the waiting room should see whose turn it is.
- **Keep one record per patient.** Visits, prescriptions, lab results, vitals and allergies, searchable by phone, MR number or CNIC.
- **Price fees by doctor.** First visit, follow-up within a set number of days, and emergency, without the receptionist deciding.
- **Handle the lab.** Orders from a visit or a walk-in, results and a printed report.
- **Close the day per doctor.** Patients seen, fees billed and the doctor's share, matching the cash in hand.
- **Track vaccinations.** Due and overdue doses, with the batch and expiry recorded when given.

Nafaa covers each of these in the clinic setup. Medicine sold at the clinic counter uses the same stock and billing as any Nafaa shop, and a pharmacy next door can run on the pharmacy setup.`),
    pricing("Plans for one clinic or several doctors"),
  ],
});

/** Internal links: the products a clinic uses, related health trades. */
export default {
  ...entry,
  seoDescription: 'Clinic software: reception tokens and a live queue, visits with prescriptions and lab orders, patient records, doctor fees and vaccinations, with billing.',
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'RELATED' },
    { ref: 'INDUSTRY:optical', kind: 'RELATED' },
    { ref: 'INDUSTRY:services-biz', kind: 'RELATED' },
  ],
} satisfies typeof entry;
