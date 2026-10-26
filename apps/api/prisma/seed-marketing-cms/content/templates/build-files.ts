/**
 * Builds the downloadable spreadsheets behind the TEMPLATE entries.
 *
 *   cd apps/api && npx ts-node --transpile-only --project prisma/tsconfig.seed.json prisma/seed-marketing-cms/content/templates/build-files.ts
 *
 * Each workbook is written twice: to `apps/site/public/downloads/` (a
 * stable public URL, nafaa.pk/downloads/<file>) and to the seed media
 * folder, where the manifest picks it up as a DOCUMENT asset. Run it again
 * after changing a template, then update the asset's bytes and checksum in
 * media/manifest.json (the script prints both).
 *
 * The product import sheet uses the column names of the app's own import
 * (apps/web/src/modules/inventory/products/import/columns.ts, FIELDS labels),
 * so the file maps itself when it is uploaded to Nafaa.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';

const REPO = join(__dirname, '..', '..', '..', '..', '..', '..');
const PUBLIC_DIR = join(REPO, 'apps', 'site', 'public', 'downloads');
const MEDIA_DIR = join(__dirname, '..', '..', 'media', 'files');

const BRAND = 'FF047857';
const BRAND_LIGHT = 'FFECFDF5';
const GREY = 'FFF1F5F9';
const LINE = 'FFCBD5E1';
const RS = '#,##0;[Red]-#,##0';
const RS2 = '#,##0.00;[Red]-#,##0.00';
const CREDIT = 'Free template from Nafaa, nafaa.pk. Free to use, copy and share.';
const FIXED_DATE = new Date('2026-10-26T00:00:00Z');

type Sheet = ExcelJS.Worksheet;

function book(title: string): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Nafaa (nafaa.pk)';
  wb.title = title;
  wb.created = FIXED_DATE;
  wb.modified = FIXED_DATE;
  // No cached results are written, so ask the spreadsheet app to calculate on open.
  wb.calcProperties = { fullCalcOnLoad: true };
  return wb;
}

function sheet(wb: ExcelJS.Workbook, name: string, widths: number[], landscape = false): Sheet {
  const ws = wb.addWorksheet(name, {
    pageSetup: { paperSize: 9, orientation: landscape ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    headerFooter: { oddFooter: `&L${CREDIT}&RPage &P of &N` },
  });
  ws.columns = widths.map((width) => ({ width }));
  return ws;
}

function border(cell: ExcelJS.Cell): void {
  const side = { style: 'thin' as const, color: { argb: LINE } };
  cell.border = { top: side, left: side, bottom: side, right: side };
}

function title(ws: Sheet, text: string, sub: string, span: number): void {
  ws.mergeCells(1, 1, 1, span);
  const t = ws.getCell(1, 1);
  t.value = text;
  t.font = { bold: true, size: 16, color: { argb: BRAND } };
  ws.getRow(1).height = 26;
  ws.mergeCells(2, 1, 2, span);
  const s = ws.getCell(2, 1);
  s.value = sub;
  s.font = { size: 10, color: { argb: 'FF475569' } };
  s.alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(2).height = 30;
}

/** Label / value pairs for a form header, two pairs per row. */
function fields(ws: Sheet, startRow: number, pairs: [string, string][], valueSpan: number): number {
  let row = startRow;
  for (let i = 0; i < pairs.length; i += 2) {
    pairs.slice(i, i + 2).forEach(([label], k) => {
      const col = 1 + k * (valueSpan + 1);
      const l = ws.getCell(row, col);
      l.value = label;
      l.font = { bold: true, size: 10 };
      if (valueSpan > 1) ws.mergeCells(row, col + 1, row, col + valueSpan);
      const v = ws.getCell(row, col + 1);
      v.value = pairs[i + k]![1];
      v.border = { bottom: { style: 'thin', color: { argb: LINE } } };
    });
    row++;
  }
  return row + 1;
}

function header(ws: Sheet, row: number, labels: string[]): void {
  const r = ws.getRow(row);
  labels.forEach((label, i) => {
    const c = r.getCell(i + 1);
    c.value = label;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    c.alignment = { vertical: 'middle', wrapText: true };
    border(c);
  });
  r.height = 22;
}

