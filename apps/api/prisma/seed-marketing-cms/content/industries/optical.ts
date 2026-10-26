/** Industry: Optical & Eyewear (/industries/optical). Imported from apps/marketing and checked against the optical pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
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
    { icon: "calendar-check", title: "Eye test bookings", body: "Book a test with a doctor in a free slot, take the fee, and see today's queue, follow-ups and no-shows." },
    { icon: "file-text", title: "Prescriptions (nuskha)", body: "Power for both eyes with SPH, CYL, axis, ADD and PD, fitting height and contact lens fit, checked the way a lab reads it." },
    { icon: "glasses", title: "Glasses orders", body: "Nuskha, frame from stock or the customer's own, lens type, index and coating, lab, pickup date and the advance." },
    { icon: "flag", title: "Lab tracking", body: "Send to lab, back from lab, ready, handed over; labs compared on turnaround and late orders." },
    { icon: "printer", title: "Three printed slips", body: "The customer's nuskha, the order slip given with the advance, and a lab slip with power and lens but no prices." },
    { icon: "wrench", title: "Repairs", body: "The customer's frame, what is wrong, the charge and the date, on the same order desk." },
    { icon: "bell", title: "Expiring prescriptions", body: "A call-back list of prescriptions close to their end, with a WhatsApp link to invite the customer for a new test." },
    { icon: "user-cog", title: "Optometrists", body: "Each doctor's days, hours and fee, with tests done and fees billed per doctor." },
    { icon: "boxes", title: "Frames and contact lenses", body: "Frames by brand, model, colour and size; contact lenses and solutions in batches, earliest expiry sold first." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/optical/OpticalPack.tsx",
    "apps/web/src/industries/optical/pages/EyeTestsPage.tsx",
    "apps/web/src/industries/optical/pages/EyeTestDetailPage.tsx",
    "apps/web/src/industries/optical/pages/PrescriptionFormPage.tsx",
    "apps/web/src/industries/optical/pages/PrescriptionsPage.tsx",
    "apps/web/src/industries/optical/pages/LensOrderFormPage.tsx",
    "apps/web/src/industries/optical/pages/LensOrdersPage.tsx",
    "apps/web/src/industries/optical/components/OrderModals.tsx",
    "apps/web/src/industries/optical/lib/print.ts",
    "apps/web/src/industries/optical/pages/OptometristsPage.tsx",
    "apps/web/src/industries/optical/pos/config.ts",
    "apps/web/src/industries/optical/pos/CustomerOptical.tsx",
    "apps/web/src/industries/optical/pages/OpticalProductWizardPage.tsx",
  ],
  dropped: [],
  heroOverride: {
    heading: "Eye tests, prescriptions and glasses orders in one app",
    sub: "Book eye tests with your optometrist, save every customer's nuskha, send glasses to the lab with a slip that shows no prices, and hand them over with the bill when the advance is already counted.",
    badges: ["Nuskha with SPH, CYL, axis", "Lab tracking", "Advance on orders"],
    media: { mediaId: SHOT.opticalLensOrders, url: "app.nafaa.pk/optical/lens-orders" },
  },
  deepBlocks: [
    steps("From eye test to new glasses", [
      ["Eye test", "Book the customer with the doctor in a free slot. Write the result for both eyes and issue the nuskha in one step."],
      ["Order", "Turn the new nuskha into a glasses order. Pick a frame from stock or note the customer's own, choose lens type, index and coating, and take the advance."],
      ["Lab", "Print the lab slip with power and lens only, and mark the order sent. When it comes back, mark it ready and WhatsApp the customer."],
      ["Hand-over", "At the counter, the customer's ready glasses show under their name. Take what is left; the bill is made at hand-over."],
    ]),
    shot({
      heading: "Eye tests booked by the hour",
      body: "Book each eye test with the customer's age, complaint and optometrist. The day's list shows who is coming at what time, which tests are running or done, and the test fee still to take, with a button to start the test and record the result.",
      id: SHOT.opticalEyeTests,
      url: "app.nafaa.pk/optical/eye-tests",
      layout: "full",
      callouts: [
        { x: 20, y: 58.4, label: "Booked time" },
        { x: 42.5, y: 60.6, label: "Age and complaint" },
        { x: 79.4, y: 60.6, label: "Test fee still due" },
        { x: 87.6, y: 59.5, label: "Start the test" },
      ],
    }),
    shot({
      heading: "Every customer's eye number on file",
      body: "Each prescription keeps the right and left eye power, cylinder, axis, add and PD, with its type and the optometrist. When a customer comes back, the number is there with its validity, and a glasses order starts from it in one tap.",
      id: SHOT.opticalPrescriptions,
      url: "app.nafaa.pk/optical/prescriptions",
      layout: "split-right",
      callouts: [
        { x: 47.8, y: 30.6, label: "Prescriptions expiring in 60 days" },
        { x: 23.8, y: 60.6, label: "Date and type" },
        { x: 53.8, y: 58.5, label: "Right and left eye power and PD" },
        { x: 89.3, y: 59.5, label: "Start a glasses order" },
      ],
    }),
    table("Card file and order book, or Nafaa?", "How the everyday jobs of an optical shop compare on paper and on Nafaa.", [
      { key: "paper", label: "Card file and order book" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Old prescriptions", "Paper cards, hard to find, easy to misread", "Every nuskha saved per customer and printed clearly"],
      ["Order at the lab", "A phone call to ask where it is", "Each order's step, with late orders listed by lab"],
      ["Lab slip", "Copied by hand, sometimes with prices", "Printed with power and lens, no prices"],
      ["The advance", "A receipt and a note in the book", "In today's drawer, counted against the final bill"],
      ["Repeat customers", "Wait for them to come back", "Call-back list of prescriptions about to expire"],
    ]),
    prose(`## What to look for in optical shop software

An optical shop is part clinic and part workshop. Money is taken in advance, the product is made outside by a lab, and the customer comes back days later. A mistake in a prescription or a lost order costs more than one sale. Before you choose software, check that it can:

- **Store prescriptions properly.** SPH, CYL, axis, ADD and PD for both eyes, with who prescribed it and until when, printed so a lab cannot misread it.
- **Run the eye-test desk.** Doctors' days and hours, free slots, fees and follow-ups, with tests turning into prescriptions in one step.
- **Track orders through the lab.** Booked, at the lab, back, ready and handed over, with late orders and lab turnaround visible.
- **Handle advances correctly.** The advance should count as money received the day it is taken, and the bill should be made only at hand-over.
- **Keep frames and lenses apart.** Frames by brand, model, colour and size; contact lenses and solutions by batch and expiry.
- **Bring customers back.** An expiring prescription is a natural reason to call the customer for a new test.

Nafaa covers each of these on the counter computer or a phone, with the same khata and reports as every Nafaa business.`),
    pricing("Plans for one shop or several"),
  ],
  writerNotes: "Screenshots are the shared dashboard and products page with demo data; no optical-specific screenshots exist yet.",
});

/** Internal links: the products optical shops use, the matching solution and related trades. */
export default {
  ...entry,
  seoDescription: 'Optical shop software: eye tests and prescriptions with SPH, CYL, axis and PD, glasses orders with an advance, lab tracking, repairs, frames and lenses.',
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:clinic', kind: 'RELATED' },
    { ref: 'INDUSTRY:pharmacy', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:batch-tracking', kind: 'RELATED' },
  ],
} satisfies typeof entry;
