/**
 * Buyer guide: what a wholesaler or distributor needs from software: order
 * booking, load sheets and routes, recovery of credit, schemes and returns.
 */
import { diagram, prose, steps } from '../../main-pages/_build';
import { mdTable, sourcesBlock, srcChecked, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [srcChecked('Wholesaling', 'https://en.wikipedia.org/wiki/Wholesaling', 'Wikipedia', '2026-11-15'), srcChecked('Distribution (marketing)', 'https://en.wikipedia.org/wiki/Distribution_(marketing)', 'Wikipedia', '2026-11-15')];

const spec: PostSpec = {
  slug: 'wholesale-software-orders-routes-and-recovery',
  title: 'Wholesale and Distribution Software: Orders, Routes, Recovery',
  summary:
    'A wholesaler or distributor needs software for order booking, load sheets and delivery, trade credit and recovery, price lists and schemes, and returns and claims, on top of ordinary stock and billing. This guide lists what to check in each area and how to test a system with your real routes and customers.',
  category: 'business',
  cover: PHOTO.wholesaleSoftwareOrdersRoutesAndRecovery,
  tags: ['SOLUTION:wholesale-distribution', 'PRODUCT:purchasing', 'GLOSSARY_TERM:wholesale-vs-retail'],
  related: [
    'SOLUTION:wholesale-distribution',
    'BLOG_POST:wholesale-vs-retail-pricing',
    'BLOG_POST:how-to-reduce-udhaar',
    'PRODUCT:khata',
    'PRODUCT:inventory',
    'GLOSSARY_TERM:delivery-challan',
    'GLOSSARY_TERM:price-list',
  ],
  isNew: true,
  seoTitle: 'Wholesale Distribution Software: Orders and Recovery',
  seoDescription:
    'What a Pakistani distributor needs: order booking, load sheets, routes, credit recovery, schemes and returns, with a checklist for testing software.',
  focusKeyword: 'wholesale distribution software pakistan',
  sources: SOURCES,
  blocks: [
    prose(`A kiryana counter sells one item to one customer and takes the money. A distributor sells hundreds of cartons to dozens of shopkeepers, usually on credit, through salesmen who go on routes, and collects the money days or weeks later. The software that fits the first does not fit the second, and many distributors learn this after a year of spreadsheets and WhatsApp orders.

This article is for owners of [wholesale](https://en.wikipedia.org/wiki/Wholesaling) and distribution businesses who are choosing software. It describes the work in the order it happens, order booking, loading and delivery, recovery of credit, and the extras that decide whether a system is usable: price lists, schemes, returns and claims. It ends with a test you can run with your own customers.

## How a distribution day actually runs

Most distribution businesses in Pakistan follow a similar cycle, even if the details differ by product:

1. **Booking.** A salesman visits shops on his route, or the shopkeeper calls or sends a message, and an order is booked.
2. **Stock check.** The office checks what is available and what must be bought.
3. **Load sheet.** The day's orders are gathered into a load for a van or delivery person.
4. **Delivery.** The van goes out, hands over goods, collects some cash and brings back returns.
5. **Settlement.** At night the van's cash, returned goods and unpaid invoices are matched with the load sheet.
6. **Recovery.** Credit customers pay over time, by cash, cheque or transfer, and someone chases the late ones.

A good system follows this cycle. A system built for retail counters follows a different one, so you end up forcing your day into its screens.

## Order booking: the front of the chain

What to look for:

- **Booking from a phone,** so the salesman does not carry a paper order book and re-type it at night.
- **Customer-specific prices.** A shop on route A may have a different rate or scheme from route B.
- **Stock visible at booking.** A salesman who books 50 cartons that do not exist creates a problem for tomorrow.
- **Credit limit at booking.** Warn or block when the customer's balance is already high.
- **Edit before dispatch.** Orders change, and the system should let office staff adjust them with a record of who did.

Nafaa's distribution module has an orders page where orders are booked and tracked through their stages, and the order editor works with customer prices and stock.

## Load sheets, vans and delivery

A load sheet is the document that says what went on the van and for whom. Without one, you cannot tell at night whether a missing carton was never loaded, was lost or was delivered and not billed.

Check that the system can:

- **Group orders into a load** by route or by van and print the load sheet.
- **Track vans** or delivery people, with their stock and cash.
- **Handle partial delivery,** where the shopkeeper takes some cartons and refuses others.
- **Settle the load** when the van returns, matching delivered, returned and cash collected.
- **Print delivery challans and invoices** in A4 form, not only small receipts.

The [delivery challan](/glossary/delivery-challan) is the document you hand over with the goods. Check that it prints with the details your customers expect.`),
    diagram(
      'The cycle a distribution system has to follow, from the booked order to the recovered money.',
      {
        kind: 'flow',
        nodes: [
          { id: 'book', label: 'Book order', icon: 'clipboard-list', note: 'Salesman or office' },
          { id: 'load', label: 'Load sheet', icon: 'truck', note: 'Per van or route' },
          { id: 'deliver', label: 'Deliver', icon: 'package-check', note: 'Full or partial' },
          { id: 'settle', label: 'Settle the van', icon: 'receipt-text', note: 'Goods, returns, cash' },
          { id: 'recover', label: 'Recover credit', icon: 'wallet', note: 'By age and route' },
        ],
        edges: [
          { from: 'book', to: 'load' },
          { from: 'load', to: 'deliver' },
          { from: 'deliver', to: 'settle' },
          { from: 'settle', to: 'recover' },
        ],
        animate: true,
      },
      'One cycle, five steps',
    ),
    prose(`## Credit and recovery: where the profit is made or lost

For a distributor, the margin on a carton is thin and the credit on the invoice is large. Profit is made when the money comes back, which is why recovery deserves as much attention as the booking.

Ask about:

- **Customer ledgers** with every invoice, payment and return, and the balance by age.
- **Credit limits and credit days** per customer, with a warning or a block.
- **Recovery lists** by route and by salesman, so the person on route knows whom to visit.
- **Payment types,** cash, bank transfer and cheque. A cheque has a date and can bounce; a system should track post-dated cheques as a separate thing.
- **Reminders** by WhatsApp that carry the balance and the invoices.
- **A target view,** so you see which salesman or route has the highest overdue amount.

Read our guide on [reducing udhaar](/blog/how-to-reduce-udhaar) for the principles: the earlier you ask, the more you collect. At distributor scale, the difference is large because one overdue customer may owe the price of many shops.

## Price lists and schemes

A distributor often sells the same product at several prices: a carton price, a piece price, a rate for a key account and a special rate during a scheme. The practical need is simple to state and hard to implement:

- **Several price lists** that you can attach to customers or groups.
- **Carton and piece units,** with automatic conversion in orders and stock.
- **Schemes,** such as a free carton on a quantity, that apply on their own and show on the invoice.
- **A record of the scheme cost,** so you can see what it cost and whether it paid.

See [wholesale vs retail pricing](/blog/wholesale-vs-retail-pricing) for thinking about the price ladder, and the glossary entry on [price lists](/glossary/price-list).

## Returns, claims and damage

Returns are normal in distribution: expired goods, damaged cartons, wrong items. They are costly when untracked. A system should record the return against the invoice, put the item back in sellable stock or into damaged stock, adjust the customer's balance, and, if the loss is the company's to claim, track the claim from the company and its outcome. Look for returns and claims screens, not just a refund button.

## Purchasing and the godown

The other side of distribution is buying. Check purchase orders and goods received notes, supplier accounts, stock in more than one godown and transfers between them. The [purchasing product page](/product/purchasing) and the guide on [purchase orders and GRN](/help/products-and-stock/purchase-orders-and-grn) cover the basics.

## A test with your own data

Do this in a trial before you commit. It takes a morning.`),
    steps(
      'Distribution test with three customers and one van',
      [
        ['Set up three real customers', 'With different prices and credit limits, one near the limit.'],
        ['Book three orders', 'One by phone as a salesman would, one from the office, one that exceeds the limit.'],
        ['Make a load sheet', 'Group the orders for one van and print it.'],
        ['Deliver partly and take a return', 'Leave one item undelivered and take back a damaged carton.'],
        ['Settle the van', 'Match delivered goods, returns and cash collected.'],
        ['Collect a payment and look at the ledger', 'Check the customer balance, the age of the debt and the reminder.'],
      ],
      'If any step needs a spreadsheet, that is the gap to ask about.',
      true,
    ),
    mdTable(
      'Checklist: retail POS or distribution system',
      'Tick what you need. If you need three or more of the lower rows, a retail counter alone will not be enough.',
      [
        { key: 'need', label: 'Why a distributor needs it' },
      ],
      [
        ['Booking from a phone by a salesman', 'No re-typing at night'],
        ['Customer-wise prices and schemes', 'Different shops, different rates'],
        ['Load sheets and van settlement', 'Find where a carton went'],
        ['Credit limits and credit days', 'Stop growth in bad debt'],
        ['Recovery lists by route', 'Collect on the visit, not after'],
        ['Cheque tracking', 'Post-dated cheques are a risk'],
        ['Returns and company claims', 'Damaged and expired stock'],
        ['A4 invoices and challans', 'What the shopkeeper expects'],
      ],
    ),
    prose(`## How Nafaa approaches it

Nafaa has a distribution module for exactly this work. It includes an orders page, load sheets, recoveries, customer-wise price lists and schemes, routes, vans, cheques, returns and claims, and sales targets, and it uses the same stock, khata and purchasing as the rest of Nafaa, so there is one account for the godown, the van and the counter. It is available on the plans that include wholesale and distribution; read the [wholesale and distribution solution page](/solutions/wholesale-distribution) for the full list and the [pricing page](/pricing) for the plans. If your business is mostly counter sales to the public, ordinary [POS](/product/pos) is the simpler fit, and we will say so.`),
    tip('Bring your worst route to the trial: the one with the most late payments and the most returns. A system that works there will work everywhere else.', 'Test on the hard route'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['The distribution day', 'Order booking', 'Load sheets and delivery', 'Credit and recovery', 'Price lists and schemes', 'Returns and claims', 'Purchasing', 'Test', 'Checklist', 'How Nafaa approaches it'],
  dropped: [],
  evidence: [
    'apps/web/src/modules/distribution/pages/OrdersPage.tsx',
    'apps/web/src/modules/distribution/pages/LoadSheetsPage.tsx',
    'apps/web/src/modules/distribution/pages/RecoveriesPage.tsx',
    'apps/web/src/modules/distribution/pages/SettlePage.tsx',
    'apps/web/src/modules/distribution/phase2/vans/VansPage.tsx',
    'apps/web/src/modules/distribution/phase2/cheques/ChequesPage.tsx',
    'apps/web/src/modules/distribution/phase2/returns',
    'apps/web/src/modules/distribution/phase2/claims',
    'apps/web/src/modules/distribution/phase2/targets',
    'apps/web/src/modules/distribution/setup/routes',
    'apps/web/src/modules/distribution/setup/price-lists',
    'apps/web/src/modules/distribution/setup/schemes',
  ],
  factNote: 'Distribution features checked against apps/web/src/modules/distribution. Wikipedia pages opened 2026-11-15. The cycle described is general trade practice.',
};

export default spec;
