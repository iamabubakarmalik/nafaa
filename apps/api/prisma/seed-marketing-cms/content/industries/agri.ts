/** Industry: Agri & Feed Store (/industries/agri). Imported from apps/marketing and checked against the agri pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "agri",
  title: "Agri & Feed Store",
  shortName: "Agri",
  shopNoun: "agri, seed and feed stores",
  romanUrduName: "Beej, khaad aur feed ki dukaan",
  group: "specialty",
  icon: "wheat",
  color: "#4d7c0f",
  appIndustryKey: "agri",
  businessType: "AGRI",
  sortOrder: 19,
  summary:
    "Nafaa runs agri stores that sell seeds, fertiliser, pesticides and animal feed: keep farmer accounts with credit, take bulk orders, record crop advisories, plan stock by season, and track government subsidy claims, alongside the counter, stock and khata. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Seed, fertiliser, pesticide and feed stores",
  romanUrdu:
    "Agri store ke liye: kisanon ka khata, bulk order, fasal ki salah, season ka plan, aur government subsidy ke claims.",
  features: [
    { icon: "users", title: "Farmer accounts", body: "Village, land in acres, crops and a credit limit for each farmer, linked to the customer khata." },
    { icon: "calendar-clock", title: "Udhaar by crop season", body: "See what each farmer took this season, what came back and what carried over, and what is due because the harvest has passed." },
    { icon: "boxes", title: "Bulk season orders", body: "Book bags of seed, fertiliser and spray ahead with an advance; stock moves only when the order is delivered." },
    { icon: "sprout", title: "Crop advisory slips", body: "Record the crop, its stage and the problem, the advice and products given, print a slip and list follow-up visits that are due." },
    { icon: "calendar", title: "Crop calendar", body: "Sowing and harvest dates, dose per acre and spray days for each crop, with stock shown as the acres it covers." },
    { icon: "landmark", title: "Subsidy claims", body: "The farmer pays the reduced price; track the shop's claim from pending to approved to paid, or rejected." },
    { icon: "shield-check", title: "Registration check", body: "A seed, fertiliser or spray whose government registration has expired cannot be sold at the counter." },
    { icon: "layers", title: "Bags, maund and kilos", body: "Sell by the 50 kg bag, the maund, the kilo or the litre; bulk rates apply once the bag count reaches your threshold." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/agri/AgriPack.tsx",
    "apps/web/src/industries/agri/pos/config.ts",
    "apps/web/src/industries/agri/pos/FarmerStrip.tsx",
    "apps/web/src/industries/agri/pages/FarmersPage.tsx",
    "apps/web/src/industries/agri/pages/FarmerDetailPage.tsx",
    "apps/web/src/industries/agri/pages/BulkOrdersPage.tsx",
    "apps/web/src/industries/agri/pages/AdvisoryPage.tsx",
    "apps/web/src/industries/agri/pages/SeasonalPlansPage.tsx",
    "apps/web/src/industries/agri/pages/SubsidyPage.tsx",
    "apps/web/src/industries/agri/lib/agriUnits.ts",
    "apps/web/src/industries/agri/dashboard/useAgriOps.ts",
  ],
  dropped: [],
  needsOwner: ["Interest on farmer credit: the farmer record has an interest rate field; confirm it is applied before the page mentions it."],
  heroOverride: {
    heading: "Farmer khata, season orders and the counter for your agri store",
    sub: "Give fertiliser and seed on udhaar against the coming harvest and see it season by season, book bulk orders with an advance, and stop expired sprays from being sold.",
    badges: ["Udhaar by crop season", "Bags and maund", "Subsidy claims"],
    media: { mediaId: SHOT.khata, url: "app.nafaa.pk/khata" },
  },
  deepBlocks: [
    shot({
      heading: "Farmer udhaar that follows the harvest",
      body: "Most of an agri store's money sits with farmers until the crop is sold. Every farmer is also a customer on the khata, so the counter, the farmer page and the reports show the same balance. The Farmers page splits it into what is due because the season's harvest has passed and what is still within the season.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "full",
      caption: "The shared khata, shown here with demo shop data.",
      callouts: [
        { x: 25, y: 19, label: "Total udhaar to collect" },
        { x: 58, y: 30, label: "Balances by age" },
        { x: 90, y: 55, label: "Take a payment or send a reminder" },
      ],
    }),
    steps("A day at the agri store", [
      ["Morning", "Open the dashboard: sowing season readiness, farmer recovery, registrations about to lapse and subsidy claims still pending."],
      ["A farmer walks in", "Search \"gandum\" or \"sundi\" at the counter to find what fits the crop or the pest. His village, land, seasonal udhaar and credit limit show under his name on the bill."],
      ["Advice at the counter", "Write the crop, stage and problem, add the advice and suggested products, print the slip and set a follow-up date."],
      ["Season orders", "Book a farmer's bags for the season with an advance. Mark it delivered and the normal bill is made, with the advance already counted."],
      ["Evening", "Take the day's recoveries on the farmer pages and check the crop calendar before ordering stock for the next sowing."],
    ]),
    shot({
      heading: "Stock planned before the sowing rush",
      body: "The low-stock list shows what is running out and how much to order. The crop calendar adds the trade's own view: stock on hand shown as the acres it can cover, so urea and seed are in the godown before farmers come asking.",
      id: SHOT.lowStock,
      url: "app.nafaa.pk/low-stock",
      layout: "split-right",
      caption: "The shared low-stock list, shown with demo shop data.",
      callouts: [
        { x: 28, y: 62, label: "Stock against its alert level" },
        { x: 75, y: 62, label: "Suggested order quantity" },
      ],
    }),
    table("Register and diary, or Nafaa?", "How the everyday jobs of an agri store compare on paper and on Nafaa.", [
      { key: "paper", label: "Register and diary" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Farmer udhaar", "One running total per name, seasons mixed together", "Udhaar given, received and carried over for each crop season"],
      ["Season orders", "Written in a diary, advance remembered", "Bulk order with its advance on the khata; stock moves on delivery"],
      ["Expired registration", "Noticed only if someone checks the bag", "The counter refuses to sell it"],
      ["Spray expiry", "Old batches found at the back of the godown", "Batches with expiry, earliest valid batch sold first"],
      ["Subsidy money", "A file of papers and phone calls", "Each claim tracked from pending to paid, with totals by scheme"],
    ]),
    prose(`## What to look for in agri store software

An agri store is a seasonal credit business as much as a shop. Fertiliser and seed go out on udhaar at sowing, and the money comes back after the harvest, months later. Ordinary retail software treats that as one long overdue balance. Before you choose, check that the software can:

- **Keep udhaar by crop season.** You need to see what a farmer took for Rabi and for Kharif, what he paid and what carried over, not just one figure.
- **Sell in the units the trade uses.** Bags of 50 kg, maund, kilos and litres, with the bag's weight known so stock counted in kilos and trade done in bags agree.
- **Stop what must not be sold.** Seeds, fertiliser and sprays with an expired registration, and spray batches past their expiry date.
- **Handle season orders.** A farmer's order booked weeks ahead with an advance, without stock leaving the godown until delivery.
- **Help the farmer, not just bill him.** Finding products by crop or pest, and a printed advice slip, keep farmers coming back to your counter.
- **Track subsidy claims.** When the farmer pays a reduced price, the shop is waiting on the rest; that money needs its own list.

Nafaa does this on the phone or computer you already have, and the counter keeps billing when the internet drops in the village.`),
    pricing("Plans for one store or several"),
  ],
  writerNotes: "Screenshots are the shared khata and low-stock screens with demo data; no agri-specific screenshots exist yet.",
});

/** Internal links: the products agri stores use, the matching solutions and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'TAG' },
    { ref: 'INDUSTRY:dairy', kind: 'RELATED' },
    { ref: 'INDUSTRY:hardware', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:udhaar', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:batch-tracking', kind: 'RELATED' },
    { ref: 'BLOG_POST:digital-khata-vs-paper-ledger', kind: 'RELATED' },
  ],
} satisfies typeof entry;
