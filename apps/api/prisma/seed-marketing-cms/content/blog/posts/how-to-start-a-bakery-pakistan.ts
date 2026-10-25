/**
 * Starting a bakery: location, food licence, equipment, raw material,
 * recipe costing, production planning, freshness and custom orders.
 */
import { diagram, prose, steps } from '../../main-pages/_build';
import { src, tip, type PostSpec } from '../_post';

const SOURCES = [
  src('Punjab Food Authority: Apply for license', 'https://pfa.gop.pk/for-businesses/apply-for-license/', 'Punjab Food Authority'),
  src('Punjab Food Authority: food handler training', 'https://cell.pfa.gop.pk/register?go_to=food_training', 'Punjab Food Authority'),
];

const spec: PostSpec = {
  slug: 'how-to-start-a-bakery-pakistan',
  title: 'How to Start a Bakery in Pakistan',
  summary:
    'A practical guide to opening a bakery: location, food licence, equipment and power, raw material, costing each product from its recipe, planning daily baking, controlling freshness and waste, and taking cake and bulk orders.',
  category: 'industry',
  tags: ['INDUSTRY:bakery'],
  related: ['BLOG_POST:how-to-calculate-profit-margin', 'PRODUCT:inventory', 'PRODUCT:pos'],
  isNew: true,
  sources: SOURCES,
  blocks: [
    prose(`A bakery is two businesses under one roof: a small factory that bakes every morning, and a shop that has to sell what was baked before it goes stale. Most bakeries that struggle are good at one and weak at the other. They bake beautiful cakes but cannot say what each one costs, or they sell well but throw away a tray of bread every evening.

This guide covers both halves.

## Location and format

Decide what kind of bakery you are opening, because it shapes the location:

- **Neighbourhood bakery:** bread, rusks, biscuits, patties and cakes for families nearby. Needs footfall and early opening.
- **Cake and dessert shop:** custom cakes for birthdays and events. Can be slightly off the main road if customers order ahead, but needs good display and parking.
- **Bakery with a café corner:** tea, coffee and snacks to eat in. Needs space and longer hours.
- **Wholesale supply:** baking for other shops and canteens. Needs kitchen space more than shop frontage.

## Licence and hygiene

Bakeries are food businesses, and provinces regulate them through food authorities. In Punjab, the [Punjab Food Authority](https://pfa.gop.pk/for-businesses/apply-for-license/) takes licence applications online and also offers food handler training; other provinces have their own food authorities. Before you open, check the licence category for your size, the kitchen hygiene rules and any medical or training requirement for staff who handle food.

## Equipment and power

The main items are an oven (deck, rotary or convection, depending on what you bake), a dough mixer, a proofer for bread, worktables, trays and racks, a refrigerator and freezer for cream and butter, and display chillers for cakes. Ovens are the largest single cost; buy for the volume you expect in the first year, not the fifth.

Power matters more for a bakery than for most shops. A cut in the middle of a bake ruins the batch, and cream cakes cannot sit in a warm display. Plan a generator or a gas oven, and backup for the chillers.

## Raw material

Flour, sugar, ghee or butter, eggs, milk, yeast, baking powder, cream, cocoa and flavours. Buy staples in bulk from wholesalers; buy perishables (eggs, cream, milk) often and in smaller amounts. Track raw material in kilos and litres, because that is how recipes use it.`),
    steps(
      'Cost every product from its recipe',
      [
        ['Write the recipe for one batch', 'List every ingredient with its quantity: flour in kg, eggs in pieces, butter in grams.'],
        ['Price each ingredient', 'Use what you actually paid per kg or per piece on your last purchase.'],
        ['Add up the batch cost', 'Multiply quantities by prices and add them. Include the box, board and decorations for cakes.'],
        ['Divide by the yield', 'If the batch makes 24 buns, the ingredient cost per bun is the batch cost divided by 24.'],
        ['Add overheads and set the price', 'Allow for gas or electricity, labour and wastage, then set a price that leaves your target margin.'],
      ],
      'Re-check costs whenever flour, sugar or butter prices change. A recipe priced last year may now be losing money.',
      true,
    ),
    prose(`## Plan the daily bake

Bake to what sells, not to what the oven can hold. For the first few weeks, write down each morning how much of each item you baked and each evening how much was left. After a month you will see a pattern by day of the week. Friday and Sunday usually differ from Tuesday. Adjust the morning plan to match.

Bake bread and buns in more than one batch if you can: a smaller morning batch and a top-up in the afternoon cuts the evening leftovers.`),
    diagram(
      'Raw material goes into production batches, finished goods go to the shelf, and anything past its freshness window is recorded as waste.',
      {
        kind: 'flow',
        nodes: [
          { id: 'raw', label: 'Raw material', icon: 'wheat', note: 'Flour, butter, eggs in kg and pieces' },
          { id: 'bake', label: 'Production batch', icon: 'chef-hat', note: 'Recipe uses up raw material' },
          { id: 'shelf', label: 'Shelf and counter', icon: 'cake-slice', note: 'Sold by piece, dozen, pound or kg' },
          { id: 'waste', label: 'Freshness and waste', icon: 'timer', note: 'Expired items recorded, not hidden' },
        ],
        edges: [
          { from: 'raw', to: 'bake' },
          { from: 'bake', to: 'shelf' },
          { from: 'shelf', to: 'waste', label: 'unsold' },
        ],
        animate: true,
      },
      'From flour to the counter',
    ),
    prose(`## Freshness and waste

Every product has a freshness window: bread a day or two, cream cakes a day or two in a chiller, rusks and biscuits much longer. Label trays with the bake date, sell the oldest first, and decide what happens to unsold items: a discount in the last hour, use in other products where safe (rusks from bread), or waste. Record waste every day. When you see the real cost of what you throw away, the morning plan improves quickly.

## Cake and bulk orders

Custom cakes and event orders are often the most profitable part of a bakery, and the most stressful. Take every order in writing: flavour, weight, design, message on the cake, delivery date and time, price and advance paid. Give the customer a slip. Plan the week's cake orders on one board so the kitchen sees what is due when. For weddings and large events, take a larger advance and confirm the details a few days before.

## Selling units

Bakeries sell in many units: by piece, slice, dozen, half dozen, pound for cakes, kg for biscuits and mithai, and by box or tray. Set these up from the start so the counter can bill a dozen buns or two pounds of cake without arithmetic.

## How Nafaa helps a bakery

Nafaa's bakery setup marks each product as made in-house or bought in, keeps a recipe with a live cost from current ingredient prices, and sells in pieces, slices, dozens, pounds, kg and more from one item. Raw material is tracked as ingredients, production batches record what was baked, the freshness screen tracks expiry and waste, and cake orders and wedding or event bulk orders each have their own screens with advances and delivery dates.`),
    tip('Count leftovers for every item each night for the first month. It is the cheapest market research a bakery can do.', 'Count the leftovers'),
  ],
  outline: ['Format and location', 'Licence', 'Equipment and power', 'Raw material', 'Recipe costing', 'Daily bake', 'Freshness', 'Cake and bulk orders', 'Units', 'How Nafaa helps'],
  dropped: [],
  evidence: [
    'apps/web/src/industries/bakery/BakeryPack.tsx',
    'apps/web/src/industries/bakery/products/BakeryProductEditor.tsx',
    'apps/web/src/industries/bakery/api/production.api.ts',
    'apps/web/src/industries/bakery/api/ingredients.api.ts',
    'apps/web/src/industries/bakery/api/freshness.api.ts',
    'apps/web/src/industries/bakery/api/cake-orders.api.ts',
    'apps/web/src/industries/bakery/api/bulk-orders.api.ts',
  ],
  factNote: 'PFA licence and training pages opened 2026-10-26. No costs or fees stated. Product statements checked against the code.',
};

export default spec;
