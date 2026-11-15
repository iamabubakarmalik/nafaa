/**
 * Buyer guide: choosing a POS for several branches: one catalogue, stock per
 * branch, transfers, branch reports, staff by branch, cash per branch.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { mdTable, sourcesBlock, srcChecked, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [srcChecked('Point of sale', 'https://en.wikipedia.org/wiki/Point_of_sale', 'Wikipedia', '2026-11-15'), srcChecked('Chain store', 'https://en.wikipedia.org/wiki/Chain_store', 'Wikipedia', '2026-11-15')];

const spec: PostSpec = {
  slug: 'choose-pos-for-multiple-branches',
  title: 'How to Choose a POS for Multiple Branches',
  summary:
    'A multi-branch POS needs one shared catalogue and customer list, separate stock, cash and staff per branch, transfers with send and receive confirmation, and reports that compare branches side by side. This guide gives the questions to ask, the traps in per-branch licences and a test using two branches.',
  category: 'business',
  cover: PHOTO.choosePosForMultipleBranches,
  tags: ['PRODUCT:multi-shop', 'GLOSSARY_TERM:multi-branch', 'GLOSSARY_TERM:stock-transfer'],
  related: [
    'BLOG_POST:opening-a-second-branch',
    'BLOG_POST:multi-shop-management-guide',
    'SOLUTION:retail-chains',
    'PRODUCT:inventory',
    'PRODUCT:staff',
    'GLOSSARY_TERM:stock-transfer',
  ],
  isNew: true,
  seoTitle: 'Choosing a POS for Multiple Branches in Pakistan',
  seoDescription:
    'How to pick a multi-branch POS: shared catalogue, stock per branch, transfers, branch reports, staff and cash per branch, and a test for two shops.',
  focusKeyword: 'multi branch pos software',
  sources: SOURCES,
  blocks: [
    prose(`The second branch is where many owners discover that their software was built for one counter. Stock is in two places, cash in two drawers, staff in two buildings, and the owner in a third. If the system treats the second shop as a copy of the first, every report becomes a small project and every question, "which shop is losing money?", gets a different answer depending on who you ask.

This guide is for owners with two or more branches, or planning them, who are choosing a POS. It does not repeat the business side of opening another shop; for that, see [opening a second branch](/blog/opening-a-second-branch) and our [multi-shop management guide](/blog/multi-shop-management-guide). Here we cover the software: what a multi-branch system must do, the traps in how it is sold, and a test you can run with two branches before you commit.

## What changes when you have more than one branch

Five things get harder at once.

1. **Stock.** The same product has a different quantity in each place, and sometimes it should move between them.
2. **Cash.** Each branch has a drawer, a closing and possibly a different cashier.
3. **People.** A staff member works in one branch, a manager may see several, and you see all.
4. **Prices and products.** You want one catalogue, with the freedom to vary a price for one branch.
5. **Reports.** You need each branch alone, all together and side by side.

A one-shop POS fakes all five by running separate accounts. That works until you want to compare them, move stock or see the total.

## The structure you want: one account, many branches

The cleanest design is one business account with branches inside it. The catalogue (products, categories, barcodes), customers and suppliers are shared. Stock, cash, bills and day-end closing belong to a branch. Staff are assigned to a branch, and you decide who can see more.

Ask the vendor to draw it. If the answer is "each branch is a separate login", you will export and merge spreadsheets every month.

## Shared catalogue, branch-wise stock

Check that:

- **A product is created once** and appears in every branch.
- **Stock is kept per branch,** and the product page shows the quantity in each.
- **Barcodes are the same** across branches, so a label printed in one shop works in the other.
- **Opening stock can be set per branch** when you start.
- **A price can differ by branch** if you need it, while the default stays shared.
- **A product can be hidden** from a branch that does not sell it.

## Stock transfers

Moving stock between branches is where inventory goes wrong without a process. A good transfer has two steps: the sending branch records that goods are on the way, and the receiving branch confirms what arrived. Until it is confirmed, the stock is "in transit", not in either branch.

Check that:

- **A transfer has a document** with items, quantities and a number.
- **The receiver confirms** and can record a difference, like a missing carton.
- **In-transit stock is visible,** so you can see what is on the road.
- **A history exists** for every transfer, with who sent and received.

Read the glossary on [stock transfer](/glossary/stock-transfer) and the help article on [stock transfers](/help/products-and-stock/stock-transfers) for how this works in Nafaa.

## Branch reports

The test of a multi-branch system is the first report you open. You should see:

- **Sales, profit and bills for each branch** over any period, with the previous period for comparison.
- **Share of sales by branch** and a daily trend.
- **Busy hours by branch,** to plan staffing.
- **Top and bottom products by branch.**
- **The same figures in every report,** so the dashboard, the P&L and the branch comparison agree.
- **A filter to see one branch or all.**

If the reports of two branches are added in a spreadsheet by hand, the system is not multi-branch; it is two shops that share a vendor.`),
    shot({
      heading: 'Branches side by side',
      body: 'Branch analytics put every branch next to each other for any period: sales, net profit and bills against the previous period, each branch share of sales and the daily trend.',
      id: SHOT.branches,
      url: 'app.nafaa.pk/branches',
      layout: 'full',
      callouts: [
        { x: 26, y: 19, label: 'Total sale, all branches' },
        { x: 43, y: 20, label: 'Net profit' },
        { x: 37, y: 41, label: 'Pick the period and branch' },
      ],
      caption: 'Branch comparison from a demo store.',
    }),
    prose(`## Staff, roles and cash per branch

Check how people fit:

- **A staff member belongs to a branch** and sees only that branch unless you allow more.
- **A branch manager role** that can see its branch's reports and not the owner's.
- **Cash closing per branch,** with the expected cash and the counted cash, so a short drawer is attributed to a place and a person. See [daily cash closing](/blog/daily-cash-closing-routine).
- **An activity record** that names the person and the branch for refunds, voids and discounts.

For permission design, read [staff control at the counter](/blog/staff-permissions-checklist-pos-software).

## Customers and khata across branches

Decide whether a customer's udhaar is one balance across the business or separate per branch. For most owners it is one balance: a customer who owes at branch A should not get fresh credit at branch B. Check that the khata is shared, that a payment at either branch reduces the same balance and that the credit limit applies to the total.

Loyalty points work the same way: shared across branches, earned in one and used in another, if you want it.

## Offline in each branch

Each branch has its own internet and power. Test that a branch can bill with its internet down and that its bills reach the owner's view after sync. See [offline POS](/blog/offline-pos-internet-outage-lost-sales).

## How multi-branch is priced: the trap

Vendors price branches in three ways, and the difference matters when you grow:

- **A limit on the number of shops in each plan,** with the limit shown in the plan table.
- **A fee per branch,** added to the base price.
- **A separate licence per branch,** sometimes with its own setup.

None is wrong, but compare the cost of three branches, not one. Also ask what happens when you open the fourth: do you move to another plan, and does the data move with you? Nafaa shows how many shops each plan allows on the [pricing page](/pricing).

## Test with two branches

Do this in the free trial, with a second branch created.`),
    steps(
      'Two-branch test',
      [
        ['Create two branches', 'Give each a name and one staff member.'],
        ['Add a product once', 'Check that it appears in both with its own stock.'],
        ['Set opening stock differently', 'Ten in one branch and two in the other.'],
        ['Sell in branch B until it is low', 'Check the stock of each branch.'],
        ['Transfer stock from A to B', 'Send, then receive with one carton short.'],
        ['Take an udhaar sale in A and a payment in B', 'One balance for the customer.'],
        ['Close the day in both branches', 'Each with its own cash.'],
        ['Open the branch comparison', 'Both branches side by side, same numbers as the P&L.'],
      ],
      'Fifteen minutes with real staff will show whether the structure fits.',
      true,
    ),
    mdTable(
      'Multi-branch checklist',
      'Ask the vendor to show each line with two branches, not a slide.',
      [
        { key: 'see', label: 'What to see' },
      ],
      [
        ['One catalogue, stock per branch', 'Created once, counted separately'],
        ['Transfer with send and receive', 'In-transit stock visible'],
        ['Price by branch', 'Optional, shared by default'],
        ['One khata across branches', 'A single balance and limit'],
        ['Staff assigned to a branch', 'Branch managers see their branch only'],
        ['Closing per branch', 'Expected against counted cash'],
        ['Branch comparison report', 'Same numbers as the other reports'],
        ['Plan limit on shops', 'Cost of three and four branches'],
      ],
    ),
    prose(`## How Nafaa handles multiple branches

Nafaa runs every shop, warehouse or godown from one account. Each branch keeps its own counter, stock and cash register, head office compares sales and profit side by side, stock moves between branches with transfers that the other side receives, and each staff member works in the branch they are assigned to. Multi-branch is available on the plans that allow more than one shop; the number of shops each plan allows is on the [pricing page](/pricing). Read the [multi-branch product page](/product/multi-shop), the help article on [multi-branch setup](/help/grow/multi-branch-setup) and the [retail chains solution](/solutions/retail-chains) for details.`),
    tip('Bring the manager of your second branch to the trial. If a person who was not part of the decision cannot find a transfer or a report in five minutes, the system will be a daily annoyance.', 'Include the other manager'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['What changes', 'Structure', 'Shared catalogue', 'Transfers', 'Reports', 'Staff and cash', 'Khata', 'Offline', 'Pricing trap', 'Test'],
  dropped: [],
  evidence: [
    'apps/web/src/modules/organization',
    'apps/web/src/modules/inventory',
    'apps/web/src/modules/hr/staff',
    'apps/web/src/core/lib/offline/syncEngine.ts',
  ],
  factNote: 'Multi-branch statements follow the Nafaa multi-branch product page and code. Wikipedia pages opened 2026-11-15.',
};

export default spec;
