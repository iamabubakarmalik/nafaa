/** Industry: Dairy & Milk Shop (/industries/dairy). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "dairy",
  title: "Dairy & Milk Shop",
  shortName: "Dairy",
  shopNoun: "dairy and milk shops",
  romanUrduName: "Doodh ki dukaan",
  group: "food",
  icon: "milk",
  color: "#075985",
  colorNote: "App identity #0284c7 is 4.10:1 with white text; seeded #075985 instead (Phase 1 issue 7); sky-700 is taken by the Services identity.",
  appIndustryKey: "dairy",
  businessType: "DAIRY",
  sortOrder: 13,
  summary:
    "Nafaa runs dairy and milk shops: record milk bought from gawalas, deliver to homes on routes, send a monthly bill to each delivery customer, make dahi and makhan and record spoiled stock, run quality tests, and sell loose milk at the counter.",
  builtFor: "Dairy shops, milk shops and home milk delivery",
  romanUrdu:
    "Doodh ki dukaan ke liye: gawalon se doodh ki entry, routes par ghar delivery, mahine ka bill, dahi aur makhan, kharab maal ka hisaab, aur counter par khula doodh.",
  features: [
    { icon: "milk", title: "Milk from gawalas", body: "Morning and evening slips per gawala at his rate per litre with the fat bonus; the litres enter stock and the amount goes on his account." },
    { icon: "hand-coins", title: "Gawala payments", body: "Pay weekly or monthly from the drawer, bank or JazzCash, and print a statement for the settlement." },
    { icon: "truck", title: "Home delivery routes", body: "Each rider's round by area, morning or evening, with the day sheet split by route." },
    { icon: "list-checks", title: "Daily delivery sheet", body: "Made from each customer's fixed quantity; the rider marks delivered, naga or a changed quantity." },
    { icon: "receipt", title: "Monthly bills", body: "A statement of the month's deliveries with the balance before and after, printed or sent on WhatsApp." },
    { icon: "factory", title: "Dahi, makhan, lassi and khoya", body: "Making takes milk out of stock and puts the product in at the milk's cost; spoiled stock is counted at day end." },
    { icon: "clipboard-check", title: "Quality tests", body: "Fat, SNF, water and adulteration at collection, in the tank or after a complaint." },
    { icon: "shopping-basket", title: "Counter sales", body: "Sell loose milk and dairy items at the counter." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: [
    "apps/web/src/industries/dairy/DairyPack.tsx",
    "apps/web/src/industries/dairy/pages/FarmerSuppliesPage.tsx",
    "apps/web/src/industries/dairy/pages/FarmersPage.tsx",
    "apps/web/src/industries/dairy/pages/FarmerDetailPage.tsx",
    "apps/web/src/industries/dairy/pages/RoutesPage.tsx",
    "apps/web/src/industries/dairy/pages/DeliveriesPage.tsx",
    "apps/web/src/industries/dairy/pages/DairyCustomerFormPage.tsx",
    "apps/web/src/industries/dairy/pages/DairyCustomerDetailPage.tsx",
    "apps/web/src/industries/dairy/pages/MonthlyBillsPage.tsx",
    "apps/web/src/industries/dairy/pages/ProductionPage.tsx",
    "apps/web/src/industries/dairy/pages/QualityTestsPage.tsx",
  ],
  dropped: [
  ],
  heroOverride: {
    heading: "Gawalas, home delivery and the monthly bill in one app",
    sub: "Enter every gawala's milk morning and evening, give riders a daily sheet for their route, let deliveries build each house's monthly bill on their own, and turn leftover milk into dahi at its real cost.",
    badges: ["Gawala slips", "Route delivery sheets", "Monthly bills on WhatsApp"],
    media: { mediaId: SHOT.dashboard, url: "app.nafaa.pk/dairy/dashboard" },
  },
  deepBlocks: [
    steps("A day at the dairy", [
      ["5 am collection", "Gawalas arrive one after another. The entry form stays open: type the litres and press Enter for the next. A quick fat test is recorded where needed."],
      ["Morning round", "Each rider takes the day sheet for his route. Houses are marked delivered, naga, or with a changed quantity, and each delivery lands on that customer's khata."],
      ["At the counter", "Sell loose milk, dahi and makhan by weight or measure, for cash or on khata."],
      ["Afternoon", "Turn unsold milk into dahi or lassi. The milk leaves stock and the product comes in at the milk's cost."],
      ["Evening and day end", "Repeat collection and the evening round, record what spoiled, and count the galla. At month end, send each house its bill on WhatsApp."],
    ]),
    shot({
      heading: "Every delivery customer's balance in one khata",
      body: "Because each delivery is posted as it happens, the monthly bill only shows what is already there. Payments taken from any screen reduce the same balance, so a customer who pays the rider and a customer who pays at the shop both stay right.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "full",
      caption: "Shared khata screen, shown with demo data.",
      callouts: [
        { x: 33, y: 19.5, label: "Total still to collect" },
        { x: 49, y: 31, label: "How long each amount has been pending" },
        { x: 90.5, y: 62, label: "Record a payment or send a WhatsApp reminder" },
      ],
    }),
    shot({
      heading: "The day's money at a glance",
      body: "From the phone in your pocket, see today's sale, the number of bills, the udhaar given and how much came in cash against online payments, even while you are out on a route.",
      id: SHOT.dashboardPhone,
      frame: "phone",
      url: "app.nafaa.pk/dashboard",
      layout: "split-right",
      caption: "Shared dashboard on a phone, shown with a demo store's data.",
      callouts: [
        { x: 50, y: 35, label: "Today's sale" },
        { x: 72, y: 52, label: "Udhaar given today" },
        { x: 50, y: 77, label: "Cash against online payments" },
      ],
    }),
    table("Copy and pencil, or Nafaa?", "How the main jobs of a dairy compare in a copy and in Nafaa.", [
      { key: "paper", label: "Copy and pencil" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Gawala milk", "Litres written in a copy, totals at month end", "Slip per collection with rate and fat bonus"],
      ["Paying gawalas", "Argued over the copy", "Statement of milk in and payments out, printed"],
      ["Home delivery", "The rider remembers who skipped", "Day sheet with delivered, naga and changed quantity"],
      ["Monthly bill", "Counted by hand from a calendar", "Built from deliveries, sent on WhatsApp"],
      ["Dahi and spoilage", "Not costed", "Made at the milk's cost; spoilage counted"],
    ]),
    prose(`## What to look for in dairy software

A milk shop has two sides that ordinary shop software ignores: it buys from many small suppliers twice a day, and it sells to many households on a monthly account. The counter is the easy part. Before you choose, check that the software can:

- **Record gawala collections quickly.** At 5 am, entry has to be as fast as writing in a copy, with each gawala's rate and fat bonus applied by itself.
- **Pay suppliers from a statement.** Milk in and payments out, for the week or the month, ready to print.
- **Run delivery by route.** A day sheet per rider, with naga and changed quantities marked on the spot.
- **Build monthly bills from deliveries.** The bill should match what was delivered without anyone adding up a calendar.
- **Cost dahi, makhan and lassi properly.** Milk turned into a product is not a loss; spoiled milk is.
- **Record quality tests.** Fat, SNF and adulteration checks protect both the shop and its customers.

Nafaa covers each of these in the dairy setup, with the counter, khata, expenses and reports every Nafaa business uses.`),
    pricing("Plans for one milk shop or several routes"),
  ],
});

/** Internal links: the products a dairy uses, related food trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'RELATED' },
    { ref: 'INDUSTRY:bakery', kind: 'RELATED' },
    { ref: 'INDUSTRY:meat', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'RELATED' },
  ],
} satisfies typeof entry;
