/**
 * Free downloadable templates: the /templates hub page and one TEMPLATE
 * entry per spreadsheet. The files are built by build-files.ts and live in
 * apps/site/public/downloads (direct links) and in the seed media library
 * (DOCUMENT assets `template-*`, the entry's download button).
 */

import type { DraftBlock } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { withIds } from '../../lib/blocks';
import type { EntryRef, SeedEntry, SeedFaq } from '../../lib/types';
import { page, prose } from '../main-pages/_build';

type Block = Omit<DraftBlock, 'id'>;

const CHECKED_ON = '2026-10-26';
const ORIGIN = 'new (free templates pass, 26 Oct 2026)';
const BUILDER = 'apps/api/prisma/seed-marketing-cms/content/templates/build-files.ts';

interface TemplateSpec {
  slug: string;
  mediaKey: string;
  file: string;
  title: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  /** What is in the file (markdown). */
  inside: string;
  steps: [string, string][];
  /** Tips and the "when to move to software" note (markdown). */
  more: string;
  faqs: { q: string; a: string }[];
  relations: EntryRef[];
  evidence: string[];
  factNote: string;
  sortOrder: number;
}

function templateEntry(t: TemplateSpec): SeedEntry {
  const key = `TEMPLATE:${t.slug}`;
  const blocks: Block[] = [
    { type: 'richText', markdown: `${t.inside}\n\nDirect link to the file: [${t.file}](/downloads/${t.file}). Free to use, copy and share.` } as Block,
    { type: 'steps', heading: 'How to use it', items: t.steps.map(([title, body]) => ({ title, body })) } as Block,
    { type: 'richText', markdown: t.more } as Block,
  ];
  return {
    type: 'TEMPLATE',
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    data: { fileMediaId: `media_${t.mediaKey}`, format: 'xlsx' },
    blocks: withIds(key, blocks),
    faqKeys: t.faqs.map((_, i) => `template-${t.slug}-${i + 1}`),
    relations: t.relations.map((ref) => ({ ref, kind: 'RELATED' as const })),
    seoTitle: t.seoTitle,
    seoDescription: t.seoDescription,
    focusKeyword: t.focusKeyword,
    sortOrder: t.sortOrder,
    origin: ORIGIN,
    evidence: [BUILDER, ...t.evidence],
    factCheck: { checkedOn: CHECKED_ON, note: t.factNote },
    dropped: [],
    needsOwner: [],
  };
}

function templateFaqs(t: TemplateSpec): SeedFaq[] {
  return t.faqs.map((f, i) => ({
    key: `template-${t.slug}-${i + 1}`,
    topic: 'templates',
    question: f.q,
    answer: f.a,
    sourceNote: t.factNote,
    origin: ORIGIN,
    evidence: [BUILDER, ...t.evidence],
  }));
}

