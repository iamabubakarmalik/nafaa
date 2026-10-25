/**
 * Nafaa vs Microsoft Excel for running a shop. Excel facts from Microsoft's
 * own support and product pages, read on CHECKED_ON. Excel is treated as a
 * good tool for what it is; the page says when a spreadsheet is enough.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { compareTable, src, type CompareSpec } from '../_compare';

const MS_COAUTHOR = src(
  'Collaborate on Excel workbooks at the same time with co-authoring',
  'https://support.microsoft.com/en-us/office/collaborate-on-excel-workbooks-at-the-same-time-with-co-authoring-7152aa8b-b791-414c-a3bb-3024e46fb104',
  'Microsoft Support',
);
const MS_WEB = src('Free Microsoft 365 for the web (Word, Excel, PowerPoint)', 'https://www.microsoft.com/en-us/microsoft-365/free-office-online-for-the-web', 'Microsoft');
const SOURCES = [MS_COAUTHOR, MS_WEB];

const SUMMARY =
  'Many shops start with a spreadsheet, and Excel is a very good one. This page compares running a shop in Excel with running it in Nafaa: billing at the counter, stock that updates on each sale, udhaar, several staff and backups. It says honestly when a spreadsheet is enough, and shows how to bring your Excel lists into Nafaa.';

const spec: CompareSpec = {
  slug: 'nafaa-vs-excel',
  title: 'Nafaa vs Excel',
  competitorName: 'Microsoft Excel',
  competitorUrl: 'https://www.microsoft.com/en-us/microsoft-365/excel',
  verdict:
    'Excel is a good spreadsheet and enough for a small shop run by one person; once several people bill or count stock, a POS that updates stock on every sale saves the copying and checking.',
  summary: SUMMARY,
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compare', heading: 'Nafaa vs Excel: when a spreadsheet stops being enough' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Keep Excel for lists and analysis; use a POS like Nafaa once billing, stock and udhaar need to stay in step every day.' },
        { label: 'Excel is enough if', value: 'You run the shop alone, have a short product list, few credit customers and time to update the sheet each evening.' },
        { label: 'Choose Nafaa if', value: 'More than one person bills, stock should drop on each sale, or you want udhaar reminders and live profit.' },
        { label: 'Moving over', value: 'Import your product list from .xlsx, .xls or .csv, and export your data back to Excel whenever you want.' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, with a free trial first' },
      ],
      undefined,
      'Which one should you choose?',
    ),
    compareTable(
      'Running a shop in Excel and in Nafaa',
      'Excel details are from Microsoft\'s own support and product pages, checked on the date shown. Nafaa details are from the product as it is today.',
      'Microsoft Excel',
      [
        ['What it is', 'Software for running a shop: billing, stock, khata, staff and reports', 'A spreadsheet: rows, columns, formulas and charts for any purpose'],
        ['Billing at the counter', 'Counter screen with barcode, search, quick keys, receipts and cash drawer', 'No counter screen; you build your own sheet'],
        ['Stock after a sale', 'Drops automatically with every bill, per branch', 'Changes only when someone updates the sheet'],
        ['Several people at once', 'Each staff member has a login and a role', 'Co-authoring needs the file on OneDrive or SharePoint with AutoSave on'],
        ['Who changed what', 'Activity log of changes by person, plus counter rules and PINs', 'Version history when stored in the cloud; no counter rules'],
        ['Udhaar', 'Khata with limits, ageing and WhatsApp reminders', 'A sheet you design and keep up to date yourself'],
        ['Profit', 'Profit by product and profit and loss from bills, purchases and expenses', 'Whatever formulas you build'],
        ['Phone access', 'Runs in the browser on any phone; offline billing syncs later', 'Excel apps for Android and iOS, and Excel for the web'],
        ['Cost', 'From {{price:min.monthly}} a month after a free trial', 'Free Excel for the web with a Microsoft account (5 GB OneDrive), or a paid Microsoft 365 plan'],
        ['Data in and out', 'Import products from .xlsx, .xls or .csv; export records to Excel', 'Opens and saves .xlsx and .csv'],
      ],
      SOURCES,
    ),
    prose(`## What Excel does well

It is worth saying clearly: Excel is excellent software, and for some shops it is all they need.

- **Flexible.** You can design any list, price sheet or report you like.
- **Familiar.** Many people already know the basics.
- **Low cost.** Microsoft offers Excel for the web free with a Microsoft account, with files stored on OneDrive.
- **Good for analysis.** Sorting, filtering, pivot tables and charts are hard to beat for one-off questions.
- **Shared editing.** According to Microsoft's support page, several people can work in the same workbook at the same time when it is stored on OneDrive or SharePoint Online and AutoSave is on.

## When Excel is enough

A spreadsheet works well if you run the shop alone or with one helper, your product list is short and stable, you have few credit customers, and you have time each evening to update the sheet. Many shops start here, and there is no shame in staying if it works.

## Where Excel starts to hurt

The trouble is not Excel. It is using a general tool for a job that happens hundreds of times a day.

- **Copying is the job.** Every sale has to be typed into the sheet later, usually from memory or a paper slip. Some never make it.
- **Stock drifts.** Stock changes only when someone updates it. The sheet says twelve, the shelf has three.
- **No counter.** A spreadsheet is not a billing screen. There is no receipt, no drawer, no quick way to take cash and JazzCash on the same bill.
- **Several people, one file.** Shared editing needs the file in the cloud with AutoSave. A copy on one computer and another on the phone soon disagree.
- **Mistakes are silent.** A deleted row or a broken formula changes your totals without any warning.
- **No rules.** Anyone who can open the file can change a price or a balance, and the sheet cannot ask for a manager's PIN.
- **Udhaar does not remind anyone.** The sheet knows the balance; it will not send a WhatsApp message.`),
    shot({
      heading: 'Stock that updates itself',
      body: 'Every product shows price, cost, margin and stock left. Each sale lowers the count, and low stock shows up before the shelf is empty.',
      id: SHOT.inventory,
      url: 'app.nafaa.pk/inventory',
      layout: 'full',
      callouts: [
        { x: 26, y: 19, label: 'Stock value at cost' },
        { x: 45, y: 33, label: 'Items running low' },
        { x: 27, y: 82, label: 'Price, cost and margin' },
      ],
    }),
    prose(`## What changes with Nafaa

The sale is the record. A cashier bills at the counter, and in the same moment stock goes down in the right branch, udhaar goes on the customer's khata, the payment lands under cash, card, JazzCash or Easypaisa, and the day's profit updates. Nothing is typed twice.

Each staff member has their own login and role, so you decide who can change prices, give discounts above a limit, void a bill or see profit. The activity log shows who changed what and when. You can still take your data to Excel at any time: products, customers and reports export to Excel files, and the owner can download a full backup.`),
    steps(
      'Move from Excel to Nafaa in an afternoon',
      [
        ['Clean your product sheet', 'One row per item, with name, sale price, cost, stock and barcode if you have one. Sizes and colours can stay as columns.'],
        ['Import it', 'Upload the .xlsx, .xls or .csv file. Nafaa reads up to 10,000 lines at once and shows problems before saving.'],
        ['Add opening udhaar', 'Enter each credit customer and their current balance from your sheet.'],
        ['Bill from the counter', 'From the next sale on, bill in Nafaa. Keep the old sheet for reference.'],
        ['Keep Excel for analysis', 'Export reports to Excel whenever you want to slice the numbers your own way.'],
      ],
      undefined,
      true,
    ),
    prose(`## Questions to ask before you decide

- How many people bill or update stock?
- How many sales do you make on a busy day, and how many of them reach the sheet?
- When did your sheet last match the shelf?
- Do you need to see the shop from outside?

If the honest answers are "one", "all of them" and "this week", Excel may be serving you well. If not, the time spent copying and checking is the real cost, and a POS pays for it.`),
  ],
  relations: [
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'SERVICE:data-migration', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-paper-register', kind: 'RELATED' },
    { ref: 'BLOG_POST:stock-taking-guide', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/inventory/products/list/exportProducts.ts',
    'apps/web/src/modules/customers/directory/exportCustomers.ts',
    'apps/web/src/modules/reports/exports/pages/ExportsPage.tsx',
    'apps/web/src/modules/backup/pages/BackupPage.tsx',
    'apps/web/src/modules/reports/activity-log/pages/ActivityLogPage.tsx',
    'apps/web/src/modules/organization/settings/sections/POSSection.tsx',
    'apps/web/src/modules/hr/staff/components/RolesPanel.tsx',
    'apps/web/src/modules/pos/hooks/usePosBatches.ts',
    'apps/web/src/modules/finance/profit-report',
  ],
  factNote:
    'Excel facts read on 2026-10-26: Microsoft Support co-authoring page (file on OneDrive, OneDrive for Business or SharePoint Online; AutoSave on; supported in Excel for Microsoft 365, web, Android, iOS) and Microsoft 365 for the web page (free Excel for the web; files saved in OneDrive; 5 GB free storage; page is for US users). Nafaa import/export checked in the files in evidence.',
  topics: ['What it is', 'Billing', 'Stock', 'Several users', 'Change history', 'Udhaar', 'Profit', 'Phone access', 'Cost', 'Data in and out'],
  dropped: ['"60+ live reports" (count not checked).', '"Daily, encrypted cloud" backup (not checked).', '"Unlimited, role-based" users (plan limits apply; plan features are not final).', '"Data loss risk near zero".'],
  needsOwner: [
    'Verify before publishing: free Excel for the web and 5 GB OneDrive storage apply to users in Pakistan (the Microsoft page checked is for US users).',
    'Verify: Excel version history wording ("Version history when stored in the cloud") against Microsoft\'s current support page; it is general knowledge, not from the two pages cited.',
    'Verify: Excel mobile apps for Android and iOS (listed on the co-authoring support page as supporting co-authoring).',
  ],
};

export default spec;
