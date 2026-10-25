/** Industry: Pharmacy & Medical Store (/industries/pharmacy). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
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
    { icon: "search", title: "Salt and formula search", body: "Find a medicine by brand or salt and see other brands with the same salt, their price and shelf stock." },
    { icon: "layers", title: "Tablet, strip and box", body: "Sell a loose tablet or a full strip or box from the same medicine, each with its own price." },
    { icon: "calendar-clock", title: "Batch and expiry", body: "Stock by batch with expiry dates; items inside 30 and 90 days are flagged with the money at stake." },
    { icon: "rotate-ccw", title: "Return to distributor", body: "Send a near-expiry batch back to the distributor it came from, or write it off." },
    { icon: "file-text", title: "Prescriptions", body: "Record, check and dispense prescriptions, in full or in part, and refill them later." },
    { icon: "circle-alert", title: "Salt clash warning", body: "Record which salts clash; a prescription with both shows a warning before it is given." },
    { icon: "stethoscope", title: "Doctors", body: "Keep the doctors whose prescriptions you fill, with how many and for how much." },
    { icon: "shield-check", title: "Narcotic register", body: "Controlled, narcotic and psychotropic sales go into a register with the patient and doctor." },
    { icon: "refrigerator", title: "Cold chain log", body: "Record fridge temperatures twice a day; readings outside 2-8°C are marked." },
  ],
  faqKeys: ["pharmacy-salt","pharmacy-expiry","pharmacy-register","offline","pricing"],
  evidence: [
    "apps/web/src/industries/pharmacy/PharmacyPack.tsx",
    "apps/web/src/industries/pharmacy/lib/meta.ts",
    "apps/web/src/industries/pharmacy/pages/ExpiringPage.tsx",
    "apps/web/src/industries/pharmacy/api/substitutes.api.ts",
    "apps/web/src/industries/pharmacy/pages/SaltsPage.tsx",
    "apps/web/src/industries/pharmacy/api/interactions.api.ts",
    "apps/web/src/industries/pharmacy/pages/NewPrescriptionPage.tsx",
    "apps/web/src/industries/pharmacy/pages/PrescriptionDetailPage.tsx",
    "apps/web/src/industries/pharmacy/pages/PharmacyDoctorsPage.tsx",
    "apps/web/src/industries/pharmacy/pages/ControlledLogPage.tsx",
    "apps/web/src/industries/pharmacy/pages/TemperatureLogPage.tsx",
    "apps/web/src/industries/pharmacy/products/PharmacyProductEditor.tsx",
    "apps/web/src/industries/pharmacy/pos/config.ts",
    "apps/web/src/modules/inventory/low-stock/pages/LowStockPage.tsx",
  ],
  dropped: [
    "\"DRAP-compliant\", \"fully DRAP compliant\" and \"always inspection-ready\" (no DRAP approval on record).",
    "\"Pakistan's most trusted pharmacy platform\" claim.",
    "Doctor commission management (not found in the pharmacy pack).",
    "Alerts at 30, 60 and 90 days (the app flags 30 and 90 day windows).",
  ],
  needsOwner: ["Any DRAP claim needs a written official source (compliance writer W6)."],
  heroOverride: {
    heading: "Salts, batches and the narcotic register, at the speed of the counter",
    sub: "Find a medicine by brand or formula and offer a substitute that is in stock, sell by tablet, strip or box, catch batches before they expire, and keep the controlled register filled as you bill.",
    badges: ["Salt substitutes", "Batch and expiry", "Narcotic register"],
    media: { mediaId: SHOT.pharmacyExpiry, url: "app.nafaa.pk/pharmacy/expiring" },
  },
  deepBlocks: [
    shot({
      heading: "What is running out, and what is about to expire",
      body: "The low-stock list puts near-expiry stock next to items that are running out, with how many days the rest will last and what to order from which distributor. The pharmacy's own expiry list then shows every batch by date, with its value at cost and at sale price.",
      id: SHOT.pharmacyLowStock,
      url: "app.nafaa.pk/low-stock",
      layout: "full",
      callouts: [
        { x: 74, y: 30, label: "Stock expiring in the next 30 days" },
        { x: 57.5, y: 62, label: "How many days the stock will last" },
        { x: 69.5, y: 70.5, label: "What to order, with its cost" },
      ],
    }),
    steps("A day at the medical store", [
      ["Morning", "Write the fridge reading in the cold chain log and open the expiry list. Batches inside 30 days go back to the distributor or are marked for a quick sale."],
      ["A prescription comes in", "Enter the patient and doctor, add the medicines with dose and quantity, and Nafaa warns you if two salts on it clash."],
      ["Out of a brand", "Search the salt. Other brands with the same formula show with their price and shelf stock, so you can offer one that is there."],
      ["A controlled medicine", "The sale needs the patient and doctor; the register line is written from the bill, with the opening and closing balance."],
      ["Evening", "Write the second fridge reading, check prescriptions still waiting, and count the galla."],
    ]),
    shot({
      heading: "Udhaar for regular patients",
      body: "Families on monthly medicine often pay at the end of the month. A prescription can be handed over on the patient's khata, and the balance, its age and a WhatsApp reminder are one tap away.",
      id: SHOT.pharmacyKhata,
      url: "app.nafaa.pk/khata",
      layout: "split-right",
      callouts: [
        { x: 25, y: 19.5, label: "Total udhaar to collect" },
        { x: 89.5, y: 55.5, label: "Record a payment or send a reminder" },
      ],
    }),
    table("Registers or Nafaa?", "How the main jobs of a medical store compare on paper registers and in Nafaa.", [
      { key: "paper", label: "Paper registers" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Finding a substitute", "The pharmacist's memory", "Same-salt brands with price and shelf stock"],
      ["Expiry", "Found on the shelf after it has expired", "Every batch by date, with 30 and 90 day flags"],
      ["Narcotic register", "Copied by hand at night, often late", "Written from each bill with patient and doctor"],
      ["Fridge temperature", "A sheet taped to the fridge", "Twice-daily log with out-of-range readings marked"],
      ["Selling strips", "Loose tablets priced by guesswork", "Tablet, strip and box prices on one medicine"],
    ]),
    prose(`## What to look for in pharmacy software

A medical store carries thousands of brands, most of them sold in small quantities, and a mistake costs more than money. Before you choose, check that the software can:

- **Search by salt, not only by brand.** Customers arrive with a prescription for one brand; the shelf may have another with the same formula.
- **Track every batch and its expiry.** Expired stock is lost money unless it goes back to the distributor in time, so the list should show value at stake and where each batch came from.
- **Sell loose and packed.** A single tablet, a strip and a box should come from one stock, each at its own price.
- **Keep the controlled register as you sell.** Writing it at the end of the day is where gaps appear.
- **Record prescriptions and doctors.** Refills, part supply and a history per patient help regular customers and protect the pharmacist.
- **Log the cold chain.** Insulin and vaccines need a record of the fridge temperature, not a memory of it.

Nafaa covers each of these in the pharmacy setup, on top of the counter, purchasing, khata and reports used by every Nafaa business. It does not claim any DRAP approval; your licence and legal duties stay with you.`),
    pricing("Plans for one medical store or a chain"),
  ],
});

/** Internal links: the products a pharmacy uses, related health trades and terms. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'INDUSTRY:clinic', kind: 'RELATED' },
    { ref: 'INDUSTRY:cosmetics', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:batch-tracking', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:drap', kind: 'RELATED' },
  ],
} satisfies typeof entry;