const specs: TemplateSpec[] = [
  {
    slug: 'product-import-template',
    mediaKey: 'template-product-import',
    file: 'nafaa-product-import-template.xlsx',
    title: 'Product Import Template (Excel)',
    summary: 'An Excel sheet for your product list with the same column names Nafaa\'s import reads: name, price, cost, stock, unit, category, brand, SKU, barcode, low stock alert, packs, batch and expiry. Fill it once and upload it to put your whole shop into Nafaa in one go.',
    seoTitle: 'Product List Excel Template for POS Import (Free)',
    seoDescription: 'Free Excel product list template with price, cost, stock, barcode, pack, batch and expiry columns. Matches Nafaa\'s product import, so the file maps itself.',
    focusKeyword: 'product list excel template',
    inside: `## What is in the file

The **Products** sheet has 17 columns: Name, Price, Cost Price, Wholesale Price, Stock, Unit, Category, Brand, SKU, Barcode, Low Stock Alert, Tax %, Pack Name, Pack Qty, Pack Price, Batch No and Expiry Date. Only Name is required; delete or leave empty the columns you do not use. Three sample rows show the format, and the SKU and Barcode columns are set to text so leading zeros are kept.

The **Hidayat** sheet explains every column in plain words: what to write, the units to use, and how packs, batches and expiry dates work.`,
    steps: [
      ['Delete the sample rows', 'Rows 2 to 4 are examples. Keep the header row exactly as it is.'],
      ['Write one product per line', 'Start with name, price and stock. Add cost price if you want profit reports, and barcodes if you scan.'],
      ['Write stock in loose units', 'For a carton of 24, write 24 in Pack Qty and the number of pieces in Stock, not the number of cartons.'],
      ['Upload it in Nafaa', 'Open Products, choose Import, pick the file and the branch that gets the opening stock. Columns are matched by name; you can choose what happens to products that already exist.'],
    ],
    more: `## Tips for a clean import

Give every product a different SKU or barcode, so the import can tell two products apart and later price updates find the right line. Use the same spelling for categories every time ("Ghee / Oil", not sometimes "Oil"), because each new spelling becomes a new category. Write prices as plain numbers; a rupee sign and commas also work, as the import strips them.

The same file works with most spreadsheet apps, including Google Sheets. To update prices later, Nafaa can export your current list as a price sheet that imports back the same way.`,
    faqs: [
      { q: 'Do I have to fill every column?', a: 'No. Only the product name is required. A small shop can start with name, price and stock, and add cost price, barcodes and categories later through a second import or by editing products. Delete the columns you will never use, such as batch and expiry for a garments shop, to keep the sheet easy to fill.' },
      { q: 'Will the import work if my columns are in a different order or language?', a: 'Yes. Nafaa matches columns by their header names, not their position, and recognises common English, Roman Urdu and Urdu names such as qeemat, stock or naam. This template already uses the exact names, so nothing needs mapping, but your own sheet with different headings can usually be imported too after a quick check of the mapping.' },
    ],
    relations: ['PRODUCT:inventory', 'GLOSSARY_TERM:sku', 'GLOSSARY_TERM:opening-stock', 'TOOL:barcode-generator', 'TEMPLATE:price-list-template'],
    evidence: ['apps/web/src/modules/inventory/products/import/columns.ts'],
    factNote: 'Headers copied from FIELDS[k].label in apps/web/src/modules/inventory/products/import/columns.ts (CREATE_FIELDS minus Description, Variant, Size, Color, Pack Barcode and IMEI); header aliases incl. Roman Urdu/Urdu, existing-product choice and price sheet export checked in the same file.',
    sortOrder: 10,
  },
  {
    slug: 'khata-udhaar-register',
    mediaKey: 'template-khata-register',
    file: 'nafaa-khata-udhaar-register.xlsx',
    title: 'Khata (Udhaar) Register Template',
    summary: 'A digital khata register in Excel: list your customers once, add every udhaar and payment as a line, and each customer\'s balance, last payment date and days since payment fill in by themselves. Balances over the credit limit and payments older than 30 days turn red.',
    seoTitle: 'Khata Udhaar Register Excel Template (Free Download)',
    seoDescription: 'Free khata (udhaar) register in Excel: customer balances, last payment and days since payment calculate automatically, with credit limit warnings.',
    focusKeyword: 'udhaar register excel',
    inside: `## What is in the file

- **Customers**: name, phone, credit limit, total udhaar, total received, balance, last payment date and days since the last payment, for up to 100 customers. Everything after the credit limit is a formula.
- **Entries**: one line for every udhaar given or payment received, with date, customer (picked from a drop-down of your customers), details such as items or bill number, and the amount.
- **How to use**: the four steps below in the file itself.

Days over 30 and balances above the credit limit are shown in red, so the customers to call stand out when you open the file.`,
    steps: [
      ['List your customers', 'Write each name once on the Customers sheet, with phone and an optional credit limit.'],
      ['Add every entry', 'Goods on credit go in "Udhaar given"; money received goes in "Payment received". Pick the customer from the drop-down so the spelling matches.'],
      ['Check balances', 'The Customers sheet adds up both columns for each customer. Balance is udhaar given minus payments received.'],
      ['Follow up on red', 'Call customers whose last payment is over 30 days old or whose balance is above their limit.'],
    ],
    more: `## When a spreadsheet is not enough

A spreadsheet keeps the totals honest, but someone still has to type every credit sale from the counter, and the customer only sees the balance when you send it. Nafaa's [digital khata](/product/khata) records udhaar as part of the bill, keeps each customer's ledger and ages balances into bands, and sends WhatsApp reminders with the amount due. To check how old your udhaar is today, try the [udhaar ageing calculator](/tools/khata-ageing-calculator).`,
    faqs: [
      { q: 'Does the khata template work in Google Sheets?', a: 'Yes. Upload the file to Google Drive and open it with Google Sheets; the balance, last payment and days since formulas work there. In Excel you need Excel 2019 or later, or Excel for the web, because the last payment column uses the MAXIFS function. Older Excel versions show an error in that one column only.' },
      { q: 'How do I record a partial payment?', a: 'Add a new line on the Entries sheet with the date, the customer and the amount paid in the Payment received column. Do not edit or delete the original udhaar line. The balance goes down by the amount paid, the last payment date updates, and the days counter starts again from that date.' },
    ],
    relations: ['PRODUCT:khata', 'TOOL:khata-ageing-calculator', 'GLOSSARY_TERM:khata', 'GLOSSARY_TERM:udhaar', 'BLOG_POST:digital-khata-vs-paper-ledger'],
    evidence: ['apps/web/src/modules/customers/directory/KhataBookPage.tsx'],
    factNote: 'Formulas in build-files.ts (SUMIFS, MAXIFS, TODAY). Nafaa claims: khata ledger with ageing bands and WhatsApp reminders (KhataBookPage.tsx).',
    sortOrder: 20,
  },
  {
    slug: 'stock-take-sheet',
    mediaKey: 'template-stock-take',
    file: 'nafaa-stock-take-sheet.xlsx',
    title: 'Stock Take Sheet (Excel, Printable)',
    summary: 'A printable stock count sheet: product, SKU, unit, system stock and a box for the counted quantity. Type the counts back in and the sheet works out the difference and its value at cost, with a total for the shrinkage or gain.',
    seoTitle: 'Stock Take Sheet Template: Printable Stock Count Excel',
    seoDescription: 'Free stock take sheet in Excel: print it, count each shelf, then see the difference and its value at cost for every product and in total.',
    focusKeyword: 'stock take sheet',
    inside: `## What is in the file

The **Stock count** sheet has a header for the shop, date, section and the two people counting, then 150 numbered lines with Product, SKU or barcode, Unit, System stock, Counted, Difference, Cost price, Difference value and Note. The Counted column is shaded so it is easy to fill on paper. The header row repeats on every printed page, and the sheet prints landscape on A4.

Difference is counted minus system stock; Difference value is that difference times cost price, and the total at the bottom is the value of stock missing or found in the count.`,
    steps: [
      ['Fill the list before you count', 'Paste or type the products, SKU, unit, system stock and cost price for the section you will count.'],
      ['Print and count', 'Count one shelf at a time in loose units. One person counts, the other writes.'],
      ['Type the counts in', 'Difference and its value calculate as you type.'],
      ['Recount large differences, then adjust', 'Check big gaps again before you correct the stock in your system, and keep the sheet as the record.'],
    ],
    more: `## Counting with less effort

Counting by section, a few shelves a week, is easier than closing the shop for a full count, and it catches problems sooner. Our [stock taking guide](/blog/stock-taking-guide) covers how to plan it. In Nafaa, a [stock count](/product/inventory) adds products by search, scan or a whole category, shows the system figure, the difference and its value as you type, and books each difference when you confirm, so no figures are typed twice.`,
    faqs: [
      { q: 'How often should a shop do a stock take?', a: 'A full count at least once a year, and a rolling count of a few sections every week or month. Count fast-moving and high-value items, and anything that goes missing often, more frequently. Regular small counts find theft, billing mistakes and unrecorded deliveries while they are still easy to trace.' },
      { q: 'What does a negative difference mean?', a: 'A negative difference means fewer items on the shelf than the system expects. Common causes are items sold without a bill, damage or expiry not recorded, theft, or a delivery entered with too high a quantity. A positive difference usually means goods arrived but were never entered. Recount before you adjust.' },
    ],
    relations: ['GLOSSARY_TERM:stock-take', 'GLOSSARY_TERM:shrinkage', 'GLOSSARY_TERM:stock-adjustment', 'BLOG_POST:stock-taking-guide', 'PRODUCT:inventory'],
    evidence: ['apps/web/src/modules/inventory/stock-adjustments/components/StockCountPanel.tsx'],
    factNote: 'Formulas in build-files.ts. Nafaa claims: stock count by search, scan or category with live difference and value, differences booked on confirm (StockCountPanel.tsx header).',
    sortOrder: 30,
  },
  {
    slug: 'daily-cash-closing-sheet',
    mediaKey: 'template-cash-closing',
    file: 'nafaa-daily-cash-closing-sheet.xlsx',
    title: 'Daily Cash (Galla) Closing Sheet',
    summary: 'A one-page galla closing sheet: opening cash, cash sales and other cash in, less expenses, supplier payments, refunds and withdrawals, gives the cash that should be in the drawer. Count the notes, and the sheet shows whether the galla is over or short. A month log tracks the pattern.',
    seoTitle: 'Daily Cash Closing Sheet (Galla Hisaab) Excel Template',
    seoDescription: 'Free daily cash closing sheet: expected cash from cash in and out, a note count from 5000 down to coins, and the over or short amount, with a month log.',
    focusKeyword: 'daily cash closing sheet',
    inside: `## What is in the file

- **Closing**: the day's cash in (opening float, cash sales, udhaar recovered in cash, other) and cash out (expenses, supplier payments, refunds, owner withdrawal, cash sent to the bank), giving the **expected cash**. Below it, a note count for 5000, 1000, 500, 100, 50, 20 and 10 rupee notes and coins gives the **counted cash**, and the sheet shows the **over or short** amount. Card, JazzCash, Easypaisa, bank and udhaar sales are noted separately, as they are not in the drawer.
- **Month log**: one line a day with expected, counted and the difference, a monthly total, and shortages in red.`,
    steps: [
      ['Start with the float', 'Write the cash left in the drawer the night before as opening cash.'],
      ['Enter cash in and cash out', 'Take cash sales from the day report and note every payment made from the galla.'],
      ['Count the notes', 'Write how many of each note you have; the counted total and the difference fill in.'],
      ['Log the day', 'Copy expected, counted and the difference into the Month log and write the reason for any gap.'],
    ],
    more: `## Why the daily close matters

A small shortage every day adds up to a large sum by the end of the month, and it is only traceable while the day is fresh. Our guide to a [daily cash closing routine](/blog/daily-cash-closing-routine) explains how to run it in ten minutes. Nafaa closes each counter shift with the expected cash already worked out from the bills, takes the note count, and asks for a reason when the galla is short or over; see the [POS](/product/pos).`,
    faqs: [
      { q: 'What is the opening float?', a: 'The opening float is the cash kept in the drawer at the start of the day so the cashier can give change, usually small notes and coins. It is not part of the day\'s sales. Write it as opening cash, and decide each night how much to leave for tomorrow; the rest goes to the safe or the bank.' },
      { q: 'What should I do when the galla is short?', a: 'First recount, then check the obvious causes: an expense paid from the drawer but not written, change given wrongly, a refund, a card or wallet payment entered as cash, or a bill not made. Write the reason in the log. Repeated shortages on the same counter or shift need a closer look at who handled the cash.' },
    ],
    relations: ['GLOSSARY_TERM:galla', 'GLOSSARY_TERM:opening-float', 'GLOSSARY_TERM:cash-over-short', 'GLOSSARY_TERM:z-report', 'BLOG_POST:daily-cash-closing-routine', 'PRODUCT:pos'],
    evidence: ['apps/web/src/modules/finance/cash-register/components/CloseShiftModal.tsx'],
    factNote: 'Note denominations 5000-10 are the current Pakistani notes in common use (public fact). Nafaa claims: shift close with expected cash, note count and reason for short/over (CloseShiftModal.tsx).',
    sortOrder: 40,
  },
  {
    slug: 'price-list-template',
    mediaKey: 'template-price-list',
    file: 'nafaa-price-list-template.xlsx',
    title: 'Price List Template (Retail and Wholesale)',
    summary: 'A printable price list with retail and wholesale prices, pack sizes and pack prices, grouped by category. Fill in your shop details and the date the prices start, then print it for the counter, give it to salesmen, or save it as PDF for WhatsApp.',
    seoTitle: 'Price List Template Excel: Retail & Wholesale (Free)',
    seoDescription: 'Free price list template in Excel with retail price, wholesale price, pack and pack price columns. Print it or share it as a PDF on WhatsApp.',
    focusKeyword: 'price list template',
    inside: `## What is in the file

One **Price list** sheet with your shop name, phone or WhatsApp, address and "prices valid from" date at the top, then 120 lines with Category, Product, Unit, Retail price, Wholesale price, Pack (for example "Carton of 24"), Pack price and Note. Rows are lightly banded for reading on paper, filters are switched on so you can sort by category, and the header row repeats on every printed page.`,
    steps: [
      ['Fill in your details and the date', 'The date tells customers which list is current.'],
      ['List products by category', 'Keep a category together so customers find items quickly.'],
      ['Add wholesale and pack prices if you sell them', 'Leave the columns empty, or delete them, if you sell only retail.'],
      ['Print or save as PDF', 'File, then Print, or save as PDF and send it on WhatsApp.'],
    ],
    more: `## Keeping prices in one place

The risk with a printed list is that it goes out of date while the counter charges new prices. Change prices in one place and print a fresh list each time. In Nafaa you can download your current products with prices as a sheet, change them in Excel and import the sheet back, so the counter, the list and the [online store](/product/online-store) show the same price. To check the margin behind a price, use the [profit margin calculator](/tools/profit-margin-calculator).`,
    faqs: [
      { q: 'Should retail and wholesale prices be on the same list?', a: 'Only if both kinds of customers will see it. Many shops print two versions from the same file: one with the wholesale column deleted for walk-in customers, and one with both for trade buyers and salesmen. Keep one master file so both versions always come from the same prices.' },
      { q: 'How do I share the price list on WhatsApp?', a: 'Save the sheet as PDF from the print menu, or from File, Save As in Excel, then send the PDF in a chat or on your WhatsApp Business catalogue. A PDF keeps the layout the same on every phone, which a photo of a printed page does not, and customers can zoom in to read it.' },
    ],
    relations: ['TOOL:profit-margin-calculator', 'GLOSSARY_TERM:wholesale-price', 'BLOG_POST:wholesale-vs-retail-pricing', 'BLOG_POST:whatsapp-business-for-shops', 'PRODUCT:inventory'],
    evidence: ['apps/web/src/modules/inventory/products/import/columns.ts'],
    factNote: 'Nafaa claim: price sheet export and price update import (columns.ts downloadPriceSheet, PRICE_FIELDS).',
    sortOrder: 50,
  },
  {
    slug: 'purchase-order-template',
    mediaKey: 'template-purchase-order',
    file: 'nafaa-purchase-order-template.xlsx',
    title: 'Purchase Order Template (Excel)',
    summary: 'A one-page purchase order for your suppliers: PO number, date, delivery date and payment terms, supplier details and up to 20 lines with quantity, rate and amount. Subtotal, discount, sales tax, freight and total calculate themselves; print it or send it as PDF.',
    seoTitle: 'Purchase Order Template Excel (Free, Printable PO)',
    seoDescription: 'Free purchase order template in Excel with PO number, supplier details, item lines, discount, sales tax, freight and total. Print or send as PDF.',
    focusKeyword: 'purchase order template',
    inside: `## What is in the file

The **Purchase order** sheet has your business name and address at the top, the PO number, date, delivery date and payment terms on the right, and the supplier's name, address and phone. Twenty item lines take Item, SKU, Unit, Qty and Rate; Amount is calculated. Below them: Subtotal, Discount, Sales tax % and amount, Freight and the Total, plus three standard notes for the supplier and signature lines. It fits one A4 page wide. A **How to use** sheet explains each part.`,
    steps: [
      ['Put in your details once', 'Replace the business name and address line, then save the file as your own template.'],
      ['Number each order', 'PO-0001, PO-0002 and so on, so the supplier\'s bill can be matched to the order.'],
      ['Add the items', 'Write Qty and Rate for each line; the totals work themselves out.'],
      ['Send it', 'Print it, or save it as PDF and send it to the supplier on WhatsApp or email.'],
    ],
    more: `## Why use a purchase order

A written order settles the quantity and rate before the goods arrive, so short deliveries, wrong items and changed rates are caught at the door instead of after payment. Check the goods against the PO when they arrive, and note any difference on the bill. To decide how much to order, use the [reorder level calculator](/tools/reorder-level-calculator). In Nafaa, [purchasing](/product/purchasing) creates the order from your low stock list, prints it as a purchase order, and turns it into a goods received note and a purchase bill when the stock arrives.`,
    faqs: [
      { q: 'What is the difference between a purchase order and a purchase bill?', a: 'A purchase order is what you send the supplier before delivery: the items, quantities and rates you agree to buy. The purchase bill, or invoice, is what the supplier sends with or after the goods, asking for payment. Matching the two, together with what actually arrived, is how you catch short or wrong deliveries.' },
      { q: 'Do small shops need purchase orders?', a: 'Not for every small top-up from a salesman, but they help for large orders, new suppliers, and any order where rates or delivery dates are negotiated. Even a WhatsApp message with the PO as a PDF gives you a record of what was agreed if the delivery or the bill does not match.' },
    ],
    relations: ['PRODUCT:purchasing', 'GLOSSARY_TERM:purchase-order', 'GLOSSARY_TERM:grn', 'TOOL:reorder-level-calculator', 'TEMPLATE:simple-invoice-template'],
    evidence: ['apps/web/src/modules/purchasing/purchases/components/PurchasePrintModal.tsx', 'apps/web/src/modules/inventory/low-stock/components/OrderModal.tsx'],
    factNote: 'Formulas in build-files.ts. Nafaa claims: purchase order, GRN and purchase bill prints (PurchasePrintModal.tsx TITLES), order from the low stock list (OrderModal.tsx).',
    sortOrder: 60,
  },
  {
    slug: 'simple-invoice-template',
    mediaKey: 'template-simple-invoice',
    file: 'nafaa-simple-invoice-template.xlsx',
    title: 'Simple Invoice Template (Excel)',
    summary: 'A clean one-page invoice in Excel for shops, wholesalers and service businesses: invoice number, dates, payment terms, customer details and up to 20 lines. Subtotal, discount, sales tax, delivery, total, amount paid and balance due calculate themselves.',
    seoTitle: 'Simple Invoice Template Excel for Small Business (Free)',
    seoDescription: 'Free simple invoice template in Excel: item lines, discount, sales tax, delivery, total and balance due calculate automatically. Print or send as PDF.',
    focusKeyword: 'simple invoice template excel',
    inside: `## What is in the file

The **Invoice** sheet has your business name, address and NTN line, the invoice number, date, due date and payment terms, the customer's name, address and phone, and twenty lines with Item, SKU, Unit, Qty, Rate and Amount. The totals block covers Subtotal, Discount, Sales tax %, Sales tax, Delivery charges, Total, Paid and Balance due. Space at the bottom holds your bank, JazzCash or Easypaisa details for payment and a signature line. A **How to use** sheet explains each part.`,
    steps: [
      ['Set up your header once', 'Replace the business name and address line, add payment details at the bottom, and save it as your template.'],
      ['Use a new number every time', 'Never reuse an invoice number; customers and your own records find payments by it.'],
      ['Fill the lines and the grey cells', 'Qty and Rate per line; discount, tax %, delivery and paid in the totals block.'],
      ['Print or send as PDF', 'The sheet fits one A4 page wide.'],
    ],
    more: `## From invoices to a sales record

A spreadsheet invoice is fine for a few a week, but each one is a separate file and nothing adds them up. For an invoice to print from the browser without Excel, use the free [receipt maker](/tools/receipt-maker). Nafaa's [POS](/product/pos) prints A4 invoices from the same bill that updates stock, khata and reports, and offers optional FBR/PRA integration where it applies. This template is a plain invoice, not an FBR sales tax invoice.`,
    faqs: [
      { q: 'What must a simple invoice include?', a: 'At minimum: your business name and contact details, a unique invoice number, the date, the customer, each item with quantity, rate and amount, any discount or tax, and the total. Adding a due date, payment details and a balance due line makes it easier for the customer to pay on time and for you to follow up.' },
      { q: 'Is this a sales tax invoice?', a: 'No. It is a plain commercial invoice. If you are registered for sales tax, a sales tax invoice needs further details required by the rules, such as registration numbers and tax per item, and some retailers must issue invoices through an FBR-integrated POS. Check the requirements that apply to your business before using this for taxed sales.' },
    ],
    relations: ['GLOSSARY_TERM:invoice', 'GLOSSARY_TERM:sales-tax-invoice', 'TOOL:receipt-maker', 'TOOL:gst-calculator', 'PRODUCT:pos'],
    evidence: ['apps/web/src/core/receipt/setup.ts'],
    factNote: 'Formulas in build-files.ts. Nafaa claims: A4 invoice layout from the same bill (core/receipt/setup.ts a4Title INVOICE).',
    sortOrder: 70,
  },
];

