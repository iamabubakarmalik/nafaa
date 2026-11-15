/**
 * Buyer guide: moving from a paper khata register to a POS without losing
 * any udhaar balance (list, cross-check, opening balances, parallel week).
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { mdTable, sourcesBlock, srcChecked, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [srcChecked('Ledger', 'https://en.wikipedia.org/wiki/Ledger', 'Wikipedia', '2026-11-15')];

const spec: PostSpec = {
  slug: 'switch-paper-register-to-pos-without-losing-udhaar',
  title: 'Switching From a Paper Register to POS Without Losing Udhaar',
  summary:
    'To move from a paper register to a POS without losing udhaar, list every customer who owes money, add up the register pages, enter each balance as an opening balance, run the paper and the screen side by side for a week, and only then close the old register. This guide gives the exact order and the mistakes that lose money.',
  category: 'guides',
  cover: PHOTO.switchPaperRegisterToPosWithoutLosingUdhaar,
  tags: ['PRODUCT:khata', 'PRODUCT:pos', 'GLOSSARY_TERM:khata'],
  related: [
    'COMPARE:nafaa-vs-paper-register',
    'ALTERNATIVE:paper-khata-register',
    'BLOG_POST:digital-khata-vs-paper-ledger',
    'BLOG_POST:how-to-reduce-udhaar',
    'GUIDE:managing-udhaar-and-khata',
    'TEMPLATE:khata-udhaar-register',
    'SERVICE:data-migration',
  ],
  isNew: true,
  seoTitle: 'Paper Register to POS Without Losing Udhaar',
  seoDescription:
    'A step-by-step plan to move your paper khata register to a POS: list balances, enter opening balances, run both for a week, then close the register.',
  focusKeyword: 'paper register to pos',
  sources: SOURCES,
  blocks: [
    prose(`Most shop owners who think about software are not afraid of the screen. They are afraid of the register. The thick book with years of udhaar in it is the one asset that is not in the bank, not in the stock and not in any report, and nobody wants to lose a single page of it during a change. That fear is reasonable, and it can be handled with a plan that takes about two weeks of light effort.

This guide is for owners who are choosing a POS and want to know how the switch works before they pay for anything. It does not assume you are technical. It assumes you have a register, a few staff and customers who will not forgive a wrong balance.

## Why udhaar gets lost during a switch

Udhaar is rarely lost on the day you switch. It is lost in the weeks around it, in four ways.

- **Two books at once, with no owner.** The old register is still used for some customers while the new system is used for others, and nobody knows which is correct.
- **Balances typed from memory.** A cashier enters what a customer "usually owes" instead of what the page says.
- **Old entries skipped.** Small balances from last Eid or last winter are left out because they feel old. Customers notice when you stop asking, and some stop paying.
- **Payments recorded in the wrong place.** A customer pays against the old register and the new system still shows the debt, so a reminder goes out for money that was already received.

Every step below exists to close one of those four gaps.

## Step 1: choose a cut-off day

Pick a date, ideally the first day of a month or a quiet weekday, and write on the register: "Balances as on this date". Everything before that day belongs to the old book, everything after it to the system. Do not pick the week before Eid or a sale. Pick a day when the counter is calm enough for one person to sit with the register for an hour or two.

## Step 2: make one clean list from the register

Do not type from the register page by page while customers are waiting. First make a clean list on a sheet or in a notebook, with three columns: customer name, phone number and the balance still unpaid on the cut-off day.

Do this honestly, even for small amounts. Where a customer appears on several pages, add the pages and write one total. Where a name is written two ways, such as "Rafiq" and "Rafiq bhai Gali 4", decide that it is one person and write down why. Where you cannot read a page, mark it and ask the staff member who wrote it.

Then add up the whole list. That total is your **register total**. Write it at the top of the sheet. You will compare it with the system later, and that comparison is the safety net for the whole switch.

The [khata register template](/templates/khata-udhaar-register) is a ready sheet for this list if you do not want to draw columns yourself.

## Step 3: decide what is real and what is not

Some balances in an old register are not real. A customer moved city, a person passed away, a dispute was settled verbally. Do not delete them silently, because deleting changes your register total and you lose the check. Put them in a separate short list called "doubtful" and decide each one with your own head, not the cashier's. A good rule is to keep doubtful balances in the system with a note, and to decide at the end of the month whether to write them off.

## Step 4: enter balances as opening balances, not as sales

This is the point where the choice of software matters. A balance from the old register should go in as an **opening balance** on the customer's khata. It should not be entered as a new sale, because a new sale would also remove stock, add to today's sales and change your profit. An opening balance only says: this customer owed this much when we started.

Ask any software you are considering two questions:

1. Can I enter an opening balance per customer without creating a bill?
2. Does it appear in the customer's ledger and in the total receivable, so that my list total can be compared with the system total?

Nafaa has an opening balance step for this. The help article on [opening balance](/help/khata-and-customers/opening-balance) shows how, and the [add a customer](/help/khata-and-customers/add-a-customer) article covers the customer details. If you have hundreds of customers, ask about the [data migration service](/services/data-migration) instead of typing them by hand.`),
    shot({
      heading: 'The total receivable is your check',
      body: 'After the opening balances are in, the khata page shows the total udhaar you are owed and splits it by age. This total must match the register total you wrote on your clean list. If it does not, the difference is a missing or doubled entry, and you find it now, not in three months.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
      callouts: [
        { x: 25, y: 19, label: 'Total udhaar to collect' },
        { x: 48, y: 30, label: 'Udhaar by age' },
        { x: 87, y: 55, label: 'Record a payment' },
      ],
      caption: 'Khata page from a demo store.',
    }),
    prose(`## Step 5: match the totals before you go live

Compare two numbers: the register total on your clean list and the total receivable in the system. They should be the same to the rupee.

If they are not, do not guess. Sort both lists by balance and go down them together. Most differences come from one of three causes: a customer entered twice under two spellings, a page that was added in the list but missed in the system, or a typing error where 4,500 became 450. Fix it, then compare again. Only when the two totals agree should you move to the next step.

## Step 6: run both for one week

For the first week after the cut-off day, keep the paper register open but change how you use it. New udhaar goes into the system only. The register is used only to **look up** old balances if a customer disputes the system. If a customer pays, the payment is entered in the system, and the staff member writes a small tick and the date next to the name in the register.

Why keep the register open at all? Because for the first week, customers and staff will test the new system, sometimes without meaning to. A customer says "my balance was less", and the register is the proof. After a week with no disputes, you stop opening it.

## Step 7: teach the counter three actions

Staff do not need the whole software on day one. They need three actions for udhaar:

1. **Sell on udhaar**: choose the customer, finish the bill and put the whole amount or part of it on the khata.
2. **Receive a payment**: open the customer, record the amount and the way it was paid, and print or send the receipt.
3. **Check a balance**: search the customer and read the balance before agreeing to more udhaar.

The help articles on [udhaar sale](/help/khata-and-customers/udhaar-sale) and [receiving a payment](/help/khata-and-customers/receive-a-payment) are short enough to read together at the counter. Set a [credit limit](/help/khata-and-customers/credit-limit) for customers who tend to run up large balances, so a cashier cannot extend credit beyond what you agreed.

## Step 8: send the first reminders carefully

When the system is live and the totals match, it is tempting to send a reminder to everyone with a balance on the same afternoon. Do not. Customers who have not heard from you for months will be surprised, and a message that arrives with no warning can sound like an accusation.

Start with the oldest and largest balances, call or visit first, and then send the message as a follow-up. Tell regular customers that you have moved to a new system and that their balance is the one in the book. A short sentence from you does more than any message template.

## What to check in any POS before you commit

When you compare options, keep the register in mind. These points decide whether a switch is easy or painful:

`),
    mdTable(
      'Questions to ask before you pick a POS',
      'What decides whether moving the register is easy or painful.',
      [
        { key: 'why', label: 'Why it matters' },
      ],
      [
        ['Opening balance without a bill', 'Stops old udhaar from changing stock and profit'],
        ['Customer ledger with every entry', 'You can prove a balance to a customer'],
        ['Ageing of udhaar', 'Shows which balances are old and need a call'],
        ['Credit limit and PIN', 'Stops cashiers from extending credit on their own'],
        ['Works when the internet is down', 'Udhaar is recorded in the busiest hours too'],
        ['Export of customers and balances', 'You are not locked in if you change later'],
      ],
    ),
    prose(`The last row is easy to forget. A good system lets you take your customer list and balances out as a file. That is also how you stay honest with yourself: the data is yours, not the software's.

## Mistakes that lose money

- **Starting the system mid-week with no cut-off day.** Nobody knows which entries are in which book.
- **Throwing the register away.** Keep it, in a safe place, for at least a year. It is your record if a dispute reaches a third person.
- **Letting one cashier do the whole migration.** The person who wrote the old entries should not be the only person who types them in. Ask a second person to read out the totals.
- **Writing off balances to make the numbers look clean.** A write-off is a decision with a date and a reason, not a way to make two totals match.

## How Nafaa fits this plan

Nafaa's khata takes udhaar straight from the counter, supports opening balances for customers coming over from a paper register, groups balances by age, lets you set a credit limit per customer and sends a WhatsApp reminder in one tap. Payments and khata entries made while the internet is down wait on the device and sync later. You can try the whole plan during the free trial, with a handful of real customers first, before you enter the rest. See [Digital Khata](/product/khata) for details, the [Nafaa vs paper register](/compare/nafaa-vs-paper-register) comparison for an honest side-by-side, and [pricing](/pricing) for the plans.`),
    steps(
      'The switch in one list',
      [
        ['Pick a cut-off day', 'Write it on the register. Balances are as on that date.'],
        ['Make a clean list', 'Name, phone and unpaid balance, with one total at the top.'],
        ['Separate doubtful balances', 'Keep them, mark them, decide them yourself later.'],
        ['Enter opening balances', 'No bills, no stock change, one entry per customer.'],
        ['Match the totals', 'Register total and system total must agree to the rupee.'],
        ['Run both for a week', 'New udhaar only in the system; the register only for lookups.'],
        ['Close the register', 'Keep it safe for a year. Start reminders with the oldest balances.'],
      ],
      'Print this and keep it next to the register.',
      true,
    ),
    tip('Do the list on a day when the counter is quiet and ask a second person to read the register total back to you. Two people catch mistakes that one person misses.', 'Two people, one total'),
    sourcesBlock(SOURCES, 'Source'),
  ],
  outline: ['Why udhaar gets lost', 'Cut-off day', 'Clean list', 'Doubtful balances', 'Opening balances', 'Matching totals', 'Parallel week', 'Counter training', 'Reminders', 'What to check', 'Mistakes'],
  dropped: [],
  evidence: [
    'apps/web/src/modules/customers',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/api/prisma/seed-marketing-cms/content/help/articles/khata-and-customers.ts',
  ],
  factNote: 'Practical process advice; product statements checked against the code and help articles (see evidence). Ledger definition page opened 2026-11-15.',
};

export default spec;
