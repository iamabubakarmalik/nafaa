/** Industry: Furniture Shop (/industries/furniture). Imported from apps/marketing and checked against the furniture pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "furniture",
  title: "Furniture Shop",
  shortName: "Furniture",
  shopNoun: "furniture showrooms and workshops",
  romanUrduName: "Furniture ki dukaan",
  group: "specialty",
  icon: "armchair",
  color: "#78350f",
  appIndustryKey: "furniture",
  businessType: "FURNITURE",
  sortOrder: 24,
  summary:
    "Nafaa runs furniture showrooms with their own workshops: custom orders against a deposit, karigar workload, and large deliveries with assembly, together with ready stock at the showroom counter, a khata for customers who pay in parts, and reports. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Furniture showrooms and workshops",
  romanUrdu:
    "Furniture ke liye: deposit ke saath custom order, karigar ka kaam, badi delivery aur assembly, aur showroom ka stock.",
  features: [
    { icon: "clipboard-list", title: "Custom orders", body: "Design, wood, polish, fabric, size and sketch, with a price, the advance asked and the days to make it." },
    { icon: "hand-coins", title: "Advances on the khata", body: "Each advance goes to the drawer and the customer's khata the day it comes in; the bill is made when the furniture leaves." },
    { icon: "hammer", title: "Karigar workload", body: "Who is making what, how much is on each bench, and their progress on every order." },
    { icon: "wallet", title: "Karigar pay", body: "Daily wage, per-job rate or advance paid from the drawer is saved as an expense, so profit sees it." },
    { icon: "truck", title: "Delivery and fitting", body: "Date, vehicle and driver, out, reached, delivered or fitted, with transport, floors and fitting charges billed." },
    { icon: "armchair", title: "Showroom stock", body: "Sofas, beds and almari with wood, polish and fabric; colours and fabrics as variants with their own stock." },
    { icon: "tag", title: "Display pieces", body: "Mark new and showroom display pieces, and filter the counter by room: sofa, bedroom, dining." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/furniture/FurniturePack.tsx",
    "apps/web/src/industries/furniture/pos/config.ts",
    "apps/web/src/industries/furniture/pages/FurniturePosPage.tsx",
    "apps/web/src/industries/furniture/pages/CustomOrdersPage.tsx",
    "apps/web/src/industries/furniture/pages/CustomOrderFormPage.tsx",
    "apps/web/src/industries/furniture/pages/CustomOrderDetailPage.tsx",
    "apps/web/src/industries/furniture/pages/CarpentersPage.tsx",
    "apps/web/src/industries/furniture/pages/DeliveriesPage.tsx",
    "apps/web/src/industries/furniture/pages/FurnitureProductWizardPage.tsx",
  ],
  dropped: [],
  heroOverride: {
    heading: "Showroom sales, made-to-order work and deliveries in one place",
    sub: "Quote a custom bed, take the advance, put a karigar on it, follow it to the customer's door and bill it when it leaves, while the showroom keeps selling ready stock.",
    badges: ["Custom orders", "Karigar pay", "Delivery and fitting"],
    media: { mediaId: SHOT.khata, url: "app.nafaa.pk/khata" },
  },
  deepBlocks: [
    steps("A custom order from quote to delivery", [
      ["Quotation", "Write the design, wood, polish, fabric and size, attach a sketch, set the price with fitting and print the quotation slip."],
      ["Advance", "The customer agrees and pays an advance. It goes to the drawer and the khata at once; the price is fixed from here."],
      ["Making", "Put a karigar on the order and follow its progress on his bench, with the days promised to the customer."],
      ["Delivery", "Book the vehicle and driver. When the order is marked delivered the bill is made, and the advance already counts against it."],
    ]),
    shot({
      heading: "Customers who pay in parts, on one khata",
      body: "Furniture is rarely paid in one go. Advances, part payments and delivery charges all land on the customer's khata, so you see what is still owed on every order and can remind politely on WhatsApp.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "full",
      caption: "The shared khata, shown with demo shop data.",
      callouts: [
        { x: 25, y: 19, label: "Total to collect" },
        { x: 58, y: 30, label: "Balances by age" },
        { x: 90, y: 55, label: "Payment or reminder" },
      ],
    }),
    shot({
      heading: "Profit after the karigar is paid",
      body: "Because karigar pay is saved as an expense, the profit and loss statement shows what the business really kept after wood, fabric, labour and transport.",
      id: SHOT.profitLoss,
      url: "app.nafaa.pk/reports/pnl",
      layout: "split-left",
      caption: "The shared profit and loss report, shown with demo shop data.",
      callouts: [
        { x: 25, y: 19, label: "Net profit after expenses" },
        { x: 70, y: 31, label: "Expenses for the period" },
        { x: 87, y: 70, label: "Where each rupee of sale went" },
      ],
    }),
    table("Order diary or Nafaa?", "How the everyday jobs of a furniture business compare on paper and on Nafaa.", [
      { key: "paper", label: "Order diary and receipts" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Custom order details", "A page with a rough sketch", "Design, wood, polish, fabric, size and sketch on the order"],
      ["Advances", "A receipt book the customer may lose", "On the drawer and the khata the day they are paid"],
      ["Who is making what", "Ask in the workshop", "Each karigar's bench and progress on one page"],
      ["Karigar wages", "Cash from the galla, not counted in profit", "Saved as an expense and seen in profit"],
      ["Delivery charges", "Added later or forgotten", "Billed with transport, floors and fitting"],
    ]),
    prose(`## What to look for in furniture shop software

A furniture business is part shop and part workshop. Ready pieces sell from the showroom, but much of the money is in made-to-order work that takes weeks, is paid in instalments and ends with a truck and two fitters at the customer's house. Before you choose software, check that it can:

- **Run a custom order end to end.** Quotation, advance, making, ready and delivery, with design details and a sketch, not a note in a diary.
- **Treat advances as money received.** An advance should be in the cash count and on the customer's khata the day it arrives, and count against the bill later.
- **Show the workshop.** Which karigar has which order and how far along it is, so promised dates are realistic.
- **Count labour as a cost.** Wages and per-job pay handed from the drawer should reach profit, or the margin you see is not the margin you make.
- **Handle delivery and fitting.** Vehicle, driver, floors and fitting charges billed properly.
- **Know your showroom stock.** Colours and fabrics as variants, and display pieces marked so they are sold as such.

Nafaa covers each of these on a phone or computer, with the same counter, khata and reports as every Nafaa business.`),
    pricing("Plans for one showroom or several"),
  ],
  writerNotes: "Screenshots are the shared khata and P&L with demo data; no furniture-specific screenshots exist yet.",
});

/** Internal links: the products furniture businesses use, the matching solutions and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'SOLUTION:manufacturing', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:carpet', kind: 'RELATED' },
    { ref: 'INDUSTRY:appliances', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'RELATED' },
  ],
} satisfies typeof entry;