const hubFaqs: SeedFaq[] = [
  {
    key: 'templates-hub-free',
    topic: 'templates',
    question: 'Can I use and share these templates for free?',
    answer: 'Yes. Download, edit, print and share them as often as you like, for your own business or your customers. No account or email is needed. The files are ordinary Excel workbooks, so they also open in Google Sheets and most other spreadsheet apps. A small credit line in the footer says where the template came from.',
    sourceNote: 'Files in apps/site/public/downloads, built by build-files.ts with a footer credit.',
    origin: ORIGIN,
    evidence: [BUILDER],
  },
  {
    key: 'templates-hub-software',
    topic: 'templates',
    question: 'When should a business move from spreadsheets to software?',
    answer: 'When the same numbers are typed twice: once at the counter and again in the sheet. That is usually when bills, udhaar and stock changes happen many times a day, or when more than one person or branch needs the same figures. Software records each sale once and updates stock, khata and reports from it, so the sheets are no longer needed.',
    sourceNote: 'General guidance; Nafaa features referenced on the hub link to their product pages.',
    origin: ORIGIN,
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx'],
  },
];

const hub: SeedEntry = {
  ...page({
    type: 'PAGE',
    slug: 'templates',
    relations: [
      { ref: 'PAGE:tools', kind: 'RELATED' },
      { ref: 'PRODUCT:khata', kind: 'RELATED' },
      { ref: 'PRODUCT:inventory', kind: 'RELATED' },
      { ref: 'GUIDE:managing-udhaar-and-khata', kind: 'RELATED' },
    ],
    title: 'Free Business Templates',
    summary:
      'Free Excel templates for shops and small businesses in Pakistan: product import sheet, khata (udhaar) register, stock take sheet, daily galla closing, price list, purchase order and invoice. Formulas are built in, they print on A4, and each comes with a short guide.',
    data: { template: 'hub' },
    seoTitle: 'Free Excel Templates for Shops: Khata, Stock, Invoice',
    seoDescription: 'Free Excel templates for Pakistani shops: khata udhaar register, stock take sheet, galla closing, price list, purchase order, invoice and product import.',
    focusKeyword: 'free excel templates for shop',
    hero: { eyebrow: 'Free templates', heading: 'Free business templates', sub: 'Ready-to-use Excel sheets for the registers every shop keeps, with the sums built in. Download, fill in and print. No sign-up.', layout: 'centered' },
    answer: {
      facts: [
        ['Customers and cash', 'Khata (udhaar) register, daily galla closing sheet'],
        ['Stock and buying', 'Stock take sheet, purchase order, product import sheet'],
        ['Selling', 'Price list, simple invoice'],
        ['Format', 'Excel (.xlsx): opens in Excel and Google Sheets, prints on A4'],
      ],
      romanUrdu: 'Dukaan ke registers ke free Excel templates: khata, galla closing, Stock ginti, price list, purchase order aur invoice. Hisaab khud lagta hai, A4 par print hota hai, sign-up nahi chahiye.',
    },
    body: [
      prose(`## Built for the way shops keep records

Each template replaces a paper register most shops already keep, with the totals worked out for you and a guide sheet inside the file. Sample rows show how to fill them; delete them and start. For quick sums without a spreadsheet, see the free [tools](/tools).

When you are ready to stop typing the same numbers twice, [Nafaa](/product/pos) records each sale once and keeps the [khata](/product/khata), [stock](/product/inventory) and [purchasing](/product/purchasing) up to date from it. The [product import template](/templates/product-import-template) moves your product list into Nafaa in one upload.`),
    ],
    faqKeys: hubFaqs.map((f) => f.key),
    cta: { heading: 'Let every bill fill your registers', body: 'Start the 7 din Free Trial: sales, stock and khata update from the counter.' },
    sortOrder: 22,
    evidence: ['apps/site/src/templates/article/HubTemplates.tsx', BUILDER],
  }),
  origin: ORIGIN,
  factCheck: { checkedOn: CHECKED_ON, note: 'Hub copy describes the files built by build-files.ts; product links checked against the evidence of each TEMPLATE entry.' },
};

export const templateEntries: SeedEntry[] = [hub, ...specs.map(templateEntry)];
export const templatesFaqs: SeedFaq[] = [...hubFaqs, ...specs.flatMap(templateFaqs)];