function grid(ws: Sheet, from: number, to: number, cols: number, formats: (string | null)[] = []): void {
  for (let r = from; r <= to; r++) {
    for (let c = 1; c <= cols; c++) {
      const cell = ws.getCell(r, c);
      border(cell);
      const fmt = formats[c - 1];
      if (fmt) cell.numFmt = fmt;
    }
  }
}

function shade(cell: ExcelJS.Cell, argb = BRAND_LIGHT): void {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function guide(wb: ExcelJS.Workbook, name: string, rows: [string, string][]): void {
  const ws = sheet(wb, name, [24, 96]);
  header(ws, 1, ['Column / step', 'What to write']);
  rows.forEach(([a, b], i) => {
    const r = ws.getRow(i + 2);
    r.getCell(1).value = a;
    r.getCell(1).font = { bold: true };
    r.getCell(2).value = b;
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    border(r.getCell(1));
    border(r.getCell(2));
  });
  const last = ws.getRow(rows.length + 3);
  last.getCell(1).value = CREDIT;
  last.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
}

/** EAN-13 check digit, so the sample in-store barcodes scan. */
function ean(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return first12 + String((10 - (sum % 10)) % 10);
}

// ─── 1. Product import sheet ───

function productImport(): ExcelJS.Workbook {
  const wb = book('Product import template');
  // Labels exactly as FIELDS[k].label in the app's import (columns.ts).
  const cols: [string, number, string][] = [
    ['Name', 30, 'Product name. Required. Example: Chai 190g. Har product ka naam, zaroori.'],
    ['Price', 11, 'Selling price per unit. "1,250" or "Rs 1250" both work.'],
    ['Cost Price', 11, 'Purchase price per unit. Profit reports use it.'],
    ['Wholesale Price', 13, 'Price for wholesale (thok) customers. Leave empty if you do not sell wholesale.'],
    ['Stock', 9, 'Quantity in the shop now, in the Unit column (e.g. 24 or 12.5). It becomes opening stock in the branch you pick while importing.'],
    ['Unit', 8, 'pcs, kg, liter, dozen, meter, box...'],
    ['Category', 16, 'New categories are created automatically.'],
    ['Brand', 14, 'New brands are created automatically.'],
    ['SKU', 14, 'Your own code. Each product needs a different one. Keep the column as Text so leading zeros stay.'],
    ['Barcode', 16, 'The code printed on the pack. Keep the column as Text so leading zeros stay.'],
    ['Low Stock Alert', 11, 'You are reminded when stock falls to this number.'],
    ['Tax %', 8, 'Sales tax percent if you charge it, e.g. 18. Leave empty if not.'],
    ['Pack Name', 11, 'Carton, Dozen, Box, Strip... Stock is still written in loose units.'],
    ['Pack Qty', 9, 'How many units in one pack, e.g. 24.'],
    ['Pack Price', 11, 'Price of a full pack. Empty means price x pack qty.'],
    ['Batch No', 11, 'Batch of the stock on this line (medicines, food).'],
    ['Expiry Date', 12, 'Expiry of that stock: 2027-03-31 or 31/03/2027.'],
  ];
  const ws = sheet(wb, 'Products', cols.map((c) => c[1]), true);
  header(ws, 1, cols.map((c) => c[0]));
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const samples: (string | number)[][] = [
    ['Chai 190g', 390, 360, 375, 48, 'pcs', 'Chai', '', 'CH-190', ean('200000000101'), 12, '', 'Carton', 24, 9000, '', ''],
    ['Basmati Chawal', 420, 360, '', 75, 'kg', 'Chawal', '', 'CW-BAS', '', 10, '', '', '', '', '', ''],
    ['Cooking Oil 1L', 610, 560, 595, 30, 'pcs', 'Ghee / Oil', '', 'OIL-1L', ean('200000000102'), 6, '', 'Carton', 12, '', 'L-0925', '2027-06-30'],
  ];
  samples.forEach((row, i) => ws.getRow(i + 2).values = row);
  grid(ws, 2, 201, cols.length, [null, RS, RS, RS, null, null, null, null, '@', '@', null, null, null, null, RS, '@', null]);
  for (let r = 2; r <= 4; r++) for (let c = 1; c <= cols.length; c++) ws.getCell(r, c).font = { color: { argb: 'FF64748B' }, italic: true };
  guide(wb, 'Hidayat', [
    ...cols.map(([name, , help]): [string, string] => [name, help]),
    ['Sample lines', 'Rows 2 to 4 are examples. Delete them and write your own products. Empty lines are skipped.'],
    ['Header row', 'Keep the first row as it is. The column names match Nafaa\'s import, so the file maps itself when you upload it.'],
    ['Columns you do not need', 'Delete them or leave them empty. Only Name is required.'],
    ['Existing products', 'While importing you choose: add the stock, replace it with the file\'s stock, or skip the product.'],
    ['Upload', 'In Nafaa open Products, choose Import, pick this file and the branch for the opening stock.'],
  ]);
  return wb;
}

// ─── 2. Khata / udhaar register ───

function khata(): ExcelJS.Workbook {
  const wb = book('Khata (udhaar) register');
  const ROWS = 500;
  const summary = sheet(wb, 'Customers', [26, 15, 13, 14, 14, 14, 14, 12]);
  title(summary, 'Khata register: customer balances', 'Write each customer once here, and every udhaar or payment on the Entries sheet. Balances, last payment and days since payment fill in by themselves.', 8);
  header(summary, 4, ['Customer', 'Phone', 'Credit limit', 'Total udhaar', 'Total received', 'Balance', 'Last payment', 'Days since']);
  summary.views = [{ state: 'frozen', ySplit: 4 }];
  const sample = ['Aslam (Gali 4)', 'Bilal Store', 'Nasreen Baji'];
  for (let r = 5; r <= 104; r++) {
    const row = summary.getRow(r);
    if (r - 5 < sample.length) row.getCell(1).value = sample[r - 5];
    const ref = `$A${r}`;
    row.getCell(4).value = { formula: `IF(${ref}="","",SUMIFS(Entries!$D$5:$D$${ROWS + 4},Entries!$B$5:$B$${ROWS + 4},${ref}))` };
    row.getCell(5).value = { formula: `IF(${ref}="","",SUMIFS(Entries!$E$5:$E$${ROWS + 4},Entries!$B$5:$B$${ROWS + 4},${ref}))` };
    row.getCell(6).value = { formula: `IF(${ref}="","",D${r}-E${r})` };
    row.getCell(7).value = { formula: `IF(${ref}="","",IFERROR(1/(1/MAXIFS(Entries!$A$5:$A$${ROWS + 4},Entries!$B$5:$B$${ROWS + 4},${ref},Entries!$E$5:$E$${ROWS + 4},">0")),"none"))` };
    row.getCell(8).value = { formula: `IF(OR(${ref}="",G${r}="none"),"",TODAY()-G${r})` };
  }
  grid(summary, 5, 104, 8, [null, '@', RS, RS, RS, RS, 'dd-mmm-yyyy', '0']);
  for (let r = 5; r <= 104; r++) shade(summary.getCell(r, 6));
  summary.addConditionalFormatting({
    ref: 'H5:H104',
    rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: ['30'], priority: 1, style: { font: { color: { argb: 'FFB91C1C' }, bold: true } } }],
  });
  summary.addConditionalFormatting({
    ref: 'F5:F104',
    rules: [{ type: 'expression', formulae: ['AND($C5<>"",$F5>$C5)'], priority: 2, style: { font: { color: { argb: 'FFB91C1C' }, bold: true } } }],
  });

  const ws = sheet(wb, 'Entries', [13, 26, 34, 14, 14]);
  title(ws, 'Khata register: entries', 'One line for every udhaar given or payment received. Use the customer name exactly as on the Customers sheet.', 5);
  header(ws, 4, ['Date', 'Customer', 'Details (items, bill no)', 'Udhaar given', 'Payment received']);
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  const entries: (string | number | Date)[][] = [
    [new Date('2026-10-01T00:00:00Z'), 'Aslam (Gali 4)', 'Atta 10kg, ghee, bill 1021', 3450, 0],
    [new Date('2026-10-08T00:00:00Z'), 'Aslam (Gali 4)', 'Cash payment', 0, 2000],
    [new Date('2026-10-12T00:00:00Z'), 'Bilal Store', 'Cigarette cartons, bill 1094', 12600, 0],
    [new Date('2026-10-20T00:00:00Z'), 'Nasreen Baji', 'Monthly ration', 8200, 0],
  ];
  entries.forEach((e, i) => (ws.getRow(i + 5).values = e));
  grid(ws, 5, ROWS + 4, 5, ['dd-mmm-yyyy', null, null, RS, RS]);
  // dataValidations exists at runtime in exceljs 4.4 but is missing from its type definitions.
  (ws as unknown as { dataValidations: { add(range: string, rule: ExcelJS.DataValidation): void } }).dataValidations.add(`B5:B${ROWS + 4}`, { type: 'list', allowBlank: true, formulae: ['Customers!$A$5:$A$104'], showErrorMessage: false });

  guide(wb, 'How to use', [
    ['1. Customers', 'Write each customer\'s name once, with phone and an optional credit limit (the most udhaar you allow).'],
    ['2. Entries', 'Every time you give goods on udhaar, add a line with the amount in "Udhaar given". When the customer pays, add a line with the amount in "Payment received".'],
    ['3. Balances', 'The Customers sheet adds up both columns per customer. Balance = udhaar given - payments received.'],
    ['4. Follow up', '"Days since" counts days from the last payment. Red means over 30 days, or a balance over the credit limit: call these customers first.'],
    ['Sample lines', 'The sample customers and entries are examples. Delete them before you start.'],
    ['Spreadsheet app', 'Uses SUMIFS and MAXIFS: Excel 2019 or later, Excel for the web, or Google Sheets.'],
  ]);
  return wb;
}

