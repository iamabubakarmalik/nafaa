/** Help articles: reports-and-cash (/help/reports-and-cash/...). */
import { helpPath, helpShot, note, tip, type HelpArticle } from '../_help';

const DAY_BOOK = 'apps/web/src/modules/reports/day-book/DayBookPage.tsx';
const DAY_PRINT = 'apps/web/src/modules/reports/day-book/print.ts';
const REPORT_SETTINGS = 'apps/web/src/modules/organization/settings/sections/ReportsSection.tsx';
const PROFIT = 'apps/web/src/modules/finance/profit-report/pages/ProfitReportPage.tsx';
const PNL = 'apps/web/src/modules/reports/pnl/pages/ProfitLossPage.tsx';
const CASH = 'apps/web/src/modules/finance/cash-register/pages/CashRegisterPage.tsx';
const OPEN_SHIFT = 'apps/web/src/modules/finance/cash-register/components/OpenShiftModal.tsx';
const CLOSE_SHIFT = 'apps/web/src/modules/finance/cash-register/components/CloseShiftModal.tsx';
const TILL = 'apps/web/src/modules/finance/cash-register/components/TillCard.tsx';
const SHIFT_DETAIL = 'apps/web/src/modules/finance/cash-register/components/ShiftDetailModal.tsx';
const NAV = 'apps/web/src/app/shell/navigation/nav-config.ts';

