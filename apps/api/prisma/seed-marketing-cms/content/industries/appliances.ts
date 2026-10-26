/** Industry: Home Appliances (/industries/appliances). Imported from apps/marketing and checked against the appliances pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "appliances",
  title: "Home Appliances",
  shortName: "Appliances",
  shopNoun: "home appliance shops",
  romanUrduName: "Home appliances ki dukaan",
  group: "retail",
  icon: "refrigerator",
  color: "#0e7490",
  appIndustryKey: "appliances",
  businessType: "APPLIANCES",
  sortOrder: 20,
  summary:
    "Nafaa runs home appliance shops: serial numbers and warranties, installations, repairs with technicians, AMC contracts, heavy deliveries, qist plans with a guarantor, trade-ins of old appliances, and brand warranty claims, alongside the normal counter, stock and khata. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Home appliance and electronics showrooms",
  romanUrdu:
    "Appliances ki dukaan ke liye: serial aur warranty, installation, repair, technician, AMC, delivery, guarantor ke saath qist plan, purana saman aur warranty claim.",
  features: [
    { icon: "barcode", title: "Serial register", body: "Every AC, fridge and LED by serial: on the shelf, sold with its customer and warranty, or waiting for fitting. New stock is scanned or pasted in one go." },
    { icon: "scan-barcode", title: "Sell the exact unit", body: "Scan a serial or pick the unit at the counter; its warranty starts on the bill date and a warranty card prints for each unit." },
    { icon: "wrench", title: "Installations", body: "Book AC, geyser and washing machine fitting with a technician and a time slot; finishing the job posts its bill." },
    { icon: "clipboard-list", title: "Repairs and complaints", body: "Log a complaint, check warranty and AMC from the serial, track jobs waiting for parts, and close with charges taken." },
    { icon: "users", title: "Technicians", body: "Skills, area, visit rate, commission and rating, with who is free and who has too much work today." },
    { icon: "file-text", title: "AMC contracts", body: "Yearly service contracts with free visits, renewals coming up and money still to collect." },
    { icon: "truck", title: "Heavy delivery", body: "Trips with address, floor and lift, vehicle and driver, and hand-over to a named receiver." },
    { icon: "calendar", title: "Qist with a guarantor", body: "A monthly instalment plan after the bill, with the guarantor's details and a printed agreement." },
    { icon: "arrow-left-right", title: "Old appliance trade-in", body: "Take an old AC or fridge at an agreed value off the new bill, then sell it on, scrap it or give it back." },
    { icon: "shield-check", title: "Brand warranty claims", body: "Claim parts and labour spent on warranty repairs from the brand and follow each claim until it is paid." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/appliances/AppliancesPack.tsx",
    "apps/web/src/industries/appliances/pos/config.ts",
    "apps/web/src/industries/appliances/pos/AfterSale.tsx",
    "apps/web/src/industries/appliances/pages/ApplianceSerialsPage.tsx",
    "apps/web/src/industries/appliances/pages/InstallationsPage.tsx",
    "apps/web/src/industries/appliances/pages/ServiceRequestsPage.tsx",
    "apps/web/src/industries/appliances/pages/TechniciansPage.tsx",
    "apps/web/src/industries/appliances/pages/AmcContractsPage.tsx",
    "apps/web/src/industries/appliances/pages/DeliveriesPage.tsx",
    "apps/web/src/industries/appliances/pages/QistPlanPage.tsx",
    "apps/web/src/industries/appliances/pages/TradeInsPage.tsx",
    "apps/web/src/industries/appliances/pages/ApplianceWarrantyClaimsPage.tsx",
    "apps/web/src/industries/appliances/receipt/appliancePrints.ts",
  ],
  dropped: [],
  heroOverride: {
    heading: "Sell, fit, deliver and service every appliance from one app",
    sub: "Track every unit by serial from the dealer to the customer's home, book fitting and delivery right after the bill, sell on qist with a guarantor, and keep repairs, AMC and brand claims in order.",
    badges: ["Serial and warranty", "Fitting and delivery", "Qist with guarantor"],
    media: { mediaId: SHOT.appliancesInstallations, url: "app.nafaa.pk/appliances/installations" },
  },
  deepBlocks: [
    steps("From the counter to the customer's home", [
      ["Sell the unit", "Scan the serial of the split AC on the bill. The unit is marked sold and its warranty starts today."],
      ["Book the fitting", "Right after the bill, book the installation with a technician and a slot. The job slip prints for him."],
      ["Send the delivery", "Book the trip with the address, floor and lift, put a vehicle and driver on it, and record who received it."],
      ["Set up the qist", "For a bill on udhaar, make a monthly plan with the guarantor and print the agreement for both signatures."],
    ], "Each step after the bill is optional; the sale is complete without it."),
    shot({
      heading: "Repair calls from complaint to closing",
      body: "A customer calls about a fridge that stopped cooling. The complaint is written with the product, the address and whether it is under warranty, a technician is given the visit, and the charge is billed when the job is closed. Urgent and late calls are counted at the top.",
      id: SHOT.appliancesService,
      url: "app.nafaa.pk/appliances/service-requests",
      layout: "full",
      callouts: [
        { x: 20, y: 30.5, label: "Open complaints" },
        { x: 30, y: 60.1, label: "Product and complaint" },
        { x: 46.9, y: 60.1, label: "Under warranty or urgent" },
        { x: 33, y: 64.6, label: "Technician and visit date" },
        { x: 94.4, y: 60.1, label: "Visit charge" },
      ],
    }),
    shot({
      heading: "Know who is earning and who is overloaded",
      body: "Technicians have their own register with skills, area, visit rate and commission. The staff screen keeps everyone who works at the counter, with roles and permissions, so a salesman cannot give a refund the owner has not allowed.",
      id: SHOT.staff,
      url: "app.nafaa.pk/staff",
      layout: "split-right",
      caption: "The shared staff screen, shown with demo shop data.",
      callouts: [
        { x: 22, y: 19, label: "Who is at work" },
        { x: 32, y: 48, label: "Roles and permissions" },
      ],
    }),
    table("Warranty card book or Nafaa?", "How the everyday jobs of an appliance shop compare on paper and on Nafaa.", [
      { key: "paper", label: "Card book and diary" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Which unit went to whom", "Serial copied by hand, if at all", "Serial scanned on the bill, linked to the customer"],
      ["Warranty check on a complaint", "Customer searches for the card", "Look up the serial: warranty and AMC filled in"],
      ["Technician jobs", "Phone calls and a whiteboard", "Job cards with slot, technician, charges and rating"],
      ["Qist customers", "Register of instalments and a photocopy of the guarantor's CNIC", "Plan with schedule, payments, guarantor and printed agreement"],
      ["Money from the brand", "Forgotten once the repair is done", "Warranty repairs never claimed are listed until claimed"],
    ]),
    prose(`## What to look for in appliance shop software

An appliance sale does not end at the counter. The unit has to be fitted, delivered, serviced under warranty and often paid for in instalments. Software built for grocery billing loses track of all of that. Before you choose, check that it can:

- **Track every unit by serial.** Two fridges of the same model are not the same once one is sold. You need to know which serial went to which customer and when its warranty ends.
- **Turn a bill into field jobs.** Installation and delivery should be booked from the bill, with a technician, a slot and a job slip, not in a separate diary.
- **Sell on qist safely.** A monthly plan with a guarantor and a printed agreement, and the balance on the customer's khata.
- **Run repairs and AMC.** Complaints checked against warranty and AMC from the serial, jobs waiting for parts, and yearly contracts with free visits and renewals.
- **Recover warranty money from the brand.** Parts and labour you spent on warranty repairs are owed to you; the software should keep them on a list until paid.
- **Take old units in trade.** The agreed value comes off the new bill and the old unit stays in stock until sold or scrapped.

Nafaa covers each of these with its own page, on the phone or computer you already use. Products sell offline too; a bill with picked serial units waits for the internet, because units are matched on the server.`),
    pricing("Plans for one showroom or several"),
  ],
  writerNotes: "Screenshots are the shared dashboard and staff screens with demo data; no appliance-specific screenshots exist yet.",
});

/** Internal links: the products appliance shops use, the matching solutions and related trades. */
export default {
  ...entry,
  seoDescription: 'Software for appliance shops: serial numbers and warranties, installations and repairs, AMC contracts, qist plans with a guarantor and trade-ins of old units.',
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'PRODUCT:multi-shop', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'RELATED' },
    { ref: 'INDUSTRY:mobile-shop', kind: 'RELATED' },
    { ref: 'INDUSTRY:furniture', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sku', kind: 'RELATED' },
  ],
} satisfies typeof entry;
