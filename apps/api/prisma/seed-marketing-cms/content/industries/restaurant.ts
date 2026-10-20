/** Industry: Restaurant & Cafe (/industries/restaurant). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
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
    { icon: "layout-grid", title: "Tables", body: "See every table on a layout and open its order." },
    { icon: "printer", title: "KOT per station", body: "Each menu category goes to its station (grill, tandoor, bar) on a printer or kitchen screen." },
    { icon: "monitor", title: "Kitchen display", body: "Tickets move from new to cooking to ready, with the minutes since each came in." },
    { icon: "sliders-horizontal", title: "Add-ons", body: "Options and add-ons on dishes, priced on the bill and printed on the KOT." },
    { icon: "truck", title: "Delivery riders", body: "Assign riders and follow delivery orders." },
    { icon: "split", title: "Split and part payment", body: "Pay by cash, card, wallet, split, part payment or khata." },
  ],
  faqKeys: ["restaurant-stations","restaurant-split","offline","pricing"],
  evidence: ["apps/web/src/industries/restaurant/RestaurantPack.tsx","apps/web/src/industries/restaurant/pages/StationsPage.tsx","apps/web/src/industries/restaurant/pages/KotDisplayPage.tsx","apps/web/src/industries/restaurant/hooks/useOrderPayment.tsx"],
  dropped: [
    "Foodpanda two-way live sync (not confirmed).",
    "GPS rider tracking (not found).",
    "\"Only Pakistani POS with live Foodpanda sync\" signature.",
  ],
  needsOwner: ["Foodpanda / online orders status."],
});
