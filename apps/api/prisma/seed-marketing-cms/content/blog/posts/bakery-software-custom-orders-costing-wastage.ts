/**
 * Buyer checklist for bakery software: cake orders with advance, bulk orders,
 * production plans from recipes, ingredient stock, freshness and wastage.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { mdTable, sourcesBlock, srcChecked, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [srcChecked('Bakery', 'https://en.wikipedia.org/wiki/Bakery', 'Wikipedia', '2026-11-15'), srcChecked('Shelf life', 'https://en.wikipedia.org/wiki/Shelf_life', 'Wikipedia', '2026-11-15')];

const spec: PostSpec = {
  slug: 'bakery-software-custom-orders-costing-wastage',
  title: 'Bakery Software: Cake Orders, Costing and Wastage',
  summary:
    'Bakery software should take custom cake orders with an advance and a pickup time, plan production from recipes, track ingredients and freshness, record wastage with a reason and show the real cost of each item. This guide lists what to check and how to test it with your own recipes before you choose.',
  category: 'industry',
  cover: PHOTO.bakerySoftwareCustomOrdersCostingWastage,
  tags: ['INDUSTRY:bakery', 'GLOSSARY_TERM:recipe-costing', 'GLOSSARY_TERM:wastage'],
  related: [
    'INDUSTRY:bakery',
    'BLOG_POST:reduce-bakery-wastage',
    'BLOG_POST:how-to-start-a-bakery-pakistan',
    'TOOL:food-cost-calculator',
    'GLOSSARY_TERM:food-cost',
    'GLOSSARY_TERM:shrinkage',
    'PAGE:bakery-ka-hisaab',
  ],
  isNew: true,
  seoTitle: 'Bakery Software: Cake Orders, Costing, Wastage',
  seoDescription:
    'What to check in bakery software in Pakistan: custom cake orders with advance, recipes and costing, ingredient stock, freshness and wastage records.',
  focusKeyword: 'bakery software pakistan',
  sources: SOURCES,
  blocks: [
    prose(`A bakery sits between a shop and a small factory. At the counter it sells ready items by the piece and the box. In the back it makes those items from ingredients, in batches, with a short life. And in between it takes orders: a birthday cake for Friday evening, a hundred boxes for a wedding, a regular order from a hotel. Software that is only a counter will miss two-thirds of the work.

This guide is for bakery and sweet shop owners choosing software. It follows the work in order: orders, production, ingredients, freshness, wastage and cost. At each step it says what to ask and what to test. If you are still planning a bakery, read [how to start a bakery in Pakistan](/blog/how-to-start-a-bakery-pakistan) first; for the loss side, our guide to [reducing bakery wastage](/blog/reduce-bakery-wastage) goes deeper.

## 1. Custom orders: the part paper handles worst

A custom cake order carries more information than a normal sale: the customer, the date and time of pickup or delivery, the flavour, the size, the message on top, a design reference, the price and an advance. Written on a slip, it gets lost, misread or forgotten. Written in WhatsApp, it is somewhere in 400 messages.

What to check:

- **An order form with the fields you need,** such as flavour, weight, message, design notes and a photo reference.
- **A pickup date and time,** with a calendar or list of what is due today and tomorrow.
- **An advance and a balance,** recorded properly, so the cashier knows what remains at pickup.
- **A status:** new, in production, ready, delivered.
- **A printed order slip** for the kitchen, with the details a decorator needs.
- **A customer record,** so a regular customer's earlier orders are one tap away.

Test: take a cake order for Saturday 5 pm with an advance. On Saturday, find it, mark it ready and collect the balance. If this takes more than a minute, it will not work at the busiest hour.

## 2. Bulk and regular orders

Wedding boxes, office orders and hotel standing orders are large and repeated. The software should let you create a bulk order with many items, set a delivery date, take part-payments and repeat last month's order without retyping. A regular customer on credit should have a khata, with a limit and reminders, like any other trade customer. See [digital khata](/product/khata).

## 3. Recipes and production plans

Bakeries decide each morning what to make. Producing too little loses sales; producing too much becomes waste by evening. Software can help in two ways.

- **A production plan:** how many of each item to bake today, based on orders and on what usually sells on this weekday.
- **A recipe for each made item,** listing ingredients and quantities, so the stock of flour, sugar and butter goes down when you record a batch.

Check that the system lets you record **what you planned, what you actually made and how many were spoiled**, with a reason such as burnt or undercooked. That record is the beginning of cutting waste, because the pattern of reasons tells you what to fix: an oven that runs hot, a tray that is overloaded.

Also check that items you **buy and resell** (packed biscuits, drinks) are handled separately from items you **make**, since the first need stock and the second need recipes.

## 4. Ingredients and purchasing

Flour, sugar, ghee, eggs and cream are bought in different units than the recipe uses: a 50 kg bag, a tray of eggs, a litre of cream. Look for:

- **Ingredient stock** with units and conversions.
- **Low-stock alerts** for ingredients, since a missing item stops the production line. See [low stock alerts](/help/products-and-stock/low-stock-alerts).
- **Purchase entry** with supplier, price and date, so ingredient costs update when prices change.
- **A supplier ledger** for credit purchases.

Ingredient prices move often. A cake priced in January at last year's butter cost may lose money by March. A system that updates the cost from purchases lets you see it.`),
    shot({
      heading: 'Cake orders with pickup date and balance',
      body: 'Each cake order shows the customer, the pickup time, what was ordered and how much balance is due, so the counter and the kitchen look at the same list.',
      id: SHOT.bakeryCakeOrders,
      url: 'app.nafaa.pk/bakery/cake-orders',
      layout: 'full',
      caption: 'Cake orders page from a demo bakery.',
    }),
    prose(`## 5. Freshness and shelf life

Bread and pastries do not expire like medicines, but they have a limit. A good system lets you give a made item a shelf life, such as a day or three days, and reminds you as the time runs out, so the item is discounted or removed instead of discovered later. See the idea of [shelf life](https://en.wikipedia.org/wiki/Shelf_life). Test: record a batch with a one-day shelf life and see whether a reminder or list shows it going stale.

## 6. Wastage and returns

Waste is the quiet cost of a bakery. It comes in three forms: failed bakes, unsold stock at close and ingredients that spoiled. The software should record each one with a reason and a quantity, and turn it into money at cost. See the glossary on [wastage](/glossary/wastage) and [shrinkage](/glossary/shrinkage).

What to ask for:

- **A wastage entry** that is fast enough to be done in the moment, not at night.
- **Reasons you can choose,** like burnt, dropped, returned, expired.
- **A wastage report** by item, by reason and by day.
- **Wastage in the profit report,** so it is not hidden.

## 7. Costing: what a cake really costs

Price a cake from feeling and you will under-price the labour-heavy ones. With recipes linked to ingredient prices, the system can tell you the **ingredient cost per item**, and the margin at the price you charge. This is [recipe costing](/glossary/recipe-costing); the [food cost calculator](/tools/food-cost-calculator) lets you try it on paper. Remember that ingredient cost is not the whole cost: add labour, gas or electricity, packaging and rent when you decide on the price. For the thinking, read [how to calculate profit margin](/blog/how-to-calculate-profit-margin) and [pricing strategy for a small shop](/blog/pricing-strategy-small-shop).

## 8. Counter speed and the evening rush

At 6 pm a bakery counter has a queue and a customer who wants three different items by weight or piece. Check barcode scanning for packed items, quick keys for your top 20 items, the ability to sell by weight or by piece, and a fast way to hold a bill. See [hold and recall bills](/help/pos-counter/hold-and-recall-bills).

## 9. Reports a baker should read

- Sales by item and by hour, to plan production.
- Wastage by item and by reason.
- Profit by item, after ingredient cost.
- Orders due this week.
- Udhaar by customer.
- Ingredient stock and purchases.

## 10. Offline and staff

A bakery opens early, when the internet is often down in the morning, and the first rush is breakfast. Check that billing works offline. And since bakeries often have several staff at the counter, check that each person has a login, discount limits and a refund PIN. See [offline POS](/blog/offline-pos-internet-outage-lost-sales) and [staff control at the counter](/blog/staff-permissions-checklist-pos-software).

## A trial script for a bakery`),
    steps(
      'Bakery trial in one hour',
      [
        ['Add three items you make with recipes', 'Ingredients and quantities per item.'],
        ['Receive ingredients', 'Flour, sugar and ghee with their price.'],
        ['Take a custom cake order with an advance', 'Pickup tomorrow at 5 pm.'],
        ['Record a production batch', 'Planned, made, and how many were spoiled and why.'],
        ['Check ingredient stock and cost per item', 'Stock went down, cost updated.'],
        ['Sell at the counter with a quick key', 'And one by weight.'],
        ['Open the wastage and profit reports', 'Waste has a rupee value.'],
      ],
      'Use your real recipes, not sample ones.',
      true,
    ),
    mdTable(
      'Bakery checklist',
      'Ask the vendor to show each line live.',
      [
        { key: 'see', label: 'What to see' },
      ],
      [
        ['Cake order with advance and pickup time', 'Balance at pickup, status tracking'],
        ['Bulk order and repeat order', 'Many items, part payments'],
        ['Recipe with ingredients', 'Ingredient stock reduces on production'],
        ['Planned vs made vs spoiled', 'Reason recorded'],
        ['Freshness reminder', 'Shelf life per batch'],
        ['Wastage report', 'By item, reason and day'],
        ['Cost and margin per item', 'Updates with purchase prices'],
        ['Offline billing', 'Early morning rush'],
      ],
    ),
    prose(`## How Nafaa's bakery pack covers this

Nafaa's bakery pack has cake orders with a customizer, bulk orders, ingredients, production plans where you record what was planned, made and spoiled, freshness tracking for made items and the ordinary POS, khata, staff controls and reports. Recipes link made items to ingredients so stock reduces on production. The help article on [bakery orders](/help/by-business-type/bakery-orders) explains the daily use, and the [bakery industry page](/industries/bakery) lists the features. Try the script above in the free trial with your real recipes, and see [pricing](/pricing) for the plans.`),
    tip('Weigh your ten best sellers once, with their real ingredients, before you enter recipes. Recipes that come from memory are the main reason cost numbers look wrong.', 'Weigh once, enter once'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Custom orders', 'Bulk orders', 'Recipes and production', 'Ingredients', 'Freshness', 'Wastage', 'Costing', 'Counter', 'Reports', 'Trial script'],
  dropped: [],
  evidence: [
    'apps/web/src/industries/bakery/pages/CakeOrdersPage.tsx',
    'apps/web/src/industries/bakery/pages/CakeCustomizerPage.tsx',
    'apps/web/src/industries/bakery/pages/BakeryBulkOrdersPage.tsx',
    'apps/web/src/industries/bakery/pages/IngredientsPage.tsx',
    'apps/web/src/industries/bakery/pages/ProductionPage.tsx',
    'apps/web/src/industries/bakery/pages/FreshnessPage.tsx',
    'apps/web/src/industries/bakery/components/production/PlanCard.tsx',
  ],
  factNote: 'Bakery features checked in apps/web/src/industries/bakery (production plans, recipe-based ingredient use, freshness batches, wastage reasons). Wikipedia pages opened 2026-11-15.',
};

export default spec;
