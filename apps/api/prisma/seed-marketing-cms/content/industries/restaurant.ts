/** Industry: Restaurant & Cafe (/industries/restaurant). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "restaurant",
  title: "Restaurant & Cafe",
  shortName: "Restaurant",
  shopNoun: "restaurants and cafes",
  romanUrduName: "Restaurant / cafe",
  group: "food",
  icon: "utensils-crossed",
  color: "#9a3412",
  colorNote: "App identity #ea580c is 3.56:1 with white text; seeded #9a3412 instead (Phase 1 issue 7); orange-700 is taken by the Shoe store identity.",
  appIndustryKey: "restaurant",
  businessType: "RESTAURANT",
  featured: true,
  sortOrder: 3,
  summary:
    "Nafaa runs dine-in, takeaway and delivery for restaurants and cafes: a table layout, kitchen order tickets (KOT) sent to each station's printer or screen, add-ons on dishes, recipes, riders for delivery, happy-hour prices, and bills paid by cash, card, wallet, split or khata.",
  builtFor: "Restaurants, cafes, dhabas and takeaways",
  romanUrdu:
    "Restaurant aur cafe ke liye: tables, har station ko apna KOT, add-ons, recipes, delivery riders, happy hour, aur bill cash, card, wallet, split ya khata par.",
  features: [
    { icon: "layout-grid", title: "Tables", body: "Every table by section: free, seated with its timer and running bill, bill printed, needs cleaning or reserved." },
    { icon: "printer", title: "KOT per station", body: "Each menu category goes to its station (grill, tandoor, karahi, bar) on a printer or kitchen screen." },
    { icon: "monitor", title: "Kitchen display", body: "Tickets move from new to cooking to ready, turning amber after 10 minutes and red after 20." },
    { icon: "sliders-horizontal", title: "Add-ons", body: "Extra cheese, no onion, spice level or size, priced on the bill and printed on the KOT." },
    { icon: "coffee", title: "Quick counter mode", body: "For cafes and fast food: take the order with a token, send it to the kitchen and take payment at once." },
    { icon: "book-open", title: "Recipes and food cost", body: "Plate cost at today's rates, food cost %, and how many plates the stock still covers." },
    { icon: "bike", title: "Riders and delivery", body: "Orders by stage from waiting for a rider to delivered, and the cash each rider still has to hand over." },
    { icon: "clock", title: "Happy hours", body: "Automatic price cuts by time, day, dish or order type, such as chai 20% off from 3 to 6." },
    { icon: "split", title: "Split, merge and part payment", body: "Move or merge tables, split the bill, and pay by cash, card, wallet, part payment or khata." },
  ],
  faqKeys: ["restaurant-stations","restaurant-split","offline","pricing"],
  evidence: [
    "apps/web/src/industries/restaurant/RestaurantPack.tsx",
    "apps/web/src/industries/restaurant/pages/TablesLayoutPage.tsx",
    "apps/web/src/industries/restaurant/pages/StationsPage.tsx",
    "apps/web/src/industries/restaurant/pages/KotDisplayPage.tsx",
    "apps/web/src/industries/restaurant/pages/ModifiersPage.tsx",
    "apps/web/src/industries/restaurant/pages/RestaurantPosPage.tsx",
    "apps/web/src/industries/restaurant/pages/RecipesPage.tsx",
    "apps/web/src/industries/restaurant/pages/RestaurantProductsListPage.tsx",
    "apps/web/src/industries/restaurant/pages/RidersPage.tsx",
    "apps/web/src/industries/restaurant/pages/DeliveryTrackingPage.tsx",
    "apps/web/src/industries/restaurant/pages/HappyHoursPage.tsx",
    "apps/web/src/industries/restaurant/pages/OrderDetailPage.tsx",
    "apps/web/src/industries/restaurant/hooks/useOrderPayment.tsx",
  ],
  dropped: [
    "Foodpanda two-way live sync (not confirmed).",
    "GPS rider tracking (not found).",
    "\"Only Pakistani POS with live Foodpanda sync\" signature.",
  ],
  needsOwner: ["Foodpanda / online orders status."],
  heroOverride: {
    heading: "The floor, the kitchen and the delivery desk in one app",
    sub: "Seat a table, send each dish to the right station, watch tickets age on the kitchen screen, hand deliveries to riders, and know the food cost of every plate on the menu.",
    badges: ["KOT per station", "Dine-in, takeaway, delivery", "Food cost %"],
    media: { mediaId: SHOT.restaurantDashboard, url: "app.nafaa.pk/restaurant/dashboard" },
  },
  deepBlocks: [
    shot({
      heading: "A kitchen screen the cooks can read from the tandoor",
      body: "Tickets arrive per station in three lanes: new, cooking and ready. Each shows the table or token, whether it is dine-in, takeaway or delivery, and how long it has waited. Dishes voided after the order show as cancel tickets, so nothing is cooked for nobody.",
      id: SHOT.kot,
      url: "app.nafaa.pk/restaurant/kot",
      layout: "full",
      callouts: [
        { x: 30, y: 18, label: "New, cooking, ready and over 20 minutes" },
        { x: 41, y: 31, label: "Minutes since the ticket came in" },
        { x: 52, y: 59, label: "Dine-in, takeaway or delivery" },
        { x: 67, y: 52, label: "One tap when the dish is ready" },
      ],
    }),
    steps("A day at the restaurant", [
      ["Before service", "Check the menu for dishes you cannot make today and mark them 86, so waiters stop selling them. Recipes show what runs out first."],
      ["Lunch", "Waiters open tables on the floor. Each dish goes to its station's printer or screen, and new dishes added later go to the kitchen on their own."],
      ["Tea time", "Happy-hour prices switch on by themselves for the hours and dishes you set; the counter does not have to remember."],
      ["Dinner and delivery", "Takeaway orders get a token. Delivery orders wait for a rider, go out, and come back as cash the rider hands over at the counter."],
      ["Closing", "See open orders, money by order type, waiter and table, and the riders who still owe cash, then count the galla."],
    ]),
    shot({
      heading: "Know what every plate costs",
      body: "The menu lists every dish with its rate, plate cost and food cost %, how many plates the stock still covers, and what sold in the last 30 days. Dishes with no recipe, a high food cost or missing raw material are counted at the top.",
      id: SHOT.restaurantMenu,
      url: "app.nafaa.pk/restaurant/menu",
      layout: "split-right",
      callouts: [
        { x: 66, y: 30, label: "Dishes that need attention" },
        { x: 64, y: 67, label: "Plate cost and food cost %" },
        { x: 70, y: 67, label: "Plates the stock still covers" },
      ],
    }),
    table("Order pad or Nafaa?", "How the main jobs of a restaurant compare on an order pad and in Nafaa.", [
      { key: "paper", label: "Order pad and memory" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Taking the order", "Written by the waiter, read aloud to the kitchen", "Tapped on the table; each dish goes to its station"],
      ["Changes and add-ons", "Scribbled notes the cook may miss", "Add-ons and notes printed on the KOT"],
      ["Slow tickets", "Noticed when the customer complains", "Timer on every ticket, red after 20 minutes"],
      ["Rider cash", "Settled from memory at night", "Each rider's cash to hand over, order by order"],
      ["Food cost", "Unknown until the month's purchases are added up", "Plate cost and food cost % on every dish"],
    ]),
    prose(`## What to look for in restaurant software

A restaurant is judged on two things at once: food that reaches the table on time and a bill that is right. A shop POS with a "table" button rarely manages both. Check that the software can:

- **Route dishes to stations.** A karahi and a mint margarita should not print on the same slip. Each category should go to its own printer or screen.
- **Show the kitchen what is late.** Tickets that change colour as they wait help a head cook more than any report.
- **Handle the floor.** Moving guests to another table, merging tables, voiding a dish and splitting the bill are daily events, not exceptions.
- **Know your food cost.** Recipes that take ingredients out of stock and show plate cost at today's rates tell you which dishes to reprice.
- **Run delivery properly.** Riders, their trips and the cash they carry need their own record.
- **Keep billing during load-shedding or a dropped connection.**

Nafaa covers each of these in the restaurant setup. Cafes and fast-food counters can use the quicker token mode on the same menu and kitchen screens.`),
    pricing("Plans for one restaurant or several branches"),
  ],
});

/** Internal links: the restaurant solution, the products a restaurant uses and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'SOLUTION:restaurants', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'RELATED' },
    { ref: 'INDUSTRY:hotel', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:kot', kind: 'RELATED' },
  ],
} satisfies typeof entry;