// ─── 3. Stock take sheet ───

function stockTake(): ExcelJS.Workbook {
  const wb = book('Stock take sheet');
  const ws = sheet(wb, 'Stock count', [5, 30, 16, 8, 11, 11, 11, 11, 13, 14], true);
  title(ws, 'Stock take sheet', 'Print it, count each shelf, write the counted quantity, then type the counts in to see the difference and its value.', 10);
  const next = fields(ws, 3, [['Shop / branch', ''], ['Date', ''], ['Counted by', ''], ['Checked by', ''], ['Section / shelf', ''], ['Time started', '']], 3);
  const H = next;
  header(ws, H, ['#', 'Product', 'SKU / barcode', 'Unit', 'System stock', 'Counted', 'Difference', 'Cost price', 'Difference value', 'Note']);
  const first = H + 1;
  const last = H + 150;
  for (let r = first; r <= last; r++) {
    const row = ws.getRow(r);
    row.getCell(1).value = r - H;
    row.getCell(7).value = { formula: `IF(F${r}="","",F${r}-E${r})` };
    row.getCell(9).value = { formula: `IF(OR(G${r}="",H${r}=""),"",G${r}*H${r})` };
  }
  const samples: (string | number)[][] = [
    ['Chai 190g', 'CH-190', 'pcs', 48, 46, '', 360],
    ['Basmati Chawal', 'CW-BAS', 'kg', 75, 75.5, '', 360],
    ['Cooking Oil 1L', 'OIL-1L', 'pcs', 30, 27, '', 560],
  ];
  samples.forEach((s, i) => {
    const row = ws.getRow(first + i);
    [2, 3, 4, 5, 6].forEach((c, k) => (row.getCell(c).value = s[k] as string | number));
    row.getCell(8).value = s[6] as number;
  });
  grid(ws, first, last, 10, [null, null, '@', null, '0.##', '0.##', '0.##;[Red]-0.##', RS, RS, null]);
  for (let r = first; r <= last; r++) shade(ws.getCell(r, 6), GREY);
  const t = ws.getRow(last + 1);
  t.getCell(8).value = 'Total';
  t.getCell(8).font = { bold: true };
  t.getCell(9).value = { formula: `SUM(I${first}:I${last})` };
  t.getCell(9).numFmt = RS;
  t.getCell(9).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: H }];
  ws.pageSetup.printTitlesRow = `${H}:${H}`;
  guide(wb, 'How to use', [
    ['Before counting', 'Stop sales in the section, or note the time and the bills made during the count. Print the sheet with the product list and system stock filled in.'],
    ['Counting', 'Count one shelf at a time, two people if you can: one counts, one writes. Count loose units, not cartons, so it matches the Unit column.'],
    ['Difference', 'Counted - system stock. Minus means stock is missing (theft, damage, wrong billing); plus means stock was not entered when it arrived.'],
    ['Difference value', 'Difference x cost price: what the missing or extra stock is worth. The total at the bottom is the shrinkage or gain for the count.'],
    ['After counting', 'Recount any line with a large difference before you adjust the stock. Then update the stock in your system and keep this sheet as the record.'],
  ]);
  return wb;
}

