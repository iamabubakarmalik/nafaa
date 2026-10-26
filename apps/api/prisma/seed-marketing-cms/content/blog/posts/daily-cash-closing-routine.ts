/**
 * A daily cash closing routine for shops: the opening float, recording cash
 * in and out during the day, counting the galla, working out expected cash,
 * handling over and short, checking wallet, bank and card payments, the
 * Z report and the handover. Worked example uses illustrative amounts.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Cash register', 'https://en.wikipedia.org/wiki/Cash_register', 'Wikipedia'),
  src('Petty cash', 'https://en.wikipedia.org/wiki/Petty_cash', 'Wikipedia'),
  src('Raast', 'https://en.wikipedia.org/wiki/Raast', 'Wikipedia'),
];

const spec: PostSpec = {
  slug: 'daily-cash-closing-routine',
  title: 'A Daily Cash Closing Routine for Shops',
  summary:
    'Closing the day properly means starting from a counted float, recording every rupee that goes in or out of the galla, counting the drawer note by note, and comparing it with the cash that should be there. This guide gives the full routine, a worked example, and how to check wallet, bank and card payments before you lock up.',
  category: 'guides',
  cover: PHOTO.dailyCashClosingRoutine,
  tags: ['GLOSSARY_TERM:galla', 'GLOSSARY_TERM:z-report', 'GLOSSARY_TERM:cash-over-short', 'PRODUCT:pos'],
  related: [
    'BLOG_POST:staff-theft-prevention-counter',
    'BLOG_POST:digital-payments-jazzcash-easypaisa-raast',
    'GLOSSARY_TERM:opening-float',
    'GLOSSARY_TERM:day-book',
    'PRODUCT:payments',
    'TEMPLATE:daily-cash-closing-sheet',
    'GLOSSARY_TERM:petty-cash',
  ],
  isNew: true,
  seoTitle: 'Daily Cash Closing Routine for Shops (Step by Step)',
  seoDescription: 'A daily cash closing routine for shops: start from a counted float, record every rupee in or out of the galla, count the drawer and check wallets and bank.',
  focusKeyword: 'daily cash closing routine',
  sources: SOURCES,
  blocks: [
    prose(`At most shops the day ends the same way: the owner empties the galla, counts it roughly, takes it home and hopes it is about right. When it is not, nobody can say why. Was it a wrong change, an expense paid from the drawer, a refund, a JazzCash payment counted as cash, or something worse?

A proper closing routine takes ten to fifteen minutes and answers that question every day. It also protects honest staff: when the count matches, everyone knows. This guide covers the full routine. For counter rules against theft, such as PINs for voids and refunds, see [preventing theft and leakage at the counter](/blog/staff-theft-prevention-counter); this post is about the money itself.

## Start with a counted float

The [opening float](/glossary/opening-float) is the change in the drawer before the first sale. Decide a fixed amount, enough small notes for a normal morning, and count it at opening every day, with the person taking the counter present. Write it down.

The float should match what was left in the drawer at the last closing. If yesterday's closing left 5,000 rupees and this morning's count is 4,800 rupees, you want to know before the first customer, not at night.

## Record every rupee that is not a sale

Most closing differences are not theft. They are cash that moved without a record:

- 300 rupees for tea and 500 rupees for bags paid from the galla.
- A supplier's delivery boy paid in cash.
- The owner taking 10,000 rupees at lunch.
- Change brought in from the bank or the shop next door.
- A refund given in cash.

Every one of these needs an entry at the time it happens, with a reason. Small spends are what accountants call [petty cash](https://en.wikipedia.org/wiki/Petty_cash). Some shops keep a separate petty cash box so the galla only holds sales money. Either way works, as long as it is recorded.

## Work out the expected cash

At closing, the cash that should be in the drawer is:

> Expected cash = opening float + cash sales + udhaar collected in cash + cash put in − cash refunds − cash paid out − cash taken out

Note what is not in the formula: JazzCash, Easypaisa, bank transfer and card sales. That money never touched the drawer, so it must not be counted as cash. Mixing them up is the most common reason a drawer looks "over" one day and "short" the next.

## A worked example

For example, one day at a small grocery store, with illustrative amounts:

| Item | Amount |
|---|---|
| Opening float | 5,000 rupees |
| Cash sales | + 62,400 rupees |
| Udhaar collected in cash | + 3,500 rupees |
| Cash refund on a return | − 1,200 rupees |
| Bags and tea paid from the galla | − 1,100 rupees |
| Supplier paid in cash | − 15,000 rupees |
| Owner took cash at lunch | − 20,000 rupees |
| **Expected cash** | **33,600 rupees** |
| Counted cash | 33,450 rupees |
| **Difference** | **150 rupees short** |

150 rupees short on a day of more than 60,000 rupees in cash is most likely change given wrongly. It still gets a written reason. What matters is the pattern over weeks: a [cash over/short](/glossary/cash-over-short) that is always short, on the same person's shift, is a different story from small differences in both directions.`),
    steps(
      'The closing routine, every day',
      [
        ['Stop taking cash on the closing counter', 'Finish the last bill, then close the counter. Late customers go to another counter or wait.'],
        ['Count the drawer note by note', 'Sort notes and coins by denomination and count each pile. Write the count of each, not just the total.'],
        ['Compare with expected cash', 'Check the count against the expected figure. If there is a difference, recount once before you record it.'],
        ['Write the reason for any difference', 'Short or over, record a short reason: wrong change, unrecorded expense found, or unknown.'],
        ['Check wallet, bank and card payments', 'Match the day\'s JazzCash, Easypaisa, bank and card payments in the system with your wallet app, bank app and card slips.'],
        ['Print the Z report', 'Keep the end-of-day report with sales by payment method, the drawer count and the difference.'],
        ['Leave the float, hand over the rest', 'Put tomorrow\'s float back in the drawer and move the rest to the safe or the owner, recorded as cash taken out.'],
      ],
      'If two people can do the count together, do it. It takes the same time and removes any doubt.',
      true,
    ),
    prose(`## Check wallet, bank and card payments

Digital payments are now a large share of sales at many counters, and each one needs checking against its own record, not the galla.

- **JazzCash and Easypaisa:** open the merchant or wallet app and list the day's received payments. Each one should match a bill marked with that method.
- **Bank transfers and [Raast](https://en.wikipedia.org/wiki/Raast):** Raast is Pakistan's instant payment system run by the State Bank, so the money should already show in your bank app. Match the amounts and names.
- **Card:** compare the card machine's settlement slip with the card total in your system.

A screenshot from the customer's phone is not proof of payment. Before the goods leave, check that the money has arrived in your own app or SMS. Our guide to [digital payments at the counter](/blog/digital-payments-jazzcash-easypaisa-raast) covers this in more detail.

## The Z report and the handover

The Z report is the end-of-day summary: who closed, total sales, sales by payment method, cash in and out, the counted cash and the difference. Print it or save it as a PDF, and keep it. If you close on paper, use the free [daily cash closing sheet](/templates/daily-cash-closing-sheet). A month of Z reports shows you patterns no single day can, and gives your accountant what they need.

If the shop runs two shifts, close the drawer at each handover, not just at night. The morning cashier counts and closes; the evening cashier counts and opens. Each shift is then responsible only for its own drawer.

## Mistakes to avoid

- **Counting to the number.** Count first, then look at expected cash. Otherwise people stop when they reach the figure.
- **Taking cash without an entry.** Owners do this most. It turns every closing into a guess.
- **Treating a wallet payment as cash.** The drawer looks over by that amount and the wallet looks short.
- **Skipping small differences.** 100 rupees a day is 3,000 rupees a month. Record it even when it does not matter.
- **Closing tired at midnight.** If the shop closes late, count right after the last bill, not after cleaning and locking up.`),
    shot({
      heading: 'Cash in drawer, live',
      body: 'The dashboard shows today\'s sale, bills, profit and the cash that should be in the drawer right now, so a big gap shows up before closing.',
      id: SHOT.dashboard,
      url: 'app.nafaa.pk/dashboard',
      layout: 'full',
      caption: 'Dashboard for a demo grocery store.',
    }),
    prose(`## How Nafaa helps

The cash register in Nafaa opens each shift with a float counted as one amount or note by note, and shows what the last shift of that branch left in the drawer so the opening count can be checked. During the day, cash in and cash out are recorded with a reason, and the till shows the cash the drawer should hold at that moment. At closing you count note by note, see the expected cash and the difference, and must write a reason when it is short or over; the Z report opens right after, and prints on a thermal slip, A4 or PDF. Wallet, bank and card sales are kept apart from cash, the [payments](/product/payments) accounts show what came into each one, and the day book in [reports](/product/reports) lists what is still left to close for the day. The cash register analytics show shorts and overs by staff and by day.`),
    tip('Keep the float the same every day. When the opening amount never changes, a wrong float is obvious and nobody has to remember yesterday\'s number.', 'Fix the float amount'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Counted float', 'Record cash not from sales', 'Expected cash formula', 'Worked example', 'Closing routine', 'Wallet, bank and card checks', 'Z report and handover', 'Mistakes', 'How Nafaa helps'],
  dropped: [],
  needsOwner: [
    'The post advises counting before looking at expected cash, but the close-shift dialog shows expected cash while counting. Add a blind-count option (hide expected until the count is entered)? If built, mention it in "How Nafaa helps".',
  ],
  evidence: [
    'apps/web/src/modules/finance/cash-register/pages/CashRegisterPage.tsx',
    'apps/web/src/modules/finance/cash-register/components/OpenShiftModal.tsx',
    'apps/web/src/modules/finance/cash-register/components/CloseShiftModal.tsx',
    'apps/web/src/modules/finance/cash-register/components/CashMoveModal.tsx',
    'apps/web/src/modules/finance/cash-register/components/TillCard.tsx',
    'apps/web/src/modules/finance/cash-register/components/print.ts',
    'apps/web/src/modules/finance/money/pages/MoneyPage.tsx',
    'apps/web/src/modules/reports/day-book/DayBookPage.tsx',
    'apps/web/src/modules/pos/lib/posCart.ts',
  ],
  factNote:
    'Worked example uses illustrative amounts. Wikipedia articles on cash registers, petty cash and Raast (instant payment system operated by the State Bank of Pakistan) were opened and checked to load on 2026-10-26. Product statements checked against the code (see evidence).',
};

export default spec;
