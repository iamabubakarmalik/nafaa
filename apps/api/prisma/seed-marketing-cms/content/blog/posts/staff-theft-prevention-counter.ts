/**
 * Preventing theft and leakage at the counter: where money leaks, counter
 * rules, shift close, watching patterns, stock counts and handling
 * suspicion fairly.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { note, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const spec: PostSpec = {
  slug: 'staff-theft-prevention-counter',
  seoDescription: 'Where money leaks at a shop counter, the rules that stop most of it (discount limits, PINs for voids and refunds, shift closing) and how to act fairly.',
  title: 'Preventing Theft and Leakage at the Counter',
  summary:
    'Where money quietly leaks at a shop counter, the rules that stop most of it (discount limits, PINs for voids and refunds, proper shift closing), how to spot patterns in the numbers, and how to handle suspicion fairly.',
  category: 'business',
  cover: PHOTO.staffTheftPreventionCounter,
  tags: ['PRODUCT:staff', 'PRODUCT:pos'],
  related: ['BLOG_POST:stock-taking-guide', 'BLOG_POST:multi-shop-management-guide', 'PRODUCT:reports'],
  isNew: true,
  blocks: [
    prose(`Most shop owners trust their staff, and most staff deserve it. Still, every owner who has run a counter for a few years has a story: a cashier who gave "discounts" to friends, a salesman who sold from the godown and kept the cash, a bill voided after the customer paid. The loss is rarely one big theft. It is small leaks, repeated, that nobody notices because nobody is looking.

The aim of this guide is not to treat staff as suspects. It is to set up a counter where honest work is easy to prove and dishonest work is hard to hide. Good rules protect honest staff too: when the drawer is short, they can show it was not them.

## Where money leaks

| Leak | How it happens |
|---|---|
| Unbilled sales | Customer pays, no bill is made, cash goes in the pocket |
| Voided bills | Bill made, customer pays, bill voided later, cash taken |
| Fake refunds | A return recorded for an item that never came back |
| Discounts | Extra discount for friends, or discount entered and full price charged |
| Wrong item billed | Expensive item billed as a cheap one for a friend |
| Stock walking out | Goods taken from the shelf or godown with no sale |
| Udhaar abuse | Credit given to people who will not pay, sometimes by arrangement |
| Short cash | Cash taken from the drawer during the day |

## The counter rules that stop most of it

1. **Every sale gets a bill.** No exceptions, including for family and friends of staff. A printed or WhatsApp receipt for every customer makes unbilled sales stand out.
2. **A limit on discounts.** Set a maximum discount a cashier can give. Anything above it needs the owner or manager.
3. **A PIN for voids and refunds.** Cancelling a bill or giving money back should need a manager's PIN, every time.
4. **Returns only against the original bill.** Look up the sale, check the item came back, then refund.
5. **The drawer opens only on a sale.** If the drawer opens automatically on a cash sale, any other opening needs a reason.
6. **One login per person.** Shared logins make every report useless. Each cashier uses their own.`),
    steps(
      'Close every shift properly',
      [
        ['Open with a counted float', 'The cashier starts the shift with a known amount of change in the drawer.'],
        ['Count before you see the expected figure', 'At closing, count the drawer note by note before anyone looks at how much should be there.'],
        ['Compare and explain', 'The system shows expected cash and the difference. Any short or over amount gets a written reason.'],
        ['Hand over and deposit', 'Cash goes to the owner or the safe, and the next shift starts fresh.'],
        ['Review the report', 'The owner reads the shift report: sales, payment methods, discounts, voids, refunds and the difference.'],
      ],
      'Counting before seeing the expected figure is important: it stops people counting "to the number".',
      true,
    ),
    prose(`## Watch the patterns, not single events

One void or one cash difference means nothing. A pattern does. Look weekly at each staff member's numbers next to the team average:

- **Voids and refunds per day.** One person with far more than others is worth a look.
- **Discount given.** Total and as a share of their sales.
- **Cash differences.** Small differences that are always short, never over.
- **Bills made at odd times,** such as just before closing or when the owner is usually away.
- **Average bill size.** A cashier whose bills are much smaller than others on the same shift may be leaving items off.

Pair this with regular stock counts of high-value and fast-moving items. If the same items are short count after count, look at who handles them. Our [stock taking guide](/blog/stock-taking-guide) explains how to count without closing the shop.`),
    shot({
      heading: 'Each person\'s numbers on one screen',
      body: 'Sales, bills, discounts, voids, returns and drawer results by staff member, with alerts when someone is far from the team average.',
      id: SHOT.staff,
      url: 'app.nafaa.pk/staff',
      layout: 'full',
    }),
    prose(`## Handling suspicion fairly

If the numbers point at someone, slow down.

- **Check the simple explanations first:** a wrong item billed by mistake, a delivery not entered, a training gap.
- **Look at the records together:** the specific bills, voids and times. Ask the person to explain.
- **Change the process before you accuse:** tighter PIN rules or moving the person to another counter often stops the problem and shows whether it was them.
- **Keep it private** and document what was discussed.

Treat a mistake as a mistake and a pattern as a pattern. Staff watch how you handle these moments.`),
    note('Rules work only if the owner follows them too. If the owner gives undocumented discounts or takes cash from the drawer without recording it, staff will notice and the numbers stop meaning anything.', 'The owner sets the example'),
    prose(`## How Nafaa helps

Nafaa's counter rules let you set the maximum discount a cashier can give and require a PIN for voids, refunds and discounts above the limit. Each staff member has their own login and a role that controls what they can do. Shifts close with a note-by-note count, the expected cash, the difference and a reason, and the Z-report opens right after. The staff and counters report shows each person's sales, bill size, discounts, voids, returns, credit given, PIN use and drawer results against the team average, and the activity log records who changed what and when. The cash drawer can open automatically on cash sales through the printer.`),
    tip('Turn on the PIN for voids and refunds before you need it. Introducing it after a problem feels like an accusation; having it from day one is just how the shop works.', 'Set rules on day one'),
  ],
  outline: ['Where money leaks', 'Counter rules', 'Shift close', 'Patterns', 'Handling suspicion', 'How Nafaa helps'],
  dropped: [],
  evidence: [
    'apps/web/src/modules/organization/settings/sections/POSSection.tsx',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/finance/cash-register/components/CloseShiftModal.tsx',
    'apps/web/src/modules/reports/staff-report/pages',
    'apps/web/src/modules/reports/activity-log/pages/ActivityLogPage.tsx',
    'apps/web/src/modules/hr/staff/components/RolesPanel.tsx',
    'apps/web/src/core/hardware/settings.ts',
  ],
};

export default spec;
