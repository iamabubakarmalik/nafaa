/** Industry: Bakery & Sweets (/industries/bakery). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "bakery",
  title: "Bakery & Sweets",
  shortName: "Bakery",
  shopNoun: "bakeries and sweet shops",
  romanUrduName: "Bakery / mithai ki dukaan",
  group: "food",
  icon: "cake-slice",
  color: "#be185d",
  appIndustryKey: "bakery",
  businessType: "BAKERY",
  featured: true,
  sortOrder: 2,
  summary:
    "Nafaa runs bakeries and sweet shops: take custom cake orders with an advance, plan the day's baking, keep raw materials with their cost, see each recipe's live cost, track freshness and waste, and manage wedding and event bulk orders, alongside the normal counter, stock and khata.",
  builtFor: "Bakeries, cake shops and sweet (mithai) shops",
  romanUrdu:
    "Bakery ke liye Nafaa: cake order advance ke saath, roz ki baking ka plan, raw material aur recipe ki cost, freshness aur waste ka hisaab, aur shaadi ya event ke bulk order.",
  features: [
    { icon: "cake-slice", title: "Custom cake orders", body: "Size, shape, flavour, cream, eggless or sugar-free, design photos and the message on one order, with the advance recorded." },
    { icon: "message-circle", title: "Order slips and WhatsApp", body: "Send the customer a WhatsApp confirmation and print a slip for the customer and one for the kitchen." },
    { icon: "chef-hat", title: "What to bake today", body: "Orders due that day plus the counter sale expected for that weekday, less fresh stock already on the shelf." },
    { icon: "calendar", title: "Baking plan", body: "Each day's plan moves from to-make to in the oven to made, and made goods come into stock." },
    { icon: "wheat", title: "Raw materials", body: "Flour, sugar and butter kept apart from products, with goods received, waste, counts and a shopping list for the supplier." },
    { icon: "calculator", title: "Recipe cost", body: "Each recipe is costed at today's ingredient rates, with a flag on items earning under 20%." },
    { icon: "timer", title: "Freshness and waste", body: "Batches on the shelf by time left; record what was sold cheap and what was thrown away, with the reason and the cost." },
    { icon: "users", title: "Bulk orders", body: "Weddings, offices and schools with the event date, guests, delivery and setup, and a warning when a booked order has no advance." },
  ],
  faqKeys: ["bakery-bulk","bakery-costing","offline","pricing"],
  evidence: [
    "apps/web/src/industries/bakery/BakeryPack.tsx",
    "apps/web/src/industries/bakery/pages/CakeCustomizerPage.tsx",
    "apps/web/src/industries/bakery/pages/ProductionPage.tsx",
    "apps/web/src/industries/bakery/components/production/SuggestPanel.tsx",
    "apps/web/src/industries/bakery/pages/IngredientsPage.tsx",
    "apps/web/src/industries/bakery/pages/FreshnessPage.tsx",
    "apps/web/src/industries/bakery/components/OrderDeliverModal.tsx",
    "apps/web/src/industries/bakery/products/BakeryProductEditor.tsx",
    "apps/web/src/industries/bakery/products/BakeryRawMaterials.tsx",
    "apps/web/src/industries/bakery/components/bulk/BulkViews.tsx",
  ],
  dropped: [
    "Foodpanda sync and \"Foodpanda integration included\".",
    "Photo cake print preview (not found in the app).",
    "\"Pakistan's most complete bakery platform\" claim.",
    "Key metrics (+42% revenue, -65% waste, 3 hours saved): no source.",
    "Testimonial t1 (no recorded consent).",
  ],
  needsOwner: ["Online orders (Foodpanda): apps/api/src/integrations/online-orders has Foodpanda code; confirm it is live before marketing it."],
  writerNotes: "The \"what to bake\" suggestion is now checked (SuggestPanel: orders due plus same-weekday counter sale, less fresh stock and what is already planned).",
  heroOverride: {
    heading: "Cake orders, the day's baking and the counter in one app",
    sub: "Book birthday and wedding cakes with an advance, know what to bake each morning, cost every recipe at today's flour and butter rates, and see what went to waste before it eats the profit.",
    badges: ["Cake orders with advance", "Daily baking plan", "Recipe cost"],
    media: { mediaId: SHOT.bakeryCakeOrders, url: "app.nafaa.pk/bakery/cake-orders" },
  },
  deepBlocks: [
    steps("A day at the bakery", [
      ["6 am, before the oven", "Open Baking. Nafaa lists what to make: cake orders due today plus what usually sells on this weekday, less what is still fresh on the shelf. Tick the lines and make the plan."],
      ["Morning batches", "Move each line from to-make to in the oven to made. Made goods enter stock, so the counter sells what really came out of the kitchen."],
      ["Afternoon orders", "A customer wants a 2-pound chocolate cake for Saturday with a name on it. Take the advance, send the WhatsApp confirmation, and the order joins Saturday's baking plan by itself."],
      ["Evening shelf check", "Freshness shows what is close to its end. Sell some cheap and mark it, throw the rest away with a reason, and both appear in the waste report with their cost."],
      ["Closing", "Count the galla, check the raw-material shopping list, and send it to the supplier for tomorrow."],
    ]),
    shot({
      heading: "Advances and balances on the customer's khata",
      body: "The advance on a cake or event order goes on the customer's khata the day it is paid. At hand-over the bill is made and anything still unpaid stays on the same khata, so the counter, the order and the khata always agree.",
      id: SHOT.bakeryKhata,
      url: "app.nafaa.pk/khata",
      layout: "split-right",
      callouts: [
        { x: 25, y: 19.5, label: "Total still to collect" },
        { x: 72.5, y: 20, label: "Advances held for customers" },
        { x: 89.5, y: 55.5, label: "Record a payment or send a WhatsApp reminder" },
      ],
    }),
    shot({
      heading: "See which items really earn",
      body: "Recipe costing tells you what a cake should cost to make. The profit report shows what each product actually earned after cost, so a cream cake that sells well but barely pays is easy to spot.",
      id: SHOT.bakeryProfit,
      url: "app.nafaa.pk/profit-report",
      layout: "full",
      callouts: [
        { x: 45, y: 20, label: "Gross and net profit after expenses" },
        { x: 32.5, y: 48.3, label: "By product, category or staff" },
        { x: 74.5, y: 48.3, label: "Recipe cost next to real profit" },
        { x: 84.5, y: 59, label: "Profit and margin on every product" },
      ],
    }),
    table("Order diary or Nafaa?", "How the main jobs of a bakery compare in a diary and a notebook, and in Nafaa.", [
      { key: "paper", label: "Order diary and notebook" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Cake orders", "Written in a diary, sometimes twice, sometimes not at all", "One order with size, flavour, design photos, time and advance"],
      ["Telling the kitchen", "Shouted or copied onto a chit", "A printed kitchen slip, and the order in that day's plan"],
      ["How much to bake", "Yesterday's guess", "Orders due plus the usual sale for that weekday, less fresh stock"],
      ["Ingredient cost", "Old rates in the owner's head", "Recipes costed at today's raw-material rates"],
      ["Waste", "Thrown away and never counted", "Recorded with reason and cost, by day"],
    ]),
    prose(`## What to look for in bakery software

A bakery is a small factory and a shop at once. Goods are made every morning, last a day or two, and many of the biggest sales are booked days ahead. Software built only for a counter misses most of that. Check that it can:

- **Take a proper cake order.** Size, flavour, eggless or sugar-free, the message, reference photos, pickup or delivery time, and the advance, on one screen, with a slip for the kitchen.
- **Plan the morning's baking.** It should add up orders due that day and the normal counter sale, and subtract what is still fresh, so you bake less waste.
- **Keep raw materials apart from products.** Flour and sugar are bought by the bag and used by the gram; finished goods are sold by the piece or the pound.
- **Cost recipes at today's prices.** When butter goes up, you should see which items stop paying before the month ends.
- **Count waste honestly.** What was sold cheap and what was thrown away, with the reason, so you can bake closer to demand.
- **Handle wedding and office orders.** Event date, guests, delivery, setup and advances, with a clear list of what is still to collect.

Nafaa does each of these in the bakery setup, alongside the same counter, khata and reports every Nafaa business uses.`),
    pricing("Plans for one bakery or several branches"),
  ],
});

/** Internal links: the products a bakery uses, the food solution and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'SOLUTION:manufacturing', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'RELATED' },
    { ref: 'INDUSTRY:dairy', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:batch-tracking', kind: 'RELATED' },
  ],
} satisfies typeof entry;
