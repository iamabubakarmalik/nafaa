/** Industry: Toy Store (/industries/toystore). Imported from apps/marketing and checked against the toystore pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "toystore",
  title: "Toy Store",
  shortName: "Toys",
  shopNoun: "toy stores",
  romanUrduName: "Khilonon ki dukaan",
  group: "lifestyle",
  icon: "toy-brick",
  color: "#9333ea",
  appIndustryKey: "toystore",
  businessType: "TOYSTORE",
  sortOrder: 31,
  summary:
    "Nafaa runs toy stores: filter toys by age, review safety certification, build gift packs, help parents with a gift finder, and keep children's birthdays for reminders, while the counter, stock and khata work the same as in every Nafaa shop.",
  builtFor: "Toy stores and gift shops",
  romanUrdu:
    "Khilonon ki dukaan ke liye: umar ke hisaab se khilone, safety review, gift packs, gift finder aur bachon ki saalgirah.",
  features: [
    { icon: "baby", title: "Age groups", body: "Every toy carries its age range; age chips filter the shelf at the counter." },
    { icon: "search", title: "Gift finder", body: "\"7 saal ka larka, 2000 tak\": every toy in stock that fits, best sellers first, small-parts toys left out for under-threes." },
    { icon: "gift", title: "Gift packs", body: "Eid boxes and birthday hampers at one price; each toy leaves stock and profit stays per toy." },
    { icon: "calendar", title: "Birthday reminders", body: "Each child's birth date and the parent's number, with a ready WhatsApp message before the day." },
    { icon: "shield-check", title: "Safety review", body: "Toys with small parts, no non-toxic mark or no safety certificate, worst cases first." },
    { icon: "triangle-alert", title: "Warnings at the counter", body: "Cards warn about small parts and cells not in the box before the toy is sold." },
    { icon: "sparkles", title: "Gift wrapping", body: "A one-tap gift wrap line on the bill, with no stock to count." },
    { icon: "layers", title: "Colours, models and packs", body: "Colours and models as variants; dozens and cartons for wholesale buyers." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/toystore/ToystorePack.tsx",
    "apps/web/src/industries/toystore/pos/config.ts",
    "apps/web/src/industries/toystore/pages/GiftFinderPage.tsx",
    "apps/web/src/industries/toystore/pages/ToyGiftPacksPage.tsx",
    "apps/web/src/industries/toystore/pages/GiftPackFormPage.tsx",
    "apps/web/src/industries/toystore/pages/BirthdayRemindersPage.tsx",
    "apps/web/src/industries/toystore/pages/BirthdayDetailPage.tsx",
    "apps/web/src/industries/toystore/pages/ToySafetyReviewPage.tsx",
    "apps/web/src/industries/toystore/pages/ToyProductWizardPage.tsx",
    "apps/web/src/industries/toystore/dashboard/useToystoreOps.ts",
  ],
  dropped: [],
  heroOverride: {
    heading: "The right toy for every age, and a reason to come back",
    sub: "Find a gift by age and budget in seconds, sell Eid boxes and birthday hampers as one pack, keep unsafe toys away from small children, and message parents before their child's birthday.",
    badges: ["Gift finder", "Gift packs", "Birthday reminders"],
    media: { mediaId: SHOT.inventory, url: "app.nafaa.pk/products" },
  },
  deepBlocks: [
    steps("A busy evening at the toy store", [
      ["A parent asks", "\"Seven-year-old boy, up to 2,000 rupees.\" Open the gift finder and see every toy in stock that fits, best sellers first."],
      ["A gift pack", "An aunt wants something ready for Eid. Tap the Eid box on the counter; each toy in it leaves stock at checkout."],
      ["At the counter", "The card warns that the remote car needs cells not in the box. Add the cells and a gift wrap line to the same bill."],
      ["Birthdays", "Save the child's birth date with the parent's number. A week before the day, the parent shows on the list to message, with a ready WhatsApp text and toys that fit the child's age and budget."],
    ]),
    shot({
      heading: "Every toy with its age, price and stock",
      body: "The products page shows age, type and brand under every toy, with badges for small parts and cells not in the box, Eid gift marks, and price, cost and stock on each card.",
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
      heading: "Which toys really earn",
      body: "Because a gift pack shares its price over the toys inside it, profit by product stays correct per toy. See what sells and what earns before you reorder for Eid.",
      id: SHOT.profitByProduct,
      url: "app.nafaa.pk/reports/profit",
      layout: "split-left",
      caption: "The shared profit report, shown with demo data.",
      callouts: [
        { x: 52, y: 21, label: "Gross profit and margin" },
        { x: 86, y: 62, label: "Profit per item" },
      ],
    }),
    table("Shelf memory or Nafaa?", "How the everyday jobs of a toy store compare without software and on Nafaa.", [
      { key: "paper", label: "Shelf memory" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Finding a gift", "Walk the shelves with the parent", "Gift finder by age and budget, in stock only"],
      ["Eid boxes", "Packed by hand, stock not reduced", "Gift pack at one price; every toy leaves stock"],
      ["Small parts", "Nobody checks the box", "Warning on the card and a safety review list"],
      ["Repeat customers", "Hope they remember you", "Birthday list with a ready WhatsApp message"],
      ["Profit on hampers", "Unknown", "Pack price shared over the toys, profit per toy"],
    ]),
    prose(`## What to look for in toy store software

A toy store sells to parents, relatives and friends who often do not know exactly what they want. They know the child's age, the occasion and the budget. Sales peak before Eid and around birthdays, and the safety of a toy matters more than in almost any other shop. Before you choose software, check that it can:

- **Search by age and budget.** The fastest way to close a sale is to show only what fits the child and the price, and is in stock.
- **Sell gift packs without breaking stock.** An Eid box or a birthday hamper should reduce each toy inside it and keep profit per toy.
- **Flag safety issues.** Small parts for children under three, missing non-toxic marks or certificates should be visible before a toy is sold.
- **Warn about batteries.** A customer who gets home without the cells a toy needs does not come back happy.
- **Bring parents back.** A child's birthday is a date you know a year ahead; a message with gift ideas a few days before is the most useful reminder a shop can send.
- **Handle variants and packs.** Colours and models with their own stock, and dozens or cartons for buyers who resell.

Nafaa covers each of these on the counter computer or a phone, and keeps billing during load-shedding.`),
    pricing("Plans for one shop or several"),
  ],
  writerNotes: "Screenshots are the shared products and profit screens with demo data; no toystore-specific screenshots exist yet.",
});

/** Internal links: the products toy stores use, the matching solution and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:bookstore', kind: 'RELATED' },
    { ref: 'INDUSTRY:gaming', kind: 'RELATED' },
    { ref: 'INDUSTRY:retail', kind: 'RELATED' },
    { ref: 'BLOG_POST:ramadan-eid-retail-strategy', kind: 'RELATED' },
  ],
} satisfies typeof entry;
