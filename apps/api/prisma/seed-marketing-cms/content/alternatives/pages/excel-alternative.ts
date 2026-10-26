/**
 * Excel alternative for running a shop. Excel facts from Microsoft's own
 * pages (co-authoring requirements, free web version), read on CHECKED_ON.
 * The page lays out the realistic options, including staying on Excel, and
 * differs from /compare/nafaa-vs-excel by focusing on what to switch to and
 * how to move the data.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { altTable, src, type AlternativeSpec } from '../_alternative';

const MS_COAUTHOR = src('Collaborate on Excel workbooks at the same time with co-authoring', 'https://support.microsoft.com/en-us/excel/get-started/collaborate-on-excel-workbooks-at-the-same-time-with-co-authoring', 'Microsoft Support');
const MS_WEB = src('Free Microsoft 365 for the web (Word, Excel, PowerPoint)', 'https://www.microsoft.com/en-us/microsoft-365/free-office-online-for-the-web', 'Microsoft');
const MS_EXCEL = src('Microsoft Excel help and learning', 'https://support.microsoft.com/en-us/excel', 'Microsoft Support');

const SUMMARY =
  'Many Pakistani shops run their stock, sales and udhaar on Excel sheets, and it works until it does not. This page explains when a spreadsheet stops being enough, what the realistic alternatives are, how Nafaa compares with Excel for daily shop work, and how to move your sheets over without retyping them.';

const spec: AlternativeSpec = {
  slug: 'excel-alternative',
  title: 'Excel Alternative for Running a Shop',
  competitorName: 'Microsoft Excel',
  competitorUrl: 'https://www.microsoft.com/en-us/microsoft-365/excel',
  verdict:
    'Keep Excel for analysis and one-off lists. Once stock, sales and udhaar must stay in step every day, or more than one person bills, a POS that writes all three from the counter replaces the evening of copying.',
  summary: SUMMARY,
  seoTitle: 'Excel Alternative for Shops in Pakistan: When to Switch',
  seoDescription:
    'When Excel stops being enough for a Pakistani shop, the realistic alternatives, how Nafaa compares for daily work, and how to move your sheets without retyping.',
  focusKeyword: 'excel alternative for shop',
  blocks: [
    hero(SUMMARY, { eyebrow: 'Alternatives', heading: 'An Excel alternative for running your shop' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Excel is fine for one person and a short list. Move to a POS when sales, stock and udhaar need to agree every day.' },
        { label: 'Signs it is time', value: 'Stock in the sheet never matches the shelf, two people edit the same file, or the evening update keeps slipping.' },
        { label: 'Realistic options', value: 'A tidier spreadsheet, a POS with inventory and khata, accounting software, or an inventory-only app' },
        { label: 'Moving over', value: 'Import .xlsx, .xls or .csv into Nafaa, checked line by line; export back to Excel any time' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Excel ek banda aur chhoti list ke liye theek hai. Jab sale, stock aur udhaar roz milane hon, ya do log bill banayein, to POS behtar hai. Purani sheet seedha import ho jati hai.',
      'Should you replace Excel?',
    ),
    prose(`## When a spreadsheet stops working

Excel is a very good tool. The trouble is that a shop is not a spreadsheet problem: every sale changes stock, cash and sometimes a customer's balance, and in Excel each of those changes has to be typed by someone. The signs that you have outgrown it usually arrive together:

- **The sheet and the shelf disagree.** Sales during the day were not entered, or were entered twice.
- **Two copies of the truth.** One file on the counter PC, another on the owner's laptop, and nobody is sure which is current.
- **Udhaar lives elsewhere.** The khata is a separate sheet or a register, so a customer's balance is never quite certain.
- **The evening update is the job.** Closing the shop means an hour of copying from bills into the sheet.
- **Nobody knows who changed what.** A price or a stock figure changes and there is no record of who did it.

If none of this sounds familiar, stay on Excel. The cheapest system is the one that already works.`),
    altTable(
      'Nafaa and Excel for daily shop work',
      'Excel facts from Microsoft\'s own support and product pages on 26 October 2026; Nafaa from the product.',
      'Excel',
      [
        ['Making a bill', 'Scan or search, print or WhatsApp the receipt', 'Not built for billing; you design an invoice sheet'],
        ['Stock after a sale', 'Drops by itself, in the unit sold', 'Changes when someone types it'],
        ['Udhaar', 'Bill goes on the customer\'s khata with a limit', 'A separate sheet you keep up to date'],
        ['Several people at once', 'Each staff member has their own login and role', 'Co-authoring needs Microsoft 365 and files in OneDrive or SharePoint Online'],
        ['Cost', 'Paid plan after a free trial', 'Excel for the web offered free; desktop with Microsoft 365'],
      ],
      [MS_COAUTHOR, MS_WEB, MS_EXCEL],
    ),
    prose(`## The realistic alternatives

**1. A tidier spreadsheet.** One workbook, one row per product, a separate tab per month for sales, and data entry only from the counter PC. This costs nothing and fixes some of the mess, but the typing remains.

**2. A POS with inventory and khata.** Billing, stock and udhaar are written in one step at the counter. This is what Nafaa does, and it fits shops where most of the work happens at the counter. See [POS & Billing](/product/pos) and [Inventory](/product/inventory).

**3. Accounting software.** Good for invoices, ledgers and taxes, especially if your accountant already uses it, but most accounting tools are not built for a fast retail counter. Our comparisons with [QuickBooks](/compare/nafaa-vs-quickbooks) and [Tally](/compare/nafaa-vs-tally) explain the difference.

**4. An inventory-only app.** Useful for warehouses and online sellers, less so for a shop that also bills and gives credit. Our [inventory software guide](/best/inventory-software-pakistan) compares several.

## Where Excel is better

- **Analysis and what-ifs.** Pivot tables, charts and formulas for any question you can think of.
- **Total flexibility.** Any column, any layout, any calculation, without asking a vendor.
- **Familiarity.** Most people who have worked in an office already know it.
- **One-off lists.** Price lists for a supplier, a stock count sheet, a budget for a new branch.

Nafaa exports products, customers and reports to Excel, so you can keep doing this analysis on real data.

## Where Nafaa is better

- **Nothing is typed twice.** The bill moves stock, cash and the khata together.
- **Units that match the shelf.** One product sold by carton, dozen or piece, each with its own price.
- **Udhaar that is collected.** Balances by age, credit limits and one-tap WhatsApp reminders.
- **Control without watching.** Roles, a manager PIN for refunds and big discounts, and an activity log.
- **Reports without building them.** Profit by product, day book and profit and loss from the day's sales.`),
    shot({
      heading: 'Your Excel list, after import',
      body: 'Products arrive with prices, cost, stock and barcodes, ready to sell at the counter.',
      id: SHOT.inventory,
      url: 'app.nafaa.pk/products',
      layout: 'split-right',
    }),
    steps(
      'Moving from Excel to Nafaa',
      [
        ['Clean the product sheet', 'One row per product with name, unit, cost, sale price and barcode if you have one. Remove duplicates.'],
        ['Import it', 'Upload the .xlsx, .xls or .csv file, or paste the cells. Nafaa finds the header row and matches columns named in English, Roman Urdu or Urdu.'],
        ['Check before saving', 'Each line is checked and problems are shown before anything is saved. Pick the branch that receives the stock.'],
        ['Add opening balances', 'Enter each udhaar customer\'s current balance once; old pages do not need copying.'],
        ['Bill from day one', 'From the first sale, stock and khata update themselves. Keep the old sheet for reference.'],
      ],
      'Most shops finish in an afternoon. Our data migration service can do it for you.',
      true,
    ),
  ],
  faqs: [
    [
      'Can I keep using Excel alongside Nafaa?',
      'Yes. Many owners keep Excel for their own analysis. Nafaa exports products, customers and reports to Excel, so you can build pivot tables on real sales without typing them in. What changes is that the daily record is kept by the counter, not by hand.',
    ],
    [
      'Will my Excel formulas come across?',
      'No, and they do not need to. The import brings in the values: products, prices, cost, stock and barcodes. Calculations such as stock value, margin and profit are done by Nafaa\'s reports, so you do not have to maintain the formulas any more.',
    ],
    [
      'Is Google Sheets a better alternative to Excel for a shop?',
      'It solves the sharing problem, because everyone edits one online file, but not the typing problem. A sale still has to be entered by hand, and stock and udhaar still live in separate tabs. It is a good step if you are not ready for a POS yet.',
    ],
  ],
  relations: [
    { ref: 'COMPARE:nafaa-vs-excel', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'SERVICE:data-migration', kind: 'RELATED' },
    { ref: 'BLOG_POST:stock-taking-guide', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:opening-stock', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:sku', kind: 'TAG' },
  ],
  sources: [MS_COAUTHOR, MS_WEB, MS_EXCEL],
  evidence: [
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/inventory/products/import/ImportOptions.tsx',
    'apps/web/src/modules/inventory/products/import/grid/SheetGrid.tsx',
    'apps/web/src/modules/inventory/products/list/exportProducts.ts',
    'apps/web/src/modules/customers/directory/exportCustomers.ts',
    'apps/web/src/modules/reports/exports/pages/ExportsPage.tsx',
    'apps/web/src/modules/reports/activity-log/pages/ActivityLogPage.tsx',
    'apps/web/src/modules/pos/lib/posUnits.ts',
    'apps/web/src/core/lib/offline/offlineSales.ts',
  ],
  factNote:
    'Excel co-authoring requirements (Microsoft 365 subscription, OneDrive/SharePoint Online) and the free web version read on Microsoft\'s pages on 2026-10-26. Import formats and header matching from ProductBulkImportPage and the import grid; exports from exportProducts, exportCustomers and ExportsPage.',
  needsOwner: [],
};

export default spec;