// ─── 4. Daily cash (galla) closing ───

function cashClosing(): ExcelJS.Workbook {
  const wb = book('Daily cash (galla) closing sheet');
  const ws = sheet(wb, 'Closing', [34, 12, 14, 4, 22, 14]);
  title(ws, 'Daily cash closing (galla)', 'Fill at closing time. Expected cash comes from the day\'s cash in and out; counted cash comes from the notes in the drawer.', 6);
  let row = fields(ws, 3, [['Date', ''], ['Counter / branch', ''], ['Closed by', ''], ['Checked by', '']], 1);
  const section = (label: string) => {
    const c = ws.getCell(row, 1);
    c.value = label;
    c.font = { bold: true, color: { argb: BRAND } };
    row++;
  };
  const line = (label: string, sign: 1 | -1 | 0, hint = ''): string => {
    ws.getCell(row, 1).value = label;
    const v = ws.getCell(row, 3);
    v.numFmt = RS;
    border(v);
    shade(v, GREY);
    if (hint) {
      ws.getCell(row, 5).value = hint;
      ws.getCell(row, 5).font = { size: 9, color: { argb: 'FF64748B' } };
    }
    const ref = `C${row}`;
    row++;
    return sign === 0 ? '' : `${sign < 0 ? '-' : '+'}${ref}`;
  };
  section('Cash in');
  const ins = [line('Opening cash (float)', 1, 'Cash left in the drawer last night'), line('Cash sales', 1, 'From the day report'), line('Udhaar recovered in cash', 1), line('Other cash in', 1)];
  row++;
  section('Cash out');
  const outs = [line('Expenses paid from the galla', -1, 'Tea, fuel, repairs'), line('Supplier payments in cash', -1), line('Cash refunds to customers', -1), line('Owner withdrawal', -1), line('Cash sent to bank / safe', -1)];
  row++;
  ws.getCell(row, 1).value = 'Expected cash in drawer';
  ws.getCell(row, 1).font = { bold: true };
  const expected = ws.getCell(row, 3);
  expected.value = { formula: `0${[...ins, ...outs].join('')}` };
  expected.numFmt = RS;
  expected.font = { bold: true };
  border(expected);
  const expectedRef = `C${row}`;
  row += 2;

  section('Notes and coins counted');
  header(ws, row, ['Note', 'Count', 'Amount']);
  row++;
  const firstNote = row;
  for (const d of [5000, 1000, 500, 100, 50, 20, 10]) {
    ws.getCell(row, 1).value = d;
    ws.getCell(row, 1).numFmt = '#,##0';
    ws.getCell(row, 1).alignment = { horizontal: 'left' };
    ws.getCell(row, 3).value = { formula: `A${row}*B${row}` };
    ws.getCell(row, 3).numFmt = RS;
    shade(ws.getCell(row, 2), GREY);
    [1, 2, 3].forEach((c) => border(ws.getCell(row, c)));
    row++;
  }
  ws.getCell(row, 1).value = 'Coins (total)';
  shade(ws.getCell(row, 3), GREY);
  ws.getCell(row, 3).numFmt = RS;
  [1, 2, 3].forEach((c) => border(ws.getCell(row, c)));
  const lastNote = row;
  row++;
  ws.getCell(row, 1).value = 'Counted cash';
  ws.getCell(row, 1).font = { bold: true };
  const counted = ws.getCell(row, 3);
  counted.value = { formula: `SUM(C${firstNote}:C${lastNote})` };
  counted.numFmt = RS;
  counted.font = { bold: true };
  border(counted);
  const countedRef = `C${row}`;
  row += 2;
  ws.getCell(row, 1).value = 'Over (+) / short (-)';
  ws.getCell(row, 1).font = { bold: true, size: 12 };
  const diff = ws.getCell(row, 3);
  diff.value = { formula: `${countedRef}-${expectedRef}` };
  diff.numFmt = RS;
  diff.font = { bold: true, size: 12 };
  border(diff);
  shade(diff);
  row += 2;

  section('Non-cash sales (for the record, not in the drawer)');
  for (const label of ['Card', 'JazzCash / Easypaisa', 'Bank transfer / Raast', 'Udhaar sales (khata)']) line(label, 0);
  row++;
  ws.getCell(row, 1).value = 'Cash left in drawer for tomorrow';
  border(ws.getCell(row, 3));
  ws.getCell(row, 3).numFmt = RS;
  row += 2;
  ws.getCell(row, 1).value = 'Signature (closed by)';
  ws.getCell(row, 4).value = '';
  ws.getCell(row, 5).value = 'Signature (checked by)';
  ws.getCell(row, 2).border = { bottom: { style: 'thin' } };
  ws.getCell(row, 6).border = { bottom: { style: 'thin' } };

  const log = sheet(wb, 'Month log', [13, 15, 15, 15, 30]);
  title(log, 'Cash closing log', 'One line per day from the Closing sheet. Repeated shortages point to a problem worth checking.', 5);
  header(log, 4, ['Date', 'Expected', 'Counted', 'Over / short', 'Reason or note']);
  for (let r = 5; r <= 35; r++) log.getCell(r, 4).value = { formula: `IF(OR(B${r}="",C${r}=""),"",C${r}-B${r})` };
  grid(log, 5, 35, 5, ['dd-mmm-yyyy', RS, RS, RS, null]);
  const tr = log.getRow(36);
  tr.getCell(1).value = 'Month total';
  tr.getCell(1).font = { bold: true };
  tr.getCell(4).value = { formula: 'SUM(D5:D35)' };
  tr.getCell(4).numFmt = RS;
  tr.getCell(4).font = { bold: true };
  log.addConditionalFormatting({ ref: 'D5:D35', rules: [{ type: 'cellIs', operator: 'lessThan', formulae: ['0'], priority: 1, style: { font: { color: { argb: 'FFB91C1C' }, bold: true } } }] });
  return wb;
}

