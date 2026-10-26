/**
 * Cash vs credit (udhaar) sales: what credit really costs a shop in tied-up
 * cash and bad debts, how it affects cash flow against supplier terms, when
 * credit is worth giving, terms for business buyers, and how to mix cash
 * and credit. Worked examples use illustrative amounts.
 */
import { SHOT, diagram, prose, shot } from '../../main-pages/_build';
import { sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Trade credit', 'https://en.wikipedia.org/wiki/Trade_credit', 'Wikipedia'),
  src('Cash conversion cycle', 'https://en.wikipedia.org/wiki/Cash_conversion_cycle', 'Wikipedia'),
  src('Days sales outstanding', 'https://en.wikipedia.org/wiki/Days_sales_outstanding', 'Wikipedia'),
];

const spec: PostSpec = {
  slug: 'cash-vs-credit-sales',
  title: 'Cash vs Credit Sales: What Each Costs Your Shop',
  summary:
    'Credit sales bring loyal customers and bigger bills, but every rupee of udhaar is cash you have already spent on stock and a small risk of never being paid. This guide shows how to work out what credit costs your shop, when it is worth giving, and how to mix cash and credit safely.',
  category: 'business',
  cover: PHOTO.cashVsCreditSales,
  tags: ['GLOSSARY_TERM:udhaar', 'GLOSSARY_TERM:accounts-receivable', 'GLOSSARY_TERM:cash-flow', 'PRODUCT:khata'],
  related: [
    'BLOG_POST:how-to-reduce-udhaar',
    'BLOG_POST:digital-khata-vs-paper-ledger',
    'GLOSSARY_TERM:working-capital',
    'GLOSSARY_TERM:accounts-payable',
    'SOLUTION:wholesale-distribution',
  ],
  isNew: true,
  seoTitle: 'Cash vs Credit Sales: The Real Cost of Udhaar',
  seoDescription: 'What udhaar really costs a shop: cash tied up, bad debts and supplier gaps. When credit is worth it, terms for business buyers, and mixing cash and credit.',
  focusKeyword: 'cash vs credit sales',
  sources: SOURCES,
  blocks: [
    prose(`Almost every Pakistani shop sells on both cash and udhaar. Cash is simple: the goods leave, the money is in the galla. Credit is a loan. You hand over stock you have already paid for, and wait days or months for the money, trusting that it comes.

Neither is good or bad on its own. Credit keeps regular families and business buyers coming to you instead of the shop next door. But it has a cost that never appears on a bill, and most owners only feel it when they cannot pay a supplier. This post is about measuring that cost and deciding how much credit your shop can carry. For the day-to-day work of collecting, see [how to reduce udhaar](/blog/how-to-reduce-udhaar).

## What credit really costs

A credit sale costs you in three ways.

**1. Cash tied up.** Until the customer pays, the money for that stock is not available to buy more stock, pay rent or take a supplier's cash rate. Businesses measure this as days of sales waiting to be collected; accountants call it [days sales outstanding](https://en.wikipedia.org/wiki/Days_sales_outstanding). For a shop, a simple version works:

> Days of udhaar = total udhaar balance ÷ average credit sale per day

**2. Bad debts.** Some balances are never paid. A bad debt costs much more than its face value, because you have to earn it back from profit on new sales.

**3. Time and effort.** Reminders, statements, arguments over old entries and the staff time they take.

## A worked example

For example, a grocery store sells 40,000 rupees a day, a quarter of it on credit: 10,000 rupees a day of udhaar. Illustrative figures:

| | Customers pay in 30 days | Customers pay in 20 days |
|---|---|---|
| Credit sale per day | 10,000 rupees | 10,000 rupees |
| Udhaar outstanding at any time | about 300,000 rupees | about 200,000 rupees |
| Cash freed by faster collection | | 100,000 rupees |

Collecting ten days sooner releases 100,000 rupees of cash without selling a single extra item. That is money for a better supplier rate or a seasonal stock-up.

Now the bad debt. If your margin is 12% and a customer disappears owing 6,000 rupees, you need 50,000 rupees of new sales (6,000 ÷ 0.12) just to earn that profit back.

## Credit against your supplier terms

The second half of the picture is what you owe. Many shops buy from distributors on 7, 15 or 30 days. This is [trade credit](https://en.wikipedia.org/wiki/Trade_credit): your supplier is lending to you, just as you lend to your customers.

The danger is a gap between the two. If your supplier wants payment in 15 days and your customers pay in 30, you are financing two weeks of sales from your own pocket. Accountants track this as the [cash conversion cycle](https://en.wikipedia.org/wiki/Cash_conversion_cycle): how long cash is gone between paying for stock and collecting from the sale.`),
    diagram(
      'When customers take longer to pay than your supplier allows, the shop pays for the gap from its own cash.',
      {
        kind: 'timeline',
        items: [
          { date: 'Day 0', label: 'Stock arrives on 15-day credit', note: 'Distributor delivers, you sign the bill' },
          { date: 'Day 3', label: 'Sold on udhaar', note: 'A regular customer buys for the month' },
          { date: 'Day 15', label: 'Supplier is paid', note: 'Cash leaves the shop' },
          { date: 'Day 33', label: 'Customer pays', note: 'Cash comes back 18 days later' },
        ],
        animate: true,
      },
      'The cash gap',
    ),
    prose(`The fix is not always "less credit". It can be collecting a little faster, asking your supplier for longer terms on the items you sell on udhaar, or holding back credit on the slow-moving lines.

## When credit is worth giving

Credit makes sense when it brings sales you would not otherwise get, from people who pay:

- **Regular households** who buy most of their monthly groceries from you and pay on salary day. Their total spend is far larger than a cash walk-in's.
- **Business buyers** such as small restaurants, offices, workshops and smaller shops that buy in bulk every week and settle on a fixed day.
- **Seasonal peaks** where a known customer needs a large order now and pays in two parts.

It rarely makes sense for first-time buyers, for amounts larger than a customer usually spends in a month, or on items where your margin is already thin.

| | Cash sale | Credit sale |
|---|---|---|
| Money in the galla | Now | Later, sometimes never |
| Risk | Counterfeit notes, counter mistakes | Bad debt, disputes |
| Customer loyalty | Lower; they go where it is cheapest | Higher; they come back to their khata |
| Bill size | Smaller | Often larger |
| Admin | None | Records, reminders, statements |

## Terms for business buyers

A business buyer is not a household. Put the terms in writing when you open the account:

- **A credit limit,** based on their weekly purchases, not on what they ask for.
- **A payment day,** such as every Saturday or within 15 days of each bill.
- **A bill for every delivery,** with a copy they sign, so there is no argument later.
- **A statement every month,** showing each bill and payment.
- **A rule for missed payments:** new deliveries pause until the balance is back within terms.

Some wholesalers keep one rate for cash and a slightly higher one for credit, so the price covers the cost of waiting. Whether that suits you depends on your market. If you do it, apply it to everyone. Price lists for bulk buyers are covered in [wholesale vs retail pricing](/blog/wholesale-vs-retail-pricing).`),
    shot({
      heading: 'Every credit customer on your phone',
      body: 'The khata shows who owes what, so you can check a customer\'s balance before agreeing to more credit.',
      id: SHOT.khataPhone,
      frame: 'phone',
      layout: 'split-right',
      caption: 'Digital khata on an Android phone in a demo grocery store.',
    }),
    prose(`## Mixing cash and credit safely

Most shops will always do both. A few habits keep the mix healthy:

- **Know your credit share.** Work out what share of last month's sales went on udhaar. If it is rising month after month, decide whether that is on purpose.
- **Take part payment on large bills.** A customer who pays half now and half on salary day carries half the risk.
- **Keep one price for cash and credit at the counter,** unless you have a clear written credit rate. Ad-hoc surcharges cause arguments.
- **Watch your days of udhaar every month.** If the number grows, collect before you lend more.
- **Pay suppliers on time.** Your own good record with distributors gets you better terms, which is what makes customer credit affordable.

## How Nafaa helps

In [Nafaa khata](/product/khata), each customer can have a credit limit, and a bill that would take them over it stops at the counter unless a manager enters a PIN. A bill can be part paid in cash or by wallet with the rest going to the customer's khata. The khata shows balances by age, the credit given and collected this month, WhatsApp reminders and a statement per customer. On the supplier side, each supplier carries payment terms (for example 7, 15 or 30 days) and the [purchasing](/product/purchasing) screens show what you owe by age, so you can see both sides of the cash gap.`),
    tip('Work out your days of udhaar today and write it down. Check it again on the first of each month. One number, tracked over time, tells you more than any single balance.', 'Track one number'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['What credit costs', 'Worked example', 'Supplier terms and the cash gap', 'When credit is worth it', 'Business buyer terms', 'Mixing cash and credit', 'How Nafaa helps'],
  dropped: [],
  evidence: [
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/purchasing/suppliers/pages/SupplierFormPage.tsx',
    'apps/web/src/modules/purchasing/suppliers/pages/SuppliersListPage.tsx',
    'apps/web/src/modules/purchasing/suppliers/pages/SupplierDetailPage.tsx',
  ],
  factNote:
    'Worked examples use illustrative amounts. Wikipedia articles on trade credit, the cash conversion cycle and days sales outstanding were opened and checked to load on 2026-10-26; only their general definitions are used. Product statements checked against the code (see evidence).',
};

export default spec;
