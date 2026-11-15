/**
 * Buyer checklist for restaurant POS: tables, KOT and kitchen stations,
 * modifiers, split bills, delivery and delivery-app orders, recipes and cost.
 */
import { SHOT, diagram, prose, shot } from '../../main-pages/_build';
import { mdTable, sourcesBlock, srcChecked, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [srcChecked('Point of sale', 'https://en.wikipedia.org/wiki/Point_of_sale', 'Wikipedia', '2026-11-15')];

const spec: PostSpec = {
  slug: 'restaurant-pos-checklist-kot-tables-delivery',
  title: 'Restaurant POS Checklist: KOT, Tables and Delivery',
  summary:
    'A restaurant POS must manage tables and running bills, send orders to the right kitchen station as a KOT, handle modifiers and split bills, track delivery and delivery-app orders and show food cost. This checklist covers each area with a test you can run in a trial before you choose a system.',
  category: 'industry',
  cover: PHOTO.restaurantPosChecklistKotTablesDelivery,
  tags: ['INDUSTRY:restaurant', 'GLOSSARY_TERM:kot', 'GLOSSARY_TERM:split-bill'],
  related: [
    'INDUSTRY:restaurant',
    'SOLUTION:restaurants',
    'BLOG_POST:restaurant-kot-system-guide',
    'BLOG_POST:restaurant-menu-engineering',
    'TOOL:food-cost-calculator',
    'GLOSSARY_TERM:recipe-costing',
    'GLOSSARY_TERM:modifiers',
    'PAGE:restaurant-billing-software',
  ],
  isNew: true,
  seoTitle: 'Restaurant POS Checklist: KOT, Tables, Delivery',
  seoDescription:
    'What to test in a restaurant POS in Pakistan: tables, KOT to the kitchen, modifiers, split bills, delivery riders, delivery-app orders and food cost.',
  focusKeyword: 'restaurant pos checklist',
  sources: SOURCES,
  blocks: [
    prose(`A restaurant POS has a harder job than a shop POS. A shop bills once at the counter. A restaurant takes an order, sends it to a kitchen that works in stations, adds items to the same table over an hour, splits bills five ways and sends food out in boxes to a rider. If the software is built for a shop and given a "restaurant mode", the waiter and the kitchen will both feel it by the second evening.

This checklist is for restaurant owners and managers choosing a POS. It follows the order of a meal, from the table to the bill to delivery, and each section ends with something to test. If you want the background on order tickets, our [restaurant KOT system guide](/blog/restaurant-kot-system-guide) is the companion.

## 1. Tables and the running bill

Dine-in has a basic rule: the bill is not made when the customer sits; it grows through the meal and is closed at the end.

Check:

- **A table layout** that shows free, occupied and waiting-for-bill tables at a glance.
- **A running bill per table,** where a waiter can add items to the same table any number of times.
- **Moving and merging tables,** because customers change their mind.
- **Table transfer between waiters,** at a change of shift.
- **Hold and recall** for takeaway customers waiting for a call.

Test: open a add items three times over ten minutes, move the party to another table and add a drink. The bill should be one bill, correct.

## 2. KOT: the kitchen order ticket

A kitchen order ticket, or [KOT](/glossary/kot), is what tells the kitchen what to cook. Where you run a grill, a tandoor, a curry station and a drink counter, one ticket for the whole order is not enough: the grill needs only its items.

Check:

- **Tickets split by station,** so the grill, tandoor and bar each get their own items.
- **Only new items print** when a table adds to its order, not the whole order again.
- **A printer per station,** or a kitchen screen. A screen replaces paper with colour states: new, cooking, ready.
- **Void and change after sending,** with a reason and a name, because a cancelled dish is a loss that someone should answer for.
- **Order timing,** so the waiter and manager see which tables are waiting too long.
- **Course or hold,** if you serve starters first and mains later.

Test: send an order with a drink, a grill item and a curry. Check that each station gets only its part, then add one more item and see that only the new one prints.`),
    diagram(
      'Each station gets its own part of the order and reports back; the waiter sees the table update.',
      {
        kind: 'flow',
        nodes: [
          { id: 'table', label: 'Table order', icon: 'utensils-crossed', note: 'Waiter or counter' },
          { id: 'kot', label: 'KOT by station', icon: 'receipt-text', note: 'Grill, curry, bar' },
          { id: 'kitchen', label: 'Kitchen', icon: 'chef-hat', note: 'New, cooking, ready' },
          { id: 'serve', label: 'Served', icon: 'bell-ring', note: 'Running bill updates' },
          { id: 'bill', label: 'Bill and pay', icon: 'wallet', note: 'Split or one bill' },
        ],
        edges: [
          { from: 'table', to: 'kot' },
          { from: 'kot', to: 'kitchen' },
          { from: 'kitchen', to: 'serve' },
          { from: 'serve', to: 'bill' },
        ],
        animate: true,
      },
      'From table to bill',
    ),
    shot({
      heading: 'Tables at a glance',
      body: 'The table view shows which tables are free, occupied or waiting for the bill, so the waiter and the cashier see the same room.',
      id: SHOT.tables,
      url: 'app.nafaa.pk/restaurant/tables',
      layout: 'full',
      caption: 'Table layout from a demo restaurant.',
    }),
    prose(`## 3. Menu, modifiers and happy hours

Food is rarely one fixed item. "Chicken karahi" comes half or full, "spicy" or "mild", with extra naan. If every variation is a separate menu item, the menu becomes unmanageable; if modifiers do not exist, the waiter writes notes that the kitchen misreads.

Check:

- **[Modifiers](/glossary/modifiers)** such as size, spice, add-ons, with a price change where needed.
- **Combos and deals,** with correct stock and price.
- **Time-based prices,** like happy hours or a lunch menu.
- **Out-of-stock toggles** that remove a dish from the waiters' screens at once.
- **Service charge and tax** where you apply them, shown clearly on the receipt. For tax rules, read the official source of your province and ask your adviser.

## 4. Billing: split, merge, discount

The cashier's hardest moments are at the end of a family dinner:

- **Split a bill** equally, by item or by seat.
- **Accept more than one payment type** on one bill: cash and a wallet transfer, or card and cash.
- **Apply a discount** with a limit and a PIN for anything above it.
- **Print a pre-bill** for the customer to check before payment.
- **Reopen a bill** after closing, with a name and a reason on record.

See the glossary on [split bill](/glossary/split-bill), and [staff control at the counter](/blog/staff-permissions-checklist-pos-software) for approvals.

## 5. Delivery and riders

If you deliver, the POS should know about delivery as its own type of order, not as a dine-in order with a note.

Check:

- **Customer address and phone** saved for next time.
- **Delivery charges and zones,** if you use them.
- **Assigning a rider** and tracking an order's stages until delivery.
- **Cash collected by the rider** and settled at the end of the shift.
- **Delivery sales kept separate** in the report, so you see how much comes through each channel.

Nafaa has a riders list and delivery tracking in its restaurant pack for exactly this.

## 6. Orders from delivery apps

If part of your business comes from a delivery app, orders that reach you on a tablet and then get re-typed into the POS are a source of mistakes and delay. Ask any vendor which delivery platforms it connects to today, how the order reaches the kitchen and what stays manual.

For Foodpanda, Nafaa has a connection screen in its online orders settings, where you enter the chain code and the client credentials that Foodpanda issues to your restaurant through its partner portal, so that orders can reach the kitchen and the POS. That connection depends on credentials from Foodpanda, so ask us for the current status for your account before you plan around it. Orders from your own website and other channels are covered on the [online store page](/product/online-store).

## 7. Recipes and food cost

If you want to know whether a dish makes money, the system should link menu items to ingredients. A recipe with quantities lets the stock of ingredients go down when a dish is sold and shows the cost of a plate. See [recipe costing](/glossary/recipe-costing), the [food cost calculator](/tools/food-cost-calculator) and our guide on [menu engineering](/blog/restaurant-menu-engineering) for how to use the numbers.

## 8. Reports a restaurant owner needs

- Sales by hour and by day, to plan staff.
- Best and worst dishes by quantity and by profit.
- Sales by channel: dine-in, takeaway, delivery.
- Voids and discounts by person.
- Table turnover.
- Stock of ingredients and wastage.

## 9. Speed and reliability

A restaurant cannot pause for the internet at 9 pm on Friday. Test the order screen with Wi-Fi off. Ask what still works and what waits to sync. A kitchen screen or printer connected on the local network should keep running even if the internet is down.`),
    mdTable(
      'Restaurant demo checklist',
      'Ask the vendor to show each line, live, not on a slide.',
      [
        { key: 'why', label: 'What to see' },
      ],
      [
        ['Table order with three additions', 'One running bill, only new items to the kitchen'],
        ['Order with grill, curry and drink', 'Each station gets its own ticket'],
        ['Modifier on a dish', 'Spice level and add-on appear on the ticket and the bill'],
        ['Split the bill three ways', 'Equal and by item'],
        ['Pay with two methods', 'Cash and wallet on one bill'],
        ['Delivery order with rider', 'Address, rider and stage tracking'],
        ['Delivery app order', 'How it arrives, and what stays manual'],
        ['Dish with a recipe', 'Cost per plate and ingredient stock reducing'],
        ['Wi-Fi off', 'Ordering and billing continue'],
      ],
    ),
    prose(`## How Nafaa's restaurant pack covers this

Nafaa's restaurant pack has a table layout with running bills, kitchen order tickets by station, a kitchen display, modifiers, recipes with cost, happy hours, riders and delivery tracking, together with the ordinary POS, khata, staff controls and reports. The help article on [restaurant KOT and tables](/help/by-business-type/restaurant-kot-and-tables) walks through the daily use. See the [restaurant industry page](/industries/restaurant) and the [restaurants solution](/solutions/restaurants), and run the demo checklist above against us like you would against anyone else.`),
    tip('Ask your head cook, not only your cashier, to try the kitchen side in the trial. If the kitchen does not like it, the best billing screen will not save it.', 'Include the kitchen'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Tables', 'KOT', 'Menu and modifiers', 'Billing', 'Delivery', 'Delivery apps', 'Recipes', 'Reports', 'Reliability', 'Demo checklist'],
  dropped: [],
  needsOwner: ['Confirm the current Foodpanda integration status with the partner portal before stating more than the connection screen.'],
  evidence: [
    'apps/web/src/industries/restaurant/pages/TablesLayoutPage.tsx',
    'apps/web/src/industries/restaurant/pages/KotDisplayPage.tsx',
    'apps/web/src/industries/restaurant/pages/StationsPage.tsx',
    'apps/web/src/industries/restaurant/pages/ModifiersPage.tsx',
    'apps/web/src/industries/restaurant/pages/RecipesPage.tsx',
    'apps/web/src/industries/restaurant/pages/HappyHoursPage.tsx',
    'apps/web/src/industries/restaurant/pages/RidersPage.tsx',
    'apps/web/src/industries/restaurant/pages/DeliveryTrackingPage.tsx',
    'apps/api/src/integrations/online-orders/foodpanda.service.ts',
  ],
  factNote: 'Restaurant features checked in apps/web/src/industries/restaurant. Foodpanda statement limited to the connection screen and its credentials in apps/api/src/integrations/online-orders. Wikipedia pages opened 2026-11-15.',
};

export default spec;
