/** Industry: Jewellery & Sonar (/industries/jewelry). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "jewelry",
  title: "Jewellery & Sonar",
  shortName: "Jewellery",
  shopNoun: "jewellery shops",
  romanUrduName: "Sonar / zewar ki dukaan",
  group: "specialty",
  icon: "gem",
  color: "#854d0e",
  appIndustryKey: "jewelry",
  businessType: "JEWELRY",
  featured: true,
  sortOrder: 14,
  summary:
    "Nafaa runs jewellery shops: set today's gold and silver rate, keep each piece with its metal and stones, sell at the counter, take custom orders, buy back old gold, handle repairs, track work given to karigars, and keep metal stock by weight.",
  builtFor: "Jewellers, sonars and gold and silver shops",
  romanUrdu:
    "Sonar ke liye Nafaa: aaj ka rate, har zewar ka metal aur nageena, custom order, purana sona, repair, karigar ka kaam aur metal ka stock.",
  features: [
    { icon: "coins", title: "Today's rate", body: "Type the 24K rate per tola or per gram; 22K, 21K and 18K follow from their purity and can be changed." },
    { icon: "gem", title: "Pieces with metal and stones", body: "Karat, gross, stone and net weight, banwai, kaat, polish and hallmark charges, and stones on each piece." },
    { icon: "calculator", title: "Counter priced by weight", body: "Every piece is priced at today's rate for its karat; the cashier can change the rate or banwai while bargaining." },
    { icon: "repeat", title: "Old gold", body: "Weigh, test the karat, take off the stones and value at the buying rate less kaat, with a slip carrying the customer's CNIC." },
    { icon: "clipboard-list", title: "Custom orders", body: "Made-to-order pieces with the advance in cash or old gold, the karigar, the due date and money still to come." },
    { icon: "hammer", title: "Karigar accounts", body: "Gold given to each karigar, what came back with wastage allowed, and the labour owed." },
    { icon: "wrench", title: "Repairs", body: "The customer's piece with its weight and karat, the promised day, the charge and any advance." },
    { icon: "boxes", title: "Metal stock", body: "Kachcha sona and chandi by karat, its value at today's rate, and every movement in and out of the safe." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: [
    "apps/web/src/industries/jewelry/JewelryPack.tsx",
    "apps/web/src/industries/jewelry/pages/MetalRatesPage.tsx",
    "apps/web/src/industries/jewelry/pages/JewelryItemWizardPage.tsx",
    "apps/web/src/industries/jewelry/pages/JewelryItemDetailPage.tsx",
    "apps/web/src/industries/jewelry/pages/JewelryPosPage.tsx",
    "apps/web/src/industries/jewelry/pages/ExchangesPage.tsx",
    "apps/web/src/industries/jewelry/pages/CustomOrdersPage.tsx",
    "apps/web/src/industries/jewelry/pages/KarigarsPage.tsx",
    "apps/web/src/industries/jewelry/pages/RepairsPage.tsx",
    "apps/web/src/industries/jewelry/pages/MetalStockPage.tsx",
    "apps/web/src/industries/jewelry/pages/JewelrySalesPage.tsx",
  ],
  dropped: [
  ],
  heroOverride: {
    heading: "Today's rate, every tola and every karigar in one app",
    sub: "Set the 24K rate once and price every piece by its weight, banwai and stones, take old gold in at the counter, and know how much gold each karigar is holding.",
    badges: ["Daily gold rate", "Old gold exchange", "Karigar accounts"],
    media: { mediaId: SHOT.dashboard, url: "app.nafaa.pk/jewelry/dashboard" },
  },
  deepBlocks: [
    steps("A day at the jewellery shop", [
      ["Morning", "Type today's 24K rate as the market quotes it. 22K, 21K and 18K, and the buying rate for old gold, follow from it, and every piece on the shelf is repriced."],
      ["A bride's family arrives", "Pick the set at the counter. Its price shows weight at today's rate plus banwai, kaat and stones. Bargain on banwai if you choose."],
      ["Old gold against new", "Weigh their old bangles, test the karat and value them at the buying rate. The old gold pays part of the new bill and goes into metal stock."],
      ["A custom order", "Book a necklace with an advance, give 50 grams to the karigar, and watch the order move from karigar to ready."],
      ["Closing", "Check metal stock in the safe by karat, gold still with each karigar, and count the galla."],
    ]),
    shot({
      heading: "Advances and balances on the khata",
      body: "Custom orders and repairs often start with an advance, and families pay off a wedding set over weeks. Advances and balances sit on the customer's khata, with the age of each amount and a reminder one tap away.",
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
      heading: "Profit after cost, not just weight sold",
      body: "Gold moves a lot of money on a thin margin, so turnover says little. The profit and loss statement shows net sale, gross profit, expenses and net profit for any period, next to the period before.",
      id: SHOT.profitLoss,
      url: "app.nafaa.pk/reports/profit-loss",
      layout: "split-right",
      caption: "Shared report, shown with a demo store's data.",
      callouts: [
        { x: 25, y: 19, label: "Net profit for the period" },
        { x: 64, y: 30, label: "Expenses" },
        { x: 67, y: 54, label: "Compared with the period before" },
        { x: 87, y: 70, label: "Where each 100 rupees of sale went" },
      ],
    }),
    table("Kacha register or Nafaa?", "How the main jobs of a jewellery shop compare in a register and in Nafaa.", [
      { key: "paper", label: "Register and calculator" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Today's rate", "Written on a board, worked out per karat by hand", "24K typed once; other karats follow"],
      ["Pricing a piece", "Weight × rate + banwai on a calculator", "Priced by itself from the piece's weights and charges"],
      ["Old gold", "Valued by hand, slip written", "Weight, karat, kaat and CNIC on a printed slip"],
      ["Karigar gold", "A notebook that only the owner understands", "Gold given, returned and wastage per karigar"],
      ["Metal in the safe", "Weighed when someone remembers", "Every movement recorded, value at today's rate"],
    ]),
    prose(`## What to look for in jewellery software

A jeweller's stock changes value every morning with the gold rate, and much of the business happens in weight rather than in pieces. A normal shop POS with fixed prices cannot handle it. Before you choose, check that the software can:

- **Price from the day's rate.** One 24K rate should reprice every piece by karat, weight, banwai, kaat and stones.
- **Let the counter bargain.** Banwai and the rate are often negotiated; the software should allow it without breaking the record.
- **Take old gold properly.** Weight, karat test, stones removed, kaat and the customer's CNIC, whether bought for cash or taken against a new piece.
- **Track gold with karigars.** Gold given out, pieces and leftover gold returned, wastage allowed and labour owed.
- **Keep metal stock by karat.** The safe should match the books, at today's value.
- **Handle custom orders and repairs.** With advances, due dates and the karigar on each job.

Nafaa covers each of these in the jewellery setup, with the khata, expenses and reports every Nafaa business uses.`),
    pricing("Plans for one shop or several counters"),
  ],
});

/** Internal links: the products a jeweller uses, the gold rate article and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'BLOG_POST:gold-rate-pricing-jewelry-shops', kind: 'RELATED' },
    { ref: 'INDUSTRY:garments', kind: 'RELATED' },
    { ref: 'INDUSTRY:cosmetics', kind: 'RELATED' },
  ],
} satisfies typeof entry;