// ─── 5. Price list ───

function priceList(): ExcelJS.Workbook {
  const wb = book('Price list template');
  const ws = sheet(wb, 'Price list', [18, 32, 9, 13, 13, 14, 13, 22]);
  title(ws, 'Price list', 'For customers, salesmen and WhatsApp. Change the shop details and the date, then print or save as PDF.', 8);
  const H = fields(ws, 3, [['Shop name', ''], ['Phone / WhatsApp', ''], ['Address', ''], ['Prices valid from', '']], 2);
  header(ws, H, ['Category', 'Product', 'Unit', 'Retail price', 'Wholesale price', 'Pack', 'Pack price', 'Note']);
  const samples: (string | number)[][] = [
    ['Chai', 'Chai 190g', 'pcs', 390, 375, 'Carton of 24', 9000, ''],
    ['Chawal', 'Basmati Chawal', 'kg', 420, 400, 'Bag of 25 kg', 10000, 'New crop'],
    ['Ghee / Oil', 'Cooking Oil 1L', 'pcs', 610, 595, 'Carton of 12', 7140, ''],
  ];
  samples.forEach((s, i) => (ws.getRow(H + 1 + i).values = s));
  grid(ws, H + 1, H + 120, 8, [null, null, null, RS, RS, null, RS, null]);
  for (let r = H + 1; r <= H + 120; r += 2) for (let c = 1; c <= 8; c++) shade(ws.getCell(r, c), 'FFF8FAFC');
  ws.views = [{ state: 'frozen', ySplit: H }];
  ws.pageSetup.printTitlesRow = `${H}:${H}`;
  ws.autoFilter = { from: { row: H, column: 1 }, to: { row: H + 120, column: 8 } };
  return wb;
}

