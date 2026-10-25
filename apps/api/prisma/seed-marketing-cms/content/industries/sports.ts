/** Industry: Sports Goods Shop (/industries/sports). Imported from apps/marketing and checked against the sports pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "sports",
  title: "Sports Goods Shop",
  shortName: "Sports",
  shopNoun: "sports goods shops",
  romanUrduName: "Sports ka saman",
  group: "lifestyle",
  icon: "trophy",
  color: "#15803d",
  appIndustryKey: "sports",
  businessType: "SPORTS",
  sortOrder: 30,
  summary:
    "Nafaa runs sports goods shops that sell cricket, football and gym equipment: team orders with printing and an advance, bat and racket repairs, and brand records, alongside the counter, stock, khata and reports that every Nafaa shop uses. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Sports goods shops",
  romanUrdu:
    "Sports ki dukaan ke liye: cricket, football aur gym ka saman, printing aur advance ke saath team order, aur bat aur racket ki repair.",
  features: [
    { icon: "users", title: "Team and school orders", body: "Kit lines with size, rate and printing per piece, and each player's name, number and size." },
    { icon: "hand-coins", title: "Advance on the team's khata", body: "Payments sit on the team's khata as advance; the bill is made on delivery and stock leaves then." },
    { icon: "badge-percent", title: "Team rate", body: "Set a team rate with a minimum quantity; a counter line at that quantity moves to the team rate by itself." },
    { icon: "shirt", title: "Kits and shoes in sizes", body: "Each size is a variant with its own barcode and stock." },
    { icon: "wrench", title: "Repair desk", body: "Bat repair, grip, racket stringing, ball and shoe work, with an estimate, an advance and photos at intake." },
    { icon: "trophy", title: "Sport, type and age group", body: "Bat, ball and kit details on each item, with sport filters at the counter and Sale, New and Pro marks." },
    { icon: "tags", title: "Brands", body: "One brand list for the product editor, filters and reports." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/sports/SportsPack.tsx",
    "apps/web/src/industries/sports/pos/config.ts",
    "apps/web/src/industries/sports/pages/TeamOrderFormPage.tsx",
    "apps/web/src/industries/sports/pages/TeamOrdersPage.tsx",
    "apps/web/src/industries/sports/components/TeamOrderModal.tsx",
    "apps/web/src/industries/sports/pages/RepairServicesPage.tsx",
    "apps/web/src/industries/sports/components/RepairModals.tsx",
    "apps/web/src/industries/sports/pages/SportsProductWizardPage.tsx",
    "apps/web/src/industries/sports/pages/SportsProductsPage.tsx",
    "apps/web/src/industries/sports/pages/SportsBrandsPage.tsx",
  ],
  dropped: [
    "\"Sialkot exports\" feature (not in the app).",
  ],
  heroOverride: {
    heading: "Team kits, repairs and the counter for your sports shop",
    sub: "Take a school's kit order with every player's name and number, hold the advance on the team's khata, string rackets and fix bats at the repair desk, and sell kits and shoes by size.",
    badges: ["Team orders with printing", "Team rate", "Repair desk"],
    media: { mediaId: SHOT.inventory, url: "app.nafaa.pk/products" },
  },
  deepBlocks: [
    steps("A school team order, start to finish", [
      ["The order", "The sports teacher orders 15 kits. Add the shirt and shorts lines with sizes and printing, then each player's name, number and size."],
      ["Advance", "Take the advance; it goes on the school's khata. Print the order for the printer."],
      ["Delivery", "When the kits are ready, deliver the order. The bill is made now and stock leaves now, with the advance already counted."],
      ["Balance", "Anything not paid stays on the school's khata, with a WhatsApp reminder when it is due."],
    ]),
    shot({
      heading: "Bats, balls, kits and shoes, priced and counted",
      body: "The products page shows the sport and type on each card, the team rate and Sale marks, and sizes with their stock for kits and shoes, with the total stock value at the top.",
      id: SHOT.inventory,
      url: "app.nafaa.pk/products",
      layout: "full",
      caption: "The shared products page, shown with demo data.",
      callouts: [
        { x: 26, y: 19, label: "Stock value at cost" },
        { x: 40, y: 33, label: "Items running low" },
        { x: 30, y: 80, label: "Price, cost and margin per item" },
      ],
    }),
    shot({
      heading: "Schools, clubs and academies on khata",
      body: "Teams pay in parts. Every advance and delivery bill lands on the team's khata, so you see who still owes for last season's kits and can remind them politely.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "split-right",
      caption: "The shared khata, shown with demo data.",
      callouts: [
        { x: 25, y: 19, label: "Total to collect" },
        { x: 90, y: 55, label: "Payment or reminder" },
      ],
    }),
    table("Order book or Nafaa?", "How the everyday jobs of a sports shop compare on paper and on Nafaa.", [
      { key: "paper", label: "Order book and receipts" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Player names and numbers", "A handwritten list for the printer", "On the order with sizes, printed from there"],
      ["Team advance", "A receipt slip", "On the team's khata, counted against the bill"],
      ["Team price", "Worked out at the counter each time", "Applied by itself at the team quantity"],
      ["Sizes", "Count every box to find a medium", "Stock per size, each with its barcode"],
      ["Repairs", "Bats tagged with paper, advance remembered", "Job with estimate, advance, photos and status"],
    ]),
    prose(`## What to look for in sports shop software

A sports shop has two kinds of customers. Walk-in buyers want a bat, a football or shoes in their size, and teams, schools and academies want twenty kits with names and numbers, on credit, before the tournament starts. Before you choose software, check that it can:

- **Handle sizes properly.** Kits and shoes need stock per size with their own barcodes, or the counter will sell what is not there.
- **Run team orders.** Kit lines, printing per piece and a players' list with names, numbers and sizes, with an advance taken and the bill made only on delivery.
- **Give team rates automatically.** A minimum quantity and a team rate that the counter applies by itself, so the price does not depend on who is at the counter.
- **Keep teams on khata.** Schools and clubs often pay over weeks; their balances need to be clear and easy to remind.
- **Run a repair desk.** Bat repair, grips and racket stringing with an estimate, an advance and the parts used billed together.
- **Know your brands.** Sales and stock by brand show what to reorder before the season.

Nafaa does this on the phone or computer at your counter, and keeps billing when the internet drops.`),
    pricing("Plans for one shop or several"),
  ],
  writerNotes: "Screenshots are the shared products and khata screens with demo data; no sports-specific screenshots exist yet. Jersey name and number printing is now in the app (TeamOrderFormPage).",
});

/** Internal links: the products sports shops use, the matching solution and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'CITY:sialkot', kind: 'TAG' },
    { ref: 'INDUSTRY:gym', kind: 'RELATED' },
    { ref: 'INDUSTRY:shoe', kind: 'RELATED' },
    { ref: 'INDUSTRY:garments', kind: 'RELATED' },
  ],
} satisfies typeof entry;
