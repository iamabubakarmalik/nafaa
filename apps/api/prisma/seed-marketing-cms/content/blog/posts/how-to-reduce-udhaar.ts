/**
 * Reducing udhaar without losing customers: a written credit policy, limits,
 * ageing, a reminder routine, easier ways to pay, and what to do with old
 * balances.
 */
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { tip, type PostSpec } from '../_post';

const spec: PostSpec = {
  slug: 'how-to-reduce-udhaar',
  title: 'How to Reduce Udhaar Without Losing Customers',
  summary:
    'Practical ways to keep credit under control at a Pakistani shop: a simple udhaar policy, a limit for each customer, watching how old balances get, a polite reminder routine, easier ways to pay, and how to handle balances that have gone stale.',
  category: 'business',
  tags: ['GLOSSARY_TERM:udhaar', 'GLOSSARY_TERM:khata', 'PRODUCT:khata'],
  related: ['BLOG_POST:digital-khata-vs-paper-ledger', 'BLOG_POST:whatsapp-customer-retention', 'PRODUCT:payments'],
  isNew: true,
  blocks: [
    prose(`Udhaar keeps customers loyal. The family that buys on credit all month comes back to you, not to the shop that asks for cash. But udhaar is also money you have already spent on stock and not yet received. When it grows too large, the shop runs short of cash to restock, the owner borrows from suppliers, and the oldest balances quietly turn into losses.

The goal is not to stop udhaar. It is to give it on purpose, to people who pay, in amounts you can carry.

## Start with a simple policy

Write down three rules and tell your staff. It takes ten minutes and prevents most problems.

1. **Who gets udhaar.** Regular customers you know, with a phone number on record. Not first-time buyers.
2. **How much.** A limit for each customer, based on how much they buy and how reliably they pay.
3. **When they pay.** Weekly, at the end of the month, or on salary day. Agree it when you open the account.

A written policy also makes it easier to say no. "Shop ka usool hai" is easier for a customer to accept than a personal refusal.

## Set a limit for every customer

Start new credit customers with a small limit, and raise it as they pay on time. A customer who pays every month on salary day can carry more than one who pays when reminded three times. When a bill would take a customer over their limit, the counter should stop and ask: either collect part in cash or get the owner's approval.

## Watch how old the balance is, not just how big

A balance of a few thousand that is paid and renewed every month is healthy. The same amount sitting untouched for four months is a problem. Group your udhaar by age:

| Age of balance | What to do |
|---|---|
| Under 30 days | Normal; no action |
| 30 to 60 days | Polite reminder |
| 60 to 90 days | Firm reminder; stop new credit until part is paid |
| Over 90 days | Personal visit or call; agree a payment plan |

Look at this list every week, oldest first.`),
    diagram(
      'Udhaar sale, reminder, payment and an updated balance: the cycle that keeps credit moving.',
      { kind: 'khata-cycle', animate: true },
      'Keep udhaar moving',
    ),
    steps(
      'A weekly reminder routine',
      [
        ['Pick a fixed day', 'Choose one day each week for reminders, so it becomes routine rather than awkward.'],
        ['Sort by age', 'Open the khata with the oldest balances first.'],
        ['Send the right tone', 'Polite for balances just past the due date, firm for older ones, and a final note only for the oldest.'],
        ['Offer an easy way to pay', 'Include your JazzCash, Easypaisa or bank details, so the customer can pay from home.'],
        ['Record payments the same day', 'Part payments count. Record them and thank the customer.'],
      ],
      undefined,
      true,
    ),
    shot({
      heading: 'Udhaar by age, oldest first',
      body: 'The khata shows the total to collect, how much is older than 30 days, and a WhatsApp reminder and statement on every row.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
      callouts: [
        { x: 25, y: 19, label: 'Total udhaar to collect' },
        { x: 48, y: 30, label: 'Udhaar by age' },
        { x: 94, y: 55, label: 'WhatsApp reminder and statement' },
      ],
    }),
    prose(`## Make paying easy

Many customers do not delay on purpose; they just do not pass the shop with cash in hand. Make it easy:

- Accept mobile wallet and bank transfers, and put the details in your reminder.
- Accept part payments happily. A customer who pays something every week is better than one who avoids you until they have the full amount.
- Send a statement when asked. A customer who can see every bill and payment is less likely to argue.

## Small habits that cut udhaar

- **Collect part of large bills.** For a big purchase on credit, ask for some cash now.
- **Say the balance out loud.** When a credit customer buys, mention their new total. People pay faster when they know the number.
- **Stop credit on missed promises.** If a customer misses an agreed payment date, pause new credit politely until they pay something.
- **Separate family accounts** only if you are sure who pays. One account per household, with the paying member's phone number, avoids confusion.
- **Do not let staff give credit outside the rules.** Limits and approvals apply to everyone at the counter.

## Old balances

Some balances will never be paid in full. For balances that have gone many months:

1. Call or visit, without anger, and ask what the customer can manage.
2. Agree a small weekly or monthly amount and write it down.
3. Stop new credit until the plan is on track.
4. If a balance truly cannot be collected, decide consciously to write it off rather than carrying it forever. Then you know your real numbers.

Keep the relationship. A customer who clears an old balance slowly often stays with you for years.`),
    prose(`## How Nafaa helps

In Nafaa each customer can have a credit limit, and the counter will not put a bill on udhaar beyond it without a manager's PIN. The khata groups balances by age and can be sorted with the oldest first. Every row has a WhatsApp reminder in a polite, firm or final tone, with the balance filled in, and a statement you can print or share. Payments in parts are recorded against the balance, and wallet payments are their own methods so the galla and the wallet both reconcile.`),
    tip('Before Ramadan and Eid, when customers spend more on their own families, run your reminder routine twice. It is easier to collect before the season than after.', 'Collect before the busy season'),
  ],
  outline: ['Policy', 'Limits', 'Ageing', 'Reminder routine', 'Make paying easy', 'Small habits', 'Old balances', 'How Nafaa helps'],
  dropped: [],
  evidence: [
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/customers/customers/pages/CustomerFormPage.tsx',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
  ],
};

export default spec;
