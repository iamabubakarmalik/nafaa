/**
 * Opening a second branch: readiness checks on the first shop, choosing and
 * testing a location, a break-even estimate, staffing, splitting opening
 * stock, prices per branch, daily reporting and a plan for the first 90 days.
 */
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { note, sourcesBlock, src, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Break-even point', 'https://en.wikipedia.org/wiki/Break-even_point', 'Wikipedia'),
  src('Cannibalization (marketing)', 'https://en.wikipedia.org/wiki/Cannibalization_(marketing)', 'Wikipedia'),
];

const spec: PostSpec = {
  slug: 'opening-a-second-branch',
  title: 'Opening a Second Branch: Checks, Costs and the First 90 Days',
  summary:
    'Open a second branch only when the first shop runs well without you at the counter, you have cash for several months of slow sales, and you have someone you trust to run it. This guide covers the readiness checks, choosing a location, a simple break-even estimate, staff, opening stock, prices and the first 90 days.',
  category: 'business',
  cover: PHOTO.openingASecondBranch,
  tags: ['GLOSSARY_TERM:multi-branch', 'GLOSSARY_TERM:stock-transfer', 'GLOSSARY_TERM:break-even-point', 'PRODUCT:multi-shop'],
  related: [
    'BLOG_POST:multi-shop-management-guide',
    'PRODUCT:multi-shop',
    'SOLUTION:retail-chains',
    'BLOG_POST:hire-and-train-counter-staff',
    'GLOSSARY_TERM:working-capital',
  ],
  isNew: true,
  seoTitle: 'Opening a Second Shop Branch in Pakistan: A Practical Plan',
  seoDescription:
    'When you are ready for a second branch, how to test a location, estimate break-even, staff it, split opening stock, set prices and run the first 90 days.',
  focusKeyword: 'opening a second branch',
  sources: SOURCES,
  blocks: [
    prose(`A second branch is the most common way a successful shop grows, and also a common way a successful shop gets into trouble. The new branch takes the owner's time, the old branch slips without him at the counter, and the cash that kept both stocked runs thin.

This guide is about the decision and the opening: whether you are ready, where to open, what it costs and how to run the first three months. For the day-to-day running of several shops once they are open (what to control centrally, branch managers, transfers and one report), read [running more than one shop](/blog/multi-shop-management-guide).

## Five readiness checks

Answer each honestly before you sign a rent agreement:

1. **Does the first shop run without you for a full day?** If sales, cash or stock go wrong when you are away, fix that first. The second branch will take you away often.
2. **Are your numbers in a system, not in your head?** You need item-level sales, stock and profit for the first shop to plan the second.
3. **Is there someone to run the new branch?** A family member or a staff member who has worked with you for a year or more, who knows the prices and the customers, and whom you trust with cash.
4. **Do you have cash beyond the setup cost?** A new branch usually sells slowly at first. You need money to pay rent, salaries and suppliers for several months, on top of fit-out and opening stock.
5. **Are your suppliers ready?** Check they can deliver to the second location and whether more volume gets you a better rate.

If two or more answers are "no", spend the next few months fixing them. It is cheaper than a branch that drags down the first shop.

## Choosing the location

Opening near your first shop makes supervision and stock movement easy, but too near and the new branch only takes customers from the old one. This is called [cannibalisation](https://en.wikipedia.org/wiki/Cannibalization_(marketing)): new sales that come out of your existing shop instead of from new customers. Aim for a different catchment: another market, another side of a main road, or a new housing area with few shops like yours.

Test a location before committing:

- Stand outside at three different times (morning, evening, a weekend) and count people passing and entering similar shops nearby.
- List competitors within walking distance and what they sell, their prices and their busiest hours.
- Ask nearby shopkeepers about rent, load-shedding hours, parking, and how busy the area is in Ramadan and Eid.

## A simple break-even estimate

The [break-even point](https://en.wikipedia.org/wiki/Break-even_point) is where sales cover all costs, with neither profit nor loss. Work it out before you sign. For example, with illustrative numbers:

| Monthly cost | Rupees |
|---|---|
| Rent | 80,000 |
| Two staff salaries | 70,000 |
| Electricity, internet, other | 30,000 |
| **Total fixed cost** | **180,000** |

If your gross margin across items is around 15%, the branch needs about 1,200,000 rupees of monthly sales (180,000 / 0.15), or roughly 40,000 rupees a day, just to break even. Compare that with what your first shop sold in its early months and with what you counted outside the new location. If the gap is large, find a cheaper location or wait. See [break-even point](/glossary/break-even-point) and [how to calculate profit margin](/blog/how-to-calculate-profit-margin) for the method.`),
    note('Count fit-out, deposit and opening stock separately from the monthly costs above. They are paid once, but they come out of the same cash your first shop needs to restock.', 'One-time costs are separate'),
    prose(`## Staff for the new branch

Do not staff a new branch only with new hires. Move one experienced person from the first shop to lead it, and hire to fill the gap they leave. The experienced person knows your prices, your rules on discounts and udhaar, and your customers' habits; new staff learn from them. Our guide to [hiring and training counter staff](/blog/hire-and-train-counter-staff) covers the first week of training.

Give each person their own login and a role that matches the work: the branch lead can see that branch's sales and stock and approve small exceptions; counter staff bill.

## Opening stock

Use the first shop's sales data, not your instinct. Take the top-selling items by quantity and stock the new branch with them in proportion to the sales you expect. For slow items, start with a small quantity or move some from the first shop with a [stock transfer](/glossary/stock-transfer) instead of buying fresh. After the first month, the new branch's own sales tell you what its customers want; they are often different from the first shop's.

## Prices across branches

Keep the same prices in both branches unless there is a clear reason. Customers compare, and staff in both shops should be able to quote the same price. Where a branch faces a cheaper competitor or higher rent, decide the difference on purpose, item by item, and write it down.

## Reporting from day one

Each evening, look at the same numbers for each branch: sales, bills, average bill, cash counted against expected, discounts and returns. In the first weeks, compare the new branch with its own previous week, not with the established shop.`),
    diagram(
      'A first-90-days plan: open small, watch the numbers weekly, and adjust stock, staff and hours by evidence.',
      {
        kind: 'timeline',
        items: [
          { date: 'Before opening', label: 'Checks, location, break-even', note: 'Rent signed only after the numbers work' },
          { date: 'Week 1', label: 'Soft opening', note: 'Owner present daily; fix pricing and stock gaps' },
          { date: 'Weeks 2 to 4', label: 'Daily numbers', note: 'Sales, cash difference, items asked for but not stocked' },
          { date: 'Month 2', label: 'Adjust the range', note: 'Add what customers ask for; move slow stock back' },
          { date: 'Month 3', label: 'Review against break-even', note: 'Decide: keep as is, change, or cut costs' },
        ],
        animate: true,
      },
      'The first 90 days',
    ),
    steps(
      'Daily routine while the branch settles',
      [
        ['Morning', 'Check yesterday\'s sales and cash difference for the new branch before it opens.'],
        ['Midday', 'Call the branch lead: anything out of stock, any customer complaint, any price question.'],
        ['Evening', 'Review bills, discounts and returns; approve stock to send from the first shop.'],
        ['Weekly', 'Compare this week with last week; list items customers asked for that you do not stock.'],
      ],
      undefined,
      true,
    ),
    shot({
      heading: 'Every branch side by side',
      body: 'Sales, profit and bills for each branch against the previous period, with the daily trend and busy hours.',
      id: SHOT.branches,
      url: 'app.nafaa.pk/shops/overview',
      layout: 'full',
      caption: 'Branch analytics from a demo store with three branches.',
    }),
    prose(`## How Nafaa helps

In Nafaa, a new branch is added from the Branches page, and its manager's login can be created in the same step. Each branch shows its own sales, drawer, stock value and staff on duty, and branch analytics compares every branch side by side for any period: sales, net profit and bills against the previous period, the daily trend and busy hours. Stock transfers record what was sent, what actually arrived and any shortage, and staff tied to a branch see only transfers touching it. Low stock and reorder lists work per branch, and quick keys can be shared or limited to one branch. See [multi-shop](/product/multi-shop) for the full set, and [retail chains](/solutions/retail-chains) for larger setups.`),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Readiness checks', 'Location and cannibalisation', 'Break-even estimate', 'Staff', 'Opening stock', 'Prices', 'Reporting', 'First 90 days', 'How Nafaa helps'],
  dropped: [],
  needsOwner: ['Can a product have a different price per branch? Not found in the web code, so the post advises on pricing without claiming it.'],
  evidence: [
    'apps/web/src/modules/organization/shops/pages/ShopFormPage.tsx',
    'apps/web/src/modules/organization/shops/pages/ShopsPage.tsx',
    'apps/web/src/modules/organization/shops/pages/ShopsOverviewPage.tsx',
    'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx',
    'apps/web/src/modules/inventory/low-stock/pages/LowStockPage.tsx',
    'apps/web/src/modules/pos/quick-keys/QuickKeysPage.tsx',
  ],
  factNote:
    'Definitions of break-even point and cannibalisation checked on Wikipedia; links checked to load on 2026-10-26. Product statements checked against the code (see evidence). All PKR figures and the margin are illustrative.',
};

export default spec;
