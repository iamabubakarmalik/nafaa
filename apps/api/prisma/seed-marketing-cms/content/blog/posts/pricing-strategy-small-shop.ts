/**
 * Pricing strategy for small shops: cost as the floor, the few items customers
 * compare, checking competitors, price endings and small change, printed-price
 * goods, and when to change prices. Worked examples use illustrative amounts.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Cost-plus pricing', 'https://en.wikipedia.org/wiki/Cost-plus_pricing', 'Wikipedia'),
  src('Psychological pricing', 'https://en.wikipedia.org/wiki/Psychological_pricing', 'Wikipedia'),
  src('Loss leader', 'https://en.wikipedia.org/wiki/Loss_leader', 'Wikipedia'),
  src('Price Statistics (SPI, CPI, WPI)', 'https://www.pbs.gov.pk/price-statistics/', 'Pakistan Bureau of Statistics'),
];

const spec: PostSpec = {
  slug: 'pricing-strategy-small-shop',
  title: 'Pricing Strategy for Small Shops in Pakistan',
  summary:
    'Set prices from your real landed cost, keep the handful of items customers compare at or near the market rate, and earn your margin on the rest. This guide covers competitor checks, price endings that suit the counter, printed-price goods and when to change prices.',
  category: 'business',
  cover: PHOTO.pricingStrategySmallShop,
  tags: ['GLOSSARY_TERM:markup', 'GLOSSARY_TERM:gross-margin', 'GLOSSARY_TERM:mrp', 'INDUSTRY:kiryana'],
  related: [
    'BLOG_POST:how-to-calculate-profit-margin',
    'BLOG_POST:wholesale-vs-retail-pricing',
    'PRODUCT:inventory',
    'PRODUCT:reports',
    'GLOSSARY_TERM:landed-cost',
    'TOOL:discount-calculator',
    'TEMPLATE:price-list-template',
  ],
  isNew: true,
  seoTitle: 'Pricing Strategy for Small Shops in Pakistan',
  seoDescription: 'How a small shop should set prices: landed cost, items customers compare, competitor checks, price endings, printed-price goods and when to change rates.',
  focusKeyword: 'pricing strategy for small shop',
  sources: SOURCES,
  blocks: [
    prose(`Most shopkeepers set prices the way their father did: cost plus a round amount, adjusted when a customer complains. That works until costs rise every few weeks, a new superstore opens nearby, or the owner notices that a busy month left very little profit.

A pricing strategy does not need to be complicated. It needs a floor (your real cost), a short list of items where you must match the market, and a habit of reviewing prices on a fixed day. This guide covers how to decide the price. If you need the arithmetic of margin and markup first, read [how to calculate profit margin](/blog/how-to-calculate-profit-margin), which this post builds on.

## Your cost is the floor, not the price

Start every price from your **landed cost**: what the item cost you on the shelf, not what the invoice says. Add transport from the market, loading charges, the packing bag, and any loss from weighing out loose goods. This is the idea behind [cost-plus pricing](https://en.wikipedia.org/wiki/Cost-plus_pricing): cost first, then the margin you need on top.

Cost-plus is a good floor and a weak ceiling. It tells you the lowest price that still earns, but it ignores what customers will pay and what the shop next door charges. So use cost to set the minimum, then look at the market.

Decide a target margin for each category rather than one number for the whole shop. For example, an owner might accept a thin margin on flour and cooking oil because customers compare those prices, and expect more on spices, snacks, cosmetics and household items where customers compare less. These targets are your own choice; write them down so staff price new items the same way.

## Find the items customers compare

Every shop has a short list of items whose price customers remember. Retailers call them key value items. In a Pakistani kiryana store they are usually staples bought every week: sugar, flour, ghee and cooking oil, milk, eggs, tea, and the most popular soft drinks and biscuits. A customer who finds sugar cheaper down the road decides your whole shop is expensive, even if your other prices are fair.

Keep these items at or close to the market rate, even when the margin is thin. Some shops go further and sell one or two of them very cheaply to bring people in, the approach known as a [loss leader](https://en.wikipedia.org/wiki/Loss_leader). That only works if the same customers also buy items that earn. If they come for cheap sugar and leave, you have paid for their sugar.

## Check competitors properly

Walking past another shop and hearing a price is not a check. Do it properly once a month:

- Make a list of 20 to 30 items: your key value items plus a few fast sellers from each category.
- Check two or three nearby shops, including any large store your customers also use.
- Compare the same brand and pack size. A 900 g and a 1 kg pack are not the same price point.
- Write down the date. Prices from three months ago are not a comparison.

You do not need to beat everyone. You need to know where you are more expensive and decide whether that is on purpose.`),
    prose(`## Worked example: pricing a new item

For example, you start stocking a 1 litre bottle of a cooking oil brand. Illustrative figures:

| Step | Amount |
|---|---|
| Distributor price per bottle | 520 rupees |
| Share of transport and loading | 8 rupees |
| Landed cost | 528 rupees |
| Price at a 6% target margin: 528 ÷ 0.94 | 561.70 rupees |
| Nearby shops charge | 565 rupees to 570 rupees |
| Printed retail price on the bottle | 575 rupees |

Cooking oil is a compared item, so you price at 565 rupees, close to the market and well under the printed price. Your margin is (565 − 528) ÷ 565, about 6.5%. On a slow-moving imported sauce with the same cost, nobody compares, and a higher margin is reasonable.

## Price endings that suit the counter

In many countries shops price at 99 or 95 because shoppers read 199 rupees as "about a hundred and something". The research on [psychological pricing](https://en.wikipedia.org/wiki/Psychological_pricing) suggests just-below prices can look lower than they are.

At a Pakistani counter, change matters more. Small coins are often short, and a price of 198 rupees means either hunting for two rupees or the cashier rounding down every time. Many shops price loose and own-label goods in steps of 5 or 10 rupees so the bill is easy to pay in cash. Pick one rule for the shop and apply it to every item you price yourself, so the counter is not rounding bills on its own.

## Printed-price goods

Many packaged goods carry a [printed retail price](/glossary/mrp). Treat it as the ceiling: customers check it, and charging above it loses trust quickly. Your margin on these items is the gap between the distributor's rate and the printed price, so you improve it by buying better, not by charging more. Compare distributors, take trade schemes that suit your sales, and avoid buying so much that stock sits for months.

You can sell below the printed price, and on key value items you often should. Just make sure the lower price is a decision, not a habit that spread from one item to the whole shelf.

## When to change prices

Costs in Pakistan move often. The Pakistan Bureau of Statistics publishes a weekly Sensitive Price Indicator and monthly consumer and wholesale price indices on its [price statistics page](https://www.pbs.gov.pk/price-statistics/), which helps you see whether a rise is general or just your supplier.

- **When the supplier raises the rate,** price on what it will cost you to restock, not what the old stock cost. If you keep the old price until the old stock runs out, the next purchase eats your margin.
- **When costs fall,** move key value items down quickly; customers notice. Other items can follow at your next review.
- **Change prices on a fixed day,** not one item at a time at the counter. Update the shelf labels and the system together so staff and customers see the same number.
- **Do not change prices to cover a discount habit.** If staff routinely give money off, fix the discount rules instead of raising every price.`),
    shot({
      heading: 'Price, cost and margin on every product',
      body: 'Each product card shows the selling price, the cost and the margin, so a thin or negative margin is visible when you set the price.',
      id: SHOT.inventory,
      url: 'app.nafaa.pk/products',
      layout: 'full',
      caption: 'Product cards in a demo grocery store, with stock value and low stock alerts at the top.',
    }),
    steps(
      'A monthly pricing review',
      [
        ['Update costs', 'Enter every purchase at the price you actually paid, including transport, so cost and margin are current.'],
        ['Check the compared items', 'Look at your key value items against the competitor list you wrote down this month.'],
        ['Find thin and negative margins', 'List items selling below cost or below their category target, and decide: new price, new supplier, or drop.'],
        ['Look at what sells', 'Compare profit by product with last month. A fast seller at a thin margin may be fine; a slow seller at a thin margin is not.'],
        ['Change and label together', 'Change prices in one go, update shelf labels the same day, and tell the counter staff.'],
      ],
      'One hour on a fixed day each month is enough for most small shops.',
      true,
    ),
    prose(`## Mistakes to avoid

- **One margin for everything.** It overprices the items customers compare and underprices the ones they do not.
- **Pricing from an old invoice.** If the last purchase cost more, every sale at the old price earns less than you think.
- **Matching the cheapest shop on every item.** You will win the price comparison and lose the month.
- **Letting the counter decide.** Rounding, haggling and friendly discounts add up. Set the price once and set a discount limit.
- **Forgetting wholesale buyers.** Customers who buy by the carton need their own rates; see [wholesale vs retail pricing](/blog/wholesale-vs-retail-pricing).

## How Nafaa helps

In [Nafaa inventory](/product/inventory), each product card shows price, cost and margin side by side, and the catalog analytics group products by margin and list items that are selling below cost or have no cost entered. Each supplier's page has a rates tab showing how the cost of every item moved across purchases, so you see a rise before it eats your margin. The counter has a maximum discount setting, and the [profit by product report](/product/reports) shows sale, cost, profit and margin for each item for your monthly review.`),
    tip('Keep your competitor list on one sheet with dates. After three or four months it shows you which shops move prices first, which is more useful than any single check.', 'Date every price check'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Cost as the floor', 'Key value items', 'Competitor checks', 'Worked example', 'Price endings', 'Printed-price goods', 'When to change prices', 'Monthly review', 'Mistakes', 'How Nafaa helps'],
  dropped: [],
  evidence: [
    'apps/web/src/modules/inventory/products/list/components/ProductCard.tsx',
    'apps/web/src/modules/inventory/products/list/components/CatalogAnalytics.tsx',
    'apps/web/src/modules/purchasing/suppliers/pages/SupplierDetailPage.tsx',
    'apps/web/src/modules/organization/settings/sections/POSSection.tsx',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/finance/profit-report/pages/ProfitReportPage.tsx',
  ],
  factNote:
    'Worked example uses illustrative amounts, not market prices. PBS price statistics page (SPI, CPI, WPI listed) and Wikipedia articles on cost-plus pricing, psychological pricing and loss leaders were opened and checked to load on 2026-10-26. Product statements checked against the code (see evidence).',
};

export default spec;
