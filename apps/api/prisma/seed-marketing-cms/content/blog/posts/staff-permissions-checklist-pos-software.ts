/**
 * Buyer checklist: staff control in POS software: logins, roles, permission
 * boxes, manager PIN, discount limits, cash closing and the activity record.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { mdTable, sourcesBlock, srcChecked, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [srcChecked('Principle of least privilege', 'https://en.wikipedia.org/wiki/Principle_of_least_privilege', 'Wikipedia', '2026-11-15'), srcChecked('Audit trail', 'https://en.wikipedia.org/wiki/Audit_trail', 'Wikipedia', '2026-11-15')];

const spec: PostSpec = {
  slug: 'staff-permissions-checklist-pos-software',
  title: 'Staff Control at the Counter: A POS Permissions Checklist',
  summary:
    'Good POS software gives every staff member their own login, only the access the job needs, a manager PIN for refunds and large discounts, a cash closing that shows shortages and an activity record with names. This checklist shows what to ask for and how to test it before you buy.',
  category: 'business',
  cover: PHOTO.staffPermissionsChecklistPosSoftware,
  tags: ['PRODUCT:staff', 'GLOSSARY_TERM:void', 'GLOSSARY_TERM:cash-over-short'],
  related: [
    'BLOG_POST:staff-theft-prevention-counter',
    'BLOG_POST:hire-and-train-counter-staff',
    'BLOG_POST:daily-cash-closing-routine',
    'PRODUCT:pos',
    'PRODUCT:reports',
    'GLOSSARY_TERM:refund',
    'GLOSSARY_TERM:z-report',
    'TEMPLATE:daily-cash-closing-sheet',
  ],
  isNew: true,
  seoTitle: 'POS Permissions Checklist: Control Your Counter Staff',
  seoDescription:
    'What to look for in a POS to control staff: own logins, roles, manager PIN, discount limits, cash closing and an activity record, with a test.',
  focusKeyword: 'pos staff permissions',
  sources: SOURCES,
  blocks: [
    prose(`Most owners who lose money at the counter do not lose it to a dramatic theft. They lose it in small, repeated ways: a discount that nobody approved, a bill deleted after the customer left, a refund to a friend, a drawer that is short by a small amount every week. These are hard to see on paper and easy to see in a system that was set up to show them.

This checklist is for owners choosing POS software who want control without watching the counter all day. It is about software settings and habits, not about distrust of your staff. Good control protects honest staff as much as the owner, because a shortage with no record leaves everyone suspected. For the human side, read our posts on [preventing theft at the counter](/blog/staff-theft-prevention-counter) and [hiring and training counter staff](/blog/hire-and-train-counter-staff).

## The principle: give each person what the job needs

The security idea behind this is called the [principle of least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege): each person gets the access the job needs and nothing more. A cashier does not need to see profit margins or edit prices. A manager does not need to change the owner's settings. The owner sees everything.

The software has to make this easy, or you will not do it. If setting up a restricted login takes an hour, you will give everyone the owner's password.

## 1. A separate login for everyone

Start here. Without one login per person, nothing else works, because you cannot tell who did what.

Check:

- **Each person has their own login,** with a name and, ideally, a PIN or password only they know.
- **No shared logins,** and a way to disable a person's login when they leave.
- **Staff who never touch the system** can still be listed, for attendance and payroll.
- **Per-branch assignment,** so a person only works where they are placed.
- **A login on the shared counter device** that is quick, so people do not leave one user signed in all day.

## 2. Roles and permission boxes

Roles are groups of permissions: Cashier, Manager, Stock keeper, Accountant. You want to start from sensible roles and change them to fit your shop.

Check:

- **Ready roles** that you can use at once.
- **Permission boxes you can tick and untick,** by area: sales, returns, discounts, stock, purchases, reports, settings and staff.
- **Plain wording,** so a permission means what it says. A permission should do exactly what is written, and no more. If "can edit products" also lets someone delete stock, that is a hidden rule.
- **Hiding sensitive numbers,** such as cost price and profit, from cashiers.
- **Separate permissions for sensitive actions:** delete a bill, change a price, adjust stock, give a discount above the limit, refund.

Test: create a cashier role and log in as that person. Try to open the reports, change a price and delete a bill. Each should be refused, politely.

## 3. Manager PIN for risky actions

Some actions should not happen without a second person: refunds, cancelling a bill after printing, a discount above a limit, selling below cost, going over a customer's credit limit.

Check:

- **A manager PIN** that the cashier cannot see, entered at the moment of the action.
- **Discount limits per role,** such as 5 percent for a cashier, more with a PIN.
- **A limit on refunds and voids,** with the reason recorded.
- **Credit limit overrides** that need approval.

See the help articles on [discounts at the counter](/help/pos-counter/discounts-at-the-counter), [returns and refund PIN](/help/pos-counter/returns-and-refund-pin) and [credit limit](/help/khata-and-customers/credit-limit).`),
    shot({
      heading: 'Your team and their roles',
      body: 'The staff page lists everyone with their role, branch, last login and today sales. Permission boxes let you tick exactly what each role may do.',
      id: SHOT.staff,
      url: 'app.nafaa.pk/staff',
      layout: 'full',
      callouts: [
        { x: 43, y: 30, label: 'On duty now' },
        { x: 90, y: 30, label: 'Today sales by staff' },
        { x: 32, y: 48, label: 'Roles and permissions' },
      ],
      caption: 'Staff page from a demo store.',
    }),
    prose(`## 4. Cash closing that shows shortages

A drawer is where small leaks are easiest to hide. A good system keeps a **cash session** for each cashier or shift: opening float, cash in, cash out and an expected closing amount. At closing, the cashier counts the cash and the system shows the difference.

Check:

- **Opening float** recorded at the start. See [opening float](/glossary/opening-float).
- **Expected cash computed by the system,** not typed by the cashier.
- **Over and short** recorded with a name and a date. See [cash over and short](/glossary/cash-over-short).
- **A closing report,** like a [Z report](/glossary/z-report), that you can print or read.
- **Paid-in and paid-out** entries with a reason, such as petty expenses.
- **A rule for who may close,** and a way to review a closed day.

Read the [daily cash closing routine](/blog/daily-cash-closing-routine) and use the [daily cash closing sheet](/templates/daily-cash-closing-sheet) while you are still getting the habit.

## 5. The activity record

Control is not only about prevention. It is also about being able to ask later: who did that? An activity record is a log of sensitive actions with a name, a time and a reason.

Check that these are recorded with a name:

- Refunds, returns and voided bills.
- Discounts, especially those above the limit.
- Price changes and stock adjustments.
- Deleted or edited bills.
- Drawer shortages.
- Logins, and failed PIN attempts.

The record should be something you can search and filter, not a pile of lines. See the idea of an [audit trail](https://en.wikipedia.org/wiki/Audit_trail). It should not be possible for a cashier to delete the record of what they did.

## 6. Attendance, commission and payroll

If you pay commission, check that the system works out commission from actual sales by person, so there is no argument about numbers. Attendance and leave, advances and payslips belong in the same place as the sales record, which saves a second system. See [staff product](/product/staff) for how Nafaa handles it.

## 7. Customer data and who can see it

Customer phone numbers and balances are valuable. Check that a cashier can search and bill a customer without being able to export the full list, and that exports are a permission of their own.

## 8. Offline and device control

If a device is lost or a person leaves, you need to sign that device out. Check that you can see the devices that are logged in, and that offline bills still carry the person's name. See [offline POS](/blog/offline-pos-internet-outage-lost-sales) and the help article on [devices and login](/help/getting-started/devices-and-login).

## A permissions test for the trial`),
    steps(
      'Test the controls in thirty minutes',
      [
        ['Make a Cashier and a Manager', 'Different roles and different PINs.'],
        ['Sign in as the cashier', 'Try reports, price edits and deleting a bill. Each should be blocked.'],
        ['Give a discount above the limit', 'It should ask for the manager PIN.'],
        ['Refund an item', 'It should ask for approval and a reason.'],
        ['Close the drawer with a deliberate shortage', 'Count 500 less than expected.'],
        ['Open the activity record as the owner', 'Every action above should be there, with names.'],
        ['Disable the cashier login', 'The cashier cannot sign in any more.'],
      ],
      'If one step is missing in a product, ask how else you would see it.',
      true,
    ),
    mdTable(
      'Staff control checklist',
      'Ask the vendor to show each line, live.',
      [
        { key: 'see', label: 'What to see' },
      ],
      [
        ['One login per person', 'Name on every bill'],
        ['Roles with tick boxes', 'Plain permissions, no hidden rules'],
        ['Cost and profit hidden from cashiers', 'Per role'],
        ['Manager PIN', 'Refunds, voids, big discounts, credit overrides'],
        ['Discount limit per role', 'Above it needs approval'],
        ['Cash session and closing', 'System-expected cash and recorded difference'],
        ['Activity record', 'Searchable, with names, cannot be deleted by staff'],
        ['Disable a person or device', 'Immediate'],
      ],
    ),
    prose(`## How Nafaa handles it

Nafaa gives every team member a login and a role, with permission boxes you can tick or untick per branch. Counter rules include a manager PIN for refunds, cancelled bills and discounts over your limit, and a credit limit that needs approval to exceed. Attendance and leave, commission and payroll with advances and payslips are in the same place, and an activity log and audit view show refunds, voids, discounts and drawer shorts with a name. Read the [staff product page](/product/staff), the help article on [adding staff and roles](/help/getting-started/add-staff-and-roles) and see [pricing](/pricing) for plans.`),
    tip('Review the activity record once a week for ten minutes, at the same time, even when nothing seems wrong. People behave differently when they know someone looks.', 'A ten-minute weekly habit'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Principle', 'Logins', 'Roles', 'Manager PIN', 'Cash closing', 'Activity record', 'Payroll', 'Customer data', 'Devices', 'Test'],
  dropped: [],
  evidence: [
    'apps/web/src/modules/hr/staff',
    'apps/web/src/modules/hr/commission',
    'apps/web/src/modules/hr/payroll',
    'apps/web/src/modules/pos',
    'apps/web/src/modules/reports',
  ],
  factNote: 'Staff controls follow the staff product page and code. Principle of least privilege and Audit trail definitions from Wikipedia, opened 2026-11-15.',
};

export default spec;
