/**
 * Pillar guide: running a retail shop in Pakistan, from buying and pricing
 * to the counter, cash, udhaar, stock, staff, customers and the numbers to
 * watch. Each chapter links to the post, term or product page that goes
 * deeper. Worked examples use round illustrative figures.
 */
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { note, tip, type GuideSpec } from '../_guide';

const spec: GuideSpec = {
  slug: 'running-a-retail-shop-pakistan',
  title: 'The Complete Guide to Running a Retail Shop in Pakistan',
  summary:
    'A practical guide to running a retail shop in Pakistan day to day: buying stock, setting prices, running the counter and the galla, handling udhaar, keeping stock right, managing staff, keeping customers and reading the few numbers that tell you whether the shop is making money.',
  seoTitle: 'How to Run a Retail Shop in Pakistan: The Complete Guide',
  seoDescription:
    'How to run a retail shop in Pakistan day to day: buying, pricing, the counter and galla, udhaar, stock, staff, customers and the numbers that show profit.',
  focusKeyword: 'how to run a retail shop in pakistan',
  outline: ['Buying', 'Pricing', 'The counter', 'Cash and the galla', 'Udhaar', 'Stock', 'Staff', 'Customers', 'Numbers', 'Seasons', 'Growing'],
  blocks: [
    prose(`Running a shop well is not one big skill. It is a dozen small habits, done every day: buying the right quantity at the right price, pricing so that each sale leaves something behind, billing quickly and correctly, counting the galla honestly, collecting udhaar before it goes stale, and noticing early when something is going wrong.

This guide walks through those habits in the order a shop owner meets them. It is written for kiryana and general stores, pharmacies, clothing, mobile, hardware and other retail shops across Pakistan. Each chapter is short and links to a longer guide if you want to go deeper. If you are still planning a new shop, start with [how to start a kiryana store](/blog/how-to-start-kiryana-store-pakistan) and come back here once the shutter is up.`),
    diagram(
      'Every rupee in a shop goes round the same loop: buy stock, sell it, collect the money, and buy again. The faster and cleaner the loop, the healthier the shop.',
      {
        kind: 'flow',
        nodes: [
          { id: 'buy', label: 'Buy stock', icon: 'truck', note: 'Supplier bill, landed cost' },
          { id: 'price', label: 'Price it', icon: 'tag', note: 'Margin per item' },
          { id: 'sell', label: 'Sell at the counter', icon: 'scan-barcode', note: 'Bill, payment, receipt' },
          { id: 'collect', label: 'Collect', icon: 'hand-coins', note: 'Cash, wallets, udhaar' },
          { id: 'review', label: 'Check the numbers', icon: 'chart-column', note: 'Profit, stock, cash' },
        ],
        edges: [
          { from: 'buy', to: 'price' },
          { from: 'price', to: 'sell' },
          { from: 'sell', to: 'collect' },
          { from: 'collect', to: 'review' },
          { from: 'review', to: 'buy', label: 'Buy again' },
        ],
        animate: true,
      },
      'The shop\'s money loop',
    ),
    prose(`## 1. Buying stock

Profit is mostly made when you buy, not when you sell. A shop that buys a little cheaper, in the right quantity, has room to compete on price and still make money.

**Know your suppliers.** Most shops buy from a mix of company distributors, who visit with an order booker, and wholesale markets such as Lahore's Shah Alam or Karachi's Jodia Bazaar, where you pick up goods yourself. Distributors give credit and deliver; the market is often cheaper but costs you a day and transport. Keep a list of who sells what, at what rate, and on what credit terms.

**Record every purchase bill.** Each bill should go into your records the day the goods arrive: items, quantities, rates, discounts and freight. This keeps stock right and tells you the real cost of each item. When transport, loading or a scheme discount changes the price, spread it over the items; that is [landed cost](/glossary/landed-cost), and it is what your margin should be calculated on.

**Buy to a list, not a feeling.** Order from a list of items that are running low, not from what the order booker suggests. A [reorder level](/glossary/reorder-level) for each fast item tells you when to buy before you run out. Our [inventory management guide](/guides/inventory-management-small-business) covers this in detail.

**Watch what you owe.** Supplier credit is useful, but it is still a debt. Keep a running balance for each supplier, your [accounts payable](/glossary/accounts-payable), and pay on the agreed day. A good payment record gets you better rates.`),
    prose(`## 2. Pricing for profit

Most shopkeepers price by adding a fixed amount or percentage to cost. That works, as long as you know the difference between [markup and margin](/blog/how-to-calculate-profit-margin).

**Example with round numbers.** You buy an item for 100 rupees and sell it for 125. Your markup is 25% of cost. Your [gross margin](/glossary/gross-margin) is 25 out of 125, which is 20% of the sale price. If your shop's monthly expenses come to a fifth of sales, a 20% margin leaves nothing. Always check margin, not just markup.

- **Fast movers** such as sugar, flour and cooking oil sell on thin margins because every shop has them and customers know the price. Make your money on volume and keep them in stock.
- **Slower items** such as snacks, toiletries and household goods can carry a better margin.
- **Printed prices** ([MRP](/glossary/mrp)) cap what you can charge on many packed goods. Selling above the printed price loses customers and can break the law for some products.
- **[Wholesale prices](/glossary/wholesale-price)** for shopkeepers and bulk buyers should be a separate price list, not a discount given on the spot.

Review prices whenever a supplier rate changes. A price that was fine last month can be a loss today.`),
    shot({
      heading: 'Which items actually make money',
      body: 'A profit report by product shows sales, cost and margin for each item, so you can see which products carry the shop and which only fill the shelf.',
      id: SHOT.profitByProduct,
      url: 'app.nafaa.pk/reports/profit',
      layout: 'split-right',
    }),
    prose(`## 3. The counter

The counter is where time and money are won or lost. A slow counter loses customers in the evening rush; a careless one loses money all day.

**Bill everything.** Every sale gets a bill, even a single packet. Unbilled sales are how stock goes missing and how staff learn that nobody checks.

**Sell in the units customers buy.** Cooking oil by the bottle and the carton, rice by the kilo, soap by the piece and the dozen. If your billing only knows one unit, stock will never match. See [units of measure](/glossary/unit-of-measure) and [loose sale](/glossary/loose-sale).

**Take every payment method your customers use.** Cash is still most common, but many customers now pay with [JazzCash](/glossary/jazzcash), [Easypaisa](/glossary/easypaisa) or a [Raast](/glossary/raast) transfer. Show your own payment QR at the counter and let one bill be split across methods.

**Use a scanner and a printer if you can.** A barcode scanner makes billing faster and removes typing mistakes; a thermal printer gives the customer a clear receipt. Our guides to [barcodes](/blog/barcode-setup-guide) and [receipt printers](/blog/choosing-a-pos-printer) explain what to buy.

**Make returns a process.** Returns and exchanges should go through the billing system as a [sales return](/glossary/sales-return), so stock and cash both change, not as cash handed back from the drawer.`),
    shot({
      heading: 'A counter built for Pakistani shops',
      body: 'Search or scan, pick the unit, split the payment across cash and wallets, and put the rest on khata, on one screen.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'split-left',
    }),
    prose(`## 4. Cash and the galla

The [galla](/glossary/galla) should always be explainable. At any moment, cash in the drawer should equal the opening cash, plus cash sales and cash received on khata, minus cash paid out.

- **Start with a fixed opening float.** The same amount every morning, for change ([opening float](/glossary/opening-float)).
- **Record every rupee that leaves the drawer.** Supplier payments, tea, transport, electricity bills: each one is an [expense](/glossary/operating-expenses) with a note, not a gap.
- **Count at closing and write down the difference.** A small [cash over or short](/glossary/cash-over-short) happens; the same cashier short every week is a pattern.
- **Keep a day book.** The [day book](/glossary/day-book) is the day's record of cash in and out. It is what you check when the numbers do not add up.

Move cash out of the drawer to a safe or bank during the day, so the galla never holds more than it needs.`),
    steps(
      'A ten-minute closing routine',
      [
        ['Stop billing and count the drawer', 'Count notes and coins by denomination.'],
        ['Compare with the expected cash', 'Opening float, plus cash sales and khata receipts, minus payouts.'],
        ['Check wallet and bank receipts', 'Match JazzCash, Easypaisa and bank transfers against the day\'s bills.'],
        ['Record the difference', 'Note any over or short with the cashier\'s name.'],
        ['Set tomorrow\'s float aside', 'Keep the opening amount and move the rest to the safe or bank.'],
      ],
    ),
    prose(`## 5. Udhaar

Credit keeps regular customers loyal, and for many neighbourhood shops it is a large share of sales. It is also where most small shops quietly lose money. The rules that work are simple: decide who gets credit, set a limit for each customer, record every entry with the bill behind it, watch how old each balance is, and remind people early and politely.

Our full [guide to managing udhaar and khata](/guides/managing-udhaar-and-khata) covers credit policy, reminders and old balances. If you still use a paper register, see the [paper khata alternative](/alternatives/paper-khata-register).

## 6. Keeping stock right

Stock is your biggest investment, and it disappears in small ways: unbilled sales, damage, expiry, mistakes on purchase bills and theft. Three habits keep it under control:

- **Enter purchases on arrival** so stock and cost are always current.
- **Count a little every week**, one shelf or one category at a time, instead of one big count a year. See our [stock taking guide](/blog/stock-taking-guide).
- **Clear [dead stock](/glossary/dead-stock)** before it becomes waste: discount it, return it or bundle it.

The [inventory management guide](/guides/inventory-management-small-business) goes through methods, reorder levels and expiry in detail.

## 7. Staff

Good staff make a shop; unchecked staff can quietly drain it. Give each person their own login, so every bill, discount and refund has a name on it. Limit what each role can do: a cashier bills, a manager approves refunds and large discounts. Review the activity log weekly. Our guide to [preventing theft at the counter](/blog/staff-theft-prevention-counter) lists the most common leaks and how to close them.`),
    shot({
      heading: 'Each person with their own login and role',
      body: 'Roles decide who can bill, discount, refund or see profit, and every action is recorded against the person who did it.',
      id: SHOT.staff,
      url: 'app.nafaa.pk/staff',
      layout: 'split-right',
    }),
    prose(`## 8. Keeping customers

A neighbourhood shop competes on trust, convenience and memory: knowing the customer's name, what they usually buy and what they owe.

- **Send receipts and reminders on WhatsApp.** Customers keep them, and a short message brings people back. See [WhatsApp messages for shops](/blog/whatsapp-customer-retention).
- **Reward regulars.** A simple [loyalty points](/glossary/loyalty-points) scheme or a monthly discount for top customers costs little.
- **Never run out of the basics.** A customer who finds no flour twice goes elsewhere for everything.

## 9. The numbers to watch

You do not need to be an accountant, but you do need a few numbers every day and every month:

| Number | What it tells you | How often |
|---|---|---|
| Today's sale | Whether the day was normal | Daily |
| Cash over or short | Whether the galla is honest | Daily |
| Udhaar outstanding | How much of your money is with customers | Weekly |
| [Gross profit](/glossary/gross-profit) | Sales minus the cost of goods sold | Weekly |
| Expenses | Rent, salaries, electricity and the rest | Monthly |
| [Net profit](/glossary/net-profit) | What is left after expenses | Monthly |
| Stock value | How much money sits on the shelves | Monthly |

If net profit is good but you never have cash, the money is stuck in stock or udhaar. That is a [cash flow](/glossary/cash-flow) problem, not a profit problem, and the fix is to collect faster and buy less of what sells slowly. Your [break-even point](/glossary/break-even-point) tells you the sale you need each month just to cover costs.`),
    shot({
      heading: 'The day on one screen',
      body: 'Today\'s sale, profit, cash in the drawer and udhaar to collect, from the same bills the counter makes.',
      id: SHOT.dashboard,
      url: 'app.nafaa.pk/dashboard',
      layout: 'full',
    }),
    prose(`## 10. Seasons

Ramadan, the two Eids, school openings, weddings and winter all change what sells. Plan stock a few weeks ahead, agree delivery dates with suppliers before the rush, and keep enough cash for the extra buying. Our [Ramadan and Eid planning guide](/blog/ramadan-eid-retail-strategy) has a checklist.

## 11. Growing

Once the shop runs smoothly, growth usually takes one of two forms.

- **A second shop or a godown.** This works when the first shop runs without you standing at the counter. Read [running more than one shop](/blog/multi-shop-management-guide) first.
- **Selling online.** Many shops add WhatsApp orders, a simple website or a marketplace to reach customers beyond the street. Our [guide to starting to sell online](/guides/start-selling-online-pakistan) covers channels, payments and couriers.

On tax: most small shops deal only with income tax and, if they are large enough, sales tax registration. If you are a larger retailer or chain, our [compliance pages](/compliance/fbr-pos-integration) explain who must integrate their billing and how.`),
    tip('Pick one habit from this guide, such as the ten-minute closing routine, and do it every day for a month before adding the next. Habits stick one at a time.', 'Start small'),
    note('Nafaa brings the counter, stock, khata, staff and reports into one system that keeps billing when the internet drops. Start a free trial on the device you already have, or see [POS & Billing](/product/pos) first.'),
  ],
  faqs: [
    [
      'How much profit does a retail shop in Pakistan make?',
      'It depends on what you sell, where, and how well you buy and control costs, so any single figure would mislead. Work out your own: track gross margin by product, add up monthly expenses, and calculate net profit each month. Our profit margin guide shows the calculation step by step.',
    ],
    [
      'What records should a small shop keep?',
      'At minimum: every sale bill, every purchase bill, a daily cash record (day book), each customer\'s udhaar and payments, each supplier\'s balance, and a stock count at least once a year. With a POS most of these are kept automatically as you bill and buy.',
    ],
    [
      'Should I give udhaar to customers at all?',
      'For most neighbourhood shops, some udhaar is part of keeping regular customers. The aim is controlled credit: only to people you know, within a limit, recorded with every bill, and reminded on time. Our udhaar and khata guide explains how to set it up.',
    ],
  ],
  terms: ['galla', 'opening-float', 'cash-over-short', 'day-book', 'gross-margin', 'markup', 'landed-cost', 'reorder-level', 'dead-stock', 'break-even-point', 'cash-flow', 'udhaar'],
  related: [
    'BLOG_POST:how-to-start-kiryana-store-pakistan',
    'BLOG_POST:how-to-calculate-profit-margin',
    'BLOG_POST:staff-theft-prevention-counter',
    'BLOG_POST:stock-taking-guide',
    'BLOG_POST:ramadan-eid-retail-strategy',
    'BLOG_POST:multi-shop-management-guide',
    'BLOG_POST:whatsapp-customer-retention',
    'PRODUCT:pos',
    'SOLUTION:single-shop',
    'INDUSTRY:kiryana',
  ],
  evidence: [
    'apps/web/src/modules/pos/engine/PosScreen.tsx',
    'apps/web/src/modules/pos/lib/posUnits.ts',
    'apps/web/src/modules/pos/components/PosSplitTender.tsx',
    'apps/web/src/core/payments/PayQrPanel.tsx',
    'apps/web/src/modules/finance/cash-register/components/CloseShiftModal.tsx',
    'apps/web/src/modules/reports/day-book/DayBookPage.tsx',
    'apps/web/src/modules/finance/profit-report',
    'apps/web/src/modules/hr/staff/components/RolesPanel.tsx',
    'apps/web/src/modules/reports/activity-log/pages/ActivityLogPage.tsx',
    'apps/web/src/modules/customers/loyalty/pages/LoyaltyPage.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
  ],
  factNote:
    'General retail practice; no market statistics. Worked margin example uses round illustrative figures. Wholesale market names (Shah Alam, Jodia Bazaar) are well known and also used on the Lahore and Karachi city pages. Nafaa features checked in the evidence files on 2026-10-26.',
};

export default spec;