// ─── 6 and 7. Purchase order and invoice ───

function lineDocument(kind: 'po' | 'invoice'): ExcelJS.Workbook {
  const isPo = kind === 'po';
  const wb = book(isPo ? 'Purchase order template' : 'Simple invoice template');
  const ws = sheet(wb, isPo ? 'Purchase order' : 'Invoice', [5, 34, 13, 9, 9, 13, 15]);
  ws.mergeCells(1, 1, 1, 4);
  ws.getCell(1, 1).value = 'Your business name';
  ws.getCell(1, 1).font = { bold: true, size: 15 };
  ws.mergeCells(2, 1, 2, 4);
  ws.getCell(2, 1).value = 'Address · Phone · NTN (if any)';
  ws.getCell(2, 1).font = { size: 10, color: { argb: 'FF475569' } };
  ws.mergeCells(1, 5, 1, 7);
  ws.getCell(1, 5).value = isPo ? 'PURCHASE ORDER' : 'INVOICE';
  ws.getCell(1, 5).font = { bold: true, size: 16, color: { argb: BRAND } };
  ws.getCell(1, 5).alignment = { horizontal: 'right' };
  const meta: [string, string | Date][] = isPo
    ? [['PO number', 'PO-0001'], ['Date', FIXED_DATE], ['Deliver by', ''], ['Payment terms', 'e.g. 15 days after delivery']]
    : [['Invoice number', 'INV-0001'], ['Date', FIXED_DATE], ['Due date', ''], ['Payment terms', 'e.g. due on receipt']];
  meta.forEach(([k, v], i) => {
    ws.getCell(3 + i, 5).value = k;
    ws.getCell(3 + i, 5).font = { bold: true, size: 10 };
    ws.mergeCells(3 + i, 6, 3 + i, 7);
    const c = ws.getCell(3 + i, 6);
    c.value = v;
    if (v instanceof Date) c.numFmt = 'dd-mmm-yyyy';
    c.alignment = { horizontal: 'right' };
  });
  ws.getCell(4, 1).value = isPo ? 'Supplier' : 'Bill to';
  ws.getCell(4, 1).font = { bold: true, color: { argb: BRAND } };
  ['Name', 'Address', 'Phone'].forEach((l, i) => {
    ws.mergeCells(5 + i, 1, 5 + i, 3);
    ws.getCell(5 + i, 1).value = `${l}:`;
    ws.getCell(5 + i, 1).border = { bottom: { style: 'thin', color: { argb: LINE } } };
  });
  const H = 10;
  header(ws, H, ['#', 'Item / description', 'SKU', 'Unit', 'Qty', 'Rate', 'Amount']);
  const first = H + 1;
  const last = H + 20;
  const samples: (string | number)[][] = isPo
    ? [['Chai 190g', 'CH-190', 'carton', 5, 9000], ['Cooking Oil 1L', 'OIL-1L', 'carton', 3, 6720]]
    : [['Chai 190g', 'CH-190', 'carton', 2, 9300], ['Basmati Chawal', 'CW-BAS', 'kg', 25, 400]];
  for (let r = first; r <= last; r++) {
    ws.getCell(r, 1).value = r - H;
    ws.getCell(r, 7).value = { formula: `IF(OR(E${r}="",F${r}=""),"",E${r}*F${r})` };
  }
  samples.forEach((s, i) => [2, 3, 4, 5, 6].forEach((c, k) => (ws.getCell(first + i, c).value = s[k] as string | number)));
  grid(ws, first, last, 7, [null, null, '@', null, '0.##', RS2, RS2]);
  let r = last + 1;
  const total = (label: string, formula: string | null, bold = false, input = false): string => {
    ws.mergeCells(r, 5, r, 6);
    ws.getCell(r, 5).value = label;
    ws.getCell(r, 5).alignment = { horizontal: 'right' };
    ws.getCell(r, 5).font = { bold };
    const c = ws.getCell(r, 7);
    if (formula) c.value = { formula };
    c.numFmt = RS2;
    c.font = { bold };
    border(c);
    if (input) shade(c, GREY);
    const ref = `G${r}`;
    r++;
    return ref;
  };
  const sub = total('Subtotal', `SUM(G${first}:G${last})`);
  const disc = total('Discount', null, false, true);
  ws.mergeCells(r, 5, r, 6);
  ws.getCell(r, 5).value = 'Sales tax %';
  ws.getCell(r, 5).alignment = { horizontal: 'right' };
  shade(ws.getCell(r, 7), GREY);
  border(ws.getCell(r, 7));
  ws.getCell(r, 7).numFmt = '0.##"%"';
  const rateRef = `G${r}`;
  r++;
  const tax = total('Sales tax', `ROUND((${sub}-${disc})*${rateRef}/100,2)`);
  const freight = total(isPo ? 'Freight / delivery' : 'Delivery charges', null, false, true);
  const grand = total('Total', `${sub}-${disc}+${tax}+${freight}`, true);
  shade(ws.getCell(grand), BRAND_LIGHT);
  if (!isPo) {
    const paid = total('Paid', null, false, true);
    total('Balance due', `${grand}-${paid}`, true);
  }
  r++;
  const notes = isPo
    ? ['Please confirm this order and the delivery date by phone or WhatsApp.', 'Send the bill with the goods and quote the PO number on it.', 'Goods that do not match the order, or arrive damaged or near expiry, may be returned.']
    : ['Payment details: Bank / account title / IBAN, or JazzCash / Easypaisa number.', 'Please quote the invoice number when you pay.', 'Thank you for your business.'];
  notes.forEach((t) => {
    ws.mergeCells(r, 1, r, 7);
    ws.getCell(r, 1).value = t;
    ws.getCell(r, 1).font = { size: 10, color: { argb: 'FF475569' } };
    r++;
  });
  r++;
  ws.getCell(r, 2).value = isPo ? 'Ordered by (signature)' : 'Received by (signature)';
  ws.getCell(r, 6).value = isPo ? 'Supplier confirmation' : 'For the business';
  ws.getCell(r - 1, 2).border = { bottom: { style: 'thin' } };
  ws.getCell(r - 1, 6).border = { bottom: { style: 'thin' } };
  ws.pageSetup.printArea = `A1:G${r}`;
  guide(wb, 'How to use', [
    ['Your details', 'Replace "Your business name" and the address line once, then save the file as your own template.'],
    [isPo ? 'PO number' : 'Invoice number', isPo ? 'Use a new number for every order (PO-0001, PO-0002...) so the supplier\'s bill can be matched to it.' : 'Use a new number for every invoice and never reuse one. Customers and your own records find payments by it.'],
    ['Lines', 'Write Qty and Rate; Amount, Subtotal, Sales tax and Total calculate themselves. Grey cells are for you to fill.'],
    ['Sales tax %', 'Leave it empty if you do not charge tax. If you are registered, use the rate that applies to the goods.'],
    ['Print or PDF', 'File > Print, or save as PDF to send on WhatsApp or email. The sheet is set to fit one A4 page wide.'],
    ...(isPo ? [] : ([['Not a fiscal invoice', 'This is a plain invoice. It is not an FBR sales tax invoice from an integrated POS.']] as [string, string][])),
  ]);
  return wb;
}

