/** Industry: Mobile Phone Shop (/industries/mobile-shop). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "mobile-shop",
  title: "Mobile Phone Shop",
  shortName: "Mobile shop",
  shopNoun: "mobile phone shops",
  romanUrduName: "Mobile shop",
  group: "retail",
  icon: "smartphone",
  color: "#1d4ed8",
  appIndustryKey: "mobile",
  businessType: "MOBILE",
  featured: true,
  sortOrder: 5,
  summary:
    "Nafaa runs mobile phone shops: keep stock by IMEI, record each phone's PTA status, buy used phones and take trade-ins, open repair job cards, and sell on instalments with a qist plan, while the counter, khata and reports work the same as in any shop.",
  builtFor: "Mobile phone shops, accessory shops and repair counters",
  romanUrdu:
    "Mobile shop ke liye Nafaa: IMEI ke hisaab se stock, har phone ka PTA status, used phone ki khareed aur trade-in, repair job card, aur qist plan.",
  features: [
    { icon: "barcode", title: "IMEI stock", body: "Every phone is kept by its IMEI, from purchase to sale, with how long it has sat on the shelf." },
    { icon: "shield-check", title: "PTA status", body: "Record the PTA status of each IMEI; sales history shows it under every bill." },
    { icon: "search", title: "IMEI check", body: "Scan an IMEI to see if the phone was sold or repaired here, to whom, and the warranty left." },
    { icon: "arrow-left-right", title: "Used phones and trade-in", body: "Buy a used phone for cash, take it as a trade-in toward a new one, or keep it to sell for its owner, with the seller's CNIC." },
    { icon: "wrench", title: "Repair job cards", body: "IMEI, lock code, SIM and memory card left with the phone, the fault, the estimate and the advance, with a printed job card." },
    { icon: "calendar", title: "Qist plans", body: "Split a phone into monthly instalments, see what is late or due this week, and send a WhatsApp reminder in one tap." },
    { icon: "layers", title: "Variants and accessories", body: "Storage, RAM and colour as variants; covers and chargers sold like any other item." },
    { icon: "notebook-pen", title: "Khata", body: "Udhaar and payments per customer, with WhatsApp reminders." },
  ],
  faqKeys: ["mobile-imei","mobile-used","offline","pricing"],
  evidence: [
    "apps/web/src/industries/mobile/MobilePack.tsx",
    "apps/web/src/industries/mobile/pages/GlobalImeiInventoryPage.tsx",
    "apps/web/src/industries/mobile/pages/MobileProductWizardPage.tsx",
    "apps/web/src/industries/mobile/pages/MobileProductsPage.tsx",
    "apps/web/src/industries/mobile/pages/MobileSalesPage.tsx",
    "apps/web/src/industries/mobile/pages/UsedPhoneFormPage.tsx",
    "apps/web/src/industries/mobile/pages/UsedPhonesPage.tsx",
    "apps/web/src/industries/mobile/pages/RepairTicketFormPage.tsx",
    "apps/web/src/industries/mobile/pages/RepairTicketsPage.tsx",
    "apps/web/src/industries/mobile/pages/EmiPlansPage.tsx",
    "apps/web/src/industries/mobile/pages/EmiPlanDetailPage.tsx",
    "apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx",
  ],
  dropped: [
    "Automatic PTA tax calculation (the app records PTA status per IMEI only).",
    "Inspection checklist and buyback price claims (not checked).",
  ],
  heroOverride: {
    heading: "Every phone by IMEI, from purchase to qist to repair",
    sub: "Know which handset is on the shelf and for how long, record PTA status, buy used phones with the seller's CNIC, take trade-ins at the counter, and keep repairs and instalments in the same app as your sales.",
    badges: ["IMEI and PTA", "Used phones and trade-in", "Repairs and qist"],
    media: { mediaId: SHOT.mobileImei, url: "app.nafaa.pk/imei-inventory" },
  },
  deepBlocks: [
    steps("A day at the mobile shop", [
      ["Opening", "Check the IMEI stock for phones that have sat too long, and the repair list for jobs waiting on a part or the customer."],
      ["A customer upgrades", "Take the old phone in as a trade-in with its IMEI, PTA status, condition and the owner's CNIC. Its value pays part of the new phone's bill."],
      ["A sale on qist", "Bill the new handset by scanning its IMEI, then split the balance into monthly instalments. The plan shows each due date."],
      ["A cracked screen", "Open a job card with the IMEI, lock code and what was left with the phone, the estimate and an advance. Print the card and send a WhatsApp update when it is ready."],
      ["Closing", "See instalments due this week, used phones ready to sell, repair money still to take, and count the galla."],
    ]),
    shot({
      heading: "Instalments and udhaar on one khata",
      body: "A qist plan writes its entries to the customer's khata, so the shop sees one balance per customer: the phone on instalments, an accessory on credit and any payment taken. Late customers get a WhatsApp reminder with the exact amount.",
      id: SHOT.mobileKhata,
      url: "app.nafaa.pk/khata",
      layout: "full",
      callouts: [
        { x: 25, y: 19.5, label: "Total still to collect" },
        { x: 48, y: 30, label: "How long each amount has been pending" },
        { x: 25.5, y: 55, label: "A customer with a phone on qist" },
        { x: 86.5, y: 62, label: "Record a payment or send a WhatsApp reminder" },
      ],
    }),
    shot({
      heading: "Profit on phones, accessories and repairs",
      body: "Handsets move a lot of money on thin margins; covers, chargers and repairs often earn more. The profit report shows what each product really made after cost.",
      id: SHOT.mobileProfit,
      url: "app.nafaa.pk/profit-report",
      layout: "split-right",
      callouts: [
        { x: 46.5, y: 20, label: "Gross and net profit after expenses" },
        { x: 74, y: 56, label: "Profit per IMEI" },
        { x: 84.5, y: 66, label: "Profit and margin on every model" },
      ],
    }),
    table("Register or Nafaa?", "How the main jobs of a mobile shop compare in a register and in Nafaa.", [
      { key: "paper", label: "Register and receipts" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Which phone was sold", "Model written, IMEI often missing", "IMEI and PTA status under every bill in sales history"],
      ["Used phone purchase", "A slip with a phone number", "Seller's CNIC, IMEI, condition and cost on record"],
      ["Trade-in", "Worked out on a calculator, then forgotten", "Taken as a payment on the new phone's bill"],
      ["Repairs", "A chit with the customer's name", "Job card with IMEI, lock code, estimate and advance"],
      ["Qist", "A diary of who paid which month", "Each instalment with its due date and one-tap reminder"],
    ]),
    prose(`## What to look for in mobile shop software

A phone shop sells costly items that look identical on the shelf, buys from customers as well as suppliers, and often fixes what it sells. Ordinary shop software, which counts "Samsung A15: 4 in stock", loses track of all of that. Before you choose, check that it can:

- **Track every handset by IMEI.** From the purchase bill to the sale bill, with the customer's name, so a warranty claim or a theft enquiry takes seconds.
- **Record PTA status per phone.** Customers ask, and the answer should be on the phone's record, not in someone's memory.
- **Buy used phones safely.** The seller's CNIC, the IMEI and the condition should be recorded at the moment you pay.
- **Take trade-ins at the counter.** The old phone's value should pay part of the new bill without a second calculation.
- **Run repairs.** A job card, the parts and labour, the advance, and a warranty on the repair.
- **Sell on qist and follow up.** Due dates, late payments and reminders, tied to the customer's khata.

Nafaa covers each of these in the mobile shop setup, along with the counter, accessories, khata and reports every Nafaa shop uses.`),
    pricing("Plans for one counter or several shops"),
  ],
});

/** Internal links: the products a mobile shop uses, related trades and terms. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:imei', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:pta-approved', kind: 'RELATED' },
  ],
} satisfies typeof entry;
