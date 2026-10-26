/**
 * Seasonal stock planning for garment shops: the season cycle, reading last
 * season's sell-through, buying budget, depth versus breadth, size and
 * colour split, moving Eid dates, staged end-of-season sales and dead stock.
 */
import { SHOT, diagram, prose, shot} from '../../main-pages/_build';
import { sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Lawn cloth', 'https://en.wikipedia.org/wiki/Lawn_cloth', 'Wikipedia'),
  src('Islamic calendar', 'https://en.wikipedia.org/wiki/Islamic_calendar', 'Wikipedia'),
];

const spec: PostSpec = {
  slug: 'garment-shop-seasonal-stock-planning',
  title: 'Seasonal Stock Planning for Garment Shops',
  summary:
    'A garment shop plans each season from last season’s sell-through, a cash budget for buying, and a size and colour split taken from real sales, then clears what is left with a staged sale before it becomes dead stock. This guide walks through the season cycle for lawn, Eid, wedding and winter stock with worked examples in PKR.',
  category: 'industry',
  cover: PHOTO.garmentShopSeasonalStockPlanning,
  seoTitle: 'Seasonal Stock Planning for Garment Shops',
  seoDescription: 'Plan lawn, Eid, wedding and winter stock from last season’s sell-through, set a buying budget, split sizes and colours, and clear leftovers in time.',
  focusKeyword: 'garment shop stock planning',
  tags: ['INDUSTRY:garments', 'GLOSSARY_TERM:dead-stock', 'GLOSSARY_TERM:product-variant'],
  related: ['BLOG_POST:clothing-size-inventory-guide', 'BLOG_POST:ramadan-eid-retail-strategy', 'PRODUCT:inventory', 'GLOSSARY_TERM:inventory-turnover'],
  isNew: true,
  sources: SOURCES,
  blocks: [
    prose(`A garment shop does not have one year. It has a run of seasons: summer lawn, Ramadan and Eid, Eid ul Adha, wedding wear, winter fabrics and shawls. Each one starts with buying before you know what will sell, and ends with whatever did not sell. The profit of the season is decided at both ends: how much you bought, and how quickly you cleared the rest.

This guide is about planning quantities and clearing leftovers. For setting up sizes and colours as variants, see [managing stock by size and colour](/blog/clothing-size-inventory-guide). For the Ramadan and Eid rush itself, including staff and cash, see [Ramadan and Eid planning for retail](/blog/ramadan-eid-retail-strategy).

## The season cycle

Every season follows the same cycle, whether it is lawn or winter shawls. Write down your own dates for each step, so buying and clearing start on time instead of when someone remembers.`),
    diagram(
      'One season from planning to clearance. The same cycle repeats for lawn, Eid, wedding and winter stock.',
      {
        kind: 'timeline',
        items: [
          { date: '8 to 10 weeks before', label: 'Review last season and set the budget', note: 'Sell-through by design, size and price band; cash available for buying.' },
          { date: '6 to 8 weeks before', label: 'Place the first order', note: 'Deeper in proven lines, small test quantities of new designs.' },
          { date: 'Launch', label: 'Full price, watch weekly sales', note: 'Best sellers show in the first two or three weeks.' },
          { date: 'Mid-season', label: 'Reorder winners only', note: 'Only if the supplier can deliver while demand lasts.' },
          { date: 'Last weeks', label: 'Staged end-of-season sale', note: 'Step the discount down on a schedule, not all at once.' },
          { date: 'After the season', label: 'Count leftovers and decide', note: 'Clear, bundle, move to another branch or write down.' },
        ],
      },
      'From planning to clearance',
    ),
    prose(`## Start from last season’s sell-through

The most useful number for planning is sell-through: what share of what you bought was sold at full price.

**Sell-through = pieces sold at full price ÷ pieces bought**

For example, last summer you bought 400 lawn suits. You sold 300 at full price, 60 in the end-of-season sale, and 40 are still in the stockroom. Full-price sell-through was 300 ÷ 400 = 75%. Break this down further and the picture gets sharper: by price band, by supplier and by print. You may find that suits at 3,500 rupees to 4,500 rupees sold through at 85%, while suits above 6,000 rupees sold through at 50%. That is next season’s plan: more depth in the middle band, fewer pieces at the top.

Lawn is a lightweight, fine cotton cloth; [Wikipedia](https://en.wikipedia.org/wiki/Lawn_cloth) notes that its popularity in the region comes from being breathable in warm climates. Demand rises and falls with the heat, so a cool spring or a long summer changes how long the season lasts. Your own weekly sales from past years are a better guide than any general rule.

## Set a buying budget before you visit suppliers

Decide how much you will spend before the first supplier visit, not after. A simple way:

**Buying budget = planned season sale at cost + stock you want left at the end − stock you already have**

For example, you plan to sell 1,200,000 rupees of lawn this season at retail. At an average cost of 60% of the sale price, that is 720,000 rupees at cost. You want no more than 50,000 rupees at cost left at the end, and you already hold 90,000 rupees of usable stock from last year. Your budget is 720,000 rupees + 50,000 rupees − 90,000 rupees = 680,000 rupees. Hold back part of it, perhaps a fifth, for reorders of best sellers once the season shows what is working.

## Depth versus breadth

Breadth is how many designs you carry; depth is how many pieces of each. Many shops buy too broad: forty designs, a few pieces each, and no stock left of the ones that sell. A better pattern:

- **Proven lines:** buy deep in designs, colours and price bands that sold through well last season.
- **New designs:** buy small test quantities, and reorder the ones that sell in the first weeks.
- **Statement pieces:** a few high-priced pieces bring customers in, but keep the quantities small.

## Split by size and colour from real sales

For stitched and ready-to-wear stock, the size split matters as much as the total. Use last season’s sales by size, not an even split. For example, if your sales ran S 15%, M 35%, L 30%, XL 15% and XXL 5%, then an order of 200 kurtas becomes 30, 70, 60, 30 and 10, not 40 of each. Do the same for colours. Black and white often sell differently from seasonal colours, and your shop’s pattern is what counts. Unstitched suits avoid sizes, but print and colour still need the same care.`),
    shot({
      heading: 'Stock per size and colour on each article',
      body: 'Each article shows its price, cost, margin and pieces in stock, split by size and colour.',
      id: SHOT.garmentsProducts,
      url: 'app.nafaa.pk/garments/products',
      layout: 'full',
      caption: 'Gaps in the size run show early, while there is still time to reorder.',
    }),
    prose(`## Eid moves every year

Eid ul Fitr and Eid ul Adha follow the Islamic calendar, which has 354 or 355 days ([Wikipedia](https://en.wikipedia.org/wiki/Islamic_calendar)). So each Eid falls about 10 to 11 days earlier in the Gregorian calendar than the year before. Over a few years, an Eid that once fell in the middle of summer moves into spring, and eventually into winter. That changes what customers buy for it: lawn and light fabrics for a summer Eid, heavier fabrics and shawls for a winter one. Check the expected Eid dates each year when you plan, and do not copy last year’s Eid order without asking whether the weather will be the same. Our post on [festival season planning](/blog/festival-season-planning-pakistan) covers the other peaks in the year.

## Wedding wear is a different kind of stock

Formal and bridal wear sells slowly, piece by piece, at high prices, and a single unsold outfit can cost as much as a dozen lawn suits. Plan it with less depth and more care: one or two pieces per design, the most common sizes only, and alterations or made-to-measure for the rest. Track how long each formal piece has been on the floor, and rotate slow pieces between display and storage so regular customers keep seeing something new.

## The end-of-season sale

Leftover seasonal stock loses value quickly. Next year’s prints will be new, last year’s will look old, and the cash is tied up for twelve months. Clearing at a lower margin is usually better than carrying stock to next season.

Plan the sale in stages instead of one deep cut at the end:`),
    prose(`## Example of a staged clearance

| Step | Price (rupees) | Profit per piece (rupees) | When |
|---|---|---|---|
| Full price | 4,500 | 2,000 | Launch to mid-season |
| First markdown: 20% off | 3,600 | 1,100 | When weekly sales start to slow |
| Second markdown: 30% off | 3,150 | 650 | Last two or three weeks of the season |
| Final clearance: 45% off | 2,475 | −25 | After the season, for the last pieces |

*Illustrative numbers for a suit that cost 2,500 rupees and sold at 4,500 rupees. Set your own steps from your margins.*`),
    prose(`Even the final step recovers almost all the cost in cash you can use for the next season. A piece held for a year earns nothing in the meantime and may sell for less next year anyway.

Run the sale on whole collections, so prices go back to normal on time when the sale ends. Make sure the POS shows the sale price automatically; a cashier typing discounts by hand will give different prices to different customers.

## Dead stock

Some pieces will not sell even in the sale. These are [dead stock](/glossary/dead-stock): items that have not sold for a long time, often 90 or 180 days for clothing. Options, roughly in order:

- **Move them.** A design that sits in one branch may sell in another.
- **Bundle them.** Offer a slow piece with a popular one at a combined price.
- **Sell in bulk.** Sell the lot to an off-price trader for cash.
- **Write them down.** Record the loss honestly so your stock value and profit figures are real.

Watch [inventory turnover](/glossary/inventory-turnover) by season too: how many times your stock value was sold during the season. A falling turnover is an early sign that buying has grown faster than sales.

## Mistakes that repeat every season

- Buying by feel at the supplier’s showroom without a budget.
- Splitting sizes evenly because it is easier to order.
- Waiting until the season is over to start the sale.
- Copying last year’s Eid order when Eid has moved into a different season.
- Keeping last season’s pieces on the floor at full price next to new stock.

## How Nafaa helps

In Nafaa’s [garment shop setup](/industries/garments), each article holds its sizes and colours as [variants](/glossary/product-variant) with stock per variant, and products can be tagged with a season. Collections such as Summer Lawn, Eid or Winter show which products belong to each season, what is left in the branch and how each sold in the last 30 days. A sale on a whole collection takes a percent off every price and puts regular prices back when it ends, and the POS shows those pieces under Sale. The stock report filters dead and slow stock over 30, 60, 90 or 180 days and suggests stock worth sending from a branch where it sits to one where it sells, and the profit report shows each article’s discount, profit and margin.`),
    tip('After every season, write one page: what you bought, what sold at full price, what went in the sale and what is left. Read it before the next buying trip for the same season. It is the cheapest planning tool you will ever have.', 'Write the season review'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Season cycle', 'Sell-through', 'Buying budget', 'Depth vs breadth', 'Size and colour split', 'Eid moves every year', 'End-of-season sale', 'Dead stock', 'Mistakes', 'How Nafaa helps'],
  dropped: [],
  evidence: [
    'apps/web/src/industries/garments/pages/CollectionsPage.tsx',
    'apps/web/src/industries/garments/api/collections.api.ts',
    'apps/web/src/industries/garments/api/products.api.ts',
    'apps/web/src/industries/garments/components/meta.ts',
    'apps/web/src/industries/garments/dashboard/widgets.tsx',
    'apps/web/src/modules/inventory/stock-report/components/meta.ts',
    'apps/web/src/modules/inventory/stock-report/components/BranchView.tsx',
  ],
  factNote:
    'Wikipedia "Lawn cloth" (fine cotton plain weave; popular in the region for breathability in warm climates) and "Islamic calendar" (354 or 355 days, used for Islamic holidays) read on 2026-10-26; the 10 to 11 day yearly shift is arithmetic from those figures. Both links checked to load on 2026-10-26. All PKR figures and percentages are examples. Product statements checked against the code.',
};

export default spec;