const articles: HelpArticle[] = [
  {
    slug: 'daily-sales-report',
    title: 'How to read the daily sales report',
    summary:
      'Din ka hisaab is Nafaa’s day report: net sale, money received, profit, the galla, discounts, returns, udhaar and expenses for one day, with tabs for items, staff and checks. Learn how to open any day, read it and share or print it.',
    seoDescription: 'Read the daily sales report in Nafaa: net sale, money in, profit, galla, udhaar and expenses for any day, then share on WhatsApp or print a Z report.',
    focusKeyword: 'daily sales report',
    intro: [
      'The day report in Nafaa is called **Din ka hisaab** (the day’s account). It puts everything that happened in one day on one page: sales, money received by each method, profit, the cash drawer, udhaar given and collected, expenses and purchases. Today’s report updates live while the shop is open.',
      '',
      'Open it from the sidebar under **Overview → Din ka hisaab**.',
    ].join('\n'),
    steps: {
      heading: 'Open and read a day',
      items: [
        ['Pick the day', 'Today opens first. Use the arrows or the **←** and **→** keys for the previous or next day, click the date to choose any day, or use **Jaldi** (quick) for **Aaj**, **Kal** or **Pichhle hafte ka yehi din** (same day last week). Owners can also filter by **Branch**.'],
        ['Read the top line', '**Net sale** is the bill amount minus that day’s returns; void bills are not counted. **Paisa aaya** is money received by every method, **Profit** is gross profit, and the galla figure shows what the drawer should hold or how far the count was off.'],
        ['Check the boxes below', '**Discount**, **Return**, **Udhaar diya** (udhaar given, with the amount collected), **Expense** (with purchases) and **Customer**. Click a box to jump to the tab with the details.'],
        ['Use the tabs', '**Khulasa** (summary) shows sales by hour and compares the day with yesterday and the same weekday last week. **Galla** shows each register, **Paisa** money in and out, **Maal** the items sold, **Staff** each person’s bills, and **Jaanch** (checks) the voids, returns and discounts with who did them.'],
        ['Share or print', 'Use the WhatsApp icon to share the summary, the copy icon to paste it anywhere, **CSV** for the item list, **Z report** for a short closing slip and **Poori kitaab** (full book) for the whole day on A4 or PDF.'],
        ['Close the day', 'Click **Din band karein** (close the day), go through the checklist, then print the **Z report**.'],
      ],
    },
    more: [
      helpShot('daily-sales-report', 'Din ka hisaab for one day: net sale, money in, profit and the galla on top, with the details in tabs.', {
        callouts: [
          { x: 23.4, y: 16.2, label: 'Share, copy, CSV' },
          { x: 36.5, y: 16.2, label: 'Z report' },
          { x: 56.6, y: 16.2, label: 'Din band karein' },
          { x: 82.3, y: 44.6, label: 'Pick the day' },
          { x: 40, y: 52.4, label: 'Tabs' },
        ],
      }),
      tip(
        'To get the day’s summary without opening Nafaa, turn on **Rozana closing report** in **Settings → Messages & reports → Reports & daily summary**. Pick the time and who receives it. It always arrives as an app notification, and you can add email or a WhatsApp button.',
        'Get the report every evening',
      ),
      note('Cost and profit figures are shown only to people whose role allows them to see cost.'),
    ],
    faqs: [
      ['What is the difference between net sale and money received?', 'Net sale is the value of the day’s bills minus returns. Money received (**Paisa aaya**) is what actually came in by any method, including udhaar collected. A credit sale adds to net sale but not to money received.'],
      ['Where are the other reports?', 'The sidebar under **Overview** has **Reports**, **Profit-loss (P&L)**, **Profit by product**, **Stock report**, **Staff aur counter** and **Customers report**.'],
    ],
    terms: ['day-book', 'z-report', 'gross-profit', 'galla'],
    related: ['PRODUCT:reports', 'PAGE:profit-report', 'PAGE:cash-closing', 'PAGE:returns-and-refund-pin', 'TEMPLATE:daily-cash-closing-sheet'],
    evidence: [DAY_BOOK, DAY_PRINT, REPORT_SETTINGS, NAV],
  },
  {
    slug: 'profit-report',
    title: 'How to see your profit',
    summary:
      'See profit in Nafaa two ways: Profit by product shows what each item earned after its cost, and Profit-loss (P&L) shows the whole business after expenses and stock losses. Learn how each figure is worked out and how to find items that lose money.',
    seoDescription: 'See profit in Nafaa: profit by product with cost at the time of sale, and a profit and loss statement after expenses and stock losses, by month or branch.',
    focusKeyword: 'profit report shop',
    intro: [
      'Nafaa has two profit reports, both under **Overview** in the sidebar.',
      '',
      '- **Profit by product** (the page is titled **Profit — cheez war**, profit item by item) shows sale, cost and profit for every item, so you can see what earns and what does not.',
      '- **Profit-loss (P&L)** is the statement for the whole business: sales, cost, expenses, stock losses and net profit for the period.',
      '',
      'Both use the cost the item had when the bill was made, so a later price change does not rewrite old profit.',
    ].join('\n'),
    steps: {
      heading: 'Check profit by product',
      items: [
        ['Open the report', 'In the sidebar, open **Overview → Profit by product**.'],
        ['Choose the period', 'Use **Period** to pick today, 7 days, this month or your own dates. Each figure is compared with the same length of time before it.'],
        ['Read the top figures', '**Asal sale** (actual sale) is the list price minus discounts and returns. **Gross profit** is actual sale minus the cost of the goods. **Net profit** takes off expenses and damaged or lost stock.'],
        ['Find problem items', 'Click **Nuqsan wali cheezein** (items sold at a loss), **Discount** or **Return** to show only those items. Sort and filter by **Category**, **Brand** or **Staff**.'],
        ['See where profit comes from', 'Switch tabs to **Category**, **Brand**, **Supplier**, **Staff** or **Din war** (day by day). Click a row to filter the item list by it.'],
        ['Export', 'Use **CSV** or **Print** for the full list.'],
      ],
    },
    more: [
      helpShot('profit-report', 'Profit by product: actual sale, gross and net profit on top, then each item’s sale, cost, profit and margin.', {
        callouts: [
          { x: 35.8, y: 40.8, label: 'Period' },
          { x: 57.9, y: 30.4, label: 'Items sold at a loss' },
          { x: 43.5, y: 48.4, label: 'Category, brand, supplier, staff' },
          { x: 95.2, y: 59.2, label: 'Margin per item' },
        ],
      }),
      tip(
        'An item with no cost entered shows 100% profit. If the yellow notice appears, click **Bina cost** (without cost) and fill in the missing costs so the report is right.',
        'Missing costs',
      ),
      helpShot('profit-report-2', 'Profit-loss (P&L): net profit, net sale, gross margin and expenses, with the statement line by line.', {
        callouts: [
          { x: 25.4, y: 19.4, label: 'Net profit' },
          { x: 90, y: 30.6, label: 'Sold on udhaar' },
          { x: 72.4, y: 40.8, label: 'Muqabla' },
          { x: 35, y: 48.4, label: 'Bayan, Mahine war, Paisa' },
        ],
        heading: 'The profit and loss statement',
        body: 'Open **Overview → Profit-loss (P&L)** for the whole business. **Bayan** (statement) lists sales, discounts, returns, cost, expenses and stock losses down to net profit. **Mahine war** shows month by month, **Branch war** each branch, and **Paisa aaya/gaya** money in and out, including sales on udhaar that are not collected yet. Use **Muqabla** to compare with the previous period or the same dates last year, and **Tankhwah** to choose whether staff salaries count as expenses.',
      }),
    ],
    faqs: [
      ['Why is my profit different from cash in the drawer?', 'Profit counts the bill value minus cost, including sales on udhaar that are not paid yet. The drawer holds only cash. **Paisa aaya/gaya** in the P&L shows the money side.'],
      ['Which cost does Nafaa use?', 'The cost the item had when the bill was made. For old bills saved without a cost, today’s cost is used and a notice tells you how many lines that affects.'],
      ['Can my staff see profit?', 'Cost and profit are shown only to people whose role allows them to see cost.'],
    ],
    terms: ['gross-profit', 'net-profit', 'profit-and-loss', 'cogs', 'gross-margin'],
    related: ['PRODUCT:reports', 'PAGE:daily-sales-report', 'PAGE:discounts-at-the-counter', 'PAGE:stock-adjustment', 'TOOL:profit-margin-calculator'],
    evidence: [PROFIT, 'apps/web/src/modules/finance/profit-report/components/ProductRows.tsx', PNL, 'apps/web/src/modules/reports/pnl/components/StatementView.tsx', NAV],
  },
  {
    slug: 'cash-closing',
    title: 'How to close the cash drawer',
    summary:
      'Close the galla at the end of a shift in Nafaa’s Cash register: count the cash, compare it with what the system expects, give a reason for any difference, and print the Z-report. Also covers opening a shift and recording cash in or out.',
    seoDescription: 'Close the cash drawer in Nafaa: open a shift with the float, record cash in and out, count the galla by notes, see the difference and print the Z-report.',
    focusKeyword: 'cash closing galla',
    intro: [
      'Nafaa tracks the galla (cash drawer) in shifts. You open a shift with the cash already in the drawer, Nafaa adds every cash sale and khata payment and takes off cash out and cash purchases, and at closing you count the drawer. Nafaa shows what should be there, what you counted and the difference.',
      '',
      'Open it from the sidebar under **Sales → Cash register**. Card, wallet, bank and udhaar sales are not part of the galla; they are listed below the till for reference.',
    ].join('\n'),
    steps: {
      heading: 'Open, run and close a shift',
      items: [
        ['Open the shift', 'At the start of the day, click **Shift kholein** (open shift) or press **O**. Enter the cash in the drawer under **Galle me cash (opening float)**, or choose **Note gin kar** to count it note by note, then click **Shift kholein**.'],
        ['Record cash in and out', 'When you add change or take money out for something, use **Cash in** (**I**) or **Cash out** (**U**) on the till and write the **Wajah** (reason). Sales and cash khata payments are added by themselves.'],
        ['Start closing', 'At the end of the shift, click **Shift band karein** (close shift) or press **C**.'],
        ['Count the drawer', 'Count the cash before you look at the expected figure. Choose **Note gin kar** and enter how many of each note and coin, or **Kul amount** and type the total in **Galle me gina hua cash**.'],
        ['Check the difference', 'The top of the form shows **Hona chahiye** (should be), **Gina** (counted) and the difference. If the cash is short or over, **Farak ki wajah** (reason for the difference) is required.'],
        ['Close and print', 'Click **Shift band karein**. Nafaa tells you whether the galla matched or how much was short or over. Open the shift from **Shifts record** to print its **Z-report** on A4, PDF or a thermal printer.'],
      ],
    },
    more: [
      helpShot('cash-closing', 'An open till: opening float, cash sales, khata payments and cash purchases add up to what the galla should hold.', {
        callouts: [
          { x: 91.5, y: 56.8, label: 'Should be in the galla' },
          { x: 38.5, y: 78.6, label: 'How it is worked out' },
          { x: 27.5, y: 94.9, label: 'Cash in / Cash out' },
          { x: 90.8, y: 94.9, label: 'Shift band karein (C)' },
        ],
      }),
      helpShot('cash-closing-2', 'Closing a shift: should be, counted and the difference, with the count entered note by note.', {
        callouts: [
          { x: 36.6, y: 21.8, label: 'Hona chahiye' },
          { x: 63.3, y: 21.8, label: 'Farak' },
          { x: 33.5, y: 28, label: 'Note gin kar / Kul amount' },
          { x: 38.4, y: 33.6, label: 'Count each note' },
          { x: 64.1, y: 87.3, label: 'Shift band karein' },
        ],
      }),
      tip(
        'While a shift is open, **X-report** on the till prints a mid-day slip without closing anything. After closing, look at **Din ka hisaab** for the full day: see the [daily sales report](' + helpPath('reports-and-cash', 'daily-sales-report') + ').',
      ),
    ],
    faqs: [
      ['What does Nafaa expect to be in the galla?', 'The opening float, plus cash sales and cash khata payments, minus cash out, cash expenses and cash purchases. The till shows each line so you can check it.'],
      ['What if the cash does not match?', 'Write the reason in **Farak ki wajah** and close the shift. The difference is saved with the shift and shows in **Paise kam nikle** or **Paise zyada nikle** on the Cash register page.'],
      ['Do card and JazzCash sales go in the galla?', 'No. Only cash is counted in the drawer. Card, wallet and bank sales and udhaar are shown separately under the till.'],
    ],
    terms: ['cash-drawer', 'opening-float', 'cash-over-short', 'z-report', 'galla'],
    related: ['PRODUCT:reports', 'PRODUCT:pos', 'PAGE:daily-sales-report', 'PAGE:receive-a-payment', 'TEMPLATE:daily-cash-closing-sheet'],
    evidence: [CASH, OPEN_SHIFT, CLOSE_SHIFT, TILL, SHIFT_DETAIL, 'apps/web/src/modules/finance/cash-register/components/DenominationCounter.tsx', NAV],
  },
];

export default articles;
