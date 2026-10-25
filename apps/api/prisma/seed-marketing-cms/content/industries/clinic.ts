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
    media: { mediaId: SHOT.dashboard, url: "app.nafaa.pk/clinic/dashboard" },
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
      heading: "Patient balances on the khata",
      body: "Some patients pay later, and fees can go on a patient's khata at reception. The khata shows every balance, how long it has been pending, and lets you record a payment or send a reminder.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "full",
      caption: "Shared khata screen, shown with demo data.",
      callouts: [
        { x: 33, y: 19.5, label: "Total still to collect" },
        { x: 49, y: 31, label: "How long each amount has been pending" },
        { x: 90.5, y: 62, label: "Record a payment or send a reminder" },
      ],
    }),
    shot({
      heading: "The clinic's month in one statement",
      body: "Fees, lab and medicine sales are ordinary bills, so the profit and loss statement covers the whole clinic: income, expenses such as rent and staff, and net profit, next to the period before.",
      id: SHOT.profitLoss,
      url: "app.nafaa.pk/reports/profit-loss",
      layout: "split-right",
      caption: "Shared report, shown with a demo store's data.",
      callouts: [
        { x: 25, y: 19, label: "Net profit for the period" },
        { x: 64, y: 30, label: "Expenses" },
        { x: 67, y: 54, label: "Compared with the period before" },
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