const FILES: { key: string; file: string; build: () => ExcelJS.Workbook }[] = [
  { key: 'template-product-import', file: 'nafaa-product-import-template.xlsx', build: productImport },
  { key: 'template-khata-register', file: 'nafaa-khata-udhaar-register.xlsx', build: khata },
  { key: 'template-stock-take', file: 'nafaa-stock-take-sheet.xlsx', build: stockTake },
  { key: 'template-cash-closing', file: 'nafaa-daily-cash-closing-sheet.xlsx', build: cashClosing },
  { key: 'template-price-list', file: 'nafaa-price-list-template.xlsx', build: priceList },
  { key: 'template-purchase-order', file: 'nafaa-purchase-order-template.xlsx', build: () => lineDocument('po') },
  { key: 'template-simple-invoice', file: 'nafaa-simple-invoice-template.xlsx', build: () => lineDocument('invoice') },
];

async function main(): Promise<void> {
  mkdirSync(PUBLIC_DIR, { recursive: true });
  mkdirSync(MEDIA_DIR, { recursive: true });
  for (const f of FILES) {
    const buffer = Buffer.from(await f.build().xlsx.writeBuffer());
    writeFileSync(join(PUBLIC_DIR, f.file), buffer);
    writeFileSync(join(MEDIA_DIR, `${f.key}.xlsx`), buffer);
    const written = readFileSync(join(MEDIA_DIR, `${f.key}.xlsx`));
    console.log(`${f.key}\t${f.file}\t${written.length}\t${createHash('sha1').update(written).digest('hex')}`);
  }
}

void main();
