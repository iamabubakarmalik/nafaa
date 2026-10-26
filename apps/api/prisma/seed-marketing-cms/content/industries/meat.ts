/** Industry: Meat & Butcher Shop (/industries/meat). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "meat",
  title: "Meat & Butcher Shop",
  shortName: "Meat",
  shopNoun: "meat and butcher shops",
  romanUrduName: "Gosht ki dukaan",
  group: "food",
  icon: "beef",
  color: "#991b1b",
  appIndustryKey: "meat",
  businessType: "MEAT",
  sortOrder: 12,
  summary:
    "Nafaa runs meat and butcher shops: set today's rate, take orders by weight, keep live animals bought from the mandi, record halal slaughter and cutting, supply restaurants and hotels on account, and handle Qurbani and Aqeeqa orders, alongside the counter, stock and khata.",
  builtFor: "Butchers, meat shops and meat suppliers",
  romanUrdu:
    "Gosht ki dukaan ke liye: aaj ka rate, wazan wale order, mandi se zinda maal, halal zibah aur cutting, restaurant aur hotel ko supply, aur Qurbani aur Aqeeqa ke order.",
  features: [
    { icon: "tag", title: "Today's rate", body: "Change every item's counter rate and restaurant rate together each morning; the counter uses them at once." },
    { icon: "calculator", title: "Orders by weight", body: "A family's Eid order or a home delivery: cuts with kg and rate, an advance, and the weighed kg billed at hand-over." },
    { icon: "beef", title: "Live animals and mandi", body: "Birds by weight or tagged animals bought from the mandi, with the money on the supplier's khata and the live kg in stock at cost." },
    { icon: "shield-check", title: "Halal slaughter log", body: "Each slaughter is recorded with its halal details; dressed meat, offal and bones come into stock at the same total cost." },
    { icon: "scissors", title: "Cutting jobs", body: "A carcass becomes boneless, qeema, chops and bones, each with its share of the cost, and yield summed per period." },
    { icon: "building-2", title: "Restaurant and hotel accounts", body: "A khata with credit limit, agreed discount and delivery days; the counter switches to the restaurant rate for them." },
    { icon: "repeat", title: "Supply plans", body: "A hotel's daily chicken or a family's weekly mutton, made into the day's order at today's rate with one tap." },
    { icon: "calendar", title: "Qurbani and Aqeeqa", body: "Shares of a cow or camel (up to seven) or a whole goat, with advances on the customer's khata. Switched on by the shop." },
    { icon: "clipboard-check", title: "Day close", body: "Per item: what was there in the morning, what came in, what was sold or wasted, and what is left." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: [
    "apps/web/src/industries/meat/MeatPack.tsx",
    "apps/web/src/industries/meat/pages/MeatRatesPage.tsx",
    "apps/web/src/industries/meat/pos/CounterRate.tsx",
    "apps/web/src/industries/meat/pages/NewWeightOrderPage.tsx",
    "apps/web/src/industries/meat/pages/WeightOrdersPage.tsx",
    "apps/web/src/industries/meat/pages/LiveAnimalsPage.tsx",
    "apps/web/src/industries/meat/pages/SlaughterLogPage.tsx",
    "apps/web/src/industries/meat/pages/CuttingJobsPage.tsx",
    "apps/web/src/industries/meat/pages/WholesalePage.tsx",
    "apps/web/src/industries/meat/pages/SubscriptionsPage.tsx",
    "apps/web/src/industries/meat/pages/QurbaniPage.tsx",
    "apps/web/src/industries/meat/pages/MeatProductWizardPage.tsx",
  ],
  dropped: [
    "\"Halal certification\" wording (the app records halal slaughter; it does not certify).",
  ],
  heroOverride: {
    heading: "Today's rate, the mandi and the cutting table in one app",
    sub: "Set the chicken and mutton rate each morning, bring mandi purchases into stock at cost, see what a carcass really yields, and supply restaurants on account at their own rate.",
    badges: ["Daily rates", "Mandi to cuts", "Restaurant accounts"],
    media: { mediaId: SHOT.meatRates, url: "app.nafaa.pk/meat/rates" },
  },
  deepBlocks: [
    steps("A day at the meat shop", [
      ["Early morning", "Enter the mandi purchase: birds by weight or tagged goats, with the money on the supplier's khata. Then set today's counter and restaurant rates in one list."],
      ["Slaughter and cutting", "Record the slaughter with its halal details, then a cutting job: the input kg becomes boneless, qeema, chops and bones, each costed by its sale value."],
      ["Supply plans", "Tap \"Aaj ka order\" on each hotel's plan. It becomes a weight order at today's rate with the agreed discount, ready to weigh and bill."],
      ["At the counter", "Sell by the kilo or the pao. When a restaurant account is picked, the counter uses the restaurant rate and the bill goes on its khata."],
      ["Day close", "See each item from morning stock to what came in, what sold, what was wasted and what is left, then count the galla."],
    ]),
    shot({
      heading: "Restaurant accounts on weekly credit",
      body: "Hotels and karahi shops take meat every morning and pay by the week. Each restaurant account has a credit limit and a delivery time, and shows its udhaar against the limit, how many bills are open and a button to record the payment.",
      id: SHOT.meatWholesale,
      url: "app.nafaa.pk/meat/wholesale",
      layout: "full",
      callouts: [
        { x: 30.5, y: 20.3, label: "Total udhaar from restaurants" },
        { x: 32.5, y: 63.6, label: "Delivery time for each account" },
        { x: 65, y: 55.6, label: "Udhaar against the credit limit" },
        { x: 77, y: 55.6, label: "Record a payment" },
      ],
    }),
    shot({
      heading: "Orders by weight, with the advance",
      body: "A walima order for 40 kg of beef or a family's dawat order is written with the cuts, the kilos, the cutting style and the delivery address, and the advance is taken. When the meat is weighed, the bill uses the actual weight and deducts the advance.",
      id: SHOT.meatOrders,
      url: "app.nafaa.pk/meat/weight-orders",
      layout: "split-right",
      callouts: [
        { x: 39.4, y: 24.3, label: "Advance taken on open orders" },
        { x: 28.8, y: 61.3, label: "Cuts and kilos on each order" },
        { x: 30.6, y: 67.2, label: "Weigh the actual cut" },
        { x: 46.3, y: 67.2, label: "Bill it, advance deducted" },
        { x: 77.5, y: 67.2, label: "Print the cutting slip" },
      ],
    }),
    table("Rough book or Nafaa?", "How the main jobs of a meat shop compare in a rough book and in Nafaa.", [
      { key: "paper", label: "Rough book" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Daily rate", "Told to each worker, changed by mouth", "One list for counter and restaurant rates"],
      ["Mandi purchase", "Cash paid, weight forgotten", "Live kg in stock at cost, money on the supplier khata"],
      ["Yield", "Unknown", "Input kg against each cut, per job and per period"],
      ["Restaurant supply", "A diary of daily deliveries", "Account with limit, discount, delivery days and khata"],
      ["Qurbani shares", "Names on a sheet, advances in a drawer", "Shares per animal, advances on each customer's khata"],
    ]),
    prose(`## What to look for in meat shop software

A butcher buys live, sells by weight, and changes prices more often than almost any other shop. Chicken can move every day. A general POS that sells "1 piece of mutton" cannot keep up. Before you choose, check that it can:

- **Change rates in one place.** Counter and restaurant rates for every item, set each morning and used by the counter at once.
- **Bring mandi purchases into stock.** Live birds by weight and tagged animals, at what you paid, with the supplier's account updated.
- **Follow the meat from animal to cut.** Slaughter and cutting should move cost from the live animal to dressed meat to each cut, so profit per cut is real.
- **Show yield.** How many kilos of saleable meat a carcass gave is the number that decides whether the mandi price was fair.
- **Run supply accounts.** Restaurants and hotels need their own rate, credit limit and delivery days.
- **Take orders by weight.** Eid and wedding orders are booked by kilos and billed on the weighed amount.

Nafaa covers each of these in the meat setup. Qurbani and Aqeeqa bookings are there for shops that switch them on in the season.`),
    pricing("Plans for one shop or a meat supply business"),
  ],
});

/** Internal links: the products a meat shop uses, related food trades. */
export default {
  ...entry,
  seoDescription: 'Software for meat and butcher shops: today\'s rate, orders by weight, live animals from the mandi, restaurant accounts, and Qurbani and Aqeeqa orders.',
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'TAG' },
    { ref: 'INDUSTRY:dairy', kind: 'RELATED' },
    { ref: 'INDUSTRY:restaurant', kind: 'RELATED' },
    { ref: 'INDUSTRY:kiryana', kind: 'RELATED' },
  ],
} satisfies typeof entry;
