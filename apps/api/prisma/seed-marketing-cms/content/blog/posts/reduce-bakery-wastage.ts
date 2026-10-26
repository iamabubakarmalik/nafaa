/**
 * Cutting waste in a bakery: measuring it by item and reason, planning the
 * bake by weekday, freshness windows, last-hour discounts, safe reuse and
 * putting waste into recipe costs.
 */
import { SHOT, prose, shot, steps} from '../../main-pages/_build';
import { sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Staling', 'https://en.wikipedia.org/wiki/Staling', 'Wikipedia'),
  src('Technical Platform on the Measurement and Reduction of Food Loss and Waste', 'https://www.fao.org/platform-food-loss-waste/en/', 'Food and Agriculture Organization of the United Nations'),
];

const spec: PostSpec = {
  slug: 'reduce-bakery-wastage',
  title: 'How to Reduce Stock Wastage in a Bakery',
  summary:
    'Bakery waste falls when you bake to each weekday’s real sales, record every thrown item with its reason and cost, and sell near-expiry stock before it turns. This guide shows the daily routine, freshness windows, last-hour discounts and how to build waste into your recipe costs.',
  category: 'industry',
  cover: PHOTO.reduceBakeryWastage,
  seoTitle: 'How to Reduce Wastage in a Bakery: A Daily Routine',
  seoDescription: 'Cut bakery waste: bake by weekday sales, record waste by item and reason, set freshness windows, use last-hour discounts and cost waste into recipes.',
  focusKeyword: 'reduce bakery wastage',
  tags: ['INDUSTRY:bakery', 'GLOSSARY_TERM:wastage', 'GLOSSARY_TERM:recipe-costing'],
  related: ['BLOG_POST:how-to-start-a-bakery-pakistan', 'PRODUCT:inventory', 'PRODUCT:reports', 'GLOSSARY_TERM:fifo'],
  isNew: true,
  sources: SOURCES,
  blocks: [
    prose(`Every tray of buns thrown away at closing time was paid for twice: once in flour, butter and gas, and again in the profit it should have made. In most bakeries nobody knows the real figure, because waste goes into the bin and never into a register. The owner feels it only at month end, when the cash is lower than the sales suggested.

This guide is for owners who already run a bakery and want to bring waste down. If you are still planning one, start with [how to start a bakery in Pakistan](/blog/how-to-start-a-bakery-pakistan), which covers location, equipment and the basic recipe costing this post builds on.

## Know where the waste comes from

Bakery waste has three sources, and each needs a different fix:

- **Unsold finished goods.** Bread, buns, patties and cream pastries that pass their freshness window. This is usually the largest share, and the cause is baking more than sells.
- **Production losses.** Burnt trays, cakes that fall, dough that over-proofs during a power cut, decorations that go wrong.
- **Raw material spoilage.** Cream, eggs, milk and butter that go off before use, or flour that gets damp or infested.

You cannot fix what you do not measure. For one month, record every item thrown away with four things: the item, the quantity, the reason (unsold, burnt, damaged, spoiled raw material) and its cost. A simple notebook works. At the end of the month you will see that two or three items cause most of the loss, and that is where to start.

## Measure waste as a percentage

A waste figure in rupees means little on its own. Compare it to what you made. If you baked 600 dinner rolls in a week and threw away 54, your waste on rolls is 9%. Track this number by item and by week. It tells you whether a change in the morning plan worked.`),
    steps(
      'A daily routine that cuts waste',
      [
        ['Check yesterday’s leftovers first', 'Before the first bake, count what is still fresh from yesterday and how long it has left. That stock sells first.'],
        ['Plan from the same weekday', 'Look at what each item sold on the same day last week and the week before. Fridays and Sundays rarely look like Tuesdays.'],
        ['Add confirmed orders', 'Add cake and bulk orders due today on top of the counter estimate, not instead of it.'],
        ['Bake in two rounds', 'Bake most of the day’s bread and buns in the morning and keep a smaller afternoon batch for top-ups if the shelf runs low.'],
        ['Discount at a fixed hour', 'In the last hour, move items that will not survive until tomorrow to a clearly marked discount tray.'],
        ['Record what is left', 'At closing, write down leftovers and anything thrown away, with the reason. This is tomorrow’s planning data.'],
      ],
      'The same six steps every day. The record from step 6 feeds step 2 the next morning.',
      true,
    ),
    prose(`## Plan the bake from real sales

The most common cause of waste is a fixed morning plan: the same 10 trays every day because that is how it has always been done. Instead, plan each item from three numbers:

**Bake = expected counter sale + confirmed orders − fresh stock already on the shelf**

For example, say your plain buns sold 110 last Friday and 120 the Friday before. You expect about 115 this Friday. A school has ordered 40 for collection at noon. You still have 20 from yesterday that are good until this evening. The plan is 115 + 40 − 20 = 135 buns, not the usual 180.

Adjust for things you know: a holiday, rain, a wedding season in the area, the start of Ramadan. But start from the data, then adjust, rather than starting from habit.

## Set a freshness window for every item

Each product needs a written freshness window: how long it can be sold at full price, and what happens after. The table below shows the kind of rules a bakery sets. The windows are examples; set your own from your recipes, your storage and how your products hold up.`),
    prose(`## Example freshness rules

| Product | Full price for | Storage | After the window |
|---|---|---|---|
| Bread and buns | Day of baking | Covered, room temperature | Discount next morning, or use for rusks or crumbs |
| Fresh cream pastries | Same day | Display chiller | Last-hour discount, then waste |
| Patties and savoury items | Same day | Warm display | Last-hour discount, then waste |
| Plain and dry cakes | Two to three days | Covered, cool place | Slice and sell by the piece |
| Rusks and biscuits | Several weeks | Sealed jars or packs | Check packs for damp before selling |

*Illustrative windows only. Your recipes, packaging and storage decide the real ones.*`),
    prose(`A note on bread storage: putting bread in the fridge does not keep it fresh longer. According to the [Wikipedia article on staling](https://en.wikipedia.org/wiki/Staling), bread stales fastest at temperatures just above freezing, so refrigerated bread goes stale sooner. Bread frozen while fresh can be thawed acceptably. Staling alone does not make bread unsafe, but mould does, and anything with mould goes in the bin.

## Use last-hour discounts with rules

A pastry sold at a lower price still earns more than a pastry thrown away. For example, a cream pastry that costs 45 rupees to make and sells for 90 rupees returns nothing if binned. Sold at 60 rupees in the last hour, it covers its cost and adds 15 rupees.

Discounts need rules, or customers learn to wait for them:

- Discount at a fixed time, such as the last hour before closing, not whenever stock looks high.
- Discount only items that will not last until tomorrow.
- Keep discounted items on one marked tray, not mixed with fresh stock.
- Record how many were sold at a discount. If the same item is discounted every day, the fix is to bake less of it.

## Reuse safely, or not at all

Day-old bread can become rusks, croutons or crumbs, and cake offcuts can be used in some desserts. This recovers value, but only when the item is still safe: no mould, no off smell, and nothing with fresh cream that has sat out of the chiller. Write down which items may be reused and how, so staff do not decide at random. Your provincial food authority sets hygiene rules for food businesses; follow them first.

## Put waste into your recipe cost

Most recipe costs assume every piece is sold. That is rarely true. For example, a batch of 60 chicken patties costs 2,400 rupees in ingredients, or 40 rupees each. If you usually throw away 6 of them, you are really selling 54, and the cost of each sold patty is 2,400 rupees ÷ 54 ≈ 44 rupees. If your price was set on 40 rupees, your margin is smaller than you think.

Use your measured waste percentage when you set prices, and recheck it when you cut waste. Lower waste lets you hold prices longer when flour or butter goes up. The glossary entry on [recipe costing](/glossary/recipe-costing) explains the method step by step.`),
    shot({
      heading: 'Profit by item, with recipe cost',
      body: 'The bakery profit report lists each item with quantity sold, sale, cost, profit and margin, and has a tab for recipe cost.',
      id: SHOT.bakeryProfit,
      url: 'app.nafaa.pk/reports',
      layout: 'full',
      caption: 'Items with thin margins and high waste are the first to fix.',
    }),
    prose(`## Look after raw material

Raw material waste is quieter than unsold bread but adds up. Buy perishables such as cream, eggs and milk in amounts you will use within their life, use the oldest stock first ([FIFO](/glossary/fifo)), keep the cold room or fridge checked, and store flour and sugar off the floor in sealed containers. Record spoiled raw material in the same waste register, so it shows up in the monthly figure.

## Mistakes that keep waste high

- **Full shelves as a display.** A full shelf at 9 pm is a waste plan, not good presentation.
- **Hiding waste.** If staff fear blame, they throw items away quietly and the record becomes useless. Make recording normal.
- **Giving leftovers to staff without recording them.** It may be a kind policy, but record it, or your numbers will be wrong.
- **One plan for every day.** Weekday patterns are the easiest gain.
- **Never reviewing the record.** Look at the month’s waste by item and reason at least once a month.

Food waste is a wider concern too: the UN’s Food and Agriculture Organization runs a [technical platform on measuring and reducing food loss and waste](https://www.fao.org/platform-food-loss-waste/en/), which is a useful starting point if you want to read more.

## How Nafaa helps

Nafaa’s [bakery setup](/industries/bakery) suggests what to bake for a day from orders due that day and the counter sale of the same weekday, less fresh stock still good and what is already planned. The freshness screen lists batches on the shelf by time left, lets staff record pieces sold at a discount or thrown away with a reason, and keeps one waste record for shelf batches, baking losses, raw material and damage, with cost and a waste percentage by period. Recipes carry a live cost from current ingredient prices, and the [inventory](/product/inventory) tracks raw material in kg, litres and pieces.`),
    tip('For the first month, do not try to fix everything. Pick the three items with the highest waste cost and change only their morning plan. Measure again after two weeks.', 'Start with three items'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Where waste comes from', 'Waste as a percentage', 'Daily routine', 'Plan from real sales', 'Freshness windows', 'Last-hour discounts', 'Safe reuse', 'Waste in recipe cost', 'Raw material', 'Mistakes', 'How Nafaa helps'],
  dropped: [],
  evidence: [
    'apps/web/src/industries/bakery/components/production/SuggestPanel.tsx',
    'apps/web/src/industries/bakery/api/production.api.ts',
    'apps/web/src/industries/bakery/pages/FreshnessPage.tsx',
    'apps/web/src/industries/bakery/api/freshness.api.ts',
    'apps/web/src/industries/bakery/components/fresh/Wastage.tsx',
    'apps/web/src/industries/bakery/products/BakeryProductEditor.tsx',
    'apps/web/src/industries/bakery/lib/bakeryUnits.ts',
  ],
  factNote:
    'Wikipedia "Staling" (refrigeration speeds staling, frozen bread thaws acceptably, staling alone not unsafe, mould is) and the FAO food loss and waste platform page read on 2026-10-26; both links checked to load on 2026-10-26. All PKR figures and freshness windows are labelled as examples. Product statements checked against the code (see evidence).',
};

export default spec;
