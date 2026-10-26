/**
 * Pillar guide: managing udhaar and the khata, from credit policy to
 * recording, ageing, reminders, collection, disputes, old balances and
 * supplier credit. Links to the udhaar posts, khata product, best-of and
 * alternative pages. Worked examples use round illustrative figures.
 */
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { note, tip, type GuideSpec } from '../_guide';

const spec: GuideSpec = {
  slug: 'managing-udhaar-and-khata',
  title: 'Managing Udhaar and Khata: A Complete Guide for Shops',
  summary:
    'How to give udhaar without losing money: who should get credit, how much, how to record it so nobody can argue, how to tell which balances are going bad, how to remind customers without losing them, how to recover old balances, and how to handle the credit you take from your own suppliers.',
  seoTitle: 'How to Manage Udhaar and Khata in a Shop: Complete Guide',
  seoDescription:
    'Credit policy, limits, recording, ageing, WhatsApp reminders, disputes and old balances: a complete guide to managing udhaar and the khata in a Pakistani shop.',
  focusKeyword: 'how to manage udhaar',
  outline: ['Why udhaar exists', 'What it costs', 'Credit policy', 'Recording', 'Ageing', 'Reminders', 'Collecting', 'Disputes', 'Old balances', 'Supplier credit', 'Paper or digital'],
  blocks: [
    prose(`[Udhaar](/glossary/udhaar) is how a large part of Pakistani retail works. The family that buys groceries all month and pays when the salary comes, the contractor who takes cement and pipes until the client pays him, the regular who forgot his wallet: every shop has them, and turning them away often means losing them to the shop next door.

The problem is not udhaar itself. It is udhaar without rules. Balances grow quietly, old amounts are forgotten, staff give credit the owner does not know about, and one day the shop has plenty of sales and no cash. This guide sets out the rules that keep credit working for you, and how to keep the [khata](/glossary/khata) so that every balance can be explained.`),
    prose(`## 1. What udhaar really costs

Every rupee in a customer's khata is a rupee you cannot use to buy stock, pay rent or pay a supplier on time. That is the real cost of credit, and it is easy to miss because the sale already shows in your books.

**Example with round numbers.** Suppose a shop sells 600,000 rupees a month and a quarter of it is on udhaar, collected on average after a month. At any time about 150,000 rupees of the shop's money is sitting with customers. If collection slips to two months, that becomes 300,000 rupees, and the shop has to find the difference from somewhere: supplier credit, savings or a loan. The sales did not change; the cash did.

This is why [cash flow](/glossary/cash-flow) and [working capital](/glossary/working-capital) matter as much as profit. A profitable shop can still run short of cash if udhaar is collected slowly.

Then there is the loss when a balance is never paid. In a shop with a thin margin, one unpaid balance can wipe out the profit on many good sales. Credit is a loan without interest; treat it with the same care.`),
    prose(`## 2. Set a credit policy

A credit policy is just a few rules you decide once and apply to everyone. Write them down, tell your staff, and stick to them.

- **Who gets credit.** Regular customers you know by name and address, after they have bought for cash for a while. Not walk-in strangers, and not someone whose last balance is still unpaid.
- **How much.** A [credit limit](/product/khata) for each customer, roughly what they buy in a few weeks. A family that shops for 15,000 rupees a month does not need a 50,000 rupee limit.
- **For how long.** A clear settlement point: end of the month, salary day, or every Friday. "When you can" is not a term.
- **Who can give it.** Only the owner or a named manager can open a new credit account or raise a limit. The cashier can only sell within the limit.
- **What happens when it is late.** A reminder at one week, a firm reminder at a month, no new credit past a set age until the old balance is cleared.

The point of a policy is not to refuse people. It is to make every decision once, calmly, instead of at the counter with a queue behind the customer.`),
    tip('Tell customers the rule, not the reason. "Our khata settles every month-end" is easier to say, and to hear, than a conversation about trust.', 'Say it simply'),
    prose(`## 3. Record every entry so nobody can argue

Most udhaar disputes come from missing or unclear entries, not from dishonest customers. A good record has four things for every entry: the date, the bill or items, the amount, and who gave the credit.

- **Link credit to a bill.** When the khata entry comes from the bill itself, the customer can see exactly what they took. In a POS with a built-in khata, the unpaid part of the bill goes onto the customer's account at the counter.
- **Record part-payments as they happen.** A customer who pays 2,000 rupees against a 5,000 rupee bill should see a balance of 3,000 rupees, not a crossed-out line.
- **Keep a running balance.** The current balance after every entry, not a total worked out at the end of the month.
- **Give statements.** A clear list of bills and payments with dates ends most arguments before they start.

If you keep a paper register, the same rules apply: one page per customer, a running balance, and a signature or initials on each credit entry.`),
    shot({
      heading: 'Every customer\'s balance, and how old it is',
      body: 'Nafaa\'s khata shows the total to collect, splits it by age and lists who owes the most, each with a payment button, a WhatsApp reminder and a statement.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
    }),
    prose(`## 4. Watch the age, not just the amount

Two customers each owe 10,000 rupees. One bought last week; the other has not paid since Eid. The second balance is far more likely to go bad, but a simple total treats them the same.

Group balances by age, the way accountants handle [accounts receivable](/glossary/accounts-receivable):`),
    prose(`## Udhaar by age

A simple ageing rule for a neighbourhood shop. Adjust the days to your own settlement terms.

| Age of oldest unpaid udhaar | What it usually means | What to do |
|---|---|---|
| Under 7 days | Normal running account | Nothing yet |
| 7 to 30 days | Past the usual settlement | Friendly reminder with the amount |
| 30 to 90 days | Slipping | Firm reminder, ask for a date, pause new credit |
| Over 90 days | At risk | Personal visit or call, agree a payment plan, stop credit |`),
    prose(`Look at this split once a week. The aim is to keep most of your udhaar in the first two rows. If the bottom rows are growing, your policy is not being followed, or one or two customers need a direct conversation.

## 5. Remind early, remind politely

Most customers who are late have simply forgotten, or are waiting for someone to ask. An early, polite reminder with the exact amount usually works, and it works better than a phone call because the customer can pay without an awkward conversation.

- **Send the amount, not a lecture.** "Assalam o alaikum bhai, your khata balance is 4,350 rupees. Shukriya." is enough.
- **Change the tone as the balance ages.** Polite in the first weeks, firm after a month, plain and final after that.
- **Use WhatsApp.** Most customers read it, and a message from the shop's own number is familiar. See [WhatsApp messages for shops](/blog/whatsapp-customer-retention) for wording.
- **Make paying easy.** Put your JazzCash, Easypaisa or bank details in the message, so the customer can pay from home.`),
    diagram(
      'Credit sale, reminder, payment, updated balance: the loop a khata should run on its own.',
      { kind: 'khata-cycle', animate: true },
      'The udhaar cycle',
    ),
    prose(`## 6. Collecting payments

When the customer pays, record it at once against their account, with the method: cash, JazzCash, Easypaisa or bank transfer. Apply it to the oldest udhaar first, so ageing stays honest. Give a receipt or send a confirmation message; it builds trust and stops the "I already paid" argument later.

Small, regular part-payments are better than waiting for a full settlement that never comes. If a customer cannot pay the whole amount, agree a fixed amount each week and write it down.

## 7. Handling disputes

When a customer says a balance is wrong, do not argue at the counter. Show the statement: each bill, each payment, with dates. Most disputes end there, because the customer has forgotten one bill or one payment. If an entry really is wrong, correct it with a note rather than deleting it, so the history stays clear. If the dispute is about something a staff member wrote, check who made the entry.

## 8. Recovering old balances

Old balances do not improve with time. For each balance over three months:

- **Talk to the customer in person.** Not at the counter in front of others.
- **Agree a plan.** A weekly or monthly amount the customer can actually pay, written down.
- **Stop new credit** until the plan is on track.
- **Decide when to write it off.** Some amounts will not come back. Recording them as a loss at least stops them from distorting your numbers.

Our post on [how to reduce udhaar without losing customers](/blog/how-to-reduce-udhaar) has more on difficult cases.`),
    steps(
      'Cleaning up an old khata in one weekend',
      [
        ['List every customer with a balance', 'From the register or app, with the amount and the date of the last payment.'],
        ['Sort by age', 'Oldest balances first. These are the ones to act on.'],
        ['Confirm balances', 'Send each customer their balance and ask them to reply if it looks wrong.'],
        ['Agree plans for the oldest', 'A fixed payment each week or month, written down.'],
        ['Set limits for everyone', 'From Monday, each customer has a limit and a settlement day.'],
      ],
      undefined,
      true,
    ),
    prose(`## 9. The other side: your supplier credit

Most shops also buy on credit from distributors and wholesalers. This is your [accounts payable](/glossary/accounts-payable), and it deserves the same discipline:

- Keep a running balance for each supplier, with every bill and payment.
- Pay on the agreed day. A reliable payment record gets better rates and priority when stock is short.
- Try to collect from customers before you have to pay suppliers. If your customers take sixty days and your suppliers give thirty, you are funding the gap.

## 10. Instalments and advance payments

Some shops, especially for mobiles, electronics and furniture, sell on [qist](/glossary/qist) (instalments). Treat each instalment plan as a credit account with a fixed schedule, and record each payment against it. Some customers pay in advance, for example for a cake order or a booked item. Keep advances separate from udhaar, so a customer's advance is not mistaken for a payment against an old balance.

## 11. Paper or digital

A paper register is cheap and trusted, and for a shop with a few credit customers it is enough. It cannot add up, show ages, remind anyone or back itself up. A khata app does those things, but you still type each entry. A POS with a built-in khata writes the entry from the bill, so the khata, stock and cash always agree.

We compare the options in [digital khata vs paper](/blog/digital-khata-vs-paper-ledger) and on the [digital khata](/product/khata) page. If you are ready to move off paper, the help article on [opening balances](/help/khata-and-customers/opening-balance) shows how to move old balances in.`),
    shot({
      heading: 'Balances in your pocket',
      body: 'The khata on the owner\'s phone: check a balance, record a payment or send a reminder from anywhere. Payments taken offline sync later.',
      id: SHOT.khataPhone,
      frame: 'phone',
      layout: 'split-right',
    }),
    note('In Nafaa, credit sales go on the khata from the counter, limits need the manager PIN to override, balances are grouped by age, and a WhatsApp reminder with the balance goes out in one tap. See [Digital Khata](/product/khata).'),
  ],
  faqs: [
    [
      'How much udhaar is too much for a shop?',
      'There is no single figure, but two warning signs are clear: when udhaar grows faster than sales, and when a growing share of it is more than a month old. Watch total udhaar and its age every week. If you have to delay supplier payments because customers have not paid, udhaar is too high.',
    ],
    [
      'Is it rude to send udhaar reminders on WhatsApp?',
      'Not if the message is short, polite and exact. Most customers prefer a message they can answer in their own time to a reminder in front of other people at the counter. Start friendly, change the tone only as the balance gets older, and always include the amount and an easy way to pay.',
    ],
    [
      'What should I do when a staff member gives credit without asking?',
      'Make it impossible rather than forbidden. Give each staff member their own login, set a credit limit per customer, and require the owner\'s or manager\'s PIN to go over it or to open new credit. Then every udhaar entry has a name on it, and nobody has to rely on memory.',
    ],
  ],
  terms: ['udhaar', 'khata', 'accounts-receivable', 'accounts-payable', 'cash-flow', 'working-capital', 'qist', 'layaway'],
  related: [
    'BLOG_POST:how-to-reduce-udhaar',
    'BLOG_POST:digital-khata-vs-paper-ledger',
    'BLOG_POST:whatsapp-customer-retention',
    'PRODUCT:khata',
    'PRODUCT:whatsapp-sms',
    'COMPARE:nafaa-vs-paper-register',
    'INDUSTRY:kiryana',
    'INDUSTRY:hardware',
  ],
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/customers/directory/offlineKhataActions.ts',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/web/src/core/security/ManagerPin.tsx',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/purchasing/suppliers/api/supplier-ledger.api.ts',
    'apps/web/src/core/lib/whatsapp/templates.ts',
  ],
  factNote:
    'General credit practice for shops; no statistics. The cash tied-up example uses round illustrative figures and says so. Ageing buckets match the Nafaa khata (under 7, 7-30, 30-90, over 90 days). Nafaa features checked in the evidence files on 2026-10-26.',
};

export default spec;
