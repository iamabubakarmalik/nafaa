/**
 * Nafaa vs the paper register (khata book). There is no vendor, so there
 * are no competitor facts to source: the comparison is general trade
 * knowledge, written as a markdown table rather than a competitor
 * comparisonTable (which needs vendor sources).
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { type CompareSpec } from '../_compare';

const SUMMARY =
  'Most shops in Pakistan still keep a paper khata and a sales register. This page compares paper with Nafaa honestly: what paper does well, where it loses money and time, when paper is still the right choice, and how to move your old balances into a digital khata in one sitting.';

const spec: CompareSpec = {
  slug: 'nafaa-vs-paper-register',
  title: 'Nafaa vs Paper Register',
  competitorName: 'Paper register (khata book)',
  verdict:
    'A paper register costs almost nothing and needs no power, but it cannot search, remind, add up or back itself up; a digital khata does those for you.',
  summary: SUMMARY,
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compare', heading: 'Nafaa vs the paper register: what you gain, what you give up' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Paper is fine for a one-person shop with a few credit customers; Nafaa pays off once udhaar, staff or stock grow.' },
        { label: 'Paper is enough if', value: 'You run the counter yourself, know every credit customer, and rarely need to check a balance away from the shop.' },
        { label: 'Choose Nafaa if', value: 'Udhaar is a real share of sales, someone else also bills, or you want to know stock and profit without adding up pages.' },
        { label: 'Switching', value: 'Enter each customer\'s current balance once; you do not need to copy the old pages.' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, with a free trial first' },
      ],
      undefined,
      'Which one should you choose?',
    ),
    prose(`## Paper and Nafaa side by side

| | Paper register | Nafaa |
|---|---|---|
| Starting cost | A register and a pen | Monthly plan after a free trial |
| Training | None | A short walkthrough for the counter |
| Works without power | Yes | Needs a charged phone, tablet or a UPS; billing continues offline and syncs later |
| Finding one customer's balance | Turn pages | Search by name or phone |
| How old the udhaar is | Not shown | Grouped by age, oldest first |
| Reminders | Phone call or visit | WhatsApp message in one tap |
| Adding up the day | By hand or calculator | Automatic: sale, cash, wallets, udhaar, profit |
| Stock | Separate register, if any | Drops with every bill |
| Two staff or two counters | Two registers, or one shared | One balance on every counter |
| If it is lost or damaged | Gone | Stored in your account, with a downloadable backup |
| Who changed an entry | Cannot tell | Activity log by person |
| Disputes | Your word against theirs | Every bill and payment behind the balance |

## What paper does well

Paper has lasted because it works.

- **It is cheap.** A register costs very little and lasts months.
- **It is instant.** No login, no screen, no waiting.
- **It survives load-shedding.** No battery, no internet.
- **Customers trust it.** Many like to see their entry written in front of them.
- **It is private.** Nobody can read it without being in the shop.

If you have twenty credit customers, run the counter yourself every day, and settle accounts reliably, a careful paper register can serve you well. We would rather say that than pretend otherwise.

## Where paper loses money and time

- **Forgotten entries.** On a busy evening an udhaar sale goes unwritten, or is written later from memory with the wrong amount.
- **No sense of age.** A register shows what is owed, not for how long. A four-month-old balance looks the same as yesterday's, so the old ones keep growing.
- **Reminders depend on courage.** Collecting means an awkward call or visit, and it is easy to put off.
- **Adding up takes the evening.** Daily totals, monthly totals and each customer's balance are all done by hand, and every addition is a chance for a mistake.
- **One copy.** A wet, torn or lost register takes the record with it.
- **One person at a time.** Only whoever holds the register can see or update it. A second counter or a second shop means a second register, and they never agree.
- **No stock or profit.** A sales register tells you what was sold, not what is left on the shelf or what you earned.
- **Disputes are hard to settle.** "I paid you last week" is hard to answer when the payment is on a page nobody can find.`),
    shot({
      heading: 'The khata, without the pages',
      body: 'Total udhaar to collect, how old each balance is, and a WhatsApp reminder and statement on every customer row.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
      callouts: [
        { x: 25, y: 19, label: 'Total udhaar to collect' },
        { x: 48, y: 30, label: 'Udhaar by age' },
        { x: 87, y: 55, label: 'Record a payment' },
        { x: 94, y: 55, label: 'WhatsApp reminder and statement' },
      ],
    }),
    prose(`## What changes with Nafaa

In Nafaa the khata sits inside the counter. When a bill is made on credit, it goes onto the customer's account at once, with the bill attached. Each customer has one running balance: every udhaar sale, every payment, part payments included.

- **Limits.** Set how much udhaar each customer may carry; the counter stops at the limit unless a manager approves.
- **Ageing.** Balances are grouped by age, and the list can be sorted with the oldest first.
- **Reminders.** Each row has a WhatsApp reminder in a polite, firm or final tone, with the balance filled in, sent from your own WhatsApp.
- **Statements.** Print or share a customer's full statement when they ask.
- **The rest of the shop.** The same bill lowers stock, records the payment method and updates the day's profit.

And when the power goes, a charged phone keeps the counter running; bills made offline sync when the internet returns.`),
    diagram(
      'An udhaar sale lands in the khata, a reminder goes out on WhatsApp, and the payment brings the balance down.',
      { kind: 'khata-cycle', animate: true },
      'The udhaar cycle without paper',
    ),
    steps(
      'Move from paper to Nafaa in one sitting',
      [
        ['Agree balances with your largest customers', 'Before you switch, confirm the current balance with the customers who owe the most.'],
        ['Add your credit customers', 'Name and WhatsApp number for each. Start with those who buy every week.'],
        ['Enter opening balances', 'Copy each customer\'s current balance as an opening balance. You do not need the full history.'],
        ['Bill new udhaar in Nafaa', 'From the next sale on, put unpaid amounts on the customer\'s khata at the counter.'],
        ['Keep the register as a backup', 'Hold on to it for a few weeks while you check the balances match, then retire it.'],
      ],
      'A register of a few dozen customers usually takes an evening.',
      true,
    ),
    prose(`## Questions to ask before you decide

- How many customers owe you money right now, and do you know the total without adding it up?
- How many of those balances are older than a month?
- Does anyone else write in the register?
- What would happen if the register were lost tomorrow?

If you can answer all four quickly and calmly, paper may still be right for you. If not, a digital khata will likely pay for itself in the money it helps you collect. Our guide to [digital khata vs paper](/blog/digital-khata-vs-paper-ledger) goes into the switch in more detail.`),
  ],
  relations: [
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:udhaar', kind: 'TAG' },
    { ref: 'BLOG_POST:digital-khata-vs-paper-ledger', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-reduce-udhaar', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-excel', kind: 'RELATED' },
  ],
  sources: [],
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/customers/customers/pages/CustomerFormPage.tsx',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/pos/hooks/usePosBatches.ts',
    'apps/web/src/modules/backup/pages/BackupPage.tsx',
    'apps/web/src/modules/reports/activity-log/pages/ActivityLogPage.tsx',
  ],
  factNote:
    'No vendor: the paper column is general trade knowledge with no numbers. The comparison is a markdown table, not a competitor comparisonTable. Nafaa statements checked against the files in evidence on 2026-10-26.',
  topics: ['Cost', 'Training', 'Power', 'Search', 'Ageing', 'Reminders', 'Totals', 'Stock', 'Several staff', 'Loss', 'Change history', 'Disputes'],
  dropped: ['"95% with reminders" vs "~60% from memory" recovery.', '"15 minutes" vs "4+ hours" daily time.', '"Rs 2,000+ books" cost line.', '"Encrypted cloud backup" (not checked).'],
  needsOwner: [
    'COMPARE needs a competitorUrl to publish; a paper register has none. Decide: make this a GUIDE, or let the API accept no URL for this case.',
    'No competitor facts to verify; the owner should still read the paper column for fairness before the fact-check stamp.',
  ],
};

export default spec;
